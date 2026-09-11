/* ============================================================
   io/tableCsv — ONE REGISTER, OUT TO EXCEL AND BACK.

   THE INSTRUCTION, verbatim (docs/specs/ACTION_BAR.md §4):
   "remember, people will export. And than reupload."

   THE TRIP THIS IS FOR, and why it is not the envelope. The envelope
   (`envelope.ts`) is the BACKUP trip: everything, by id, JSON,
   restored by replacing the sheet. It is complete and it is correct
   and no dealer will ever open it in Excel — nothing does, because
   JSON is not a spreadsheet. The trip a person actually takes is
   smaller and much more dangerous: they open ONE register, send it
   to whoever keeps the price list, get a workbook back with 40 cells
   changed somewhere in it, and put it back into a live system.

   SO THE WHOLE POINT OF THIS FILE IS THE SENTENCE BEFORE THE MERGE.
   `planTableUpload` NEVER writes. It reads a file against the table
   and answers, in counts a person can check: how many lines matched
   a row that is here, how many are new, exactly which cells would
   change and from what to what, what it will not do and why. Only
   `applyTableUpload` writes, and it writes only what the plan named.
   The plan is the product; the apply is a loop over it.

   FOUR THINGS IT WILL NOT DO, EACH FOR A REASON THAT IS WRITTEN DOWN
   SOMEWHERE ELSE IN THIS APP:

   1 · IT NEVER DELETES A ROW. A row on this table with no line in
       the file is LEFT ALONE and counted. A price file that came
       back short one sheet must not strike sixty rows an old quote
       was written against — @/features/views/sellable states the
       rule ("the data stays") and this is the door it is most likely
       to be broken through, because "the file is the truth" is such
       a natural thing to assume about an upload.

   2 · IT NEVER RESURRECTS A DISCONTINUED ROW. `isDiscontinued` is a
       normal boolean column and a dealer may absolutely clear it —
       BY TYPING IN THE CELL, which is what @/types/model says. A
       file flipping thirty of them back to live in one press is not
       that act; it is the same act thirty times with nobody looking.
       So true → false is refused, named and counted; false → true
       (retiring something) goes through, because that direction only
       ever withdraws stock from a customer.

   3 · IT NEVER ADDS OR REMOVES A COLUMN. A `.csv` carries no type,
       no section, no description and no source citation, so a header
       this table does not have cannot become a column without the
       app inventing everything about it. Unknown headers are named
       and ignored; columns missing from the file are named and left
       untouched. STRUCTURE TRAVELS IN THE ENVELOPE. Rows travel here.

   4 · IT NEVER WRITES A CALCULATED OR A PICTURE COLUMN. Both are
       exported, because a person reading the file in Excel needs to
       see the total and needs to know a row has photographs; neither
       is read back, because a calculated column is derived and a
       picture is a file rather than a word. Both are said out loud in
       the plan rather than silently dropped — rule 10.

   HOW A LINE FINDS ITS ROW. The first column of the file is the row's
   own key, which is `UID_FIELD` — the identity every reference column
   already holds and every export already writes. It is headed `Row
   key` and not `UID`, because DESIGN_PRINCIPLES §6 names UID among
   the jargon this app refuses to print at a person, and this header
   is read by a person in Excel.

   A blank key is a NEW ROW: that is how somebody adds stock in the
   spreadsheet, and it is the only way to, deliberately, because a
   key typed by hand is a key from somewhere else.

   A file with NO key column at all is not refused — it is what a
   person gets when they build the sheet themselves from a supplier's
   list — and it falls back to matching on the table's own display
   column, exactly, case-insensitively. Two rows sharing that name is
   the one case where the fallback cannot answer, so those lines are
   refused BY NAME rather than guessed at.
   ============================================================ */

import {
  DISCONTINUED_FIELD_ID,
  UID_FIELD_ID,
  displayFieldOf,
  isDiscontinued,
  isRetired,
  rowLabel,
} from '@/types/model'
import type { CellValue, EntityDef, FieldDef, RowData } from '@/types/model'
import { cellToText, coerceCellText } from '@/features/table/core'
import { csvFileName, fromCsvFile, toCsvFile } from './csv'

/* ------------------------------------------------------------ */
/* the key column                                                */
/* ------------------------------------------------------------ */

/** What the identity column is called in the file. */
export const ROW_KEY_HEADER = 'Row key'

/** Headers accepted as the identity column on the way back in. `UID`
 *  is here because it is the model's own name for the same column and
 *  a file produced by any other path in this app would use it. */
const ROW_KEY_ALIASES = new Set([ROW_KEY_HEADER.toLowerCase(), 'uid', UID_FIELD_ID])

const norm = (s: string): string => s.trim().toLowerCase()

/** Empty is empty, whichever way it is spelled. A cell exported as ''
 *  comes back as null, and reporting that as a change would put every
 *  blank cell on the table into the preflight. */
