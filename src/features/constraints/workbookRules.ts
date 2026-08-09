/* ============================================================
   WORKBOOK RULES — the constraints the Master Price File itself
   ASSERTS, seeded into the rule registry, and the record of the
   ones this app cannot yet say.

   PROVENANCE, NOT INVENTION
   ─────────────────────────────────────────────────────────────
   Every entry below is one of the six rules that survived
   adjudication against `C:/Users/AsafA/Downloads/Boat Module (5).xlsx`
   (opened read-only). Each carries the cell, header, formula or
   divider label it came from, quoted in the comment above it, and
   the `because` clause the adjudicator wrote. Nothing here was
   inferred from a pattern in the values: a correlation is an
   OBSERVATION and is not a rule, and no observation appears in
   this file.

   THE HONEST STATE OF THIS FILE: six admitted rules, and SIX of
   them are `blocked` — none can be stated as a `ConstraintDef`
   the app can both SHOW and RUN today. Each blocker is named on
   its seed, and the shape the contract would need is named with
   it. The seeder below is real and idempotent; it emits a
   constraint the moment a seed loses its `blocked` and gains a
   `build`. Seeding an approximation instead would put a sentence
   on screen that the business never wrote, which is the one
   failure this feature exists to avoid (see the note over
   BECAUSE_PLACEHOLDER in RuleCard.tsx — the same mistake, made
   once already, in placeholder text).

   WHAT THE SENTENCE SURFACE CAN SAY TODAY
   ─────────────────────────────────────────────────────────────
   `columns.ts` addresses columns as CONCEPTS — `kind + name`, e.g.
   'boat::max hp' — so a rule bites on every table of that kind.
   `state.tablesFor` then keeps only the tables carrying EVERY
   concept the sentence names, which makes a sentence single-kind
   by construction; `RuleSentence.sideConcepts` enforces the same
   thing in the picker, deliberately ("the obligation lives on the
   same kind as the condition, or the rule could never be true of
   any row"). `describe.literalOf` reads only a LITERAL right-hand
   side. So an expressible rule is: one kind, columns compared to
   literals.

   Two of the six are cross-kind, two are lookups, one is
   arithmetic, one needs a column no table has.
   ============================================================ */

