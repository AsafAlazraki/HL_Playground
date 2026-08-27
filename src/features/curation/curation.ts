/* ============================================================
   CURATION — THE ONE SHAPE EVERY NARROWED LIST TAKES.

   ── WHAT THIS IS ─────────────────────────────────────────────

   `docs/plan/hl-journeys.md` §4 studied HelmLogic screen by screen
   and found exactly ONE interaction it called "unambiguously
   right" — the curation toolbar on step 5 of the quote. It is
   right because of four properties, and the study's own conclusion
   is that they are a RULE and not a widget:

     "A filter that can explain itself, be searched past, and be
      switched off is the shape every 'curated by rule' surface in
      our modules should take."

   In HelmLogic one surface has them. Everywhere else — the HP
   window, the console and seat hiding, the trailer-assignment gate
   — narrowing happens silently and offers no way back. That is the
   defect this file exists to make structurally impossible here:
   the mechanism is shared, so a surface gets all four or it gets
   none, and none is visible.

   THE FOUR PROPERTIES, and where each one lives:

     1 · IT EXPLAINS ITSELF — `curationChip` and `curationNote`
         below. The reason is in the dealer's own words, carried on
         the `Narrowing` the surface hands in.
     2 · IT CAN BE SEARCHED PAST — `reachNote` states, in a number,
         what the SAME search finds on the other side of the
         narrowing. A person can always get to a row by name.
     3 · IT CAN BE SWITCHED OFF — `toggleLabel` names the control
         both ways round, so the off state is as legible as the on.
     4 · THE COUNT IS STATED, NEVER IMPLIED — `narrowedOut`, printed
         in words. "12 of 434" implies 422 and states nothing; a
         person who has to subtract has been told a number, not
         given an answer.

   ── WHAT WE HAVE THAT HELMLOGIC DOES NOT ─────────────────────

   MEASURED RATES. Their tooltip says "wrong HP band, wrong length,
   wrong tube material" — a list of reasons with no idea how often
   any of them is right, because nothing in that app measures. Ours
   can say the rate, because `trailerFitment.ts` ran the rule over
   the whole sheet and `FITMENT_RULES.md` records the result:

     "12 of 434 trailers · the series banner names this brand ·
      holds on 581 of 581 pairings, no exceptions"

   `measured` is OPTIONAL and it is optional on purpose. A surface
   that has not measured its rule says nothing about a rate rather
   than reaching for a plausible-sounding one. NOTHING HERE IS
   INVENTED: every figure this file prints was handed to it by a
   caller that counted rows, and the strings it composes are the
   caller's own words plus arithmetic.

   ── ONE SENTENCE, NOT TWO COMPETING ONES ─────────────────────

   The discontinued contract (`@/features/views/sellable`) already
   withholds retired stock from every customer-facing surface and
   already says how many. A narrowed list therefore has TWO reasons
   it is short, and printing two paragraphs is how a salesperson
   ends up unable to say which number covers what.

   So this file owns the ARITHMETIC and delegates the WORDS. The
   buckets are disjoint and they add up:

       pool  =  offered  +  narrowedOut  +  withheld

   `narrowedOut` is what the rule did not admit. `withheld` is what
   the rule DID admit and the discontinued contract then held back.
   A row can be in exactly one of them, and `curationNote` prints
   the pair as one paragraph ending on the reassurance the contract
   itself wrote — never a second sentence of its own invention.
   ============================================================ */

import { plural, singular } from '@/features/views/describe'
import { stillOnTheSheet, withheldClause } from '@/features/views/sellable'

/* ---------------------------------------------------------- */
/* What a surface hands in                                     */
/* ---------------------------------------------------------- */

/**
 * ONE REASON A POOL WAS NARROWED, in the operator's own words.
 *
 * A surface may hand in more than one — a quote picker narrowed by
 * a block rule AND by what is already on the quote is two facts and
 * hiding either one is the defect.
 */
