import { MAX_DEPTH, MAX_NODES, type MapDocument, type MapNode, type MapPosition } from './types.ts'

export const nodeId = () => crypto.randomUUID()
export function newNode(parent_id: string | null, title = '新想法'): MapNode {
  return { id: nodeId(), parent_id, title, notes: '', color: 'navy', collapsed: false, position: null, point_id: null }
}
export function newDocument(): MapDocument {
  return { format: 'mathlab-mindmap', version: 1, title: '未命名导图', description: '', section_id: null,
    layout: 'right', viewport: { x: 50, y: 230, zoom: 1 }, nodes: [newNode(null, '中心主题')], revision: null }
}

export function validateTree(nodes: MapNode[]) {
  if (nodes.length < 1 || nodes.length > MAX_NODES) throw new Error('导图需要 1—300 个节点。')
  const lookup = new Map(nodes.map(node => [node.id, node]))
  if (lookup.size !== nodes.length) throw new Error('节点 ID 不能重复。')
  if (nodes.filter(node => node.parent_id === null).length !== 1) throw new Error('必须恰好有一个根节点。')
  for (const node of nodes) {
    const visited = new Set<string>()
    let current = node
    while (current.parent_id !== null) {
      if (visited.has(current.id)) throw new Error('不能建立循环父子关系。')
      visited.add(current.id)
      if (visited.size > MAX_DEPTH) throw new Error('层级不能超过 24 层。')
      const parent = lookup.get(current.parent_id)
      if (!parent) throw new Error('父节点不存在。')
      current = parent
    }
  }
}

export function descendants(nodes: MapNode[], id: string): Set<string> {
  const found = new Set([id])
  const queue = [id]
  while (queue.length) {
    const parent = queue.pop()!
    for (const node of nodes) if (node.parent_id === parent && !found.has(node.id)) {
      found.add(node.id); queue.push(node.id)
    }
  }
  return found
}

export function reparent(nodes: MapNode[], id: string, parentId: string) {
  const node = nodes.find(item => item.id === id)
  if (!node || node.parent_id === null) throw new Error('根节点不能调整父级。')
  if (descendants(nodes, id).has(parentId)) throw new Error('不能将节点移到自身或后代下面。')
  const changed = nodes.filter(item => item.id !== id)
  changed.push({ ...node, parent_id: parentId, position: null })
  const expanded = changed.map(item => item.id === parentId ? { ...item, collapsed: false } : item)
  validateTree(expanded)
  return expanded
}

export function addNode(nodes: MapNode[], selectedId: string, child: boolean) {
  const selected = nodes.find(node => node.id === selectedId)
  if (!selected) throw new Error('请先选择节点。')
  const node = newNode(child ? selected.id : selected.parent_id)
  if (node.parent_id === null) throw new Error('根节点没有同级节点，请添加子节点。')
  const changed = [...nodes]
  changed.splice(child ? changed.length : changed.findIndex(item => item.id === selected.id) + 1, 0, node)
  const expanded = changed.map(item => item.id === node.parent_id ? { ...item, collapsed: false } : item)
  validateTree(expanded)
  return { nodes: expanded, selectedId: node.id }
}

export function moveSibling(nodes: MapNode[], id: string, offset: number) {
  const index = nodes.findIndex(node => node.id === id)
  const node = nodes[index]
  if (!node) return nodes
  const siblings = nodes.filter(item => item.parent_id === node.parent_id)
  const sibling = siblings[siblings.findIndex(item => item.id === id) + offset]
  if (!sibling) return nodes
  const result = [...nodes]
  const other = result.findIndex(item => item.id === sibling.id)
  ;[result[index], result[other]] = [result[other], result[index]]
  return result.map(item => item.parent_id === node.parent_id ? { ...item, position: null } : item)
}

export function revealBranches(nodes: MapNode[], id: string) {
  const expanded = new Set<string>()
  let node = nodes.find(item => item.id === id)
  while (node?.parent_id) {
    if (expanded.has(node.parent_id)) break
    expanded.add(node.parent_id)
    node = nodes.find(item => item.id === node!.parent_id)
  }
  return nodes.map(item => expanded.has(item.id) ? { ...item, collapsed: false } : item)
}

/** Single-sided tree layout; library-independent positions. */
export function layoutTree(nodes: MapNode[], revealId?: string) {
  const lookup = new Map(nodes.map(node => [node.id, node]))
  const revealed = new Set<string>()
  let ancestor = revealId ? lookup.get(revealId) : undefined
  while (ancestor) {
    if (revealed.has(ancestor.id)) break
    revealed.add(ancestor.id)
    ancestor = ancestor.parent_id ? lookup.get(ancestor.parent_id) : undefined
  }
  const positions = new Map<string, MapPosition>()
  const visible: MapNode[] = []
  let row = 0
  const visit = (node: MapNode, depth: number): number => {
    visible.push(node)
    const children = node.collapsed && !revealed.has(node.id) ? [] : nodes.filter(item => item.parent_id === node.id)
    const rows = children.map(child => visit(child, depth + 1))
    const y = rows.length ? (rows[0] + rows[rows.length - 1]) / 2 : row++ * 140
    positions.set(node.id, node.position ?? { x: depth * 320, y })
    return y
  }
  const root = nodes.find(node => node.parent_id === null)
  if (root) visit(root, 0)
  return { visible, positions }
}

export function documentDraft(map: MapDocument): MapDocument {
  return { format: map.format, version: map.version, title: map.title, description: map.description,
    section_id: map.section_id, layout: map.layout, viewport: map.viewport, nodes: map.nodes, revision: map.revision }
}

export function exportDocument(map: MapDocument) {
  return { ...documentDraft(map), revision: null }
}
