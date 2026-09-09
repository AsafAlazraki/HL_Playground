/* ============================================================
   THE ADDRESS, BOTH WAYS.

   A router is one claim — "every address it writes it can read,
   and every address it reads it can write" — and that claim is
   two pure functions facing each other. So this walks all twenty
   addresses through both directions rather than trusting the
   header that says they agree.

   IT IS A `.test.ts` AND NOT A `.test.tsx`, deliberately. Nothing
   below needs a document: `queryFor`, `placeFor` and `titleFor`
   touch no window, and `url.ts` imports `Stage` with `import type`
   so `winKit.tsx` — React, ten stages, React Flow — is erased at
   build and never loaded here. A router test that mounted the app
   would be measuring the app.

   The three functions that DO touch `window` — `placeNow`,
   `correctAddress`, `showPlace` — are four lines each over
   `location` and `history`, and they are exercised where they
   actually matter: in a real browser, at 1280 x 800, on the real
   seed, which is where the before-and-after for this pass was
   measured.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { Stage } from './winKit'
import { placeFor, queryFor, titleFor } from './url'

/** EVERY PLACE THERE IS. `null` is the drawing.
 *
 *  The list is exhaustive over the `Stage` union on purpose — if a
 *  sixteenth stage is added and not addressed, `queryFor`'s switch
 *  stops compiling and this list stops being complete in the same
 *  commit. */
const PLACES: (Stage | null)[] = [
  null,
  { kind: 'home' },
  { kind: 'gallery' },
  { kind: 'history', customerId: null },
  { kind: 'levels', entityId: null },
  { kind: 'levels', entityId: 'ent_boats' },
  { kind: 'table', entityId: 'ent_boats' },
  { kind: 'view', entityId: 'ent_boats' },
  { kind: 'design', entityId: 'ent_boats' },
  { kind: 'rules' },
  { kind: 'flow' },
  { kind: 'quote', quoteId: null },
  { kind: 'quote', quoteId: 'q_V1StGXR8' },
  { kind: 'module', moduleId: null },
  { kind: 'module', moduleId: 'm_boats' },
  { kind: 'customer', customerId: null },
  { kind: 'customer', customerId: 'c_9f2' },
  { kind: 'start', at: null },
  { kind: 'data' },
  { kind: 'admin' },
]

describe('an address and the place it names', () => {
  it.each(PLACES)('reads back as itself: %j', (place) => {
    expect(placeFor(queryFor(place)).stage).toEqual(place)
  })

  it('gives every place its own address', () => {
    const written = PLACES.map(queryFor)
    expect(new Set(written).size).toBe(PLACES.length)
  })

  it('puts the front door at the root, not at ?at=home', () => {
    /* a link to the application and a link to what a person sees
       on arrival are the same link */
    expect(queryFor({ kind: 'home' })).toBe('')
  })

  it('says the drawing out loud, because it is a place and not the absence of one', () => {
    expect(queryFor(null)).toBe('?at=drawing')
    expect(placeFor('?at=drawing').stage).toBeNull()
  })

  it('writes the words the app uses, not the words the union uses', () => {
    /* commit 4c4a3e2 settled that the dock's nouns are canonical.
       An address is chrome a person reads and sometimes types. */
    expect(queryFor({ kind: 'flow' })).toBe('?at=fitment')
    expect(queryFor({ kind: 'gallery' })).toBe('?at=tables')
    expect(queryFor({ kind: 'levels', entityId: null })).toBe('?at=configure')
    expect(queryFor({ kind: 'design', entityId: 'e' })).toBe('?at=columns&id=e')
    expect(queryFor({ kind: 'start', at: null })).toBe('?at=new-quote')
  })
})

describe('what one address means — one window, and never two', () => {
  /* `winKey` (winKit.tsx:154) decides when two stages are the same
     place, and the address has to agree with it exactly or Back
     moves the URL without moving the screen. `winKey` is not
     imported here: it lives in a .tsx that pulls in ten stages and
     React Flow, and this is a node test. The three collapses it
     makes are asserted directly instead. */

  it('gives two tabs of one module one address', () => {
    expect(queryFor({ kind: 'module', moduleId: 'm', tab: 'stock' })).toBe(
      queryFor({ kind: 'module', moduleId: 'm' }),
    )
  })

  it('gives the diary one address whoever it is filtered to', () => {
    expect(queryFor({ kind: 'history', customerId: 'c_9f2' })).toBe(
      queryFor({ kind: 'history', customerId: null }),
    )
  })

  it('gives the quote picker one address wherever it opens standing', () => {
    expect(queryFor({ kind: 'start', at: 'm_boats' })).toBe(
      queryFor({ kind: 'start', at: null }),
    )
  })
})

describe('an address a person typed', () => {
  it.each([
    ['nothing at all', ''],
    ['a bare question mark', '?'],
    ['a place nobody has built', '?at=teleport'],
    ['a place that needs a subject and was given none', '?at=quote'],
    ['a link that lost its tail', '?at=table'],
    ['somebody else’s tracking', '?utm_source=email&utm_campaign=spring'],
  ])('reads %s as the front door', (_what, search) => {
    expect(placeFor(search).stage).toEqual({ kind: 'home' })
  })

  it('is corrected rather than obeyed — the canonical spelling of what it read', () => {
    /* what `correctAddress` writes back with replaceState */
    expect(queryFor(placeFor('?at=quote').stage)).toBe('')
    expect(queryFor(placeFor('?at=fitment&id=ignored').stage)).toBe('?at=fitment')
  })

  it('survives an id that would otherwise invent a second parameter', () => {
    const nasty = 'a&at=admin b?c=d'
    expect(placeFor(queryFor({ kind: 'quote', quoteId: nasty })).stage).toEqual({
      kind: 'quote',
      quoteId: nasty,
    })
  })
})

describe('what the history entry is called', () => {
  it('names the place, so the Back menu is not one word twenty times', () => {
    expect(titleFor({ kind: 'quote', quoteId: 'q1' })).toBe('Quote · HelmLogic')
    expect(titleFor({ kind: 'quote', quoteId: null })).toBe('Quotes · HelmLogic')
    expect(titleFor(null)).toBe('The drawing · HelmLogic')
  })

  it('gives the browser something different to show for each place', () => {
    /* NINETEEN OVER TWENTY, and the one collapse is named rather
       than rounded away: Configure before a table is chosen and
       Configure on a table are both "Configure", because the
       table's name lives in a registry this file deliberately does
       not read. Two different tables would collapse the same way —
       both "Table" — which is why `winTitle` and not this is what
       the window switcher uses. Asserted as a number so that
       collapsing a second one is a decision somebody makes on
       purpose rather than a drift nobody notices. */
    expect(new Set(PLACES.map(titleFor)).size).toBe(19)
  })
})
