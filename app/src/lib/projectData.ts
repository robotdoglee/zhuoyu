import { db } from '../db/db'
import type {
  Concept,
  Element,
  Metric,
  NoteEntry,
  Paper,
  PlanStep,
  PlanVersion,
  Project,
  Retrospective,
} from '../db/types'

export interface ProjectBundle {
  project: Project
  paper?: Paper
  elements: Element[]
  concepts: Concept[]
  planSteps: PlanStep[]
  planVersions: PlanVersion[]
  notes: NoteEntry[]
  metrics: Metric[]
  retrospective?: Retrospective
}

/** 调用方负责事务边界；只删除指定项目，不触碰其他本地项目。 */
export async function deleteProjectData(projectId: number): Promise<void> {
  await Promise.all([
    db.papers.where('projectId').equals(projectId).delete(),
    db.chunks.where('projectId').equals(projectId).delete(),
    db.elements.where('projectId').equals(projectId).delete(),
    db.concepts.where('projectId').equals(projectId).delete(),
    db.planSteps.where('projectId').equals(projectId).delete(),
    db.planVersions.where('projectId').equals(projectId).delete(),
    db.notes.where('projectId').equals(projectId).delete(),
    db.metrics.where('projectId').equals(projectId).delete(),
    db.retrospectives.where('projectId').equals(projectId).delete(),
  ])
  await db.projects.delete(projectId)
}

export async function loadProjectBundle(projectId: number): Promise<ProjectBundle> {
  const project = await db.projects.get(projectId)
  if (!project) throw new Error('没有找到这个项目，无法生成复盘或导出。')
  const [papers, elements, concepts, planSteps, planVersions, notes, metrics, retrospective] = await Promise.all([
    db.papers.where('projectId').equals(projectId).toArray(),
    db.elements.where('projectId').equals(projectId).toArray(),
    db.concepts.where('projectId').equals(projectId).toArray(),
    db.planSteps.where('projectId').equals(projectId).toArray(),
    db.planVersions.where('projectId').equals(projectId).toArray(),
    db.notes.where('projectId').equals(projectId).toArray(),
    db.metrics.where('projectId').equals(projectId).toArray(),
    db.retrospectives.where('projectId').equals(projectId).first(),
  ])
  papers.sort((a, b) => b.createdAt - a.createdAt)
  return {
    project,
    paper: papers[0],
    elements: elements.sort((a, b) => a.createdAt - b.createdAt),
    concepts: concepts.sort((a, b) => a.createdAt - b.createdAt),
    planSteps: planSteps.sort((a, b) => a.order - b.order),
    planVersions: planVersions.sort((a, b) => b.createdAt - a.createdAt),
    notes: notes.sort((a, b) => a.createdAt - b.createdAt),
    metrics: metrics.sort((a, b) => a.createdAt - b.createdAt),
    retrospective,
  }
}
