import type { Selection } from './formulaTools.ts'

export interface EditSnapshot extends Selection { text: string }
export interface EditHistory { past: EditSnapshot[]; future: EditSnapshot[] }
export function recordEdit(history: EditHistory, before: EditSnapshot): EditHistory {
  return { past: [...history.past.slice(-99), before], future: [] }
}
export function travelHistory(history: EditHistory, current: EditSnapshot, redo: boolean) {
  const source = redo ? history.future : history.past
  const snapshot = source.at(-1)
  if (!snapshot) return null
  return { snapshot, history: redo
    ? { past: [...history.past, current], future: history.future.slice(0, -1) }
    : { past: history.past.slice(0, -1), future: [...history.future, current] } }
}
