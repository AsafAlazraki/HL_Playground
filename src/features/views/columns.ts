/* ============================================================
   Column knowledge — reading a table the way its author wrote it.

   The business writes units into column NAMES ("Boat Weight kg",
   "OA Length m") and writes an envelope as a PAIR of columns
   ("Min HP" / "Max HP"). Both facts are load-bearing here: the
   unit is what lets a value print as `5.66 m`, and the pair is
   what lets a page print `90–115 HP` on one line and offer the
   between-rule on a drop.

   Nothing in this file knows about React or the store.
   ============================================================ */

import {
  displayFieldOf,
  isImageValue,
  type CellValue,
  type EntityDef,
  type FieldDef,
} from '@/types/model'
import { money } from '@/lib/money'
/* DEEP IMPORT, DELIBERATELY, and the direction is the safe one:
   `quote/pricing` reads `@/types/model`, `@/lib/money` and its own
   `./types` and nothing else — no store, no React, and nothing of
   ours — so this closes no cycle with `quote/freeze.ts`, which
   imports this file. Reaching for the quote BARREL would. */
import { isCostColumn, priceLevelsFor } from '@/features/quote/pricing'

/* ---------------------------------------------------------- */
/* Names                                                      */
/* ---------------------------------------------------------- */

/** Units the kinds actually ship with, longest first so 'cm' wins over 'm'. */
const UNITS = ['mm', 'cm', 'km', 'kg', 'ltr', 'lbs', 'ft', 'hp', 'm', 'l', '%', '°']

/** Split "Boat Weight kg" into { base: 'Boat Weight', unit: 'kg' }. */
export function splitUnit(name: string): { base: string; unit?: string } {
  const trimmed = name.trim()
  for (const u of UNITS) {
    const suffix = trimmed.slice(-u.length)
    if (suffix.toLowerCase() !== u) continue
    const head = trimmed.slice(0, -u.length).trim()
    /* a bare "%" or "°" needs no space; a word unit does, so "Beam" is
       never read as "Bea" + "m" */
    if (head === '') continue
    if (/[a-z0-9]$/i.test(u) && !/[\s.\-–]$/.test(trimmed.slice(0, -u.length))) continue
    /* the author's own casing, never the lookup table's: the business
       writes HP, not hp, and a spec plate that shouts it back in
       lowercase looks like a bug */
    return { base: head.replace(/[\s.\-–]+$/, ''), unit: suffix === 'l' ? 'L' : suffix }
  }
  return { base: trimmed }
}

