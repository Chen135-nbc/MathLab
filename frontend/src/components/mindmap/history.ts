import type { MapDocument } from './types.ts'

export interface MapHistory { present: MapDocument; past: MapDocument[]; future: MapDocument[] }
export function mapHistory(document: MapDocument): MapHistory { return { present: document, past: [], future: [] } }
export function editMap(state: MapHistory, next: MapDocument, track = true): MapHistory {
  if (JSON.stringify(state.present) === JSON.stringify(next)) return state
  return { present: next, past: track ? [...state.past.slice(-49), state.present] : state.past,
    future: track ? [] : state.future }
}
export function travelMap(state: MapHistory, redo: boolean): MapHistory {
  const source = redo ? state.future : state.past
  const next = source.at(-1)
  if (!next) return state
  return redo ? { present: next, past: [...state.past, state.present], future: source.slice(0, -1) }
    : { present: next, past: source.slice(0, -1), future: [...state.future, state.present] }
}
