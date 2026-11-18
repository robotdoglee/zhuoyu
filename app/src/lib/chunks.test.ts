import { describe, expect, it } from 'vitest'
import { chunkPaperPages } from './chunks'

describe('PDF 页内文本分块', () => {
  it('保存页码、稳定 ID 和精确起止偏移，且不跨页', () => {
    const text = `第一段。${' Transformer uses attention.'.repeat(40)}`
    const chunks = chunkPaperPages([
      { page: 2, text },
      { page: 3, text: '下一页内容。' },
    ], 7, 11, 240, 30)

    expect(chunks.length).toBeGreaterThan(2)
    expect(chunks[0].id).toBe('11-2-0')
    expect(chunks.at(-1)?.page).toBe(3)
    for (const chunk of chunks) {
      const source = chunk.page === 2 ? text : '下一页内容。'
      expect(source.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.text)
      expect(chunk.projectId).toBe(7)
      expect(chunk.paperId).toBe(11)
    }
  })

  it('拒绝会导致死循环的重叠参数', () => {
    expect(() => chunkPaperPages([{ page: 1, text: 'abc' }], 1, 1, 200, 100)).toThrow()
  })
})
