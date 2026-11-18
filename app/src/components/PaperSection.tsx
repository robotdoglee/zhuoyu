import { useEffect, useState } from 'react'
import { db } from '../db/db'
import type { Paper, PaperSource } from '../db/types'
import { formatAuthors, formatNumber } from '../lib/format'
import PaperImporter, { type SavedNotice } from './PaperImporter'

interface PaperSectionProps {
  projectId: number
  paper?: Paper
  sourceRequest?: { page: number; quote?: string; nonce: number }
  onChanged: () => void
}

type ImporterMode = 'attach' | 'replace' | null

const SOURCE_LABEL: Record<PaperSource, string> = {
  pdf: 'PDF 导入',
  arxiv: 'arXiv API',
  openalex: 'OpenAlex',
}

export default function PaperSection({ projectId, paper, sourceRequest, onChanged }: PaperSectionProps) {
  const [mode, setMode] = useState<ImporterMode>(null)
  const [notice, setNotice] = useState<SavedNotice | null>(null)

  function handleSaved(next: SavedNotice) {
    setMode(null)
    setNotice(next)
    onChanged()
  }

  async function handleDelete() {
    if (paper?.id === undefined) return
    const confirmed = window.confirm(
      '移除后会删除本机保存的这篇论文的元数据与分页文本，且无法撤销。确定吗？',
    )
    if (!confirmed) return
    await db.papers.delete(paper.id)
    setNotice(null)
    onChanged()
  }

  const showImporter = !paper || mode !== null

  return (
    <section className="panel paper-panel" id="paper-source">
      <header className="panel-head">
        <div>
          <p className="kicker">00 / 论文资料</p>
          <h2>{paper ? '这篇论文' : '先放一篇论文进来'}</h2>
        </div>
        {paper && mode === null && (
          <div className="panel-actions">
            {paper.pageCount === 0 && (
              <button className="btn btn-primary btn-sm" onClick={() => setMode('attach')}>
                上传 PDF
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setMode('replace')}>
              更换论文
            </button>
            <button className="btn btn-quiet btn-sm danger" onClick={() => void handleDelete()}>
              移除
            </button>
          </div>
        )}
      </header>

      {notice && (
        <div className={`notice ${notice.tone}`}>
          <span>{notice.text}</span>
          <button
            type="button"
            className="notice-close"
            aria-label="关闭提示"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {paper && !showImporter && <PaperDetails key={paper.id} paper={paper} sourceRequest={sourceRequest} />}

      {showImporter && (
        <div className={paper ? 'importer-block' : ''}>
          {paper && (
            <div className="importer-head">
              <div>
                <strong>{mode === 'attach' ? '为当前论文补传 PDF' : '替换当前论文'}</strong>
                <span>
                  {mode === 'attach'
                    ? '仅补全分页文本，保留标题、作者等元数据。'
                    : '新论文会覆盖当前元数据与已提取的文本。'}
                </span>
              </div>
              <button className="btn btn-quiet" onClick={() => setMode(null)}>
                取消
              </button>
            </div>
          )}
          <PaperImporter
            projectId={projectId}
            existing={paper}
            attachOnly={mode === 'attach'}
            onSaved={handleSaved}
          />
        </div>
      )}
    </section>
  )
}

function PaperDetails({
  paper,
  sourceRequest,
}: {
  paper: Paper
  sourceRequest?: { page: number; quote?: string; nonce: number }
}) {
  const [page, setPage] = useState(paper.pages[0]?.page ?? 1)
  useEffect(() => {
    if (sourceRequest && paper.pages.some((entry) => entry.page === sourceRequest.page)) {
      setPage(sourceRequest.page)
    }
  }, [paper.pages, sourceRequest])
  const selectedPage = paper.pages.find((entry) => entry.page === page) ?? paper.pages[0]
  const totalChars = paper.pages.reduce((sum, entry) => sum + entry.text.length, 0)
  const doiHref = paper.doi ? `https://doi.org/${paper.doi}` : undefined

  return (
    <div className="paper-details">
      <div className="paper-top">
        <div className="paper-heading">
          <div className="paper-badges">
            <span className="source-badge">{SOURCE_LABEL[paper.source]}</span>
            {paper.pageCount > 0 && (
              <span className="source-badge subtle">{paper.fileName?.includes('内置') ? '示例文本已入库' : 'PDF 已解析'}</span>
            )}
            {paper.year && <span className="paper-year">{paper.year}</span>}
          </div>
          <h3 className="paper-title">{paper.title}</h3>
          <p className="paper-authors">{formatAuthors(paper.authors)}</p>
          {paper.venue && <p className="paper-venue">{paper.venue}</p>}
        </div>
      </div>

      <dl className="paper-facts">
        <div className="paper-fact">
          <dt>页数</dt>
          <dd>{paper.pageCount > 0 ? `${paper.pageCount} 页` : '待上传 PDF'}</dd>
          <span className="fact-note">
            {paper.pageCount > 0 ? '分页文本已存入本机' : '补传 PDF 后可提取文本'}
          </span>
        </div>
        <div className="paper-fact">
          <dt>年份</dt>
          <dd>{paper.year ?? '—'}</dd>
          <span className="fact-note">{paper.venue ?? '来源信息待补'}</span>
        </div>
        <div className="paper-fact">
          <dt>arXiv</dt>
          <dd className="mono">{paper.arxivId ?? '—'}</dd>
          <span className="fact-note">{paper.arxivId ? '预印本编号' : '未提供'}</span>
        </div>
        <div className="paper-fact">
          <dt>DOI</dt>
          <dd className="mono">
            {doiHref ? (
              <a href={doiHref} target="_blank" rel="noreferrer">
                {paper.doi}
              </a>
            ) : (
              '—'
            )}
          </dd>
          <span className="fact-note">{paper.pagesLabel ? `原文页码 ${paper.pagesLabel}` : '数字对象标识'}</span>
        </div>
      </dl>

      {paper.abstract && (
        <details className="abstract-box">
          <summary>
            <span>摘要</span>
            <span className="summary-arrow" aria-hidden="true">
              ▾
            </span>
          </summary>
          <p>{paper.abstract}</p>
        </details>
      )}

      <div className="paper-links">
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noreferrer">
            打开原文 ↗
          </a>
        )}
        {paper.pdfUrl && (
          <a href={paper.pdfUrl} target="_blank" rel="noreferrer">
            PDF 链接 ↗
          </a>
        )}
        {paper.fileName && <span className="paper-file">本地文件：{paper.fileName}</span>}
      </div>

      {paper.pages.length > 0 ? (
        <div className="page-browser">
          <div className="page-browser-head">
            <div>
              <span className="browser-label">分页文本</span>
              <span className="browser-sub">
                共 {paper.pageCount} 页 · {formatNumber(totalChars)} 字 · 仅存本机
              </span>
            </div>
            <label className="page-select">
              <span>第</span>
              <select value={page} onChange={(event) => setPage(Number(event.target.value))}>
                {paper.pages.map((entry) => (
                  <option key={entry.page} value={entry.page}>
                    {entry.page}
                  </option>
                ))}
              </select>
              <span>页</span>
            </label>
          </div>
          {sourceRequest?.quote && sourceRequest.page === selectedPage?.page && (
            <div className="source-focus-quote">
              <strong>正在核对这条引文</strong>
              <blockquote>{sourceRequest.quote}</blockquote>
            </div>
          )}
          <pre className="page-text">
            {selectedPage?.text || '本页没有可提取的文本（可能是扫描页或纯图片页）。'}
          </pre>
        </div>
      ) : (
        <div className="paper-no-pdf">
          <div>
            <strong>还没有 PDF 分页文本</strong>
            <span>上传 PDF 后会在本机逐页提取，用于论文拆解与引文校验。</span>
          </div>
        </div>
      )}
    </div>
  )
}
