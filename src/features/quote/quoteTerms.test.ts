/* ============================================================
   THE SENTENCE A DEALERSHIP PUTS ON EVERY QUOTE.

   CONFIG_FINDINGS adopt 10 — three-layer content overrides, org
   default → brand → per-quote. Two of those layers are built here and
   the third is deliberately absent; what is asserted is the part that
   could be silently wrong, which is WHEN the default is read.

   IT IS COPIED AT CREATION AND NEVER RESOLVED. Adopt 10's own virtue
   is being "a delta rather than a document copy", and for a quote
   that is exactly wrong: a document is a photograph. Changing the
   dealership's terms must leave every quote already written alone,
   and that is the property a read-time layer could not keep.

   AND THE PROFILE MUST SURVIVE A RENAME. `setOrganisation` rebuilds
   `org` from its arguments, which is how `createdAt` came to be
   re-dated once and how the slug would have been re-derived. The
   terms are the third field to need carrying forward, so the test is
   here rather than left to the next person to discover.
   ============================================================ */

import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '@/store/useProjectStore'

const org = () => useProjectStore.getState().meta.org

beforeEach(() => {
  useProjectStore.getState().setOrganisation('Northside', 'marine')
  useProjectStore.getState().setQuoteTerms('')
})

describe('the standing terms', () => {
  it('are kept as typed', () => {
    useProjectStore.getState().setQuoteTerms('This quote is valid for 30 days.')
    expect(org()?.quoteTerms).toBe('This quote is valid for 30 days.')
  })

  it('are trimmed, because a trailing space is not part of a sentence', () => {
    useProjectStore.getState().setQuoteTerms('  Valid 30 days.  ')
    expect(org()?.quoteTerms).toBe('Valid 30 days.')
  })

  it('ARE CLEARED RATHER THAN STORED EMPTY, so a document with no note round-trips honestly', () => {
    useProjectStore.getState().setQuoteTerms('Valid 30 days.')
    useProjectStore.getState().setQuoteTerms('   ')
    expect(org()?.quoteTerms).toBeUndefined()
    expect('quoteTerms' in (org() ?? {})).toBe(false)
  })

  it('SURVIVE A RENAME, which is the trap `createdAt` and the slug both fell into', () => {
    useProjectStore.getState().setQuoteTerms('Valid 30 days.')
    useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
    expect(org()?.name).toBe('Northside Marine')
    expect(org()?.quoteTerms).toBe('Valid 30 days.')
  })

  it('do not write a profile onto a sheet that has no organisation yet', () => {
    useProjectStore.setState({ meta: { ...useProjectStore.getState().meta, org: undefined } })
    useProjectStore.getState().setQuoteTerms('Valid 30 days.')
    expect(org()).toBeUndefined()
  })
})
