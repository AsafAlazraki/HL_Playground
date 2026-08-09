/* ============================================================
   Table-on-canvas state — the entity-table node's own geometry.

   A node's frame size and its column widths are a LENS preference,
   not part of the drawing: they must never enter the project store
   (its shape is fixed and every write there persists to disk). They
   also must not live inside the node component, because React Flow
   unmounts nodes whenever the view leaves TABLE — the frame you
   dragged out would snap back on return.

   So: one tiny module-level store, keyed by entityId, read through
   `useSyncExternalStore`. Session-lived, exactly like the
   whiteboard's own canvas state.

   ------------------------------------------------------------
   EXPANDED IS A NODE SIZE, NOT A MODE.

   "Show me the whole table" is answered ON THE BLUEPRINT: the card
   grows until it claims most of the sheet, and it is still a node —
   dragged, resized, wired to its neighbours by the same edges. So
   there is no expanded *mode* anywhere in this file. There is a
   frame size like any other, plus one remembered fact:

       expanded[entityId] = the frame it had BEFORE it grew

   Presence in that map IS "this table is expanded"; the value is
   what COLLAPSE puts back — remembered, never recomputed. Resizing
   an expanded card by hand takes it out of the map, because the
   reader has just chosen a size of their own and a control offering
   to "return" them to a frame they abandoned would be lying.

   This one preference DOES outlive a reload (localStorage, chrome
   state — never project data, exactly like `hl.wb.arranged-rules`
   next door in the whiteboard). A card the reader expanded to read a
   fifty-nine column register is the state they left the sheet in;
   coming back to a 520px window would read as the app forgetting.
   ============================================================ */
import { useSyncExternalStore } from 'react'

export interface TableNodeSize {
  w: number
  h: number
}

/** Default frame — a readable ~5 columns × ~7 rows at zoom 1. */
export const DEFAULT_TABLE_NODE_SIZE: TableNodeSize = { w: 520, h: 320 }
/** Below this the header row and one data row stop fitting. */
export const MIN_TABLE_NODE_W = 320
export const MIN_TABLE_NODE_H = 190

interface TableCanvasState {
  /** frame size per entityId */
  sizes: Record<string, TableNodeSize>
  /** column widths per entityId, then per fieldId */
  colWidths: Record<string, Record<string, number>>
  /** the entity opened full-window in the FOCUS lens, if any */
  focusEntityId: string | null
  /** expanded tables → the frame each had before it grew */
  expanded: Record<string, TableNodeSize>
}

const NO_WIDTHS: Record<string, number> = Object.freeze({})

/* -- the one preference that survives F5 --------------------- */

const EXPAND_KEY = 'hl.tb.expanded-frames'

interface StoredFrame {
  /** the expanded frame */
  w: number
  h: number
  /** the frame to put back on COLLAPSE */
  pw: number
  ph: number
}

function readStoredFrames(): Record<string, StoredFrame> {
  try {
    const raw = window.localStorage.getItem(EXPAND_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const out: Record<string, StoredFrame> = {}
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v !== 'object' || v === null) continue
      const f = v as Record<string, unknown>
      if (
        typeof f.w !== 'number' ||
        typeof f.h !== 'number' ||
        typeof f.pw !== 'number' ||
        typeof f.ph !== 'number'
      ) {
        continue
      }
      out[id] = { w: f.w, h: f.h, pw: f.pw, ph: f.ph }
    }
    return out
  } catch {
    /* private mode, a quota wall, a corrupt value — the sheet still
       draws, every card simply opens at its ordinary size */
    return {}
  }
}

/** Rebuilt from state on every write: the store is the truth, the
 *  key is only its echo. */
