/* ============================================================
   A WIPED PROJECT DOES NOT COME BACK CONFIGURING RULES — and the
   reason it cannot any more is the point of this file.

   WHAT THE RISK WAS. `configure` — "set what must always be true
   here" — could not live on `ModuleDef.capabilities` for a release,
   because `ModuleCapability` was a closed union in a file that
   session did not own. So it was held in a browser-local registry
   keyed by MODULE ID, and `resetProject()` empties `modules` without
   touching localStorage. Every id in that registry survived a wipe as
   a pointer to nothing, and `createModule` does not promise the next
   id differs from one just thrown away — so a module nobody had
   configured could arrive with the product's most consequential write
   already switched on. That is exactly the default
   `DEFAULT_CAPABILITIES` exists to hold: nothing that writes is on by
   default.

   WHAT CLOSED IT. The verb is a field on the module now, so a wipe
   takes it with the module by construction and a recycled id carries
   nothing. The assertions stay anyway, aimed at the property rather
   than at the machinery: the failure they describe is the kind that
   comes back the moment somebody stores a per-module flag anywhere
   else.

   AND THE CROSSING IS ASSERTED TOO. A browser that switched the verb
   on while it lived outside the contract must keep it — that is
   `adoptConfigureVerb`, and it is written to run once.

   ASSERTED THROUGH THE REAL DOORS. `resetProject` is what CLEAR
   SHEET calls, not a helper written for this test. The repository is
   mocked for the reason `restoreAfterClear` mocks it: what is under
   test is the store's own step order, not Dexie's.

   IT IS A `.tsx` AND CARRIES NO JSX, which is deliberate.
   `vitest.config.ts` splits the two projects by extension so neither
   can quietly become the other: `.test.ts` is `node`, `.test.tsx` is
   happy-dom. The crossing reads a real `localStorage`, so it needs
   the browser environment — and this suite ran as `node` until the
   migration arrived and `window` was not defined.
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
const { adoptConfigureVerb } = await import('./adoptConfigure')

const store = () => useProjectStore.getState()

/** Does this module carry the verb — read the way every surface reads
 *  it now, off the module itself. */
const configures = (id: string): boolean =>
  store().modules[id]?.capabilities.includes('configure') ?? false

/** The registry's own key, written the way a browser from the release
 *  before this one would have left it. */
const OLD_KEY = 'helmlogic.moduleRules.v1'

describe('a wiped project does not come back configuring rules', () => {
  beforeEach(() => {
    window.localStorage.removeItem(OLD_KEY)
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

    /* an admin switches it on — through the same door every other
       verb moves through */
    store().updateModule(module.id, {
      capabilities: [...module.capabilities, 'configure'],
    })
    expect(configures(module.id)).toBe(true)

    await store().resetProject()

    expect(Object.keys(store().modules)).toHaveLength(0)
    expect(configures(module.id)).toBe(false)
  })

  it('leaves a fresh module off, even reusing the id that was on', async () => {
    /* THE ID IS THE WHOLE RISK. Nothing guarantees the next module
       gets a different one, so the assertion is written against the
       collision rather than around it. */
    const kept = 'm_reused'
    const first = store().createEntity({ name: 'Boats' })
    const was = store().createModule([first.id], 'Boats', '', kept)
    expect(was?.id).toBe(kept)
    store().updateModule(kept, { capabilities: ['browse', 'configure'] })
    expect(configures(kept)).toBe(true)

    await store().resetProject()

    const table = store().createEntity({ name: 'Motors' })
    const again = store().createModule([table.id], 'Motors', 'The motors we sell', kept)
    expect(again?.id).toBe(kept)
    expect(configures(kept)).toBe(false)
    expect(again?.capabilities).toEqual(['browse', 'search', 'open'])
  })
})

describe('the crossing, for a browser that switched it on before the contract could', () => {
  beforeEach(() => {
    window.localStorage.removeItem(OLD_KEY)
    store().replaceProject({
      name: 'Test Sheet',
      entities: [],
      groups: [],
      rules: [],
      rowsByEntity: {},
    })
  })

  it('KEEPS THE SWITCH ON, which is the whole promise of the migration', () => {
    const table = store().createEntity({ name: 'Boats' })
    const module = store().createModule([table.id], 'Boats', '')
    expect(module).not.toBeNull()
    if (!module) return
    expect(configures(module.id)).toBe(false)

    window.localStorage.setItem(OLD_KEY, JSON.stringify([module.id]))
    expect(adoptConfigureVerb()).toBe(1)
    expect(configures(module.id)).toBe(true)
  })

  it('RUNS ONCE — the record goes whether or not anything moved', () => {
    const table = store().createEntity({ name: 'Boats' })
    const module = store().createModule([table.id], 'Boats', '')
    if (!module) return
    window.localStorage.setItem(OLD_KEY, JSON.stringify([module.id]))

    expect(adoptConfigureVerb()).toBe(1)
    expect(adoptConfigureVerb()).toBe(0)
    expect(window.localStorage.getItem(OLD_KEY)).toBeNull()
  })

  it('moves nothing for a module the sheet no longer has, and still clears the key', () => {
    window.localStorage.setItem(OLD_KEY, JSON.stringify(['m_gone_for_good']))
    expect(adoptConfigureVerb()).toBe(0)
    expect(window.localStorage.getItem(OLD_KEY)).toBeNull()
  })

  it('is silent on a browser that never carried the registry', () => {
    expect(adoptConfigureVerb()).toBe(0)
  })
})