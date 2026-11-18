export interface LlmSettings {
  endpoint: string
  model: string
  apiKey: string
}

const STORAGE_KEY = 'zhuoyu.llm-settings.v1'

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  endpoint: 'https://api.openai.com/v1',
  model: '',
  apiKey: '',
}

export function loadLlmSettings(): LlmSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_LLM_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<LlmSettings>
    return {
      endpoint: typeof parsed.endpoint === 'string' ? parsed.endpoint : DEFAULT_LLM_SETTINGS.endpoint,
      model: typeof parsed.model === 'string' ? parsed.model : '',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
    }
  } catch {
    return { ...DEFAULT_LLM_SETTINGS }
  }
}

export function saveLlmSettings(settings: LlmSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function clearLlmSettings(): void {
  localStorage.removeItem(STORAGE_KEY)
}
