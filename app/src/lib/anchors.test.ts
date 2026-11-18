import { describe, expect, it } from 'vitest'
import { normalizeQuote, verifyAnchor } from './anchors'

const pages = [{ page: 3, text: 'We use warmup_steps = 4000.\nThe Trans-\nformer uses ８ heads.' }]

describe('引文归一化校验', () => {
  it('忽略空白、跨行连字符与全半角差异', () => {
    expect(verifyAnchor(pages, 3, 'The Transformer uses 8 heads.')).toBe(true)
    expect(normalizeQuote(' Ａ\n B ')).toBe('ab')
  })

  it('页码或内容被篡改时返回待核实', () => {
    expect(verifyAnchor(pages, 4, 'We use warmup_steps = 4000.')).toBe(false)
    expect(verifyAnchor(pages, 3, 'We use warmup_steps = 8000.')).toBe(false)
    expect(verifyAnchor(pages, 3, '')).toBe(false)
  })
})
