import { describe, expect, it } from 'vitest'
import { verifyAnchor } from './anchors'
import { ELEMENT_TYPE_META } from './elements'
import {
  RESNET_EXAMPLE_CONCEPTS,
  RESNET_EXAMPLE_DEPENDENCIES,
  RESNET_EXAMPLE_ELEMENTS,
  RESNET_EXAMPLE_METRICS,
  RESNET_EXAMPLE_NOTES,
  RESNET_EXAMPLE_PAGES,
  RESNET_EXAMPLE_PLAN,
} from './resnetExample'

describe('ResNet on CIFAR-10 内置示例', () => {
  it('包含连续页码和覆盖九类的可核对拆解', () => {
    expect(RESNET_EXAMPLE_PAGES.map((page) => page.page)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    )
    expect(new Set(RESNET_EXAMPLE_ELEMENTS.map((element) => element.type))).toEqual(
      new Set(ELEMENT_TYPE_META.map((meta) => meta.type)),
    )
    for (const element of RESNET_EXAMPLE_ELEMENTS) {
      expect(verifyAnchor(RESNET_EXAMPLE_PAGES, element.page, element.quote), element.label).toBe(true)
    }
  })

  it('知识框图引用完整且没有环', () => {
    const names = new Set(RESNET_EXAMPLE_CONCEPTS.map((concept) => concept.name))
    const visiting = new Set<string>()
    const visited = new Set<string>()
    function visit(name: string) {
      expect(visiting.has(name), `概念依赖出现环：${name}`).toBe(false)
      if (visited.has(name)) return
      visiting.add(name)
      for (const dependency of RESNET_EXAMPLE_DEPENDENCIES[name] ?? []) {
        expect(names.has(dependency), dependency).toBe(true)
        visit(dependency)
      }
      visiting.delete(name)
      visited.add(name)
    }
    for (const name of names) visit(name)
    expect(RESNET_EXAMPLE_CONCEPTS.length).toBeGreaterThanOrEqual(8)
  })

  it('同时提供 L1/L2 计划、过程笔记、指标和隐藏细节', () => {
    expect(RESNET_EXAMPLE_PLAN.some((step) => step.milestone.startsWith('L1'))).toBe(true)
    expect(RESNET_EXAMPLE_PLAN.some((step) => step.milestone.startsWith('L2'))).toBe(true)
    expect(RESNET_EXAMPLE_PLAN.every((step) => step.checkpoint.length > 0)).toBe(true)
    expect(RESNET_EXAMPLE_NOTES.length).toBeGreaterThanOrEqual(5)
    expect(RESNET_EXAMPLE_NOTES.filter((note) => note.hiddenDetailType).length).toBeGreaterThanOrEqual(2)
    expect(RESNET_EXAMPLE_METRICS).toHaveLength(4)
    expect(RESNET_EXAMPLE_METRICS.every((metric) => !metric.higherIsBetter)).toBe(true)
    expect(RESNET_EXAMPLE_METRICS.every((metric) => metric.paperValue > 0 && metric.ours > 0)).toBe(true)
  })
})