function writeStoredFrames(next: TableCanvasState): void {
  try {
    const out: Record<string, StoredFrame> = {}
    for (const [id, prev] of Object.entries(next.expanded)) {
      const size = next.sizes[id]
      if (!size) continue
      out[id] = { w: size.w, h: size.h, pw: prev.w, ph: prev.h }
    }
    if (Object.keys(out).length === 0) {
      window.localStorage.removeItem(EXPAND_KEY)
      return
    }
    window.localStorage.setItem(EXPAND_KEY, JSON.stringify(out))
  } catch {
    /* nothing to do, and nothing worth telling the reader about */
  }
}

function hydrate(): TableCanvasState {
  const sizes: Record<string, TableNodeSize> = {}
  const expanded: Record<string, TableNodeSize> = {}
  if (typeof window !== 'undefined') {
    for (const [id, f] of Object.entries(readStoredFrames())) {
      sizes[id] = {
        w: Math.max(MIN_TABLE_NODE_W, Math.round(f.w)),
        h: Math.max(MIN_TABLE_NODE_H, Math.round(f.h)),
      }
      expanded[id] = {
        w: Math.max(MIN_TABLE_NODE_W, Math.round(f.pw)),
        h: Math.max(MIN_TABLE_NODE_H, Math.round(f.ph)),
      }
    }
  }
  return { sizes, colWidths: {}, focusEntityId: null, expanded }
}

let state: TableCanvasState = hydrate()

const listeners = new Set<() => void>()

