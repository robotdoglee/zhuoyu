import { describe, expect, it, vi } from 'vitest'
import { createPdfPageBatches, parsePdfFile } from './pdf'

describe('PDF 分批解析', () => {
  it('100 页以内单批处理，超过 100 页时每批最多 10 页', () => {
    expect(createPdfPageBatches(100)).toEqual([{ start: 1, end: 100 }])

    const batches = createPdfPageBatches(101)
    expect(batches).toHaveLength(11)
    expect(batches[0]).toEqual({ start: 1, end: 10 })
    expect(batches[10]).toEqual({ start: 101, end: 101 })
    expect(batches.every((batch) => batch.end - batch.start < 10)).toBe(true)
  })

  it('覆盖所有页码且没有重叠', () => {
    const batches = createPdfPageBatches(256)
    expect(batches[0].start).toBe(1)
    expect(batches.at(-1)?.end).toBe(256)
    for (let index = 1; index < batches.length; index += 1) {
      expect(batches[index].start).toBe(batches[index - 1].end + 1)
    }
  })

  it('取消后不会开始读取文件或上报进度', async () => {
    const controller = new AbortController()
    const onProgress = vi.fn()
    controller.abort()
    const file = new File(['%PDF-1.7'], 'cancel.pdf', { type: 'application/pdf' })

    await expect(parsePdfFile(file, onProgress, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(onProgress).not.toHaveBeenCalled()
  })
})
