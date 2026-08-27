/* ============================================================
   THE LEDGER — the sixteen workbook rules arranged BY WHAT THEY ARE
   ABOUT, each with the measurement its own adjudication put on it.

   WHY THIS FILE EXISTS, and it is a composition problem rather than a
   content one. `workbookRules.ts` already holds everything a person
   needs: sixteen rules mined out of the price file, each with the cell
   that states it, the evidence class it rests on, the measured hit
   rate, and a plain sentence saying what is missing where the app
   cannot run it. All of that was true and none of it was legible,
   because the surface drawing it led with STATUS — sixteen cards, ten
   of them stamped "Not checked yet" — so a screen about a remarkable
   price file read as a list of our own unfinished work.

   The owner's words, and they are the specification:

   > "why am i seeing not checked yet 0 the business rules and the how
   >  it fits and the really beautiful ways to visualise AND create
   >  those should be based on the MPF stuff that you have defined"

   So: group by SUBJECT — trailers, motors, rigging, the boat row,
   registration — and lead each card with the FIGURE. A rule that holds
   on 581 of 581 testable pairings with no counter-example is a
   remarkable fact about a business, and it should read like one. What
   is not checked is still on every card, still with its reason, and
   now subordinate to the finding rather than in front of it.

   NOTHING HERE IS A NEW MEASUREMENT.
   ─────────────────────────────────────────────────────────────
   Every numerator and denominator below is lifted from the `source`
   line of the seed it belongs to — which is itself the adjudication's
   own sentence, written against the workbook and quoted in
   docs/specs/FITMENT_RULES.md, FOUR_MODULES.md §3.3 or
   SERVICE_AND_THEMES.md §5.4. This file restructures those figures so
   a screen can draw them; it does not derive, round or re-derive one.

   AND THAT IS GUARDED. `ruleLedger.test.ts` asserts, for every entry
   carrying a measurement, that the denominator and either the
   numerator or the shortfall appear VERBATIM in the seed's own
   `source` string, formatted the way the adjudication wrote them. A
   plausible-sounding figure typed in to fill a card cannot survive
   that test, which is the whole point of having it: the one time a
   rule was invented on this project the reaction was "where the hell
   are you inventing these rules from".

   THE PERCENTAGE IS DERIVED, NOT TYPED. `held / tested` is computed on
   render. Where the adjudication also states the rate in words it
   agrees to two decimal places — 3,902/3,905 is the 99.92 % the source
   line quotes, 555/571 is its 97.20 %, 3,890/4,017 is its 96.84 % —
   and the test checks that agreement wherever the source states one.

   TWO SEEDS CARRY NO RATE AND THAT IS NOT AN OMISSION. A4 is asserted
   by a formula on 1,236 cells and A6 by a divider label; neither is a
   hit rate, and manufacturing a denominator for them would be the
   invention this file exists to prevent. They draw their assertion
   instead. S1 and S2 carry none either, for a better reason: S1 is
   MEASURED LIVE — `atmBandDisagreements()` walks the loaded sheet on
   every render — and a figure that moves with the data beats a
   constant that cannot.
   ============================================================ */

import type { TableKind } from '@/types/model'
import { REGISTRATION_TABLE_NAME } from './registration'
import type { WorkbookRuleRef, WorkbookRuleSeed } from './workbookRules'

/* ---------------------------------------------------------- */
/* Where a rule is being checked — the state, without the words */
/* ---------------------------------------------------------- */

/**
 * The three states a workbook rule can be in, as a bare value.
 *
 * IT IS THE STATE AND NOT THE SENTENCE, because two surfaces draw this
 * and they say different things about it. The ledger on BUSINESS RULES
 * subordinates the pending case to the finding above it — "not checked
 * here", then the reason. `WorkbookRuleList`, which a module draws,
 * leads with it. Both readings are right for their page; what may
 * never differ between them is WHICH rules are in which state, so that
 * one decision lives here.
 *
 * `liveIds` IS THE TRUTH AND `seed.blocked` IS ONLY A DEFAULT. The
 * moment the contract grows what a rule needs, its id appears in the
 * registry and both surfaces must say "checked" rather than keep
 * repeating a stale excuse.
 */
