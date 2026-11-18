import { z } from 'zod'
import type { LlmSettings } from './settings'
import { RETRO_TEXT_FIELDS, type RetroDraft } from './retrospective'

const responseSchema = z.object({
  scope: z.string(), method: z.string(), results: z.string(), deviations: z.string(),
  dataDeviation: z.string(), hyperparameterDeviation: z.string(), seedDeviation: z.string(),
  hardwareDeviation: z.string(), difficulties: z.string(), hiddenDetails: z.string(), authorContact: z.string(),
})

const properties = Object.fromEntries(RETRO_TEXT_FIELDS.map((field) => [field, { type: 'string' }]))

export async function polishRetrospectiveWithLlm(settings: LlmSettings, draft: RetroDraft): Promise<RetroDraft> {
  if (!settings.apiKey.trim()) throw new Error('未配置 API Key；本地复盘初稿仍可编辑与导出，未发送任何内容。')
  if (!settings.model.trim()) throw new Error('请先在 LLM 设置中填写模型名。')
  const endpoint = chatCompletionsUrl(settings.endpoint)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey.trim()}` },
    body: JSON.stringify({
      model: settings.model.trim(),
      messages: [
        {
          role: 'system',
          content: '你是严谨的机器学习复现复盘编辑。只润色用户给出的中文初稿，不增加任何事实、实验、数字、引文、页码或归因。所有指标数字必须与输入逐字一致；没有证据的归因继续标为待补写。保留 Markdown 列表与「论文没写的细节」专栏。只返回符合 schema 的 JSON。',
        },
        { role: 'user', content: `请润色以下复盘初稿的表达式，保持全部事实与结构：\n${JSON.stringify(draft)}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'zhuoyu_retrospective', strict: true,
          schema: { type: 'object', additionalProperties: false, properties, required: RETRO_TEXT_FIELDS },
        },
      },
    }),
  })
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240)
    throw new Error(`LLM 接口返回 ${response.status}${detail ? `：${detail}` : ''}`)
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('接口没有返回 message.content，复盘保持原稿。')
  let raw: unknown
  try {
    raw = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
  } catch {
    throw new Error('模型返回的不是合法 JSON，复盘保持原稿。')
  }
  const parsed = responseSchema.safeParse(raw)
  if (!parsed.success) throw new Error(`复盘结构校验失败：${parsed.error.issues[0]?.message ?? '字段不符合约定'}`)
  return parsed.data
}

function chatCompletionsUrl(endpoint: string): string {
  let url: URL
  try { url = new URL(endpoint.trim()) } catch { throw new Error('LLM 接口地址不是合法 URL。') }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('LLM 接口只支持 HTTP(S)。')
  const path = url.pathname.replace(/\/$/, '')
  url.pathname = path.endsWith('/chat/completions') ? path : `${path}/chat/completions`
  return url.toString()
}
