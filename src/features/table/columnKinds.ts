/* ============================================================
   What a column can HOLD, in the words a boat dealer would use.

   The model's own `FIELD_TYPES` labels are for the schema designer;
   these are for the person filling in a catalogue. The words
   "field", "reference", "schema" and "entity" appear nowhere.
   ============================================================ */
import type { FieldType } from '@/types/model'

export interface ColumnKind {
  type: FieldType
  label: string
  /** one line, plain English, shown beside the choice */
  hint: string
}

/** Order matters: the two a user reaches for ninety per cent of the
 *  time come first, and the three that ask a follow-up question
 *  come last. */
export const COLUMN_KINDS: readonly ColumnKind[] = [
  { type: 'text', label: 'Text', hint: 'Names, codes, notes.' },
  { type: 'number', label: 'Number', hint: 'Lengths, weights, prices.' },
  { type: 'boolean', label: 'Yes / No', hint: 'A tick, or nothing.' },
  { type: 'date', label: 'Date', hint: 'A day on the calendar.' },
  { type: 'select', label: 'Choice', hint: 'One from a short list you write.' },
  { type: 'reference', label: 'Link', hint: 'Points at a row in another table.' },
  { type: 'formula', label: 'Calculated', hint: 'Worked out from other columns.' },
  { type: 'image', label: 'Pictures', hint: 'Photos — the first one is the one that shows.' },
]

export const columnKindOf = (type: FieldType): ColumnKind =>
  COLUMN_KINDS.find((k) => k.type === type) ?? COLUMN_KINDS[0]

/** What a new column is called before the user names it. */
export const untitledColumnName = (taken: readonly string[]): string => {
  const used = new Set(taken.map((n) => n.trim().toLowerCase()))
  for (let i = 1; i < 999; i += 1) {
    const name = i === 1 ? 'New column' : `New column ${i}`
    if (!used.has(name.toLowerCase())) return name
  }
  return 'New column'
}
