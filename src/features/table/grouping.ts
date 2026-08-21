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
import {
  TABLE_KINDS,
  displayFieldOf,
  type EntityDef,
  type FieldDef,
  type TableKind,
} from '@/types/model'
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

/**
 * A column name that says what the column's JOB is rather than what the
 * row IS. "12 names" and "27 labels" are no better than "12 records", so
 * a table whose naming column is called one of these keeps the neutral
 * word — including every table a person has just made, whose first
 * column this app calls `Name`.
 */
const NOT_A_KIND = new Set(['name', 'label', 'title', 'id', 'code', 'description', 'value'])

/**
 * WHAT ONE ROW OF A TABLE OF THIS KIND IS — the word the table's own
 * `kind` already asserts, and the last word standing when the naming
 * column cannot be trusted. `TABLE_KINDS[k].label` is the plural of
 * exactly this word on every entry, which is what stops the two
 * disagreeing.
 *
 * `custom` is deliberately blank. A custom table's kind says nothing
 * about its rows — that is what makes it custom — so it never overrules
 * the column and never supplies a word of its own.
 */
const KIND_NOUN: Record<TableKind, string> = {
  boat: 'boat',
  motor: 'motor',
  trailer: 'trailer',
  accessory: 'accessory',
  package: 'package',
  dealer: 'dealer',
  custom: '',
}

/** Which kind a word names, for the words that name one. */
const KIND_BY_NOUN: Map<string, TableKind> = new Map(
  (Object.keys(KIND_NOUN) as TableKind[])
    .filter((k) => KIND_NOUN[k] !== '')
    .map((k) => [KIND_NOUN[k], k]),
)

/**
 * A RELATIONSHIP'S ROWS ARE PAIRINGS, and that is the dealer's own word
 * for them — it is the name of the band every join table in the prepared
 * set files its two ends under (`{ id: "pairing", name: "Pairing" }`).
 *
 * Twenty-six of the fifty cards on the front door are Relationships, and
 * every one of them read "· 71 rows" — the jargon noun, on more than half
 * the screen, under a heading that had already said what they are. A
 * pairing is not a thing the dealer has one of; it is the fact that two
 * things go together, which is precisely what the card is for.
 */
const PAIRING: LeafNoun = Object.freeze({ one: 'pairing', many: 'pairings' })

/** The table's kind, defaulted the way every other surface defaults it. */
const kindOfEntity = (entity: EntityDef): TableKind =>
  entity.kind !== undefined && entity.kind in TABLE_KINDS ? entity.kind : 'custom'

/**
 * WHICH COLUMN NAMES THE ROWS. The deepest grouping level, because that
 * is the level a drawer opens onto — and where a table has no grouping
 * at all, the DISPLAY column, which is the column that names a row by
 * definition.
 *
 * Formosa is why the second half exists. It is the one boat table the
 * workbook files under no series banner, so its `hierarchy` is empty and
 * the front door read "26 rows" beside six sibling brands reading
 * "models" and "variants" — the jargon noun, on the one card that fell
 * through. Its display column is `Model`, the same column the others
 * group by, so the fall-through was the bug and not the data. `Labour
 * Rates` and `Oils & Consumables` were in the same state and now read
 * "18 rates" and "27 consumables".
 *
 * A COLUMN NAME IS NOT ALLOWED TO OVERRULE THE TABLE'S KIND, and the two
 * Factory Packages files are why. Haines Signature Factory Packages and
 * Jeanneau Factory Packages are `kind: 'package'`, and their naming
 * column is headed `Motor` — because the Master Price File types a
 * boat-plus-engine bundle into the boat row's motor slot, so the bundles
 * live in the Motor Library. The seed's own note on those tables says it
 * in capitals: "These are NOT motors." FITMENT_RULES.md §1.3 and §1.5
 * are why they are separate tables at all, and why neither Haines nor
 * Jeanneau carries a Yamaha motor-fitment join. The front door read
 * "39 motors" on both, contradicting the research the same seed cites
 * two lines above the count.
 *
 * So: when the naming column's word names a DIFFERENT one of the app's
 * kinds than the table declares, the column is naming a RELATION rather
 * than the row, and the table's own kind wins. A `custom` table declares
 * nothing, so nothing of its is overruled.
 */
function leafColumnName(entity: EntityDef): string {
  const h = entity.hierarchy
  const id = h && h.length > 0 ? h[h.length - 1] : undefined
  const field = id ? entity.fields.find((f) => f.id === id) : displayFieldOf(entity)
  const name = (field?.name ?? '').trim().toLowerCase()
  if (NOT_A_KIND.has(name)) return ''
  const own = kindOfEntity(entity)
  if (own !== 'custom') {
    const named = KIND_BY_NOUN.get(name)
    if (named !== undefined && named !== own) return ''
  }
  return name
}

/** One word, and its plural. Written once so `leafNoun` and
 *  `kindNoun` can never disagree about "accessories". */
function pluralise(one: string): LeafNoun {
  if (/[^aeiou]y$/.test(one)) return { one, many: `${one.slice(0, -1)}ies` }
  if (/(s|x|z|ch|sh)$/.test(one)) return { one, many: `${one}es` }
  return { one, many: `${one}s` }
}

export function leafNoun(entity: EntityDef | undefined): LeafNoun {
  if (!entity) return { one: 'row', many: 'rows' }
  if (entity.role === 'join') return { ...PAIRING }
  return pluralise(leafColumnName(entity) || KIND_NOUN[kindOfEntity(entity)] || 'row')
}

/**
 * The word for a KIND, when the thing being counted spans several
 * tables and their own naming columns disagree.
 *
 * FITMENT totals 810 rows across seven boat tables. `leafNoun` gives
 * each of them the dealer's own word — 588 "variants", 91 "models" —
 * and both are right about their own table and neither is right about
 * the sum: "810 variants" is false and "810 rows" is the jargon this
 * whole file exists to keep off the screen. The kind's word is the
 * one true word for the set, and it is still the dealer's vocabulary
 * rather than a schema term.
 *
 * Empty for `custom`, which declares nothing — a caller with no word
 * to use should say something else rather than invent one.
 */
export function kindNoun(kind: TableKind): LeafNoun | null {
  const one = KIND_NOUN[kind]
  return one ? pluralise(one) : null
}

export const countLabel = (n: number, noun: LeafNoun): string =>
  `${n} ${n === 1 ? noun.one : noun.many}`
