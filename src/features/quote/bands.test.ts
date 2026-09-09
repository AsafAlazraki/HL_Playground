/* ============================================================
   THE BANDS ARE DECISIONS, ASSERTED AGAINST THE REAL SHEET.

   `bands.ts` had no test at all, and the thing it now claims is
   exactly the kind of claim that goes on LOOKING right after it
   stops being true: that this screen is organised by the PURCHASE
   and not by the price file.

   The fault it was rewritten to end was measurable — seven bands
   named *Highfield Inflatables*, *Yamaha Outboards*, *NSM Custom
   Trailers*, *GFAB Trailers*, *Dealer Fit Packages*, *Parts &
   Accessories*, *Rigging Kits* — and a screenshot would not have
   caught it coming back. A band whose name came off a table would
   still be a band, still open, still priced.

   So four claims, each against a quote minted from the real seed
   rather than a fixture:

     1 · A BAND IS A KIND. Every band's name is one of the five this
         file writes, never a table's; a kind with several tables is
         ONE band holding several headings.
     2 · THE ORDER IS FIXED and an absent kind is an absent band.
     3 · SHUT MEANS CHOSEN. Every head states where its decision
         stands — including the subject's, which said nothing at all
         before and is the one band that always has an answer.
     4 · THE SUBJECT IS RANKED BY ITS OWN KIND, which is what makes
         a motor-led quote put the hull question first and the motor
         it was raised on second.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import type { EntityDef, RowData, TableKind } from '@/types/model'

/* Persistence is mocked: the subject is what the reading derives,
   not what Dexie writes. Same door the other seed suites use. */
vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async (_snapshot: { rows: RowData[] }) => {},
    wipe: async () => {},
  },
}))

const { useProjectStore } = await import('@/store/useProjectStore')
const { loadNorthsideProject } = await import('@/demos/northside')
const { createViewFor } = await import('@/features/views')
const { mintQuoteFromView, sectionKinds } = await import('./freeze')
const { buildSteps } = await import('./steps')
const { BANDS, orderBands, stateSay } = await import('./bands')
const { catalogueOf, quoteDoors } = await import('./start')
import type { Band } from './bands'
import type { BuildStep } from './steps'

loadNorthsideProject()

const sheet = () => {
  const s = useProjectStore.getState()
  return { entities: s.entities, rowsByEntity: s.rowsByEntity, modules: s.modules }
}

/** The bands a real quote raised from the first sellable row of the
 *  first open place under `category` actually draws — the same two
 *  calls `QuoteStart.start()` makes, then the same two `QuoteBuild`
 *  makes. Nothing here is a fixture. */
function bandsFor(category: string): Band[] {
  const { modules, entities, rowsByEntity } = sheet()
  const door = quoteDoors(modules, entities, rowsByEntity).find(
    (d) => d.moduleName === category && d.refusal === '',
  )
  expect(door, `no open place under ${category}`).toBeDefined()
  const entry = catalogueOf(door!, rowsByEntity)[0]
  expect(entry).toBeDefined()

  const view = createViewFor(entry.tableId)
  const quote = mintQuoteFromView({ viewId: view.id, rowId: entry.rowId, reference: 'TEST-0001' })
  expect(quote).not.toBeNull()
  return orderBands(buildSteps(quote!), sectionKinds(quote!))
}

const NAMES = BANDS.map((b) => b.name)

/* ============================================================
   1 · A BAND IS A KIND, NEVER A TABLE
   ============================================================ */

