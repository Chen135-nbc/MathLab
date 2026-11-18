import { useState } from 'react'
import { api } from '../../services/api'
import type { LearningStatus } from '../../types/knowledge'

const labels: Record<LearningStatus, string> = {
  not_started: '未开始', learning: '学习中', learned: '已学习', review: '待复习',
}

export function OptionalProgress({ pointId, initial }: { pointId: string; initial: LearningStatus }) {
  const [status, setStatus] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async (next: LearningStatus) => {
    setBusy(true)
    setError('')
    try { setStatus((await api.status(pointId, next)).status) }
    catch (err) { setError((err as Error).message) }
    finally { setBusy(false) }
  }
  return <details className="p1-help">
    <summary>学习状态（可选）：{labels[status]}</summary>
    <label>学习状态<select disabled={busy} value={status} onChange={event => void save(event.target.value as LearningStatus)}>
      {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    {error && <span role="alert">{error}</span>}
  </details>
}
