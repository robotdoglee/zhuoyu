import { describe, expect, it } from 'vitest'
import type { ProjectBundle } from './projectData'
import { buildHiddenDetailsMarkdown, buildRetrospectiveDraft } from './retrospective'
import {
  buildAnkiCsv,
  buildMarkdown,
  buildMermaid,
  buildObsidianNotes,
  buildProjectJson,
} from './exporters'

function makeBundle(): ProjectBundle {
  return {
    project: {
      id: 1,
      title: '示例：复现注意力',
      goal: '核对主表 BLEU 与训练配置',
      level: 'L2',
      device: 'RTX 3060 12GB',
      createdAt: 100,
      updatedAt: 200,
    },
    paper: {
      id: 2,
      projectId: 1,
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani', 'Noam Shazeer'],
      abstract: 'The dominant sequence transduction models...',
      year: 2017,
      venue: 'NeurIPS',
      arxivId: '1706.03762',
      source: 'arxiv',
      pageCount: 15,
      pages: [],
      createdAt: 110,
      updatedAt: 110,
    },
    elements: [{
      id: 3,
      projectId: 1,
      paperId: 2,
      type: 'hyperparam',
      label: 'Dropout',
      value: '各子层输出应用 0.1 的 dropout',
      quote: 'We apply dropout to the output of each sub-layer',
      page: 4,
      verified: true,
      source: 'example',
      createdAt: 120,
    }],
    concepts: [
      {
        id: 10,
        projectId: 1,
        name: '注意力, "缩放点积"',
        summary: '<Q,K,V> 加权汇总',
        whyNeeded: '理解核心计算',
        difficulty: 2,
        mastery: 'known',
        masteryUpdatedAt: 180,
        dependsOn: [11],
        resources: [{ title: '论文', url: 'https://arxiv.org/abs/1706.03762', tier: 'primary' }],
        createdAt: 130,
      },
      {
        id: 11,
        projectId: 1,
        name: 'Softmax',
        summary: '把分值归一化为权重',
        whyNeeded: '计算注意力权重',
        difficulty: 1,
        mastery: 'known',
        dependsOn: [],
        resources: [],
        createdAt: 125,
      },
    ],
    planSteps: [{
      id: 20,
      projectId: 1,
      milestone: '训练',
      version: 1,
      title: '跑通 Base 模型训练',
      detail: '使用论文配置',
      order: 0,
      estimatedMinutes: 120,
      status: 'done',
      checkpoint: '验证集可计算 BLEU',
      checkpointDone: true,
      conceptIds: [10],
      source: 'example',
      createdAt: 140,
      updatedAt: 180,
    }],
    planVersions: [{
      id: 21,
      projectId: 1,
      version: 0,
      reason: '测试历史版本',
      steps: [],
      createdAt: 135,
    }],
    notes: [
      {
        id: 30,
        projectId: 1,
        stepId: 20,
        kind: 'idea',
        content: '发现 Adam β₂=0.98；[@卡片：注意力](#concept-10)',
        conceptIds: [10],
        stepIds: [20],
        completeCheckpoint: false,
        completeStep: false,
        isHiddenDetail: true,
        hiddenDetailType: 'hyperparameter',
        source: 'example',
        createdAt: 150,
        updatedAt: 150,
      },
      {
        id: 31,
        projectId: 1,
        kind: 'result',
        content: '普通实验结果，不进入细节专栏',
        conceptIds: [],
        stepIds: [],
        completeCheckpoint: false,
        completeStep: false,
        isHiddenDetail: false,
        imageData: 'data:image/png;base64,AAEC',
        source: 'manual',
        createdAt: 160,
        updatedAt: 160,
      },
    ],
    metrics: [{
      id: 40,
      projectId: 1,
      name: 'BLEU',
      ours: 26,
      paperValue: 27.3,
      higherIsBetter: true,
      createdAt: 170,
    }],
  }
}

function withDraft(bundle: ProjectBundle): ProjectBundle {
  return {
    ...bundle,
    retrospective: {
      projectId: 1,
      ...buildRetrospectiveDraft(bundle),
      createdAt: 190,
      updatedAt: 190,
    },
  }
}

