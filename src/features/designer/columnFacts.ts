/* ============================================================
   WHAT IS ACTUALLY IN THIS COLUMN — and what survives a retype.

   The column setup is where a column's TYPE is changed, and the
   change wipes every cell in it. Until now the screen showed a name,
   a type tag and a band chip: the single most destructive decision in
   an app with no undo was made without one value of the data in
   sight. The case that names the failure is real — a column of
   people-capacities looked like numbers and was typed as text, and
   the reason was one cell reading "3 + 1". Nothing on that screen
   could have told anyone.

   So this module answers two questions, from the rows themselves:

     columnFacts   how many cells hold a value, how many distinct
                   values there are, and what the first few of them
                   actually say
     retypePlan    of those values, how many survive the new type as
                   the same fact, and how many can only be cleared

   NOTHING HERE INVENTS A VALUE. Every string that reaches the screen
   through `samples` is a value read out of the user's own rows.

   CONVERSION IS DELIBERATELY LITERAL. `"12,500"` does not become
   12500 and `"$400"` does not become 400: guessing that a comma is a
   thousands separator rather than a decimal point, or that a currency
   mark can be dropped, is the app deciding what a business's data
   means. A value either already IS the new type, written plainly, or
   it is reported as one that cannot cross. The counts are then true,
   and the person choosing can see exactly what they are trading.

   Pure TypeScript: no React, no store, no DOM.
   ============================================================ */

import { isImageValue, type CellValue, type FieldDef, type FieldType, type RowData } from '@/types/model'

/** A cell counts as filled when it holds something a person put there. */
export function isFilled(v: CellValue | undefined): boolean {
  if (v === null || v === undefined || v === '') return false
  if (isImageValue(v)) return v.length > 0
  return true
}

/** One cell as a person reads it — never a guess, never a placeholder. */
export function cellText(v: CellValue): string {
  if (v === null || v === undefined) return ''
  if (isImageValue(v)) return v.length === 1 ? '1 picture' : `${v.length} pictures`
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

export interface ColumnFacts {
  /** rows on the table */
  rows: number
  /** rows whose cell in this column holds a value */
  filled: number
  /** distinct filled values, compared as written */
  distinct: number
  /** the first few distinct values, in the order the rows carry them */
  samples: string[]
}

/**
 * Read the column out of the rows. `limit` caps only what is shown;
 * `distinct` always counts them all, because "5 distinct values" and
 * "here are 4 of them" is the pair that tells you whether you have
 * seen the whole column.
 */
export function columnFacts(
  rows: readonly RowData[] | undefined,
  fieldId: string,
  limit = 4,
): ColumnFacts {
  const list = rows ?? []
  const seen = new Set<string>()
  const samples: string[] = []
  let filled = 0

  for (const r of list) {
    const v = r.values[fieldId]
    if (!isFilled(v)) continue
    filled += 1
    const text = cellText(v as CellValue)
    if (seen.has(text)) continue
    seen.add(text)
    if (samples.length < limit) samples.push(text)
  }

  return { rows: list.length, filled, distinct: seen.size, samples }
}

/**
 * The counts as a sentence, said the same way everywhere they are
 * said. `33 of 40 rows hold a value · 5 distinct` — and for an empty
 * column, one clause instead of two, because "0 distinct" is a fact
 * about nothing that reads as a second finding.
 */
export function factLines(facts: ColumnFacts): string[] {
  const rows = facts.rows === 1 ? '1 row' : `${facts.rows} rows`
  if (facts.filled === 0) return [`empty in all ${rows}`]
  return [
    `${facts.filled} of ${rows} hold a value`,
    facts.distinct === 1 ? '1 distinct value' : `${facts.distinct} distinct values`,
  ]
}

/* ---------------------------------------------------------- */
/* Retyping                                                   */
/* ---------------------------------------------------------- */

/** ISO calendar day, the only date shape `CellValue` stores. */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * The same fact, written as the new type — or `undefined` when there
 * is no honest way to carry it across.
 *
 * Read the refusals as the point of the function: text that is not
 * plainly a number does not become one, and nothing at all becomes a
 * formula, a picture or a link, because those hold a source, an
 * address and a row id respectively — none of which a value in
 * another column can supply.
 */
export function convertCell(v: CellValue, to: FieldType): CellValue | undefined {
  if (!isFilled(v)) return undefined
  if (isImageValue(v)) return undefined

  switch (to) {
    case 'text':
      return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)
    case 'number': {
      if (typeof v === 'number') return v
      if (typeof v !== 'string') return undefined
      const t = v.trim()
      /* Number('') is 0 and Number(' ') is 0 — a blank must not
         become a zero somebody later reads as a price. */
      if (t === '') return undefined
      const n = Number(t)
      return Number.isFinite(n) ? n : undefined
    }
    case 'boolean':
      if (typeof v === 'boolean') return v
      return undefined
    case 'date':
      if (typeof v === 'string' && ISO_DAY.test(v.trim())) return v.trim()
      return undefined
    case 'select':
      /* the new list starts empty, so every value would be a choice
         the list refuses — see the note in SelectOptionsEditor */
      return undefined
    default:
      /* formula, reference, image */
      return undefined
  }
}

export interface RetypePlan {
  /** cells holding a value today */
  filled: number
  /** of those, the ones that cross as the same fact */
  carried: Array<{ rowId: string; value: CellValue }>
  /** of those, the ones that can only be cleared — first few, as written */
  lostSamples: string[]
  /** how many can only be cleared */
  lost: number
}

/**
 * What a retype would do to every cell, worked out before anything is
 * written, so the sentence a person is asked to agree to is the
 * sentence that comes true.
 */
export function retypePlan(
  rows: readonly RowData[] | undefined,
  field: FieldDef,
  to: FieldType,
  sampleLimit = 3,
): RetypePlan {
  const carried: Array<{ rowId: string; value: CellValue }> = []
  const lostSamples: string[] = []
  let filled = 0
  let lost = 0

  for (const r of rows ?? []) {
    const v = r.values[field.id]
    if (!isFilled(v)) continue
    filled += 1
    const next = convertCell(v as CellValue, to)
    if (next === undefined) {
      lost += 1
      const text = cellText(v as CellValue)
      if (lostSamples.length < sampleLimit && !lostSamples.includes(text)) {
        lostSamples.push(text)
      }
    } else {
      carried.push({ rowId: r.id, value: next })
    }
  }

  return { filled, carried, lostSamples, lost }
}

/* ---------------------------------------------------------- */
/* Naming a fresh column                                      */
/* ---------------------------------------------------------- */

/**
 * A name for a column nobody has named yet.
 *
 * `addField` in the store falls back to `Field N`, which is the one
 * word this whole surface exists not to say — the header comment on
 * `EntityDesigner` promises table and column, never entity, schema or
 * field, and then the first thing the Add button handed back was a
 * field. Counting past what is taken (rather than off the column
 * count) means deleting column 3 and adding another does not offer a
 * name a sibling already holds, which the name guard would refuse.
 */
export function draftColumnName(taken: readonly string[]): string {
  const used = new Set(taken.map((n) => n.trim().toLowerCase()))
  for (let n = taken.length + 1; ; n += 1) {
    const candidate = `Column ${n}`
    if (!used.has(candidate.toLowerCase())) return candidate
  }
}
