import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addNode, descendants, documentDraft, exportDocument, layoutTree, moveSibling, newDocument, newNode, reparent, revealBranches, validateTree } from '../src/components/mindmap/tree.ts'
import { parseMapJSON, parseMarkdown, toMarkdown } from '../src/components/mindmap/transfer.ts'
import { editMap, mapHistory, travelMap } from '../src/components/mindmap/history.ts'

test('tree editing creates stable children and siblings, changes parents and refuses cycles', () => {
  const root = newNode(null, '集合')
  const first = addNode([root], root.id, true)
  const second = addNode(first.nodes, first.selectedId, false)
  assert.equal(second.nodes.length, 3)
  assert.equal(second.nodes[2].parent_id, root.id)
  const changed = reparent(second.nodes, second.selectedId, first.selectedId)
  assert.equal(changed.find(node => node.id === second.selectedId).parent_id, first.selectedId)
  assert.throws(() => reparent(changed, first.selectedId, second.selectedId), /后代/)
  assert.throws(() => reparent(changed, root.id, first.selectedId), /根节点/)
  assert.equal(descendants(changed, first.selectedId).size, 2)
  const ordered = moveSibling(second.nodes, second.selectedId, -1)
  assert.deepEqual(ordered.filter(n => n.parent_id === root.id).map(n => n.id), [second.selectedId, first.selectedId])
  assert.throws(() => validateTree([root, { ...root }]), /重复/)
})

test('layout, collapse and backlink reveal preserve the whole document', () => {
  const map = newDocument()
  const root = map.nodes[0]
  const child = newNode(root.id, '第一层')
  const grandchild = newNode(child.id, '$x^2$')
  const nodes = [root, { ...child, collapsed: true }, grandchild]
  const layout = layoutTree(nodes)
  assert.equal(layout.visible.length, 2)
  assert.equal(layout.positions.get(child.id).x, 320)
  const revealed = revealBranches(nodes, grandchild.id)
  assert.equal(layoutTree(revealed).visible.length, 3)
  assert.equal(nodes[1].collapsed, true)
  const dragged = { ...child, position: { x: -100, y: 200 } }
  assert.deepEqual(layoutTree([root, dragged]).positions.get(child.id), dragged.position)
})

test('history restores title, deleted branches, and card associations', () => {
  const map = newDocument()
  const root = map.nodes[0]
  const child = newNode(root.id, '表示法')
  const linked = { ...map, nodes: [root, { ...child, point_id: 'kp-example' }] }
  let history = editMap(mapHistory(map), linked)
  const renamed = { ...linked, title: '新名称' }
  history = editMap(history, renamed)
  history = editMap(history, { ...renamed, nodes: [root] })
  history = travelMap(history, false)
  assert.equal(history.present.nodes[1].point_id, 'kp-example')
  history = travelMap(history, false)
  assert.equal(history.present.title, map.title)
  history = travelMap(history, true)
  assert.equal(history.present.title, '新名称')
  const resetRedo = editMap(travelMap(history, false), { ...linked, title: '其他修改' })
  assert.equal(resetRedo.future.length, 0)
})

test('Markdown headings and nested lists preserve Chinese and LaTeX hierarchy', () => {
  const text = '# 集合 $A$\n\n- 元素 $x\\in A$\n  - 说明 $A\\cap B$\n- 表示法\n'
  const map = parseMarkdown(text)
  assert.equal(map.nodes.length, 4)
  assert.equal(map.nodes[2].parent_id, map.nodes[1].id)
  const exported = toMarkdown(map)
  const roundTrip = parseMarkdown(exported)
  assert.deepEqual(roundTrip.nodes.map(n => n.title), map.nodes.map(n => n.title))
  assert.ok(!roundTrip.nodes.some(n => map.nodes.some(old => old.id === n.id)))
  const headings = parseMarkdown('# 数学\n## 代数\n### 方程\n## 几何\n')
  assert.equal(headings.nodes[2].parent_id, headings.nodes[1].id)
  assert.equal(headings.nodes[3].parent_id, headings.nodes[0].id)
  assert.equal(parseMarkdown('- A\n- B\n', '根').nodes[0].title, '根')
})

test('JSON round trip preserves notes, positions, collapse and optional references without changing original', () => {
  const map = newDocument()
  map.nodes[0] = { ...map.nodes[0], title: '中文 $x^2$', notes: '证明\n中文', point_id: 'ks-bx1-001', collapsed: true, position: { x: 25, y: -40 }, color: 'teal' }
  const serialized = JSON.stringify(exportDocument(map))
  const original = structuredClone(map)
  const parsed = parseMapJSON(serialized)
  assert.deepEqual(parsed, documentDraft(map))
  assert.deepEqual(map, original)
  assert.equal(parsed.nodes[0].point_id, 'ks-bx1-001')
})

test('rejects malformed, oversized, cyclic or excessively deep imported files', () => {
  assert.throws(() => parseMapJSON('not json'), /JSON/)
  assert.throws(() => parseMapJSON(JSON.stringify({ format: 'other', version: 1 })), /MathLab/)
  const map = newDocument()
  const cycle = { ...map, nodes: [map.nodes[0], { ...newNode('self'), id: 'self' }] }
  assert.throws(() => parseMapJSON(JSON.stringify(cycle)), /循环/)
  const depth = { ...map, nodes: Array.from({ length: 27 }, (_, i) => ({ ...newNode(i ? String(i - 1) : null), id: String(i) })) }
  assert.throws(() => parseMapJSON(JSON.stringify(depth)), /24/)
  const broken = { ...map, viewport: { x: 'NaN', y: 0, zoom: 1 } }
  assert.throws(() => parseMapJSON(JSON.stringify(broken)), /视图/)
  assert.throws(() => parseMarkdown('![图片](map.png)'), /图片/)
  assert.throws(() => parseMarkdown('# 标题\n\n正文段落'), /普通段落/)
  assert.throws(() => parseMarkdown('# ' + '中'.repeat(400000)), /1 MB/)
  assert.throws(() => parseMarkdown(''), /没有/)
})
