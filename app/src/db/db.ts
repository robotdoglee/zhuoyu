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
  TextChunk,
} from './types'

/**
 * 琢玉的本地数据库。所有业务数据只存在于浏览器 IndexedDB。
 * 修改表结构时请递增版本号并补充迁移，避免用户数据丢失。
 */
export class ZhuoyuDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>
  papers!: EntityTable<Paper, 'id'>
  chunks!: EntityTable<TextChunk, 'id'>
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

    this.version(2)
      .stores({
        projects: '++id, updatedAt, createdAt',
        papers: '++id, projectId, createdAt, arxivId, doi',
        chunks: '&id, projectId, paperId, page',
        elements: '++id, projectId, paperId, type',
        concepts: '++id, projectId, createdAt',
        planSteps: '++id, projectId, status, order',
        notes: '++id, projectId, stepId, kind, createdAt',
        metrics: '++id, projectId, createdAt',
        retrospectives: '++id, &projectId, createdAt',
      })
      .upgrade(async (transaction) => {
        // v1 没有 chunks 表；旧拆解项统一视为手工数据，重抽时不会误删。
        await transaction.table('elements').toCollection().modify((element: Element) => {
          if (!element.source) element.source = 'manual'
        })
      })
  }
}

export const db = new ZhuoyuDatabase()
