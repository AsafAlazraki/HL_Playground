/* ============================================================
   CLEAR SHEET, THEN BRING THE BACKUP BACK.

   THE TRAP, MEASURED. `resetProject` wipes meta including the
   organisation. Measured immediately after: entities 0, rows 0, views
   0, modules 0, rules 0, meta 0 — and the shell's gate is
   `!org && tableCount === 0`, so the next frame is onboarding. The
   ONLY import door in the app was on Home's toolbar, behind that
   gate. Somebody who cleared the sheet in order to restore a backup
   could not restore it. There was no way out of the app's own front
   door.

   WHAT THIS PINS is the data path that door walks, end to end and
   through the real functions: save a copy of a full sheet, clear it,
   confirm the shell would show onboarding, then open the saved copy
   the way `OpenSavedCopy` does — and land back on a sheet with
   everything on it, including the organisation, so the person is not
   asked to name their business a second time.

   The screen itself cannot be rendered here (this suite is `node`
   with no DOM by deliberate choice — see vitest.config.ts), so what
   is asserted is the seam: `readEnvelopeFile`'s validated envelope,
   `applyReplace`, and the gate's two conditions.
   ============================================================ */
import { describe, expect, it, vi } from 'vitest'
import type { ProjectExport, RowData } from '@/types/model'

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
const { readSeedStamp } = await import('@/demos/seedStamp')
const { buildExportPayload } = await import('./exportPayload')
const { validateEnvelope } = await import('./envelope')
const { applyReplace } = await import('./apply')

/** the gate in Shell.tsx, quoted rather than paraphrased */
const wouldShowOnboarding = (): boolean => {
  const s = useProjectStore.getState()
  return !s.meta.org && Object.keys(s.entities).length === 0
}

const rowsIn = (rows: Record<string, RowData[]>): number =>
  Object.values(rows).reduce((n, l) => n + l.length, 0)

describe('a saved copy survives CLEAR SHEET', () => {
  it('comes back through the same envelope the onboarding door reads', async () => {
    loadNorthsideProject()
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')

    const before = useProjectStore.getState()
    const tables = Object.keys(before.entities).length
    const rows = rowsIn(before.rowsByEntity)
    const modules = Object.keys(before.modules).length
    expect(tables).toBeGreaterThan(0)
    expect(rows).toBeGreaterThan(0)

    /* the file the person keeps — the exact payload the Everything
       card writes */
    const saved: ProjectExport = buildExportPayload(1, true)

    /* CLEAR SHEET */
    await useProjectStore.getState().resetProject()
    const cleared = useProjectStore.getState()
    expect(Object.keys(cleared.entities)).toHaveLength(0)
    expect(rowsIn(cleared.rowsByEntity)).toBe(0)
    expect(Object.keys(cleared.modules)).toHaveLength(0)
    expect(cleared.meta.org).toBeUndefined()
    /* and this is the trap: the only import door in the app is now
       behind the wizard */
    expect(wouldShowOnboarding()).toBe(true)

    /* THE WAY OUT. Onboarding reads the file through the same
       validator the menu uses, and applies it the same way. */
    const res = validateEnvelope(JSON.parse(JSON.stringify(saved)))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    applyReplace(res.data)

    const after = useProjectStore.getState()
    expect(Object.keys(after.entities)).toHaveLength(tables)
    expect(rowsIn(after.rowsByEntity)).toBe(rows)
    expect(Object.keys(after.modules)).toHaveLength(modules)
    /* the business is named again, out of the file, so nobody is asked
       to answer onboarding twice */
    expect(after.meta.org?.name).toBe('Northside Marine')
    expect(wouldShowOnboarding()).toBe(false)
  })

  it('does not leave the seed stamp pointing at a sheet that came from a file', () => {
    loadNorthsideProject()
    expect(readSeedStamp()?.seed).toBeDefined()

    const saved = buildExportPayload(2, true)
    const res = validateEnvelope(JSON.parse(JSON.stringify(saved)))
    expect(res.ok).toBe(true)
    if (!res.ok) return
    applyReplace(res.data)

    /* the stamp records which build of the prepared set THIS BROWSER
       was seeded with. The sheet is now a file's, so the record has to
       go with the sheet it described — otherwise the freshness notice
       answers a question about a project nobody has open. */
    expect(readSeedStamp()).toBeNull()
  })
})
