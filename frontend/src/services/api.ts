import type { Chapter, LearningStatus, PointDetail, PointSummary, Volume } from '../types/knowledge'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try { response = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...options }) }
  catch { throw new Error('无法连接本地服务，请确认后端已启动。') }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(payload?.detail || `请求失败（${response.status}）`)
  }
  return response.json() as Promise<T>
}

export const api = {
  curriculum: () => request<Volume[]>('/curriculum'),
  chapter: (id: string) => request<Chapter>(`/chapters/${encodeURIComponent(id)}`),
  point: (id: string) => request<PointDetail>(`/knowledge/${encodeURIComponent(id)}`),
  search: (q: string) => request<PointSummary[]>(`/knowledge/search?q=${encodeURIComponent(q)}`),
  status: (id: string, status: LearningStatus) => request<PointDetail>(`/knowledge/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  note: (id: string, content: string) => request<PointDetail>(`/knowledge/${encodeURIComponent(id)}/note`, { method: 'PUT', body: JSON.stringify({ content }) }),
}
