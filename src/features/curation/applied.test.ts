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
import indexSource from '@/features/modules/ModuleIndex.tsx?raw'
import fanOutSource from '@/features/fitment/FanOut.tsx?raw'

/** Every surface that narrows a list by a rule and offers what is
 *  left to a person. Each names what it curates, so a failure reads
 *  as a sentence rather than as a path.
 *
 *  THE LIST HAS GROWN, WHICH IS THE POINT. `modules/ModuleIndex.tsx`
 *  was named here as the outstanding one — it had grown its own
 *  narrowing note in a parallel change, the exact local-widget outcome
 *  this file exists to prevent — and it is now on the list rather than
 *  in the apology above it.
 *
 *  ── WHAT IS DELIBERATELY NOT HERE ────────────────────────────────
 *
 *  Said out loud, because the judgement is half of what this list is
 *  worth and an absence explains nothing. A surface belongs here when
 *  a RULE decides what a person may see. It does not belong when the
 *  PERSON decides, and the test is who would be surprised by the
 *  count: explaining a narrowing back to whoever just typed it is
 *  furniture, and it would teach a reader to skip the sentence on the
 *  screens where it is the whole point.
 *
 *    · `table/**` — the register's column filters, its sort, and the
 *      band strip. A person set them, from a control still on screen,
 *      and the register already prints what they left. Nothing was
 *      withheld and there is nothing to switch off that is not
 *      already switched by hand.
 *    · `search/**` — the Finder searches everything by construction.
 *      It is the thing property 2 reaches WITH. It narrows nothing.
 *    · `crm/**` — the customer list, same reason as the register: a
 *      state filter a person chose from a visible control.
 *    · `constraints/RulesPane` and the discovery panels — they list
 *      RULES, not stock. A candidate left out is a rule nobody
 *      adopted, and `discoverSay.ts` already says why per rule, which
 *      is more than a count could say.
 *    · the `INDEX_CAP` and `LIST_CAP` sentences on the two surfaces
 *      added here — a drawing budget is cosmetic, and `curation.ts`
 *      states outright that its three counts are taken BEFORE any
 *      cosmetic filter. Folding a cap into the pool would make the
 *      chip move as the window resized.
 *
 *  And one that narrows by a rule and still must not be here:
 *  `modules/NewModuleDialog.tsx` narrows the tables it
 *  offers to bundle, by the same rule `modules/split.ts` uses to
 *  judge a finished module. It mounts nothing from this feature and
 *  it should not. A curation is a narrowing a person may switch off;
 *  that one is a REFUSAL — switching it off is precisely how the two
 *  bags on this dashboard were made — so it takes DESIGN_CONTRACT
 *  §10's shape instead, and says why in place, with the count of
 *  tables in the same position read off the sheet. A surface that
 *  cannot honestly offer property 3 must not pretend to the other
 *  three. */
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
  /* THE CATALOGUE ITSELF, and the largest pool any of them narrows:
     2,860 live lines under the headings the workbook banners them
     with, plus everything the discontinued contract holds back. It
     is also the surface this list was written pointing AT, so its
     arrival is the guard doing the job it was written for. */
  { source: indexSource, curates: 'a module’s catalogue, narrowed to one drawer' },
  /* AND THE SURFACE THE EXEMPLAR SENTENCE WAS WRITTEN ABOUT.
     `curation.ts`'s header quotes "12 of 434 trailers · the series
     banner names this brand · holds on 581 of 581 pairings" as the
     thing this app can say and HelmLogic cannot — and the page that
     actually prints that rate printed eleven of them, one per brand,
     with no way on earth to see a single row behind any of them. A
     MEASURED claim nobody can check is worse than an unmeasured one:
     it is the "confidently wrong" case DESIGN_CONTRACT §7 names, with
     a number bolted on. The rate now travels on a narrowing that can
     be searched past and switched off, so the four are visible. */
  { source: fanOutSource, curates: 'the rule that picks, on the fan-out' },
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
