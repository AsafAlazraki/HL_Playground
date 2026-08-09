/* ============================================================
   CONSTRAINTS — business rules as editable English sentences.

   This is the DEFAULT rule surface. It replaces the flow-chart rule
   builder on the default path (CONFIGURATOR_SPEC §4b, MOCKUP_FINDINGS
   §1.1–1.3). `src/features/rules/` stays in the repo, still works,
   and is still the right answer for the procedural flows that
   genuinely need a graph — it is simply not what a person meets.

   MOUNTING IT (the whole job):

     import { RulesPane } from '@/features/constraints'
     <RulesPane />

   RulesPane fills whatever box it is put in, scrolls itself, brings
   its own stylesheet and takes no props. It reads the current
   organisation from the store, so it is correct the moment it is
   mounted anywhere.

   SHOWING ONE RULE SOMEWHERE ELSE — the "ask why" panel, a quote, a
   blocked option's explanation:

     <RuleSentence constraint={c} />            read-only prose
     <RuleSentence constraint={c} editable />   the same words, live

   ...and `describeConstraint(c)` is that same sentence as plain text,
   for a title attribute, an export, a log line or a search index.
   There is exactly one set of words, produced in one place, so the
   card, the editor, the export and the why-panel can never disagree.

   ---------------------------------------------------------------
   WHAT THIS FEATURE WANTS FROM THE STORE (it adds nothing itself)

   ONE action, and it retires the whole of `constraintDefs.ts`:

       constraints: Record<string, ConstraintDef>
       upsertConstraint: (c: ConstraintDef) => void
       setConstraintEnabled: (id: string, enabled: boolean) => void

   plus `ConstraintDef[]` in `ProjectSnapshot`, `ProjectExport` and
   the Dexie repository — exactly the shape `views` was given.

   Until that lands, constraints live in a module registry keyed by
   `ProjectMeta.org.name` and mirrored to localStorage
   (`helmlogic.constraints.v1`), so a rule someone wrote survives a
   refresh. Swapping the registry for the slice changes nothing above
   `useConstraints()`: same array, same order, same identity rules.

   Until then, `resetProject()` should also call `clearConstraints()`
   (exported below) or a wiped project comes back with the old
   organisation's rules still in it — and `forgetWorkbookSeeds()` with
   it, or the workbook rules will not be offered to the fresh project.

   Two smaller notes for whoever writes that slice:

   1. `ConstraintDef` has no `name`, and must not grow one. The
      sentence is the name — `describeConstraint(c)`. Any naming step
      added later is a step the user did not need.

   2. A constraint stores `FieldPath.fieldId`, one field id, but ONE
      TABLE PER BRAND means the column it means exists once per brand
      table. `columns.ts` resolves the id to a COLUMN CONCEPT (kind +
      name) and applies the rule to every table of that kind, which is
      what makes a rule written against `boat` bite on Highfield and
      Stacer alike. If the representative table is ever deleted the
      id dangles; a store slice could carry the concept key beside the
      id and remove that last sharp edge.
   ============================================================ */

/* -- the public contract ------------------------------------ */

export { RulesPane } from './RulesPane'
export { RuleSentence } from './RuleSentence'
export type { RuleSentenceProps } from './RuleSentence'
export { useConstraints } from './constraintDefs'
export { describeConstraint } from './describe'

/* -- writing rules from anywhere else ----------------------- */

export {
  createConstraint,
  putConstraint,
  setConstraintEnabled,
  registerConstraints,
  clearConstraints,
  getConstraint,
  getConstraints,
  useConstraint,
  orgKeyOf,
} from './constraintDefs'
export type { NewConstraint } from './constraintDefs'

/* -- the card, its switch and its live state ---------------- */

export { RuleCard, Switch, BECAUSE_PLACEHOLDER } from './RuleCard'
export type { RuleCardProps } from './RuleCard'
export { NewRuleSentence, NEW_RULE_CAPTION } from './NewRuleSentence'

export {
  evaluateConstraint,
  evaluateConstraints,
  badgesFor,
  sortConstraints,
  statusNote,
  BADGE_LABEL,
} from './state'
export type { ConstraintStatus, BadgeKind } from './state'

/* -- the vocabulary, for the why-panel and any future solver -- */

export {
  INDICATIVE,
  OBLIGATION,
  ONE_OF,
  opLabel,
  opsFor,
  isUnary,
  literalOf,
  valueWords,
  listWords,
  sentenceTokens,
  joinTokens,
  makeCtx,
  domainOf,
  constraintKindOf,
} from './describe'
export type {
  SentenceCtx,
  SentenceOp,
  SentenceToken,
  Side,
  TokenControl,
  TokenRole,
} from './describe'

export {
  buildConcepts,
  conceptIndex,
  conceptByKey,
  conceptOptionLabel,
  domainFor,
  fieldOn,
  kindLabel,
  representativeFieldId,
} from './columns'
export type { ColumnConcept, ValueControl, ValueDomain } from './columns'

export { useSentenceCtx } from './useCtx'

/* -- the workbook's own rules, and the ones it cannot yet state ---- */

export {
  WORKBOOK,
  WORKBOOK_RULES,
  WORKBOOK_RULES_BLOCKED,
  buildWorkbookConstraints,
  clauseId,
  forgetWorkbookSeeds,
  seedClause,
  seedFieldId,
  seedWorkbookConstraints,
} from './workbookRules'
export type { ResolvedColumns, SeedReport, WorkbookRuleSeed } from './workbookRules'

export {
  addOneOfValue,
  inferKind,
  makeClause,
  removeOneOfValue,
  setBecause,
  setClauseConcept,
  setClauseOp,
  setClauseValue,
  singleGroup,
} from './edit'
