import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../../services/api'
import type { ModelSummary } from '../../types/studio'

export function LinkedModels({ pointId }: { pointId: string }) {
  const [models, setModels] = useState<ModelSummary[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api.models(pointId).then(items => { if (active) setModels(items) })
      .catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [pointId])
  const from = new URLSearchParams({ point: pointId }).toString()
  return <section className="panel future-panel p1-stack">
    <div className="panel-heading"><div><span className="panel-kicker">MATH STUDIO</span><h2>相关模型</h2></div></div>
    {error ? <span role="alert">{error}</span> : models === null ? <span>正在读取模型…</span>
      : models.length ? <ul className="p1-links">{models.map(model =>
        <li key={model.id}><Link to={`/modeling/${model.id}?${from}`}>{model.name}</Link></li>)}</ul>
        : <span className="p1-help">还没有关联模型。可以新建，也可以在实验室把已有模型关联到这个知识点。</span>}
    <Link className="p1-button" to={`/modeling?${from}`}>在实验室新建关联模型</Link>
  </section>
}
