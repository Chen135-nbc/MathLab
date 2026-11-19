export interface MapPosition { x: number; y: number }
export interface MapViewport extends MapPosition { zoom: number }
export interface MapNode {
  id: string
  parent_id: string | null
  title: string
  notes: string
  color: 'navy' | 'teal' | 'amber' | 'rose'
  collapsed: boolean
  position: MapPosition | null
  point_id: string | null
}
export interface MapDocument {
  format: 'mathlab-mindmap'
  version: 1
  title: string
  description: string
  section_id: string | null
  layout: 'right'
  viewport: MapViewport
  nodes: MapNode[]
  revision: number | null
}
export interface SavedMap extends MapDocument {
  id: string
  revision: number
  created_at: string
  updated_at: string
}
export interface MapSummary { id: string; title: string; section_id: string | null; revision: number; updated_at: string }
export const MAX_NODES = 300
export const MAX_DEPTH = 24
export const MAX_BYTES = 1_048_576
