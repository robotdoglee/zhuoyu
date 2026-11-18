import type { PaperPage } from '../db/types'

/** PDF 换行、全半角与空白差异不影响引文匹配。 */
export function normalizeQuote(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u00ad\u200b]/g, '')
    .replace(/([\p{L}\p{N}])[-\u2010\u2011]\s+([\p{L}\p{N}])/gu, '$1$2')
    .replace(/\s+/g, '')
    .toLocaleLowerCase()
}

export function verifyAnchor(
  pages: PaperPage[],
  page: number | undefined,
  quote: string | undefined,
): boolean {
  if (!page || !quote?.trim()) return false
  const source = pages.find((entry) => entry.page === page)?.text
  if (!source) return false
  const normalizedQuote = normalizeQuote(quote)
  return normalizedQuote.length > 0 && normalizeQuote(source).includes(normalizedQuote)
}
