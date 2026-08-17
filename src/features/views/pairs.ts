/* ============================================================
   PAIRS — the rule proposes, the human disposes.

   A pair (this boat ↔ that motor) is a ROW IN A JOIN TABLE, never
   a flag hidden somewhere. That is what makes "why is this here?"
   and "why is this missing?" answerable:

     __origin = 'rule'     the rule matched it and someone has since
                           touched it (starred it, moved it)
     __origin = 'added'    a person pinned it in although the rule
                           does not match it
     __origin = 'removed'  a person took it out — the row STAYS, so
                           restoring is one click and nothing is lost

   REMOVING NEVER DELETES. Nothing in this file calls deleteRow.

   RULE vs FILTER: a rule decides what is RELATED and lives on the
   block; a filter decides what is SHOWN and never reaches this file.

   SCOPE — how a decision reaches a whole level.

   A pair ALWAYS names one exact row: read it back by row id and
   nothing else. What the level chooser changes is how many rows the
   WRITE lands on. Choosing "all variants in SP560" and dropping a
   trailer writes that decision onto each of those variants, once.

   That is what makes the cascade honest and, more importantly,
   visible: the change takes effect the instant it is made, on every
   row it was asked for, and a later decision on one variant simply
   overwrites that variant — "cascades to its variants unless a
   variant overrides it in turn", with no precedence arithmetic to
   explain and no row silently shadowing another.

   A write always UPDATES the pair row that is already there, so the
   rigging kit and prop number sitting on an imported pair survive
   being kept, dropped or starred.
   ============================================================ */

import {
  PAIR_ORIGIN_FIELD,
  PAIR_RECOMMENDED_FIELD,
  UID_FIELD_ID,
  isDiscontinued,
  isRetired,
  readCell,
  rowLabel,
  type CellValue,
  type Clause,
  type ClauseGroup,
  type EntityDef,
  type PairOrigin,
  type RowData,
} from '@/types/model'
import { compareValues } from '@/lib/rules'
import { createEngine } from '@/lib/rules/evaluate'
import type { NodeSite, RowRef, RuleEngine } from '@/lib/rules/evaluate'
import { useProjectStore } from '@/store/useProjectStore'
import { isCuratedOnly } from './describe'
import { findJoinTable, type JoinRef } from './relations'

/** Where a pair sits in the salesperson's order.
 *  NOT in model.ts yet — see the note in index.ts. */
export const PAIR_ORDER_FIELD = '__order'

const SITE: NodeSite = { label: 'This view' }

export type Ctx = {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
}

/* ---------------------------------------------------------- */
/* Finding and making the join table                          */
/* ---------------------------------------------------------- */

/* WHAT A JOIN IS, and how one is found, now live in `relations.ts` —
   a file that imports neither this store nor React, so the STORE can
   read the same derivation this feature does. They are re-exported
   here unchanged: every existing caller keeps its import. */
export type { JoinRef } from './relations'
export { findJoinTable, looksLikeJoin } from './relations'

/** The join a block already names, read back into its two link columns.
 *  Falls back to looking one up, so a block whose join was renamed or
 *  rebuilt still finds its pairs instead of silently losing them. */
export function joinRefFor(
  entities: Record<string, EntityDef>,
  joinTableId: string | undefined,
  sourceEntityId: string,
  targetEntityId: string,
): JoinRef | null {
  const named = joinTableId ? entities[joinTableId] : undefined
  if (named) {
    const source = named.fields.find(
      (f) => f.type === 'reference' && f.refEntityId === sourceEntityId,
    )
    const target = named.fields.find(
      (f) => f.type === 'reference' && f.refEntityId === targetEntityId,
    )
    if (source && target && source.id !== target.id) {
      return {
        entityId: named.id,
        sourceFieldId: source.id,
        targetFieldId: target.id,
        labelFieldId: named.fields.find((f) => f.type === 'text')?.id,
      }
    }
  }
  return findJoinTable(entities, sourceEntityId, targetEntityId)
}

/**
 * The join for this pairing, made only when a person first curates.
 * A table that is merely LOOKED at never grows a join table — the
 * relationship becomes data the moment someone disposes of it.
 */
