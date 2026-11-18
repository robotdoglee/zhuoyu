import { z } from 'zod'
import type { ElementType, TextChunk } from '../db/types'
import { ELEMENT_TYPE_META, elementTypeLabel, type ElementDraft } from './elements'
import type { LlmSettings } from './settings'

const itemSchema = z.object({
  type: z.enum(['task', 'dataset', 'architecture', 'training', 'hyperparam', 'metric', 'compute', 'code', 'supplement']),
  label: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(1200),
  quote: z.string().trim().min(4).max(1600),
  page: z.number().int().positive(),
})
const responseSchema = z.object({ items: z.array(itemSchema).max(60) })

const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      maxItems: 60,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ELEMENT_TYPE_META.map((item) => item.type) },
          label: { type: 'string', minLength: 1, maxLength: 100 },
          value: { type: 'string', minLength: 1, maxLength: 1200 },
          quote: { type: 'string', minLength: 4, maxLength: 1600 },
          page: { type: 'integer', minimum: 1 },
        },
        required: ['type', 'label', 'value', 'quote', 'page'],
      },
    },
  },
  required: ['items'],
}

export async function extractWithLlm(
  settings: LlmSettings,
  chunks: TextChunk[],
  types: ElementType[],
  paperTitle: string,
): Promise<ElementDraft[]> {
  if (!settings.apiKey.trim()) throw new Error('尚未配置 API Key；可先使用启发式抽取。')
  if (!settings.model.trim()) throw new Error('请先在设置页填写模型名。')
  if (chunks.length === 0) throw new Error('请先生成文本分块。')

  const endpoint = chatCompletionsUrl(settings.endpoint)
  const allowed = new Set(types)
  const typeText = types.map((type) => `${type}（${elementTypeLabel(type)}）`).join('、')
  const context = buildContext(chunks)
  const schema = types.length === ELEMENT_TYPE_META.length
    ? responseJsonSchema
    : {
        ...responseJsonSchema,
        properties: {
          items: {
            ...responseJsonSchema.properties.items,
            items: {
              ...responseJsonSchema.properties.items.items,
              properties: {
                ...responseJsonSchema.properties.items.items.properties,
                type: { type: 'string', enum: types },
              },
            },
          },
        },
      }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: settings.model.trim(),
      messages: [
        {
          role: 'system',
          content:
            '你是论文复现分析器。只依据用户给出的 PDF 文本抽取事实，不使用外部知识，不编造。每条 quote 必须是对应 page 文本中连续、逐字的原文，可包含换行；page 使用给出的 PDF 页码。没有找到的类别返回空数组，不要推测。',
        },
        {
          role: 'user',
          content: `论文：${paperTitle}\n本次只抽取：${typeText}\n每条包含 type、中文 label、中文或原文 value、逐字 quote、page。\n\nPDF 分块（页内偏移仅用于定位）：\n${context}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'zhuoyu_paper_elements', strict: true, schema },
      },
    }),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240)
    throw new Error(`LLM 接口返回 ${response.status}${detail ? `：${detail}` : ''}`)
  }
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> }
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('接口没有返回 message.content，无法校验抽取结果。')

  let raw: unknown
  try {
    raw = JSON.parse(stripCodeFence(content))
  } catch {
    throw new Error('模型返回的不是合法 JSON，请点击重试或仅重抽某一类。')
  }
  const parsed = responseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`JSON Schema 校验失败：${parsed.error.issues[0]?.message ?? '字段不符合约定'}`)
  }

  return parsed.data.items
    .filter((item) => allowed.has(item.type))
    .map((item) => ({ ...item, source: 'llm' as const }))
}

function chatCompletionsUrl(endpoint: string): string {
  let url: URL
  try {
    url = new URL(endpoint.trim())
  } catch {
    throw new Error('LLM 接口地址不是合法 URL。')
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('LLM 接口只支持 HTTP(S)。')
  const path = url.pathname.replace(/\/$/, '')
  url.pathname = path.endsWith('/chat/completions') ? path : `${path}/chat/completions`
  return url.toString()
}

function buildContext(chunks: TextChunk[]): string {
  const output: string[] = []
  let length = 0
  for (const chunk of chunks) {
    const block = `\n[chunk=${chunk.id} | page=${chunk.page} | offsets=${chunk.startOffset}-${chunk.endOffset}]\n${chunk.text}`
    if (length + block.length > 80_000) break
    output.push(block)
    length += block.length
  }
  return output.join('\n')
}

function stripCodeFence(content: string): string {
  return content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
}
