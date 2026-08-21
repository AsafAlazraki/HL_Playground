/* ============================================================
   WHAT A VALUE IS WORTH — the vocabulary the discovery engine
   measures with, and the accounting it owes for every value it
   threw away.

   THIS FILE EXISTS BECAUSE OF ONE NUMBER. `map-parts.md` reported
   that a boat's rigging cell is a member of its motor's own rigging
   list on 79.4 % of cells, and concluded the motor picks the kit.
   Re-measured, 16,267 of the 20,640 "matches" were one sentinel
   agreeing with another — `NR - ENGINE NOT REQUIRED` against
   `NR - RIGGING KIT NOT REQUIRED`. Strip them and it is 53.3 %, and
   the conclusion reverses (FITMENT_RULES.md §1.1).

   A DENOMINATOR ARTEFACT LOOKS EXACTLY LIKE A FINDING. So nothing
   in the engine may quietly skip a value: every exclusion is
   counted, attributed to the rule that fired, and carried back out
   on the candidate, so a person reading a proposal can see how many
   values it stood on and how many it stepped over.

   THE SENTINEL LIST IS NOT INVENTED HERE. It is FITMENT_RULES.md
   §6.1's own list, fixed once so that five lenses could stop
   disagreeing by up to 0.9 % purely over what "empty" meant, plus
   ONE generalisation stated below.

   THE GENERALISATION, and why it is safe. §6.1's last clause reads
   "the block's own header text leaked into a data cell", and then
   names the six strings that leaked in THIS workbook. Naming six
   strings would make the engine work on one price file. So the rule
   is generalised to its own description: a cell whose value is its
   own column's name is header text in a data cell. That is checkable
   on any file, it fires on all six of §6.1's examples, and it cannot
   fire on a real value unless a business has named a product after
   the column it sits in.

   Pure functions. No React, no store, no I/O.
   ============================================================ */

import type { CellValue } from '@/types/model'

/* ---------------------------------------------------------- */
/* Text                                                        */
/* ---------------------------------------------------------- */

/** Fold to a space-delimited lower-case form so a phrase can be
 *  matched on word boundaries without building a regular expression
 *  out of user data. `"REDCO - Stabicraft Alloy Trailers"` becomes
 *  `" redco stabicraft alloy trailers "`.
 *
 *  THE SAME FOLD AS `trailerFitment.ts`, deliberately and not by
 *  accident. It is written twice rather than imported because that
 *  file does not export it and this wave does not edit it; if the two
 *  ever disagree the selector and the engine would report different
 *  rates for the same rule, so `discover.test.ts` asserts they agree
 *  on the cases that matter. */
export function fold(text: string): string {
  const hit = FOLDED.get(text)
  if (hit !== undefined) return hit
  const made = ` ${text.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim()} `
  remember(FOLDED, text, made)
  return made
}

/** Whitespace-collapsed, case-folded, for EXACT comparison. Unlike
 *  `fold` this keeps punctuation, because two codes differing only by
 *  a hyphen are two codes. */
export function exact(text: string): string {
  const hit = EXACTED.get(text)
  if (hit !== undefined) return hit
  const made = text.trim().replace(/\s+/g, ' ').toLowerCase()
  remember(EXACTED, text, made)
  return made
}

/* MEMOISED, BECAUSE THE ENGINE FOLDS THE SAME STRINGS MILLIONS OF
   TIMES. A price file's columns are made of a few hundred distinct
   values repeated across thousands of rows, and the discovery run
   reads each of them once per candidate. Caching the fold took the
   run over the Northside seed from about seven seconds to about two.

   The cap is here so a pathological file — one with a distinct string
   in every cell — cannot turn the cache into a leak. Past the cap the
   cache is cleared rather than grown, which costs a re-fold and never
   memory. */
const CACHE_CAP = 200_000
const FOLDED = new Map<string, string>()
const EXACTED = new Map<string, string>()

