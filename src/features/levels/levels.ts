/* ============================================================
   LEVELS — set a value once, and every row beneath it takes it.

   ------------------------------------------------------------
   THE ONE THING TO KNOW BEFORE YOU CHANGE ANYTHING HERE
   ------------------------------------------------------------
   THERE IS NO SHADOW LAYER. A level does not STORE a value
   anywhere. Setting Shaft Lgth at the "Ocean Master" level writes
   the string `XL` into 187 real `RowData.values` cells through
   `updateCell`, and that is the whole mechanism.

   That is deliberate, and it is why the owner's brief ends
   "...and that when saved that flows onto the quotes." A quote
   reads the ROWS. So does a view page, a module tile, a rule, a
   CSV export and the fitment fan-out. Because this door writes
   rows, every one of them is already correct the instant it runs
   — nobody has to teach them about levels, and there is no second
   source of truth to fall out of step.

   If a future session is tempted to add `EntityDef.levelDefaults`
   so a level can be "unset" again: that is the second source of
   truth, and the day it disagrees with a row is the day a quote
   prints a price the sheet does not hold. Say no.

   ------------------------------------------------------------
   SO WHAT IS A LEVEL'S VALUE, IF IT IS NOT STORED?
   ------------------------------------------------------------
   It is COUNTED. A level's value for a column is what MOST of its
   rows agree on — and "most" means a real majority, more than half
   of the rows that hold anything:

     · every row holds the same thing  -> the level SAYS that thing
     · over half hold one thing        -> that is the level's
                                         ANSWER, and the rest are
                                         EXCEPTIONS
     · no value has over half          -> the level has NO answer,
                                         however common its
                                         commonest value is

   THE MAJORITY RULE IS NOT FUSSINESS, AND IT WAS PUT IN AFTER
   WATCHING THE SCREEN LIE. Highfield's `Warranty` column holds a
   PRICE: 199 Sport variants across 27 different figures, the
   commonest on 9 of them. A plurality rule made 9-in-199 "the
   level's answer", marked the other 190 as DIFFERING from it, and
   offered a button reading *Put all back to "48177"* — one press
   from flattening 190 real prices onto a 4.5% outlier. §7: a
   suggestion that is confidently wrong is worse than no
   suggestion. Over half, or the level says nothing.

   Nothing is estimated. `tallyAt` walks the rows and counts them,
   and every sentence this feature prints is built out of those
   counts.

   That definition also makes OVERRIDE derivable, which is the
   part that would otherwise need storing: a row overrides its
   level when it holds something other than the level's answer.
   Set a level, and every row agrees, so nothing overrides. Retype
   one boat afterwards, and that boat is a lone exception — which
   is exactly what a person means by "this one is different".

   ------------------------------------------------------------
   WHAT A LEVEL IS
   ------------------------------------------------------------
   README: "Hierarchy is a view, not a shape." `EntityDef.hierarchy`
   is an ordered list of column ids, the LAST of which names the row
   itself. So Highfield Inflatables runs

       Series ▸ Model ▸ Variant        (588 flat rows)

   and the levels are

       the table            588 variants
       ├─ Series            e.g. "Ocean Master"
       │  └─ Model          e.g. "OM 540"
       │     └─ the row     one variant — an individual

   `groupLevelIds` (features/table/grouping.ts) is imported rather
   than re-derived: it is THE definition of which columns are
   drawers, and two copies of that would drift into a correctness
   bug rather than a build break.

   THE ROW LEVEL IS NOT IN THE TREE. Materialising 2,937 leaf nodes
   for Parts & Accessories buys nothing — an individual is reached
   by picking it out of the list under its level, which is where a
   person is already looking to see which ones differ.

   ------------------------------------------------------------
   TRIMMING, PRECISELY, BECAUSE IT IS TWO DIFFERENT ANSWERS
   ------------------------------------------------------------
   DRAWER PATHS ARE TRIMMED, because `buildGroups` trims and this
   tree must file rows into exactly the drawers the register draws.

   COLUMN VALUES ARE NOT TRIMMED. `seedFidelity.test.ts` records
   that this workbook really does hold `495 - Pro Fisher.` and
   `Surtess  -  770 Game Fisher XL`, verbatim, and that normalising
   the dealer's own data is how a seed stops being evidence. So if
   199 rows hold `XL` and one holds `XL `, this feature reports a
   split. That is true, it is visible, and it is how the dealer
   finds out.
   ============================================================ */

