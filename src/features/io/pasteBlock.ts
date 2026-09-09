/* ============================================================
   io/pasteBlock — A BLOCK OF SPREADSHEET CELLS, MAPPED ONTO A
   REGISTER, COMMITTED AS ONE ACT.

   THE FINDING (docs/plan/UX_PASS.md §3, audit finding 25): "Every one
   of these dealers keeps their business in a spreadsheet. Import is
   not a feature of this product, it is the front door to it, and it
   is currently a trapdoor."

   WHAT EXISTS TODAY AND WHY IT IS NOT THIS. `useSheetCommands.doPaste`
   (`src/features/table/useSheetCommands.ts:547`) already reads a
   pasted block, and it is POSITIONAL: it starts at the anchored cell
   and walks the table's columns left to right, so the first line of a
   copied block — the person's column names — is written into the
   first row as data. §3 records the outcome measured on this app: a
   boat named **Variant**, and `Series`/`Model` landing nowhere at all
   because they are not grid columns in that order. That gesture is
   still right for what it is (fill a rectangle from a rectangle) and
   is untouched here. What is missing is the other gesture, which is
   the one a dealer actually needs: THIS BLOCK IS A TABLE, AND ITS
   FIRST ROW SAYS WHAT ITS COLUMNS ARE.

   THE FOUR STEPS, and none of them is a wizard — they are one
   surface that grows as each is answered (`PasteBlock.tsx`):

     1  PASTE     the block lands. Nothing is committed.
     2  HEADER    "Is the first row a header?"  [ Yes · No ]
     3  MAP       each incoming column, beside where it will go:
                  matched · ( new column ) · ( skip )
     4  PREVIEW   the first rows drawn as they will actually appear,
                  with the row label resolved. Then one undoable act.

   ---------------------------------------------------------------
   WHAT IS NEW HERE, AND — MOSTLY — WHAT IS NOT

   Almost none of this is new, and that is the point.

     · THE GRAMMAR is `@/features/table/core`'s one parser, two
       delimiters. The clipboard dialect is TAB-separated because
       that is what Excel and Google Sheets put on it; the comma is
       accepted too, because a person who copies out of a text file
       gets commas and does not know the difference.

     · THE TYPE INFERENCE for a new column is `./csvSchema`, whole —
       the same thresholds, the same tolerance, the same sentence
       machinery that already argues a column's type in counts a
       person can check ("2,910 of 2,913 are numbers"). A second
       inference would be a second set of thresholds to drift.

     · THE MERGE is `./tableCsv`'s `mergeLines`, which is the engine
       the file door turns, extracted so both doors turn ONE of them.
       Never deletes a row, never resurrects a discontinued one,
       never writes a calculated or a picture column, reports every
       cell it would change with the old value beside the new one.
       Those four guarantees are why a dealer can let this near their
       price file, and there must never be a second copy of them.

     · THE PREVIEW AND THE CONFIRM are the round trip's own
       (`TableRoundTrip.tsx`), because a person who has re-uploaded a
       file has already read that screen once.

   WHAT IS GENUINELY NEW IS THE MAPPING, and it is new because it is
   the one question a file never has to ask.

   ---------------------------------------------------------------
   1 · WHY THE MAPPING IS EXPLICIT, AND WHAT THAT BUYS

   `planTableUpload` matches a heading to a column BY NAME, because a
   heading is all a `.csv` carries. That is honest for a file this
   app itself wrote. It is wrong for a dealer's own spreadsheet,
   where the headings are the supplier's words and not ours.

   So the mapping is asked rather than derived, and asking it fixes
   two things a name-keyed match cannot:

     · A COLUMN THIS TABLE DOES NOT HAVE IS NOT A FAILURE. `.csv`
       refuses to create one — "a `.csv` carries no type, no section,
       no description", tableCsv.ts reason 3 — and it is right that a
       FILE cannot silently author schema. A person standing in front
       of the mapping, told what type is inferred and what it will
       cost, is a different act: it is offered, in a sentence that
       names it, and it is undoable. DESIGN_PRINCIPLES §7.

     · A NAME THAT FITS TWO COLUMNS STOPS BEING FATAL. Real registers
       have them — `Rigging Kits` carries `Trade Price` twice — and
       the file door has to refuse both, because a heading cannot say
       which. Here the choice is made BY FIELD ID, so the person
       picks the one they mean and the paste writes it.

   The proposal still matches on the name, normalised for case and
   punctuation, so `Model Code` finds `Model code` and `Tube Dia. cm`
   finds `Tube dia cm`. That is not a guess about meaning — it is one
   name written two ways — and every proposal is on screen, named,
   and changeable before a single cell is written.

   ---------------------------------------------------------------
   2 · SKIP IS EXPLICIT, AND SO IS EVERY REFUSAL

   "Data silently dropped is the thing that destroys trust in an
   importer" (§3). So a skipped column is counted and named in the
   preview, and every column that CANNOT do what was asked says why,
   on the column, with what it would take — rule 10:

     · a calculated or picture column on this table cannot be filled
     · a block with no header row has no NAME for a new column
     · a column with nothing in row one has no name either
     · two pasted columns cannot fill one column on the table
     · a table's own display column must be mapped, or every row
       arrives with no name and is unfindable afterwards

   Each of those is a sentence with the fix in it, not a control that
   has quietly gone grey.

   ---------------------------------------------------------------
   3 · ONE ACT

   The commit creates the new columns and then merges, synchronously,
   in one turn of the event loop — which is one history burst, which
   is ONE Ctrl+Z (`applyTableUpload`'s own note, and `store/undo`).
   A paste that added two columns and four hundred cells comes back
   in one press or the offer of undo beside it is a lie.
   ============================================================ */

