import { useState } from 'react'
import { ChevronDown, ChevronRight, Circle, FileText } from 'lucide-react'
import { Link } from 'react-router'
import type { Volume } from '../../types/knowledge'

export function CurriculumTree({ volumes, activeId }: { volumes: Volume[]; activeId?: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ bx1: true, 'bx1-c01': true })
  const toggle = (key: string) => setOpen(current => ({ ...current, [key]: !current[key] }))
  return <div className="curriculum-tree">{volumes.map(volume => <div key={volume.id} className="tree-volume"><button className="tree-volume-button" onClick={() => toggle(volume.id)}>{open[volume.id] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}<span>{volume.title}</span><small>{volume.chapters.length}</small></button>{open[volume.id] && <div className="tree-chapters">{volume.chapters.map(chapter => <div key={chapter.id}><button className="tree-chapter-button" onClick={() => toggle(chapter.id)}>{open[chapter.id] ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}<span>{chapter.title}</span></button>{open[chapter.id] && <div className="tree-sections">{chapter.sections.length ? chapter.sections.map(section => <div key={section.id}><div className="tree-section-title"><FileText size={14}/>{section.title}</div>{section.knowledge_points.map(point => <Link key={point.id} to={`/knowledge/${point.id}`} className={`tree-point ${activeId === point.id ? 'selected' : ''}`}><Circle size={8}/><span>{point.title}</span></Link>)}</div>) : <div className="tree-empty">小节与知识点待核对</div>}</div>}</div>)}</div>}</div>)}</div>
}
