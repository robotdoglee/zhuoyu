interface PaginationProps {
  total: number
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  label: string
}

export default function Pagination({ total, page, pageCount, onPageChange, label }: PaginationProps) {
  return (
    <nav className="pagination" aria-label={`${label}分页`}>
      <span>共 {total} 条 · 第 {page} / {pageCount} 页</span>
      <div>
        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={`${label}上一页`}>
          ← 上一页
        </button>
        <button className="btn btn-ghost btn-sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label={`${label}下一页`}>
          下一页 →
        </button>
      </div>
    </nav>
  )
}