import {
  imageCellText,
  isImageValue,
  isPairFieldId,
  isSystemFieldId,
  type CellValue,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'
import {
  UNASSIGNED_LABEL,
  groupLevelIds,
  leafNoun,
  type LeafNoun,
} from '@/features/table/grouping'

/** Path separator that cannot occur in a typed cell value — the
 *  same unit separator `grouping.ts` files drawers under. */
const SEP = '\u001F'

/** The table level — every row on the table, no drawer between. */
export const TABLE_LEVEL_KEY = ''

/**
 * EVERY DRAWER KEY IS PREFIXED, and the prefix is the whole reason
 * this is not just `path.join(SEP)`.
 *
 * The outermost unassigned drawer has the path `['']`, which joins
 * to `''` — the table level's own key. Without the prefix, every
 * row with no Series would be filed onto the table level and the
 * unassigned drawer would be unreachable. Prefixed, `''` can only
 * ever mean the table.
 */
export const levelKeyOf = (path: readonly string[]): string => SEP + path.join(SEP)

/* ---------------------------------------------------------- */
/* what a cell reads as                                       */
/* ---------------------------------------------------------- */

/** Resolves a reference cell to the row it points at. Supplied by
 *  the surface, which is the only layer that can see other tables. */
export type RefLabel = (fieldId: string, rowId: string) => string | undefined

/**
 * The text a value is COUNTED and COMPARED as.
 *
 * It is not `features/table/helpers.ts`'s `cellText`: that one is
 * the clipboard's exact inverse and must keep printing
 * `9097.1429`. This one only has to be the same string for two
 * cells a person would call the same, and a different string for
 * two they would not — which is the whole of what a tally needs.
 *
 * A number column prints its figure unformatted on purpose. There
 * is exactly one money format in this app and it lives in
 * `@/features/views/columns`; a caller that wants it passes its own
 * `textOf` rather than this file growing a second one.
 */
export function valueText(
  value: CellValue,
  field: FieldDef,
  refLabel?: RefLabel,
): string {
  if (value === null || value === undefined) return ''
  if (isImageValue(value)) return imageCellText(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (field.type === 'reference' && typeof value === 'string') {
    return refLabel?.(field.id, value) ?? value
  }
  return String(value)
}

/** Blank means "nothing has been said here" — including a cell
 *  holding only spaces, which no dealer would call a value. */
export const isBlankText = (text: string): boolean => text.trim() === ''

/* ---------------------------------------------------------- */
/* the tree                                                   */
/* ---------------------------------------------------------- */

export interface LevelNode {
  /** stable identity — '' for the table, the drawer path below it */
  key: string
  /** 0 = the table; 1..n = the drawer levels, outermost first */
  depth: number
  /** this drawer's own value; '' on the table, and '' for the
   *  unassigned bucket */
  value: string
  /** what to draw: the table's name, the drawer's value, or
   *  `(unassigned)` — never a blank line */
  label: string
  /** what this level is CALLED: "Series", "Model" — the dealer's
   *  own column heading, never a schema word */
  levelName: string
  /** drawer values from level 1 down to here */
  path: string[]
  /** every row filed anywhere beneath, in the order the sheet
   *  holds them */
  rows: RowData[]
  children: LevelNode[]
  parentKey: string | null
}

export interface LevelModel {
  entity: EntityDef
  /** drawer column ids, outermost first */
  levelIds: string[]
  /** their headings, outermost first */
  levelNames: string[]
  /** the table level; everything hangs off it */
  root: LevelNode
  byKey: Map<string, LevelNode>
  /** the dealer's word for one row — "variant", "trailer" */
  noun: LeafNoun
  /** rows on the whole table */
  total: number
  /**
   * HOW THIS MODEL READS A CELL, CARRIED WITH IT.
   *
   * A linked column stores a row id and shows a NAME. If the tree
   * were built with a resolver and a later `tallyAt` were not, one
   * would file under "Yamaha" and the other would count
   * "k7Qa_2xLm" — two truths about the same column, on the same
   * screen. So the reader travels on the model, and every function
   * below defaults to it. A caller may still override per call
   * (the money formatter is the intended case).
   */
  opts: BuildOpts
}

export interface BuildOpts {
  /** override how a cell reads — pass the money formatter here */
  textOf?: (row: RowData, field: FieldDef) => string
  refLabel?: RefLabel
}

/**
 * Files the table's rows into its drawers.
 *
 * FIRST-APPEARANCE ORDER, and unassigned last at every level —
 * both copied from `buildGroups` on purpose, so the tree a person
 * picks a level out of here is in the same order as the sheet they
 * just came from.
 */
export function buildLevelModel(
  entity: EntityDef,
  rows: readonly RowData[],
  opts: BuildOpts = {},
): LevelModel {
  const levelIds = groupLevelIds(entity)
  const byId = new Map(entity.fields.map((f) => [f.id, f]))
  const levelNames = levelIds.map((id) => (byId.get(id)?.name ?? '').trim())
  const noun = leafNoun(entity)

  const read = (row: RowData, field: FieldDef): string =>
    opts.textOf?.(row, field) ?? valueText(row.values[field.id] ?? null, field, opts.refLabel)

  const root: LevelNode = {
    key: TABLE_LEVEL_KEY,
    depth: 0,
    value: '',
    label: entity.name,
    levelName: 'Whole table',
    path: [],
    rows: [...rows],
    children: [],
    parentKey: null,
  }

  const byKey = new Map<string, LevelNode>([[TABLE_LEVEL_KEY, root]])

  for (const row of rows) {
    const path: string[] = []
    let parent = root

    for (let d = 0; d < levelIds.length; d += 1) {
      const field = byId.get(levelIds[d])
      /* groupLevelIds already dropped ids the entity no longer has,
         so this cannot happen — but a missing column must file the
         row somewhere reachable rather than drop it. */
      const text = field ? read(row, field).trim() : ''
      path.push(text)
      const key = levelKeyOf(path)
      let node = byKey.get(key)
      if (!node) {
        node = {
          key,
          depth: d + 1,
          value: text,
          label: text === '' ? UNASSIGNED_LABEL : text,
          levelName: levelNames[d] ?? '',
          path: [...path],
          rows: [],
          children: [],
          parentKey: parent.key,
        }
        byKey.set(key, node)
        parent.children.push(node)
      }
      node.rows.push(row)
      parent = node
    }
  }

  sortUnassignedLast(root)
  return { entity, levelIds, levelNames, root, byKey, noun, total: rows.length, opts }
}

function sortUnassignedLast(node: LevelNode): void {
  node.children.sort((a, b) => (a.value === '' ? 1 : 0) - (b.value === '' ? 1 : 0))
  for (const c of node.children) sortUnassignedLast(c)
}

/** The levels from the table down to this one, outermost first —
 *  what a breadcrumb draws. */
export function trailTo(model: LevelModel, key: string): LevelNode[] {
  const out: LevelNode[] = []
  let node = model.byKey.get(key)
  while (node) {
    out.unshift(node)
    node = node.parentKey === null ? undefined : model.byKey.get(node.parentKey)
  }
  return out
}

/** The one place a cell is turned into text. `opts` given at the
 *  call site wins over the model's own, field by field, so a
 *  caller can hand in a formatter without losing the resolver. */
function readerOf(
  model: LevelModel,
  opts: BuildOpts,
): (row: RowData, field: FieldDef) => string {
  const textOf = opts.textOf ?? model.opts.textOf
  const refLabel = opts.refLabel ?? model.opts.refLabel
  return (row, field) =>
    textOf?.(row, field) ?? valueText(row.values[field.id] ?? null, field, refLabel)
}

/** The same merge, for the one place a LOOSE value (not a cell)
 *  has to be read — the value being typed into the set panel. */
function refLabelOf(model: LevelModel, opts: BuildOpts): RefLabel | undefined {
  return opts.refLabel ?? model.opts.refLabel
}

/* ---------------------------------------------------------- */
/* which columns can be set at a level, and why not            */
/* ---------------------------------------------------------- */

export interface LevelColumn {
  field: FieldDef
  /** null when it can be set here; otherwise the sentence that
   *  says why not, in the place it is refused (rule 10) */
  refusal: string | null
}

/**
 * WHY A COLUMN IS REFUSED, IN A SENTENCE.
 *
 * Four kinds, and each one is a fact about the column rather than
 * a policy:
 *
 *   FORMULA   there is no cell to write. The value is computed.
 *   PICTURE   an image list belongs to one row; the same four
 *             photographs on 199 boats is not a thing anybody means.
 *   A DRAWER  writing Series at the Series level re-files every row
 *             out of the level you are standing in, and the level
 *             then vanishes underneath the person who pressed it.
 *             Re-filing is a sheet act.
 *   THE NAME  the last rung of the hierarchy is what each row is
 *             CALLED. 199 boats called the same thing is data loss
 *             wearing a bulk-edit hat.
 */
export function columnRefusal(model: LevelModel, field: FieldDef): string | null {
  if (field.type === 'formula') {
    return `${field.name} is worked out from other columns — set the columns it reads.`
  }
  if (field.type === 'image') {
    return `Pictures belong to one ${model.noun.one} at a time.`
  }
  if (model.levelIds.includes(field.id)) {
    return `${field.name} is one of the levels this table is filed under — re-filing a ${model.noun.one} is done on the sheet.`
  }
  if (nameFieldId(model.entity) === field.id) {
    return `${field.name} is what each ${model.noun.one} is called, and a name belongs to one of them.`
  }
  if (isPairFieldId(field.id) || isSystemFieldId(field.id)) {
    return `${field.name} is machinery — every ${model.noun.one} carries it and the register locks it, so it is not a value to give a whole level.`
  }
  return null
}

/** The hierarchy's last rung — the column that names the row. */
function nameFieldId(entity: EntityDef): string | undefined {
  const h = entity.hierarchy
  return h && h.length > 0 ? h[h.length - 1] : undefined
}

/** Every column, in sheet order, each carrying its refusal or null. */
export function levelColumns(model: LevelModel): LevelColumn[] {
  return model.entity.fields.map((field) => ({
    field,
    refusal: columnRefusal(model, field),
  }))
}

/* ---------------------------------------------------------- */
/* what a level currently says                                */
/* ---------------------------------------------------------- */

export interface TallyEntry {
  /** the text this many rows hold */
  text: string
  /** one of the raw values behind it — what a "reset" writes back */
  value: CellValue
  count: number
  rowIds: string[]
}

export interface Tally {
  /** rows under the level */
  total: number
  /** rows holding nothing */
  blank: number
  blankRowIds: string[]
  /** distinct non-blank values, commonest first, ties in first-
   *  appearance order */
  entries: TallyEntry[]
  /** the value the most rows hold. INFORMATIVE ONLY — it is not
   *  the level's answer unless it also holds a majority, and
   *  nothing that writes may key off it. */
  commonest: TallyEntry | null
  /**
   * THE LEVEL'S ANSWER, or null when the level has none.
   *
   * This is the one field inherit / override / reset are allowed
   * to read. It is `commonest` only when that value is held by
   * MORE THAN HALF of the rows holding anything — see the majority
   * argument in this file's header.
   */
  answer: TallyEntry | null
  /** every row agrees and none is blank */
  unanimous: boolean
  /** the top two are tied */
  split: boolean
  /** a commonest exists but does not reach half — the level is
   *  informative and silent at the same time */
  noMajority: boolean
}

export function tallyAt(
  model: LevelModel,
  levelKey: string,
  field: FieldDef,
  opts: BuildOpts = {},
): Tally {
  const node = model.byKey.get(levelKey)
  const rows = node?.rows ?? []
  const readAs = readerOf(model, opts)
  const read = (row: RowData): string => readAs(row, field)

  const seen = new Map<string, TallyEntry>()
  const blankRowIds: string[] = []

  for (const row of rows) {
    const text = read(row)
    if (isBlankText(text)) {
      blankRowIds.push(row.id)
      continue
    }
    const hit = seen.get(text)
    if (hit) {
      hit.count += 1
      hit.rowIds.push(row.id)
    } else {
      seen.set(text, {
        text,
        value: row.values[field.id] ?? null,
        count: 1,
        rowIds: [row.id],
      })
    }
  }

  /* commonest first; a tie keeps first-appearance order, which is
     the sheet's order — `Map` preserves insertion and `sort` is
     stable, so this needs no tiebreak key. */
  const entries = [...seen.values()].sort((a, b) => b.count - a.count)
  const split = entries.length >= 2 && entries[0].count === entries[1].count
  const commonest = entries.length === 0 ? null : entries[0]
  /* MORE THAN HALF OF THE ROWS THAT HOLD ANYTHING. Blanks are not
     counted against it: a Series where 8 boats say XL and 191 say
     nothing does have an answer, and filling the 191 is exactly
     what this door is for. */
  const held = rows.length - blankRowIds.length
  const majority = commonest !== null && commonest.count * 2 > held
  const answer = majority ? commonest : null

  return {
    total: rows.length,
    blank: blankRowIds.length,
    blankRowIds,
    entries,
    commonest,
    answer,
    unanimous: entries.length === 1 && blankRowIds.length === 0,
    split,
    noMajority: commonest !== null && !majority,
  }
}

/* ---------------------------------------------------------- */
/* where each row stands against its level                    */
/* ---------------------------------------------------------- */

export type Standing =
  /** holds the level's answer */
  | 'inherits'
  /** holds something else — an exception, and it says so */
  | 'overrides'
  /** holds nothing */
  | 'unset'
  /** the level has no answer, so nothing here can be called an
   *  exception. Saying "overrides" would be inventing a baseline. */
  | 'alone'

export interface RowStanding {
  rowId: string
  row: RowData
  text: string
  standing: Standing
}

export function standingsAt(
  model: LevelModel,
  levelKey: string,
  field: FieldDef,
  opts: BuildOpts = {},
): { tally: Tally; rows: RowStanding[] } {
  const tally = tallyAt(model, levelKey, field, opts)
  const node = model.byKey.get(levelKey)
  const answer = tally.answer?.text
  const readAs = readerOf(model, opts)
  const read = (row: RowData): string => readAs(row, field)

  const rows = (node?.rows ?? []).map<RowStanding>((row) => {
    const text = read(row)
    const standing: Standing =
      answer === undefined
        ? 'alone'
        : isBlankText(text)
          ? 'unset'
          : text === answer
            ? 'inherits'
            : 'overrides'
    return { rowId: row.id, row, text, standing }
  })

  return { tally, rows }
}

/* ---------------------------------------------------------- */
/* the blast radius, computed before anything happens         */
/* ---------------------------------------------------------- */

export interface SetPlan {
  entityId: string
  fieldId: string
  fieldName: string
  levelKey: string
  levelLabel: string
  /** what will be written */
  value: CellValue
  /** how that value reads */
  text: string
  /** rows under the level */
  total: number
  /** already hold exactly this — no write, no history entry */
  already: string[]
  /** hold nothing — these get filled */
  blank: string[]
  /** hold something else. LEFT ALONE unless `replace`. */
  differing: string[]
  replace: boolean
  /** the rows that will actually be written, in sheet order */
  writes: string[]
  /** null when it can run; otherwise the sentence saying why not */
  refusal: string | null
}

export interface PlanInput {
  model: LevelModel
  levelKey: string
  field: FieldDef
  value: CellValue
  /** overwrite rows that already hold something else */
  replace?: boolean
  /** narrow the act to these rows — how "reset this one boat"
   *  reuses the same arithmetic as "set the whole Series" */
  onlyRowIds?: readonly string[]
  opts?: BuildOpts
}

/**
 * Counts exactly what pressing the button will do, BEFORE it does
 * it — DESIGN_PRINCIPLES §7: "a confirm states its blast radius,
 * computed".
 *
 * The default is the conservative one the owner asked for: a level
 * fills in what has not been said and LEAVES EXCEPTIONS ALONE. A
 * dealer who has deliberately given one boat a different warranty
 * does not lose it because somebody set the Series.
 */
export function planSet(input: PlanInput): SetPlan {
  const { model, levelKey, field, value } = input
  const replace = input.replace === true
  const opts = input.opts ?? {}
  const node = model.byKey.get(levelKey)
  const text = valueText(value, field, refLabelOf(model, opts))

  const plan: SetPlan = {
    entityId: model.entity.id,
    fieldId: field.id,
    fieldName: field.name,
    levelKey,
    levelLabel: node?.label ?? model.entity.name,
    value,
    text,
    total: node?.rows.length ?? 0,
    already: [],
    blank: [],
    differing: [],
    replace,
    writes: [],
    refusal: null,
  }

  const columnWhyNot = columnRefusal(model, field)
  if (columnWhyNot !== null) return { ...plan, refusal: columnWhyNot }
  if (!node) {
    return { ...plan, refusal: 'That level is no longer on this table.' }
  }
  if (isBlankText(text)) {
    return {
      ...plan,
      /* NO INDEFINITE ARTICLE IN FRONT OF A COLUMN NAME. "Type a
         Eng Configuration" is what a template produces; the
         dealer's own headings start with every letter of the
         alphabet and a/an cannot be guessed from a token. Every
         sentence in this file is written so the name stands on its
         own. */
      refusal: `Nothing typed yet — this sets ${field.name} across a level, it does not clear it.`,
    }
  }

  const only = input.onlyRowIds ? new Set(input.onlyRowIds) : null
  const readAs = readerOf(model, opts)
  const read = (row: RowData): string => readAs(row, field)

  for (const row of node.rows) {
    if (only && !only.has(row.id)) continue
    const held = read(row)
    if (held === text) plan.already.push(row.id)
    else if (isBlankText(held)) plan.blank.push(row.id)
    else plan.differing.push(row.id)
  }

  /* SHEET ORDER, not "blanks then exceptions". The rows are walked
     once above and re-walked here so `writes` comes back in the
     order the table holds them — which is the order the undo entry
     and any later diff will read in. */
  const write = new Set([...plan.blank, ...(replace ? plan.differing : [])])
  plan.writes = node.rows.filter((r) => write.has(r.id)).map((r) => r.id)

  if (plan.writes.length === 0) {
    plan.refusal = nothingToDo(plan, model.noun)
  }
  return plan
}

/** Why an act that would write nothing writes nothing — a
 *  different sentence for each reason, because "nothing happened"
 *  is the failure rule 10 exists to prevent. */
function nothingToDo(plan: SetPlan, noun: LeafNoun): string {
  const looked = plan.already.length + plan.blank.length + plan.differing.length
  if (looked === 0) {
    return `There are no ${noun.many} under ${plan.levelLabel}.`
  }
  const d = plan.differing.length
  if (d > 0) {
    return `${count(d, noun)} here ${d === 1 ? 'holds' : 'hold'} something else, and the rest already hold “${plan.text}”. Turn on Replace to overwrite them.`
  }
  return `All ${count(looked, noun)} here already ${looked === 1 ? 'holds' : 'hold'} “${plan.text}”.`
}

const count = (n: number, noun: LeafNoun): string =>
  `${n} ${n === 1 ? noun.one : noun.many}`

/* ---------------------------------------------------------- */
/* putting a row back on its level                            */
/* ---------------------------------------------------------- */

/**
 * Reset to inherit: write the level's own answer back over the
 * exceptions.
 *
 * REFUSES WHEN THE LEVEL HAS NO ANSWER, and says which of the two
 * reasons it is. A split level offering "reset to inherit" would
 * have to pick one of two tied values and call it the truth.
 */
export function planReset(
  model: LevelModel,
  levelKey: string,
  field: FieldDef,
  onlyRowIds?: readonly string[],
  opts: BuildOpts = {},
): SetPlan {
  const tally = tallyAt(model, levelKey, field, opts)
  const node = model.byKey.get(levelKey)
  const label = node?.label ?? model.entity.name

  if (tally.answer === null) {
    const base: SetPlan = {
      entityId: model.entity.id,
      fieldId: field.id,
      fieldName: field.name,
      levelKey,
      levelLabel: label,
      value: null,
      text: '',
      total: tally.total,
      already: [],
      blank: [],
      differing: [],
      replace: true,
      writes: [],
      refusal: noAnswerWhy(tally, label, field, model.noun),
    }
    return base
  }

  return planSet({
    model,
    levelKey,
    field,
    value: tally.answer.value,
    replace: true,
    onlyRowIds,
    opts,
  })
}

/**
 * Why a level has no answer — one sentence per reason, each built
 * out of the counts, and each naming the way forward. "Nothing to
 * inherit" on its own is the silent refusal rule 10 exists to
 * prevent.
 */
function noAnswerWhy(
  tally: Tally,
  label: string,
  field: FieldDef,
  noun: LeafNoun,
): string {
  if (tally.entries.length === 0) {
    return `${field.name} is not set on any ${noun.one} under ${label}, so there is nothing to inherit.`
  }
  if (tally.split) {
    const [a, b] = tally.entries
    return `${label} is split — ${count(a.count, noun)} ${a.count === 1 ? 'says' : 'say'} “${a.text}” and ${b.count} ${b.count === 1 ? 'says' : 'say'} “${b.text}”. There is nothing to inherit until one of them is the answer.`
  }
  const top = tally.entries[0]
  const held = tally.total - tally.blank
  return `${label} has no ${field.name} to inherit: its ${held} ${held === 1 ? noun.one : noun.many} hold ${tally.entries.length} different values and the commonest, “${top.text}”, is on only ${top.count}. Set one here first.`
}

/* ---------------------------------------------------------- */
/* the sentences                                              */
/* ---------------------------------------------------------- */

export type PlanLineTone = 'write' | 'skip' | 'same'

/** One clause of the blast radius, with its FIGURE kept separate
 *  from its words so the surface can set the figure in mono and
 *  the sentence in Inter. */
export interface PlanLine {
  n: number
  text: string
  tone: PlanLineTone
}

export function planLines(plan: SetPlan, noun: LeafNoun): PlanLine[] {
  const lines: PlanLine[] = []
  const word = (n: number): string => (n === 1 ? noun.one : noun.many)

  /* THE VERB AGREES, and it is written out rather than left to a
     `(s)`. "1 variant take" is the tell that a sentence was
     assembled by a machine, and this app's language section is a
     whole page about not sounding like one. */
  const w = plan.writes.length
  if (w > 0) {
    lines.push({
      n: w,
      text: `${word(w)} ${w === 1 ? 'takes' : 'take'} “${plan.text}”`,
      tone: 'write',
    })
  }
  const a = plan.already.length
  if (a > 0) {
    lines.push({
      n: a,
      text: `already ${a === 1 ? 'holds' : 'hold'} it — nothing changes`,
      tone: 'same',
    })
  }
  const d = plan.differing.length
  if (d > 0 && !plan.replace) {
    lines.push({
      n: d,
      text: `${d === 1 ? 'holds' : 'hold'} something else and ${d === 1 ? 'is' : 'are'} left alone`,
      tone: 'skip',
    })
  }
  /* WITH REPLACE ON, THE WRITE LINE ALREADY COUNTS THE EXCEPTIONS.
     Printing "106 take XL" above "106 are overwritten" made the
     same 106 look like 212 — the sub-clause is only true, and only
     printed, when the write is a MIXTURE of fills and overwrites. */
  if (d > 0 && plan.replace && plan.blank.length > 0) {
    lines.push({
      n: d,
      text: `of those held something else`,
      tone: 'write',
    })
  }
  return lines
}

/** The whole act in one sentence, for the toast that offers UNDO.
 *  Past tense, because by the time it is read it has happened. */
export function describeDone(plan: SetPlan, noun: LeafNoun): string {
  const n = plan.writes.length
  return `${plan.fieldName} set to “${plan.text}” on ${count(n, noun)} in ${plan.levelLabel}`
}
