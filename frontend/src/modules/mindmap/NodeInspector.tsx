import type { MapDocument, MapNode, SavedMap } from '../../components/mindmap/types'
import { descendants } from '../../components/mindmap/tree'
import { KnowledgeLinkEditor } from './KnowledgeLinkEditor'

export function NodeInspector({ node, document, update, onParent, onSibling, saved, dirty, onPromoted, onBusy }: {
  node: MapNode; document: MapDocument; update: (patch: Partial<MapNode>) => void
  onParent: (id: string) => void; onSibling: (offset: number) => void
  saved: SavedMap | null; dirty: boolean; onPromoted: (map: SavedMap) => void
  onBusy: (busy: boolean) => void
}) {
  const excluded = descendants(document.nodes, node.id)
  const siblings = document.nodes.filter(item => item.parent_id === node.parent_id)
  const index = siblings.findIndex(item => item.id === node.id)
  return <aside className="panel studio-panel p1-stack mind-inspector">
    <h2>节点编辑</h2><span className="p1-help">{node.parent_id ? '普通节点' : '根节点'} · {node.id.slice(0, 8)}</span>
    <label>节点标题<input value={node.title} maxLength={120} onChange={e => update({ title: e.target.value })}/></label>
    <p className="p1-help">基础数学公式可写成 $x^2$。</p>
    <label>节点备注<textarea rows={4} maxLength={4000} value={node.notes} onChange={e => update({ notes: e.target.value })}/></label>
    <label>节点标记<select value={node.color} onChange={e => update({ color: e.target.value as MapNode['color'] })}>
      <option value="navy">海军蓝</option><option value="teal">青绿</option><option value="amber">琥珀</option><option value="rose">玫红</option>
    </select></label>
    {node.parent_id && <><label>调整父子层级<select value={node.parent_id} onChange={e => onParent(e.target.value)}>
      {document.nodes.filter(item => !excluded.has(item.id)).map(item => <option value={item.id} key={item.id}>{item.title}</option>)}
    </select></label><div className="p1-toolbar"><button className="p1-button" disabled={index === 0} onClick={() => onSibling(-1)}>同级上移</button>
      <button className="p1-button" disabled={index === siblings.length - 1} onClick={() => onSibling(1)}>同级下移</button></div></>}
    <KnowledgeLinkEditor key={node.id} node={node} onLink={point_id => update({ point_id })} map={saved} dirty={dirty} onPromoted={onPromoted} onBusy={onBusy}/>
  </aside>
}
