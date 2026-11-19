import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Background, Controls, Handle, Position, ReactFlow, applyNodeChanges, type Node, type NodeProps, type ReactFlowInstance } from '@xyflow/react'
import { MathMarkdown } from '../MathMarkdown'
import { layoutTree } from './tree'
import type { MapDocument, MapNode, MapPosition, MapViewport } from './types'
import '@xyflow/react/dist/style.css'

type ThoughtNode = Node<{
  value: MapNode
  childCount: number
  collapse: (id: string) => void
  openCard: (id: string) => void
}, 'thought'>

function Thought({ data }: NodeProps<ThoughtNode>) {
  const node = data.value
  return <div className={`mind-thought mind-${node.color}`}>
    {node.parent_id && <Handle type="target" position={Position.Left} isConnectable={false}/>}
    <div className="mind-node-title"><MathMarkdown text={node.title}/></div>
    <div className="mind-node-footer">
      {node.notes && <span title={node.notes}>有备注</span>}
      {node.point_id && <button className="nodrag nopan" type="button" onClick={event => { event.stopPropagation(); data.openCard(node.point_id!) }} aria-label={`打开 ${node.title} 的知识卡`}>↗ 知识卡</button>}
      {data.childCount > 0 && <button className="nodrag nopan" type="button" onClick={event => { event.stopPropagation(); data.collapse(node.id) }}
        aria-label={node.collapsed ? `展开 ${node.title}` : `折叠 ${node.title}`}>{node.collapsed ? '+' : '−'} {data.childCount}</button>}
    </div>
    <Handle type="source" position={Position.Right} isConnectable={false}/>
  </div>
}
const nodeTypes = { thought: Thought }

export function MapCanvas({ document, selectedId, onSelect, onPosition, onViewport, onCollapse, onOpenCard, onCommand, focusId, disabled }: {
  document: MapDocument
  selectedId: string
  onSelect: (id: string) => void
  onPosition: (id: string, position: MapPosition) => void
  onViewport: (viewport: MapViewport) => void
  onCollapse: (id: string) => void
  onOpenCard: (id: string) => void
  onCommand: (action: 'child' | 'sibling' | 'delete' | 'undo' | 'redo') => void
  focusId?: string
  disabled: boolean
}) {
  const instance = useRef<ReactFlowInstance<ThoughtNode> | null>(null)
  const focused = useRef('')
  const { visible, positions } = useMemo(() => layoutTree(document.nodes), [document.nodes])
  const desired = useMemo<ThoughtNode[]>(() => visible.map(node => ({ id: node.id, type: 'thought', selected: node.id === selectedId,
    position: positions.get(node.id)!, data: { value: node, childCount: document.nodes.filter(child => child.parent_id === node.id).length,
      collapse: onCollapse, openCard: onOpenCard }, style: { width: 240, height: 100 } })), [visible, positions, selectedId, document.nodes, onCollapse, onOpenCard])
  const [nodes, setNodes] = useState(desired)
  useEffect(() => setNodes(desired), [desired])
  const edges = useMemo(() => visible.filter(node => node.parent_id).map(node => ({ id: node.id + '-edge', source: node.parent_id!, target: node.id, type: 'smoothstep' })), [visible])
  const focus = () => {
    if (!focusId || focused.current === focusId) return
    const position = positions.get(focusId)
    if (position && instance.current) {
      focused.current = focusId
      void instance.current.setCenter(position.x + 120, position.y + 50, { zoom: 1, duration: 250 })
    }
  }
  useEffect(focus, [focusId, positions])
  const shortcuts = (event: KeyboardEvent) => {
    const element = event.target as HTMLElement
    if (disabled || element.closest('input,textarea,select,button,a,[contenteditable=true]')) return
    let command: Parameters<typeof onCommand>[0] | null = null
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') command = event.shiftKey ? 'redo' : 'undo'
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') command = 'redo'
    else if (event.key === 'Tab') command = 'child'
    else if (event.key === 'Enter') command = 'sibling'
    else if (event.key === 'Delete' || event.key === 'Backspace') command = 'delete'
    if (!command) return
    event.preventDefault(); event.stopPropagation(); onCommand(command)
  }
  return <div className="mind-canvas" tabIndex={0} aria-label="思维导图画布" onKeyDownCapture={shortcuts}>
    <ReactFlow<ThoughtNode> nodes={nodes} edges={edges} nodeTypes={nodeTypes} defaultViewport={document.viewport}
      onInit={flow => { instance.current = flow; focus() }} minZoom={0.01} maxZoom={3}
      onNodesChange={changes => {
        setNodes(current => applyNodeChanges(changes, current))
        for (const change of changes) {
          if (change.type === 'position' && change.dragging !== true && change.position && !disabled) {
            onPosition(change.id, change.position)
          }
        }
      }}
      onNodeClick={(_, node) => onSelect(node.id)}
      onNodeDragStart={(_, node) => onSelect(node.id)}
      onNodeDragStop={(_, node) => onPosition(node.id, node.position)}
      nodeExtent={[[-1e6, -1e6], [1e6, 1e6]]}
      onMoveEnd={(_, viewport) => { if (!disabled) onViewport(viewport) }}
      ariaLabelConfig={{ 'controls.zoomIn.ariaLabel': '放大画布', 'controls.zoomOut.ariaLabel': '缩小画布',
        'controls.fitView.ariaLabel': '适应画布', 'controls.ariaLabel': '画布控制',
        'node.a11yDescription.default': '选中节点后可用方向键移动，Tab 添加子节点，Enter 添加同级节点。',
        'node.a11yDescription.keyboardDisabled': '选中节点可编辑内容。',
        'edge.a11yDescription.default': '父子节点连接线',
        'node.a11yDescription.ariaLiveMessage': ({ x, y }) => `节点已移动到 ${x}, ${y}` }}
      nodesDraggable={!disabled} nodesConnectable={false} edgesReconnectable={false}
      deleteKeyCode={null} multiSelectionKeyCode={null} selectionKeyCode={null} colorMode="system">
      <Background/><Controls aria-label="画布控制" showInteractive={false}/>
    </ReactFlow>
  </div>
}
