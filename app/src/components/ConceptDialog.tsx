import { useState, type FormEvent } from 'react'
import type { Concept, Mastery, ResourceLink } from '../db/types'
import { searchLinks, searchResources } from '../lib/resources'
import { TIER_LABEL } from '../lib/labels'

interface ConceptDialogProps {
  concept?: Concept
  projectId: number
  onClose: () => void
  onSave: (concept: Concept) => Promise<void>
}

export default function ConceptDialog({ concept, projectId, onClose, onSave }: ConceptDialogProps) {
  const [name, setName] = useState(concept?.name ?? '')
  const [summary, setSummary] = useState(concept?.summary ?? '')
  const [whyNeeded, setWhyNeeded] = useState(concept?.whyNeeded ?? '')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(concept?.difficulty ?? 2)
  const [mastery, setMastery] = useState<Mastery>(concept?.mastery ?? 'unknown')
  const [resources, setResources] = useState<ResourceLink[]>(concept?.resources ?? [])
  const [query, setQuery] = useState(concept?.name ?? '')
  const [results, setResults] = useState<ResourceLink[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  async function runSearch() {
    if (!query.trim()) {
      setError('先输入资源检索关键词。')
      return
    }
    setSearching(true)
    setError('')
    setNotice('')
    try {
      const found = await searchResources(query)
      setResults(found)
      setNotice(found.length ? `找到 ${found.length} 条公开资源，选择后加入卡片。` : '本次没有结果，可换英文关键词重试。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '资源检索失败，请稍后重试。')
    } finally {
      setSearching(false)
    }
  }

  function addResource(resource: ResourceLink) {
    setResources((current) => current.some((item) => item.url === resource.url) ? current : [...current, resource])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !summary.trim() || !whyNeeded.trim()) {
      setError('概念名、一句话解释和「为何复现需要」都不能为空。')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...concept,
        projectId,
        name: name.trim(),
        summary: summary.trim(),
        whyNeeded: whyNeeded.trim(),
        difficulty,
        mastery,
        masteryUpdatedAt: mastery === concept?.mastery ? concept.masteryUpdatedAt : Date.now(),
        dependsOn: concept?.dependsOn ?? [],
        resources,
        createdAt: concept?.createdAt ?? Date.now(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试。')
      setSaving(false)
    }
  }

  const jumps = searchLinks(query || name || 'Transformer')

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal concept-modal" role="dialog" aria-modal="true" aria-labelledby="concept-dialog-title">
        <div className="modal-head">
          <p className="kicker">知识框图 / 概念卡</p>
          <h2 id="concept-dialog-title">{concept ? concept.name : '新增概念'}</h2>
          <p className="modal-sub">解释为什么需要它，再用依赖边排出学习顺序。</p>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <div className="field">
            <label className="field-label" htmlFor="concept-name">概念名</label>
            <input id="concept-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus placeholder="例如：多头注意力" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="concept-summary">一句话解释</label>
            <textarea id="concept-summary" rows={2} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="它是什么，尽量一句话说清" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="concept-why">为何复现需要</label>
            <textarea id="concept-why" rows={2} value={whyNeeded} onChange={(event) => setWhyNeeded(event.target.value)} placeholder="不理解它，复现时会在哪里卡住？" />
          </div>
          <div className="form-two-columns">
            <div className="field">
              <label className="field-label" htmlFor="concept-difficulty">难度</label>
              <select id="concept-difficulty" value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value) as 1 | 2 | 3)}>
                <option value={1}>1 · 入门</option>
                <option value={2}>2 · 进阶</option>
                <option value={3}>3 · 困难</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="concept-mastery">掌握度</label>
              <select id="concept-mastery" value={mastery} onChange={(event) => setMastery(event.target.value as Mastery)}>
                <option value="unknown">不会</option>
                <option value="half">半会</option>
                <option value="known">会</option>
              </select>
            </div>
          </div>

          <section className="resource-editor">
            <div className="resource-editor-head">
              <div>
                <h3>分层资源</h3>
                <p>只保存链接与标题，不抓取资源正文。</p>
              </div>
              <span>{resources.length} 条</span>
            </div>
            {resources.length > 0 && (
              <div className="saved-resources">
                {resources.map((resource, index) => (
                  <div className={`resource-row tier-${resource.tier}`} key={`${resource.url}-${index}`}>
                    <span className="resource-tier">{TIER_LABEL[resource.tier]}</span>
                    <a href={resource.url} target="_blank" rel="noreferrer">{resource.title} ↗</a>
                    <small>{resource.provider}</small>
                    <button type="button" aria-label={`移除资源 ${resource.title}`} onClick={() => setResources((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="resource-search-row">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="建议用英文概念名检索" aria-label="资源检索关键词" />
              <button type="button" className="btn btn-ghost btn-sm" disabled={searching} onClick={() => void runSearch()}>
                {searching ? '检索中…' : '检索公开 API'}
              </button>
            </div>
            <p className="field-hint">Wikipedia · arXiv · GitHub；仅发送检索关键词，不发送论文内容。</p>
            <div className="search-jumps">
              {jumps.map((link) => (
                <a key={link.provider} href={link.url} target="_blank" rel="noreferrer">{link.provider} 搜索 ↗</a>
              ))}
              <span>未经同行评审</span>
            </div>

            {results.length > 0 && (
              <div className="resource-results">
                {results.map((resource, index) => (
                  <div className="resource-result" key={`${resource.url}-${index}`}>
                    <span className={`resource-tier tier-${resource.tier}`}>{resource.provider} · {TIER_LABEL[resource.tier]}</span>
                    <a href={resource.url} target="_blank" rel="noreferrer">{resource.title} ↗</a>
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => addResource(resource)}>加入卡片</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {notice && <div className="notice ok">{notice}</div>}
          {error && <div className="notice error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '保存中…' : '保存概念卡'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
