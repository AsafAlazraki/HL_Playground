/* ============================================================
   Grouping — a PURE VIEW TRANSFORM over rows that are, and stay,
   flat.

   `EntityDef.hierarchy` is an ordered list of column ids. The LAST
   one names the row itself ("540", "F115", "Bow Roller") and stays
   an ordinary editable column; every level BEFORE it is a drawer the
   register is filed into:

       hierarchy  =  Brand ▸ Range ▸ Model
       drawers    =  Brand, Range
       leaf       =  Model + the detail columns

   Nothing here reads or writes the store, and no RowData is ever
   touched: fold a drawer, sort a column, rename a group — the rows
   underneath are exactly the rows the store holds.
   ============================================================ */
import type { EntityDef, FieldDef } from '@/types/model'
import type { ViewRow } from '@/features/table/core'
import { ADD_H, GROUP_H, ROW_H } from './helpers'

/** Path separator that cannot occur in a typed cell value. */
const SEP = '\u001F'

/** The bucket rows with nothing filed under this level fall into.
 *  Designed, named and reachable — never a vanishing act. */
export const UNASSIGNED_LABEL = '(unassigned)'

export const groupKey = (path: readonly string[]): string => path.join(SEP)

/* ---------------------------------------------------------- */
/* the tree                                                   */
/* ---------------------------------------------------------- */

export interface GroupNode {
  /** stable identity of this drawer — its full path */
  key: string
  /** 0 = outermost drawer */
  level: number
  /** the level's value; '' means the row had none */
  value: string
  /** values from level 0 down to this one */
  path: string[]
  /** leaves anywhere inside, however deep */
  leafCount: number
  /** filed one level deeper — empty on the innermost drawer */
  children: GroupNode[]
  /** rows filed directly here — only ever on the innermost drawer */
  leaves: ViewRow[]
}

/** The column ids a table files its rows under. The deepest level of
 *  the hierarchy names the row, so it is NOT a drawer — it stays a
 *  column you type into. Ids no longer present on the entity are
 *  dropped, so an old hierarchy can never blank a table. */
export function groupLevelIds(entity: EntityDef | undefined): string[] {
  const h = entity?.hierarchy
  if (!entity || !h || h.length < 2) return []
  const own = new Set(entity.fields.map((f) => f.id))
  return h.slice(0, -1).filter((id) => own.has(id))
}

/** The columns a leaf row shows: everything except the drawers. */
export function leafFieldsOf(fields: FieldDef[], levelIds: string[]): FieldDef[] {
  if (levelIds.length === 0) return fields
  const drawer = new Set(levelIds)
  return fields.filter((f) => !drawer.has(f.id))
}

/** Builds the drawer tree in FIRST-APPEARANCE order, so the grouping
 *  respects whatever order the view is already in (store order by
 *  default, the user's sort when one is set). The unassigned bucket
 *  always files last among its siblings. */
export function buildGroups(
  rows: readonly ViewRow[],
  levelIds: readonly string[],
  textOf: (row: ViewRow, fieldId: string) => string,
): GroupNode[] {
  if (levelIds.length === 0) return []

  const roots: GroupNode[] = []
  const index = new Map<string, GroupNode>()

  for (const row of rows) {
    const path: string[] = []
    let siblings = roots
    let parent: GroupNode | undefined

    for (let level = 0; level < levelIds.length; level += 1) {
      path.push(textOf(row, levelIds[level]).trim())
      const key = groupKey(path)
      let node = index.get(key)
      if (!node) {
        node = {
          key,
          level,
          value: path[level],
          path: [...path],
          leafCount: 0,
          children: [],
          leaves: [],
        }
        index.set(key, node)
        siblings.push(node)
      }
      node.leafCount += 1
      parent = node
      siblings = node.children
    }

    parent?.leaves.push(row)
  }

  sortUnassignedLast(roots)
  return roots
}

/** '' sorts last at every level; everything else keeps first-appearance
 *  order, which is what makes the grouping feel like the sheet rather
 *  than like a re-sort the user did not ask for. */
function sortUnassignedLast(nodes: GroupNode[]): void {
  nodes.sort((a, b) => (a.value === '' ? 1 : 0) - (b.value === '' ? 1 : 0))
  for (const n of nodes) if (n.children.length > 0) sortUnassignedLast(n.children)
}

/** Every leaf filed anywhere inside a drawer, however deep and
 *  whether or not it is folded shut — what "rename this group"
 *  has to rewrite. */
export function collectLeaves(node: GroupNode, out: ViewRow[] = []): ViewRow[] {
  if (node.children.length === 0) {
    out.push(...node.leaves)
    return out
  }
  for (const child of node.children) collectLeaves(child, out)
  return out
}

