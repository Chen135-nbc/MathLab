import { useState, type FormEvent } from 'react'
import type { PointWrite } from '../../types/knowledge'
import { SectionSelect } from './SectionSelect'

export function PointForm({ initial, submit, label, cancel }: {
  initial: PointWrite; submit: (value: PointWrite) => Promise<void>; label: string; cancel?: () => void
}) {
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!value.title.trim() || !value.section_id) { setError('请填写名称并选择所属小节。'); return }
    setBusy(true)
    try { await submit({ ...value, title: value.title.trim() }) }
    catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }
  return <form className="p1-stack" onSubmit={event => void save(event)}>
    <fieldset disabled={busy} className="p1-stack">
      <label>知识点名称<input value={value.title} maxLength={120} required onChange={e => setValue({ ...value, title: e.target.value })}/></label>
      <label>简短说明（可选）<textarea rows={3} maxLength={4000} value={value.description} onChange={e => setValue({ ...value, description: e.target.value })}/></label>
      <SectionSelect value={value.section_id} onChange={section_id => setValue({ ...value, section_id })}/>
      <div className="p1-toolbar"><button className="primary-button" type="submit">{busy ? '保存中…' : label}</button>
        {cancel && <button className="p1-button" type="button" onClick={cancel}>取消</button>}</div>
    </fieldset>
    {error && <p className="p1-error" role="alert">{error}</p>}
  </form>
}
