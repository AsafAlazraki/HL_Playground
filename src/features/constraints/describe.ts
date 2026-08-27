/* ============================================================
   THE SENTENCE — one vocabulary, two moods, no second grammar.

   A constraint reads as one sentence:

     When  Water  is  Salt ,  Prop material  must be  Stainless steel
           └────┘ └┘ └────┘   └───────────┘  └─────┘  └─────────────┘
            field  op  value      field         op         value

   Everything in this file is pure. `sentenceTokens` produces the ONE
   token list; the collapsed card and the open editor both render it,
   which is why the read-only prose and the live dropdowns can never
   drift apart (MOCKUP_FINDINGS §2.4). `describeConstraint` is the
   same list with the words joined — so the sentence is also the name,
   and there is no naming step anywhere.

   Operators are English. On the left they are indicative (`is`, `is
   at least`); on the right they take obligation voice (`must be`,
   `must be at least`). One list, two grammatical moods.
   ============================================================ */

import { isImageValue } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import type {
  CellValue,
  Clause,
  ClauseGroup,
  CompareOp,
  ConstraintDef,
  EntityDef,
  RowData,
  ValueExpr,
} from '@/types/model'
import {
  buildConcepts,
  conceptByKey,
  conceptIndex,
  domainFor,
  isUnsetField,
  isUnsetValue,
  type ColumnConcept,
  type ValueDomain,
} from './columns'

/* ---------------------------------------------------------- */
/* Operators                                                  */
/* ---------------------------------------------------------- */

/** `is one of` is not a CompareOp — it is an OR of `eq` wearing one
 *  word, exactly as the mockup renders it. The sentence treats it as
 *  an operator so the user never meets an "OR group builder". */
export const ONE_OF = 'oneOf' as const
export type SentenceOp = CompareOp | typeof ONE_OF

/** Left-hand side: what IS true. */
export const INDICATIVE: Record<CompareOp, string> = {
  eq: 'is',
  neq: 'is not',
  gt: 'is more than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  isEmpty: 'has not been chosen',
  notEmpty: 'has been chosen',
  isTrue: 'is yes',
  isFalse: 'is no',
}

/** Right-hand side: what MUST be true. Same list, obligation voice. */
export const OBLIGATION: Record<CompareOp, string> = {
  eq: 'must be',
  neq: 'must not be',
  gt: 'must be more than',
  gte: 'must be at least',
  lt: 'must be less than',
  lte: 'must be at most',
  contains: 'must contain',
  startsWith: 'must start with',
  endsWith: 'must end with',
  isEmpty: 'must be left empty',
  notEmpty: 'must be chosen',
  isTrue: 'must be yes',
  isFalse: 'must be no',
}

export type Side = 'if' | 'then'

export const opLabel = (op: SentenceOp, side: Side): string => {
  if (op === ONE_OF) return side === 'if' ? 'is one of' : 'must be one of'
  /* an imported constraint may carry an operator we have no English
     for; print the operator rather than the word "undefined" */
  return (side === 'if' ? INDICATIVE[op] : OBLIGATION[op]) ?? String(op)
}

/** Ops that take no value token. */
export const isUnary = (op: SentenceOp): boolean =>
  op === 'isEmpty' || op === 'notEmpty' || op === 'isTrue' || op === 'isFalse'

/** The short, honest menu for a column. The full thirteen would be a
 *  worse sentence and a worse rule.
 *
 *  `is one of` is offered wherever there is a list to pick from —
 *  including a text column whose values we can read off the rows,
 *  which in a real catalogue is most of them. */
export function opsFor(domain: ValueDomain | undefined): SentenceOp[] {
  const listed = (domain?.options.length ?? 0) > 1
  switch (domain?.control) {
    case 'choice':
      return ['eq', 'neq', ONE_OF, 'notEmpty']
    case 'boolean':
      return ['eq', 'neq']
    case 'number':
    case 'date':
      return ['eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'notEmpty']
    default:
      return listed ? ['eq', 'neq', ONE_OF, 'notEmpty'] : ['eq', 'neq', 'notEmpty']
  }
}

/* ---------------------------------------------------------- */
/* Values                                                     */
/* ---------------------------------------------------------- */

export function literalOf(expr: ValueExpr | undefined): CellValue {
  if (!expr) return null
  if (expr.kind === 'literal') return expr.value
  if (expr.kind === 'formula') return expr.src
  return null
}

/** A value as it reads inside the sentence — never quoted, because
 *  quotation marks make prose look like code. */
export function valueWords(v: CellValue, control?: ValueDomain['control']): string {
  if (v === null || v === undefined || v === '') return '…'
  if (isImageValue(v)) return '…'
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  if (typeof v === 'number') {
    return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 4 })
  }
  if (control === 'boolean') return v === 'true' ? 'yes' : v === 'false' ? 'no' : String(v)
  return String(v)
}

