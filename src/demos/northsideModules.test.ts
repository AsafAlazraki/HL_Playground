/* ============================================================
   THE DEMO ARRIVES WITH ITS PLACES ALREADY MADE.

   THE HOLE THIS CLOSES. Pressing Modules on a freshly seeded
   browser landed on the dashboard's empty state — correct, well
   written, and the wrong screen for a set that ships 25 base
   tables and 15,691 rows. `modules: 0` was measured on the live
   IndexedDB the morning this was written.

   WHAT IS ASSERTED, and why each one is here rather than left to
   a screenshot:

     1. FIVE PLACES, through the real store action. A module
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

const ordered = () =>
  Object.values(useProjectStore.getState().modules).sort((a, b) => a.order - b.order)

const named = (name: string) => {
  const hit = ordered().find((m) => m.name === name)
  if (!hit) throw new Error(`no module called ${name}`)
  return hit
}

describe('the Northside demo seeds its own modules', () => {
  it('lands five places on the dashboard, in order', () => {
    loadNorthsideProject()
    expect(ordered().map((m) => m.name)).toEqual([
      'Boats',
      'Motors',
      'Trailers',
      'Parts & Accessories',
      'Rates & Charges',
    ])
    expect(ordered().map((m) => m.order)).toEqual([0, 1, 2, 3, 4])
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
      'Haines Signature Factory Packages 39',
      'Jeanneau Factory Packages 50',
      'ePropulsion Outboards 32',
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
      'Dealer Fit Packages 1576',
    ])
    expect(shapeOf('Rates & Charges')).toEqual([
      'Labour Rates 18',
      'Oils & Consumables 27',
      'Registration Costs 19',
    ])
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
    expect(verbs('Rates & Charges')).not.toContain('open')
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
    expect(drift?.moduleCount).toBe(5)
    /* seeded from THIS build, so none of the above makes it an older
       copy — one deleted table and one shortened table is a person
       working, not a stale seed */
    expect(isStaleNorthside(drift)).toBe(false)
  })
})
