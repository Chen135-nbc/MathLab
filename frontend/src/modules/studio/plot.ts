import type { GraphView } from '../../types/studio'
import type { ParsedExpression } from './expression'

export const WIDTH = 760
export const HEIGHT = 460
export const MAX_CENTER = 1e7
export const defaultView: GraphView = { x: 0, y: 0, scale: 50 }
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export function zoomView(view: GraphView, factor: number, px = WIDTH / 2, py = HEIGHT / 2): GraphView {
  const scale = clamp(view.scale * factor, 0.01, 10_000)
  const shift = 1 / view.scale - 1 / scale
  return {
    scale,
    x: clamp(view.x + (px - WIDTH / 2) * shift, -MAX_CENTER, MAX_CENTER),
    y: clamp(view.y - (py - HEIGHT / 2) * shift, -MAX_CENTER, MAX_CENTER),
  }
}

export function gridTicks(center: number, length: number, scale: number) {
  const target = 72 / scale
  const power = 10 ** Math.floor(Math.log10(target))
  const step = ([1, 2, 5, 10].find(multiplier => multiplier * power >= target) ?? 10) * power
  const first = Math.ceil((center - length / (2 * scale)) / step)
  const last = Math.floor((center + length / (2 * scale)) / step)
  return Array.from({ length: last - first + 1 }, (_, i) => {
    const value = (first + i) * step
    return { value, label: Number(value.toPrecision(12)).toString() }
  })
}

export function curvePath(expression: ParsedExpression, params: ReadonlyMap<string, number>, view: GraphView) {
  if (expression.variables.some(name => !params.has(name))) return ''
  const sample = (p: number) => {
    const world = view.x + (p - WIDTH / 2) / view.scale
    return HEIGHT / 2 - (expression.evaluate(world, params) - view.y) * view.scale
  }
  const usable = (y: number) => Number.isFinite(y) && Math.abs(y) < HEIGHT * 4
  let previous = NaN
  let path = ''
  for (let p = 0; p <= WIDTH; p++) {
    const y = sample(p)
    if (usable(y)) {
      const midpoint = usable(previous) ? sample(p - 0.5) : NaN
      const connected = usable(midpoint) && Math.abs(midpoint - (y + previous) / 2) < HEIGHT * 0.5
      path += `${connected ? 'L' : 'M'}${p},${y.toFixed(2)}`
    }
    previous = y
  }
  return path
}