/** "PVC, HYP or Alloy" — the read-only face of `is one of`. */
export function listWords(values: CellValue[]): string {
  const words = values.map((v) => valueWords(v))
  if (words.length === 0) return '…'
  if (words.length === 1) return words[0]
  return `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`
}

/* ---------------------------------------------------------- */
/* Tokens                                                     */
/* ---------------------------------------------------------- */

export type TokenRole = 'field' | 'op' | 'value' | 'word'

export type TokenControl =
  | { k: 'field'; side: Side; clauseId: string; conceptKey: string }
  | { k: 'op'; side: Side; clauseId: string; op: SentenceOp; conceptKey: string }
  | { k: 'value'; side: Side; clauseId: string; conceptKey: string; value: CellValue }
  /** one chosen value of an `is one of` set; clicking removes it —
   *  unless it is the only one left, because a set of nothing is not a
   *  set, and a cross that cannot remove anything is a lie */
  | { k: 'chip'; side: Side; conceptKey: string; value: CellValue; removable: boolean }
  /** the empty slot at the end of an `is one of` set */
  | { k: 'chipAdd'; side: Side; conceptKey: string; taken: CellValue[] }

export interface SentenceToken {
  id: string
  role: TokenRole
  text: string
  /** punctuation: sits against the word before it */
  tight?: boolean
  /** a slot nobody has answered yet — drawn as empty, never as a name */
  unchosen?: boolean
  /** present only when this word is a control */
  control?: TokenControl
  /** what the control needs to offer */
  concept?: ColumnConcept
  domain?: ValueDomain
}

export interface SentenceCtx {
  concepts: ColumnConcept[]
  index: Map<string, ColumnConcept>
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
  /** what a text column's values turn out to be costs a row scan, and
   *  every token asks. One scan per column per context. */
  domains: Map<string, ValueDomain>
}

export function makeCtx(
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): SentenceCtx {
  const concepts = buildConcepts(entities)
  return {
    concepts,
    index: conceptIndex(concepts),
    entities,
    rowsByEntity,
    domains: new Map(),
  }
}

/** The values a column offers, computed once per context. */
export function domainOf(ctx: SentenceCtx, concept: ColumnConcept): ValueDomain {
  const hit = ctx.domains.get(concept.key)
  if (hit) return hit
  const domain = domainFor(concept, ctx.entities, ctx.rowsByEntity)
  ctx.domains.set(concept.key, domain)
  return domain
}

const MISSING_NAME = 'a column that is gone'

/** The face of a column nobody has chosen yet. It is a slot, and it
 *  reads as one: no name, no value, nothing that could be mistaken for
 *  a decision this business has made. */
export const UNCHOSEN_NAME = 'a column'

/* -- the `is one of` collapse -------------------------------- */

export interface OneOfShape {
  concept: ColumnConcept
  values: CellValue[]
  /** the clause that owns the operator token */
  head: Clause
}

/** An OR of `eq` on one column reads as "is one of", and is edited as
 *  chips. This is what saves the user from ever seeing a boolean tree. */
export function asOneOf(
  group: ClauseGroup | undefined,
  ctx: SentenceCtx,
): OneOfShape | null {
  if (!group || group.combinator !== 'OR' || group.clauses.length === 0) return null
  let concept: ColumnConcept | undefined
  const values: CellValue[] = []
  for (const clause of group.clauses) {
    if (clause.op !== 'eq') return null
    if (clause.left.viaFieldId) return null
    const c = ctx.index.get(clause.left.fieldId)
    if (!c) return null
    if (concept && c.key !== concept.key) return null
    concept = c
    if (!clause.right || clause.right.kind !== 'literal') return null
    values.push(clause.right.value)
  }
  if (!concept) return null
  return { concept, values, head: group.clauses[0] }
}

/* -- one clause ---------------------------------------------- */

