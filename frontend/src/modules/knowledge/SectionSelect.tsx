import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import type { Volume } from '../../types/knowledge'

export function SectionSelect({ value, onChange, optional = false }: {
  value: string; onChange: (id: string) => void; optional?: boolean
}) {
  const [volumes, setVolumes] = useState<Volume[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api.curriculum().then(items => { if (active) setVolumes(items) }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [])
  return <label>所属课程小节
    <select value={value} required={!optional} onChange={event => onChange(event.target.value)} disabled={!volumes}>
      <option value="">{optional ? '独立使用，不关联课程' : '请选择课程小节'}</option>
      {volumes?.flatMap(volume => volume.chapters.filter(chapter => chapter.sections.length).map(chapter =>
        <optgroup key={chapter.id} label={`${volume.title} / ${chapter.title}`}>
          {chapter.sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}
        </optgroup>))}
    </select>
    {error && <span role="alert">{error}</span>}
  </label>
}
