import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Heading, List, ListItem, Paragraph } from 'mdast'
import { MAX_BYTES, type MapDocument, type MapNode } from './types.ts'
import { documentDraft, newDocument, newNode, validateTree } from './tree.ts'

export function assertSize(text: string) {
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('文件不能超过 1 MB。')
}
const finiteRange = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const string = (value: unknown, max: number, required = false): value is string =>
  typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0)
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value)
function position(value: unknown): value is { x: number; y: number } {
  return object(value) && finiteRange(value.x, -1e6, 1e6) && finiteRange(value.y, -1e6, 1e6)
}

export function parseMapJSON(text: string): MapDocument {
  assertSize(text)
  let input: unknown
  try { input = JSON.parse(text.replace(/^\uFEFF/, '')) } catch { throw new Error('JSON 格式错误，请检查文件是否完整。') }
  if (!object(input) || input.format !== 'mathlab-mindmap' || input.version !== 1) throw new Error('只支持 MathLab 思维导图 JSON V1。')
  if (!string(input.title, 120, true) || !string(input.description, 4000) || input.layout !== 'right' ||
    !(input.section_id === null || string(input.section_id, 50, true)) ||
    !object(input.viewport) || !finiteRange(input.viewport.zoom, 0.01, 3) || !position(input.viewport) || !Array.isArray(input.nodes)) {
    throw new Error('导图的标题、课程关联或视图设置无效。')
  }
  for (const node of input.nodes) {
    if (!object(node) || !id(node.id) || !(node.parent_id === null || id(node.parent_id)) ||
      !string(node.title, 120, true) || !string(node.notes, 4000) ||
      !['navy', 'teal', 'amber', 'rose'].includes(String(node.color)) || typeof node.collapsed !== 'boolean' ||
      !(node.position === null || position(node.position)) || !(node.point_id === null || string(node.point_id, 60, true))) {
      throw new Error('导图节点字段无效，请检查标题、备注、位置和关联。')
    }
  }
  const result = documentDraft(input as unknown as MapDocument)
  result.revision = null
  validateTree(result.nodes)
  return result
}

export function parseMarkdown(text: string, title = '导入的大纲'): MapDocument {
  assertSize(text)
  text = text.replace(/^\uFEFF/, '')
  const ast = unified().use(remarkParse).parse(text)
  const nodes: MapNode[] = []
  const stack: { level: number; id: string }[] = []
  let currentHeading: string | null = null
  const content = (node: Heading | Paragraph) => {
    const start = node.children[0]?.position?.start.offset
    const end = node.children.at(-1)?.position?.end.offset
    const value = start === undefined || end === undefined ? '' : text.slice(start, end).replace(/\r?\n/g, ' ').trim()
    if (!value || value.length > 120) throw new Error('每个大纲节点需要 1—120 字符。')
    return value
  }
  const push = (parentId: string | null, value: string) => {
    if (nodes.length >= 299) throw new Error('导入大纲最多 299 个条目（另预留一个根节点）。')
    const node = newNode(parentId, value)
    nodes.push(node)
    return node
  }
  const list = (source: List, parentId: string | null, depth: number) => {
    if (depth > 24) throw new Error('大纲不能超过 24 层。')
    for (const item of source.children as ListItem[]) {
      const paragraph = item.children.find(child => child.type === 'paragraph')
      if (!paragraph) throw new Error('列表项必须有节点文字。')
      const node = push(parentId, content(paragraph))
      for (const child of item.children) {
        if (child.type === 'list') list(child, node.id, depth + 1)
        else if (child !== paragraph) throw new Error('仅支持标题或嵌套列表；请把额外内容整理到节点备注。')
      }
    }
  }
  for (const child of ast.children) {
    if (child.type === 'heading') {
      while (stack.length && stack.at(-1)!.level >= child.depth) stack.pop()
      const node = push(stack.at(-1)?.id ?? null, content(child))
      stack.push({ level: child.depth, id: node.id }); currentHeading = node.id
    } else if (child.type === 'list') list(child, currentHeading, 1)
    else throw new Error('仅支持 Markdown 标题和嵌套列表，图片或普通段落不能自动转成导图。')
  }
  if (!nodes.length) throw new Error('文件中没有标题或列表条目。')
  const roots = nodes.filter(node => node.parent_id === null)
  if (roots.length > 1) {
    const root = newNode(null, title.slice(0, 120) || '导入的大纲')
    nodes.forEach(node => { if (node.parent_id === null) node.parent_id = root.id })
    nodes.unshift(root)
  }
  validateTree(nodes)
  const map = newDocument()
  return { ...map, title: nodes.find(node => node.parent_id === null)!.title, nodes }
}

export function toMarkdown(map: MapDocument) {
  const lines: string[] = []
  const visit = (node: MapNode, depth: number) => {
    const title = node.title.replace(/\r?\n/g, ' ')
    lines.push(depth === 0 ? '# ' + title : '  '.repeat(depth - 1) + '- ' + title)
    if (depth === 0) lines.push('')
    map.nodes.filter(child => child.parent_id === node.id).forEach(child => visit(child, depth + 1))
  }
  const root = map.nodes.find(node => node.parent_id === null)
  if (root) visit(root, 0)
  return lines.join('\n') + '\n'
}