const isBlank = (v: CellValue): boolean => v === null || v === undefined || v === ''

function sameCellValue(a: CellValue, b: CellValue): boolean {
  if (isBlank(a) && isBlank(b)) return true
  return Object.is(a, b)
}

/**
 * WHAT "UNCHANGED" MEANS ON A ROUND TRIP, and why comparing the values
 * is not enough.
 *
 * MEASURED, on the real seed through real Excel: exporting Highfield
 * Inflatables and re-uploading it WITHOUT OPENING IT reported 523 of
 * 588 rows overwritten. Nothing had been edited. `Landed Hull Cost`
 * holds 1671.4285714285713, the file carries what the register prints
 * — `1671.4286`, because `formatNumber` rounds for a person to read —
 * and 1671.4286 is not 1671.4285714285713, so every one of them looked
 * like an edit. A preflight that cries merge over an untouched file is
 * a preflight nobody reads, and worse, PRESSING IT would have written
 * the rounded figure over the exact one on 523 rows: a round trip that
 * silently loses precision by doing nothing at all.
 *
 * So the first question is asked in TEXT, not in values: the person
 * was handed a word, and if they handed the same word back they
 * changed nothing. It cannot mask a real edit — a real edit changes
 * the word — and it is right for every column type at once rather than
 * needing a tolerance per type.
 *
 * The value comparison stays as the second gate, because Excel is
 * entitled to give a number back in a different spelling: `0.10`
 * returns as `0.1`, which is the same number and no edit at all.
 */
const sameAsExported = (fileText: string, exportedText: string): boolean =>
  fileText === exportedText

/** A column whose value is derived or is a file — exported so the
 *  person can read it, never written back. See reason 4 above. */
const isReadOnlyColumn = (f: FieldDef): boolean => f.type === 'formula' || f.type === 'image'

/* ------------------------------------------------------------ */
/* out — the file                                                */
/* ------------------------------------------------------------ */

export interface TableCsvSource {
  entity: EntityDef
  rows: RowData[]
  /** formula results for one row, when the caller has an engine. The
   *  register does (`useTableData.computedFor`); a test need not. */
  computedFor?: (row: RowData) => Record<string, CellValue>
  /** a link column's row labels, so the file says "Yamaha F70" rather
   *  than the target row's key */
  refLabelOf?: (f: FieldDef) => ((rowId: string) => string | undefined) | undefined
}

export interface TableCsvFile {
  fileName: string
  text: string
  rows: number
  /** including the key column */
  columns: number
  /** columns written for reading only — named on the export note */
  readOnlyColumns: string[]
}

/** One register as the text of a `.csv` file. Every column the table
 *  has, in the table's own order, behind the key column. */
export function buildTableCsv(src: TableCsvSource, stamp = new Date()): TableCsvFile {
  const { entity, rows, computedFor, refLabelOf } = src
  const fields = entity.fields

  const header = [ROW_KEY_HEADER, ...fields.map((f) => f.name)]
  const cells: string[][] = [header]

  for (const row of rows) {
    const computed = computedFor ? computedFor(row) : row.values
    const line = [row.id]
    for (const f of fields) {
      const value = f.type === 'formula' ? (computed[f.id] ?? null) : (row.values[f.id] ?? null)
      line.push(cellToText(value, f, refLabelOf?.(f)))
    }
    cells.push(line)
  }

  return {
    fileName: csvFileName(entity.name, stamp),
    text: toCsvFile(cells),
    rows: rows.length,
    columns: header.length,
    readOnlyColumns: fields.filter(isReadOnlyColumn).map((f) => f.name),
  }
}

/* ------------------------------------------------------------ */
/* back — the plan                                               */
/* ------------------------------------------------------------ */

/** One cell that would change, in the words the preflight prints. */
export interface CellChange {
  rowId: string
  rowLabel: string
  fieldId: string
  columnName: string
  /** display text, so the sentence reads as the register does */
  from: string
  to: string
  value: CellValue
}

/** A row the file has and the table does not. */
export interface NewRow {
  label: string
  values: Record<string, CellValue>
}

/** Something the upload will NOT do, said where it happens. Rule 10. */
export interface UploadRefusal {
  id: string
  /** the whole sentence, counts included */
  say: string
}

export interface TableUploadPlan {
  tableId: string
  tableName: string
  fileName: string

  /** false when nothing at all can be read; `blocked` says why */
  ok: boolean
  blocked?: string

  /** how the lines were matched to rows */
  matchedOn: 'key' | 'name'

  fileRows: number
  fileColumns: number

  /** columns in the file that name a column on this table */
  columnsMatched: string[]
  /** in the file, not on this table — ignored */
  columnsUnknown: string[]
  /** a name two columns answer to, on this table or in the file. Not
   *  written, either side, because the name does not say which one. */
  columnsAmbiguous: string[]
  /** read for context, never written — calculated and picture columns */
  columnsReadOnly: string[]
  /** on this table, absent from the file — every row keeps what it has */
  columnsMissing: string[]