import { UID_FIELD_ID, displayFieldOf } from '@/types/model'
import type { CellValue, EntityDef, FieldDef, FieldType, RowData } from '@/types/model'
import { cellToText, coerceCellText, parseDelimited } from '@/features/table/core'
import {
  describeColumn,
  inferColumnType,
  measureColumn,
  type ColumnReading,
  type ColumnStats,
} from './csvSchema'
import {
  applyTableUpload,
  mergeLines,
  type CellChange,
  type MergeWords,
  type TableUploadPlan,
  type TableWriter,
  type UploadResult,
} from './tableCsv'

/* ------------------------------------------------------------ */
/* what a paste is called, in a sentence                         */
/* ------------------------------------------------------------ */

/** Where a plan built here says its lines came from. A person who
 *  never opened a file must never be told about one. */
export const PASTED = 'the pasted block'

/** The nouns the merge writes its sentences with on this door. */
export const PASTE_WORDS: MergeWords = {
  it: PASTED,
  head: 'column',
  line: 'row',
}

/** How many rows the preview draws. Three is §3's own figure: enough
 *  to see a pattern, few enough that the person reads them. */
export const PREVIEW_ROWS = 3

const count = (n: number): string => n.toLocaleString()

const plural = (n: number, one: string, many: string): string =>
  `${count(n)} ${n === 1 ? one : many}`

/** A column name, reduced to what two people writing it down would
 *  agree on. Case and punctuation only — never a fuzzy match on
 *  meaning, which would be a guess about somebody's data. */
export const nameKey = (s: string): string => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')

/* ------------------------------------------------------------ */
/* 1 · THE BLOCK                                                 */
/* ------------------------------------------------------------ */

export interface BlockRefusal {
  id: string
  say: string
}

export interface PastedBlock {
  ok: boolean
  /** why nothing could be read — `ok` is false when this is set */
  refusal?: BlockRefusal
  /** every row that carried anything, padded to `width` */
  grid: string[][]
  /** cells across, taken from the first row */
  width: number
  /** what separated the cells — said out loud, never assumed */
  delimiter: 'tab' | 'comma'
  /** completely empty rows dropped on the way in */
  blankRowsDropped: number
  /** rows that stopped short of the full width, padded, by row number */
  shortRows: number[]
  /** true when row one reads as column names rather than as data */
  headerLikely: boolean
}

const emptyBlock: Omit<PastedBlock, 'refusal'> = {
  ok: false,
  grid: [],
  width: 0,
  delimiter: 'tab',
  blankRowsDropped: 0,
  shortRows: [],
  headerLikely: false,
}

const refuseBlock = (id: string, say: string): PastedBlock => ({
  ...emptyBlock,
  refusal: { id, say },
})

/** A field shaped like the one a value would be judged against, so
 *  "does this read as a number" is the same question everywhere. */
const probe = (type: FieldType): FieldDef => ({ id: '__probe', name: 'column', type })

const readsAsData = (cell: string): boolean =>
  coerceCellText(cell, probe('number')).ok || coerceCellText(cell, probe('date')).ok

/**
 * IS ROW ONE THE COLUMN NAMES?
 *
 * Proposed, never imposed — §3 asks the question out loud and this
 * only pre-answers it. A row of nothing but numbers and dates is
 * data, and calling it a header would turn a price into a column
 * heading and lose that row entirely (the same reading `./csvSchema`
 * refuses a file on). Anything else is far more often a header, and
 * the one press it costs to say otherwise is the point of asking.
 */
