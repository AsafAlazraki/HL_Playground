/* ============================================================
   A COLD LOAD STRAIGHT TO A QUOTE FINDS IT.

   THE DEFECT THIS PINS. `loadQuotes()` guarded itself with a plain
   `let loaded = false`, set true on the first call and never
   reconsidered. But the store key is ORG-SCOPED (TENANCY §4.3) and
   the org is rehydrated from Dexie asynchronously on boot, so the
   first call on a cold load ran BEFORE the business existed: it
   built a key for a business with no slug, read nothing, latched,
   and never looked again.

   Measured in Chrome before the fix, with the draft sitting in
   `helmlogic.quotes.v1:northside-marine`: opening that quote's own
   URL in a fresh tab drew "That quote is no longer here." Both
   configurators, old and new — it is the persistence seam and not
   a screen. A person sharing the link to the quote on their screen
   was sending a dead page.

   It is the same shape as the latch `stillness.tsx` records being
   bitten by: a flag that says "done" when what it means is "tried
   once", failing as an ABSENCE so nothing looks broken.

   IT IS `.tsx` FOR THE STORAGE, NOT FOR THE JSX — `vitest.config.ts`
   splits the projects by extension and a `.test.ts` runs in node,
   where there is no `localStorage` to read a key back out of.
   ============================================================ */

import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '@/store/useProjectStore'
import { allQuotes, forgetQuotes, getQuote, loadQuotes } from './quotes'

const LEGACY = 'helmlogic.quotes.v1'
const ISO = '2026-01-01T00:00:00.000Z'

const quote = (id: string) => ({
  id,
  reference: id,
  state: 'draft',
  lines: [],
  adjustments: [],
  sections: [],
  createdAt: ISO,
  updatedAt: ISO,
})

/** Put a business on the sheet, the way a rehydrate does. */
function business(name: string, slug: string): void {
  useProjectStore.setState({
    meta: {
      ...useProjectStore.getState().meta,
      org: { name, slug, industry: 'marine', createdAt: ISO },
    },
  })
}

/** No business yet — the state a cold boot is in for the moments
 *  before Dexie answers. */
function noBusiness(): void {
  useProjectStore.setState({
    meta: { ...useProjectStore.getState().meta, org: undefined },
  })
}

beforeEach(() => {
  localStorage.clear()
  forgetQuotes()
  noBusiness()
})

describe('a cold load that beats the org to the draw', () => {
  it('finds the quote once the business arrives', () => {
    localStorage.setItem(
      `${LEGACY}:northside-marine`,
      JSON.stringify([quote('lIl1MKj2iE')]),
    )

    /* The boot order, exactly: a screen asks for the quote before
       the org has rehydrated. Nothing is found, and that is fine —
       what must not happen is that it stops looking. */
    noBusiness()
    loadQuotes()
    expect(getQuote('lIl1MKj2iE')).toBeUndefined()

    /* Dexie answers, the store re-renders, the hook calls again. */
    business('Northside Marine', 'northside-marine')
    loadQuotes()
    expect(getQuote('lIl1MKj2iE')?.reference).toBe('lIl1MKj2iE')
  })

  it('does not re-read once it has the right business', () => {
    localStorage.setItem(`${LEGACY}:acme`, JSON.stringify([quote('a1')]))
    business('Acme', 'acme')
    loadQuotes()
    expect(allQuotes()).toHaveLength(1)

    /* A second call with the same key must not re-parse and must
       not double-register — the guard still has to guard. */
    localStorage.setItem(`${LEGACY}:acme`, JSON.stringify([quote('a1'), quote('a2')]))
    loadQuotes()
    expect(allQuotes()).toHaveLength(1)
  })
})

describe('two businesses in one browser', () => {
  /* THE LOUDEST FAILURE AVAILABLE. A key that changes without the
     registry being cleared merges two businesses' documents into
     one list — a dealer seeing another dealer's quotes. */
  it('does not leak one business’s documents into the other', () => {
    localStorage.setItem(`${LEGACY}:northside-marine`, JSON.stringify([quote('n1')]))
    localStorage.setItem(`${LEGACY}:other-yard`, JSON.stringify([quote('o1')]))

    business('Northside Marine', 'northside-marine')
    loadQuotes()
    expect(allQuotes().map((q) => q.id)).toEqual(['n1'])

    business('Other Yard', 'other-yard')
    loadQuotes()
    expect(allQuotes().map((q) => q.id)).toEqual(['o1'])
    expect(getQuote('n1')).toBeUndefined()
  })

  it('empties the list when the new business has none', () => {
    localStorage.setItem(`${LEGACY}:northside-marine`, JSON.stringify([quote('n1')]))
    business('Northside Marine', 'northside-marine')
    loadQuotes()
    expect(allQuotes()).toHaveLength(1)

    business('Empty Yard', 'empty-yard')
    loadQuotes()
    expect(allQuotes()).toHaveLength(0)
  })
})