  /** file lines that found a row here */
  matched: number
  /** of those, how many carry at least one cell that would change */
  overwritten: number
  /** file lines that will become new rows */
  added: number
  /** rows on this table with no line in the file. NEVER DELETED. */
  untouched: number

  changes: CellChange[]
  newRows: NewRow[]
  refusals: UploadRefusal[]
  /** calculated cells where the file and this app disagree by more
   *  than `VERIFY_TOLERANCE`. Never written — a disagreement is a
   *  fact about the file's source, not an edit. */
  verified: VerifyMiss[]
}

export interface TableUploadInput {
  entity: EntityDef
  rows: RowData[]
  text: string
  fileName: string
  /** a link column's accepted words: lowercased label -> target row id.
   *  Without it, link columns cannot be read and say so. */
  refRowLabels?: (f: FieldDef) => Map<string, string> | undefined
  /** the same columns the other way, so the preflight prints
   *  "Yamaha F70 → Yamaha F90" and never two row keys */
  refLabelOf?: (f: FieldDef) => ((rowId: string) => string | undefined) | undefined
  /** THE APP'S OWN ANSWER FOR A CALCULATED COLUMN — the same
   *  `computedFor` `buildTableCsv` writes the file with. Handed over,
   *  the merge GRADES the file's calculated columns against it
   *  (CONFIG_FINDINGS adopt 8); withheld, it says nothing about them,
   *  because a verification made without the resolver would be a
   *  comparison against a blank. */
  computedFor?: (row: RowData) => Record<string, CellValue>
}

/** One calculated cell where the file and this app disagree.
 *
 *  NOT A CHANGE AND NEVER WRITTEN. Reason 4 stands: a calculated
 *  column is derived, so a file cannot set it. What it CAN do is
 *  disagree with it, and a disagreement is a fact about the file's
 *  source worth saying out loud — "an importer that grades its own
 *  homework". */
export interface VerifyMiss {
  rowId: string
  rowLabel: string
  columnName: string
  /** what the file says, as the file wrote it */
  theirs: string
  /** what this app works out, in the column's own words */
  ours: string
  /** `theirs - ours` where both are numbers, else null */
  delta: number | null
}

/** HOW FAR APART TWO NUMBERS MAY BE AND STILL AGREE. CONFIG_FINDINGS
 *  adopt 8 says "flag deviations over $1", and that is the right
 *  order: a landed cost re-derived through freight, duty and rebate
 *  lands cents away from the workbook's own rounding, and reporting
 *  that would bury the one row that is out by four hundred dollars. */
export const VERIFY_TOLERANCE = 1