export function looksLikeHeader(row: string[]): boolean {
  const live = row.map((c) => c.trim()).filter((c) => c !== '')
  if (live.length === 0) return false
  return live.some((c) => !readsAsData(c))
}

/**
 * WHICH CHARACTER SEPARATED THE CELLS.
 *
 * A tab wins whenever there is one, because a tab is what a
 * spreadsheet puts on the clipboard and a comma inside a value is
 * ordinary in a price list ("Ocean Master 540, deluxe"). A block with
 * no tab at all and commas in it came out of a text file, and reading
 * it as one column would be a worse answer than reading it as
 * several.
 */
export function delimiterOf(text: string): 'tab' | 'comma' {
  const firstLine = text.split(/\r\n|\r|\n/, 1)[0] ?? ''
  if (firstLine.includes('\t')) return 'tab'
  return firstLine.includes(',') ? 'comma' : 'tab'
}

/**
 * READ WHAT WAS PASTED. Writes nothing, decides nothing about where
 * it goes.
 *
 * Two things are tolerated and counted rather than refused, because
 * both are what an ordinary selection actually produces: completely
 * blank rows, and rows that stop SHORT of the full width. Short rows
 * are padded — no value is lost, nothing is guessed — and both counts
 * are carried so the surface can say them before anybody presses.
 */
export function readPastedBlock(text: string): PastedBlock {
  if (text.trim() === '') {
    return refuseBlock(
      'empty',
      'There is nothing to read. Select the cells in your spreadsheet, copy them, and paste them here.',
    )
  }

  const delimiter = delimiterOf(text)
  const raw = parseDelimited(text, delimiter === 'tab' ? '\t' : ',')
  if (raw.length === 0) {
    return refuseBlock(
      'empty',
      'There is nothing to read. Select the cells in your spreadsheet, copy them, and paste them here.',
    )
  }

  const width = raw[0].length
  if (raw.length === 1 && width === 1) {
    return refuseBlock(
      'one-cell',
      'That is a single cell, not a block. Select the whole range you want — column names and all the rows under them — and copy it in one go.',
    )
  }

  const grid: string[][] = []
  const shortRows: number[] = []
  const longRows: number[] = []
  let blankRowsDropped = 0

  for (let r = 0; r < raw.length; r += 1) {
    const line = raw[r]
    if (line.every((c) => c.trim() === '')) {
      blankRowsDropped += 1
      continue
    }
    const rowNumber = r + 1
    if (line.length > width) {
      longRows.push(rowNumber)
      continue
    }
    if (line.length < width) {
      shortRows.push(rowNumber)
      grid.push([...line, ...Array<string>(width - line.length).fill('')])
      continue
    }
    grid.push(line)
  }

  /* A row with MORE cells than the first one is what an unquoted
     separator inside a value looks like, and carrying it would drop
     whatever fell off the end without saying so. Refused by row
     number, so it can be found. */
  if (longRows.length > 0) {
    return refuseBlock(
      'ragged',
      `${plural(longRows.length, 'row carries', 'rows carry')} more cells than the first row does (${longRows
        .slice(0, 5)
        .map((n) => `row ${count(n)}`)
        .join(', ')}${longRows.length > 5 ? ', …' : ''}). That is usually a ${
        delimiter === 'tab' ? 'tab' : 'comma'
      } inside a value. Copy the cells from the spreadsheet itself rather than pasting text.`,
    )
  }

  if (grid.length === 0) {
    return refuseBlock(
      'empty',
      'Every row in that block is empty. Select the cells that have something in them and copy those.',
    )
  }

  return {
    ok: true,
    grid,
    width,
    delimiter,
    blankRowsDropped,
    shortRows,
    headerLikely: looksLikeHeader(grid[0]),
  }
}

/* ------------------------------------------------------------ */
/* 2 · THE COLUMNS THAT ARRIVED                                  */
/* ------------------------------------------------------------ */

export interface IncomingColumn {
  index: number
  /** the header cell, trimmed. Empty when there is no header row. */
  header: string
  /** what to call it on screen — its header, or `Column 3` */
  title: string
  /** everything measured about its values. `./csvSchema`'s reading. */
  stats: ColumnStats
  /** the first few values as pasted, for the map row */
  sample: string[]
}

/** How many of a column's own values the map row shows. */
const SAMPLE = 3

/** The data rows of a block, once the header question is answered. */
export const bodyOf = (block: PastedBlock, headerRow: boolean): string[][] =>
  headerRow ? block.grid.slice(1) : block.grid

