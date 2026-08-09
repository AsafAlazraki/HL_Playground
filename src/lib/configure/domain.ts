/* ============================================================
   Configure — domains: what a field can still be.

   A domain is a FINITE list of surviving values. That finiteness is
   what makes the whole solver possible, so it is worth being exact
   about where it comes from:

     Choice column  -> its options
     Yes/No column  -> [true, false]
     everything else (number, text, date, link, calculated, images)
                    -> UNCONSTRAINED. There is no list to enumerate, so
                       the solver never invents one. Such a field carries
                       an EMPTY value list, which reads as "unknown", and
                       is only ever narrowed to the single value the user
                       chose.

   The solver only ever REMOVES. It never adds a value to a domain and
   never guesses one, which is why it always terminates and why a
   number column can be tested but never enumerated.
   ============================================================ */

import type { CellValue, FieldDef } from '@/types/model'
import { valueKey } from './values'

/** The values a field can take before any rule has run — `undefined`
 *  when the column has no enumerable list at all.
 *
 *  Exported because the UI needs the FULL list to draw the options a
 *  blocked value still occupies: "n of m left" needs the m. */
export function optionsOf(field: FieldDef | undefined): CellValue[] | undefined {
  if (!field) return undefined
  if (field.type === 'boolean') return [true, false]
  if (field.type === 'select') {
    const raw = Array.isArray(field.options) ? field.options : []
    const seen = new Set<string>()
    const out: CellValue[] = []
    for (const o of raw) {
      if (o === null || o === undefined) continue
      const k = valueKey(o)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(o)
    }
    return out
  }
  return undefined
}

/** Can this column be offered as a list of choices at all? */
export const isEnumerable = (field: FieldDef | undefined): boolean =>
  optionsOf(field) !== undefined

/** One field's live state during a solve. */
export interface FieldDomain {
  field: FieldDef
  /** true when the column has no enumerable list (number, text, …) */
  open: boolean
  /** the values still possible. EMPTY means "not known" — either an
   *  open column nobody has chosen, or a domain a rule emptied. Read
   *  `broken` to tell those apart. */
  values: CellValue[]
  /** keys of `values`, kept in step, for O(1) membership */
  keys: Set<string>
  /** the person chose this — it is not something the solver worked out */
  fixed: boolean
  /** a rule emptied this domain. The field is then frozen: clauses on
   *  it read as unknown and nothing prunes it again, so ONE genuine
   *  contradiction cannot cascade into ten invented ones. */
  broken: boolean
}

export function makeDomain(field: FieldDef, chosen: CellValue | undefined): FieldDomain {
  const options = optionsOf(field)
  const open = options === undefined
  let values: CellValue[] = options ? options.slice() : []

  /* An explicit choice is authoritative — it narrows the column to
     exactly itself, whether or not the option list still contains it
     (options get edited under live configurations). `null` clears. */
  const fixed = chosen !== undefined && chosen !== null
  if (fixed) values = [chosen as CellValue]

  return {
    field,
    open,
    values,
    keys: new Set(values.map(valueKey)),
    fixed,
    broken: false,
  }
}

/** True when there is nothing useful to say about this field yet. */
export const isUnknown = (d: FieldDomain | undefined): boolean =>
  !d || d.values.length === 0
