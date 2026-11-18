import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, Boxes, Plus, Save } from 'lucide-react'
import { useUnsavedChanges } from '../../app/useUnsavedChanges'
import { Loading, ErrorState } from '../../components/States'
import { api } from '../../services/api'
import type { ModelDetail, ModelDraft, ModelSummary } from '../../types/studio'
import { parseExpression } from './expression'
import { GraphCanvas } from './GraphCanvas'
import { defaultView } from './plot'
import { ParameterEditor, parameterProblem } from './ParameterEditor'
import { PointPicker } from './PointPicker'

const originQuery = (pointId: string) => pointId ? '?' + new URLSearchParams({ point: pointId }).toString() : ''
const newDraft = (pointId: string): ModelDraft => ({
  name: '', expression: 'x^2', parameters: [], view: defaultView, description: '', point_ids: pointId ? [pointId] : [],
})
const toDraft = (model: ModelDetail): ModelDraft => ({
  name: model.name, expression: model.expression, parameters: model.parameters, view: model.view,
  description: model.description, point_ids: model.points.map(point => point.id),
})

export function StudioPage() {
  const { modelId } = useParams()
  const [query] = useSearchParams()
  const point = query.get('point') || ''
  return <StudioWorkspace key={JSON.stringify([modelId, point])} id={modelId} origin={point}/>
}

