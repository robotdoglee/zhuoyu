export type ReproduceLevel = 'L1' | 'L2' | 'L3'

export interface LevelOption {
  value: ReproduceLevel
  short: string
  name: string
  description: string
}

export const LEVEL_OPTIONS: LevelOption[] = [
  {
    value: 'L1',
    short: '跑通官方代码',
    name: 'L1 · 跑通官方代码',
    description: '按官方仓库说明把训练或推理跑起来，确认环境、数据与权重可用。',
  },
  {
    value: 'L2',
    short: '复现主表结果',
    name: 'L2 · 复现主表结果',
    description: '复现论文主表或主图中的关键数值，记录与原文的偏差。',
  },
  {
    value: 'L3',
    short: '消融 / 自研',
    name: 'L3 · 消融或自己实现',
    description: '复现消融实验、换数据，或脱离官方代码自己实现核心方法。',
  },
]

export function levelName(level: ReproduceLevel): string {
  return LEVEL_OPTIONS.find((option) => option.value === level)?.name ?? level
}

export function levelShort(level: ReproduceLevel): string {
  return LEVEL_OPTIONS.find((option) => option.value === level)?.short ?? level
}

export interface Project {
  id?: number
  title: string
  /** 复现目标：想亲手验证什么 */
  goal: string
  level: ReproduceLevel
  /** 设备与算力，例如「M3 Pro 18GB / RTX 3060 12GB」 */
  device: string
  createdAt: number
  updatedAt: number
}

export type PaperSource = 'pdf' | 'arxiv' | 'openalex'

export interface PaperPage {
  page: number
  text: string
}

export interface TextChunk {
  /** 稳定 ID：论文-页码-块序号；重新分块时覆盖同 ID 数据 */
  id: string
  projectId: number
  paperId: number
  page: number
  /** 在该页原始 text 中的起止偏移，end 不包含在块内 */
  startOffset: number
  endOffset: number
  text: string
  createdAt: number
}

export interface Paper {
  id?: number
  projectId: number
  title: string
  authors: string[]
  abstract?: string
  year?: number
  /** 期刊 / 会议 / 预印本平台 */
  venue?: string
  arxivId?: string
  doi?: string
  url?: string
  pdfUrl?: string
  source: PaperSource
  /** PDF 实际页数；元数据阶段为 0 */
  pageCount: number
  /** 浏览器内提取的分页文本 */
  pages: PaperPage[]
  /** 原文页码区间，例如 5998–6008 */
  pagesLabel?: string
  fileName?: string
  createdAt: number
  updatedAt: number
}

export type ElementType =
  | 'task'
  | 'dataset'
  | 'architecture'
  | 'training'
  | 'hyperparam'
  | 'metric'
  | 'compute'
  | 'code'
  | 'supplement'

export interface Element {
  id?: number
  projectId: number
  paperId?: number
  type: ElementType
  label: string
  value: string
  /** 原文引文，用于防幻觉校验 */
  quote?: string
  /** 引文所在页码 */
  page?: number
  /** 引文是否在当前论文分页文本中匹配成功 */
  verified?: boolean
  source?: 'llm' | 'heuristic' | 'manual' | 'example'
  createdAt: number
}

export type Mastery = 'known' | 'half' | 'unknown'
export type ResourceTier = 'primary' | 'secondary' | 'blog'

export interface ResourceLink {
  title: string
  url: string
  tier: ResourceTier
  provider?: string
}

export interface Concept {
  id?: number
  projectId: number
  name: string
  /** 一句话解释 */
  summary: string
  /** 为何复现这篇论文需要它 */
  whyNeeded: string
  difficulty: 1 | 2 | 3
  mastery: Mastery
  /** 依赖的概念 id，用于生成 DAG 与学习路径 */
  dependsOn: number[]
  /** 最近一次拖拽或自动布局后的画布位置 */
  position?: { x: number; y: number }
  resources: ResourceLink[]
  createdAt: number
}

export type PlanStepStatus = 'todo' | 'doing' | 'done' | 'blocked'

export interface PlanStep {
  id?: number
  projectId: number
  title: string
  detail?: string
  order: number
  estimatedMinutes?: number
  status: PlanStepStatus
  checkpoint?: string
  conceptIds: number[]
  createdAt: number
}

export type NoteKind = 'command' | 'code' | 'result' | 'error' | 'idea' | 'image'

export interface NoteEntry {
  id?: number
  projectId: number
  stepId?: number
  kind: NoteKind
  /** Markdown 内容 */
  content: string
  createdAt: number
  updatedAt: number
}

export interface Metric {
  id?: number
  projectId: number
  name: string
  /** 自己跑出的数值 */
  ours?: number
  /** 论文报告数值 */
  paperValue?: number
  unit?: string
  higherIsBetter: boolean
  createdAt: number
}

export interface Retrospective {
  id?: number
  projectId: number
  scope?: string
  method?: string
  results?: string
  /** 偏差归因：数据 / 超参 / 随机种子 / 硬件 */
  deviations?: string
  difficulties?: string
  /** 论文没写的细节 */
  hiddenDetails?: string
  authorContact?: string
  createdAt: number
  updatedAt: number
}
