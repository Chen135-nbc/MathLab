import { useRef, useState } from 'react'
import type { MapDocument } from './types'
import { editMap, mapHistory, travelMap } from './history'

export function useMapHistory(initial: MapDocument) {
  const [state, setState] = useState(() => mapHistory(initial))
  const current = useRef(state)
  current.current = state
  const edit = (next: MapDocument, history = true) => {
    current.current = editMap(current.current, next, history)
    setState(current.current)
  }
  const reset = (next: MapDocument) => { current.current = mapHistory(next); setState(current.current) }
  const travel = (redo: boolean) => {
    current.current = travelMap(current.current, redo)
    setState(current.current)
  }
  return { document: state.present, edit, reset, travel, canUndo: state.past.length > 0, canRedo: state.future.length > 0 }
}
