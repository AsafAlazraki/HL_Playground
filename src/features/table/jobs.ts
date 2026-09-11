/* ============================================================
   WHAT YOU CAME TO DO WITH THIS TABLE — UX_PASS §12.

   > Tools are what an app has. Jobs are what a person came for.

   THE MEASUREMENT THAT ASKED FOR IT, taken off one screenshot with
   no interaction: 56 columns, 11 section bands with every label
   truncated, 3 nested grouping levels, 8 chrome verbs of which four
   mean "let me see more of this", and a first data column reading
   `kb2JYb4GLH`. A dealer's first column should not be a machine key.
   42 things to read before acting.

   NOTHING IS REMOVED, and that is the whole shape of the answer. The
   spreadsheet is the LAST item on this list, plainly labelled and
   saying so — "every column at once, nothing is hidden from you" —
   because it is a real destination and not a punishment.

   EVERY JOB IS DERIVED, NEVER HARDCODED, which is §12's first
   property and the only one that can be got wrong quietly. A table
   with no prices does not show a price job. So each reading here is
   BORROWED from the file that already owns that question rather than
   asked a second way:

     prices    `priceReadOf`  — the one resolver that owns price
                ladders, and the same one the tiles and the quote
                print from
     pictures  `imageFieldOf` — a column of type `image`, which is
                what the catalogue means by a photograph
     related   `relatedTables` — what the module's links panel counts
     missing   `requiredFieldsOf` + the rows themselves — a cell the
                TABLE declares required and a row has not filled

   Asking one question in two places with two answers is how a list
   and the screen behind it come to disagree; `designer.ts` records
   the same rule for capability refusals and it is the same rule.

   A JOB THAT CANNOT RUN SAYS WHY, WHERE IT IS (§12's second property,
   and DESIGN_PRINCIPLES rule 10). "Add pictures" on a table with no
   image column is not hidden and not greyed in silence: it states
   that no column is set as the photograph column yet. Hiding it
   would teach a person the app cannot do it at all.

   THE NOUNS ARE THE DEALER'S. "40 boats in 3 series", never "29
   VARIANTS · 56 COLUMNS". The row noun comes off the table, so a
   motorcycle shop reads "40 bikes" with no extra work here.

   NOTHING IN THIS FILE RENDERS OR NAVIGATES. It answers what there is
   to do; the panel draws it and the host decides where each one goes.
   ============================================================ */

import type { EntityDef, FieldDef, RowData } from '@/types/model'
import { isDiscontinued, readCell } from '@/types/model'
import { imageFieldOf, priceReadOf } from '@/features/modules/read'
/* THE PRIMITIVE, NOT THE WRAPPER. `relatedTables` answers this for a
   MODULE — several tables at once, with its own tables excluded — and
   handing it a module-shaped object made of one table would be
   inventing a module to reach a reading. `existingRelations` is what
   that function itself borrows, and it asks exactly this file's
   question: what is this ONE table related to. */
import { existingRelations } from '@/features/views/relations'

/** The jobs this app knows how to offer, in the order §12 lists them.
 *  `sheet` is last on purpose. */
export type JobId = 'prices' | 'add' | 'related' | 'missing' | 'pictures' | 'sheet'

export interface Job {
  id: JobId
  /** the verb, in the dealer's words */
  name: string
  /** the line under it — what this job is about on THIS table */
  say: string
  /** the figure beside it, when there is one worth printing. A job
   *  with nothing to count carries none rather than a zero. */
  count?: number
  /** why it cannot run, or absent when it can (rule 10) */
  refusal?: string
}

/** What one row of this table is called, singular and plural — the
 *  table's own noun where it has one. */
export interface RowNoun {
  one: string
  many: string
}

export interface JobsInput {
  entity: EntityDef
  rows: readonly RowData[]
  noun: RowNoun
  /** every table on the sheet, so "what goes with these" can be
   *  counted the way the module's links panel counts it. Omit and the
   *  claim is not made at all rather than made from a partial map —
   *  the same correction `capabilityStates` needed. */
  sheet?: Record<string, EntityDef>
  /** whether this person may add a row here. Absent = they may. The
   *  caller owns the capability question; this file does not ask it
   *  twice. */
  mayAdd?: boolean
}

/** The columns this table declares a row cannot go without. */
function requiredFieldsOf(entity: EntityDef): FieldDef[] {
  return entity.fields.filter((f) => f.required === true)
}

/** Rows missing at least one required cell, and rows missing a
 *  picture — counted over LIVE rows only, because a discontinued row
 *  is not a gap in the catalogue, it is a thing that was withdrawn. */
export interface Gaps {
  /** how many live rows are missing a required cell */
  rows: number
  /** the columns those gaps are in, most-missed first */
  columns: string[]
  /** live rows with no picture, when there is a picture column */
  pictureless: number
}

export function gapsIn(entity: EntityDef, rows: readonly RowData[]): Gaps {
  const live = rows.filter((r) => !isDiscontinued(r))
  const required = requiredFieldsOf(entity)
  const missedBy = new Map<string, number>()
  let short = 0

  for (const row of live) {
    let rowIsShort = false
    for (const f of required) {
      const v = readCell(row, f.id)
      if (v === null || v === undefined || v === '') {
        missedBy.set(f.name, (missedBy.get(f.name) ?? 0) + 1)
        rowIsShort = true
      }
    }
    if (rowIsShort) short += 1
  }

  const image = imageFieldOf(entity)
  let pictureless = 0
  if (image) {
    for (const row of live) {
      const v = readCell(row, image.id)
      if (v === null || v === undefined || v === '') pictureless += 1
    }
  }

  return {
    rows: short,
    columns: [...missedBy.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name),
    pictureless,
  }
}

