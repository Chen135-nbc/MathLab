import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../../services/api'
import type { PointSummary } from '../../types/knowledge'

export function PointPicker({ ids, onChange }: { ids: string[]; onChange: (value: string[]) => void }) {
  const [points, setPoints] = useState<PointSummary[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api.curriculum().then(volumes => {
      if (active) setPoints(volumes.flatMap(v => v.chapters.flatMap(c => c.sections.flatMap(s => s.knowledge_points))))
    }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [])
  const selected = new Set(ids)
  const remaining = points?.filter(p => !selected.has(p.id) && (p.title + p.id).includes(query.trim()))
  return <section className="p1-stack">
    <h3>关联知识点</h3>
    {!ids.length && <p className="p1-help">一个模型可以关联多个知识点，也可以独立保存。</p>}
    {ids.length > 0 && <ul className="p1-links">{ids.map(id =>
      <li className="p1-toolbar" key={id}><Link to={`/knowledge/${encodeURIComponent(id)}`}>{points?.find(p => p.id === id)?.title ?? id}</Link>
        <button type="button" className="text-button" onClick={() => onChange(ids.filter(item => item !== id))}>移除关联</button></li>)}</ul>}
    {error ? <span role="alert">{error}</span> : points === null ? <span>正在读取知识点…</span> : <>
      <label>筛选可关联知识点<input value={query} onChange={e => setQuery(e.target.value)} placeholder="输入知识点名称"/></label>
      {remaining?.length ? <ul className="p1-links point-picker-results">{remaining.slice(0, 50).map(p =>
        <li key={p.id}><button type="button" className="p1-button" disabled={ids.length >= 100} onClick={() => onChange([...ids, p.id])}>关联 {p.title}</button></li>)}</ul>
        : <p className="p1-help">没有其他匹配的知识点。</p>}
    </>}
  </section>
}
