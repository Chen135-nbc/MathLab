import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LatexGuide } from './LatexGuide'
import { LatexPreview } from './LatexPreview'
import { latexCatalog, type FormulaEntry } from './latexCatalog'
import { renderFormula, replaceSelection, type FormulaMode, type Selection } from './formulaTools'

const toolbar = ['fraction', 'sqrt', 'scripts', 'brackets', 'greek', 'intersection', 'sum', 'vector', 'cases', 'parallel']

export function LatexAssistant({ onClose, onInsert, initialTab = 'editor', initialSelection = '' }: {
  onClose: () => void
  onInsert?: (latex: string, mode: FormulaMode) => void
  initialTab?: 'editor' | 'guide'
  initialSelection?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const editor = useRef<HTMLTextAreaElement>(null)
  const range = useRef<Selection>({ start: initialSelection.length, end: initialSelection.length })
  const pending = useRef<number | null>(null)
  const [tab, setTab] = useState(initialTab)
  const [source, setSource] = useState(initialSelection)
  const [mode, setMode] = useState<FormulaMode>('inline')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const result = useMemo(() => renderFormula(source, mode), [source, mode])
  const modeError = mode === 'inline' && source.includes('\n') ? '行内公式请写在一行，或切换为独立公式。' : ''
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  useLayoutEffect(() => {
    if (tab === 'editor' && pending.current !== null && editor.current) {
      editor.current.focus()
      editor.current.setSelectionRange(pending.current, pending.current)
      pending.current = null
    }
  }, [source, tab])
  const capture = () => {
    if (editor.current) range.current = { start: editor.current.selectionStart, end: editor.current.selectionEnd }
  }
  const template = (entry: FormulaEntry) => {
    capture()
    const next = replaceSelection(source, range.current, entry.latex)
    if (next.text.length > 5000) { setError('公式最多支持 5000 个字符。'); return }
    setSource(next.text)
    range.current = { start: next.caret, end: next.caret }
    pending.current = next.caret
    if (entry.mode) setMode(entry.mode)
    setTab('editor')
    setError('')
    setNotice('')
  }
  const insert = (latex = source, display = mode) => {
    try { onInsert?.(latex, display) } catch (err) { setError((err as Error).message) }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(source); setNotice('已复制公式代码。') }
    catch { setNotice('无法访问剪贴板，请在输入框中选中代码并手动复制。') }
  }
  return <dialog ref={dialog} className="latex-dialog" aria-labelledby="latex-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="latex-dialog-header"><div><h2 id="latex-title">Σ 数学公式助手</h2><p className="p1-help">查找、修改、预览，再放入你的笔记。</p></div>
      <button autoFocus className="p1-button" onClick={onClose} aria-label="关闭公式助手">关闭 · Esc</button></div>
    <div className="p1-segments" aria-label="助手工具">
      <button aria-pressed={tab === 'editor'} onClick={() => setTab('editor')}>公式编辑</button>
      <button aria-pressed={tab === 'guide'} onClick={() => setTab('guide')}>LaTeX 使用手册</button>
    </div>
    {tab === 'guide' ? <LatexGuide onTemplate={template} onInsert={onInsert ? entry => insert(entry.latex, entry.mode ?? mode) : undefined}/>
      : <section className="p1-stack latex-editor">
        <div className="latex-palette" aria-label="公式结构工具栏">{toolbar.map(id => {
          const entry = latexCatalog.find(item => item.id === id)!
          return <button key={id} className="p1-button" onMouseDown={event => event.preventDefault()} onClick={() => template(entry)}>{entry.name}</button>
        })}</div>
        <label>LaTeX 公式代码<textarea ref={editor} aria-label="LaTeX 公式代码" value={source} rows={6} maxLength={5000} spellCheck={false}
          onSelect={capture} onBlur={capture} onChange={e => { setSource(e.target.value); capture(); setError(''); setNotice('') }}
          placeholder={'例如：\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}'}/></label>
        <p className="p1-help">只输入公式本身，无需 $。工具栏和手册模板会插入当前光标位置，选中的代码会被替换。</p>
        <fieldset className="latex-mode"><legend>插入显示方式</legend>
          <label><input type="radio" name="formula-mode" checked={mode === 'inline'} onChange={() => setMode('inline')}/> 行内公式</label>
          <label><input type="radio" name="formula-mode" checked={mode === 'display'} onChange={() => setMode('display')}/> 独立公式</label>
        </fieldset>
        <LatexPreview source={source} mode={mode}/>
        {modeError && <p role="status" className="p1-error">{modeError}</p>}
        <div className="p1-toolbar"><button className="p1-button" onClick={() => void copy()} disabled={!source}>复制公式代码</button>
          {onInsert && <button className="primary-button" onClick={() => insert()} disabled={!source.trim() || !!result.error || !!modeError}>插入笔记</button>}</div>
      </section>}
    {error && <p className="p1-error" role="alert">{error}</p>}<p className="p1-help" role="status">{notice}</p>
    <p className="p1-help">关闭助手会保留笔记原稿；助手内未插入的公式草稿不会保存。</p>
  </dialog>
}
