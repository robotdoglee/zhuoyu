import { elementTypeLabel } from './elements'
import { compareMetric, formatMetricNumber, formatSigned } from './metrics'
import { formatDate } from './format'
import { levelName, type HiddenDetailType, type NoteKind, type Retrospective } from '../db/types'
import type { ProjectBundle } from './projectData'

export type RetroTextField =
  | 'scope'
  | 'method'
  | 'results'
  | 'deviations'
  | 'dataDeviation'
  | 'hyperparameterDeviation'
  | 'seedDeviation'
  | 'hardwareDeviation'
  | 'difficulties'
  | 'hiddenDetails'
  | 'authorContact'

export type RetroDraft = Record<RetroTextField, string>

export const RETRO_TEXT_FIELDS: RetroTextField[] = [
  'scope', 'method', 'results', 'deviations', 'dataDeviation', 'hyperparameterDeviation',
  'seedDeviation', 'hardwareDeviation', 'difficulties', 'hiddenDetails', 'authorContact',
]

export const HIDDEN_DETAIL_LABEL: Record<HiddenDetailType, string> = {
  hyperparameter: '隐藏超参',
  preprocessing: '预处理',
  data: '数据细节',
  evaluation: '评测细节',
  environment: '环境细节',
  other: '其他细节',
}

export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  command: '命令', code: '代码', result: '结果', error: '报错', idea: '想法', image: '截图',
}

export function retrospectiveText(retrospective?: Retrospective): RetroDraft {
  return Object.fromEntries(
    RETRO_TEXT_FIELDS.map((field) => [field, retrospective?.[field] ?? '']),
  ) as RetroDraft
}

