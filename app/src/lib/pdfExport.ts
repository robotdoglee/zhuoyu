import { elementTypeLabel } from './elements'
import { buildMermaid, safeFileName } from './exporters'
import { compareMetric, formatMetricNumber, formatSigned } from './metrics'
import { retrospectiveText } from './retrospective'
import type { ProjectBundle } from './projectData'

export async function downloadPdfReport(bundle: ProjectBundle): Promise<void> {
  const [{ default: html2canvas }, { default: mermaid }, { jsPDF }] = await Promise.all([
    import('html2canvas'), import('mermaid'), import('jspdf'),
  ])
  const root = document.createElement('div')
  root.className = 'zhuoyu-pdf-source'
  root.setAttribute('aria-hidden', 'true')
  root.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fffefb;z-index:-1;'
  const mermaidId = `zhuoyu-pdf-graph-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'PingFang SC, Microsoft YaHei, Noto Sans CJK SC, sans-serif',
    themeVariables: {
      background: '#fffefb', primaryColor: '#f2efe6', primaryBorderColor: '#b4552f',
      primaryTextColor: '#1f1e1d', lineColor: '#8a806d', fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
    },
  })
  try {
    const { svg } = await mermaid.render(mermaidId, buildMermaid(bundle.concepts))
    root.innerHTML = buildReportHtml(bundle, svg)
    document.body.appendChild(root)
    const graph = root.querySelector<SVGElement>('.pdf-mermaid svg')
    if (graph) {
      graph.style.width = '100%'
      graph.style.height = 'auto'
      graph.style.maxHeight = '660px'
    }
    await document.fonts.ready
    const canvas = await html2canvas(root, {
      backgroundColor: '#fffefb', scale: Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)),
      logging: false, useCORS: false, imageTimeout: 0, width: 794, windowWidth: 1200,
    })
    if (!canvas.width || !canvas.height) throw new Error('PDF 画布为空，请重试。')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    const pageHeightPx = canvas.width * 297 / 210
    const pageCount = Math.ceil(canvas.height / pageHeightPx)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = Math.ceil(pageHeightPx)
    const context = pageCanvas.getContext('2d')
    if (!context) throw new Error('浏览器无法创建 PDF 画布。')
    for (let page = 0; page < pageCount; page += 1) {
      context.fillStyle = '#fffefb'
      context.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      const sourceY = Math.floor(page * pageHeightPx)
      const sourceHeight = Math.min(Math.ceil(pageHeightPx), canvas.height - sourceY)
      context.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight)
      if (page > 0) pdf.addPage()
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
      pdf.setFontSize(8)
      pdf.setTextColor(98, 95, 87)
      pdf.text(`${page + 1} / ${pageCount}`, 190, 291, { align: 'right' })
    }
    pdf.save(`${safeFileName(bundle.project.title)}-复盘报告.pdf`)
  } finally {
    root.remove()
    document.getElementById(mermaidId)?.remove()
  }
}

function buildReportHtml(bundle: ProjectBundle, mermaidSvg: string): string {
  const retro = retrospectiveText(bundle.retrospective)
  const { project, paper } = bundle
  const retroSections = [
    ['一、范围', retro.scope], ['二、方法', retro.method], ['三、结果', retro.results],
    ['四、偏差归因总述', retro.deviations], ['数据', retro.dataDeviation], ['超参', retro.hyperparameterDeviation],
    ['随机种子', retro.seedDeviation], ['硬件', retro.hardwareDeviation], ['五、难点与易点', retro.difficulties],
    ['六、论文没写的细节', retro.hiddenDetails], ['七、与作者沟通', retro.authorContact],
  ]
  return `
    <style>
      .zhuoyu-pdf-source{color:#1f1e1d;font-family:-apple-system,"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif;font-size:13px;line-height:1.75;padding:44px 48px 56px;box-sizing:border-box}
      .zhuoyu-pdf-source *{box-sizing:border-box}.zhuoyu-pdf-source h1,.zhuoyu-pdf-source h2,.zhuoyu-pdf-source h3{font-family:"LXGW WenKai Screen","Kaiti SC","KaiTi",serif;font-weight:400;margin:0}
      .zhuoyu-pdf-source h1{font-size:30px;line-height:1.4}.zhuoyu-pdf-source h2{font-size:21px;margin:30px 0 12px;padding-bottom:7px;border-bottom:1px solid #e6e2d6;color:#3d3929}
      .zhuoyu-pdf-source h3{font-size:16px;margin:20px 0 8px}.zhuoyu-pdf-source p{margin:6px 0}.pdf-kicker{color:#b4552f;font-size:10px;letter-spacing:2px;margin-bottom:9px}
      .pdf-subtitle{color:#625f57;margin-top:8px}.pdf-privacy{margin-top:18px;padding:9px 12px;background:#f2efe6;border-radius:8px;color:#625f57;font-size:11px}
      .pdf-text{white-space:normal;overflow-wrap:anywhere}.pdf-text br{display:block}.pdf-section{break-inside:auto}.pdf-highlight{background:#f7ebe4;border-left:4px solid #b4552f;padding:12px 15px;border-radius:8px}
      .pdf-table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}.pdf-table th,.pdf-table td{border:1px solid #e6e2d6;padding:7px 8px;text-align:left;vertical-align:top}.pdf-table th{background:#f2efe6}
      .pdf-element{break-inside:avoid;margin:12px 0;padding:12px 14px;border:1px solid #e6e2d6;border-radius:9px}.pdf-element p{margin:5px 0}.pdf-quote{color:#625f57;background:#faf9f5;padding:8px 10px;border-left:3px solid #b4552f;white-space:pre-wrap;overflow-wrap:anywhere}
      .pdf-mermaid{margin-top:14px;padding:12px;border:1px solid #e6e2d6;border-radius:10px;background:#fffefb;text-align:center}.pdf-mermaid svg{max-width:100%}.pdf-footer{margin-top:32px;padding-top:14px;border-top:1px solid #e6e2d6;color:#625f57;text-align:center;font-size:11px}
    </style>
    <p class="pdf-kicker">琢玉 · 论文复现复盘报告</p>
    <h1>${escapeHtml(project.title)}</h1>
    <p class="pdf-subtitle">${escapeHtml(project.goal)}</p>
    <p class="pdf-privacy">本报告在浏览器本地生成，未上传项目、论文、笔记、指标或图片。导出时间：${escapeHtml(new Date().toLocaleString('zh-CN'))}</p>
    <h2>项目与论文</h2>
    <p><b>复现级别：</b>${project.level}　<b>设备：</b>${escapeHtml(project.device || '未填写')}</p>
    <p><b>论文：</b>${escapeHtml(paper?.title ?? '尚未导入')}</p>
    ${paper ? `<p><b>作者：</b>${escapeHtml(paper.authors.join('、'))}</p><p><b>arXiv：</b>${escapeHtml(paper.arxivId ?? '—')}　<b>DOI：</b>${escapeHtml(paper.doi ?? '—')}　<b>页数：</b>${paper.pageCount || '—'}</p>` : ''}
    ${retroSections.map(([title, text], index) => `<section class="pdf-section ${title === '六、论文没写的细节' ? 'pdf-highlight' : ''}"><h2>${index > 3 && index < 8 ? `四、偏差归因 · ${title}` : title}</h2><div class="pdf-text">${textHtml(text || '待补写。')}</div></section>`).join('')}
    <h2>指标对照原表</h2>
    <table class="pdf-table"><thead><tr><th>指标</th><th>原文</th><th>我的</th><th>绝对差</th><th>偏差</th></tr></thead><tbody>${bundle.metrics.length ? bundle.metrics.map((metric) => {
      const comparison = compareMetric(metric)
      return `<tr><td>${escapeHtml(metric.name)}</td><td>${formatMetricNumber(metric.paperValue)} ${escapeHtml(metric.unit ?? '')}</td><td>${formatMetricNumber(metric.ours)} ${escapeHtml(metric.unit ?? '')}</td><td>${formatMetricNumber(comparison.absoluteDifference)}</td><td>${comparison.deviationPercent === undefined && comparison.difference !== undefined ? '原文为 0' : formatSigned(comparison.deviationPercent, '%')}</td></tr>`
    }).join('') : '<tr><td colspan="5">暂无指标</td></tr>'}</tbody></table>
    <h2>论文拆解 · 页码与引文</h2>
    ${bundle.elements.length ? bundle.elements.map((element) => `<article class="pdf-element"><h3>[${elementTypeLabel(element.type)}] ${escapeHtml(element.label)}</h3><p>${textHtml(element.value)}</p><p><b>页码：</b>${element.page ? `第 ${element.page} 页` : '待补'}　<b>校验：</b>${element.verified === false ? '待核实' : element.verified ? '引文已匹配' : '未校验'}</p><div class="pdf-quote">${escapeHtml(element.quote || '引文待补')}</div></article>`).join('') : '<p>尚无拆解项。</p>'}
    <h2>Mermaid 知识框图</h2>
    <p>绿色为「会」，棕色为「半会」，其余为「不会」；箭头表示前置依赖。</p>
    <div class="pdf-mermaid">${mermaidSvg}</div>
    <details open><summary>Mermaid 源码</summary><pre>${escapeHtml(buildMermaid(bundle.concepts))}</pre></details>
    <p class="pdf-footer">如切如磋，如琢如磨。 · 琢玉本地报告</p>
  `
}

function textHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>')
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}
