import type { Concept, Element, ElementType, TextChunk } from '../db/types'
import { normalizeQuote } from './anchors'

export const ELEMENT_TYPE_META: Array<{ type: ElementType; label: string; hint: string }> = [
  { type: 'task', label: '任务', hint: '要解决什么问题、输入输出是什么' },
  { type: 'dataset', label: '数据集', hint: '语料、规模、划分与预处理' },
  { type: 'architecture', label: '模型结构', hint: '核心模块及连接方式' },
  { type: 'training', label: '训练流程', hint: '训练目标、流程与正则化' },
  { type: 'hyperparam', label: '超参', hint: '优化器、学习率、batch、dropout 等' },
  { type: 'metric', label: '指标与原文数值', hint: '评价指标、主表数值与实验条件' },
  { type: 'compute', label: '算力', hint: '硬件、训练时长与 token 规模' },
  { type: 'code', label: '代码仓库', hint: '官方实现、配置与许可证线索' },
  { type: 'supplement', label: '补充材料', hint: '附录、补充实验与可视化材料' },
]

export function elementTypeLabel(type: ElementType): string {
  return ELEMENT_TYPE_META.find((item) => item.type === type)?.label ?? type
}

export type ElementDraft = Pick<
  Element,
  | 'type'
  | 'label'
  | 'value'
  | 'quote'
  | 'page'
  | 'detail'
  | 'section'
  | 'formula'
  | 'keyNumbers'
  | 'relatedLabels'
  | 'relatedConceptNames'
> & {
  source: 'llm' | 'heuristic'
}

const RULES: Record<ElementType, RegExp> = {
  task: /we propose|we introduce|our goal|machine translation|sequence transduction|the task/i,
  dataset: /WMT\s*20\d\d|CIFAR-?\d+|ImageNet|SQuAD|MNIST|GLUE|dataset|corpus|sentence pairs/i,
  architecture: /Transformer|encoder|decoder|attention|residual|layer normalization|convolution|architecture/i,
  training: /training procedure|we trained|training|optimizer|regularization|preprocess/i,
  hyperparam: /learning rate|batch size|warmup|dropout|label smoothing|weight decay|Adam|d_model|d_ff|epoch|\bN\s*=\s*\d+/i,
  metric: /BLEU|accuracy|perplexity|F1|precision|recall|Table\s+\d+|\b\d+\.\d+\b/i,
  compute: /\bGPUs?\b|\bTPUs?\b|NVIDIA|P100|V100|A100|training time|\b\d+(?:\.\d+)?\s+(?:hours?|days?)\b/i,
  code: /https?:\/\/(?:www\.)?github\.com\/[\w.-]+\/[\w.-]+/i,
  supplement: /appendix|supplementary|supplemental|additional results|attention visualizations/i,
}

/** 无 Key 时的可解释抽取：只截取原文，不让模型补写不存在的事实。 */
export function extractHeuristically(chunks: TextChunk[]): ElementDraft[] {
  const drafts: ElementDraft[] = []
  const seen = new Set<string>()

  for (const meta of ELEMENT_TYPE_META) {
    for (const chunk of chunks) {
      if (drafts.filter((item) => item.type === meta.type).length >= 4) break
      const match = RULES[meta.type].exec(chunk.text)
      if (!match || match.index === undefined) continue
      const quote = quoteAround(chunk.text, match.index, match[0].length)
      const key = `${meta.type}:${normalizeQuote(quote)}`
      if (!quote || seen.has(key)) continue
      seen.add(key)

      const line = chunk.text
        .slice(Math.max(0, match.index - 30), Math.min(chunk.text.length, match.index + 210))
        .replace(/\s+/g, ' ')
        .trim()
      const matchedValue = meta.type === 'code' ? match[0].replace(/[),.]+$/, '') : line
      drafts.push({
        type: meta.type,
        label: meta.type === 'code' ? 'GitHub 仓库' : `${meta.label}线索：${match[0].slice(0, 48)}`,
        value: matchedValue.slice(0, 220),
        quote,
        page: chunk.page,
        section: sectionAround(chunk.text, match.index),
        keyNumbers: keyNumbersFrom(line),
        source: 'heuristic',
      })
    }
  }
  return drafts
}

function quoteAround(text: string, index: number, matchLength: number): string {
  let start = Math.max(0, index - 180)
  let end = Math.min(text.length, index + matchLength + 220)
  const left = text.slice(start, index)
  const leftBoundary = Math.max(left.lastIndexOf('\n'), left.lastIndexOf('. '))
  if (leftBoundary >= 0) start += leftBoundary + (left[leftBoundary] === '\n' ? 1 : 2)
  const right = text.slice(index + matchLength, end)
  const rightNewline = right.indexOf('\n')
  const rightPeriod = right.indexOf('. ')
  const boundaries = [rightNewline, rightPeriod].filter((value) => value >= 0)
  if (boundaries.length > 0) {
    const boundary = Math.min(...boundaries)
    end = index + matchLength + boundary + (boundary === rightPeriod ? 1 : 1)
  }
  return text.slice(start, end).trim().slice(0, 420)
}

/** 从命中位置向前找最近的章节标题，例如「3.2.2 Multi-Head Attention」。 */
export function sectionAround(text: string, index: number): string | undefined {
  const lineStart = text.lastIndexOf('\n', Math.max(0, index - 1)) + 1
  const lineEnd = text.indexOf('\n', index)
  const currentLine = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim()
  if (isHeadingLine(currentLine)) return currentLine

  const lines = text.slice(0, lineStart).split('\n').slice(-14).reverse()
  for (const line of lines) {
    const trimmed = line.trim()
    if (isHeadingLine(trimmed)) return trimmed
  }
  return undefined
}

function isHeadingLine(line: string): boolean {
  return line.length >= 3 && line.length <= 90 && /^\d+(?:\.\d+)*\.?\s+[A-Z\u4e00-\u9fa5]/.test(line)
}

/** 从文本中提取至多 6 个带单位或特殊符号的关键数字，用于详情面板。 */
export function keyNumbersFrom(text: string): string[] {
  const matches = text.match(/\b\d+(?:[.,]\d+)?(?:\s*(?:%|×|k|K|M|B|万|亿|小时|天|步|层|头|页))?/g) ?? []
  const seen = new Set<string>()
  const output: string[] = []
  for (const raw of matches) {
    const value = raw.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    output.push(value)
    if (output.length >= 6) break
  }
  return output
}

/** 按 label 解析卡片之间的人工关联，忽略已被删除或指向自身的条目。 */
export function relatedElementsOf(element: Element, all: Element[]): Element[] {
  const labels = new Set(element.relatedLabels ?? [])
  if (labels.size === 0) return []
  return all.filter((item) => item.id !== element.id && labels.has(item.label))
}

/** 按名称解析关联知识点，名称需与概念卡片的 name 完全一致。 */
export function relatedConceptsOf(element: Element, concepts: Concept[]): Concept[] {
  const names = new Set(element.relatedConceptNames ?? [])
  if (names.size === 0) return []
  return concepts.filter((concept) => names.has(concept.name))
}
