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
   both figures now leave it out.

   WHAT THE ROWS ARE CALLED. `leafNoun` names rows from the column
   that names them, so a boat table counts "26 models" and never "26
   records". Formosa fell through to the jargon noun because it is the
   one boat table the workbook files under no series banner — empty
   `hierarchy`, and nothing after it. Its display column is `Model`,
   the same column its six siblings group by.

   Both are checked through the seed and the same functions the
   screens call, because both failures are invisible: nothing throws,
   the numbers just disagree with each other.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { isSystemFieldId, visibleFields, type EntityDef } from '@/types/model'
import { buildNorthsideProject } from '@/demos/northside'
import { buildSections } from './sections'
import { countLabel, leafNoun } from './grouping'

const project = buildNorthsideProject()
const byName = (name: string): EntityDef => {
  const e = project.entities.find((x) => x.name === name)
  if (!e) throw new Error(`no table named ${name} in the seed`)
  return e
}

/* The two counting expressions the two screens use, spelled out here
   so a change to either one has to come past this file. */
const asHomeCounts = (e: EntityDef): number => e.fields.length
const asTheReadoutCounts = (e: EntityDef): number =>
  buildSections(visibleFields(e), e.sections, new Set<string>()).slots.reduce(
    (n, s) => (s.kind === 'field' && !isSystemFieldId(s.field.id) ? n + 1 : n),
    0,
  )

describe('how many columns', () => {
  it('says 27 for Yamaha Outboards on both screens, not 27 and 28', () => {
    const yamaha = byName('Yamaha Outboards')
    expect(asHomeCounts(yamaha)).toBe(27)
    expect(asTheReadoutCounts(yamaha)).toBe(27)
  })

  it('agrees on every one of the seed’s 52 tables', () => {
    expect(project.entities.length).toBe(52)
    for (const e of project.entities) {
      expect(asTheReadoutCounts(e), e.name).toBe(asHomeCounts(e))
    }
  })

  it('is the figure the band chips already summed to', () => {
    const yamaha = byName('Yamaha Outboards')
    const banded = yamaha.fields.filter((f) => f.sectionId !== undefined).length
    /* every column on this table is in a band, and UID is in none */
    expect(banded).toBe(asHomeCounts(yamaha))
    expect(visibleFields(yamaha).length).toBe(asHomeCounts(yamaha) + 1)
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

  it('never falls back to the jargon noun on a table a dealer maintains', () => {
    for (const e of project.entities) {
      if (e.role === 'join') continue
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

  it('leaves a join the neutral word — its rows are pairings, not things', () => {
    /* its display column is a computed `Label` no row fills in, and
       the front door already calls one of these a Relationship */
    const join = project.entities.find((e) => e.role === 'join')
    expect(join).toBeDefined()
    if (!join) return
    expect(leafNoun(join)).toEqual({ one: 'row', many: 'rows' })
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
