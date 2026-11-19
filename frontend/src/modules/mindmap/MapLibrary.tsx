import { useEffect, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { mindmaps } from '../../services/mindmaps'
import type { MapDocument, MapSummary } from '../../components/mindmap/types'
import { MAX_BYTES } from '../../components/mindmap/types'
import { parseMapJSON, parseMarkdown } from '../../components/mindmap/transfer'

export function MapLibrary({ refresh, disabled, saving, onNew }: { refresh: number; disabled: boolean; saving: boolean; onNew: () => void }) {
  const navigate = useNavigate()
  const [items, setItems] = useState<MapSummary[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => { setError(''); mindmaps.list().then(setItems).catch(err => setError(err.message)) }
  useEffect(load, [refresh])
  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(''); setBusy(true)
    try {
      if (file.size > MAX_BYTES) throw new Error('文件不能超过 1 MB。')
      const text = await file.text()
      let document: MapDocument
      if (/\.json$/i.test(file.name)) document = parseMapJSON(text)
      else if (/\.(md|markdown|txt)$/i.test(file.name)) document = parseMarkdown(text, file.name.replace(/\.[^.]+$/, ''))
      else throw new Error('只支持 MathLab JSON 或 Markdown 大纲，不能把图片自动转换成导图。')
      const imported = await mindmaps.import(document)
      navigate(`/mindmaps/${imported.id}`, { state: { notice: '已导入为新导图，原文件未修改。' } })
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  const duplicate = async (item: MapSummary) => {
    setBusy(true); setError('')
    try {
      const copy = await mindmaps.duplicate(item.id)
      navigate(`/mindmaps/${copy.id}`, { state: { notice: '已复制导图，节点获得了新的 ID。' } }); load()
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  const remove = async (item: MapSummary) => {
    if (!window.confirm(`确认删除思维导图「${item.title}」及其节点关联？相关知识卡和笔记不会删除。`)) return
    setBusy(true); setError('')
    try { await mindmaps.remove(item.id, item.revision); load(); navigate('/mindmaps', { replace: true }) }
    catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  return <section className="panel studio-panel p1-stack mind-library"><div className="p1-toolbar"><h2>导图库</h2><button className="p1-button" disabled={busy || saving} onClick={onNew}>＋ 新建</button></div>
    <label className="p1-help">导入 Markdown / JSON（最多 1 MB）<input type="file" accept=".md,.markdown,.txt,.json" disabled={busy || disabled} onChange={event => void readFile(event)}/></label>
    {items === null ? <p className="p1-help">正在读取…</p> : items.length ? <ul className="p1-links">{items.map(item => <li key={item.id} className="mind-library-item p1-stack">
      <Link to={`/mindmaps/${item.id}`} aria-disabled={saving || busy} onClick={event => { if (saving || busy) event.preventDefault() }}><strong>{item.title}</strong></Link><small className="p1-help">{new Date(item.updated_at).toLocaleString('zh-CN')}</small>
      <div className="p1-toolbar"><button className="p1-button" disabled={busy || disabled} onClick={() => void duplicate(item)}>复制</button>
        <button className="p1-button" disabled={busy || disabled} onClick={() => void remove(item)}>删除</button></div>
    </li>)}</ul> : <p className="p1-help">还没有保存的导图。</p>}
    {error && <p className="p1-error" role="alert">{error}<button className="text-button" onClick={load}>刷新列表</button></p>}
  </section>
}
