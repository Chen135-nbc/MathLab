import { useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../../services/api'
import { forgetPoint } from '../../app/useRecent'
import type { PointDetail } from '../../types/knowledge'
import { PointForm } from './PointForm'

export function PointManagement({ point, onSaved, dirty }: { point: PointDetail; onSaved: (value: PointDetail) => void; dirty: boolean }) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const archive = async () => {
    setBusy(true); setError('')
    try { onSaved(await api.managePoint(point.id, { title: point.title, description: point.description, section_id: point.section_id, archived: !point.archived })) }
    catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!window.confirm(`确认删除知识点「${point.title}」？目录将不再显示此卡。已保存笔记和导图、模型保留，不会删除相关文件。`)) return
    setBusy(true); setError('')
    try { await api.deletePoint(point.id); forgetPoint(point.id); navigate(`/sections/${point.section_id}`) }
    catch (err) { setError((err as Error).message); setBusy(false) }
  }
  return <section className="panel studio-panel p1-stack"><h2>管理知识点</h2>
    {point.archived && <p className="p1-help">此知识点已归档，可以继续编辑或恢复。</p>}
    {editing ? <PointForm key={point.id + point.section_id + point.title} initial={{ title: point.title, description: point.description, section_id: point.section_id }}
      label="保存名称与位置" cancel={() => setEditing(false)} submit={async payload => {
        onSaved(await api.managePoint(point.id, { ...payload, archived: point.archived })); setEditing(false)
      }}/> : <><p className="p1-help">{point.description || '尚未填写简短说明。'}</p><button className="p1-button" onClick={() => setEditing(true)}>修改名称、说明或移动</button></>}
    <div className="p1-toolbar"><button className="p1-button" disabled={busy || editing} onClick={() => void archive()}>{point.archived ? '恢复归档' : '归档知识点'}</button>
      <button className="p1-button" disabled={busy || dirty || editing} onClick={() => void remove()}>删除知识点</button></div>
    {dirty && <p className="p1-help">删除前请先保存或撤销笔记草稿。</p>}
    {error && <p className="p1-error" role="alert">{error}</p>}
  </section>
}
