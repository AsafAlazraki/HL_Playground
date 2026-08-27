/* ============================================================
   NOTHING IS PRE-FILLED, AND AN UNFINISHED RULE SAYS SO.

   THE FAILURE THESE TESTS PIN DOWN, because it is the kind that looks
   like a feature. Opening Business rules used to compose a sentence out
   of the best-ranked columns it could find and fill each side's value
   from the front of that column's own list. On the seeded sheet the
   greeting was:

       When Discontinued is yes, Wheel Size in must be 0
       [ ADD RULE ]   NOTHING ELSE TO FILL IN

   Every word of that is a claim about a real dealership, nobody wrote
   any of it, the button was live, and the caption said there was nothing
   left to do. A rule created that way carries `source: 'You, just now'`.

   So: a fresh draft names no column and holds no value; retargeting a
   column does not carry a value in; `is one of` does not open on a value
   from the column; and `missingChoice` names the first thing still to be
   answered, which is what the button's own refusal now reads.

   Fixtures are synthetic — 'Table A', 'Column 1'. Nothing marine is
   invented here.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { ConstraintDef, EntityDef, FieldDef, FieldType, TableKind } from '@/types/model'
import { conceptByKey, isUnsetField } from './columns'
import { ONE_OF, joinTokens, literalOf, makeCtx, sentenceTokens } from './describe'
import { emptyClause, makeClause, setClauseConcept, setClauseOp, singleGroup, unsetSide } from './edit'
import { missingChoice } from './state'

const field = (
  id: string,
  name: string,
  type: FieldType,
  extra: Partial<FieldDef> = {},
): FieldDef => ({ id, name, type, ...extra })

const table = (id: string, name: string, kind: TableKind, fields: FieldDef[]): EntityDef => ({
  id,
  name,
  accent: 'blue',
  kind,
  fields,
  position: { x: 0, y: 0 },
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

const tableA = table('t-a', 'Table A', 'boat', [
  field('a1', 'Column 1', 'boolean'),
  field('a2', 'Column 2', 'select', { options: ['X', 'Y'] }),
  field('a3', 'Column 3', 'number'),
])

const ctx = makeCtx({ 't-a': tableA }, { 't-a': [] })
const boolean1 = conceptByKey(ctx.concepts, 'boat::column 1')!
const choice2 = conceptByKey(ctx.concepts, 'boat::column 2')!
const number3 = conceptByKey(ctx.concepts, 'boat::column 3')!

/** What `NewRuleSentence` opens on. */
const draft = (): ConstraintDef => ({
  id: 'draft',
  kind: 'implies',
  if: singleGroup(emptyClause()),
  then: singleGroup(emptyClause()),
  because: '',
  enabled: true,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

describe('a new rule is empty', () => {
  it('names no column on either side', () => {
    const d = draft()
    expect(isUnsetField(d.if.clauses[0].left.fieldId)).toBe(true)
    expect(isUnsetField(d.then!.clauses[0].left.fieldId)).toBe(true)
  })

  it('holds no value on either side', () => {
    const d = draft()
    expect(literalOf(d.if.clauses[0].right)).toBeNull()
    expect(literalOf(d.then!.clauses[0].right)).toBeNull()
  })

  it('reads as the choices it is asking for, and mentions no column of the sheet', () => {
    const words = joinTokens(sentenceTokens(draft(), ctx, true))
    expect(words).toBe('When a column is …, a column must be …')
    expect(words).not.toContain('Column 1')
  })

  it('offers the column dropdown and nothing else until a column is chosen', () => {
    const tokens = sentenceTokens(draft(), ctx, true)
    const live = tokens.filter((t) => t.control)
    expect(live).toHaveLength(2)
    expect(live.every((t) => t.control?.k === 'field')).toBe(true)
  })

  /* BOTH KINDS OF UNANSWERED SLOT SAY SO. `unchosen` is what draws
     the dashed hairline, and it used to mark only the two column
     slots — so one of the two things a person still has to answer
     announced itself and the other, the value, was drawn as a
     settled accent word reading `…`. All four are questions and all
     four now look like questions; only the two columns are LIVE
     yet, which is the separate and still-correct rule that the verb
     and the value wait for the column. */
  it('marks every unanswered slot, column and value alike', () => {
    const tokens = sentenceTokens(draft(), ctx, true)
    const unchosen = tokens.filter((t) => t.unchosen)
    expect(unchosen.map((t) => t.role)).toEqual(['field', 'value', 'field', 'value'])
  })
})

describe('missingChoice — the refusal beside the button', () => {
  it('asks for the condition column first', () => {
    expect(missingChoice(draft(), ctx)).toBe('Pick the column this rule looks at.')
  })

  it('then asks for that column’s value, by name', () => {
    const d = { ...draft() }
    d.if = setClauseConcept(d, 'if', d.if.clauses[0].id, choice2, ctx).if
    expect(missingChoice(d, ctx)).toBe('Choose a value for Column 2.')
  })

  it('then asks for the column the rule sets', () => {
    const start = draft()
    let d = setClauseConcept(start, 'if', start.if.clauses[0].id, choice2, ctx)
    d = { ...d, if: { ...d.if, clauses: [{ ...d.if.clauses[0], right: { kind: 'literal', value: 'X' } }] } }
    expect(missingChoice(d, ctx)).toBe('Pick the column this rule sets.')
  })

  it('is null only when every choice has been made', () => {
    const done: ConstraintDef = {
      ...draft(),
      if: singleGroup({ id: 'c1', left: { fieldId: 'a2' }, op: 'eq', right: { kind: 'literal', value: 'X' } }),
      then: singleGroup({ id: 'c2', left: { fieldId: 'a3' }, op: 'gte', right: { kind: 'literal', value: 4 } }),
    }
    expect(missingChoice(done, ctx)).toBeNull()
  })

  it('does not count a verb that takes no value as unfinished', () => {
    const done: ConstraintDef = {
      ...draft(),
      if: singleGroup({ id: 'c1', left: { fieldId: 'a2' }, op: 'notEmpty' }),
      then: singleGroup({ id: 'c2', left: { fieldId: 'a3' }, op: 'notEmpty' }),
    }
    expect(missingChoice(done, ctx)).toBeNull()
  })

  it('says a deleted column has to be re-pointed, rather than calling it unchosen', () => {
    const orphan: ConstraintDef = {
      ...draft(),
      if: singleGroup({ id: 'c1', left: { fieldId: 'gone' }, op: 'eq', right: { kind: 'literal', value: 'X' } }),
    }
    expect(missingChoice(orphan, ctx)).toContain('deleted')
  })
})

describe('choosing a column never chooses a value with it', () => {
  it('leaves a list column empty rather than taking its first option', () => {
    const clause = makeClause(choice2, ctx)
    expect(literalOf(clause.right)).toBeNull()
  })

  it('leaves a boolean column empty rather than defaulting to yes', () => {
    expect(literalOf(makeClause(boolean1, ctx).right)).toBeNull()
  })

  it('leaves a number column empty rather than defaulting to 0', () => {
    expect(literalOf(makeClause(number3, ctx).right)).toBeNull()
  })

  it('re-pointing a live clause drops the old value and invents no new one', () => {
    const live: ConstraintDef = {
      ...draft(),
      if: singleGroup({ id: 'c1', left: { fieldId: 'a2' }, op: 'eq', right: { kind: 'literal', value: 'X' } }),
    }
    const next = setClauseConcept(live, 'if', 'c1', number3, ctx)
    expect(next.if.clauses[0].left.fieldId).toBe('a3')
    expect(literalOf(next.if.clauses[0].right)).toBeNull()
  })
})

describe('is one of', () => {
  const live = (): ConstraintDef => ({
    ...draft(),
    if: singleGroup({ id: 'c1', left: { fieldId: 'a2' }, op: 'eq', right: { kind: 'literal', value: null } }),
  })

  it('opens on nothing when nothing was chosen, rather than on the column’s first option', () => {
    const next = setClauseOp(live(), 'if', 'c1', ONE_OF, ctx)
    expect(next.if.clauses).toHaveLength(1)
    expect(literalOf(next.if.clauses[0].right)).toBeNull()
    expect(missingChoice(next, ctx)).toBe('Choose a value for Column 2.')
  })

  it('keeps a value a person did choose', () => {
    const chosen: ConstraintDef = {
      ...live(),
      if: singleGroup({ id: 'c1', left: { fieldId: 'a2' }, op: 'eq', right: { kind: 'literal', value: 'Y' } }),
    }
    const next = setClauseOp(chosen, 'if', 'c1', ONE_OF, ctx)
    expect(literalOf(next.if.clauses[0].right)).toBe('Y')
  })

  it('marks the only member of a set as not removable', () => {
    const next = setClauseOp(live(), 'if', 'c1', ONE_OF, ctx)
    const chips = sentenceTokens(next, ctx, true).filter((t) => t.control?.k === 'chip')
    expect(chips).toHaveLength(1)
    expect(chips[0].control).toMatchObject({ k: 'chip', removable: false })
  })
})

describe('unsetSide', () => {
  it('puts a stranded obligation back to an open question instead of guessing a column', () => {
    const live: ConstraintDef = {
      ...draft(),
      then: singleGroup({ id: 'c2', left: { fieldId: 'a3' }, op: 'gte', right: { kind: 'literal', value: 4 } }),
    }
    const next = unsetSide(live, 'then')
    expect(isUnsetField(next.then!.clauses[0].left.fieldId)).toBe(true)
    expect(literalOf(next.then!.clauses[0].right)).toBeNull()
  })
})