/**
 * The block's columns, measured. `headerRow` decides two things at
 * once and they must stay together: what the column is CALLED, and
 * which rows its type is read from. Reading row one as both a name
 * and a value is exactly the bug §3 recorded.
 */
export function readColumns(block: PastedBlock, headerRow: boolean): IncomingColumn[] {
  const body = bodyOf(block, headerRow)
  const heads = headerRow ? block.grid[0] : []
  const out: IncomingColumn[] = []
  for (let i = 0; i < block.width; i += 1) {
    const header = (heads[i] ?? '').trim()
    const cells = body.map((row) => row[i] ?? '')
    out.push({
      index: i,
      header,
      title: header === '' ? `Column ${i + 1}` : header,
      stats: measureColumn(header, cells, i),
      sample: cells.filter((c) => c.trim() !== '').slice(0, SAMPLE),
    })
  }
  return out
}

/* ------------------------------------------------------------ */
/* 3 · WHERE EACH COLUMN GOES                                    */
/* ------------------------------------------------------------ */

/** One incoming column's outcome. §3's three, and no fourth. */
export type MapTo =
  | { to: 'field'; fieldId: string }
  | { to: 'new'; name: string; type: FieldType; options?: string[] }
  | { to: 'skip' }

/** A column on this table, offered as a target — or not, with the
 *  reason it cannot be one. */
export interface FieldOffer {
  field: FieldDef
  /** what to print in the picker: the name, plus its position when
   *  two columns on this table share a name */
  label: string
  /** present when nothing can be pasted into this column */
  refusal?: string
}

/**
 * EVERY COLUMN ON THIS TABLE, AND WHETHER A PASTE CAN FILL IT.
 *
 * Two kinds cannot, for the reasons `./tableCsv` reason 4 already
 * gives about a file: a calculated column is derived, and a picture
 * is a file rather than a word. The identity column is not offered
 * either — a key typed by hand is a key from somewhere else.
 *
 * A NAME SHARED BY TWO COLUMNS IS NOT FATAL HERE, and that is the
 * difference the explicit mapping buys. The file door has to refuse
 * both, because a heading cannot say which one it means; this picker
 * carries the field's id and prints the position beside the name, so
 * the person picks the one they mean.
 */
export function fieldOffers(entity: EntityDef): FieldOffer[] {
  const seen = new Map<string, number>()
  for (const f of entity.fields) {
    const k = nameKey(f.name)
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }
  const out: FieldOffer[] = []
  entity.fields.forEach((field, at) => {
    if (field.id === UID_FIELD_ID) return
    const shared = (seen.get(nameKey(field.name)) ?? 0) > 1
    out.push({
      field,
      label: shared ? `${field.name} (column ${at + 1})` : field.name,
      ...(field.type === 'formula'
        ? {
            refusal: `${field.name} is calculated from other columns on this table, so nothing can be pasted into it. Change what it is calculated from on the sheet.`,
          }
        : field.type === 'image'
          ? {
              refusal: `${field.name} holds pictures, and a pasted block is words. Add pictures on the row itself.`,
            }
          : {}),
    })
  })
  return out
}

/** The offers a person may actually pick. */
export const pickableOffers = (offers: FieldOffer[]): FieldOffer[] =>
  offers.filter((o) => !o.refusal)

export interface ColumnProposal {
  choice: MapTo
  /** how it was arrived at, for the word beside the picker */
  how: 'matched' | 'inferred' | 'nothing'
  /** why this column cannot become a new column on the table */
  newRefusal?: string
  /** why the column it names cannot be filled */
  refusal?: string
}

/**
 * WHAT THIS COLUMN SHOULD DO, PROPOSED.
 *
 * The order is the order the answers are worth having: a column this
 * table already has wins, because that is the whole reason a person
 * pasted into THIS table; failing that a new column, because a
 * dealer's spreadsheet has columns we have never heard of and that is
 * normal; failing that skip, which is never silent.
 */
