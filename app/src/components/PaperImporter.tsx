import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { db } from '../db/db'
import type { Paper } from '../db/types'
import { formatNumber } from '../lib/format'
import { lookupMetadata } from '../lib/metadata'
import { parsePdfFile, type PdfParseProgress, type PdfParseResult } from '../lib/pdf'

export interface SavedNotice {
  tone: 'ok' | 'warn'
  text: string
}

interface PaperImporterProps {
  projectId: number
  existing?: Paper
  /** 仅补传 PDF，不改动已有的论文元数据 */
  attachOnly?: boolean
  onSaved: (notice: SavedNotice) => void
}

type ImportTab = 'pdf' | 'lookup'

export default function PaperImporter({
  projectId,
  existing,
  attachOnly = false,
  onSaved,
}: PaperImporterProps) {
  const [tab, setTab] = useState<ImportTab>('pdf')
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState<PdfParseProgress | null>(null)
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setError('请选择 PDF 文件。')
      return
    }
    if (parsing) return

    setParsing(true)
    setFileName(file.name)
    setProgress(null)

    try {
      const result = await parsePdfFile(file, setProgress)
      await persistPdf(result, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF 解析失败，请换一个文件重试。')
    } finally {
      setParsing(false)
      setProgress(null)
    }
  }

  async function persistPdf(result: PdfParseResult, name: string) {
    const now = Date.now()
    const pagesNote = `PDF 已解析：共 ${result.pageCount} 页，提取 ${formatNumber(result.charCount)} 字。`
    const scanned = result.charCount < 20

    if (existing?.id !== undefined) {
      if (attachOnly) {
        await db.papers.update(existing.id, {
          pages: result.pages,
          pageCount: result.pageCount,
          fileName: name,
          updatedAt: now,
          ...(existing.source === 'pdf'
            ? { title: result.title, authors: result.authors, year: result.year }
            : {}),
        })
      } else {
        await db.papers.put({
          id: existing.id,
          projectId,
          title: result.title,
          authors: result.authors,
          year: result.year,
          source: 'pdf',
          pageCount: result.pageCount,
          pages: result.pages,
          fileName: name,
          createdAt: existing.createdAt,
          updatedAt: now,
        })
      }
    } else {
      await db.papers.add({
        projectId,
        title: result.title,
        authors: result.authors,
        year: result.year,
        source: 'pdf',
        pageCount: result.pageCount,
        pages: result.pages,
        fileName: name,
        createdAt: now,
        updatedAt: now,
      })
    }

    onSaved(
      scanned
        ? {
            tone: 'warn',
            text: `${pagesNote} 几乎没有提取到文本，可能是扫描件；M0 暂不支持 OCR，换一份带文本层的 PDF 即可。`,
          }
        : { tone: 'ok', text: pagesNote },
    )
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim()
    if (!value) {
      setError('先输入 arXiv ID 或 DOI。')
      return
    }

    setLookingUp(true)
    setError('')
    try {
      const metadata = await lookupMetadata(value)
      const now = Date.now()

      if (existing?.id !== undefined) {
        await db.papers.put({
          id: existing.id,
          projectId,
          title: metadata.title,
          authors: metadata.authors,
          abstract: metadata.abstract,
          year: metadata.year,
          venue: metadata.venue,
          arxivId: metadata.arxivId,
          doi: metadata.doi,
          url: metadata.url,
          pdfUrl: metadata.pdfUrl,
          pagesLabel: metadata.pagesLabel,
          source: metadata.source,
          pageCount: 0,
          pages: [],
          createdAt: existing.createdAt,
          updatedAt: now,
        })
      } else {
        await db.papers.add({
          projectId,
          title: metadata.title,
          authors: metadata.authors,
          abstract: metadata.abstract,
          year: metadata.year,
          venue: metadata.venue,
          arxivId: metadata.arxivId,
          doi: metadata.doi,
          url: metadata.url,
          pdfUrl: metadata.pdfUrl,
          pagesLabel: metadata.pagesLabel,
          source: metadata.source,
          pageCount: 0,
          pages: [],
          createdAt: now,
          updatedAt: now,
        })
      }

      onSaved({
        tone: metadata.note ? 'warn' : 'ok',
        text: metadata.note
          ? `${metadata.note} 元数据已保存，接下来可上传 PDF 提取分页文本。`
          : '论文元数据已保存。上传 PDF 后可提取分页文本。',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '检索失败，请稍后重试。')
    } finally {
      setLookingUp(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const busy = parsing || lookingUp

  return (
    <div className="importer">
      {!attachOnly && (
        <div className="import-tabs" role="tablist" aria-label="论文导入方式">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pdf'}
            className={`import-tab ${tab === 'pdf' ? 'active' : ''}`}
            onClick={() => {
              setTab('pdf')
              setError('')
            }}
          >
            上传 PDF
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'lookup'}
            className={`import-tab ${tab === 'lookup' ? 'active' : ''}`}
            onClick={() => {
              setTab('lookup')
              setError('')
            }}
          >
            arXiv · DOI 检索
          </button>
        </div>
      )}

      {tab === 'pdf' || attachOnly ? (
        <div className="import-pane">
          <div
            className={`dropzone ${dragging ? 'dragging' : ''} ${busy ? 'is-busy' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="选择或拖入 PDF 文件"
            onClick={() => {
              if (!busy) fileInputRef.current?.click()
            }}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !busy) {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              if (!busy) setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void handleFile(file)
              }}
            />
            <svg className="dropzone-icon" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path
                d="M10 5.5h13.5L31 13v20.5a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path d="M23.5 5.5V13H31" stroke="currentColor" strokeWidth="1.4" />
              <path d="M15 24.5h9M15 29h6" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <strong>{parsing ? '正在解析 PDF…' : '选择或拖入 PDF'}</strong>
            <span>文本只在你的浏览器内提取，不会上传；扫描件暂不支持。</span>
          </div>

          {parsing && (
            <div className="parse-progress">
              <div className="parse-progress-head">
                <span>正在读取 {fileName || 'PDF'}</span>
                <span>{progress ? `${progress.current} / ${progress.total} 页` : '准备中…'}</span>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: progress ? `${(progress.current / progress.total) * 100}%` : '6%',
                  }}
                />
              </div>
            </div>
          )}

          {!parsing && (
            <p className="form-hint">
              {attachOnly
                ? '会补全当前论文的分页文本与页数，已有元数据保持不变。'
                : '支持带文本层的 PDF，单文件不超过 80 MB、300 页。'}
            </p>
          )}
        </div>
      ) : (
        <form className="import-pane lookup-form" onSubmit={handleLookup}>
          <div className="field">
            <label className="field-label" htmlFor="paper-identifier">
              arXiv ID 或 DOI
            </label>
            <div className="lookup-row">
              <input
                id="paper-identifier"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="1706.03762 或 10.48550/arXiv.1706.03762"
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary" disabled={lookingUp}>
                {lookingUp ? '检索中…' : '检索并导入'}
              </button>
            </div>
          </div>
          <div className="lookup-examples">
            <span>试试：</span>
            <button type="button" onClick={() => setQuery('1706.03762')}>
              1706.03762
            </button>
            <button type="button" onClick={() => setQuery('10.48550/arXiv.1706.03762')}>
              10.48550/arXiv.1706.03762
            </button>
          </div>
          <p className="form-hint">
            arXiv 编号优先走 arXiv API，DOI 走 OpenAlex；只发送编号，不发送项目内容。
          </p>
        </form>
      )}

      {error && <div className="notice error">{error}</div>}
    </div>
  )
}
