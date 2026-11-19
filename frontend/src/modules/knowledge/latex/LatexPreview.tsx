import { useMemo } from 'react'
import { renderFormula, type FormulaMode } from './formulaTools'

export function LatexPreview({ source, mode = 'display' }: { source: string; mode?: FormulaMode }) {
  const result = useMemo(() => renderFormula(source, mode), [source, mode])
  // Only KaTeX's trusted renderer output reaches HTML, never the input string.
  return <div className="latex-preview" aria-label="公式渲染效果">
    {result.error ? <p className="p1-error" role="status">{result.error}</p>
      : result.html ? <div dangerouslySetInnerHTML={{ __html: result.html }}/>
        : <p className="p1-help">输入公式后，这里会显示渲染结果。</p>}
  </div>
}