export function proposeColumn(
  col: IncomingColumn,
  offers: FieldOffer[],
  headerRow: boolean,
): ColumnProposal {
  const key = nameKey(col.header)

  if (key !== '') {
    const named = offers.filter((o) => nameKey(o.field.name) === key)
    const free = named.filter((o) => !o.refusal)
    if (free.length === 1) {
      return { choice: { to: 'field', fieldId: free[0].field.id }, how: 'matched' }
    }
    if (free.length > 1) {
      /* two columns on this table answer to this name. The picker can
         still tell them apart — it carries ids — so this is a
         question, not a refusal. */
      return {
        choice: { to: 'skip' },
        how: 'nothing',
        refusal: `Two columns on this table are called ${named[0].field.name}. Pick the one you mean.`,
        newRefusal: `This table already has a column called ${named[0].field.name}.`,
      }
    }
    if (named.length > 0) {
      /* it names a column that exists and cannot be written */
      return {
        choice: { to: 'skip' },
        how: 'nothing',
        refusal: named[0].refusal,
        newRefusal: `This table already has a column called ${named[0].field.name}, and nothing can be pasted into it.`,
      }
    }
  }

  const newRefusal = whyNotNew(col, headerRow)
  if (newRefusal) {
    return { choice: { to: 'skip' }, how: 'nothing', newRefusal }
  }

  const { type, options } = inferColumnType(col.stats)
  return {
    choice: { to: 'new', name: col.header, type, ...(options ? { options } : {}) },
    how: 'inferred',
  }
}

/** Why this column cannot become a new column on the table, with
 *  what it would take. Null when it can. */
export function whyNotNew(col: IncomingColumn, headerRow: boolean): string | null {
  if (!headerRow) {
    return 'A new column needs a name, and without a header row there is nothing to take one from. If the first row of the block holds your column names, answer Yes above.'
  }
  if (col.header === '') {
    return `Nothing in row one names this column, so a new one has no name to take. Name it in your spreadsheet, or leave it skipped — this app will not invent a name for a column of somebody's data.`
  }
  return null
}

/** The whole proposal, one entry per incoming column. */
export function proposeMapping(
  cols: IncomingColumn[],
  offers: FieldOffer[],
  headerRow: boolean,
): ColumnProposal[] {
  const taken = new Set<string>()
  return cols.map((col) => {
    const p = proposeColumn(col, offers, headerRow)
    /* two headings that name one column: the first wins, the second
       falls through to being a new column or to skip, rather than
       both being proposed at the same target and clashing on sight */
    if (p.choice.to === 'field') {
      if (taken.has(p.choice.fieldId)) {
        const alt = whyNotNew(col, headerRow)
        if (alt) return { choice: { to: 'skip' } as MapTo, how: 'nothing' as const, newRefusal: alt }
        const { type, options } = inferColumnType(col.stats)
        return {
          choice: { to: 'new', name: col.header, type, ...(options ? { options } : {}) } as MapTo,
          how: 'inferred' as const,
        }
      }
      taken.add(p.choice.fieldId)
    }
    return p
  })
}

/* ------------------------------------------------------------ */
/* what a mapping refuses, said on the column it happens to      */
/* ------------------------------------------------------------ */

/** A refusal keyed to the incoming column it belongs to. */
export type MapRefusals = Map<number, string>

/**
 * WHAT THE MAPPING AS A WHOLE WILL NOT DO — the clashes one column
 * cannot see on its own. Each says what it would take, on the column
 * where it happens (rule 10), never as a banner over the list.
 */
export function mappingRefusals(
  cols: IncomingColumn[],
  choices: MapTo[],
  entity: EntityDef,
): MapRefusals {
  const out: MapRefusals = new Map()
  const fieldAt = new Map<string, number>()
  const nameAt = new Map<string, number>()
  const byId = new Map(entity.fields.map((f) => [f.id, f]))
  const existing = new Set(entity.fields.map((f) => nameKey(f.name)))

  choices.forEach((choice, i) => {
    if (choice.to === 'field') {
      const first = fieldAt.get(choice.fieldId)
      if (first !== undefined) {
        const f = byId.get(choice.fieldId)
        out.set(
          i,
          `${cols[first].title} is already going to ${f ? f.name : 'that column'}. Two columns cannot fill one — set this one to skip, or send it to a new column.`,
        )
        return
      }
      fieldAt.set(choice.fieldId, i)
      return
    }
    if (choice.to !== 'new') return

    const name = choice.name.trim()
    if (name === '') {
      out.set(i, 'A new column needs a name. Type one, or set this column to skip.')
      return
    }
    const key = nameKey(name)
    if (existing.has(key)) {
      out.set(
        i,
        `This table already has a column called ${name}. Send this one to that column instead, or give the new column a different name.`,
      )
      return
    }
    const first = nameAt.get(key)
    if (first !== undefined) {
      out.set(
        i,
        `${cols[first].title} is already making a new column called ${name}. Give this one a different name, or set it to skip.`,
      )
      return
    }
    nameAt.set(key, i)
  })

  return out
}

