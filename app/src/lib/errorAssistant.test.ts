import { afterEach, describe, expect, it, vi } from 'vitest'
import { diagnoseErrorLog, diagnosisToMarkdown } from './errorAssistant'
import { DEFAULT_LLM_SETTINGS } from './settings'

afterEach(() => vi.unstubAllGlobals())

describe('报错助手', () => {
  it('无 Key 时明确拒绝且零网络请求', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(diagnoseErrorLog({ ...DEFAULT_LLM_SETTINGS, model: 'test' }, 'CUDA out of memory')).rejects.toThrow('日志未发送')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('诊断写入 Markdown 时保留关键报错、建议与原始日志', () => {
    const markdown = diagnosisToMarkdown('Traceback: CUDA out of memory', {
      summary: '显存不足', keyErrors: ['CUDA out of memory'], suggestions: ['减小 batch size'],
    })
    expect(markdown).toContain('显存不足')
    expect(markdown).toContain('1. 减小 batch size')
    expect(markdown).toContain('Traceback: CUDA out of memory')
  })
})
