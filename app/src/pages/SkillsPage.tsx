import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import dagre from 'dagre'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { db } from '../db/db'
import type { Concept, Project } from '../db/types'
import { formatDate } from '../lib/format'
import { buildSkillTree, type SkillTree } from '../lib/skills'

const DESIGN = {
  accent: '#b4552f',
  ok: '#4f7044',
  line: '#e6e2d6',
}

const NODE_WIDTH = 240
const NODE_HEIGHT = 112

type SkillFlowData = {
  name: string
  difficulty: Concept['difficulty']
  sourceProjectCount: number
}
type SkillFlowNode = Node<SkillFlowData, 'skill'>

function SkillGraphNode({ data }: NodeProps<SkillFlowNode>) {
  return (
    <article className="skill-graph-node">
      <Handle type="target" position={Position.Left} />
      <h3>{data.name}</h3>
      <div className="skill-graph-node-meta">
        <span>难度 {data.difficulty}</span>
        <span>{data.sourceProjectCount} 个来源项目</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </article>
  )
}

const nodeTypes = { skill: SkillGraphNode }

export default function SkillsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const [projectRows, conceptRows] = await Promise.all([
          db.projects.toArray(),
          db.concepts.toArray(),
        ])
        if (!active) return
        setProjects(projectRows)
        setConcepts(conceptRows)
      } catch {
        if (active) setError('本机数据读取失败，请稍后刷新页面重试。')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const tree = useMemo(() => buildSkillTree(projects, concepts), [projects, concepts])
  const flow = useMemo(() => layoutSkillTree(tree), [tree])
  const timeline = useMemo(() => [...tree.nodes].sort((a, b) => (
    a.firstMasteredAt - b.firstMasteredAt || a.name.localeCompare(b.name, 'zh-CN')
  )), [tree])
  const sourceProjectCount = new Set(
    tree.nodes.flatMap((node) => node.sources.map((source) => source.projectId)),
  ).size

  return (
    <div className="skills-page">
      <Link to="/" className="skills-back-link">← 全部项目</Link>
      <header className="skills-header">
        <p className="skills-kicker">M3 / 个人技能树</p>
        <h1>把掌握过的知识，连成自己的树。</h1>
        <p>跨项目累积真正标为「会」的概念。同名知识只出现一次，每一次掌握都能回到原来的复现现场。</p>
      </header>

      {loading ? (
        <div className="skills-loading" role="status">
          <span className="skills-loading-dot" aria-hidden="true" />
          正在整理你的技能树…
        </div>
      ) : error ? (
        <div className="skills-error" role="alert">
          <h2>暂时无法展开技能树</h2>
          <p>{error}</p>
          <Link to="/" className="skills-home-link">回到首页</Link>
        </div>
      ) : (
        <>
          <section className="skills-stats" aria-label="技能树统计">
            <div className="skills-stat">
              <strong>{tree.nodes.length}</strong>
              <span>总掌握数</span>
            </div>
            <div className="skills-stat">
              <strong>{sourceProjectCount}</strong>
              <span>来源项目数</span>
            </div>
            <div className="skills-stat">
              <strong>{tree.edges.length}</strong>
              <span>依赖数</span>
            </div>
          </section>

          {tree.nodes.length === 0 ? (
            <section className="skills-empty">
              <span className="skills-empty-mark" aria-hidden="true">玉</span>
              <h2>第一枚知识叶，等你点亮</h2>
              <p>在项目的知识框图中把概念标为「会」，它就会出现在这里，并保留来源与掌握时间。</p>
              <Link to="/" className="skills-home-link">回到首页，开始复现</Link>
            </section>
          ) : (
            <>
              <section className="skills-graph-section" aria-labelledby="skills-graph-title">
                <div className="skills-section-heading">
                  <div>
                    <p className="skills-kicker">知识之间，彼此支撑</p>
                    <h2 id="skills-graph-title">已掌握知识图</h2>
                  </div>
                  <p>箭头由前置指向后续 · 拖动空白处平移 · 滚轮缩放</p>
                </div>
                <div className="skills-graph" aria-label="跨项目已掌握概念依赖图">
                  <ReactFlow<SkillFlowNode, Edge>
                    nodes={flow.nodes}
                    edges={flow.edges}
                    nodeTypes={nodeTypes}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    fitView
                    fitViewOptions={{ padding: 0.18 }}
                    minZoom={0.2}
                    maxZoom={1.8}
                  >
                    <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={DESIGN.line} />
                    <Controls showInteractive={false} />
                    <MiniMap pannable zoomable nodeColor={DESIGN.ok} />
                  </ReactFlow>
                </div>
              </section>

              <section className="skills-timeline-section" aria-labelledby="skills-timeline-title">
                <div className="skills-section-heading">
                  <div>
                    <p className="skills-kicker">日拱一卒，功不唐捐</p>
                    <h2 id="skills-timeline-title">成长时间线</h2>
                  </div>
                  <p>按首次掌握时间排列，点击项目名回到对应知识框图。</p>
                </div>
                <ol className="skills-timeline">
                  {timeline.map((node) => (
                    <li key={node.id} className="skills-timeline-item">
                      <time className="skills-timeline-date" dateTime={new Date(node.firstMasteredAt).toISOString()}>
                        {formatDate(node.firstMasteredAt)}
                      </time>
                      <article className="skill-growth-card">
                        <header className="skill-growth-card-header">
                          <h3>{node.name}</h3>
                          <span>难度 {node.difficulty}</span>
                        </header>
                        <p className="skill-growth-summary">{node.summary || '暂无概念解释。'}</p>
                        <ul className="skill-source-list" aria-label={`${node.name}的来源项目`}>
                          {node.sources.map((source) => (
                            <li key={`${source.projectId}:${source.conceptId}`} className="skill-source-item">
                              <Link to={`/project/${source.projectId}?tab=map`}>
                                {source.projectTitle}
                                <span aria-hidden="true"> →</span>
                              </Link>
                              <time dateTime={new Date(source.masteredAt).toISOString()}>
                                掌握于 {formatDate(source.masteredAt)}
                              </time>
                            </li>
                          ))}
                        </ul>
                      </article>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}

function layoutSkillTree(tree: SkillTree): { nodes: SkillFlowNode[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'LR', nodesep: 48, ranksep: 100, marginx: 24, marginy: 24 })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const skill of tree.nodes) {
    graph.setNode(skill.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of tree.edges) graph.setEdge(edge.source, edge.target)
  dagre.layout(graph)

  const nodes = tree.nodes.map((skill) => {
    const position = graph.node(skill.id)
    return {
      id: skill.id,
      type: 'skill' as const,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
      data: {
        name: skill.name,
        difficulty: skill.difficulty,
        sourceProjectCount: new Set(skill.sources.map((source) => source.projectId)).size,
      },
    }
  })
  const edges = tree.edges.map((edge) => ({
    ...edge,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: DESIGN.accent,
      width: 18,
      height: 18,
    },
    style: { stroke: DESIGN.accent, strokeWidth: 1.5 },
  }))

  return { nodes, edges }
}