function clauseTokens(
  clause: Clause,
  side: Side,
  ctx: SentenceCtx,
  out: SentenceToken[],
): void {
  const concept = ctx.index.get(clause.left.fieldId)
  const domain = concept ? domainOf(ctx, concept) : undefined
  /* NOT CHOSEN IS NOT THE SAME AS GONE. An unchosen column keeps its
     dropdown — it is the one thing on the sentence still to answer —
     whereas a column that has been deleted has no list to offer. */
  const unchosen = !concept && isUnsetField(clause.left.fieldId)

  out.push({
    id: `${side}:${clause.id}:field`,
    role: 'field',
    text: concept ? concept.name : unchosen ? UNCHOSEN_NAME : MISSING_NAME,
    concept,
    domain,
    ...(unchosen ? { unchosen: true } : {}),
    ...(concept || unchosen
      ? {
          control: {
            k: 'field',
            side,
            clauseId: clause.id,
            conceptKey: concept?.key ?? '',
          } as TokenControl,
        }
      : {}),
  })

  /* THE VERB AND THE VALUE WAIT FOR THE COLUMN. Which comparisons are
     honest, and which values exist, are both facts about a column: with
     no column picked there is nothing true to offer, so the rest of the
     clause is drawn as words rather than as controls that would have to
     guess. One live choice at a time, in reading order. */
  out.push({
    id: `${side}:${clause.id}:op`,
    role: 'op',
    text: opLabel(clause.op, side),
    concept,
    domain,
    ...(concept
      ? {
          control: {
            k: 'op',
            side,
            clauseId: clause.id,
            op: clause.op,
            conceptKey: concept.key,
          } as TokenControl,
        }
      : {}),
  })

  if (isUnary(clause.op)) return

  const value = literalOf(clause.right)
  /* AND THE VALUE SAYS SO TOO. The unanswered COLUMN has always
     carried `unchosen`, which is what draws the dashed hairline under
     it — "a column" is a question, and the rule under it says so from
     across the sentence. An unanswered VALUE is exactly the same
     question and was drawn as a settled accent word reading `…`, so
     one of the two things still to answer announced itself and the
     other did not. */
  out.push({
    id: `${side}:${clause.id}:value`,
    role: 'value',
    text: valueWords(value, domain?.control),
    concept,
    domain,
    ...(isUnsetValue(value) ? { unchosen: true } : {}),
    ...(concept
      ? {
          control: {
            k: 'value',
            side,
            clauseId: clause.id,
            conceptKey: concept.key,
            value,
          } as TokenControl,
        }
      : {}),
  })
}

/* -- one group ------------------------------------------------ */

function groupTokens(
  group: ClauseGroup | undefined,
  side: Side,
  ctx: SentenceCtx,
  out: SentenceToken[],
  editable: boolean,
): void {
  if (!group || group.clauses.length === 0) {
    out.push({ id: `${side}:empty`, role: 'word', text: '…' })
    return
  }

  const oneOf = asOneOf(group, ctx)
  if (oneOf) {
    const domain = domainOf(ctx, oneOf.concept)
    /* collapsed, a set is prose — "XL or LS" — with no chips and no
       empty slot; open, the same words become removable chips plus one
       slot to add to them */
    if (!editable) {
      out.push({
        id: `${side}:${oneOf.head.id}:field`,
        role: 'field',
        text: oneOf.concept.name,
        concept: oneOf.concept,
        domain,
      })
      out.push({
        id: `${side}:${oneOf.head.id}:op`,
        role: 'op',
        text: opLabel(ONE_OF, side),
      })
      out.push({
        id: `${side}:oneOfValues`,
        role: 'value',
        text: listWords(oneOf.values),
      })
      return
    }
    out.push({
      id: `${side}:${oneOf.head.id}:field`,
      role: 'field',
      text: oneOf.concept.name,
      concept: oneOf.concept,
      domain,
      control: { k: 'field', side, clauseId: oneOf.head.id, conceptKey: oneOf.concept.key },
    })
    out.push({
      id: `${side}:${oneOf.head.id}:op`,
      role: 'op',
      text: opLabel(ONE_OF, side),
      concept: oneOf.concept,
      domain,
      control: {
        k: 'op',
        side,
        clauseId: oneOf.head.id,
        op: ONE_OF,
        conceptKey: oneOf.concept.key,
      },
    })
    oneOf.values.forEach((v, i) => {
      out.push({
        id: `${side}:chip:${i}`,
        role: 'value',
        text: valueWords(v, domain.control),
        concept: oneOf.concept,
        domain,
        control: {
          k: 'chip',
          side,
          conceptKey: oneOf.concept.key,
          value: v,
          removable: oneOf.values.length > 1,
        },
      })
    })
    out.push({
      id: `${side}:chipAdd`,
      role: 'value',
      text: '+',
      concept: oneOf.concept,
      domain,
      control: { k: 'chipAdd', side, conceptKey: oneOf.concept.key, taken: oneOf.values },
    })
    return
  }

  const joiner = group.combinator === 'OR' ? 'or' : 'and'
  group.clauses.forEach((clause, i) => {
    if (i > 0) out.push({ id: `${side}:join:${i}`, role: 'word', text: joiner })
    clauseTokens(clause, side, ctx, out)
  })
}