export type RuleState = 'here' | 'elsewhere' | 'pending'

export function ruleState(seed: WorkbookRuleSeed, liveIds: ReadonlySet<string>): RuleState {
  if (liveIds.has(seed.id)) return 'here'
  if (seed.enforcedIn) return 'elsewhere'
  return 'pending'
}

/* ---------------------------------------------------------- */
/* The groups — nouns naming what the rules are about          */
/* ---------------------------------------------------------- */

export type RuleGroupId = 'trailers' | 'motors' | 'rigging' | 'boat-row' | 'registration'

export interface RuleGroup {
  id: RuleGroupId
  /** A NOUN naming what these rules are about. Never a status, never a
   *  question — the same rule the navigation bar keeps, applied one
   *  level down. */
  name: string
  /** The kind of table these rules bite on, so the card's left rail can
   *  take THAT TABLE'S OWN accent out of the project rather than a hue
   *  chosen here. A furniture dealer's sheet has no boat tables and the
   *  rail falls back to a hairline; it never draws a colour for a table
   *  that is not there. */
  kind: TableKind
  /** The table whose accent this group should take, where `kind` alone
   *  is ambiguous. Three of this sheet's tables are `custom` and they
   *  are drawn in two different hues, so "the first custom table" is
   *  whichever one the store happens to iterate first — an arbitrary
   *  colour is worse than a hairline. Matched on name, case-folded,
   *  and it falls back to `kind` when the table is not there. */
  table?: string
  /** A PHRASE, not a sentence. PHASE_TWO's prose budget gives a card
   *  a name and one fact; these were 13–21 words each and stacked to a
   *  paragraph above every group. What each group decides is stated by
   *  the rules inside it, which is where a person reads it. */
  say: string
}

/** Reading order, and it is deliberate: the trailer rules first,
 *  because F8 is the only rule in either workbook that both holds at
 *  100 % and actually rejects something, and a person who reads one
 *  card should read that one. Registration last, because it is the one
 *  group whose finding is a defect in the data rather than a rule the
 *  business keeps. */
export const RULE_GROUPS: readonly RuleGroup[] = [
  {
    id: 'trailers',
    name: 'Trailers',
    kind: 'trailer',
    say: 'What may go under a hull, and what it is rated to carry.',
  },
  {
    id: 'motors',
    name: 'Motors',
    kind: 'motor',
    say: 'What may hang off a transom.',
  },
  {
    id: 'rigging',
    name: 'Rigging and propellers',
    kind: 'accessory',
    say: 'The kit, the propeller, and the hours to fit them.',
  },
  {
    id: 'boat-row',
    name: 'The boat row',
    kind: 'boat',
    say: 'What the sheet settles before anything is bolted on.',
  },
  {
    id: 'registration',
    name: 'Registration',
    kind: 'custom',
    table: REGISTRATION_TABLE_NAME,
    say: 'Collected for someone else, by band, never marked up.',
  },
] as const

/* ---------------------------------------------------------- */
/* One rule's entry                                            */
/* ---------------------------------------------------------- */

/** The rate the adjudication measured, restructured so a screen can
 *  draw it. `held` and `tested` are the adjudication's own figures. */
export interface RuleMeasure {
  /** rows, cells or pairings on which the rule holds */
  held: number
  /** rows, cells or pairings on which it could be tested at all */
  tested: number
  /** reads after the figure, naming WHAT was counted, in the dealer's
   *  words: "live pairings hold it". Never jargon, never a column
   *  reference — the reference is the provenance line. */
  of: string
}

