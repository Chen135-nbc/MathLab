import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseExpression } from '../src/modules/studio/expression.ts'
import { curvePath, defaultView, WIDTH, HEIGHT, zoomView } from '../src/modules/studio/plot.ts'

test('mathematical precedence, constants, function calls and parameter substitution', () => {
  const expression = parseExpression('y = -x^2 + 2^3^2 + a*sin(pi/2) + 1e-2')
  assert.deepEqual(expression.variables, ['a'])
  assert.ok(Math.abs(expression.evaluate(3, new Map([['a', 5]])) - 508.01) < 1e-9)
  assert.equal(parseExpression('2^-2').evaluate(0, new Map()), 0.25)
  const formula = parseExpression('a*x')
  assert.notEqual(curvePath(formula, new Map([['a', 1]]), defaultView), curvePath(formula, new Map([['a', 2]]), defaultView))
  assert.equal(curvePath(formula, new Map(), defaultView), '')
})

test('rejects syntax outside the math grammar and breaks the curve at a pole', () => {
  for (const input of ['globalThis.alert(1)', 'x;2', 'sin.constructor(1)', 'x=2', '2x', 'sqrt(', 'random(x)', '1e999']) {
    assert.throws(() => parseExpression(input), undefined, input)
  }
  assert.equal(curvePath(parseExpression('1/x'), new Map(), defaultView).match(/M/g).length, 2)
})

test('zoom keeps the pointer over the same world coordinates', () => {
  const x = 120
  const y = 160
  const next = zoomView(defaultView, 2, x, y)
  assert.equal(next.x + (x - WIDTH / 2) / next.scale, defaultView.x + (x - WIDTH / 2) / defaultView.scale)
  assert.equal(next.y - (y - HEIGHT / 2) / next.scale, defaultView.y - (y - HEIGHT / 2) / defaultView.scale)
})