/* ------------------------------------------------------------ */
/* 4 · THE PLAN                                                  */
/* ------------------------------------------------------------ */

/** A column that does not exist yet, as the plan is written against
 *  it. `id` is provisional and never reaches the store — see
 *  `applyPaste`, which swaps it for the real one before a cell moves. */
export interface NewColumn {
  id: string
  name: string
  type: FieldType
  options?: string[]
  /** the incoming column it comes from */
  from: number
  /** what its type costs, in counts — `./csvSchema`'s own sentence */
  reading: ColumnReading
}

/** One cell of the preview, drawn as the register will print it. */
export interface PreviewCell {
  column: string
  /** what will be in the cell, in the register's own words */
  text: string
  /** false when the pasted value could not be read as the type */
  read: boolean
}

/** One of the first rows, as it will actually appear. */
export interface PreviewRow {
  /** resolved the way the register resolves it — §3's whole point */
  label: string
  fate: 'new' | 'update'
  cells: PreviewCell[]
}

export interface PastePlanInput {
  entity: EntityDef
  /** every row on the table — what a pasted row is matched against */
  rows: RowData[]
  block: PastedBlock
  headerRow: boolean
  cols: IncomingColumn[]
  choices: MapTo[]
  refRowLabels?: (f: FieldDef) => Map<string, string> | undefined
  refLabelOf?: (f: FieldDef) => ((rowId: string) => string | undefined) | undefined
}

export interface PastePlan {
  /** false when nothing can go ahead; `blocked` says why */
  ok: boolean
  blocked?: string
  /** the merge, computed against this table AS IT WILL BE */
  plan: TableUploadPlan | null
  /** the columns the commit will create first, in order */
  creating: NewColumn[]
  /** the columns nothing will be read from, by their own names */
  skipped: string[]
  /** the first rows, drawn as they will appear */
  preview: PreviewRow[]
}

/** The provisional id a not-yet-existing column is planned against.
 *  Prefixed so it can never be mistaken for a real field id, and
 *  swapped for the store's own before anything is written. */
const provisionalId = (i: number): string => `__paste_new_${i}`

/**
 * READ THE BLOCK AGAINST THE TABLE AND SAY WHAT COMMITTING WOULD DO.
 * Writes nothing, ever.
 *
 * The merge runs against a PROJECTED entity — this table with the new
 * columns already on it — so the preview a person reads is the one
 * they will get, rather than a preview of half the act followed by a
 * surprise. The projection exists only in this function's arguments;
 * nothing is created until `applyPaste`.
 */
