/* ============================================================
   WHICH RULES GOVERN THIS MODULE — read off the sheet, never
   assigned.

   THE QUESTION THIS FILE ANSWERS. A module is a place in the
   business about a set of TABLES. A rule is written about COLUMNS.
   So "the rules governing this module's subject" is not a field
   somebody sets and can get wrong: it is the intersection of the
   two, computed. Point a module at another table and the rules it
   goes by change with it, in the same render.

   NOTHING HERE ASSIGNS A RULE TO A MODULE. There is no
   `ModuleDef.ruleIds`, and there must not be: a stored pointer is a
   second opinion about a fact the data already states, and the day
   it disagrees with the columns is the day a rule silently stops
   being shown where it bites.

   THREE KINDS OF RULE REACH A MODULE, and they are different
   things — `src/features/constraints/index.ts` says why at length:

     A LIMIT       a ConstraintDef. Has no output; you can only ever
                   break it. Matched by CONCEPT: `columns.ts`
                   addresses a column as `kind::name` across every
                   table that carries it, so a limit reaches this
                   module when one of its columns lives on one of
                   this module's tables.
     A DERIVATION  a RuleDef in the flow builder. Has no truth
                   value; it walks rows and hands back a list.
                   Matched by the table it WALKS (`rootEntityId`) or
                   the table it SEARCHES (a match node's
                   `targetEntityId`).
     THE WORKBOOK  a WorkbookRuleSeed. The dealer's own price file
                   asserting or observing something, with its
                   evidence and its measured rate. Matched by the
                   KIND half of the concept keys in `needs` — a seed
                   naming `boat::max hp` governs any module about
                   boat tables, whether or not this app can run it
                   yet.

   THE THIRD ONE IS THE POINT, and it is why the panel is worth
   drawing at all. A module that shows only what it enforces tells a
   person the system protects them from everything it does not
   mention. The seeds say what is NOT checked, name the fix, and
   carry the numerator and denominator that were actually measured.

   Pure functions: no React, no store reads.
   ============================================================ */

import { TABLE_KINDS } from '@/types/model'
import type {
  ConstraintDef,
  EntityDef,
  ModuleDef,
  RuleDef,
  TableKind,
} from '@/types/model'
import type { ColumnConcept } from '@/features/constraints/columns'
import { WORKBOOK_RULES, type WorkbookRuleSeed } from '@/features/constraints/workbookRules'

/* ---------------------------------------------------------- */
/* The module's own vocabulary                                 */
/* ---------------------------------------------------------- */

/** The kinds this module's tables carry, deduped, in the module's own
 *  table order. A table with no kind reads as 'custom', which is what
 *  `buildConcepts` does — the two must agree or a rule would be found
 *  for a kind no concept was ever keyed under. */
export function moduleKinds(tables: readonly EntityDef[]): TableKind[] {
  const out: TableKind[] = []
  for (const table of tables) {
    const kind = table.kind ?? 'custom'
    if (!out.includes(kind)) out.push(kind)
  }
  return out
}

/** The kind half of a ColumnConcept key (`boat::max hp` → `boat`), or
 *  nothing when the key is not one this app's vocabulary can read.
 *  Validated against TABLE_KINDS rather than trusted, because these
 *  keys are typed by hand into the workbook seeds. */
export function kindOfConceptKey(key: string): TableKind | undefined {
  const head = key.split('::', 1)[0]
  return head in TABLE_KINDS ? (head as TableKind) : undefined
}

/** The concept keys a rule written IN this module may name — the
 *  columns that live on the tables this module is about.
 *
 *  A CONCEPT IS WIDER THAN A MODULE, and the surface that uses this
 *  must say so. `boat::max hp` is one column on seven brand tables;
 *  restricting the picker to concepts that touch THIS module's tables
 *  keeps a person writing about their own subject, but the rule they
 *  write still bites on every table of that kind. `NewRuleSentence`
 *  already prints that reach, counted from the sheet, before the rule
 *  is added. */
export function moduleConceptKeys(
  module: ModuleDef,
  concepts: readonly ColumnConcept[],
): Set<string> {
  const mine = new Set(module.tableIds)
  const out = new Set<string>()
  for (const concept of concepts) {
    if (concept.tableIds.some((id) => mine.has(id))) out.add(concept.key)
  }
  return out
}