export interface Narrowing {
  /** stable, so a list of reasons can be keyed */
  id: string
  /**
   * WHAT narrowed it, as a clause with no leading capital and no
   * trailing stop: "the series banner names this brand". It is
   * printed after the count, so it reads as the reason for it.
   */
  what: string
  /**
   * THE RATE, WHERE THE PROJECT MEASURED ONE — "holds on 581 of 581
   * pairings, no exceptions". Omit it and nothing is claimed. There
   * is no default and there is no fallback phrase: a rule nobody
   * measured is a rule with no rate, and saying so by silence is
   * the only honest option.
   */
  measured?: string
}

/**
 * The three figures every curated surface must be able to produce.
 * They are counts of ROWS, and they are counted before any cosmetic
 * filter — a search box narrowing what is drawn is a pair of
 * spectacles, not a curation, and it has its own sentence below.
 */
export interface CurationCounts {
  /** every row that could have been offered, before anything narrowed it */
  pool: number
  /** what the narrowing admitted — the offered rows plus the withheld ones */
  matched: number
  /** what the surface is actually offering */
  offered: number
}

export interface CurationInput {
  /**
   * What the surface calls the things in it — a table name, in the
   * author's own casing. Pluralised here, never uppercased: a name
   * is a name (DESIGN_CONTRACT §3).
   */
  name: string
  counts: CurationCounts
  /** the reasons, in the order the surface wants them read */
  narrowings: readonly Narrowing[]
  /** true while the surface has the narrowing switched OFF */
  showingAll: boolean
  /**
   * The search in force, and what the SAME search finds on the other
   * side of the narrowing. `beyond` is how many rows outside the
   * current pool match — the number that makes a search "past" the
   * narrowing rather than merely inside it.
   */
  search?: { term: string; beyond: number }
}

/* ---------------------------------------------------------- */
/* The reading                                                 */
/* ---------------------------------------------------------- */

export interface CurationReading {
  /** every row that could have been offered */
  pool: number
  /** what is on screen before any cosmetic filter */
  offered: number
  /** rows the narrowing did not admit */
  narrowedOut: number
  /** rows the narrowing admitted and the discontinued contract held back */
  withheld: number
  /** true when there is genuinely nothing to explain */
  quiet: boolean
  /** "12 of 434 trailers · the series banner names this brand · holds on 581 of 581 pairings" */
  chip: string
  /** the same line as segments, count first. The drawing needs two
   *  type treatments and a joined string can only carry one. */
  chipParts: string[]
  /** the counts, in words, merged with the discontinued contract's own sentence */
  note: string
  /** what a search can still reach — '' when there is nothing beyond */
  reach: string
  /** what the show-everything control reads right now */
  toggleLabel: string
  /** the accessible name of that control — it says what it will DO */
  toggleSay: string
}

/** Never let a caller's rounding print a negative count. */
const atLeast0 = (n: number): number => (n > 0 ? n : 0)

const isAre = (n: number): string => (n === 1 ? 'is' : 'are')

/** THOUSANDS SEPARATED, ALWAYS. `2937 Parts & Accessories are not
 *  offered here` is a figure a reader has to count digits on; 2,937 is
 *  one they read. Every other count on these screens is grouped —
 *  `FanOut`, the module index, the dashboard — and a sentence that
 *  broke the habit would look like a different app's writing. */
const fig = (n: number): string => n.toLocaleString()

/** "trailer" / "trailers", the author's own casing kept. */
const nounFor = (name: string, n: number): string => (n === 1 ? singular(name) : plural(name))

/**
 * THE CHIP — the one line the study's exemplar is written as.
 *
 * `12 of 434 trailers · the series banner names this brand · holds
 * on 581 of 581 pairings, no exceptions`
 *
 * Reasons are separated by the same middot the count chips beside
 * them already use, so a header carrying both reads as one register.
 * A measured rate rides with the reason it belongs to and never
 * floats free — two rules and two rates in one flat list is a
 * sentence nobody can attribute.
 */
export function curationChip(input: CurationInput): string {
  return curationChipParts(input).join(' · ')
}