import { nowIso } from '@/lib/id'
import type {
  Clause,
  ClauseGroup,
  ConstraintDef,
  ConstraintKind,
  EntityDef,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { buildConcepts, conceptByKey, representativeFieldId, type ColumnConcept } from './columns'
import { orgKeyOf, registerConstraints } from './constraintDefs'

/* ---------------------------------------------------------- */
/* The seed shape                                             */
/* ---------------------------------------------------------- */

/** The columns a seed needs, resolved to live concepts and keyed by
 *  the concept key the seed asked for. */
export type ResolvedColumns = Record<string, ColumnConcept>

export interface WorkbookRuleSeed {
  /** DETERMINISTIC and stable forever — re-seeding must not duplicate,
   *  so this is never `newId()`. Prefixed `wb:` so a workbook rule is
   *  distinguishable from an authored one at a glance in storage. */
  id: string
  /** the adjudication's reference for this rule */
  ref: 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6'
  /** what the rule says, in the adjudicator's words */
  statement: string
  /** reads after the word "because"; shown to a person when an option
   *  is unavailable. Verbatim from the adjudication. */
  because: string
  /** workbook · sheet · artefact — printed on the rule card */
  source: string
  kind: ConstraintKind
  priority?: number
  /** ColumnConcept keys (`kind::normalised name`) the rule talks about */
  needs: string[]
  /** builds the two sides once every `needs` concept resolves. Absent
   *  while `blocked` — a seed with no builder never becomes a rule. */
  build?: (cols: ResolvedColumns) => { if: ClauseGroup; then?: ClauseGroup }
  /** why this admitted rule cannot be a ConstraintDef today, and what
   *  the contract would need. Absent means it seeds. */
  blocked?: string
}

/** Stable clause ids, so a re-seed of the same rule is byte-identical
 *  and React keys never churn. */
export const clauseId = (seedId: string, side: 'if' | 'then', i: number): string =>
  `${seedId}#${side}${i}`

/** Marks a rule as read out of the workbook rather than authored here.
 *  `ConstraintDef.source` is printed in the rule card footer, so this
 *  is also what a person sees. */
export const WORKBOOK = 'Boat Module (5).xlsx'

/* ============================================================
   THE SIX ADMITTED RULES
   ============================================================ */

export const WORKBOOK_RULES: WorkbookRuleSeed[] = [
  /* ----------------------------------------------------------
     A1 · MAX HP IS A HARD CEILING ON THE MOTOR

     EVIDENCE (asserted): `Boat Module` header text — KW1 = 'Max HP',
     and it is 'Max HP' in all nine band header rows (KW1, KW3, KW143,
     KW200, KW226, KW233, KW248, KW262, KW278), paired with KV =
     'Min HP'. A Min/Max column pair whose header states a limit.
     Populated on 2068 of 2071 KW cells; blank only at KW950, KW952,
     KW1077. Verification: 1974 testable KZ cells, 0 above max; 1723
     testable LF cells, 0 above max.

     CAVEATS recorded with the admission, for whoever unblocks this:
     KW is TEXT ('90 HP'), 101 rows are multi-engine ('2 x 200HP',
     '350 / 2 x 200 HP'), 6 rows read 'TBA' (KW218/220/221/1802/1803/
     1833) and 6 hold a battery spec ('10.8kWh LifePo4', KW1836–1839/
     1922/1923). Those 12 must be excluded, not parsed. There is no
     numeric motor-HP column anywhere in the Boat Module.
     ---------------------------------------------------------- */
  {
    id: 'wb:boat-max-hp-ceiling',
    ref: 'A1',
    statement:
      "A motor whose horsepower exceeds the boat row's Max HP must be rejected.",
    because: "the boat's rated maximum horsepower is the ceiling stated on its own spec row",
    source: `${WORKBOOK} · Boat Module!KV:KW · Min HP / Max HP column pair, 'Max HP' in all nine band header rows`,
    kind: 'implies',
    priority: 100,
    needs: ['boat::max hp', 'motor::hp rating'],
    blocked:
      'CROSS-KIND. Max HP is a boat column and HP Rating is a motor column, and the ' +
      'sentence surface is single-kind by construction: state.tablesFor keeps only tables ' +
      'carrying EVERY concept named, so a two-kind sentence reaches no table and reports ' +
      'itself unscoped; RuleSentence.sideConcepts restricts the obligation picker to the ' +
      "condition's kind on purpose. The stored shape could hold it — ValueExpr already has " +
      "{ kind: 'field' }, and lib/configure/solve.enforceClause narrows BOTH columns from it " +
      '— but describe.literalOf returns null for a field right-hand side, so the card would ' +
      'read "HP Rating must be at most …" and print an unfinished rule. NEEDS: a pair-scoped ' +
      'FieldPath (a RowScope, which ViewColumn already carries) so a rule can name the boat ' +
      'and the motor of one pairing, plus a sentence token that renders a column on the right.',
  },

  /* ----------------------------------------------------------
     A2 · MIN HP IS A STATED FLOOR — WARNING ONLY, NEVER A FILTER

     EVIDENCE (asserted): KV1 = 'Min HP' in all nine band header rows;
     the same Min/Max pair as A1. Populated on 1991 cells.

     CONDITION OF ADMISSION, quoted: "it must be seeded with a
     non-blocking kind. Seeding it as a hard constraint would reject
     11 % of the workbook's own recommendations, and that failure is
     recorded here so nobody later 'fixes' it by promoting it."
     221 of 1974 KZ cells — the dealer's OWN recommended motor — fall
     below their row's KV (e.g. KZ554–556, Highfield Coaster 540,
     recommend 'Yamaha - F90XB' against KV = '115 HP'); 116 more in LF.
     ---------------------------------------------------------- */
  {
    id: 'wb:boat-min-hp-floor',
    ref: 'A2',
    statement:
      "A motor whose horsepower is below the boat row's Min HP must be flagged, not blocked.",
    because: "the boat's spec row states a minimum rated horsepower",
    source: `${WORKBOOK} · Boat Module!KV:KW · Min HP / Max HP column pair, 'Min HP' in all nine band header rows`,
    kind: 'implies',
    priority: 50,
    needs: ['boat::min hp', 'motor::hp rating'],
    blocked:
      'NO ADVISORY KIND, and cross-kind besides. The admission is conditional on this rule ' +
      'never filtering, and every ConstraintKind the contract has — implies, requires, ' +
      'excludes, table — REMOVES values in lib/configure/solve.prune. Seeding it as implies ' +
      "would reject 221 of the workbook's own recommended motors, which is the exact failure " +
      'the adjudication forbade. NEEDS: a non-blocking kind (or a severity on ConstraintDef) ' +
      'that records a warning without pruning a domain — plus everything A1 needs.',
  },

  /* ----------------------------------------------------------
     A3 · PROPELLER IS DERIVED FROM THE MOTOR

     EVIDENCE (asserted): formula, 1201 cells in LC alone —
       LC5 = VLOOKUP(KZ5,'[4]Motor Library'!$C:$ZZ,200,0)
     repeated identically for all 13 motor slots. The index was
     resolved against the cached external link: xl/externalLinks/
     externalLink4.xml, sheetId 0 = 'Motor Library', row 4 →
     C4 = 'MODEL', GT4 = 'Prop Option - Default', and
     col(GT) - col(C) + 1 = 200.
     ---------------------------------------------------------- */
  {
    id: 'wb:pairing-prop-from-motor',
    ref: 'A3',
    statement:
      "A pairing's Prop Description must be the motor's default propeller from the Motor Library.",
    because: 'the motor library assigns each motor a default propeller',
    source: `${WORKBOOK} · Boat Module!LC (and the 12 sibling slots) · =VLOOKUP(KZ,'Motor Library'!C:ZZ,200,0) → Motor Library!GT 'Prop Option - Default'`,
    kind: 'implies',
    needs: ['custom::prop description'],
    blocked:
      'A DERIVATION, NOT A COMPARISON. The obligation reads a column on a THIRD row — the ' +
      "Motor Library row for the motor on this pairing. ValueExpr has no lookup, and FieldPath's " +
      'one viaFieldId hop is dropped by both evaluators (configure/evaluate.clauseFieldId ' +
      'returns undefined for a hop; constraints/state.clauseHolds ignores it outright). ' +
      "SECOND BLOCKER: the target column is not seeded. Motor Library!GT 'Prop Option - Default' " +
      "is absent from src/demos/northside.ts; the motor tables carry Motor Library!O 'Prop', " +
      'which is a different column. NEEDS: an evaluated relationship hop, and the GT column ' +
      'seeded on the motor tables.',
  },

  /* ----------------------------------------------------------
     A4 · PROP PART NUMBER IS DERIVED FROM THE PROP DESCRIPTION

     EVIDENCE (asserted): formula, 1236 cells in LB —
       LB5 = IFERROR(VLOOKUP(LC5,'[3]Parts Maintenance'!$C:$ZZ,3,0),)
     index 3 of C:ZZ = Parts Maintenance!E = 'Code', verified by
     opening Parts Module (3).xlsx directly.
     ---------------------------------------------------------- */
  {
    id: 'wb:pairing-prop-part-from-description',
    ref: 'A4',
    statement:
      "A pairing's Prop Part No. must be the Parts Module code for its Prop Description.",
    because: 'the parts module holds the code for that propeller description',
    source: `${WORKBOOK} · Boat Module!LB · =IFERROR(VLOOKUP(LC,'Parts Maintenance'!C:ZZ,3,0),) → Parts Module (3).xlsx · Parts Maintenance!E 'Code'`,
    kind: 'table',
    needs: ['custom::prop part no.', 'custom::prop description'],
    blocked:
      'A LOOKUP. A ClauseGroup compares one column to one value; it cannot look a value up. ' +
      "The one shape that could carry it is kind:'table' with `combinations`, and building " +
      'those from the seeded data would make the rule FALSE: the parts table in ' +
      'src/demos/northside.ts is a subset of Parts Maintenance, so a whitelist drawn from it ' +
      'would reject description/code pairs the workbook accepts, and one drawn from the join ' +
      "rows themselves would be an OBSERVATION of what the sheet happens to contain — not the " +
      'lookup the formula asserts. NEEDS: the full Parts Maintenance C→E table imported as ' +
      'the source of `combinations`, or an evaluated derivation clause.',
  },

  /* ----------------------------------------------------------
     A5 · THE DEPOSIT STAGES TOTAL 100 %

     EVIDENCE (asserted): formula QH5 = 100%-SUM(QD5:QG5), 378 master
     cells (1434 including shared children). Headers QD–QH = Pending
     Deal / Confirmed Deal Deposit / Leaving Factory (HIN Supplied) /
     Notice of Arrival / On Handover. Of 2005 rows where all five are
     numeric, rows summing to anything other than exactly 1.0: 0.
     ---------------------------------------------------------- */
  {
    id: 'wb:boat-deposit-stages-total-100',
    ref: 'A5',
    statement: 'The five deposit stages on a boat row must add up to 100 %.',
    because: 'the payment stages have to add up to the whole price',
    source: `${WORKBOOK} · Boat Module!QD:QH · =100%-SUM(QD:QG) on 378 master cells`,
    kind: 'implies',
    needs: ['boat::on handover'],
    blocked:
      'ARITHMETIC ACROSS FIVE COLUMNS. A Clause compares ONE column to ONE value; there is no ' +
      'sum, and ValueExpr\'s { kind: "formula" } branch is explicitly not evaluated — ' +
      'configure/evaluate returns \'M\' for it and enforceClause returns false. SECOND ' +
      'BLOCKER: none of QD..QH is a seeded column. No boat table in src/demos/northside.ts ' +
      "carries a deposit stage; the seeded pricing columns are QR 'Cash', QT 'Trade' and " +
      "RB 'Warranty'. NEEDS: a formula right-hand side the solver actually evaluates, and the " +
      'five stage columns seeded.',
  },

  /* ----------------------------------------------------------
     A6 · ROWS BELOW 1005 ARE OBSOLETE MODELS

     EVIDENCE (asserted): literal cell text — A1005 = 'OBSOLETE',
     C1005 = 'OBSOLETE MODELS (Models that ar No Longer Available)'.
     Same section-header mechanism as A143 = 'STABICRAFT' … A955 =
     'FORMOSA', and A1005 is the LAST entry in column A (column A holds
     exactly nine cells: rows 143, 200, 226, 233, 248, 262, 278, 955,
     1005), so the section runs to the end of data. Cite the LABEL, not
     the red/amber fill — the workbook has zero conditional-formatting
     rules in any of its 46 zip parts.
     ---------------------------------------------------------- */
  {
    id: 'wb:boat-obsolete-below-1005',
    ref: 'A6',
    statement: 'A boat whose source row is below the OBSOLETE divider must not be offered.',
    because: 'the sheet lists these models under its obsolete-models divider',
    source: `${WORKBOOK} · Boat Module!A1005 'OBSOLETE' / C1005 'OBSOLETE MODELS (Models that ar No Longer Available)' · section divider`,
    kind: 'implies',
    needs: ['boat::source'],
    blocked:
      'NO COLUMN TO TEST. The rule is a row-number threshold; the boat tables carry Source as ' +
      "TEXT ('Boat Module!R956') and CompareOp has no numeric extraction from text — " +
      "startsWith/contains cannot express \"> 1005\". SECOND BLOCKER: nothing to exclude. " +
      'src/demos/northside.ts seeds Boat Module rows 4–1004 only, so no obsolete row is in the ' +
      "model (the string 'OBSOLETE' does not occur in it). NEEDS: the divider read at import " +
      "into a seeded flag column (a boolean 'Obsolete'), which is the honest shape anyway — a " +
      'rule should test a fact about the boat, not the address it was read from. Also note the ' +
      'obsolete region duplicates live models (row 1015 = row 115 Stacer 589; rows 1534–1548 = ' +
      'rows 829–844 Highfield SP560), so the importer must dedupe on D Model Code.',
  },
]

/** The admitted rules that cannot be stated yet, with the reason. Read
 *  this before adding a rule by hand — every one of these was checked
 *  against the workbook and is real; only the CONTRACT is missing. */
export const WORKBOOK_RULES_BLOCKED: Array<{ id: string; ref: string; blocked: string }> =
  WORKBOOK_RULES.filter((r) => r.blocked).map((r) => ({
    id: r.id,
    ref: r.ref,
    blocked: r.blocked as string,
  }))

/* ============================================================
   BUILDING
   ============================================================ */

/** Resolve a seed's `needs` against the live tables. Returns undefined
 *  when any column it names is missing — a rule is never seeded half
 *  bound to columns that are not there. */
function resolve(seed: WorkbookRuleSeed, concepts: ColumnConcept[]): ResolvedColumns | undefined {
  const out: ResolvedColumns = {}
  for (const key of seed.needs) {
    const concept = conceptByKey(concepts, key)
    if (!concept) return undefined
    out[key] = concept
  }
  return out
}

/** The constraints this project's columns can currently carry.
 *  Deterministic: same tables in, same ids and same clause ids out. */
export function buildWorkbookConstraints(
  entities: Record<string, EntityDef>,
  now: string = nowIso(),
): ConstraintDef[] {
  const concepts = buildConcepts(entities)
  const out: ConstraintDef[] = []

  for (const seed of WORKBOOK_RULES) {
    if (seed.blocked || !seed.build) continue
    const cols = resolve(seed, concepts)
    if (!cols) continue
    const sides = seed.build(cols)
    out.push({
      id: seed.id,
      kind: seed.kind,
      if: sides.if,
      ...(sides.then ? { then: sides.then } : {}),
      because: seed.because,
      why: seed.statement,
      enabled: true,
      source: seed.source,
      ...(seed.priority !== undefined ? { priority: seed.priority } : {}),
      createdAt: now,
      updatedAt: now,
    })
  }

  return out
}

/** The field id a clause should carry for a concept — the same
 *  representative-id convention `edit.makeClause` uses, so a seeded
 *  clause and a hand-written one are indistinguishable once stored. */
export const seedFieldId = (concept: ColumnConcept): string => representativeFieldId(concept)

/** Helper for a future `build`: one clause, with a stable id. */
export function seedClause(
  seedId: string,
  side: 'if' | 'then',
  i: number,
  concept: ColumnConcept,
  op: Clause['op'],
  right?: Clause['right'],
): Clause {
  return {
    id: clauseId(seedId, side, i),
    left: { fieldId: seedFieldId(concept) },
    op,
    ...(right ? { right } : {}),
  }
}

/* ============================================================
   SEEDING — once per organisation, and never again
   ============================================================ */

/** The ledger of seed ids already handed to this organisation.
 *
 *  This is what makes a seeded rule DELETABLE and a re-seed harmless:
 *  the registry is asked to create a rule only the first time its id
 *  appears here. Switch a seeded rule off, edit its words, or remove
 *  it entirely, and a reload will not bring it back or overwrite it.
 *  Same interim-storage discipline as `helmlogic.constraints.v1`
 *  itself — see the header of constraintDefs.ts. */
const LEDGER_KEY = 'helmlogic.constraints.seeded.v1'

function readLedger(): Record<string, string[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(LEDGER_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, string[]> = {}
    for (const [key, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(list)) out[key] = list.filter((x): x is string => typeof x === 'string')
    }
    return out
  } catch {
    /* corrupt storage must not stop the app; the worst case is that a
       seed is offered again, and the id makes that idempotent anyway */
    return {}
  }
}

function writeLedger(ledger: Record<string, string[]>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger))
  } catch {
    /* a full or blocked store must never break rule authoring */
  }
}

