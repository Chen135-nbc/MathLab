import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { BookOpen, Search } from 'lucide-react'
import { api } from '../../services/api'
import type { PointSummary, Volume } from '../../types/knowledge'
import { CurriculumTree } from './CurriculumTree'
import { Loading, ErrorState } from '../../components/States'
import { LatexAssistant } from './latex/LatexAssistant'
import './latex/latex.css'

export function KnowledgePage() {
  const [guideOpen, setGuideOpen] = useState(false)
  const [volumes, setVolumes] = useState<Volume[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PointSummary[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const load = () => { setError(''); api.curriculum().then(setVolumes).catch(err => setError(err.message)) }
  useEffect(load, [])
  useEffect(() => {
    let active = true
    setResults(null); setSearchError('')
    if (!query.trim()) { setSearching(false); return }
    setSearching(true)
    const timer = window.setTimeout(() => {
      api.search(query.trim()).then(data => { if (active) setResults(data) })
        .catch(err => { if (active) setSearchError(err.message) })
        .finally(() => { if (active) setSearching(false) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query])
  const sections = useMemo(() => volumes?.flatMap(v => v.chapters.flatMap(c => c.sections.map(s => ({ ...s, volume: v.title, chapter: c.title })))) ?? [], [volumes])
  return <div className="page-width p1-stack">
    <div className="page-heading"><div><div className="eyebrow">数学笔记工作台</div><h1>Math Notes</h1><p>教材提供章节框架，在理解中建立自己的知识卡。</p></div><div className="heading-icon"><BookOpen size={25}/></div></div>
    <div className="p1-toolbar"><button className="p1-button" onClick={() => setGuideOpen(true)}>LaTeX 使用手册</button>
      <span className="p1-help">点击小节名称，记录自由笔记或新建知识点。</span></div>
    {guideOpen && <LatexAssistant initialTab="guide" onClose={() => setGuideOpen(false)}/>}
    <div className="search-box"><Search size={19}/><input aria-label="搜索知识点名称" placeholder="搜索个人知识点（包含归档项）" value={query} onChange={event => setQuery(event.target.value)}/></div>
    {error ? <ErrorState message={error} retry={load}/> : !volumes ? <Loading/> : <div className="knowledge-grid">
      <section className="panel tree-panel"><div className="panel-heading"><h2>教材目录</h2><span className="soft-pill">{volumes.length} 册</span></div><CurriculumTree volumes={volumes}/></section>
      <section className="panel overview-panel p1-stack">
        {query.trim() ? <><h2>搜索结果</h2>{searchError ? <ErrorState message={searchError}/> : searching ? <Loading label="正在搜索…"/>
          : results?.length ? <ul className="p1-links">{results.map(point => <li key={point.id}><Link to={`/knowledge/${point.id}`}>{point.title}{point.archived && '（已归档）'}</Link></li>)}</ul>
            : <p className="p1-help">没有找到匹配的知识点。可以在课程小节中创建。</p>}</>
          : <><h2>选择小节，自由整理</h2><p className="p1-help">先写疑问、推导或资料，再把成熟的想法整理为知识点。旧知识点和笔记继续保留。</p>
            <ul className="p1-links">{sections.map(section => <li key={section.id}><Link to={`/sections/${section.id}`}>{section.title}</Link>
              <p className="p1-help">{section.volume} · {section.chapter}</p></li>)}</ul>
            <p className="p1-help">当前教材框架有 18 章，已核入的小节仅第一章的 3 节。其余小节待按实际教材补齐。</p></>}
      </section>
    </div>}
  </div>
}
