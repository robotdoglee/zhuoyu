import { useState } from 'react'
import { LIST_PAGE_SIZE, LONG_LIST_THRESHOLD, pageCount, paginate } from './pagination'

export function usePagination<T>(
  items: T[],
  resetKey: string | number,
  pageSize = LIST_PAGE_SIZE,
  threshold = LONG_LIST_THRESHOLD,
) {
  const [state, setState] = useState({ key: resetKey, page: 1 })
  const isPaginated = items.length > threshold
  const totalPages = pageCount(items.length, pageSize)
  const requestedPage = state.key === resetKey ? state.page : 1
  const page = Math.min(Math.max(1, requestedPage), totalPages)

  function setPage(nextPage: number) {
    setState({ key: resetKey, page: Math.min(Math.max(1, nextPage), totalPages) })
  }

  return {
    page,
    pageCount: totalPages,
    pageItems: isPaginated ? paginate(items, page, pageSize) : items,
    isPaginated,
    setPage,
  }
}