function StudioWorkspace({ id, origin }: { id?: string; origin: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [notice, setNotice] = useState(location.state?.created ? '模型已保存到本地。' : '')
  const [draft, setDraft] = useState(() => newDraft(origin))
  const [baseline, setBaseline] = useState(draft)
  const [saved, setSaved] = useState<ModelDetail | null>(null)
  const [library, setLibrary] = useState<ModelSummary[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [libraryError, setLibraryError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)
  useUnsavedChanges(dirty)

  useEffect(() => {
    let active = true
    api.models().then(models => { if (active) setLibrary(models) })
      .catch(err => { if (active) setLibraryError(err.message) })
    if (id) {
      api.model(id).then(model => {
        if (!active) return
        const initial = toDraft(model)
        setDraft(initial)
        setBaseline(initial)
        setSaved(model)
      }).catch(err => { if (active) setLoadError(err.message) })
    }
    return () => { active = false }
  }, [id, resetKey])

  const expression = useMemo(() => {
    try { return { parsed: parseExpression(draft.expression), error: '' } }
    catch (err) { return { parsed: null, error: (err as Error).message } }
  }, [draft.expression])
  const missing = expression.parsed?.variables.filter(name => !draft.parameters.some(p => p.name === name)) ?? []
  const parameterError = parameterProblem(draft.parameters)
  const query = originQuery(origin)

  const change = (patch: Partial<ModelDraft>) => {
    if (saving) return
    setDraft(current => ({ ...current, ...patch }))
    setNotice('')
    setError('')
  }

  const save = async () => {
    if (saving) return
    const message = !draft.name.trim() ? '请输入模型名称。'
      : expression.error || parameterError || (missing.length ? `请先添加参数：${missing.join('、')}` : '')
    if (message) { setError(message); return }
    setSaving(true)
    setNotice('')
    setError('')
    try {
      const model = await api.saveModel(draft, id)
      if (id) {
        const next = toDraft(model)
        setSaved(model)
        setDraft(next)
        setBaseline(next)
        setLibrary(current => current && [model, ...current.filter(item => item.id !== model.id)])
        setNotice('模型已保存到本地。')
      } else {
        navigate(`/modeling/${model.id}${query}`, { replace: true, state: { created: true } })
      }
    } catch (err) { setError((err as Error).message) }
    finally { setSaving(false) }
  }

  return <div className="page-width">
    {origin && <Link className="back-link" to={`/knowledge/${encodeURIComponent(origin)}`}><ArrowLeft size={16}/> 返回原知识点</Link>}
    <div className="page-heading"><div><div className="eyebrow">二维建模实验室</div><h1>Math Studio</h1>
      <p>输入你自己的函数，拖动参数，看图像如何变化。</p></div><div className="heading-icon"><Boxes size={25}/></div></div>
    <div className="studio-layout">
      <div className="p1-stack studio-main">
        {loadError ? <ErrorState message={loadError} retry={() => { setLoadError(''); setResetKey(k => k + 1) }}/>
          : id && !saved ? <Loading label="正在打开模型…"/> : <>
          <section className="panel studio-panel p1-stack">
            <div className="p1-toolbar"><div><span className="panel-kicker">{saved ? '正在编辑' : '新建模型'}</span><h2>{saved?.name || '未命名模型'}</h2></div>
              <button className="primary-button" type="button" onClick={save} disabled={saving || (!!id && !dirty)}>
                <Save size={16}/>{saving ? '保存中…' : '保存模型'}</button></div>
            <div className="p1-save-status" role={error ? 'alert' : 'status'}>
              {error ? <span className="p1-error">{error}</span> : notice || (dirty ? '有未保存的修改' : saved ? '已同步' : '模型尚未保存')}
            </div>
            <fieldset disabled={saving} className="p1-stack">
              <label>模型名称<input value={draft.name} maxLength={120} placeholder="例如：正弦曲线的振幅"
                onChange={e => change({ name: e.target.value })}/></label>
              <label>函数表达式<input className="expression-input" value={draft.expression} maxLength={500} spellCheck={false}
                onChange={e => change({ expression: e.target.value })} placeholder="例如：a*sin(x) + b"/></label>
            </fieldset>
            {expression.error && <p className="p1-error" role="alert">{expression.error}</p>}
            <details className="p1-help"><summary>表达式写法</summary><p>使用 x 作自变量，乘法写成 *，幂写成 ^。例如 a*sin(x)+b、
              1/(x-2)、sqrt(x)；可用 pi 和 e。三角函数用弧度，ln 为自然对数，log 为常用对数。</p></details>
            <GraphCanvas parsed={parameterError || missing.length ? null : expression.parsed} parameters={draft.parameters}
              view={draft.view} onView={view => change({ view })}/>
          </section>
          <section className="panel studio-panel"><fieldset disabled={saving} className="p1-stack">
            <ParameterEditor parameters={draft.parameters} missing={missing} onChange={parameters => change({ parameters })}/>
            {parameterError && <p role="alert" className="p1-error">{parameterError}</p>}
            <label>模型说明<textarea rows={4} maxLength={20000} value={draft.description}
              onChange={e => change({ description: e.target.value })} placeholder="这个模型研究什么？你改变了哪些条件？"/></label>
            <PointPicker ids={draft.point_ids} onChange={point_ids => change({ point_ids })}/>
            {saved && <p className="p1-help">创建于 {new Date(saved.created_at).toLocaleString('zh-CN')} · 更新于 {new Date(saved.updated_at).toLocaleString('zh-CN')}</p>}
          </fieldset></section>
        </>}
      </div>
      <aside className="panel studio-panel p1-stack">
        <div className="p1-toolbar"><h2>模型库</h2>{id ? <Link className="p1-button" to={`/modeling${query}`}><Plus size={15}/> 新建</Link>
          : <button className="p1-button" type="button" disabled={!dirty || saving} onClick={() => {
            if (!window.confirm('要清空当前尚未保存的模型草稿吗？')) return
            const initial = newDraft(origin)
            setDraft(initial); setBaseline(initial); setError(''); setNotice('')
          }}><Plus size={15}/> 新建</button>}</div>
        {libraryError ? <ErrorState message={libraryError} retry={() => {
          setLibraryError('')
          api.models().then(setLibrary).catch(err => setLibraryError(err.message))
        }}/> : library === null ? <p className="p1-help">正在读取…</p>
          : library.length ? <ul className="p1-links model-library">{library.map(model => <li key={model.id}>
            <Link aria-current={id === model.id ? 'page' : undefined} to={`/modeling/${model.id}${query}`}>
              <strong>{model.name}</strong><code>{model.expression}</code>
            </Link></li>)}</ul> : <p className="p1-help">保存第一个模型后，可在这里重新打开。</p>}
      </aside>
    </div>
  </div>
}
