/* ============================================================
   THE DISCOVERY ENGINE — the rules a price file is ALREADY
   FOLLOWING, measured out of its own values.

   Point it at a loaded project and it answers: which of the shapes
   that turned out to matter in a real price file does this one hold,
   at what rate, over what denominator, and with which exceptions
   named.

   ── THE LINE THAT MUST NOT BE CROSSED ─────────────────────────

   A DISCOVERED PATTERN IS NOT A RULE THE BUSINESS STATED, AND IS
   NEVER PRESENTED AS ONE.

   `workbookRules.ts` already carries this distinction and this file
   inherits it whole. A seed's evidence is ASSERTED — a formula, a
   data validation, a stated header, a Min/Max pair, an explicit
   cross-sheet link — or OBSERVED, a pattern in the values. And that
   file's own instruction is: "An 'observed' seed may never be built
   with a kind that prunes."

   EVERYTHING THIS ENGINE PRODUCES IS OBSERVED. It read values; it
   read no formula. So every candidate is born with
   `evidence: 'observed'` and `enforcement` that is 'warn' or
   'report' and never 'filter' — see MAY_PRUNE below, which is a
   constant precisely so that a future edit has to argue with it in
   writing. A pattern measured from data can be a coincidence, and
   pruning on a coincidence deletes real business.

   The `verdict` field says which of the written thresholds a
   candidate clears — FILTER / WARNING / OBSERVATION / REJECTED —
   and a verdict of 'filter' means "it clears the bar a filter would
   have to clear", NOT "filter it". The way an observation graduates
   is that the business asserts it, not that it scores high enough.

   ── NOTHING IS INVENTED ───────────────────────────────────────

   The engine MEASURES. If a figure cannot be computed from the
   loaded rows it does not appear. Every candidate carries:

     · `hits` and `tested` as INTEGERS. There is no bare percentage
       anywhere in this file's output, and never the word "usually".
     · `discrimination` — how much of the far catalogue it leaves
       standing. THIS IS THE MOST IMPORTANT FIELD HERE. F9 (a
       trailer's ATM against the boat's weight) is 530/530 = 100.00 %
       and leaves a mean 97.70 % of the catalogue: it selects
       NOTHING. F8 (the series banner) is 581/581 and leaves
       0.92 %–7.83 %. Same rate, opposite worth. A candidate that
       rejects almost nothing is labelled a FLOOR rather than a
       selector, and cannot be admitted as a filter however high its
       rate.
     · `counterExamples`, BY ROW NAME, capped for reading with the
       true total beside them. A proposal a person cannot check is a
       fabrication wearing a percentage.
     · `excluded` — how many values each side dropped as empty, as a
       sentinel (and which sentinel rule fired), and how many were
       real but untestable. Without this the engine reports artefacts
       confidently: the rigging-membership figure read 79.4 % until
       someone noticed 16,267 of 20,640 "matches" were one sentinel
       agreeing with another, and stripped it was 53.3 %
       (FITMENT_RULES.md §1.1).
     · `threshold` — the sentence from FITMENT_RULES.md §0 that
       decided the verdict, quoted.

   ── THE A2 GUARD ─────────────────────────────────────────────

   A candidate that would reject a pairing the business marks as its
   own RECOMMENDATION is REJECTED OUTRIGHT, whatever its rate. That
   is §0's fifth row — "this is the A2 failure, recorded once
   already; it does not get made twice" — and it is checked against
   `PAIR_RECOMMENDED_FIELD`, the column the importer writes for the
   slot the price file heads "Recommended Motor Option" and
   "Std Trailer". A candidate that would DELETE existing rows says
   exactly how many, by name, on `wouldDelete`.

   ── WHAT IT LOOKS FOR, AND WHY THOSE FIVE ────────────────────

   The shapes are not a taxonomy; they are what the adjudication
   ACTUALLY FOUND in a real price file (FITMENT_RULES.md §1–§4):

     categorical-selector   one side's column names the other side's
                            group. F8, and the only shape in the file
                            that actually picks something.
     numeric-bound          one side's number never exceeds (or never
                            falls below) the other's. F1, F9.
     join-key               which column identifies a row across two
                            tables. Both halves of §0's threshold are
                            applied, which is how the adjudication
                            caught that the display NAME is the key
                            and the CODE is not.
     functional-dependency  one column's value settles another's. The
                            rigging kit failed this once sentinels
                            were excluded.
     uniqueness             whether a pair is unique. (boat, motor)
                            is NOT: a constraint would delete real
                            live edges, and it says how many.

   ── THREE GUARDS §0 DID NOT NEED, AND THIS ENGINE DOES ───────

   FITMENT_RULES.md §0's thresholds were written for a person who had
   already decided which two columns were worth comparing. A machine
   has not, and pointed at a real price file it will compare
   everything with everything. Three guards close that gap, and each
   is declared here rather than buried because each CHANGES WHAT IS
   REPORTED and a silent filter is indistinguishable from a bug:

     UNIT      two numbers are compared only where both headers
               declare the same unit — `ATM (KG)` against
               `Boat Weight kg`, never against `Dealer 1/7/22`.
               Without it the first run over the real seed produced
               2,608 "proposals", almost all of them arithmetic about
               two ranges. The unit is read out of the file's own
               header, never guessed. `bounds.incomparable` says how
               many pairs were declined.
     VACUOUS   a bound no row in the catalogue could ever violate is
               arithmetic, not a rule. `Trailer Length ≥ Hull Length`
               is 89/89 = 100 % and leaves 100 % of the catalogue
               standing for every hull — reportable, never proposed.
     RESTATED  a determinant that spells its dependent out is not
               predicting it. A pairing's composed label contains both
               partners' names, so "choosing the Label settles the
               Boat" measures 100 % and discovers nothing.
               `bounds.restated` says how many were declined.

   Every one of them is a REPORTING decision, never a truth
   adjustment: the measurement still happens, the count of what was
   held back comes back on `bounds`, and nothing that cleared §0's
   own thresholds is hidden.

   ── PERFORMANCE ──────────────────────────────────────────────

   810 hulls × 434 trailers × dozens of columns is a large cross
   product, and the app must never freeze while thinking. Three
   things bound it, all of them stated rather than tuned:

     1 · the expensive readings — discrimination and counter-examples
         — are computed ONLY for candidates that already cleared a
         rate threshold, never for every column pair;
     2 · a catalogue is sorted once per column and searched, so a
         numeric bound's discrimination is a binary search and not a
         second cross product;
     3 · `discoverSteps` is a GENERATOR that yields once per unit of
         work — one per relationship PER SHAPE, then one per kind for
         the keys — so a caller can drive it from an idle callback or
         a worker. `discover` is that generator drained on the spot,
         which is what a test wants.

   MEASURED ON THE REAL SEED (src/demos/northside.ts at full scale:
   53 tables, 11,116 rows, 14,911 live pairings, 8 relationships):
   the whole run is about 0.9 s and the longest single step about
   165 ms. It was 6.9 s before the readings were memoised and 2.1 s
   before the attributes were read once per relationship instead of
   once per comparison; both figures are recorded here because the
   next person to add a shape needs to know which end the cost is
   at.

   `DiscoveryReport.ms` reports the wall time of the run, and
   `DiscoveryReport.bounds` reports every limit that was applied and
   how much it withheld — a bound that hides its own effect is
   indistinguishable from a bug.

   Pure functions. No React, no store, no I/O.
   ============================================================ */

import {
  PAIR_RECOMMENDED_FIELD,
  isDiscontinued,
  isPairFieldId,
  isRetired,
  readCell,
  rowLabel,
} from '@/types/model'
import type { EntityDef, FieldDef, RowData, TableKind } from '@/types/model'
import type { FitmentProject } from './trailerFitment'
import {
  Exclusions,
  emptyExclusions,
  exact,
  fold,
  names,
  readIdentity,
  readValue,
  unitOf,
  type CellReading,
  type ExclusionReading,
} from './discoverValues'

/* ---------------------------------------------------------- */
/* What it is pointed at                                       */
/* ---------------------------------------------------------- */

/** The same shape `trailerFitment.selectPartners` takes, and
 *  deliberately the same type: a project is a project, and two
 *  engines that read one should not disagree about what one is. */
export type DiscoveryProject = FitmentProject

/* ---------------------------------------------------------- */
/* The written thresholds — FITMENT_RULES.md §0                */
/* ---------------------------------------------------------- */

/** THE ENGINE MAY NEVER PRUNE. A constant rather than a comment so
 *  that changing it is an edit somebody has to defend, and so a test
 *  can assert it. See the header. */
export const MAY_PRUNE = false as const

/** "A rule is admissible as a filter at ≥ 99 % on the workbook's own
 *  pairings AND it must reject something." */
export const FILTER_RATE = 0.99

/** "A rule is admissible as a warning at ≥ 95 % and a named,
 *  countable exception set." */
export const WARNING_RATE = 0.95

/** "a rule that keeps 95 % of the catalogue has not selected
 *  anything" — so a candidate leaving this much of the far catalogue
 *  standing is a FLOOR, not a selector. F9 leaves a mean 97.70 %. */
export const DISCRIMINATION_CEILING = 0.95

/** "A join key is admissible at ≥ 98 % exact match, and the far-side
 *  key column ≥ 99 % unique." Both halves, always. */
