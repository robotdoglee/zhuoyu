import { useState } from 'react'
import { downloadAnki, downloadJson, downloadMarkdown, downloadObsidian, type ExportFormat } from '../lib/exporters'
import type { ProjectBundle } from '../lib/projectData'

const FORMATS: Array<{ id: ExportFormat; name: string; detail: string }> = [
  { id: 'markdown', name: 'Markdown', detail: '完整复盘、拆解页码与引文、Mermaid 源码' },
  { id: 'obsidian', name: 'Obsidian 笔记包', detail: 'ZIP 内含真实 .md 笔记与有效 [[双链]]' },
  { id: 'json', name: 'JSON', detail: '项目完整结构化数据，含历史计划与本地截图' },
  { id: 'anki', name: 'Anki CSV', detail: '概念卡正面、解释与资源背面、掌握度标签' },
  { id: 'pdf', name: 'PDF 报告', detail: '中文排版报告，附渲染后的 Mermaid 知识框图' },
]

export default function ExportPanel({ getBundle }: { getBundle: () => Promise<ProjectBundle> }) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function runExport(format: ExportFormat) {
    if (busy) return
    setBusy(format)
    setError('')
    setNotice('')
    try {
      const bundle = await getBundle()
      if (format === 'markdown') downloadMarkdown(bundle)
      else if (format === 'obsidian') await downloadObsidian(bundle)
      else if (format === 'json') downloadJson(bundle)
      else if (format === 'anki') downloadAnki(bundle)
      else {
        const { downloadPdfReport } = await import('../lib/pdfExport')
        await downloadPdfReport(bundle)
      }
      setNotice(`已在本机生成并下载${FORMATS.find((item) => item.id === format)?.name}文件；整个过程没有上传业务数据。`)
    } catch (err) {
      setError(err instanceof Error ? `导出失败：${err.message}` : '导出失败，请检查浏览器下载权限后重试。')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="export-panel" aria-labelledby="export-title">
      <header>
        <div><p className="kicker">M3 / 本地知识库导出</p><h2 id="export-title">把复现成果带到下一段学习里</h2><p>五种格式均在浏览器内生成。导出前会自动保存当前复盘，API Key 永远不会写入文件。</p></div>
        <span className="local-only-badge">仅本地 · 不上传</span>
      </header>
      <div className="export-grid">{FORMATS.map((format) => <button key={format.id} className="export-format" disabled={Boolean(busy)} onClick={() => void runExport(format.id)}>
        <span className="export-file-icon" aria-hidden="true">{format.id === 'pdf' ? 'PDF' : format.id === 'json' ? '{ }' : format.id === 'anki' ? '卡' : format.id === 'obsidian' ? '链' : 'MD'}</span>
        <span><strong>{format.name}</strong><small>{format.detail}</small></span>
        <b>{busy === format.id ? (format.id === 'pdf' ? '正在渲染…' : '正在生成…') : '下载 →'}</b>
      </button>)}</div>
      {notice && <div className="notice ok" role="status">{notice}</div>}
      {error && <div className="notice error" role="alert">{error}</div>}
    </section>
  )
}
