import type { Concept } from '../db/types'

/** 仅保留未掌握节点；被标为「会」的节点及其前置不再占据学习路径。 */
export function buildLearningPath(concepts: Concept[]): Concept[] {
  const byId = new Map(concepts.map((concept) => [concept.id, concept]))
  const hasDependent = new Set<number>()
  for (const concept of concepts) {
    for (const dependency of concept.dependsOn) hasDependent.add(dependency)
  }

  // 从图谱的未掌握末端目标回溯；已会目标不会重新拉入它独占的前置节点。
  const goals = concepts.filter(
    (concept) => concept.mastery !== 'known' && concept.id !== undefined && !hasDependent.has(concept.id),
  )
  const required = new Set<number>()
  const pending = goals.map((concept) => concept.id as number)
  while (pending.length > 0) {
    const id = pending.pop()
    if (id === undefined || required.has(id)) continue
    const concept = byId.get(id)
    if (!concept || concept.mastery === 'known') continue
    required.add(id)
    pending.push(...concept.dependsOn)
  }

  const active = concepts.filter((concept) => concept.id !== undefined && required.has(concept.id))
  const activeIds = new Set(active.map((concept) => concept.id as number))
  const indegree = new Map<number, number>()
  const dependents = new Map<number, number[]>()

  for (const concept of active) {
    if (concept.id === undefined) continue
    const dependencies = concept.dependsOn.filter((id) => activeIds.has(id))
    indegree.set(concept.id, dependencies.length)
    for (const dependency of dependencies) {
      dependents.set(dependency, [...(dependents.get(dependency) ?? []), concept.id])
    }
  }

  const ready = active
    .filter((concept) => concept.id !== undefined && indegree.get(concept.id) === 0)
    .sort(compareConcepts)
  const result: Concept[] = []

  while (ready.length > 0) {
    const next = ready.shift()
    if (!next?.id) continue
    result.push(next)
    for (const dependent of dependents.get(next.id) ?? []) {
      const degree = (indegree.get(dependent) ?? 0) - 1
      indegree.set(dependent, degree)
      if (degree === 0) {
        const concept = byId.get(dependent)
        if (concept) {
          ready.push(concept)
          ready.sort(compareConcepts)
        }
      }
    }
  }

  return result
}

function compareConcepts(a: Concept, b: Concept): number {
  if (a.mastery !== b.mastery) return a.mastery === 'unknown' ? -1 : 1
  if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty
  return a.createdAt - b.createdAt
}

/** source 是 target 的前置；若 target 已能到达 source，再加边就会成环。 */
export function wouldCreateCycle(concepts: Concept[], source: number, target: number): boolean {
  if (source === target) return true
  const byId = new Map(concepts.map((concept) => [concept.id, concept]))
  const visited = new Set<number>()
  const stack = [target]

  while (stack.length > 0) {
    const current = stack.pop()
    if (current === undefined || visited.has(current)) continue
    if (current === source) return true
    visited.add(current)
    stack.push(...(byId.get(current)?.dependsOn ?? []))
  }
  return false
}

export function findCycleMembers(concepts: Concept[]): Set<number> {
  const unresolved = new Set(
    concepts.map((concept) => concept.id).filter((id): id is number => id !== undefined),
  )
  const byId = new Map(concepts.map((concept) => [concept.id, concept]))
  const remainingDeps = new Map<number, Set<number>>()

  for (const id of unresolved) {
    remainingDeps.set(id, new Set((byId.get(id)?.dependsOn ?? []).filter((dep) => unresolved.has(dep))))
  }

  let changed = true
  while (changed) {
    changed = false
    for (const id of [...unresolved]) {
      if ((remainingDeps.get(id)?.size ?? 0) === 0) {
        unresolved.delete(id)
        changed = true
        for (const deps of remainingDeps.values()) deps.delete(id)
      }
    }
  }
  return unresolved
}