export const JOIN_KEY_MATCH_RATE = 0.98
export const JOIN_KEY_UNIQUE_RATE = 0.99

/** The threshold sentences, quoted, so a candidate can name the one
 *  that decided it rather than paraphrase it. */
export const THRESHOLDS = {
  filter: 'a rule is admissible as a filter at ≥ 99 % on the price file’s own pairings, and it must reject something',
  warning: 'a rule is admissible as a warning at ≥ 95 % with a named, countable exception set',
  observation: 'an observation is reportable at any rate, stated with its numerator and its denominator',
  floor: 'a rule that keeps 95 % of the catalogue has not selected anything — it is a floor, not a selector',
  vacuous: 'a bound no row in the catalogue could ever violate is arithmetic, not a rule — it leaves 100 % of the catalogue standing for every row measured',
  recommendation: 'a rule that rejects the business’s own recommendation is REJECTED OUTRIGHT — the A2 failure, and it does not get made twice',
  deletes: 'a candidate that would delete rows the price file itself wrote is REJECTED OUTRIGHT, and says how many, by name',
  joinKey: 'a join key is admissible at ≥ 98 % exact match with the far-side key column ≥ 99 % unique',
  thin: 'measured, but on too few rows to report — see DiscoveryBounds.minTested',
} as const

/* ---------------------------------------------------------- */
/* The candidate                                               */
/* ---------------------------------------------------------- */

export type CandidateShape =
  | 'categorical-selector'
  | 'numeric-bound'
  | 'join-key'
  | 'functional-dependency'
  | 'uniqueness'

export type Verdict = 'filter' | 'warning' | 'observation' | 'rejected'

/** What may be DONE with a candidate. There is no 'filter' member,
 *  and adding one would be the failure this engine exists to avoid. */
export type Enforcement = 'warn' | 'report'

/** One row the rule gets wrong, named so a person can go and look at
 *  it. `recommended` is the sharp one: the price file itself marks
 *  this pairing as what it recommends. */
export interface CounterExample {
  subject: string
  partner: string
  detail: string
  recommended: boolean
}

/**
 * HOW MUCH OF THE FAR CATALOGUE THE CANDIDATE LEAVES STANDING.
 *
 * The single most important reading here, and the one both lenses
 * missed in opposite directions (FITMENT_RULES.md §1.2). A gate that
 * leaves 97.7 % of the catalogue has not chosen a trailer; a gate
 * that leaves 3 % has. `floor` is set when the mean share left
 * clears DISCRIMINATION_CEILING, and a floor can never be admitted
 * as a filter however perfect its rate.
 */
export interface DiscriminationReading {
  /** live rows on the far side this was measured against */
  catalogue: number
  /** how many subjects (rows, or groups) the share was measured over */
  over: number
  /** smallest / largest / mean share of the catalogue left standing */
  leastLeft: number
  mostLeft: number
  meanLeft: number
  floor: boolean
  /** NOT ONE ROW IN THE CATALOGUE COULD VIOLATE IT — the most
   *  demanding subject in the file still leaves every candidate
   *  standing. That is arithmetic about two ranges, not a rule the
   *  business follows, and it is how `Trailer Length ≥ Hull Length`
   *  reads at a perfect 100 % while meaning nothing. A floor at least
   *  bites on somebody. */
  vacuous: boolean
}

/** A key reading: how many distinct values, over how many rows. */
export interface UniquenessReading {
  rows: number
  distinct: number
  /** rows carrying a value some other row also carries */
  duplicated: number
  /** the repeated values themselves, named and counted, capped */
  examples: Array<{ value: string; rows: number }>
  exampleTotal: number
}

export interface Candidate {
  /** stable and deterministic — a re-run of the same project
   *  produces the same id, so a person's decision about a candidate
   *  can be stored against it */
  id: string
  shape: CandidateShape
  /** which two sides it was measured across, in the project's words */
  relationship: string
  /** the rule, in one sentence, using the file's own column names */
  statement: string
  /** reads after "because" — always the measurement, never a claim
   *  about intent, because nobody wrote this rule down */
  because: string
  /** the tables and columns it was measured from */
  source: string

  /** ALWAYS 'observed'. The engine read values, not formulas. */
  evidence: 'observed'
  /** never 'filter' — see MAY_PRUNE */
  enforcement: Enforcement

  hits: number
  tested: number
  /** hits / tested, derived; the two integers are the finding */
  rate: number

  discrimination: DiscriminationReading | null
  uniqueness: UniquenessReading | null

  counterExamples: CounterExample[]
  counterExampleTotal: number
  /** counter-examples that fall on a pairing the price file marks as
   *  its own recommendation. Non-zero rejects the candidate outright */
  rejectsRecommendation: number

  /** set when admitting the candidate would remove rows that exist */
  wouldDelete: { rows: number; named: string[]; total: number } | null

  /** WHAT EACH SIDE THREW AWAY, and why. `left` is the side the
   *  `statement` names FIRST and `right` the other, so the two
   *  readings line up with the sentence a person is reading. For a
   *  join key `left` is the naming half and `right` the uniqueness
   *  half; for uniqueness the whole combination is on `left`. */
  excluded: { left: ExclusionReading; right: ExclusionReading }

  verdict: Verdict
  /** the threshold sentence that decided the verdict */
  threshold: string
  /** it cleared the bar its shape has to clear */
  admitted: boolean
}

/* ---------------------------------------------------------- */
/* The report                                                  */
/* ---------------------------------------------------------- */

export interface RelationshipReading {
  key: string
  label: string
  /** the join tables it was read from */
  joins: string[]
  /** live pairings the price file writes across them */
  pairings: number
  /** of those, marked as the business's own recommendation */
  recommended: number
  /** live rows on each side of the relationship */
  leftCatalogue: number
  rightCatalogue: number
  /** pairings not counted because a side is retired or discontinued */
  heldBack: number
}

/** Every limit the run applied, and what each withheld. A bound that
 *  hides its own effect is indistinguishable from a bug. */
export interface DiscoveryBounds {
  minTested: number
  /** candidates measured and dropped for a denominator under minTested */
  thin: number
  maxCounterExamples: number
  maxPerShape: number
  /** numeric column pairs never compared, because the two headers do
   *  not declare the same unit. The engine does not guess at units —
   *  see `unitOf` in discoverValues.ts */
  incomparable: number
  /** the same finding reached through more than one relationship,
   *  merged to the fullest measurement */
  duplicates: number
  /** dependencies declined because the determinant merely spells the
   *  dependent out — a composed label against one of its own halves */
  restated: number
  /** proposals and near-misses that cleared everything but the cap */
  withheld: number
}

export interface DiscoveryReport {
  /** candidates that cleared the bar their shape has to clear,
   *  strongest discrimination first */
  proposals: Candidate[]
  proposalsTotal: number
  /** measured and NOT proposed — kept, with the number that killed
   *  each, because a refutation with a number on it is a finding and
   *  the absence of one is an invitation to guess again */
  notProposed: Candidate[]
  notProposedTotal: number
  relationships: RelationshipReading[]
  scanned: {
    tables: number
    rows: number
    relationships: number
    pairings: number
    comparisons: number
    candidates: number
  }
  bounds: DiscoveryBounds
  /** wall time of the run, milliseconds */
  ms: number
}

export interface DiscoverOptions {
  /** denominators under this are measured but not reported — a bound
   *  on noise, NOT a threshold on truth. The count withheld comes
   *  back on `bounds.thin`. */
  minTested?: number
  maxCounterExamples?: number
  /** how many candidates per shape reach each list */
  maxPerShape?: number
  /** limit the run to these shapes */
  shapes?: CandidateShape[]
}

const DEFAULTS = {
  minTested: 20,
  maxCounterExamples: 8,
  maxPerShape: 12,
}

/* ---------------------------------------------------------- */
/* Reading the project                                         */
/* ---------------------------------------------------------- */

interface SideRow {
  entity: EntityDef
  row: RowData
}

interface Pairing {
  join: EntityDef
  joinRow: RowData
  left: SideRow
  right: SideRow
  recommended: boolean
}

interface SideSpec {
  kind: TableKind
  fieldName: string
}

interface Relationship {
  key: string
  label: string
  left: SideSpec
  right: SideSpec
  joins: EntityDef[]
  pairings: Pairing[]
  heldBack: number
}

/** One column as the engine measures it: the name, across every
 *  table of a kind that carries it.
 *
 *  NOT `columns.ts::buildConcepts`, and the difference is the point.
 *  That function answers "what may a rule SENTENCE name", so it drops
 *  reference columns, formula columns and anything on a table a
 *  sentence cannot reach. This one answers "what can be MEASURED",
 *  which includes the reference columns on a join row (the rigging
 *  kit is one) and the rows of a retired table (a key must still be a
 *  key over history, or an old quote stops resolving). */
interface MeasurableColumn {
  name: string
  kind: TableKind
  type: FieldDef['type']
  /** table id -> field id on that table */
  fieldByTable: Map<string, string>
}

const kindOf = (e: EntityDef): TableKind | null => e.kind ?? null

class Ctx {
  readonly project: DiscoveryProject
  readonly rowById = new Map<string, SideRow>()
  readonly liveByKind = new Map<TableKind, SideRow[]>()
  readonly allByKind = new Map<TableKind, SideRow[]>()
  readonly columnsByKind = new Map<TableKind, MeasurableColumn[]>()
  rows = 0
  tables = 0

