/* ============================================================
   ONE BUSINESS'S DOCUMENTS, UNDER ONE KEY — TENANCY §4.3.

   The quote store was unscoped: every quote in the browser sat under
   one key, so two organisations opened in the same browser — which
   `restoreForSignIn` makes an ordinary thing — read each other's
   documents.

   WHAT IS ASSERTED IS THE MIGRATION, because changing a key without
   moving what is under it does not lose data, it ORPHANS it: the
   quotes are still on disk and the app says nothing. That is the
   exact failure the constraint registry had when the org key went
   from the name to the slug, and it is the one worth a test.

   IT IS `.tsx` FOR THE STORAGE, NOT FOR THE JSX. `vitest.config.ts`
   splits the two projects by extension: a `.test.ts` runs in node,
   where there is no `localStorage` at all, so a migration between two
   localStorage keys cannot be exercised there. Same reason
   `mergeLog.test.tsx` and `configureVerb.test.tsx` carry the
   extension without a line of markup between them.
   ============================================================ */

import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '@/store/useProjectStore'
import { adoptLegacyQuotes } from './quotes'

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

const scoped = (): string => {
  const org = useProjectStore.getState().meta.org
  return `${LEGACY}:${org?.slug ?? '__unnamed'}`
}

beforeEach(() => {
  localStorage.clear()
  useProjectStore.getState().setOrganisation('Northside', 'marine')
})

describe('moving the unscoped store under this business', () => {
  it('CARRIES THE DOCUMENTS ACROSS AND TAKES THE OLD KEY AWAY', () => {
    localStorage.setItem(LEGACY, JSON.stringify([quote('q1'), quote('q2')]))
    expect(adoptLegacyQuotes()).toBe(2)
    expect(localStorage.getItem(LEGACY)).toBeNull()
    const moved: unknown = JSON.parse(localStorage.getItem(scoped()) ?? '[]')
    expect(Array.isArray(moved) && moved.length).toBe(2)
  })

  it('is idempotent — the second run finds nothing to move', () => {
    localStorage.setItem(LEGACY, JSON.stringify([quote('q1')]))
    expect(adoptLegacyQuotes()).toBe(1)
    expect(adoptLegacyQuotes()).toBe(0)
  })

  it('REFUSES TO OVERWRITE, and leaves the legacy store where it is', () => {
    /* two sets of documents under one name is a collision, not a
       migration, and the safe half of that choice loses nothing */
    localStorage.setItem(scoped(), JSON.stringify([quote('mine')]))
    localStorage.setItem(LEGACY, JSON.stringify([quote('theirs')]))
    expect(adoptLegacyQuotes()).toBe(0)
    expect(localStorage.getItem(LEGACY)).not.toBeNull()
    expect(localStorage.getItem(scoped())).toContain('mine')
  })

  it('does nothing where there is no legacy store', () => {
    expect(adoptLegacyQuotes()).toBe(0)
  })

  it('leaves a legacy store that is not a list alone', () => {
    localStorage.setItem(LEGACY, '{"not":"a list"}')
    expect(adoptLegacyQuotes()).toBe(0)
    expect(localStorage.getItem(LEGACY)).not.toBeNull()
  })
})

describe('two businesses in one browser', () => {
  it('DO NOT READ EACH OTHER DOCUMENTS', () => {
    localStorage.setItem(scoped(), JSON.stringify([quote('northside')]))
    const first = scoped()
    /* a different sheet, with its own organisation */
    useProjectStore.setState({
      meta: { ...useProjectStore.getState().meta, org: undefined },
    })
    useProjectStore.getState().setOrganisation('Someone Else', 'marine')
    expect(scoped()).not.toBe(first)
    expect(localStorage.getItem(scoped())).toBeNull()
  })
})
