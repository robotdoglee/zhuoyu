import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db/db'
import type { Retrospective } from '../db/types'
import { buildRetrospectiveDraft, retrospectiveText, type RetroDraft, type RetroTextField } from '../lib/retrospective'
import { loadProjectBundle, type ProjectBundle } from '../lib/projectData'
import { polishRetrospectiveWithLlm } from '../lib/retrospectiveLlm'
import { loadLlmSettings } from '../lib/settings'
import ExportPanel from './ExportPanel'

export default function RetrospectivePanel({ projectId }: { projectId: number }) {
  const [bundle, setBundle] = useState<ProjectBundle>()
  const [draft, setDraft] = useState<RetroDraft>(() => retrospectiveText())
  const [saved, setSaved] = useState<Retrospective>()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'save' | 'polish' | null>(null)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const hasKey = Boolean(loadLlmSettings().apiKey.trim())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await loadProjectBundle(projectId)
      setBundle(data)
      setSaved(data.retrospective)
      setDraft(data.retrospective ? retrospectiveText(data.retrospective) : buildRetrospectiveDraft(data))
      setDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '复盘读取失败，请重试。')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  function update(field: RetroTextField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
    setDirty(true)
    setNotice('')
  }

  function regenerate() {
    if (!bundle) return
    if (dirty && !window.confirm('重新汇总会用当前项目事实覆盖所有复盘输入框，已补写但尚未保存的内容将丢失。继续吗？')) return
    if (!dirty && saved && !window.confirm('重新汇总会覆盖当前已保存的复盘文字。若需保留，请先导出备份。继续吗？')) return
    setDraft(buildRetrospectiveDraft(bundle))
    setDirty(true)
    setNotice('已按本地模板重新汇总。请核对事实、补写归因，再保存或导出。')
    setError('')
  }

  async function polish() {
    if (busy) return
    setBusy('polish')
    setError('')
    setNotice('')
    try {
      const polished = await polishRetrospectiveWithLlm(loadLlmSettings(), draft)
      setDraft(polished)
      setDirty(true)
      setNotice('LLM 润色结果已填入编辑器，尚未覆盖已保存版本；请逐项核对数字与引文后保存。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '润色失败，当前复盘未改变。')
    } finally {
      setBusy(null)
    }
  }

  async function saveCurrent(showNotice = true): Promise<ProjectBundle> {
    if (!bundle) throw new Error('项目数据尚未读取完成。')
    const now = Date.now()
    const retrospective: Retrospective = {
      ...saved,
      projectId,
      ...draft,
      createdAt: saved?.createdAt ?? now,
      updatedAt: now,
    }
    if (retrospective.id === undefined) {
      const id = await db.retrospectives.add(retrospective)
      retrospective.id = id
    } else {
      await db.retrospectives.put(retrospective)
    }
    const nextBundle = { ...bundle, retrospective }
    setSaved(retrospective)
    setBundle(nextBundle)
    setDirty(false)
    if (showNotice) setNotice('复盘已保存到本机 IndexedDB。')
    return nextBundle
  }

  async function save() {
    if (busy) return
    setBusy('save')
    setError('')
    setNotice('')
    try { await saveCurrent() } catch (err) {
      setError(err instanceof Error ? `保存失败：${err.message}` : '保存失败，请检查浏览器存储空间。')
    } finally { setBusy(null) }
  }

  async function prepareExport(): Promise<ProjectBundle> {
    setError('')
    try { return await saveCurrent(false) } catch (err) {
      throw err instanceof Error ? err : new Error('导出前保存复盘失败。')
    }
  }

  if (loading) return <div className="page-loading"><span className="loading-dot" />正在汇总项目事实…</div>
  if (!bundle) return <div className="notice error" role="alert">{error || '项目数据不可用。'}<button className="btn btn-ghost btn-sm" onClick={() => void load()}>重新读取</button></div>

  const hiddenCount = bundle.notes.filter((note) => note.isHiddenDetail).length
  return (
    <div className="retrospective-workspace">
      <section className="workspace-heading">
        <div><p className="kicker">M3 / 复现复盘</p><h2>把结果、偏差与经验说完整</h2><p>参照 ML Reproducibility Challenge：范围、方法、结果、四类偏差归因、难易点和作者沟通。</p></div>
        <div className="workspace-actions"><button className="btn btn-ghost" onClick={regenerate}>重新汇总</button><button className="btn btn-ghost" disabled={!hasKey || busy !== null} onClick={() => void polish()}>{busy === 'polish' ? '正在润色…' : 'LLM 润色'}</button><button className="btn btn-primary" disabled={busy !== null} onClick={() => void save()}>{busy === 'save' ? '正在保存…' : dirty ? '保存复盘' : '已保存'}</button></div>
      </section>

      {!hasKey && <div className="notice warn"><span><b>当前使用本地模板拼装，无需 Key。</b> 初稿已自动生成；配置 OpenAI 兼容接口后，可主动点击「LLM 润色」。未点击前不会发送任何复盘内容。</span><Link className="btn btn-quiet btn-sm" to="/settings">LLM 设置 →</Link></div>}
      {notice && <div className="notice ok" role="status">{notice}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}

      <div className="retro-fact-strip" aria-label="复盘事实来源统计">
        <div><strong>{bundle.elements.length}</strong><span>论文拆解</span></div><div><strong>{bundle.planSteps.length}</strong><span>计划步骤</span></div><div><strong>{bundle.notes.length}</strong><span>过程记录</span></div><div><strong>{bundle.metrics.length}</strong><span>对照指标</span></div><div className="accent"><strong>{hiddenCount}</strong><span>论文没写的细节</span></div>
      </div>

      <section className="retro-editor" aria-label="复盘模板编辑器">
        <RetroField field="scope" title="01 · 范围" hint="复现目标、级别、论文、设备与本次覆盖范围。" value={draft.scope} onChange={update} rows={9} />
        <RetroField field="method" title="02 · 方法" hint="论文拆解中的方法事实、引文页码，以及实际执行的计划与检查点。" value={draft.method} onChange={update} rows={18} />
        <RetroField field="results" title="03 · 结果" hint="指标原值、绝对差与偏差百分比直接来自指标表；过程证据来自记事本。" value={draft.results} onChange={update} rows={16} />
        <RetroField field="deviations" title="04 · 偏差归因总述" hint="先概括偏差，再分别检查数据、超参、随机种子和硬件；无证据时保留待补写。" value={draft.deviations} onChange={update} rows={4} />
        <div className="deviation-grid">
          <RetroField field="dataDeviation" title="数据" hint="版本、划分、清洗、预处理" value={draft.dataDeviation} onChange={update} rows={6} />
          <RetroField field="hyperparameterDeviation" title="超参" hint="优化器、批量、学习率、正则化" value={draft.hyperparameterDeviation} onChange={update} rows={6} />
          <RetroField field="seedDeviation" title="随机种子" hint="种子、运行次数、波动范围" value={draft.seedDeviation} onChange={update} rows={6} />
          <RetroField field="hardwareDeviation" title="硬件" hint="设备、精度、依赖、批量缩放" value={draft.hardwareDeviation} onChange={update} rows={6} />
        </div>
        <RetroField field="difficulties" title="05 · 难点与易点" hint="汇总受阻步骤、报错和已验证进展，也可补写认知上的难易点。" value={draft.difficulties} onChange={update} rows={8} />
        <RetroField field="hiddenDetails" title="06 · 论文没写的细节" hint={`${hiddenCount} 条显式标记的记录会在此高亮；隐藏超参与预处理是最值得带走的经验。`} value={draft.hiddenDetails} onChange={update} rows={12} highlight />
        <RetroField field="authorContact" title="07 · 与作者沟通" hint="记录日期、问题、回复和待解决事项；未联系也可明确说明。" value={draft.authorContact} onChange={update} rows={5} />
        <footer><span>{dirty ? '有尚未保存的补写' : `已保存${saved ? ` · ${new Date(saved.updatedAt).toLocaleString('zh-CN')}` : '初稿将在保存或导出时入库'}`}</span><button className="btn btn-primary" disabled={busy !== null} onClick={() => void save()}>保存复盘</button></footer>
      </section>

      <ExportPanel getBundle={prepareExport} />
    </div>
  )
}

function RetroField({ field, title, hint, value, rows, highlight = false, onChange }: {
  field: RetroTextField
  title: string
  hint: string
  value: string
  rows: number
  highlight?: boolean
  onChange: (field: RetroTextField, value: string) => void
}) {
  return <label className={`retro-field ${highlight ? 'retro-hidden-details' : ''}`}><span className="retro-field-title">{title}{highlight && <b>高亮专栏</b>}</span><span className="retro-field-hint">{hint}</span><textarea aria-label={title} rows={rows} value={value} onChange={(event) => onChange(field, event.target.value)} /></label>
}
