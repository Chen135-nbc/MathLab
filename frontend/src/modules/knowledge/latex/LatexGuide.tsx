import { useState } from 'react'
import { categories, latexCatalog, type Category, type FormulaEntry } from './latexCatalog'
import { searchCatalog } from './formulaTools'
import { LatexPreview } from './LatexPreview'

export function LatexGuide({ onTemplate, onInsert }: {
  onTemplate: (entry: FormulaEntry) => void
  onInsert?: (entry: FormulaEntry) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [selectedId, setSelectedId] = useState('fraction')
  const [feedback, setFeedback] = useState('')
  const filtered = searchCatalog(latexCatalog, query).filter(entry => category === 'all' || entry.category === category)
  const selected = filtered.find(entry => entry.id === selectedId) ?? filtered[0]
  const copy = async () => {
    if (!selected) return
    try {
      await navigator.clipboard.writeText(selected.latex)
      setFeedback('已复制原始 LaTeX 代码。')
    } catch { setFeedback('无法访问剪贴板，请选中下方代码并手动复制。') }
  }
  return <section className="latex-guide p1-stack" aria-label="LaTeX 使用手册">
    <label>查找符号或模板<input type="search" value={query} onChange={e => { setQuery(e.target.value); setCategory('all'); setFeedback('') }}
      placeholder="交集、根号、向量、垂直、sqrt…"/></label>
    <div className="latex-guide-layout">
      <nav aria-label="公式分类" className="latex-categories">
        <button aria-pressed={category === 'all'} onClick={() => setCategory('all')}>全部 · {latexCatalog.length}</button>
        {categories.map(([id, name]) => <button key={id} aria-pressed={category === id} onClick={() => { setCategory(id); setFeedback('') }}>{name}</button>)}
      </nav>
      <div className="latex-results" aria-label="匹配公式">
        <p className="p1-help">{filtered.length} 个条目</p>
        {filtered.map(entry => <button key={entry.id} className="latex-result" aria-pressed={selected?.id === entry.id}
          onClick={() => { setSelectedId(entry.id); setFeedback('') }}><strong>{entry.name}</strong><code>{entry.latex}</code></button>)}
        {!filtered.length && <p className="p1-help">没有找到。试试中文名称、别名或完整命令。</p>}
      </div>
      {selected && <article className="latex-detail p1-stack">
        <h3>{selected.name}</h3><LatexPreview source={selected.latex}/>
        <label>LaTeX 源代码<textarea aria-label="条目源代码" readOnly value={selected.latex} rows={3}/></label>
        <p className="p1-help">{selected.description}</p>
        <h4>高中数学示例</h4><code className="latex-code">{selected.example}</code><LatexPreview source={selected.example}/>
        <div className="p1-toolbar"><button className="p1-button" onClick={() => void copy()}>复制代码</button>
          <button className="p1-button" onClick={() => onTemplate(selected)}>放入公式编辑位置</button>
          {onInsert && <button className="primary-button" onClick={() => onInsert(selected)}>插入笔记</button>}</div>
        <p role="status" className="p1-help">{feedback}</p>
      </article>}
    </div>
  </section>
}