/* ---------------------------------------------------------- */
/* the drawn lines                                            */
/* ---------------------------------------------------------- */

export type GridLine =
  | { kind: 'leaf'; top: number; h: number; r: number; rowId: string }
  | { kind: 'group'; top: number; h: number; node: GroupNode; collapsed: boolean }
  | {
      kind: 'add'
      top: number
      h: number
      key: string
      level: number
      path: string[]
      /** the group this + ROW files into, for the button's own words */
      label: string
      /** every level of that path actually holds a value — so, and only
       *  so, can the button honestly promise to fill them in */
      named: boolean
    }

export interface GridLayout {
  /** every drawn line, top to bottom */
  lines: GridLine[]
  /** the leaves actually on screen, in drawn order — THIS is what the
   *  grid indexes cells against, so folding a drawer simply removes
   *  rows from the addressable set */
  leafRows: ViewRow[]
  /** y of the leaf at visible index r */
  topOfLeaf: (r: number) => number
  /** total drawn height */
  bodyH: number
  grouped: boolean
}

const flatLayout = (rows: readonly ViewRow[]): GridLayout => {
  const lines: GridLine[] = rows.map((vr, r) => ({
    kind: 'leaf',
    top: r * ROW_H,
    h: ROW_H,
    r,
    rowId: vr.rowId,
  }))
  return {
    lines,
    leafRows: rows as ViewRow[],
    topOfLeaf: (r) => r * ROW_H,
    bodyH: rows.length * ROW_H,
    grouped: false,
  }
}

/** Walks the tree into the flat run of lines the grid paints, skipping
 *  the innards of any folded drawer. Every innermost drawer ends in its
 *  own + ROW — the one control that makes a hierarchy worth having. */
export function layoutGroups(
  rows: readonly ViewRow[],
  roots: readonly GroupNode[],
  collapsed: ReadonlySet<string>,
): GridLayout {
  if (roots.length === 0) return flatLayout(rows)

  const lines: GridLine[] = []
  const leafRows: ViewRow[] = []
  const leafTops: number[] = []
  let y = 0

  const walk = (nodes: readonly GroupNode[]): void => {
    for (const node of nodes) {
      const shut = collapsed.has(node.key)
      lines.push({ kind: 'group', top: y, h: GROUP_H, node, collapsed: shut })
      y += GROUP_H
      if (shut) continue

      if (node.children.length > 0) {
        walk(node.children)
        continue
      }

      for (const vr of node.leaves) {
        lines.push({
          kind: 'leaf',
          top: y,
          h: ROW_H,
          r: leafRows.length,
          rowId: vr.rowId,
        })
        leafTops.push(y)
        leafRows.push(vr)
        y += ROW_H
      }

      lines.push({
        kind: 'add',
        top: y,
        h: ADD_H,
        key: node.key,
        level: node.level + 1,
        path: node.path,
        label: node.value === '' ? UNASSIGNED_LABEL : node.value,
        named: node.path.every((v) => v !== ''),
      })
      y += ADD_H
    }
  }

  walk(roots)

  return {
    lines,
    leafRows,
    topOfLeaf: (r) => leafTops[r] ?? (leafTops[leafTops.length - 1] ?? 0),
    bodyH: y,
    grouped: true,
  }
}

/** First line at or after `y` — the windowing entry point. Lines are
 *  strictly increasing in `top`, so this is a plain binary search. */
export function firstLineAt(lines: readonly GridLine[], y: number): number {
  let lo = 0
  let hi = lines.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].top + lines[mid].h <= y) lo = mid + 1
    else hi = mid
  }
  return lo
}

/* ---------------------------------------------------------- */
/* words                                                      */
/* ---------------------------------------------------------- */

/** What the rows inside a drawer are CALLED. Taken from the column that
 *  names them, so a boat table counts "12 models", an accessory table
 *  counts "12 products" and a dealer table counts "12 dealers" — the
 *  count reads as the domain, never as "12 records". */
export interface LeafNoun {
  one: string
  many: string
}

export function leafNoun(entity: EntityDef | undefined): LeafNoun {
  const h = entity?.hierarchy
  const id = h && h.length > 0 ? h[h.length - 1] : undefined
  const field = id ? entity?.fields.find((f) => f.id === id) : undefined
  const one = (field?.name ?? '').trim().toLowerCase() || 'row'
  if (/[^aeiou]y$/.test(one)) return { one, many: `${one.slice(0, -1)}ies` }
  if (/(s|x|z|ch|sh)$/.test(one)) return { one, many: `${one}es` }
  return { one, many: `${one}s` }
}

export const countLabel = (n: number, noun: LeafNoun): string =>
  `${n} ${n === 1 ? noun.one : noun.many}`
