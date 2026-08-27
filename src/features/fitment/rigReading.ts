/* ============================================================
   THE RIG, READ — one hull, everything that can be bolted to it,
   and the reason beside everything that cannot.

   WHY THIS FILE EXISTS. `src/lib/configure` is an arc-consistency
   solver that records THE REASON at the moment an option is removed
   — `prune()` is the only path a value ever leaves a domain by, and
   it always writes `{ constraintId, because }`. That is the most
   valuable thing in this application and until now nothing in the
   app called `solve()` at all. The reading below is the half that
   can be measured without a browser; `Rig.tsx` draws it.

   ── THE ONE RULE THIS FILE IS WRITTEN TO KEEP ─────────────────

   NO REFUSAL SENTENCE IS WRITTEN HERE. Every `because` on every
   type below is carried out of `explain()` or `warningsFor()`
   verbatim, and where a rule was authored without one this file
   hands back the constraint's id and says nothing, so the surface
   can print the rule's own sentence instead. A hand-written string
   would read as a business rule the dealership never stated, and it
   would drift from the rule the moment somebody edited it.

   ── WHAT A DOMAIN IS, HERE, AND WHY IT IS NOT JUST `select` ───

   `optionsOf` enumerates a Choice column and a Yes/No column and
   nothing else, on purpose: the solver may never invent a value.
   This price file has 357 text columns, 354 number columns, 33
   Yes/No columns and NOT ONE Choice column — every column arrived
   from a spreadsheet as free text. Handed to the solver as it
   stands, `blocked` could only ever hold `true` or `false`, and the
   whole reasoning engine would be invisible on the real data.

   So the rig builds the domain the way the rule editor already
   builds its value picker (`columns.domainFor`): a column with at
   most CHOICE_CAP distinct live values IS a menu, and the menu is
   the values the price file actually holds. Nothing is invented —
   every option below was read out of a cell — and a column with
   more values than that stays open, because a list of 588 model
   names is not a choice, it is a search.

   ── ONE COLUMN, SEVEN TABLES ──────────────────────────────────

   ONE TABLE PER BRAND means "Shaft Length" is seven columns with
   seven field ids, and `columns.ts` already resolves that: a rule
   stores one representative id and applies to the concept. The rig
   solves over CONCEPTS for the same reason — a rule authored
   against Highfield's column has to narrow Stacer's too — so every
   constraint is remapped onto representative ids before the solve
   and every choice is keyed by concept, never by field.

   ── WHAT THE CATALOGUES ARE ───────────────────────────────────

   Not "every table that is not a boat". The catalogues are the
   partner tables the price file ALREADY pairs this hull's table
   with, taken off the fan-out reading beside this file, in the
   order it sorted them. A rig that offered a dealer a catalogue
   their own sheet never pairs with this hull would be inventing
   business.
   ============================================================ */

import { isDiscontinued, isRetired, readCell, rowLabel } from '@/types/model'
import type {
  AccentKey,
  CellValue,
  Clause,
  ClauseGroup,
  ConstraintDef,
  EntityDef,
  FieldDef,
  FieldPath,
  RowData,
  TableKind,
} from '@/types/model'
import {
  buildConcepts,
  conceptIndex,
  fieldOn,
  representativeFieldId,
  type ColumnConcept,
} from '@/features/constraints'
import { priceLevelsFor } from '@/features/quote'
import {
  explain,
  formatValue,
  isEnumerable,
  optionsOf,
  solve,
  valueKey,
  warningsFor,
  type SolveState,
} from '@/lib/configure'
import type { FanReading } from './reading'

export interface RigProject {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
}

/** How many distinct live values a column may hold and still be
 *  offered as a menu. Above it the column is a search, not a choice,
 *  and the rig leaves it open rather than drawing 588 chips. */
export const CHOICE_CAP = 32

/** Rows a surface draws per verdict inside one catalogue before the
 *  list says, in words, how many more it is holding. The reading
 *  itself holds all of them — see `RigCatalogue.candidates`. */
