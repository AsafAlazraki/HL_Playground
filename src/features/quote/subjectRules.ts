/* ============================================================
   WHAT CHOOSING THIS ONE ALREADY DECIDES — the solver, wired to
   the moment a quote is started.

   ── THE FAULT THIS ANSWERS ───────────────────────────────────

   The system this app is measured against narrows its option lists
   and says nothing. A motor that does not fit the hull is simply not
   in the list; a trailer the rule rejected is simply not there. The
   salesperson learns that the software "does not have" a thing the
   dealership demonstrably sells, and the next thing they learn is to
   stop trusting the list.

   `src/lib/configure` has been able to answer this since it was
   written and NOTHING HAS EVER CALLED IT. It is arc-consistency
   propagation to a fixpoint with the reason recorded at the moment of
   removal — `prune()` is the only path and it always writes
   `{ constraintId, because }` — which is precisely the sentence a
   picker needs and precisely what the reference cannot produce after
   the fact. This file is the first caller.

   ── WHAT IT ASKS, AND WHEN ───────────────────────────────────

   ONE question, at the moment a subject is highlighted and before
   any document exists: given this row's own values, what do the rules
   in force already decide? Three answers, and they are three
   different things:

     NARROWED     values the choice REMOVES from other columns, each
                  with the rule's own `because`. This is the forward
                  view — what the walk ahead will and will not offer.
     DISAGREES    a rule that is unhappy with a value on THIS row and
                  removes nothing. `severity: 'warn'` exists because a
                  discovered pattern can be a coincidence and pruning
                  on one deletes real business; a warning may annotate
                  and may never empty a list.
     CONTRADICTS  the choices cannot all be true. The row still
                  quotes — a contradiction on the sheet is not a
                  reason to refuse a dealer their own stock — and it
                  is said out loud rather than discovered at step 4.

   ── AND WHEN THERE IS NOTHING TO SAY, IT SAYS THAT ───────────

   On this sheet today, `seedWorkbookConstraints()` emits nothing: all
   sixteen workbook rules carry a `blocked` and no builder, because
   each needs a lookup, a formula or an arithmetic the sentence
   vocabulary cannot state (`seededRules.test.ts` asserts exactly
   this). So `solve()` over the seeded project returns an empty state,
   and a panel that fell silent would read as a panel that had not
   loaded.

   It says the true thing instead: how many rules reach this place,
   how many of them moved, and how many the workbook has RECORDED and
   cannot run. A dealer learning that sixteen rules of their own price
   file are known and unenforced is better served than one shown a
   blank space — and it is the same figure the module's own rules
   panel prints, read through `workbookRulesFor` rather than counted
   again here.

   ── PURITY ───────────────────────────────────────────────────

   No React, no `useProjectStore`. The constraint registry and the
   entities are handed in by the surface, which is what lets the quote
   feature keep its one-grep claim about the store.
   ============================================================ */

import {
  readCell,
  type CellValue,
  type ConstraintDef,
  type EntityDef,
  type FieldDef,
  type ModuleDef,
  type RowData,
} from '@/types/model'
import { formatValue, isBlank, optionsOf, solve, valueKey } from '@/lib/configure'
/* THE DIRECT PATHS. `moduleRules.ts` and `columns.ts` are pure — no
   store, no React, no surface — and the two barrels above them pull
   in a rules pane and a discovery panel this reading has no use for.
   Same reason `start.ts` next door reaches `modules/read` directly. */
import {
  constraintsFor,
  moduleKinds,
  workbookRulesFor,
} from '@/features/modules/moduleRules'
import { buildConcepts, conceptIndex } from '@/features/constraints/columns'

/* ---------------------------------------------------------- */
/* What comes back                                             */
/* ---------------------------------------------------------- */

/** A value this choice takes off another column, and the rule that
 *  took it. `where` is the column named as the dealer wrote it,
 *  qualified by its table, because one concept lives on many tables
 *  and "Max HP" alone does not say whose. */
export interface SubjectNarrowing {
  constraintId: string
  where: string
  value: string
  because: string
}

/** A rule that disagrees with a value ON THIS ROW and removes
 *  nothing — the `warn` channel, which may never empty a list. */
export interface SubjectDisagreement {
  constraintId: string
  where: string
  value: string
  because: string
}

export interface SubjectVerdict {
  /** enabled rules reaching a column of this place */
  governing: number
  /** of those, the ones that actually removed something for this row */
  fired: number
  /** values removed from other columns, in fire order */
  narrowings: SubjectNarrowing[]
  /** how many values went altogether — `narrowings` may be capped */
  removed: number
  /** how many values there were on the columns that lost any */
  offered: number
  /** how many other columns lost at least one value */
  columns: number
  /** rules unhappy with this row that took nothing away */
  disagreements: SubjectDisagreement[]
  /** the current choices cannot all be true, in the solver's words */
  problems: string[]
  /** rules the workbook records for these kinds and cannot run */
  recorded: number
  /** one sentence, never empty — see the header. */
  say: string
}

