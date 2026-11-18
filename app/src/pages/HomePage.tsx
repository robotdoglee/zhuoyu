import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NewProjectDialog from '../components/NewProjectDialog'
import AsyncState from '../components/AsyncState'
import { db } from '../db/db'
import { levelShort, type Paper, type Project } from '../db/types'
import { formatDay } from '../lib/format'
import { loadExampleProject } from '../lib/example'
import { loadResnetExampleProject } from '../lib/resnetExample'

type ExampleKind = 'attention' | 'resnet'

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [exampleBusy, setExampleBusy] = useState<ExampleKind | null>(null)
  const [exampleError, setExampleError] = useState('')
  const [failedExample, setFailedExample] = useState<{ kind: ExampleKind; reset: boolean } | null>(null)
  const navigate = useNavigate()

  async function openExample(kind: ExampleKind, reset = false) {
    if (reset && !window.confirm(`确定重置${kind === 'attention' ? ' Attention ' : ' ResNet '}示例吗？该示例中的修改会被内置数据替换，其他项目不受影响。`)) {
      return
    }
    setExampleBusy(kind)
    setExampleError('')
    setFailedExample(null)
    try {
      const loader = kind === 'attention' ? loadExampleProject : loadResnetExampleProject
      const { projectId } = await loader({ reset })
      navigate(`/project/${projectId}`)
    } catch (error) {
      setExampleError(error instanceof Error ? error.message : '示例载入失败，请重试。')
      setFailedExample({ kind, reset })
    } finally {
      setExampleBusy(null)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [projectRows, paperRows] = await Promise.all([
        db.projects.orderBy('updatedAt').reverse().toArray(),
        db.papers.orderBy('createdAt').reverse().toArray(),
      ])
      setProjects(projectRows)
      setPapers(paperRows)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '项目读取失败，请重试。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const paperByProject = useMemo(() => {
    const map = new Map<number, Paper>()
    for (const paper of papers) {
      if (!map.has(paper.projectId)) map.set(paper.projectId, paper)
    }
    return map
  }, [papers])

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">问渠姊妹平台 · 本地优先</p>
          <h1>
            把一篇论文，
            <br />
            <span className="accent-mark">亲手做一遍。</span>
          </h1>
          <p className="lede">
            琢玉不替你读论文。它帮你拆开方法、补齐背景、排好步骤，
            然后陪你把纸上的结果跑成自己的曲线。
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => setDialogOpen(true)}>
              新建复现项目
            </button>
            <a className="btn btn-ghost" href="#examples">一键载入示例</a>
            <a className="btn btn-quiet" href="#projects">浏览项目</a>
          </div>
        </div>

        <aside className="hero-card" aria-label="琢玉简介">
          <span className="seal" aria-hidden="true">
            琢
          </span>
          <blockquote>如切如磋，如琢如磨。</blockquote>
          <p className="quote-source">《诗经 · 卫风 · 淇奥》</p>
          <div className="hero-stats">
            <div>
              <strong>{projects.length}</strong>
              <span>个复现项目</span>
            </div>
            <div>
              <strong>{papers.length}</strong>
              <span>篇论文入库</span>
            </div>
          </div>
        </aside>
      </section>

      <section id="examples" className="examples-section" aria-labelledby="examples-title">
        <div className="section-title-row">
          <div>
            <p className="kicker">离线示例</p>
            <h2 id="examples-title">从一份完整复现档案开始</h2>
          </div>
          <span className="section-sub">内置数据 · 不联网 · 随时重置</span>
        </div>
        {exampleError && (
          <div className="notice error" role="alert">
            <span>{exampleError}</span>
            {failedExample && (
              <button className="btn btn-ghost btn-sm" onClick={() => void openExample(failedExample.kind, failedExample.reset)}>
                重试
              </button>
            )}
          </div>
        )}
        <div className="example-grid">
          <article className="example-card">
            <div className="example-card-top">
              <span className="chip chip-L2">L2 · 复现主表结果</span>
              <span className="project-date">NeurIPS 2017</span>
            </div>
            <h3>Attention Is All You Need</h3>
            <p>从 WMT14 英德翻译拆解 Transformer，练习多头注意力、位置编码、训练计划与 BLEU 偏差归因。</p>
            <ul className="example-contents" aria-label="Attention 示例内容">
              <li>11 页关键文本与九类拆解</li><li>知识 DAG、6 步计划、5 条笔记</li><li>指标对照与复盘初稿</li>
            </ul>
            <div className="example-actions">
              <button className="btn btn-primary" disabled={exampleBusy !== null} onClick={() => void openExample('attention')}>
                {exampleBusy === 'attention' ? '正在载入…' : '载入 Attention 示例'}
              </button>
              <button className="btn btn-quiet" disabled={exampleBusy !== null} onClick={() => void openExample('attention', true)}>
                重置示例
              </button>
            </div>
          </article>
          <article className="example-card">
            <div className="example-card-top">
              <span className="chip chip-L2">L1 + L2 · 从跑通到主表</span>
              <span className="project-date">CVPR 2016</span>
            </div>
            <h3>ResNet on CIFAR-10</h3>
            <p>围绕 Deep Residual Learning 复现 ResNet-20/56/110，核对恒等 shortcut、64k 迭代计划与测试错误率。</p>
            <ul className="example-contents" aria-label="ResNet 示例内容">
              <li>论文元数据、12 页关键文本与九类拆解</li><li>知识 DAG、L1/L2 共 9 步、6 条笔记</li><li>4 项指标与完整复盘</li>
            </ul>
            <div className="example-actions">
              <button className="btn btn-primary" disabled={exampleBusy !== null} onClick={() => void openExample('resnet')}>
                {exampleBusy === 'resnet' ? '正在载入…' : '载入 ResNet 示例'}
              </button>
              <button className="btn btn-quiet" disabled={exampleBusy !== null} onClick={() => void openExample('resnet', true)}>
                重置示例
              </button>
            </div>
          </article>
        </div>
      </section>

      <section id="projects" className="projects-section">
        <div className="section-title-row">
          <div>
            <p className="kicker">工作台</p>
            <h2>我的项目</h2>
          </div>
          <span className="section-sub">
            {loading ? '正在读取本机数据…' : `共 ${projects.length} 个项目`}
          </span>
        </div>

        {loading ? (
          <AsyncState status="loading" title="正在读取本机项目…" description="论文与复现数据只保存在当前浏览器。" />
        ) : loadError ? (
          <AsyncState status="error" title="项目列表没有读取成功" description={loadError} action={{ label: '重新读取', onClick: () => void load() }} />
        ) : projects.length === 0 ? (
          <AsyncState
            status="empty"
            title="还没有项目"
            description="从一篇你想吃透的论文开始，或先载入上方完整示例。"
            action={{ label: '新建第一个项目', onClick: () => setDialogOpen(true) }}
          />
        ) : (
          <div className="project-grid">
            {projects.map((project) => {
              const paper = paperByProject.get(project.id ?? -1)
              return (
                <Link key={project.id} className="project-card" to={`/project/${project.id}`}>
                  <div className="project-card-top">
                    <span className={`chip chip-${project.level}`}>
                      {project.level} · {levelShort(project.level)}
                    </span>
                    <span className="project-date">{formatDay(project.updatedAt)}</span>
                  </div>
                  <h3>{project.title}</h3>
                  <p className="project-goal clamp-2">{project.goal}</p>
                  <div className="project-meta">
                    <span>设备 · {project.device || '未填写'}</span>
                    <span>
                      论文 · {paper ? (paper.pageCount > 0 ? `${paper.pageCount} 页` : '仅元数据') : '未导入'}
                    </span>
                  </div>
                  <div className="project-card-foot">
                    <span className="project-paper">{paper?.title ?? '尚未导入论文'}</span>
                    <span className="project-arrow" aria-hidden="true">
                      →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {dialogOpen && (
        <NewProjectDialog
          onClose={() => setDialogOpen(false)}
          onCreated={(projectId) => {
            setDialogOpen(false)
            navigate(`/project/${projectId}`)
          }}
        />
      )}
    </>
  )
}