const plural = (n: number, one: string, many: string): string =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`

/* ============================================================
   THE ENGINE BOTH DOORS TURN.

   Two things arrive at a register from outside. A FILE, read back
   after a trip through Excel — that is `planTableUpload` below. And
   a BLOCK, pasted straight off the clipboard, which is
   `./pasteBlock` and UX_PASS §3's front door to the product.

   THEY DIFFER IN EXACTLY ONE THING: how a column of the incoming
   data finds a column on this table. A file answers it BY NAME,
   because a heading is all a `.csv` carries. A paste answers it BY
   ASKING — the MAP step puts every incoming column beside where it
   will go and a person says matched, new column, or skip. That
   question is settled before this function runs.

   EVERYTHING AFTER IT IS ONE SET OF RULES AND HAS TO STAY ONE SET
   OF RULES. The four guarantees at the head of this file — never
   delete a row, never resurrect a discontinued one, never write a
   calculated or a picture column, say every cell that would change
   with the old value beside the new one — are the reason a dealer
   can let a file near their price list. A second copy of them for
   the paste door would be a second place to forget one, and the
   forgetting would be silent.

   So the paste door builds `writable` from what the person chose
   rather than from a heading, and turns this same engine.
   ============================================================ */

/** The nouns a plan's sentences are written with. A file has
 *  headings and lines; a pasted block has columns and rows — and a
 *  person who never opened a file must not be told about one. */
export interface MergeWords {
  /** mid-sentence, naming where the data came from: `that file` */
  it: string
  /** what one of its columns is called: `heading` */
  head: string
  /** what one of its rows is called: `line` */
  line: string
}

/** The words the file door has always used, unchanged. */
export const FILE_WORDS: MergeWords = { it: 'that file', head: 'heading', line: 'line' }

/** What was found about the columns before a single line was read.
 *  Reported on the plan, and most of these earn a sentence. */
export interface PlanColumns {
  matched: string[]
  unknown: string[]
  ambiguous: string[]
  readOnly: string[]
  missing: string[]
}

/**
 * HOW A LINE FINDS ITS ROW, settled by the caller.
 *
 * `key` is the row's own identity and cannot be ambiguous. `name` is
 * the display column, matched exactly and case-insensitively, which
 * is what a sheet somebody built themselves out of a supplier's list
 * has to be matched on — and which two rows can share, so the
 * ambiguity is refused by name rather than guessed at.
 */
export type MergeIdentity =
  | { on: 'key'; at: number }
  | { on: 'name'; at: number; field: FieldDef }

export interface MergeLinesInput {
  entity: EntityDef
  /** every row on the table — what a line is matched against */
  rows: RowData[]
  /** the data lines, cells as text, in the order they arrived */
  lines: string[][]
  /** cell index in a line -> the column on this table it writes */
  writable: Map<number, FieldDef>
  /** cell index -> a CALCULATED column the line can be graded
   *  against. Never written; see `VerifyMiss`. */
  checkable?: Map<number, FieldDef>
  /** this app's own answer for those columns, row by row */
  computedFor?: (row: RowData) => Record<string, CellValue>
  identity: MergeIdentity
  columns: PlanColumns
  /** what the plan calls where the lines came from */
  fileName: string
  /** how wide the incoming data is, including any key column */
  fileColumns: number
  /** the nouns its sentences are written with; the file's by default */
  words?: MergeWords
  refRowLabels?: (f: FieldDef) => Map<string, string> | undefined
  refLabelOf?: (f: FieldDef) => ((rowId: string) => string | undefined) | undefined
}

/**
 * READ THE LINES AGAINST THE TABLE AND SAY WHAT THE MERGE WOULD DO.
 *
 * Writes nothing, reads nothing but its arguments. The mapping is
 * already made; this decides which row each line is about, which
 * cells would change, which will not be written and why.
 */
export function mergeLines(input: MergeLinesInput): TableUploadPlan {
  const { entity, rows, lines, writable, identity, columns, refRowLabels, refLabelOf } = input
  const checkable = input.checkable ?? new Map<number, FieldDef>()
  const computedFor = input.computedFor
  const verified: VerifyMiss[] = []
  const words = input.words ?? FILE_WORDS

  const display = displayFieldOf(entity)
  const matchedOn = identity.on

  const byId = new Map<string, RowData>()
  for (const r of rows) byId.set(r.id, r)

  /** display value -> the one row that has it; a value shared by two
   *  rows maps to `null`, which is "cannot answer", not "no answer" */
  const byLabel = new Map<string, RowData | null>()
  if (identity.on === 'name') {
    const f = identity.field
    for (const r of rows) {
      const key = norm(cellToText(r.values[f.id] ?? null, f))
      if (key === '') continue
      byLabel.set(key, byLabel.has(key) ? null : r)
    }
  }

  const changes: CellChange[] = []
  const newRows: NewRow[] = []
  const refusals: UploadRefusal[] = []

  const touched = new Set<string>()
  const foreignKeys: string[] = []
  const ambiguousNames: string[] = []
  const duplicateLines: string[] = []
  const badValues: string[] = []
  const resurrections: string[] = []

  let unnamedNew = 0
  let matched = 0
  let overwritten = 0

  const cellAt = (line: string[], i: number): string => line[i] ?? ''

  /* A LINK COLUMN READS AS A WORD ON BOTH SIDES OF THE SENTENCE. The
     file says "Yamaha F70" and the cell holds that row's key, so a
     preflight built from the raw cell would print a change as
     `-KS7x1XXCj → -KJ2p0QaBv` and tell a dealer nothing. */
  const say = (v: CellValue, f: FieldDef): string => cellToText(v, f, refLabelOf?.(f))

  for (const line of lines) {
    /* which row is this line about */
    let target: RowData | undefined
    if (identity.on === 'key') {
      const key = cellAt(line, identity.at).trim()
      if (key !== '') {
        target = byId.get(key)
        if (!target) {
          foreignKeys.push(key)
          continue
        }
      }
    } else {
      const key = norm(cellAt(line, identity.at))
      if (key !== '') {
        const hit = byLabel.get(key)
        if (hit === null) {
          ambiguousNames.push(cellAt(line, identity.at).trim())
          continue
        }
        target = hit ?? undefined
      }
    }

    /* read every writable cell on the line, once, for both paths */
    const read: Array<{ field: FieldDef; value: CellValue; text: string }> = []
    for (const [i, f] of writable) {
      const raw = cellAt(line, i)
      const got = coerceCellText(raw, f, refRowLabels?.(f))
      if (!got.ok) {
        badValues.push(`${f.name}: ${got.reason}`)
        continue
      }
      read.push({ field: f, value: got.value, text: raw })
    }

    if (!target) {
      /* a new row. Its label is whatever the display column says,
         because that is the word the preflight will list it under. */
      const values: Record<string, CellValue> = {}
      for (const r of read) if (!isBlank(r.value)) values[r.field.id] = r.value
      const label = display ? say(values[display.id] ?? null, display) : ''
      if (label.trim() === '') unnamedNew += 1
      newRows.push({ label: label.trim() === '' ? '(no name)' : label, values })
      continue
    }

    if (touched.has(target.id)) {
      duplicateLines.push(rowLabel(entity, target))
      continue
    }
    touched.add(target.id)
    matched += 1

    /* ---- the importer grades its own homework ----------------
       CONFIG_FINDINGS adopt 8. Only where the caller handed over the
       resolver: without it there is nothing to compare against, and a
       verification against a blank would report every calculated cell
       in the file as wrong. */
    if (computedFor && checkable.size > 0) {
      const ours = computedFor(target)
      for (const [i, f] of checkable) {
        const raw = cellAt(line, i).trim()
        if (raw === '') continue
        const mine = ours[f.id] ?? null
        const mineSaid = say(mine, f)
        /* THE SAME WORD BACK IS AGREEMENT, whatever the types. This is
           the test the writable path already uses for "no edit", and
           using the same one means a file round-tripped untouched
           reports nothing here either. */
        if (sameAsExported(raw, mineSaid)) continue
        const theirs = Number(raw.replace(/[^0-9.-]/g, ''))
        const mineNum = typeof mine === 'number' ? mine : Number.NaN
        const delta =
          Number.isFinite(theirs) && Number.isFinite(mineNum) ? theirs - mineNum : null
        /* WITHIN A DOLLAR IS AGREEMENT. A landed cost re-derived
           through freight, duty and rebate lands cents away from the
           workbook's own rounding. */
        if (delta !== null && Math.abs(delta) <= VERIFY_TOLERANCE) continue
        verified.push({
          rowId: target.id,
          rowLabel: rowLabel(entity, target),
          columnName: f.name,
          theirs: raw,
          ours: mineSaid,
          delta,
        })
      }
    }

    let changedHere = 0
    for (const r of read) {
      const current = target.values[r.field.id] ?? null
      /* the same word back is no edit — see `sameAsExported` */
      if (sameAsExported(r.text, say(current, r.field))) continue
      if (sameCellValue(current, r.value)) continue

      /* THE ONE DIRECTION A FILE MAY NOT TURN. See reason 2. */
      if (
        r.field.id === DISCONTINUED_FIELD_ID &&
        isDiscontinued(target) &&
        r.value !== true
      ) {
        resurrections.push(rowLabel(entity, target))
        continue
      }

      changes.push({
        rowId: target.id,
        rowLabel: rowLabel(entity, target),
        fieldId: r.field.id,
        columnName: r.field.name,
        from: say(current, r.field),
        to: say(r.value, r.field),
        value: r.value,
      })
      changedHere += 1
    }
    if (changedHere > 0) overwritten += 1
  }

  /* -- what will not happen, said once each ------------------ */

  /* structurally file-only: a pasted block has no key column to
     carry a key from another sheet, so this stays in the file's own
     words rather than being parameterised for a door it cannot
     reach */
  if (foreignKeys.length > 0) {
    refusals.push({
      id: 'foreign-key',
      say: `${plural(foreignKeys.length, 'line names a row key', 'lines name row keys')} that is not on this table — ${foreignKeys.slice(0, 3).join(', ')}${foreignKeys.length > 3 ? ' …' : ''}. Those lines came from somewhere else and are skipped. To add a row, clear its ${ROW_KEY_HEADER} cell.`,
    })
  }
  if (ambiguousNames.length > 0) {
    refusals.push({
      id: 'ambiguous-name',
      say: `${plural(ambiguousNames.length, `${words.line} matches`, `${words.line}s match`)} more than one row by name (${ambiguousNames.slice(0, 3).join(', ')}${ambiguousNames.length > 3 ? ' …' : ''}), so there is no way to tell which row ${words.it} means. Export this table first — the file it writes carries a ${ROW_KEY_HEADER} column that cannot be ambiguous.`,
    })
  }
  if (duplicateLines.length > 0) {
    refusals.push({
      id: 'duplicate-line',
      say: `${plural(duplicateLines.length, `later ${words.line} repeats`, `later ${words.line}s repeat`)} a row already read from ${words.it}. The first ${words.line} for a row wins; the rest are skipped.`,
    })
  }
  if (resurrections.length > 0) {
    refusals.push({
      id: 'resurrect',
      say: `${plural(resurrections.length, 'row is', 'rows are')} discontinued and ${words.it} marks them as sold again. That is left as it is: a model comes back by clearing the cell on the sheet, one at a time, not by ${words.it}.`,
    })
  }
  if (badValues.length > 0) {
    const first = [...new Set(badValues)].slice(0, 3)
    refusals.push({
      id: 'bad-value',
      say: `${plural(badValues.length, 'cell could not be read', 'cells could not be read')} and ${badValues.length === 1 ? 'is left as it is' : 'are left as they are'} — ${first.join('; ')}${badValues.length > first.length ? ' …' : ''}.`,
    })
  }
  if (columns.ambiguous.length > 0) {
    refusals.push({
      id: 'ambiguous-column',
      say: `${plural(columns.ambiguous.length, `${words.head} names TWO columns`, `${words.head}s each name TWO columns`)} rather than one — ${columns.ambiguous.slice(0, 4).join(', ')}${columns.ambiguous.length > 4 ? ' …' : ''}. Nothing is written to either, because a name that fits two columns cannot say which one ${words.it} means. Rename one of each pair on the sheet and the next file can.`,
    })
  }
  if (columns.readOnly.length > 0) {
    refusals.push({
      id: 'read-only',
      say: `${columns.readOnly.join(', ')} ${columns.readOnly.length === 1 ? 'is' : 'are'} calculated or holds pictures. ${words.it === FILE_WORDS.it ? 'The file carries' : 'The block carries'} ${columns.readOnly.length === 1 ? 'it' : 'them'} so you can read ${columns.readOnly.length === 1 ? 'it' : 'them'} in Excel; nothing is written back.`,
    })
  }
  if (verified.length > 0) {
    const first = verified.slice(0, 3).map((v) => {
      const gap =
        v.delta === null
          ? `${v.ours} here, ${v.theirs} in ${words.it}`
          : `${v.ours} here, ${v.theirs} in ${words.it} — out by ${Math.abs(v.delta).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
      return `${v.rowLabel} · ${v.columnName}: ${gap}`
    })
    refusals.push({
      id: 'verify',
      say: `${plural(verified.length, 'calculated cell disagrees', 'calculated cells disagree')} with what this app works out — ${first.join('; ')}${verified.length > first.length ? ' …' : ''}. Nothing is written either way; a calculated column is derived here. A gap this size usually means the file was built from a different figure upstream, and that is worth knowing before the prices in it are trusted.`,
    })
  }
  if (columns.unknown.length > 0) {
    refusals.push({
      id: 'unknown-column',
      say: `${plural(columns.unknown.length, `${words.head} in ${words.it} is`, `${words.head}s in ${words.it} are`)} not a column on this table — ${columns.unknown.slice(0, 4).join(', ')}${columns.unknown.length > 4 ? ' …' : ''}. A column is added on the sheet, where it gets a type; nothing here creates one.`,
    })
  }
  if (columns.missing.length > 0) {
    refusals.push({
      id: 'missing-column',
      say: `${plural(columns.missing.length, 'column on this table has', 'columns on this table have')} no ${words.head} in ${words.it} — ${columns.missing.slice(0, 4).join(', ')}${columns.missing.length > 4 ? ' …' : ''}. Every row keeps what it already has in ${columns.missing.length === 1 ? 'it' : 'them'}.`,
    })
  }
  if (unnamedNew > 0 && display) {
    refusals.push({
      id: 'unnamed-new',
      say: `${plural(unnamedNew, 'new row has', 'new rows have')} nothing in ${display.name}. They will be added and will read as untitled until somebody names them.`,
    })
  }

  const untouched = rows.length - touched.size
  if (untouched > 0) {
    refusals.push({
      id: 'not-in-file',
      say: `${plural(untouched, `row on this table has`, `rows on this table have`)} no ${words.line} in ${words.it}. Nothing is deleted — a quote already given may have been written against ${untouched === 1 ? 'it' : 'them'}.`,
    })
  }
  if (isRetired(entity)) {
    refusals.push({
      id: 'retired-table',
      say: `${entity.name} is retired — it is history rather than stock, and no page a customer sees offers it. A file does not bring it back.`,
    })
  }

  return {
    tableId: entity.id,
    tableName: entity.name,
    fileName: input.fileName,
    ok: true,
    matchedOn,
    fileRows: lines.length,
    fileColumns: input.fileColumns,
    columnsMatched: columns.matched,
    columnsUnknown: columns.unknown,
    columnsAmbiguous: columns.ambiguous,
    columnsReadOnly: columns.readOnly,
    columnsMissing: columns.missing,
    matched,
    overwritten,
    added: newRows.length,
    untouched,
    changes,
    newRows,
    refusals,
    verified,
  }
}