describe('M3 复盘自动汇总', () => {
  it('汇总项目、论文、拆解、计划、记录，并直接采用指标表的计算结果', () => {
    const draft = buildRetrospectiveDraft(makeBundle())

    expect(draft.scope).toContain('示例：复现注意力')
    expect(draft.scope).toContain('Attention Is All You Need')
    expect(draft.method).toContain('第 4 页')
    expect(draft.method).toContain('We apply dropout to the output of each sub-layer')
    expect(draft.method).toContain('跑通 Base 模型训练')
    expect(draft.results).toContain('我的 26；原文 27.3')
    expect(draft.results).toContain('绝对差 1.3；偏差 -4.76%')
    expect(draft.results).toContain('普通实验结果，不进入细节专栏')
    expect(draft.difficulties).toContain('检查点已验收')
    expect(draft.authorContact).toContain('待补写')
  })

  it('隐藏细节专栏只纳入显式标记记录并保留分类和来源', () => {
    const details = buildHiddenDetailsMarkdown(makeBundle())

    expect(details).toContain('### 隐藏超参｜跑通 Base 模型训练')
    expect(details).toContain('Adam β₂=0.98')
    expect(details).toContain('记录 #30')
    expect(details).not.toContain('普通实验结果，不进入细节专栏')
  })
})

describe('M3 本地导出', () => {
  it('Markdown 保留拆解页码、引文、隐藏细节和 Mermaid 框图', () => {
    const markdown = buildMarkdown(withDraft(makeBundle()))

    expect(markdown).toContain('- 页码：第 4 页')
    expect(markdown).toContain('- 校验：引文已匹配')
    expect(markdown).toContain('> We apply dropout to the output of each sub-layer')
    expect(markdown).toContain('## 八、论文没写的细节')
    expect(markdown).toContain('### 隐藏超参｜跑通 Base 模型训练')
    expect(markdown).toContain('```mermaid')
    expect(markdown).not.toContain('### 专栏补写')
  })

  it('Obsidian 的每个双链都指向包内真实笔记，正文卡片引用也是直接双链', () => {
    const notes = buildObsidianNotes(withDraft(makeBundle()))
    const fileNames = new Set(notes.map((note) => note.fileName.slice(0, -3)))

    for (const note of notes) {
      for (const match of note.content.matchAll(/\[\[([^\]]+)\]\]/g)) {
        expect(fileNames, `${note.fileName} 中的 [[${match[1]}]]`).toContain(match[1])
      }
      expect(note.content).not.toContain(']([[')
    }

    const hiddenNote = notes.find((note) => note.fileName === '记录-001-想法.md')
    expect(hiddenNote?.content).toContain('[[概念-01-注意力, -缩放点积-]]')
    expect(hiddenNote?.content).not.toContain('](#concept-10)')
  })

  it('JSON 可解析并保留历史计划、本地截图和完整复盘', () => {
    const exported = JSON.parse(buildProjectJson(withDraft(makeBundle()))) as {
      format: string
      schemaVersion: number
      planVersions: unknown[]
      notes: Array<{ imageData?: string }>
      retrospective: { projectId: number }
    }

    expect(exported).toMatchObject({ format: 'zhuoyu-project', schemaVersion: 4 })
    expect(exported.planVersions).toHaveLength(1)
    expect(exported.notes?.[1]).toMatchObject({ imageData: 'data:image/png;base64,AAEC' })
    expect(exported.retrospective).toMatchObject({ projectId: 1 })
    expect(JSON.stringify(exported)).not.toContain('apiKey')
  })

  it('Anki CSV 正确转义逗号、双引号和 HTML，并保留掌握度标签', () => {
    const csv = buildAnkiCsv(makeBundle().concepts)

    expect(csv).toContain('"注意力, ""缩放点积"""')
    expect(csv).toContain('&lt;Q,K,V&gt; 加权汇总')
    expect(csv).toContain('琢玉 难度2 已掌握')
    expect(parseCsv(csv)).toHaveLength(3)
  })

  it('Mermaid 使用真实概念依赖并标出掌握状态', () => {
    const diagram = buildMermaid(makeBundle().concepts)

    expect(diagram).toContain('c1 --> c0')
    expect(diagram).toContain('class c0 known')
    expect(diagram).toContain('classDef known')
  })
})

function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if (char === '\n' && !quoted) {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') {
      cell += char
    }
  }
  row.push(cell)
  rows.push(row)
  return rows
}
