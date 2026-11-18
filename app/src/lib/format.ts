export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

export function formatDay(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

export function formatAuthors(authors: string[]): string {
  if (authors.length === 0) return '作者信息待补充'
  if (authors.length <= 6) return authors.join('、')
  return `${authors.slice(0, 6).join('、')} 等 ${authors.length} 人`
}

export function formatNumber(value: number): string {
  return value.toLocaleString('zh-CN')
}
