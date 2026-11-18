import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

export function MathMarkdown({ text }: { text: string }) {
  return <div className="markdown-content"><ReactMarkdown
    remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}
    components={{
      a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer"/>,
      img: ({ alt }) => <span>{alt ? `[图片：${alt}]` : '[图片]'}</span>,
    }}
  >{text}</ReactMarkdown></div>
}
