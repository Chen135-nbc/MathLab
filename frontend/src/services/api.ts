import type { Chapter, LearningStatus, NoteProfile, PointDetail, PointSummary, PointWrite, SectionDetail, Volume } from '../types/knowledge'
import type { ModelDetail, ModelDraft, ModelSummary } from '../types/studio'

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try { response = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...options }) }
  catch { throw new Error('无法连接本地服务，请确认后端已启动。') }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: unknown } | null
    const detail = payload?.detail
    throw new Error(typeof detail === 'string' ? detail : response.status === 422 ? '保存失败，请检查必填项、长度和数值范围。' : `请求失败（${response.status}）`)
  }
  return response.json() as Promise<T>
}

export const api = {
  section: (id: string) => request<SectionDetail>(`/sections/${encodeURIComponent(id)}`),
  sectionNote: (id: string, content: string, profile: NoteProfile) => request<SectionDetail>(`/sections/${encodeURIComponent(id)}/note`, {
    method: 'PUT', body: JSON.stringify({ content, profile }),
  }),
  reorderPoints: (sectionId: string, point_ids: string[]) => request<SectionDetail>(`/sections/${encodeURIComponent(sectionId)}/order`, {
    method: 'PUT', body: JSON.stringify({ point_ids }),
  }),
  createPoint: (payload: PointWrite) => request<PointDetail>('/knowledge', { method: 'POST', body: JSON.stringify(payload) }),
  managePoint: (id: string, payload: PointWrite & { archived: boolean }) => request<PointDetail>(`/knowledge/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify(payload),
  }),
  deletePoint: (id: string) => request<{ deleted: string }>(`/knowledge/${encodeURIComponent(id)}?confirm=true`, { method: 'DELETE' }),
  pointMaps: (id: string) => request<{ map_id: string; map_title: string; node_id: string; node_title: string }[]>(`/knowledge/${encodeURIComponent(id)}/mindmaps`),
  curriculum: () => request<Volume[]>('/curriculum'),
  chapter: (id: string) => request<Chapter>(`/chapters/${encodeURIComponent(id)}`),
  point: (id: string) => request<PointDetail>(`/knowledge/${encodeURIComponent(id)}`),
  search: (q: string) => request<PointSummary[]>(`/knowledge/search?q=${encodeURIComponent(q)}`),
  status: (id: string, status: LearningStatus) => request<PointDetail>(`/knowledge/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  note: (id: string, content: string, profile: NoteProfile) => request<PointDetail>(`/knowledge/${encodeURIComponent(id)}/note`, { method: 'PUT', body: JSON.stringify({ content, profile }) }),
  models: (pointId?: string) => request<ModelSummary[]>(pointId ? `/models?point_id=${encodeURIComponent(pointId)}` : '/models'),
  model: (id: string) => request<ModelDetail>(`/models/${encodeURIComponent(id)}`),
  saveModel: (model: ModelDraft, id?: string) => request<ModelDetail>(id ? `/models/${encodeURIComponent(id)}` : '/models', {
    method: id ? 'PUT' : 'POST', body: JSON.stringify(model),
  }),
}
