import type { PointSummary } from './knowledge'

export interface Parameter { name: string; value: number; min: number; max: number; step: number }
export interface GraphView { x: number; y: number; scale: number }
export interface ModelDraft {
  name: string
  expression: string
  parameters: Parameter[]
  view: GraphView
  description: string
  point_ids: string[]
}
export interface ModelSummary { id: string; name: string; expression: string; updated_at: string }
export interface ModelDetail extends Omit<ModelDraft, 'point_ids'>, ModelSummary {
  created_at: string
  points: PointSummary[]
}
