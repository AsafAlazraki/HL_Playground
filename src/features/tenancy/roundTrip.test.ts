/* ============================================================
   SAVE THE ORG'S CONFIGURATION, CLEAR THE SHEET, LOAD IT BACK.

   THE WHOLE FEATURE IS THIS TRIP, so it is walked here against the
   REAL Northside set — 51 tables and 15,691 rows through the real
   store, the real exporter, the real validator and the real apply —
   rather than against a fixture. A fixture cannot catch a
   disagreement between two halves of the app; only running one into
   the other can (`io/exportPayload.ts` says what that cost twice).

   WHAT "IDENTICAL" MEANS HERE, stated rather than assumed. The
   comparison is the ENVELOPE the app itself writes, before and
   after, which covers tables, columns, rows, zones, flow rules,
   pages, modules, business rules, quotes and the organisation in one
   assertion. Three things are normalised out, and each is a FACT
   ABOUT THE APP that this test found rather than a fudge — all three
   live in io/, which is not this workflow's to edit, and all three
   are in the report:

     exportedAt          a clock reading, different by construction.

     the six timestamps   `applyReplace` restores a page by calling the
     on views and         store's own `createView`, and a module by
     modules              calling `createModule`; both mint a fresh
                          `createdAt` and then stamp `updatedAt`. The
                          page and the module KEEP THEIR IDS (io/apply.ts
                          is explicit about why — a quote names `viewId`),
                          so nothing pointing at them breaks. But "made
                          on the 3rd" becomes "made just now".

     org.createdAt        `keepingOrganisation` puts the business back by
                          calling `setOrganisation(name, industry)`, and
                          the store stamps `createdAt: nowIso()` on the
                          profile it builds (useProjectStore.ts:821).
                          `OrgProfile.createdAt` therefore cannot survive
                          any replace — an import, a prepared set, or
                          this. Measured here: 13:20:29.171Z in, 13:20:30.103Z
                          out.

     entities[].hierarchy `[]` in, absent out: envelope.ts:1401 writes the
                          key only when it is non-empty, and the contract
                          has it optional (model.ts:485), so absent and
                          empty are the same table. Lossless, and
                          normalised here only so the other two are not
                          buried under 31 of these.

     the ORDER of the     pages and modules are compared BY ID, because the
     views and modules    order they are WRITTEN IN changes. `exportPayload`
     lists                sorts both by `createdAt`, and the restore re-mints
                          `createdAt` (above), so every restored page and
                          module shares a millisecond and falls back to the
                          name tiebreak. Measured: `views[1]` was "Stabicraft
                          view" (6 blocks) before and "ePropulsion Outboards
                          view" (0 blocks) after — the SAME SET in a
                          different order, which is what comparing by id
                          proves. Nothing on screen reads that order (the
                          dashboard reads `ModuleDef.order`, which IS
                          compared exactly), but it defeats the reason
                          exportPayload.ts gives for the sort: "diffs between
                          two revisions stay short".

   Everything else — every table, every column, every row value,
   every rule node and edge, every module's tables, capabilities,
   accent and DASHBOARD ORDER — is compared exactly.

   The archive is the memory implementation (`memoryArchive`) because
   this suite runs in `environment: 'node'` and there is no IndexedDB
   there. That is not a weaker test of the trip: everything the trip
   depends on — the envelope, the validator, the apply, the scoping —
   is the real thing, and the Dexie implementation's only job is to
   hand back the bytes it was given.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RowData } from '@/types/model'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async () => {},
    wipe: async () => {},
  },
}))

const { useProjectStore } = await import('@/store/useProjectStore')
const { loadNorthsideProject } = await import('@/demos/northside')
const { buildExportPayload } = await import('@/features/io/exportPayload')
const { setConfigArchive, memoryArchive } = await import('./archive')
const {
  saveConfiguration,
  listConfigurations,
  openConfiguration,
  removeConfiguration,
  restoreForSignIn,
  suggestedConfigName,
} = await import('./configs')

/** The seeded operator, by value — `features/auth/session.ts`. */
const ASAF = {
  id: 'u-asafa1',
  name: 'Asaf Alazraki',
  email: 'asafa1@northsidemarine.com.au',
  title: 'Sales',
  orgSlug: 'northside-marine',
  orgName: 'Northside Marine',
  /* this fixture is about SCOPING, not about permission — see
     `AppUser.admin`. False, because nothing here is testing it. */
  admin: false,
}

