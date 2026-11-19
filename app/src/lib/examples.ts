import { loadExampleProject } from './example'
import { loadResnetExampleProject } from './resnetExample'

export type ExampleKind = 'attention' | 'resnet'

export interface ExampleDefinition {
  kind: ExampleKind
  title: string
  shortTitle: string
  load: (options?: { reset?: boolean }) => Promise<{ projectId: number; existing: boolean }>
}

/** 首页与 hero 按钮共用同一份示例注册表，避免两处入口加载不同数据。 */
export const EXAMPLE_DEFINITIONS: Record<ExampleKind, ExampleDefinition> = {
  attention: {
    kind: 'attention',
    title: 'Attention Is All You Need',
    shortTitle: 'Attention',
    load: loadExampleProject,
  },
  resnet: {
    kind: 'resnet',
    title: 'Deep Residual Learning',
    shortTitle: 'ResNet',
    load: loadResnetExampleProject,
  },
}

export function projectPath(projectId: number): string {
  return `/project/${projectId}`
}

/**
 * 导入示例并返回可跳转路径。
 * 所有入口（hero 按钮、示例卡片、重置）都必须经过这里，确保项目编号有效。
 */
export async function importExampleProject(
  kind: ExampleKind,
  options: { reset?: boolean } = {},
): Promise<{ projectId: number; existing: boolean; path: string }> {
  const definition = EXAMPLE_DEFINITIONS[kind]
  if (!definition) throw new Error(`未知的示例类型：${String(kind)}`)
  const { projectId, existing } = await definition.load(options)
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error('示例项目已创建，但没有拿到有效编号，请重试。')
  }
  return { projectId, existing, path: projectPath(projectId) }
}
