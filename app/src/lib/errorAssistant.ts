import { z } from 'zod'
import type { LlmSettings } from './settings'

const diagnosisSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  keyErrors: z.array(z.string().trim().min(1).max(1000)).min(1).max(8),
  suggestions: z.array(z.string().trim().min(1).max(1000)).min(1).max(10),
})

export type ErrorDiagnosis = z.infer<typeof diagnosisSchema>

export async function diagnoseErrorLog(settings: LlmSettings, log: string): Promise<ErrorDiagnosis> {
  // 无 Key 时必须在构造 URL、读取日志或发起 fetch 之前退出。
  if (!settings.apiKey.trim()) throw new Error('未配置 API Key，报错助手不可用；日志未发送，也不会离开本机。')
  if (!settings.model.trim()) throw new Error('请先在设置页补充模型名；日志尚未发送。')
  if (!log.trim()) throw new Error('请先粘贴需要分析的日志。')
  const endpoint = chatCompletionsUrl(settings.endpoint)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey.trim()}` },
    body: JSON.stringify({
      model: settings.model.trim(),
      messages: [
        { role: 'system', content: '你是机器学习复现报错诊断器。只依据日志抽取关键报错，区分直接原因与可能原因，给出按优先级排序、可执行的排查建议。不要要求用户上传额外隐私数据。返回中文 JSON。' },
        { role: 'user', content: `请分析以下复现日志：\n\n${log.slice(0, 24000)}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'zhuoyu_error_diagnosis', strict: true,
          schema: {
            type: 'object', additionalProperties: false,
            properties: {
              summary: { type: 'string' },
              keyErrors: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string' } },
              suggestions: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'string' } },
            },
            required: ['summary', 'keyErrors', 'suggestions'],
          },
        },
      },
    }),
  })
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240)
    throw new Error(`LLM 接口返回 ${response.status}${detail ? `：${detail}` : ''}；未写入记事本。`)
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('接口没有返回可校验的诊断内容。')
  let raw: unknown
  try { raw = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) } catch {
    throw new Error('模型返回的不是合法 JSON，未写入记事本。')
  }
  const parsed = diagnosisSchema.safeParse(raw)
  if (!parsed.success) throw new Error('诊断结果结构校验失败，未写入记事本。')
  return parsed.data
}

export function diagnosisToMarkdown(log: string, diagnosis: ErrorDiagnosis): string {
  return [
    '### 报错助手诊断',
    diagnosis.summary,
    '#### 关键报错',
    ...diagnosis.keyErrors.map((item) => `- ${item}`),
    '#### 排查建议',
    ...diagnosis.suggestions.map((item, index) => `${index + 1}. ${item}`),
    '#### 原始日志',
    '```text',
    log.trim().replace(/```/g, 'ʼʼʼ'),
    '```',
  ].join('\n\n')
}

function chatCompletionsUrl(endpoint: string): string {
  let url: URL
  try { url = new URL(endpoint.trim()) } catch { throw new Error('LLM 接口地址不是合法 URL；日志尚未发送。') }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('LLM 接口只支持 HTTP(S)；日志尚未发送。')
  const path = url.pathname.replace(/\/$/, '')
  url.pathname = path.endsWith('/chat/completions') ? path : `${path}/chat/completions`
  return url.toString()
}
