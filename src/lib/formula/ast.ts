/* ============================================================
   Formula engine — AST node shapes + the shared error type.
   Pure data; no React, no store. Positions are 0-based source
   indices; every human-facing message reports them 1-based via
   posLabel() so "position 12" means the 12th character typed.
   ============================================================ */

/** Thrown by the tokenizer/parser (with a position) and by the
 *  evaluator (usually without one). `message` is always a complete,
 *  human-readable sentence — safe to show in the designer verbatim. */
export class FormulaError extends Error {
  readonly pos: number | null

  constructor(message: string, pos: number | null = null) {
    super(message)
    this.name = 'FormulaError'
    this.pos = pos
  }
}

/** 1-based, human-readable position label for error messages. */
export const posLabel = (pos: number): string => `position ${pos + 1}`

/* ---------------------------------------------------------- */
/* Node shapes                                                */
/* ---------------------------------------------------------- */

export type BinaryOp =
  | '^'
  | '*'
  | '/'
  | '%'
  | '+'
  | '-'
  | '&'
  | '='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'AND'
  | 'OR'

export type UnaryOp = '-' | '+' | 'NOT'

export interface NumExpr {
  kind: 'num'
  value: number
  pos: number
}

export interface StrExpr {
  kind: 'str'
  value: string
  pos: number
}

export interface BoolExpr {
  kind: 'bool'
  value: boolean
  pos: number
}

/** `[Field Name]` — name is stored as written (trimmed); matching
 *  against the entity's fields is case-insensitive. */
export interface FieldExpr {
  kind: 'field'
  name: string
  pos: number
}

export interface UnaryExpr {
  kind: 'unary'
  op: UnaryOp
  operand: Expr
  pos: number
}

export interface BinaryExpr {
  kind: 'binary'
  op: BinaryOp
  left: Expr
  right: Expr
  pos: number
}

/** Function call — `name` is normalized to UPPERCASE by the parser. */
export interface CallExpr {
  kind: 'call'
  name: string
  args: Expr[]
  pos: number
}

export type Expr =
  | NumExpr
  | StrExpr
  | BoolExpr
  | FieldExpr
  | UnaryExpr
  | BinaryExpr
  | CallExpr

/* ---------------------------------------------------------- */
/* Walkers                                                    */
/* ---------------------------------------------------------- */

/** Visit every `[Field]` reference in source order. */
export function walkFieldRefs(
  expr: Expr,
  visit: (name: string, pos: number) => void,
): void {
  switch (expr.kind) {
    case 'num':
    case 'str':
    case 'bool':
      return
    case 'field':
      visit(expr.name, expr.pos)
      return
    case 'unary':
      walkFieldRefs(expr.operand, visit)
      return
    case 'binary':
      walkFieldRefs(expr.left, visit)
      walkFieldRefs(expr.right, visit)
      return
    case 'call':
      for (const arg of expr.args) walkFieldRefs(arg, visit)
      return
  }
}
