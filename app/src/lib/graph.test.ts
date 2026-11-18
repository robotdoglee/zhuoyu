import { describe, expect, it } from 'vitest'
import type { Concept, Mastery } from '../db/types'
import { buildLearningPath, findCycleMembers, wouldCreateCycle } from './graph'

function node(id: number, name: string, dependsOn: number[] = [], mastery: Mastery = 'unknown'): Concept {
  return {
    id,
    projectId: 1,
    name,
    summary: name,
    whyNeeded: '测试',
    difficulty: 1,
    mastery,
    dependsOn,
    resources: [],
    createdAt: id,
  }
}

describe('知识 DAG 学习路径', () => {
  it('按依赖拓扑排序，不会排在半会之前', () => {
    const path = buildLearningPath([
      node(3, '多头注意力', [2]),
      node(2, '自注意力', [1], 'half'),
      node(1, 'Softmax'),
    ])
    expect(path.map((item) => item.id)).toEqual([1, 2, 3])
  })

  it('目标标会后，移除目标及只服务于它的前置', () => {
    const concepts = [node(1, 'Softmax'), node(2, '自注意力', [1]), node(3, '多头注意力', [2])]
    expect(buildLearningPath(concepts).map((item) => item.id)).toEqual([1, 2, 3])
    expect(buildLearningPath(concepts.map((item) => item.id === 3 ? { ...item, mastery: 'known' } : item))).toEqual([])
  })

  it('共享前置仍被其他未掌握目标需要时保留', () => {
    const concepts = [
      node(1, 'Softmax'),
      node(2, '多头注意力', [1], 'known'),
      node(3, '标签平滑', [1]),
    ]
    expect(buildLearningPath(concepts).map((item) => item.id)).toEqual([1, 3])
  })

  it('识别会成环的新边与已有环', () => {
    const concepts = [node(1, 'A', [3]), node(2, 'B', [1]), node(3, 'C', [2])]
    expect(wouldCreateCycle(concepts, 1, 2)).toBe(true)
    expect(findCycleMembers(concepts)).toEqual(new Set([1, 2, 3]))
  })
})
