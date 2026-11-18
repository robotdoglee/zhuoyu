import type { PaperPage } from '../db/types'

export interface PdfParseProgress {
  current: number
  total: number
}

export interface PdfParseResult {
  title: string
  authors: string[]
  year?: number
  pageCount: number
  pages: PaperPage[]
  charCount: number
}

/** M0 的保护阈值：避免超大 PDF 让浏览器长任务卡死 */
const MAX_BYTES = 80 * 1024 * 1024
const MAX_PAGES = 300

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null

function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const [pdfjs, worker] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ])
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    })()
  }
  return pdfjsPromise
}

export async function parsePdfFile(
  file: File,
  onProgress?: (progress: PdfParseProgress) => void,
): Promise<PdfParseResult> {
  if (file.size > MAX_BYTES) {
    throw new Error(`这个 PDF 有 ${(file.size / 1024 / 1024).toFixed(1)} MB，M0 暂支持 80 MB 以内。`)
  }

  const pdfjs = await getPdfjs()
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data })
  const doc = await loadingTask.promise

  try {
    if (doc.numPages > MAX_PAGES) {
      throw new Error(`这个 PDF 有 ${doc.numPages} 页，M0 暂支持 ${MAX_PAGES} 页以内。`)
    }

    const info = await readInfo(doc)
    const pages: PaperPage[] = []
    let charCount = 0

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber)
      const content = await page.getTextContent()
      const text = joinPageText(content.items)
      charCount += text.length
      pages.push({ page: pageNumber, text })
      page.cleanup()
      onProgress?.({ current: pageNumber, total: doc.numPages })
    }

    return {
      title: info.title || file.name.replace(/\.pdf$/i, ''),
      authors: info.authors,
      year: info.year,
      pageCount: doc.numPages,
      pages,
      charCount,
    }
  } finally {
    await loadingTask.destroy()
  }
}

interface PdfTextItemLike {
  str?: unknown
  hasEOL?: unknown
  transform?: unknown
}

/** 按行拼接页面文本，避免把整页文字挤成一行 */
function joinPageText(items: unknown[]): string {
  let out = ''
  let lastY: number | null = null

  for (const raw of items) {
    const item = raw as PdfTextItemLike
    if (typeof item.str !== 'string') continue

    const transform = Array.isArray(item.transform) ? item.transform : null
    const y = transform && typeof transform[5] === 'number' ? transform[5] : null

    if (y !== null && lastY !== null && Math.abs(y - lastY) > 3) {
      if (!out.endsWith('\n')) out += '\n'
    }

    out += item.str
    if (item.hasEOL === true) out += '\n'
    if (y !== null) lastY = y
  }

  return out
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface PdfInfo {
  title: string
  authors: string[]
  year?: number
}

async function readInfo(doc: { getMetadata: () => Promise<{ info?: unknown }> }): Promise<PdfInfo> {
  try {
    const metadata = await doc.getMetadata()
    const info = (metadata.info ?? {}) as {
      Title?: unknown
      Author?: unknown
      CreationDate?: unknown
    }

    const rawTitle = typeof info.Title === 'string' ? info.Title : ''
    const title = rawTitle
      .replace(/^Microsoft (Word|PowerPoint)\s*-\s*/i, '')
      .replace(/\.(docx?|tex|dvi)$/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    const rawAuthor = typeof info.Author === 'string' ? info.Author : ''
    const authors = rawAuthor
      .split(/\s*(?:;|,|，|、|\band\b)\s*/i)
      .map((name) => name.trim())
      .filter(Boolean)

    let year: number | undefined
    if (typeof info.CreationDate === 'string') {
      const match = info.CreationDate.match(/D:(\d{4})/)
      if (match) {
        const parsed = Number(match[1])
        if (parsed >= 1900 && parsed <= 2100) year = parsed
      }
    }

    return { title, authors, year }
  } catch {
    return { title: '', authors: [] }
  }
}
