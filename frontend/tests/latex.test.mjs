import { test } from 'node:test'
import assert from 'node:assert/strict'
import { latexCatalog, categories } from '../src/modules/knowledge/latex/latexCatalog.ts'
import { markdownFormula, renderFormula, replaceSelection, searchCatalog } from '../src/modules/knowledge/latex/formulaTools.ts'
import { recordEdit, travelHistory } from '../src/modules/knowledge/latex/editHistory.ts'

test('56 catalog entries and examples render with installed KaTeX in both modes', () => {
  assert.equal(latexCatalog.length, 56)
  assert.equal(new Set(latexCatalog.map(e => e.id)).size, latexCatalog.length)
  for (const [category] of categories) assert.ok(latexCatalog.some(e => e.category === category))
  for (const entry of latexCatalog) {
    assert.ok(entry.name && entry.description && entry.aliases.length)
    for (const mode of ['inline', 'display']) for (const key of ['latex', 'example']) {
      const result = renderFormula(entry[key], mode)
      assert.equal(result.error, '', entry.id + ': ' + result.error)
      assert.ok(result.html.includes('katex'))
    }
  }
})

test('Chinese names, aliases, English terms, and exact command search', () => {
  for (const [query, id] of [['交集', 'intersection'], ['根号', 'sqrt'], ['向量', 'vector'], ['垂直', 'parallel'],
    ['元素属于', 'membership'], ['in', 'membership'], ['\\cap', 'intersection'], ['sqrt', 'sqrt'], ['fraction', 'fraction']]) {
    assert.ok(searchCatalog(latexCatalog, query).some(e => e.id === id), query)
  }
  assert.ok(!searchCatalog(latexCatalog, 'in').some(e => e.id === 'trig'))
  assert.ok(searchCatalog(latexCatalog, 'sin').every(e => /\\sin\b/.test(e.latex)))
  assert.equal(searchCatalog(latexCatalog, '不存在的条目').length, 0)
})

test('replaces only selected text and preserves Chinese, emoji, and surrounding Markdown', () => {
  const text = '前🙂待替换后'
  const range = { start: text.indexOf('待'), end: text.indexOf('后') }
  const wrapped = markdownFormula(text, range, '\\sqrt{x}', 'inline')
  const inserted = replaceSelection(text, range, wrapped)
  assert.equal(inserted.text, '前🙂$\\sqrt{x}$后')
  assert.equal(inserted.caret, '前🙂$\\sqrt{x}$'.length)
  assert.equal(replaceSelection('ab', { start: 1, end: 1 }, 'X').text, 'aXb')
  assert.equal(replaceSelection('ab', { start: 0, end: 0 }, 'X').text, 'Xab')
  assert.equal(replaceSelection('ab', { start: 2, end: 2 }, 'X').text, 'abX')
})

test('display wrappers preserve paragraph boundaries without duplicate newlines', () => {
  const range = { start: 1, end: 1 }
  const middle = markdownFormula('甲乙', range, 'x^2', 'display')
  assert.equal(replaceSelection('甲乙', range, middle).text, '甲\n\n$$\nx^2\n$$\n\n乙')
  const text = '甲\n\n乙'
  assert.equal(markdownFormula(text, { start: 3, end: 3 }, 'x', 'display'), '$$\nx\n$$\n\n')
  assert.equal(markdownFormula('', { start: 0, end: 0 }, 'x', 'display'), '$$\nx\n$$')
  assert.throws(() => markdownFormula('', { start: 0, end: 0 }, '$x$', 'inline'), /分隔符/)
  assert.throws(() => markdownFormula('', { start: 0, end: 0 }, 'x\ny', 'inline'), /一行/)
})

test('undo and redo restore formula insertion, selection, and surrounding edits', () => {
  const before = { text: '前替换后', start: 1, end: 3 }
  const change = replaceSelection(before.text, before, '$x$')
  const current = { text: change.text, start: change.caret, end: change.caret }
  const history = recordEdit({ past: [], future: [] }, before)
  const undo = travelHistory(history, current, false)
  assert.deepEqual(undo.snapshot, before)
  const redo = travelHistory(undo.history, undo.snapshot, true)
  assert.deepEqual(redo.snapshot, current)
  assert.equal(recordEdit(undo.history, before).future.length, 0)
  assert.equal(travelHistory({ past: [], future: [] }, before, false), null)
})

test('invalid input gives recoverable messages and untrusted HTML commands never execute', () => {
  const incomplete = renderFormula('\\frac{a}{', 'inline')
  assert.match(incomplete.error, /花括号|写完/)
  assert.match(renderFormula('\\nosuchcommand{x}', 'inline').error, /命令/)
  assert.match(renderFormula('$x$', 'inline').error, /分隔符/)
  assert.ok(renderFormula('\\htmlClass{evil}{x}', 'inline').error)
  const link = renderFormula('\\href{javascript:alert(1)}{x}', 'inline')
  assert.ok(link.error || !link.html.includes('href='))
  assert.ok(renderFormula('\\def\\a{\\a}\\a', 'inline').error)
  assert.equal(renderFormula('\\frac{a}{b}', 'inline').error, '')
})

test('inserted inline and display wrappers are parsed as actual Markdown math nodes', async () => {
  const { unified } = await import('unified')
  const { default: remarkParse } = await import('remark-parse')
  const { default: remarkMath } = await import('remark-math')
  const processor = unified().use(remarkParse).use(remarkMath)
  const findMath = node => [
    ...(['math', 'inlineMath'].includes(node.type) ? [node] : []),
    ...(node.children ?? []).flatMap(findMath),
  ]
  for (const entry of latexCatalog) for (const mode of ['inline', 'display']) {
    const text = '前文后文'
    const range = { start: 2, end: 2 }
    const insertion = markdownFormula(text, range, entry.latex, mode)
    const markdown = replaceSelection(text, range, insertion).text
    const maths = findMath(processor.parse(markdown))
    assert.equal(maths.length, 1, entry.id + ': ' + markdown)
    assert.equal(maths[0].value, entry.latex)
  }
})