export interface SeedReport {
  /** ids created by this call */
  seeded: string[]
  /** ids this organisation has already been offered — left untouched,
   *  edits and switch positions intact */
  alreadySeeded: string[]
  /** buildable, but a column it names does not exist in this project */
  waitingForColumns: string[]
  /** admitted, but not expressible as a ConstraintDef yet */
  blocked: string[]
}

/**
 * Put the workbook's rules in front of the current organisation, once.
 *
 * Safe to call on every load and on every change to the tables: an id
 * already in the ledger is never rebuilt, so a rule the user switched
 * off stays off, a rule they reworded keeps their words, and a rule
 * they removed stays gone. Nothing is overwritten, ever.
 */
export function seedWorkbookConstraints(): SeedReport {
  const report: SeedReport = { seeded: [], alreadySeeded: [], waitingForColumns: [], blocked: [] }

  const { meta, entities } = useProjectStore.getState()
  const orgKey = orgKeyOf(meta)
  const ledger = readLedger()
  const done = new Set(ledger[orgKey] ?? [])

  const buildable = buildWorkbookConstraints(entities)
  const built = new Map(buildable.map((c) => [c.id, c]))

  const fresh: ConstraintDef[] = []
  for (const seed of WORKBOOK_RULES) {
    if (seed.blocked || !seed.build) {
      report.blocked.push(seed.id)
      continue
    }
    if (done.has(seed.id)) {
      report.alreadySeeded.push(seed.id)
      continue
    }
    const constraint = built.get(seed.id)
    if (!constraint) {
      /* the columns are not here yet — try again next time the tables
         change, rather than writing a rule bound to nothing */
      report.waitingForColumns.push(seed.id)
      continue
    }
    fresh.push(constraint)
    report.seeded.push(seed.id)
  }

  if (fresh.length > 0) {
    registerConstraints(fresh, orgKey)
    ledger[orgKey] = [...done, ...report.seeded]
    writeLedger(ledger)
  }

  return report
}

/** Forget that this organisation was ever seeded, so the next call
 *  offers the workbook rules again. For a project reset — pair it with
 *  `clearConstraints()`, which is what wipes the rules themselves. */
export function forgetWorkbookSeeds(orgKey?: string): void {
  const key = orgKey ?? orgKeyOf(useProjectStore.getState().meta)
  const ledger = readLedger()
  if (!(key in ledger)) return
  delete ledger[key]
  writeLedger(ledger)
}
