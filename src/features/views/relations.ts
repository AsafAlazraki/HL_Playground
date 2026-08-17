/* ============================================================
   RELATIONS — which tables a table is ALREADY joined to, and the
   blocks that follow from that. One derivation, in one place.

   WHY THIS FILE EXISTS AND WHY IT IMPORTS NOTHING.

   Two places used to answer "what goes with this table?" and they
   answered differently. `createViewFor` (viewDefs.ts) asked it PER
   TABLE and got it right. `createModule` (the store) asked it PER
   MODULE — "any join naming ANY of my tables" — and so a module
   mastering seven brand tables seeded ELEVEN blocks onto ONE
   brand's page, ten of them describing relationships that table
   does not have. Measured, per brand, in
   docs/audit/MODULE_BLOCK_TRACE.md.

   The store cannot import viewDefs.ts or pairs.ts: both import
   `useProjectStore`, and the store importing them back is a cycle.
   So the derivation moved HERE, where it imports neither the store
   nor React — and both callers now read the same answer, which is
   the only way they can stop disagreeing.

   IT IS PURELY STRUCTURAL. There is no brand list, no TableKind
   test and no name matching anywhere below: the question is
   "which table carries a reference column to this one, and what is
   on the other end of that column". A dealership with three makes,
   a pharmacy with one supplier join and an org that adds a table
   tomorrow all get the same behaviour with no code change.
   ============================================================ */

import { isRetired, type EntityDef, type ViewBlock } from '@/types/model'
import { newId } from '@/lib/id'
import { curatedOnly } from './describe'

export interface JoinRef {
  entityId: string
  /** link column pointing at the row the view is drawn for */
  sourceFieldId: string
  /** link column pointing at the related row */
  targetFieldId: string
  /** the join's own plain text column, so a join row reads as something */
  labelFieldId?: string
}

/** A table is a join when it links both sides and is nobody's subject —
 *  a Packages table (kind 'package', role 'base') links three tables and
 *  is emphatically not one. */
export function looksLikeJoin(e: EntityDef): boolean {
  if (e.role === 'join') return true
  return e.role === undefined && e.kind === undefined
}

export function findJoinTable(
  entities: Record<string, EntityDef>,
  sourceEntityId: string,
  targetEntityId: string,
): JoinRef | null {
  if (sourceEntityId === targetEntityId) return null
  for (const e of Object.values(entities)) {
    if (e.id === sourceEntityId || e.id === targetEntityId) continue
    if (!looksLikeJoin(e)) continue
    const source = e.fields.find(
      (f) => f.type === 'reference' && f.refEntityId === sourceEntityId,
    )
    const target = e.fields.find(
      (f) => f.type === 'reference' && f.refEntityId === targetEntityId,
    )
    if (!source || !target || source.id === target.id) continue
    return {
      entityId: e.id,
      sourceFieldId: source.id,
      targetFieldId: target.id,
      labelFieldId: e.fields.find((f) => f.type === 'text')?.id,
    }
  }
  return null
}

export interface Relation {
  otherId: string
  joinId: string
}

/** Join tables already touching this table, and what they join it to.
 *
 *  A RETIRED TABLE NEVER BECOMES A BLOCK, and neither does a retired
 *  join. A view page is a page you would put in front of a customer,
 *  and this is the function that decides what is on it before anybody
 *  has configured anything — so "Surtees x OBSOLETE Trailers" must not
 *  be able to seed itself onto the Surtees page and then rely on the
 *  renderer to hold its rows back. Nothing is deleted: the join and
 *  the table stay on the sheet, and an old quote written against
 *  either still opens. */
export function existingRelations(
  entities: Record<string, EntityDef>,
  tableId: string,
): Relation[] {
  const out: Relation[] = []
  const seen = new Set<string>()
  for (const other of Object.values(entities)) {
    if (other.id === tableId) continue
    if (other.role === 'join') continue
    if (isRetired(other)) continue
    const join = findJoinTable(entities, tableId, other.id)
    if (!join || seen.has(other.id)) continue
    const joinEntity = entities[join.entityId]
    if (joinEntity && isRetired(joinEntity)) continue
    seen.add(other.id)
    out.push({ otherId: other.id, joinId: join.entityId })
  }
  return out
}

/**
 * The blocks a table's page opens with, before anybody has arranged it.
 *
 * Every one is CURATED — `rule: curatedOnly()` — because the join rows
 * are the menu somebody put there. A block seeded with no rule at all
 * matches every candidate, which would draw all 640 rigging kits under
 * one boat; that is not a default, it is a flood.
 *
 * Nothing is invented and no join is created: a table with no
 * relationship declared yet gets no blocks, and its page invites the
 * first drag instead.
 */
export function defaultBlocksFor(
  entities: Record<string, EntityDef>,
  tableId: string,
): ViewBlock[] {
  return existingRelations(entities, tableId).map(({ otherId, joinId }) => ({
    id: newId(),
    tableId: otherId,
    joinTableId: joinId,
    rule: curatedOnly(),
  }))
}
