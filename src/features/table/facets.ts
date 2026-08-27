/* ============================================================
   THE FACETS A TABLE ACTUALLY HAS.

   PHASE_TWO §2.2: "Filter by brand, series, length, HP envelope,
   price — FROM THE COLUMNS THAT ACTUALLY EXIST, never invented."

   That sentence is the whole specification and it is also the trap.
   The obvious way to build a catalogue filter rail is to decide what
   a boat shop filters by and then go looking for those columns —
   which produces a rail that is right for Highfield, half-empty for
   Yamaha and a lie for Parts & Accessories, because it is reporting
   the author of this file rather than the author of theirs.

   So this reads the other way round. It walks the table's own
   columns, asks of each one "could a person browse by this?", and
   the answer is arithmetic over the values that are in the cells:

     A CHOICE      a column with between 2 and 200 distinct values,
                   none of them long enough to be a sentence, and
                   fewer of them than half the rows — because a
                   column with one value per row is an identifier,
                   not a facet. `Series` passes on every boat brand.
                   `Model Code` passes on none of them.

     A BAND        a numeric column a person narrows by amount
                   rather than by name: the price, the length, the
                   horsepower. Three, in that order of certainty,
                   and each one has to be a real column of this
                   table or it is simply absent.

     AN ENVELOPE   a `Min X` / `Max X` PAIR, which is a fact about
                   fit rather than about the row: a hull rated
                   90–150 hp is offered to a person shopping for a
                   115. `rangePairs` in views/columns.ts already
                   finds these; this one asks it to read the pairs
                   the business typed a unit into as well, because
                   Highfield writes `4 HP` where Stacer writes `4`
                   and they are the same fact.

   WHAT IT WILL NOT DO. It will not invent a facet, rename a column,
   merge two columns that look alike, or offer a value nobody typed.
   A table with no photographs, no choices and no price gets an empty
   rail and a search box, which is the honest outcome — and the
   register is one press away underneath it.

   Pure. No React, no store. Measured against the whole seed in
   `facets.test.ts`.
   ============================================================ */

import type { EntityDef, FieldDef } from '@/types/model'
import { leadingNumber, type ViewRow } from '@/features/table/core'
import {
  bandOf,
  isMoney,
  normColumn,
  priceColumnOf,
  rangePairs,
  splitUnit,
} from '@/features/views/columns'

/* ---------------------------------------------------------- */
/* What a facet is                                            */
/* ---------------------------------------------------------- */

export interface FacetValue {
  /** the display text exactly as the register shows it */
  value: string
  count: number
}

export interface ValuesFacet {
  kind: 'values'
  id: string
  fieldId: string
  /** the author's own column name, minus a unit it carries */
  label: string
  /** most-held first, so the ten chips on screen are the ten worth
   *  having; the rest are behind the expander in the same order */
  values: FacetValue[]
}

export interface BandFacet {
  kind: 'band'
  id: string
  fieldId: string
  label: string
  unit?: string
  /** money prints as money — `@/lib/money`, the format the quote uses */
  money: boolean
  lo: number
  hi: number
}

export interface EnvelopeFacet {
  kind: 'envelope'
  id: string
  label: string
  unit?: string
  minFieldId: string
  maxFieldId: string
  lo: number
  hi: number
}

export type Facet = ValuesFacet | BandFacet | EnvelopeFacet

/* ---------------------------------------------------------- */
/* The thresholds, each with its reason                       */
/* ---------------------------------------------------------- */

/** Below this a "facet" narrows nothing: one value selects every row. */
const MIN_DISTINCT = 2

/** Above this the column is an identifier. Parts & Accessories files
 *  2,937 rows under 187 categories and that is a browse axis; it files
 *  them under 2,907 product names and that is a key. */
const MAX_DISTINCT = 200

/** A value longer than this is a sentence, and a chip is not a place
 *  to read one. `Boat Registration Not Required` is a cell the
 *  business wrote and a facet nobody wants. */
const MAX_LABEL = 40

/** How many choice facets a rail carries before it is a wall. */
const MAX_VALUES_FACETS = 5

/** A band needs enough distinct amounts to be worth a range at all —
 *  four prices is a list, not a spread. */
const MIN_BAND_SPREAD = 6

/** Chips beyond this are behind the expander, most-held first. */
export const CHIPS_SHOWN = 10

/* ---------------------------------------------------------- */
/* Reading                                                    */
/* ---------------------------------------------------------- */

const CHOOSABLE = new Set(['text', 'select', 'boolean', 'reference'])

const NAME_LENGTH = /\blength\b|\bloa\b/
const NAME_SHAFT = /\bshaft\b/
const NAME_HP = /\bhp\b|horse ?power/

function median(ns: number[]): number {
  if (ns.length === 0) return 0
  const s = [...ns].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

/** Every distinct display value of one column, with how many rows hold
 *  it. Blanks are not a facet value — "no answer" is not an answer a
 *  person browses by, and the row is still reachable by search. */
function tally(rows: readonly ViewRow[], fieldId: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const r of rows) {
    const t = r.text[fieldId]
    if (t === undefined || t === '') continue
    out.set(t, (out.get(t) ?? 0) + 1)
  }
  return out
}

/** The numbers one column holds, however they were typed. */
function numbersIn(rows: readonly ViewRow[], fieldId: string): number[] {
  const out: number[] = []
  for (const r of rows) {
    const n = leadingNumber(r.values[fieldId] ?? r.text[fieldId] ?? null)
    if (n !== null) out.push(n)
  }
  return out
}

interface Ranked {
  facet: ValuesFacet
  rank: number
}

