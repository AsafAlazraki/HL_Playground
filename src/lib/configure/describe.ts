/* ============================================================
   Configure — the plain-English note after a choice.

   "Settled prop material to Stainless steel, and ruled out Aluminium
    for blades, plus 2 more."

   This is the thing that makes a propagating engine feel helpful
   rather than spooky: the user clicks once, and the system says what
   it did on their behalf. The phrasing rules are deliberate:

     · lead with what SETTLED, then what was RULED OUT
     · at most two items per bucket, and at most two values per item
     · count the rest as "plus N more"
     · SAY NOTHING when there is nothing worth saying — silence is what
       keeps the note's authority

   See CONFIGURATOR_SPEC.md §4b and MOCKUP_FINDINGS.md §6.1.
   ============================================================ */

import type { CellValue, ConfigureState, FieldDef } from '@/types/model'
import { formatValue, valueKey } from './values'

const CAP = 2

/** Column names read as prose mid-sentence, so "Prop material" becomes
 *  "prop material" — but "Min HP" and "OA Length" keep their shape,
 *  because lower-casing an acronym reads as a typo. */
function softLower(name: string): string {
  const n = (name ?? '').trim()
  if (n === '') return 'this field'
  if (/[A-Z]/.test(n.slice(1))) return n
  return n.toLowerCase()
}

const joinAnd = (parts: string[]): string =>
  parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`

const cap1 = (s: string): string => (s === '' ? s : s.charAt(0).toUpperCase() + s.slice(1))

const domainOf = (state: ConfigureState | undefined, fieldId: string): CellValue[] | undefined => {
  const d = state?.domains
  if (!d || !Object.prototype.hasOwnProperty.call(d, fieldId)) return undefined
  const list = d[fieldId]
  return Array.isArray(list) ? list : undefined
}

/**
 * What changed between two solves, in one sentence a person can read.
 * Returns "" when there is nothing worth saying.
 *
 * `justChosenFieldId` is optional and names the column the user just
 * touched, so the note never reports back the choice they just made.
 * Omit it and every change is reported.
 */
export function describeChange(
  before: ConfigureState,
  after: ConfigureState,
  fields: FieldDef[],
  justChosenFieldId?: string,
): string {
  const settledPhrases: string[] = []
  const ruledPhrases: string[] = []

  try {
    const list = Array.isArray(fields) ? fields : []
    const seen = new Set<string>()

    for (const f of list) {
      if (!f || typeof f.id !== 'string' || f.id === '') continue
      if (seen.has(f.id)) continue
      seen.add(f.id)
      if (justChosenFieldId && f.id === justChosenFieldId) continue

      const was = domainOf(before, f.id)
      const now = domainOf(after, f.id)
      if (!was || !now) continue
      /* a wiped-out column is a conflict, and the conflict note says it
         far better than a cheerful summary would */
      if (now.length === 0) continue

      const keptKeys = new Set(now.map(valueKey))
      const gone = was.filter((v) => !keptKeys.has(valueKey(v)))
      if (gone.length === 0) continue

      const name = softLower(f.name)
      if (now.length === 1 && was.length > 1) {
        settledPhrases.push(`${name} to ${formatValue(now[0])}`)
      } else {
        const shown = gone.slice(0, CAP).map(formatValue)
        ruledPhrases.push(`${joinAnd(shown)} for ${name}`)
      }
    }
  } catch {
    return ''
  }

  const parts: string[] = []
  let extra = 0
  if (settledPhrases.length > 0) {
    parts.push(`settled ${joinAnd(settledPhrases.slice(0, CAP))}`)
    extra += Math.max(0, settledPhrases.length - CAP)
  }
  if (ruledPhrases.length > 0) {
    parts.push(`ruled out ${joinAnd(ruledPhrases.slice(0, CAP))}`)
    extra += Math.max(0, ruledPhrases.length - CAP)
  }
  if (parts.length === 0) return ''

  return `${cap1(parts.join(', and '))}${extra > 0 ? `, plus ${extra} more.` : '.'}`
}
