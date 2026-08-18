/* ============================================================
   THE WHOLE TRIP, NOT HALF OF IT.

   `envelope.roundtrip.test.ts` walks the real exporter into the real
   VALIDATOR, which is where two "the importer refuses its own export"
   bugs were caught. It stops there. Nothing in this directory has ever
   walked the other half — validator into `applyReplace`, into the
   store, and back OUT through the exporter a second time — and that is
   the half a person actually performs when they restore a backup.

   ACTION_BAR.md §4.2 names five things that must survive it:
   columns, SECTIONS, HIERARCHY, images and PROVENANCE (`Source` cells
   like `Boat Module!R829`). Three of those five had no test at all.
   They are counted here on BOTH SIDES of the trip — the sheet as the
   seed leaves it, and the sheet after export → import → export — and
   the counts are printed by the assertion when they disagree.

   AND THE IDENTITIES. A round trip that renames everything it touches
   is not a round trip. Tables, columns and rows already keep their
   ids on a replace; PAGES and MODULES did not, because `restoreDesign`
   put them back through `createView` / `createModule`, which mint. A
   quote keeps exactly two ids and `viewId` is one of them
   (features/quote/types.ts), so a dealer who restored a backup found
   every quote's "make another like this one" pointing at a page id
   that no longer existed. That is pinned below.
   ============================================================ */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntityDef, RowData } from '@/types/model'

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
const { buildExportPayload } = await import('./exportPayload')
const { validateEnvelope } = await import('./envelope')
const { applyMerge, applyReplace } = await import('./apply')

/* ------------------------------------------------------------ */
/* every figure ACTION_BAR §4.2 names, read off one snapshot      */
/* ------------------------------------------------------------ */

interface Census {
  tables: number
  columns: number
  /** named bands of columns — "Pricing", "Dimensions", "Rego" */
  sections: number
  /** every column that declares which band it is in */
  banded: number
  /** grouping levels across every table: Brand▸Range▸Model▸Variant */
  hierarchyLevels: number
  /** tables that group at all */
  hierarchies: number
  rows: number
  imageCells: number
  images: number
  /** cells citing the workbook they came from */
  provenance: number
  /** distinct citations, so a trip cannot pass by writing one of them
   *  into every row */
  provenanceDistinct: number
  views: number
  modules: number
  constraints: number
  quotes: number
}

