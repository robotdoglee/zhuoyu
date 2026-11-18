import type { Concept, Project } from '../db/types'

export interface SkillSource {
  projectId: number
  projectTitle: string
  conceptId: number
  masteredAt: number
}

export interface SkillNode {
  /** trim、连续空白折叠并忽略大小写后的稳定名称，也用于连线。 */
  id: string
  /** 首个已掌握来源的展示名，保留原大小写。 */
  name: string
  summary: string
  difficulty: Concept['difficulty']
  firstMasteredAt: number
  sources: SkillSource[]
}

export interface SkillEdge {
  id: string
  source: string
  target: string
}

export interface SkillTree {
  nodes: SkillNode[]
  edges: SkillEdge[]
}

type ConceptWithMasteryDate = Concept & { masteryUpdatedAt?: number }

function displayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function canonicalName(name: string): string {
  return displayName(name).toLowerCase()
}

/** 跨项目合并已掌握概念；依赖方向为前置概念指向后续概念。 */
export function buildSkillTree(projects: Project[], concepts: Concept[]): SkillTree {
  const projectById = new Map(
    projects.flatMap((project) => project.id === undefined ? [] : [[project.id, project] as const]),
  )
  const conceptById = new Map(
    concepts.flatMap((concept) => concept.id === undefined ? [] : [[concept.id, concept] as const]),
  )
  const nodeById = new Map<string, SkillNode>()
  const nodes: SkillNode[] = []

  for (const concept of concepts) {
    if (concept.mastery !== 'known' || concept.id === undefined) continue
    const id = canonicalName(concept.name)
    if (!id) continue

    const masteredAt = (concept as ConceptWithMasteryDate).masteryUpdatedAt ?? concept.createdAt
    const source: SkillSource = {
      projectId: concept.projectId,
      projectTitle: projectById.get(concept.projectId)?.title || '未知项目',
      conceptId: concept.id,
      masteredAt,
    }
    const existing = nodeById.get(id)
    if (existing) {
      existing.firstMasteredAt = Math.min(existing.firstMasteredAt, masteredAt)
      existing.sources.push(source)
      continue
    }

    const node: SkillNode = {
      id,
      name: displayName(concept.name),
      summary: concept.summary,
      difficulty: concept.difficulty,
      firstMasteredAt: masteredAt,
      sources: [source],
    }
    nodeById.set(id, node)
    nodes.push(node)
  }

  const edges: SkillEdge[] = []
  const edgeIds = new Set<string>()
  for (const concept of concepts) {
    if (concept.mastery !== 'known' || concept.id === undefined) continue
    const target = canonicalName(concept.name)
    if (!nodeById.has(target)) continue

    for (const dependencyId of concept.dependsOn) {
      const dependency = conceptById.get(dependencyId)
      if (!dependency || dependency.mastery !== 'known') continue
      const source = canonicalName(dependency.name)
      if (source === target || !nodeById.has(source)) continue
      const id = `${source}->${target}`
      if (edgeIds.has(id)) continue
      edgeIds.add(id)
      edges.push({ id, source, target })
    }
  }

  return { nodes, edges }
}
