/* ============================================================
   THE PRICE LADDER — which column is the price, and at which rung.

   ONE RULE GOVERNS EVERY RUNG:

     If the number is not a column in the project's own data, the
     quote does not produce it.

   No exception, and in particular no exception for the numbers
   "everybody knows": no 29% markup, no hourly labour rate, no tax
   divisor, no deposit percentage, no trade discount. Every one of
   those is a real figure in the Master Price File and NOT ONE OF
   THEM is a column in the seeded data. Reproducing them here would
   be inventing pricing policy from memory of a spreadsheet.

   SO THIS FILE COMPUTES NOTHING. It LOOKS UP a rung the business
   already maintains by hand, and where there is no rung it says so.

   WHY NOT A REGEX. The nearest thing to a price-column detector in
   this codebase is `isMoney(name, band)` in views/columns.ts, and it
   is deliberately a different question: it decides how to SET a
   figure, and so it matches `Dealer List Price` and `Base Cost` as
   readily as `Sell Price`. Ranked by
   `defaultColumns()`, the first money column on a seeded boat is
   `Base Cost` and on a seeded motor is `Dealer List Price` — the
   dealer's BUY price. A quote that guesses prints that to a
   customer. This file never guesses: it reads a NAMED column, and a
   table with no named column is simply not priced.

   WHAT IS ALREADY INSIDE THE NUMBER WE READ — and must therefore
   never be added to it:
     · motor pre-delivery is inside `Sell Price` (Motor Library!BF
       ← AX ← AV Total PD Allowance). Adding PD double-charges it.
     · trailer registration is inside `Sell inc Rego` (CA = DB77).
       Reading `Sell` + `Rego ($)` is the same double-charge.
     · part labour is inside `Sell inc Install (if appl.)` (Y ← P
       ← O TTF Hours). A fitted line reads Y, a supply line reads L.
       Never L + P.
   That is why this feature needs no labour arithmetic at all.

   AND THOSE FOUR SENTENCES ARE NOW DATA, which is the change
   SERVICE_AND_THEMES.md §3.2 theme 5 calls "the highest-value change
   in this document". They were a paragraph in a source file for as
   long as this feature has existed: correct, cited, and unable to
   stop anything. `RUNG_CONTENTS` below carries the same four facts
   with the same four cells, `priceLevelsFor` hangs them on the rung,
   `freezeLevels` freezes them onto the line, and `chargeAlreadyIn`
   turns them into a sentence a surface can print at the moment
   somebody is about to charge a fee twice.

   AND NO MARKUP, EVER. The workbook applies exactly one — 29% on
   the hull, `Boat Module!AB265` — and `BMT - MU` is not a column in
   the seeded data. The `Cash` / `Trade` / `Warranty` rungs we read
   ARE the hand-maintained hull-only prices (QR/QT/RB), already
   rounded by the business upstream. Re-deriving them would replace
   a number a person approved with a number a program guessed.
   ============================================================ */

import type {
  CellValue,
  ColumnSection,
  EntityDef,
  FieldDef,
  TableKind,
} from '@/types/model'
import { money } from '@/lib/money'
import {
  CHARGE_TITLE,
  LEVEL_TITLE,
  QUOTE_LEVEL_ORDER,
  type FrozenLevel,
  type PriceLevel,
  type RungCharge,
  type RungContents,
} from './types'

/* ---------------------------------------------------------- */
/* Names                                                      */
/* ---------------------------------------------------------- */

/** Comparable form of a column name: no case, no punctuation.
 *  'Sell inc Install (if appl.)' → 'sell inc install if appl'. */
export const normName = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/* ---------------------------------------------------------- */
/* The hard exclusion — cost never reaches a quote surface     */
/* ---------------------------------------------------------- */

/** Column names in the seeded data that are a COST or a MARKUP, and
 *  are therefore forbidden on every quote surface — picker, document
 *  and print — and forbidden in any total. Each one is a real column
 *  in `src/demos/northside.ts`; the failure prevented is a customer
 *  reading the dealer's buy price off a quotation. */
