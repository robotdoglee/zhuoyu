import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db/db'
import {
  levelName,
  type Concept,
  type Element,
  type Mastery,
  type PlanStep,
  type PlanStepStatus,
  type PlanVersion,
  type Project,
  type TextChunk,
} from '../db/types'
import { formatDate } from '../lib/format'
import { generatePlanWithLlm } from '../lib/planLlm'
import {
  buildHeuristicPlan,
  formatMinutes,
  moveStep,
  normalizePlanOrder,
  planSourceLabel,
  replanSteps,
  type PlanDraft,
} from '../lib/plan'
import { loadLlmSettings } from '../lib/settings'

const STATUS_LABEL: Record<PlanStepStatus, string> = {
  todo: '待办', doing: '进行中', done: '完成', blocked: '受阻',
}
const MASTERY_LABEL: Record<Mastery, string> = { known: '会', half: '半会', unknown: '不会' }

interface PlanPanelProps {
  project: Project
  onOpenNotebook: () => void
}

export default function PlanPanel({ project, onOpenNotebook }: PlanPanelProps) {
  const projectId = project.id as number
  const [steps, setSteps] = useState<PlanStep[]>([])
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [elements, setElements] = useState<Element[]>([])
  const [chunks, setChunks] = useState<TextChunk[]>([])
  const [histories, setHistories] = useState<PlanVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'generate' | 'replan' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<PlanStep | 'new' | null>(null)
  const [historyId, setHistoryId] = useState<number | null>(null)
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const settings = loadLlmSettings()
  const hasKey = Boolean(settings.apiKey.trim())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [stepRows, conceptRows, elementRows, chunkRows, historyRows] = await Promise.all([
        db.planSteps.where('projectId').equals(projectId).toArray(),
        db.concepts.where('projectId').equals(projectId).toArray(),
        db.elements.where('projectId').equals(projectId).toArray(),
        db.chunks.where('projectId').equals(projectId).toArray(),
        db.planVersions.where('projectId').equals(projectId).toArray(),
      ])
      setSteps(normalizePlanOrder(stepRows))
      setConcepts(conceptRows.sort((a, b) => a.createdAt - b.createdAt))
      setElements(elementRows)
      setChunks(chunkRows)
      setHistories(historyRows.sort((a, b) => b.createdAt - a.createdAt))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const groups = useMemo(() => groupByMilestone(steps), [steps])
  const doneCount = steps.filter((step) => step.status === 'done').length
  const totalMinutes = steps.reduce((sum, step) => sum + (step.estimatedMinutes ?? 0), 0)
  const currentVersion = steps[0]?.version ?? 0
  const history = histories.find((item) => item.id === historyId)

  async function generate(mode: 'llm' | 'heuristic') {
    if (busy) return
    if (steps.length > 0 && !window.confirm(`生成新计划前会把当前版本 ${currentVersion} 完整存入历史，继续吗？`)) return
    setBusy('generate')
    setError('')
    setNotice('')
    try {
      const drafts = mode === 'llm'
        ? await generatePlanWithLlm(loadLlmSettings(), project, concepts, elements, chunks)
        : buildHeuristicPlan(project, concepts)
      if (drafts.length === 0) throw new Error('没有生成任何步骤，请重试或改用本地模板。')
      await replacePlan(drafts, mode === 'llm' ? 'LLM 生成前自动保存' : '模板生成前自动保存')
      setNotice(`已生成 ${drafts.length} 个步骤${steps.length ? '，旧计划已完整保留在历史版本。' : '。'}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '计划生成失败，请重试。')
    } finally {
      setBusy(null)
    }
  }

  async function replan() {
    if (!steps.length || busy) return
    setBusy('replan')
    setError('')
    setNotice('')
    try {
      const drafts = replanSteps(steps, concepts)
      const added = drafts.length - steps.length
      await replacePlan(drafts, '基于当前进度与掌握度重新规划')
      setNotice(`已重排：受阻与进行中优先，完成项保留${added > 0 ? `，新增 ${added} 个前置学习步骤` : ''}；旧版本可回看。`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新规划失败，请重试。')
    } finally {
      setBusy(null)
    }
  }

  async function replacePlan(drafts: PlanDraft[], reason: string) {
    const now = Date.now()
    await db.transaction('rw', [db.planSteps, db.planVersions], async () => {
      const existing = normalizePlanOrder(await db.planSteps.where('projectId').equals(projectId).toArray())
      const oldVersions = await db.planVersions.where('projectId').equals(projectId).toArray()
      const previousVersion = Math.max(0, ...existing.map((step) => step.version), ...oldVersions.map((item) => item.version))
      if (existing.length > 0) {
        await db.planVersions.add({
          projectId,
          version: previousVersion,
          reason,
          steps: existing.map((step) => ({ ...step, conceptIds: [...step.conceptIds] })),
          createdAt: now,
        })
      }
      const nextVersion = previousVersion + 1 || 1
      await db.planSteps.where('projectId').equals(projectId).delete()
      await db.planSteps.bulkAdd(drafts.map((draft, order) => ({
        ...draft,
        projectId,
        version: nextVersion,
        order,
        createdAt: draft.createdAt ?? now,
        updatedAt: now,
      })))
    })
  }

  async function updateStep(step: PlanStep, changes: Partial<PlanStep>) {
    if (step.id === undefined) return
    const updatedAt = Date.now()
    await db.planSteps.update(step.id, { ...changes, updatedAt })
    setSteps((current) => normalizePlanOrder(current.map((item) => item.id === step.id ? { ...item, ...changes, updatedAt } : item)))
  }

  async function saveStep(step: PlanStep) {
    const now = Date.now()
    if (step.id === undefined) {
      await db.planSteps.add({
        ...step,
        projectId,
        version: currentVersion || 1,
        order: steps.length,
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await db.planSteps.put({ ...step, source: 'manual', updatedAt: now })
    }
    setEditing(null)
    setNotice('步骤已保存到本机。')
    await load()
  }

  async function deleteStep(step: PlanStep) {
    if (step.id === undefined || !window.confirm(`删除步骤「${step.title}」？已有笔记会保留。`)) return
    await db.planSteps.delete(step.id)
    const remaining = normalizePlanOrder(steps.filter((item) => item.id !== step.id))
    await persistOrder(remaining)
    setNotice('步骤已删除，关联笔记未删除。')
  }

  async function persistOrder(next: PlanStep[]) {
    const normalized = normalizePlanOrder(next)
    setSteps(normalized)
    const now = Date.now()
    await db.transaction('rw', db.planSteps, async () => {
      for (const step of normalized) {
        if (step.id !== undefined) await db.planSteps.update(step.id, { order: step.order, milestone: step.milestone, updatedAt: now })
      }
    })
  }

  function nudge(step: PlanStep, direction: -1 | 1) {
    const index = steps.findIndex((item) => item.id === step.id)
    const target = steps[index + direction]
    if (step.id !== undefined && target?.id !== undefined) void persistOrder(moveStep(steps, step.id, target.id))
  }

  return (
    <div className="plan-workspace">
      <section className="workspace-heading">
        <div>
          <p className="kicker">M2 / 复现计划</p>
          <h2>把复现拆成能检查的一步</h2>
          <p>{levelName(project.level)} · 里程碑、估时、检查点与前置卡片共用一份版本。</p>
        </div>
        <div className="workspace-actions">
          <button className="btn btn-ghost" disabled={!steps.length || busy !== null} onClick={() => void replan()}>
            {busy === 'replan' ? '正在重排…' : '一键重新规划'}
          </button>
          <button className="btn btn-primary" disabled={busy !== null} onClick={() => void generate(hasKey ? 'llm' : 'heuristic')}>
            {busy === 'generate' ? '正在生成…' : hasKey ? 'LLM 生成计划' : '本地模板生成'}
          </button>
          {hasKey && <button className="btn btn-quiet" disabled={busy !== null} onClick={() => void generate('heuristic')}>改用模板</button>}
        </div>
      </section>

      <div className={`notice ${hasKey ? 'ok' : 'warn'} extraction-privacy`}>
        <span>{hasKey
          ? `将使用 ${settings.model || '（尚未填写模型名）'} 生成；只有点击生成时才发送项目、拆解与论文上下文。`
          : '未配置 Key，使用内置分级模板，不上传任何项目内容；生成后仍可逐步编辑。'}</span>
        <Link to="/settings">LLM 设置 →</Link>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice ok" role="status">{notice}</div>}

      {loading ? (
        <div className="page-loading"><span className="loading-dot" />正在读取计划…</div>
      ) : steps.length === 0 ? (
        <div className="empty-state plan-empty">
          <div className="empty-glyph" aria-hidden="true">划</div>
          <h3>还没有复现计划</h3>
          <p>根据 {project.level} 目标生成第一版。以后每次重新规划都会留下只读快照。</p>
          <button className="btn btn-primary" disabled={busy !== null} onClick={() => void generate(hasKey ? 'llm' : 'heuristic')}>
            生成 {project.level} 计划
          </button>
        </div>
      ) : (
        <>
          <section className="plan-overview" aria-label="计划概览">
            <div><strong>{doneCount}<span> / {steps.length}</span></strong><span>步骤完成</span></div>
            <div><strong>{steps.filter((step) => step.checkpointDone).length}<span> / {steps.length}</span></strong><span>检查点勾掉</span></div>
            <div><strong>{formatMinutes(totalMinutes)}</strong><span>总估时</span></div>
            <div><strong>v{currentVersion}</strong><span>当前版本</span></div>
            <button className="btn btn-ghost btn-sm" onClick={onOpenNotebook}>去记事本记录 →</button>
          </section>

          <div className="plan-toolbar">
            <span>拖动 ⋮⋮ 手柄排序；跨里程碑拖动会归入目标里程碑。也可用 ↑ ↓ 键盘操作。</span>
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing('new')}>＋ 新增步骤</button>
              {histories.length > 0 && (
                <select aria-label="查看历史计划版本" value={historyId ?? ''} onChange={(event) => setHistoryId(Number(event.target.value))}>
                  <option value="" disabled>历史版本（{histories.length}）</option>
                  {histories.map((item) => <option key={item.id} value={item.id}>v{item.version} · {formatDate(item.createdAt)}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="milestone-list">
            {groups.map((group) => (
              <section className="milestone-group" key={group.milestone}>
                <header><h3>{group.milestone}</h3><span>{group.steps.length} 步 · {formatMinutes(group.steps.reduce((sum, step) => sum + (step.estimatedMinutes ?? 0), 0))}</span></header>
                <div className="plan-step-list">
                  {group.steps.map((step) => (
                    <article
                      className={`plan-step status-${step.status} ${draggedId === step.id ? 'dragging' : ''}`}
                      key={step.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()
                        if (draggedId !== null && step.id !== undefined) void persistOrder(moveStep(steps, draggedId, step.id))
                        setDraggedId(null)
                      }}
                    >
                      <span
                        className="drag-handle"
                        draggable
                        title="拖拽排序"
                        aria-label={`拖拽步骤 ${step.title}`}
                        onDragStart={(event) => {
                          if (step.id === undefined) return
                          setDraggedId(step.id)
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', String(step.id))
                        }}
                        onDragEnd={() => setDraggedId(null)}
                      >⋮⋮</span>
                      <div className="step-order">{String(step.order + 1).padStart(2, '0')}</div>
                      <div className="step-main">
                        <div className="step-title-row">
                          <h4>{step.title}</h4>
                          <span className={`step-status status-${step.status}`}>{STATUS_LABEL[step.status]}</span>
                        </div>
                        {step.detail && <p className="step-detail">{step.detail}</p>}
                        <label className={`checkpoint ${step.checkpointDone ? 'done' : ''}`}>
                          <input
                            type="checkbox"
                            checked={step.checkpointDone}
                            onChange={(event) => void updateStep(step, { checkpointDone: event.target.checked })}
                          />
                          <span><b>检查点</b>{step.checkpoint || '未填写检查点'}</span>
                        </label>
                        {step.conceptIds.length > 0 && (
                          <div className="step-concepts">
                            <span>前置卡片</span>
                            {step.conceptIds.map((id) => {
                              const concept = concepts.find((item) => item.id === id)
                              return concept
                                ? <span className={`concept-reference mastery-${concept.mastery}`} key={id}>@{concept.name} · {MASTERY_LABEL[concept.mastery]}</span>
                                : <span className="concept-reference missing" key={id}>@已删除卡片</span>
                            })}
                          </div>
                        )}
                      </div>
                      <div className="step-side">
                        <label>估时<input type="number" min={0} step={5} value={step.estimatedMinutes ?? ''} aria-label={`${step.title}估时（分钟）`} onChange={(event) => void updateStep(step, { estimatedMinutes: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value)) })} /><span>分钟</span></label>
                        <select aria-label={`${step.title}状态`} value={step.status} onChange={(event) => void updateStep(step, { status: event.target.value as PlanStepStatus })}>
                          {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <div className="step-actions">
                          <button className="btn btn-quiet btn-sm" disabled={step.order === 0} onClick={() => nudge(step, -1)} aria-label={`上移 ${step.title}`}>↑</button>
                          <button className="btn btn-quiet btn-sm" disabled={step.order === steps.length - 1} onClick={() => nudge(step, 1)} aria-label={`下移 ${step.title}`}>↓</button>
                          <button className="btn btn-quiet btn-sm" onClick={() => setEditing(step)}>编辑</button>
                          <button className="btn btn-quiet btn-sm danger" onClick={() => void deleteStep(step)}>删除</button>
                        </div>
                        <span className="step-source">{planSourceLabel(step.source)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {editing && (
        <PlanStepDialog
          step={editing === 'new' ? undefined : editing}
          defaultMilestone={groups.at(-1)?.milestone ?? '一、复现准备'}
          concepts={concepts}
          onClose={() => setEditing(null)}
          onSave={saveStep}
        />
      )}
      {history && <HistoryDialog history={history} concepts={concepts} onClose={() => setHistoryId(null)} />}
    </div>
  )
}

function groupByMilestone(steps: PlanStep[]): Array<{ milestone: string; steps: PlanStep[] }> {
  const groups: Array<{ milestone: string; steps: PlanStep[] }> = []
  for (const step of steps) {
    const last = groups.at(-1)
    if (last?.milestone === step.milestone) last.steps.push(step)
    else groups.push({ milestone: step.milestone, steps: [step] })
  }
  return groups
}

interface PlanStepDialogProps {
  step?: PlanStep
  defaultMilestone: string
  concepts: Concept[]
  onClose: () => void
  onSave: (step: PlanStep) => Promise<void>
}

function PlanStepDialog({ step, defaultMilestone, concepts, onClose, onSave }: PlanStepDialogProps) {
  const [draft, setDraft] = useState<PlanStep>(() => step ?? {
    projectId: 0, version: 1, milestone: defaultMilestone, title: '', detail: '', order: 0,
    estimatedMinutes: 60, status: 'todo', checkpoint: '', checkpointDone: false,
    conceptIds: [], source: 'manual', createdAt: 0, updatedAt: 0,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.milestone.trim() || !draft.title.trim() || !draft.checkpoint?.trim()) {
      setError('请填写里程碑、步骤标题和可观察的检查点。')
      return
    }
    setSaving(true)
    setError('')
    try { await onSave({ ...draft, milestone: draft.milestone.trim(), title: draft.title.trim(), checkpoint: draft.checkpoint?.trim() }) } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试。')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal plan-step-modal" role="dialog" aria-modal="true" aria-labelledby="plan-step-title">
        <header className="modal-head"><p className="kicker">计划编辑</p><h2 id="plan-step-title">{step ? '编辑步骤' : '新增步骤'}</h2><p className="modal-sub">检查点应描述可观察、可勾选的结果。</p></header>
        <form className="modal-body" onSubmit={(event) => void submit(event)}>
          <div className="form-two-columns">
            <label className="field"><span className="field-label">里程碑 *</span><input value={draft.milestone} onChange={(event) => setDraft({ ...draft, milestone: event.target.value })} /></label>
            <label className="field"><span className="field-label">估时（分钟）</span><input type="number" min={0} step={5} value={draft.estimatedMinutes ?? ''} onChange={(event) => setDraft({ ...draft, estimatedMinutes: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value)) })} /></label>
          </div>
          <label className="field"><span className="field-label">步骤标题 *</span><input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label className="field"><span className="field-label">执行说明</span><textarea rows={4} value={draft.detail ?? ''} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} /></label>
          <label className="field"><span className="field-label">检查点 *</span><textarea rows={2} value={draft.checkpoint ?? ''} onChange={(event) => setDraft({ ...draft, checkpoint: event.target.value })} /></label>
          <label className="field"><span className="field-label">状态</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as PlanStepStatus })}>{Object.entries(STATUS_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <fieldset className="field concept-picker"><legend className="field-label">所需前置卡片</legend><p className="field-hint">重新规划时，未掌握卡片会优先生成学习步骤。</p><div>{concepts.length === 0 ? <span className="field-hint">暂无概念卡片，可先在知识框图新增。</span> : concepts.map((concept) => concept.id !== undefined && <label key={concept.id}><input type="checkbox" checked={draft.conceptIds.includes(concept.id)} onChange={(event) => setDraft({ ...draft, conceptIds: event.target.checked ? [...draft.conceptIds, concept.id as number] : draft.conceptIds.filter((id) => id !== concept.id) })} /><span>{concept.name}</span><small>{MASTERY_LABEL[concept.mastery]}</small></label>)}</div></fieldset>
          <label className="inline-check"><input type="checkbox" checked={draft.checkpointDone} onChange={(event) => setDraft({ ...draft, checkpointDone: event.target.checked })} />检查点已完成</label>
          {error && <div className="notice error" role="alert">{error}</div>}
          <footer className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>取消</button><button className="btn btn-primary" disabled={saving}>{saving ? '正在保存…' : '保存步骤'}</button></footer>
        </form>
      </section>
    </div>
  )
}

function HistoryDialog({ history, concepts, onClose }: { history: PlanVersion; concepts: Concept[]; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <header className="modal-head"><p className="kicker">只读历史快照</p><h2 id="history-title">计划 v{history.version}</h2><p className="modal-sub">{formatDate(history.createdAt)} · {history.reason} · {history.steps.length} 步</p></header>
        <div className="modal-body history-steps">
          {history.steps.map((step) => <article key={step.id ?? `${step.title}-${step.order}`} className={`history-step status-${step.status}`}><span>{String(step.order + 1).padStart(2, '0')}</span><div><small>{step.milestone}</small><h3>{step.title}</h3><p>{step.checkpointDone ? '✓' : '○'} {step.checkpoint || '无检查点'} · {STATUS_LABEL[step.status]} · {formatMinutes(step.estimatedMinutes)}</p>{step.conceptIds.length > 0 && <p>前置：{step.conceptIds.map((id) => concepts.find((concept) => concept.id === id)?.name ?? '已删除卡片').join('、')}</p>}</div></article>)}
          <footer className="modal-actions"><button className="btn btn-primary" onClick={onClose}>看完了</button></footer>
        </div>
      </section>
    </div>
  )
}
