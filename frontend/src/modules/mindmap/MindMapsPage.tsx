import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { MapCanvas } from '../../components/mindmap/MapCanvas'
import { useMapHistory } from '../../components/mindmap/useMapHistory'
import { addNode, descendants, documentDraft, exportDocument, moveSibling, newDocument, reparent, revealBranches } from '../../components/mindmap/tree'
import { parseMapJSON, toMarkdown } from '../../components/mindmap/transfer'
import type { MapDocument, MapNode, SavedMap } from '../../components/mindmap/types'
import { useUnsavedChanges } from '../../app/useUnsavedChanges'
import { ErrorState, Loading } from '../../components/States'
import { SectionSelect } from '../knowledge/SectionSelect'
import { mindmaps } from '../../services/mindmaps'
import { MapLibrary } from './MapLibrary'
import { NodeInspector } from './NodeInspector'
import './mindmap.css'

export function MindMapsPage() {
  const { mapId } = useParams()
  const location = useLocation()
  const [query] = useSearchParams()
  const focus = query.get('node') ?? undefined
  return <MindMapWorkspace key={`${mapId ?? location.key}:${focus ?? ''}`} id={mapId} focusId={focus}/>
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = window.document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function MindMapWorkspace({ id, focusId }: { id?: string; focusId?: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [initial] = useState(newDocument)
  const history = useMapHistory(initial)
  const doc = history.document
  const [baseline, setBaseline] = useState(initial)
  const [saved, setSaved] = useState<SavedMap | null>(null)
  const [selectedId, setSelectedId] = useState(initial.nodes[0].id)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState<string>(location.state?.notice ?? '')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const dirty = JSON.stringify(doc) !== JSON.stringify(baseline)
  useUnsavedChanges(dirty)
  useEffect(() => {
    if (!id) return
    let active = true
    mindmaps.read(id).then(item => {
      if (!active) return
      const draft = documentDraft(item)
      history.reset(focusId ? { ...draft, nodes: revealBranches(draft.nodes, focusId) } : draft); setBaseline(draft); setSaved(item)
      setSelectedId(item.nodes.find(node => node.id === focusId)?.id ?? item.nodes.find(node => node.parent_id === null)!.id)
    }).catch(err => { if (active) setLoadError(err.message) })
    return () => { active = false }
    // The route key starts a fresh workspace on map or focus changes.
  }, [id])
  const selected = doc.nodes.find(node => node.id === selectedId) ?? doc.nodes.find(node => node.parent_id === null)!
  const edit = (next: MapDocument, track = true) => {
    if (busy) return
    history.edit(next, track); setNotice(''); setError('')
  }
  const patch = (patch: Partial<MapNode>) => edit({ ...doc, nodes: doc.nodes.map(node => node.id === selected.id ? { ...node, ...patch } : node) })
  const command = (action: 'child' | 'sibling' | 'delete' | 'undo' | 'redo') => {
    if (busy) return
    setError(''); setNotice('')
    try {
      if (action === 'undo' || action === 'redo') { history.travel(action === 'redo'); return }
      if (action === 'delete') {
        if (selected.parent_id === null) throw new Error('根节点不能删除，可以修改中心主题。')
        const removed = descendants(doc.nodes, selected.id)
        if (!window.confirm(`确认删除「${selected.title}」及其分支（${removed.size} 个节点）？关联知识卡不会被删除。`)) return
        edit({ ...doc, nodes: doc.nodes.filter(node => !removed.has(node.id)) }); setSelectedId(selected.parent_id)
      } else {
        const next = addNode(doc.nodes, selected.id, action === 'child')
        edit({ ...doc, nodes: next.nodes }); setSelectedId(next.selectedId)
      }
    } catch (err) { setError((err as Error).message) }
  }
  const acceptSaved = (item: SavedMap) => {
    const next = documentDraft(item)
    history.reset(next); setBaseline(next); setSaved(item); setRefresh(value => value + 1)
  }
  const save = async () => {
    if (busy) return
    setError(''); setNotice('')
    try {
      parseMapJSON(JSON.stringify(exportDocument(doc)))
      setBusy(true)
      const item = await mindmaps.save({ ...doc, revision: saved?.revision ?? null }, id)
      if (!mounted.current) return
      if (!id) navigate(`/mindmaps/${item.id}`, { replace: true, state: { notice: '导图已保存。' } })
      else { acceptSaved(item); setNotice('导图已保存。') }
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  const exportMap = (json: boolean) => {
    try {
      const valid = parseMapJSON(JSON.stringify(exportDocument(doc)))
      const name = (doc.title.replace(/[\\/:*?"<>|]/g, '_') || '导图').slice(0, 80)
      download(name + (json ? '.json' : '.md'), json ? JSON.stringify(exportDocument(valid)) : toMarkdown(valid),
        json ? 'application/json' : 'text/markdown;charset=utf-8')
      setNotice(json ? '已导出当前草稿的完整 JSON，不会修改已保存导图。' : '已导出标题层级。备注、关联、颜色和布局请用 JSON 保存。')
    } catch (err) { setError((err as Error).message) }
  }
  const guard = (work: () => void) => { try { work() } catch (err) { setError((err as Error).message) } }
  let workspace: ReactNode
  if (loadError) workspace = <ErrorState message={loadError}/>
  else if (id && !saved) workspace = <Loading label="正在读取思维导图…"/>
  else workspace = <>
    <section className="panel studio-panel p1-stack">
      <div className="p1-toolbar"><div><h2>{saved ? '编辑导图' : '新建导图'}</h2><p className="p1-help">{doc.nodes.length} / 300 个节点 · {dirty ? '有未保存修改' : saved ? '已同步' : '尚未保存'}</p></div>
        <button className="primary-button" disabled={busy || (!!saved && !dirty)} onClick={() => void save()}>{busy ? '保存中…' : '保存导图'}</button></div>
      <fieldset disabled={busy} className="p1-stack"><label>导图名称<input value={doc.title} maxLength={120} onChange={event => edit({ ...doc, title: event.target.value })}/></label>
        <label>导图说明<textarea rows={2} maxLength={4000} value={doc.description} onChange={event => edit({ ...doc, description: event.target.value })}/></label>
        <SectionSelect optional value={doc.section_id ?? ''} onChange={section_id => edit({ ...doc, section_id: section_id || null })}/>
      </fieldset>
    </section>
    <div className="mind-actions p1-toolbar">
      <div className="p1-segments"><button disabled={busy} onClick={() => command('child')}>＋ 子节点</button>
        <button disabled={busy || selected.parent_id === null} onClick={() => command('sibling')}>＋ 同级节点</button>
        <button disabled={busy || selected.parent_id === null} onClick={() => command('delete')}>删除分支</button>
        <button disabled={busy || !history.canUndo} onClick={() => command('undo')}>撤销</button>
        <button disabled={busy || !history.canRedo} onClick={() => command('redo')}>重做</button>
        <button disabled={busy} onClick={() => edit({ ...doc, nodes: doc.nodes.map(node => ({ ...node, position: null })) })}>自动布局</button></div>
      <div className="p1-segments"><button onClick={() => exportMap(false)}>导出 Markdown</button><button onClick={() => exportMap(true)}>导出 JSON</button></div>
    </div>
    <p className="p1-help">拖动节点调整位置 · 空白处拖动平移 · 滚轮缩放 · 左下角适应画布。画布聚焦时 Tab 添加子级，Enter 添加同级，Delete 删除，Cmd/Ctrl-Z 撤销。</p>
    <div className="mind-edit-grid">
      <MapCanvas document={doc} selectedId={selected.id} onSelect={setSelectedId} disabled={busy} focusId={focusId}
        onPosition={(nodeId, position) => edit({ ...doc, nodes: doc.nodes.map(node => node.id === nodeId ? { ...node, position } : node) })}
        onViewport={viewport => edit({ ...doc, viewport }, false)}
        onCollapse={nodeId => {
          if (busy) return
          const branch = doc.nodes.find(node => node.id === nodeId)
          if (branch && !branch.collapsed && descendants(doc.nodes, nodeId).has(selected.id)) setSelectedId(nodeId)
          edit({ ...doc, nodes: doc.nodes.map(node => node.id === nodeId ? { ...node, collapsed: !node.collapsed } : node) })
        }}
        onOpenCard={pointId => navigate(`/knowledge/${pointId}`)} onCommand={command}/>
      <fieldset disabled={busy} className="mind-inspector-fieldset"><NodeInspector node={selected} document={doc} update={patch}
        onParent={parentId => guard(() => edit({ ...doc, nodes: reparent(doc.nodes, selected.id, parentId) }))}
        onSibling={offset => edit({ ...doc, nodes: moveSibling(doc.nodes, selected.id, offset) })}
        saved={saved} dirty={dirty} onBusy={setBusy} onPromoted={item => { acceptSaved(item); setNotice('已创建知识卡并关联，原节点保留。') }}/></fieldset>
    </div>
    {saved && <p className="p1-help">创建 {new Date(saved.created_at).toLocaleString('zh-CN')} · 最后保存 {new Date(saved.updated_at).toLocaleString('zh-CN')}</p>}
  </>
  return <div className="mind-workspace p1-stack">
    <div className="page-heading"><div><div className="eyebrow">自由整理与探索</div><h1>Mind Map</h1><p>让零散想法长出分支，把重要节点整理为知识卡。</p></div></div>
    {error && <p className="p1-error" role="alert">{error}</p>}{notice && <p className="p1-help" role="status">{notice}</p>}
    <div className="mind-workspace-grid"><div className="p1-stack">{workspace}</div>
      <MapLibrary refresh={refresh} disabled={dirty || busy} saving={busy} onNew={() => {
        if (busy) return
        if (!id && dirty && !window.confirm('当前导图尚未保存，确定新建并放弃当前草稿吗？')) return
        navigate('/mindmaps')
      }}/></div>
  </div>
}