/** Comparable form of a column name: no case, no unit, no punctuation. */
export function normColumn(name: string): string {
  return splitUnit(name)
    .base.toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const BOUNDS = /^(min|minimum|max|maximum|lowest|highest)\b[\s.:_\-–]*(.*)$/i
const BOUNDS_TAIL = /^(.*?)[\s.:_\-–]+(min|minimum|max|maximum)$/i

type Bound = 'min' | 'max'

function boundOf(word: string): Bound {
  const w = word.toLowerCase()
  return w === 'max' || w === 'maximum' || w === 'highest' ? 'max' : 'min'
}

/** A `Min X` / `Max X` pair on one table, plus the name they share. */
export interface RangePair {
  /** normalised base name, e.g. 'hp' */
  key: string
  /** the base as the author wrote it, e.g. 'HP' */
  label: string
  min: FieldDef
  max: FieldDef
}

/** Every complete numeric envelope on a table, in column order. */
export function rangePairs(entity: EntityDef): RangePair[] {
  const halves = new Map<string, { label: string; min?: FieldDef; max?: FieldDef }>()
  for (const f of entity.fields) {
    if (f.type !== 'number' && f.type !== 'formula') continue
    const lead = BOUNDS.exec(f.name.trim())
    const tail = lead ? null : BOUNDS_TAIL.exec(f.name.trim())
    const bound = lead ? boundOf(lead[1]) : tail ? boundOf(tail[2]) : null
    const rawBase = lead ? lead[2] : tail ? tail[1] : ''
    if (!bound || rawBase.trim() === '') continue
    const key = normColumn(rawBase)
    if (key === '') continue
    const slot = halves.get(key) ?? { label: splitUnit(rawBase).base }
    slot[bound] = f
    halves.set(key, slot)
  }
  const out: RangePair[] = []
  for (const [key, slot] of halves) {
    if (slot.min && slot.max) out.push({ key, label: slot.label, min: slot.min, max: slot.max })
  }
  return out
}

/* ---------------------------------------------------------- */
/* Choosing what to show                                      */
/* ---------------------------------------------------------- */

const SHOWABLE = new Set(['number', 'select', 'text', 'boolean', 'date', 'formula'])

/** How interesting a column is on a one-line summary. Numbers and
 *  short lists say the most; the grouping columns are already spelled
 *  out by the block's own heading, so they say the least. */
function weight(entity: EntityDef, f: FieldDef): number {
  const inHierarchy = entity.hierarchy?.includes(f.id) ?? false
  if (inHierarchy) return 10
  switch (f.type) {
    case 'number':
      return 0
    case 'formula':
      return 1
    case 'select':
      return 2
    case 'boolean':
      return 4
    case 'date':
      return 5
    default:
      return 6
  }
}


/* ============================================================
   THE COLUMNS A CARD SHOWS — and the one it must never lead with.

   `defaultColumns` ranks by TYPE: numbers first, then formulas, then
   lists. On a motor table that is `Dealer List Price`, `Landed CTD`,
   `Nett CTD` — in that order, at the top — and every one of them is
   the dealer's BUY price. It did not matter much while a block was a
   table of 12px grey cells four columns wide. It matters now: a card
   sets its money at the mono-lg step, so the redesign's first draft
   made a dealer's cost the largest figure on a page whose own header
   says it is "a page you would put in front of a customer".

   `@/features/quote/pricing` already settles both halves of this and
   is cited rather than re-derived:

     `isCostColumn`    a cost or a markup, decided by the BAND the
                       business filed it under first and its own name
                       second. `Dealer List Price` sits under Cost
                       Ladder; `Base Cost` under Cost Build.
     `priceLevelsFor`  the SELL column, by name, per kind — `Cash` on
                       a boat, `Sell Price` on a motor, `Sell inc Rego`
                       on a trailer. Never a regex, so a table it does
                       not know is simply not priced.

   So a card leads with the sell price where the table has one, and
   fills up with columns that are not costs. A table with neither is
   drawn with fewer facts, which is the honest outcome and also the
   calmer one.

   THIS IS NOT A FILTER ON THE REGISTER. The table still shows every
   column it has; cost is the dealer's own business and they read it
   where they read everything else. This is about one surface.
   ============================================================ */

/** The sell column a card leads with, or undefined where the table
 *  declares none. The business's own order decides which rung: the
 *  first quote-scoped one, exactly as a fresh quote opens at. */
export function priceColumnOf(entity: EntityDef): string | undefined {
  const levels = priceLevelsFor(entity)
  return (levels.find((l) => l.scope === 'quote') ?? levels[0])?.fieldId
}

/** The facts on one card: the sell price first, then the highest-
 *  ranked columns that are not costs. */
export function cardColumns(entity: EntityDef, max = 3): string[] {
  const byId = new Map(entity.fields.map((f) => [f.id, f]))
  const lead = priceColumnOf(entity)
  const out: string[] = lead !== undefined && byId.has(lead) ? [lead] : []
  /* ask for more than we need, because the filter below removes some */
  for (const id of defaultColumns(entity, max + 8)) {
    if (out.length >= max) break
    if (out.includes(id)) continue
    const field = byId.get(id)
    if (!field || isCostColumn(entity, field)) continue
    out.push(id)
  }
  return out
}

/** The same refusal, for a list of columns somebody else chose. The
 *  spec strip on the page header picks its own five and must not
 *  print a cost among them either. */
export const withoutCosts = (entity: EntityDef, fieldIds: readonly string[]): string[] => {
  const byId = new Map(entity.fields.map((f) => [f.id, f]))
  return fieldIds.filter((id) => {
    const field = byId.get(id)
    return field !== undefined && !isCostColumn(entity, field)
  })
}

/**
 * The columns a related row shows beside its name. The name itself is
 * the display column, so it is never repeated here.
 */
export function defaultColumns(entity: EntityDef, max = 3): string[] {
  const nameField = displayFieldOf(entity)
  const ranked = entity.fields
    .filter((f) => f.id !== nameField?.id && SHOWABLE.has(f.type))
    .map((f, i) => ({ f, i, w: weight(entity, f) }))
    .sort((a, b) => a.w - b.w || a.i - b.i)
  return ranked.slice(0, max).map((r) => r.f.id)
}

/* ---------------------------------------------------------- */
/* Formatting                                                 */
/* ---------------------------------------------------------- */

/* ============================================================
   WHICH COLUMNS ARE MONEY — and which only look it.

   Every one of these traces to a workbook column and an adjudicated
   reading of it; none of it is guessed from the shape of a number.

   THE COLUMN'S OWN NAME, where the business's word for the figure
   settles it. `CTD` is Cost To Dealer (HELMLOGIC_GROUND_TRUTH.md:91),
   so `Landed CTD`, `Nett CTD`, `Total Nett CTD`, `Act CTD`, `Kit CTD`
   and `Parts & Accessories 1 CTD` are all costs. `GP` is Gross Profit
   in DOLLARS (MPF_GROUND_TRUTH.md:92, `GP = sell/1.1 - AX`). A `$` in
   the name says it outright — `Rego ($)`, `NSM Lab ($)`, `Labour ($)`.

   THE BAND IT SITS IN, where the name alone cannot possibly say. The
   boat brands each spend their freight and compliance money under a
   column of their own — `ABP Compl.`, `Aus Spec`, `Dazmac`,
   `IYT Logistics`, `Handling`, `Stamp Duty` (the seed's own header
   note at northside.ts, cols IQ and IX). No regex over those words
   will ever find a price; the workbook filed every one of them under
   `Cost Build`, and that is the fact to read. Same for `Base List`
   and `P&A` under `Supply Pricing` (`G` is "P&A cost (ex GST)",
   MPF_GROUND_TRUTH.md §6.7) and `Dealer` / `Factory` / `Settlement`
   / `Discount` under `Kit Pricing` and `Pricing`.

   AND A RATIO IS NEVER MONEY, whatever band it sits in. `MU` is
   Markup — `MU = GP / CTD`, a bare ratio, which is why the trailer
   sheet's own label for the identical figure is `MU %`
   (MPF_GROUND_TRUTH.md §6.6, §6.7). `$0.28` would be a lie about the
   business's arithmetic. Hours are not money either: `TTF (Hours)`,
   `NSM Lab (Hrs)`, `Lab Hrs` are the input a labour rate is charged
   against, not the charge.
   ============================================================ */

const MONEY_NAME =
  /\$|\b(price|cost|cash|rrp|sell|trade|freight|deposit|fee|charge|ctd|nett|landed|gp|rego|warranty|allowance|rebate)\b/i

const MONEY_BAND =
  /\b(cost|costs|price|prices|pricing|margin|retail|trade|wholesale|fee|fees|rate|rates|charge|charges|install|supply|sundries|total|totals|ladder)\b/i

/** A MARKUP OR A PERCENTAGE. `MU = GP / CTD`, so the figure is a
 *  proportion of something else and not an amount of anything. */
const RATIO_NAME = /\bmu\b|\bmark ?up\b|%/i

/** A count of hours: the input a labour rate is charged against. */
const HOURS_NAME = /\bhrs?\b|\bhours?\b/i

/** The band a column was filed under, as its author named it. */
export function bandOf(
  entity: EntityDef | undefined,
  field: FieldDef | undefined,
): string {
  if (!entity || !field?.sectionId) return ''
  return entity.sections?.find((s) => s.id === field.sectionId)?.name ?? ''
}

/** Is this column a currency amount? See the block above for every
 *  clause's source. `band` is the section's NAME, never its id — an id
 *  is minted for a table a person made and says nothing. */
export function isMoney(name: string, band = ''): boolean {
  const n = name.trim()
  if (n === '') return false
  if (RATIO_NAME.test(n) || HOURS_NAME.test(n)) return false
  /* a column carrying its own unit is a measurement: "Boat Weight kg",
     "OA Length m", "MU %" */
  if (splitUnit(n).unit !== undefined) return false
  return MONEY_NAME.test(n) || MONEY_BAND.test(band)
}

/** Is this column a proportion rather than an amount? */
export const isRatio = (name: string): boolean => RATIO_NAME.test(name.trim())

const numberFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** A ratio takes the SAME two decimals every time, for the same reason
 *  money does: `MU 0.27 · 0.7 · 0.47` down one column is the reported
 *  raggedness again, one column over. The maximum was already two, so
 *  this adds a minimum and rounds nothing that was not rounded before. */
const ratioFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** A number as the drawing office sets it: grouped, and money set as
 *  money — one format, `@/lib/money`, the same one the quote prints. */
export function formatNumber(n: number, name = '', band = ''): string {
  if (!Number.isFinite(n)) return ''
  if (isMoney(name, band)) return money(n)
  return isRatio(name) ? ratioFmt.format(n) : numberFmt.format(n)
}

/** One cell, ready to print. `resolveRef` turns a link into its label;
 *  `band` is the section NAME the column was filed under, which is half
 *  of the money question — pass it wherever the entity is in hand
 *  (`bandOf(entity, field)`). */
export function formatCell(
  field: FieldDef | undefined,
  value: CellValue,
  resolveRef?: (refEntityId: string | undefined, rowId: string) => string,
  band = '',
): string {
  if (value === null || value === undefined) return ''
  /* A PICTURE IS NEVER A NUMBER. This used to return the count, so a
     picture column that ever reached a page printed the numeral `1`
     where a customer expected a photograph. SHOWABLE keeps image
     columns off a page today, but that is a guard somewhere else and
     this is the line that would print it. Pictures are drawn by
     pictures.tsx, in the two places §4 puts them. */
  if (isImageValue(value)) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return formatNumber(value, field?.name ?? '', band)
  const text = String(value).trim()
  if (text === '') return ''
  if (field?.type === 'reference' && resolveRef) return resolveRef(field.refEntityId, text)
  const asNum = Number(text)
  if (field?.type === 'number' && text !== '' && Number.isFinite(asNum)) {
    return formatNumber(asNum, field.name, band)
  }
  return text
}

/** `90–115` for an envelope, or a single bound when only one is filled. */
export function formatRange(
  min: CellValue,
  max: CellValue,
  name = '',
  band = '',
): string {
  const a = typeof min === 'number' ? formatNumber(min, name, band) : ''
  const b = typeof max === 'number' ? formatNumber(max, name, band) : ''
  if (a !== '' && b !== '') return a === b ? a : `${a}–${b}`
  return a !== '' ? a : b
}
