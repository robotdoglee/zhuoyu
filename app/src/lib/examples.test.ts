import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadAttention: vi.fn(),
  loadResnet: vi.fn(),
}))

vi.mock('./example', () => ({ loadExampleProject: mocks.loadAttention }))
vi.mock('./resnetExample', () => ({ loadResnetExampleProject: mocks.loadResnet }))

import { EXAMPLE_DEFINITIONS, importExampleProject } from './examples'

describe('示例导入入口', () => {
  beforeEach(() => {
    mocks.loadAttention.mockReset()
    mocks.loadResnet.mockReset()
  })

  it('首页按钮与示例卡片共用同一份注册表', () => {
    expect(Object.keys(EXAMPLE_DEFINITIONS)).toEqual(['attention', 'resnet'])
    expect(EXAMPLE_DEFINITIONS.attention.title).toContain('Attention')
    expect(EXAMPLE_DEFINITIONS.resnet.title).toContain('Residual')
  })

  it('Attention 示例导入后返回可跳转路径', async () => {
    mocks.loadAttention.mockResolvedValue({ projectId: 7, existing: false })
    const result = await importExampleProject('attention')
    expect(mocks.loadAttention).toHaveBeenCalledWith({})
    expect(result).toEqual({ projectId: 7, existing: false, path: '/project/7' })
  })

  it('ResNet 示例支持重置并返回对应项目路径', async () => {
    mocks.loadResnet.mockResolvedValue({ projectId: 9, existing: true })
    const result = await importExampleProject('resnet', { reset: true })
    expect(mocks.loadResnet).toHaveBeenCalledWith({ reset: true })
    expect(result.path).toBe('/project/9')
  })

  it('项目编号无效时抛错，避免跳到不存在的项目', async () => {
    mocks.loadAttention.mockResolvedValue({ projectId: 0, existing: false })
    await expect(importExampleProject('attention')).rejects.toThrow('有效编号')
  })

  it('未知示例类型不会静默成功', async () => {
    await expect(importExampleProject('unknown' as never)).rejects.toThrow('未知的示例类型')
  })
})