  constructor(project: DiscoveryProject) {
    this.project = project
    for (const entity of Object.values(project.entities)) {
      this.tables += 1
      const rows = project.rowsByEntity[entity.id] ?? []
      this.rows += rows.length
      const kind = kindOf(entity)
      for (const row of rows) {
        this.rowById.set(row.id, { entity, row })
        if (!kind) continue
        push(this.allByKind, kind, { entity, row })
        if (!isRetired(entity) && !isDiscontinued(row)) push(this.liveByKind, kind, { entity, row })
      }
      if (!kind) continue
      const cols = this.columnsByKind.get(kind) ?? []
      for (const field of entity.fields) {
        if (isPairFieldId(field.id)) continue
        const key = exact(field.name)
        let col = cols.find((c) => exact(c.name) === key)
        if (!col) {
          col = { name: field.name.trim(), kind, type: field.type, fieldByTable: new Map() }
          cols.push(col)
        }
        col.fieldByTable.set(entity.id, field.id)
      }
      this.columnsByKind.set(kind, cols)
    }
  }

  live(kind: TableKind): SideRow[] {
    return this.liveByKind.get(kind) ?? []
  }

  all(kind: TableKind): SideRow[] {
    return this.allByKind.get(kind) ?? []
  }

  columns(kind: TableKind, types: ReadonlyArray<FieldDef['type']>): MeasurableColumn[] {
    return (this.columnsByKind.get(kind) ?? []).filter((c) => types.includes(c.type))
  }

