import type { Chapter, LearningStatus, NoteProfile, PointDetail, PointSummary, Volume } from '../types/knowledge'
import type { ModelDetail, ModelDraft, ModelSummary } from '../types/studio'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
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