const PROVENANCE = /^[A-Za-z][A-Za-z0-9 &'’()/-]*![A-Z]{1,3}\d+$/

function censusOf(entities: EntityDef[], rowsByEntity: Record<string, RowData[]>): Omit<
  Census,
  'views' | 'modules' | 'constraints' | 'quotes'
> {
  let columns = 0
  let sections = 0
  let banded = 0
  let hierarchyLevels = 0
  let hierarchies = 0
  for (const e of entities) {
    columns += e.fields.length
    sections += e.sections?.length ?? 0
    banded += e.fields.filter((f) => f.sectionId !== undefined).length
    const levels = e.hierarchy?.length ?? 0
    hierarchyLevels += levels
    if (levels > 0) hierarchies += 1
  }

  let rows = 0
  let imageCells = 0
  let images = 0
  let provenance = 0
  const citations = new Set<string>()
  for (const list of Object.values(rowsByEntity)) {
    rows += list.length
    for (const row of list) {
      for (const value of Object.values(row.values)) {
        if (Array.isArray(value)) {
          imageCells += 1
          images += value.length
          continue
        }
        if (typeof value === 'string' && PROVENANCE.test(value)) {
          provenance += 1
          citations.add(value)
        }
      }
    }
  }

  return {
    tables: entities.length,
    columns,
    sections,
    banded,
    hierarchyLevels,
    hierarchies,
    rows,
    imageCells,
    images,
    provenance,
    provenanceDistinct: citations.size,
  }
}

/** The sheet as it stands right now, counted through the same reader
 *  on both sides of the trip. */
function sheetCensus(): Census {
  const s = useProjectStore.getState()
  return {
    ...censusOf(Object.values(s.entities), s.rowsByEntity),
    views: Object.keys(s.views).length,
    modules: Object.keys(s.modules).length,
    constraints: 0,
    quotes: 0,
  }
}

/* ------------------------------------------------------------ */

describe('export → import → export, on the real seed', () => {
  beforeEach(() => {
    useProjectStore.setState({ views: {}, modules: {} }, false)
    loadNorthsideProject()
  })

  it('carries every column, section, grouping level, picture and citation home', () => {
    const before = sheetCensus()

    /* out */
    const file = buildExportPayload(1, true)
    const read = validateEnvelope(file)
    expect(read.ok ? null : read.error).toBeNull()
    if (!read.ok) return

    /* and back into a real store, through the door the menu uses */
    applyReplace({ ...read.data, quotes: file.quotes })

    const after = sheetCensus()

    /* THE FIGURES THIS TEST EXISTS FOR — printed side by side when
       they disagree, rather than as one failing boolean. */
    expect({
      tables: after.tables,
      columns: after.columns,
      sections: after.sections,
      banded: after.banded,
      hierarchies: after.hierarchies,
      hierarchyLevels: after.hierarchyLevels,
      rows: after.rows,
      imageCells: after.imageCells,
      images: after.images,
      provenance: after.provenance,
      provenanceDistinct: after.provenanceDistinct,
    }).toEqual({
      tables: before.tables,
      columns: before.columns,
      sections: before.sections,
      banded: before.banded,
      hierarchies: before.hierarchies,
      hierarchyLevels: before.hierarchyLevels,
      rows: before.rows,
      imageCells: before.imageCells,
      images: before.images,
      provenance: before.provenance,
      provenanceDistinct: before.provenanceDistinct,
    })

    /* and none of those is zero, or the equality above would hold on a
       sheet that lost the lot */
    expect(before.sections).toBeGreaterThan(0)
    expect(before.banded).toBeGreaterThan(0)
    expect(before.hierarchies).toBeGreaterThan(0)
    expect(before.images).toBeGreaterThan(0)
    expect(before.provenanceDistinct).toBeGreaterThan(100)
  })

  it('writes the same file the second time — the trip is a loop, not a drift', () => {
    const first = buildExportPayload(1, true)
    const read = validateEnvelope(first)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    applyReplace({ ...read.data, quotes: first.quotes })
    const second = buildExportPayload(2, true)

    const shapeOf = (e: EntityDef) => ({
      id: e.id,
      name: e.name,
      retired: e.retired ?? false,
      hierarchy: e.hierarchy ?? [],
      sections: (e.sections ?? []).map((s) => s.name),
      fields: e.fields.map((f) => `${f.id}:${f.name}:${f.type}:${f.sectionId ?? ''}`),
    })
    expect(second.entities.map(shapeOf)).toEqual(first.entities.map(shapeOf))
  })

  it('keeps a table’s own column DESCRIPTIONS, which are where the citations live', () => {
    const before = Object.values(useProjectStore.getState().entities)
      .flatMap((e) => e.fields)
      .filter((f) => (f.description ?? '') !== '').length

    const file = buildExportPayload(1, true)
    const read = validateEnvelope(file)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    applyReplace({ ...read.data, quotes: file.quotes })

    const after = Object.values(useProjectStore.getState().entities)
      .flatMap((e) => e.fields)
      .filter((f) => (f.description ?? '') !== '').length

    expect(after).toBe(before)
    expect(before).toBeGreaterThan(100)
  })

  /* ---------------------------------------------------------- */
  /* IDENTITY                                                    */
  /* ---------------------------------------------------------- */

  it('gives every table, column and row back its own id', () => {
    const s0 = useProjectStore.getState()
    const tableIds = Object.keys(s0.entities).sort()
    const rowIds = Object.values(s0.rowsByEntity)
      .flat()
      .map((r) => r.id)
      .sort()

    const file = buildExportPayload(1, true)
    const read = validateEnvelope(file)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    applyReplace({ ...read.data, quotes: file.quotes })

    const s1 = useProjectStore.getState()
    expect(Object.keys(s1.entities).sort()).toEqual(tableIds)
    expect(
      Object.values(s1.rowsByEntity)
        .flat()
        .map((r) => r.id)
        .sort(),
    ).toEqual(rowIds)
  })

  it('gives every PAGE and MODULE back its own id — a quote points at one', () => {
    const s0 = useProjectStore.getState()
    const viewIds = Object.keys(s0.views).sort()
    const moduleIds = Object.keys(s0.modules).sort()
    /* the seed really does build both, or this proves nothing */
    expect(viewIds.length).toBeGreaterThan(0)
    expect(moduleIds.length).toBeGreaterThan(0)

    /* which page each module opens onto, by id — the pointer that has
       to survive with them rather than beside them */
    const opensOnto = Object.fromEntries(
      Object.values(s0.modules).map((m) => [m.name, m.viewId]),
    )

    const file = buildExportPayload(1, true)
    const read = validateEnvelope(file)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    applyReplace({ ...read.data, quotes: file.quotes })

    const s1 = useProjectStore.getState()
    expect(Object.keys(s1.views).sort()).toEqual(viewIds)
    expect(Object.keys(s1.modules).sort()).toEqual(moduleIds)
    expect(
      Object.fromEntries(Object.values(s1.modules).map((m) => [m.name, m.viewId])),
    ).toEqual(opensOnto)
  })

  /* ---------------------------------------------------------- */
  /* AND A MERGE IS THE OTHER ANSWER, deliberately               */
  /* ---------------------------------------------------------- */

  /**
   * A REPLACE KEEPS IDS BECAUSE THE FILE *IS* THE SHEET. A merge adds
   * the file BESIDE work that is already here, and the case a merge
   * has to survive is the same backup added to the same sheet twice —
   * so an imported page keeping its id would land on top of the page
   * already wearing it and two of somebody's screens would become one.
   *
   * These two are one decision seen from both sides, which is why they
   * sit together: `restoreDesign`'s `fresh` flag is the whole of it.
   */
  it('keeps the sheet’s OWN pages and modules through a merge, ids and all', () => {
    const s0 = useProjectStore.getState()
    const viewIds = Object.keys(s0.views).sort()
    const moduleIds = Object.keys(s0.modules).sort()

    const file = buildExportPayload(1, true)
    const read = validateEnvelope(file)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    applyMerge({ ...read.data, quotes: file.quotes })

    const s1 = useProjectStore.getState()
    /* every page and module that was here is still here, under its own
       id — a quote written this morning still opens */
    for (const id of viewIds) expect(s1.views[id]).toBeDefined()
    for (const id of moduleIds) expect(s1.modules[id]).toBeDefined()
  })

  it('does NOT give a MERGED page or module the id it had in the file', () => {
    const s0 = useProjectStore.getState()
    const before = new Set(Object.keys(s0.modules))

    const file = buildExportPayload(1, true)
    const read = validateEnvelope(file)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    applyMerge({ ...read.data, quotes: file.quotes })

    const s1 = useProjectStore.getState()
    const added = Object.keys(s1.modules).filter((id) => !before.has(id))
    /* the file's modules really did arrive... */
    expect(added.length).toBeGreaterThan(0)
    /* ...and not one of them took an id the file named, because those
       ids belong to the modules that were already on this sheet */
    for (const id of added) expect(before.has(id)).toBe(false)
    expect(Object.keys(s1.modules).length).toBe(before.size + added.length)
  })
})