/**
 * The facets of one table, in the order a rail should draw them:
 * the choices, then the envelope, then the bands, with price last
 * because price is the closer.
 *
 * `rows` must carry display text — `buildViewRows(rows, hasFormula)`
 * from `useTableData`, which is the same text the register filters and
 * sorts on, so a chip and a column can never disagree about a value.
 */
export function readFacets(
  entity: EntityDef | undefined,
  rows: readonly ViewRow[],
): Facet[] {
  if (!entity || rows.length === 0) return []

  const byId = new Map(entity.fields.map((f) => [f.id, f]))
  const hierarchy = entity.hierarchy ?? []
  const order = new Map(entity.fields.map((f, i) => [f.id, i]))

  /* -- the bands and the envelope first, because a column that is a
        band must not also be offered as a wall of chips ------------- */

  const spent = new Set<string>()
  const envelopes: EnvelopeFacet[] = []
  const bands: BandFacet[] = []

  for (const pair of rangePairs(entity, { alsoText: true })) {
    const los = numbersIn(rows, pair.min.id)
    const his = numbersIn(rows, pair.max.id)
    if (los.length === 0 || his.length === 0) continue
    const lo = Math.min(...los)
    const hi = Math.max(...his)
    if (!(hi > lo)) continue
    envelopes.push({
      kind: 'envelope',
      id: `env:${pair.key}`,
      label: pair.label,
      unit: splitUnit(pair.min.name).unit,
      minFieldId: pair.min.id,
      maxFieldId: pair.max.id,
      lo,
      hi,
    })
    spent.add(pair.min.id)
    spent.add(pair.max.id)
    if (envelopes.length === 1) break /* one envelope is a rail; two is a form */
  }

  const asBand = (f: FieldDef): BandFacet | null => {
    if (spent.has(f.id)) return null
    const ns = numbersIn(rows, f.id)
    if (new Set(ns).size < MIN_BAND_SPREAD) return null
    const lo = Math.min(...ns)
    const hi = Math.max(...ns)
    if (!(hi > lo)) return null
    const { base, unit } = splitUnit(f.name)
    return {
      kind: 'band',
      id: `band:${f.id}`,
      fieldId: f.id,
      label: base,
      unit,
      money: isMoney(f.name, bandOf(entity, f)),
      lo,
      hi,
    }
  }

  /* HORSEPOWER, where the table states it once rather than as an
     envelope. Yamaha writes `HP Rating`; a hull writes Min/Max. */
  if (envelopes.length === 0) {
    for (const f of entity.fields) {
      if (!NAME_HP.test(normColumn(f.name))) continue
      const b = asBand(f)
      if (b) {
        bands.push(b)
        spent.add(f.id)
        break
      }
    }
  }

  /* LENGTH — the first column whose name says it, and never a shaft
     length, which is a fitting and not a size. */
  for (const f of entity.fields) {
    const n = normColumn(f.name)
    if (!NAME_LENGTH.test(n) || NAME_SHAFT.test(n)) continue
    const b = asBand(f)
    if (b) {
      bands.push(b)
      spent.add(f.id)
      break
    }
  }

  /* THE PRICE the business declared, not one we picked out of the
     numbers. `priceColumnOf` reads the table's own price levels. */
  const priceId = priceColumnOf(entity)
  const priceField = priceId ? byId.get(priceId) : undefined
  if (priceField) {
    const b = asBand(priceField)
    if (b) {
      bands.push(b)
      spent.add(priceField.id)
    }
  }

  /* -- the choices ---------------------------------------------- */

  const ranked: Ranked[] = []
  const half = rows.length / 2

  for (const f of entity.fields) {
    if (spent.has(f.id)) continue
    if (!CHOOSABLE.has(f.type)) continue

    const counts = tally(rows, f.id)
    const distinct = counts.size
    if (distinct < MIN_DISTINCT || distinct > MAX_DISTINCT) continue
    /* one value per row is a key. A boolean is exempt: two values over
       two thousand rows is the most useful facet on the table. */
    if (distinct > half && f.type !== 'boolean') continue
    if (median([...counts.keys()].map((v) => v.length)) > MAX_LABEL) continue

    const values = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))

    /* THE ORDER OF THE RAIL, and every term is a reason:
         a grouping level is how the business already files this table,
         so it leads and keeps its own depth order;
         a declared list of options is an author saying "these are the
         choices", which is exactly what a facet is;
         everything else falls back to the author's column order, which
         puts identity and dimensions ahead of freight and rego. */
    const level = hierarchy.indexOf(f.id)
    let rank = order.get(f.id) ?? 999
    if (level >= 0) rank = -1000 + level
    else if (f.type === 'select') rank -= 200
    if (distinct > CHIPS_SHOWN) rank += 60

    ranked.push({
      facet: {
        kind: 'values',
        id: `val:${f.id}`,
        fieldId: f.id,
        label: splitUnit(f.name).base,
        values,
      },
      rank,
    })
  }

  const choices = ranked
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_VALUES_FACETS)
    .map((r) => r.facet)

  return [...choices, ...envelopes, ...bands]
}

/* ---------------------------------------------------------- */
/* Saying one                                                 */
/* ---------------------------------------------------------- */

/** A band in the dealer's own words: `$20,900–$40,000`, `4.5 m and
 *  up`, `up to 150`. Never "between 4.5 and undefined", which is what
 *  a template gets you when only one bound is set. */
export function bandWords(
  min: number | undefined,
  max: number | undefined,
  print: (n: number) => string,
): string {
  if (min !== undefined && max !== undefined) {
    return min === max ? print(min) : `${print(min)}–${print(max)}`
  }
  if (min !== undefined) return `${print(min)} and up`
  if (max !== undefined) return `up to ${print(max)}`
  return 'any'
}