const COST_COLUMNS = new Set(
  [
    'Base Cost',
    'Landed Hull Cost',
    'Landed CTD',
    'Nett CTD',
    'Dealer List Price',
    'Dealer',
    'Nett Price',
    'Landed',
    'Total CTD',
    'Base List',
    'P&A',
    'CTD',
    'MU',
    'HO - MU',
    'BMT - MU',
    'EX Rate',
    'Base Freight',
    'Other Charges',
    'Road Freight',
    'Freight',
    'Quad Freight',
    'Stamp Duty',
    'Handling',
    'Dazmac',
    'IYT Logistics',
    'ABP Compl.',
    'Aus Spec',
    'Total PD Allowance',
    'Labour ($)',
    'TTF (Hours)',
    'RRP + Freight Inc GST',
  ].map(normName),
)

const sectionOf = (entity: EntityDef, field: FieldDef): ColumnSection | undefined =>
  field.sectionId ? entity.sections?.find((s) => s.id === field.sectionId) : undefined

/** True when a column is a cost or a markup — by the BAND the
 *  business filed it under first, then by its own name.
 *
 *  Band first because that is the business's own statement: the seed
 *  files `Base Cost` under "Cost Build" and `Dealer List Price`
 *  under "Cost Ladder". Name second, so a table with no bands is
 *  still safe. NOT by accent: the parts table bands `Sell` under
 *  "Supply Pricing", which is graphite and is nonetheless the
 *  customer's price. */
export function isCostColumn(entity: EntityDef, field: FieldDef): boolean {
  const band = normName(sectionOf(entity, field)?.name ?? '')
  if (band.includes('cost') || band.includes('markup')) return true
  const n = normName(field.name)
  return COST_COLUMNS.has(n) || n.includes('cost') || n.startsWith('landed ')
}

/** Anything that could be read as money, used ONLY to keep numbers
 *  off the subject's spec strip. Over-excluding a spec costs one
 *  line of description; under-excluding one prints a price where a
 *  customer expects a hull length. */
const MONETARY =
  /price|cost|cash|rrp|sell|trade|freight|deposit|fee|charge|\bmu\b|ctd|rego|warranty|list/i

export const looksMonetary = (name: string): boolean => MONETARY.test(name)

/* ---------------------------------------------------------- */
/* The levels a table declares                                */
/* ---------------------------------------------------------- */

interface NamedLevel {
  key: string
  column: string
  scope: 'quote' | 'line'
  contains?: RungContents
}

/* ---------------------------------------------------------- */
/* What each named column already contains                     */
/* ---------------------------------------------------------- */

/** `Sell inc Rego` contains the registration fee. ASSERTED by the
 *  trailer sheet's own formula — SERVICE_AND_THEMES.md §3.1 reads
 *  `CA = ROUNDUP(BW+BZ,)`, the sell price plus `BZ Rego ($)` at face
 *  value with no markup, which is the same paragraph's proof that a
 *  registration fee is never marked up. */
const TRAILER_SELL_INC_REGO: RungContents = {
  includesRegistration: true,
  source: 'Trailer Module!CA “Sell inc Rego” = ROUNDUP(BW+BZ,) · SERVICE_AND_THEMES.md §3.1',
}

/** A motor's `Sell Price` contains pre-delivery. ASSERTED by the
 *  chain the head of this file already cites. Registration and
 *  fitting are NOT stated either way for a motor, so neither is
 *  claimed. */
const MOTOR_SELL: RungContents = {
  includesPreDelivery: true,
  source: 'Motor Library!BF ← AX ← AV “Total PD Allowance”',
}

/** A part's fitted rung contains the labour to fit it. */
const PART_SELL_INC_INSTALL: RungContents = {
  includesInstall: true,
  source: 'Parts Maintenance!Y “Sell inc Install (if appl.)” ← P ← O “TTF (Hours)”',
}

