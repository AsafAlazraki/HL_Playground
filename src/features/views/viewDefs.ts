/* ============================================================
   VIEW DEFINITIONS — which tables a page relates, in what order,
   with what rule and what filters.

   TEMPORARY HOME. The project store has no action for a ViewDef
   yet and this feature may not add one, so definitions live in
   module state and are published through `useViewDefs`. Everything
   a view POINTS AT — tables, join rows, pairs — is already in the
   store and already persists; only the page's own layout lives
   here. See the note at the foot of index.ts for the exact store
   actions this wants.
   ============================================================ */

import { useCallback, useSyncExternalStore } from 'react'
import type { ClauseGroup, ColumnFilter, ViewBlock, ViewDef } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { newId, nowIso } from '@/lib/id'
import { defaultBlocksFor } from './relations'

/** Root, related, related-to-the-related. Three, and no deeper. */
export const MAX_DEPTH = 3

const registry = new Map<string, ViewDef>()
let list: ViewDef[] = []
const listeners = new Set<() => void>()

/** The snapshot updates SYNCHRONOUSLY — `useSyncExternalStore` must never
 *  read a stale one — but subscribers are told on a microtask. That means a
 *  shell may call `createViewFor` inside a render (it is idempotent, so it
 *  will) without React complaining that a store updated another component
 *  mid-render. The notify still lands before paint. */
