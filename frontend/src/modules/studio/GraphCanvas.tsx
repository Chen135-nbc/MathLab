import { useEffect, useMemo, useRef, type PointerEvent } from 'react'
import type { GraphView, Parameter } from '../../types/studio'
import type { ParsedExpression } from './expression'
import { clamp, curvePath, defaultView, gridTicks, HEIGHT, MAX_CENTER, WIDTH, zoomView } from './plot'

interface Props {
  view: GraphView
  onView: (value: GraphView) => void
  parsed: ParsedExpression | null
  parameters: Parameter[]
}

export function GraphCanvas({ view, onView, parsed, parameters }: Props) {
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ id: number; x: number; y: number; view: GraphView; width: number; height: number } | null>(null)
  const path = useMemo(() => parsed ? curvePath(parsed, new Map(parameters.map(p => [p.name, p.value])), view) : '',
    [parsed, parameters, view])

  useEffect(() => {
    const node = svg.current
    if (!node) return
    const zoom = (event: WheelEvent) => {
      event.preventDefault()
      const rect = node.getBoundingClientRect()
      onView(zoomView(view, Math.exp(clamp(-event.deltaY * (event.deltaMode ? 0.035 : 0.002), -1, 1)),
        (event.clientX - rect.left) / rect.width * WIDTH, (event.clientY - rect.top) / rect.height * HEIGHT))
    }
    node.addEventListener('wheel', zoom, { passive: false })
    return () => node.removeEventListener('wheel', zoom)
  }, [view, onView])

  const start = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || drag.current) return
    const { width, height } = event.currentTarget.getBoundingClientRect()
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, view, width, height }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: PointerEvent<SVGSVGElement>) => {
    const start = drag.current
    if (!start || start.id !== event.pointerId) return
    onView({
      ...start.view,
      x: clamp(start.view.x - (event.clientX - start.x) / start.width * WIDTH / start.view.scale, -MAX_CENTER, MAX_CENTER),
      y: clamp(start.view.y + (event.clientY - start.y) / start.height * HEIGHT / start.view.scale, -MAX_CENTER, MAX_CENTER),
    })
  }
  const end = (event: PointerEvent<SVGSVGElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null
  }

  const xp = (x: number) => WIDTH / 2 + (x - view.x) * view.scale
  const yp = (y: number) => HEIGHT / 2 - (y - view.y) * view.scale
  const x0 = xp(0)
  const y0 = yp(0)
  return <div className="p1-stack">
    <div className="p1-toolbar graph-controls">
      <div><h2>二维坐标系</h2><p className="p1-help">拖动平移 · 滚轮缩放 · 聚焦图像后可用方向键</p></div>
      <div className="p1-segments">
        <button type="button" aria-label="缩小图像" onClick={() => onView(zoomView(view, 1 / 1.4))}>−</button>
        <button type="button" aria-label="放大图像" onClick={() => onView(zoomView(view, 1.4))}>＋</button>
        <button type="button" onClick={() => onView(defaultView)}>重置视图</button>
      </div>
    </div>
    <svg ref={svg} className="studio-graph" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" tabIndex={0}
      aria-label="函数图像与直角坐标系" onPointerDown={start} onPointerMove={move} onPointerUp={end}
      onPointerCancel={end} onLostPointerCapture={end} onKeyDown={e => {
        const dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
        const dy = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0
        if (!dx && !dy) return
        e.preventDefault()
        onView({ ...view, x: clamp(view.x + dx * 40 / view.scale, -MAX_CENTER, MAX_CENTER),
          y: clamp(view.y + dy * 40 / view.scale, -MAX_CENTER, MAX_CENTER) })
      }}>
      {gridTicks(view.x, WIDTH, view.scale).map(({ value, label }) => <g key={value}>
        <line className="graph-gridline" x1={xp(value)} x2={xp(value)} y1={0} y2={HEIGHT}/>
        <text x={xp(value) + 4} y={clamp(y0 + 17, 16, HEIGHT - 8)}>{label}</text>
      </g>)}
      {gridTicks(view.y, HEIGHT, view.scale).map(({ value, label }) => <g key={value}>
        <line className="graph-gridline" x1={0} x2={WIDTH} y1={yp(value)} y2={yp(value)}/>
        {value !== 0 && <text x={clamp(x0 + 6, 6, WIDTH - 68)} y={clamp(yp(value) - 5, 14, HEIGHT - 8)}>{label}</text>}
      </g>)}
      {x0 >= 0 && x0 <= WIDTH && <line className="graph-axis" x1={x0} x2={x0} y1={0} y2={HEIGHT}/>}
      {y0 >= 0 && y0 <= HEIGHT && <line className="graph-axis" x1={0} x2={WIDTH} y1={y0} y2={y0}/>}
      <text className="graph-axis-label" x={WIDTH - 20} y={clamp(y0 - 9, 16, HEIGHT - 8)}>x</text>
      <text className="graph-axis-label" x={clamp(x0 + 7, 6, WIDTH - 15)} y={17}>y</text>
      <path className="graph-curve" d={path}/>
    </svg>
    {parsed && !path && <p className="p1-help">当前视图中没有可绘制的曲线。试试缩放、平移或调整参数。</p>}
  </div>
}