export const DRAW_CAP = 12

/** Catalogues drawn under one hull. The fan sorts them by weight, so
 *  this cuts the tail rather than an arbitrary set. */
export const CATALOGUE_CAP = 6

/* ---------------------------------------------------------- */
/* What the reading is made of                                 */
/* ---------------------------------------------------------- */

/** Which side of the solve one value came out on.
 *
 *  'refused' is `blocked` — the value is GONE from the domain.
 *  'flagged' is `warned` — the value is still there and something
 *  disagrees with it. The two never overlap for one value; the
 *  solver guarantees it and this file never merges them. */
export type OptionState = 'chosen' | 'open' | 'flagged' | 'refused'

/** A reason, as the solver recorded it. `because` is the
 *  constraint's own clause and is EMPTY when the rule was authored
 *  without one — the surface then prints the rule's sentence. */
export interface RigNote {
  constraintId: string
  because: string
}

export interface RigOption {
  key: string
  value: CellValue
  label: string
  state: OptionState
  /** the first thing that disagrees, out of the solver */
  because: string
  constraintId: string
  /** every note on this value, in the order the rules fired */
  notes: RigNote[]
}

export interface RigSlot {
  /** the concept key — stable across reloads, and what a choice is
   *  keyed by, because a field id is one table's word for it */
  key: string
  /** the representative field id the solve ran against */
  fieldId: string
  name: string
  kind: TableKind
  /** the column's own description, where the import recorded one */
  desc?: string
  /** the tables carrying this column, in the price file's own names */
  tables: string[]
  options: RigOption[]
  open: number
  refused: number
  flagged: number
  chosen: RigOption | null
  /** a rule in force names this column */
  narrowed: boolean
}

/** Something the hull itself states, that a rule in force reads. */
export interface RigFact {
  key: string
  name: string
  value: string
  desc?: string
}

export interface RigReason {
  column: string
  value: string
  because: string
  constraintId: string
}

export interface RigCandidate {
  rowId: string
  tableId: string
  tableName: string
  label: string
  price: number | null
  verdict: 'offered' | 'flagged' | 'refused'
  reasons: RigReason[]
  /** lower-cased, for `searchReach` */
  hay: string
}

export interface RigCatalogue {
  tableId: string
  tableName: string
  kind: TableKind
  accent: AccentKey
  /** rows still sold */
  live: number
  offered: number
  flagged: number
  refused: number
  /** EVERY live row, offered first, then flagged, then refused.
   *  Uncapped on purpose: a surface draws DRAW_CAP of each and says
   *  how many more it is holding, and a search has to be able to
   *  reach the ones it is not drawing — a list you cannot search past
   *  is the failure `@/features/curation` exists to end. */
  candidates: RigCandidate[]
  /** at least one rule in force reads a column on this table */
  narrowed: boolean
  priced: boolean
}

export interface RigHull {
  tableId: string
  rowId: string
  tableName: string
  label: string
  accent: AccentKey
  kind: TableKind
  price: number | null
}

export interface RigReading {
  hull: RigHull | null
  /** what the rules read off the hull, in its own words */
  facts: RigFact[]
  slots: RigSlot[]
  catalogues: RigCatalogue[]
  /** the current choices contradict a rule, in the solver's words */
  problems: Array<{ constraintId: string; message: string }>
  /** enabled constraints handed to the solve */
  rulesInForce: number
  /** rules that actually removed a value */
  fired: string[]
  /** rules that annotated one without removing it */
  warnedBy: string[]
  /** columns that could have been a menu but hold too many values */
  tooWide: number
  /** the solve itself, so a caller can say what one choice changed */
  state: SolveState
  /** every column the solve ran over — `describeChange` needs them */
  fields: FieldDef[]
  /** concept key -> the field id it solved as */
  fieldIdOf: Record<string, string>
}

