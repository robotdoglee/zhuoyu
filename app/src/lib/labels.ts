import type { Mastery, ResourceTier } from '../db/types'

export const MASTERY_LABEL: Record<Mastery, string> = {
  known: '会',
  half: '半会',
  unknown: '不会',
}

export const TIER_LABEL: Record<ResourceTier, string> = {
  primary: '一手论文 / 官方仓库',
  secondary: '教材 / Wikipedia',
  blog: '博客 / 视频 · 未经同行评审',
}