  /** Read a column off a row, whatever table of the kind it is on.
   *  A row on a table that does not carry the column reads as empty,
   *  which is the truth: the band does not have that header. */
  readColumn(side: SideRow, col: MeasurableColumn): CellReading {
    const fieldId = col.fieldByTable.get(side.entity.id)
    if (!fieldId) return { text: null, raw: null, num: null, skip: 'empty', rule: null }
    return readValue(readCell(side.row, fieldId), col.name)
  }
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

/**
 * THE PRICE FILE'S OWN PAIRINGS, grouped into relationships.
 *
 * A join table's reference columns are its sides. A join carrying
 * three — boat, motor, and the rigging kit chosen beside them — is
 * three relationships, not one, and the third (motor × kit) is the
 * one the rigging adjudication turned on. Unordered, because a
 * relationship has no direction: the shapes below test both ways
 * inside one measurement rather than doubling the cross product.
 *
 * A RETIRED TABLE AND A DISCONTINUED ROW NEVER ENTER A PAIRING, and
 * the count that did not enter comes back on `heldBack`. On the
 * Northside seed that is the whole Surtees × OBSOLETE Trailers join —
 * 30 live pairings, eight of them in the standard-trailer slot. A
 * rule discovered from stock nobody may sell is a rule about the past.
 */
function relationshipsOf(ctx: Ctx): Relationship[] {
  const byKey = new Map<string, Relationship>()

  for (const join of Object.values(ctx.project.entities)) {
    if (join.role !== 'join') continue
    const rows = ctx.project.rowsByEntity[join.id] ?? []
    const retiredJoin = isRetired(join)

    const refs = join.fields.filter(
      (f) => f.type === 'reference' && f.refEntityId && ctx.project.entities[f.refEntityId],
    )

    for (let i = 0; i < refs.length; i += 1) {
      for (let j = i + 1; j < refs.length; j += 1) {
        const target = (f: FieldDef): EntityDef => ctx.project.entities[f.refEntityId ?? '']
        const ki = kindOf(target(refs[i]))
        const kj = kindOf(target(refs[j]))
        if (!ki || !kj) continue

        const a = { field: refs[i], kind: ki }
        const b = { field: refs[j], kind: kj }
        const [lo, hi] =
          `${a.kind}|${exact(a.field.name)}` <= `${b.kind}|${exact(b.field.name)}` ? [a, b] : [b, a]

        const left: SideSpec = { kind: lo.kind, fieldName: lo.field.name.trim() }
        const right: SideSpec = { kind: hi.kind, fieldName: hi.field.name.trim() }
        const key = `${left.kind}·${exact(left.fieldName)} × ${right.kind}·${exact(right.fieldName)}`

        let rel = byKey.get(key)
        if (!rel) {
          rel = {
            key,
            label: `${left.fieldName} (${left.kind}) × ${right.fieldName} (${right.kind})`,
            left,
            right,
            joins: [],
            pairings: [],
            heldBack: 0,
          }
          byKey.set(key, rel)
        }
        if (!rel.joins.some((e) => e.id === join.id)) rel.joins.push(join)

        for (const joinRow of rows) {
          const l = resolve(ctx, joinRow, lo.field)
          const r = resolve(ctx, joinRow, hi.field)
          if (!l || !r) continue
          if (retiredJoin || !liveSide(l) || !liveSide(r)) {
            rel.heldBack += 1
            continue
          }
          rel.pairings.push({
            join,
            joinRow,
            left: l,
            right: r,
            recommended: readCell(joinRow, PAIR_RECOMMENDED_FIELD) === true,
          })
        }
      }
    }
  }

  /* A relationship with nothing live in it is still REPORTED where
     something was held back, because "every pairing here is against
     stock nobody may sell" is a finding and an empty list is not. */
  return [...byKey.values()]
    .filter((r) => r.pairings.length > 0 || r.heldBack > 0)
    .sort((a, b) => b.pairings.length - a.pairings.length || b.heldBack - a.heldBack)
}

const liveSide = (s: SideRow): boolean => !isRetired(s.entity) && !isDiscontinued(s.row)

function resolve(ctx: Ctx, joinRow: RowData, field: FieldDef): SideRow | null {
  const v = readCell(joinRow, field.id)
  if (typeof v !== 'string' || v === '') return null
  return ctx.rowById.get(v) ?? null
}

/* ---------------------------------------------------------- */
/* Judging — the four bands, and the two outright rejections   */
/* ---------------------------------------------------------- */

interface Judgement {
  verdict: Verdict
  threshold: string
  admitted: boolean
  enforcement: Enforcement
}

function judge(
  hits: number,
  tested: number,
  discrimination: DiscriminationReading | null,
  rejectsRecommendation: number,
): Judgement {
  if (rejectsRecommendation > 0) {
    return {
      verdict: 'rejected',
      threshold: THRESHOLDS.recommendation,
      admitted: false,
      enforcement: 'report',
    }
  }
  if (tested === 0) {
    return {
      verdict: 'observation',
      threshold: THRESHOLDS.observation,
      admitted: false,
      enforcement: 'report',
    }
  }
  const rate = hits / tested
  if (discrimination?.vacuous === true) {
    /* Nothing in the catalogue could break it, so nothing in the
       catalogue is being told anything. Reportable, never a rule. */
    return {
      verdict: 'observation',
      threshold: THRESHOLDS.vacuous,
      admitted: false,
      enforcement: 'report',
    }
  }
  if (rate >= FILTER_RATE && discrimination && !discrimination.floor) {
    /* It clears the bar a filter would have to clear. It is still
       OBSERVED, so `enforcement` is 'warn' — see MAY_PRUNE. */
    return { verdict: 'filter', threshold: THRESHOLDS.filter, admitted: true, enforcement: 'warn' }
  }
  if (rate >= WARNING_RATE) {
    return {
      verdict: 'warning',
      threshold: discrimination?.floor === true ? THRESHOLDS.floor : THRESHOLDS.warning,
      admitted: true,
      enforcement: 'warn',
    }
  }
  return {
    verdict: 'observation',
    threshold: THRESHOLDS.observation,
    admitted: false,
    enforcement: 'report',
  }
}

/* ---------------------------------------------------------- */
/* Discrimination readings                                     */
/* ---------------------------------------------------------- */

function discriminationOf(catalogue: number, admitted: number[]): DiscriminationReading | null {
  if (catalogue === 0 || admitted.length === 0) return null
  let least = Infinity
  let most = -Infinity
  let sum = 0
  for (const n of admitted) {
    const share = n / catalogue
    if (share < least) least = share
    if (share > most) most = share
    sum += share
  }
  const mean = sum / admitted.length
  return {
    catalogue,
    over: admitted.length,
    leastLeft: least,
    mostLeft: most,
    meanLeft: mean,
    floor: mean >= DISCRIMINATION_CEILING,
    vacuous: least >= 1,
  }
}

/* ---------------------------------------------------------- */
/* SHAPE 1 · THE CATEGORICAL SELECTOR                          */
/* ---------------------------------------------------------- */

/**
 * A group one side's rows belong to, spelled as that side's own data
 * spells it.
 *
 * THE DERIVATION IS `trailerFitment.marqueVocabulary` GENERALISED,
 * and the generalisation is in exactly one place. That function asks
 * whether a partner's SERIES BANNER — its outermost hierarchy level —
 * names a candidate, because F8 is a rule about banners. This engine
 * does not know which column is the banner: it is looking for the
 * column, so the third test becomes "some column of the far kind
 * names it" and the winning column falls out of the measurement.
 *
 * The first two tests are unchanged, and each is here because
 * dropping it produces a wrong answer on the real seed:
 *
 *   1. a candidate comes from a table's NAME, or from a multi-word
 *      value of its outermost level. Single-word level values are
 *      excluded: Highfield's `Sport` series would otherwise claim
 *      Dunbier's `SPORT CENTRELINE WIDE SERIES`.
 *   2. it belongs to exactly one table of its kind. A word two brands
 *      share cannot select between them.
 *
 * `discover.test.ts` asserts this vocabulary contains every marque
 * `marqueVocabulary` finds on the same seed, so the generalisation is
 * checked against the specific engine rather than assumed to agree.
 */
interface Group {
  name: string
  from: 'table' | 'level'
  tableId: string
}

function nameTokens(text: string): string[] {
  return text
    .split(/[^A-Za-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && /[A-Za-z]/.test(t))
}

function groupVocabulary(ctx: Ctx, kind: TableKind): Group[] {
  const candidates = new Map<string, { name: string; from: 'table' | 'level'; tables: Set<string> }>()
  const add = (name: string, from: 'table' | 'level', tableId: string): void => {
    const key = `${from}:${fold(name).trim()}`
    const hit = candidates.get(key)
    if (hit) {
      hit.tables.add(tableId)
      return
    }
    candidates.set(key, { name: name.trim(), from, tables: new Set([tableId]) })
  }

  const seen = new Set<string>()
  for (const side of ctx.live(kind)) {
    const entity = side.entity
    if (!seen.has(entity.id)) {
      seen.add(entity.id)
      for (const token of nameTokens(entity.name)) add(token, 'table', entity.id)
    }
    const levelId = entity.hierarchy?.[0]
    if (!levelId) continue
    const v = readCell(side.row, levelId)
    if (typeof v !== 'string') continue
    const value = v.trim()
    /* multi-word only — see test 1 above */
    if (value.length < 4 || !value.includes(' ')) continue
    add(value, 'level', entity.id)
  }

  return [...candidates.values()]
    .filter((c) => c.tables.size === 1)
    .map((c) => ({ name: c.name, from: c.from, tableId: [...c.tables][0] }))
    /* longest first, so a nested pair resolves to the more specific
       one — `Merry Fisher` before any bare word it contains */
    .sort((a, b) => b.name.length - a.name.length || a.name.localeCompare(b.name))
}

/** The group one row belongs to: its own level value where that names
 *  a group, otherwise its table's. A row with neither is a real
 *  answer, not a gap. */
function groupOf(side: SideRow, groups: readonly Group[]): Group | null {
  const levelId = side.entity.hierarchy?.[0]
  if (levelId) {
    const v = readCell(side.row, levelId)
    if (typeof v === 'string' && v.trim() !== '') {
      const hit = groups.find(
        (g) =>
          g.from === 'level' && g.tableId === side.entity.id && fold(g.name).trim() === fold(v).trim(),
      )
      if (hit) return hit
    }
  }
  return groups.find((g) => g.from === 'table' && g.tableId === side.entity.id) ?? null
}

interface ShapeCtx {
  ctx: Ctx
  rel: Relationship
  opts: Required<Omit<DiscoverOptions, 'shapes'>>
  comparisons: { n: number }
  /** numeric column pairs declined because the two headers do not
     declare the same unit — see `unitOf` */
  incomparable: { n: number }
  /** dependencies declined because one column spells the other */
  restated: { n: number }
}

function selectorCandidates(sc: ShapeCtx): Candidate[] {
  const out: Candidate[] = []
  for (const [subjectSide, partnerSide] of [
    ['left', 'right'],
    ['right', 'left'],
  ] as const) {
    const subjectKind = sc.rel[subjectSide].kind
    const partnerKind = sc.rel[partnerSide].kind
    const groups = groupVocabulary(sc.ctx, subjectKind)
    if (groups.length === 0) continue

    const catalogue = sc.ctx.live(partnerKind)
    for (const col of sc.ctx.columns(partnerKind, ['text', 'select'])) {
      /* the whole far catalogue read once for this column, and reused
         for the pairing loop and the discrimination alike */
      const valueByRow = new Map<string, string>()
      const distinct = new Set<string>()
      let populated = 0
      for (const side of catalogue) {
        const r = sc.ctx.readColumn(side, col)
        if (r.text === null) continue
        populated += 1
        valueByRow.set(side.row.id, r.text)
        distinct.add(exact(r.text))
      }
      /* A SELECTOR HAS TO GROUP. A column with a distinct value for
         every row is a name, not a group, and testing it would report
         a 0 % rule for every product in the catalogue. Half the rows
         is a generous line and the count is printed either way. */
      if (populated === 0 || distinct.size < 2 || distinct.size > Math.max(2, populated / 2)) continue

      /* THE THIRD TEST, APPLIED HERE AND NOT IN THE VOCABULARY.
         `marqueVocabulary` keeps only candidates some partner banner
         actually names; this engine is looking for the banner, so the
         same test is applied once per column — the groups THIS column
         names. Leaving it out is not a small error: with the full
         vocabulary in play a Highfield hull resolves to its own
         SERIES ("Ocean Master") rather than to Highfield, and the
         trailer rule reads 151/626 instead of 626/626. */
      const colGroups = groups.filter((g) =>
        [...distinct].some((v) => names(v, g.name)),
      )
      if (colGroups.length === 0) continue

      /* which group each distinct value names, resolved once */
      const namedBy = new Map<string, Group | null>()
      const groupNamed = (text: string): Group | null => {
        const key = exact(text)
        if (namedBy.has(key)) return namedBy.get(key) ?? null
        const hit = colGroups.find((g) => names(text, g.name)) ?? null
        namedBy.set(key, hit)
        return hit
      }

      const subjectExcl = new Exclusions()
      const partnerExcl = new Exclusions()
      let hits = 0
      let tested = 0
      let rejectsRecommendation = 0
      const counter: CounterExample[] = []
      let counterTotal = 0
      const usedGroups = new Set<string>()

      for (const p of sc.rel.pairings) {
        sc.comparisons.n += 1
        const subject = p[subjectSide]
        const partner = p[partnerSide]
        const g = groupOf(subject, colGroups)
        if (!g) {
          subjectExcl.cannotTest(
            `no identity could be read for it — neither its table's name nor its outermost level is named by any “${col.name}” value in the ${partnerKind} catalogue`,
          )
          continue
        }
        const r = sc.ctx.readColumn(partner, col)
        if (!partnerExcl.keep(r) || r.text === null) continue
        const named = groupNamed(r.text)
        if (!named) {
          /* NOT A COUNTER-EXAMPLE. The rule cannot run on a value
             that names no group at all, and counting it as a failure
             is how F8 gets reported at 83 % instead of 100 %. */
          partnerExcl.cannotTest(`its “${col.name}” names none of the ${subjectKind} groups`)
          continue
        }
        tested += 1
        usedGroups.add(fold(g.name).trim())
        if (fold(named.name).trim() === fold(g.name).trim()) {
          hits += 1
          continue
        }
        counterTotal += 1
        if (p.recommended) rejectsRecommendation += 1
        if (counter.length < sc.opts.maxCounterExamples) {
          counter.push({
            subject: rowLabel(subject.entity, subject.row),
            partner: rowLabel(partner.entity, partner.row),
            detail: `${col.name} “${r.text}” names ${named.name}, not ${g.name}`,
            recommended: p.recommended,
          })
        }
      }

      if (tested === 0) continue

      /* Discrimination, per group actually used: how many of the far
         catalogue this column admits for it. One pass over the
         catalogue readings already taken, not one pass per group. */
      const admittedBy = new Map<string, number>()
      for (const text of valueByRow.values()) {
        const named = groupNamed(text)
        if (!named) continue
        const key = fold(named.name).trim()
        admittedBy.set(key, (admittedBy.get(key) ?? 0) + 1)
      }
      const admitted: number[] = []
      for (const g of colGroups) {
        const key = fold(g.name).trim()
        if (!usedGroups.has(key)) continue
        admitted.push(admittedBy.get(key) ?? 0)
      }
      const discrimination = discriminationOf(catalogue.length, admitted)
      const verdict = judge(hits, tested, discrimination, rejectsRecommendation)

      out.push({
        id: `dx:selector:${sc.rel.key}:${subjectKind}<-${partnerKind}·${exact(col.name)}`,
        shape: 'categorical-selector',
        relationship: sc.rel.label,
        statement: `A ${partnerKind} is only offered with a ${subjectKind} whose own identity its “${col.name}” names.`,
        because: `${hits} of ${tested} pairings the price file writes agree`,
        source: `${col.name} on ${col.fieldByTable.size} ${partnerKind} table${col.fieldByTable.size === 1 ? '' : 's'}, against the ${subjectKind} identities read out of the project: ${colGroups
          .filter((g) => usedGroups.has(fold(g.name).trim()))
          .map((g) => g.name)
          .join(', ')}`,
        evidence: 'observed',
        enforcement: verdict.enforcement,
        hits,
        tested,
        rate: hits / tested,
        discrimination,
        uniqueness: null,
        counterExamples: counter,
        counterExampleTotal: counterTotal,
        rejectsRecommendation,
        wouldDelete: null,
        excluded: { left: subjectExcl.read(), right: partnerExcl.read() },
        verdict: verdict.verdict,
        threshold: verdict.threshold,
        admitted: verdict.admitted,
      })
    }
  }
  return out
}

/* ---------------------------------------------------------- */
/* SHAPE 2 · THE NUMERIC BOUND                                 */
/* ---------------------------------------------------------- */

const lowerBound = (sorted: number[], x: number): number => {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < x) lo = mid + 1
    else hi = mid
  }
  return lo
}

