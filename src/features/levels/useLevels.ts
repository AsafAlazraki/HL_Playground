/* ============================================================
   THE SEAM BETWEEN THE STORE AND THE LEVEL MODEL.

   Everything in `levels.ts` is a pure function over an
   `EntityDef` and a `RowData[]`, which is what makes it testable
   against the whole Master Price File. This file is the only
   place that knows those two things live in Zustand.

   TWO RULES ABOUT SELECTORS, BOTH LEARNED THE HARD WAY IN
   ZUSTAND-SHAPED CODEBASES:

     · A selector returns a REFERENCE the store already holds —
       `s.entities[id]`, `s.rowsByEntity[id]`. Building an object
       or an array inside a selector hands back a new identity on
       every store touch, and the component re-renders forever.
     · The derived work happens in `useMemo` keyed on those
       references. The store is immutable and structurally shared,
       so a row edit on Boats does not re-file Trailers.
   ============================================================ */

import { useMemo } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  displayFieldOf,
  isRetired,
  rowLabel,
  type EntityDef,
  type RowData,
} from '@/types/model'
import type { FieldDef } from '@/types/model'
import { leafNoun, type LeafNoun } from '@/features/table/grouping'
import { buildLevelModel, type LevelModel, type RefLabel } from './levels'

/** A table this door can work on, with the two figures the picker
 *  prints. Both counted; neither estimated. */
export interface LevelTable {
  entity: EntityDef
  rows: number
  /** what the table calls ONE of its rows — "variant", "product",
   *  "trailer". §6: the app talks to a boat dealer, so the picker
   *  says "2,937 products", never "2,937 rows". */
  noun: LeafNoun
  /** how many drawer levels it is filed under — 0 is a flat table,
   *  which still has ONE level: the table itself */
  depth: number
}

/**
 * Every table a level can be set on, which is every table that has
 * rows.
 *
 * A FLAT TABLE IS NOT EXCLUDED, and that is a decision rather than
 * an oversight: "the whole table" is a level, and setting Supplier
 * once across 2,937 products is the same act as setting it across
 * one Series. Excluding flat tables would refuse the biggest win
 * on the biggest table in the workbook.
 *
 * Retired tables are left out. They are history rather than stock
 * (`isRetired`), and nothing customer-facing offers them.
 */
export function useLevelTables(): LevelTable[] {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  return useMemo(
    () =>
      Object.values(entities)
        .filter((e) => !isRetired(e))
        .map((entity) => ({
          entity,
          rows: rowsByEntity[entity.id]?.length ?? 0,
          noun: leafNoun(entity),
          depth: Math.max((entity.hierarchy?.length ?? 0) - 1, 0),
        }))
        .filter((t) => t.rows > 0)
        .sort((a, b) => b.rows - a.rows),
    [entities, rowsByEntity],
  )
}

/** The level tree for one table, or null when there is no such
 *  table — a stage whose id has gone stale draws its empty state
 *  rather than throwing. */
export function useLevelModel(entityId: string | null | undefined): LevelModel | null {
  const entity = useProjectStore((s) => (entityId ? s.entities[entityId] : undefined))
  const rows = useProjectStore((s) => (entityId ? s.rowsByEntity[entityId] : undefined))
  const refLabel = useRefLabel(entity)

  return useMemo(
    () => (entity ? buildLevelModel(entity, rows ?? [], { refLabel }) : null),
    [entity, rows, refLabel],
  )
}

/**
 * Resolves a link cell to the name of the row it points at.
 *
 * WITHOUT THIS A LINKED COLUMN TALLIES BY ID, and a screen that
 * says `12 boats hold “k7Qa_2xLm”` is worse than one that says
 * nothing. The fallback is still the id rather than a blank,
 * because a link pointing at a deleted row must be VISIBLE.
 *
 * Built lazily and cached per render pass: a table with no link
 * columns never walks another table's rows.
 */
export function useRefLabel(entity: EntityDef | undefined): RefLabel {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  return useMemo<RefLabel>(() => {
    const cache = new Map<string, Map<string, string>>()

    const labelsFor = (refEntityId: string): Map<string, string> => {
      const hit = cache.get(refEntityId)
      if (hit) return hit
      const target = entities[refEntityId]
      const map = new Map<string, string>()
      if (target) {
        const rows: RowData[] = rowsByEntity[refEntityId] ?? []
        /* `rowLabel` is the model's own answer to "what is this row
           called" — the same one a reference picker and a node badge
           print, so three surfaces cannot disagree. */
        for (const r of rows) map.set(r.id, rowLabel(target, r))
        /* touch displayFieldOf so a table with no display column set
           still resolves through the model's fallback rather than
           through a second guess written here */
        if (rows.length === 0) displayFieldOf(target)
      }
      cache.set(refEntityId, map)
      return map
    }

    return (fieldId, rowId) => {
      const field = entity?.fields.find((f) => f.id === fieldId)
      if (!field?.refEntityId) return undefined
      return labelsFor(field.refEntityId).get(rowId)
    }
  }, [entity, entities, rowsByEntity])
}

/* ---------------------------------------------------------- */
/* what a link column can point at                            */
/* ---------------------------------------------------------- */

export interface RefOption {
  /** the row id, which is what a reference cell actually stores */
  id: string
  /** the row's name, which is what a person picks */
  label: string
}

/**
 * The rows a link column may point at, named.
 *
 * EMPTY FOR EVERY OTHER KIND OF COLUMN, and cheaply: a table with
 * no link columns never walks another table. The list is capped
 * nowhere on purpose — a `<select>` over 2,937 products is the
 * browser's own problem to solve and it solves it well, whereas a
 * silently truncated list of things you may point at is a door
 * that hides half the workbook.
 */
export function useRefOptions(field: FieldDef | null | undefined): RefOption[] {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  return useMemo<RefOption[]>(() => {
    if (!field || field.type !== 'reference' || !field.refEntityId) return []
    const target = entities[field.refEntityId]
    if (!target) return []
    return (rowsByEntity[field.refEntityId] ?? []).map((r) => ({
      id: r.id,
      label: rowLabel(target, r),
    }))
  }, [field, entities, rowsByEntity])
}
