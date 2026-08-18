/* ============================================================
   CLEAR SHEET FORGETS THE TENTH VERB.

   THE FAILURE THIS PINS, and it is a quiet one. `configure` —
   "set what must always be true here" — cannot live on
   `ModuleDef.capabilities` yet, because `ModuleCapability` is a
   closed union in a file this session does not own. So it is held
   in a browser-local registry keyed by MODULE ID
   (`ruleCapability.ts`), and `resetProject()` empties `modules`
   without touching localStorage.

   Left alone, every id in that registry survives a wipe as a
   pointer to nothing — and `createModule` does not promise the
   next id differs from one just thrown away. The visible symptom
   would be a module nobody has configured arriving with the
   product's most consequential write already switched on, which is
   exactly the default `DEFAULT_CAPABILITIES` exists to hold:
   "nothing that writes is on by default".

   ASSERTED THROUGH THE REAL DOOR. `resetProject` is the function
   CLEAR SHEET calls, not a helper written for this test, so the
   day somebody rewrites the wipe this fails rather than passing
   against a stub.

   The repository is mocked for the same reason `restoreAfterClear`
   mocks it: this suite is `node` with no IndexedDB, and what is
   under test is the store's own step order, not Dexie's.
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
    saveAll: async (_snapshot: { rows: RowData[] }) => {},
    wipe: async () => {},
  },
}))

const { useProjectStore } = await import('@/store/useProjectStore')
const {
  forgetModuleRuleCapabilities,
  moduleConfiguresRules,
  setModuleConfiguresRules,
} = await import('./ruleCapability')

const store = () => useProjectStore.getState()

describe('a wiped project does not come back configuring rules', () => {
  beforeEach(() => {
    forgetModuleRuleCapabilities()
    store().replaceProject({
      name: 'Test Sheet',
      entities: [],
      groups: [],
      rules: [],
      rowsByEntity: {},
    })
  })

  it('forgets the verb for every module the wipe removed', async () => {
    const table = store().createEntity({ name: 'Boats' })
    const module = store().createModule([table.id], 'Boats', 'The boats we sell')
    expect(module).not.toBeNull()
    if (!module) return

    /* an admin switches it on — the one thing this feature stores */
    setModuleConfiguresRules(module.id, true)
    expect(moduleConfiguresRules(module.id)).toBe(true)

    await store().resetProject()

    expect(Object.keys(store().modules)).toHaveLength(0)
    expect(moduleConfiguresRules(module.id)).toBe(false)
  })

  it('leaves a fresh module off, even reusing the id that was on', async () => {
    /* THE ID IS THE WHOLE RISK. Nothing guarantees the next module
       gets a different one, so the assertion is written against the
       collision rather than around it. */
    const kept = 'm_reused'
    setModuleConfiguresRules(kept, true)
    await store().resetProject()

    const table = store().createEntity({ name: 'Motors' })
    const again = store().createModule([table.id], 'Motors', 'The motors we sell', kept)
    expect(again?.id).toBe(kept)
    expect(moduleConfiguresRules(kept)).toBe(false)
    expect(again?.capabilities).toEqual(['browse', 'search', 'open'])
  })
})