export function ensureJoinTable(
  sourceEntityId: string,
  targetEntityId: string,
): JoinRef | null {
  const store = useProjectStore.getState()
  const existing = findJoinTable(store.entities, sourceEntityId, targetEntityId)
  if (existing) return existing
  const a = store.entities[sourceEntityId]
  const b = store.entities[targetEntityId]
  if (!a || !b) return null
  const made = store.createJoinEntity(sourceEntityId, targetEntityId, `${a.name} × ${b.name}`)
  if (!made) return null
  useProjectStore.getState().updateEntity(made.entity.id, { role: 'join' })
  return {
    entityId: made.entity.id,
    sourceFieldId: made.aFieldId,
    targetFieldId: made.bFieldId,
    labelFieldId: made.entity.fields.find((f) => f.type === 'text')?.id,
  }
}

/* ---------------------------------------------------------- */
/* Reading pairs                                              */
/* ---------------------------------------------------------- */

export interface PairInfo {
  /** the join row itself */
  rowId: string
  targetRowId: string
  origin: PairOrigin
  recommended: boolean
  order?: number
}

const asOrigin = (v: CellValue): PairOrigin => {
  const t = typeof v === 'string' ? v.trim().toLowerCase() : ''
  return t === 'added' || t === 'removed' ? t : 'rule'
}

const asNum = (v: CellValue): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

const asBool = (v: CellValue): boolean =>
  v === true || (typeof v === 'string' && v.trim().toLowerCase() === 'true')

/**
 * Every pair recorded for this exact row, keyed by the related row it is
 * about. One row id, one lookup — there is no precedence to work out,
 * because a decision made for a whole level was written onto each of its
 * rows at the moment it was made (see `writePair`).
 *
 * If the same two rows were somehow paired twice, the one written LAST
 * wins, so correcting a decision is always the decision that stands.
 */
export function readPairs(
  ctx: Ctx,
  join: JoinRef,
  sourceEntity: EntityDef,
  sourceRow: RowData,
): Map<string, PairInfo> {
  const out = new Map<string, PairInfo>()
  /* a row from the wrong table would read another table's pairs, which is
     the one way this could answer confidently and wrongly */
  if (sourceRow.entityId !== sourceEntity.id) return out
  const joinRows = ctx.rowsByEntity[join.entityId] ?? []
  if (joinRows.length === 0) return out
  const writtenAt = new Map<string, string>()

  for (const j of joinRows) {
    if (String(readCell(j, join.sourceFieldId) ?? '').trim() !== sourceRow.id) continue
    const targetRowId = String(readCell(j, join.targetFieldId) ?? '').trim()
    if (targetRowId === '') continue

    const previous = writtenAt.get(targetRowId)
    if (previous !== undefined && previous > j.updatedAt) continue
    writtenAt.set(targetRowId, j.updatedAt)

    out.set(targetRowId, {
      rowId: j.id,
      targetRowId,
      origin: asOrigin(j.values[PAIR_ORIGIN_FIELD]),
      recommended: asBool(j.values[PAIR_RECOMMENDED_FIELD]),
      order: asNum(j.values[PAIR_ORDER_FIELD]),
    })
  }
  return out
}

/* ---------------------------------------------------------- */
/* Running the rule                                           */
/* ---------------------------------------------------------- */

export function makeEngine(ctx: Ctx): RuleEngine {
  return createEngine({ entities: ctx.entities, rowsByEntity: ctx.rowsByEntity })
}

const isUidPath = (fieldId: string | undefined, via: string | undefined): boolean =>
  fieldId === UID_FIELD_ID && !via

/**
 * The rule engine's own clause evaluation, with ONE gap filled: a row's
 * id is a system column and is not in `fields`, so the engine reads it as
 * empty. A link rule is exactly "this row's link column equals that row's
 * id", so those two sides are resolved here and every comparison still
 * goes through the engine. Nothing is re-implemented.
 */