export interface RigInput {
  project: RigProject
  /** the rules in force, exactly as the registry holds them */
  constraints: ConstraintDef[]
  /** the fan-out, so the catalogues are the price file's own pairings */
  reading: FanReading
  hull: { tableId: string; rowId: string } | null
  /** concept key -> what a person chose. Absent is "not chosen". */
  chosen: Record<string, CellValue>
}

/* ---------------------------------------------------------- */
/* Concepts -> the columns the solver runs over                */
/* ---------------------------------------------------------- */

/** Sort a menu the way a person reads one: numerically where every
 *  value is a number, alphabetically otherwise. Deterministic, so two
 *  renders of one price file never disagree about the order. */
function sortValues(values: CellValue[]): CellValue[] {
  const nums = values.map((v) => (typeof v === 'number' ? v : Number(String(v).trim())))
  const allNumeric = nums.every((n) => Number.isFinite(n))
  const out = values.slice()
  if (allNumeric) {
    return out.sort((a, b) => Number(String(a)) - Number(String(b)))
  }
  return out.sort((a, b) => String(a).localeCompare(String(b)))
}

/**
 * The values this column actually holds, across every table that
 * carries it — or `undefined` where there are none, or too many to be
 * a choice.
 *
 * DISCONTINUED ROWS DO NOT VOTE. A value that survives only on stock
 * nobody may be offered is not an option, and offering it would be
 * this app contradicting its own held-back contract.
 */
function observedValues(
  concept: ColumnConcept,
  project: RigProject,
): CellValue[] | undefined {
  const seen = new Map<string, CellValue>()
  for (const tableId of concept.tableIds) {
    const table = project.entities[tableId]
    if (!table || isRetired(table)) continue
    const field = fieldOn(concept, table)
    if (!field) continue
    for (const row of project.rowsByEntity[tableId] ?? []) {
      if (isDiscontinued(row)) continue
      const v = readCell(row, field.id)
      if (v === null || v === undefined || v === '' || Array.isArray(v)) continue
      const k = valueKey(v)
      if (seen.has(k)) continue
      seen.set(k, v)
      /* one over the cap is enough to know it is not a menu */
      if (seen.size > CHOICE_CAP) return undefined
    }
  }
  return seen.size === 0 ? undefined : sortValues([...seen.values()])
}

/** The column as the solver sees it. A Yes/No column is enumerable on
 *  its own; everything else becomes a menu only when the sheet says it
 *  is one, and otherwise stays OPEN — which the solver reads as
 *  "unbounded", never as "impossible". */
function rigField(
  concept: ColumnConcept,
  project: RigProject,
  enumerate: boolean,
): { field: FieldDef; tooWide: boolean } {
  const id = representativeFieldId(concept)
  const base = { id, name: concept.name }
  if (concept.type === 'boolean') {
    return { field: { ...base, type: 'boolean' }, tooWide: false }
  }
  if (!enumerate) return { field: { ...base, type: 'text' }, tooWide: false }

  const declared = concept.type === 'select' && concept.options.length > 0 ? concept.options : null
  const values = declared ?? observedValues(concept, project)
  if (!values) {
    return { field: { ...base, type: 'text' }, tooWide: true }
  }
  return {
    field: { ...base, type: 'select', options: values.map((v) => String(v)) },
    tooWide: false,
  }
}

/* ---------------------------------------------------------- */
/* Constraints -> the same columns                             */
/* ---------------------------------------------------------- */

const repOf = (index: Map<string, ColumnConcept>, fieldId: string): string => {
  const concept = index.get(fieldId)
  return concept ? representativeFieldId(concept) : fieldId
}

/** A relationship hop needs rows and there are no rows in a
 *  configuration, so the solver ignores it — remapping one would
 *  change which column a clause names without changing that. */
const remapPath = (path: FieldPath, index: Map<string, ColumnConcept>): FieldPath =>
  path.viaFieldId ? path : { ...path, fieldId: repOf(index, path.fieldId) }

