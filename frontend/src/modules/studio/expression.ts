type Scope = ReadonlyMap<string, number>
type Evaluate = (x: number, parameters: Scope) => number

const functions = new Map<string, (n: number) => number>([
  ['sin', Math.sin], ['cos', Math.cos], ['tan', Math.tan], ['asin', Math.asin], ['acos', Math.acos],
  ['atan', Math.atan], ['sqrt', Math.sqrt], ['abs', Math.abs], ['exp', Math.exp],
  ['ln', Math.log], ['log', Math.log10], ['floor', Math.floor], ['ceil', Math.ceil],
])
const constants = new Map([['pi', Math.PI], ['e', Math.E]])
const allowedName = /^[a-z][a-z0-9_]{0,15}$/

export const isParameterName = (name: string) =>
  allowedName.test(name) && name !== 'x' && name !== 'y' && !functions.has(name) && !constants.has(name)

export interface ParsedExpression {
  evaluate: Evaluate
  variables: string[]
}

/** Parses only the math grammar below. Evaluation never resolves object properties or executes source text. */
export function parseExpression(source: string): ParsedExpression {
  if (source.length > 500) throw new Error('表达式最多 500 个字符。')
  const input = source.trim().replace(/^y\s*=\s*/, '')
  const scanner = /\s+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[a-z][a-z0-9_]*|[()+\-*/^]/gy
  const tokens: string[] = []
  while (scanner.lastIndex < input.length) {
    const at = scanner.lastIndex
    const match = scanner.exec(input)
    if (!match) throw new Error(`无法识别第 ${at + 1} 个字符：${input[at]}`)
    if (match[0].trim()) tokens.push(match[0])
  }
  if (tokens.length > 220) throw new Error('表达式过长，请拆成更简单的形式。')

  let cursor = 0
  const variables = new Set<string>()
  const peek = () => tokens[cursor]
  const take = (text: string) => {
    if (peek() !== text) return false
    cursor++
    return true
  }
  const expectClose = () => { if (!take(')')) throw new Error('缺少右括号。') }

  const atom = (): Evaluate => {
    if (take('(')) {
      const result = sum()
      expectClose()
      return result
    }
    const token = tokens[cursor++]
    if (token && /^[\d.]/.test(token)) {
      const number = Number(token)
      if (!Number.isFinite(number)) throw new Error('数字超出支持的范围。')
      return () => number
    }
    if (token === 'x') return x => x
    const constant = constants.get(token)
    if (constant !== undefined) return () => constant
    const fn = functions.get(token)
    if (fn) {
      if (!take('(')) throw new Error(`请为 ${token} 添加括号。`)
      const argument = sum()
      expectClose()
      return (x, scope) => fn(argument(x, scope))
    }
    if (token && isParameterName(token)) {
      if (peek() === '(') throw new Error(`不支持函数 ${token}；乘法请写成 *。`)
      variables.add(token)
      return (_x, scope) => scope.get(token) ?? NaN
    }
    throw new Error('请在运算符后输入数字、变量或函数。')
  }

  const power = (): Evaluate => {
    const base = atom()
    if (!take('^')) return base
    const exponent = signed()
    return (x, scope) => base(x, scope) ** exponent(x, scope)
  }
  const signed = (): Evaluate => {
    if (take('+')) return signed()
    if (!take('-')) return power()
    const value = signed()
    return (x, scope) => -value(x, scope)
  }
  const product = (): Evaluate => {
    let current = signed()
    while (peek() === '*' || peek() === '/') {
      const operator = tokens[cursor++]
      const left = current
      const right = signed()
      current = operator === '*' ? (x, scope) => left(x, scope) * right(x, scope)
        : (x, scope) => left(x, scope) / right(x, scope)
    }
    return current
  }
  const sum = (): Evaluate => {
    let current = product()
    while (peek() === '+' || peek() === '-') {
      const operator = tokens[cursor++]
      const left = current
      const right = product()
      current = operator === '+' ? (x, scope) => left(x, scope) + right(x, scope)
        : (x, scope) => left(x, scope) - right(x, scope)
    }
    return current
  }

  if (!tokens.length) throw new Error('请输入函数表达式。')
  const evaluate = sum()
  if (cursor !== tokens.length) throw new Error(`无法解析 ${peek()}；乘法请写成 *，检查括号是否成对。`)
  return { evaluate, variables: [...variables] }
}
