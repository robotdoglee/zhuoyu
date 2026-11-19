import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PaperSection from '../components/PaperSection'
import BreakdownPanel from '../components/BreakdownPanel'
import KnowledgeMap from '../components/KnowledgeMap'
import PlanPanel from '../components/PlanPanel'
import NotebookPanel from '../components/NotebookPanel'
import MetricTable from '../components/MetricTable'
import RetrospectivePanel from '../components/RetrospectivePanel'
import AsyncState from '../components/AsyncState'
import { db } from '../db/db'
import { levelName, type Paper, type Project } from '../db/types'
import { formatDate } from '../lib/format'

const TABS = [
  {
    id: 'breakdown',
    label: '论文拆解',
    index: '01',
    milestone: 'M1',
    title: '把论文拆成可执行的零件',
    description:
      '任务、数据集、模型结构、训练流程、超参、指标与原文数值、算力、代码仓库，逐项拆开。',
    points: ['每条拆解项带原文引文与页码', '前端字符串校验，对不上标「待核实」', '手工编辑与结构化抽取并行'],
  },
  {
    id: 'map',
    label: '知识框图',
    index: '02',
    milestone: 'M1',
    title: '先看清知识的依赖关系',
    description:
      '概念卡片连成依赖 DAG，标注难度与掌握度，自动排出最短学习路径。',
    points: ['一句话解释 + 为何复现需要', '资源按一手资料、教材、博客分层', '已掌握的概念在路径中折叠'],
  },
  {
    id: 'plan',
    label: '复现计划',
    index: '03',
    milestone: 'M2',
    title: '把「做一遍」拆成今天能做的事',
    description:
      '按复现级别生成里程碑、步骤、估时与检查点，卡住时可以重新规划。',
    points: ['计划与知识卡片的前置关系联动', '检查点可直接在记事本里勾掉', '保留重新规划前的版本'],
  },
  {
    id: 'notebook',
    label: '记事本',
    index: '04',
    milestone: 'M2',
    title: '命令、报错与灵光一现，都留下来',
    description:
      '按步骤记录命令、代码、结果、报错、想法与截图，指标实时对照论文原文。',
    points: ['Markdown 编辑，可 @卡片、@步骤', '指标表自动计算与原文的偏差百分比', '粘贴日志，抽取关键报错并记入'],
  },
  {
    id: 'retro',
    label: '复盘',
    index: '05',
    milestone: 'M3',
    title: '把做过的事变成可复用的知识',
    description:
      '参照 ML Reproducibility Challenge 模板自动汇总，沉淀「论文没写的细节」。',
    points: ['范围、方法、结果与偏差归因', '隐藏超参、预处理等最有价值的发现', '导出 Markdown / Obsidian / Anki / PDF'],
  },
] as const

type TabId = (typeof TABS)[number]['id']

type PageStatus = 'loading' | 'ready' | 'missing' | 'error'

