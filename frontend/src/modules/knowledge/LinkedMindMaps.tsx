import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { api } from '../../services/api'

export function LinkedMindMaps({ pointId }: { pointId: string }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof api.pointMaps>> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api.pointMaps(pointId).then(data => { if (active) setItems(data) }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [pointId])
  return <section className="panel studio-panel p1-stack"><h2>关联思维导图</h2>
    {error ? <p role="alert">{error}</p> : items === null ? <p className="p1-help">正在读取…</p>
      : items.length ? <ul className="p1-links">{items.map(item => <li key={item.map_id + item.node_id}>
        <Link to={`/mindmaps/${item.map_id}?node=${encodeURIComponent(item.node_id)}`}>{item.map_title} · {item.node_title}</Link></li>)}</ul>
        : <p className="p1-help">尚未关联。可在 Mind Map 中选择节点并关联本知识卡。</p>}
  </section>
}
