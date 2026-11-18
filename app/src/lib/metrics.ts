import type { Metric } from '../db/types'

export type MetricAssessment = 'good' | 'warn' | 'bad' | 'pending'

export interface MetricComparison {
  /** my - paper；用于判断方向 */
  difference?: number
  /** |my - paper|，界面显示为绝对差 */
  absoluteDifference?: number
  /** (my - paper) / |paper| × 100，保留正负方向 */
  deviationPercent?: number
  assessment: MetricAssessment
}

export function compareMetric(metric: Pick<Metric, 'ours' | 'paperValue' | 'higherIsBetter'>): MetricComparison {
  const { ours, paperValue, higherIsBetter } = metric
  if (ours === undefined || paperValue === undefined || !Number.isFinite(ours) || !Number.isFinite(paperValue)) {
    return { assessment: 'pending' }
  }
  const difference = ours - paperValue
  const absoluteDifference = Math.abs(difference)
  const deviationPercent = paperValue === 0 ? undefined : difference / Math.abs(paperValue) * 100
  const directionalDifference = higherIsBetter ? difference : -difference
  let assessment: MetricAssessment
  if (Math.abs(directionalDifference) < 1e-12) assessment = 'good'
  else if (directionalDifference > 0) assessment = 'good'
  else if (deviationPercent !== undefined && Math.abs(deviationPercent) <= 5) assessment = 'warn'
  else assessment = 'bad'
  return { difference, absoluteDifference, deviationPercent, assessment }
}

export function formatMetricNumber(value: number | undefined, digits = 4): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: digits }).format(value)
}

export function formatSigned(value: number | undefined, suffix = ''): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatMetricNumber(value, 2)}${suffix}`
}
