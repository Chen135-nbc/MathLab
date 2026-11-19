import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { api } from '../../services/api'
import { useUnsavedChanges } from '../../app/useUnsavedChanges'
import type { NoteProfile, SectionDetail } from '../../types/knowledge'
import { NoteEditor } from './NoteEditor'
import { PointForm } from './PointForm'
import { Loading, ErrorState } from '../../components/States'

export function SectionPage() {
  const { sectionId = '' } = useParams()
  return <SectionWorkspace key={sectionId} id={sectionId}/>
}

function SectionWorkspace({ id }: { id: string }) {
  const navigate = useNavigate()
  const [section, setSection] = useState<SectionDetail | null>(null)
  const [content, setContent] = useState('')
  const [profile, setProfile] = useState<NoteProfile>({ category: 'basic', language_entries: [] })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const dirty = !!section && (content !== section.content || JSON.stringify(profile) !== JSON.stringify(section.profile))
  useUnsavedChanges(dirty)
  useEffect(() => {
    let active = true
    api.section(id).then(data => { if (active) { setSection(data); setContent(data.content); setProfile(data.profile) } })
      .catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [id])
  const save = async () => {
    setBusy(true); setError(''); setNotice('')
    try { setSection(await api.sectionNote(id, content, profile)); setNotice('小节笔记已保存。') }
    catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  const reorder = async (index: number, offset: number) => {
    if (!section) return
    const ids = section.knowledge_points.map(point => point.id)
    ;[ids[index], ids[index + offset]] = [ids[index + offset], ids[index]]
    setBusy(true); setError('')
    try {
      const next = await api.reorderPoints(id, ids)
      setSection(current => current && { ...current, knowledge_points: next.knowledge_points })
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  return <div className="page-width p1-stack"><Link to="/knowledge" className="back-link">返回 Math Notes</Link>
    {!section ? error ? <ErrorState message={error}/> : <Loading/> : <>
      <div className="page-heading"><div><div className="eyebrow">小节自由整理页</div><h1>{section.title}</h1>
        <p>{section.volume_title} · {section.chapter_title}</p></div><button className="primary-button" onClick={() => setCreating(!creating)}>＋ 新建知识点</button></div>
      {creating && <section className="panel studio-panel"><PointForm initial={{ title: '', description: '', section_id: id }} label="创建并打开笔记" cancel={() => setCreating(false)}
        submit={async value => {
          const point = await api.createPoint(value)
          setSection(current => current && point.section_id === id ? { ...current, knowledge_points: [...current.knowledge_points, { ...point, deleted: false }] } : current)
          setCreating(false)
          navigate(`/knowledge/${point.id}`)
        }}/></section>}
      <section className="panel studio-panel p1-stack"><div className="p1-toolbar"><h2>本小节知识点</h2><span className="p1-help">↑ ↓ 调整顺序 · 归档项仍可打开</span></div>
        {!section.knowledge_points.length && <p className="p1-help">这里还没有知识点。可以先写小节笔记，再决定如何划分知识卡。</p>}
        <ul className="p1-links">{section.knowledge_points.map((point, index) => <li className="p1-toolbar p2-point-row" key={point.id}>
          <div><Link to={`/knowledge/${point.id}`}>{point.title}{point.archived && '（已归档）'}</Link><p className="p1-help">{point.description}</p></div>
          <div><button className="p1-button" disabled={busy || index === 0} aria-label={`上移 ${point.title}`} onClick={() => void reorder(index, -1)}>↑</button>{' '}
            <button className="p1-button" disabled={busy || index === section.knowledge_points.length - 1} aria-label={`下移 ${point.title}`} onClick={() => void reorder(index, 1)}>↓</button></div>
        </li>)}</ul>
      </section>
      <NoteEditor point={{ note_updated_at: section.updated_at }} content={content} profile={profile} onContent={setContent} onProfile={setProfile} onSave={() => void save()} dirty={dirty} saving={busy}/>
      {error && <p role="alert" className="p1-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    </>}
  </div>
}