/** Read a file against a table and say exactly what putting it back
 *  would do. Writes nothing, reads nothing but its arguments. */
export function planTableUpload(input: TableUploadInput): TableUploadPlan {
  const { entity, rows, text, fileName, refRowLabels, refLabelOf, computedFor } = input

  const base: TableUploadPlan = {
    tableId: entity.id,
    tableName: entity.name,
    fileName,
    ok: false,
    matchedOn: 'key',
    fileRows: 0,
    fileColumns: 0,
    columnsMatched: [],
    columnsUnknown: [],
    columnsAmbiguous: [],
    columnsReadOnly: [],
    columnsMissing: [],
    matched: 0,
    overwritten: 0,
    added: 0,
    untouched: rows.length,
    changes: [],
    newRows: [],
    refusals: [],
    verified: [],
  }

  const grid = fromCsvFile(text)
  if (grid.length === 0) {
    return { ...base, blocked: 'That file is empty.' }
  }
  const header = grid[0].map((h) => h.trim())
  const body = grid.slice(1).filter((line) => line.some((c) => c.trim() !== ''))

  /* -- the columns ------------------------------------------- */

  const keyAt = header.findIndex((h) => ROW_KEY_ALIASES.has(norm(h)))

  /* HOW MANY COLUMNS ON THIS TABLE ANSWER TO EACH NAME.
     Real registers have two. `Rigging Kits` carries `Trade Price`
     TWICE and `Sub Dealer Price` twice, `Dealer Fit Packages` carries
     `Code` and `CTD` twice, because the workbook those came out of
     does — four pairs across the 52 tables of the prepared set, and
     none of them is a mistake somebody can be told to go and fix.

     A HEADING IS THEN NOT AN ANSWER, and the old code did not notice.
     It built one map from name to column, so the SECOND field with a
     name overwrote the first — and then the FIRST file column, which
     carries the first field's figures, was written into the SECOND
     field. Measured on the real seed: `Trade Price 703 -> 0` on every
     rigging kit, a price silently replaced by a different column's
     price. That is precisely the failure §4.3 of ACTION_BAR.md exists
     to prevent, arriving through the one door nobody was watching.

     So a shared name is REFUSED, by name, and nothing is written to
     either column. Matching them by POSITION was considered and
     rejected: it is right only while the file's columns are in the
     order this app wrote them, and it fails SILENTLY the moment
     somebody moves a column in Excel — which is a thing people do to
     spreadsheets. A refusal costs four columns on two tables; a
     positional guess costs a price file. */
  const nameCount = new Map<string, number>()
  for (const f of entity.fields) {
    const k = norm(f.name)
    nameCount.set(k, (nameCount.get(k) ?? 0) + 1)
  }
  const byName = new Map<string, FieldDef>()
  for (const f of entity.fields) {
    const k = norm(f.name)
    if (nameCount.get(k) === 1) byName.set(k, f)
  }

  /* and how many headings the FILE spends on each name. The same
     ambiguity from the other side: two columns of figures under one
     heading, and no way to say which the table's column wants. */
  const headCount = new Map<string, number>()
  header.forEach((h, i) => {
    if (i === keyAt || h === '') return
    const k = norm(h)
    headCount.set(k, (headCount.get(k) ?? 0) + 1)
  })

  /** file column index -> the column on this table it writes */
  const writable = new Map<number, FieldDef>()
  /** file column index -> a calculated column it can be graded against */
  const checkable = new Map<number, FieldDef>()
  const matchedNames: string[] = []
  const unknown: string[] = []
  const readOnly: string[] = []
  /** named by the file, but the name does not pick out one column */
  const ambiguousColumns: string[] = []
  const seenFieldIds = new Set<string>()

  header.forEach((h, i) => {
    if (i === keyAt) return
    if (h === '') return
    const k = norm(h)

    if ((nameCount.get(k) ?? 0) > 1 || (headCount.get(k) ?? 0) > 1) {
      if (!ambiguousColumns.includes(h)) ambiguousColumns.push(h)
      /* every column wearing this name has a heading in the file, so
         none of them is ALSO reported as left out — one sentence per
         problem, and this problem is the ambiguity */
      for (const f of entity.fields) if (norm(f.name) === k) seenFieldIds.add(f.id)
      return
    }

    const f = byName.get(k)
    if (!f) {
      unknown.push(h)
      return
    }
    seenFieldIds.add(f.id)
    matchedNames.push(f.name)
    if (isReadOnlyColumn(f)) {
      readOnly.push(f.name)
      /* A FORMULA COLUMN IS STILL COMPARABLE. It is not written back
         — that is reason 4 and it does not move — but the file's
         answer and ours can be put side by side. A picture cannot:
         there is nothing to subtract. */
      if (f.type === 'formula') checkable.set(i, f)
      return
    }
    writable.set(i, f)
  })

  const missing = entity.fields
    .filter((f) => !seenFieldIds.has(f.id) && f.id !== UID_FIELD_ID)
    .map((f) => f.name)

  /* -- how a line finds its row ------------------------------ */

  const display = displayFieldOf(entity)
  const matchedOn: 'key' | 'name' = keyAt >= 0 ? 'key' : 'name'

  const nameAt = display ? header.findIndex((h) => norm(h) === norm(display.name)) : -1
  if (matchedOn === 'name') {
    if (!display) {
      return {
        ...base,
        blocked: `That file has no ${ROW_KEY_HEADER} column, and this table has no column to match names on.`,
      }
    }
    if (nameAt < 0) {
      return {
        ...base,
        blocked: `That file has no ${ROW_KEY_HEADER} column and no ${display.name} column, so there is no way to tell which row each line is about.`,
      }
    }
  }

  if (writable.size === 0) {
    return {
      ...base,
      fileRows: body.length,
      fileColumns: header.length,
      columnsMatched: matchedNames,
      columnsUnknown: unknown,
      columnsAmbiguous: ambiguousColumns,
      columnsReadOnly: readOnly,
      columnsMissing: missing,
      blocked:
        matchedNames.length === 0 && ambiguousColumns.length > 0
          ? `Every heading in that file that names a column on this table names TWO of them — ${ambiguousColumns.slice(0, 4).join(', ')}. Rename one of each pair on the sheet and there is a way to tell them apart.`
          : matchedNames.length === 0
            ? 'None of the headings in that file name a column on this table.'
            : 'Every column that file shares with this table is calculated or holds pictures, so there is nothing it can write.',
    }
  }

  /* -- and the rest is the engine both doors turn ----------- */

  return mergeLines({
    entity,
    rows,
    lines: body,
    writable,
    identity:
      matchedOn === 'key'
        ? { on: 'key', at: keyAt }
        /* checked above: on the name path both of these are settled */
        : { on: 'name', at: nameAt, field: display as FieldDef },
    columns: {
      matched: matchedNames,
      unknown,
      ambiguous: ambiguousColumns,
      readOnly,
      missing,
    },
    checkable,
    ...(computedFor ? { computedFor } : {}),
    fileName,
    fileColumns: header.length,
    ...(refRowLabels ? { refRowLabels } : {}),
    ...(refLabelOf ? { refLabelOf } : {}),
  })
}

