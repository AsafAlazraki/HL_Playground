/* ============================================================
   COLUMN CONCEPTS — what a rule is allowed to talk about.

   ONE TABLE PER BRAND (CONFIGURATOR_SPEC §3-zero) means "Shaft
   Length" is not one column: it is seven columns, one on each boat
   brand's table, with seven different field ids. A rule written
   against `boat` has to bite on all of them.

   So the sentence never picks a FIELD. It picks a CONCEPT — the
   column named X on every table of kind K — and stores the id of
   one representative field, because `FieldPath.fieldId` is what the
   model gives us and we do not fork the model. Resolution back the
   other way (`conceptForFieldId`) maps EVERY member id to the
   concept, so a rule authored against Highfield's "Shaft Length"
   is evaluated against Stacer's too.

   Pure functions: no React, no store reads.
   ============================================================ */

import { TABLE_KINDS, isPairFieldId, readCell } from '@/types/model'
import type {
  CellValue,
  EntityDef,
  FieldDef,
  FieldType,
  RowData,
  TableKind,
} from '@/types/model'

/** The kinds, in the order the left panel draws them. */
const KIND_ORDER: TableKind[] = [
  'boat',
  'motor',
  'trailer',
  'accessory',
  'package',
  'dealer',
  'custom',
]

/** Column types a rule can honestly talk about. A calculated column is
 *  an outcome, not a choice; a link is a row id, not a word; images are
 *  not a value anyone states in a sentence. */
const RULEABLE: FieldType[] = ['text', 'number', 'boolean', 'date', 'select']

/** One column as the business means it, across every table that has it. */
export interface ColumnConcept {
  /** stable across reloads: kind + the normalised column name */
  key: string
  kind: TableKind
  /** the name as written on the first table that carries it */
  name: string
  type: FieldType
  /** every field id that IS this column — one per table */
  fieldIds: string[]
  /** the tables carrying it, aligned with `fieldIds` */
  tableIds: string[]
  /** union of the choice options across those tables */
  options: string[]
}

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ')

export const kindLabel = (kind: TableKind): string => TABLE_KINDS[kind].label

/** How a concept reads in a picker: "Shaft Length · 7 boat tables".
 *  The kind KEY is already singular, which the label ("Boats",
 *  "Accessories") is not — so the count reads as English. */
export function conceptOptionLabel(c: ColumnConcept): string {
  if (c.tableIds.length <= 1) return c.name
  return `${c.name} · ${c.tableIds.length} ${c.kind} tables`
}

/** Every column a rule could be written about, grouped by kind. */
export function buildConcepts(entities: Record<string, EntityDef>): ColumnConcept[] {
  const byKey = new Map<string, ColumnConcept>()

  const tables = Object.values(entities).sort((a, b) => {
    const ka = KIND_ORDER.indexOf(a.kind ?? 'custom')
    const kb = KIND_ORDER.indexOf(b.kind ?? 'custom')
    if (ka !== kb) return ka - kb
    return a.name.localeCompare(b.name)
  })

  for (const table of tables) {
    const kind = table.kind ?? 'custom'
    for (const field of table.fields) {
      if (isPairFieldId(field.id)) continue
      if (!RULEABLE.includes(field.type)) continue
      const key = `${kind}::${norm(field.name)}`
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, {
          key,
          kind,
          name: field.name.trim(),
          type: field.type,
          fieldIds: [field.id],
          tableIds: [table.id],
          options: [...(field.options ?? [])],
        })
        continue
      }
      existing.fieldIds.push(field.id)
      existing.tableIds.push(table.id)
      for (const o of field.options ?? []) {
        if (!existing.options.includes(o)) existing.options.push(o)
      }
    }
  }

  return [...byKey.values()]
}

/** Index of member field id -> concept. Built once per concept list. */
export function conceptIndex(concepts: ColumnConcept[]): Map<string, ColumnConcept> {
  const index = new Map<string, ColumnConcept>()
  for (const c of concepts) {
    for (const id of c.fieldIds) index.set(id, c)
  }
  return index
}