describe('a band is a decision and not a table', () => {
  it('never names a band after a table on the price file', () => {
    const { entities } = sheet()
    const tables = new Set(Object.values(entities).map((e) => (e as EntityDef).name))
    /* the seven names the shipped screen drew are all in here */
    expect(tables.has('NSM Custom Trailers')).toBe(true)
    expect(tables.has('Parts & Accessories')).toBe(true)

    for (const category of ['Boats', 'Motors', 'Trailers', 'Factory Packages']) {
      for (const band of bandsFor(category)) {
        expect(NAMES).toContain(band.name)
        expect(tables.has(band.name)).toBe(false)
      }
    }
  })

  it('folds a kind’s several tables into ONE band with several headings', () => {
    const bands = bandsFor('Boats')
    /* The Highfield view carries two trailer tables and three the
       dealer fits. Those were five bands; they are two. */
    const trailer = bands.find((b) => b.id === 'trailer')
    expect(trailer).toBeDefined()
    expect(trailer!.tables.length).toBeGreaterThan(1)
    expect(trailer!.tables.every((t) => t.kind === 'trailer')).toBe(true)

    const fit = bands.find((b) => b.id === 'fit')
    expect(fit).toBeDefined()
    expect(fit!.tables.length).toBeGreaterThan(1)
    /* and it is the one band that legitimately mixes two kinds */
    expect(new Set(fit!.tables.map((t) => t.kind))).toEqual(new Set(['package', 'accessory']))
    /* the package a dealer sells as one item reads before the loose
       parts that make one up — kind rank, then the view's own order */
    expect(fit!.tables[0].kind).toBe('package')

    /* THE HEADLINE NUMBER: fewer bands than sections, always, on a
       sheet where any kind has more than one table. */
    const { modules, entities, rowsByEntity } = sheet()
    const door = quoteDoors(modules, entities, rowsByEntity).find(
      (d) => d.moduleName === 'Boats' && d.refusal === '',
    )!
    const entry = catalogueOf(door, rowsByEntity)[0]
    const view = createViewFor(entry.tableId)
    const quote = mintQuoteFromView({ viewId: view.id, rowId: entry.rowId, reference: 'T-2' })!
    expect(bands.length).toBeLessThan(quote.sections.length)
  })
})

/* ============================================================
   2 · THE ORDER IS FIXED, AND AN ABSENT KIND IS AN ABSENT BAND
   ============================================================ */

describe('the order a dealer learns once', () => {
  it('draws the bands in the declared order on every subject', () => {
    for (const category of ['Boats', 'Motors', 'Trailers', 'Factory Packages']) {
      const drawn = bandsFor(category).map((b) => b.id)
      const expected = BANDS.filter((s) => drawn.includes(s.id)).map((s) => s.id)
      expect(drawn, category).toEqual(expected)
    }
  })

  it('draws no band for a kind this quote has no table of', () => {
    /* the seed's boat views pair no `custom` table, so ADMINISTRATION
       is absent rather than empty */
    for (const category of ['Boats', 'Motors', 'Trailers', 'Factory Packages']) {
      const bands = bandsFor(category)
      expect(bands.every((b) => b.tables.length > 0)).toBe(true)
      expect(bands.map((b) => b.id)).not.toContain('admin')
    }
  })

  it('keeps a band’s number even where the band before it is missing', () => {
    /* A quote raised on a motor has no trailer table paired, so it
       draws 01, 02 and 04. The number is the band's identity and is
       never renumbered per document — "03" means TRAILER or it means
       nothing. */
    const nums = bandsFor('Motors').map((b) => b.num)
    expect(nums).toEqual(['01', '02', '04'])
    for (const band of bandsFor('Motors')) {
      expect(band.num).toBe(BANDS.find((s) => s.id === band.id)!.num)
    }
  })
})

/* ============================================================
   3 · SHUT MEANS CHOSEN, NEVER UNKNOWN
   ============================================================ */