/** Does this plan actually do anything? A file that matched perfectly
 *  and changed nothing is a real and common outcome — somebody
 *  exported, looked, and sent it back — and it must not be dressed up
 *  as a merge. */
export const planIsIdle = (p: TableUploadPlan): boolean =>
  p.changes.length === 0 && p.newRows.length === 0

/* ------------------------------------------------------------ */
/* the apply — a loop over the plan, and nothing else             */
/* ------------------------------------------------------------ */

/** The two store doors this needs. Passed in rather than imported, so
 *  the apply is testable without a store and cannot reach anything
 *  the plan did not name. */
export interface TableWriter {
  updateCell: (entityId: string, rowId: string, fieldId: string, value: CellValue) => void
  addRow: (entityId: string, values?: Record<string, CellValue>) => RowData | null
}

export interface UploadResult {
  cellsWritten: number
  rowsChanged: number
  rowsAdded: number
}

/**
 * Write exactly what the plan said, and nothing it did not.
 *
 * SYNCHRONOUS, IN ONE TURN OF THE EVENT LOOP, ON PURPOSE. The store
 * records one history step per burst and a burst is one turn — so a
 * merge of four hundred cells is ONE Ctrl+Z, and the note that
 * follows can honestly carry UNDO (rule 9). Awaiting anything in this
 * loop would split it into four hundred steps and make the offer a
 * lie.
 */