export function evalPairRule(
  engine: RuleEngine,
  group: ClauseGroup | undefined,
  candidate: RowRef,
  source: RowRef,
): boolean {
  if (!group) return true
  const plain: Clause[] = []
  const uid: Clause[] = []
  for (const c of group.clauses) {
    if (isUidPath(c.left.fieldId, c.left.viaFieldId)) uid.push(c)
    else plain.push(c)
  }

  /* a right-hand side reading the source row's id becomes that id */
  const substituted: Clause[] = plain.map((c) => {
    if (c.right?.kind === 'field' && isUidPath(c.right.path.fieldId, c.right.path.viaFieldId)) {
      return { ...c, right: { kind: 'literal', value: source.row.id } }
    }
    return c
  })

  const scopes = { left: candidate, right: source, byOwnership: false }
  const or = group.combinator === 'OR'

  if (uid.length === 0) {
    return engine.evalGroup({ combinator: group.combinator, clauses: substituted }, scopes, SITE)
  }

  const uidResults = uid.map((c) => {
    const right =
      c.right?.kind === 'field' && isUidPath(c.right.path.fieldId, c.right.path.viaFieldId)
        ? source.row.id
        : engine.resolveValue(c.right, source, SITE)
    return compareValues(c.op, candidate.row.id, right).result
  })

  if (or) {
    if (uidResults.some(Boolean)) return true
    if (substituted.length === 0) return false
    return engine.evalGroup({ combinator: 'OR', clauses: substituted }, scopes, SITE)
  }
  if (!uidResults.every(Boolean)) return false
  if (substituted.length === 0) return true
  return engine.evalGroup({ combinator: 'AND', clauses: substituted }, scopes, SITE)
}

/* ---------------------------------------------------------- */
/* What a block shows                                         */
/* ---------------------------------------------------------- */

export interface RelatedRow {
  row: RowData
  /** 'rule' = it fits · 'added' = a person pinned it in despite the rule */
  origin: 'rule' | 'added'
  recommended: boolean
  pair?: PairInfo
  sortKey: number
}

export interface BlockResult {
  rows: RelatedRow[]
  removed: Array<{ row: RowData; pair: PairInfo }>
  fitCount: number
  addedCount: number
  removedCount: number
  /** Rows the rule or the curation WOULD have offered, held back
   *  because they are no longer sold. A block that would have drawn
   *  eight and draws six must not simply read six — every surface
   *  reading this says the number in words. */
  held: RelatedRow[]
  heldCount: number
  /** Set when the reason is a whole table rather than individual
   *  rows: 'table' — the related table is history rather than stock;
   *  'pairs' — the join recording which of its rows go with this one
   *  is. Either way every candidate lands in `held`, never in `rows`. */
  historic?: 'table' | 'pairs'
}

const UNORDERED = 1_000_000

/**
 * The set a block draws, in one place so the arithmetic on the count chip
 * can never disagree with the list under it.
 *
 *   with a rule    shown = the rule's matches − removed + added
 *   showing all    shown = every row          − removed
 *   curated only   shown = the pairs themselves − removed
 *
 * CURATED IS PRIMARY, THE RULE IS THE SAFETY NET (QUOTE_FINDINGS §2.4).
 * A curated block has no rule at all, so the join rows ARE the menu —
 * every pair on it shows, which is what makes an imported 13-slot menu
 * appear the moment the page opens.
 *
 * An ADDED pair survives the rule re-running, always: that is the whole
 * point of pinning one in. A pair marked 'rule' does NOT force a row to
 * stay when a rule is in force — it only carries a star or a position —
 * so narrowing the rule genuinely narrows the page.
 *
 * DISCONTINUED NEVER REACHES A SALESPERSON, and this is the one gate
 * it has to pass. A block on a view page, the candidates a quote picks
 * from and the starred row a quote is minted with all come through
 * here, so the rule is applied ONCE, at the moment the set is decided:
 *
 *   · a row flagged discontinued is moved to `held`, never to `rows`
 *   · a RETIRED related table holds everything back — `historic:'table'`
 *   · a RETIRED join holds everything back — `historic:'pairs'`;
 *     "Surtees x OBSOLETE Trailers" is a whole join of retired stock
 *
 * Held is not the same as gone. Nothing is deleted, the rows are
 * returned so a surface can SAY how many it dropped, and no quote line
 * ever comes back through here — a line is a frozen copy, so a
 * document naming a now-discontinued trailer still opens and totals.
 */
