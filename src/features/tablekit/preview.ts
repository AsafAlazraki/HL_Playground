/* ============================================================
   The live preview behind question two.

   Structure presets are abstract until you see them holding real
   names, so every kind carries a few sample rows. Choosing a preset
   nests those rows exactly the way the finished table will nest them
   — Highfield ▸ Sport ▸ SP560 ▸ PVC W-W-WB — which is what makes the
   choice obvious without a paragraph of explanation.

   INVENTED SAMPLE DATA IS BANNED (spec §6b). Every string below is a
   value that exists in the Master Price File workbooks, cited on the
   row it appears in; where the workbooks hold nothing for a kind, the
   sample list is EMPTY and the preview draws level-named placeholders
   instead of making something up.

   Samples are read by POSITION, never by the name on screen. Level
   names belong to the user — they can rename Series to Range and add
   a level no preset offered — so a row is a list of values ordered to
   this kind's deepest preset, and `sampleSlots` works out which of
   those columns feeds each level. Rename a level in TABLE_KINDS and
   nothing here has to be touched.

   Samples are display-only. Nothing here is ever written to the
   project; `createTable` builds the real, empty table.
   ============================================================ */
import { TABLE_KINDS, type TableKind } from '@/types/model'

/** One sample row: a value per level of this kind's DEEPEST preset,
 *  outermost first. Positional — see `sampleSlots`. */
type SampleRow = string[]

const SAMPLES: Record<TableKind, SampleRow[]> = {
  /* Boat Module — Brand ▸ Series ▸ Model ▸ Variant. Series tokens from
     the live block's prefix table (SP Sport, PA Patrol); models and
     variants from the seeded Highfield rows, where the variant axis is
     material × colourway. Highfield is the only brand the workbooks
     carry a full four-deep chain for, so it is the only one here. */
  boat: [
    ['Highfield', 'Sport', 'SP520', 'PVC W-W-WB'],
    ['Highfield', 'Sport', 'SP520', 'HYP W-W-WB'],
    ['Highfield', 'Sport', 'SP600', 'PVC W-W-WB'],
    ['Highfield', 'Patrol', 'PA460', 'PVC DG-G-DG'],
    ['Highfield', 'Patrol', 'PA540 Open', 'PVC O-G-DG'],
  ],
  /* Motor Library — the taxonomy is in the CODE, not in a column: the
     only series that exist are banner rows ('Four Stroke Models' r5).
     Model strings are Motor!C display names. */
  motor: [
    ['Yamaha', 'Four Stroke', 'F70LB'],
    ['Yamaha', 'Four Stroke', 'F90XB'],
    ['Yamaha', 'Four Stroke', 'F115XB'],
    ['Yamaha', 'Four Stroke', 'F175XC'],
  ],
  /* Trailer Module — brand banner, then the series string the module
     writes ('GFAB - Highfield Series'), then the trailer code. */
  trailer: [
    ['GFAB', 'Highfield Series', 'SP600'],
    ['GFAB', 'Highfield Series', 'SP660'],
    ['GFAB', 'Highfield Series', 'PA600'],
    ['REDCO', 'Sportsman', 'RE170-MO'],
  ],
  /* Highfield supplier price list — its own category tokens, with the
     product family the descriptions are already written around. */
  accessory: [
    ['Cover', 'Boat Cover', 'Boat Cover - SP560'],
    ['Cover', 'Boat Cover', 'Boat Cover - SP520/560'],
    ['Cover', 'Stern Shade', 'Stern Shade for SP560'],
    ['Roll bar & Ladder', 'Roll Bar', 'Roll Bar - SP560/600/660'],
  ],
  /* Motor Library rows 343–628 — boat+motor pairings sold as one item,
     which is what a package is. */
  package: [
    ['Haines Signature', 'SIG 525F w Yamaha - F115XB'],
    ['Jeanneau', 'CC 10.5WA w Yamaha Twin 450HP XTO'],
  ],
  /* The workbooks have no dealer sheet — there is nothing to quote, so
     the preview draws level-named placeholders instead. */
  dealer: [],
  custom: [],
}

/** What a flat list of this kind looks like — one straight column. */
const FLAT_SAMPLES: Record<TableKind, string[]> = {
  boat: [
    'Highfield - SP520 (PVC) W-W-WB',
    'Highfield - SP600 (PVC) W-W-WB',
    'Highfield - PA540 Open (PVC) O-G-DG',
  ],
  motor: ['Yamaha - F70LB', 'Yamaha - F115XB', 'Yamaha - F175XC'],
  trailer: [
    'GFAB Highfield SP600 Series',
    'GFAB Highfield PA600 Series',
    'REDCO Sportsman - RE170-MO',
  ],
  accessory: [
    'Boat Cover - SP560',
    'Stern Shade for SP560',
    'Tube Covers to suit PVC Boat - 5.6 Mtr',
  ],
  package: ['SIG 525F w Yamaha - F115XB', 'CC 10.5WA w Yamaha Twin 450HP XTO'],
  dealer: ['Your first row', 'Your second row', 'Your third row'],
  custom: ['Your first row', 'Your second row', 'Your third row'],
}

