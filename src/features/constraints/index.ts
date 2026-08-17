/* ============================================================
   CONSTRAINTS — business rules as editable English sentences.

   ONE OF TWO RULE SURFACES, AND THEY DO DIFFERENT JOBS. This one
   states LIMITS: things that must be true of every row, whatever else
   happens — "a boat's motor may not exceed its rated Max HP". The
   other, `src/features/rules/` behind "Work out what fits what",
   DERIVES: it walks the rows and hands back a list — "for this hull,
   these are the Yamahas that fit".

   The distinction is not decorative. A limit has no output; you can
   only ever break it. A derivation has no truth value; it just
   produces rows. Trying to write either one in the other's surface is
   how people end up with rules that cannot say what they mean.

   This file used to claim the sentence pane REPLACED the flow builder
   (CONFIGURATOR_SPEC §4b, MOCKUP_FINDINGS §1.1–1.3). That was written
   when the flow builder was unreachable, and it stopped being true the
   moment `src/app/FlowStage.tsx` gave it a canvas. A comment asserting
   a feature does not exist, while the app ships a door to it, sends
   the next reader looking for a bug that is not there.

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
  /* the candidates a measurement killed — never seeds, and here so
     that nobody re-derives one from the column headings */
  WORKBOOK_RULES_REFUTED,
  buildWorkbookConstraints,
  clauseId,
  forgetWorkbookSeeds,
  seedClause,
  seedFieldId,
  seedWorkbookConstraints,
} from './workbookRules'
export type {
  RefutedRuleRecord,
  ResolvedColumns,
  SeedReport,
  WorkbookEvidence,
  WorkbookRuleRef,
  WorkbookRuleSeed,
} from './workbookRules'

/* -- the trailer selector — F8, the rule that actually picks -------
   FOR THE MODULE AND QUOTE WAVES. This is the one rule in either
   workbook that both holds at 100% and rejects something, and it is
   the only thing in this project that narrows a trailer list from a
   catalogue to a shortlist (docs/specs/FITMENT_RULES.md §1.2, F8).

   `TrailerFitmentPanel` takes no props, reads the store itself and
   brings its own stylesheet, exactly like `RegistrationTheme` — so
   drawing it on a module page is one line. It already draws inside
   the rules pane, so it is not waiting on anybody to be reachable.

   THE MODEL UNDER IT is what a picker needs, and it is generic: point
   `selectPartners` at any two kinds and it returns three buckets —
   `selected` (the partner's series names this subject's marque),
   `rejected` (it names another) and `unnamed` (it names none, which is
   NOT a rejection: the price file itself offers ten such trailers).

   TWO THINGS ABOUT IT THAT MUST SURVIVE ANY REUSE, both recorded on
   F8 and F9 in workbookRules.ts and both under test:

     · `TRAILER_ATM_FLOOR` is a WARNING. It annotates a candidate and
       never removes one. Promoting it to a filter is the A2 failure
       the adjudication records once and refuses to repeat, and it
       would reject nothing useful anyway — it leaves a mean 97.70% of
       the catalogue standing.
     · THERE IS NO TRAILER LENGTH RULE. `Boat Size`, `Trailer Length`
       and `Between Guards` are refuted at 9.4%, 50.0% and 0.0%
       (F10, F11) and nothing here reads any of them. */

export { TrailerFitmentPanel } from './TrailerFitmentPanel'

export {
  TRAILER_ATM_FLOOR,
  TRAILER_FITMENT,
  bannerField,
  bannerOf,
  loadFieldFor,
  marqueOfBanner,
  marqueOfSubject,
  marqueVocabulary,
  readCatalogue,
  readMarques,
  selectPartners,
} from './trailerFitment'
export type {
  CatalogueReading,
  FitmentProject,
  FitmentResult,
  FitmentScope,
  FloorSpec,
  FloorVerdict,
  HeldBack,
  Marque,
  MarqueReading,
  PartnerVerdict,
  RegimeReading,
  SelectOptions,
  SeriesVerdict,
} from './trailerFitment'

/* -- the common themes, and the decisions behind the import -------
   FOR THE MODULE WAVE. Both components take no props, read the
   store themselves and bring their own stylesheet, exactly like
   `RulesPane` — so mounting one on a module page is one line:

       import { RegistrationTheme } from '@/features/constraints'
       <RegistrationTheme />

   `RegistrationTheme` belongs beside the Rates & Charges tables,
   and `LeftOutList` belongs wherever a person asks what the import
   covers. Both already draw inside the rules pane, so neither is
   waiting on anybody to be reachable — this export is so they can
   be drawn TWICE without the words being written twice.

   THE MODEL UNDER IT is exported too, and it is what a quote needs:
   `findFeeRegister` locates the fee table, `feeForBand` returns a
   fee AT A NAMED RUNG with the cell it came from, and
   REGISTRATION_POLICY carries the four things that may not be done,
   each with the reason to print at the point of refusal. */

export { RegistrationTheme } from './RegistrationTheme'
export { LeftOutList } from './LeftOutList'

export {
  BOAT_KEY_COLUMN,
  REGISTRATION_AS_AT,
  REGISTRATION_POLICY,
  REGISTRATION_SECTION_ID,
  REGISTRATION_TABLE_NAME,
  THIRD_PARTY_RECOVERY,
  TRAILER_KEY_COLUMN,
  TRAILER_MASS_BANDS,
  atmBandDisagreements,
  feeForBand,
  findFeeRegister,
  massBandFor,
  registrationKeys,
} from './registration'
export type {
  BandCheck,
  BandDisagreement,
  FeeRegister,
  FeeRung,
  MassBand,
  RegistrationFee,
  RegistrationKey,
  RegistrationRequirement,
} from './registration'

export {
  CAME_IN,
  LEFT_OUT,
  RATE_COMMITMENT,
  leftOutArtefacts,
  leftOutSubstantive,
} from './leftOut'
export type { CameInRecord, LeftOutRecord, LeftOutVerdict } from './leftOut'

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
