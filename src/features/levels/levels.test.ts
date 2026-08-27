/* ============================================================
   THE ARITHMETIC, PROVEN — in two halves.

   HALF ONE is a hand-built fixture, small enough that every
   expected number can be counted by eye in the fixture itself.
   That is where the edge cases live: the tie that must produce no
   answer, the blank that is not an override, the unassigned
   drawer that must not collide with the table level.

   HALF TWO is the REAL Master Price File — 588 Highfield variants
   in 8 Series and 66 Models. It exists because the blast radius is
   the one number a dealer is asked to trust, and a fixture cannot
   prove it against a file whose Series have 199 rows in them. The
   figures asserted there were counted by the same seed, and the
   invariants (`already + blank + differing === total`) hold on
   every column of every table with a hierarchy, which is 22 of the
   51.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { isPairFieldId, isSystemFieldId, type EntityDef, type FieldDef, type RowData } from '@/types/model'
import { buildNorthsideProject } from '@/demos/northside'
import {
  TABLE_LEVEL_KEY,
  buildLevelModel,
  columnRefusal,
  describeDone,
  levelColumns,
  planLines,
  planReset,
  planSet,
  standingsAt,
  tallyAt,
  trailTo,
  valueText,
} from './levels'

/* ---------------------------------------------------------- */
/* the fixture                                                */
/* ---------------------------------------------------------- */

const F = (id: string, name: string, type: FieldDef['type'] = 'text'): FieldDef => ({
  id,
  name,
  type,
})

const fields: FieldDef[] = [
  F('series', 'Series'),
  F('model', 'Model'),
  F('variant', 'Variant'),
  F('warranty', 'Warranty'),
  F('shaft', 'Shaft Lgth'),
  F('total', 'Total', 'formula'),
  F('photo', 'Image Link', 'image'),
]

