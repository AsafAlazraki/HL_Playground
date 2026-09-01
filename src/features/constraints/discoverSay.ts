/* ============================================================
   THE WORDS FOR A DISCOVERED PATTERN — every sentence the screen
   says about a candidate, in one place, so the card, the ledger of
   what was declined and any future export can never disagree.

   THE SAME DISCIPLINE AS `describe.ts` NEXT DOOR: there is exactly
   one set of words per fact, produced in one function, and the
   component's job is to place them. A second surface that draws a
   candidate imports from here rather than writing a fourteenth
   phrasing of "530 of 530".

   NOTHING HERE INVENTS A FIGURE. Every number in every string is
   read off the `Candidate` the engine measured — `hits`, `tested`,
   `discrimination`, `uniqueness`, `counterExampleTotal`, `excluded`
   — and the fixed clauses are quoted from documents:

     · the five shape descriptions are `discover.ts`'s own header,
       "WHAT IT LOOKS FOR, AND WHY THOSE FIVE";
     · the floor and vacuous clauses are `THRESHOLDS.floor` and
       `THRESHOLDS.vacuous`, which quote docs/specs/FITMENT_RULES.md
       §0;
     · "may warn and may never prune" is `workbookRules.ts`'s
       standing instruction — "an 'observed' seed may never be built
       with a kind that prunes" — and `discover.ts`'s `MAY_PRUNE`.

   THE ONE RULE THIS FILE ENFORCES IN WORDS. A verdict of 'filter'
   from the engine means "it clears the bar a filter would have to
   clear", never "filter it", so no string here ever says the app
   will filter anything. `verdictSay` says what the candidate
   CLEARED; `enforcementSay` says what it would DO, and there are
   only two answers to that and neither of them prunes.

   TWO FIGURES, NEVER ONE. `figuresFor` returns them as a pair
   because they are only meaningful together: F9 (a trailer's ATM
   against a boat's weight) is 530/530 = 100 % and leaves a mean
   97.70 % of the catalogue standing, so it selects nothing; F8 (the
   series banner) is 581/581 and leaves 0.92–7.83 %. Same rate,
   opposite worth (FITMENT_RULES.md §1.2). A screen that shows the
   rate alone teaches the wrong lesson perfectly.

   Pure functions. No React, no store.
   ============================================================ */

import type { Candidate, CandidateShape, Verdict } from './discover'

/** en-AU, so eleven thousand rows read as 11,116 exactly as they do
 *  everywhere else on this page. */
export const n = (x: number): string => x.toLocaleString('en-AU')

/** One decimal, matching `TrailerFitmentPanel`'s own `pct` — two
 *  surfaces on one page printing 4.1 % and 4.12 % of the same
 *  catalogue is how a person starts checking arithmetic instead of
 *  reading findings. */
export const pct = (share: number): string => `${(share * 100).toFixed(1)}%`

/* ---------------------------------------------------------- */
/* The five shapes, in the dealer's words                      */
/* ---------------------------------------------------------- */

/** `name` is the group heading; `say` is `discover.ts`'s own
 *  one-line description of the shape, which is the honest gloss
 *  because it is what the code actually measures. */
export const SHAPE_SAY: Record<CandidateShape, { name: string; say: string }> = {
  'categorical-selector': {
    name: 'One side names the other',
    say: 'one side’s column names the other side’s group — the only shape here that picks something',
  },
  'numeric-bound': {
    name: 'A number that is never crossed',
    say: 'one side’s number never falls below, or never exceeds, the other’s',
  },
  'join-key': {
    name: 'What identifies a row',
    say: 'which column identifies a row across two tables',
  },
  'functional-dependency': {
    name: 'One column settles another',
    say: 'one column’s value settles another’s',
  },
  uniqueness: {
    name: 'A pairing that appears once',
    say: 'whether a pair of rows is written down only once',
  },
}

/* ---------------------------------------------------------- */
/* What it cleared, and what it would do                       */
/* ---------------------------------------------------------- */

/** WHAT BAR IT CLEARED — never what the app will do with it. */
export function verdictSay(v: Verdict): string {
  if (v === 'filter') return 'Clears the bar a filter would have to clear'
  if (v === 'warning') return 'Clears the bar a warning has to clear'
  if (v === 'observation') return 'Reportable, with its numerator and its denominator'
  return 'Measured and refused'
}

/** WHAT IT WOULD DO IF KEPT. Two answers, and neither prunes. */
export function enforcementSay(c: Candidate): string {
  return c.enforcement === 'warn'
    ? 'Kept, it would warn: it flags a pairing that disagrees and never removes one.'
    : 'Kept, it would only report: it states its own numbers and changes no list.'
}

