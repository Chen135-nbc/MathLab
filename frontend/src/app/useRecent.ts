import { useEffect, useState } from 'react'

export interface RecentPoint { id: string; title: string; chapter: string }
const KEY = 'mathlab-recent-v1'

export function readRecent(): RecentPoint[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as RecentPoint[] }
  catch { return [] }
}

export function useRecent() {
  const [recent, setRecent] = useState<RecentPoint[]>(readRecent)
  useEffect(() => {
    const sync = () => setRecent(readRecent())
    window.addEventListener('mathlab-recent', sync)
    return () => window.removeEventListener('mathlab-recent', sync)
  }, [])
  return recent
}

export function rememberPoint(point: RecentPoint) {
  localStorage.setItem(KEY, JSON.stringify([point, ...readRecent().filter(item => item.id !== point.id)].slice(0, 5)))
  window.dispatchEvent(new Event('mathlab-recent'))
}
