import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db/db'
import type { Concept, Element, ElementType, Paper, TextChunk } from '../db/types'
import { verifyAnchor } from '../lib/anchors'
import { chunkPaperPages } from '../lib/chunks'
import {
  ELEMENT_TYPE_META,
  elementTypeLabel,
  extractHeuristically,
  relatedConceptsOf,
  relatedElementsOf,
  type ElementDraft,
} from '../lib/elements'
import { extractWithLlm } from '../lib/llm'
import { loadLlmSettings } from '../lib/settings'
import { usePagination } from '../lib/usePagination'
import AsyncState from './AsyncState'
import Pagination from './Pagination'

type ExtractMode = 'llm' | 'heuristic'
interface FailedRequest { types: ElementType[]; mode: ExtractMode }

interface BreakdownPanelProps {
  projectId: number
  paper?: Paper
  onShowSource: (page: number, quote?: string) => void
  onOpenConcept?: (conceptId: number) => void
  onOpenPlan?: (conceptId?: number) => void
}

export default function BreakdownPanel({
  projectId,
  paper,
  onShowSource,
  onOpenConcept,
  onOpenPlan,
}: BreakdownPanelProps) {
  const [elements, setElements] = useState<Element[]>([])
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [chunks, setChunks] = useState<TextChunk[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState<'all' | ElementType | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [failedRequest, setFailedRequest] = useState<FailedRequest | null>(null)
  const [editing, setEditing] = useState<Element | 'new' | null>(null)
  const [detail, setDetail] = useState<Element | null>(null)
  const settings = loadLlmSettings()
  const llmReady = Boolean(settings.apiKey && settings.model)
  const preferredMode: ExtractMode = llmReady ? 'llm' : 'heuristic'

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [elementRows, conceptRows] = await Promise.all([
        db.elements.where('projectId').equals(projectId).toArray(),
        db.concepts.where('projectId').equals(projectId).toArray(),
      ])
      let chunkRows = paper?.id === undefined
        ? []
        : await db.chunks.where('paperId').equals(paper.id).toArray()
      if (paper?.id !== undefined && paper.pages.length > 0 && chunkRows.length === 0) {
        const generated = chunkPaperPages(paper.pages, projectId, paper.id)
        await db.chunks.bulkPut(generated)
        chunkRows = generated
      }
      setElements(elementRows.sort((a, b) => a.createdAt - b.createdAt))
      setConcepts(conceptRows.sort((a, b) => a.createdAt - b.createdAt))
      setChunks(chunkRows)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '拆解数据读取失败，请重试。')
    } finally {
      setLoading(false)
    }
  }, [paper, projectId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const pagination = usePagination(elements, projectId)

  async function regenerateChunks() {
    if (paper?.id === undefined || paper.pages.length === 0) return
    const generated = chunkPaperPages(paper.pages, projectId, paper.id)
    await db.transaction('rw', db.chunks, async () => {
      await db.chunks.where('paperId').equals(paper.id as number).delete()
      await db.chunks.bulkAdd(generated)
    })
    setChunks(generated)
    setNotice(`已按页生成 ${generated.length} 个文本块；页码与页内偏移已保存。`)
  }

  async function runExtraction(types: ElementType[], mode: ExtractMode) {
    if (!paper || chunks.length === 0 || busy) {
      setError('请先上传带文本层的 PDF 并生成文本分块。')
      return
    }
    const replaced = elements.filter(
      (item) => types.includes(item.type) && item.source !== 'manual',
    )
    if (replaced.length > 0 && !window.confirm(`本次将替换 ${replaced.length} 条自动拆解项；手工编辑过的条目会保留。继续吗？`)) {
      return
    }

    setBusy(types.length === 1 ? types[0] : 'all')
    setError('')
    setNotice('')
    setFailedRequest(null)
    try {
      const drafts = mode === 'llm'
        ? await extractWithLlm(loadLlmSettings(), chunks, types, paper.title)
        : extractHeuristically(chunks).filter((item) => types.includes(item.type))
      await persistDrafts(types, drafts, paper)
      setNotice(
        drafts.length > 0
          ? `${mode === 'llm' ? 'LLM' : '启发式'}抽取完成：新增 ${drafts.length} 条，已逐条校验引文。`
          : '这些类别中没有找到可靠线索，可重试或手工新增。',
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '抽取失败，请重试。')
      setFailedRequest({ types, mode })
    } finally {
      setBusy(null)
    }
  }

  async function persistDrafts(types: ElementType[], drafts: ElementDraft[], currentPaper: Paper) {
    const now = Date.now()
    await db.transaction('rw', db.elements, async () => {
      const existing = await db.elements.where('projectId').equals(projectId).toArray()
      const deleteIds = existing
        .filter((item) => types.includes(item.type) && item.source !== 'manual' && item.id !== undefined)
        .map((item) => item.id as number)
      await db.elements.bulkDelete(deleteIds)
      await db.elements.bulkAdd(
        drafts.map((draft) => ({
          ...draft,
          projectId,
          paperId: currentPaper.id,
          verified: verifyAnchor(currentPaper.pages, draft.page, draft.quote),
          createdAt: now,
        })),
      )
    })
  }

  async function saveElement(element: Element) {
    const verified = verifyAnchor(paper?.pages ?? [], element.page, element.quote)
    if (element.id === undefined) {
      await db.elements.add({ ...element, projectId, paperId: paper?.id, source: 'manual', verified })
    } else {
      await db.elements.put({ ...element, projectId, paperId: paper?.id, source: 'manual', verified })
    }
    setEditing(null)
    setNotice('拆解项已保存，引文状态已重新校验。')
    await load()
  }

  async function deleteElement(element: Element) {
    if (element.id === undefined || !window.confirm(`删除「${element.label}」？此操作无法撤销。`)) return
    await db.elements.delete(element.id)
    await load()
  }

  return (
    <div className="breakdown-workspace">
      <section className="workspace-heading">
        <div>
          <p className="kicker">M1 / 论文拆解</p>
          <h2>把论文拆成可核对的零件</h2>
          <p>九类事实共用同一条底线：有引文、有页码、能回到原文。</p>
        </div>
        <div className="workspace-actions">
          <button className="btn btn-ghost" onClick={() => setEditing('new')}>手工新增</button>
          <button
            className="btn btn-primary"
            disabled={!paper || chunks.length === 0 || busy !== null}
            onClick={() => void runExtraction(ELEMENT_TYPE_META.map((item) => item.type), preferredMode)}
          >
            {busy === 'all' ? '正在抽取…' : llmReady ? 'LLM 抽取九类' : '启发式抽取九类'}
          </button>
          {llmReady && (
            <button
              className="btn btn-quiet"
              disabled={!paper || chunks.length === 0 || busy !== null}
              onClick={() => void runExtraction(ELEMENT_TYPE_META.map((item) => item.type), 'heuristic')}
            >改用启发式</button>
          )}
        </div>
      </section>

      <div className={`notice ${llmReady ? 'ok' : 'warn'} extraction-privacy`}>
        <span>
          {llmReady
            ? `已配置 ${settings.model}。仅在点击 LLM 抽取时，把分块发送到 ${settings.endpoint}。`
            : '未配置 Key，当前使用纯本地正则启发式；所有拆解项都可手工增删改。'}
        </span>
        <Link to="/settings">LLM 设置 →</Link>
      </div>

      <section className="chunk-bar">
        <div>
          <strong>文本分块</strong>
          <span>{paper?.pages.length ? `${chunks.length} 块 · ${paper.pageCount} 页 · 每块记录页内起止偏移` : '上传 PDF 后自动按页生成'}</span>
        </div>
        <button className="btn btn-ghost btn-sm" disabled={!paper?.pages.length || busy !== null} onClick={() => void regenerateChunks()}>
          重新分块
        </button>
        {chunks.length > 0 && (
          <details className="chunk-details">
            <summary>查看分块与偏移</summary>
            <div className="chunk-list">
              {chunks.map((chunk) => (
                <button key={chunk.id} onClick={() => onShowSource(chunk.page, chunk.text.slice(0, 120))}>
                  <span className="mono">{chunk.id}</span>
                  <span>第 {chunk.page} 页 · [{chunk.startOffset}, {chunk.endOffset}) · {chunk.text.length} 字</span>
                </button>
              ))}
            </div>
          </details>
        )}
      </section>

      {error && (
        <div className="notice error" role="alert">
          <span>{error}</span>
          {failedRequest && (
            <button className="btn btn-ghost btn-sm" onClick={() => void runExtraction(failedRequest.types, failedRequest.mode)}>
              重试本次抽取
            </button>
          )}
        </div>
      )}
      {notice && <div className="notice ok" role="status">{notice}</div>}

      {loading ? (
        <AsyncState status="loading" title="正在读取拆解项…" description="正在从本机整理九类事实与原文锚点。" />
      ) : loadError ? (
        <AsyncState status="error" title="拆解数据没有读取成功" description={loadError} action={{ label: '重新读取', onClick: () => void load() }} />
      ) : elements.length === 0 ? (
        <AsyncState
          status="empty"
          title="还没有论文拆解"
          description="先手工记录一条可核对事实，或在 PDF 分块就绪后抽取九类要素。"
          action={{ label: '手工新增第一条', onClick: () => setEditing('new') }}
          secondaryAction={paper && chunks.length > 0 ? {
            label: llmReady ? 'LLM 抽取九类' : '启发式抽取九类',
            onClick: () => void runExtraction(ELEMENT_TYPE_META.map((item) => item.type), preferredMode),
            disabled: busy !== null,
          } : undefined}
        />
      ) : (
        <>
          <div className="element-grid">
            {ELEMENT_TYPE_META.filter((meta) => !pagination.isPaginated || pagination.pageItems.some((item) => item.type === meta.type)).map((meta) => {
              const items = elements.filter((item) => item.type === meta.type)
              const visibleItems = pagination.pageItems.filter((item) => item.type === meta.type)
              return (
                <section className="element-group" key={meta.type}>
                  <header>
                    <div>
                      <h3>{meta.label}<span>{items.length}</span></h3>
                      <p>{meta.hint}</p>
                    </div>
                    <button
                      className="btn btn-quiet btn-sm"
                      disabled={!paper || chunks.length === 0 || busy !== null}
                      onClick={() => void runExtraction([meta.type], preferredMode)}
                    >{busy === meta.type ? '抽取中…' : items.length ? '重抽本类' : '抽取本类'}</button>
                  </header>
                  <div className="element-items">
                    {visibleItems.length === 0 ? (
                      <div className="element-empty">暂无线索，可抽取本类或手工新增。</div>
                    ) : visibleItems.map((item) => {
                      const verified = verifyAnchor(paper?.pages ?? [], item.page, item.quote)
                      return (
                        <article className="element-item" key={item.id}>
                          <button
                            type="button"
                            className="element-open"
                            onClick={() => setDetail(item)}
                            aria-haspopup="dialog"
                            aria-label={`查看「${item.label}」的完整拆解详情`}
                          >
                            <span className="element-item-head">
                              <strong>{item.label}</strong>
                              <span className={`anchor-status ${verified ? 'verified' : 'unverified'}`}>
                                {verified ? '✓ 已核实' : '待核实'}
                              </span>
                            </span>
                            <span className="element-value">{item.value}</span>
                            <span className="element-quote">{item.quote || '未填写原文引文'}</span>
                            <span className="element-more" aria-hidden="true">查看详情 →</span>
                          </button>
                          <footer>
                            <button
                              className="source-page-link"
                              disabled={!paper?.pages.length || !item.page}
                              onClick={() => item.page && onShowSource(item.page, item.quote)}
                            >第 {item.page ?? '—'} 页 · 查看原文 ↗</button>
                            <span className="element-source">{sourceLabel(item.source)}</span>
                            <div>
                              <button className="btn btn-quiet btn-sm" onClick={() => setEditing(item)}>编辑</button>
                              <button className="btn btn-quiet btn-sm danger" onClick={() => void deleteElement(item)}>删除</button>
                            </div>
                          </footer>
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
          {pagination.isPaginated && <Pagination total={elements.length} page={pagination.page} pageCount={pagination.pageCount} onPageChange={pagination.setPage} label="拆解要素" />}
        </>
      )}

      {editing && (
        <ElementDialog
          element={editing === 'new' ? undefined : editing}
          paper={paper}
          onClose={() => setEditing(null)}
          onSave={saveElement}
        />
      )}

      {detail && (
        <ElementDetailDrawer
          element={detail}
          allElements={elements}
          concepts={concepts}
          paper={paper}
          onClose={() => setDetail(null)}
          onShowSource={(page, quote) => {
            setDetail(null)
            onShowSource(page, quote)
          }}
          onOpenConcept={(conceptId) => {
            setDetail(null)
            onOpenConcept?.(conceptId)
          }}
          onOpenPlan={(conceptId) => {
            setDetail(null)
            onOpenPlan?.(conceptId)
          }}
          onOpenRelated={setDetail}
          onEdit={() => {
            setEditing(detail)
            setDetail(null)
          }}
          onDelete={() => {
            const target = detail
            setDetail(null)
            void deleteElement(target)
          }}
        />
      )}
    </div>
  )
}

function sourceLabel(source: Element['source']): string {
  return source === 'llm' ? 'LLM' : source === 'heuristic' ? '启发式' : source === 'example' ? '示例' : '手工'
}

interface ElementDetailDrawerProps {
  element: Element
  allElements: Element[]
  concepts: Concept[]
  paper?: Paper
  onClose: () => void
  onShowSource: (page: number, quote?: string) => void
  onOpenConcept: (conceptId: number) => void
  onOpenPlan: (conceptId?: number) => void
  onOpenRelated: (element: Element) => void
  onEdit: () => void
  onDelete: () => void
}

function ElementDetailDrawer({
  element,
  allElements,
  concepts,
  paper,
  onClose,
  onShowSource,
  onOpenConcept,
  onOpenPlan,
  onOpenRelated,
  onEdit,
  onDelete,
}: ElementDetailDrawerProps) {
  const panelRef = useRef<HTMLElement>(null)
  const verified = verifyAnchor(paper?.pages ?? [], element.page, element.quote)
  const relatedElements = relatedElementsOf(element, allElements)
  const relatedConcepts = relatedConceptsOf(element, concepts)
  const primaryConceptId = relatedConcepts.find((concept) => concept.id !== undefined)?.id

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
      previous?.focus()
    }
  }, [onClose])

  return (
    <div
      className="detail-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        ref={panelRef}
        className="element-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="element-detail-title"
        aria-describedby="element-detail-summary"
        tabIndex={-1}
      >
        <header className="detail-head">
          <div>
            <p className="kicker">{elementTypeLabel(element.type)} / 拆解详情</p>
            <h2 id="element-detail-title">{element.label}</h2>
          </div>
          <button type="button" className="detail-close" aria-label="关闭拆解详情" onClick={onClose}>×</button>
        </header>

        <div className="detail-body">
          <p id="element-detail-summary" className="detail-summary">{element.value}</p>
          <div className="detail-meta">
            <span className={`anchor-status ${verified ? 'verified' : 'unverified'}`}>
              {verified ? '✓ 引文已核实' : '待核实'}
            </span>
            <span>来源 · {sourceLabel(element.source)}</span>
            <span>第 {element.page ?? '—'} 页</span>
            {element.section && <span>章节 · {element.section}</span>}
          </div>

          <section className="detail-section" aria-labelledby="detail-explanation">
            <h3 id="detail-explanation">详细解释</h3>
            <p>{element.detail || '这条拆解还没有补充详细解释。点击下方「编辑这条拆解」可以把你的理解写进去。'}</p>
          </section>

          <section className="detail-section" aria-labelledby="detail-quote">
            <h3 id="detail-quote">原文依据</h3>
            <blockquote>{element.quote || '未填写原文引文'}</blockquote>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={!paper?.pages.length || !element.page}
              onClick={() => element.page && onShowSource(element.page, element.quote)}
            >第 {element.page ?? '—'} 页 · 查看原文 ↗</button>
          </section>

          {(element.formula || (element.keyNumbers?.length ?? 0) > 0) && (
            <section className="detail-section" aria-labelledby="detail-formula">
              <h3 id="detail-formula">公式与关键数字</h3>
              {element.formula && <pre className="detail-formula">{element.formula}</pre>}
              {element.keyNumbers && element.keyNumbers.length > 0 && (
                <ul className="detail-numbers">
                  {element.keyNumbers.map((number) => <li key={number}>{number}</li>)}
                </ul>
              )}
            </section>
          )}

          <section className="detail-section" aria-labelledby="detail-related">
            <h3 id="detail-related">关联</h3>
            <div className="detail-related-group">
              <span className="detail-related-label">其他拆解项</span>
              {relatedElements.length > 0 ? (
                <div className="detail-chips">
                  {relatedElements.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="detail-chip"
                      onClick={() => onOpenRelated(item)}
                    >{item.label}</button>
                  ))}
                </div>
              ) : <p>暂未关联其他拆解项。</p>}
            </div>
            <div className="detail-related-group">
              <span className="detail-related-label">知识点</span>
              {relatedConcepts.length > 0 ? (
                <div className="detail-chips">
                  {relatedConcepts.map((concept) => (
                    <button
                      key={concept.id ?? concept.name}
                      type="button"
                      className="detail-chip"
                      disabled={concept.id === undefined}
                      onClick={() => concept.id !== undefined && onOpenConcept(concept.id)}
                    >{concept.name}</button>
                  ))}
                </div>
              ) : <p>暂未关联知识点。</p>}
            </div>
          </section>

          <section className="detail-section" aria-labelledby="detail-jump">
            <h3 id="detail-jump">跳到对应节点</h3>
            <div className="detail-jump">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={primaryConceptId === undefined}
                onClick={() => primaryConceptId !== undefined && onOpenConcept(primaryConceptId)}
              >在知识框图中查看</button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onOpenPlan(primaryConceptId)}
              >在复现计划中查看</button>
            </div>
          </section>
        </div>

        <footer className="detail-actions">
          <button type="button" className="btn btn-quiet" onClick={onEdit}>编辑这条拆解</button>
          <button type="button" className="btn btn-quiet danger" onClick={onDelete}>删除</button>
        </footer>
      </aside>
    </div>
  )
}

interface ElementDialogProps {
  element?: Element
  paper?: Paper
  onClose: () => void
  onSave: (element: Element) => Promise<void>
}

function ElementDialog({ element, paper, onClose, onSave }: ElementDialogProps) {
  const [type, setType] = useState<ElementType>(element?.type ?? 'task')
  const [label, setLabel] = useState(element?.label ?? '')
  const [value, setValue] = useState(element?.value ?? '')
  const [page, setPage] = useState(element?.page ?? paper?.pages[0]?.page ?? 1)
  const [quote, setQuote] = useState(element?.quote ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!label.trim() || !value.trim() || !quote.trim() || !Number.isInteger(page) || page < 1) {
      setError('名称、内容、页码和逐字引文都不能为空。')
      return
    }
    setSaving(true)
    try {
      await onSave({
        ...element,
        type,
        label: label.trim(),
        value: value.trim(),
        page,
        quote: quote.trim(),
        projectId: element?.projectId ?? paper?.projectId ?? 0,
        createdAt: element?.createdAt ?? Date.now(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试。')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal element-modal" role="dialog" aria-modal="true" aria-labelledby="element-dialog-title">
        <div className="modal-head">
          <p className="kicker">拆解项 / 手工编辑</p>
          <h2 id="element-dialog-title">{element ? '核对并修改这条事实' : '新增一条论文事实'}</h2>
          <p className="modal-sub">编辑后会归为手工条目，自动重抽不会覆盖它。</p>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="field">
            <label className="field-label" htmlFor="element-type">类别</label>
            <select id="element-type" value={type} onChange={(event) => setType(event.target.value as ElementType)}>
              {ELEMENT_TYPE_META.map((meta) => <option key={meta.type} value={meta.type}>{meta.label}</option>)}
            </select>
          </div>
          <div className="form-two-columns">
            <div className="field">
              <label className="field-label" htmlFor="element-label">名称</label>
              <input id="element-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="例如：训练数据集" autoFocus />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="element-page">PDF 页码</label>
              <input id="element-page" type="number" min={1} value={page} onChange={(event) => setPage(Number(event.target.value))} />
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="element-value">拆解内容</label>
            <textarea id="element-value" rows={3} value={value} onChange={(event) => setValue(event.target.value)} placeholder="用自己的话概括事实与数值" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="element-quote">原文逐字引文</label>
            <textarea id="element-quote" rows={5} value={quote} onChange={(event) => setQuote(event.target.value)} placeholder="从对应页复制的连续原文；保存后立即做归一化匹配" />
            <p className="field-hint">空白、跨行连字符与全半角差异会被归一化；其他改动会标为「待核实」。</p>
          </div>
          {error && <div className="notice error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '保存中…' : '保存并校验'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