const plural = (n: number, one: string, many: string): string =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`

/**
 * WHAT THERE IS TO DO WITH THIS TABLE, in §12's order, with the
 * spreadsheet last.
 *
 * A job that does not apply AT ALL is left out; a job that applies
 * but cannot run right now is included WITH ITS REASON. The
 * difference matters: "this table has no prices" is a fact about the
 * table, and "no column is set as the photograph yet" is a thing a
 * person can go and fix.
 */
export function jobsFor(input: JobsInput): Job[] {
  const { entity, rows, noun, sheet, mayAdd = true } = input
  const live = rows.filter((r) => !isDiscontinued(r))
  const gaps = gapsIn(entity, rows)
  const out: Job[] = []

  /* -- prices ------------------------------------------------- */
  const price = priceReadOf(entity)
  if (price) {
    out.push({
      id: 'prices',
      name: 'Change prices',
      say: price.label,
      count: live.length,
    })
  }

  /* -- add ---------------------------------------------------- */
  out.push({
    id: 'add',
    name: `Add ${noun.one === 'row' ? 'a row' : `a ${noun.one}`}`,
    say: 'One row, filled in as a form',
    ...(mayAdd
      ? {}
      : { refusal: `Adding is switched off for ${entity.name} in its own settings.` }),
  })

  /* -- what goes with these ----------------------------------- */
  if (sheet) {
    const seen = new Map<string, string>()
    for (const rel of existingRelations(sheet, entity.id)) {
      const other = sheet[rel.otherId]
      if (other && rel.otherId !== entity.id) seen.set(rel.otherId, other.name)
    }
    const related = [...seen.values()]
    out.push({
      id: 'related',
      name: 'Set what goes with these',
      say:
        related.length === 0
          ? 'Nothing is related to this table yet'
          : related.slice(0, 3).join(', '),
      ...(related.length === 0
        ? {
            refusal:
              'Nothing on the sheet is related to this table yet. Draw a relationship on the data model and this opens.',
          }
        : { count: related.length }),
    })
  }

  /* -- fix what's missing ------------------------------------- */
  if (gaps.rows > 0) {
    out.push({
      id: 'missing',
      name: "Fix what's missing",
      say:
        gaps.columns.length === 0
          ? `${plural(gaps.rows, noun.one, noun.many)} are short a required value`
          : `${plural(gaps.rows, noun.one, noun.many)} missing ${gaps.columns.slice(0, 2).join(' or ')}`,
      count: gaps.rows,
    })
  }

  /* -- pictures ----------------------------------------------- */
  const image = imageFieldOf(entity)
  if (!image) {
    out.push({
      id: 'pictures',
      name: 'Add pictures',
      say: 'No column is set as the photograph',
      refusal:
        'No column on this table holds a picture yet. Add a picture column and every row can carry one.',
    })
  } else if (gaps.pictureless > 0) {
    out.push({
      id: 'pictures',
      name: 'Add pictures',
      say: `${plural(gaps.pictureless, noun.one, noun.many)} with no picture`,
      count: gaps.pictureless,
    })
  }

  /* -- the sheet, last and said plainly ------------------------ */
  out.push({
    id: 'sheet',
    name: 'Open the sheet',
    say: 'Every column at once, spreadsheet style. Nothing is hidden from you.',
  })

  return out
}

/**
 * The line under the table's name: "40 boats in 3 series. Pictures on
 * 38 of them, and prices are set."
 *
 * IT SAYS ONLY WHAT IS TRUE OF THIS TABLE. A table with no picture
 * column does not get a clause about pictures, because a sentence
 * that lists what is absent reads as a complaint rather than a
 * description.
 */
export function tableSay(
  input: JobsInput & {
    seriesCount?: number
    /** false where the HOST has already printed the count — a page
     *  head saying "588 variants · 7 series" over a line saying "588
     *  variants. Pictures on 534 of them" is the same figure twice on
     *  one screen, which is the fault §12 opens with. */
    countLed?: boolean
  },
): string {
  const { entity, rows, noun, seriesCount, countLed = true } = input
  const live = rows.filter((r) => !isDiscontinued(r))
  const parts: string[] = [plural(live.length, noun.one, noun.many)]
  if (seriesCount !== undefined && seriesCount > 1) {
    parts[0] = `${parts[0]} in ${plural(seriesCount, 'series', 'series')}`
  }

  const gaps = gapsIn(entity, rows)
  const image = imageFieldOf(entity)
  const said: string[] = []
  if (image && live.length > 0) {
    const withPicture = live.length - gaps.pictureless
    said.push(
      withPicture === live.length
        ? 'pictures on every one'
        : `pictures on ${withPicture.toLocaleString()} of them`,
    )
  }
  if (priceReadOf(entity)) said.push('prices are set')

  if (!countLed) {
    return said.length === 0 ? '' : `${said.join(', ').replace(/^./, (c) => c.toUpperCase())}.`
  }
  return said.length === 0
    ? `${parts[0]}.`
    : `${parts[0]}. ${said.join(', ').replace(/^./, (c) => c.toUpperCase())}.`
}
