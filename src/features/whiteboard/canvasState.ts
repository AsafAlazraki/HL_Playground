/* ============================================================
   Canvas state — which LAYER the sheet is drawn on, and which
   rule plate is currently under the pen.

   Neither is project data (neither is persisted), but the chrome
   needs both answers at the same time the canvas does: the rule
   palette only belongs on a rules layer, and the rule inspector
   opens on whatever plate the canvas selected. One tiny external
   store keeps canvas and shell in step without the shell having
   to thread props into the React Flow tree.

   Same shape as `features/rules/runStore` on purpose — one
   pattern for "chrome state the canvas owns".
   ============================================================ */

import { useSyncExternalStore } from 'react'
import type { TableKind, XY } from '@/types/model'

/* ============================================================
   OFF THE DEFAULT PATH — the LAYER switcher.

   The configurator sheet draws TABLES and nothing else, so the
   ENTITIES / RULES / BOTH switcher is no longer rendered (see
   `Whiteboard.tsx`, "OFF THE DEFAULT PATH"). Everything below is
   left working and exported so bringing the ERD or the rule flow
   back is a matter of drawing the switcher again, not rebuilding
   the state it drove.
   ============================================================ */

/** The three ways the blueprint can be read. */
export type SheetLayer = 'entities' | 'rules' | 'both'

/** Switcher order — ENTITIES · RULES · BOTH. */
export const SHEET_LAYERS: readonly SheetLayer[] = ['entities', 'rules', 'both']

/** Layers that draw the active rule's flow over the sheet. */
export const layerShowsRules = (layer: SheetLayer): boolean =>
  layer !== 'entities'

/** The one layer that drops the ERD to a blueprint underlay. */
export const layerGhostsEntities = (layer: SheetLayer): boolean =>
  layer === 'rules'

/** A table type was dropped on the sheet. The canvas asks; it never
 *  answers — see the note above `requestNewTable`. */
export interface NewTableRequest {
  kind: TableKind
  /** flow coordinates: where the table should land, already snapped */
  position: XY
  /** monotonic — dropping the same kind on the same spot twice still
   *  reads as two separate requests */
  seq: number
}

export interface CanvasState {
  layer: SheetLayer
  /** Selected RULE NODE id — never an entity. May be stale (the plate can
   *  be deleted, or belong to a rule that is no longer active); every
   *  consumer is expected to tolerate that. */
  selectedRuleNodeId: string | null
  /** a table type dropped on the sheet and not yet answered */
  newTable: NewTableRequest | null
}

/** Where the camera is parked. Not project data — it never persists — but
 *  it MUST outlive the canvas component, or every trip through TABLE view
 *  would re-frame the sheet and throw away where the reader put things. */
export interface CanvasCamera {
  x: number
  y: number
  zoom: number
}

const INITIAL: CanvasState = {
  layer: 'entities',
  selectedRuleNodeId: null,
  newTable: null,
}

let state: CanvasState = INITIAL
const listeners = new Set<() => void>()

const emit = (): void => {
  for (const l of listeners) l()
}

export const getCanvasState = (): CanvasState => state

export function setSheetLayer(layer: SheetLayer): void {
  if (state.layer === layer) return
  state = { ...state, layer }
  emit()
}

export function setSelectedRuleNodeId(id: string | null): void {
  if (state.selectedRuleNodeId === id) return
  state = { ...state, selectedRuleNodeId: id }
  emit()
}

/* ============================================================
   THE NEW-TABLE REQUEST — the sheet asks, it does not answer.

   Dropping a table type on the blueprint must STILL ask how the
   table is structured; dropping one straight onto the sheet would
   skip the only question that decides what the table is. The
   dialog that asks it belongs to `features/tablekit`, not to the
   canvas — so the canvas publishes WHAT was dropped and WHERE,
   and whoever hosts the dialog picks it up:

       const req = useNewTableRequest()
       ...
       {req ? (
         <NewTableDialog
           kind={req.kind}
           position={req.position}
           onClose={clearNewTableRequest}
         />
       ) : null}

   `<Whiteboard onDropTableKind={…} />` is the same signal as a
   prop, for a shell that would rather wire it directly.
   ============================================================ */

let newTableSeq = 0

export function requestNewTable(kind: TableKind, position: XY): void {
  newTableSeq += 1
  state = { ...state, newTable: { kind, position, seq: newTableSeq } }
  emit()
}

export function clearNewTableRequest(): void {
  if (state.newTable === null) return
  state = { ...state, newTable: null }
  emit()
}

