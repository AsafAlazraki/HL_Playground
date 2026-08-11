/* ============================================================
   THE FREEZE — the only place live data becomes a quote.

   Everything in this file runs at PICK TIME: the instant a person
   presses "Quote this one", or picks a row into a section, or asks
   for today's prices. Nothing here is called while a quote is being
   drawn. That separation is the whole correctness story:

     · freeze.ts   reads the store, ONCE, and produces frozen values
     · totals.ts   sums frozen values and never reads the store
     · the screens render frozen values and never read the store

   A line is minted the moment it is picked, NOT at commit.
   Production kept seven wizard steps in React state with no draft
   and no beforeunload guard, so a refresh at step 6 destroyed
   everything. Here the pick IS the write.

   WHAT IS DELIBERATELY NOT DONE HERE
   ─────────────────────────────────────────────────────────────
   No markup, no labour, no pre-delivery, no registration, no tax,
   no margin, no rebate amount, no discount policy. Not one of those
   is a column in the project's data, so not one of them is computed.
   Where the business maintains a rung by hand we read it; where it
   does not, the quote leaves a typed line for a person and says so.
   ============================================================ */

import {
  primaryImage,
  rowLabel,
  isPairFieldId,
  type CellValue,
  type EntityDef,
  type ImageRef,
  type RowData,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { newId, nowIso } from '@/lib/id'
import {
  getViewDef,
  joinRefFor,
  makeEngine,
  relatedRows,
  type Ctx,
  type JoinRef,
  type RelatedRow,
} from '@/features/views'
import { defaultColumns, formatCell, formatRange, rangePairs, splitUnit } from '@/features/views/columns'
import { freezeLevels, isCostColumn, looksMonetary, normName, priceAtLevel, defaultLevelKey } from './pricing'
import type { FrozenLevel, QuoteDef, QuoteLine, QuoteSection } from './types'

/* ---------------------------------------------------------- */
/* Reading the store, once                                    */
/* ---------------------------------------------------------- */

interface Live {
  ctx: Ctx
  engine: ReturnType<typeof makeEngine>
}

/** One snapshot of the live project, taken at the top of a pick.
 *  Deliberately NOT a hook and NOT memoised: every caller here is an
 *  event, not a render. */
function live(): Live {
  const { entities, rowsByEntity } = useProjectStore.getState()
  const ctx: Ctx = { entities, rowsByEntity }
  return { ctx, engine: makeEngine(ctx) }
}

const rowOf = (ctx: Ctx, entityId: string, rowId: string): RowData | undefined =>
  (ctx.rowsByEntity[entityId] ?? []).find((r) => r.id === rowId)

/* ---------------------------------------------------------- */
/* Provenance                                                 */
/* ---------------------------------------------------------- */

/** The seed's own `Source` cell — 'Boat Module!R282 KZ..LD'. It is
 *  the business's receipt: the sheet, row and columns a figure was
 *  read from, checkable against the workbook by hand.
 *
 *  Read by NAME because that is the convention the seed writes and
 *  there is no system field for it. Wrong-by-omission (no note) is
 *  the only way this can fail, and a missing note prints nothing. */
function sourceNoteOf(entity: EntityDef | undefined, row: RowData | undefined): string {
  if (!entity || !row) return ''
  const field = entity.fields.find((f) => f.type === 'text' && normName(f.name) === 'source')
  if (!field) return ''
  const v = row.values[field.id]
  return typeof v === 'string' ? v.trim() : ''
}

/* ---------------------------------------------------------- */
/* The join's own facts — the five-way association             */
/* ---------------------------------------------------------- */

/** The columns of the join row that are true of THIS motor on THIS
 *  hull and of neither alone: the rigging kit, the prop part number,
 *  the prop description, the engine hole and the slot.
 *
 *  This is the thing production loses. Its association is a fuzzy
 *  name match that fails open, so the rigging kit that belongs to a
 *  pairing quietly stops travelling with it. Here the join row's own
 *  columns are copied onto the line by value at pick time, and the
 *  document prints them under the line in mono.
 *
 *  The two link columns, the join's label column and the three pair
 *  system columns are excluded: they say which two rows this is
 *  about, which the line already says. The `Source` column is
 *  excluded from the FACTS and folded into the line's source note
 *  instead — a customer document should not carry a spreadsheet
 *  address, and the business should not lose it. */
function pairFactsOf(
  ctx: Ctx,
  join: JoinRef | null | undefined,
  joinRow: RowData | undefined,
): { facts: Array<{ label: string; value: string }>; source: string } {
  const facts: Array<{ label: string; value: string }> = []
  let source = ''
  if (!join || !joinRow) return { facts, source }
  const joinEntity = ctx.entities[join.entityId]
  if (!joinEntity) return { facts, source }

  const resolveRef = (refEntityId: string | undefined, rowId: string): string => {
    if (!refEntityId) return rowId
    const e = ctx.entities[refEntityId]
    const r = rowOf(ctx, refEntityId, rowId)
    return e && r ? rowLabel(e, r) : ''
  }

  for (const field of joinEntity.fields) {
    if (field.id === join.sourceFieldId || field.id === join.targetFieldId) continue
    if (field.id === join.labelFieldId) continue
    if (isPairFieldId(field.id)) continue
    if (field.type === 'image') continue
    const value = joinRow.values[field.id] ?? null
    if (normName(field.name) === 'source') {
      source = typeof value === 'string' ? value.trim() : ''
      continue
    }
    /* a boolean is only worth printing when it is TRUE: "Recommended
       No" on a line nobody recommended is noise a customer has to
       read past */
    if (typeof value === 'boolean') {
      if (value) facts.push({ label: field.name, value: 'Yes' })
      continue
    }
    const text = formatCell(field, value, resolveRef)
    if (text === '') continue
    facts.push({ label: field.name, value: text })
  }
  return { facts, source }
}

/* ---------------------------------------------------------- */
/* The subject's specs                                        */
/* ---------------------------------------------------------- */

/** The facts printed under the subject's name, frozen. The same
 *  reading the view page's spec strip makes — an envelope is ONE
 *  fact (`90–115 HP`), never two columns — with one addition: NO
 *  MONEY. A quote states its price in the money box and nowhere
 *  else, so a spec strip that repeated `Cash` beside the beam would
 *  be a second, unlabelled price on a customer's document. */
export function freezeSpecs(
  engine: ReturnType<typeof makeEngine>,
  entity: EntityDef,
  row: RowData,
  max = 5,
): Array<{ label: string; value: string }> {
  const values = engine.valuesOf({ entityId: entity.id, row })
  const read = (fieldId: string): CellValue => values[fieldId] ?? null
  const out: Array<{ label: string; value: string }> = []
  const used = new Set<string>(entity.hierarchy ?? [])

  const withUnit = (label: string, text: string, unit?: string) =>
    unit && unit.toLowerCase() !== label.toLowerCase()
      ? { label, value: `${text} ${unit}` }
      : { label, value: text }

  for (const pair of rangePairs(entity)) {
    used.add(pair.min.id)
    used.add(pair.max.id)
    if (looksMonetary(pair.label)) continue
    const text = formatRange(read(pair.min.id), read(pair.max.id), pair.min.name)
    if (text === '') continue
    out.push(withUnit(pair.label, text, splitUnit(pair.min.name).unit))
  }

  for (const fieldId of defaultColumns(entity, 12)) {
    if (out.length >= max) break
    if (used.has(fieldId)) continue
    const field = entity.fields.find((f) => f.id === fieldId)
    if (!field) continue
    if (looksMonetary(field.name) || isCostColumn(entity, field)) continue
    if (normName(field.name) === 'source') continue
    const text = formatCell(field, read(fieldId))
    if (text === '') continue
    const { base, unit } = splitUnit(field.name)
    out.push(withUnit(base, text, unit))
  }
  return out.slice(0, max)
}

/** The row's own photograph — index 0 of its first picture column,
 *  verbatim. It points at a third-party host and may 404; a missing
 *  photograph prints nothing and is never an error. */
function pictureOf(entity: EntityDef | undefined, row: RowData | undefined): ImageRef | undefined {
  if (!entity || !row) return undefined
  const field = entity.fields.find((f) => f.type === 'image')
  if (!field) return undefined
  return primaryImage(row.values[field.id] ?? null)
}

/* ---------------------------------------------------------- */
/* Minting one line                                           */
/* ---------------------------------------------------------- */

export interface MintLineArgs {
  ctx: Ctx
  engine: ReturnType<typeof makeEngine>
  entity: EntityDef
  row: RowData
  levelKey: string
  join?: JoinRef | null
  /** the join row that recorded the pick, when there was one */
  joinRow?: RowData
  recommended?: boolean
}

/** One line, frozen. Everything a document will ever print about it
 *  is copied here BY VALUE; the two ids it keeps are for "open this
 *  row on the sheet" and nothing else. */
export function mintLine(args: MintLineArgs): QuoteLine {
  const { ctx, engine, entity, row, levelKey, join, joinRow, recommended } = args
  const values = engine.valuesOf({ entityId: entity.id, row })
  const levels: FrozenLevel[] = freezeLevels(entity, values)
  const priced = priceAtLevel(levels, levelKey)
  const { facts, source: pairSource } = pairFactsOf(ctx, join, joinRow)

  const own = sourceNoteOf(entity, row)
  const sourceNote = [own, pairSource].filter((s) => s !== '').join(' · ')

  return {
    id: newId(),
    entityId: entity.id,
    rowId: row.id,
    ...(joinRow ? { pairRowId: joinRow.id } : {}),
    label: rowLabel(entity, row),
    qty: 1,
    unitPrice: priced.unitPrice,
    priceFieldId: priced.priceFieldId,
    priceColumnName: priced.priceColumnName,
    levelKey: priced.levelKey,
    levelResolved: priced.levelResolved,
    levels,
    ...(sourceNote !== '' ? { sourceNote } : {}),
    ...(facts.length > 0 ? { pairFacts: facts } : {}),
    ...(recommended ? { recommended: true } : {}),
    ...(pictureOf(entity, row) ? { image: pictureOf(entity, row) } : {}),
  }
}

/** A line that is not a row of anything — the workbook's own
 *  `Additional Dealer Options` (R136:Y151, eight of them). A typed
 *  label and a typed amount, and nothing else: the workbook turns
 *  typed HOURS into money at MV!$D$2 ($159/hr) and we do not have
 *  that rate, so we do not offer hours. */
export function mintFreeLine(label: string, amount: number | null, levelKey: string): QuoteLine {
  return {
    id: newId(),
    entityId: '',
    rowId: '',
    label,
    qty: 1,
    unitPrice: amount,
    priceFieldId: null,
    priceColumnName: null,
    levelKey,
    levelResolved: levelKey,
    levels: [],
  }
}

/* ---------------------------------------------------------- */
/* Minting a whole quote from a view page                      */
/* ---------------------------------------------------------- */

export interface MintQuoteArgs {
  viewId: string
  rowId: string
  reference: string
  levelKey?: string
  preparedBy?: string
}

/** The subject's own section. It is not a view block — the subject
 *  IS the page — so it needs an id no block can collide with, and
 *  the picker must never offer candidates for it: there is exactly
 *  one boat on a quote for one boat. */
export const SUBJECT_BLOCK = '__subject'

/**
 * The view page mints the quote.
 *
 * The salesperson never configures twice: the curated menu — the
 * star, the order, the rigging kit and prop sitting on the join row —
 * is carried straight onto a document by this function. What the
 * quote adds is the three things the view page must never have: a
 * customer, a price level, and a moment.
 *
 * A STARRED ROW BECOMES A LINE IMMEDIATELY. Nothing else does:
 * "everything that fits" is a menu, not an order, and a quote that
 * opened with six motors on it would be wrong six times over.
 */
export function mintQuoteFromView(args: MintQuoteArgs): QuoteDef | null {
  const { ctx, engine } = live()
  const view = getViewDef(args.viewId)
  if (!view) return null
  const root = ctx.entities[view.rootTableId]
  const row = root ? rowOf(ctx, root.id, args.rowId) : undefined
  if (!root || !row) return null

  const levelKey = args.levelKey ?? defaultLevelKey(root)

  /* THE SUBJECT IS A LINE TOO. The hull is the first thing on the
     workbook's own package and the first thing a customer looks for.
     Leaving it out of `lines` would mean the total silently excluded
     the boat, and would give the money box two kinds of number to
     add — one list, one summation, or the disagreement starts here. */
  const subjectLine = mintLine({ ctx, engine, entity: root, row, levelKey })
  const lines: QuoteLine[] = [subjectLine]
  const sections: QuoteSection[] = [
    {
      blockId: SUBJECT_BLOCK,
      tableId: root.id,
      title: root.name,
      lineIds: [subjectLine.id],
    },
  ]

  /* TOP-LEVEL BLOCKS ONLY, in the view's own order. A nested block
     (accessories under each motor) describes what goes with a LINE
     rather than with the subject, and a section per motor per
     accessory is a shape this document does not have. Named in
     index.ts as a limit rather than left as a surprise. */
  for (const block of view.blocks) {
    const target = ctx.entities[block.tableId]
    if (!target) continue
    const join = joinRefFor(ctx.entities, block.joinTableId, root.id, target.id)
    const result = relatedRows({
      ctx,
      engine,
      sourceEntity: root,
      sourceRow: row,
      targetEntityId: target.id,
      rule: block.rule,
      join,
    })
    /* WHICH OF THE PICKED ROWS COMES ACROSS.
       A block is a MENU, not a bill of materials: "4 picked" on a
       motor block means four motors this hull may be sold with, and a
       rig has one motor. So bringing all four onto the quote would be
       wrong, and the first version of this brought only the STARRED
       ones — which is right when a star exists and silently wrong when
       none does. A Coaster 540 with four picked Yamahas and no star
       produced a quote reading "Nothing from Yamaha Outboards on this
       quote yet", dropping four deliberate choices without a word, and
       breaking the one promise this feature makes: that a salesperson
       never configures twice.

       So: the star wins when there is one. Failing that, a single
       picked row is unambiguous and comes across. Anything else is a
       real choice and is left for a person — but `pickedCount` records
       how many were waiting, so the section can SAY it rather than
       show an empty shelf. Silence was the defect, not the arithmetic. */
    const starred = result.rows.filter((r) => r.recommended)
    const chosen =
      starred.length > 0 ? starred : result.rows.length === 1 ? result.rows : []

    const made = chosen.map((r) =>
      mintLine({
        ctx,
        engine,
        entity: target,
        row: r.row,
        levelKey,
        join,
        joinRow: joinRowOf(ctx, join, r),
        recommended: r.recommended,
      }),
    )
    lines.push(...made)
    sections.push({
      blockId: block.id,
      tableId: target.id,
      title: target.name,
      lineIds: made.map((l) => l.id),
      /* how many the view had picked, so an empty section can explain
         itself instead of looking like nothing was ever configured */
      pickedCount: result.rows.length,
    })
  }

  const now = nowIso()
  return {
    id: newId(),
    reference: args.reference,
    state: 'draft',
    viewId: view.id,
    rootTableId: root.id,
    rootRowId: row.id,
    subjectLabel: rowLabel(root, row),
    subjectSpecs: freezeSpecs(engine, root, row),
    ...(pictureOf(root, row) ? { subjectImage: pictureOf(root, row) } : {}),
    sections,
    lines,
    adjustments: [],
    levelKey,
    /* the customer's name is an INSTRUCTION on the screen, never a
       value here: an empty string is what "nobody has typed it yet"
       looks like, and no document prints a name we invented */
    customer: { name: '' },
    ...(args.preparedBy ? { preparedBy: args.preparedBy } : {}),
    organisation: useProjectStore.getState().meta.org?.name,
    createdAt: now,
    updatedAt: now,
  }
}

const joinRowOf = (ctx: Ctx, join: JoinRef | null, r: RelatedRow): RowData | undefined =>
  join && r.pair ? rowOf(ctx, join.entityId, r.pair.rowId) : undefined

/* ---------------------------------------------------------- */
/* Candidates — PICK TIME ONLY                                */
/* ---------------------------------------------------------- */

export interface Candidate {
  /** already frozen: picking it is one push, no second read */
  line: QuoteLine
  /** the line on the quote this candidate is already on, if any */
  alreadyLineId?: string
}

/** How many candidates a section offers before it asks you to narrow
 *  it on the sheet. */
export const OFFER_CAP = 40

/**
 * The rows a section could still take, exactly as the view page
 * ordered them, each already priced and frozen.
 *
 * THIS READS LIVE DATA, and that is correct: picking a row is the
 * act of minting, not the act of rendering. Nothing on a drawn quote
 * calls it. It is named `candidatesFor` and not `rowsFor` for that
 * reason — a candidate is not yet part of the quote.
 *
 * The list is the same list the salesperson already knows from the
 * view page, in the same order, with the join's own facts attached,
 * so the workbook's recommended slot is visible even where the star
 * was never written (see index.ts, "what this feature wants").
 */
export function candidatesFor(quote: QuoteDef, section: QuoteSection): Candidate[] {
  /* there is exactly one boat on a quote for one boat */
  if (section.blockId === SUBJECT_BLOCK) return []
  const { ctx, engine } = live()
  const view = getViewDef(quote.viewId)
  const root = ctx.entities[quote.rootTableId]
  const row = root ? rowOf(ctx, root.id, quote.rootRowId) : undefined
  const target = ctx.entities[section.tableId]
  if (!view || !root || !row || !target) return []

  const block = view.blocks.find((b) => b.id === section.blockId)
  const join = joinRefFor(ctx.entities, block?.joinTableId, root.id, target.id)
  const result = relatedRows({
    ctx,
    engine,
    sourceEntity: root,
    sourceRow: row,
    targetEntityId: target.id,
    rule: block?.rule,
    join,
  })

  const onQuote = new Map(
    quote.lines.filter((l) => l.entityId === target.id).map((l) => [l.rowId, l.id]),
  )

  /* A curated block is a handful of rows; a block showing a whole
     table can be four hundred, and a quote is not a catalogue. The
     cap is on the OFFER, never on the quote. */
  return result.rows.slice(0, OFFER_CAP).map((r) => {
    const already = onQuote.get(r.row.id)
    return {
      line: mintLine({
        ctx,
        engine,
        entity: target,
        row: r.row,
        levelKey: quote.levelKey,
        join,
        joinRow: joinRowOf(ctx, join, r),
        recommended: r.recommended,
      }),
      ...(already ? { alreadyLineId: already } : {}),
    }
  })
}

/** True when the table a section was drawn for is still on the sheet.
 *  When it is not, the section still prints — the quote never needed
 *  it — and the picker says so in the sentence the view stage uses. */
export const sectionTableIsGone = (section: QuoteSection): boolean =>
  !useProjectStore.getState().entities[section.tableId]

/* ---------------------------------------------------------- */
/* "Re-read today's prices" — shown as a diff, never applied    */
/* ---------------------------------------------------------- */

export interface PriceChange {
  lineId: string
  label: string
  from: number | null
  to: number | null
  /** the freshly frozen rungs, ready to replace the line's own */
  levels: FrozenLevel[]
  priceColumnName: string | null
  /** the row is no longer on the sheet, so there is nothing to read */
  gone: boolean
}

/**
 * What today's price file would do to this quote.
 *
 * A silent restatement is worse than a stale number, because the
 * salesperson believes the page. So this returns a DIFF and changes
 * nothing; applying it is a second, separate decision (see
 * `applyPriceChanges` in quotes.ts).
 *
 * A line whose row has left the sheet is reported as `gone` and is
 * never zeroed: the frozen figure stands, because the quote never
 * needed the row to print.
 */
export function priceChanges(quote: QuoteDef): PriceChange[] {
  const { ctx, engine } = live()
  const out: PriceChange[] = []
  for (const line of quote.lines) {
    if (line.entityId === '' || line.rowId === '') continue /* a typed line has no source */
    const entity = ctx.entities[line.entityId]
    const row = entity ? rowOf(ctx, entity.id, line.rowId) : undefined
    if (!entity || !row) {
      out.push({
        lineId: line.id,
        label: line.label,
        from: line.unitPrice,
        to: line.unitPrice,
        levels: line.levels,
        priceColumnName: line.priceColumnName,
        gone: true,
      })
      continue
    }
    const levels = freezeLevels(entity, engine.valuesOf({ entityId: entity.id, row }))
    const priced = priceAtLevel(levels, quote.levelKey)
    if (priced.unitPrice === line.unitPrice) continue
    out.push({
      lineId: line.id,
      label: line.label,
      from: line.unitPrice,
      to: priced.unitPrice,
      levels,
      priceColumnName: priced.priceColumnName,
      gone: false,
    })
  }
  return out
}

/* ---------------------------------------------------------- */
/* The reference                                              */
/* ---------------------------------------------------------- */

/** A quote's own reference: the date it was made and its position in
 *  that day, e.g. `20260810-02`.
 *
 *  DELIBERATELY NOT a running number like `Q-1042`. That would state
 *  a numbering scheme the business has not told us about, and a
 *  reference on a customer's document that implies a sequence the
 *  dealership does not keep is a fabricated fact. This one says only
 *  what it can prove — when, and which of that day's — and it is
 *  editable, so a business with its own scheme types it. */
export function referenceFor(date: Date, nth: number): string {
  const p = (n: number, w = 2): string => String(n).padStart(w, '0')
  const stamp = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`
  return `${stamp}-${p(nth)}`
}

/** "Open this row on the sheet" — the one live thing the ids are
 *  kept for. Returns the entity when it is still there, so a caller
 *  can say the sentence the view stage says when it is not. */
export function subjectStillOnSheet(quote: QuoteDef): EntityDef | undefined {
  const { entities } = useProjectStore.getState()
  const entity = entities[quote.rootTableId]
  if (!entity) return undefined
  const row = (useProjectStore.getState().rowsByEntity[quote.rootTableId] ?? []).find(
    (r) => r.id === quote.rootRowId,
  )
  return row ? entity : undefined
}
