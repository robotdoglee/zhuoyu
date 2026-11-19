import { db } from '../db/db'
import type { Element } from '../db/types'

export interface ExampleDetailSeed {
  label: string
  detail: string
  section: string
  formula?: string
  keyNumbers?: string[]
  relatedLabels?: string[]
  relatedConceptNames?: string[]
}

/**
 * 为旧版示例数据补齐详情字段。
 * 只填写空缺字段，不覆盖用户已经编辑过的内容，也不改动非示例来源的条目。
 */
export async function backfillExampleDetails(
  projectId: number,
  seeds: ExampleDetailSeed[],
): Promise<void> {
  const byLabel = new Map(seeds.map((seed) => [seed.label, seed]))
  const elements = await db.elements.where('projectId').equals(projectId).toArray()
  for (const element of elements) {
    const seed = byLabel.get(element.label)
    if (!seed || element.source !== 'example' || element.id === undefined) continue
    if (element.detail && element.section) continue

    const patch: Partial<Element> = {}
    if (!element.detail) patch.detail = seed.detail
    if (!element.section) patch.section = seed.section
    if (!element.formula && seed.formula) patch.formula = seed.formula
    if (!element.keyNumbers?.length && seed.keyNumbers) patch.keyNumbers = seed.keyNumbers
    if (!element.relatedLabels?.length && seed.relatedLabels) patch.relatedLabels = seed.relatedLabels
    if (!element.relatedConceptNames?.length && seed.relatedConceptNames) {
      patch.relatedConceptNames = seed.relatedConceptNames
    }
    if (Object.keys(patch).length > 0) await db.elements.update(element.id, patch)
  }
}