/** THE LINE, SAID AT THE POINT OF ACCEPTANCE. Not a footnote. */
export const OBSERVED_SAY =
  'This was measured in your values. Your business has not stated it, so it may warn and may never remove a row from a list.'

/* ---------------------------------------------------------- */
/* The two figures                                             */
/* ---------------------------------------------------------- */

export type Standing = 'selects' | 'floor' | 'arithmetic' | 'not-measured'

export interface Figures {
  /** "626 of 626" — two integers, never a bare percentage */
  holds: string
  /** what those two integers are counted over, plus the rate */
  holdsSay: string
  /** "4.1%", or an em dash where the shape narrows nothing */
  leaves: string
  /** what the share is a share OF, and what that makes it */
  leavesSay: string
  standing: Standing
  /* -- THE SAME TWO FACTS AS NUMBERS, SO THEY CAN BE DRAWN --------
     `holds` and `leaves` are sentences, and a sentence cannot be
     compared at a glance across nine cards. These are the identical
     readings as fractions of one, and nothing else in this file may
     compute them a second time: a bar that disagreed with the words
     beside it would be worse than no bar. */
  /** 0–1. How often the pattern is true on the file's own pairings. */
  rate: number
  /** 0–1, or null where the shape narrows nothing. Mean share of the
   *  catalogue still standing after the rule has spoken. SMALL IS
   *  GOOD — this is the axis a floor fails on at a perfect rate. */
  left: number | null
  /** the narrowest and widest that share got, for the range mark */
  leastLeft: number | null
  mostLeft: number | null
}

/**
 * THE PAIR, and the reason this function exists at all.
 *
 * `holds` is how often the pattern is true on the price file's own
 * pairings. `leaves` is how much of the catalogue it still allows.
 * A person reading the two side by side can see for themselves that
 * a 100 % rule leaving 97.7 % of the catalogue has not chosen
 * anything — which is the F8-versus-F9 lesson, and the only way to
 * teach it without asking anybody to take it on trust.
 */
export function figuresFor(c: Candidate): Figures {
  const holds = `${n(c.hits)} of ${n(c.tested)}`
  const holdsSay =
    c.hits === c.tested
      ? `pairings your price file writes agree — every one that could be tested`
      : `pairings your price file writes agree · ${pct(c.rate)}, so ${n(c.tested - c.hits)} disagree`

  const d = c.discrimination
  /* the numeric half of every return below, written once. A bar that
     disagreed with the sentence beside it would be worse than no bar,
     so both halves come out of the same reading. */
  const nums = {
    rate: c.rate,
    left: d ? d.meanLeft : null,
    leastLeft: d ? d.leastLeft : null,
    mostLeft: d ? d.mostLeft : null,
  }

  if (!d) {
    return {
      holds,
      holdsSay,
      leaves: '—',
      leavesSay:
        'This shape does not narrow a list, so there is nothing left standing to count.',
      standing: 'not-measured',
      ...nums,
    }
  }

  const of = `of the ${n(d.catalogue)} rows it could offer, measured over ${n(d.over)}`
  if (d.vacuous) {
    return {
      holds,
      holdsSay,
      leaves: pct(d.meanLeft),
      /* THRESHOLDS.vacuous: "a bound no row in the catalogue could
         ever violate is arithmetic, not a rule". */
      leavesSay: `${of}. Not one of them could break it, so it is arithmetic about two ranges rather than a rule.`,
      standing: 'arithmetic',
      ...nums,
    }
  }
  if (d.floor) {
    return {
      holds,
      holdsSay,
      leaves: pct(d.meanLeft),
      leavesSay: `${of}. It rejects almost nothing, so it is a floor and not a selector.`,
      standing: 'floor',
      ...nums,
    }
  }
  return {
    holds,
    holdsSay,
    leaves: pct(d.meanLeft),
    leavesSay: `${of} — narrowest ${pct(d.leastLeft)}, widest ${pct(d.mostLeft)}.`,
    standing: 'selects',
    ...nums,
  }
}

/* ---------------------------------------------------------- */
/* The same reading, as two counts                             */
/* ---------------------------------------------------------- */

/** WHAT A CANDIDATE WOULD KEEP AND WHAT IT WOULD REJECT, as rows of
 *  the far catalogue rather than as a share of it. */
export interface Narrowing {
  /** live rows on the far side the share was measured against */
  catalogue: number
  /** how many of them a typical subject still has left */
  kept: number
  /** and how many it does not */
  rejected: number
  /** how many subjects the mean was taken over */
  over: number
}

