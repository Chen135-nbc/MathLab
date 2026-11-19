import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, BookOpen, Sigma } from 'lucide-react'
import { api } from '../../services/api'
import { rememberPoint } from '../../app/useRecent'
import { useUnsavedChanges } from '../../app/useUnsavedChanges'
import { ErrorState, Loading } from '../../components/States'
import { MathMarkdown } from '../../components/MathMarkdown'
import { NoteEditor } from './NoteEditor'
import { LinkedModels } from './LinkedModels'
import { OptionalProgress } from './OptionalProgress'
import { PointManagement } from './PointManagement'
import { LinkedMindMaps } from './LinkedMindMaps'
import type { NoteProfile, PointDetail } from '../../types/knowledge'

export function PointPage() {
  const { pointId = '' } = useParams()
  return <PointWorkspace key={pointId} pointId={pointId}/>
}

function PointWorkspace({ pointId }: { pointId: string }) {
  const [point, setPoint] = useState<PointDetail | null>(null)
  const [note, setNote] = useState('')
  const [profile, setProfile] = useState<NoteProfile>({ category: 'basic', language_entries: [] })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [saveError, setSaveError] = useState('')
  const dirty = !!point && (note !== point.note || JSON.stringify(profile) !== JSON.stringify(point.note_profile))
  useUnsavedChanges(dirty)
  useEffect(() => {
    let active = true
    api.point(pointId).then(data => {
      if (!active) return
      setPoint(data)
      setNote(data.note)
      setProfile(data.note_profile)
      rememberPoint({ id: data.id, title: data.title, chapter: data.chapter_title })
    }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [pointId])

  const save = async () => {
    if (saving) return
    setNotice('')
    if (profile.language_entries.some(entry => !entry.text.trim())) {
      setSaveError('请填写多语言条目的内容，或从草稿中移除空条目。')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      setPoint(await api.note(pointId, note, profile))
      setNotice('笔记已保存到本地。')
    } catch (err) {
      setSaveError((err as Error).message)
    } finally { setSaving(false) }
  }

  return <div className="page-width point-page">
    <Link to="/knowledge" className="back-link"><ArrowLeft size={16}/> 返回 Math Notes</Link>
    {error ? <ErrorState message={error}/> : !point ? <Loading label="正在读取知识点…"/> : <>
      <div className="point-heading"><div><div className="eyebrow">MATH NOTES / {point.id}</div><h1>{point.title}</h1>
        <p>{point.volume_title} · {point.chapter_title} · {point.section_title}</p></div><span className="kind-badge">{point.kind}</span></div>
      <div className="p1-note-grid">
        <div className="p1-stack">
          <NoteEditor point={point} content={note} profile={profile} onContent={setNote} onProfile={setProfile} onSave={save} dirty={dirty} saving={saving}/>
          {saveError && <div className="p1-error" role="alert">{saveError}</div>}
          {notice && <div className="p1-help" role="status">{notice}</div>}
        </div>
        <aside className="p1-stack">
          <PointManagement point={point} onSaved={value => {
            setPoint(value); rememberPoint({ id: value.id, title: value.title, chapter: value.chapter_title })
          }} dirty={dirty}/>
          <LinkedMindMaps pointId={point.id}/>
          <LinkedModels pointId={point.id}/>
          <section className="panel information-panel p1-stack">
            <div className="panel-heading"><h2>课程位置</h2><BookOpen size={18}/></div>
            <div className="info-grid"><div><span>知识 ID</span><strong>{point.id}</strong></div><div><span>知识类型</span><strong>{point.kind}</strong></div>
              <div><span>所属章节</span><strong>{point.chapter_title}</strong></div><div><span>所属小节</span><strong>{point.section_title}</strong></div></div>
            <OptionalProgress pointId={point.id} initial={point.status}/>
          </section>
          {point.formula && <section className="panel formula-panel">
            <div className="panel-heading"><h2>相关记号</h2><Sigma size={18}/></div>
            <div className="formula-content"><MathMarkdown text={'$$\n' + point.formula + '\n$$'}/></div>
          </section>}
        </aside>
      </div>
    </>}
  </div>
}