function publish(): void {
  list = [...registry.values()]
  const waiting = [...listeners]
  queueMicrotask(() => {
    for (const l of waiting) if (listeners.has(l)) l()
  })
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

const getList = (): ViewDef[] => list

/** Every view the session knows about. */
export function useViewDefs(): ViewDef[] {
  return useSyncExternalStore(subscribe, getList, getList)
}

/** One view, re-rendering when it changes. */
export function useViewDef(id: string): ViewDef | undefined {
  const get = useCallback(() => registry.get(id), [id])
  return useSyncExternalStore(subscribe, get, get)
}

export function getViewDef(id: string): ViewDef | undefined {
  return registry.get(id)
}

function put(view: ViewDef): void {
  registry.set(view.id, view)
  publish()
}

function patch(id: string, fn: (v: ViewDef) => ViewDef): void {
  const current = registry.get(id)
  if (!current) return
  put({ ...fn(current), id: current.id, createdAt: current.createdAt, updatedAt: nowIso() })
}

/* ---------------------------------------------------------- */
/* Making one                                                 */
/* ---------------------------------------------------------- */

/**
 * A sensible default view for a table.
 *
 * IDEMPOTENT: asking twice for the same table gives back the same view,
 * so a shell can call this on every render without collecting duplicates.
 *
 * "Sensible" means: any relationship that has ALREADY been declared —
 * a join table linking this one to another — is shown, as a curated
 * block (only what someone put in it). No rule is invented and no join
 * is created; a table with nothing declared yet opens empty and invites
 * the first drag.
 *
 * The blocks come from `relations.ts`, which is also what the store's
 * `createModule` seeds a module's tables with — one derivation, so the
 * two surfaces cannot drift apart again.
 */
export function createViewFor(tableId: string): ViewDef {
  const already = list.find((v) => v.rootTableId === tableId)
  if (already) return already

  const { entities } = useProjectStore.getState()
  const root = entities[tableId]
  const blocks: ViewBlock[] = defaultBlocksFor(entities, tableId)

  const view: ViewDef = {
    id: newId(),
    name: root ? root.name : 'View',
    rootTableId: tableId,
    blocks,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  put(view)
  return view
}

/* ---------------------------------------------------------- */
/* Walking the block tree                                     */
/* ---------------------------------------------------------- */

export interface BlockAt {
  block: ViewBlock
  /** the root counts as 1, so a top-level block is 2 */
  depth: number
  parentId: string | null
}

export function walkBlocks(view: ViewDef | undefined): BlockAt[] {
  const out: BlockAt[] = []
  const visit = (blocks: ViewBlock[], depth: number, parentId: string | null): void => {
    for (const b of blocks) {
      out.push({ block: b, depth, parentId })
      if (b.children?.length) visit(b.children, depth + 1, b.id)
    }
  }
  visit(view?.blocks ?? [], 2, null)
  return out
}

export function findBlock(view: ViewDef | undefined, blockId: string): BlockAt | undefined {
  return walkBlocks(view).find((b) => b.block.id === blockId)
}

/** Can something be dropped ONTO this block? Only if its children would
 *  still be inside the three levels. */
export function canNestUnder(view: ViewDef | undefined, blockId: string): boolean {
  const at = findBlock(view, blockId)
  return !!at && at.depth + 1 <= MAX_DEPTH
}

function mapTree(
  blocks: ViewBlock[],
  fn: (b: ViewBlock) => ViewBlock | null,
): ViewBlock[] {
  const out: ViewBlock[] = []
  for (const b of blocks) {
    const mapped = fn(b)
    if (!mapped) continue
    out.push(
      mapped.children?.length ? { ...mapped, children: mapTree(mapped.children, fn) } : mapped,
    )
  }
  return out
}

/* ---------------------------------------------------------- */
/* Editing                                                    */
/* ---------------------------------------------------------- */

export interface NewBlock {
  tableId: string
  joinTableId?: string
  rule?: ClauseGroup
}

/** Add a related table. `parentBlockId` null puts it at the top level. */
export function addBlock(
  viewId: string,
  parentBlockId: string | null,
  spec: NewBlock,
): string | null {
  const view = registry.get(viewId)
  if (!view) return null
  if (parentBlockId && !canNestUnder(view, parentBlockId)) return null
  const block: ViewBlock = {
    id: newId(),
    tableId: spec.tableId,
    ...(spec.joinTableId ? { joinTableId: spec.joinTableId } : {}),
    ...(spec.rule ? { rule: spec.rule } : {}),
  }
  if (!parentBlockId) {
    patch(viewId, (v) => ({ ...v, blocks: [...v.blocks, block] }))
    return block.id
  }
  patch(viewId, (v) => ({
    ...v,
    blocks: mapTree(v.blocks, (b) =>
      b.id === parentBlockId ? { ...b, children: [...(b.children ?? []), block] } : b,
    ),
  }))
  return block.id
}

export function updateBlock(
  viewId: string,
  blockId: string,
  changes: Partial<Omit<ViewBlock, 'id' | 'children'>>,
): void {
  patch(viewId, (v) => ({
    ...v,
    blocks: mapTree(v.blocks, (b) => (b.id === blockId ? { ...b, ...changes } : b)),
  }))
}

/** Rule and no-rule are BOTH meaningful, so this is separate from
 *  `updateBlock`: passing `undefined` means "show everything", which a
 *  spread of a partial could never say. */
export function setBlockRule(
  viewId: string,
  blockId: string,
  rule: ClauseGroup | undefined,
): void {
  patch(viewId, (v) => ({
    ...v,
    blocks: mapTree(v.blocks, (b) => {
      if (b.id !== blockId) return b
      const next = { ...b }
      if (rule) next.rule = rule
      else delete next.rule
      return next
    }),
  }))
}

export function setBlockFilters(
  viewId: string,
  blockId: string,
  filters: ColumnFilter[],
): void {
  patch(viewId, (v) => ({
    ...v,
    blocks: mapTree(v.blocks, (b) => {
      if (b.id !== blockId) return b
      const next = { ...b }
      if (filters.length > 0) next.filters = filters
      else delete next.filters
      return next
    }),
  }))
}

/** Take the block off the page. The join table and every pair on it stay
 *  exactly where they are — this removes a heading, not a relationship. */
export function removeBlock(viewId: string, blockId: string): void {
  patch(viewId, (v) => ({
    ...v,
    blocks: mapTree(v.blocks, (b) => (b.id === blockId ? null : b)),
  }))
}

/* ---------------------------------------------------------- */
/* Test / demo seam                                           */
/* ---------------------------------------------------------- */

/** Put a definition in as-is (import, demo seeding, a future store). */
export function registerViewDef(view: ViewDef): void {
  put(view)
}
