export const LONG_LIST_THRESHOLD = 200
export const LIST_PAGE_SIZE = 50

export function pageCount(total: number, pageSize = LIST_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

export function paginate<T>(items: T[], page: number, pageSize = LIST_PAGE_SIZE): T[] {
  const safePage = Math.min(Math.max(1, page), pageCount(items.length, pageSize))
  const start = (safePage - 1) * pageSize
  return items.slice(start, start + pageSize)
}
