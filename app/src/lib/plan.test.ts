import { describe, expect, it } from 'vitest'
import type { Concept, PlanStep, Project } from '../db/types'
import { buildHeuristicPlan, moveStep, replanSteps } from './plan'

const project = (level: Project['level']): Project => ({ id: 1, title: '测试', goal: '测试', level, device: '', createdAt: 1, updatedAt: 1 })
const concept: Concept = { id: 8, projectId: 1, name: '多头注意力', summary: '', whyNeeded: '', difficulty: 2, mastery: 'unknown', dependsOn: [], resources: [], createdAt: 1 }

function step(id: number, title: string, status: PlanStep['status'], conceptIds: number[] = []): PlanStep {
  return { id, projectId: 1, milestone: '里程碑', version: 1, title, order: id - 1, status, checkpoint: `检查${id}`, checkpointDone: status === 'done', conceptIds, source: 'example', createdAt: id, updatedAt: id }
}

describe('分级复现计划', () => {
  it('三种级别在步骤粒度与检查点上有可辨差异', () => {
    const l1 = buildHeuristicPlan(project('L1'), [concept])
    const l2 = buildHeuristicPlan(project('L2'), [concept])
    const l3 = buildHeuristicPlan(project('L3'), [concept])
    expect(l1.some((item) => item.title.includes('官方'))).toBe(true)
    expect(l2.some((item) => item.title.includes('主表') || item.checkpoint?.includes('主表'))).toBe(true)
    expect(l3.some((item) => item.title.includes('随机种子'))).toBe(true)
    expect(new Set([l1.map((item) => item.title).join(), l2.map((item) => item.title).join(), l3.map((item) => item.title).join()]).size).toBe(3)
  })

  it('重排保留完成状态与检查点，把受阻提前并补入未掌握前置', () => {
    const result = replanSteps([step(1, '已完成', 'done'), step(2, '正式训练', 'blocked', [8]), step(3, '进行中', 'doing')], [concept])
    expect(result[0].title).toBe('补齐前置：多头注意力')
    expect(result[1].id).toBe(2)
    expect(result.at(-1)?.status).toBe('done')
    expect(result.find((item) => item.id === 1)?.checkpointDone).toBe(true)
    expect(replanSteps([step(2, '正式训练', 'blocked', [8])], [{ ...concept, mastery: 'known' }])).toHaveLength(1)
  })

  it('拖拽排序同步顺序和跨里程碑归属', () => {
    const moved = moveStep([step(1, '一', 'todo'), { ...step(2, '二', 'todo'), milestone: '验收' }], 1, 2)
    expect(moved.map((item) => [item.id, item.order, item.milestone])).toEqual([[2, 0, '验收'], [1, 1, '验收']])
  })
})