function remapClause(clause: Clause, index: Map<string, ColumnConcept>): Clause {
  const right = clause.right
  const next: Clause = { ...clause, left: remapPath(clause.left, index) }
  if (right && right.kind === 'field') {
    next.right = { kind: 'field', path: remapPath(right.path, index) }
  }
  return next
}

function remapGroup(
  group: ClauseGroup | undefined,
  index: Map<string, ColumnConcept>,
): ClauseGroup {
  return {
    combinator: group?.combinator ?? 'AND',
    clauses: (group?.clauses ?? []).filter(Boolean).map((c) => remapClause(c, index)),
  }
}

function remapConstraint(c: ConstraintDef, index: Map<string, ColumnConcept>): ConstraintDef {
  const next: ConstraintDef = { ...c, if: remapGroup(c.if, index) }
  if (c.then) next.then = remapGroup(c.then, index)
  if (c.combinations) {
    next.combinations = c.combinations.map((combo) => {
      const out: Record<string, CellValue> = {}
      for (const [fieldId, value] of Object.entries(combo)) out[repOf(index, fieldId)] = value
      return out
    })
  }
  return next
}

/** Every representative field id a rule in force names. This is what
 *  makes "a rule reads this column" a fact rather than a guess. */
function namedFields(constraints: ConstraintDef[]): Set<string> {
  const out = new Set<string>()
  const walk = (group: ClauseGroup | undefined): void => {
    for (const clause of group?.clauses ?? []) {
      if (!clause) continue
      if (clause.left?.fieldId) out.add(clause.left.fieldId)
      const right = clause.right
      if (right && right.kind === 'field' && right.path?.fieldId) out.add(right.path.fieldId)
    }
  }
  for (const c of constraints) {
    walk(c.if)
    walk(c.then)
    for (const combo of c.combinations ?? []) {
      for (const fieldId of Object.keys(combo)) out.add(fieldId)
    }
  }
  return out
}

/* ---------------------------------------------------------- */
/* Price                                                       */
/* ---------------------------------------------------------- */

/** The sell column this table leads with, or undefined where the
 *  business declared none. `priceLevelsFor` is the quote's own
 *  contract and there is exactly one of it. */
function priceFieldOf(entity: EntityDef | undefined): string | undefined {
  const levels = priceLevelsFor(entity)
  return (levels.find((l) => l.scope === 'quote') ?? levels[0])?.fieldId
}

function priceOf(row: RowData, fieldId: string | undefined): number | null {
  if (!fieldId) return null
  const v = readCell(row, fieldId)
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.trim())
    return Number.isFinite(n) ? n : null
  }
  return null
}

/* ---------------------------------------------------------- */
/* The reading                                                 */
/* ---------------------------------------------------------- */

const EMPTY_STATE: SolveState = {
  domains: {},
  blocked: {},
  warned: {},
  settled: {},
  fired: [],
  warnedBy: [],
  problems: [],
}

/**
 * One hull, solved.
 *
 * Pure and total: an unknown hull, a rule pointing at a deleted
 * column, no rules at all and an empty project all return a valid
 * reading. Nothing here throws.
 */
