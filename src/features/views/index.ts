/* ============================================================
   VIEWS — the configurable "what goes with this?" page.

   MOUNTING IT (the whole job):

     import { ViewPage, createViewFor, VIEW_DND_MIME, isTableDrag }
       from '@/features/views'

     const view = createViewFor(tableId)        // idempotent
     <ViewPage viewId={view.id} rowId={rowId} />

   ViewPage fills whatever box it is put in and scrolls itself.
   It brings its own stylesheet and needs no props beyond those two.

   MAKING A TABLE DRAGGABLE INTO IT — the left panel writes the
   payload; the page already listens:

     <li draggable onDragStart={(e) => setTableDragData(e, entity.id)}>

   `isTableDrag(e)` is exported for any surface that wants to answer
   `onDragOver` for the same payload.

   ---------------------------------------------------------------
   WHAT THIS FEATURE WANTS FROM THE STORE (it adds nothing itself)

   1. ViewDefs are not persisted. They live in module state here
      (`viewDefs.ts`) and are lost on reload. Wanted:
         views: Record<string, ViewDef>
         createView / updateView / deleteView
      plus ViewDef[] in ProjectSnapshot, ProjectExport and the
      repository, so a page someone set up survives a refresh.

   2. `addField` cannot create a column with a chosen id. The pair
      state therefore lives in the join row's `values` under the
      well-known keys from the model (PAIR_ORIGIN_FIELD,
      PAIR_RECOMMENDED_FIELD) plus one of ours (`__order`) — written
      through `updateCell`, so it persists and exports correctly, but
      the join table does NOT draw those three as columns in the grid.
      Wanted: either
         addField(entityId, { id?: string, ... })
      or a dedicated
         ensureJoinPairColumns(joinEntityId)
      that registers the three as locked system columns. Then the
      13-slot menu is editable in the grid exactly as the spec asks.
      (`__order` also wants a home in model.ts beside
      PAIR_ORIGIN_FIELD.)

   3. SETTLED, 2026-09-09. `createJoinEntity` sets `role: 'join'`
      itself (useProjectStore.ts:1708) and has for some time; the
      `updateEntity` that used to follow it here was a second write
      into the same burst for a field the store had already filled
      in, and it is gone.

   ---------------------------------------------------------------
   AND ONE RULE THIS FEATURE OWES THE REST OF THE APP

   `ensureJoinTable` CREATES A TABLE. UX_PASS §5: a structural change
   is never a side effect of a browsing or picking action — it is
   offered, in a sentence that names it, and it is undoable. The ask
   belongs to the surface where the press happened, not to the
   function: `BlockCard`'s `withJoin` holds the act back, names the
   table it is about to make and the count the sheet will move to,
   and raises a toast with UNDO once a person has said yes. A new
   caller does the same, or it reintroduces audit finding 14.
   ============================================================ */

export { ViewPage } from './ViewPage'
export type { ViewPageProps } from './ViewPage'

/* WHICH ROW A PAGE OPENS ON when the door named a table and nothing
   more — and which row a CATALOGUE should offer as the way in, which is
   the same question asked from one screen further out. One rule, one
   scan depth, so the two can never name different boats. See landing.ts
   for the measurement and the rule. */
export { bestAnsweredRow, LANDING_SCAN } from './landing'
export type { BestAnswered, BestAnsweredArgs } from './landing'

export {
  createViewFor,
  useViewDefs,
  useViewDef,
  getViewDef,
  registerViewDef,
  addBlock,
  updateBlock,
  setBlockRule,
  setBlockFilters,
  removeBlock,
  walkBlocks,
  findBlock,
  canNestUnder,
  MAX_DEPTH,
} from './viewDefs'
export type { BlockAt, NewBlock } from './viewDefs'

export {
  VIEW_DND_MIME,
  VIEW_ROW_DND_MIME,
  isTableDrag,
  readTableDrag,
  setTableDragData,
} from './dnd'

/* The guess, and the plain English — exported because a future
   quote screen has to say the same sentences this page says. */
export { suggestRule } from './suggest'
export type { RuleSuggestion, SuggestionKind } from './suggest'
export { describeRule, summariseRule, countChip, curatedOnly, isCuratedOnly } from './describe'

/* WHICH SURFACES HOLD DISCONTINUED STOCK BACK, and what they say when
   they do. Exported because the module index and the quote picker are
   the other two customer-facing surfaces and must say the same
   sentences this page says — one wording, one policy. */
export {
  sellableRows,
  sellableTables,
  sellableRowCount,
  countDiscontinued,
  heldBackRowCount,
  heldBackSentence,
  retiredTableSentence,
  retiredPairsSentence,
  retiredTablesSentence,
} from './sellable'

/* Reading and writing pairs, for anything else that needs the
   curated menu (a quote, an export, a rule run). */
export {
  findJoinTable,
  joinRefFor,
  ensureJoinTable,
  joinTableName,
  readPairs,
  relatedRows,
  writePair,
  clearRecommended,
  evalPairRule,
  makeEngine,
  PAIR_ORDER_FIELD,
} from './pairs'
export type { JoinRef, PairInfo, RelatedRow, BlockResult, Ctx } from './pairs'
