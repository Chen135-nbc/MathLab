import { useLayoutEffect, useRef, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { recordEdit, travelHistory, type EditHistory, type EditSnapshot } from './editHistory'
import { replaceSelection, type Selection } from './formulaTools'

/** One history for both user typing and programmatic insertion into the controlled textarea. */
export function useNoteInsertion(content: string, onContent: (text: string) => void) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const selection = useRef<Selection>({ start: 0, end: 0 })
  const history = useRef<EditHistory>({ past: [], future: [] })
  const before = useRef<EditSnapshot | null>(null)
  const pending = useRef<Selection | null>(null)
  const value = useRef(content)
  const composing = useRef(false)

  const capture = () => {
    if (textarea.current) selection.current = { start: textarea.current.selectionStart, end: textarea.current.selectionEnd }
  }
  useLayoutEffect(() => {
    // External replacement (e.g. opening another note) must not retain stale history.
    if (content !== value.current) { history.current = { past: [], future: [] }; value.current = content }
    if (pending.current && textarea.current) {
      textarea.current.focus()
      textarea.current.setSelectionRange(pending.current.start, pending.current.end)
      selection.current = pending.current
      pending.current = null
    }
  }, [content])

  const commit = (text: string, caret: number) => {
    const current = { text: content, ...selection.current }
    history.current = recordEdit(history.current, current)
    value.current = text
    pending.current = { start: caret, end: caret }
    onContent(text)
  }
  const insert = (text: string, range = selection.current) => {
    const result = replaceSelection(content, range, text)
    if (result.text.length > 100000) throw new Error('插入后笔记超过 100000 字符，请缩短内容。')
    selection.current = range
    commit(result.text, result.caret)
  }
  const undo = (redo: boolean) => {
    capture()
    const result = travelHistory(history.current, { text: content, ...selection.current }, redo)
    if (!result) return
    history.current = result.history
    value.current = result.snapshot.text
    pending.current = result.snapshot
    onContent(result.snapshot.text)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (composing.current || event.nativeEvent.isComposing || event.altKey || !(event.metaKey || event.ctrlKey)) return
    const key = event.key.toLowerCase()
    if (key !== 'z' && key !== 'y') return
    event.preventDefault()
    undo(key === 'y' || event.shiftKey)
  }
  const onBeforeInput = (event: FormEvent<HTMLTextAreaElement>) => {
    capture()
    const input = event.nativeEvent as InputEvent
    if (input.inputType === 'historyUndo' || input.inputType === 'historyRedo') {
      event.preventDefault()
      undo(input.inputType === 'historyRedo')
    } else before.current = { text: content, ...selection.current }
  }
  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    history.current = recordEdit(history.current, before.current ?? { text: content, ...selection.current })
    before.current = null
    value.current = event.target.value
    onContent(event.target.value)
    capture()
  }
  return { textarea, selection, capture, insert, onKeyDown, onBeforeInput, onChange,
    onCompositionStart: () => { composing.current = true }, onCompositionEnd: () => { composing.current = false } }
}
