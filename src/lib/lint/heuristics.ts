/* ============================================================
   Lint engine — shared naming heuristics.
   Pure helpers; every whitelist/regex/threshold here mirrors
   REVIEW_SPEC.md exactly. Where the spec leaves latitude
   (singularization) we stay conservative: no guess → no fix.
   ============================================================ */

import { FIELD_TYPES } from '@/types/model'

/** Stable finding id, exactly the spec formula. */
export const findingId = (ruleId: string, entityId: string, fieldIds?: string[]): string =>
  `${ruleId}:${entityId}:${fieldIds?.join(',') ?? ''}`

/** Trimmed, case-insensitive key — used where the spec says "trimmed case-insensitive". */
export const dupKey = (s: string): string => s.trim().toLowerCase()

/**
 * Loose name identity for matching heuristics: lowercased words joined by
 * single spaces ('Customer_ID' → 'customer id'). NOT used for dup detection.
 */
export const nameKey = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .join(' ')

/** Words of a name, split on whitespace / underscore / hyphen. */
export const wordsOf = (s: string): string[] => s.trim().split(/[\s_-]+/).filter(Boolean)

/* ---------------------------------------------------------- */
/* entity-plural                                              */
/* ---------------------------------------------------------- */

/** Spec whitelist: singular words that merely end in 's'. */
const PLURAL_WHITELIST = new Set([
  'status',
  'analysis',
  'address',
  'class',
  'process',
  'access',
  'news',
])

/**
 * Endings where a naive strip-the-s produces a wrong word
 * ('Companies' → 'Companie'). We still flag, but offer no fix —
 * a missing fix beats a wrong one.
 */
const UNSAFE_SINGULARIZE = /(ies|xes|ches|shes|zes|oes)$/

export interface PluralInfo {
  isPlural: boolean
  /** present only when the singular form is a safe, confident guess */
  singular?: string
}

/**
 * Naive s-heuristic over the LAST word of the name, per spec:
 * whitelist + 'ss'/'us'/'is' endings are never plural. As a bonus,
 * stripping 'es' that lands ON a whitelist word ('Statuses' → 'Status',
 * 'Classes' → 'Class') is treated as safe.
 */
export function pluralInfo(name: string): PluralInfo {
  const trimmed = name.trim()
  if (!trimmed) return { isPlural: false }
  const parts = trimmed.split(/\s+/)
  const last = parts[parts.length - 1]
  const lower = last.toLowerCase()
  if (PLURAL_WHITELIST.has(lower)) return { isPlural: false }
  if (/(ss|us|is)$/.test(lower)) return { isPlural: false }
  if (last.length < 2 || !lower.endsWith('s')) return { isPlural: false }
  const stem = trimmed.slice(0, trimmed.length - last.length)
  if (lower.endsWith('es') && PLURAL_WHITELIST.has(lower.slice(0, -2))) {
    return { isPlural: true, singular: stem + last.slice(0, -2) }
  }
  if (UNSAFE_SINGULARIZE.test(lower)) return { isPlural: true }
  return { isPlural: true, singular: stem + last.slice(0, -1) }
}

/* ---------------------------------------------------------- */
/* entity-vague                                               */
/* ---------------------------------------------------------- */

export const VAGUE_NAMES = new Set([
  'data',
  'info',
  'details',
  'misc',
  'stuff',
  'record',
  'records',
  'table',
  'object',
  'item',
  'items',
  'entity',
  'thing',
  'things',
  'new entity',
])

export const isVagueName = (name: string): boolean => {
  const key = name.trim().toLowerCase().replace(/\s+/g, ' ')
  return VAGUE_NAMES.has(key) || /^entity \d+$/.test(key)
}

/* ---------------------------------------------------------- */
/* prefix-cluster                                             */
/* ---------------------------------------------------------- */

/** Every word appearing in FIELD_TYPES keys or labels — never a cluster prefix. */
export const TYPE_WORDS: ReadonlySet<string> = (() => {
  const s = new Set<string>()
  for (const [key, meta] of Object.entries(FIELD_TYPES)) {
    s.add(key.toLowerCase())
    for (const w of meta.label.toLowerCase().split(/[^a-z]+/)) if (w) s.add(w)
  }
  return s
})()

/* ---------------------------------------------------------- */
/* derived-column                                             */
/* ---------------------------------------------------------- */

/** Computation-flavored names, matched exact or as the trailing word(s). */
export const COMPUTED_NAMES = [
  'total',
  'subtotal',
  'sum',
  'net',
  'gross',
  'margin',
  'profit',
  'balance',
  'amount',
  'amount due',
  'grand total',
  'line total',
  'average',
  'avg',
  'tax',
]

export const isComputedName = (name: string): boolean => {
  const key = nameKey(name)
  if (!key) return false
  return COMPUTED_NAMES.some((c) => key === c || key.endsWith(` ${c}`))
}

export const PRICE_WORDS = new Set(['price', 'rate', 'cost', 'amount'])
export const QTY_WORDS = new Set(['qty', 'quantity', 'hours', 'units', 'count'])
