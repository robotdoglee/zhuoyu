import { useCallback, useEffect, useMemo, useState } from 'react'
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
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { db } from '../db/db'
import type { Concept, Mastery } from '../db/types'
import { buildLearningPath, findCycleMembers, wouldCreateCycle } from '../lib/graph'
import ConceptDialog from './ConceptDialog'
import { MASTERY_LABEL } from '../lib/labels'
import AsyncState from './AsyncState'

type ConceptNodeData = {
  concept: Concept
  onOpen: (concept: Concept) => void
  onMastery: (concept: Concept, mastery: Mastery) => void
  onDelete: (concept: Concept) => void
}
type ConceptFlowNode = Node<ConceptNodeData, 'concept'>

const NODE_WIDTH = 280
const NODE_HEIGHT = 220

function ConceptNode({ data }: NodeProps<ConceptFlowNode>) {
  const { concept, onOpen, onMastery, onDelete } = data
  return (
    <article className={`concept-node mastery-${concept.mastery}`}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <header>
        <span className="difficulty-badge">难度 {concept.difficulty}</span>
        <button className="node-delete nodrag" aria-label={`删除概念 ${concept.name}`} onClick={() => onDelete(concept)}>×</button>
      </header>
      <button className="concept-open nodrag" onClick={() => onOpen(concept)}>
        <h3>{concept.name}</h3>
        <p>{concept.summary}</p>
        <span><b>复现为何需要</b>{concept.whyNeeded}</span>
      </button>
      <div className="concept-node-footer">
        <div className="mastery-switch nodrag" aria-label={`${concept.name}掌握度`}>
          {(['known', 'half', 'unknown'] as Mastery[]).map((value) => (
            <button
              key={value}
              className={concept.mastery === value ? 'active' : ''}
              aria-pressed={concept.mastery === value}
              onClick={() => onMastery(concept, value)}
            >{MASTERY_LABEL[value]}</button>
          ))}
        </div>
        <button className="resource-count nodrag" onClick={() => onOpen(concept)}>{concept.resources.length} 条资源 · 详情</button>
      </div>
    </article>
  )
}

const nodeTypes = { concept: ConceptNode }

interface KnowledgeMapProps { projectId: number }

export default function KnowledgeMap(props: KnowledgeMapProps) {
  return <ReactFlowProvider><KnowledgeMapInner {...props} /></ReactFlowProvider>
}

