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

const MONEY = /price|cost|cash|rrp|sell|trade|freight|deposit|fee|charge/i

const numberFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const moneyFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

/** A number as the drawing office sets it: grouped, no stray decimals. */
export function formatNumber(n: number, name = ''): string {
  if (!Number.isFinite(n)) return ''
  return MONEY.test(name) ? `$${moneyFmt.format(n)}` : numberFmt.format(n)
}

/** One cell, ready to print. `resolveRef` turns a link into its label. */
export function formatCell(
  field: FieldDef | undefined,
  value: CellValue,
  resolveRef?: (refEntityId: string | undefined, rowId: string) => string,
): string {
  if (value === null || value === undefined) return ''
  if (isImageValue(value)) return value.length === 0 ? '' : `${value.length}`
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return formatNumber(value, field?.name ?? '')
  const text = String(value).trim()
  if (text === '') return ''
  if (field?.type === 'reference' && resolveRef) return resolveRef(field.refEntityId, text)
  const asNum = Number(text)
  if (field?.type === 'number' && text !== '' && Number.isFinite(asNum)) {
    return formatNumber(asNum, field.name)
  }
  return text
}

/** `90–115` for an envelope, or a single bound when only one is filled. */
export function formatRange(min: CellValue, max: CellValue, name = ''): string {
  const a = typeof min === 'number' ? formatNumber(min, name) : ''
  const b = typeof max === 'number' ? formatNumber(max, name) : ''
  if (a !== '' && b !== '') return a === b ? a : `${a}–${b}`
  return a !== '' ? a : b
}