export function conceptByKey(
  concepts: ColumnConcept[],
  key: string | undefined,
): ColumnConcept | undefined {
  if (!key) return undefined
  return concepts.find((c) => c.key === key)
}

/** The field id a new clause should store for this concept. */
export const representativeFieldId = (c: ColumnConcept): string => c.fieldIds[0]

/** THE COLUMN NOBODY HAS PICKED YET. A clause has to name a field id,
 *  so an unanswered "which column?" is stored as the empty one — never
 *  as the first column of the first table, which is what made the new
 *  rule read like a rule somebody had written. It is deliberately NOT a
 *  missing column: `a column that is gone` is a different sentence, and
 *  a person who has chosen nothing has lost nothing. */
export const UNSET_FIELD = ''

export const isUnsetField = (fieldId: string): boolean => fieldId === UNSET_FIELD

/** The field on THIS table that is this concept, if it has one. */
export function fieldOn(
  concept: ColumnConcept,
  table: EntityDef,
): FieldDef | undefined {
  return table.fields.find((f) => concept.fieldIds.includes(f.id))
}

/* ---------------------------------------------------------- */
/* What a value token may offer                               */
/* ---------------------------------------------------------- */

/** Instruction from the column to the sentence: which control the
 *  right-hand side gets. A number takes a typed input, never a list of
 *  every number anyone has ever entered. */
export type ValueControl = 'choice' | 'boolean' | 'number' | 'date' | 'text'

export interface ValueDomain {
  control: ValueControl
  /** a choice's options; for text, observed values offered as suggestions */
  options: string[]
}

/** Never walk more than this many rows to collect suggestions — a brand
 *  catalogue is 640 variants and there are several of them. */
const SCAN_CAP = 4000

function observedValues(
  concept: ColumnConcept,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
  limit: number,
): string[] {
  const seen: string[] = []
  let scanned = 0
  for (const tableId of concept.tableIds) {
    const table = entities[tableId]
    if (!table) continue
    const field = fieldOn(concept, table)
    if (!field) continue
    for (const row of rowsByEntity[tableId] ?? []) {
      if (scanned++ > SCAN_CAP || seen.length >= limit) return seen
      const v = readCell(row, field.id)
      if (v === null || v === undefined || v === '' || Array.isArray(v)) continue
      const text = String(v)
      if (!seen.includes(text)) seen.push(text)
    }
  }
  return seen
}

export function domainFor(
  concept: ColumnConcept,
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): ValueDomain {
  switch (concept.type) {
    case 'boolean':
      return { control: 'boolean', options: [] }
    case 'number':
      return { control: 'number', options: [] }
    case 'date':
      return { control: 'date', options: [] }
    case 'select': {
      const options = concept.options.length
        ? concept.options
        : observedValues(concept, entities, rowsByEntity, 40)
      return { control: 'choice', options }
    }
    default:
      return {
        control: 'text',
        options: observedValues(concept, entities, rowsByEntity, 30),
      }
  }
}

/** The value a freshly retargeted clause holds: NOTHING.
 *
 *  THIS USED TO RETURN THE FIRST VALUE TO HAND — `true` for a boolean,
 *  `options[0]` for a list, `0` for a number — and that is how the rules
 *  pane came to greet a person with "When Discontinued is yes, Wheel
 *  Size in must be 0" and an ADD RULE button already live. Nobody wrote
 *  that rule; the app composed it out of whichever column happened to
 *  sort first and invited a press. A business fact this dealership never
 *  stated is the one thing the owner is angriest about, and a default
 *  that reads like an answer is how it gets stated.
 *
 *  So an unchosen value is `null`, `valueWords` draws it as `…`, and
 *  every gate that asks whether a rule is finished can see that it is
 *  not. Anything that needs a real value must get it from a person. */
export const UNSET_VALUE: CellValue = null

/** True when a clause's right-hand side has never been filled in. */
export const isUnsetValue = (v: CellValue): boolean =>
  v === null || v === undefined || v === ''
