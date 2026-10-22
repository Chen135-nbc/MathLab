import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { ArrowLeft, BookOpen, Check, Clock3, FilePenLine, Link2, Save, Sigma } from 'lucide-react'
import { api } from '../../services/api'
import { rememberPoint } from '../../app/useRecent'
import { ErrorState, Loading } from '../../components/States'
import type { LearningStatus, PointDetail } from '../../types/knowledge'

const statusOptions: { value: LearningStatus; label: string }[] = [
  { value: 'not_started', label: '未开始' }, { value: 'learning', label: '学习中' },
  { value: 'learned', label: '已学习' }, { value: 'review', label: '待复习' },
]

export function PointPage() {
  const { pointId = '' } = useParams()
  const [point, setPoint] = useState<PointDetail | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => { setPoint(null); setError(''); api.point(pointId).then(data => { setPoint(data); setNote(data.note); rememberPoint({ id: data.id, title: data.title, chapter: data.chapter_title }) }).catch(err => setError(String(err.message))) }, [pointId])
  const save = async () => { if (!point) return; setSaving(true); setNotice(''); try { const next = await api.note(point.id, note); setPoint(next); setNotice('笔记已保存到本地') } catch (err) { setNotice(String((err as Error).message)) } finally { setSaving(false) } }
  const changeStatus = async (status: LearningStatus) => { if (!point) return; setStatusBusy(true); setNotice(''); try { setPoint(await api.status(point.id, status)); setNotice('学习状态已保存') } catch (err) { setNotice(String((err as Error).message)) } finally { setStatusBusy(false) } }
  if (error) return <div className="page-width"><ErrorState message={error}/><Link className="back-link" to="/knowledge">返回知识库</Link></div>
  if (!point) return <div className="page-width"><Loading label="正在读取知识点…"/></div>
  return <div className="page-width point-page"><Link to="/knowledge" className="back-link"><ArrowLeft size={16}/> 返回知识库</Link><div className="point-heading"><div><div className="eyebrow">KNOWLEDGE NOTE / {point.id}</div><h1>{point.title}</h1><p>{point.volume_title} <span>·</span> {point.chapter_title} <span>·</span> {point.section_title}</p></div><span className="kind-badge">{point.kind}</span></div>
    <div className="point-grid"><div className="point-main"><section className="panel information-panel"><div className="panel-heading"><div><span className="panel-kicker">OVERVIEW</span><h2>基本信息</h2></div><BookOpen className="muted-icon" size={19}/></div><div className="info-grid"><div><span>知识 ID</span><strong>{point.id}</strong></div><div><span>知识类型</span><strong>{point.kind}</strong></div><div><span>所属章节</span><strong>{point.chapter_title}</strong></div><div><span>所属小节</span><strong>{point.section_title}</strong></div></div></section>
      {point.formula && <section className="panel formula-panel"><div className="panel-heading"><div><span className="panel-kicker">MATHEMATICS</span><h2>相关记号</h2></div><Sigma className="muted-icon" size={19}/></div><div className="formula-content"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{`$$${point.formula}$$`}</ReactMarkdown></div></section>}
      <section className="panel note-panel"><div className="panel-heading"><div><span className="panel-kicker">PERSONAL NOTES</span><h2>个人理解与补充</h2></div><FilePenLine className="muted-icon" size={19}/></div><p className="field-help">支持 Markdown 与 LaTeX。行内公式用 <code>$...$</code>，独立公式用 <code>$$...$$</code>。</p><textarea aria-label="个人知识笔记" value={note} onChange={event => { setNote(event.target.value); setNotice('') }} placeholder={'在这里写下你的理解、例子或易错点…\n\n例如：$A \\subseteq B$ 表示 A 是 B 的子集。'} rows={10} maxLength={100000}/><div className="editor-footer"><span>{note.length.toLocaleString()} 字符 {point.note_updated_at && <><span className="footer-separator">·</span> 上次保存 {new Date(point.note_updated_at).toLocaleString('zh-CN')}</>}</span><button className="primary-button" onClick={save} disabled={saving || note === point.note}><Save size={16}/>{saving ? '保存中…' : '保存笔记'}</button></div>{notice && <div className="inline-notice" role="status"><Check size={15}/>{notice}</div>}</section>
      {point.note && <section className="panel preview-panel"><div className="panel-heading"><div><span className="panel-kicker">PREVIEW</span><h2>笔记预览</h2></div></div><div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{point.note}</ReactMarkdown></div></section>}
    </div><aside className="point-aside"><section className="panel progress-panel"><div className="panel-heading"><div><span className="panel-kicker">LEARNING PROGRESS</span><h2>学习状态</h2></div><Clock3 className="muted-icon" size={19}/></div><p>记录当前学习进度，不代表能力掌握评价。</p><div className="status-options">{statusOptions.map(option => <button key={option.value} disabled={statusBusy} className={`status-option ${point.status === option.value ? 'chosen' : ''}`} onClick={() => changeStatus(option.value)}><span className="status-radio"/>{option.label}{point.status === option.value && <Check size={15}/>}</button>)}</div></section><section className="panel future-panel"><div className="panel-heading"><div><span className="panel-kicker">COMING LATER</span><h2>知识关联</h2></div><Link2 className="muted-icon" size={18}/></div><p>未来将连接相关知识、数学模型、题型与能力证据。</p></section></aside></div>
  </div>
}
