import { z } from 'zod'
import type { Concept, Element, Project, TextChunk } from '../db/types'
import type { PlanDraft } from './plan'
import type { LlmSettings } from './settings'

const stepSchema = z.object({
  title: z.string().trim().min(1).max(120),
  detail: z.string().trim().max(1200).default(''),
  estimatedMinutes: z.number().int().min(5).max(10080),
  checkpoint: z.string().trim().min(1).max(500),
  conceptIds: z.array(z.number().int().positive()).max(8).default([]),
})
const planSchema = z.object({
  milestones: z.array(z.object({
    title: z.string().trim().min(1).max(100),
    steps: z.array(stepSchema).min(1).max(20),
  })).min(1).max(8),
})

const jsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    milestones: {
      type: 'array', minItems: 1, maxItems: 8,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          title: { type: 'string' },
          steps: {
            type: 'array', minItems: 1, maxItems: 20,
            items: {
              type: 'object', additionalProperties: false,
              properties: {
                title: { type: 'string' }, detail: { type: 'string' },
                estimatedMinutes: { type: 'integer' }, checkpoint: { type: 'string' },
                conceptIds: { type: 'array', items: { type: 'integer' } },
              },
              required: ['title', 'detail', 'estimatedMinutes', 'checkpoint', 'conceptIds'],
            },
          },
        },
        required: ['title', 'steps'],
      },
    },
  },
  required: ['milestones'],
}

export async function generatePlanWithLlm(
  settings: LlmSettings,
  project: Project,
  concepts: Concept[],
  elements: Element[],
  chunks: TextChunk[],
): Promise<PlanDraft[]> {
  if (!settings.apiKey.trim()) throw new Error('尚未配置 API Key，已保留本地模板生成方式。')
  if (!settings.model.trim()) throw new Error('已填写 Key，请先在设置页补充模型名；也可改用本地模板。')
  const endpoint = chatCompletionsUrl(settings.endpoint)
  const validConceptIds = new Set(concepts.flatMap((concept) => concept.id === undefined ? [] : [concept.id]))
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey.trim()}` },
    body: JSON.stringify({
      model: settings.model.trim(),
      messages: [
        { role: 'system', content: '你是严谨的论文复现计划员。只依据给定信息生成中文计划，不编造论文事实。计划必须按复现级别划分里程碑，每步有可观察检查点和合理估时；conceptIds 只能使用给定卡片 id，没有合适卡片就留空。只返回符合 schema 的 JSON。' },
        { role: 'user', content: buildPrompt(project, concepts, elements, chunks) },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'zhuoyu_reproduction_plan', strict: true, schema: jsonSchema } },
    }),
  })
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240)
    throw new Error(`LLM 接口返回 ${response.status}${detail ? `：${detail}` : ''}`)
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('接口没有返回 message.content，无法校验计划。')
  let raw: unknown
  try {
    raw = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
  } catch {
    throw new Error('模型返回的不是合法 JSON，请重试或改用本地模板。')
  }
  const parsed = planSchema.safeParse(raw)
  if (!parsed.success) throw new Error(`计划结构校验失败：${parsed.error.issues[0]?.message ?? '字段不符合约定'}`)
  let order = 0
  return parsed.data.milestones.flatMap((milestone) => milestone.steps.map((step) => ({
    milestone: milestone.title,
    title: step.title,
    detail: step.detail,
    order: order++,
    estimatedMinutes: step.estimatedMinutes,
    status: 'todo' as const,
    checkpoint: step.checkpoint,
    checkpointDone: false,
    conceptIds: [...new Set(step.conceptIds.filter((id) => validConceptIds.has(id)))],
    source: 'llm' as const,
  })))
}

function buildPrompt(project: Project, concepts: Concept[], elements: Element[], chunks: TextChunk[]): string {
  const levelGuidance = project.level === 'L1'
    ? '目标是跑通官方代码，步骤侧重环境、数据、最小训练和冒烟验收，不要求完整主表复现。'
    : project.level === 'L2'
      ? '目标是复现主表结果，必须包含数据与超参对齐、正式训练、统一评测、指标偏差归因。'
      : '目标是消融/换数据/自研，必须包含可信基线、控制变量、实现验证、多种子对照和统计分析。'
  const conceptText = concepts.map((concept) => `id=${concept.id}｜${concept.name}｜掌握度=${concept.mastery}｜${concept.whyNeeded}`).join('\n') || '暂无卡片'
  const elementText = elements.slice(0, 35).map((element) => `${element.label}：${element.value}（第${element.page ?? '？'}页）`).join('\n') || '暂无拆解项'
  const context = chunks.map((chunk) => `[第${chunk.page}页] ${chunk.text}`).join('\n').slice(0, 45000)
  return `项目：${project.title}\n级别：${project.level}\n目标：${project.goal}\n设备：${project.device || '未填写'}\n${levelGuidance}\n\n概念卡片：\n${conceptText}\n\n论文拆解：\n${elementText}\n\n论文文本节选：\n${context || '暂无 PDF 文本，请只依据项目与拆解信息。'}`
}

function chatCompletionsUrl(endpoint: string): string {
  let url: URL
  try { url = new URL(endpoint.trim()) } catch { throw new Error('LLM 接口地址不是合法 URL。') }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('LLM 接口只支持 HTTP(S)。')
  const path = url.pathname.replace(/\/$/, '')
  url.pathname = path.endsWith('/chat/completions') ? path : `${path}/chat/completions`
  return url.toString()
}