function KnowledgeMapInner({ projectId }: KnowledgeMapProps) {
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [nodes, setNodes] = useState<ConceptFlowNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [editing, setEditing] = useState<Concept | 'new' | null>(null)
  const [error, setError] = useState('')
  const { fitView } = useReactFlow()

  // React Flow 只维护受控 UI 状态；频繁的选择、拖拽变化不触碰 IndexedDB。
  const onNodesChange = useCallback<OnNodesChange<ConceptFlowNode>>((changes) => {
    setNodes((current) => changes.applyTo(current))
  }, [])
  const onEdgesChange = useCallback<OnEdgesChange<Edge>>((changes) => {
    setEdges((current) => changes.applyTo(current))
  }, [])
  const selectedEdges = useMemo(() => edges.filter((edge) => edge.selected), [edges])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const rows = await db.concepts.where('projectId').equals(projectId).toArray()
      setConcepts(rows.sort((a, b) => a.createdAt - b.createdAt))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '知识框图读取失败，请重试。')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const openConcept = useCallback((concept: Concept) => setEditing(concept), [])
  const changeMastery = useCallback(async (concept: Concept, mastery: Mastery) => {
    if (concept.id === undefined || concept.mastery === mastery) return
    const masteryUpdatedAt = Date.now()
    await db.concepts.update(concept.id, { mastery, masteryUpdatedAt })
    setConcepts((current) => current.map((item) => item.id === concept.id ? { ...item, mastery, masteryUpdatedAt } : item))
  }, [])
  const deleteConcept = useCallback(async (concept: Concept) => {
    if (concept.id === undefined || !window.confirm(`删除概念「${concept.name}」？相关依赖边会同步清理。`)) return
    const id = concept.id
    await db.transaction('rw', db.concepts, async () => {
      await db.concepts.delete(id)
      const dependents = await db.concepts.where('projectId').equals(projectId).toArray()
      for (const dependent of dependents) {
        if (dependent.id !== undefined && dependent.dependsOn.includes(id)) {
          await db.concepts.update(dependent.id, { dependsOn: dependent.dependsOn.filter((item) => item !== id) })
        }
      }
    })
    setConcepts((current) => current
      .filter((item) => item.id !== id)
      .map((item) => ({ ...item, dependsOn: item.dependsOn.filter((dependency) => dependency !== id) })))
  }, [projectId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const layout = computeLayout(concepts)
      setNodes((current) => {
        const previous = new Map(current.map((node) => [node.id, node]))
        return concepts.flatMap((concept) => {
          if (concept.id === undefined) return []
          const id = String(concept.id)
          const existing = previous.get(id)
          return [{
            ...existing,
            id,
            type: 'concept' as const,
            position: existing?.position ?? concept.position ?? layout.get(id) ?? { x: 0, y: 0 },
            deletable: false,
            data: { concept, onOpen: openConcept, onMastery: changeMastery, onDelete: deleteConcept },
          }]
        })
      })
      setEdges((current) => {
        const selected = new Set(current.filter((edge) => edge.selected).map((edge) => edge.id))
        return makeEdges(concepts).map((edge) => ({ ...edge, selected: selected.has(edge.id) }))
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [concepts, deleteConcept, openConcept, changeMastery])

  const learningPath = useMemo(() => buildLearningPath(concepts), [concepts])
  const cycleMembers = useMemo(() => findCycleMembers(concepts), [concepts])

  async function connect(connection: Connection) {
    const source = Number(connection.source)
    const target = Number(connection.target)
    if (!Number.isInteger(source) || !Number.isInteger(target)) return
    const targetConcept = concepts.find((concept) => concept.id === target)
    if (!targetConcept || targetConcept.dependsOn.includes(source)) return
    if (wouldCreateCycle(concepts, source, target)) {
      setError('这条边会形成循环依赖，未添加。请换一个连接方向。')
      return
    }
    setError('')
    await db.concepts.update(target, { dependsOn: [...targetConcept.dependsOn, source] })
    setConcepts((current) => current.map((concept) => concept.id === target
      ? { ...concept, dependsOn: [...concept.dependsOn, source] }
      : concept))
  }

  async function removeEdges(removed: Edge[]) {
    const byTarget = new Map<number, Set<number>>()
    for (const edge of removed) {
      const target = Number(edge.target)
      const source = Number(edge.source)
      byTarget.set(target, new Set([...(byTarget.get(target) ?? []), source]))
    }
    await db.transaction('rw', db.concepts, async () => {
      for (const [target, sources] of byTarget) {
        const concept = concepts.find((item) => item.id === target)
        if (concept) await db.concepts.update(target, { dependsOn: concept.dependsOn.filter((id) => !sources.has(id)) })
      }
    })
    setConcepts((current) => current.map((concept) => {
      const sources = concept.id === undefined ? undefined : byTarget.get(concept.id)
      return sources ? { ...concept, dependsOn: concept.dependsOn.filter((id) => !sources.has(id)) } : concept
    }))
  }

  async function saveConcept(concept: Concept) {
    if (concept.id === undefined) {
      const temporaryId = -Date.now()
      const position = concept.position ?? computeLayout([
        ...concepts,
        { ...concept, id: temporaryId },
      ]).get(String(temporaryId))
      const id = await db.concepts.add({ ...concept, position })
      setConcepts((current) => [...current, { ...concept, id, position }])
    } else {
      const position = nodes.find((node) => node.id === String(concept.id))?.position ?? concept.position
      const saved = { ...concept, position }
      await db.concepts.put(saved)
      setConcepts((current) => current.map((item) => item.id === concept.id ? saved : item))
    }
    setEditing(null)
  }

  async function persistPositions(positionedNodes: ConceptFlowNode[]) {
    if (!positionedNodes.length) return
    const positions = new Map(positionedNodes.map((node) => [Number(node.id), node.position]))
    await db.transaction('rw', db.concepts, async () => {
      for (const [id, position] of positions) {
        if (Number.isInteger(id)) await db.concepts.update(id, { position })
      }
    })
    setConcepts((current) => current.map((concept) => {
      const position = concept.id === undefined ? undefined : positions.get(concept.id)
      return position ? { ...concept, position } : concept
    }))
  }

  function autoLayout() {
    const layout = computeLayout(concepts)
    const positioned = nodes.map((node) => ({
      ...node,
      position: layout.get(node.id) ?? node.position,
    }))
    setNodes(positioned)
    void persistPositions(positioned)
    window.setTimeout(() => void fitView({ padding: 0.16, duration: 240 }), 30)
  }

  const knownCount = concepts.filter((concept) => concept.mastery === 'known').length

  return (
    <div className="knowledge-workspace">
      <section className="workspace-heading">
        <div>
          <p className="kicker">M1 / 知识框图</p>
          <h2>先修什么，再看依赖</h2>
          <p>拖动节点整理思路，从右侧手柄连到下一概念；已会内容不再占据学习路径。</p>
        </div>
        <div className="workspace-actions">
          <button className="btn btn-ghost" onClick={autoLayout} disabled={!concepts.length}>自动布局</button>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>新增概念</button>
        </div>
      </section>

      <div className="graph-summary">
        <span><strong>{concepts.length}</strong> 个概念</span>
        <span><strong>{edges.length}</strong> 条依赖</span>
        <span><strong>{knownCount}</strong> 个已掌握</span>
        <span className="graph-help">连线：右 → 左 · 拖拽 / 滚轮缩放 · 点选边后可删除</span>
        <button className="btn btn-ghost btn-sm" disabled={!selectedEdges.length} onClick={() => void removeEdges(selectedEdges)}>
          删除选中边{selectedEdges.length ? `（${selectedEdges.length}）` : ''}
        </button>
      </div>

      {error && <div className="notice error" role="alert">{error}</div>}
      {cycleMembers.size > 0 && <div className="notice warn">检测到旧数据中有循环依赖，请删除相关边后再按学习路径复现。</div>}

      <div className="graph-layout">
        <section className="graph-canvas" aria-label="概念依赖有向无环图">
          {loading ? (
            <AsyncState status="loading" title="正在展开知识框图…" compact />
          ) : loadError ? (
            <AsyncState status="error" title="知识框图没有读取成功" description={loadError} action={{ label: '重新读取', onClick: () => void load() }} compact />
          ) : (
            <ReactFlow<ConceptFlowNode, Edge>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={(connection) => void connect(connection)}
              onEdgesDelete={(removed) => void removeEdges(removed)}
              onNodeDragStop={(_, _node, draggedNodes) => void persistPositions(draggedNodes)}
              fitView
              minZoom={0.25}
              maxZoom={1.8}
              deleteKeyCode={['Backspace', 'Delete']}
              connectionLineStyle={{ stroke: '#b4552f', strokeWidth: 1.8 }}
            >
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#ddd6c4" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable nodeColor={(node) => (node.data as ConceptNodeData).concept.mastery === 'known' ? '#8aa17e' : '#d9c6b6'} />
            </ReactFlow>
          )}
          {!loading && !loadError && concepts.length === 0 && (
            <div className="graph-empty">
              <AsyncState
                status="empty"
                title="从第一个概念开始"
                description="例如「自注意力」，再补充它的前置与后续；学习路径会随之生成。"
                action={{ label: '新增概念', onClick: () => setEditing('new') }}
                compact
              />
            </div>
          )}
        </section>

        <aside className="learning-path">
          <div className="learning-path-head">
            <p className="kicker">最短学习路径</p>
            <h3>{learningPath.length ? `${learningPath.length} 步，按依赖前进` : '前路已清，可以开工'}</h3>
            <p>只保留支撑未掌握目标的必要概念；已会节点与其独占前置即时折叠。</p>
          </div>
          {learningPath.length > 0 ? (
            <ol>
              {learningPath.map((concept, index) => (
                <li key={concept.id} className={`path-${concept.mastery}`}>
                  <span className="path-index">{String(index + 1).padStart(2, '0')}</span>
                  <button className="path-concept" onClick={() => setEditing(concept)}>
                    <strong>{concept.name}</strong>
                    <small>难度 {concept.difficulty} · {MASTERY_LABEL[concept.mastery]}</small>
                  </button>
                  <button className="path-known" onClick={() => void changeMastery(concept, 'known')}>标会</button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="path-complete"><span>✓</span><p>{concepts.length ? '所有目标都已标为「会」。' : '新增概念后会自动生成路径。'}</p></div>
          )}
          <div className="path-legend">
            <span><i className="dot unknown" />不会优先</span>
            <span><i className="dot half" />半会随后</span>
            <span><i className="dot known" />会则折叠</span>
          </div>
        </aside>
      </div>

      {editing && (
        <ConceptDialog
          concept={editing === 'new' ? undefined : editing}
          projectId={projectId}
          onClose={() => setEditing(null)}
          onSave={saveConcept}
        />
      )}
    </div>
  )
}

function makeEdges(concepts: Concept[]): Edge[] {
  const ids = new Set(concepts.map((concept) => concept.id))
  return concepts.flatMap((concept) => concept.dependsOn.flatMap((dependency) => {
    if (concept.id === undefined || !ids.has(dependency)) return []
    return [{
      id: `${dependency}->${concept.id}`,
      source: String(dependency),
      target: String(concept.id),
      markerEnd: { type: MarkerType.ArrowClosed, color: '#a59b87', width: 18, height: 18 },
      style: { stroke: '#a59b87', strokeWidth: 1.5 },
    }]
  }))
}

function computeLayout(concepts: Concept[]): Map<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: 'LR', nodesep: 42, ranksep: 100, marginx: 24, marginy: 24 })
  graph.setDefaultEdgeLabel(() => ({}))
  const valid = concepts.filter((concept) => concept.id !== undefined)
  for (const concept of valid) graph.setNode(String(concept.id), { width: NODE_WIDTH, height: NODE_HEIGHT })
  for (const edge of makeEdges(valid)) graph.setEdge(edge.source, edge.target)
  dagre.layout(graph)
  return new Map(valid.map((concept) => {
    const id = String(concept.id)
    const position = graph.node(id)
    return [id, { x: position.x - NODE_WIDTH / 2, y: position.y - NODE_HEIGHT / 2 }]
  }))
}
