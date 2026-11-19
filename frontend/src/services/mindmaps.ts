import { request } from './api'
import type { MapDocument, MapSummary, SavedMap } from '../components/mindmap/types'
import type { PointWrite } from '../types/knowledge'
import { documentDraft } from '../components/mindmap/tree'

export const mindmaps = {
  list: () => request<MapSummary[]>('/mindmaps'),
  read: (id: string) => request<SavedMap>(`/mindmaps/${encodeURIComponent(id)}`),
  save: (document: MapDocument, id?: string) => request<SavedMap>(id ? `/mindmaps/${encodeURIComponent(id)}` : '/mindmaps', {
    method: id ? 'PUT' : 'POST', body: JSON.stringify(documentDraft(document)),
  }),
  import: (document: MapDocument) => request<SavedMap>('/mindmaps/import', { method: 'POST', body: JSON.stringify(documentDraft(document)) }),
  duplicate: (id: string) => request<SavedMap>(`/mindmaps/${encodeURIComponent(id)}/duplicate`, { method: 'POST' }),
  remove: (id: string, revision: number) => request<{ deleted: string }>(`/mindmaps/${encodeURIComponent(id)}`, {
    method: 'DELETE', body: JSON.stringify({ confirm: true, revision }),
  }),
  promote: (id: string, nodeId: string, payload: PointWrite & { include_notes: boolean; revision: number }) =>
    request<{ point_id: string; map: SavedMap }>(`/mindmaps/${encodeURIComponent(id)}/nodes/${encodeURIComponent(nodeId)}/knowledge`, {
      method: 'POST', body: JSON.stringify(payload),
    }),
}
