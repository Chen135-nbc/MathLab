export type LearningStatus = 'not_started' | 'learning' | 'learned' | 'review'
export type NoteCategory = 'basic' | 'extension' | 'preview' | 'research'
export interface LanguageEntry {
  language: 'zh' | 'en' | 'de'
  kind: 'term' | 'definition' | 'expression' | 'example'
  text: string
  source: string
}
export interface NoteProfile { category: NoteCategory; language_entries: LanguageEntry[] }
export interface PointSummary { id: string; title: string; kind: string; sort_order: number; description: string; archived: boolean; deleted: boolean }
export interface Section { id: string; title: string; sort_order: number; knowledge_points: PointSummary[] }
export interface Chapter { id: string; title: string; sort_order: number; verified: boolean; sections: Section[] }
export interface Volume { id: string; title: string; sort_order: number; chapters: Chapter[] }
export interface PointDetail {
  id: string; title: string; kind: string; formula: string | null
  section_id: string; section_title: string; chapter_id: string; chapter_title: string; volume_title: string
  status: LearningStatus; note: string; note_updated_at: string | null
  note_profile: NoteProfile
  sort_order: number
  description: string
  archived: boolean
  created_at: string | null
  updated_at: string | null
}

export interface PointWrite { title: string; description: string; section_id: string }
export interface SectionDetail extends Section {
  chapter_title: string
  volume_title: string
  content: string
  profile: NoteProfile
  updated_at: string | null
}