export function buildRetrospectiveDraft(bundle: ProjectBundle): RetroDraft {
  const { project, paper, elements, planSteps, notes, metrics } = bundle
  const paperFacts = paper
    ? [
        `论文：${paper.title}`,
        paper.authors.length ? `作者：${paper.authors.join('、')}` : '',
        paper.year ? `年份：${paper.year}` : '',
        paper.venue ? `发表：${paper.venue}` : '',
        paper.arxivId ? `arXiv：${paper.arxivId}` : '',
        paper.doi ? `DOI：${paper.doi}` : '',
        paper.pageCount ? `PDF：${paper.pageCount} 页` : 'PDF：尚未导入',
      ].filter(Boolean).join('\n')
    : '论文：尚未导入'

  const statusCounts = (['done', 'doing', 'blocked', 'todo'] as const).map((status) => {
    const label = { done: '完成', doing: '进行中', blocked: '受阻', todo: '待办' }[status]
    return `${label} ${planSteps.filter((step) => step.status === status).length} 步`
  })
  const estimatedMinutes = planSteps.reduce((sum, step) => sum + (step.estimatedMinutes ?? 0), 0)
  const checkpoints = planSteps.filter((step) => step.checkpoint)
  const checkpointDone = checkpoints.filter((step) => step.checkpointDone).length
  const breakdown = elements.length
    ? elements.map((element) => {
        const citation = element.page ? `第 ${element.page} 页` : '页码待补'
        const quote = element.quote ? `；引文：“${element.quote}”` : '；引文待补'
        return `- [${elementTypeLabel(element.type)}] ${element.label}：${element.value}（${citation}${quote}）`
      }).join('\n')
    : '- 尚无论文拆解项。'
  const plan = planSteps.length
    ? planSteps.map((step, index) => {
        const status = { done: '完成', doing: '进行中', blocked: '受阻', todo: '待办' }[step.status]
        return `${index + 1}. [${step.milestone}] ${step.title}（${status}${step.estimatedMinutes ? `，估时 ${step.estimatedMinutes} 分钟` : ''}）\n   检查点：${step.checkpoint || '未设置'}（${step.checkpointDone ? '已完成' : '未完成'}）`
      }).join('\n')
    : '尚未生成复现计划。'

  const metricLines = metrics.length
    ? metrics.map((metric) => {
        const comparison = compareMetric(metric)
        const unit = metric.unit ? ` ${metric.unit}` : ''
        const assessment = { good: '一致或更优', warn: '轻微退步', bad: '偏离较大', pending: '待录入' }[comparison.assessment]
        return `- ${metric.name || '未命名指标'}：我的 ${formatMetricNumber(metric.ours)}${unit}；原文 ${formatMetricNumber(metric.paperValue)}${unit}；绝对差 ${formatMetricNumber(comparison.absoluteDifference)}；偏差 ${comparison.deviationPercent === undefined && comparison.difference !== undefined ? '原文为 0，百分比不可计算' : formatSigned(comparison.deviationPercent, '%')}；方向为${metric.higherIsBetter ? '越高越好' : '越低越好'}；${assessment}。`
      }).join('\n')
    : '- 尚未录入对照指标。'
  const noteLines = notes.length
    ? notes.map((note) => {
        const step = planSteps.find((item) => item.id === note.stepId)
        return `- [${NOTE_KIND_LABEL[note.kind]}｜${formatDate(note.createdAt)}${step ? `｜${step.title}` : ''}] ${note.content || '（本地截图记录）'}`
      }).join('\n')
    : '- 尚无记事本记录。'

  const blocked = planSteps.filter((step) => step.status === 'blocked')
  const errors = notes.filter((note) => note.kind === 'error')
  const done = planSteps.filter((step) => step.status === 'done')
  const difficultLines = [
    ...blocked.map((step) => `- 受阻步骤：${step.title}。${step.detail ?? ''}`),
    ...errors.map((note) => `- 报错记录：${note.content}`),
  ]
  const easyLines = done.map((step) => `- 已完成：${step.title}；检查点${step.checkpointDone ? '已验收' : '待验收'}。`)

  return {
    scope: [
      `项目：${project.title}`,
      `复现目标：${project.goal}`,
      `复现级别：${levelName(project.level)}`,
      `设备与算力：${project.device || '未填写'}`,
      `创建时间：${formatDate(project.createdAt)}`,
      paperFacts,
      `范围说明：本初稿汇总当前项目中的论文拆解、计划、记事本和指标，不推断未记录的实验。`,
    ].join('\n'),
    method: [
      `计划概况：共 ${planSteps.length} 步；${statusCounts.join('，')}；检查点 ${checkpointDone}/${checkpoints.length} 已完成；总估时 ${formatMetricNumber(estimatedMinutes / 60, 2)} 小时。`,
      '',
      '一、论文方法与实验口径（拆解事实）',
      breakdown,
      '',
      '二、实际复现步骤',
      plan,
    ].join('\n'),
    results: [
      '一、指标对照（直接读取指标表，未重新估算）',
      metricLines,
      '',
      `二、过程证据（共 ${notes.length} 条记录）`,
      noteLines,
    ].join('\n'),
    deviations: metrics.length
      ? `当前共 ${metrics.length} 项对照指标。以下按数据、超参、随机种子、硬件四类整理证据；没有记录支撑的归因均标为待补写，不作因果断言。`
      : '尚无指标可计算偏差。请先补充原文值与实验值，再按数据、超参、随机种子、硬件四类归因。',
    dataDeviation: [
      `已有数据相关拆解 ${elements.filter((item) => item.type === 'dataset').length} 项；请核对数据版本、划分、清洗与预处理是否一致。`,
      '待补写：哪些数据差异有实验或记录证据，它们如何影响指标？',
    ].join('\n'),
    hyperparameterDeviation: [
      `已有超参相关拆解 ${elements.filter((item) => item.type === 'hyperparam').length} 项；另请检查训练流程中的隐藏配置。`,
      '待补写：优化器、批量、学习率、正则化和训练步数是否完全一致？',
    ].join('\n'),
    seedDeviation: '待补写：记录实际随机种子、运行次数与波动范围；单次结果不要直接归因于随机种子。',
    hardwareDeviation: [
      `项目设备：${project.device || '未填写'}。`,
      paper ? `论文算力拆解 ${elements.filter((item) => item.type === 'compute').length} 项。` : '尚未导入论文算力信息。',
      '待补写：精度模式、GPU/CPU、库版本和批量缩放是否可能改变结果？',
    ].join('\n'),
    difficulties: [
      '难点与受阻点',
      difficultLines.length ? difficultLines.join('\n') : '- 暂无受阻步骤或报错记录；请补写实际最难的环节。',
      '',
      '易点与已验证进展',
      easyLines.length ? easyLines.join('\n') : '- 尚无已完成步骤；请补写哪些部分比预期顺利。',
    ].join('\n'),
    hiddenDetails: buildHiddenDetailsMarkdown(bundle),
    authorContact: '待补写：是否就数据、配置或评测问题联系作者？记录联系方式、日期、问题、回复与仍未解决的事项；未联系可明确写「未联系」。',
  }
}

export function buildHiddenDetailsMarkdown(bundle: ProjectBundle): string {
  const hiddenNotes = bundle.notes.filter((note) => note.isHiddenDetail)
  if (!hiddenNotes.length) return '尚未在记事本中标记「论文没写的细节」。记录隐藏超参、预处理、数据、评测或环境细节后，可重新汇总到这里。'
  return hiddenNotes.map((note) => {
    const step = bundle.planSteps.find((item) => item.id === note.stepId)
    const type = HIDDEN_DETAIL_LABEL[note.hiddenDetailType ?? 'other']
    return `### ${type}${step ? `｜${step.title}` : ''}\n\n${note.content || '（本地截图记录）'}\n\n来源：记事本 ${formatDate(note.createdAt)}${note.id ? `，记录 #${note.id}` : ''}`
  }).join('\n\n---\n\n')
}
