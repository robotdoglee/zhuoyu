import type { PaperSource } from '../db/types'

export interface PaperMetadata {
  title: string
  authors: string[]
  abstract?: string
  year?: number
  venue?: string
  arxivId?: string
  doi?: string
  url?: string
  pdfUrl?: string
  /** 原文页码区间，例如 5998–6008 */
  pagesLabel?: string
  source: PaperSource
  /** 数据来源提示，例如 arXiv 被跨域拦截后改用 OpenAlex */
  note?: string
}

export type ResolvedIdentifier =
  | { kind: 'arxiv'; id: string }
  | { kind: 'doi'; doi: string }

const REQUEST_TIMEOUT_MS = 15_000

// 开发环境经 Vite 代理访问 arXiv，生产环境直连（若被跨域拦截则回退 OpenAlex）。
const ARXIV_ENDPOINT = import.meta.env.DEV
  ? '/api/arxiv/query'
  : 'https://export.arxiv.org/api/query'

export function resolveIdentifier(raw: string): ResolvedIdentifier | null {
  const input = raw.trim()
  if (!input) return null

  const doiMatch = input.match(/10\.\d{4,9}\/[^\s]+/i)
  if (doiMatch) {
    return { kind: 'doi', doi: normalizeDoi(doiMatch[0]) }
  }

  const urlMatch = input.match(/arxiv\.org\/(?:abs|pdf)\/([^?#\s]+)/i)
  if (urlMatch) {
    return { kind: 'arxiv', id: cleanArxivId(urlMatch[1]) }
  }

  const bare = input.replace(/^arxiv[:\s.]+/i, '')
  const arxivMatch = bare.match(
    /^(?:\d{4}\.\d{4,5}|[a-z][a-z-]*(?:\.[a-z]{2})?\/\d{7})(?:v\d+)?$/i,
  )
  if (arxivMatch) {
    return { kind: 'arxiv', id: cleanArxivId(arxivMatch[0]) }
  }

  return null
}

export async function lookupMetadata(raw: string): Promise<PaperMetadata> {
  const identifier = resolveIdentifier(raw)
  if (!identifier) {
    throw new Error(
      '没认出这个编号。请输入 arXiv ID（如 1706.03762）或 DOI（如 10.48550/arXiv.1706.03762）。',
    )
  }

  if (identifier.kind === 'doi') {
    return fetchOpenAlex(identifier.doi)
  }

  try {
    return await fetchArxiv(identifier.id)
  } catch (arxivError) {
    // 浏览器直连 arXiv API 通常会被跨域拦截，用同一篇论文的 arXiv DOI 回退到 OpenAlex。
    const doi = `10.48550/arXiv.${identifier.id}`
    try {
      const metadata = await fetchOpenAlex(doi)
      return {
        ...metadata,
        arxivId: identifier.id,
        doi,
        source: 'openalex',
        note: 'arXiv 官方接口在浏览器中被跨域拦截，已通过 OpenAlex 取回同一篇论文的元数据。',
      }
    } catch {
      throw new Error(`arXiv 检索失败，OpenAlex 回退也未成功。${describeError(arxivError)}`)
    }
  }
}

async function fetchArxiv(id: string): Promise<PaperMetadata> {
  const response = await fetchWithTimeout(
    `${ARXIV_ENDPOINT}?id_list=${encodeURIComponent(id)}&max_results=1`,
  )
  if (!response.ok) {
    throw new Error(`arXiv 返回 ${response.status}，请稍后重试。`)
  }

  const xml = await response.text()
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('arXiv 返回了无法解析的内容。')
  }

  const entry = doc.querySelector('entry')
  if (!entry || !entry.querySelector('title')) {
    throw new Error('arXiv 没有找到这个编号对应的论文。')
  }

  const read = (selector: string) => entry.querySelector(selector)?.textContent?.trim() ?? ''
  const title = read('title').replace(/\s+/g, ' ')
  const abstract = read('summary').replace(/\s+/g, ' ')
  const authors = Array.from(entry.querySelectorAll('author > name'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean)
  const published = read('published')
  const yearValue = published ? Number(published.slice(0, 4)) : Number.NaN
  const journalRef = entry
    .getElementsByTagNameNS('http://arxiv.org/schemas/atom', 'journal_ref')[0]
    ?.textContent?.trim()
  const doiNode = entry.getElementsByTagNameNS('http://arxiv.org/schemas/atom', 'doi')[0]

  return {
    title,
    authors,
    abstract: abstract || undefined,
    year: Number.isFinite(yearValue) ? yearValue : undefined,
    venue: journalRef || 'arXiv',
    arxivId: id,
    doi: doiNode?.textContent?.trim() || undefined,
    url: `https://arxiv.org/abs/${id}`,
    pdfUrl: `https://arxiv.org/pdf/${id}`,
    source: 'arxiv',
  }
}

interface OpenAlexWork {
  title?: string | null
  display_name?: string | null
  publication_year?: number | null
  authorships?: { author?: { display_name?: string | null } | null }[] | null
  abstract_inverted_index?: Record<string, number[]> | null
  primary_location?: {
    landing_page_url?: string | null
    pdf_url?: string | null
    source?: { display_name?: string | null } | null
  } | null
  open_access?: { oa_url?: string | null } | null
  biblio?: { first_page?: string | null; last_page?: string | null } | null
}

async function fetchOpenAlex(rawDoi: string): Promise<PaperMetadata> {
  const doi = normalizeDoi(rawDoi)
  const response = await fetchWithTimeout(
    `https://api.openalex.org/works/${encodeURIComponent(`https://doi.org/${doi}`)}`,
  )

  if (response.status === 404) {
    throw new Error('OpenAlex 没有找到这个 DOI 对应的论文。')
  }
  if (!response.ok) {
    throw new Error(`OpenAlex 返回 ${response.status}，请稍后重试。`)
  }

  const work = (await response.json()) as OpenAlexWork
  const title = (work.title || work.display_name || '').replace(/\s+/g, ' ').trim()
  if (!title) {
    throw new Error('OpenAlex 返回的论文缺少标题。')
  }

  const authors =
    work.authorships
      ?.map((entry) => entry.author?.display_name?.trim() ?? '')
      .filter(Boolean) ?? []

  const firstPage = work.biblio?.first_page?.trim()
  const lastPage = work.biblio?.last_page?.trim()
  const pagesLabel = firstPage && lastPage ? `${firstPage}–${lastPage}` : firstPage || undefined
  const doiUrl = `https://doi.org/${doi}`
  const landingPage = work.primary_location?.landing_page_url || doiUrl
  const oaUrl = work.open_access?.oa_url || undefined
  const pdfUrl =
    work.primary_location?.pdf_url ||
    (oaUrl && /\.pdf(?:$|\?)/i.test(oaUrl) ? oaUrl : undefined)

  const arxivMatch = doi.match(/^10\.48550\/arxiv\.(.+)$/i)

  return {
    title,
    authors,
    abstract: rebuildAbstract(work.abstract_inverted_index),
    year: work.publication_year ?? undefined,
    venue: work.primary_location?.source?.display_name || undefined,
    arxivId: arxivMatch?.[1],
    doi,
    url: landingPage,
    pdfUrl,
    pagesLabel,
    source: 'openalex',
  }
}

function rebuildAbstract(index?: Record<string, number[]> | null): string | undefined {
  if (!index) return undefined
  const words: [number, string][] = []
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) {
      words.push([position, word])
    }
  }
  if (words.length === 0) return undefined
  words.sort((a, b) => a[0] - b[0])
  return words.map(([, word]) => word).join(' ')
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: url.includes('openalex') ? 'application/json' : 'application/atom+xml' },
    })
  } finally {
    window.clearTimeout(timer)
  }
}

function normalizeDoi(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
    .replace(/^doi[:\s]+/i, '')
    .replace(/[.,;，。；、]+$/g, '')
}

function cleanArxivId(raw: string): string {
  return raw
    .replace(/\.pdf$/i, '')
    .replace(/v\d+$/i, '')
    .trim()
}

function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return '请求超时，请检查网络后重试。'
  }
  if (error instanceof TypeError) {
    return '网络请求被浏览器拦截（可能是跨域或断网），可直接上传 PDF。'
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '请检查网络后重试。'
}