function remember(cache: Map<string, string>, key: string, value: string): void {
  if (cache.size >= CACHE_CAP) cache.clear()
  cache.set(key, value)
}

/** Does `haystack` name `needle` as a whole word or whole phrase?
 *
 *  WHOLE-WORD IS LOAD-BEARING, not tidiness: it is why `Fishing
 *  Series` does not match `Fisher Series`, and a substring test that
 *  matched them would report a selector picking the wrong product at
 *  a confident 100 %.
 *
 *  IT IS NOT, ON ITS OWN, ENOUGH. Dunbier's `SPORT CENTRELINE WIDE
 *  SERIES` names `Sport` as a whole word, and Highfield has a `Sport`
 *  series — so this test alone would put a Dunbier trailer under a
 *  Highfield hull. What stops that is the vocabulary's rule that a
 *  single-word level value is never an identity (see
 *  `groupVocabulary` in discover.ts, test 1), and that rule is where
 *  the Sport case is guarded. Saying so here because a comment that
 *  credits the wrong guard is how the right one gets deleted. */
export function names(haystack: string, needle: string): boolean {
  const n = fold(needle).trim()
  if (n === '') return false
  return fold(haystack).includes(` ${n} `)
}

/* ---------------------------------------------------------- */
/* Units — read out of the header, never assumed               */
/* ---------------------------------------------------------- */

/**
 * WHAT UNIT A COLUMN IS IN, ACCORDING TO ITS OWN HEADER.
 *
 * WHY THE ENGINE NEEDS THIS AT ALL. Left ungated, a numeric-bound
 * scan reports things like "a boat's Hull Thickness mm is never below
 * an accessory's Dealer price" at a confident 100 % — true of the
 * values, arithmetic rather than business, and enough of them to bury
 * every real finding. Measured on the Northside seed the ungated scan
 * produced 2,608 "proposals", of which the two the adjudication
 * actually found were somewhere in the middle.
 *
 * THE FIX IS NOT A HEURISTIC ABOUT WHICH COLUMNS "LOOK LIKE" PRICES.
 * It is the file's own words: the price file writes the unit into the
 * header — `ATM (KG)`, `Boat Weight kg`, `Between Guards (mm)`,
 * `Int Length cm`, `Water Ballast L`, `Max HP`, `MU %`, `Rego ($)`.
 * Two numbers are compared only where the file says they are the same
 * kind of number, and where it says nothing the engine does not
 * guess. It reports how many pairs it declined for that reason
 * (`DiscoveryBounds.incomparable`) so the silence is visible.
 *
 * This is the generic form of a lesson FITMENT_RULES.md F9 already
 * records: comparing a FIXED COLUMN LETTER also scores 100 %, only
 * because in the Highfield band `Q` is `Max People` and in Merry
 * Fisher `P` is `Water Capacity`. A number is not comparable because
 * it is a number.
 *
 * The vocabulary below is units — kilograms, millimetres, horsepower
 * — not facts about any business. Nothing about this file is in it.
 */
const UNIT_WORDS: Record<string, string> = {
  kg: 'kg',
  kgs: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  mm: 'mm',
  cm: 'cm',
  km: 'km',
  mtr: 'm',
  mtrs: 'm',
  metre: 'm',
  metres: 'm',
  meter: 'm',
  meters: 'm',
  ltr: 'l',
  ltrs: 'l',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',
  hp: 'hp',
  bhp: 'hp',
  kw: 'kw',
  deg: 'deg',
  hrs: 'h',
  hour: 'h',
  hours: 'h',
}

/** Short and ambiguous: accepted only as the last word of the header
 *  or inside brackets, because `in` is also a word and `m` is also an
 *  initial. */
const SHORT_UNITS: Record<string, string> = {
  m: 'm',
  l: 'l',
  g: 'g',
  t: 't',
  in: 'in',
  inch: 'in',
  inches: 'in',
  '%': '%',
  $: '$',
  '°': 'deg',
}

const tokens = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9%$°]+/)
    .filter((t) => t !== '')

