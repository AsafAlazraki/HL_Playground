/* ============================================================
   THE DEMO ARRIVES WITH ITS PLACES ALREADY MADE.

   THE HOLE THIS CLOSES. Pressing Modules on a freshly seeded
   browser landed on the dashboard's empty state — correct, well
   written, and the wrong screen for a set that ships 25 base
   tables and 15,691 rows. `modules: 0` was measured on the live
   IndexedDB the morning this was written.

   WHAT IS ASSERTED, and why each one is here rather than left to
   a screenshot:

     1. NINE PLACES, through the real store action. A module
        written straight into the map would persist and draw and
        still be wrong — `createModule` is what mints each member
        table's detail page and seeds it from that table's own
        joins.
     2. THE BRAND IS THE SHAPE OF THE INDEX. The owner's ruling,
        stated twice: "by boats I mean like highfield and stacer".
        A flat brandless list is a failed build, so the seven
        brand sections are asserted by name and by count through
        the SAME functions the index draws with.
     3. NO REFUSED VERB IS SWITCHED ON. `capabilityStates` refuses
        `quote` on a module whose tables price nothing; a seed that
        switched it on anyway would ship a screen apologising for
        its own configuration.
     4. NOTHING IS ORPHANED. Every base table on the sheet belongs
        to exactly one module — ruling 3 — checked against the
        data rather than against the list above it.
     5. IT SURVIVES A NON-MARINE ORG. A blank project seeds no
        modules and meets the dashboard's own empty state; that
        state is a real dealer's first screen and must not be
        collateral damage.
     6. EVERY PLACE IS ONE SORT OF THING. `splitReading` is the rule
        the owner's "split the modules better" became when it was
        written down, and this asserts the seeded list satisfies it —
        so the demo cannot quietly grow a bag again. It was five
        names and two of them were bags: Parts & Accessories held
        accessories beside a package library, and Rates & Charges
        held three tables whose only agreement was that the app
        cannot classify any of them.
   ============================================================ */
import { describe, expect, it, vi } from 'vitest'
import type { EntityDef, RowData } from '@/types/model'

/* Persistence is mocked: the subject is what the seed derives, not
   what Dexie writes. Same door `moduleBlocks.test.ts` comes through. */
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
const { loadNorthsideProject, northsideDrift, isStaleNorthside } = await import(
  '@/demos/northside'
)
const { buildEntries, groupEntries, listedTables, moduleTables, relatedTables } =
  await import('@/features/modules/read')
const { capabilityStates } = await import('@/features/modules/designer')
const { splitReading } = await import('@/features/modules/split')
const { categoryDrawers, censusLine, DRAWER_FLOOR, moduleCensus, moduleFace } = await import(
  '@/features/modules/read'
)

const ordered = () =>
  Object.values(useProjectStore.getState().modules).sort((a, b) => a.order - b.order)

const named = (name: string) => {
  const hit = ordered().find((m) => m.name === name)
  if (!hit) throw new Error(`no module called ${name}`)
  return hit
}

