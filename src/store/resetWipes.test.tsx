/* ============================================================
   "START AGAIN" ACTUALLY STARTS AGAIN.

   `forgetBusiness.test.ts` next door asserts the two LISTS — which
   keys belong to the business and which belong to the person. This
   asserts the ACT: that pressing reset removes the first set from
   the browser and leaves the second where it is.

   Both are needed and neither covers the other. A correct list that
   nothing calls is the state this repo was already in — the defect
   was predicted in a comment at `constraints/index.ts:63` and the
   comment was the whole of the fix.

   IT IS `.tsx` FOR THE STORAGE, not for markup: `vitest.config.ts`
   runs `.test.ts` in node, where there is no `localStorage` to empty.
   Same reason `quoteScope.test.tsx` carries the extension.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'

/* Dexie is not the subject — `repository.wipe()` is somebody else's
   test. What is measured here is everything that is NOT in Dexie. */
const wiped = vi.fn()
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
    wipe: async () => {
      wiped()
    },
  },
}))

const { useProjectStore } = await import('./useProjectStore')

/** One of each: two the business owns, under two different
 *  organisations, and three that belong to the person at the keyboard. */
const OWNED = {
  'helmlogic.quotes.v1:northside-marine': '[{"id":"q1"}]',
  'helmlogic.constraints.v1:some-other-yard': '[{"id":"c1"}]',
  'hl.pipeline.notes.v1:northside-marine': '{"d1":["note"]}',
  'helmlogic.seed.v1': '{"at":"2026-01-01"}',
  'hl.merges.v1:northside-marine': '[{"tableId":"t1"}]',
}
const PERSONAL = {
  'hl.session.user': '{"name":"Asaf"}',
  'helmlogic.sheet.writer.v1': '{"tab":"abc","at":1}',
  'hl.theme': 'dark',
}

beforeEach(() => {
  localStorage.clear()
  wiped.mockClear()
  for (const [k, v] of Object.entries({ ...OWNED, ...PERSONAL })) {
    localStorage.setItem(k, v)
  }
})

describe('resetProject', () => {
  it('still empties the database — the half that already worked', async () => {
    await useProjectStore.getState().resetProject()
    expect(wiped).toHaveBeenCalled()
  })

  it('TAKES EVERYTHING THE BUSINESS OWNS, under every organisation', async () => {
    await useProjectStore.getState().resetProject()
    for (const key of Object.keys(OWNED)) {
      expect({ key, value: localStorage.getItem(key) }).toEqual({ key, value: null })
    }
  })

  /* THE ONE THAT WOULD BREAK SOMETHING IF IT WENT. A second tab reads
     the writer lock to know it must not write; clearing it would tell
     that tab it owns a database being emptied underneath it. And
     nobody pressing "start again" means "sign me out". */
  it('LEAVES THE PERSON ALONE — the session, the writer lock and the theme', async () => {
    await useProjectStore.getState().resetProject()
    for (const [key, value] of Object.entries(PERSONAL)) {
      expect({ key, value: localStorage.getItem(key) }).toEqual({ key, value })
    }
  })

  it('leaves the sheet itself empty', async () => {
    await useProjectStore.getState().resetProject()
    const s = useProjectStore.getState()
    expect(Object.keys(s.entities)).toEqual([])
    expect(Object.keys(s.modules)).toEqual([])
    expect(s.past).toEqual([])
  })
})
