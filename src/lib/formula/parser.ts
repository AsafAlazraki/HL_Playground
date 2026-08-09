/* ============================================================
   Formula engine — Pratt (precedence-climbing) parser.

   Binding powers, loosest → tightest:
     1  OR
     2  AND
     4  comparisons  = <> < <= > >=   (NON-chaining: a<b<c is an error)
     5  &  text concatenation
     6  +  -
     7  *  /  %
     9  ^  (RIGHT-associative: 2^3^2 = 2^(3^2) = 512)

   Prefix operators:
     NOT      operand parsed at bp 4  → NOT a = b  ≡  NOT (a = b)
     - / +    operand parsed at bp 8  → binds tighter than * but
              looser than ^, so -2^2 = -(2^2) = -4 (math convention)
              and -a * b = (-a) * b.
   ============================================================ */

import {
  FormulaError,
  posLabel,
  type BinaryOp,
  type Expr,
} from './ast'
import { tokenize, type Token } from './tokens'
import { FORMULA_FUNCTIONS } from './functions'

const COMPARISONS = new Set(['=', '<>', '<', '<=', '>', '>='])

interface Infix {
  lbp: number // left binding power — may we consume this op at the current level?
  rbp: number // min binding power for the right-hand operand
}

const INFIX: Record<string, Infix> = {
  OR: { lbp: 1, rbp: 2 },
  AND: { lbp: 2, rbp: 3 },
  '=': { lbp: 4, rbp: 5 },
  '<>': { lbp: 4, rbp: 5 },
  '<': { lbp: 4, rbp: 5 },
  '<=': { lbp: 4, rbp: 5 },
  '>': { lbp: 4, rbp: 5 },
  '>=': { lbp: 4, rbp: 5 },
  '&': { lbp: 5, rbp: 6 },
  '+': { lbp: 6, rbp: 7 },
  '-': { lbp: 6, rbp: 7 },
  '*': { lbp: 7, rbp: 8 },
  '/': { lbp: 7, rbp: 8 },
  '%': { lbp: 7, rbp: 8 },
  '^': { lbp: 9, rbp: 9 }, // rbp === lbp → right-associative
}

const PREFIX_SIGN_BP = 8
const PREFIX_NOT_BP = 4

/** Infix key for a token, or null when the token is not a binary op.
 *  AND / OR arrive as identifier tokens. */
function infixKey(t: Token): string | null {
  if (t.type === 'op') return t.text
  if (t.type === 'ident') {
    const u = t.text.toUpperCase()
    if (u === 'AND' || u === 'OR') return u
  }
  return null
}

function arityText(min: number, max: number | null): string {
  if (max === null) return `at least ${min}`
  if (min === max) return `${min}`
  return `${min}–${max}`
}

/** Parse formula source into an AST. Throws FormulaError with a
 *  position-carrying, human-readable message on any problem. */
export function parse(src: string): Expr {
  if (!src.trim()) throw new FormulaError('Formula is empty')
  const tokens = tokenize(src)
  let i = 0

  const peek = (): Token => tokens[i]
  const next = (): Token => tokens[i++]

  function unexpected(t: Token): never {
    if (t.type === 'eof') {
      throw new FormulaError('Formula ends unexpectedly — a value is missing', t.pos)
    }
    throw new FormulaError(`Unexpected token '${t.text}' at ${posLabel(t.pos)}`, t.pos)
  }

  function expectRParen(openerLabel: string, openPos: number): void {
    const t = peek()
    if (t.type === 'rparen') {
      i += 1
      return
    }
    if (t.type === 'eof') {
      throw new FormulaError(
        `Missing ')' to close ${openerLabel} at ${posLabel(openPos)}`,
        t.pos,
      )
    }
    throw new FormulaError(
      `Unexpected token '${t.text}' at ${posLabel(t.pos)} — expected ')'`,
      t.pos,
    )
  }

  function parseCall(nameToken: Token): Expr {
    const name = nameToken.text.toUpperCase()
    next() // consume '('
    const args: Expr[] = []
    if (peek().type !== 'rparen') {
      for (;;) {
        args.push(parseExpression(0))
        if (peek().type === 'comma') {
          next()
          continue
        }
        break
      }
    }
    expectRParen(`${name}(`, nameToken.pos)
    const meta = FORMULA_FUNCTIONS[name]
    if (!meta) {
      throw new FormulaError(`Unknown function ${name}`, nameToken.pos)
    }
    if (args.length < meta.minArgs || (meta.maxArgs !== null && args.length > meta.maxArgs)) {
      throw new FormulaError(
        `${name} expects ${arityText(meta.minArgs, meta.maxArgs)} argument${
          meta.maxArgs === 1 ? '' : 's'
        }, got ${args.length}`,
        nameToken.pos,
      )
    }
    return { kind: 'call', name, args, pos: nameToken.pos }
  }

  function parsePrefix(): Expr {
    const t = next()
    switch (t.type) {
      case 'number':
        return { kind: 'num', value: t.value ?? 0, pos: t.pos }
      case 'string':
        return { kind: 'str', value: t.text, pos: t.pos }
      case 'field':
        return { kind: 'field', name: t.text, pos: t.pos }
      case 'lparen': {
        const inner = parseExpression(0)
        expectRParen("the '('", t.pos)
        return inner
      }
      case 'op': {
        if (t.text === '-' || t.text === '+') {
          const operand = parseExpression(PREFIX_SIGN_BP)
          return { kind: 'unary', op: t.text, operand, pos: t.pos }
        }
        return unexpected(t)
      }
      case 'ident': {
        const u = t.text.toUpperCase()
        if (u === 'TRUE') return { kind: 'bool', value: true, pos: t.pos }
        if (u === 'FALSE') return { kind: 'bool', value: false, pos: t.pos }
        if (u === 'NOT') {
          const operand = parseExpression(PREFIX_NOT_BP)
          return { kind: 'unary', op: 'NOT', operand, pos: t.pos }
        }
        if (peek().type === 'lparen') return parseCall(t)
        if (FORMULA_FUNCTIONS[u]) {
          throw new FormulaError(
            `${u} needs parentheses — write ${FORMULA_FUNCTIONS[u].signature}`,
            t.pos,
          )
        }
        throw new FormulaError(
          `Unknown name '${t.text}' at ${posLabel(t.pos)} — to reference a field, write [${t.text}]`,
          t.pos,
        )
      }
      default:
        return unexpected(t)
    }
  }

  function parseExpression(minBp: number): Expr {
    let left = parsePrefix()
    for (;;) {
      const t = peek()
      const key = infixKey(t)
      if (!key) break
      const info = INFIX[key]
      if (info.lbp < minBp) break
      next()
      const right = parseExpression(info.rbp)
      left = { kind: 'binary', op: key as BinaryOp, left, right, pos: t.pos }
      // comparisons do not chain: catch `a < b < c` right here
      if (COMPARISONS.has(key)) {
        const after = infixKey(peek())
        if (after && COMPARISONS.has(after)) {
          throw new FormulaError(
            `Comparisons cannot be chained at ${posLabel(peek().pos)} — combine them with AND(…)`,
            peek().pos,
          )
        }
      }
    }
    return left
  }

  const expr = parseExpression(0)
  const tail = peek()
  if (tail.type !== 'eof') {
    throw new FormulaError(
      `Unexpected token '${tail.text}' at ${posLabel(tail.pos)}`,
      tail.pos,
    )
  }
  return expr
}