/* ============================================================
   CAMERA SESSION — module-level on purpose.

   UX_REWORK §5: a position the reader chose is theirs. Nothing in
   the app may re-frame the sheet on its own except the very first
   time a layer is opened, or when the whole drawing is replaced.
   Because the canvas unmounts every time TABLE view is opened,
   none of this can live in component state.
   ============================================================ */

/** What the camera can be framed FOR. The three sheet layers, plus the
 *  TABLE lens — which draws the same entities at the same positions in
 *  much larger frames, so it is entitled to its own one-off fit. */
export type FrameKey = SheetLayer | 'table'

let camera: CanvasCamera | null = null
const framedLayers = new Set<FrameKey>()

/** The parked camera, or null when the sheet has never been drawn. */
export const getCanvasCamera = (): CanvasCamera | null => camera

export function setCanvasCamera(next: CanvasCamera): void {
  camera = { x: next.x, y: next.y, zoom: next.zoom }
}

/** True exactly once per layer per session — the one licence to frame. */
export function claimLayerFrame(layer: FrameKey): boolean {
  if (framedLayers.has(layer)) return false
  framedLayers.add(layer)
  return true
}

/* ============================================================
   LANE SEPARATION SESSION (UX_REWORK §3 + §5)

   The flow-vs-cards relayout may fire ONCE per rule, and never on
   a rule whose plates the reader has arranged themselves. Both
   facts have to outlive the canvas component — it is unmounted on
   every trip through TABLE view — which is why they sit here
   beside the camera rather than in a `useRef`.

   "The reader arranged this flow" outlives a RELOAD too. §5 item 4
   promises a moved plate is still where it was put after F5, and
   the relayout is the only thing in the app that would move one
   back; a few rule ids in localStorage is the whole cost of
   keeping that promise. It is chrome state, never project data —
   the positions themselves live in the store, as they always did.
   ============================================================ */

const ARRANGED_KEY = 'hl.wb.arranged-rules'

/** rules this session has already had its one look at */
const laidOutRules = new Set<string>()

function readArranged(): Set<string> {
  try {
    const raw = window.localStorage.getItem(ARRANGED_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((v): v is string => typeof v === 'string'))
  } catch {
    /* private mode, a quota wall, a corrupt value — the in-memory set
       still holds for this session, which is the important half */
    return new Set()
  }
}

/** rules the reader has placed by hand — hands off, permanently */
const arrangedRules = readArranged()

function writeArranged(): void {
  try {
    window.localStorage.setItem(ARRANGED_KEY, JSON.stringify([...arrangedRules]))
  } catch {
    /* nothing to do, and nothing worth telling the reader about */
  }
}

/** True exactly once per rule per session — the licence to relayout. */
export function claimRuleLayout(ruleId: string): boolean {
  if (laidOutRules.has(ruleId)) return false
  laidOutRules.add(ruleId)
  return true
}

/** The reader has placed a plate of this rule with their own hand. */
export function markRuleArranged(ruleId: string): void {
  if (arrangedRules.has(ruleId)) return
  arrangedRules.add(ruleId)
  writeArranged()
}

/** Has the reader arranged this flow? Then nothing may re-draw it. */
export const isRuleArranged = (ruleId: string): boolean =>
  arrangedRules.has(ruleId)

/** A different drawing has landed (demo, import, reset): the camera has
 *  nothing left to hold on to, so the whole session is forgotten. */
export function resetCanvasSession(): void {
  camera = null
  framedLayers.clear()
  laidOutRules.clear()
  /* the old rule ids belong to a drawing that no longer exists */
  arrangedRules.clear()
  writeArranged()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getLayer = (): SheetLayer => state.layer
const getSelectedRuleNodeId = (): string | null => state.selectedRuleNodeId
const getNewTable = (): NewTableRequest | null => state.newTable

export const useCanvasState = (): CanvasState =>
  useSyncExternalStore(subscribe, getCanvasState, getCanvasState)

/** Which layer the sheet is on. Primitive, so it re-renders on nothing else. */
export const useSheetLayer = (): SheetLayer =>
  useSyncExternalStore(subscribe, getLayer, getLayer)

/** The selected rule plate — what `RuleInspector` should open on. */
export const useSelectedRuleNodeId = (): string | null =>
  useSyncExternalStore(subscribe, getSelectedRuleNodeId, getSelectedRuleNodeId)

/** The table type just dropped on the sheet, waiting on its structure
 *  question. Null whenever there is nothing to ask. */
export const useNewTableRequest = (): NewTableRequest | null =>
  useSyncExternalStore(subscribe, getNewTable, getNewTable)