interface BoundTally {
  a: MeasurableColumn
  b: MeasurableColumn
  /** b >= a */
  bOverA: number
  /** a >= b */
  aOverB: number
  tested: number
  unit: string
  aExcl: Exclusions
  bExcl: Exclusions
}

function boundCandidates(sc: ShapeCtx): Candidate[] {
  /* TWO NUMBERS ARE COMPARED ONLY WHERE THE FILE SAYS THEY ARE THE
     SAME KIND OF NUMBER — see `unitOf`. A column whose header
     declares no unit is not guessed at; it is counted and left
     alone, and the count is reported on `bounds.incomparable`. */
  const aCols = sc.ctx.columns(sc.rel.left.kind, ['number'])
  const bCols = sc.ctx.columns(sc.rel.right.kind, ['number'])
  const aUnit = aCols.map((c) => unitOf(c.name))
  const bUnit = bCols.map((c) => unitOf(c.name))
  const comparable: Array<{ i: number; j: number; unit: string }> = []
  for (let i = 0; i < aCols.length; i += 1) {
    for (let j = 0; j < bCols.length; j += 1) {
      const unit = aUnit[i]
      if (unit !== null && unit === bUnit[j]) comparable.push({ i, j, unit })
      else sc.incomparable.n += 1
    }
  }
  if (comparable.length === 0) return []

  /* Read every numeric cell ONCE per pairing rather than once per
     column pair — the difference between one pass and |a|×|b| passes
     over the same rows. */
  const n = sc.rel.pairings.length
  const aVals: Array<Array<number | null>> = aCols.map(() => new Array<number | null>(n).fill(null))
  const bVals: Array<Array<number | null>> = bCols.map(() => new Array<number | null>(n).fill(null))
  const aExcl = aCols.map(() => new Exclusions())
  const bExcl = bCols.map(() => new Exclusions())

  /* only the columns some comparable pair actually uses are read */
  const usedA = [...new Set(comparable.map((c) => c.i))]
  const usedB = [...new Set(comparable.map((c) => c.j))]
  for (let p = 0; p < n; p += 1) {
    const pair = sc.rel.pairings[p]
    for (const i of usedA) {
      const r = sc.ctx.readColumn(pair.left, aCols[i])
      if (aExcl[i].keep(r) && r.num !== null) aVals[i][p] = r.num
    }
    for (const j of usedB) {
      const r = sc.ctx.readColumn(pair.right, bCols[j])
      if (bExcl[j].keep(r) && r.num !== null) bVals[j][p] = r.num
    }
  }

  const tallies: BoundTally[] = []
  for (const { i, j, unit } of comparable) {
    let tested = 0
    let bOverA = 0
    let aOverB = 0
    for (let p = 0; p < n; p += 1) {
      const av = aVals[i][p]
      const bv = bVals[j][p]
      if (av === null || bv === null) continue
      tested += 1
      if (bv >= av) bOverA += 1
      if (av >= bv) aOverB += 1
    }
    sc.comparisons.n += n
    if (tested === 0) continue
    tallies.push({
      a: aCols[i],
      b: bCols[j],
      bOverA,
      aOverB,
      tested,
      unit,
      aExcl: aExcl[i],
      bExcl: bExcl[j],
    })
  }

  /* One candidate per DIRECTION, and only the promising ones are
     costed out — discrimination and counter-examples are the
     expensive readings and they run on survivors only. */
  interface Direction {
    tally: BoundTally
    upper: MeasurableColumn
    lower: MeasurableColumn
    upperSide: 'left' | 'right'
    hits: number
  }
  const directions: Direction[] = []
  for (const t of tallies) {
    directions.push({ tally: t, upper: t.b, lower: t.a, upperSide: 'right', hits: t.bOverA })
    directions.push({ tally: t, upper: t.a, lower: t.b, upperSide: 'left', hits: t.aOverB })
  }
  directions.sort((x, y) => y.hits / y.tally.tested - x.hits / x.tally.tested)

  const keep = directions.filter(
    (d, idx) => d.hits / d.tally.tested >= WARNING_RATE || idx < sc.opts.maxPerShape * 2,
  )

  const out: Candidate[] = []
  for (const d of keep) {
    const t = d.tally
    const lowerSide = d.upperSide === 'left' ? 'right' : 'left'
    const upperKind = sc.rel[d.upperSide].kind
    const lowerKind = sc.rel[lowerSide].kind

    /* counter-examples, and whether any lands on a recommendation */
    const counter: CounterExample[] = []
    let counterTotal = 0
    let rejectsRecommendation = 0
    for (const pair of sc.rel.pairings) {
      const up = sc.ctx.readColumn(pair[d.upperSide], d.upper)
      const lowv = sc.ctx.readColumn(pair[lowerSide], d.lower)
      if (up.num === null || lowv.num === null) continue
      if (up.num >= lowv.num) continue
      counterTotal += 1
      if (pair.recommended) rejectsRecommendation += 1
      if (counter.length < sc.opts.maxCounterExamples) {
        counter.push({
          subject: rowLabel(pair[lowerSide].entity, pair[lowerSide].row),
          partner: rowLabel(pair[d.upperSide].entity, pair[d.upperSide].row),
          detail: `${d.upper.name} ${up.num} is below ${d.lower.name} ${lowv.num}`,
          recommended: pair.recommended,
        })
      }
    }

    /* Discrimination: for every live row that carries the lower
       column, how much of the far catalogue clears it. Sorted once,
       binary-searched — never a second cross product. */
    const catalogue: number[] = []
    for (const side of sc.ctx.live(upperKind)) {
      const r = sc.ctx.readColumn(side, d.upper)
      if (r.num !== null) catalogue.push(r.num)
    }
    catalogue.sort((x, y) => x - y)
    const admitted: number[] = []
    for (const side of sc.ctx.live(lowerKind)) {
      const r = sc.ctx.readColumn(side, d.lower)
      if (r.num === null) continue
      admitted.push(catalogue.length - lowerBound(catalogue, r.num))
    }
    const discrimination = discriminationOf(catalogue.length, admitted)
    const verdict = judge(d.hits, t.tested, discrimination, rejectsRecommendation)

    out.push({
      id: `dx:bound:${sc.rel.key}:${upperKind}·${exact(d.upper.name)}>=${lowerKind}·${exact(d.lower.name)}`,
      shape: 'numeric-bound',
      relationship: sc.rel.label,
      statement: `A ${upperKind}’s “${d.upper.name}” is never below the ${lowerKind}’s “${d.lower.name}”.`,
      because: `${d.hits} of ${t.tested} pairings the price file writes hold it`,
      source: `“${d.upper.name}” on ${d.upper.fieldByTable.size} ${upperKind} table${d.upper.fieldByTable.size === 1 ? '' : 's'} against “${d.lower.name}” on ${d.lower.fieldByTable.size} ${lowerKind} table${d.lower.fieldByTable.size === 1 ? '' : 's'}`,
      evidence: 'observed',
      enforcement: verdict.enforcement,
      hits: d.hits,
      tested: t.tested,
      rate: d.hits / t.tested,
      discrimination,
      uniqueness: null,
      counterExamples: counter,
      counterExampleTotal: counterTotal,
      rejectsRecommendation,
      wouldDelete: null,
      excluded: {
        left: d.upperSide === 'left' ? t.aExcl.read() : t.bExcl.read(),
        right: d.upperSide === 'left' ? t.bExcl.read() : t.aExcl.read(),
      },
      verdict: verdict.verdict,
      threshold: verdict.threshold,
      admitted: verdict.admitted,
    })
  }
  return out
}

/* ---------------------------------------------------------- */
/* SHAPE 3 · THE JOIN KEY                                      */
/* ---------------------------------------------------------- */

/**
 * WHICH COLUMN ACTUALLY IDENTIFIES A ROW, and it is measured in two
 * halves because the adjudication needed both.
 *
 *   UNIQUE   over every row of the kind, HISTORY INCLUDED. A key that
 *            is unique only among current stock stops resolving the
 *            moment an old quote is opened.
 *   NAMED    the price file's own join text names the value verbatim.
 *            The join row carries the text the workbook typed to make
 *            the join; a column the text never names is not what the
 *            file is joining on, however unique it is.
 *
 * `map-quote.md` concluded the trailer's real key is the code inside
 * the name. Re-measured, the display name has 474 distinct over 476
 * rows and the code has 459 with thirteen duplicates — the code is a
 * worse key in both places it was proposed as a better one
 * (FITMENT_RULES.md §1.3). Uniqueness alone settles that pair; the
 * NAMED half is what stops a system column — a source cell address,
 * unique on every row — from being reported as the key.
 *
 * WHAT THE NAMED HALF DEPENDS ON, said plainly because it is a real
 * limit. It reads the text the JOIN ROW carries: the composed name
 * of the pairing and whatever else the importer wrote onto it. In
 * this project that text is the two display names the workbook
 * itself joined on, which is exactly the right thing to measure. In
 * a project whose join rows carry no text at all there is nothing to
 * match against, every column reads 0 of N, and NO key is admitted —
 * which is the honest answer ("this file does not say what it joins
 * on") and not a silent one: the 0 and the N are both on the card.
 */