/**
 * THE SAME CHIP, UNJOINED — because the drawing needs two type
 * treatments and a joined string can only have one.
 *
 * `curationChip` returns "12 of 434 trailers · the series banner
 * names this brand · holds on 581 of 581 pairings", and every
 * surface that drew it set the whole line in tabular mono. The first
 * segment is a FIGURE and mono is what makes a figure line up; the
 * segments after it are SENTENCES, and a sentence in 11px mono at
 * the faint tier is the costume this design system was written to
 * remove. The component's own header has claimed since it was
 * written that "the count is mono because it is a figure; the reason
 * is Inter because it is a sentence" — this is the function that
 * makes that true.
 *
 * SPLITTING THE JOINED STRING WOULD NOT DO. A reason is authored by
 * whoever wrote the narrowing and may legally contain a middot, so
 * `chip.split(' · ')` is a parser guessing at something it could
 * simply have been handed. The parts are the source; the joined
 * string is derived from them, not the other way round — which also
 * means the two can never disagree.
 *
 * The FIRST element is always the count and there is always exactly
 * one of it. Everything after it is a reason or the rate belonging
 * to the reason before it.
 */
export function curationChipParts(input: CurationInput): string[] {
  const { counts, name, narrowings, showingAll } = input
  const pool = atLeast0(counts.pool)
  const offered = atLeast0(counts.offered)
  /* ── "ALL" MEANS ALL, AND THE CONTRACT STILL HOLDS SOME BACK ─────
     This read `all ${pool}` unconditionally, and it was true only for
     a surface with nothing discontinued in it — every one of them,
     until the module catalogue arrived with 727 of its 3,587 lines no
     longer sold. There it printed "all 3,587 accessories" over a list
     of 2,860, three lines above its own note saying 727 are withheld:
     the chip and the paragraph disagreeing, which is the single fault
     this whole file exists to make impossible.

     The switch turns the RULE off. It does not, and must not, turn
     the discontinued contract off — that is not a narrowing a
     salesperson may suspend. So the word "all" is earned only when
     the offer really is the pool, and otherwise the count is stated
     the same way it is stated everywhere else. */
  if (showingAll) {
    return [
      offered >= pool
        ? `all ${fig(pool)} ${nounFor(name, pool)}`
        : `${fig(offered)} of ${fig(pool)} ${nounFor(name, pool)}`,
    ]
  }
  const parts = [`${fig(offered)} of ${fig(pool)} ${nounFor(name, pool)}`]
  for (const w of narrowings) {
    parts.push(w.what)
    if (w.measured) parts.push(w.measured)
  }
  return parts
}

/**
 * THE NOTE — the count of what was hidden, said out loud, with the
 * discontinued contract's own words for its half of it.
 *
 * Two buckets and one paragraph. The narrowing's count comes first
 * because it is the larger and the one a person is looking at; the
 * withheld count comes second and brings the contract's reassurance
 * with it, because "no longer sold" raises "have we lost it" and
 * that question has to be answered in the same breath.
 */
export function curationNote(input: CurationInput): string {
  const { counts, name, narrowings, showingAll } = input
  const pool = atLeast0(counts.pool)
  const matched = atLeast0(Math.min(counts.matched, pool))
  const offered = atLeast0(Math.min(counts.offered, matched))
  const narrowedOut = pool - matched
  const withheld = matched - offered

  const sentences: string[] = []

  if (!showingAll && narrowedOut > 0) {
    const reasons = narrowings
      .map((w) => (w.measured ? `${w.what} — it ${w.measured}` : w.what))
      .filter((r) => r !== '')
    const why = reasons.length > 0 ? `, because ${joinWords(reasons)}` : ''
    sentences.push(
      `${fig(narrowedOut)} ${nounFor(name, narrowedOut)} ${isAre(narrowedOut)} not offered here${why}.`,
    )
  }

  if (withheld > 0) {
    sentences.push(
      `${withheldClause(withheld, name)}, so ${
        withheld === 1 ? 'it is' : 'they are'
      } not offered here either. ${stillOnTheSheet(withheld)}`,
    )
  }

  return sentences.join(' ')
}

