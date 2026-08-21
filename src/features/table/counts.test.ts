/* ============================================================
   TWO FIGURES A STAKEHOLDER READS WITHOUT MEANING TO, pinned
   against the real seed.

   HOW MANY COLUMNS. Home's card read `entity.fields.length` and the
   register's readout read `visibleFields(entity).length`, so Yamaha
   Outboards was "27 columns" on the front door and "COLUMNS 28" over
   its own sheet. The band chips were the tie-breaker: they already
   summed to 27, because the locked UID column carries no `sectionId`
   and is in no band. A column nobody can rename, retype, reorder or
   delete (model.ts UID_FIELD) is not a column a person counts, so
   both figures leave it out.

   AND THE REGISTER NO LONGER DRAWS IT EITHER, which is what settled
   the disagreement rather than papering over it: the machine key was
   the first thing on screen in every register in the app, under a
   heading reading UID SYSTEM, and a row is identified to a dealer by
   the NUMBER the gutter has always printed. The model still declares
   the column (`visibleFields`), the register declines to take it, and
   the last test in the first block pins that gap so it stays a
   decision rather than a drift.

   WHAT THE ROWS ARE CALLED. `leafNoun` names rows from the column
   that names them, so a boat table counts "26 models" and never "26
   records". Formosa fell through to the jargon noun because it is the
   one boat table the workbook files under no series banner — empty
   `hierarchy`, and nothing after it. Its display column is `Model`,
   the same column its six siblings group by.

   TWO WAYS THAT DERIVATION WAS STILL WRONG ON THE FRONT DOOR, both
   fixed here and both pinned below.

   A COLUMN NAME FOOLED IT. The two Factory Packages tables are
   `kind: 'package'` with a naming column headed `Motor`, because the
   workbook types a boat-plus-engine bundle into the boat row's motor
   slot. Both cards read "39 motors" — directly contradicting
   FITMENT_RULES.md §1.3/§1.5 and the seed's own desc, which says
   "These are NOT motors" and is the reason neither brand carries a
   Yamaha motor-fitment join.

   A JOIN WAS EXEMPT. All 27 of them fell to "rows", which is 26 of the
   50 cards the front door draws. A relationship's rows are PAIRINGS —
   the name of the band each join files its two ends under.

   All of it is checked through the seed and the same functions the
   screens call, because these failures are invisible: nothing throws,
   the numbers just disagree with the research.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { isSystemFieldId, visibleFields, type EntityDef } from '@/types/model'
import { buildNorthsideProject } from '@/demos/northside'
import { buildSections } from './sections'
import { countLabel, kindNoun, leafNoun } from './grouping'

const project = buildNorthsideProject()
const byName = (name: string): EntityDef => {
  const e = project.entities.find((x) => x.name === name)
  if (!e) throw new Error(`no table named ${name} in the seed`)
  return e
}

/* The two counting expressions the two screens use, spelled out here
   so a change to either one has to come past this file.

   The register's input is `entity.fields` because that is what
   `useTableData` now hands the grid. The system filter stays anyway:
   it is what keeps this honest if a system column is ever put back in
   front of a person's own. */
const asHomeCounts = (e: EntityDef): number => e.fields.length
const asTheReadoutCounts = (e: EntityDef): number =>
  buildSections(e.fields, e.sections, new Set<string>()).slots.reduce(
    (n, s) => (s.kind === 'field' && !isSystemFieldId(s.field.id) ? n + 1 : n),
    0,
  )

describe('how many columns', () => {
  it('says 27 for Yamaha Outboards on both screens, not 27 and 28', () => {
    const yamaha = byName('Yamaha Outboards')
    expect(asHomeCounts(yamaha)).toBe(27)
    expect(asTheReadoutCounts(yamaha)).toBe(27)
  })

  it('agrees on every one of the seed’s 53 tables', () => {
    expect(project.entities.length).toBe(53)
    for (const e of project.entities) {
      expect(asTheReadoutCounts(e), e.name).toBe(asHomeCounts(e))
    }
  })

  it('is the figure the band chips already summed to', () => {
    const yamaha = byName('Yamaha Outboards')
    const banded = yamaha.fields.filter((f) => f.sectionId !== undefined).length
    /* every column on this table is in a band, and UID is in none */
    expect(banded).toBe(asHomeCounts(yamaha))
  })

  it('is one fewer than the model still declares, on purpose', () => {
    /* `visibleFields` is the model's own contract and it puts the UID
       column in front of a person's columns; the register declines to
       take it, and 27 rather than 28 is that decision, not a slip. The
       gap is pinned so removing the column from the model (or putting it
       back on screen) has to come past this file — and so nobody
       "fixes" the register by drawing a machine key again. */
    const yamaha = byName('Yamaha Outboards')
    expect(visibleFields(yamaha).length).toBe(asHomeCounts(yamaha) + 1)
    expect(visibleFields(yamaha)[0].name).toBe('UID')
    expect(isSystemFieldId(visibleFields(yamaha)[0].id)).toBe(true)
    /* and it is not one of the table's own columns, so nothing that
       reads `entity.fields` can draw it by accident */
    expect(yamaha.fields.some((f) => isSystemFieldId(f.id))).toBe(false)
  })
})