export function planPaste(input: PastePlanInput): PastePlan {
  const { entity, rows, block, headerRow, cols, choices, refRowLabels, refLabelOf } = input

  const nothing: PastePlan = {
    ok: false,
    plan: null,
    creating: [],
    skipped: [],
    preview: [],
  }

  if (!block.ok) return { ...nothing, blocked: block.refusal?.say ?? 'There is nothing to read.' }

  const refusals = mappingRefusals(cols, choices, entity)

  /* -- the columns that will be made -------------------------- */

  const creating: NewColumn[] = []
  choices.forEach((choice, i) => {
    if (choice.to !== 'new' || refusals.has(i)) return
    creating.push({
      id: provisionalId(i),
      name: choice.name.trim(),
      type: choice.type,
      ...(choice.options ? { options: choice.options } : {}),
      from: i,
      reading: describeColumn(cols[i].stats, choice.type, choice.options),
    })
  })

  const madeFields: FieldDef[] = creating.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    ...(c.options ? { options: c.options } : {}),
  }))
  const projected: EntityDef = { ...entity, fields: [...entity.fields, ...madeFields] }

  /* -- which incoming column writes which -------------------- */

  const byId = new Map(projected.fields.map((f) => [f.id, f]))
  const writable = new Map<number, FieldDef>()
  const matchedNames: string[] = []
  const skipped: string[] = []

  choices.forEach((choice, i) => {
    if (refusals.has(i) || choice.to === 'skip') {
      skipped.push(cols[i].title)
      return
    }
    const id = choice.to === 'new' ? provisionalId(i) : choice.fieldId
    const f = byId.get(id)
    if (!f) {
      skipped.push(cols[i].title)
      return
    }
    writable.set(i, f)
    matchedNames.push(f.name)
  })

  if (writable.size === 0) {
    return {
      ...nothing,
      skipped,
      blocked:
        'Nothing in that block is going anywhere yet. Send at least one column to a column on this table, or to a new one.',
    }
  }

  /* -- how a pasted row finds its row ------------------------- */

  const display = displayFieldOf(entity)
  if (!display) {
    return {
      ...nothing,
      creating,
      skipped,
      blocked:
        'This table has no column for a row to be known by, so there is no way to tell which row a pasted line is about. Add one on the sheet first.',
    }
  }
  let at = -1
  for (const [i, f] of writable) {
    if (f.id === display.id) {
      at = i
      break
    }
  }
  if (at < 0) {
    return {
      ...nothing,
      creating,
      skipped,
      blocked: `Nothing is going to ${display.name}, which is what a row on this table is known by. Every pasted row would arrive with no name and could not be found again. Send one of the columns above to ${display.name}.`,
    }
  }

  /* -- the merge, on the engine the file door turns ----------- */

  const body = bodyOf(block, headerRow)
  /* columns on this table that no pasted column fills. Calculated and
     picture columns are not among them: nothing could ever fill those
     from a block of text, so listing them as "missing" would read as a
     shortcoming of the paste rather than a property of the column. */
  const written = new Set<string>()
  for (const [, f] of writable) written.add(f.id)
  const missing = entity.fields
    .filter(
      (f) =>
        f.id !== UID_FIELD_ID &&
        f.type !== 'formula' &&
        f.type !== 'image' &&
        !written.has(f.id),
    )
    .map((f) => f.name)

  const plan = mergeLines({
    entity: projected,
    rows,
    lines: body,
    writable,
    identity: { on: 'name', at, field: display },
    columns: {
      matched: matchedNames,
      unknown: [],
      ambiguous: [],
      readOnly: [],
      missing,
    },
    fileName: PASTED,
    fileColumns: block.width,
    words: PASTE_WORDS,
    ...(refRowLabels ? { refRowLabels } : {}),
    ...(refLabelOf ? { refLabelOf } : {}),
  })

  /* SKIP IS NEVER SILENT. §3: "Data silently dropped is the thing
     that destroys trust in an importer." Said first, because it is
     the one thing on this screen a person cannot see for themselves
     by scrolling the preview. */
  if (skipped.length > 0) {
    plan.refusals.unshift({
      id: 'skipped-column',
      say: `${plural(skipped.length, 'pasted column is', 'pasted columns are')} skipped and nothing in ${skipped.length === 1 ? 'it' : 'them'} is read — ${skipped.slice(0, 4).join(', ')}${skipped.length > 4 ? ', …' : ''}.`,
    })
  }

  return {
    ok: true,
    plan,
    creating,
    skipped,
    preview: previewPaste({
      entity: projected,
      rows,
      body,
      writable,
      at,
      display,
      ...(refRowLabels ? { refRowLabels } : {}),
      ...(refLabelOf ? { refLabelOf } : {}),
    }),
  }
}

/* ------------------------------------------------------------ */
/* the preview                                                   */
/* ------------------------------------------------------------ */

interface PreviewInput {
  entity: EntityDef
  rows: RowData[]
  body: string[][]
  writable: Map<number, FieldDef>
  /** the incoming column that names the row */
  at: number
  display: FieldDef
  refRowLabels?: (f: FieldDef) => Map<string, string> | undefined
  refLabelOf?: (f: FieldDef) => ((rowId: string) => string | undefined) | undefined
}

/**
 * THE FIRST ROWS, AS THEY WILL ACTUALLY APPEAR.
 *
 * §3: "The preview resolves the row label, so 'a boat named Variant'
 * is visible before it exists rather than after."
 *
 * Every cell is put through the same coercion the merge uses and then
 * printed with the same `cellToText` the register prints with, so
 * what is on this screen is what will be on that one. A value the
 * chosen type cannot carry shows as empty AND is marked, because a
 * cell that will land blank is the single thing a person most needs
 * to see before they press rather than after.
 */
export function previewPaste(input: PreviewInput): PreviewRow[] {
  const { entity, rows, body, writable, at, display, refRowLabels, refLabelOf } = input

  /* the same lookup the merge makes, over the same words. Built here
     rather than handed back out of `mergeLines`, because the merge's
     product is a diff and this one is a picture of a row — two
     different things that happen to ask one question. */
  const known = new Map<string, boolean>()
  for (const r of rows) {
    const key = cellToText(r.values[display.id] ?? null, display).trim().toLowerCase()
    if (key !== '') known.set(key, true)
  }

  const out: PreviewRow[] = []
  for (const line of body.slice(0, PREVIEW_ROWS)) {
    const cells: PreviewCell[] = []
    for (const [i, f] of writable) {
      const raw = line[i] ?? ''
      const got = coerceCellText(raw, f, refRowLabels?.(f))
      cells.push({
        column: f.name,
        text: got.ok ? cellToText(got.value, f, refLabelOf?.(f)) : '',
        read: got.ok,
      })
    }
    const name = (line[at] ?? '').trim()
    out.push({
      label: name === '' ? `(untitled ${entity.name.toLowerCase()})` : name,
      fate: known.has(name.toLowerCase()) ? 'update' : 'new',
      cells,
    })
  }
  return out
}

