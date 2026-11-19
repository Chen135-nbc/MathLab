import katex from 'katex'
import type { FormulaEntry } from './latexCatalog.ts'

export type FormulaMode = 'inline' | 'display'
export interface Selection { start: number; end: number }

export function replaceSelection(text: string, selection: Selection, insertion: string) {
  const start = Math.max(0, Math.min(selection.start, text.length))
  const end = Math.max(start, Math.min(selection.end, text.length))
  return { text: text.slice(0, start) + insertion + text.slice(end), caret: start + insertion.length }
}

export function markdownFormula(text: string, selection: Selection, source: string, mode: FormulaMode) {
  const formula = source.trim()
  if (!formula) throw new Error('请先输入公式。')
  // The assistant accepts TeX math only; dollar delimiters would break Markdown math boundaries.
  if (formula.includes('$')) throw new Error('助手里只需输入公式本身，请移除 $ 分隔符。')
  const before = text.slice(0, selection.start)
  const after = text.slice(selection.end)
  if (mode === 'inline') {
    if (formula.includes('\n')) throw new Error('行内公式请写在一行，或切换为独立公式。')
    return '$' + formula + '$'
  }
  const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''
  const suffix = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : ''
  return prefix + '$$\n' + formula + '\n$$' + suffix
}

export function renderFormula(source: string, mode: FormulaMode) {
  if (!source.trim()) return { html: '', error: '' }
  if (source.length > 5000) return { html: '', error: '公式最多支持 5000 个字符，请分成几段输入。' }
  try {
    if (source.includes('$')) throw new Error('只需输入公式本身，请移除 $ 分隔符。')
    const html = katex.renderToString(source, { displayMode: mode === 'display', throwOnError: true,
      trust: false, strict: 'error', maxExpand: 200, maxSize: 20 })
    return { html, error: '' }
  } catch (error) {
    if (!(error instanceof katex.ParseError)) return { html: '', error: (error as Error).message }
    const message = error.message
    const position = error.position
    const at = Number.isFinite(position) ? `（第 ${position + 1} 个字符附近）` : ''
    const reason = /Expected '}'|Unexpected end/.test(message) ? '公式可能还没写完，请检查花括号、括号或环境是否成对关闭。'
      : /Undefined control sequence/.test(message) ? '存在无法识别的命令，请检查反斜杠后的拼写，或查阅手册。'
        : /Too many expansions/.test(message) ? '命令展开次数过多，请简化公式。'
          : /Expected.*\\end|environment|begin/.test(message) ? '请检查 begin 与 end 的环境名称和括号是否对应。'
            : 'KaTeX 暂时无法解析这段内容，请检查命令和括号。'
    return { html: '', error: reason + at }
  }
}

export function searchCatalog(entries: FormulaEntry[], query: string): FormulaEntry[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return entries
  const tokens = normalized.split(/\s+/)
  return entries.filter(entry => {
    const words = [entry.name, ...entry.aliases].map(word => word.toLowerCase())
    const commands = [...entry.latex.matchAll(/\\([a-zA-Z]+)/g)].map(match => match[1].toLowerCase())
    return tokens.every(token => {
      if (/^[\\a-z]+$/.test(token)) return [...words, ...commands].includes(token.replace(/^\\/, ''))
      return words.some(word => word.includes(token))
    })
  })
}
