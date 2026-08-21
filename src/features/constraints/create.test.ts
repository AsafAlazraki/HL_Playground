/* ============================================================
   THE CREATE HALF — the two things it promises, pinned down.

   1. AN OFFER NEVER WRITES A RULE. Sixteen real rules were mined out
      of the price file, and not one of them can be stated as a
      ConstraintDef today. So "start from one" may point the sentence
      at the columns that rule is about and NOTHING ELSE: no verb
      anybody did not choose, no value anybody did not type, and the
      Add button still refused. This is the same failure `newRule.test`
      guards from the other direction — there, the app composing a
      sentence out of the first column it found; here, the app
      composing one out of a citation.

   2. THE CONSEQUENCE IS COUNTED, NOT CLAIMED. Every figure the
      composer prints comes off the loaded sheet on the render it is
      printed in. These tests hold the arithmetic to rows they can
      count by hand.

   The starting points are measured against the REAL seed, because the
   whole question they answer — "which of these rules can this sheet
   hold?" — is a question about real columns. The preview is measured
   against a four-row fixture, because the point of it is arithmetic
   and arithmetic wants a denominator a reader can check.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { buildNorthsideProject } from '@/demos/northside'
import type { ConstraintDef, EntityDef, FieldDef, FieldType, RowData, TableKind } from '@/types/model'
import { kindLabel } from './columns'
import { makeCtx, literalOf, type SentenceCtx } from './describe'
import { singleGroup } from './edit'
import { missingChoice, previewConstraint } from './state'
import { draftFrom, startingPoints, stillFrom, tally } from './startingPoints'
import { WORKBOOK_RULES } from './workbookRules'

/* ---------------------------------------------------------- */
/* The real sheet                                             */
/* ---------------------------------------------------------- */

function northsideCtx(): SentenceCtx {
  const project = buildNorthsideProject()
  const entities: Record<string, EntityDef> = {}
  for (const e of project.entities) entities[e.id] = e
  return makeCtx(entities, project.rowsByEntity)
}

describe('starting points — the price file, read against the sheet', () => {
  const ctx = northsideCtx()
  const offers = startingPoints(ctx)

  it('offers every admitted workbook rule, and invents none', () => {
    expect(offers).toHaveLength(WORKBOOK_RULES.length)
    const refs = new Set(WORKBOOK_RULES.map((r) => r.ref))
    for (const offer of offers) expect(refs.has(offer.seed.ref)).toBe(true)
  })

  it('puts what can be acted on first, then what is real and cannot be said here', () => {
    const band = offers.map((o) => (o.state === 'points' ? 0 : o.state === 'cross-kind' ? 1 : 2))
    expect([...band].sort((a, b) => a - b)).toEqual(band)
  })

  it('reports at least one rule this sheet can be pointed at', () => {
    /* If this ever reads zero the catalogue has become sixteen
       refusals, which is the screen the owner objected to. It is not
       asserted as an exact figure on purpose: the number moves when a
       column is added, and a test that pins it would be pinning the
       sheet rather than the feature. */
    expect(tally(offers).points).toBeGreaterThan(0)
  })

  it('never calls an offer pointable while a column it names is missing', () => {
    for (const offer of offers) {
      if (offer.state === 'points') {
        expect(offer.missing).toHaveLength(0)
        expect(offer.kinds).toHaveLength(1)
        expect(offer.columns).toHaveLength(offer.seed.needs.length)
      } else {
        expect(offer.refusal).not.toBeNull()
      }
    }
  })

  it('names both sides when a rule spans two kinds of table', () => {
    for (const offer of offers.filter((o) => o.state === 'cross-kind')) {
      for (const kind of offer.kinds) {
        expect(offer.refusal).toContain(kindLabel(kind))
      }
      for (const column of offer.columns) {
        expect(offer.refusal).toContain(column.name)
      }
    }
  })

  it('says how many columns are missing when a column is missing', () => {
    for (const offer of offers.filter((o) => o.state === 'missing')) {
      expect(offer.missing.length).toBeGreaterThan(0)
      expect(offer.refusal).toContain('no column')
    }
  })

  /* ---- and the one that matters most ---- */

  it('points a draft at the columns and answers nothing else', () => {
    const pointable = offers.filter((o) => o.state === 'points')
    expect(pointable.length).toBeGreaterThan(0)

    for (const offer of pointable) {
      const draft = draftFrom(offer, ctx)
      expect(draft).not.toBeNull()
      if (!draft) continue

      const clauses = [...draft.if.clauses, ...(draft.then?.clauses ?? [])]
      const named = clauses
        .map((c) => ctx.index.get(c.left.fieldId)?.key)
        .filter((k): k is string => k !== undefined)

      /* the columns, and only the columns */
      for (const column of offer.columns) expect(named).toContain(column.key)

      /* NOT ONE VALUE. This is the whole promise. */
      for (const clause of clauses) expect(literalOf(clause.right)).toBeNull()

      /* so the button is still refused, with the reason */
      expect(missingChoice(draft, ctx)).not.toBeNull()
    }
  })

  it('carries the adjudicator’s own reason across, verbatim', () => {
    for (const offer of offers.filter((o) => o.state === 'points')) {
      expect(draftFrom(offer, ctx)?.because).toBe(offer.seed.because)
    }
  })

  it('refuses to build a draft for a rule it has just refused', () => {
    for (const offer of offers.filter((o) => o.state !== 'points')) {
      expect(draftFrom(offer, ctx)).toBeNull()
    }
  })

  it('lets go of the citation the moment the sentence stops being that rule', () => {
    const offer = offers.find((o) => o.state === 'points')
    expect(offer).toBeDefined()
    if (!offer) return
    const draft = draftFrom(offer, ctx)
    expect(draft).not.toBeNull()
    if (!draft) return

    expect(stillFrom(offer, draft, ctx)).toBe(true)

    /* re-point the condition at some other column of the sheet */
    const other = ctx.concepts.find((c) => !offer.columns.some((x) => x.key === c.key))
    expect(other).toBeDefined()
    if (!other) return
    const moved: ConstraintDef = {
      ...draft,
      if: singleGroup({
        id: 'c1',
        left: { fieldId: other.fieldIds[0] },
        op: 'eq',
        right: { kind: 'literal', value: null },
      }),
    }
    expect(stillFrom(offer, moved, ctx)).toBe(false)
  })
})

