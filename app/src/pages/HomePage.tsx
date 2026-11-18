import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NewProjectDialog from '../components/NewProjectDialog'
import { db } from '../db/db'
import { levelShort, type Paper, type Project } from '../db/types'
import { formatDay } from '../lib/format'

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [projectRows, paperRows] = await Promise.all([
          db.projects.orderBy('updatedAt').reverse().toArray(),
          db.papers.orderBy('createdAt').reverse().toArray(),
        ])
        if (!active) return
        setProjects(projectRows)
        setPapers(paperRows)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

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
            <a className="btn btn-ghost" href="#projects">
              浏览项目
            </a>
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
          <div className="project-grid" aria-busy="true">
            {[0, 1, 2].map((index) => (
              <div key={index} className="project-card skeleton-card">
                <span className="skeleton-line short" />
                <span className="skeleton-line title" />
                <span className="skeleton-line" />
                <span className="skeleton-line" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-glyph" aria-hidden="true">
              玉
            </div>
            <h3>还没有项目</h3>
            <p>从一篇你想吃透的论文开始。先写下复现目标，其余慢慢雕。</p>
            <button className="btn btn-primary" onClick={() => setDialogOpen(true)}>
              新建第一个项目
            </button>
          </div>
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