/** A second business, so the scoping can be shown to be real rather
 *  than declared. Nothing about it is drawn anywhere — it exists for
 *  one assertion. */
const OTHER = { ...ASAF, id: 'u-other', orgSlug: 'other-yard', orgName: 'Other Yard' }

const rowsIn = (rows: Record<string, RowData[]> | undefined): number =>
  Object.values(rows ?? {}).reduce((n, l) => n + l.length, 0)

/** The envelope with the clock readings taken out, an empty
 *  `hierarchy` read as the absent one it is, and pages and modules
 *  compared BY ID rather than by position. See the header for what
 *  each of them is and why it moves. */
function comparable(file: ReturnType<typeof buildExportPayload>): unknown {
  const drop = <T extends { id: string; createdAt: string; updatedAt?: string }>(
    x: T,
  ): { id: string } => {
    const { createdAt: _c, updatedAt: _u, ...rest } = x
    return rest
  }
  const byId = <T extends { id: string }>(xs: T[]): T[] =>
    [...xs].sort((a, b) => a.id.localeCompare(b.id))
  const { exportedAt: _e, ...rest } = file
  return {
    ...rest,
    entities: file.entities.map((e) => {
      const { hierarchy, ...bare } = e
      return hierarchy && hierarchy.length > 0 ? { ...bare, hierarchy } : bare
    }),
    org: file.org ? { name: file.org.name, industry: file.org.industry } : undefined,
    views: byId((file.views ?? []).map(drop)),
    modules: byId((file.modules ?? []).map(drop)),
  }
}

beforeEach(() => {
  setConfigArchive(memoryArchive())
})