export function readRig(input: RigInput): RigReading {
  const { project, reading, hull, chosen } = input

  const concepts = buildConcepts(project.entities)
  const index = conceptIndex(concepts)

  const enabled = (Array.isArray(input.constraints) ? input.constraints : []).filter(
    (c) => c && typeof c.id === 'string' && c.id !== '' && c.enabled !== false,
  )
  const rules = enabled.map((c) => remapConstraint(c, index))
  const named = namedFields(rules)

  /* ---- the hull, and the catalogues its own sheet pairs it with ---- */
  const hullTable = hull ? project.entities[hull.tableId] : undefined
  const hullRow = hull
    ? (project.rowsByEntity[hull.tableId] ?? []).find((r) => r.id === hull.rowId)
    : undefined

  const partnerIds: string[] = []
  if (hullTable) {
    const fan = reading.fans.find((f) => f.subjectTableId === hullTable.id)
    for (const group of fan?.groups ?? []) {
      for (const strand of group.strands) {
        if (strand.heldBack) continue
        if (partnerIds.includes(strand.partnerTableId)) continue
        const partner = project.entities[strand.partnerTableId]
        if (!partner || isRetired(partner)) continue
        partnerIds.push(strand.partnerTableId)
      }
    }
  }
  const catalogueTables = partnerIds.slice(0, CATALOGUE_CAP)
  const inPlayKinds = new Set<TableKind>()
  for (const id of catalogueTables) {
    const table = project.entities[id]
    if (table?.kind) inPlayKinds.add(table.kind)
  }
  if (hullTable?.kind) inPlayKinds.add(hullTable.kind)

  /* ---- the columns the solve runs over ---- */
  const fields: FieldDef[] = []
  const fieldIdOf: Record<string, string> = {}
  const conceptOf = new Map<string, ColumnConcept>()
  let tooWide = 0

  for (const concept of concepts) {
    const id = representativeFieldId(concept)
    if (!id) continue
    const wanted = inPlayKinds.has(concept.kind) || named.has(id)
    const { field, tooWide: wide } = rigField(concept, project, wanted)
    /* counted only for the CATALOGUES, because that is what the
       sentence on the surface is about — "columns you could have
       chosen from and cannot". A column of the hull's own kind was
       never going to be a choice, and folding it in would inflate a
       figure a person can check against their own sheet. */
    if (wide && wanted && concept.kind !== hullTable?.kind) tooWide += 1
    fields.push(field)
    fieldIdOf[concept.key] = id
    conceptOf.set(id, concept)
  }
  const fieldById = new Map(fields.map((f) => [f.id, f]))

  /* ---- what is already decided ---- */
  const chosenById: Record<string, CellValue> = {}
  const chosenByConcept: Record<string, CellValue> = {}
  for (const concept of concepts) {
    const id = fieldIdOf[concept.key]
    if (!id) continue
    if (Object.prototype.hasOwnProperty.call(chosen, concept.key)) {
      const picked = chosen[concept.key]
      if (picked !== undefined && picked !== null && picked !== '') {
        chosenById[id] = picked
        chosenByConcept[concept.key] = picked
        continue
      }
    }
    /* the hull's own row is not a choice a person made — it is what
       the sheet says about the boat they picked, and it is the whole
       reason the rest of the rig narrows */
    if (hullTable && hullRow && concept.tableIds.includes(hullTable.id)) {
      const field = fieldOn(concept, hullTable)
      const cell = field ? readCell(hullRow, field.id) : null
      if (cell !== null && cell !== undefined && cell !== '' && !Array.isArray(cell)) {
        chosenById[id] = cell
      }
    }
  }

  const state = hull ? solve({ fields, constraints: rules, chosen: chosenById }) : EMPTY_STATE

  /* ---- what the rules read off the hull ---- */
  const facts: RigFact[] = []
  if (hullTable && hullRow) {
    for (const concept of concepts) {
      if (!concept.tableIds.includes(hullTable.id)) continue
      const id = fieldIdOf[concept.key]
      if (!id || !named.has(id)) continue
      const field = fieldOn(concept, hullTable)
      const cell = field ? readCell(hullRow, field.id) : null
      if (cell === null || cell === undefined || cell === '') continue
      facts.push({
        key: concept.key,
        name: concept.name,
        value: formatValue(cell),
        ...(concept.desc ? { desc: concept.desc } : {}),
      })
    }
  }

  /* ---- the slots ---- */
  const slots: RigSlot[] = []
  if (hull) {
    for (const concept of concepts) {
      const id = fieldIdOf[concept.key]
      const field = id ? fieldById.get(id) : undefined
      if (!field || !isEnumerable(field)) continue
      /* A column of the hull's OWN kind is a fact about a boat, not
         something bolted to one — whether it sits on this brand's
         table (where the row already answers it) or on another
         brand's (where it is a fact about a boat nobody is
         configuring). A rule that names one is the exception, and it
         is the only reason a boat column could still be a choice. */
      if (hullTable?.kind && concept.kind === hullTable.kind && !named.has(id)) continue
      if (hullTable && concept.tableIds.includes(hullTable.id)) continue
      if (!inPlayKinds.has(concept.kind) && !named.has(id)) continue

      const all = optionsOf(field) ?? []
      if (all.length === 0) continue

      const pickedKey = Object.prototype.hasOwnProperty.call(chosenByConcept, concept.key)
        ? valueKey(chosenByConcept[concept.key])
        : null

      const options: RigOption[] = []
      let open = 0
      let refused = 0
      let flagged = 0
      let picked: RigOption | null = null

      for (const value of all) {
        const key = valueKey(value)
        const blocked = explain(state, id, value)
        const warnings = warningsFor(state, id, value)
        const notes: RigNote[] = blocked
          ? [{ constraintId: blocked.constraintId, because: blocked.because }]
          : warnings.map((w) => ({ constraintId: w.constraintId, because: w.because }))

        let optionState: OptionState = 'open'
        if (blocked) optionState = 'refused'
        else if (warnings.length > 0) optionState = 'flagged'
        if (pickedKey !== null && pickedKey === key && !blocked) optionState = 'chosen'

        const option: RigOption = {
          key,
          value,
          label: formatValue(value),
          state: optionState,
          because: notes[0]?.because ?? '',
          constraintId: notes[0]?.constraintId ?? '',
          notes,
        }
        if (optionState === 'refused') refused += 1
        else {
          open += 1
          if (optionState === 'flagged') flagged += 1
          if (optionState === 'chosen') picked = option
        }
        options.push(option)
      }

      slots.push({
        key: concept.key,
        fieldId: id,
        name: concept.name,
        kind: concept.kind,
        ...(concept.desc ? { desc: concept.desc } : {}),
        tables: concept.tableIds
          .map((t) => project.entities[t]?.name)
          .filter((nm): nm is string => typeof nm === 'string'),
        options,
        open,
        refused,
        flagged,
        chosen: picked,
        narrowed: named.has(id),
      })
    }
  }

  /* A rule that touches the column comes first, then the sheet's own
     order by name — so the first thing on screen is the thing the
     business wrote a rule about.

     THE ORDER DOES NOT DEPEND ON THE SOLVE, and that is deliberate.
     Sorting by how much each column had refused read better on a
     screenshot and moved the list under the hand of anybody making a
     second choice: the column you just answered slides away from
     your cursor. `narrowed` is a fact about the RULES, which do not
     change while somebody is configuring, so this order is stable
     for as long as the work is. */
  slots.sort(
    (a, b) => Number(b.narrowed) - Number(a.narrowed) || a.name.localeCompare(b.name),
  )

  /* ---- the catalogues ---- */
  const catalogues: RigCatalogue[] = []
  for (const tableId of catalogueTables) {
    const table = project.entities[tableId]
    if (!table) continue
    const priceField = priceFieldOf(table)

    /* the enumerable columns of THIS table that the solve knows about,
       paired with the field id the domain is filed under */
    const columns: Array<{ fieldId: string; own: string; name: string }> = []
    for (const field of table.fields) {
      const concept = index.get(field.id)
      if (!concept) continue
      const id = fieldIdOf[concept.key]
      const solved = id ? fieldById.get(id) : undefined
      if (!solved || !isEnumerable(solved)) continue
      columns.push({ fieldId: id, own: field.id, name: concept.name })
    }

    const offered: RigCandidate[] = []
    const flagged: RigCandidate[] = []
    const refused: RigCandidate[] = []
    let live = 0

    for (const row of project.rowsByEntity[tableId] ?? []) {
      if (isDiscontinued(row)) continue
      live += 1

      const blockedReasons: RigReason[] = []
      const warnReasons: RigReason[] = []
      for (const column of columns) {
        const cell = readCell(row, column.own)
        if (cell === null || cell === undefined || cell === '' || Array.isArray(cell)) continue
        const blocked = explain(state, column.fieldId, cell)
        if (blocked) {
          blockedReasons.push({
            column: column.name,
            value: formatValue(cell),
            because: blocked.because,
            constraintId: blocked.constraintId,
          })
          continue
        }
        for (const warning of warningsFor(state, column.fieldId, cell)) {
          warnReasons.push({
            column: column.name,
            value: formatValue(cell),
            because: warning.because,
            constraintId: warning.constraintId,
          })
        }
      }

      const label = rowLabel(table, row)
      const verdict =
        blockedReasons.length > 0 ? 'refused' : warnReasons.length > 0 ? 'flagged' : 'offered'
      const reasons = blockedReasons.length > 0 ? blockedReasons : warnReasons
      const candidate: RigCandidate = {
        rowId: row.id,
        tableId,
        tableName: table.name,
        label,
        price: priceOf(row, priceField),
        verdict,
        reasons,
        hay: `${label} ${reasons.map((r) => `${r.column} ${r.value}`).join(' ')}`.toLowerCase(),
      }
      if (verdict === 'refused') refused.push(candidate)
      else if (verdict === 'flagged') flagged.push(candidate)
      else offered.push(candidate)
    }

    const byPrice = (a: RigCandidate, b: RigCandidate): number => {
      if (a.price === null && b.price !== null) return 1
      if (b.price === null && a.price !== null) return -1
      if (a.price !== null && b.price !== null && a.price !== b.price) return a.price - b.price
      return a.label.localeCompare(b.label)
    }
    offered.sort(byPrice)
    flagged.sort(byPrice)
    refused.sort(byPrice)

    catalogues.push({
      tableId,
      tableName: table.name,
      kind: table.kind ?? 'custom',
      accent: table.accent,
      live,
      offered: offered.length,
      flagged: flagged.length,
      refused: refused.length,
      candidates: [...offered, ...flagged, ...refused],
      narrowed: columns.some((c) => named.has(c.fieldId)),
      priced: priceField !== undefined,
    })
  }

  return {
    hull:
      hullTable && hullRow
        ? {
            tableId: hullTable.id,
            rowId: hullRow.id,
            tableName: hullTable.name,
            label: rowLabel(hullTable, hullRow),
            accent: hullTable.accent,
            kind: hullTable.kind ?? 'custom',
            price: priceOf(hullRow, priceFieldOf(hullTable)),
          }
        : null,
    facts,
    slots,
    catalogues,
    problems: state.problems,
    rulesInForce: enabled.length,
    fired: state.fired,
    warnedBy: state.warnedBy,
    tooWide,
    state,
    fields,
    fieldIdOf,
  }
}