const entity: EntityDef = {
  id: 'boats',
  name: 'Highfield',
  accent: 'blue',
  kind: 'boat',
  hierarchy: ['series', 'model', 'variant'],
  fields,
  position: { x: 0, y: 0 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

let seq = 0
const row = (values: Record<string, string | null>): RowData => {
  seq += 1
  return {
    id: `r${seq}`,
    entityId: 'boats',
    values,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

/* Ocean Master: 3 boats — two say "3 years", one says "5 years".
   Sport:        2 boats — one blank, one "3 years".
   Classic:      2 boats — a dead-even tie, on purpose.
   (no Series):  1 boat  — the unassigned drawer.                */
const rows: RowData[] = [
  row({ series: 'Ocean Master', model: 'OM 540', variant: 'PVC', warranty: '3 years', shaft: 'XL' }),
  row({ series: 'Ocean Master', model: 'OM 540', variant: 'Hypalon', warranty: '3 years', shaft: 'XL' }),
  row({ series: 'Ocean Master', model: 'OM 660', variant: 'PVC', warranty: '5 years', shaft: 'L' }),
  row({ series: 'Sport', model: 'SP 460', variant: 'PVC', warranty: null, shaft: 'XL' }),
  row({ series: 'Sport', model: 'SP 460', variant: 'Hypalon', warranty: '3 years', shaft: '  ' }),
  row({ series: 'Classic', model: 'CL 380', variant: 'PVC', warranty: '1 year', shaft: 'S' }),
  row({ series: 'Classic', model: 'CL 380', variant: 'Hypalon', warranty: '2 years', shaft: 'S' }),
  row({ series: '', model: 'ODD 1', variant: 'PVC', warranty: '3 years', shaft: 'XL' }),
]

const model = buildLevelModel(entity, rows)
const warranty = fields.find((f) => f.id === 'warranty') as FieldDef
const shaft = fields.find((f) => f.id === 'shaft') as FieldDef
const formulaCol = fields.find((f) => f.id === 'total') as FieldDef

const keyOf = (...path: string[]): string => {
  const node = [...model.byKey.values()].find(
    (n) => n.path.length === path.length && n.path.every((v, i) => v === path[i]),
  )
  if (!node) throw new Error(`no level at ${JSON.stringify(path)}`)
  return node.key
}

/* ---------------------------------------------------------- */

describe('the level tree is the table, its drawers, and nothing invented', () => {
  it('files 8 rows into the table level and 4 Series', () => {
    expect(model.total).toBe(8)
    expect(model.root.rows).toHaveLength(8)
    expect(model.root.children.map((c) => c.label)).toEqual([
      'Ocean Master',
      'Sport',
      'Classic',
      '(unassigned)',
    ])
  })

  it('names each level with the dealer’s own column heading', () => {
    expect(model.levelNames).toEqual(['Series', 'Model'])
    expect(model.root.children[0].levelName).toBe('Series')
    expect(model.root.children[0].children[0].levelName).toBe('Model')
  })

  it('keeps the unassigned drawer distinct from the table level', () => {
    /* the bug this guards: `[''].join(SEP)` is `''`, which is the
       table's own key. If the two collide the blank-Series boat is
       filed onto the table and its drawer is unreachable. */
    const unassigned = model.root.children[3]
    expect(unassigned.key).not.toBe(TABLE_LEVEL_KEY)
    expect(unassigned.rows).toHaveLength(1)
    expect(model.byKey.get(TABLE_LEVEL_KEY)?.rows).toHaveLength(8)
  })

  it('files the unassigned drawer LAST, as the sheet does', () => {
    expect(model.root.children[model.root.children.length - 1].value).toBe('')
  })

  it('gives a breadcrumb from the table down to a Model', () => {
    expect(trailTo(model, keyOf('Ocean Master', 'OM 540')).map((n) => n.label)).toEqual([
      'Highfield',
      'Ocean Master',
      'OM 540',
    ])
  })

  it('counts every row of every drawer beneath it', () => {
    expect(model.byKey.get(keyOf('Ocean Master'))?.rows).toHaveLength(3)
    expect(model.byKey.get(keyOf('Ocean Master', 'OM 540'))?.rows).toHaveLength(2)
    expect(model.byKey.get(keyOf('Sport'))?.rows).toHaveLength(2)
  })
})

describe('a level’s value is counted, and a tie is not an answer', () => {
  it('reads Ocean Master as “3 years”, with one exception', () => {
    const t = tallyAt(model, keyOf('Ocean Master'), warranty)
    expect(t.total).toBe(3)
    expect(t.answer?.text).toBe('3 years')
    expect(t.answer?.count).toBe(2)
    expect(t.unanimous).toBe(false)
    expect(t.split).toBe(false)
    expect(t.entries.map((e) => [e.text, e.count])).toEqual([
      ['3 years', 2],
      ['5 years', 1],
    ])
  })

  it('calls a 1–1 tie SPLIT and refuses to pick a side', () => {
    const t = tallyAt(model, keyOf('Classic'), warranty)
    expect(t.split).toBe(true)
    expect(t.answer).toBeNull()
  })

  it('counts a blank as blank, never as a value', () => {
    const t = tallyAt(model, keyOf('Sport'), warranty)
    expect(t.blank).toBe(1)
    /* one blank, one "3 years" — the blank does not count against
       the majority, so the level DOES have an answer */
    expect(t.answer?.text).toBe('3 years')
    expect(t.unanimous).toBe(false)
  })

  it('counts a whitespace-only cell as blank too', () => {
    const t = tallyAt(model, keyOf('Sport'), shaft)
    expect(t.blank).toBe(1)
    expect(t.entries).toHaveLength(1)
    expect(t.entries[0].text).toBe('XL')
  })

  it('calls a drawer where every row agrees UNANIMOUS', () => {
    const t = tallyAt(model, keyOf('Ocean Master', 'OM 540'), warranty)
    expect(t.unanimous).toBe(true)
    expect(t.answer?.count).toBe(2)
  })
})

describe('a plurality is not an answer — the majority rule', () => {
  /* 5 boats: 2 say A, 1 each says B, C, D. A is the commonest and
     is nowhere near half, so the level says nothing. */
  const spread = buildLevelModel(entity, [
    row({ series: 'Wide', model: 'W1', variant: 'a', warranty: 'A' }),
    row({ series: 'Wide', model: 'W1', variant: 'b', warranty: 'A' }),
    row({ series: 'Wide', model: 'W2', variant: 'c', warranty: 'B' }),
    row({ series: 'Wide', model: 'W2', variant: 'd', warranty: 'C' }),
    row({ series: 'Wide', model: 'W3', variant: 'e', warranty: 'D' }),
  ])
  const wide = [...spread.byKey.values()].find((n) => n.value === 'Wide')?.key ?? ''

  it('reports the commonest but refuses to call it the answer', () => {
    const t = tallyAt(spread, wide, warranty)
    expect(t.commonest?.text).toBe('A')
    expect(t.commonest?.count).toBe(2)
    expect(t.answer).toBeNull()
    expect(t.noMajority).toBe(true)
    expect(t.split).toBe(false)
  })

  it('calls every row ALONE rather than marking three of five as deviant', () => {
    const { rows: standing } = standingsAt(spread, wide, warranty)
    expect(standing.every((x) => x.standing === 'alone')).toBe(true)
  })

  it('refuses reset, and the reason carries the arithmetic', () => {
    const plan = planReset(spread, wide, warranty)
    expect(plan.writes).toHaveLength(0)
    expect(plan.refusal).toBe(
      'Wide has no Warranty to inherit: its 5 variants hold 4 different values and the commonest, “A”, is on only 2. Set one here first.',
    )
  })

  it('lets a deliberate set run anyway — the level is silent, not locked', () => {
    const plan = planSet({ model: spread, levelKey: wide, field: warranty, value: 'A', replace: true })
    expect(plan.refusal).toBeNull()
    expect(plan.writes).toHaveLength(3)
  })

  it('a bare majority IS an answer — 3 of 5', () => {
    const near = buildLevelModel(entity, [
      row({ series: 'Close', model: 'C1', variant: 'a', warranty: 'A' }),
      row({ series: 'Close', model: 'C1', variant: 'b', warranty: 'A' }),
      row({ series: 'Close', model: 'C2', variant: 'c', warranty: 'A' }),
      row({ series: 'Close', model: 'C2', variant: 'd', warranty: 'B' }),
      row({ series: 'Close', model: 'C3', variant: 'e', warranty: 'C' }),
    ])
    const key = [...near.byKey.values()].find((n) => n.value === 'Close')?.key ?? ''
    expect(tallyAt(near, key, warranty).answer?.count).toBe(3)
  })

  it('blanks do not count against the majority — filling them is the point', () => {
    const mostlyBlank = buildLevelModel(entity, [
      row({ series: 'Thin', model: 'T1', variant: 'a', warranty: '3 years' }),
      row({ series: 'Thin', model: 'T1', variant: 'b', warranty: null }),
      row({ series: 'Thin', model: 'T2', variant: 'c', warranty: null }),
      row({ series: 'Thin', model: 'T2', variant: 'd', warranty: null }),
    ])
    const key = [...mostlyBlank.byKey.values()].find((n) => n.value === 'Thin')?.key ?? ''
    const t = tallyAt(mostlyBlank, key, warranty)
    expect(t.answer?.text).toBe('3 years')
    expect(t.blank).toBe(3)
    /* and a reset therefore fills all three */
    expect(planReset(mostlyBlank, key, warranty).writes).toHaveLength(3)
  })
})

describe('a row says where it stands, and blank is not an override', () => {
  it('marks the one 5-year boat as an override and the rest as inheriting', () => {
    const { rows: standing } = standingsAt(model, keyOf('Ocean Master'), warranty)
    expect(standing.map((s) => s.standing)).toEqual(['inherits', 'inherits', 'overrides'])
  })

  it('marks a blank cell UNSET, not OVERRIDES', () => {
    const { rows: standing } = standingsAt(model, keyOf('Sport'), warranty)
    expect(standing.map((s) => s.standing)).toEqual(['unset', 'inherits'])
  })

  it('marks every row ALONE where the level has no answer', () => {
    const { rows: standing } = standingsAt(model, keyOf('Classic'), warranty)
    expect(standing.map((s) => s.standing)).toEqual(['alone', 'alone'])
  })
})

describe('the blast radius is counted before the act, not estimated', () => {
  it('fills the blanks and leaves the exceptions alone', () => {
    const plan = planSet({ model, levelKey: keyOf('Ocean Master'), field: warranty, value: '3 years' })
    expect(plan.total).toBe(3)
    expect(plan.already).toHaveLength(2)
    expect(plan.blank).toHaveLength(0)
    expect(plan.differing).toHaveLength(1)
    expect(plan.writes).toHaveLength(0)
    /* nothing to write, so it says why rather than doing nothing */
    expect(plan.refusal).toBe(
      '1 variant here holds something else, and the rest already hold “3 years”. Turn on Replace to overwrite them.',
    )
  })

  it('writes the exception too when Replace is on', () => {
    const plan = planSet({
      model,
      levelKey: keyOf('Ocean Master'),
      field: warranty,
      value: '3 years',
      replace: true,
    })
    expect(plan.writes).toEqual(plan.differing)
    expect(plan.writes).toHaveLength(1)
    expect(plan.refusal).toBeNull()
  })

  it('every row under the level is in exactly one bucket', () => {
    const plan = planSet({ model, levelKey: TABLE_LEVEL_KEY, field: warranty, value: '3 years' })
    expect(plan.already.length + plan.blank.length + plan.differing.length).toBe(plan.total)
    expect(plan.total).toBe(8)
    /* 4 hold it, 1 is blank, 3 hold something else */
    expect(plan.already).toHaveLength(4)
    expect(plan.blank).toHaveLength(1)
    expect(plan.differing).toHaveLength(3)
    expect(plan.writes).toHaveLength(1)
  })

  it('hands back the writes in SHEET order, not bucket order', () => {
    const plan = planSet({
      model,
      levelKey: TABLE_LEVEL_KEY,
      field: warranty,
      value: '3 years',
      replace: true,
    })
    const order = rows.map((r) => r.id).filter((id) => plan.writes.includes(id))
    expect(plan.writes).toEqual(order)
  })

  it('narrows to named rows when asked — an individual is the same arithmetic', () => {
    const one = rows[2].id
    const plan = planSet({
      model,
      levelKey: keyOf('Ocean Master'),
      field: warranty,
      value: '3 years',
      replace: true,
      onlyRowIds: [one],
    })
    expect(plan.writes).toEqual([one])
    expect(plan.total).toBe(3)
  })

  it('says so when every row already holds the value', () => {
    const plan = planSet({
      model,
      levelKey: keyOf('Ocean Master', 'OM 540'),
      field: warranty,
      value: '3 years',
    })
    expect(plan.writes).toHaveLength(0)
    expect(plan.refusal).toBe('All 2 variants here already hold “3 years”.')
  })

  it('refuses an empty value with a reason rather than clearing a column', () => {
    const plan = planSet({ model, levelKey: keyOf('Sport'), field: warranty, value: '   ' })
    expect(plan.writes).toHaveLength(0)
    expect(plan.refusal).toBe(
      'Nothing typed yet — this sets Warranty across a level, it does not clear it.',
    )
  })
})

describe('the sentence the surface prints keeps its figures separate', () => {
  it('splits each clause into a figure and its words', () => {
    const plan = planSet({ model, levelKey: TABLE_LEVEL_KEY, field: warranty, value: '3 years' })
    expect(planLines(plan, model.noun)).toEqual([
      { n: 1, text: 'variant takes “3 years”', tone: 'write' },
      { n: 4, text: 'already hold it — nothing changes', tone: 'same' },
      { n: 3, text: 'hold something else and are left alone', tone: 'skip' },
    ])
  })

  it('never counts the same row twice when Replace is on', () => {
    /* the bug this guards: "106 take XL" printed above "106 are
       overwritten" reads as 212 rows on a level that holds 199 */
    const table = planSet({
      model,
      levelKey: TABLE_LEVEL_KEY,
      field: warranty,
      value: '3 years',
      replace: true,
    })
    /* 1 blank + 3 differing = 4 written, and the sub-clause says
       how many of the 4 were overwrites rather than fills */
    expect(planLines(table, model.noun)).toEqual([
      { n: 4, text: 'variants take “3 years”', tone: 'write' },
      { n: 4, text: 'already hold it — nothing changes', tone: 'same' },
      { n: 3, text: 'of those held something else', tone: 'write' },
    ])

    /* and with nothing blank, the write line IS the exceptions, so
       there is no second line at all */
    const series = planSet({
      model,
      levelKey: keyOf('Ocean Master'),
      field: warranty,
      value: '3 years',
      replace: true,
    })
    expect(planLines(series, model.noun)).toEqual([
      { n: 1, text: 'variant takes “3 years”', tone: 'write' },
      { n: 2, text: 'already hold it — nothing changes', tone: 'same' },
    ])
  })

  it('reports the finished act in the past tense with its level named', () => {
    const plan = planSet({
      model,
      levelKey: keyOf('Ocean Master'),
      field: warranty,
      value: '3 years',
      replace: true,
    })
    expect(describeDone(plan, model.noun)).toBe(
      'Warranty set to “3 years” on 1 variant in Ocean Master',
    )
  })
})

describe('reset to inherit puts a row back on its level', () => {
  it('writes the level’s answer over the exception', () => {
    const plan = planReset(model, keyOf('Ocean Master'), warranty)
    expect(plan.text).toBe('3 years')
    expect(plan.writes).toEqual([rows[2].id])
  })

  it('resets exactly one row when one is named', () => {
    const plan = planReset(model, keyOf('Ocean Master'), warranty, [rows[2].id])
    expect(plan.writes).toEqual([rows[2].id])
  })

  it('refuses on a split level, and names both sides', () => {
    const plan = planReset(model, keyOf('Classic'), warranty)
    expect(plan.writes).toHaveLength(0)
    expect(plan.refusal).toBe(
      'Classic is split — 1 variant says “1 year” and 1 says “2 years”. There is nothing to inherit until one of them is the answer.',
    )
  })

  it('refuses when nothing under the level holds a value at all', () => {
    const empty = buildLevelModel(entity, [row({ series: 'Ghost', model: 'G1', warranty: null })])
    const key = [...empty.byKey.values()].find((n) => n.value === 'Ghost')?.key ?? ''
    const plan = planReset(empty, key, warranty)
    expect(plan.refusal).toBe(
      'Warranty is not set on any variant under Ghost, so there is nothing to inherit.',
    )
  })
})

describe('a column that cannot be set at a level says why, where it is', () => {
  const refusalFor = (id: string): string | null =>
    columnRefusal(model, fields.find((f) => f.id === id) as FieldDef)

  it('refuses a formula column and points at what it reads', () => {
    expect(refusalFor('total')).toBe(
      'Total is worked out from other columns — set the columns it reads.',
    )
  })

  it('refuses a picture column', () => {
    expect(refusalFor('photo')).toBe('Pictures belong to one variant at a time.')
  })

  it('refuses a drawer column, because setting it re-files the level away', () => {
    expect(refusalFor('series')).toContain('one of the levels this table is filed under')
    expect(refusalFor('model')).toContain('one of the levels this table is filed under')
  })

  it('refuses the naming column, because a name belongs to one row', () => {
    expect(refusalFor('variant')).toBe(
      'Variant is what each variant is called, and a name belongs to one of them.',
    )
  })

  it('allows an ordinary column', () => {
    expect(refusalFor('warranty')).toBeNull()
    expect(refusalFor('shaft')).toBeNull()
  })

  it('offers every column with its verdict, in sheet order', () => {
    const cols = levelColumns(model)
    expect(cols.map((c) => c.field.id)).toEqual(fields.map((f) => f.id))
    expect(cols.filter((c) => c.refusal === null).map((c) => c.field.id)).toEqual([
      'warranty',
      'shaft',
    ])
  })

  it('carries the column’s refusal onto the plan rather than writing', () => {
    const plan = planSet({
      model,
      levelKey: keyOf('Ocean Master'),
      field: formulaCol,
      value: '9',
    })
    expect(plan.writes).toHaveLength(0)
    expect(plan.refusal).toContain('worked out from other columns')
  })
})

describe('a value reads the way a dealer reads it', () => {
  it('prints a boolean as Yes and No, not true and false', () => {
    const flag = F('d', 'Discontinued', 'boolean')
    expect(valueText(true, flag)).toBe('Yes')
    expect(valueText(false, flag)).toBe('No')
  })

  it('prints nothing for an empty cell', () => {
    expect(valueText(null, warranty)).toBe('')
  })

  it('resolves a link to the row it points at', () => {
    const link: FieldDef = { id: 'sup', name: 'Supplier', type: 'reference', refEntityId: 'x' }
    expect(valueText('row-9', link, (_f, id) => (id === 'row-9' ? 'Yamaha' : undefined))).toBe(
      'Yamaha',
    )
    /* and falls back to the id rather than to a blank, so a broken
       link is visible instead of silently empty */
    expect(valueText('row-9', link)).toBe('row-9')
  })
})

/* ============================================================
   AND AGAINST THE REAL PRICE FILE
   ============================================================ */

const project = buildNorthsideProject()

const tableNamed = (name: string): { entity: EntityDef; rows: RowData[] } => {
  const found = project.entities.find((e) => e.name === name)
  if (!found) throw new Error(`no table named ${name}`)
  return { entity: found, rows: project.rowsByEntity[found.id] ?? [] }
}

const highfield = tableNamed('Highfield Inflatables')
const hf = buildLevelModel(highfield.entity, highfield.rows)
const fieldNamed = (e: EntityDef, name: string): FieldDef => {
  const f = e.fields.find((x) => x.name === name)
  if (!f) throw new Error(`${e.name} has no ${name} column`)
  return f
}

describe('the real Highfield table — 588 variants, Series ▸ Model ▸ Variant', () => {
  it('is filed under the two drawer columns the workbook heads', () => {
    expect(hf.total).toBe(588)
    expect(hf.levelNames).toEqual(['Series', 'Model'])
    expect(hf.noun).toEqual({ one: 'variant', many: 'variants' })
  })

  it('every Series adds up to the table, and every Model to its Series', () => {
    const sum = hf.root.children.reduce((n, c) => n + c.rows.length, 0)
    expect(sum).toBe(588)
    for (const series of hf.root.children) {
      const inner = series.children.reduce((n, c) => n + c.rows.length, 0)
      expect(inner).toBe(series.rows.length)
    }
  })

  it('no drawer is empty and no row is filed twice', () => {
    const seen = new Set<string>()
    for (const series of hf.root.children) {
      expect(series.rows.length).toBeGreaterThan(0)
      for (const r of series.rows) {
        expect(seen.has(r.id)).toBe(false)
        seen.add(r.id)
      }
    }
    expect(seen.size).toBe(588)
  })

  it('the largest Series really is that large — the figure a plan quotes', () => {
    const biggest = [...hf.root.children].sort((a, b) => b.rows.length - a.rows.length)[0]
    /* counted from the seed, not estimated */
    expect(biggest.label).toBe('Sport')
    expect(biggest.rows.length).toBe(199)
  })

  it('setting Shaft Lgth on the biggest Series counts every row exactly once', () => {
    const biggest = [...hf.root.children].sort((a, b) => b.rows.length - a.rows.length)[0]
    const shaftLgth = fieldNamed(highfield.entity, 'Shaft Lgth')
    const plan = planSet({ model: hf, levelKey: biggest.key, field: shaftLgth, value: 'XL' })
    expect(plan.already.length + plan.blank.length + plan.differing.length).toBe(199)
    expect(plan.total).toBe(199)
    /* every write is a row that was blank, because Replace is off */
    expect(plan.writes.length).toBe(plan.blank.length)
    for (const id of plan.writes) expect(plan.differing).not.toContain(id)
  })

  it('with Replace on, writes is exactly blank + differing and never touches the rest', () => {
    const biggest = [...hf.root.children].sort((a, b) => b.rows.length - a.rows.length)[0]
    const shaftLgth = fieldNamed(highfield.entity, 'Shaft Lgth')
    const plan = planSet({
      model: hf,
      levelKey: biggest.key,
      field: shaftLgth,
      value: 'XL',
      replace: true,
    })
    expect(plan.writes.length).toBe(plan.blank.length + plan.differing.length)
    expect(plan.writes.length + plan.already.length).toBe(plan.total)
  })

  it('reset to inherit only ever writes rows that were overriding', () => {
    const shaftLgth = fieldNamed(highfield.entity, 'Shaft Lgth')
    for (const series of hf.root.children) {
      const { rows: standing } = standingsAt(hf, series.key, shaftLgth)
      const plan = planReset(hf, series.key, shaftLgth)
      const overriding = standing.filter((s) => s.standing === 'overrides').map((s) => s.rowId)
      const blanks = standing.filter((s) => s.standing === 'unset').map((s) => s.rowId)
      if (plan.refusal !== null) {
        /* A reset is refused for exactly two reasons, and they are
           the only two: the level has no answer, or every row is
           already on it. Never silently. */
        const noAnswer = tallyAt(hf, series.key, shaftLgth).answer === null
        expect(noAnswer || overriding.length + blanks.length === 0).toBe(true)
        continue
      }
      /* a reset fills blanks as well — both are "not on the level" */
      expect([...plan.writes].sort()).toEqual([...overriding, ...blanks].sort())
    }
  })
})

describe('the column that made the majority rule necessary', () => {
  /* Highfield's `Warranty` column holds a PRICE. Sport runs 199
     variants across dozens of figures with the commonest on a
     handful — the exact shape a plurality rule turned into "the
     level's answer" and offered to flatten in one press. */
  it('gives Sport no Warranty answer, and says why with its own figures', () => {
    const sport = hf.root.children.find((c) => c.label === 'Sport')
    expect(sport).toBeDefined()
    const w = fieldNamed(highfield.entity, 'Warranty')
    const t = tallyAt(hf, sport?.key ?? '', w)
    expect(t.commonest).not.toBeNull()
    expect((t.commonest?.count ?? 0) * 2).toBeLessThanOrEqual(t.total - t.blank)
    expect(t.answer).toBeNull()

    const plan = planReset(hf, sport?.key ?? '', w)
    expect(plan.writes).toHaveLength(0)
    expect(plan.refusal).toContain('has no Warranty to inherit')
    expect(plan.refusal).toContain('is on only')
  })

  it('and marks none of its 199 as differing, because there is nothing to differ from', () => {
    const sport = hf.root.children.find((c) => c.label === 'Sport')
    const { rows: standing } = standingsAt(hf, sport?.key ?? '', fieldNamed(highfield.entity, 'Warranty'))
    expect(standing).toHaveLength(199)
    expect(standing.some((s) => s.standing === 'overrides')).toBe(false)
  })
})

describe('every table in the price file that has levels behaves', () => {
  const withLevels = project.entities
    .map((e) => ({ entity: e, rows: project.rowsByEntity[e.id] ?? [] }))
    .map((t) => ({ ...t, model: buildLevelModel(t.entity, t.rows) }))
    .filter((t) => t.model.levelIds.length > 0)

  it('finds every hierarchical table in the workbook', () => {
    expect(withLevels.length).toBe(22)
  })

  it('files every row of every one of them, exactly once, at every depth', () => {
    for (const t of withLevels) {
      expect(t.model.root.rows.length).toBe(t.rows.length)
      const seen = new Set<string>()
      const walk = (node: (typeof t.model.root)['children'][number]): void => {
        if (node.children.length === 0) {
          for (const r of node.rows) {
            expect(seen.has(r.id)).toBe(false)
            seen.add(r.id)
          }
          return
        }
        expect(node.children.reduce((n, c) => n + c.rows.length, 0)).toBe(node.rows.length)
        for (const c of node.children) walk(c)
      }
      for (const c of t.model.root.children) walk(c)
      expect(seen.size).toBe(t.rows.length)
    }
  })

  it('never lets the three buckets disagree with the level’s own row count', () => {
    for (const t of withLevels) {
      const settable = levelColumns(t.model).filter((c) => c.refusal === null)
      if (settable.length === 0) continue
      const field = settable[0].field
      for (const level of [t.model.root, ...t.model.root.children]) {
        const plan = planSet({
          model: t.model,
          levelKey: level.key,
          field,
          value: 'a value nothing in this workbook holds',
        })
        expect(plan.already.length + plan.blank.length + plan.differing.length).toBe(
          level.rows.length,
        )
        expect(plan.total).toBe(level.rows.length)
      }
    }
  })

  it('refuses every formula, picture, drawer, naming and machinery column, and nothing else', () => {
    for (const t of withLevels) {
      for (const col of levelColumns(t.model)) {
        const locked =
          col.field.type === 'formula' ||
          col.field.type === 'image' ||
          t.model.levelIds.includes(col.field.id) ||
          (t.entity.hierarchy ?? []).slice(-1)[0] === col.field.id ||
          isPairFieldId(col.field.id) ||
          isSystemFieldId(col.field.id)
        expect(col.refusal === null).toBe(!locked)
      }
    }
  })

  it('never offers the three columns a curated join carries', () => {
    /* model.ts: they are "locked in the grid like the UID column",
       and `__origin` is the fitment engine's own record of whether
       a rule made a pairing or a person pinned it. A door that set
       it across 2,519 pairings would be a way round that lock. */
    const joins = project.entities.filter((e) => e.role === 'join')
    expect(joins.length).toBeGreaterThan(0)
    let seen = 0
    for (const entity of joins) {
      const m = buildLevelModel(entity, project.rowsByEntity[entity.id] ?? [])
      for (const col of levelColumns(m)) {
        if (!isPairFieldId(col.field.id)) continue
        seen += 1
        expect(col.refusal).toContain('machinery')
      }
    }
    expect(seen).toBeGreaterThan(0)
  })
})