describe('what the rows are called', () => {
  it('gives Formosa the same noun as its six sibling brands', () => {
    expect(countLabel(26, leafNoun(byName('Formosa')))).toBe('26 models')
    expect(leafNoun(byName('Stacer')).many).toBe('models')
    expect(leafNoun(byName('Stabicraft')).many).toBe('models')
    expect(leafNoun(byName('Surtees')).many).toBe('models')
    expect(leafNoun(byName('Jeanneau')).many).toBe('models')
    expect(leafNoun(byName('Haines Signature')).many).toBe('models')
    /* the one brand that explodes to a colourway per row keeps its
       own deeper level */
    expect(leafNoun(byName('Highfield Inflatables')).many).toBe('variants')
  })

  it('never falls back to the jargon noun on ANY of the 53 tables', () => {
    /* joins used to be exempt from this and were the reason 26 of the 50
       cards still counted in "rows" */
    for (const e of project.entities) {
      expect(leafNoun(e).one, e.name).not.toBe('row')
    }
  })

  it('reads the dealer’s word on every other kind of table', () => {
    expect(leafNoun(byName('NSM Custom Trailers')).many).toBe('trailers')
    expect(leafNoun(byName('Registration Costs')).many).toBe('bands')
    expect(leafNoun(byName('Parts & Accessories')).many).toBe('products')
    expect(leafNoun(byName('Rigging Kits')).many).toBe('rigging kits')
    expect(leafNoun(byName('Labour Rates')).many).toBe('rates')
    expect(leafNoun(byName('Oils & Consumables')).many).toBe('consumables')
    expect(leafNoun(byName('Dealer Fit Packages')).many).toBe('packages')
  })

  it('calls a factory package a package, not a motor', () => {
    /* kind: 'package', naming column headed `Motor`, because the Master
       Price File types a boat-plus-engine bundle into the boat row's
       motor slot. The seed's own desc on both tables says "These are NOT
       motors" (FITMENT_RULES.md §1.3, §1.5) — and it is why neither
       brand has a Yamaha motor-fitment join. */
    expect(leafNoun(byName('Haines Signature Factory Packages')).many).toBe('packages')
    expect(leafNoun(byName('Jeanneau Factory Packages')).many).toBe('packages')
    expect(countLabel(39, leafNoun(byName('Jeanneau Factory Packages')))).toBe('39 packages')
    /* and the real motor tables are untouched by the guard */
    expect(leafNoun(byName('Yamaha Outboards')).many).toBe('motors')
    expect(leafNoun(byName('ePropulsion Outboards')).many).toBe('motors')
  })

  it('never lets a column name overrule a declared kind', () => {
    /* the general form of the Factory Packages failure: a naming column
       that names one of the app's OWN kinds, on a table declared to hold
       a different one, is naming a relation rather than the row */
    for (const e of project.entities) {
      if (e.role === 'join' || e.kind === undefined || e.kind === 'custom') continue
      const noun = leafNoun(e).one
      const KINDS = ['boat', 'motor', 'trailer', 'accessory', 'package', 'dealer']
      if (KINDS.includes(noun)) expect(noun, e.name).toBe(e.kind)
    }
  })

  it('gives a relationship the dealer’s word — its rows are pairings', () => {
    /* 27 of the 51 cards on the front door are Relationships, and every
       one read "· 71 rows". `Pairing` is the name of the band each join
       files its two ends under, so the word is the seed's own.

       The figures moved with the seed: the catalogue is at full scale
       (SEED_AT_FULL_SCALE.md §2.2), so `Highfield × GFAB — Trailer
       Fitment` — admitted by the specification and empty while Highfield
       carried 40 of its 588 hulls — now has 51 pairings and is a real
       table. It is the 53rd. */
    const joins = project.entities.filter((e) => e.role === 'join')
    expect(joins.length).toBe(28)
    for (const j of joins) {
      expect(leafNoun(j), j.name).toEqual({ one: 'pairing', many: 'pairings' })
    }
    expect(countLabel(71, leafNoun(byName('Formosa × NSM Custom — Trailer Fitment')))).toBe(
      '71 pairings',
    )
    expect(countLabel(1, leafNoun(joins[0]))).toBe('1 pairing')
  })

  it('gives the KIND its own word, for a count that spans several tables', () => {
    /* FITMENT totals 810 rows across seven boat tables whose naming
       columns disagree — Highfield names rows "Variant", its six
       siblings name them "Model". Both are the dealer's own word for
       their own table and neither is the word for the sum. */
    const boats = project.entities.filter((e) => e.kind === 'boat')
    expect(boats.length).toBeGreaterThan(1)
    expect(new Set(boats.map((e) => leafNoun(e).many)).size).toBeGreaterThan(1)

    expect(kindNoun('boat')).toEqual({ one: 'boat', many: 'boats' })
    expect(countLabel(810, kindNoun('boat') ?? leafNoun(undefined))).toBe('810 boats')
    expect(kindNoun('accessory')).toEqual({ one: 'accessory', many: 'accessories' })

    /* a kind that declares no word says so, so a caller says something
       else rather than inventing one */
    expect(kindNoun('custom')).toBeNull()
  })

  it('keeps the neutral word for a table a person has only just made', () => {
    const fresh: EntityDef = {
      id: 'fresh',
      name: 'My Table',
      accent: 'blue',
      fields: [{ id: 'f1', name: 'Name', type: 'text', required: true }],
      position: { x: 0, y: 0 },
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    }
    /* "12 names" is no better than "12 records" — the column is called
       for its job, not for what the row is */
    expect(leafNoun(fresh)).toEqual({ one: 'row', many: 'rows' })
  })
})