/* ------------------------------------------------------------ */
/* 5 · THE COMMIT — one act                                      */
/* ------------------------------------------------------------ */

/** The three store doors this needs. Passed in rather than imported,
 *  so the commit is testable without a store and cannot reach
 *  anything the plan did not name. */
export interface PasteWriter extends TableWriter {
  addField: (
    entityId: string,
    partial: Partial<Omit<FieldDef, 'id'>>,
  ) => FieldDef | null
}

export interface PasteResult extends UploadResult {
  columnsAdded: number
  /** columns the store would not create — nothing was written to them */
  columnsRefused: string[]
}

/**
 * MAKE THE COLUMNS, THEN THE MERGE — SYNCHRONOUSLY, IN ONE TURN.
 *
 * The store records one history step per burst and a burst is one
 * turn of the event loop, so a paste that adds two columns and writes
 * four hundred cells is ONE Ctrl+Z and the toast beside it can
 * honestly carry UNDO (rule 9). Awaiting anything here would split it
 * into four hundred steps and make the offer a lie —
 * `applyTableUpload` records the same constraint for the same reason.
 *
 * THE PROVISIONAL IDS NEVER REACH THE STORE. The plan was written
 * against `__paste_new_*`; the real ids come back from `addField` and
 * every cell the plan named is re-pointed at them before a single
 * write. A column the store refuses to create takes its cells with
 * it — nothing is written into a column that does not exist.
 */
export function applyPaste(p: PastePlan, entityId: string, write: PasteWriter): PasteResult {
  const none: PasteResult = {
    cellsWritten: 0,
    rowsChanged: 0,
    rowsAdded: 0,
    columnsAdded: 0,
    columnsRefused: [],
  }
  if (!p.ok || !p.plan) return none

  const realId = new Map<string, string>()
  const columnsRefused: string[] = []
  for (const c of p.creating) {
    const made = write.addField(entityId, {
      name: c.name,
      type: c.type,
      ...(c.options ? { options: c.options } : {}),
    })
    if (!made) {
      columnsRefused.push(c.name)
      continue
    }
    realId.set(c.id, made.id)
  }

  const lands = (fieldId: string): string | null => {
    if (!fieldId.startsWith('__paste_new_')) return fieldId
    return realId.get(fieldId) ?? null
  }

  const changes: CellChange[] = []
  for (const c of p.plan.changes) {
    const id = lands(c.fieldId)
    if (id) changes.push({ ...c, fieldId: id })
  }
  const newRows = p.plan.newRows.map((r) => {
    const values: Record<string, CellValue> = {}
    for (const [fieldId, value] of Object.entries(r.values)) {
      const id = lands(fieldId)
      if (id) values[id] = value
    }
    return { ...r, values }
  })

  const result = applyTableUpload({ ...p.plan, changes, newRows }, write)
  return { ...result, columnsAdded: realId.size, columnsRefused }
}

/* ------------------------------------------------------------ */
/* the sentence the commit leads with                            */
/* ------------------------------------------------------------ */

/** What pressing it will do, counted, in one line — including the
 *  columns, because a table growing a column is a structural change
 *  and §7 says it is offered in a sentence that names it. */
export function describePaste(p: PastePlan): string {
  if (!p.ok || !p.plan) return p.blocked ?? 'That block cannot be read.'
  const parts: string[] = []
  if (p.creating.length > 0) {
    parts.push(
      `Adds ${plural(p.creating.length, 'column', 'columns')} — ${p.creating.map((c) => c.name).join(', ')}`,
    )
  }
  if (p.plan.added > 0) parts.push(`${plural(p.plan.added, 'row is', 'rows are')} new`)
  if (p.plan.changes.length > 0) {
    parts.push(
      `${plural(p.plan.changes.length, 'cell', 'cells')} on ${plural(p.plan.overwritten, 'row', 'rows')} ${p.plan.changes.length === 1 ? 'is' : 'are'} overwritten`,
    )
  }
  if (parts.length === 0) return 'Nothing in that block would change anything on this table.'
  return `${parts.join('. ')}.`
}
