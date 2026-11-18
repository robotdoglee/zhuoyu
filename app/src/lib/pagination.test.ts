import { describe, expect, it } from 'vitest'
import { LIST_PAGE_SIZE, LONG_LIST_THRESHOLD, pageCount, paginate } from './pagination'

describe('长列表分页', () => {
  it('超过 200 条时按每页 50 条切分', () => {
    const items = Array.from({ length: LONG_LIST_THRESHOLD + 1 }, (_, index) => index + 1)

    expect(LIST_PAGE_SIZE).toBe(50)
    expect(pageCount(items.length)).toBe(5)
    expect(paginate(items, 1)).toHaveLength(50)
    expect(paginate(items, 5)).toEqual([201])
  })

  it('页码越界时收敛到有效范围', () => {
    const items = Array.from({ length: 120 }, (_, index) => index)

    expect(paginate(items, 0)[0]).toBe(0)
    expect(paginate(items, 99)).toHaveLength(20)
    expect(paginate(items, 99)[0]).toBe(100)
  })

  it('空列表和未超过阈值的列表保持单页', () => {
    expect(pageCount(0)).toBe(1)
    expect(paginate([], 1)).toEqual([])
    expect(pageCount(200)).toBe(4)
  })
})