/** A part's supply rung does NOT — and saying so is the whole reason
 *  `false` exists beside `undefined`. `L` is the supply price and `Y`
 *  is the fitted one; charging fitting on a line priced at `L` is
 *  correct, and a guard that could not tell the two apart would
 *  refuse the right thing as loudly as the wrong one. */
const PART_SELL: RungContents = {
  includesInstall: false,
  source: 'Parts Maintenance!L “Sell” — the supply rung; the fitted rung is Y',
}

/** A boat's hull-only rungs do NOT contain registration. ASSERTED by
 *  the quote sheet publishing both numbers side by side:
 *  `D41 = 110,600` hull only and `D42 = ROUNDUP(D41+A23,) = 111,014`
 *  hull plus rego — a difference of exactly the 414 fee. So a
 *  registration line beside a boat is right, and beside a trailer is
 *  a second charge. That is §3.1's "never add it twice", and it is
 *  the one place in this table where the two subjects of one concept
 *  disagree. */
const BOAT_HULL_ONLY: RungContents = {
  includesRegistration: false,
  source:
    "Managers View!D41 “HULL ONLY SALE” vs D42 “HULL ONLY inc Boat Registration” — they differ by the fee · SERVICE_AND_THEMES.md §2.4, §3.1",
}

/** The named price columns per kind of table, in the order the
 *  business offers them, taken VERBATIM from the seeded Northside
 *  data and its workbook cells:
 *
 *    boat       Cash · Trade · Warranty     Boat Module   QR / QT / RB
 *    motor      Sell Price · Trade Price    Motor Library BF / BL
 *    trailer    Sell inc Rego               Trailer Mod.  CA
 *    accessory  Sell · Sell inc Install     Parts Maint.  L / Y
 *
 *  `scope` decides which rungs the ONE control at the top of a quote
 *  may offer. `warranty` exists only on boats and `fitted` only on
 *  parts, so neither is a whole-quote choice: switching a whole
 *  quote to "fitted" would ask a trailer for a rung no trailer has.
 *
 *  THIS IS A FALLBACK, NOT THE CONTRACT. The contract is
 *  `EntityDef.priceLevels` (see index.ts) — one declaration per
 *  table, written by whoever owns the table. Until that field
 *  exists, an exact-name allow-list is the only honest resolver: it
 *  can be wrong by OMISSION, in which case the line says "not priced
 *  here" and waits for a person, but it can never be wrong by
 *  ACCIDENT, which is exactly what a regex is. */
const NAMED_LEVELS: Partial<Record<TableKind, NamedLevel[]>> = {
  boat: [
    { key: 'cash', column: 'Cash', scope: 'quote', contains: BOAT_HULL_ONLY },
    { key: 'trade', column: 'Trade', scope: 'quote', contains: BOAT_HULL_ONLY },
    { key: 'warranty', column: 'Warranty', scope: 'line', contains: BOAT_HULL_ONLY },
  ],
  motor: [
    { key: 'cash', column: 'Sell Price', scope: 'quote', contains: MOTOR_SELL },
    /* `Trade Price` (Motor Library!BL) — no cell says whether
       pre-delivery is inside it, so nothing is claimed. Silence here
       is the third state doing its job. */
    { key: 'trade', column: 'Trade Price', scope: 'quote' },
  ],
  trailer: [
    { key: 'cash', column: 'Sell inc Rego', scope: 'quote', contains: TRAILER_SELL_INC_REGO },
  ],
  accessory: [
    { key: 'cash', column: 'Sell', scope: 'quote', contains: PART_SELL },
    {
      key: 'fitted',
      column: 'Sell inc Install (if appl.)',
      scope: 'line',
      contains: PART_SELL_INC_INSTALL,
    },
  ],
  /* a package's price is a view's business, a dealer has none, and a
     custom table has told us nothing — all three are UNPRICED rather
     than guessed at */
}