function joinTextSegments(ctx: Ctx, join: EntityDef, joinRow: RowData): Set<string> {
  const out = new Set<string>()
  for (const field of join.fields) {
    if (field.type !== 'text' || isPairFieldId(field.id)) continue
    const v = readCell(joinRow, field.id)
    if (typeof v !== 'string' || v === '') continue
    out.add(exact(v))
    /* The composed name of a pairing lists the names it joins on,
       separated. Splitting is what makes this an EXACT match rather
       than a substring one — a code that happens to sit inside a name
       must not count as the name. */
    for (const part of v.split(/\s+·\s+|\s*\|\s*|\r?\n/)) {
      const p = exact(part)
      if (p !== '') out.add(p)
    }
  }
  return out
}

/** One kind's worth of key candidates, yielded a kind at a time so
 *  the run has somewhere to stop. Measured on the full seed, doing
 *  all six kinds in one block cost 466 ms — the longest single step
 *  in the run, and the only one left over 150 ms. */
function* joinKeySteps(
  ctx: Ctx,
  opts: Required<Omit<DiscoverOptions, 'shapes'>>,
): Generator<{ kind: TableKind; candidates: Candidate[] }, void, void> {
  /* every reference from a join row to a table, grouped by kind */
  const refsByKind = new Map<TableKind, Array<{ join: EntityDef; joinRow: RowData; target: SideRow }>>()
  for (const join of Object.values(ctx.project.entities)) {
    if (join.role !== 'join' || isRetired(join)) continue
    for (const joinRow of ctx.project.rowsByEntity[join.id] ?? []) {
      for (const field of join.fields) {
        if (field.type !== 'reference') continue
        const target = resolve(ctx, joinRow, field)
        if (!target) continue
        const kind = kindOf(target.entity)
        if (!kind) continue
        push(refsByKind, kind, { join, joinRow, target })
      }
    }
  }

  for (const [kind, refs] of refsByKind) {
    const out: Candidate[] = []
    /* segments of each join row, folded once */
    const segments = new Map<string, Set<string>>()
    const segmentsFor = (join: EntityDef, joinRow: RowData): Set<string> => {
      const hit = segments.get(joinRow.id)
      if (hit) return hit
      const made = joinTextSegments(ctx, join, joinRow)
      segments.set(joinRow.id, made)
      return made
    }

    for (const col of ctx.columns(kind, ['text', 'number'])) {
      /* uniqueness over EVERY row of the kind, history included */
      const counts = new Map<string, number>()
      const excl = new Exclusions()
      let rows = 0
      for (const side of ctx.all(kind)) {
        const r = ctx.readColumn(side, col)
        if (r.text === null) {
          if (col.fieldByTable.has(side.entity.id)) excl.keep(r)
          continue
        }
        rows += 1
        const key = exact(r.text)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      if (rows === 0) continue
      const distinct = counts.size
      const duplicated = rows - distinct
      const repeats = [...counts.entries()]
        .filter(([, n]) => n > 1)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      const uniqueness: UniquenessReading = {
        rows,
        distinct,
        duplicated,
        examples: repeats
          .slice(0, opts.maxCounterExamples)
          .map(([value, n]) => ({ value, rows: n })),
        exampleTotal: repeats.length,
      }

      /* the named half */
      const matchExcl = new Exclusions()
      let hits = 0
      let tested = 0
      const counter: CounterExample[] = []
      let counterTotal = 0
      for (const ref of refs) {
        if (!col.fieldByTable.has(ref.target.entity.id)) continue
        const r = ctx.readColumn(ref.target, col)
        if (!matchExcl.keep(r) || r.text === null) continue
        tested += 1
        if (segmentsFor(ref.join, ref.joinRow).has(exact(r.text))) {
          hits += 1
          continue
        }
        counterTotal += 1
        if (counter.length < opts.maxCounterExamples) {
          counter.push({
            subject: ref.join.name,
            partner: rowLabel(ref.target.entity, ref.target.row),
            detail: `nothing in the pairing’s own text reads “${r.text}”`,
            recommended: readCell(ref.joinRow, PAIR_RECOMMENDED_FIELD) === true,
          })
        }
      }
      if (tested === 0) continue

      const uniqueRate = distinct / rows
      const matchRate = hits / tested
      const admitted = matchRate >= JOIN_KEY_MATCH_RATE && uniqueRate >= JOIN_KEY_UNIQUE_RATE

      out.push({
        id: `dx:joinkey:${kind}·${exact(col.name)}`,
        shape: 'join-key',
        relationship: `pairings that name a ${kind}`,
        statement: `The price file identifies a ${kind} by its “${col.name}”.`,
        because: `the pairing’s own text names it on ${hits} of ${tested} references, and ${distinct} distinct values cover ${rows} rows`,
        source: `“${col.name}” on ${col.fieldByTable.size} ${kind} table${col.fieldByTable.size === 1 ? '' : 's'}, measured over every row of the kind including history`,
        evidence: 'observed',
        enforcement: 'report',
        hits,
        tested,
        rate: matchRate,
        discrimination: null,
        uniqueness,
        counterExamples: counter,
        counterExampleTotal: counterTotal,
        rejectsRecommendation: 0,
        wouldDelete: null,
        excluded: { left: matchExcl.read(), right: excl.read() },
        /* A JOIN KEY IS NEVER 'rejected'. That band is for a rule
           that would delete business; a column that is not the key is
           simply not the key, and saying so with both halves of the
           threshold beside it is the whole finding. */
        verdict: 'observation',
        threshold: THRESHOLDS.joinKey,
        admitted,
      })
    }
    yield { kind, candidates: out }
  }
}

/* ---------------------------------------------------------- */
/* Attributes of a pairing — for dependency and uniqueness     */
/* ---------------------------------------------------------- */

interface Attr {
  key: string
  label: string
  read: (p: Pairing) => CellReading
  display: (p: Pairing) => string
}

function attributesOf(ctx: Ctx, rel: Relationship): Attr[] {
  const out: Attr[] = [
    {
      key: `side:left:${rel.left.fieldName}`,
      label: `${rel.left.fieldName} (the ${rel.left.kind})`,
      read: (p) => readIdentity(p.left.row.id),
      display: (p) => rowLabel(p.left.entity, p.left.row),
    },
    {
      key: `side:right:${rel.right.fieldName}`,
      label: `${rel.right.fieldName} (the ${rel.right.kind})`,
      read: (p) => readIdentity(p.right.row.id),
      display: (p) => rowLabel(p.right.entity, p.right.row),
    },
  ]

  /* every OTHER column the join row carries — including its other
     reference columns, because the rigging kit chosen beside a motor
     is one of them and it is the column the rigging adjudication
     turned on */
  const seen = new Set<string>([exact(rel.left.fieldName), exact(rel.right.fieldName)])
  for (const join of rel.joins) {
    for (const field of join.fields) {
      if (isPairFieldId(field.id)) continue
      const key = exact(field.name)
      if (seen.has(key)) continue
      if (!['text', 'select', 'number', 'reference', 'boolean'].includes(field.type)) continue
      seen.add(key)
      /* A reference column names the same thing whether it is one of
         the relationship's two sides or a third column on the row, so
         it is LABELLED the same either way — otherwise the same
         finding, reached through two relationships, reads as two
         findings and neither can be merged with the other. */
      const refKind = field.refEntityId ? kindOf(ctx.project.entities[field.refEntityId]) : null
      /* the HEADER stays the field's own name — §6.1's leaked-header
         sentinel is checked against it, and "Rigging Kit Option" is
         one of the six strings that leaked */
      const header = field.name.trim()
      const label = refKind ? `${header} (the ${refKind})` : header
      /* resolved ONCE per join table, not once per cell. A linear
         scan of the join's fields inside the read path is a hidden
         factor of ten over fifteen thousand pairings. */
      const idByJoin = new Map<string, string | null>()
      const fieldIdOn = (p: Pairing): string | null => {
        const hit = idByJoin.get(p.join.id)
        if (hit !== undefined) return hit
        const made = p.join.fields.find((f) => exact(f.name) === key)?.id ?? null
        idByJoin.set(p.join.id, made)
        return made
      }
      out.push({
        key: `col:${key}`,
        label,
        read: (p) => {
          const id = fieldIdOn(p)
          if (!id) return { text: null, raw: null, num: null, skip: 'empty', rule: null }
          return readValue(readCell(p.joinRow, id), header)
        },
        display: (p) => {
          const id = fieldIdOn(p)
          const v = id ? readCell(p.joinRow, id) : null
          if (typeof v !== 'string' || v === '') return '(empty)'
          const target = ctx.rowById.get(v)
          return target ? rowLabel(target.entity, target.row) : v
        },
      })
    }
  }
  return out
}

/**
 * EVERY ATTRIBUTE OF EVERY PAIRING, READ ONCE.
 *
 * The dependency and uniqueness shapes both walk attribute against
 * attribute, so a naive implementation reads the same cell ten or
 * twenty times and folds it again each time. Measured on the full
 * seed that was 480 ms in one uninterruptible block for the boat ×
 * motor relationship alone — thirty dropped frames, in a generator
 * whose whole purpose is not to drop any.
 *
 * Reading once also FIXES AN UNDERCOUNT. The uniqueness shape used to
 * stop reading a combination at the first attribute that skipped, so
 * the attributes after it never recorded their own empties — an
 * exclusion count that is short is exactly the failure this engine
 * exists to prevent, in miniature. Per-attribute accounting cannot
 * have that bug.
 */
interface ReadAttr {
  key: string
  label: string
  /** per pairing index: the comparable value, already exact-folded */
  text: Array<string | null>
  /** what this attribute threw away, over the whole relationship */
  excluded: ExclusionReading
  /** the row's own name, resolved on demand and kept */
  display: (i: number) => string
}

function readAttributes(sc: ShapeCtx): ReadAttr[] {
  const n = sc.rel.pairings.length
  return attributesOf(sc.ctx, sc.rel).map((a) => {
    const text = new Array<string | null>(n).fill(null)
    const excl = new Exclusions()
    for (let i = 0; i < n; i += 1) {
      const r = a.read(sc.rel.pairings[i])
      if (excl.keep(r) && r.text !== null) text[i] = exact(r.text)
    }
    const shown = new Array<string | undefined>(n)
    return {
      key: a.key,
      label: a.label,
      text,
      excluded: excl.read(),
      display: (i: number): string => {
        const hit = shown[i]
        if (hit !== undefined) return hit
        const made = a.display(sc.rel.pairings[i])
        shown[i] = made
        return made
      },
    }
  })
}

/* ---------------------------------------------------------- */
/* SHAPE 4 · THE FUNCTIONAL DEPENDENCY                         */
/* ---------------------------------------------------------- */

/**
 * ONE COLUMN'S VALUE SETTLES ANOTHER'S — reported at whatever rate it
 * holds, and the rigging kit is the reason the sentinel accounting
 * above exists. "The motor names the kit" read 79.4 % while sentinels
 * were on both sides of the comparison, and 53.3 % once they were
 * off. The engine excludes them from BOTH sides and says how many.
 *
 * The measure is the standard approximate-dependency one: for each
 * value of the determinant, the most common value of the dependent,
 * and the share of rows that take it. Two guards, both to keep the
 * measure meaningful rather than to flatter it:
 *
 *   · the determinant must actually GROUP — a column with a distinct
 *     value per row determines everything trivially, which is a key
 *     finding and not a dependency one;
 *   · the dependent must take more than one value, or every column in
 *     the file "determines" a constant.
 */
function dependencyCandidates(sc: ShapeCtx, attrs: ReadAttr[]): Candidate[] {
  const out: Candidate[] = []
  const n = sc.rel.pairings.length

  for (const det of attrs) {
    for (const dep of attrs) {
      if (det.key === dep.key) continue

      const groups = new Map<string, Map<string, number>>()
      let tested = 0
      let restated = 0
      const depValues = new Set<string>()

      for (let i = 0; i < n; i += 1) {
        sc.comparisons.n += 1
        const d = det.text[i]
        const e = dep.text[i]
        if (d === null || e === null) continue
        tested += 1
        /* DOES ONE SIDE SIMPLY CONTAIN THE OTHER? A pairing's composed
           label holds both partners' names, so "choosing the Label
           settles the Boat" measures 100 % and discovers nothing —
           the determinant is not predicting the dependent, it is
           spelling it. Counted here and checked below, because a
           column that quotes another is a shape any price file has
           and none of them means it as a rule. */
        if (names(d, dep.display(i)) || names(e, det.display(i))) restated += 1
        depValues.add(e)
        const bucket = groups.get(d) ?? new Map<string, number>()
        bucket.set(e, (bucket.get(e) ?? 0) + 1)
        groups.set(d, bucket)
      }

      if (tested < sc.opts.minTested) continue
      if (groups.size < 2 || groups.size > tested / 2) continue
      if (depValues.size < 2) continue
      if (restated / tested >= WARNING_RATE) {
        sc.restated.n += 1
        continue
      }

      let hits = 0
      const modal = new Map<string, string>()
      for (const [dv, bucket] of groups) {
        let best = ''
        let bestN = -1
        for (const [ev, n] of bucket) {
          if (n > bestN || (n === bestN && ev < best)) {
            best = ev
            bestN = n
          }
        }
        modal.set(dv, best)
        hits += bestN
      }

      const counter: CounterExample[] = []
      let counterTotal = 0
      let rejectsRecommendation = 0
      for (let i = 0; i < n; i += 1) {
        const d = det.text[i]
        const e = dep.text[i]
        if (d === null || e === null) continue
        if (modal.get(d) === e) continue
        const pairing = sc.rel.pairings[i]
        counterTotal += 1
        if (pairing.recommended) rejectsRecommendation += 1
        if (counter.length < sc.opts.maxCounterExamples) {
          counter.push({
            subject: det.display(i),
            partner: dep.display(i),
            detail: `${det.label} “${det.display(i)}” usually settles ${dep.label} elsewhere`,
            recommended: pairing.recommended,
          })
        }
      }

      const verdict = judge(hits, tested, null, rejectsRecommendation)
      out.push({
        id: `dx:fd:${sc.rel.key}:${det.key}->${dep.key}`,
        shape: 'functional-dependency',
        relationship: sc.rel.label,
        statement: `Choosing the ${det.label} settles the ${dep.label}.`,
        because: `${hits} of ${tested} pairings take the value that ${det.label} most often carries`,
        source: `${det.label} against ${dep.label} on ${sc.rel.joins.length} join table${sc.rel.joins.length === 1 ? '' : 's'}, sentinels excluded from both sides`,
        evidence: 'observed',
        enforcement: verdict.enforcement,
        hits,
        tested,
        rate: hits / tested,
        discrimination: null,
        uniqueness: {
          rows: tested,
          distinct: groups.size,
          duplicated: tested - groups.size,
          examples: [],
          exampleTotal: 0,
        },
        counterExamples: counter,
        counterExampleTotal: counterTotal,
        rejectsRecommendation,
        wouldDelete: null,
        excluded: { left: det.excluded, right: dep.excluded },
        verdict: verdict.verdict,
        threshold: verdict.threshold,
        admitted: verdict.admitted,
      })
    }
  }
  return out
}

/* ---------------------------------------------------------- */
/* SHAPE 5 · UNIQUENESS                                        */
/* ---------------------------------------------------------- */

/** Combinations are keyed by joining their parts with a NUL. No value
 *  a business types contains one, so two different combinations can
 *  never collide by concatenation — which a space separator allows
 *  the moment a value ends in a space. */
const KEY_SEPARATOR = String.fromCharCode(0)

/**
 * IS THE PAIR UNIQUE? On the adjudicated file, no: a `(boat, motor)`
 * unique constraint would delete 641 of 4,018 live edges, and adding
 * the rigging kit still deletes 392 (FITMENT_RULES.md §1.4). The
 * pair's identity is its slot index, and the importer must never
 * dedupe.
 *
 * A CANDIDATE THAT WOULD DELETE EXISTING ROWS SAYS EXACTLY HOW MANY,
 * BY NAME. That is what `wouldDelete` carries, and it is why this
 * shape is worth running even though it can never be admitted: the
 * answer a person needs is the list of rows they would lose.
 */
function uniquenessCandidates(sc: ShapeCtx, attrs: ReadAttr[]): Candidate[] {
  const base = attrs.slice(0, 2)
  if (base.length < 2) return []
  const n = sc.rel.pairings.length

  /* AN EXTRA COLUMN MAY ONLY JOIN THE KEY IF IT GROUPS. A column
     with a distinct value on every row — a source cell address, a
     composed label — makes any combination unique and reports it as
     a finding, which is the same trick as measuring a rule against a
     denominator it built itself. */
  const groupers = attrs.slice(2).filter((a) => {
    const distinct = new Set<string>()
    let seen = 0
    for (const t of a.text) {
      if (t === null) continue
      seen += 1
      distinct.add(t)
    }
    return seen > 0 && distinct.size >= 2 && distinct.size <= seen / 2
  })

  const combos: ReadAttr[][] = [base]
  for (const extra of groupers) combos.push([...base, extra])

  const out: Candidate[] = []
  for (const combo of combos) {
    const counts = new Map<string, { n: number; label: string }>()
    let tested = 0
    let skipped = 0
    for (let i = 0; i < n; i += 1) {
      sc.comparisons.n += 1
      const parts: string[] = []
      let ok = true
      for (const a of combo) {
        const t = a.text[i]
        if (t === null) {
          ok = false
          break
        }
        parts.push(t)
      }
      if (!ok) {
        skipped += 1
        continue
      }
      tested += 1
      const key = parts.join(KEY_SEPARATOR)
      const hit = counts.get(key)
      if (hit) hit.n += 1
      else counts.set(key, { n: 1, label: combo.map((a) => a.display(i)).join(' · ') })
    }
    if (tested < sc.opts.minTested) continue

    const distinct = counts.size
    const deletes = tested - distinct
    const repeats = [...counts.values()]
      .filter((c) => c.n > 1)
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))

    const admitted = deletes === 0
    out.push({
      id: `dx:unique:${sc.rel.key}:${combo.map((a) => a.key).join('+')}`,
      shape: 'uniqueness',
      relationship: sc.rel.label,
      statement: `(${combo.map((a) => a.label).join(', ')}) identifies one pairing.`,
      because: admitted
        ? `${distinct} distinct combinations cover all ${tested} pairings the price file writes`
        : `${distinct} distinct combinations cover ${tested} pairings, so a unique constraint would delete ${deletes} of them`,
      source: `${sc.rel.joins.length} join table${sc.rel.joins.length === 1 ? '' : 's'}: ${sc.rel.joins.map((j) => j.name).join(', ')}${skipped > 0 ? ` — ${skipped} pairing${skipped === 1 ? '' : 's'} carried no value for one part of the key and could not be counted` : ''}`,
      evidence: 'observed',
      enforcement: 'report',
      hits: distinct,
      tested,
      rate: distinct / tested,
      discrimination: null,
      uniqueness: {
        rows: tested,
        distinct,
        duplicated: deletes,
        examples: repeats.slice(0, sc.opts.maxCounterExamples).map((c) => ({ value: c.label, rows: c.n })),
        exampleTotal: repeats.length,
      },
      counterExamples: repeats.slice(0, sc.opts.maxCounterExamples).map((c) => ({
        subject: c.label,
        partner: `${c.n} pairings`,
        detail: `the price file writes this combination ${c.n} times`,
        recommended: false,
      })),
      counterExampleTotal: repeats.length,
      rejectsRecommendation: 0,
      wouldDelete: admitted
        ? null
        : {
            rows: deletes,
            named: repeats.slice(0, sc.opts.maxCounterExamples).map((c) => `${c.label} ×${c.n}`),
            total: repeats.length,
          },
      /* each attribute's exclusions are its own; `skipped` on the
         source line is how many pairings lost at least one part of
         the key and so could not be counted at all */
      excluded: {
        left: combo[0].excluded,
        right: combo.length > 1 ? combo[combo.length - 1].excluded : emptyExclusions(),
      },
      verdict: admitted ? 'observation' : 'rejected',
      threshold: admitted ? THRESHOLDS.observation : THRESHOLDS.deletes,
      admitted,
    })
  }
  return out
}

