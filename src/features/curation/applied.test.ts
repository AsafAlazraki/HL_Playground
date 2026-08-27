/* ============================================================
   THE MECHANISM IS APPLIED, AND THAT IS CHECKED.

   `hl-journeys.md` §4's finding is not "HelmLogic lacks a curation
   toolbar" — it HAS one, on step 5, and it is good. The finding is
   that it has exactly ONE and the other twelve screens narrow in
   silence. A shared component does not prevent that on its own: the
   next surface to narrow can still roll its own count chip and
   quietly drop rows, and nothing in `tsc`, `vitest` or
   `check-styles` would see it.

   So this reads the source of every surface that curates and
   asserts it goes through `@/features/curation`. It is the same
   move `trailerFitment.test.ts` makes when it reads its own file to
   prove no length column is consulted: a claim about how the code
   is written, checked by reading how the code is written.

   ADDING A SURFACE HERE IS THE POINT. When a new screen narrows a
   list by a rule, its path goes in this list, and the day it does
   the four properties come with it.
   ============================================================ */

import { describe, expect, it } from 'vitest'
/* `?raw`, not `node:fs` — this project deliberately carries no
   @types/node, and `trailerFitment.test.ts` set the precedent for
   reading a file's own source through the bundler instead. Each
   specifier is declared in `curation.raw.d.ts`, one at a time. */
import curationSource from '@/features/curation/curation.ts?raw'
import noteSource from '@/features/curation/CurationNote.tsx?raw'
import blockSource from '@/features/views/BlockCard.tsx?raw'
import quoteSource from '@/features/quote/QuoteEditor.tsx?raw'
import buildSource from '@/features/quote/QuoteBuild.tsx?raw'
import fitmentSource from '@/features/constraints/TrailerFitmentPanel.tsx?raw'

/** Every surface that narrows a list by a rule and offers what is
 *  left to a person. Each names what it curates, so a failure reads
 *  as a sentence rather than as a path.
 *
 *  NOT YET IN THIS LIST, and it should be: `modules/ModuleIndex.tsx`.
 *  It grew its own narrowing note in a parallel change to this one,
 *  which is the local-widget outcome this file exists to prevent —
 *  the mechanism can carry it and the swap is a small diff. It is
 *  named here rather than left out silently, which is the whole
 *  discipline of the thing being tested. */
const SURFACES: Array<{ source: string; curates: string }> = [
  { source: blockSource, curates: 'a view page’s related block' },
  { source: quoteSource, curates: 'the picker inside a quote section' },
  /* THE SURFACE THIS LIST WAS WRITTEN FOR. `QuoteBuild` narrows a
     whole table down to one step's shortlist, and it is the newest
     screen a person actually stands on — its own header says it
     deliberately draws none of the four parts itself so that mounting
     the mechanism is all-or-nothing. That is a claim about how the
     file is written, so it is checked the way the rest of this list
     is checked. */
  { source: buildSource, curates: 'one step of a quote being built' },
  { source: fitmentSource, curates: 'the measured trailer selector' },
]

describe('every curated surface goes through the one mechanism', () => {
  for (const s of SURFACES) {
    it(`${s.curates} explains itself through @/features/curation`, () => {
      expect(s.source).toContain('@/features/curation')
    })
  }
})

describe('the mechanism keeps its own promises', () => {
  it('claims no rate the project did not measure', () => {
    /* `measured` is the one field that could put a plausible-sounding
       figure on screen, so nothing in this feature may write one.
       Every rate it prints is assembled by `measuredRate` from two
       counts a caller measured. */
    /* COMMENTS STRIPPED FIRST, exactly as `check-styles.mjs` strips
       them: this file's own header quotes the exemplar sentence, and a
       guard that cannot tell an example in prose from a literal in
       code is a guard that has to be switched off. */
    const code = curationSource.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code.match(/holds on \d/g)).toBeNull()
    /* and no hand-written percentage either */
    expect(code.match(/\d\s?%/g)).toBeNull()
  })

  it('says the discontinued half in the contract’s own words', () => {
    /* Not "imports something from sellable" — imports the two clause
       builders, which is what makes the picker, the block and the
       index print one sentence instead of three near-identical ones. */
    expect(curationSource).toContain('withheldClause')
    expect(curationSource).toContain('stillOnTheSheet')
  })

  it('never lets a surface hand the bar a fifth item shape', () => {
    /* The action bar's vocabulary is closed on purpose. This feature
       draws inside the card it explains and publishes nothing to the
       bar, so it cannot be the thing that opens it. */
    expect(noteSource).not.toContain('useActionBar')
    expect(noteSource).not.toContain('publishActions')
  })
})
