import { describe, expect, it } from 'vitest'
import type { Concept, Element, TextChunk } from '../db/types'
import {
  extractHeuristically,
  keyNumbersFrom,
  relatedConceptsOf,
  relatedElementsOf,
  sectionAround,
} from './elements'

const chunk: TextChunk = {
  id: 'p3-1',
  projectId: 1,
  paperId: 1,
  page: 3,
  startOffset: 0,
  endOffset: 120,
  text: '3.2.2 Multi-Head Attention\nIn this work we employ h = 8 parallel attention layers, or heads.',
  createdAt: 1,
}

describe('拆解详情字段', () => {
  it('启发式抽取会补齐章节与关键数字', () => {
    const drafts = extractHeuristically([chunk])
    const architecture = drafts.find((draft) => draft.type === 'architecture')
    expect(architecture).toBeDefined()
    expect(architecture?.section).toBe('3.2.2 Multi-Head Attention')
    expect(architecture?.keyNumbers?.length ?? 0).toBeGreaterThan(0)
  })

  it('章节识别跳过正文，只取编号标题行', () => {
    const text = '4.2 CIFAR-10 and Analysis\nThe dataset has 50,000 images.'
    expect(sectionAround(text, text.indexOf('The dataset'))).toBe('4.2 CIFAR-10 and Analysis')
    expect(sectionAround('plain paragraph without headings', 3)).toBeUndefined()
  })

  it('关键数字去重并限制数量', () => {
    expect(keyNumbersFrom('N = 6 layers, h = 8 heads, 3.5 days, 8 heads')).toEqual([
      '6',
      '8',
      '3.5',
    ])
    expect(keyNumbersFrom('1 2 3 4 5 6 7 8')).toHaveLength(6)
  })
})

describe('拆解关联解析', () => {
  const elements: Element[] = [
    { id: 1, projectId: 1, type: 'architecture', label: '编码器', value: '', createdAt: 1, relatedLabels: ['解码器'] },
    { id: 2, projectId: 1, type: 'architecture', label: '解码器', value: '', createdAt: 1 },
    { id: 3, projectId: 1, type: 'task', label: '任务', value: '', createdAt: 1 },
  ]
  const concepts: Concept[] = [
    {
      id: 10,
      projectId: 1,
      name: '多头注意力',
      summary: '',
      whyNeeded: '',
      difficulty: 2,
      mastery: 'unknown',
      dependsOn: [],
      resources: [],
      createdAt: 1,
    },
  ]

  it('按 label 关联其他卡片并忽略自身与不存在的条目', () => {
    const related = relatedElementsOf({ ...elements[0], relatedLabels: ['解码器', '编码器', '已删除'] }, elements)
    expect(related.map((element) => element.label)).toEqual(['解码器'])
  })

  it('没有关联字段的旧数据返回空数组', () => {
    expect(relatedElementsOf(elements[2], elements)).toEqual([])
    expect(relatedConceptsOf(elements[2], concepts)).toEqual([])
  })

  it('按名称解析知识点', () => {
    const element = { ...elements[2], relatedConceptNames: ['多头注意力', '不存在'] }
    expect(relatedConceptsOf(element, concepts).map((concept) => concept.name)).toEqual(['多头注意力'])
  })
})