/* ---------------------------------------------------------- */
/* The run                                                     */
/* ---------------------------------------------------------- */

export interface DiscoveryProgress {
  /** what it has just finished */
  step: string
  done: number
  total: number
  /** how long that step took, milliseconds. A caller driving this
   *  from an idle callback needs to know whether the NEXT step is
   *  likely to cost it a frame, and the only honest predictor is
   *  what the last one cost. */
  ms: number
}

/** Rank: what actually selects, first. A candidate that leaves 3 % of
 *  the catalogue standing outranks one at the same rate that leaves
 *  97 %, which is the whole of the F8-versus-F9 lesson expressed as a
 *  sort. */
function rank(a: Candidate, b: Candidate): number {
  const band = (c: Candidate): number =>
    c.verdict === 'filter' ? 0 : c.verdict === 'warning' ? 1 : c.verdict === 'observation' ? 2 : 3
  if (band(a) !== band(b)) return band(a) - band(b)
  const left = (c: Candidate): number => c.discrimination?.meanLeft ?? 1
  if (left(a) !== left(b)) return left(a) - left(b)
  if (a.rate !== b.rate) return b.rate - a.rate
  return b.tested - a.tested
}

/**
 * The engine, as a generator, so a caller can drive it from an idle
 * callback and never block a frame. Yields once per unit of work and
 * returns the report.
 */
