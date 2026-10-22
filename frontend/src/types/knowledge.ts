export type LearningStatus = 'not_started' | 'learning' | 'learned' | 'review'
export interface PointSummary { id: string; title: string; kind: string; sort_order: number }
export interface Section { id: string; title: string; sort_order: number; knowledge_points: PointSummary[] }
export interface Chapter { id: string; title: string; sort_order: number; verified: boolean; sections: Section[] }
export interface Volume { id: string; title: string; sort_order: number; chapters: Chapter[] }
export interface PointDetail {
  id: string; title: string; kind: string; formula: string | null
  section_id: string; section_title: string; chapter_id: string; chapter_title: string; volume_title: string
  status: LearningStatus; note: string; note_updated_at: string | null
}
