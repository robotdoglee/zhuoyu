import { describe, expect, it } from 'vitest'
import { verifyAnchor } from './anchors'
import { ELEMENT_TYPE_META } from './elements'
import { EXAMPLE_CONCEPTS, EXAMPLE_ELEMENTS, EXAMPLE_PAGES } from './example'

describe('Attention Is All You Need 内置示例', () => {
  it('页码连续、覆盖九类且引文可核实', () => {
    expect(EXAMPLE_PAGES.map((page) => page.page)).toEqual(
      Array.from({ length: 11 }, (_, index) => index + 1),
    )
    expect(new Set(EXAMPLE_ELEMENTS.map((element) => element.type))).toEqual(
      new Set(ELEMENT_TYPE_META.map((meta) => meta.type)),
    )
    for (const element of EXAMPLE_ELEMENTS) {
      expect(verifyAnchor(EXAMPLE_PAGES, element.page, element.quote), element.label).toBe(true)
    }
  })

  it('每条拆解都带有详情、章节和可解析的关联', () => {
    const labels = new Set(EXAMPLE_ELEMENTS.map((element) => element.label))
    const conceptNames = new Set(EXAMPLE_CONCEPTS.map((concept) => concept.name))
    for (const element of EXAMPLE_ELEMENTS) {
      expect(element.detail.length, element.label).toBeGreaterThan(20)
      expect(element.section.length, element.label).toBeGreaterThan(0)
      for (const label of element.relatedLabels ?? []) {
        expect(labels.has(label), `${element.label} → ${label}`).toBe(true)
      }
      for (const name of element.relatedConceptNames ?? []) {
        expect(conceptNames.has(name), `${element.label} → ${name}`).toBe(true)
      }
      expect(element.relatedLabels?.length ?? 0, element.label).toBeGreaterThan(0)
      expect(element.relatedConceptNames?.length ?? 0, element.label).toBeGreaterThan(0)
    }
  })
})