function emit(next: TableCanvasState): void {
  const wasExpanded = state.expanded
  state = next
  /* the echo is rewritten only when the expansion could have moved —
     typing a column width must not touch localStorage */
  if (wasExpanded !== next.expanded) writeStoredFrames(next)
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getTableCanvasState = (): TableCanvasState => state

/* ---------------------------------------------------------- */
/* frame size                                                 */
/* ---------------------------------------------------------- */

export function tableNodeSizeOf(entityId: string): TableNodeSize {
  return state.sizes[entityId] ?? DEFAULT_TABLE_NODE_SIZE
}

export function setTableNodeSize(entityId: string, size: TableNodeSize): void {
  const w = Math.max(MIN_TABLE_NODE_W, Math.round(size.w))
  const h = Math.max(MIN_TABLE_NODE_H, Math.round(size.h))
  const prev = state.sizes[entityId]
  if (prev && prev.w === w && prev.h === h) return
  emit({ ...state, sizes: { ...state.sizes, [entityId]: { w, h } } })
}

export function useTableNodeSizes(): Record<string, TableNodeSize> {
  return useSyncExternalStore(
    subscribe,
    () => state.sizes,
    () => state.sizes,
  )
}

/* ---------------------------------------------------------- */
/* EXPAND — the card claims the sheet, and can be given back   */
/* ---------------------------------------------------------- */

const NO_EXPANDED: Record<string, TableNodeSize> = Object.freeze({})

/** Grow a card to `next`, remembering `prev` for COLLAPSE. Both are
 *  passed in: this module holds geometry, it does not measure. */
export function expandTableNode(
  entityId: string,
  prev: TableNodeSize,
  next: TableNodeSize,
): void {
  const w = Math.max(MIN_TABLE_NODE_W, Math.round(next.w))
  const h = Math.max(MIN_TABLE_NODE_H, Math.round(next.h))
  /* a second EXPAND must not overwrite the frame the reader started
     from with the expanded one — that would make COLLAPSE a no-op */
  const remembered = state.expanded[entityId] ?? {
    w: Math.max(MIN_TABLE_NODE_W, Math.round(prev.w)),
    h: Math.max(MIN_TABLE_NODE_H, Math.round(prev.h)),
  }
  emit({
    ...state,
    sizes: { ...state.sizes, [entityId]: { w, h } },
    expanded: { ...state.expanded, [entityId]: remembered },
  })
}

/** Put back the frame the card had before it grew — exactly, from
 *  memory. Returns it, so a caller can act on the same numbers. */
export function collapseTableNode(entityId: string): TableNodeSize | null {
  const prev = state.expanded[entityId]
  if (!prev) return null
  const expanded = { ...state.expanded }
  delete expanded[entityId]
  emit({
    ...state,
    sizes: { ...state.sizes, [entityId]: prev },
    expanded,
  })
  return prev
}

/** The resize handles. A frame the reader dragged is theirs, so it
 *  ends the expansion rather than pretending to be one. */
export function setTableNodeSizeByHand(
  entityId: string,
  size: TableNodeSize,
): void {
  const w = Math.max(MIN_TABLE_NODE_W, Math.round(size.w))
  const h = Math.max(MIN_TABLE_NODE_H, Math.round(size.h))
  const prev = state.sizes[entityId]
  const wasExpanded = entityId in state.expanded
  if (!wasExpanded && prev && prev.w === w && prev.h === h) return
  const expanded = { ...state.expanded }
  delete expanded[entityId]
  emit({
    ...state,
    sizes: { ...state.sizes, [entityId]: { w, h } },
    expanded: wasExpanded ? expanded : state.expanded,
  })
}

export function isTableNodeExpanded(entityId: string): boolean {
  return entityId in state.expanded
}

/** Which tables are expanded, and from what — the node array reads
 *  this to lift an expanded card above its neighbours. */
export function useExpandedTableNodes(): Record<string, TableNodeSize> {
  const read = (): Record<string, TableNodeSize> =>
    Object.keys(state.expanded).length === 0 ? NO_EXPANDED : state.expanded
  return useSyncExternalStore(subscribe, read, read)
}

export function useTableNodeExpanded(entityId: string): boolean {
  const read = (): boolean => entityId in state.expanded
  return useSyncExternalStore(subscribe, read, read)
}

/* ---------------------------------------------------------- */
/* column widths                                              */
/* ---------------------------------------------------------- */

/** width <= 0 resets the column to its type default. */
export function setTableNodeColumnWidth(
  entityId: string,
  fieldId: string,
  w: number,
): void {
  const forEntity = state.colWidths[entityId] ?? NO_WIDTHS
  if (w <= 0) {
    if (!(fieldId in forEntity)) return
    const next = { ...forEntity }
    delete next[fieldId]
    emit({ ...state, colWidths: { ...state.colWidths, [entityId]: next } })
    return
  }
  if (forEntity[fieldId] === w) return
  emit({
    ...state,
    colWidths: { ...state.colWidths, [entityId]: { ...forEntity, [fieldId]: w } },
  })
}

export function useTableNodeColumnWidths(
  entityId: string,
): Record<string, number> {
  const read = (): Record<string, number> =>
    state.colWidths[entityId] ?? NO_WIDTHS
  return useSyncExternalStore(subscribe, read, read)
}

/* ---------------------------------------------------------- */
/* FOCUS — one entity, full window                            */
/* ---------------------------------------------------------- */

export function setFocusedTableEntity(entityId: string | null): void {
  if (state.focusEntityId === entityId) return
  emit({ ...state, focusEntityId: entityId })
}

export function useFocusedTableEntity(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => state.focusEntityId,
    () => state.focusEntityId,
  )
}

/** Drops every trace of an entity that has left the board — including
 *  the expansion echoed into localStorage, or a table id from a
 *  drawing that no longer exists would keep a frame alive for ever. */
export function forgetTableEntity(entityId: string): void {
  const hasSize = entityId in state.sizes
  const hasWidths = entityId in state.colWidths
  const wasExpanded = entityId in state.expanded
  const focused = state.focusEntityId === entityId
  if (!hasSize && !hasWidths && !focused && !wasExpanded) return
  const sizes = { ...state.sizes }
  const colWidths = { ...state.colWidths }
  const expanded = { ...state.expanded }
  delete sizes[entityId]
  delete colWidths[entityId]
  delete expanded[entityId]
  emit({
    sizes,
    colWidths,
    focusEntityId: focused ? null : state.focusEntityId,
    expanded: wasExpanded ? expanded : state.expanded,
  })
}
