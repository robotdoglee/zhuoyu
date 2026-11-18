import { useEffect, useState, type FormEvent } from 'react'
import { db } from '../db/db'
import { LEVEL_OPTIONS, type ReproduceLevel } from '../db/types'

interface NewProjectDialogProps {
  onClose: () => void
  onCreated: (projectId: number) => void
}

export default function NewProjectDialog({ onClose, onCreated }: NewProjectDialogProps) {
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState<ReproduceLevel>('L2')
  const [device, setDevice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedGoal = goal.trim()

    if (!trimmedTitle) {
      setError('先给这个复现项目起个名字。')
      return
    }
    if (!trimmedGoal) {
      setError('写一句复现目标吧，哪怕只是「跑通官方代码」。')
      return
    }

    setSaving(true)
    setError('')
    try {
      const now = Date.now()
      const id = await db.projects.add({
        title: trimmedTitle,
        goal: trimmedGoal,
        level,
        device: device.trim(),
        createdAt: now,
        updatedAt: now,
      })
      if (id === undefined) throw new Error('项目已保存，但没有拿到编号，请刷新后重试。')
      onCreated(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试。')
      setSaving(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
        <div className="modal-head">
          <p className="kicker">新建 · 复现项目</p>
          <h2 id="new-project-title">开始雕琢一篇论文</h2>
          <p className="modal-sub">先定下目标的形状，论文和计划可以慢慢补。</p>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="project-title">
              项目名称
            </label>
            <input
              id="project-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：Attention Is All You Need 复现"
              autoFocus
              maxLength={80}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="project-goal">
              复现目标
            </label>
            <textarea
              id="project-goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="想亲手验证什么？例如：在单卡 3060 上复现论文主表的 BLEU，并跑通一遍训练流程。"
              rows={3}
            />
            <p className="field-hint">之后可以随复盘调整；越具体，计划越容易落地。</p>
          </div>

          <fieldset className="field level-field">
            <legend className="field-label">复现级别</legend>
            <div className="level-options">
              {LEVEL_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`level-option ${level === option.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="level"
                    value={option.value}
                    checked={level === option.value}
                    onChange={() => setLevel(option.value)}
                  />
                  <strong>{option.value}</strong>
                  <b>{option.short}</b>
                  <span>{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label className="field-label" htmlFor="project-device">
              设备与算力
            </label>
            <textarea
              id="project-device"
              value={device}
              onChange={(event) => setDevice(event.target.value)}
              placeholder="例如：MacBook Pro M3 18GB；可用 RTX 3060 12GB（实验室）"
              rows={2}
            />
            <p className="field-hint">用于后续判断论文的算力门槛，可留空。</p>
          </div>

          {error && <div className="notice error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '创建中…' : '创建并导入论文'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
