import { AlertCircle, LoaderCircle } from 'lucide-react'

export function Loading({ label = '正在加载…' }: { label?: string }) {
  return <div className="state-card"><LoaderCircle className="animate-spin" size={21}/><span>{label}</span></div>
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state-card error"><AlertCircle size={21}/><span>{message}</span>{retry && <button className="text-button" onClick={retry}>重试</button>}</div>
}
