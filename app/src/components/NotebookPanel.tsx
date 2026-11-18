import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import { db } from '../db/db'
import type { Concept, NoteEntry, NoteKind, PlanStep } from '../db/types'
import { diagnoseErrorLog, diagnosisToMarkdown, type ErrorDiagnosis } from '../lib/errorAssistant'
import { loadLlmSettings } from '../lib/settings'

const KIND_LABEL: Record<NoteKind, string> = {
  command: '命令', code: '代码', result: '结果', error: '报错', idea: '想法', image: '截图',
}
const KIND_HINT: Record<NoteKind, string> = {
  command: '粘贴执行命令、运行目录和必要的环境变量。',
  code: '记录关键代码或 diff，推荐使用 Markdown 代码块。',
  result: '记录损失、输出、观察到的现象与下一步。',
  error: '保存报错堆栈、定位过程和最终解决办法。',
  idea: '留下假设、灵感和「论文没写的细节」。',
  image: '上传本地截图，并补充图中结论；图片不会上传。',
}

interface NotebookPanelProps {
  projectId: number
  onOpenPlan: () => void
}

export default function NotebookPanel({ projectId, onOpenPlan }: NotebookPanelProps) {
  const [notes, setNotes] = useState<NoteEntry[]>([])
  const [steps, setSteps] = useState<PlanStep[]>([])
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<NoteKind>('command')
  const [stepId, setStepId] = useState<number | ''>('')
  const [content, setContent] = useState('')
  const [imageData, setImageData] = useState<string>()
  const [preview, setPreview] = useState(false)
  const [completeCheckpoint, setCompleteCheckpoint] = useState(false)
  const [completeStep, setCompleteStep] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stepFilter, setStepFilter] = useState<number | 'all'>('all')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [errorLog, setErrorLog] = useState('')
  const [errorStepId, setErrorStepId] = useState<number | ''>('')
  const [diagnosing, setDiagnosing] = useState(false)
  const [diagnosis, setDiagnosis] = useState<ErrorDiagnosis>()
  const [assistantError, setAssistantError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const settings = loadLlmSettings()
  const hasKey = Boolean(settings.apiKey.trim())

  const load = useCallback(async () => {
    const [noteRows, stepRows, conceptRows] = await Promise.all([
      db.notes.where('projectId').equals(projectId).toArray(),
      db.planSteps.where('projectId').equals(projectId).toArray(),
      db.concepts.where('projectId').equals(projectId).toArray(),
    ])
    const sortedSteps = stepRows.sort((a, b) => a.order - b.order)
    setNotes(noteRows.sort((a, b) => b.createdAt - a.createdAt))
    setSteps(sortedSteps)
    setConcepts(conceptRows.sort((a, b) => a.createdAt - b.createdAt))
    setStepId((current) => current || sortedSteps.find((step) => step.status !== 'done')?.id || sortedSteps[0]?.id || '')
    setErrorStepId((current) => current || sortedSteps.find((step) => step.status === 'doing')?.id || sortedSteps[0]?.id || '')
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  const filteredNotes = useMemo(
    () => stepFilter === 'all' ? notes : notes.filter((note) => note.stepId === stepFilter || note.stepIds.includes(stepFilter)),
    [notes, stepFilter],
  )
  const selectedStep = steps.find((step) => step.id === stepId)

  function insertMention(type: 'concept' | 'step', id: number, label: string) {
    const token = `[@${type === 'concept' ? '卡片' : '步骤'}：${label}](#${type}-${id})`
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? content.length
    const end = textarea?.selectionEnd ?? start
    const before = content.slice(0, start)
    const after = content.slice(end)
    const atEnd = end === content.length
    // 在代码块末尾插入时必须另起一段，否则收尾 ``` 后的引用不会被 Markdown 解析。
    const prefix = atEnd && before.trim()
      ? (before.endsWith('\n\n') ? '' : '\n\n')
      : before && !/[\s(（]$/.test(before) ? ' ' : ''
    const suffix = !atEnd && after && !/^\s/.test(after) ? ' ' : ''
    const next = `${before}${prefix}${token}${suffix}${after}`
    setContent(next)
    setPreview(false)
    window.requestAnimationFrame(() => {
      const position = (before + prefix + token + suffix).length
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(position, position)
    })
  }

  async function selectImage(file?: File) {
    setError('')
    if (!file) return
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setError('截图仅支持 PNG、JPEG、WebP 或 GIF。')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('截图不能超过 3 MB，请压缩后再试。')
      return
    }
    try {
      const data = await readFileAsDataUrl(file)
      setImageData(data)
      setNotice(`已选择截图「${file.name}」，只保存在本机。`)
    } catch {
      setError('截图读取失败，请重新选择。')
    }
  }

  async function saveNote() {
    if (saving) return
    if (!content.trim() && !imageData) {
      setError('请填写记录内容；纯截图记录请至少选择一张图片。')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    const now = Date.now()
    const primaryStepId = stepId === '' ? undefined : stepId
    const conceptIds = mentionIds(content, 'concept')
    const stepIds = [...new Set([...mentionIds(content, 'step'), ...(primaryStepId === undefined ? [] : [primaryStepId])])]
    const note: Omit<NoteEntry, 'id'> = {
      projectId,
      stepId: primaryStepId,
      kind,
      content: content.trim(),
      conceptIds,
      stepIds,
      completeCheckpoint: completeStep || completeCheckpoint,
      completeStep,
      imageData,
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    }
    try {
      const id = await db.transaction('rw', [db.notes, db.planSteps], async () => {
        const noteId = await db.notes.add(note)
        if (primaryStepId !== undefined && (completeCheckpoint || completeStep)) {
          await db.planSteps.update(primaryStepId, {
            ...(completeStep ? { status: 'done' as const } : {}),
            checkpointDone: true,
            updatedAt: now,
          })
        }
        return noteId
      })
      setNotes((current) => [{ ...note, id }, ...current])
      if (primaryStepId !== undefined && (completeCheckpoint || completeStep)) {
        setSteps((current) => current.map((step) => step.id === primaryStepId ? {
          ...step,
          ...(completeStep ? { status: 'done' as const } : {}),
          checkpointDone: true,
          updatedAt: now,
        } : step))
      }
      setContent('')
      setImageData(undefined)
      setCompleteCheckpoint(false)
      setCompleteStep(false)
      setPreview(false)
      setNotice(completeStep ? '记录已保存，关联步骤及其检查点已完成。' : completeCheckpoint ? '记录已保存，关联检查点已勾掉。' : '记录已保存到本机。')
    } catch (err) {
      setError(err instanceof Error ? `保存失败：${err.message}` : '保存失败，请检查浏览器存储后重试。')
    } finally {
      setSaving(false)
    }
  }

  async function removeNote(note: NoteEntry) {
    if (note.id === undefined || !window.confirm('删除这条记录？已经回写到计划的检查点和状态不会自动撤销。')) return
    await db.notes.delete(note.id)
    setNotes((current) => current.filter((item) => item.id !== note.id))
  }

  async function runErrorAssistant() {
    if (diagnosing) return
    const currentSettings = loadLlmSettings()
    if (!currentSettings.apiKey.trim()) {
      setAssistantError('未配置 API Key，报错助手不可用；日志未发送，也不会离开本机。')
      return
    }
    if (!errorLog.trim()) {
      setAssistantError('请先粘贴需要分析的日志。')
      return
    }
    setDiagnosing(true)
    setAssistantError('')
    setDiagnosis(undefined)
    try {
      const result = await diagnoseErrorLog(currentSettings, errorLog)
      const now = Date.now()
      const primaryStepId = errorStepId === '' ? undefined : errorStepId
      const note: Omit<NoteEntry, 'id'> = {
        projectId,
        stepId: primaryStepId,
        kind: 'error',
        content: diagnosisToMarkdown(errorLog, result),
        conceptIds: [],
        stepIds: primaryStepId === undefined ? [] : [primaryStepId],
        completeCheckpoint: false,
        completeStep: false,
        source: 'error-assistant',
        createdAt: now,
        updatedAt: now,
      }
      const id = await db.notes.add(note)
      setNotes((current) => [{ ...note, id }, ...current])
      setDiagnosis(result)
      setErrorLog('')
      setNotice('关键报错与排查建议已自动记入记事本。')
    } catch (err) {
      setAssistantError(err instanceof Error ? err.message : '诊断失败，日志未写入记事本。')
    } finally {
      setDiagnosing(false)
    }
  }

  return (
    <div className="notebook-workspace">
      <section className="workspace-heading">
        <div><p className="kicker">M2 / 复现记事本</p><h2>让每次运行都留下证据</h2><p>按步骤保存命令、代码、结果与报错；@引用保持知识之间的来路。</p></div>
        <button className="btn btn-ghost" onClick={onOpenPlan}>返回复现计划 →</button>
      </section>
      {notice && <div className="notice ok" role="status">{notice}</div>}

      <section className="note-composer" aria-labelledby="note-composer-title">
        <header><div><p className="kicker">新记录</p><h3 id="note-composer-title">这一步，实际发生了什么</h3></div><span>Markdown · 本地保存</span></header>
        <div className="note-composer-grid">
          <div className="note-composer-main">
            <div className="note-form-row">
              <label className="field"><span className="field-label">关联步骤</span><select value={stepId} onChange={(event) => setStepId(event.target.value === '' ? '' : Number(event.target.value))}><option value="">不关联（自由记录）</option>{steps.map((step) => <option key={step.id} value={step.id}>{step.milestone} / {step.title}</option>)}</select></label>
              <label className="field"><span className="field-label">记录类型</span><select value={kind} onChange={(event) => { setKind(event.target.value as NoteKind); if (event.target.value !== 'image') setImageData(undefined) }}>{Object.entries(KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            <div className="note-editor-toolbar">
              <div><select aria-label="插入卡片引用" value="" onChange={(event) => { const concept = concepts.find((item) => item.id === Number(event.target.value)); if (concept?.id !== undefined) insertMention('concept', concept.id, concept.name) }}><option value="" disabled>＠ 卡片</option>{concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.name}</option>)}</select><select aria-label="插入步骤引用" value="" onChange={(event) => { const step = steps.find((item) => item.id === Number(event.target.value)); if (step?.id !== undefined) insertMention('step', step.id, step.title) }}><option value="" disabled>＠ 步骤</option>{steps.map((step) => <option key={step.id} value={step.id}>{step.title}</option>)}</select></div>
              <button className={`btn btn-quiet btn-sm ${preview ? 'active' : ''}`} onClick={() => setPreview((value) => !value)}>{preview ? '继续编辑' : '预览 Markdown'}</button>
            </div>
            {preview ? <div className="markdown-body note-preview">{content ? <NoteMarkdown content={content} /> : <p className="muted">暂无文字内容。</p>}{imageData && <img className="note-image" src={imageData} alt="待保存的复现截图" />}</div> : <textarea ref={textareaRef} className="note-editor" rows={9} value={content} placeholder={`${KIND_HINT[kind]}\n\n支持 **加粗**、列表、代码块；用上方菜单插入 @卡片 / @步骤。`} onChange={(event) => setContent(event.target.value)} />}
            {kind === 'image' && <div className="image-picker"><label className="btn btn-ghost btn-sm">选择本地截图<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { void selectImage(event.target.files?.[0]); event.target.value = '' }} /></label><span>PNG / JPEG / WebP / GIF，不超过 3 MB{imageData ? ' · 已选择 1 张' : ''}</span></div>}
            {selectedStep?.checkpoint && <div className="note-checkpoint-context"><b>当前检查点</b><span>{selectedStep.checkpoint}</span><small>{selectedStep.checkpointDone ? '已勾掉' : '未完成'}</small></div>}
            <div className="note-linkage">
              <label><input type="checkbox" disabled={stepId === '' || completeStep} checked={completeCheckpoint || completeStep} onChange={(event) => setCompleteCheckpoint(event.target.checked)} />保存后勾掉关联步骤检查点</label>
              <label><input type="checkbox" disabled={stepId === ''} checked={completeStep} onChange={(event) => { setCompleteStep(event.target.checked); if (event.target.checked) setCompleteCheckpoint(true) }} />保存后将关联步骤标为完成</label>
            </div>
            {error && <div className="notice error" role="alert">{error}</div>}
            <footer><span>{content.length} 字 · 图片与文字均存入 IndexedDB</span><button className="btn btn-primary" disabled={saving} onClick={() => void saveNote()}>{saving ? '正在保存…' : '保存记录'}</button></footer>
          </div>
        </div>
      </section>

      <section className="error-assistant" aria-labelledby="error-assistant-title">
        <header><div><p className="kicker">报错助手</p><h3 id="error-assistant-title">从一长串日志里，找到真正的报错</h3><p>抽取关键报错与排查建议，成功后自动写入记事本。</p></div><Link className="btn btn-quiet btn-sm" to="/settings">LLM 设置 →</Link></header>
        {!hasKey && <div className="notice warn"><b>当前不可用：未配置 API Key。</b> 日志仅保留在这个输入框，不会发送任何数据；配置 Key 与模型后可主动调用。</div>}
        <div className="error-assistant-grid">
          <div><label className="field"><span className="field-label">关联步骤</span><select value={errorStepId} onChange={(event) => setErrorStepId(event.target.value === '' ? '' : Number(event.target.value))}><option value="">不关联步骤</option>{steps.map((step) => <option key={step.id} value={step.id}>{step.title}</option>)}</select></label><textarea rows={7} value={errorLog} onChange={(event) => { setErrorLog(event.target.value); setDiagnosis(undefined) }} placeholder="粘贴训练或评测日志；只有点击「分析并记入」且已配置 Key 时才会发送。" /><button className="btn btn-ghost" disabled={!hasKey || !errorLog.trim() || diagnosing} onClick={() => void runErrorAssistant()}>{diagnosing ? '正在分析…' : '分析并记入记事本'}</button></div>
          <div className="diagnosis-result">{diagnosis ? <><h4>{diagnosis.summary}</h4><b>关键报错</b><ul>{diagnosis.keyErrors.map((item) => <li key={item}>{item}</li>)}</ul><b>排查建议</b><ol>{diagnosis.suggestions.map((item) => <li key={item}>{item}</li>)}</ol><span className="notice ok">已写入记事本</span></> : <div className="diagnosis-empty"><span aria-hidden="true">查</span><p>{hasKey ? '诊断结果会在这里出现，同时生成一条「报错」记录。' : '无 Key 时不会进行启发式猜测，也不会发起网络请求。'}</p></div>}</div>
        </div>
        {assistantError && <div className="notice error" role="alert">{assistantError}</div>}
      </section>

      <section className="note-list-section" aria-labelledby="note-list-title">
        <header><div><p className="kicker">记录流</p><h3 id="note-list-title">复现过程，按时间倒序</h3></div><label>筛选步骤<select value={stepFilter} onChange={(event) => setStepFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value="all">全部记录（{notes.length}）</option>{steps.map((step) => <option key={step.id} value={step.id}>{step.title}</option>)}</select></label></header>
        {loading ? <div className="page-loading"><span className="loading-dot" />正在读取记录…</div> : filteredNotes.length === 0 ? <div className="note-list-empty"><span>还没有{stepFilter === 'all' ? '' : '这一步的'}记录。先保存一条命令、结果或想法。</span></div> : <div className="note-list">{filteredNotes.map((note) => {
          const step = steps.find((item) => item.id === note.stepId)
          return <article className={`note-card note-${note.kind}`} key={note.id} id={`note-${note.id}`}><header><div><span className={`note-kind kind-${note.kind}`}>{KIND_LABEL[note.kind]}</span>{note.source === 'error-assistant' && <span className="note-source">报错助手</span>}{note.source === 'example' && <span className="note-source">示例</span>}<time>{new Date(note.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></div><button className="btn btn-quiet btn-sm danger" onClick={() => void removeNote(note)}>删除</button></header><div className="note-step-reference">{step ? `@步骤：${step.title}` : note.stepId ? '@步骤：原步骤已删除' : '自由记录'}</div><div className="markdown-body"><NoteMarkdown content={note.content || '（截图记录）'} onStepMention={(id) => setStepFilter(id)} />{note.imageData && <img className="note-image" src={note.imageData} alt="复现过程截图" />}</div>{(note.completeCheckpoint || note.completeStep) && <footer><span className="note-writeback">{note.completeStep ? '✓ 已回写：检查点完成 · 步骤完成' : '✓ 已回写：检查点完成'}</span></footer>}</article>
        })}</div>}
      </section>
    </div>
  )
}

function NoteMarkdown({ content, onStepMention }: { content: string; onStepMention?: (id: number) => void }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    a({ href, children }) {
      const conceptMatch = href?.match(/^#concept-(\d+)$/)
      const stepMatch = href?.match(/^#step-(\d+)$/)
      if (conceptMatch) return <span className="note-mention concept-mention">{children}</span>
      if (stepMatch) return onStepMention ? <button type="button" className="note-mention step-mention" onClick={() => onStepMention(Number(stepMatch[1]))}>{children}</button> : <span className="note-mention step-mention">{children}</span>
      return <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer noopener">{children}</a>
    },
    img({ src, alt }) {
      if (typeof src === 'string' && src.startsWith('data:image/')) return <img src={src} alt={alt ?? ''} />
      return <span className="blocked-image">外部图片未加载，请使用本地截图上传。</span>
    },
  }}>{content}</ReactMarkdown>
}

function mentionIds(content: string, type: 'concept' | 'step'): number[] {
  const expression = new RegExp(`\\]\\(#${type}-(\\d+)\\)`, 'g')
  return [...new Set([...content.matchAll(expression)].map((match) => Number(match[1])).filter((id) => Number.isSafeInteger(id) && id > 0))]
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('图片格式不可读取'))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
