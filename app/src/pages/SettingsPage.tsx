import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  clearLlmSettings,
  DEFAULT_LLM_SETTINGS,
  loadLlmSettings,
  saveLlmSettings,
  type LlmSettings,
} from '../lib/settings'

export default function SettingsPage() {
  const [settings, setSettings] = useState<LlmSettings>(() => loadLlmSettings())
  const [message, setMessage] = useState('')

  function update(field: keyof LlmSettings, value: string) {
    setSettings((current) => ({ ...current, [field]: value }))
    setMessage('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const endpoint = new URL(settings.endpoint.trim())
      if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error()
    } catch {
      setMessage('接口地址需是有效的 HTTP(S) URL。')
      return
    }
    saveLlmSettings({
      endpoint: settings.endpoint.trim(),
      model: settings.model.trim(),
      apiKey: settings.apiKey.trim(),
    })
    setMessage('设置已保存在这台浏览器中。')
  }

  function handleClear() {
    clearLlmSettings()
    setSettings({ ...DEFAULT_LLM_SETTINGS })
    setMessage('本机保存的接口地址、模型名与 API Key 已清除。')
  }

  return (
    <div className="settings-page">
      <Link to="/" className="back-link">← 全部项目</Link>
      <section className="panel settings-panel">
        <p className="kicker">本机设置 / LLM</p>
        <h1>结构化抽取设置</h1>
        <p className="settings-intro">
          使用任意 OpenAI 兼容的 Chat Completions 接口。只有点击「LLM 抽取」时，论文分块才会发送到你配置的端点；Key 不会随项目数据保存。
        </p>

        <div className="privacy-strip">
          <span className="status-dot" aria-hidden="true" />
          仅存本机 localStorage · 无账号 · 无云端同步
        </div>

        <form className="settings-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="llm-endpoint">接口地址</label>
            <input
              id="llm-endpoint"
              className="mono"
              value={settings.endpoint}
              onChange={(event) => update('endpoint', event.target.value)}
              placeholder="https://api.openai.com/v1"
              autoComplete="off"
              required
            />
            <p className="field-hint">填到 /v1 即可，请求时自动追加 /chat/completions；也可直接填完整路径。</p>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="llm-model">模型名</label>
            <input
              id="llm-model"
              className="mono"
              value={settings.model}
              onChange={(event) => update('model', event.target.value)}
              placeholder="例如：gpt-4o-mini / deepseek-chat / qwen-plus"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="llm-key">API Key</label>
            <input
              id="llm-key"
              className="mono"
              type="password"
              value={settings.apiKey}
              onChange={(event) => update('apiKey', event.target.value)}
              placeholder="留空时使用本地启发式抽取"
              autoComplete="new-password"
            />
            <p className="field-hint">浏览器会把它保存在 localStorage；公共设备上使用后请立即清除。</p>
          </div>

          {message && (
            <div className={`notice ${message.includes('有效') ? 'error' : 'ok'}`} role="status">
              {message}
            </div>
          )}

          <div className="settings-actions">
            <button type="button" className="btn btn-quiet danger" onClick={handleClear}>一键清除本机设置</button>
            <button type="submit" className="btn btn-primary">保存设置</button>
          </div>
        </form>
      </section>
    </div>
  )
}