/** "a, b and c" — an Oxford-free list, because these are clauses. */
function joinWords(parts: readonly string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/**
 * WHAT THE SEARCH CAN STILL REACH — property 2, stated as a number.
 *
 * A search that quietly covers only the narrowed set is the same
 * defect as a narrowing that does not explain itself: a person types
 * a name they can see on the sheet, gets nothing, and concludes the
 * row is gone. So the count on the far side is always printed, and
 * it is printed as an OFFER — the control beside it is what reaches
 * them.
 */
export function reachNote(input: CurationInput): string {
  const term = input.search?.term.trim() ?? ''
  const beyond = atLeast0(input.search?.beyond ?? 0)
  if (term === '' || beyond === 0) return ''
  return `${fig(beyond)} more ${nounFor(input.name, beyond)} ${
    beyond === 1 ? 'matches' : 'match'
  } “${term}” outside this narrowing.`
}

/**
 * THE SWITCH, NAMED BOTH WAYS ROUND.
 *
 * A latch labelled with its own state ("Showing all") leaves a
 * person to work out what pressing it does; a latch labelled with
 * its act ("Show everything") leaves them to work out what state
 * they are in. The visible word is the ACT — that is what a button
 * is — and `aria-pressed` plus `toggleSay` carry the state, which
 * is the arrangement DESIGN_CONTRACT §8 already asks for.
 */
export function toggleWords(input: CurationInput): { label: string; say: string } {
  const pool = atLeast0(input.counts.pool)
  const many = plural(input.name)
  return input.showingAll
    ? {
        label: 'Show what fits',
        say: `Narrow ${many} back to what fits this one`,
      }
    : {
        label: 'Show everything',
        say: `Show all ${fig(pool)} ${nounFor(input.name, pool)}, narrowing switched off`,
      }
}

/**
 * A MEASURED RATE, IN THE SHAPE `Narrowing.measured` WANTS.
 *
 * "holds on 581 of 581 pairings, no exceptions" — the clause that is
 * the whole of our advantage over HelmLogic here, and the reason it
 * is a FUNCTION of two counts rather than a string a caller writes:
 * a hand-typed rate is a rate that can go stale the day the sheet
 * changes, and this app's whole argument is that a number which
 * moves with the data cannot.
 *
 * `held` and `tested` come from the project's own adjudication —
 * `RULE_LEDGER` in `@/features/constraints/ruleLedger`, whose every
 * figure is asserted against its seed's own `source` line by
 * `ruleLedger.test.ts`. NOTHING HERE INVENTS A RATE: a caller with
 * no measurement passes no `measured`, and the sentence simply does
 * not carry one.
 *
 * `noun` is what was counted, in the dealer's words — "pairings",
 * "live cells". Never a column reference: that is what a provenance
 * line is for.
 */
export function measuredRate(held: number, tested: number, noun: string): string {
  if (tested <= 0) return ''
  if (held >= tested) return `holds on ${tested} of ${tested} ${noun}, no exceptions`
  const pct = ((held / tested) * 100).toFixed(2).replace(/\.00$/, '')
  return `holds on ${held} of ${tested} ${noun}, ${pct}%`
}

/**
 * The whole reading, resolved once.
 *
 * ONE FUNCTION, so the chip in a header and the paragraph under it
 * are computed from the same three numbers and can never disagree —
 * the fault this mechanism exists to end. A surface that drew its
 * own count beside this one would be back where HelmLogic is.
 */
export function readCuration(input: CurationInput): CurationReading {
  const pool = atLeast0(input.counts.pool)
  const matched = atLeast0(Math.min(input.counts.matched, pool))
  const offered = atLeast0(Math.min(input.counts.offered, matched))
  const narrowedOut = pool - matched
  const withheld = matched - offered
  const toggle = toggleWords(input)
  return {
    pool,
    offered,
    narrowedOut,
    withheld,
    /* NOTHING TO SAY IS ALLOWED, and it is the reason this mechanism
       can go on every curated surface without turning every one of
       them into a paragraph. A block whose rule excluded nothing and
       whose table has no retired stock draws no note at all. */
    quiet: narrowedOut === 0 && withheld === 0 && !input.showingAll,
    chip: curationChip(input),
    /* the same line, unjoined, so the count can be a figure and the
       reasons can be sentences — see `curationChipParts` */
    chipParts: curationChipParts(input),
    note: curationNote(input),
    reach: reachNote(input),
    toggleLabel: toggle.label,
    toggleSay: toggle.say,
  }
}