/** How many narrowings are named before the sentence counts the rest.
 *  Four is one readable block at any width and is the same discipline
 *  as the activity strip's `ACTIVITY_CAP`. */
export const NARROWING_CAP = 4

const EMPTY: SubjectVerdict = {
  governing: 0,
  fired: 0,
  narrowings: [],
  removed: 0,
  offered: 0,
  columns: 0,
  disagreements: [],
  problems: [],
  recorded: 0,
  say: '',
}

/* ---------------------------------------------------------- */
/* Reading a column's full name                                */
/* ---------------------------------------------------------- */

interface Column {
  field: FieldDef
  table: string
}

/** Every column on the sheet, by id. Built once per solve and handed
 *  down: a constraint names field ids and a person reads column
 *  names, and resolving one at a time over 51 tables is the cost this
 *  map exists to pay once. */
function columnIndex(entities: Record<string, EntityDef>): Map<string, Column> {
  const out = new Map<string, Column>()
  for (const entity of Object.values(entities)) {
    for (const field of entity.fields) out.set(field.id, { field, table: entity.name })
  }
  return out
}

/** "Highfield Inflatables · Max HP" — a column, said so a person can
 *  find it. Never a bare column name: `boat::max hp` is one concept
 *  across seven brand tables and a sentence naming only the concept
 *  sends a dealer to the wrong file. */
const columnName = (c: Column | undefined, fieldId: string): string =>
  c ? `${c.table} · ${c.field.name}` : fieldId

/* ---------------------------------------------------------- */
/* The reading                                                 */
/* ---------------------------------------------------------- */

/**
 * EVERYTHING ABOUT A PLACE THAT DOES NOT DEPEND ON WHICH ROW.
 *
 * IT IS A SEPARATE CALL BECAUSE OF WHAT IT COSTS. `buildConcepts`
 * walks every column of all fifty-one tables to key them by concept,
 * and the column index is another full walk; doing both again every
 * time somebody presses the down arrow would make a keyboard-driven
 * list stutter over work whose answer never changed. This is resolved
 * once per place and the per-row solve below is handed the result.
 *
 * THE FIELDS PUT IN FRONT OF THE SOLVER are the module's own columns
 * plus every column any governing rule names. The second half is
 * load-bearing: a rule pairing a hull's Max HP with a motor's HP
 * reaches the Boats module through the hull column, and the motor
 * column it would prune lives on a table Boats does not hold. Leaving
 * it out would run the rule and then have nowhere to record what it
 * did.
 */
export interface PlaceRules {
  module: ModuleDef
  /** enabled rules reaching a column of this place */
  governing: ConstraintDef[]
  /** rules the workbook records for these kinds and cannot run */
  recorded: number
  /** every column on the sheet, by id, for naming what moved */
  columns: Map<string, Column>
  /** the columns the solver is given */
  fields: FieldDef[]
}

export function placeRules(
  module: ModuleDef,
  entities: Record<string, EntityDef>,
  constraints: readonly ConstraintDef[],
): PlaceRules {
  const index = conceptIndex(buildConcepts(entities))
  const enabled = constraints.filter((c) => c.enabled)
  const governing = constraintsFor(enabled, module, index)

  /* THE WORKBOOK'S OWN RULES, INCLUDING THE ONES NOBODY CAN RUN. Read
     through the module's kinds, which is how the module's rules panel
     reads them, so the two surfaces cannot print different totals. */
  const tables = module.tableIds
    .map((id) => entities[id])
    .filter((e): e is EntityDef => e !== undefined)
  const recorded = workbookRulesFor(moduleKinds(tables)).length
  const columns = columnIndex(entities)

  const fields: FieldDef[] = []
  const seen = new Set<string>()
  const take = (fieldId: string): void => {
    if (seen.has(fieldId)) return
    const c = columns.get(fieldId)
    if (!c) return
    seen.add(fieldId)
    fields.push(c.field)
  }
  if (governing.length > 0) {
    for (const table of tables) for (const f of table.fields) take(f.id)
    for (const rule of governing) {
      for (const clause of [...rule.if.clauses, ...(rule.then?.clauses ?? [])]) {
        take(clause.left.fieldId)
        const right = clause.right
        if (right && right.kind === 'field') take(right.path.fieldId)
      }
      for (const combo of rule.combinations ?? []) for (const id of Object.keys(combo)) take(id)
    }
  }

  return { module, governing, recorded, columns, fields }
}

/**
 * WHAT THIS ROW ALREADY DECIDES, and what disagrees with it.
 *
 * THE ROW'S OWN CELLS ARE THE CHOICES. Every non-blank value on the
 * subject row is fixed, which is exactly what picking that row means,
 * and is why a number column can take part: `makeDomain` narrows an
 * unenumerable column to the single value it was given, so
 * "Max HP ≥ this motor's HP" is testable while "every possible Max
 * HP" is never invented.
 */