export default function ProjectPage() {
  const { projectId } = useParams()
  const [searchParams] = useSearchParams()
  const numericId = Number(projectId)
  const requestedTab = searchParams.get('tab')

  const [status, setStatus] = useState<PageStatus>('loading')
  const [loadError, setLoadError] = useState('')
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [paper, setPaper] = useState<Paper | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<TabId>(() => TABS.some((tab) => tab.id === requestedTab) ? requestedTab as TabId : 'breakdown')
  const [sourceRequest, setSourceRequest] = useState<{ page: number; quote?: string; nonce: number }>()
  const [mapFocus, setMapFocus] = useState<{ conceptId?: number; nonce: number }>()
  const [planFocus, setPlanFocus] = useState<{ conceptId?: number; nonce: number }>()

  const load = useCallback(async () => {
    setStatus('loading')
    setLoadError('')
    try {
      if (!Number.isInteger(numericId)) {
        setStatus('missing')
        return
      }
      const projectRow = await db.projects.get(numericId)
      if (!projectRow) {
        setProject(null)
        setPaper(undefined)
        setStatus('missing')
        return
      }
      const paperRows = await db.papers.where('projectId').equals(numericId).toArray()
      paperRows.sort((a, b) => b.createdAt - a.createdAt)
      setProject(projectRow)
      setPaper(paperRows[0])
      setStatus('ready')
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '项目读取失败，请重试。')
      setStatus('error')
    }
  }, [numericId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  function showSource(page: number, quote?: string) {
    setSourceRequest({ page, quote, nonce: Date.now() })
    window.requestAnimationFrame(() => {
      document.getElementById('paper-source')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function openMapConcept(conceptId: number) {
    setMapFocus({ conceptId, nonce: Date.now() })
    setActiveTab('map')
    window.requestAnimationFrame(() => {
      document.getElementById('project-panel-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function openPlanStep(conceptId?: number) {
    setPlanFocus({ conceptId, nonce: Date.now() })
    setActiveTab('plan')
    window.requestAnimationFrame(() => {
      document.getElementById('project-panel-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const next = TABS[(index + direction + TABS.length) % TABS.length]
    setActiveTab(next.id)
    document.getElementById(`project-tab-${next.id}`)?.focus()
  }

  if (status === 'loading') {
    return <AsyncState status="loading" title="正在打开项目…" description="正在读取本机项目与论文资料。" />
  }

  if (status === 'error') {
    return <AsyncState status="error" title="项目没有读取成功" description={loadError} action={{ label: '重新读取', onClick: () => void load() }} />
  }

  if (status === 'missing' || !project) {
    return (
      <AsyncState
        status="empty"
        title="没有找到这个项目"
        description="它可能已被删除，或者链接里的编号不正确。"
        action={{ label: '回到首页', onClick: () => navigate('/') }}
      />
    )
  }

  const active = TABS.find((tab) => tab.id === activeTab) ?? TABS[0]

  return (
    <div className="project-page">
      <Link to="/" className="back-link">
        ← 全部项目
      </Link>

      <header className="project-head">
        <div className="project-head-main">
          <div className="project-head-meta">
            <span className={`chip chip-${project.level}`}>{levelName(project.level)}</span>
            <span>创建于 {formatDate(project.createdAt)}</span>
          </div>
          <h1>{project.title}</h1>
          <p className="project-goal">{project.goal}</p>
          <div className="project-facts-inline">
            <span>设备与算力</span>
            <strong>{project.device || '未填写'}</strong>
          </div>
        </div>
      </header>

      <PaperSection
        projectId={project.id ?? numericId}
        paper={paper}
        sourceRequest={sourceRequest}
        onChanged={() => void load()}
      />

      <div className="tabs" role="tablist" aria-label="项目工作区">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            id={`project-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={activeTab === tab.id}
            aria-controls={`project-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            <span className="tab-index">{tab.index}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <section
        key={active.id}
        id={`project-panel-${active.id}`}
        className="tab-panel"
        role="tabpanel"
        aria-labelledby={`project-tab-${active.id}`}
      >
        {activeTab === 'breakdown' ? (
          <BreakdownPanel
            projectId={project.id ?? numericId}
            paper={paper}
            onShowSource={showSource}
            onOpenConcept={openMapConcept}
            onOpenPlan={openPlanStep}
          />
        ) : activeTab === 'map' ? (
          <KnowledgeMap
            projectId={project.id ?? numericId}
            focusConceptId={mapFocus?.conceptId}
            focusNonce={mapFocus?.nonce}
          />
        ) : activeTab === 'plan' ? (
          <PlanPanel
            project={project}
            focusConceptId={planFocus?.conceptId}
            focusNonce={planFocus?.nonce}
            onOpenNotebook={() => setActiveTab('notebook')}
          />
        ) : activeTab === 'notebook' ? (
          <>
            <NotebookPanel projectId={project.id ?? numericId} onOpenPlan={() => setActiveTab('plan')} />
            <MetricTable projectId={project.id ?? numericId} />
          </>
        ) : (
          <RetrospectivePanel projectId={project.id ?? numericId} />
        )}
      </section>
    </div>
  )
}
