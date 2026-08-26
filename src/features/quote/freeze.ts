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
  displayFieldOf,
  isDiscontinued,
  isRetired,
  primaryImage,
  rowLabel,
  PAIR_ORDER_FIELD,
  PAIR_ORIGIN_FIELD,
  PAIR_RECOMMENDED_FIELD,
  type CellValue,
  type EntityDef,
  type ImageRef,
  type RowData,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { newId, nowIso } from '@/lib/id'
import {
  getViewDef,
  isCuratedOnly,
  joinRefFor,
  makeEngine,
  relatedRows,
  sellableRows,
  type Ctx,
  type JoinRef,
  type RelatedRow,
} from '@/features/views'
/* DEEP, for the same reason `crm/customers` is deep below: `describe`
   is the pure half of the view feature — no store, no React — and the
   barrel does not export the two word-benders a sentence needs. */
import { describeRule, plural, ruleReason } from '@/features/views/describe'
/* THE MEASUREMENTS, READ AND NEVER TYPED. `ruleLedger` imports only
   `@/types/model` and one table name; it touches no store and no React,
   so reading it here closes no cycle. Every figure in it is asserted
   against its own seed's source line by `ruleLedger.test.ts`. */
import { holdRate, ledgerFor } from '@/features/constraints/ruleLedger'
import { bandOf, defaultColumns, formatCell, formatRange, rangePairs, splitUnit } from '@/features/views/columns'
/* DEEP IMPORT, DELIBERATELY. `@/features/crm` draws customer screens
   that read quotes, so its barrel imports this feature; reaching for
   the barrel here would close that circle. `crm/customers` is the
   pure half — no store, no React, no import of ours — and importing
   the leaf rather than the package is the same move QuoteEditor
   already makes with `@/features/views/sellable`. */
import {
  CUSTOMER_CONTACT_FIELDS,
  customerRegister,
  readCustomer,
  readCustomers,
  type CustomerRead,
} from '@/features/crm/customers'
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
 *  The two link columns and the join's label column are excluded:
 *  they say which two rows this is about, which the line already
 *  says. The `Source` column is excluded from the FACTS and folded
 *  into the line's source note instead — a customer document should
 *  not carry a spreadsheet address, and the business should not lose
 *  it.
 *
 *  THE THREE PAIR SYSTEM COLUMNS ARE NOT ONE DECISION, and treating
 *  them as one is how the fifth fact went missing. When the seed
 *  declared its own `Slot` column this printed `Slot 1`; the seed was
 *  then corrected to emit the model's own `__order` (so `readPairs`
 *  could see the star at all), and a blanket `isPairFieldId` skip
 *  silently dropped the slot with it. So, each on its own terms:
 *
 *    __order        KEPT, as `Slot`. It is the fifth member of the
 *                   association and it is the PAIR'S IDENTITY —
 *                   (boat, motor) is not unique and neither is
 *                   (boat, motor, rigging kit); a UNIQUE constraint
 *                   on the first deletes 641 of 4,018 live offerings
 *                   and on the second 392 (FITMENT_RULES.md §1.4).
 *                   Two lines for the same motor differ by this and
 *                   by the kit, and nothing else. It is labelled
 *                   `Slot` rather than by the column's generic name
 *                   because `Order 3` on a customer's page reads as
 *                   an order number, and `slot` is the word the
 *                   workbook itself uses for the thirteen of them.
 *    __recommended  skipped — it is on the line as `recommended` and
 *                   drawn as a star, and "Recommended No" under a
 *                   line nobody recommended is noise.
 *    __origin       skipped — 'rule' where the sheet POINTED at the
 *                   row and 'added' where a person typed it is
 *                   provenance about the CATALOGUE, not a fact about
 *                   the goods. It stays on the join row, which is
 *                   where the view page reads and draws it. */
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
    if (field.id === PAIR_ORIGIN_FIELD || field.id === PAIR_RECOMMENDED_FIELD) continue
    if (field.id === PAIR_ORDER_FIELD) {
      const slot = joinRow.values[field.id]
      if (typeof slot === 'number' && Number.isFinite(slot)) {
        facts.push({ label: 'Slot', value: String(slot) })
      }
      continue
    }
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
    const text = formatCell(field, value, resolveRef, bandOf(joinEntity, field))
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
      /* and how many it declined to offer because they are no longer
         sold. `relatedRows` has already held those back — the star on
         a discontinued row is cleared there, so this loop can never
         mint a line for one — and this records the number so the
         section can SAY it rather than be shorter without a word. */
      ...(result.heldCount > 0 ? { heldCount: result.heldCount } : {}),
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
  /** THIS ROW IS OUTSIDE THE NARROWING, and is being offered anyway
   *  because a person searched past it or asked to see the whole
   *  catalogue. Set only by `stepOffer`; `candidateOffer` never
   *  leaves the narrowed list, so it never sets this.
   *
   *  It exists so the card can SAY so. Production's trailer step has
   *  no catalogue browse at all — "operators assign trailers in the
   *  boat model editor" — so a salesperson who needs a trailer the
   *  model never named must abandon the build. Ours can reach the
   *  whole table from every step; what it may not do is let a row the
   *  price file never paired with this hull look like one it did. */
  outside?: true
}

