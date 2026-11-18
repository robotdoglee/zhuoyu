import Dexie, { type EntityTable } from 'dexie'
import type {
  Concept,
  Element,
  Metric,
  NoteEntry,
  Paper,
  PlanStep,
  Project,
  Retrospective,
} from './types'

/**
 * 琢玉的本地数据库。所有业务数据只存在于浏览器 IndexedDB。
 * 修改表结构时请递增版本号并补充迁移，避免用户数据丢失。
 */
export class ZhuoyuDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  papers!: EntityTable<Paper, 'id'>
  elements!: EntityTable<Element, 'id'>
  concepts!: EntityTable<Concept, 'id'>
  planSteps!: EntityTable<PlanStep, 'id'>
  notes!: EntityTable<NoteEntry, 'id'>
  metrics!: EntityTable<Metric, 'id'>
  retrospectives!: EntityTable<Retrospective, 'id'>

  constructor() {
    super('zhuoyu')

    this.version(1).stores({
      projects: '++id, updatedAt, createdAt',
      papers: '++id, projectId, createdAt, arxivId, doi',
      elements: '++id, projectId, paperId, type',
      concepts: '++id, projectId, createdAt',
      planSteps: '++id, projectId, status, order',
      notes: '++id, projectId, stepId, kind, createdAt',
      metrics: '++id, projectId, createdAt',
      retrospectives: '++id, &projectId, createdAt',
    })
  }
}

export const db = new ZhuoyuDatabase()
