import { useDeferredValue, useState } from 'react'
import { FilePenLine, Save } from 'lucide-react'
import { MathMarkdown } from '../../components/MathMarkdown'
import type { LanguageEntry, NoteCategory, NoteProfile, PointDetail } from '../../types/knowledge'

const categories: Record<NoteCategory, string> = { basic: '基础知识', extension: '拓展知识', preview: '进阶预览', research: '个人研究' }

interface Props {
  point: PointDetail
  content: string
  profile: NoteProfile
  onContent: (value: string) => void
  onProfile: (value: NoteProfile) => void
  onSave: () => void
  dirty: boolean
  saving: boolean
}

export function NoteEditor({ point, content, profile, onContent, onProfile, onSave, dirty, saving }: Props) {
  const [mode, setMode] = useState<'edit' | 'preview' | 'both'>('both')
  const preview = useDeferredValue(content)
  const entries = profile.language_entries
  const setEntries = (language_entries: LanguageEntry[]) => onProfile({ ...profile, language_entries })
  const update = (index: number, patch: Partial<LanguageEntry>) =>
    setEntries(entries.map((entry, i) => i === index ? { ...entry, ...patch } : entry))
  return <section className="panel note-panel p1-stack">
    <div className="panel-heading"><div><span className="panel-kicker">MATH NOTES</span><h2>知识笔记</h2></div><FilePenLine size={20}/></div>
    <div className="p1-toolbar">
      <label>内容分类 <select value={profile.category} onChange={e => onProfile({ ...profile, category: e.target.value as NoteCategory })}>
        {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <div className="p1-segments" aria-label="编辑视图">{([['edit', '编辑'], ['both', '并排'], ['preview', '预览']] as const).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}>{label}</button>)}</div>
    </div>
    <p className="p1-help">支持 Markdown 标题、列表、表格和链接。行内公式用 <code>$...$</code>；块公式的两行 <code>$$</code> 各自独占一行。</p>
    <div className={mode === 'both' ? 'p1-editor-split' : ''}>
      {mode !== 'preview' && <textarea aria-label="个人知识笔记" rows={14} value={content} maxLength={100000}
        onChange={e => onContent(e.target.value)} placeholder="写下你的证明、反例、应用，或读教材时想追问的问题。"/>}
      {mode !== 'edit' && <div className="p1-preview" aria-label="笔记预览">
        {preview.trim() ? <MathMarkdown text={preview}/> : <p className="p1-help">输入笔记后，这里会显示渲染结果。</p>}
      </div>}
    </div>
    <div className="p1-stack language-entries">
      <div className="p1-toolbar"><h3>多语言资料</h3><button className="p1-button" type="button" disabled={entries.length >= 50}
        onClick={() => setEntries([...entries, { language: 'en', kind: 'term', text: '', source: '' }])}>添加条目</button></div>
      {entries.length === 0 && <p className="p1-help">把不同教材中的术语、定义与例句收在同一个知识点下。</p>}
      {entries.map((entry, index) => <fieldset key={index} className="p1-language-card">
        <legend>条目 {index + 1}</legend>
        <div className="p1-toolbar">
          <label>语言 <select value={entry.language} onChange={e => update(index, { language: e.target.value as LanguageEntry['language'] })}>
            <option value="en">英文</option><option value="zh">中文</option><option value="de">德文</option>
          </select></label>
          <label>类型 <select value={entry.kind} onChange={e => update(index, { kind: e.target.value as LanguageEntry['kind'] })}>
            <option value="term">术语</option><option value="definition">定义</option><option value="expression">常见表达</option><option value="example">语料</option>
          </select></label>
          <button className="text-button" type="button" onClick={() => setEntries(entries.filter((_, i) => i !== index))}>从草稿移除</button>
        </div>
        <label>内容<textarea rows={3} maxLength={10000} value={entry.text} onChange={e => update(index, { text: e.target.value })}/></label>
        <label>来源<input value={entry.source} maxLength={1000} onChange={e => update(index, { source: e.target.value })}
          placeholder="书名、页码、链接或 NotebookLM 记录"/></label>
      </fieldset>)}
    </div>
    <div className="editor-footer"><span>{dirty ? '有未保存的修改' : '已同步'}{point.note_updated_at && ` · 上次保存 ${new Date(point.note_updated_at).toLocaleString('zh-CN')}`}</span>
      <button className="primary-button" onClick={onSave} disabled={saving || !dirty}><Save size={16}/>{saving ? '保存中…' : '保存笔记'}</button>
    </div>
  </section>
}
