import type { ResourceLink } from '../db/types'

export function searchLinks(query: string): ResourceLink[] {
  const encoded = encodeURIComponent(query)
  return [
    {
      title: `B 站搜索：${query}`,
      url: `https://search.bilibili.com/all?keyword=${encoded}`,
      tier: 'blog',
      provider: 'B 站',
    },
    {
      title: `知乎搜索：${query}`,
      url: `https://www.zhihu.com/search?type=content&q=${encoded}`,
      tier: 'blog',
      provider: '知乎',
    },
  ]
}

interface WikipediaItem {
  title?: string
  key?: string
  description?: string
}

interface WikipediaResponse {
  pages?: WikipediaItem[]
}

export async function searchResources(query: string): Promise<ResourceLink[]> {
  const trimmed = query.trim()
  if (!trimmed) throw new Error('先输入要检索的概念。')

  const wikipediaUrl = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(trimmed)}&limit=3`
  const arxivUrl = `/api/arxiv?search_query=all:${encodeURIComponent(trimmed)}&start=0&max_results=3`
  const githubUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(trimmed)}&sort=stars&order=desc&per_page=3`

  const [wikipedia, arxiv, github] = await Promise.allSettled([
    fetchJson<WikipediaResponse>(wikipediaUrl),
    fetch(arxivUrl).then(async (response) => {
      if (!response.ok) throw new Error('arXiv 暂不可用')
      return parseArxivResources(await response.text())
    }),
    fetchJson<{ items?: Array<{ full_name?: string; html_url?: string; description?: string }> }>(githubUrl),
  ])

  const resources: ResourceLink[] = []
  if (wikipedia.status === 'fulfilled') {
    for (const item of (wikipedia.value.pages ?? []).slice(0, 3)) {
      if (!item.title) continue
      const pageKey = item.key ?? item.title.replace(/\s+/g, '_')
      resources.push({
        title: item.description ? `${item.title} — ${item.description}` : item.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageKey)}`,
        tier: 'secondary',
        provider: 'Wikipedia',
      })
    }
  }
  if (arxiv.status === 'fulfilled') resources.push(...arxiv.value)
  if (github.status === 'fulfilled') {
    for (const item of github.value.items ?? []) {
      if (!item.full_name || !item.html_url) continue
      resources.push({
        title: item.description ? `${item.full_name} — ${item.description}` : item.full_name,
        url: item.html_url,
        tier: 'primary',
        provider: 'GitHub',
      })
    }
  }

  const failures = [wikipedia, arxiv, github].filter((result) => result.status === 'rejected').length
  if (resources.length === 0 && failures === 3) {
    throw new Error('公开 API 暂时都无法访问，请稍后重试，或先使用 B 站 / 知乎搜索链接。')
  }
  return resources
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: url.includes('api.github.com') ? { Accept: 'application/vnd.github+json' } : undefined,
  })
  if (!response.ok) throw new Error(`公开资源接口返回 ${response.status}`)
  return (await response.json()) as T
}

function parseArxivResources(xmlText: string): ResourceLink[] {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (xml.querySelector('parsererror')) throw new Error('arXiv 返回格式无法解析')
  return [...xml.querySelectorAll('entry')].slice(0, 3).flatMap((entry) => {
    const title = entry.querySelector('title')?.textContent?.replace(/\s+/g, ' ').trim()
    const url = entry.querySelector('id')?.textContent?.trim()
    if (!title || !url) return []
    return [{ title, url, tier: 'primary' as const, provider: 'arXiv' }]
  })
}