/** A table carrying its own declaration. Read through a narrow type
 *  rather than a cast to `any`, so the day `priceLevels` lands on
 *  EntityDef this file needs no edit at all. */
interface MaybeLevelled {
  priceLevels?: PriceLevel[]
}

/**
 * The columns a quote may read a price from, for THIS table.
 *
 * EMPTY MEANS THIS TABLE IS NOT PRICED and a quote leaves the amount
 * for a person — never a guess, never a regex on a column name. A
 * rigging kit and a propeller are priced in workbooks we do not hold
 * ('[8]Rigging Kits'!CB9, 'Internal Work Order'!W76), so their lines
 * carry no number and say so out loud.
 */
export function priceLevelsFor(entity: EntityDef | undefined): PriceLevel[] {
  if (!entity) return []

  /* 1. the table's own declaration, when it has one */
  const declared = (entity as EntityDef & MaybeLevelled).priceLevels
  if (declared && declared.length > 0) {
    return declared.filter((l) => {
      const f = entity.fields.find((x) => x.id === l.fieldId)
      /* a declaration pointing at a cost column is still refused —
         the exclusion is by construction, not by good manners */
      return !!f && !isCostColumn(entity, f)
    })
  }

  /* 2. the named columns this kind of table is known to carry */
  const wanted = entity.kind ? NAMED_LEVELS[entity.kind] : undefined
  if (!wanted) return []
  const out: PriceLevel[] = []
  for (const { key, column, scope, contains } of wanted) {
    const want = normName(column)
    const field = entity.fields.find(
      (f) =>
        (f.type === 'number' || f.type === 'formula') &&
        normName(f.name) === want &&
        !isCostColumn(entity, f),
    )
    if (field) out.push({ key, label: field.name, fieldId: field.id, scope, contains })
  }
  return out
}

/** True when a table can price anything at all. */
export const isPriced = (entity: EntityDef | undefined): boolean =>
  priceLevelsFor(entity).length > 0

/* ---------------------------------------------------------- */
/* Freezing every rung, once, at pick time                     */
/* ---------------------------------------------------------- */

const asNumber = (v: CellValue): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const t = v.replace(/[$,\s]/g, '')
    if (t === '') return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Every rung this row carries, read once, at the moment the line is
 * made.
 *
 * `values` is the row already resolved (formulas included) by the
 * rule engine and PASSED IN rather than read here, so this file never
 * touches the store and a frozen line can be re-derived in a test
 * from nothing but a table and a row.
 *
 * Capturing all the rungs is what makes changing the level pure
 * arithmetic on frozen data: no store read, and no chance that
 * switching to Trade on Friday quietly picks up Tuesday's reimport.
 */
export function freezeLevels(
  entity: EntityDef | undefined,
  values: Record<string, CellValue>,
): FrozenLevel[] {
  return priceLevelsFor(entity).map((l) => ({
    key: l.key,
    label: l.label,
    fieldId: l.fieldId,
    value: asNumber(values[l.fieldId] ?? null),
    scope: l.scope,
    ...(l.contains ? { contains: l.contains } : {}),
  }))
}

/* ---------------------------------------------------------- */
/* THE MECHANICAL RULE — never charge it twice                 */
/* ---------------------------------------------------------- */

/**
 * Does this rung already contain that charge? `undefined` means no
 * cell says either way, and it is never coerced to `false`.
 */
export function rungIncludes(
  level: Pick<FrozenLevel, 'contains'> | undefined,
  charge: RungCharge,
): boolean | undefined {
  const c = level?.contains
  if (!c) return undefined
  if (charge === 'registration') return c.includesRegistration
  if (charge === 'install') return c.includesInstall
  return c.includesPreDelivery
}

/** One line on a quote, as much of it as this question needs. */
export interface ChargeableLine {
  label: string
  levelResolved: string
  priceColumnName: string | null
  levels: FrozenLevel[]
}

