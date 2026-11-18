import type { Concept, PlanStep, PlanStepSource, Project } from '../db/types'

export type PlanDraft = Omit<PlanStep, 'id' | 'projectId' | 'version' | 'order' | 'createdAt' | 'updatedAt'> & {
  id?: number
  order?: number
  createdAt?: number
}

interface StepSeed {
  milestone: string
  title: string
  detail: string
  estimatedMinutes: number
  checkpoint: string
  conceptKeys?: string[]
}

const LEVEL_STEPS: Record<Project['level'], StepSeed[]> = {
  L1: [
    { milestone: '一、环境与原文对齐', title: '固定代码、依赖与运行环境', detail: '记录官方仓库提交、依赖版本、硬件与随机种子，建立可重复的环境。', estimatedMinutes: 60, checkpoint: '新环境可安装依赖，仓库提交与设备信息已写入记事本。', conceptKeys: ['环境', '代码'] },
    { milestone: '一、环境与原文对齐', title: '核对数据与最小输入', detail: '按论文或仓库说明准备一份小数据，先验证格式、路径和预处理。', estimatedMinutes: 45, checkpoint: '一条样本能完成预处理，形状与官方示例一致。', conceptKeys: ['数据', '分词', 'BPE'] },
    { milestone: '二、跑通官方链路', title: '运行官方最小训练或推理', detail: '优先使用官方配置和权重，以最小步数跑通完整链路，不急于追求指标。', estimatedMinutes: 90, checkpoint: '命令无报错结束，日志与输出文件已保存。', conceptKeys: ['模型', '注意力'] },
    { milestone: '二、跑通官方链路', title: '定位并修复环境差异', detail: '对照报错逐项排查依赖、显存、路径和精度设置，保留每次修改。', estimatedMinutes: 60, checkpoint: '同一命令连续运行两次均成功，修改项可追溯。' },
    { milestone: '三、L1 验收', title: '完成官方结果冒烟检查', detail: '用论文样例或官方演示做一次端到端验证，记录输出而非只看退出码。', estimatedMinutes: 30, checkpoint: '输出可解释且与官方样例方向一致，L1 运行命令可复用。', conceptKeys: ['指标', 'BLEU'] },
  ],
  L2: [
    { milestone: '一、锁定复现口径', title: '摘录主表指标与评测协议', detail: '明确主表数值、数据划分、评测脚本、单位及越高/越低越好，建立指标对照。', estimatedMinutes: 45, checkpoint: '每个目标指标都有原文页码、数值和统一评测口径。', conceptKeys: ['指标', 'BLEU'] },
    { milestone: '一、锁定复现口径', title: '补齐核心前置知识', detail: '沿知识框图学习本计划关联的未掌握卡片，先用最小例子验证理解。', estimatedMinutes: 90, checkpoint: '所需卡片已标会或半会，并能解释它们对结果的影响。', conceptKeys: ['注意力', '位置编码', 'LayerNorm'] },
    { milestone: '二、对齐数据与训练配置', title: '复现数据预处理与划分', detail: '固定数据版本、分词、词表和训练/验证/测试划分，抽样核对样本数量与格式。', estimatedMinutes: 90, checkpoint: '数据规模与论文一致，相同样本可重复生成相同输入。', conceptKeys: ['数据', '分词', 'BPE'] },
    { milestone: '二、对齐数据与训练配置', title: '逐项对齐模型与超参数', detail: '核对层数、维度、优化器、正则化和学习率 schedule，避免沿用框架默认值。', estimatedMinutes: 75, checkpoint: '配置 diff 已检查，关键超参均有论文或官方仓库依据。', conceptKeys: ['Adam', '预热', 'Dropout', '标签平滑'] },
    { milestone: '三、训练与主表复现', title: '短跑验证损失与吞吐', detail: '先跑短训练确认损失下降、显存和速度合理，再启动完整实验。', estimatedMinutes: 60, checkpoint: '短跑曲线正常，已记录 step 时间、显存和预计总时长。' },
    { milestone: '三、训练与主表复现', title: '完成正式训练与评测', detail: '按固定种子完成训练，保存最佳 checkpoint，并用统一脚本评测主表指标。', estimatedMinutes: 360, checkpoint: '获得可复跑的正式结果，日志、权重和评测命令齐全。', conceptKeys: ['指标', 'BLEU'] },
    { milestone: '四、偏差分析', title: '对照原文并归因偏差', detail: '录入我的指标，检查绝对差和偏差百分比，从数据、超参、种子与硬件逐项归因。', estimatedMinutes: 75, checkpoint: '主表偏差已量化，至少完成一次针对性复核或补充实验。', conceptKeys: ['指标', 'BLEU'] },
  ],
  L3: [
    { milestone: '一、建立可信基线', title: '完成 L2 基线与偏差复核', detail: '先固定可复跑的主结果，明确新实验要回答的问题，避免在不稳定基线上做改动。', estimatedMinutes: 90, checkpoint: '基线命令、指标和偏差均可追溯，研究问题写成一句话。', conceptKeys: ['指标', 'BLEU'] },
    { milestone: '二、设计自研或消融', title: '提出可证伪的实验假设', detail: '写明自变量、因变量、控制变量与预期方向，为每组实验设定检查点。', estimatedMinutes: 60, checkpoint: '实验矩阵只改变目标因素，包含原始基线对照组。' },
    { milestone: '二、设计自研或消融', title: '补齐方法实现所需前置', detail: '学习与改动直接相关的概念卡片，并用最小张量或单元测试验证理解。', estimatedMinutes: 120, checkpoint: '相关卡片已掌握，核心机制的最小测试通过。', conceptKeys: ['注意力', '位置编码', 'LayerNorm'] },
    { milestone: '三、实现与验证', title: '实现核心方法或消融开关', detail: '保持数据、训练和评测链路一致，把改动封装成可切换配置并记录实现决策。', estimatedMinutes: 180, checkpoint: '开关关闭时恢复基线行为，开启时形状与数值测试通过。', conceptKeys: ['模型', '注意力'] },
    { milestone: '三、实现与验证', title: '执行对照与多随机种子实验', detail: '按实验矩阵运行基线和改动组，保存每组日志、配置、权重和异常。', estimatedMinutes: 480, checkpoint: '每组至少完成预定种子数，失败运行也有记录。' },
    { milestone: '四、分析与沉淀', title: '统一评测并做统计分析', detail: '使用同一测试集和脚本计算均值、波动与相对变化，不只挑选最好一次。', estimatedMinutes: 90, checkpoint: '实验表包含所有组与种子，结论不被单次异常值主导。', conceptKeys: ['指标', 'BLEU'] },
    { milestone: '四、分析与沉淀', title: '复核隐藏细节与反例', detail: '整理论文未写的实现细节、失败路径和反例，判断假设被支持还是被否定。', estimatedMinutes: 75, checkpoint: '形成可复用结论、限制和下一步问题，所有数字可回到原始记录。' },
  ],
}