/** The unit a column header declares, or null where it declares none.
 *  Null is an answer: it means the file did not say, and the engine
 *  will not compare on a guess. */
export function unitOf(columnName: string): string | null {
  const all = tokens(columnName)
  for (const t of all) {
    const hit = UNIT_WORDS[t]
    if (hit) return hit
  }
  const bracketed = new Set<string>()
  for (const m of columnName.matchAll(/[([{]([^)\]}]*)[)\]}]/g)) {
    for (const t of tokens(m[1])) bracketed.add(t)
  }
  const last = all[all.length - 1]
  for (const t of all) {
    if (!SHORT_UNITS[t]) continue
    if (t === last || bracketed.has(t)) return SHORT_UNITS[t]
  }
  return null
}

/* ---------------------------------------------------------- */
/* The sentinel list — FITMENT_RULES.md §6.1                   */
/* ---------------------------------------------------------- */

/** One reason a value is not a value. `label` is what the candidate
 *  prints, so a person can see WHAT was excluded and not merely how
 *  many. */
export interface SentinelRule {
  label: string
  test: (folded: string, raw: string) => boolean
}

/**
 * §6.1's list, in its own order, each entry carrying the wording the
 * specification used. `columnName` is passed separately so the last
 * rule — header text in a data cell — can be checked generically
 * rather than by naming this workbook's six leaked strings.
 *
 * `"0"` IS ON THE LIST AND IT IS THE ONE ENTRY THAT COULD BITE. A
 * price of zero is conceivable; a zero ATM, a zero weight and a zero
 * length are not, and §6.1 fixed it as empty for the whole file. The
 * engine therefore excludes it AND COUNTS IT, which is the only
 * honest way to hold a rule you are not certain of: the count travels
 * with every candidate, so a reader who disagrees can see exactly how
 * much of the denominator the decision moved.
 */
export const SENTINEL_RULES: SentinelRule[] = [
  { label: 'a bare full stop', test: (_f, raw) => raw.trim() === '.' },
  { label: 'a bare zero', test: (_f, raw) => raw.trim() === '0' },
  { label: 'begins "NR -"', test: (_f, raw) => /^NR\s*-/i.test(raw.trim()) },
  { label: 'says "NOT REQUIRED"', test: (f) => f.includes(' not required ') },
  {
    label: 'the kit comes on the engine',
    test: (f) => f === ' tiller handle standard w motor ',
  },
  {
    label: 'a factory-fitted combination, not a chosen part',
    test: (f) =>
      f.includes(' factory fit rigging kit ') ||
      f.includes(' factory motor supplied rigging kit ') ||
      f.includes(' factory fitted motor rigging combination '),
  },
]

/** Did a sentinel rule fire, and which? Returns the rule's label, or
 *  null when the value is a value.
 *
 *  `columnName` implements §6.1's header-leak clause generically —
 *  see the note at the head of this file. */
export function sentinelRuleFor(raw: string, columnName?: string): string | null {
  const f = fold(raw)
  for (const rule of SENTINEL_RULES) {
    if (rule.test(f, raw)) return rule.label
  }
  if (columnName && exact(raw) === exact(columnName)) {
    return "the column's own name, leaked into a data cell"
  }
  return null
}

/* ---------------------------------------------------------- */
/* Reading one cell                                            */
/* ---------------------------------------------------------- */

export type CellSkip = 'empty' | 'sentinel'

/** What one cell is worth to a measurement: a comparable value, or
 *  the named reason it is not one. Never both. */
export interface CellReading {
  /** the value, whitespace-collapsed; null when it was skipped */
  text: string | null
  /** the value as the business wrote it, for naming a counter-example */
  raw: string | null
  /** numeric cells only */
  num: number | null
  skip: CellSkip | null
  /** which sentinel rule fired, when `skip` is 'sentinel' */
  rule: string | null
}

const SKIPPED_EMPTY: CellReading = { text: null, raw: null, num: null, skip: 'empty', rule: null }