/* ---------------------------------------------------------- */
/* Limits — the sentence rules                                 */
/* ---------------------------------------------------------- */

/** The constraints that reach a table this module is about.
 *
 *  Read through the SAME concept index the sentence surface reads, so
 *  a rule shown here is a rule that surface would evaluate against
 *  these tables — never a second opinion about scope. A constraint
 *  naming a column that has since been struck resolves to no concept
 *  and therefore reaches nothing, which is exactly what `tablesFor`
 *  concludes about it too. */
export function constraintsFor(
  constraints: readonly ConstraintDef[],
  module: ModuleDef,
  index: ReadonlyMap<string, ColumnConcept>,
): ConstraintDef[] {
  const mine = new Set(module.tableIds)
  return constraints.filter((c) => {
    const clauses = [...c.if.clauses, ...(c.then?.clauses ?? [])]
    return clauses.some((clause) => {
      const concept = index.get(clause.left.fieldId)
      return concept !== undefined && concept.tableIds.some((id) => mine.has(id))
    })
  })
}

/* ---------------------------------------------------------- */
/* Derivations — the flow rules                                */
/* ---------------------------------------------------------- */

/** How a flow rule touches this module. Both are worth drawing and
 *  they are not the same fact:
 *    'walks'    it runs over the rows of a table in this module
 *    'searches' it looks INTO a table in this module for matches */
export type FlowRole = 'walks' | 'searches'

export interface GoverningFlowRule {
  rule: RuleDef
  role: FlowRole
  /** the table that made it relevant here */
  tableId: string
}

/** The flow rules that walk or search a table this module is about, in
 *  the order the rules were given. `walks` wins when a rule does both,
 *  because the table it is rooted on is the one it is ABOUT. */
export function flowRulesFor(
  rules: readonly RuleDef[],
  module: ModuleDef,
): GoverningFlowRule[] {
  const mine = new Set(module.tableIds)
  const out: GoverningFlowRule[] = []
  for (const rule of rules) {
    if (mine.has(rule.rootEntityId)) {
      out.push({ rule, role: 'walks', tableId: rule.rootEntityId })
      continue
    }
    /* A MATCH NODE NAMES THE TABLE IT SEARCHES. The seeded fitment
       rules are rooted on a boat table and search the motor and
       trailer tables, so a module about motors would otherwise be
       told nothing works out anything about it — while two rules
       are reading its rows on every boat page in the app. */
    const searched = rule.nodes.find(
      (n) => n.kind === 'match' && mine.has(n.config.targetEntityId),
    )
    if (searched && searched.kind === 'match') {
      out.push({ rule, role: 'searches', tableId: searched.config.targetEntityId })
    }
  }
  return out
}

/* ---------------------------------------------------------- */
/* The workbook's own rules                                    */
/* ---------------------------------------------------------- */

export interface GoverningSeed {
  seed: WorkbookRuleSeed
  /** the kinds it names that this module's tables carry */
  onKinds: TableKind[]
  /** the kinds it also names that this module is not about. A rule
   *  comparing a boat column with a motor column is worth seeing in
   *  BOTH places, and each of them should be told which half it owns. */
  alsoKinds: TableKind[]
}

/** The workbook rules that name a column of a kind this module carries,
 *  in the order `WORKBOOK_RULES` declares them — which is the order a
 *  person reads them in, and the order the full list uses.
 *
 *  MATCHED ON KIND, NOT ON TABLE, and deliberately. A seed's `needs`
 *  are concept keys typed against the adjudication, so `boat::max hp`
 *  is a claim about boats and not about Highfield — a module about six
 *  of the seven boat tables is still governed by it. */
export function workbookRulesFor(
  kinds: readonly TableKind[],
  seeds: readonly WorkbookRuleSeed[] = WORKBOOK_RULES,
): GoverningSeed[] {
  const out: GoverningSeed[] = []
  for (const seed of seeds) {
    const onKinds: TableKind[] = []
    const alsoKinds: TableKind[] = []
    for (const need of seed.needs) {
      const kind = kindOfConceptKey(need)
      if (!kind) continue
      const bucket = kinds.includes(kind) ? onKinds : alsoKinds
      if (!bucket.includes(kind)) bucket.push(kind)
    }
    if (onKinds.length > 0) out.push({ seed, onKinds, alsoKinds })
  }
  return out
}