describe('what a shut band says about itself', () => {
  it('never leaves a head with nothing on it', () => {
    for (const category of ['Boats', 'Motors', 'Trailers', 'Factory Packages']) {
      for (const band of bandsFor(category)) {
        expect(band.fact, `${category} / ${band.name}`).not.toBe('')
      }
    }
  })

  it('says WHAT was chosen on the band holding the subject', () => {
    /* THE ONE THAT WAS BROKEN. `bandFact` returned '' for the
       subject, so the single band that always has an answer was the
       only band that never gave one — a shut `01 THE HULL` said the
       table's name and a price and nothing about which boat. */
    const hull = bandsFor('Boats').find((b) => b.id === 'hull')
    expect(hull).toBeDefined()
    expect(hull!.decides).toBe(false)
    expect(hull!.fact.startsWith('chosen: ')).toBe(true)
    expect(hull!.fact.length).toBeGreaterThan('chosen: '.length)
  })

  it('counts what is still waiting rather than the answer already taken', () => {
    const step = (lines: number, picked: number): BuildStep =>
      ({
        id: 'x',
        title: 'T',
        section: { blockId: 'x', tableId: 't', title: 'T', lineIds: [], pickedCount: picked },
        index: 1,
        lines: Array.from({ length: lines }, (_, i) => ({ label: `L${i}` })),
        state: lines > 0 ? 'decided' : 'open',
        subject: false,
        amount: null,
        unpriced: 0,
        reach: lines > 0 ? 'chosen' : 'waiting',
        why: '',
      }) as unknown as BuildStep

    expect(stateSay([step(0, 7)])).toBe('7 offered')
    expect(stateSay([step(0, 1)])).toBe('1 offered')
    /* one of four picked is on the quote, so three are still a
       choice — saying "4 offered" would count the answer as part of
       the question */
    expect(stateSay([step(1, 4)])).toBe('chosen: L0 · 3 more offered')
    expect(stateSay([step(2, 2)])).toBe('chosen: L0 · +1 more')
    /* and nothing curated at all is not the same fact as nothing
       chosen yet */
    expect(stateSay([step(0, 0)])).toBe('nothing paired yet')
  })
})

/* ============================================================
   4 · THE SUBJECT IS RANKED BY ITS OWN KIND
   ============================================================ */

describe('a quote raised on something other than a hull', () => {
  it('puts the motor it was raised on in 02 and the open hull question first', () => {
    const bands = bandsFor('Motors')
    expect(bands[0].id).toBe('hull')
    expect(bands[0].decides).toBe(true)
    /* every boat brand the view pairs is a heading in that one band */
    expect(bands[0].tables.length).toBeGreaterThan(1)
    expect(bands[0].tables.every((t) => t.kind === 'boat')).toBe(true)

    const motor = bands.find((b) => b.id === 'motor')
    expect(motor).toBeDefined()
    /* the subject decides nothing: it is what is being configured */
    expect(motor!.decides).toBe(false)
    expect(motor!.tables.every((t) => t.step.subject)).toBe(true)
  })

  it('puts a trailer-led quote’s subject in 03 and asks for a hull first', () => {
    const bands = bandsFor('Trailers')
    expect(bands.map((b) => b.id)).toEqual(['hull', 'trailer'])
    expect(bands[1].tables.every((t) => t.step.subject)).toBe(true)
  })

  it('sorts every kind the sheet actually uses into a band', () => {
    /* A kind with no home would land nowhere and its tables would
       vanish off the screen — the one failure mode of a fixed band
       list. Asserted over the kinds the real sheet carries. */
    const used = new Set<TableKind>()
    for (const e of Object.values(sheet().entities)) {
      const kind = (e as EntityDef).kind
      if (kind) used.add(kind)
    }
    expect(used.size).toBeGreaterThan(3)
    for (const category of ['Boats', 'Motors', 'Trailers', 'Factory Packages']) {
      const { modules, entities, rowsByEntity } = sheet()
      const door = quoteDoors(modules, entities, rowsByEntity).find(
        (d) => d.moduleName === category && d.refusal === '',
      )!
      const entry = catalogueOf(door, rowsByEntity)[0]
      const view = createViewFor(entry.tableId)
      const quote = mintQuoteFromView({ viewId: view.id, rowId: entry.rowId, reference: 'T-3' })!
      const drawn = orderBands(buildSteps(quote), sectionKinds(quote)).flatMap((b) =>
        b.tables.map((t) => t.step.id),
      )
      /* every section of the document reaches exactly one band */
      expect([...drawn].sort()).toEqual(quote.sections.map((s) => s.blockId).sort())
    }
  })
})