export function relatedRows(args: {
  ctx: Ctx
  engine: RuleEngine
  sourceEntity: EntityDef
  sourceRow: RowData
  targetEntityId: string
  rule?: ClauseGroup
  join?: JoinRef | null
}): BlockResult {
  const { ctx, engine, sourceEntity, sourceRow, targetEntityId, rule, join } = args
  const targetRows = ctx.rowsByEntity[targetEntityId] ?? []

  const targetEntity = ctx.entities[targetEntityId]
  const joinEntity = join ? ctx.entities[join.entityId] : undefined
  /* the table itself is history — the whole block is a memorial */
  const tableHistoric = targetEntity !== undefined && isRetired(targetEntity)
  /* the RELATIONSHIP is history: the pairs on a retired join are what
     an old quote was written against, not what may be sold today */
  const pairsHistoric = joinEntity !== undefined && isRetired(joinEntity)
  const historic: 'table' | 'pairs' | undefined = tableHistoric
    ? 'table'
    : pairsHistoric
      ? 'pairs'
      : undefined

  const pairs = join ? readPairs(ctx, join, sourceEntity, sourceRow) : new Map<string, PairInfo>()

  const sourceRef: RowRef = { entityId: sourceEntity.id, row: sourceRow }
  const curated = isCuratedOnly(rule)

  const rows: RelatedRow[] = []
  const held: RelatedRow[] = []
  const removed: Array<{ row: RowData; pair: PairInfo }> = []

  targetRows.forEach((row, index) => {
    const pair = pairs.get(row.id)
    if (pair?.origin === 'removed') {
      removed.push({ row, pair })
      return
    }
    /* curated: the pair is the whole story, so nothing is "outside the
       rule" and nothing carries an `added` tick — everything here was
       put here by a person */
    if (curated) {
      if (!pair) return
      const candidate: RelatedRow = {
        row,
        origin: 'rule',
        recommended: pair.recommended,
        pair,
        sortKey: pair.order ?? UNORDERED + index,
      }
      if (historic || isDiscontinued(row)) held.push(candidate)
      else rows.push(candidate)
      return
    }

    const fits = evalPairRule(engine, rule, { entityId: targetEntityId, row }, sourceRef)
    const pinned = pair?.origin === 'added'
    if (!fits && !pinned) return
    const candidate: RelatedRow = {
      row,
      origin: fits ? 'rule' : 'added',
      recommended: pair?.recommended ?? false,
      pair,
      sortKey: pair?.order ?? UNORDERED + index,
    }
    /* A PIN DOES NOT OVERRIDE THIS. Pinning a row in says the rule was
       wrong about it; it does not say the business is still selling it,
       and a salesperson cannot be handed a discontinued trailer because
       somebody once pressed ADD. */
    if (historic || isDiscontinued(row)) held.push(candidate)
    else rows.push(candidate)
  })

  rows.sort((a, b) => a.sortKey - b.sortKey)
  held.sort((a, b) => a.sortKey - b.sortKey)

  /* at most one star, ever — the first one wins so a duplicate written
     by an older build can never draw two. Held rows are cleared
     outright: a star on a row nobody may be offered would otherwise
     carry it onto a fresh quote through `mintQuoteFromView`. */
  let starred = false
  for (const r of rows) {
    if (!r.recommended) continue
    if (starred) r.recommended = false
    starred = true
  }
  for (const r of held) r.recommended = false

  return {
    rows,
    removed,
    fitCount: rows.filter((r) => r.origin === 'rule').length,
    addedCount: rows.filter((r) => r.origin === 'added').length,
    removedCount: removed.length,
    held,
    heldCount: held.length,
    ...(historic ? { historic } : {}),
  }
}

/* ---------------------------------------------------------- */
/* Writing pairs — every write goes through a store action     */
/* ---------------------------------------------------------- */

export interface PairAddress {
  join: JoinRef
  sourceEntityId: string
  /** EVERY row this decision is being made for. One id is the normal
   *  case; a level chosen in the header supplies all the rows of that
   *  level, and the decision is written onto each of them. */
  sourceRowIds: string[]
  targetRowId: string
}