/** What a section may still take, and what it refused to offer.
 *
 *  The refusal is returned rather than swallowed. A picker that
 *  silently drops three of eight is the failure this whole change
 *  exists to prevent: the salesperson looks at five and believes
 *  that is the menu, and nobody can answer "where did the trailer
 *  go?". The sentence the editor prints comes from `@/features/views`
 *  so the page and the quote say the same words. */
export interface Offer {
  candidates: Candidate[]
  /** rows held back because they are no longer sold */
  heldCount: number
  /** 'table' — the related table is history rather than stock;
   *  'pairs' — the list recording which of its rows go with this one
   *  is. Absent when the reason is individual rows. */
  historic?: 'table' | 'pairs'
  /**
   * THE THREE FIGURES `@/features/curation` NEEDS, and the reason
   * they come back from here rather than being counted again on the
   * screen: a picker that worked out its own denominator would be a
   * second, quieter answer to "how many trailers are there", and two
   * numbers for one question is the fault the whole mechanism exists
   * to end.
   *
   *   `pool`    every live row of the table, before anything narrowed it
   *   `matched` what the block's rule admitted — offered plus held back
   *
   * `candidates.length` is the third, and it is capped at `OFFER_CAP`,
   * so a surface reads `offered` off `matched - heldCount` rather than
   * off the list it drew.
   */
  pool: number
  matched: number
  /** the block rule, as a clause a sentence can sit "because" in front
   *  of — '' when nothing narrowed this section at all */
  reason: string
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
export function candidateOffer(quote: QuoteDef, section: QuoteSection): Offer {
  const none: Offer = { candidates: [], heldCount: 0, pool: 0, matched: 0, reason: '' }
  /* there is exactly one boat on a quote for one boat */
  if (section.blockId === SUBJECT_BLOCK) return none
  const { ctx, engine } = live()
  const view = getViewDef(quote.viewId)
  const root = ctx.entities[quote.rootTableId]
  const row = root ? rowOf(ctx, root.id, quote.rootRowId) : undefined
  const target = ctx.entities[section.tableId]
  if (!view || !root || !row || !target) return none

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

  /* A CANDIDATE IS A PAIRING, NOT A ROW.
     The same motor is offered against one hull more than once often
     enough that (boat, motor) is not a key: a UNIQUE constraint on it
     deletes 641 of 4,018 live offerings, and adding the rigging kit
     still deletes 392 (FITMENT_RULES.md §1.4). `Highfield ADV7` slots
     4–9 are all F250XSB2, told apart by six Helm Master rigging
     packages. So "already on the quote" is keyed on the JOIN ROW —
     the pairing — and falls back to the row id for a block that has
     no join at all, and for lines minted before `pairRowId` existed.
     Keyed on the row id alone, picking one of those six would grey
     out the other five. */
  const onQuote = new Map<string, string>()
  for (const line of quote.lines) {
    if (line.entityId !== target.id) continue
    onQuote.set(line.pairRowId ?? line.rowId, line.id)
  }

  /* A curated block is a handful of rows; a block showing a whole
     table can be four hundred, and a quote is not a catalogue. The
     cap is on the OFFER, never on the quote.

     `relatedRows` has already held back everything that is no longer
     sold, so nothing discontinued can be minted from here — and it
     hands back how many, which the editor states in words. */
  const candidates = result.rows.slice(0, OFFER_CAP).map((r) => {
    const already = onQuote.get(r.pair?.rowId ?? r.row.id)
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

  return {
    candidates,
    heldCount: result.heldCount,
    ...(result.historic ? { historic: result.historic } : {}),
    /* THE DENOMINATOR IS THE LIVE TABLE, and it is counted here so the
       picker never counts it again. `sellableRows` is not used for it:
       the rows no longer sold are part of the accounting the curation
       note prints, not something to quietly leave out of the total. */
    pool: (ctx.rowsByEntity[target.id] ?? []).length,
    matched: result.rows.length + result.heldCount,
    reason: ruleReason(block?.rule, root, target),
  }
}

/** The candidates alone, for callers that do not draw the refusal.
 *  `candidateOffer` is the one to reach for on a screen: a picker
 *  that shows five of eight without saying so is the defect. */
export function candidatesFor(quote: QuoteDef, section: QuoteSection): Candidate[] {
  return candidateOffer(quote, section).candidates
}

/* ---------------------------------------------------------- */
/* One step of a build — the narrowing, and the way past it    */
/* ---------------------------------------------------------- */

/**
 * WHAT ONE STEP OFFERS, AND WHAT IT IS HOLDING BACK.
 *
 * `candidateOffer` above answers "what may this section still take",
 * which is the right question for a picker inside a document. A STEP
 * asks a harder one, because it is the whole of what a salesperson can
 * see at that moment, and three of production's cited failures are
 * failures of exactly this answer:
 *
 *   · the motor grid inside a boat quote is unsearchable and unsorted
 *     (highfield-quote-flow.tsx:1225-1226, 2875 — search exists, but
 *     only in motor-only mode);
 *   · the trailer step has no catalogue browse AT ALL, so a trailer
 *     the model never named cannot be reached without abandoning the
 *     build (`:3085-3088`);
 *   · curation elsewhere hides silently and offers no way back
 *     (hl-journeys.md §4).
 *
 * So this returns the narrowed list AND the way past it, in one shape,
 * with every figure it took to get there:
 *
 *   `narrowed`   what the rule or the pairings leave
 *   `catalogue`  live rows the table holds, narrowing ignored
 *   `matched`    what the current search and switch actually select
 *   `capped`     whether `OFFER_CAP` trimmed the list that is drawn
 *
 * SEARCH IGNORES THE NARROWING, always — that is the half of the
 * step-5 pattern most easily lost, because it is the half that costs
 * a second pool. A typed query searches the whole live table and marks
 * anything outside the narrowing `outside`, so a person can find the
 * trailer they know the name of without being told it does not exist,
 * and can still see that the price file never paired it with this hull.
 */
export interface StepOffer {
  candidates: Candidate[]
  /** offerings the narrowing leaves — pairings, not distinct rows.
   *  `CurationCounts.offered`. */
  narrowed: number
  /** live rows the table holds, narrowing ignored */
  catalogue: number
  /** EVERY row of the table, before anything narrowed it and before
   *  the discontinued contract held anything back — `CurationCounts.
   *  pool`. It is not `catalogue`: the rows no longer sold are part of
   *  the accounting the curation note prints, not something to quietly
   *  leave out of the denominator. */
  pool: number
  /** what the narrowing ADMITTED — the offered rows plus the ones the
   *  discontinued contract then withheld. `CurationCounts.matched`,
   *  and the number that makes `pool = offered + narrowedOut +
   *  withheld` add up. */
  admitted: number
  /** matches for the current search that sit OUTSIDE the narrowing —
   *  the figure `reachNote` prints, and the whole of what makes a
   *  search "past" a narrowing rather than merely inside it. */
  beyond: number
  /** what the current search and switch select, before the cap */
  matched: number
  /** true when `OFFER_CAP` trimmed what is drawn */
  capped: boolean
  /** rows held back because they are no longer sold */
  heldCount: number
  historic?: 'table' | 'pairs'
  /**
   * THE NARROWING, AS A CLAUSE — "HP is between this boat's Min HP
   * and Max HP" — for `@/features/curation` to sit the word "because"
   * in front of.
   *
   * It comes back from here rather than being re-derived on the
   * screen for the same reason the counts do: a step that explained
   * its narrowing in words it worked out separately from the rule it
   * actually ran would be one refactor away from explaining the wrong
   * one. '' when nothing narrowed this step at all.
   *
   * OPTIONAL, so a caller holding its own empty literal for the
   * not-yet-picked case does not have to know about it.
   */
  reason?: string
}

const EMPTY_STEP_OFFER: StepOffer = {
  candidates: [],
  narrowed: 0,
  catalogue: 0,
  pool: 0,
  admitted: 0,
  beyond: 0,
  matched: 0,
  capped: false,
  heldCount: 0,
  reason: '',
}

/** Every typed word must appear somewhere in the row's own text.
 *  Word by word rather than as one string, for the reason the view
 *  stage's rail records: "Sport 560" is not a substring of
 *  "sport ▸ sp560 highfield - sp560 (pvc)" and a whole-string test
 *  answers "nothing matches" for a row two screens down. */
const needlesOf = (query: string): string[] =>
  query.trim().toLowerCase().split(/\s+/).filter((w) => w !== '')

/** The text a search runs over: the row's name, its grouping trail,
 *  and the join's own facts where there is a pairing. Built off the
 *  row rather than off a minted line, so searching a 434-row table
 *  does not freeze 434 lines to throw 422 of them away. */
function haystack(ctx: Ctx, entity: EntityDef, r: RelatedRow, join: JoinRef | null): string {
  const parts: string[] = [rowLabel(entity, r.row)]
  for (const fieldId of entity.hierarchy ?? []) {
    const v = r.row.values[fieldId]
    if (typeof v === 'string' || typeof v === 'number') parts.push(String(v))
  }
  const joinRow = joinRowOf(ctx, join, r)
  if (joinRow) {
    const { facts } = pairFactsOf(ctx, join ?? null, joinRow)
    for (const f of facts) parts.push(f.value)
  }
  return parts.join(' ').toLowerCase()
}

export interface StepOfferOptions {
  /** show the whole live table, narrowing switched off */
  all?: boolean
  /** a search that ignores the narrowing entirely */
  query?: string
}

export function stepOffer(
  quote: QuoteDef,
  section: QuoteSection,
  options: StepOfferOptions = {},
): StepOffer {
  if (section.blockId === SUBJECT_BLOCK) return EMPTY_STEP_OFFER
  const { ctx, engine } = live()
  const view = getViewDef(quote.viewId)
  const root = ctx.entities[quote.rootTableId]
  const row = root ? rowOf(ctx, root.id, quote.rootRowId) : undefined
  const target = ctx.entities[section.tableId]
  if (!view || !root || !row || !target) return EMPTY_STEP_OFFER

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

  /* THE WHOLE TABLE, ON THE SAME TERMS THE NARROWED LIST WAS BUILT ON.
     A row the discontinued contract holds back is held back here too —
     "see all" means the whole CATALOGUE, never the whole sheet, and a
     retired table offers nothing at all however hard anybody looks. */
  const live_rows = result.historic ? [] : sellableRows(ctx.rowsByEntity[target.id] ?? [])
  const inList = new Set(result.rows.map((r) => r.row.id))
  const extras: RelatedRow[] = live_rows
    .filter((r) => !inList.has(r.id))
    .map((r, i) => ({ row: r, origin: 'added' as const, recommended: false, sortKey: i }))

  const needles = needlesOf(options.query ?? '')
  const searching = needles.length > 0
  /* the switch and the search both reach past the narrowing; nothing
     else does, so the default list is exactly the curated one */
  const reachable: RelatedRow[] =
    searching || options.all === true ? [...result.rows, ...extras] : result.rows

  const selected = searching
    ? reachable.filter((r) => {
        const hay = haystack(ctx, target, r, join)
        return needles.every((n) => hay.includes(n))
      })
    : reachable

  /* PROPERTY 2, AS A NUMBER. How many of the search's hits the
     narrowing is standing in front of — what `reachNote` prints, and
     the difference between a search that ignores a narrowing and one
     that merely says it does. */
  let beyond = 0
  if (searching) for (const r of selected) if (!inList.has(r.row.id)) beyond += 1

  const onQuote = new Map<string, string>()
  for (const line of quote.lines) {
    if (line.entityId !== target.id) continue
    onQuote.set(line.pairRowId ?? line.rowId, line.id)
  }

  const candidates = selected.slice(0, OFFER_CAP).map((r) => {
    const already = onQuote.get(r.pair?.rowId ?? r.row.id)
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
      ...(inList.has(r.row.id) ? {} : { outside: true as const }),
    }
  })

  return {
    candidates,
    narrowed: result.rows.length,
    catalogue: live_rows.length,
    /* THE DENOMINATOR IS THE WHOLE TABLE, held-back rows included —
       the same reading `candidateOffer` above makes, so the two
       pickers can never print two different totals for one table. */
    pool: (ctx.rowsByEntity[target.id] ?? []).length,
    admitted: result.rows.length + result.heldCount,
    beyond,
    matched: selected.length,
    capped: selected.length > OFFER_CAP,
    heldCount: result.heldCount,
    ...(result.historic ? { historic: result.historic } : {}),
    reason: ruleReason(block?.rule, root, target),
  }
}

/* ---------------------------------------------------------- */
/* Why this list — and what the price file measures about it   */
/* ---------------------------------------------------------- */

/**
 * WHY A STEP IS SHOWING WHAT IT IS SHOWING, in the operator's words,
 * with the measurement behind it where the price file carries one.
 *
 * hl-journeys.md §4 names the one interaction in either production
 * journey that is unambiguously right, and states it as a rule rather
 * than a widget: a filter that can EXPLAIN ITSELF, be SEARCHED PAST
 * and be SWITCHED OFF, with the hidden count said out loud. `stepOffer`
 * above is the searching and the switching. This is the explaining.
 *
 * WE CAN DO THE EXPLAINING BETTER THAN PRODUCTION CAN, and the reason
 * is data rather than design: their curation toolbar names its rules in
 * a tooltip and stops there, because there is no measurement to quote.
 * Ours were adjudicated against the price file cell by cell and every
 * one carries a rate. `RULE_LEDGER` holds them, `ruleLedger.test.ts`
 * asserts each figure appears verbatim in its seed's own source line,
 * and NOTHING IS TYPED HERE — this file selects an entry and reads it.
 *
 * WHICH ENTRY, AND WHY ONLY THESE TWO. A measurement may be shown
 * beside a list only when it is a measurement OF THAT LIST. F8 is a
 * finding about boat×trailer pairings and A1 about boat×motor
 * pairings; both are facts about exactly the pairings a step of that
 * kind draws. Nothing else in the ledger is about a pairing a step
 * shows, so nothing else is offered, and a step over a table this
 * project has never measured says the count and the rule and stops.
 */
export interface StepMeasure {
  /** the adjudication's reference — 'F8', 'A1' */
  ref: string
  /** '581 of 581' — the adjudication's own numerator and denominator */
  holds: string
  /** the derived percentage, never typed */
  rate: string
  /** what was counted, in the dealer's words */
  of: string
  /** the qualification that may never be separated from the figure */
  caveat: string
  /**
   * THE ONE-CLAUSE FORM, for `@/features/curation` to carry on its
   * chip and to sit the word "it" in front of inside a sentence.
   *
   * The full reading above is a plate of its own and does not fit on
   * a chip; a chip with no rate at all gives away the one advantage
   * this app has over the flow it is answering. So: both, from the
   * same two numbers, composed here rather than in either screen.
   */
  clause: string
}

/** WHY A STEP'S LIST IS THE LENGTH IT IS, in the vocabulary
 *  `@/features/curation` reads. `what` is a clause with no leading
 *  capital and no trailing stop, because the mechanism puts "because"
 *  in front of it and a full stop after it. */
export interface StepReason {
  /** the table this step is about, as the dealer named it */
  tableName: string
  /** what narrowed the list, in the operator's words */
  what: string
  /** the list that carries the pairings, where the narrowing is one */
  via?: string
  /** what the price file measures about pairings of this kind */
  measured?: StepMeasure
}

/** The ledger entry whose finding is about the pairings THIS step
 *  draws, or null. Deliberately a short, closed map: see the header. */
function measureFor(root: EntityDef, target: EntityDef): StepMeasure | null {
  if (root.kind !== 'boat') return null
  const ref = target.kind === 'trailer' ? 'F8' : target.kind === 'motor' ? 'A1' : null
  if (ref === null) return null
  const entry = ledgerFor(ref)
  if (!entry?.measure) return null
  const rate = holdRate(entry.measure)
  return {
    ref,
    holds: `${entry.measure.held.toLocaleString()} of ${entry.measure.tested.toLocaleString()}`,
    rate,
    of: entry.measure.of,
    caveat: entry.caveat,
    clause: `holds at ${rate} across the price file (${ref})`,
  }
}

export function stepReason(quote: QuoteDef, section: QuoteSection): StepReason | null {
  if (section.blockId === SUBJECT_BLOCK) return null
  const { entities } = useProjectStore.getState()
  const view = getViewDef(quote.viewId)
  const root = entities[quote.rootTableId]
  const target = entities[section.tableId]
  if (!view || !root || !target) return null

  const block = view.blocks.find((b) => b.id === section.blockId)
  const join = joinRefFor(entities, block?.joinTableId, root.id, target.id)
  const joinName = join ? entities[join.entityId]?.name : undefined
  const measured = measureFor(root, target)

  /* CURATED IS THE COMMON CASE ON THIS SHEET and it is not a rule at
     all: the join rows ARE the menu, so `ruleReason` — correctly, for
     a list somebody built by hand — answers "this list is picked by
     hand rather than by a rule". On this sheet it was not picked by
     hand: it was read out of the price file, and the list that
     recorded it HAS A NAME. Naming it is both more useful and more
     checkable, and it is a fact rather than a characterisation.
     Without a join there is nothing to name and the rule's own words
     stand. */
  const what =
    joinName && block !== undefined && isCuratedOnly(block.rule)
      ? `${joinName} names which ones go with this one`
      : block === undefined
        ? `nothing narrows this list — every ${plural(target.name)} row is offered`
        : ruleReason(block.rule, root, target)

  return {
    tableName: target.name,
    what,
    ...(joinName ? { via: joinName } : {}),
    ...(measured ? { measured } : {}),
  }
}

/**
 * Why raising a NEW quote for this row would be wrong, in one
 * sentence — or '' when there is no reason.
 *
 * A LIVE READ, and deliberately not a refusal. Two things must both
 * be true and only one of them is a filter:
 *
 *   · a salesperson must not be handed a discontinued hull as though
 *     it were stock, so any surface offering "quote this one" says
 *     this sentence instead of quietly doing nothing — a dead button
 *     is the failure, not the fix
 *   · an existing quote naming that hull must still open, still
 *     total, still print and still be superseded, so nothing here
 *     is consulted by `makeNewVersion`, by the document, or by any
 *     line already minted
 *
 * The one legitimate re-quote of retired stock — a customer buying
 * the last one on the floor — goes through "Make a new version" of
 * the quote that already names it, which copies frozen lines and
 * never comes near this function.
 */
export function unsellableSubject(rootTableId: string, rootRowId: string): string {
  const { entities, rowsByEntity } = useProjectStore.getState()
  const entity = entities[rootTableId]
  if (!entity) return ''
  if (isRetired(entity)) {
    return `${entity.name} is history rather than stock. Nothing in it should be offered to a customer — its rows stay on the sheet so the quotes already written against them still open.`
  }
  const row = (rowsByEntity[rootTableId] ?? []).find((r) => r.id === rootRowId)
  if (!row || !isDiscontinued(row)) return ''
  return `${rowLabel(entity, row)} is no longer sold. It stays on the sheet and every quote already written against it still opens — but it should not be put in front of a customer as something they can buy. Clear its Discontinued box on the sheet if the business has brought it back.`
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

/* ---------------------------------------------------------- */
/* The customer — read live, written by value                 */
/* ---------------------------------------------------------- */

/**
 * WHY THE CUSTOMER PICKER LIVES IN THIS FILE AND NOWHERE ELSE.
 *
 * This feature keeps `useProjectStore` to exactly one file so that
 * no drawn quote can touch live data, and a customer is live data:
 * the register is an ordinary table a person types into all day.
 * Picking one is a PICK, in the same sense a candidate line is —
 * "The ONE place that reads live data is the candidate list — which
 * is the picker, and a candidate is not part of the quote until it
 * is minted" (QuoteEditor's own header). So the picker reads here,
 * at pick time, and what it hands back is already frozen.
 *
 * The pure half of this — which table is the register, which of its
 * columns may be printed, how a row is read and how a query is
 * matched — is `@/features/crm/customers`, which imports nothing
 * and reads nothing. This file supplies the only thing that file
 * refuses to: the current state of somebody's project.
 */

/** Everybody in the register, right now, or [] when the project has
 *  no register yet. An empty book is a normal state and never an
 *  error: the field falls back to a typed name, which is how every
 *  quote in this app was addressed before there was a register. */
export function customerBook(): CustomerRead[] {
  const { entities, rowsByEntity } = useProjectStore.getState()
  const table = customerRegister(entities)
  if (!table) return []
  return readCustomers(table, rowsByEntity[table.id] ?? [])
}

/** True when this project has somewhere to put a customer. The
 *  quote screen asks so it can offer to FILE a typed name rather
 *  than silently doing nothing with it. */
export const hasCustomerRegister = (): boolean =>
  customerRegister(useProjectStore.getState().entities) !== undefined

/** What a quote records when a customer is picked: the details BY
 *  VALUE, and the row id beside them.
 *
 *  Read once, here, and never again. Everything the document prints
 *  is in `customer`; `customerRef` is the "open this row" pointer
 *  and is read by exactly one screen, to answer "what else have we
 *  quoted them?". Returns null when the row has gone, so the caller
 *  says so instead of writing a link to nothing. */
export function freezeCustomer(
  rowId: string,
): Pick<QuoteDef, 'customer' | 'customerRef'> | null {
  const { entities, rowsByEntity } = useProjectStore.getState()
  const table = customerRegister(entities)
  if (!table) return null
  const row = (rowsByEntity[table.id] ?? []).find((r) => r.id === rowId)
  if (!row) return null
  const read = readCustomer(table, row)
  return {
    customer: {
      name: read.name,
      ...(read.contact.length > 0 ? { contact: read.contact } : {}),
    },
    customerRef: { tableId: table.id, rowId: row.id },
  }
}

/**
 * File a name somebody typed on a quote as a real customer.
 *
 * IT REFUSES WHEN THERE IS NO REGISTER, and that refusal is the
 * point. DESIGN_CONTRACT §7: structure is never a side effect. A
 * salesperson typing a name into a quote has not asked for a new
 * TABLE, so this will not make one — the screen offers the register
 * by name, at the place where registers are made, and this only
 * ever adds a ROW to one that already exists.
 *
 * The contact lines already typed on the quote go in with the name,
 * in the order the three printed columns are declared, so a repeat
 * buyer is not typed twice. Returns the frozen link, ready to be
 * written onto the quote in the same turn.
 */
export function fileCustomer(
  name: string,
  contact: readonly string[] = [],
): Pick<QuoteDef, 'customer' | 'customerRef'> | null {
  const store = useProjectStore.getState()
  const table = customerRegister(store.entities)
  if (!table) return null
  const nameField = displayFieldOf(table)
  if (!nameField) return null

  const values: Record<string, CellValue> = { [nameField.id]: name.trim() }
  CUSTOMER_CONTACT_FIELDS.forEach((fieldId, i) => {
    const line = contact[i]
    if (typeof line === 'string' && line.trim() !== '') values[fieldId] = line.trim()
  })

  const row = store.addRow(table.id, values)
  return row ? freezeCustomer(row.id) : null
}
