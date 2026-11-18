import type { Parameter } from '../../types/studio'
import { clamp } from './plot'
import { isParameterName } from './expression'

interface Props {
  parameters: Parameter[]
  missing: string[]
  onChange: (value: Parameter[]) => void
}

export function parameterProblem(parameters: Parameter[]) {
  const names = parameters.map(p => p.name)
  if (names.some(name => !isParameterName(name))) return '参数名须为小写字母开头的标识符，且不能与变量、函数或常量重名。'
  if (new Set(names).size !== names.length) return '参数名不能重复。'
  if (parameters.some(p => ![p.min, p.max, p.value].every(n => Number.isFinite(n) && Math.abs(n) <= 1e6) ||
    p.min >= p.max || p.value < p.min || p.value > p.max || !Number.isFinite(p.step) || p.step < 1e-8 || p.step > p.max - p.min)) {
    return '请检查各参数的最小值、最大值、当前值和步长。'
  }
  return ''
}

export function ParameterEditor({ parameters, missing, onChange }: Props) {
  const update = (index: number, patch: Partial<Parameter>) => onChange(parameters.map((p, i) => i === index ? { ...p, ...patch } : p))
  const add = (requested?: string) => {
    const name = requested ?? ['a', 'b', 'c', ...Array.from({ length: 12 }, (_, i) => 'p' + (i + 1))]
      .find(candidate => !parameters.some(p => p.name === candidate))
    if (name && parameters.length < 12) onChange([...parameters, { name, value: 1, min: -5, max: 5, step: 0.1 }])
  }
  return <div className="p1-stack">
    <div className="p1-toolbar"><h3>参数滑块</h3><button className="p1-button" type="button" onClick={() => add()} disabled={parameters.length >= 12}>添加参数</button></div>
    {missing.length > 0 && <div className="p1-toolbar">
      <span className="p1-help">表达式中还没有定义：</span>
      {missing.map(name => <button type="button" className="p1-button" key={name} onClick={() => add(name)} disabled={parameters.length >= 12}>添加 {name}</button>)}
    </div>}
    {parameters.map((parameter, index) => {
      const { min, max, value, step } = parameter
      const valid = [min, max, value, step].every(Number.isFinite) && min < max && step >= 1e-8 && step <= max - min
      return <fieldset className="p1-language-card" key={index}>
        <legend>参数 {index + 1}</legend>
        <div className="p1-toolbar"><label>变量名<input value={parameter.name} maxLength={16} onChange={e => update(index, { name: e.target.value })}/></label>
          <button type="button" className="text-button" onClick={() => onChange(parameters.filter((_, i) => i !== index))}>从草稿移除</button></div>
        <label>调整 {parameter.name || '参数'} <input type="range" disabled={!valid} min={valid ? min : -5} max={valid ? max : 5}
          step={valid ? step : 0.1} value={valid ? clamp(value, min, max) : 0} onChange={e => update(index, { value: e.target.valueAsNumber })}/></label>
        <div className="parameter-numbers">
          {([['value', '当前值'], ['min', '最小值'], ['max', '最大值'], ['step', '步长']] as const).map(([key, name]) =>
            <label key={key}>{name}<input type="number" step="any" value={Number.isFinite(parameter[key]) ? parameter[key] : ''}
              onChange={e => update(index, { [key]: e.target.valueAsNumber })}/></label>)}
        </div>
      </fieldset>
    })}
  </div>
}
