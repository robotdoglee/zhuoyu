import { describe, expect, it } from 'vitest'
import { compareMetric } from './metrics'

describe('指标对照', () => {
  it('计算绝对差和保留方向的偏差百分比', () => {
    const result = compareMetric({ ours: 26, paperValue: 27.3, higherIsBetter: true })
    expect(result.absoluteDifference).toBeCloseTo(1.3)
    expect(result.deviationPercent).toBeCloseTo(-4.7619, 3)
    expect(result.assessment).toBe('warn')
  })

  it('方向设置反转好坏，相同值为好', () => {
    const values = { ours: 24, paperValue: 27.3 }
    expect(compareMetric({ ...values, higherIsBetter: true }).assessment).toBe('bad')
    expect(compareMetric({ ...values, higherIsBetter: false }).assessment).toBe('good')
    expect(compareMetric({ ours: 27.3, paperValue: 27.3, higherIsBetter: true }).assessment).toBe('good')
  })

  it('原文为零时不伪装计算百分比，缺失值不评级', () => {
    expect(compareMetric({ ours: 1, paperValue: 0, higherIsBetter: true }).deviationPercent).toBeUndefined()
    expect(compareMetric({ ours: 1, paperValue: 0, higherIsBetter: true }).assessment).toBe('good')
    expect(compareMetric({ ours: undefined, paperValue: 1, higherIsBetter: true }).assessment).toBe('pending')
  })
})