export function subjectVerdict(
  place: PlaceRules,
  entity: EntityDef,
  row: RowData,
): SubjectVerdict {
  const { module, governing, recorded, columns, fields } = place

  if (governing.length === 0) {
    return { ...EMPTY, recorded, say: sayNothing(module, 0, recorded) }
  }

  /* THE ROW IS THE CHOICE. Images are skipped — a picture is not a
     value a rule can be written about, and `formatValue` would print
     "3 images" into a sentence about a decision. */
  const chosen: Record<string, CellValue> = {}
  for (const field of entity.fields) {
    if (field.type === 'image') continue
    const v = readCell(row, field.id)
    if (isBlank(v)) continue
    chosen[field.id] = v
  }

  const state = solve({ fields, constraints: governing, chosen })

  /* WHAT THE CHOICE TOOK OFF OTHER COLUMNS. A value blocked on a
     column the row itself fixed is not news — it is the arithmetic of
     having chosen — so only the columns downstream are counted. */
  const narrowings: SubjectNarrowing[] = []
  let removed = 0
  let offered = 0
  let columnCount = 0
  for (const [fieldId, values] of Object.entries(state.blocked)) {
    if (fieldId in chosen) continue
    const keys = Object.keys(values)
    if (keys.length === 0) continue
    const col = columns.get(fieldId)
    const where = columnName(col, fieldId)
    const all = optionsOf(col?.field)
    columnCount += 1
    removed += keys.length
    offered += all ? all.length : keys.length
    for (const key of keys) {
      if (narrowings.length >= NARROWING_CAP) break
      const gone = all?.find((v) => valueKey(v) === key)
      narrowings.push({
        constraintId: values[key].constraintId,
        where,
        value: gone === undefined ? key : formatValue(gone),
        because: values[key].because,
      })
    }
  }

  /* WHAT DISAGREES WITH THE ROW ITSELF, and removes nothing. Only the
     values the row actually carries: a warning against a value nobody
     chose is a fact about the column, not about this boat. */
  const disagreements: SubjectDisagreement[] = []
  for (const [fieldId, byValue] of Object.entries(state.warned)) {
    const mine = chosen[fieldId]
    if (mine === undefined) continue
    const raised = byValue[valueKey(mine)]
    if (!raised || raised.length === 0) continue
    const where = columnName(columns.get(fieldId), fieldId)
    for (const w of raised) {
      disagreements.push({
        constraintId: w.constraintId,
        where,
        value: formatValue(mine),
        because: w.because,
      })
    }
  }

  const problems = state.problems.map((p) => p.message)

  return {
    recorded,
    governing: governing.length,
    fired: state.fired.length,
    narrowings,
    removed,
    offered,
    columns: columnCount,
    disagreements,
    problems,
    say: say({
      module,
      governing: governing.length,
      fired: state.fired.length,
      removed,
      offered,
      columns: columnCount,
      disagreements: disagreements.length,
      problems: problems.length,
      recorded,
    }),
  }
}

/* ---------------------------------------------------------- */
/* The sentence                                                */
/* ---------------------------------------------------------- */

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

/** What a place with no runnable rule says. It is never silence: a
 *  panel that vanishes reads as a panel that failed. */
function sayNothing(module: ModuleDef, governing: number, recorded: number): string {
  if (governing > 0) {
    return `${plural(governing, 'rule', 'rules')} reach ${module.name}, and none of them narrows anything for this one.`
  }
  if (recorded > 0) {
    return `No rule narrows a quote here yet. ${plural(
      recorded,
      'rule is',
      'rules are',
    )} recorded for ${module.name} in the price file and cannot be run over the columns on this sheet — they are listed under Rules, each with what it would take to run it.`
  }
  return `No rule narrows a quote here yet, so every option on the walk ahead is offered.`
}

function say(n: {
  module: ModuleDef
  governing: number
  fired: number
  removed: number
  offered: number
  columns: number
  disagreements: number
  problems: number
  recorded: number
}): string {
  if (n.problems > 0) {
    return `This one contradicts a rule of the business. It can still be quoted — the sheet is the dealer's, not ours — but the contradiction is stated above rather than met at step four.`
  }
  if (n.removed > 0) {
    const scope =
      n.columns === 1
        ? 'on one other column'
        : `across ${plural(n.columns, 'other column', 'other columns')}`
    return `Choosing this rules out ${n.removed} of ${n.offered} options ${scope}, by ${plural(
      n.fired,
      'rule',
      'rules',
    )} — each of which says why, where the option would have been.`
  }
  if (n.disagreements > 0) {
    return `${plural(n.disagreements, 'rule disagrees', 'rules disagree')} with this one and ${
      n.disagreements === 1 ? 'takes' : 'take'
    } nothing away. A measured pattern is not a stated rule, so it may flag and may never empty a list.`
  }
  return sayNothing(n.module, n.governing, n.recorded)
}