/** A line whose own price column already contains a charge somebody
 *  is about to add a second time. */
export interface AlreadyIncluded {
  /** the line, by the name on the quote */
  line: string
  /** the column its price was read from */
  column: string
  /** the cell that says the charge is inside it */
  source: string
}

/**
 * Every line on this quote whose own price column already contains
 * `charge`.
 *
 * IT ASKS THE RUNG THE LINE IS ACTUALLY PRICED AT, and only that
 * one. A trailer carries `Sell inc Rego` and nothing else, so the
 * question has one answer; but a part carries both `Sell` and `Sell
 * inc Install (if appl.)` and the answer is entirely which of the
 * two this line is on. Asking the table rather than the line would
 * refuse a fitting charge on a supply line, which is a correct
 * charge, and a guard that cries wolf is a guard people learn to
 * click past.
 *
 * IT REFUSES NOTHING AND CHANGES NOTHING. A free line is a
 * salesperson's typed sentence and they may mean something this app
 * has never heard of — a transfer fee, a second trailer, a replacement
 * plate are all real rows in `Registration Costs` and none of them is
 * the fee already inside `Sell inc Rego`. So this returns evidence
 * and the surface says it out loud; the person decides. That is
 * DESIGN_PRINCIPLES rule 10 — say why, where it is — and NOT rule 9,
 * because nothing is being undone.
 */
export function chargeAlreadyIn(
  lines: readonly ChargeableLine[],
  charge: RungCharge,
): AlreadyIncluded[] {
  const out: AlreadyIncluded[] = []
  for (const line of lines) {
    const level = line.levels.find((l) => l.key === line.levelResolved)
    if (rungIncludes(level, charge) !== true) continue
    out.push({
      line: line.label,
      column: line.priceColumnName ?? level?.label ?? '',
      source: level?.contains?.source ?? '',
    })
  }
  return out
}

/** The words a person actually reads, or null when there is nothing
 *  to say. Built here rather than in the component so the sentence
 *  and the rule cannot drift apart. */
export function chargeAlreadyInSentence(
  found: readonly AlreadyIncluded[],
  charge: RungCharge,
): string | null {
  if (found.length === 0) return null
  const what = CHARGE_TITLE[charge]
  if (found.length === 1) {
    const one = found[0]
    return `${one.line} is priced at ${one.column}, and that number already has ${what} in it.`
  }
  const names = found.map((f) => f.line).join(', ')
  return `${found.length} lines are priced at a column that already has ${what} in it — ${names}.`
}

/** Which of the three charges a typed label is naming, or null.
 *
 *  DELIBERATELY NARROW. It matches the charge's own noun and the
 *  words the workbook itself uses for it — `Registration`, `Rego`,
 *  `Pre Delivery` — and nothing that merely rhymes. A guard that
 *  fires on "Regular service" would be worse than no guard: a warning
 *  a person has learned to ignore is how the real one gets ignored
 *  too. Missing a spelling costs nothing that is not already the
 *  situation today. */
export function chargeNamedBy(label: string): RungCharge | null {
  const n = normName(label)
  if (n === '') return null
  if (/\b(registration|rego)\b/.test(n)) return 'registration'
  if (/\b(pre delivery|predelivery|pdi)\b/.test(n)) return 'preDelivery'
  if (/\b(install|installation|fitting|fitment labour)\b/.test(n)) return 'install'
  return null
}

export interface PricedAt {
  unitPrice: number | null
  priceFieldId: string | null
  priceColumnName: string | null
  levelKey: string
  levelResolved: string
}

/**
 * The whole of the quote's pricing logic, and it is a lookup over
 * frozen rungs.
 *
 * WHEN THE TABLE HAS NO COLUMN FOR THE CHOSEN LEVEL the line is
 * priced at that table's FIRST rung and records which rung it
 * actually used, so the document can answer "a trailer has one price
 * and this is it" rather than silently pricing a trade deal at
 * retail. Levels are keyed by NAME and never by position: index-
 * matching across tables would price a boat at cash and a part at
 * *fitted* under one and the same choice.
 */
