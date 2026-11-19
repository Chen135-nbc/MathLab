import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../../services/api'
import { mindmaps } from '../../services/mindmaps'
import { SectionSelect } from '../knowledge/SectionSelect'
import { PointForm } from '../knowledge/PointForm'
import type { MapNode, SavedMap } from '../../components/mindmap/types'
import type { PointSummary } from '../../types/knowledge'

export function KnowledgeLinkEditor({ node, onLink, map, dirty, onPromoted, onBusy }: {
  node: MapNode; onLink: (id: string | null) => void; map: SavedMap | null; dirty: boolean; onPromoted: (map: SavedMap) => void; onBusy: (busy: boolean) => void
}) {
  const [sectionId, setSectionId] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PointSummary[]>([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [copyNotes, setCopyNotes] = useState(false)
  const [linkedTitle, setLinkedTitle] = useState('')
  useEffect(() => {
    let active = true
    setLinkedTitle(''); setError('')
    if (node.point_id) api.point(node.point_id).then(point => { if (active) setLinkedTitle(point.title) })
      .catch(() => { if (active) setLinkedTitle('关联知识卡当前不可用（可能已删除）') })
    return () => { active = false }
  }, [node.point_id])
  useEffect(() => {
    let active = true
    setResults([])
    const timer = window.setTimeout(() => {
      const search = sectionId ? api.section(sectionId).then(section => section.knowledge_points.filter(p => p.title.includes(query.trim())))
        : query.trim() ? api.search(query.trim()) : Promise.resolve([])
      search.then(points => { if (active) setResults(points) }).catch(err => { if (active) setError(err.message) })
    }, 200)
    return () => { active = false; clearTimeout(timer) }
  }, [sectionId, query])
  return <section className="p1-stack mind-link-editor"><h3>Math Notes 知识卡</h3>
    {node.point_id ? <><Link className="mind-card-link" to={`/knowledge/${encodeURIComponent(node.point_id)}`}>↗ {linkedTitle || node.point_id}</Link>
      <button className="p1-button" type="button" onClick={() => onLink(null)}>解除关联（保存导图后生效）</button></>
      : <><p className="p1-help">节点可独立存在，关联不会同步或覆盖知识卡内容。</p>
        <SectionSelect optional value={sectionId} onChange={setSectionId}/>
        <label>关键词查找知识卡<input value={query} maxLength={100} onChange={e => setQuery(e.target.value)}/></label>
        <ul className="p1-links mind-search-results">{results.map(point => <li key={point.id}><button className="p1-button" type="button" onClick={() => onLink(point.id)}>
          关联 {point.title}{point.archived && '（已归档）'}</button></li>)}</ul>
        {(query.trim() || sectionId) && !results.length && <p className="p1-help">没有匹配的知识卡。</p>}
        <button className="p1-button" disabled={!map || dirty} type="button" onClick={() => setCreating(!creating)}>将节点整理为新知识点</button>
        {(!map || dirty) && <p className="p1-help">请先保存导图，再从该节点创建知识卡。</p>}
        {creating && map && !dirty && <div className="p1-stack">
          <label className="mind-checkbox"><input type="checkbox" checked={copyNotes} onChange={e => setCopyNotes(e.target.checked)}/>把节点备注复制到新笔记（可选）</label>
          <PointForm key={node.id} initial={{ title: node.title, description: '', section_id: sectionId || map.section_id || '' }} label="创建知识卡并关联" cancel={() => setCreating(false)}
            submit={async payload => {
              onBusy(true)
              try {
                const result = await mindmaps.promote(map.id, node.id, { ...payload, include_notes: copyNotes, revision: map.revision })
                onPromoted(result.map); setCreating(false)
              } finally { onBusy(false) }
            }}/>
        </div>}
      </>}
    {error && <p className="p1-error" role="alert">{error}</p>}
  </section>
}