export function buildHeuristicPlan(project: Project, concepts: Concept[]): PlanDraft[] {
  return LEVEL_STEPS[project.level].map((seed, order) => ({
    milestone: seed.milestone,
    title: seed.title,
    detail: seed.detail,
    order,
    estimatedMinutes: seed.estimatedMinutes,
    status: 'todo',
    checkpoint: seed.checkpoint,
    checkpointDone: false,
    conceptIds: matchConcepts(concepts, seed.conceptKeys ?? []),
    source: 'heuristic',
  }))
}

function matchConcepts(concepts: Concept[], keys: string[]): number[] {
  if (keys.length === 0) return []
  return concepts
    .filter((concept) => {
      const haystack = `${concept.name} ${concept.summary} ${concept.whyNeeded}`.toLowerCase()
      return keys.some((key) => haystack.includes(key.toLowerCase()))
    })
    .slice(0, 4)
    .flatMap((concept) => concept.id === undefined ? [] : [concept.id])
}

/** 阻塞与进行中优先，已完成保留在末尾；未掌握前置会变成显式学习步骤。 */
export function replanSteps(steps: PlanStep[], concepts: Concept[]): PlanDraft[] {
  const priority: Record<PlanStep['status'], number> = { blocked: 0, doing: 1, todo: 2, done: 3 }
  const sorted = [...steps].sort((a, b) => priority[a.status] - priority[b.status] || a.order - b.order)
  const requiredIds = new Set(
    sorted.filter((step) => step.status !== 'done').flatMap((step) => step.conceptIds),
  )
  const alreadyLearning = new Set(
    steps.filter((step) => step.title.startsWith('补齐前置：')).flatMap((step) => step.conceptIds),
  )
  const learning = concepts
    .filter((concept) => concept.id !== undefined && requiredIds.has(concept.id) && concept.mastery !== 'known' && !alreadyLearning.has(concept.id))
    .sort((a, b) => (a.mastery === b.mastery ? a.difficulty - b.difficulty : a.mastery === 'unknown' ? -1 : 1))
    .map((concept): PlanDraft => ({
      milestone: '前置补齐',
      title: `补齐前置：${concept.name}`,
      detail: `${concept.summary}\n复现需要它，因为：${concept.whyNeeded}`,
      estimatedMinutes: concept.mastery === 'half' ? 30 : 45 + concept.difficulty * 15,
      status: 'todo',
      checkpoint: `能解释「${concept.name}」对本复现的影响，并通过一个最小例子。`,
      checkpointDone: false,
      conceptIds: [concept.id as number],
      source: 'heuristic',
    }))
  return [...learning, ...sorted].map((step, order) => ({ ...step, order }))
}

export function moveStep(steps: PlanStep[], draggedId: number, targetId: number): PlanStep[] {
  if (draggedId === targetId) return steps
  const sorted = [...steps].sort((a, b) => a.order - b.order)
  const dragged = sorted.find((step) => step.id === draggedId)
  const targetIndex = sorted.findIndex((step) => step.id === targetId)
  if (!dragged || targetIndex < 0) return steps
  const without = sorted.filter((step) => step.id !== draggedId)
  without.splice(Math.min(targetIndex, without.length), 0, { ...dragged, milestone: sorted[targetIndex].milestone })
  return without.map((step, order) => ({ ...step, order }))
}

export function normalizePlanOrder(steps: PlanStep[]): PlanStep[] {
  return [...steps].sort((a, b) => a.order - b.order).map((step, order) => ({ ...step, order }))
}

export function planSourceLabel(source: PlanStepSource): string {
  return source === 'llm' ? 'LLM' : source === 'heuristic' ? '模板' : source === 'example' ? '示例' : '手工'
}

export function formatMinutes(minutes?: number): string {
  if (minutes === undefined) return '未估时'
  if (minutes < 60) return `${minutes} 分钟`
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小时`
}