describe('the Northside demo seeds its own modules', () => {
  it('lands nine places on the dashboard, in order', () => {
    loadNorthsideProject()
    expect(ordered().map((m) => m.name)).toEqual([
      'Boats',
      'Motors',
      'Factory Packages',
      'Trailers',
      'Parts & Accessories',
      'Dealer Fit Packages',
      'Labour Rates',
      'Oils & Consumables',
      'Registration Costs',
    ])
    expect(ordered().map((m) => m.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })

  /* -- ruling 6: one place is one sort of thing --------------- */

  it('leaves no bag on the dashboard', () => {
    loadNorthsideProject()
    const { entities } = useProjectStore.getState()
    const bags = ordered()
      .map((m) => splitReading(m, entities))
      .filter((r) => !r.coherent)
      .map((r) => r.say)
    expect(bags).toEqual([])
  })

  it('would have called the old list a bag, twice', () => {
    loadNorthsideProject()
    const st = useProjectStore.getState()
    const byName = (n: string) => Object.values(st.entities).find((e) => e.name === n)!
    /* THE TWO THAT WERE WRONG, rebuilt exactly as they were seeded
       before this split, so the rule is shown catching them rather
       than merely agreeing with the answer. */
    const asBefore = (name: string, names: string[]) => ({
      ...ordered()[0],
      name,
      tableIds: names.map((n) => byName(n).id),
    })
    const parts = splitReading(
      asBefore('Parts & Accessories', [
        'Parts & Accessories',
        'Rigging Kits',
        'Dealer Fit Packages',
      ]),
      st.entities,
    )
    expect(parts.coherent).toBe(false)
    expect(parts.say).toContain('2 tables of accessories')
    expect(parts.say).toContain('1 table of packages')

    const rates = splitReading(
      asBefore('Rates & Charges', [
        'Labour Rates',
        'Oils & Consumables',
        'Registration Costs',
      ]),
      st.entities,
    )
    expect(rates.coherent).toBe(false)
    /* three tables, three parts — `custom` is the absence of a kind
       and never an agreement between two tables that carry it */
    expect(rates.parts).toHaveLength(3)
    expect(rates.say).toContain('declares no kind at all')
  })

  it('gives every module its own words, never the table’s provenance note', () => {
    loadNorthsideProject()
    const { entities } = useProjectStore.getState()
    for (const m of ordered()) {
      expect(m.description).not.toBe('')
      /* the failure ModuleStage.tsx records: Highfield's own
         description is a 202-character note about a spreadsheet row */
      const primary = entities[m.tableIds[0]]
      expect(m.description).not.toBe(primary?.description)
      expect(m.description.length).toBeLessThan(200)
    }
  })

  it('never prints a count in its prose — the badge counts, live', () => {
    loadNorthsideProject()
    /* Rates & Charges read "64 charges" while its own badge said 65 the
       moment a row was added, and Parts & Accessories read "719 lines"
       against 738 seeded. The card counts its rows from the store one
       line above the sentence (`md-card-count`), so a figure typed into
       the sentence can only ever drift out of true. No digit belongs in
       any of these. */
    for (const m of ordered()) {
      expect(m.description, m.name).not.toMatch(/\d/)
    }
  })

  /* -- ruling 2: the brand is the section -------------------- */

  it('opens Boats onto the seven brands, not onto a flat list of hulls', () => {
    loadNorthsideProject()
    const { entities, rowsByEntity } = useProjectStore.getState()
    const boats = named('Boats')
    const listed = listedTables(boats, entities)
    const sections = groupEntries(buildEntries(listed, rowsByEntity), listed)

    expect(sections.map((s) => `${s.name} ${s.count}`)).toEqual([
      'Highfield Inflatables 588',
      'Stabicraft 37',
      'Stacer 91',
      'Formosa 39',
      'Jeanneau 27',
      'Surtees 19',
      'Haines Signature 9',
    ])
    /* and INSIDE a brand, that brand's own levels — Highfield runs
       Series > Model > Variant, Formosa is flat */
    expect(sections[0].groups.length).toBeGreaterThan(1)
    expect(sections[3].groups.map((g) => g.trail)).toEqual([''])
  })

  it('cuts every other module at its own inner level too', () => {
    loadNorthsideProject()
    const { entities, rowsByEntity } = useProjectStore.getState()
    const shapeOf = (name: string): string[] => {
      const m = named(name)
      const listed = listedTables(m, entities)
      return groupEntries(buildEntries(listed, rowsByEntity), listed).map(
        (s) => `${s.name} ${s.count}`,
      )
    }

    expect(shapeOf('Motors')).toEqual([
      'Yamaha Outboards 209',
      'ePropulsion Outboards 32',
    ])
    /* THE TWO PACKAGE FILES ARE THEIR OWN PLACE NOW. Their own seed
       note says in capitals that they are NOT motors, and their
       `kind` says the same thing in a field: 'package' against the
       outboards' 'motor'. */
    expect(shapeOf('Factory Packages')).toEqual([
      'Haines Signature Factory Packages 39',
      'Jeanneau Factory Packages 50',
    ])
    expect(shapeOf('Trailers')).toEqual([
      'NSM Custom Trailers 73',
      'Dunbier Trailers 102',
      'Dunbier / Haines BMT Trailers 16',
      'Mackay Trailers 125',
      'REDCO / Tinka Trailers 52',
      'GFAB Trailers 32',
      'Stacer Trailers 34',
    ])
    /* THE COUNT A MODULE PRINTS IS LIVE STOCK, NOT ROWS ON THE SHEET, and
       that is the whole reason these three numbers are not the table sizes:
       Parts & Accessories holds 2,937 rows and shows 2,238, because 699 sit
       below the OBSOLETE PARTS divider; Dealer Fit holds 1,777 and shows
       1,576, because 201 sit below its own; Rigging Kits holds 650 and shows
       622. Both libraries used to be scoped by what a seeded hull names — 68
       and 70 — and now carry their whole sheet, which is what a parts counter
       is for. */
    expect(shapeOf('Parts & Accessories')).toEqual([
      'Parts & Accessories 2238',
      'Rigging Kits 622',
    ])
    expect(shapeOf('Dealer Fit Packages')).toEqual(['Dealer Fit Packages 1576'])
    expect(shapeOf('Labour Rates')).toEqual(['Labour Rates 18'])
    expect(shapeOf('Oils & Consumables')).toEqual(['Oils & Consumables 27'])
    expect(shapeOf('Registration Costs')).toEqual(['Registration Costs 19'])
  })

  it('files the retired trailer table without listing it', () => {
    loadNorthsideProject()
    const { entities } = useProjectStore.getState()
    const trailers = named('Trailers')
    const all = moduleTables(trailers, entities).map((e) => e.name)
    /* IN the module — ruling 3, every base table belongs somewhere */
    expect(all).toContain('OBSOLETE Trailers — No Longer Available')
    /* and OUT of the catalogue, which is what `sellableTables` is for */
    expect(listedTables(trailers, entities).map((e) => e.name)).not.toContain(
      'OBSOLETE Trailers — No Longer Available',
    )
  })

  /* -- the verbs -------------------------------------------- */

  it('switches on no verb the module itself would refuse', () => {
    loadNorthsideProject()
    const { entities } = useProjectStore.getState()
    for (const m of ordered()) {
      const states = capabilityStates(m, moduleTables(m, entities))
      const wrong = states.filter((s) => s.on && s.refused)
      expect(
        wrong.map((s) => `${m.name}: ${s.label} — ${s.refused}`),
        'a switched-on verb the module refuses',
      ).toEqual([])
    }
  })

  it('differentiates the verbs from the data, not decoratively', () => {
    loadNorthsideProject()
    const verbs = (name: string) => named(name).capabilities
    /* a boat is the source of every fitment join, so relate is real */
    expect(verbs('Boats')).toContain('relate')
    /* a trailer is the far end of one — the decision is the boat's */
    expect(verbs('Trailers')).not.toContain('relate')
    /* a part is quoted as a line on a boat's quote */
    expect(verbs('Parts & Accessories')).not.toContain('quote')
    /* a fee register is read, not opened: no join names these three */
    for (const r of ['Labour Rates', 'Oils & Consumables', 'Registration Costs']) {
      expect(verbs(r), r).not.toContain('open')
    }
    /* nothing that WRITES is on anywhere */
    for (const m of ordered()) {
      for (const w of ['add', 'edit', 'delete'] as const) {
        expect(m.capabilities).not.toContain(w)
      }
    }
  })

  /* -- what a module knows that a table does not -------------- */

  it('knows what goes with the things in it, and on how many of them', () => {
    loadNorthsideProject()
    const { entities } = useProjectStore.getState()
    const boats = relatedTables(named('Boats'), entities)
    const say = boats.map((r) => `${r.name} ${r.on}/${r.of}`)

    /* six of the seven brands take Yamaha; Haines and Jeanneau use
       factory packages, and Jeanneau takes both */
    expect(say).toContain('Yamaha Outboards 6/7')
    /* only three brands have a Dealer Fit join — the asymmetry the
       module trace measured, stated instead of shipped as empty blocks */
    expect(say).toContain('Dealer Fit Packages 3/7')
    /* sorted by how much of the module it touches */
    expect(boats[0].on).toBeGreaterThanOrEqual(boats[boats.length - 1].on)
    /* and never a table the module already holds */
    const own = new Set(named('Boats').tableIds)
    for (const r of boats) expect(own.has(r.tableId)).toBe(false)
  })

  it('gives every module’s own tables their own blocks', () => {
    loadNorthsideProject()
    const st = useProjectStore.getState()
    const viewOf = (name: string) => {
      const table = Object.values(st.entities).find((e) => e.name === name)
      return Object.values(st.views).find((v) => v.rootTableId === table?.id)
    }
    /* Formosa was 0 of 11 before the block fix; every block on its
       page now names a join that names Formosa */
    const formosa = viewOf('Formosa')
    expect(formosa?.blocks.length).toBeGreaterThan(0)
    /* and the OBSOLETE join never reaches Surtees */
    const surtees = viewOf('Surtees')
    const targets = (surtees?.blocks ?? []).map((b) => st.entities[b.tableId]?.name)
    expect(targets).not.toContain('OBSOLETE Trailers — No Longer Available')
  })

  /* -- ruling 3: nothing is orphaned -------------------------- */

  it('files every base table on the sheet in exactly one module', () => {
    loadNorthsideProject()
    const st = useProjectStore.getState()
    const filed = new Map<string, string[]>()
    for (const m of ordered()) {
      for (const id of m.tableIds) filed.set(id, [...(filed.get(id) ?? []), m.name])
    }
    const homeless: string[] = []
    const twice: string[] = []
    for (const e of Object.values(st.entities) as EntityDef[]) {
      if (e.role === 'join') continue
      const where = filed.get(e.id) ?? []
      if (where.length === 0) homeless.push(e.name)
      if (where.length > 1) twice.push(`${e.name} → ${where.join(', ')}`)
    }
    expect(homeless).toEqual([])
    expect(twice).toEqual([])
  })

  /* -- the fresh dealer, and the stale browser ---------------- */

  it('seeds nothing on a blank sheet, so the empty state still stands', () => {
    useProjectStore.getState().replaceProject({
      name: 'Untitled Sheet',
      entities: [],
      groups: [],
      rules: [],
      rowsByEntity: {},
    })
    expect(Object.keys(useProjectStore.getState().modules)).toEqual([])
  })

  it('calls a freshly seeded sheet current, and says nothing about anyone else’s', () => {
    loadNorthsideProject()
    const s = useProjectStore.getState()
    const drift = northsideDrift(s.entities, s.rowsByEntity, s.modules)
    expect(drift).not.toBeNull()
    expect(isStaleNorthside(drift)).toBe(false)

    useProjectStore.getState().replaceProject({
      name: 'Someone else’s workbook',
      entities: [],
      groups: [],
      rules: [],
      rowsByEntity: {},
    })
    const other = useProjectStore.getState()
    expect(
      northsideDrift(other.entities, other.rowsByEntity, other.modules),
    ).toBeNull()
  })

  it('says nothing about a sheet that is somebody else’s work', () => {
    loadNorthsideProject()
    const s = useProjectStore.getState()
    /* a pharmacy's twelve tables, two of which happen to share a name
       with this set — under the floor and under the share, so silent */
    const keep = Object.values(s.entities).slice(0, 2)
    const entities: Record<string, EntityDef> = {}
    const rows: Record<string, RowData[]> = {}
    for (const e of keep) {
      entities[e.id] = e
      rows[e.id] = s.rowsByEntity[e.id] ?? []
    }
    for (let i = 0; i < 10; i += 1) {
      entities[`rx-${i}`] = { ...keep[0], id: `rx-${i}`, name: `Prescriptions ${i}` }
      rows[`rx-${i}`] = []
    }
    expect(northsideDrift(entities, rows, {})).toBeNull()
  })

  it('recognises the example by what is in it, never by what it is called', () => {
    loadNorthsideProject()
    const s = useProjectStore.getState()
    /* THE TRAP THIS CATCHES. `setOrganisation` overwrites `meta.name`
       with the BUSINESS name, and the shell re-applies the
       organisation after every swap — so a project loaded from this
       file is called "Northside Marine" a frame later, and an
       identity test written against the file's own project name
       answers "not mine" for every real user. */
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
    const after = useProjectStore.getState()
    expect(after.meta.name).toBe('Northside Marine')
    expect(
      northsideDrift(after.entities, after.rowsByEntity, after.modules),
    ).not.toBeNull()
  })

  it('leaves a dealer who built on top of the example alone', () => {
    loadNorthsideProject()
    const s = useProjectStore.getState()
    /* five tables of their own beside the fifty-two: still this set,
       still current, nothing to say */
    const entities = { ...s.entities }
    const rows = { ...s.rowsByEntity }
    for (let i = 0; i < 5; i += 1) {
      const id = `own-${i}`
      entities[id] = { ...s.entities[s.modules[Object.keys(s.modules)[0]].tableIds[0]], id, name: `My table ${i}` }
      rows[id] = []
    }
    expect(isStaleNorthside(northsideDrift(entities, rows, s.modules))).toBe(false)
  })

  it('counts what differs from the set, without that being the verdict', () => {
    /* THIS TEST USED TO ASSERT THE BUG. It made one table absent and
       one table smaller and expected `isStaleNorthside` to say yes —
       which is precisely why adding a row raised the notice at a
       person who had lost nothing, over an offer to replace their
       sheet. The evidence below is still gathered and still printed;
       the verdict now comes from the fingerprint this browser was
       seeded with, and lives in seedStamp.ts. See freshness.test.ts
       for both halves of that. */
    loadNorthsideProject()
    const s = useProjectStore.getState()
    const yamaha = Object.values(s.entities).find((e) => e.name === 'Yamaha Outboards')!
    const parts = Object.values(s.entities).find((e) => e.name === 'Parts & Accessories')!
    const entities = { ...s.entities }
    delete entities[parts.id]
    const rows = { ...s.rowsByEntity, [yamaha.id]: s.rowsByEntity[yamaha.id].slice(0, 43) }

    const drift = northsideDrift(entities, rows, {})
    expect(drift?.missing).toContain('Parts & Accessories')
    expect(drift?.resized).toContainEqual({ name: 'Yamaha Outboards', has: 43, wants: 209 })
    expect(drift?.noModules).toBe(true)
    expect(drift?.moduleCount).toBe(9)
    /* seeded from THIS build, so none of the above makes it an older
       copy — one deleted table and one shortened table is a person
       working, not a stale seed */
    expect(isStaleNorthside(drift)).toBe(false)
  })
})

/* ============================================================
   AND WHAT EACH PLACE SAYS ABOUT ITSELF.

   "2,937 products" is a fact. "2,238 products across 180 categories ·
   699 no longer sold" is a picture, and the difference between them is
   the whole of the owner's "the counts should mean something". Every
   figure below is read off the loaded sheet by the same functions the
   dashboard card and the index header print, so a number that moves in
   the workbook moves here and nothing has to be re-typed.

   THE FACE IS COUNTED, NOT DECLARED. `moduleFace` asks how many of a
   module's live rows actually carry a picture, which is a different
   question from whether some table declares a picture column — Motors
   runs Yamaha beside ePropulsion, which has no such column at all, and
   Boats runs Highfield beside Formosa, which fills its column on 18
   rows of 39. The gap between the two sides of the floor is what makes
   half a safe place to put it, and this asserts that gap.
   ============================================================ */
describe('what a module says it is made of', () => {
  it('counts a register in the dealer’s own nouns, not in rows', () => {
    loadNorthsideProject()
    const { entities, rowsByEntity } = useProjectStore.getState()
    const parts = moduleCensus(named('Parts & Accessories'), entities, rowsByEntity)

    /* 2,937 parts less the 699 below the sheet's own OBSOLETE divider,
       plus 650 rigging kits less the 28 below theirs */
    expect(parts.items).toBe(2238 + 622)
    expect(parts.held).toBe(699 + 28)
    /* both tables are `accessory` and their leaf columns disagree
       (Product / Rigging Kit), so the kind's own plural is the one
       true word for the set — that is `kindNoun`'s stated job */
    expect(parts.noun).toBe('accessories')
    /* and BOTH banner words are said, because "206 groups" is jargon
       and picking one table's word over the other's is a small lie
       about the other */
    expect(parts.branches).toEqual([
      { noun: 'categories', count: 179 },
      { noun: 'sections', count: 25 },
    ])
    expect(censusLine(parts)).toBe(
      '2,860 accessories across 179 categories and 25 sections · 727 no longer sold',
    )
  })

  it('says nothing it did not count', () => {
    loadNorthsideProject()
    const { entities, rowsByEntity } = useProjectStore.getState()
    /* a flat register with nothing held back: no "across", no
       "no longer sold", and the dealer's own word for one row */
    const rates = moduleCensus(named('Labour Rates'), entities, rowsByEntity)
    expect(rates.branches).toEqual([])
    expect(rates.held).toBe(0)
    expect(censusLine(rates)).toBe('18 rates')

    const oils = moduleCensus(named('Oils & Consumables'), entities, rowsByEntity)
    expect(censusLine(oils)).toBe('27 consumables')
  })

  it('holds the retired trailer table back in words, never in silence', () => {
    loadNorthsideProject()
    const { entities, rowsByEntity } = useProjectStore.getState()
    const trailers = moduleCensus(named('Trailers'), entities, rowsByEntity)
    expect(trailers.items).toBe(434)
    /* the ten rows of the OBSOLETE table, which is history rather
       than stock and has no section in the catalogue at all */
    expect(trailers.held).toBe(10)
    expect(censusLine(trailers)).toContain('10 no longer sold')
  })

  /* -- the face, counted off the rows ------------------------ */

  it('gives a catalogue tiles and a register rows, from the rows themselves', () => {
    loadNorthsideProject()
    const { entities, rowsByEntity } = useProjectStore.getState()
    const faceOf = (name: string) =>
      moduleFace(listedTables(named(name), entities), rowsByEntity)

    const boats = faceOf('Boats')
    expect(boats.mode).toBe('tiles')
    expect([boats.pictured, boats.live]).toEqual([724, 810])

    /* THE CASE THE OLD RULE GOT WRONG BY ACCIDENT AND THE NEW ONE GETS
       RIGHT ON PURPOSE. Motors is Yamaha, which pictures 203 of 209,
       beside ePropulsion, which declares no picture column at all. The
       column question answers "yes" off the primary table and says
       nothing about the other 32 rows; the row question counts them. */
    const motors = faceOf('Motors')
    expect(motors.mode).toBe('tiles')
    expect([motors.pictured, motors.live]).toEqual([203, 241])

    /* and every register is EXACTLY zero, which is why a floor at half
       is nowhere near either side of the line on this data */
    for (const r of [
      'Parts & Accessories',
      'Dealer Fit Packages',
      'Labour Rates',
      'Oils & Consumables',
      'Registration Costs',
    ]) {
      const face = faceOf(r)
      expect(face.pictured, r).toBe(0)
      expect(face.mode, r).toBe('rows')
    }
  })

  it('is the face every seeded module was actually born with', () => {
    loadNorthsideProject()
    const { entities, rowsByEntity } = useProjectStore.getState()
    /* `createModule` asks `moduleFace`, so the stored field and the
       measurement can never be two different answers on a fresh seed */
    for (const m of ordered()) {
      expect(m.index, m.name).toBe(
        moduleFace(listedTables(m, entities), rowsByEntity).mode,
      )
    }
  })

  /* -- the drawers ------------------------------------------- */

  it('files a big register into its own banners, and leaves a small one alone', () => {
    loadNorthsideProject()
    const { entities, rowsByEntity } = useProjectStore.getState()
    const drawersOf = (name: string) => {
      const listed = listedTables(named(name), entities)
      return categoryDrawers(buildEntries(listed, rowsByEntity), listed)
    }

    const parts = drawersOf('Parts & Accessories')
    expect(parts).toHaveLength(206)
    expect(parts.length).toBeGreaterThanOrEqual(DRAWER_FLOOR)
    /* 179 categories and 25 sections that carry a name, plus one
       drawer per table for the lines the sheet banners under a spacer
       — every line lands in exactly one of them, so the page can state
       what a narrowing put away without a remainder */
    expect(parts.reduce((n, d) => n + d.count, 0)).toBe(2238 + 622)
    /* the sheet really does banner some lines under nothing, and the
       drawer that holds them says so rather than being given a name */
    expect(parts.some((d) => d.name === '')).toBe(true)
    /* the dealer's own banner word, per table */
    expect(new Set(parts.map((d) => d.of))).toEqual(new Set(['category', 'section']))

    /* four bands is a register to read, not one to open */
    expect(drawersOf('Registration Costs').length).toBeLessThan(DRAWER_FLOOR)
  })

  it('takes both ends of a drawer’s range off real rows in it', () => {
    loadNorthsideProject()
    const { entities, rowsByEntity } = useProjectStore.getState()
    const listed = listedTables(named('Parts & Accessories'), entities)
    const entries = buildEntries(listed, rowsByEntity)
    const drawers = categoryDrawers(entries, listed)

    for (const d of drawers) {
      const mine = entries.filter(
        (e) => e.tableId === d.tableId && e.branch === d.name,
      )
      const priced = mine.filter((e) => e.price !== '' && e.amount !== undefined)
      if (priced.length === 0) {
        expect(d.low, d.name).toBe('')
        expect(d.high, d.name).toBe('')
        continue
      }
      /* both ends are a row that is really in the drawer — never an
         average, never a rounding, never a figure nobody can find */
      expect(priced.map((e) => e.price), d.name).toContain(d.low)
      expect(priced.map((e) => e.price), d.name).toContain(d.high)
    }
  })
})