/* ---------------------------------------------------------- */
/* The hulls a rig can start from                              */
/* ---------------------------------------------------------- */

export interface RigStarter {
  tableId: string
  rowId: string
  tableName: string
  accent: AccentKey
  label: string
  price: number | null
  hay: string
}

/**
 * Every row a rig could be built on: the live rows of the subject
 * tables the fan-out already found, in its order — biggest catalogue
 * first, because that is the order a dealer reads their own file in.
 *
 * `limit` bounds the work, not the truth: the caller is told the full
 * count separately and the search runs over what is returned.
 */
export function readStarters(
  project: RigProject,
  reading: FanReading,
  limit = 4000,
): RigStarter[] {
  const out: RigStarter[] = []
  for (const fan of reading.fans) {
    const table = project.entities[fan.subjectTableId]
    if (!table) continue
    const priceField = priceFieldOf(table)
    for (const row of project.rowsByEntity[fan.subjectTableId] ?? []) {
      if (out.length >= limit) return out
      if (isDiscontinued(row)) continue
      const label = rowLabel(table, row)
      out.push({
        tableId: table.id,
        rowId: row.id,
        tableName: table.name,
        accent: table.accent,
        label,
        price: priceOf(row, priceField),
        hay: `${label} ${table.name}`.toLowerCase(),
      })
    }
  }
  return out
}
