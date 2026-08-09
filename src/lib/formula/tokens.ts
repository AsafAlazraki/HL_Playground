/* ============================================================
   Formula engine — tokenizer.
   Turns raw source into a flat token stream. Whitespace-blind.
   Understands: numbers, 'single'/"double" strings (doubling the
   quote escapes it: "a""b" → a"b), [Field] references (doubling
   ']]' inside escapes a literal ']': [Amount [USD]]] → the field
   named "Amount [USD]"), bare
   identifiers (functions + TRUE/FALSE/AND/OR/NOT keywords), and
   the operator set  ^ * / % + - & = <> != < <= > >= ( ) ,
   `!=` and `==` are accepted as friendly aliases and normalized
   to '<>' and '=' so the parser only ever sees canonical ops.
   ============================================================ */

import { FormulaError, posLabel } from './ast'

export type TokenType =
  | 'number'
  | 'string'
  | 'field'
  | 'ident'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'eof'

export interface Token {
  type: TokenType
  /** canonical text: operator symbol, identifier as typed, trimmed
   *  field name, decoded string value, or the number's source text */
  text: string
  /** parsed value — number tokens only */
  value?: number
  /** 0-based index of the token's first character in the source */
  pos: number
}

const isDigit = (c: string): boolean => c >= '0' && c <= '9'
const isIdentStart = (c: string): boolean =>
  (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'
const isIdentPart = (c: string): boolean => isIdentStart(c) || isDigit(c)

/** Tokenize `src`; throws FormulaError on any lexical problem. */
export function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const n = src.length

  while (i < n) {
    const c = src[i]

    /* whitespace */
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i += 1
      continue
    }

    /* numbers: 12, 12.5, .5, 1. */
    if (isDigit(c) || (c === '.' && i + 1 < n && isDigit(src[i + 1]))) {
      const start = i
      while (i < n && isDigit(src[i])) i += 1
      if (i < n && src[i] === '.') {
        i += 1
        while (i < n && isDigit(src[i])) i += 1
      }
      const text = src.slice(start, i)
      tokens.push({ type: 'number', text, value: parseFloat(text), pos: start })
      continue
    }

    /* strings — single or double quoted; doubled quote = literal quote */
    if (c === '"' || c === "'") {
      const quote = c
      const start = i
      i += 1
      let value = ''
      let closed = false
      while (i < n) {
        if (src[i] === quote) {
          if (i + 1 < n && src[i + 1] === quote) {
            value += quote
            i += 2
            continue
          }
          i += 1
          closed = true
          break
        }
        value += src[i]
        i += 1
      }
      if (!closed) {
        throw new FormulaError(
          `Unterminated text — missing closing ${quote} for the quote at ${posLabel(start)}`,
          start,
        )
      }
      tokens.push({ type: 'string', text: value, pos: start })
      continue
    }

    /* [Field Name] references — a doubled ']]' is a literal ']' in
       the name (mirrors string quote-doubling), so a field named
       "Amount [USD]" is referenceable as [Amount [USD]]]. A lone
       ']' could never legally follow a field close before, so this
       cannot change the meaning of any previously valid formula. */
    if (c === '[') {
      const start = i
      i += 1
      let name = ''
      let closed = false
      while (i < n) {
        if (src[i] === ']') {
          if (i + 1 < n && src[i + 1] === ']') {
            name += ']'
            i += 2
            continue
          }
          i += 1
          closed = true
          break
        }
        name += src[i]
        i += 1
      }
      if (!closed) {
        throw new FormulaError(
          `Missing ']' for the field reference at ${posLabel(start)}`,
          start,
        )
      }
      name = name.trim()
      if (!name) {
        throw new FormulaError(
          `Empty field reference [] at ${posLabel(start)}`,
          start,
        )
      }
      tokens.push({ type: 'field', text: name, pos: start })
      continue
    }

    /* identifiers / keywords */
    if (isIdentStart(c)) {
      const start = i
      while (i < n && isIdentPart(src[i])) i += 1
      tokens.push({ type: 'ident', text: src.slice(start, i), pos: start })
      continue
    }

    /* two-character operators first */
    const two = src.slice(i, i + 2)
    if (two === '<>' || two === '<=' || two === '>=' || two === '!=' || two === '==') {
      const text = two === '!=' ? '<>' : two === '==' ? '=' : two
      tokens.push({ type: 'op', text, pos: i })
      i += 2
      continue
    }

    /* single-character tokens */
    if (c === '(') {
      tokens.push({ type: 'lparen', text: '(', pos: i })
      i += 1
      continue
    }
    if (c === ')') {
      tokens.push({ type: 'rparen', text: ')', pos: i })
      i += 1
      continue
    }
    if (c === ',') {
      tokens.push({ type: 'comma', text: ',', pos: i })
      i += 1
      continue
    }
    if ('^*/%+-&=<>'.includes(c)) {
      tokens.push({ type: 'op', text: c, pos: i })
      i += 1
      continue
    }

    throw new FormulaError(`Unexpected character '${c}' at ${posLabel(i)}`, i)
  }

  tokens.push({ type: 'eof', text: '', pos: n })
  return tokens
}