/** One rendered line of the preview. */
export interface PreviewLine {
  key: string
  label: string
  /** 0 is the outermost group */
  depth: number
  /** leaves are the editable rows; everything else is a group header */
  isLeaf: boolean
  /** rows inside this group — undefined on a leaf */
  count?: number
}

interface TreeNode {
  label: string
  children: TreeNode[]
}

/** One level of the preview: which sample column feeds it, and what to
 *  show when the samples do not run that deep. */
interface Slot {
  column: number
  fallback: string
}

function buildTree(rows: SampleRow[], slots: Slot[]): TreeNode[] {
  const roots: TreeNode[] = []
  for (const row of rows) {
    let siblings = roots
    for (const slot of slots) {
      const label = row[slot.column] ?? slot.fallback
      let node = siblings.find((n) => n.label === label)
      if (!node) {
        node = { label, children: [] }
        siblings.push(node)
      }
      siblings = node.children
    }
  }
  return roots
}

/** Two of everything, named after the levels themselves — what a kind
 *  the workbooks hold nothing for looks like grouped.
 *
 *  It bottoms out ON the deepest level, never below it: in the finished
 *  table the deepest level IS the row (it is the table's display column),
 *  so hanging a generic "Your first row" underneath would draw a level
 *  that will not be there. */
function placeholderTree(levels: string[], depth = 0): TreeNode[] {
  return [1, 2].map((n) => ({
    label: `${levels[depth]} ${n}`,
    children: depth + 1 < levels.length ? placeholderTree(levels, depth + 1) : [],
  }))
}

/**
 * Which sample column feeds each level of a chain this deep.
 *
 * Sample rows are ordered to the kind's DEEPEST preset, so that preset
 * is the column index. A shallower chain is not simply the first N
 * columns: a two-level boat table is Brand ▸ MODEL, not Brand ▸ Series,
 * so the preset of matching depth says which columns it skips, matched
 * against the deepest one by name. Nothing here reads the names the
 * user typed — rename Series to Range and the boats do not move.
 */
function sampleSlots(kind: TableKind, levels: string[]): Slot[] {
  const structures = TABLE_KINDS[kind].structures
  const sameDepth = structures.find((p) => p.levels.length === levels.length)
  const deepest = structures.reduce((a, b) => (b.levels.length > a.levels.length ? b : a))
  const chain = (sameDepth ?? deepest).levels
  return levels.map((name, i) => {
    /* levels beyond every preset (the user added a fifth) have no
       sample column of their own, and fall back to their own name */
    const at = i < chain.length ? deepest.levels.indexOf(chain[i]) : -1
    return { column: at >= 0 ? at : i, fallback: `${name} 1` }
  })
}

/** Rows inside a group = the leaves under it, which is exactly what the
 *  finished table counts beside a collapsed group. */
function leavesUnder(node: TreeNode): number {
  if (node.children.length === 0) return 1
  return node.children.reduce((n, child) => n + leavesUnder(child), 0)
}

function flatten(
  nodes: TreeNode[],
  depth: number,
  path: string,
  out: PreviewLine[],
): void {
  for (const node of nodes) {
    const key = `${path}/${node.label}`
    const isLeaf = node.children.length === 0
    out.push({
      key,
      label: node.label,
      depth,
      isLeaf,
      count: isLeaf ? undefined : leavesUnder(node),
    })
    if (!isLeaf) flatten(node.children, depth + 1, key, out)
  }
}

/** Keeps the preview a glance, never a scroll. */
export const PREVIEW_MAX_LINES = 9

export interface Preview {
  lines: PreviewLine[]
  /** true when the sample ran longer than the preview shows */
  truncated: boolean
}

/** The nesting `levels` produces, drawn with this kind's sample names. */
export function buildPreview(kind: TableKind, levels: string[]): Preview {
  if (levels.length === 0) {
    return {
      lines: FLAT_SAMPLES[kind].map((label, i) => ({
        key: `flat-${i}`,
        label,
        depth: 0,
        isLeaf: true,
      })),
      truncated: false,
    }
  }
  const rows = SAMPLES[kind]
  const tree =
    rows.length === 0
      ? placeholderTree(levels)
      : buildTree(rows, sampleSlots(kind, levels))
  const all: PreviewLine[] = []
  flatten(tree, 0, kind, all)
  return {
    lines: all.slice(0, PREVIEW_MAX_LINES),
    truncated: all.length > PREVIEW_MAX_LINES,
  }
}

/** "Brand and Range" / "Brand, Range and Model" — plain English, no commas
 *  where a person would not put one. */
export function joinLevels(levels: string[]): string {
  if (levels.length === 0) return ''
  if (levels.length === 1) return levels[0]
  return `${levels.slice(0, -1).join(', ')} and ${levels[levels.length - 1]}`
}

/** The one line under the preview that says why the nesting is worth having. */
export function previewNote(levels: string[]): string {
  if (levels.length === 0) {
    return 'One straight list — every row sits at the same level.'
  }
  if (levels.length === 1) {
    return `Rows are grouped by ${levels[0]}.`
  }
  return `Add a row inside a group and its ${joinLevels(levels.slice(0, -1))} ${
    levels.length === 2 ? 'is' : 'are'
  } filled in for you.`
}