export function* discoverSteps(
  project: DiscoveryProject,
  options: DiscoverOptions = {},
): Generator<DiscoveryProgress, DiscoveryReport, void> {
  const started = Date.now()
  const opts = {
    minTested: options.minTested ?? DEFAULTS.minTested,
    maxCounterExamples: options.maxCounterExamples ?? DEFAULTS.maxCounterExamples,
    maxPerShape: options.maxPerShape ?? DEFAULTS.maxPerShape,
  }
  const wants = (s: CandidateShape): boolean => !options.shapes || options.shapes.includes(s)

  const ctx = new Ctx(project)
  const relationships = relationshipsOf(ctx)
  const comparisons = { n: 0 }
  const incomparable = { n: 0 }
  const restated = { n: 0 }
  const all: Candidate[] = []

  /* ONE YIELD PER RELATIONSHIP PER SHAPE, not one per relationship.
     Measured on the full seed the coarser split left a single step
     costing ~550 ms, which is thirty dropped frames in a row; split
     by shape the largest is ~250 ms and a caller can spread the run
     across as many idle callbacks as it has. The work is identical —
     only the places it is allowed to stop have changed. */
  const perRelationship: Array<[CandidateShape, (sc: ShapeCtx, attrs: ReadAttr[]) => Candidate[]]> = [
    ['categorical-selector', selectorCandidates],
    ['numeric-bound', boundCandidates],
    ['functional-dependency', dependencyCandidates],
    ['uniqueness', uniquenessCandidates],
  ]
  /* an upper bound: one step per relationship per shape, plus one
     per kind that any pairing names. `done` is clamped to it on the
     last yield, so a caller drawing a progress bar never sees it
     overshoot. */
  const total =
    relationships.length * perRelationship.length +
    new Set(
      Object.values(project.entities)
        .map((e) => e.kind)
        .filter((k): k is TableKind => k !== undefined),
    ).size +
    1

  let done = 0
  let mark = Date.now()
  for (const rel of relationships) {
    const sc: ShapeCtx = { ctx, rel, opts, comparisons, incomparable, restated }
    /* read once, used by the dependency and uniqueness shapes alike */
    let attrs: ReadAttr[] | null = null
    for (const [shape, run] of perRelationship) {
      if (wants(shape)) {
        if (attrs === null) attrs = readAttributes(sc)
        all.push(...run(sc, attrs))
      }
      done += 1
      yield { step: `${rel.label} · ${shape}`, done, total, ms: Date.now() - mark }
      mark = Date.now()
    }
  }
  if (wants('join-key')) {
    for (const step of joinKeySteps(ctx, opts)) {
      all.push(...step.candidates)
      done += 1
      yield { step: `join keys · ${step.kind}`, done, total, ms: Date.now() - mark }
      mark = Date.now()
    }
  }
  done = total
  yield { step: 'join keys', done, total, ms: Date.now() - mark }

  /* ONE FINDING, ONE ROW. The same dependency reached through two
     relationships — the rigging kit is a column on the boat × motor
     join AND a side of the motor × kit one — is one finding measured
     twice, and the fuller measurement is the one to keep. Merging on
     the statement rather than on the id is deliberate: the id carries
     the relationship it came through, and that is exactly the part
     that must not make two rows out of one fact. */
  const merged = new Map<string, Candidate>()
  let duplicates = 0
  for (const c of all) {
    const key = `${c.shape}|${c.statement}`
    const hit = merged.get(key)
    if (!hit) {
      merged.set(key, c)
      continue
    }
    duplicates += 1
    if (c.tested > hit.tested) merged.set(key, c)
  }
  const unique = [...merged.values()]

  /* THE BOUNDS, AND WHAT EACH WITHHELD. */
  const thin = unique.filter((c) => c.tested < opts.minTested)
  const reportable = unique.filter((c) => c.tested >= opts.minTested)

  const proposals: Candidate[] = []
  const notProposed: Candidate[] = []
  for (const c of reportable) (c.admitted ? proposals : notProposed).push(c)
  proposals.sort(rank)
  notProposed.sort(rank)

  const capped = <T,>(list: T[], keyOf: (t: T) => string): T[] => {
    const seen = new Map<string, number>()
    const out: T[] = []
    for (const item of list) {
      const k = keyOf(item)
      const n = seen.get(k) ?? 0
      if (n >= opts.maxPerShape) continue
      seen.set(k, n + 1)
      out.push(item)
    }
    return out
  }
  const shownProposals = capped(proposals, (c) => c.shape)
  const shownNotProposed = capped(notProposed, (c) => c.shape)

  return {
    proposals: shownProposals,
    proposalsTotal: proposals.length,
    notProposed: shownNotProposed,
    notProposedTotal: notProposed.length,
    relationships: relationships.map((r) => ({
      key: r.key,
      label: r.label,
      joins: r.joins.map((j) => j.name),
      pairings: r.pairings.length,
      recommended: r.pairings.filter((p) => p.recommended).length,
      leftCatalogue: ctx.live(r.left.kind).length,
      rightCatalogue: ctx.live(r.right.kind).length,
      heldBack: r.heldBack,
    })),
    scanned: {
      tables: ctx.tables,
      rows: ctx.rows,
      relationships: relationships.length,
      pairings: relationships.reduce((n, r) => n + r.pairings.length, 0),
      comparisons: comparisons.n,
      candidates: all.length,
    },
    bounds: {
      minTested: opts.minTested,
      thin: thin.length,
      maxCounterExamples: opts.maxCounterExamples,
      maxPerShape: opts.maxPerShape,
      incomparable: incomparable.n,
      duplicates,
      restated: restated.n,
      withheld:
        proposals.length -
        shownProposals.length +
        (notProposed.length - shownNotProposed.length),
    },
    ms: Date.now() - started,
  }
}

/** The generator, drained on the spot. Fine for a test or a worker;
 *  a UI should drive `discoverSteps` instead, so the frame survives. */
export function discover(
  project: DiscoveryProject,
  options: DiscoverOptions = {},
): DiscoveryReport {
  const run = discoverSteps(project, options)
  let step = run.next()
  while (!step.done) step = run.next()
  return step.value
}