/* ---------------------------------------------------------- */
/* The consequence — four rows a reader can count              */
/* ---------------------------------------------------------- */

const field = (id: string, name: string, type: FieldType): FieldDef => ({ id, name, type })

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

const row = (id: string, values: Record<string, unknown>): RowData => ({
  id,
  entityId: 't-a',
  values: values as RowData['values'],
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

const tableA = table('t-a', 'Table A', 'boat', [
  field('a1', 'Column 1', 'select'),
  field('a2', 'Column 2', 'number'),
])

/* four rows. Two answer the condition; of those, one keeps the
   obligation and one breaks it. */
const rows: RowData[] = [
  row('r1', { a1: 'X', a2: 10 }),
  row('r2', { a1: 'X', a2: 1 }),
  row('r3', { a1: 'Y', a2: 10 }),
  row('r4', { a1: 'Y', a2: 1 }),
]

const fixture = makeCtx({ 't-a': tableA }, { 't-a': rows })

const base = {
  id: 'draft',
  kind: 'implies' as const,
  because: '',
  enabled: true,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
}

describe('previewConstraint — what it would do, before the commit', () => {
  it('measures nothing while no column has been chosen', () => {
    const draft: ConstraintDef = {
      ...base,
      if: singleGroup({ id: 'c1', left: { fieldId: '' }, op: 'eq', right: { kind: 'literal', value: null } }),
    }
    const p = previewConstraint(draft, fixture)
    expect(p.concepts).toHaveLength(0)
    expect(p.rows).toBe(0)
    expect(p.conditionReady).toBe(false)
  })

  it('reports the scope as soon as one column is named, before any value', () => {
    const draft: ConstraintDef = {
      ...base,
      if: singleGroup({ id: 'c1', left: { fieldId: 'a1' }, op: 'eq', right: { kind: 'literal', value: null } }),
    }
    const p = previewConstraint(draft, fixture)
    expect(p.tables).toHaveLength(1)
    expect(p.rows).toBe(4)
    expect(p.conditionReady).toBe(false)
    expect(p.looked).toBe(0)
  })

  it('counts the rows the condition is true of, with no obligation written', () => {
    const draft: ConstraintDef = {
      ...base,
      if: singleGroup({ id: 'c1', left: { fieldId: 'a1' }, op: 'eq', right: { kind: 'literal', value: 'X' } }),
      then: singleGroup({ id: 'c2', left: { fieldId: '' }, op: 'eq', right: { kind: 'literal', value: null } }),
    }
    const p = previewConstraint(draft, fixture)
    expect(p.conditionReady).toBe(true)
    expect(p.ready).toBe(false)
    expect(p.looked).toBe(2)
    expect(p.kept + p.broken).toBe(0)
  })

  it('splits the rows it engages into the ones that keep it and the ones that break it', () => {
    const draft: ConstraintDef = {
      ...base,
      if: singleGroup({ id: 'c1', left: { fieldId: 'a1' }, op: 'eq', right: { kind: 'literal', value: 'X' } }),
      then: singleGroup({ id: 'c2', left: { fieldId: 'a2' }, op: 'gte', right: { kind: 'literal', value: 5 } }),
    }
    const p = previewConstraint(draft, fixture)
    expect(p.ready).toBe(true)
    expect(p.rows).toBe(4)
    expect(p.looked).toBe(2)
    expect(p.kept).toBe(1)
    expect(p.broken).toBe(1)
  })

  it('says a rule engages nothing rather than reporting a silent zero', () => {
    const draft: ConstraintDef = {
      ...base,
      if: singleGroup({ id: 'c1', left: { fieldId: 'a1' }, op: 'eq', right: { kind: 'literal', value: 'Z' } }),
      then: singleGroup({ id: 'c2', left: { fieldId: 'a2' }, op: 'gte', right: { kind: 'literal', value: 5 } }),
    }
    const p = previewConstraint(draft, fixture)
    expect(p.rows).toBe(4)
    expect(p.looked).toBe(0)
  })

  /* THE NOUN IS THE TABLE'S, NOT THE APP'S. `leafNoun` reads the word
     off the column the table is grouped by, which on this fixture is
     the one called "Column 1" — so the preview says "column 1s", not
     "rows" and not "boats". That is the behaviour: a motorcycle shop
     reads "40 bikes" for free, and a fixture named after a spreadsheet
     column reads like a spreadsheet column. */
  it('uses the table’s own word for a row rather than the app’s', () => {
    const draft: ConstraintDef = {
      ...base,
      if: singleGroup({ id: 'c1', left: { fieldId: 'a1' }, op: 'eq', right: { kind: 'literal', value: 'X' } }),
    }
    expect(previewConstraint(draft, fixture).noun.many).toBe('column 1s')
  })

  it('falls back to the kind’s word when two tables in scope disagree', () => {
    const tableB: EntityDef = {
      ...table('t-b', 'Table B', 'boat', [
        field('b1', 'Column 1', 'select'),
        field('b2', 'Column 2', 'number'),
      ]),
      /* this table calls a row by its second column, so the two tables
         in scope do not agree on the word */
      displayFieldId: 'b2',
    }
    const two = makeCtx({ 't-a': tableA, 't-b': tableB }, { 't-a': rows, 't-b': [] })
    const draft: ConstraintDef = {
      ...base,
      if: singleGroup({ id: 'c1', left: { fieldId: 'a1' }, op: 'eq', right: { kind: 'literal', value: 'X' } }),
    }
    const p = previewConstraint(draft, two)
    expect(p.tables).toHaveLength(2)
    /* one table's word may never be applied to another table's rows, and
       "rows" is the jargon the whole naming rule exists to keep off the
       screen — so the KIND's word is what a mixed scope gets */
    expect(p.noun.many).toBe('boats')
  })

  it('says rows only when the scope has no word of its own at all', () => {
    /* `custom` declares no kind noun on purpose — "a caller with no word
       to use should say something else rather than invent one" — so two
       custom tables that disagree are the one case with nothing better
       than the neutral word. */
    const custom = (id: string, display: string): EntityDef => ({
      ...table(id, `Table ${id}`, 'custom', [
        field(`${id}-1`, 'Column 1', 'select'),
        field(`${id}-2`, 'Column 2', 'number'),
      ]),
      displayFieldId: display,
    })
    const two = makeCtx(
      { 't-c': custom('t-c', 't-c-1'), 't-d': custom('t-d', 't-d-2') },
      { 't-c': [], 't-d': [] },
    )
    const draft: ConstraintDef = {
      ...base,
      if: singleGroup({
        id: 'c1',
        left: { fieldId: 't-c-1' },
        op: 'eq',
        right: { kind: 'literal', value: 'X' },
      }),
    }
    const p = previewConstraint(draft, two)
    expect(p.tables).toHaveLength(2)
    expect(p.noun.many).toBe('rows')
  })
})