/** Read a cell for measurement. Images, arrays and booleans are not
 *  values a rule compares, so they read as empty rather than being
 *  stringified into something that looks comparable. */
export function readValue(v: CellValue, columnName?: string): CellReading {
  if (v === null || v === undefined) return SKIPPED_EMPTY
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return SKIPPED_EMPTY
    if (v === 0) {
      return { text: null, raw: '0', num: null, skip: 'sentinel', rule: 'a bare zero' }
    }
    return { text: String(v), raw: String(v), num: v, skip: null, rule: null }
  }
  if (typeof v === 'boolean') {
    return { text: v ? 'true' : 'false', raw: String(v), num: null, skip: null, rule: null }
  }
  if (typeof v !== 'string') return SKIPPED_EMPTY
  const raw = v.trim().replace(/\s+/g, ' ')
  if (raw === '') return SKIPPED_EMPTY
  const rule = sentinelRuleFor(raw, columnName)
  if (rule) return { text: null, raw, num: null, skip: 'sentinel', rule }
  const asNumber = Number(raw.replace(/,/g, ''))
  return {
    text: raw,
    raw,
    num: raw !== '' && Number.isFinite(asNumber) ? asNumber : null,
    skip: null,
    rule: null,
  }
}

/**
 * A ROW ID READ AS ITSELF — the sentinel vocabulary deliberately NOT
 * applied.
 *
 * Row ids here are ten random characters from an alphabet that
 * includes `N`, `R` and `-`, so roughly one id in a quarter of a
 * million begins `NR-` and would be read as §6.1's engine-not-
 * required sentinel. That is one pairing silently dropped from a
 * denominator, at random, on some runs and not others — the exact
 * class of bug this file exists to prevent, arriving through the
 * door it was built to guard. An identity is not a value a business
 * wrote, so no rule about business values may touch it.
 */
export function readIdentity(id: string): CellReading {
  if (id === '') return SKIPPED_EMPTY
  return { text: id, raw: id, num: null, skip: null, rule: null }
}

/* ---------------------------------------------------------- */
/* The accounting                                              */
/* ---------------------------------------------------------- */

/**
 * How many values one side of a measurement threw away, and why.
 *
 * `untestable` is the third bucket and it is the one the trailer rule
 * needs. A trailer whose series banner names NO boat brand is not a
 * counter-example to "the banner names the brand" — the rule cannot
 * run on it at all, and the price file itself puts ten live Stabicraft
 * offerings on such a series. Counting those as failures would report
 * F8 at 83 % instead of 100 % and bury the one rule in the file that
 * actually selects. Counting them silently would be the 79.4 %
 * artefact with the sign reversed. So they are excluded, counted, and
 * the reason is printed.
 */
export interface ExclusionReading {
  empty: number
  sentinel: number
  /** which sentinel rules fired and how often, most frequent first */
  sentinelRules: Array<{ label: string; count: number }>
  untestable: number
  untestableWhy: string | null
}

export class Exclusions {
  empty = 0
  sentinel = 0
  untestable = 0
  private readonly rules = new Map<string, number>()
  private why: string | null = null

  /** Record a skipped reading. Returns true when the value survived. */
  keep(r: CellReading): boolean {
    if (r.skip === null) return true
    if (r.skip === 'empty') this.empty += 1
    else {
      this.sentinel += 1
      const label = r.rule ?? 'a sentinel'
      this.rules.set(label, (this.rules.get(label) ?? 0) + 1)
    }
    return false
  }

  /** A value that is present and real but on which this test cannot
   *  run. `why` is written once and printed with the count. */
  cannotTest(why: string): void {
    this.untestable += 1
    this.why = why
  }

  read(): ExclusionReading {
    return {
      empty: this.empty,
      sentinel: this.sentinel,
      sentinelRules: [...this.rules.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
      untestable: this.untestable,
      untestableWhy: this.why,
    }
  }
}

export const emptyExclusions = (): ExclusionReading => new Exclusions().read()