function findPairRow(
  join: JoinRef,
  sourceRowId: string,
  targetRowId: string,
): RowData | undefined {
  const rows = useProjectStore.getState().rowsByEntity[join.entityId] ?? []
  /* LAST wins, matching readPairs — so an update lands on the row the
     page is actually drawing */
  let hit: RowData | undefined
  for (const r of rows) {
    if (String(readCell(r, join.sourceFieldId) ?? '') !== sourceRowId) continue
    if (String(readCell(r, join.targetFieldId) ?? '') !== targetRowId) continue
    if (!hit || r.updatedAt >= hit.updatedAt) hit = r
  }
  return hit
}

function labelPair(join: JoinRef, sourceEntityId: string, joinRowId: string, sourceRowId: string, targetRowId: string): void {
  if (!join.labelFieldId) return
  const st = useProjectStore.getState()
  const srcEntity = st.entities[sourceEntityId]
  const src = (st.rowsByEntity[sourceEntityId] ?? []).find((r) => r.id === sourceRowId)
  const joinEntity = st.entities[join.entityId]
  const targetRef = joinEntity?.fields.find((f) => f.id === join.targetFieldId)
  const tgtEntity = targetRef?.refEntityId ? st.entities[targetRef.refEntityId] : undefined
  const tgt = targetRef?.refEntityId
    ? (st.rowsByEntity[targetRef.refEntityId] ?? []).find((r) => r.id === targetRowId)
    : undefined
  const left = srcEntity && src ? rowLabel(srcEntity, src) : ''
  const right = tgtEntity && tgt ? rowLabel(tgtEntity, tgt) : ''
  if (left === '' && right === '') return
  st.updateCell(join.entityId, joinRowId, join.labelFieldId, `${left} · ${right}`)
}

/**
 * Write one decision, onto every row it was made for.
 *
 * The pair row that is ALREADY there is updated in place, never replaced:
 * an imported pair carries the rigging kit, the prop part number and the
 * engine hole, and keeping, dropping or starring it must not cost the
 * business any of that. Only a pairing that has never existed adds a row,
 * and nothing here ever deletes one.
 */
export function writePair(
  at: PairAddress,
  patch: { origin?: PairOrigin; recommended?: boolean; order?: number },
): void {
  const { join, targetRowId } = at
  for (const sourceRowId of at.sourceRowIds) {
    if (!sourceRowId) continue
    const store = useProjectStore.getState()
    let row = findPairRow(join, sourceRowId, targetRowId)
    if (!row) {
      const made = store.addRow(join.entityId, {
        [join.sourceFieldId]: sourceRowId,
        [join.targetFieldId]: targetRowId,
      })
      if (!made) continue
      row = made
      labelPair(join, at.sourceEntityId, row.id, sourceRowId, targetRowId)
    }
    if (patch.origin !== undefined) {
      store.updateCell(join.entityId, row.id, PAIR_ORIGIN_FIELD, patch.origin)
    }
    if (patch.recommended !== undefined) {
      store.updateCell(join.entityId, row.id, PAIR_RECOMMENDED_FIELD, patch.recommended)
    }
    if (patch.order !== undefined) {
      store.updateCell(join.entityId, row.id, PAIR_ORDER_FIELD, patch.order)
    }
  }
}

/** Clear the star everywhere it is set for these rows, so "at most one"
 *  is true of the DATA and not merely of the drawing. */
export function clearRecommended(
  ctx: Ctx,
  join: JoinRef,
  sourceEntity: EntityDef,
  sourceRowIds: string[],
): void {
  const store = useProjectStore.getState()
  const rows = ctx.rowsByEntity[sourceEntity.id] ?? []
  const byId = new Map(rows.map((r) => [r.id, r]))
  const seen = new Set<string>()
  for (const sourceRowId of sourceRowIds) {
    const sourceRow = byId.get(sourceRowId)
    if (!sourceRow) continue
    for (const pair of readPairs(ctx, join, sourceEntity, sourceRow).values()) {
      if (!pair.recommended || seen.has(pair.rowId)) continue
      seen.add(pair.rowId)
      store.updateCell(join.entityId, pair.rowId, PAIR_RECOMMENDED_FIELD, false)
    }
  }
}