/* -- the whole sentence --------------------------------------- */

/** The ONE token list. Both the read-only card and the open editor
 *  render this, so they cannot disagree. `editable` changes nothing
 *  about the words — only whether a set of values is drawn as prose or
 *  as chips with a slot to add to. */
export function sentenceTokens(
  c: ConstraintDef,
  ctx: SentenceCtx,
  editable = false,
): SentenceToken[] {
  const out: SentenceToken[] = []

  if (c.kind === 'table') {
    const n = c.combinations?.length ?? 0
    const names = [
      ...new Set(
        Object.keys(c.combinations?.[0] ?? {}).map(
          (fieldId) => ctx.index.get(fieldId)?.name ?? MISSING_NAME,
        ),
      ),
    ]
    out.push({
      id: 'table:fields',
      role: 'field',
      text: names.length ? names.join(', ') : MISSING_NAME,
    })
    out.push({
      id: 'table:op',
      role: 'op',
      text: `must match one of ${n} approved combination${n === 1 ? '' : 's'}`,
    })
    return out
  }

  if (c.kind === 'excludes') {
    out.push({ id: 'kw:never', role: 'word', text: 'Never' })
    groupTokens(c.if, 'if', ctx, out, editable)
    out.push({ id: 'kw:with', role: 'word', text: 'together with' })
    groupTokens(c.then, 'if', ctx, out, editable)
    return out
  }

  out.push({ id: 'kw:when', role: 'word', text: 'When' })
  groupTokens(c.if, 'if', ctx, out, editable)
  out.push({ id: 'kw:comma', role: 'word', text: ',', tight: true })
  groupTokens(c.then, 'then', ctx, out, editable)
  return out
}

/** The sentence as plain text — the rule's name, its export label and
 *  what a screen reader says. Reads the project itself, because a
 *  constraint stores field ids and only the tables know their names. */
export function describeConstraint(c: ConstraintDef): string {
  const ctx = currentCtx()
  return joinTokens(sentenceTokens(c, ctx))
}

export function joinTokens(tokens: SentenceToken[]): string {
  let out = ''
  for (const t of tokens) {
    if (out.length > 0 && !t.tight) out += ' '
    out += t.text
  }
  return out
}

/* The store is the only place field names live. This is the same
   escape hatch `views/viewDefs.ts` uses for a non-hook read, and it is
   why `describeConstraint(c)` can keep the single-argument signature
   the rest of the app calls it with. */
let ctxCache: {
  entities: Record<string, EntityDef>
  rows: Record<string, RowData[]>
  ctx: SentenceCtx
} | null = null

function currentCtx(): SentenceCtx {
  const { entities, rowsByEntity } = useProjectStore.getState()
  /* the store replaces these objects on every mutation, so identity is
     an exact cache key — a list of rules naming themselves must not
     rebuild the column index once per rule */
  if (ctxCache && ctxCache.entities === entities && ctxCache.rows === rowsByEntity) {
    return ctxCache.ctx
  }
  const ctx = makeCtx(entities, rowsByEntity)
  ctxCache = { entities, rows: rowsByEntity, ctx }
  return ctx
}

/* ---------------------------------------------------------- */
/* Reading the two sides                                      */
/* ---------------------------------------------------------- */

/** The kind a constraint is about: the kind of its first column.
 *  A rule against `boat` spans every boat table. */
export function constraintKindOf(
  c: ConstraintDef,
  ctx: SentenceCtx,
): ColumnConcept['kind'] | undefined {
  const first = c.if.clauses[0]
  if (!first) return undefined
  return ctx.index.get(first.left.fieldId)?.kind
}

export const conceptOf = (
  ctx: SentenceCtx,
  key: string | undefined,
): ColumnConcept | undefined => conceptByKey(ctx.concepts, key)
