import { useCallback, useEffect, useState } from 'react'
import { db } from '../db/db'
import type { Metric } from '../db/types'
import { compareMetric, formatMetricNumber, formatSigned } from '../lib/metrics'

export default function MetricTable({ projectId }: { projectId: number }) {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const rows = await db.metrics.where('projectId').equals(projectId).toArray()
    setMetrics(rows.sort((a, b) => a.createdAt - b.createdAt))
    setLoading(false)
  }, [projectId])

  useEffect(() => { void load() }, [load])

  async function addMetric() {
    const now = Date.now()
    const id = await db.metrics.add({ projectId, name: '', higherIsBetter: true, createdAt: now })
    setMetrics((current) => [...current, { id, projectId, name: '', higherIsBetter: true, createdAt: now }])
  }

  function update(metric: Metric, changes: Partial<Metric>) {
    if (metric.id === undefined) return
    setMetrics((current) => current.map((item) => item.id === metric.id ? { ...item, ...changes } : item))
    void db.metrics.update(metric.id, changes).catch(() => {
      setError('指标保存失败，请检查浏览器存储空间后重试。')
      void load()
    })
  }

  async function remove(metric: Metric) {
    if (metric.id === undefined || !window.confirm(`删除指标「${metric.name || '未命名'}」？`)) return
    await db.metrics.delete(metric.id)
    setMetrics((current) => current.filter((item) => item.id !== metric.id))
  }

  return (
    <section className="metrics-section" aria-labelledby="metrics-title">
      <div className="metrics-heading">
        <div><p className="kicker">M2 / 指标对照</p><h2 id="metrics-title">我的结果，离原文有多远</h2><p>绝对差 = |我的 − 原文|；偏差保留方向。改善为绿色，5% 内退步为棕色，更大偏离为红色。</p></div>
        <button className="btn btn-ghost" onClick={() => void addMetric()}>＋ 录入指标</button>
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      {loading ? <div className="page-loading"><span className="loading-dot" />正在读取指标…</div> : metrics.length === 0 ? (
        <div className="metrics-empty"><span>还没有对照指标。录入论文数值与自己的实验值，偏差会实时计算并存入本机。</span><button className="btn btn-quiet btn-sm" onClick={() => void addMetric()}>添加第一行 →</button></div>
      ) : (
        <div className="metric-table-wrap">
          <table className="metric-table">
            <thead><tr><th>指标 / 单位</th><th>原文数值</th><th>我的数值</th><th>方向</th><th>绝对差</th><th>偏差百分比</th><th>判断</th><th><span className="visually-hidden">操作</span></th></tr></thead>
            <tbody>{metrics.map((metric) => {
              const comparison = compareMetric(metric)
              return <tr key={metric.id} className={`metric-${comparison.assessment}`}>
                <td><input className="metric-name" aria-label="指标名称" placeholder="例如：英德 BLEU" value={metric.name} onChange={(event) => update(metric, { name: event.target.value })} /><input className="metric-unit" aria-label="指标单位" placeholder="单位（可选）" value={metric.unit ?? ''} onChange={(event) => update(metric, { unit: event.target.value })} /></td>
                <td><input type="number" step="any" aria-label={`${metric.name || '指标'}原文数值`} placeholder="27.3" value={metric.paperValue ?? ''} onChange={(event) => update(metric, { paperValue: numberInput(event.target.value) })} /></td>
                <td><input type="number" step="any" aria-label={`${metric.name || '指标'}我的数值`} placeholder="26.0" value={metric.ours ?? ''} onChange={(event) => update(metric, { ours: numberInput(event.target.value) })} /></td>
                <td><select aria-label={`${metric.name || '指标'}优化方向`} value={metric.higherIsBetter ? 'higher' : 'lower'} onChange={(event) => update(metric, { higherIsBetter: event.target.value === 'higher' })}><option value="higher">越高越好 ↑</option><option value="lower">越低越好 ↓</option></select></td>
                <td><strong>{formatMetricNumber(comparison.absoluteDifference)}</strong>{comparison.difference !== undefined && <small>{comparison.difference > 0 ? '我的更高' : comparison.difference < 0 ? '我的更低' : '完全一致'}</small>}</td>
                <td><strong>{comparison.deviationPercent === undefined && comparison.difference !== undefined ? '原文为 0' : formatSigned(comparison.deviationPercent, '%')}</strong></td>
                <td><span className={`metric-assessment ${comparison.assessment}`}>{assessmentLabel(comparison.assessment)}</span></td>
                <td><button className="btn btn-quiet btn-sm danger" aria-label={`删除指标 ${metric.name || '未命名'}`} onClick={() => void remove(metric)}>删除</button></td>
              </tr>
            })}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function numberInput(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function assessmentLabel(assessment: ReturnType<typeof compareMetric>['assessment']): string {
  return assessment === 'good' ? '一致或更优' : assessment === 'warn' ? '轻微退步' : assessment === 'bad' ? '偏离较大' : '待录入'
}