export interface RuleLedgerEntry {
  ref: WorkbookRuleRef
  group: RuleGroupId
  /** absent where the adjudication measured no rate — see the header */
  measure?: RuleMeasure
  /** what the workbook asserts, where there is no rate to draw:
   *  the formula, the divider, the two columns. Verbatim. */
  asserts?: string
  /** the qualification that travels with the figure and may never be
   *  separated from it. Verbatim from the seed's own `source`. */
  caveat: string
}

/**
 * THE SIXTEEN, GROUPED.
 *
 * Every `measure` and every `caveat` below is a restatement of the
 * matching seed's `source` line in `workbookRules.ts`. No comment
 * repeats the citation here, because the guard reads that source
 * string itself — a copied citation is one that can go stale.
 */
export const RULE_LEDGER: readonly RuleLedgerEntry[] = [
  /* ---- trailers ---- */
  {
    ref: 'F8',
    group: 'trailers',
    measure: { held: 581, tested: 581, of: 'testable live pairings take a trailer from a series built for the boat’s own brand' },
    caveat:
      'It leaves between 0.92 % and 7.83 % of the 434 live trailers standing — a Highfield hull keeps 12 of them, 2.76 % of the catalogue. That is what makes it a selector rather than a formality.',
  },
  {
    ref: 'F9',
    group: 'trailers',
    measure: { held: 530, tested: 530, of: 'live pairings put the boat on a trailer rated to carry it' },
    caveat:
      'A mean 97.70 % of the live catalogue clears it too, so it is a floor and not a selector. A gate that leaves 97.7 % of the catalogue has not chosen a trailer.',
  },

  /* ---- motors ---- */
  {
    ref: 'A1',
    group: 'motors',
    measure: { held: 1424, tested: 1424, of: 'live standard and first-alternative motors sit under the boat’s plated Max HP' },
    caveat:
      '22 of 2,026 motors in the later option slots — 1.09 % — sit above it, and every one of them is the next model step up, offered on purpose.',
  },
  {
    ref: 'A2',
    group: 'motors',
    measure: { held: 685, tested: 757, of: 'live standard-fit motors sit at or above the boat’s plated Min HP' },
    caveat:
      'The dealer breaks it on purpose: slot 1 is the row’s lowest-HP motor on 99.9 % of rows, because it is the cheapest way onto the water. It warns and it must never block.',
  },
  {
    ref: 'F6',
    group: 'motors',
    measure: { held: 3902, tested: 3905, of: 'live loose-motor cells match the shaft length the transom is cut for' },
    caveat:
      'The 3 misses are single-letter typos, at Boat Module!KZ115, LF137 and LF138.',
  },
  {
    ref: 'F7',
    group: 'motors',
    measure: { held: 7830, tested: 7830, of: 'remote-helm cells name a motor that is not a tiller' },
    caveat:
      'It does not run the other way — 106 of 1,206 tiller-boat cells, 8.8 %, name a remote motor. And nobody wrote it down: it is a pattern in the values, so it may warn and it may never filter.',
  },

  /* ---- rigging and propellers ---- */
  {
    ref: 'F15',
    group: 'rigging',
    measure: { held: 555, tested: 571, of: 'testable live triples take a rigging kit from a section named for the boat’s brand' },
    caveat:
      'The 16 counter-examples are one class, and folding Jeanneau’s three marques into one group gives 571 of 571. It is evaluable on only 571 of 3,945 live triples — 14.5 % — because Highfield’s own section holds exactly two kits and the rest come from the general Yamaha ranges.',
  },
  {
    ref: 'F16',
    group: 'rigging',
    measure: { held: 1576, tested: 1576, of: 'mechanical-control pairings take a kit that is not a Helm Master' },
    caveat:
      'The only zero in the whole rigging cross-tab. It does not run the other way: a digital-control motor takes a mechanical kit on 137 cells.',
  },
  {
    ref: 'A3',
    group: 'rigging',
    measure: { held: 3890, tested: 4017, of: 'live pairings take a propeller from the motor’s own option list' },
    caveat:
      'It equals the motor’s named default on only 3,367 of them — 83.82 % — so the default is a pre-selection and not an obligation. The business picks a different propeller on one pairing in six.',
  },
  {
    ref: 'A4',
    group: 'rigging',
    asserts: 'Written as a formula on 1,236 cells.',
    caveat:
      'Boat Module!LB reads =IFERROR(VLOOKUP(LC,\'Parts Maintenance\'!C:ZZ,3,0),). Index 3 of C:ZZ was checked by opening Parts Module (3).xlsx directly rather than trusted.',
  },
  {
    ref: 'R9',
    group: 'rigging',
    measure: { held: 2436, tested: 2436, of: 'labour cells carry the formula’s own figure and not a hand-typed one' },
    caveat:
      'The only 0 % hand-override rate in the workbook, against 94.0 % on the rigging kit itself. Every lookup is $-anchored to slot 1 so it never walks to slot 2. This is arithmetic rather than a judgement, and it is real money a quote cannot yet show.',
  },

  /* ---- the boat row ---- */
  {
    ref: 'A5',
    group: 'boat-row',
    measure: { held: 2005, tested: 2005, of: 'boat rows with five numeric deposit stages add to exactly 100 %' },
    caveat: 'Written as =100%-SUM(QD:QG) on 378 master cells, and not one row disagrees.',
  },
  {
    ref: 'F12',
    group: 'boat-row',
    measure: { held: 1196, tested: 1196, of: 'multi-battery pre-delivery cells sit on a remote-helm boat' },
    caveat:
      'The control is the single-battery line: “Battery Terminals (1 pair)” splits 762 Remote and 289 Tiller. Nobody wrote this one down either, so it may warn and it may never filter.',
  },
  {
    ref: 'A6',
    group: 'boat-row',
    asserts: 'Asserted by the divider label itself — Boat Module!A1005 “OBSOLETE”.',
    caveat:
      'It cuts the boat universe from 2,005 rows to 812. And it has a twin in Trailer Module!A656 that 30 of 674 live trailer pairings — 4.5 % — still point below, all 30 of them Surtees.',
  },

  /* ---- registration ---- */
  {
    ref: 'S1',
    group: 'registration',
    asserts:
      'Asserted by a band table and a mass column — Registration Costs!C15:C19 against Trailer Module!K “ATM (KG)”.',
    caveat:
      'Nine live rows contradict their own ATM — rows 60, 61, 224–227, 398, 401 and 403 — and seven of them undercharge by $117 each, the gap between the small band at 166 and the large one at 283. It is shown and never corrected: changing one changes a price the business is charging today.',
  },
  {
    ref: 'S2',
    group: 'registration',
    asserts:
      'Asserted by two formulas counting into the same external table by hard-coded ordinal.',
    caveat:
      'Ordinal 9 reads SELL at 283.00 and ordinal 8 reads CTD at 282.19, for the same trailer on the same deal. That is 81 cents on every trailer, and a boat-and-trailer package carries one fee at retail and one at cost on one document.',
  },
] as const

/* ---------------------------------------------------------- */
/* Reading it                                                  */
/* ---------------------------------------------------------- */

const BY_REF = new Map<WorkbookRuleRef, RuleLedgerEntry>(
  RULE_LEDGER.map((e) => [e.ref, e]),
)

/** The ledger entry for a rule, or null where none is written. A seed
 *  with no entry is still drawn — ungrouped rather than dropped, which
 *  is the same discipline the catalogue keeps about rows it cannot
 *  read: a list that quietly loses one teaches a person not to trust
 *  the count. */
export const ledgerFor = (ref: WorkbookRuleRef): RuleLedgerEntry | null =>
  BY_REF.get(ref) ?? null

/** `held / tested` as a percentage, to two places, trimmed where it
 *  lands exactly on a whole number. DERIVED — never typed. */
export function holdRate(m: RuleMeasure): string {
  if (m.tested === 0) return '—'
  const pct = (m.held / m.tested) * 100
  const fixed = pct.toFixed(2)
  return `${fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed}%`
}
