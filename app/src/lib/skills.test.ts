import { describe, expect, it } from 'vitest'
import type { Concept, Project } from '../db/types'
import { buildSkillTree } from './skills'

type TestConcept = Concept & { masteryUpdatedAt?: number }

function project(id: number, title: string): Project {
  return {
    id,
    title,
    goal: '测试',
    level: 'L1',
    device: '测试设备',
    createdAt: 1,
    updatedAt: 1,
  }
}

function concept(
  id: number,
  projectId: number,
  name: string,
  overrides: Partial<TestConcept> = {},
): TestConcept {
  return {
    id,
    projectId,
    name,
    summary: `${name}的解释`,
    whyNeeded: '测试',
    difficulty: 1,
    mastery: 'known',
    dependsOn: [],
    resources: [],
    createdAt: id * 10,
    ...overrides,
  }
}

describe('跨项目技能树', () => {
  it('同名概念只累计一次，保留两个可回溯来源并优先使用掌握时间', () => {
    const tree = buildSkillTree(
      [project(1, '注意力复现'), project(2, 'Transformer 复习')],
      [
        concept(11, 1, '  Layer   Normalization  ', {
          summary: '稳定每层激活的分布',
          difficulty: 2,
          createdAt: 100,
          masteryUpdatedAt: 240,
        }),
        concept(22, 2, 'layer normalization', { createdAt: 180 }),
        concept(33, 2, 'LAYER NORMALIZATION', { mastery: 'half', createdAt: 50 }),
      ],
    )

    expect(tree.nodes).toHaveLength(1)
    expect(tree.nodes[0]).toMatchObject({
      id: 'layer normalization',
      name: 'Layer Normalization',
      summary: '稳定每层激活的分布',
      difficulty: 2,
      firstMasteredAt: 180,
    })
    expect(tree.nodes[0].sources).toEqual([
      { projectId: 1, projectTitle: '注意力复现', conceptId: 11, masteredAt: 240 },
      { projectId: 2, projectTitle: 'Transformer 复习', conceptId: 22, masteredAt: 180 },
    ])
  })

  it('半会、不会的概念及其依赖不会进入技能树', () => {
    const empty = buildSkillTree(
      [project(1, '项目')],
      [
        concept(1, 1, '半会概念', { mastery: 'half' }),
        concept(2, 1, '不会概念', { mastery: 'unknown' }),
      ],
    )
    expect(empty).toEqual({ nodes: [], edges: [] })

    const tree = buildSkillTree(
      [project(1, '项目')],
      [
        concept(3, 1, '未掌握前置', { mastery: 'half' }),
        concept(4, 1, '已掌握目标', { dependsOn: [3] }),
      ],
    )
    expect(tree.nodes.map((node) => node.name)).toEqual(['已掌握目标'])
    expect(tree.edges).toEqual([])
  })

  it('跨项目重复依赖只保留一条边，并过滤自环和未知目标', () => {
    const tree = buildSkillTree(
      [project(1, '项目一'), project(2, '项目二')],
      [
        concept(1, 1, 'Softmax'),
        concept(2, 1, 'Attention', { dependsOn: [1, 1] }),
        concept(3, 2, ' softmax '),
        concept(4, 2, ' attention ', { dependsOn: [1, 3, 4] }),
        concept(5, 2, '自环', { dependsOn: [5] }),
        concept(6, 2, '未入库依赖', { mastery: 'unknown' }),
        concept(7, 2, '另一目标', { dependsOn: [6, 999] }),
      ],
    )

    expect(tree.edges).toEqual([
      { id: 'softmax->attention', source: 'softmax', target: 'attention' },
    ])
    expect(tree.nodes.map((node) => node.id)).toEqual([
      'softmax',
      'attention',
      '自环',
      '另一目标',
    ])
  })
})
