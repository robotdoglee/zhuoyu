import Dexie, { type EntityTable } from 'dexie'
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
  planVersions!: EntityTable<PlanVersion, 'id'>
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

    this.version(3)
      .stores({
        projects: '++id, updatedAt, createdAt',
        papers: '++id, projectId, createdAt, arxivId, doi',
        chunks: '&id, projectId, paperId, page',
        elements: '++id, projectId, paperId, type',
        concepts: '++id, projectId, createdAt',
        planSteps: '++id, projectId, status, order, version, [projectId+version]',
        planVersions: '++id, projectId, version, createdAt, [projectId+version]',
        notes: '++id, projectId, stepId, kind, createdAt, source',
        metrics: '++id, projectId, createdAt',
        retrospectives: '++id, &projectId, createdAt',
      })
      .upgrade(async (transaction) => {
        // 保留 v1/v2 已有步骤与笔记，只补齐 M2 新增字段。
        await transaction.table('planSteps').toCollection().modify((step: Partial<PlanStep>) => {
          step.milestone ||= '复现执行'
          step.version ||= 1
          step.checkpointDone ??= false
          step.source ||= 'manual'
          step.updatedAt ||= step.createdAt ?? Date.now()
        })
        await transaction.table('notes').toCollection().modify((note: Partial<NoteEntry>) => {
          note.conceptIds ||= []
          note.stepIds ||= note.stepId === undefined ? [] : [note.stepId]
          note.completeCheckpoint ??= false
          note.completeStep ??= false
          note.source ||= 'manual'
        })
      })

    this.version(4)
      .stores({
        projects: '++id, updatedAt, createdAt',
        papers: '++id, projectId, createdAt, arxivId, doi',
        chunks: '&id, projectId, paperId, page',
        elements: '++id, projectId, paperId, type',
        concepts: '++id, projectId, createdAt',
        planSteps: '++id, projectId, status, order, version, [projectId+version]',
        planVersions: '++id, projectId, version, createdAt, [projectId+version]',
        notes: '++id, projectId, stepId, kind, createdAt, source',
        metrics: '++id, projectId, createdAt',
        retrospectives: '++id, &projectId, createdAt',
      })
      .upgrade(async (transaction) => {
        // M3 只补充字段，不重写旧内容；已有复盘总述原样保留。
        await transaction.table('notes').toCollection().modify((note: Partial<NoteEntry>) => {
          note.isHiddenDetail ??= false
          if (note.isHiddenDetail) note.hiddenDetailType ||= 'other'
        })
        await transaction.table('concepts').toCollection().modify((concept: Partial<Concept>) => {
          if (concept.mastery === 'known') concept.masteryUpdatedAt ||= concept.createdAt ?? Date.now()
        })
        await transaction.table('retrospectives').toCollection().modify((retro: Partial<Retrospective>) => {
          retro.scope ||= ''
          retro.method ||= ''
          retro.results ||= ''
          retro.deviations ||= ''
          retro.dataDeviation ||= ''
          retro.hyperparameterDeviation ||= ''
          retro.seedDeviation ||= ''
          retro.hardwareDeviation ||= ''
          retro.difficulties ||= ''
          retro.hiddenDetails ||= ''
          retro.authorContact ||= ''
        })
      })
  }
}

export const db = new ZhuoyuDatabase()
