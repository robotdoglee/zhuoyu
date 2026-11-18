import JSZip from 'jszip'
import { elementTypeLabel } from './elements'
import { compareMetric, formatMetricNumber, formatSigned } from './metrics'
import { buildHiddenDetailsMarkdown, NOTE_KIND_LABEL, retrospectiveText } from './retrospective'
import { levelName, type Concept, type NoteEntry } from '../db/types'
import type { ProjectBundle } from './projectData'

export type ExportFormat = 'markdown' | 'obsidian' | 'json' | 'anki' | 'pdf'

export function safeFileName(value: string): string {
  const cleaned = value.replace(/[\\/:*?"<>|#[\]^]/g, '-').replace(/\s+/g, ' ').trim().replace(/\.+$/g, '')
  return cleaned.slice(0, 90) || '未命名项目'
}

export function buildMermaid(concepts: Concept[]): string {
  if (!concepts.length) return 'graph LR\n  empty["尚未创建概念卡片"]'
  const ids = new Map(concepts.flatMap((concept, index) => concept.id === undefined ? [] : [[concept.id, `c${index}`]]))
  const lines = ['graph LR']
  concepts.forEach((concept, index) => {
    const label = concept.name.replace(/["\r\n]/g, ' ').trim()
    lines.push(`  c${index}["${label}"]`)
  })
  for (const concept of concepts) {
    const target = concept.id === undefined ? undefined : ids.get(concept.id)
    if (!target) continue
    for (const dependency of new Set(concept.dependsOn)) {
      const source = ids.get(dependency)
      if (source && source !== target) lines.push(`  ${source} --> ${target}`)
    }
  }
  lines.push('  classDef known fill:#edf3e8,stroke:#4f7044,color:#1f1e1d')
  lines.push('  classDef half fill:#fbf1e4,stroke:#8a5512,color:#1f1e1d')
  lines.push('  classDef unknown fill:#fffefb,stroke:#b4552f,color:#1f1e1d')
  concepts.forEach((concept, index) => lines.push(`  class c${index} ${concept.mastery}`))
  return lines.join('\n')
}

export function buildMarkdown(bundle: ProjectBundle): string {
  const { project, paper, elements, concepts, planSteps, notes, metrics } = bundle
  const retro = retrospectiveText(bundle.retrospective)
  const parts: string[] = [
    `# ${project.title}｜复现复盘与知识库`,
    '',
    `> 琢玉本地导出 · ${new Date().toLocaleString('zh-CN')} · 数据未上传`,
    '',
    '## 一、范围',
    '',
    retro.scope || '待补写。',
    '',
    `- 复现级别：${levelName(project.level)}`,
    `- 设备与算力：${project.device || '未填写'}`,
    '',
    '## 二、论文信息',
    '',
    paper ? [
      `- 标题：${paper.title}`,
      `- 作者：${paper.authors.join('、') || '未填写'}`,
      `- 年份：${paper.year ?? '未填写'}`,
      `- 发表：${paper.venue ?? '未填写'}`,
      `- arXiv：${paper.arxivId ?? '未填写'}`,
      `- DOI：${paper.doi ?? '未填写'}`,
      `- PDF 页数：${paper.pageCount || '未导入'}`,
      paper.url ? `- 链接：${paper.url}` : '',
      paper.abstract ? `\n### 摘要\n\n${paper.abstract}` : '',
    ].filter(Boolean).join('\n') : '尚未导入论文。',
    '',
    '## 三、方法',
    '',
    retro.method || '待补写。',
    '',
    '## 四、结果与指标对照',
    '',
    retro.results || '待补写。',
    '',
    '| 指标 | 原文 | 我的 | 绝对差 | 偏差 | 方向 |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
    ...(metrics.length ? metrics.map((metric) => {
      const result = compareMetric(metric)
      return `| ${metric.name || '未命名'} | ${formatMetricNumber(metric.paperValue)} ${metric.unit ?? ''} | ${formatMetricNumber(metric.ours)} ${metric.unit ?? ''} | ${formatMetricNumber(result.absoluteDifference)} | ${result.deviationPercent === undefined && result.difference !== undefined ? '原文为 0' : formatSigned(result.deviationPercent, '%')} | ${metric.higherIsBetter ? '越高越好' : '越低越好'} |`
    }) : ['| 暂无指标 | — | — | — | — | — |']),
    '',
    '## 五、论文拆解（页码与原文引文）',
    '',
    ...(elements.length ? elements.flatMap((element, index) => [
      `### ${index + 1}. [${elementTypeLabel(element.type)}] ${element.label}`,
      '',
      element.value,
      '',
      `- 页码：${element.page ? `第 ${element.page} 页` : '待补'}`,
      `- 校验：${element.verified === false ? '待核实' : element.verified ? '引文已匹配' : '未校验'}`,
      `- 引文：${element.quote ? `\n\n> ${element.quote.replace(/\n/g, '\n> ')}` : '待补'}`,
      '',
    ]) : ['尚无拆解项。', '']),
    '## 六、偏差归因',
    '',
    retro.deviations || '待补写。',
    '',
    '### 数据', '', retro.dataDeviation || '待补写。',
    '', '### 超参', '', retro.hyperparameterDeviation || '待补写。',
    '', '### 随机种子', '', retro.seedDeviation || '待补写。',
    '', '### 硬件', '', retro.hardwareDeviation || '待补写。',
    '',
    '## 七、难点与易点', '', retro.difficulties || '待补写。',
    '',
    '## 八、论文没写的细节',
    '',
    '> 以下高亮内容来自记事本中显式标记的记录，是复现过程中独立沉淀的经验。',
    '',
    retro.hiddenDetails || buildHiddenDetailsMarkdown(bundle),
    '',
    '## 九、与作者沟通', '', retro.authorContact || '待补写。',
    '',
    '## 十、复现计划与检查点',
    '',
    ...(planSteps.length ? planSteps.map((step) => `- [${step.checkpointDone ? 'x' : ' '}] **${step.milestone} / ${step.title}**（${{ done: '完成', doing: '进行中', blocked: '受阻', todo: '待办' }[step.status]}）${step.checkpoint ? `\n  - 检查点：${step.checkpoint}` : ''}`) : ['尚无计划。']),
    '',
    '## 十一、记事本完整记录',
    '',
    ...(notes.length ? notes.flatMap((note) => [
      `### ${NOTE_KIND_LABEL[note.kind]}｜${new Date(note.createdAt).toLocaleString('zh-CN')}${note.isHiddenDetail ? '｜论文没写的细节' : ''}`,
      '',
      note.content || '（本地截图记录，图片仅包含在 JSON 导出中）',
      '',
    ]) : ['尚无记录。', '']),
    '## 十二、概念卡片',
    '',
    ...(concepts.length ? concepts.flatMap((concept) => [
      `### ${concept.name}`,
      '',
      `- 一句话解释：${concept.summary}`,
      `- 为何复现需要：${concept.whyNeeded}`,
      `- 难度：${concept.difficulty}；掌握度：${{ known: '会', half: '半会', unknown: '不会' }[concept.mastery]}`,
      `- 资源：${concept.resources.map((resource) => `[${resource.title}](${resource.url})`).join('；') || '暂无'}`,
      '',
    ]) : ['尚无概念卡片。', '']),
    '## 十三、Mermaid 知识框图',
    '',
    '```mermaid', buildMermaid(concepts), '```',
    '',
    '---',
    '由「琢玉」在浏览器本地生成。如切如磋，如琢如磨。',
  ]
  return parts.join('\n')
}

export function buildAnkiCsv(concepts: Concept[]): string {
  const rows = [['正面', '背面', '标签'], ...concepts.map((concept) => [
    concept.name,
    [
      `<b>一句话解释</b>：${escapeHtml(concept.summary)}`,
      `<b>为何复现需要</b>：${escapeHtml(concept.whyNeeded)}`,
      `<b>难度</b>：${concept.difficulty}`,
      `<b>掌握度</b>：${{ known: '会', half: '半会', unknown: '不会' }[concept.mastery]}`,
      concept.resources.length ? `<b>资源</b>：<br>${concept.resources.map((resource) => `${escapeHtml(resource.title)}：${escapeHtml(resource.url)}`).join('<br>')}` : '',
    ].filter(Boolean).join('<br>'),
    `琢玉 难度${concept.difficulty} ${{ known: '已掌握', half: '半会', unknown: '未掌握' }[concept.mastery]}`,
  ])]
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export function buildProjectJson(bundle: ProjectBundle): string {
  return JSON.stringify({
    format: 'zhuoyu-project',
    schemaVersion: 4,
    exportedAt: new Date().toISOString(),
    project: bundle.project,
    paper: bundle.paper,
    elements: bundle.elements,
    concepts: bundle.concepts,
    planSteps: bundle.planSteps,
    planVersions: bundle.planVersions,
    notes: bundle.notes,
    metrics: bundle.metrics,
    retrospective: bundle.retrospective,
  }, null, 2)
}

interface ObsidianNote { fileName: string; content: string }

export function buildObsidianNotes(bundle: ProjectBundle): ObsidianNote[] {
  const projectName = safeFileName(bundle.project.title)
  const retroName = `复盘-${projectName}`
  const paperName = bundle.paper ? `论文-${safeFileName(bundle.paper.title)}` : ''
  const elementNames = new Map<number, string>()
  bundle.elements.forEach((element, index) => {
    if (element.id !== undefined) elementNames.set(element.id, `拆解-${String(index + 1).padStart(2, '0')}-${safeFileName(element.label)}`)
  })
  const conceptNames = new Map<number, string>()
  bundle.concepts.forEach((concept, index) => {
    if (concept.id !== undefined) conceptNames.set(concept.id, `概念-${String(index + 1).padStart(2, '0')}-${safeFileName(concept.name)}`)
  })
  const noteNames = new Map<number, string>()
  bundle.notes.forEach((note, index) => {
    if (note.id !== undefined) noteNames.set(note.id, `记录-${String(index + 1).padStart(3, '0')}-${safeFileName(NOTE_KIND_LABEL[note.kind])}`)
  })
  const notes: ObsidianNote[] = [{
    fileName: `${projectName}.md`,
    content: [
      `# ${bundle.project.title}`, '',
      `复现目标：${bundle.project.goal}`, '',
      `- [[${retroName}]]`, paperName ? `- [[${paperName}]]` : '- 尚未导入论文', '',
      '## 论文拆解', '', ...(elementNames.size ? [...elementNames.values()].map((name) => `- [[${name}]]`) : ['- 暂无']), '',
      '## 概念卡片', '', ...(conceptNames.size ? [...conceptNames.values()].map((name) => `- [[${name}]]`) : ['- 暂无']), '',
      '## 记事本', '', ...(noteNames.size ? [...noteNames.values()].map((name) => `- [[${name}]]`) : ['- 暂无']), '',
      '## Mermaid 知识框图', '', '```mermaid', buildMermaid(bundle.concepts), '```', '',
    ].join('\n'),
  }]
  if (bundle.paper && paperName) notes.push({
    fileName: `${paperName}.md`,
    content: [`# ${bundle.paper.title}`, '', `所属项目：[[${projectName}]]`, '', `作者：${bundle.paper.authors.join('、')}`, '', `摘要：${bundle.paper.abstract ?? '暂无'}`, '', bundle.paper.url ?? ''].join('\n'),
  })
  notes.push({
    fileName: `${retroName}.md`,
    content: [`# ${bundle.project.title}｜复盘`, '', `所属项目：[[${projectName}]]`, '', ...RETRO_OBSIDIAN_FIELDS.flatMap(({ key, title }) => [`## ${title}`, '', retrospectiveText(bundle.retrospective)[key] || '待补写。', '']), '## 论文没写的细节（原记录链接）', '', ...(bundle.notes.filter((note) => note.isHiddenDetail).map((note) => `- [[${note.id === undefined ? projectName : noteNames.get(note.id) ?? projectName}]]`) || ['- 暂无'])].join('\n'),
  })
  for (const element of bundle.elements) {
    if (element.id === undefined) continue
    const name = elementNames.get(element.id)!
    notes.push({ fileName: `${name}.md`, content: [`# ${element.label}`, '', `所属项目：[[${projectName}]]${paperName ? ` · [[${paperName}]]` : ''}`, '', `类型：${elementTypeLabel(element.type)}`, '', element.value, '', `页码：${element.page ? `第 ${element.page} 页` : '待补'}`, '', `> ${element.quote?.replace(/\n/g, '\n> ') || '引文待补'}`, ''].join('\n') })
  }
  for (const concept of bundle.concepts) {
    if (concept.id === undefined) continue
    const name = conceptNames.get(concept.id)!
    notes.push({ fileName: `${name}.md`, content: [`# ${concept.name}`, '', `所属项目：[[${projectName}]]`, '', concept.summary, '', `为何复现需要：${concept.whyNeeded}`, '', `难度：${concept.difficulty}；掌握度：${{ known: '会', half: '半会', unknown: '不会' }[concept.mastery]}`, '', '## 前置概念', '', ...(concept.dependsOn.length ? concept.dependsOn.map((id) => `- ${conceptNames.has(id) ? `[[${conceptNames.get(id)}]]` : `概念 #${id}（未导出）`}`) : ['- 无']), '', '## 资源', '', ...(concept.resources.length ? concept.resources.map((resource) => `- [${resource.title}](${resource.url})`) : ['- 暂无']), ''].join('\n') })
  }
  for (const note of bundle.notes) {
    if (note.id === undefined) continue
    const name = noteNames.get(note.id)!
    notes.push({ fileName: `${name}.md`, content: obsidianNoteContent(note, projectName, conceptNames, bundle) })
  }
  return notes
}

const RETRO_OBSIDIAN_FIELDS = [
  { key: 'scope', title: '范围' }, { key: 'method', title: '方法' }, { key: 'results', title: '结果' },
  { key: 'deviations', title: '偏差归因总述' }, { key: 'dataDeviation', title: '数据' },
  { key: 'hyperparameterDeviation', title: '超参' }, { key: 'seedDeviation', title: '随机种子' },
  { key: 'hardwareDeviation', title: '硬件' }, { key: 'difficulties', title: '难点与易点' },
  { key: 'hiddenDetails', title: '论文没写的细节补写' }, { key: 'authorContact', title: '与作者沟通' },
] as const

function obsidianNoteContent(note: NoteEntry, projectName: string, conceptNames: Map<number, string>, bundle: ProjectBundle): string {
  const content = note.conceptIds.reduce((text, id) => {
    const name = conceptNames.get(id)
    return name
      ? text.replace(new RegExp(`\\[[^\\]\\n]*\\]\\(#concept-${id}\\)`, 'g'), `[[${name}]]`)
      : text
  }, note.content)
  const step = bundle.planSteps.find((item) => item.id === note.stepId)
  return [`# ${NOTE_KIND_LABEL[note.kind]}记录 #${note.id ?? ''}`, '', `所属项目：[[${projectName}]]`, '', `时间：${new Date(note.createdAt).toLocaleString('zh-CN')}`, '', `关联步骤：${step?.title ?? '无'}`, '', note.isHiddenDetail ? '> 论文没写的细节' : '', '', content || '（本地截图记录，图片请从 JSON 导出提取）', ''].join('\n')
}

export async function exportObsidianZip(bundle: ProjectBundle): Promise<Blob> {
  const zip = new JSZip()
  for (const note of buildObsidianNotes(bundle)) zip.file(note.fileName, note.content)
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function downloadMarkdown(bundle: ProjectBundle): void {
  downloadBlob(new Blob([buildMarkdown(bundle)], { type: 'text/markdown;charset=utf-8' }), `${safeFileName(bundle.project.title)}-复盘.md`)
}

export function downloadJson(bundle: ProjectBundle): void {
  downloadBlob(new Blob([buildProjectJson(bundle)], { type: 'application/json;charset=utf-8' }), `${safeFileName(bundle.project.title)}.zhuoyu.json`)
}

export function downloadAnki(bundle: ProjectBundle): void {
  downloadBlob(new Blob(['\ufeff', buildAnkiCsv(bundle.concepts)], { type: 'text/csv;charset=utf-8' }), `${safeFileName(bundle.project.title)}-Anki.csv`)
}

export async function downloadObsidian(bundle: ProjectBundle): Promise<void> {
  const blob = await exportObsidianZip(bundle)
  downloadBlob(blob, `${safeFileName(bundle.project.title)}-Obsidian.zip`)
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