describe('the org configuration survives a clear sheet', () => {
  it('saves, clears, loads, and the working set is identical', async () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')

    const opened = useProjectStore.getState()
    const tables = Object.keys(opened.entities).length
    const rows = rowsIn(opened.rowsByEntity)
    const modules = Object.keys(opened.modules).length
    expect(tables).toBeGreaterThan(0)
    expect(rows).toBeGreaterThan(0)
    expect(modules).toBeGreaterThan(0)

    /* SAVE — under this user's org, and nowhere else */
    const saved = await saveConfiguration(ASAF, 'Northside Marine — Master Price File')
    expect(saved.ok).toBe(true)
    if (!saved.ok) return
    expect(saved.record.orgSlug).toBe('northside-marine')
    expect(saved.record.name).toBe('Northside Marine — Master Price File')
    /* what is in it, COUNTED — the figures the list prints */
    expect(saved.record.counts.tables).toBe(tables)
    expect(saved.record.counts.rows).toBe(rows)
    expect(saved.record.counts.modules).toBe(modules)
    expect(saved.record.bytes).toBeGreaterThan(0)

    /* the envelope as it stands, at the rev the save issued */
    const before = comparable(buildExportPayload(saved.record.rev, true))

    /* CLEAR SHEET */
    await useProjectStore.getState().resetProject()
    const cleared = useProjectStore.getState()
    expect(Object.keys(cleared.entities)).toHaveLength(0)
    expect(rowsIn(cleared.rowsByEntity)).toBe(0)
    expect(Object.keys(cleared.modules)).toHaveLength(0)
    expect(Object.keys(cleared.views)).toHaveLength(0)
    expect(cleared.meta.org).toBeUndefined()

    /* LOAD */
    const back = await openConfiguration(saved.record.id)
    expect(back.ok).toBe(true)
    if (!back.ok) return

    const after = useProjectStore.getState()
    expect(Object.keys(after.entities)).toHaveLength(tables)
    expect(rowsIn(after.rowsByEntity)).toBe(rows)
    expect(Object.keys(after.modules)).toHaveLength(modules)
    /* the business is named again out of the file, so nobody is asked
       to answer onboarding a second time */
    expect(after.meta.org?.name).toBe('Northside Marine')
    expect(after.meta.exportCount).toBe(saved.record.rev)

    /* AND THE WHOLE SET, FIELD BY FIELD */
    expect(comparable(buildExportPayload(saved.record.rev, true))).toEqual(before)
  })

  it('puts every module back in its dashboard position', async () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')

    const orderBefore = Object.values(useProjectStore.getState().modules)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((m) => `${m.order}:${m.name}`)
    expect(orderBefore.length).toBeGreaterThan(0)

    const saved = await saveConfiguration(ASAF)
    expect(saved.ok).toBe(true)
    if (!saved.ok) return
    await useProjectStore.getState().resetProject()
    const back = await openConfiguration(saved.record.id)
    expect(back.ok).toBe(true)

    const orderAfter = Object.values(useProjectStore.getState().modules)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((m) => `${m.order}:${m.name}`)
    expect(orderAfter).toEqual(orderBefore)
  })

  it('opens the same configuration twice without doubling anything', async () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
    const tables = Object.keys(useProjectStore.getState().entities).length

    const saved = await saveConfiguration(ASAF)
    expect(saved.ok).toBe(true)
    if (!saved.ok) return

    await openConfiguration(saved.record.id)
    await openConfiguration(saved.record.id)

    /* A REPLACE IS A REPLACE. Opening a configuration onto a sheet
       that already holds it must land on the same 51 tables, not 102
       — the failure `repository.ts` records from the other end
       ("the next open read back 156"). */
    expect(Object.keys(useProjectStore.getState().entities)).toHaveLength(tables)
  })
})

describe('a saved configuration belongs to one business', () => {
  it('is listed for its own org and for no other', async () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')

    const mine = await saveConfiguration(ASAF, 'Northside Marine — Master Price File')
    expect(mine.ok).toBe(true)

    expect((await listConfigurations('northside-marine')).map((c) => c.name)).toEqual([
      'Northside Marine — Master Price File',
    ])
    /* THE WHOLE POINT OF THE SLUG. Another dealership's list does not
       show it, and never sees the bytes. */
    expect(await listConfigurations(OTHER.orgSlug)).toEqual([])
  })

  it('lists newest first, with what each one holds', async () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')

    const first = await saveConfiguration(ASAF, 'Before the winter prices')
    expect(first.ok).toBe(true)
    /* nowIso() is millisecond-resolution, so two saves in the same
       tick would tie; the trip a person takes is not that fast, and
       the list only has to be right when they are not equal */
    await new Promise((r) => setTimeout(r, 2))
    const second = await saveConfiguration(ASAF, 'After the winter prices')
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) return

    const list = await listConfigurations('northside-marine')
    expect(list.map((c) => c.name)).toEqual([
      'After the winter prices',
      'Before the winter prices',
    ])
    /* each one says when, by whom, at what revision, and what is in it */
    expect(list[0]!.savedBy.name).toBe('Asaf Alazraki')
    expect(list[0]!.rev).toBe(second.record.rev)
    expect(list[0]!.rev).toBeGreaterThan(first.record.rev)
    expect(list[0]!.counts.tables).toBeGreaterThan(0)
    expect(Date.parse(list[0]!.savedAt)).not.toBeNaN()
  })

  it('forgets one without touching the sheet', async () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
    const tables = Object.keys(useProjectStore.getState().entities).length

    const saved = await saveConfiguration(ASAF)
    expect(saved.ok).toBe(true)
    if (!saved.ok) return

    expect(await removeConfiguration(saved.record.id)).toEqual({ ok: true })
    expect(await listConfigurations('northside-marine')).toEqual([])
    expect(Object.keys(useProjectStore.getState().entities)).toHaveLength(tables)

    /* and the one that is gone refuses in a sentence rather than
       throwing through whatever called it */
    const gone = await openConfiguration(saved.record.id)
    expect(gone.ok).toBe(false)
    if (gone.ok) return
    expect(gone.why).toContain('no longer here')
  })
})

