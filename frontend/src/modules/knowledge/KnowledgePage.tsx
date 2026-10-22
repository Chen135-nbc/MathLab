import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, BookOpen, Database, Search } from 'lucide-react'
import { api } from '../../services/api'
import type { PointSummary, Volume } from '../../types/knowledge'
import { CurriculumTree } from './CurriculumTree'
import { Loading, ErrorState } from '../../components/States'

export function KnowledgePage() {
  const [volumes, setVolumes] = useState<Volume[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PointSummary[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const load = () => { setError(''); api.curriculum().then(setVolumes).catch(err => setError(String(err.message))) }
  useEffect(load, [])
  useEffect(() => {
    if (!query.trim()) { setResults(null); setSearchError(''); setSearching(false); return }
    const timer = window.setTimeout(() => { setSearching(true); setSearchError(''); api.search(query.trim()).then(setResults).catch(err => setSearchError(String(err.message))).finally(() => setSearching(false)) }, 250)
    return () => window.clearTimeout(timer)
  }, [query])
  const counts = useMemo(() => ({ chapters: volumes?.reduce((sum, v) => sum + v.chapters.length, 0) || 0, points: volumes?.flatMap(v => v.chapters).flatMap(c => c.sections).reduce((sum, s) => sum + s.knowledge_points.length, 0) || 0 }), [volumes])
  return <div className="page-width"><div className="page-heading"><div><div className="eyebrow">KNOWLEDGE LIBRARY</div><h1>数学知识库</h1><p>沿教材脉络整理概念，沉淀你自己的数学理解。</p></div><div className="heading-icon"><BookOpen size={25}/></div></div>
    <div className="knowledge-summary"><div><span>课程体系</span><strong>人教 A 版 · 高中数学</strong></div><div><span>教材册次</span><strong>{volumes?.length ?? '—'} <small>册</small></strong></div><div><span>章节</span><strong>{volumes ? counts.chapters : '—'} <small>章</small></strong></div><div><span>已录入知识点</span><strong>{volumes ? counts.points : '—'} <small>个</small></strong></div></div>
    <div className="search-box"><Search size={19}/><input aria-label="搜索知识点名称" placeholder="搜索知识点名称，例如：集合、子集…" value={query} onChange={event => setQuery(event.target.value)}/><kbd>知识点</kbd></div>
    {error ? <ErrorState message={error} retry={load}/> : !volumes ? <Loading label="正在读取课程目录…"/> : <div className="knowledge-grid"><section className="panel tree-panel"><div className="panel-heading"><div><span className="panel-kicker">CURRICULUM</span><h2>教材目录</h2></div><span className="soft-pill">{counts.chapters} 章</span></div><CurriculumTree volumes={volumes}/></section><section className="panel overview-panel"><div className="panel-heading"><div><span className="panel-kicker">EXPLORE</span><h2>{query.trim() ? '搜索结果' : '开始探索'}</h2></div><Database size={19} className="muted-icon"/></div>{query.trim() ? searchError ? <ErrorState message={searchError}/> : searching ? <Loading label="正在搜索…"/> : results?.length ? <div className="result-list">{results.map(point => <Link to={`/knowledge/${point.id}`} key={point.id} className="result-item"><span className="result-icon"><BookOpen size={17}/></span><span><strong>{point.title}</strong><small>{point.kind} · {point.id}</small></span><ArrowRight size={17}/></Link>)}</div> : <div className="empty-panel">没有找到相关知识点。当前仅录入第一章的少量基础节点。</div> : <><div className="intro-card"><div className="intro-symbol">∈</div><div><span className="intro-label">从这里开始</span><h3>集合与元素</h3><p>从集合的基本语言开始，建立你的第一张知识卡片。</p><Link to="/knowledge/ks-bx1-001" className="primary-link">打开知识点 <ArrowRight size={16}/></Link></div></div><div className="source-note"><span className="note-dot"/><p>课程大纲原始文档尚未提供。当前已建立 5 册、18 章的暂定框架；仅第一章部分小节和知识点可用，其余内容待核对补充。</p></div></>}</section></div>}
  </div>
}
