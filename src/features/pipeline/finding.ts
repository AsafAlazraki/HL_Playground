/* ============================================================
   FINDING THINGS ON THE BOARD — search, type, and order.

   All pure, all taking their inputs as arguments, all tested
   beside this file. A board that filters is a board that can lie
   about its own totals, so the one rule these keep is that a
   column's count and its sum are always computed from the SAME
   filtered list the column draws.
   ============================================================ */

import type { EntityDef, TableKind } from '@/types/model'
import { TABLE_KINDS } from '@/types/model'
import { quoteTotals, type QuoteDef } from '@/features/quote'

/* ------------------------------------------------------------
   WHAT SORT OF THING IS BEING SOLD
   ------------------------------------------------------------ */

/** A quote's type is its SUBJECT's table kind. `rootTableId` is the
 *  table the subject was configured from, so a Highfield quote is a
 *  boat and a Yamaha quote is a motor — read off the sheet rather
 *  than stored on the document, because the document freezes and
 *  the kind is a fact about the catalogue it came from. */
export function kindOfQuote(
  q: QuoteDef,
  entities: Record<string, EntityDef>,
): TableKind {
  const e = entities[q.rootTableId]
  return e && e.kind && e.kind in TABLE_KINDS ? e.kind : 'custom'
}

export interface TypeChip {
  key: TableKind | 'all'
  label: string
  count: number
  kind?: TableKind
}

/** The type filters worth drawing — the kinds actually present,
 *  never a taxonomy typed here. A kind nobody is quoting draws no
 *  chip, exactly as the modules grid's filters behave. */
export function typeChips(
  quotes: readonly QuoteDef[],
  entities: Record<string, EntityDef>,
): TypeChip[] {
  const seen = new Map<TableKind, number>()
  for (const q of quotes) {
    const k = kindOfQuote(q, entities)
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }
  const out: TypeChip[] = [{ key: 'all', label: 'All', count: quotes.length }]
  for (const kind of Object.keys(TABLE_KINDS) as TableKind[]) {
    const n = seen.get(kind)
    if (n === undefined) continue
    out.push({ key: kind, label: TABLE_KINDS[kind].label, count: n, kind })
  }
  return out
}

/* ------------------------------------------------------------
   SEARCH
   ------------------------------------------------------------ */

/** WORD BY WORD, over every word a person might remember: the
 *  reference, the customer, what is being sold, and who prepared
 *  it. Every word of the query must hit something — typing more
 *  narrows, which is the only behaviour a search box can have that
 *  never surprises anybody. */
export function matches(q: QuoteDef, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const hay = [q.reference, q.customer.name, q.subjectLabel, q.preparedBy ?? '']
    .join(' ')
    .toLowerCase()
  return words.every((w) => hay.includes(w))
}

/* ------------------------------------------------------------
   ORDER
   ------------------------------------------------------------ */

export type SortId = 'recent' | 'oldest' | 'biggest' | 'smallest' | 'customer'

export const SORTS: readonly { id: SortId; label: string }[] = [
  { id: 'recent', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'biggest', label: 'Biggest first' },
  { id: 'smallest', label: 'Smallest first' },
  { id: 'customer', label: 'Customer A–Z' },
]

export const sortLabel = (id: SortId): string =>
  SORTS.find((s) => s.id === id)?.label ?? SORTS[0].label

/** Sorted, and never in place — the caller's array is the store's.
 *
 *  A QUOTE WITH NO CUSTOMER SORTS LAST under Customer A–Z rather
 *  than first under an empty string: "not yet said" is not a name
 *  beginning with nothing, and a column that opens with six blanks
 *  is a column that looks broken. */
export function sortDeals(deals: readonly QuoteDef[], by: SortId): QuoteDef[] {
  const out = [...deals]
  switch (by) {
    case 'oldest':
      return out.sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : 1))
    case 'biggest':
      return out.sort((a, b) => quoteTotals(b).total - quoteTotals(a).total)
    case 'smallest':
      return out.sort((a, b) => quoteTotals(a).total - quoteTotals(b).total)
    case 'customer':
      return out.sort((a, b) => {
        const an = a.customer.name.trim()
        const bn = b.customer.name.trim()
        if (an === '' && bn === '') return 0
        if (an === '') return 1
        if (bn === '') return -1
        return an.localeCompare(bn)
      })
    default:
      return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  }
}