describe('what cannot be done says why', () => {
  it('refuses to save an empty sheet, and names what to do', async () => {
    await useProjectStore.getState().resetProject()
    const res = await saveConfiguration(ASAF)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.why).toContain('no tables on the sheet')
  })

  it('refuses an account with no business', async () => {
    loadNorthsideProject()
    const res = await saveConfiguration({ ...ASAF, orgSlug: '   ' })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.why).toContain('not attached to a business')
  })

  it('refuses a record it cannot read back, in the same words a bad file gets', async () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
    const saved = await saveConfiguration(ASAF)
    expect(saved.ok).toBe(true)
    if (!saved.ok) return

    /* something has changed the bytes since they were written */
    const archive = memoryArchive()
    setConfigArchive(archive)
    await archive.write(saved.record, '{ not json')

    const res = await openConfiguration(saved.record.id)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.why).toContain('cannot be read back')
  })
})

describe('signing in', () => {
  it('restores the org’s newest configuration onto an empty sheet', async () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
    const tables = Object.keys(useProjectStore.getState().entities).length

    const saved = await saveConfiguration(ASAF, 'Northside Marine — Master Price File')
    expect(saved.ok).toBe(true)

    await useProjectStore.getState().resetProject()
    expect(Object.keys(useProjectStore.getState().entities)).toHaveLength(0)

    const res = await restoreForSignIn(ASAF)
    expect(res.kind).toBe('restored')
    if (res.kind !== 'restored') return
    expect(res.record.name).toBe('Northside Marine — Master Price File')
    expect(Object.keys(useProjectStore.getState().entities)).toHaveLength(tables)
  })

  it('never opens one over work that is already on the sheet', async () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
    const saved = await saveConfiguration(ASAF, 'A week ago')
    expect(saved.ok).toBe(true)

    /* the sheet has moved on since that save — this is Tuesday
       afternoon, unsaved, and it must not be thrown away by a screen
       nobody pressed anything on */
    const store = useProjectStore.getState()
    const anyTable = Object.keys(store.entities)[0]!
    const added = store.addRow(anyTable)
    expect(added).not.toBeNull()
    const rowsNow = rowsIn(useProjectStore.getState().rowsByEntity)

    const res = await restoreForSignIn(ASAF)
    expect(res.kind).toBe('sheet-in-use')
    expect(rowsIn(useProjectStore.getState().rowsByEntity)).toBe(rowsNow)
  })

  it('says nothing has been saved when nothing has', async () => {
    await useProjectStore.getState().resetProject()
    expect(await restoreForSignIn(ASAF)).toEqual({ kind: 'nothing-saved' })
  })
})

describe('the name a configuration is offered', () => {
  it('does not repeat the business name back at itself', () => {
    loadNorthsideProject()
    /* onboarding overwrites meta.name with the business name
       (useProjectStore.ts:820), so the two are the same string */
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
    expect(suggestedConfigName()).toBe('Northside Marine')
  })

  it('keeps a project name that already carries the business name', () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
    useProjectStore.getState().setProjectName('Northside Marine — Master Price File')
    expect(suggestedConfigName()).toBe('Northside Marine — Master Price File')
  })

  it('joins the two when the project is named something else', () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
    useProjectStore.getState().setProjectName('Winter 2026')
    expect(suggestedConfigName()).toBe('Northside Marine — Winter 2026')
  })
})