export function applyTableUpload(plan: TableUploadPlan, write: TableWriter): UploadResult {
  if (!plan.ok) return { cellsWritten: 0, rowsChanged: 0, rowsAdded: 0 }

  const rowsChanged = new Set<string>()
  for (const c of plan.changes) {
    write.updateCell(plan.tableId, c.rowId, c.fieldId, c.value)
    rowsChanged.add(c.rowId)
  }
  let rowsAdded = 0
  for (const r of plan.newRows) {
    if (write.addRow(plan.tableId, r.values)) rowsAdded += 1
  }
  return { cellsWritten: plan.changes.length, rowsChanged: rowsChanged.size, rowsAdded }
}

/* ------------------------------------------------------------ */
/* the sentence the confirm leads with                            */
/* ------------------------------------------------------------ */

/** What is about to happen, counted, in one line. This is the
 *  sentence §4.3 of ACTION_BAR.md asks for — "how many rows matched,
 *  how many are new, what will be overwritten" — and it is built here
 *  rather than in the component so a test can read the exact words a
 *  dealer is shown before a merge over their price file. */
export function describePlan(p: TableUploadPlan): string {
  if (!p.ok) return p.blocked ?? 'That file cannot be read.'
  if (planIsIdle(p)) {
    return p.matched === 0
      ? 'Nothing in that file matches a row on this table.'
      : `${plural(p.matched, 'row matches', 'rows match')} and every value in the file is already what is on the sheet. Nothing would change.`
  }
  const parts: string[] = []
  parts.push(`${plural(p.matched, 'row matched', 'rows matched')}`)
  parts.push(
    p.overwritten === 0
      ? 'none overwritten'
      : `${plural(p.overwritten, 'of them is', 'of them are')} overwritten across ${plural(p.changes.length, 'cell', 'cells')}`,
  )
  if (p.added > 0) parts.push(`${plural(p.added, 'row is', 'rows are')} new`)
  return `${parts.join(', ')}.`
}