export function priceAtLevel(levels: FrozenLevel[], levelKey: string): PricedAt {
  if (levels.length === 0) {
    return {
      unitPrice: null,
      priceFieldId: null,
      priceColumnName: null,
      levelKey,
      levelResolved: levelKey,
    }
  }
  const level = levels.find((l) => l.key === levelKey) ?? levels[0]
  return {
    unitPrice: level.value,
    priceFieldId: level.fieldId,
    priceColumnName: level.label,
    levelKey,
    levelResolved: level.key,
  }
}

/* ---------------------------------------------------------- */
/* The rungs a whole quote may be set to                      */
/* ---------------------------------------------------------- */

export interface QuoteLevelChoice {
  key: string
  /** the business's own word for the rung */
  label: string
  /** the tables on this quote that actually carry it, so the control
   *  can say "2 of 3 lines" instead of pretending it is universal */
  carriedBy: number
}

/**
 * The rungs THIS quote can be set to as a whole: every quote-scoped
 * key any of its lines carries, in the business's own order.
 *
 * Reads the LINES, not the tables — a quote is a photograph, and the
 * control that changes it must be drawn from the photograph too.
 */
export function quoteLevelChoices(
  lines: Array<{ levels: FrozenLevel[] }>,
): QuoteLevelChoice[] {
  const count = new Map<string, number>()
  for (const line of lines) {
    for (const l of line.levels) {
      if (l.scope !== 'quote') continue
      count.set(l.key, (count.get(l.key) ?? 0) + 1)
    }
  }
  const out: QuoteLevelChoice[] = []
  for (const key of QUOTE_LEVEL_ORDER) {
    const carriedBy = count.get(key)
    if (!carriedBy) continue
    out.push({ key, label: LEVEL_TITLE[key] ?? key, carriedBy })
  }
  /* a key the data declares that the model has no title for is still
     offered — the business's vocabulary outranks ours */
  for (const [key, carriedBy] of count) {
    if (out.some((o) => o.key === key)) continue
    out.push({ key, label: LEVEL_TITLE[key] ?? key, carriedBy })
  }
  return out
}

/** The rung a fresh quote opens at: the subject's first quote-scoped
 *  rung. The business's own column order decides it, not us. */
export function defaultLevelKey(root: EntityDef | undefined): string {
  const levels = priceLevelsFor(root)
  return (levels.find((l) => l.scope === 'quote') ?? levels[0])?.key ?? QUOTE_LEVEL_ORDER[0]
}

/* ---------------------------------------------------------- */
/* Setting a number                                           */
/* ---------------------------------------------------------- */

/** Money as the drawing office sets it. Cents appear only when the
 *  figure HAS cents — every seeded price is whole, and printing
 *  `$14,190.00` where the business writes `$14,190` makes a document
 *  look like a program wrote it. NOTHING IS EVER ROUNDED HERE: a
 *  rounded display over an unrounded total is how two summations of
 *  one deal start to disagree.
 *
 *  It lives in `@/lib/money` now, because a spec block on an item page
 *  prints the same figures and was printing them three other ways. This
 *  re-export is the quote's own door onto it. */
export { money } from '@/lib/money'

/** A signed adjustment always shows its sign, because a discount
 *  that reads like a charge is the one mistake nobody catches. */
export const signedMoney = (n: number): string => (n > 0 ? `+${money(n)}` : money(n))

/** A typed amount, read back from an input. Blank is not zero — a
 *  field a person has not filled in must never become a number. */
export function parseAmount(text: string): number | null {
  const t = text.replace(/[$,\s]/g, '').replace(/[−–]/g, '-')
  if (t === '' || t === '-') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
