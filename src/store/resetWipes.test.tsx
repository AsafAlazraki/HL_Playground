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

/** One of each: four the business owns, under two different
 *  organisations, and four that must be standing afterwards. */
const OWNED = {
  'helmlogic.constraints.v1:some-other-yard': '[{"id":"c1"}]',
  'hl.pipeline.notes.v1:northside-marine': '{"d1":["note"]}',
  'helmlogic.seed.v1': '{"at":"2026-01-01"}',
  'hl.merges.v1:northside-marine': '[{"tableId":"t1"}]',
}

/* THE QUOTES ARE IN HERE, and they were in OWNED until 2026-09-12.

   This test asserted that pressing "start again" destroyed
   `helmlogic.quotes.v1:northside-marine`, and `forgetBusiness.test.ts`
   next door asserted the list entry that did it — so the act and the
   list were both pinned green while the clear-sheet confirm printed,
   counted, "Your 3 quotes stay ... you can still open and print every
   one." Two tests can agree with each other and with the code and
   still all three disagree with the product. */
const PERSONAL = {
  'helmlogic.quotes.v1:northside-marine': '[{"id":"q1"}]',
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

  /* THE ONES THAT WOULD BREAK SOMETHING IF THEY WENT. The quotes are
     documents a dealer has already handed customers, and the confirm
     promises them in writing. A second tab reads the writer lock to
     know it must not write; clearing it would tell that tab it owns a
     database being emptied underneath it. And nobody pressing "start
     again" means "sign me out". */
  it('LEAVES THE QUOTES, THE SESSION, THE WRITER LOCK AND THE THEME', async () => {
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