/**
 * THE SHARE, TURNED BACK INTO ROWS.
 *
 * `pct(meanLeft)` is the exact reading and `figuresFor` prints it;
 * this is the same reading counted in the units a person shops in.
 * "It leaves 97.7 %" and "424 of your 434 trailers are still on the
 * list" are the same fact, and only the second one is obviously bad
 * news to somebody who has never read a discrimination figure.
 *
 * IT IS A MEAN AND IT SAYS SO. `over` is how many subjects it was
 * averaged across, and every surface that prints `kept` prints that
 * too — a single number implying every boat leaves exactly 424
 * trailers would be inventing a precision the engine never
 * measured. `null` where the shape narrows no catalogue at all.
 */
export function narrowingOf(c: Candidate): Narrowing | null {
  const d = c.discrimination
  if (!d) return null
  const kept = Math.round(d.meanLeft * d.catalogue)
  return { catalogue: d.catalogue, kept, rejected: d.catalogue - kept, over: d.over }
}

/* ---------------------------------------------------------- */
/* Checking it                                                 */
/* ---------------------------------------------------------- */

/** WHAT THE COUNTER-EXAMPLES ARE. A proposal a person cannot check
 *  is a fabrication wearing a percentage, so the count comes first
 *  and the cap is stated where the list is cut. */
export function counterSay(c: Candidate): string {
  if (c.counterExampleTotal === 0) {
    return 'Nothing in your price file disagrees with it. There is no exception to look at.'
  }
  const shown = c.counterExamples.length
  const head = `${n(c.counterExampleTotal)} ${c.counterExampleTotal === 1 ? 'pairing disagrees' : 'pairings disagree'}`
  return shown < c.counterExampleTotal
    ? `${head}. The first ${n(shown)} are named here, by row.`
    : `${head}, named here, by row.`
}

/** WHAT EACH SIDE THREW AWAY. The rigging-membership figure read
 *  79.4 % until somebody noticed 16,267 of 20,640 "matches" were one
 *  sentinel agreeing with another; stripped, it was 53.3 %
 *  (FITMENT_RULES.md §1.1). So the exclusions are printed, per side,
 *  with the sentinel rule that fired. */
export function excludedSay(c: Candidate): string[] {
  const out: string[] = []
  for (const [which, r] of [
    ['First side', c.excluded.left],
    ['Second side', c.excluded.right],
  ] as const) {
    const parts: string[] = []
    if (r.empty > 0) parts.push(`${n(r.empty)} empty`)
    if (r.sentinel > 0) {
      const rules = r.sentinelRules.map((s) => `${s.label} ×${n(s.count)}`).join(', ')
      parts.push(`${n(r.sentinel)} a stand-in for no value (${rules})`)
    }
    if (r.untestable > 0) parts.push(`${n(r.untestable)} present but untestable`)
    if (parts.length === 0) continue
    /* THE REASON IS ITS OWN SENTENCE. The engine's `untestableWhy`
       is a clause with its own dashes in it, and appending "left out
       of the count" behind that produced a sentence nobody could
       parse. The count first, then why. */
    const why = r.untestable > 0 && r.untestableWhy ? ` Untestable because ${r.untestableWhy}.` : ''
    out.push(`${which}: ${parts.join(' · ')} — left out of the count.${why}`)
  }
  return out
}

/** A KEY'S SECOND HALF. "≥ 98 % exact match AND the far-side key
 *  column ≥ 99 % unique" is two readings, and the uniqueness one is
 *  what caught that the display name is the trailer's key and the
 *  code is not. */
export function uniquenessSay(c: Candidate): string | null {
  const u = c.uniqueness
  if (!u) return null
  const head = `${n(u.distinct)} different values over ${n(u.rows)} rows`
  if (u.duplicated === 0) return `${head}. No two rows share one.`
  return `${head}; ${n(u.duplicated)} ${u.duplicated === 1 ? 'row carries' : 'rows carry'} a value another row also carries.`
}

/** WHAT ADMITTING IT WOULD DESTROY, by name. §0's own rule: "a
 *  candidate that would delete rows the price file itself wrote is
 *  REJECTED OUTRIGHT, and says how many, by name". */
export function deleteSay(c: Candidate): string | null {
  const d = c.wouldDelete
  if (!d) return null
  const named = d.named.join(', ')
  const more = d.total > d.named.length ? ` and ${n(d.total - d.named.length)} more` : ''
  return `Admitting this would delete ${n(d.rows)} ${d.rows === 1 ? 'row' : 'rows'} your price file wrote — ${named}${more}.`
}

/** THE A2 GUARD, IN WORDS. A candidate that rejects the business's
 *  own recommendation is refused whatever its rate, and the count is
 *  the thing to print. */
export function recommendationSay(c: Candidate): string | null {
  if (c.rejectsRecommendation === 0) return null
  const many = c.rejectsRecommendation !== 1
  return `It rejects ${n(c.rejectsRecommendation)} ${many ? 'pairings' : 'pairing'} your price file marks as its own recommendation, so it is refused whatever its rate.`
}
