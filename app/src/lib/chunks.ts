import type { PaperPage } from '../db/types'

export interface TextChunkInput {
  id: string
  projectId: number
  paperId: number
  page: number
  startOffset: number
  endOffset: number
  text: string
  createdAt: number
}

/** 仅按页内偏移分块，不跨页，保证每个引文都能回到唯一的 PDF 页。 */
export function chunkPaperPages(
  pages: PaperPage[],
  projectId: number,
  paperId: number,
  maxChars = 1200,
  overlap = 160,
): TextChunkInput[] {
  if (maxChars < 200 || overlap < 0 || overlap >= maxChars / 2) {
    throw new Error('分块参数无效：单块至少 200 字，重叠须小于单块长度的一半。')
  }

  const now = Date.now()
  const chunks: TextChunkInput[] = []

  for (const page of pages) {
    let start = 0
    let index = 0
    while (start < page.text.length) {
      let end = Math.min(start + maxChars, page.text.length)
      if (end < page.text.length) {
        const floor = start + Math.floor(maxChars * 0.65)
        const segment = page.text.slice(0, end)
        const candidates = ['\n', '。', '. ', '; ', '；', ' ']
        let boundary = -1
        for (const marker of candidates) {
          const position = segment.lastIndexOf(marker)
          if (position >= floor) {
            boundary = position + marker.length
            break
          }
        }
        if (boundary > start) end = boundary
      }

      chunks.push({
        id: `${paperId}-${page.page}-${index}`,
        projectId,
        paperId,
        page: page.page,
        startOffset: start,
        endOffset: end,
        text: page.text.slice(start, end),
        createdAt: now,
      })

      if (end >= page.text.length) break
      const nextStart = Math.max(start + 1, end - overlap)
      start = nextStart
      index += 1
    }
  }

  return chunks
}
