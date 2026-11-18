import { Link } from 'react-router-dom'

interface StateAction {
  label: string
  onClick: () => void
  disabled?: boolean
}

interface AsyncStateProps {
  status: 'loading' | 'error' | 'empty'
  title: string
  description?: string
  action?: StateAction
  secondaryAction?: StateAction
  compact?: boolean
}

export default function AsyncState({
  status,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
}: AsyncStateProps) {
  return (
    <section
      className={`async-state async-state-${status} ${compact ? 'async-state-compact' : ''}`}
      role={status === 'error' ? 'alert' : 'status'}
      aria-busy={status === 'loading'}
    >
      <span className="async-state-glyph" aria-hidden="true">
        {status === 'loading' ? <span className="loading-dot" /> : status === 'error' ? '!' : '玉'}
      </span>
      <div className="async-state-copy">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {(action || secondaryAction || status === 'error') && (
        <div className="async-state-actions">
          {action && (
            <button className="btn btn-primary" disabled={action.disabled} onClick={action.onClick}>
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button className="btn btn-ghost" disabled={secondaryAction.disabled} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          )}
          {status === 'error' && <Link className="btn btn-quiet" to="/">返回首页</Link>}
        </div>
      )}
    </section>
  )
}
