/* ============================================================
   WORKBOOK RULES — the constraints the Master Price File itself
   ASSERTS or that its values OBSERVABLY hold, seeded into the
   rule registry, and the record of the ones this app cannot yet
   say.

   PROVENANCE, NOT INVENTION
   ─────────────────────────────────────────────────────────────
   Every entry below survived adjudication against the five
   workbooks in `C:/Users/AsafA/Downloads` (opened read-only) and
   is written up in `docs/specs/FITMENT_RULES.md`. Each carries
   the cell, header, formula, banner or divider label it came
   from, quoted in the comment above it, and the `because` clause
   the adjudicator wrote.

   EVERY SEED SAYS WHICH KIND OF EVIDENCE IT RESTS ON, because the
   two are not interchangeable:

     ASSERTED  a formula, a data validation, a lookup, a stated
               header limit, a Min/Max column pair, an explicit
               cross-sheet link, a literal divider or banner label.
     OBSERVED  a pattern in the VALUES. Reportable at any rate, but
               always with its numerator and denominator, and never
               dressed as a rule the business wrote. An OBSERVED
               seed is admitted as a WARNING and may never filter.

   The first six seeds (A1–A6) were adjudicated first and are all
   ASSERTED. The five added since (F6–F12) come from the fitment
   adjudication; two of them — F7 and F12 — are OBSERVED, and say
   so on their card, in their `source`, and in their blocker.

   THE HONEST STATE OF THIS FILE: eleven admitted rules, and ALL
   ELEVEN are `blocked` — not one can be stated as a
   `ConstraintDef` the app can both SHOW and RUN today. Each
   blocker is named on its seed, and the shape the contract would
   need is named with it. The seeder below is real and idempotent;
   it emits a constraint the moment a seed loses its `blocked` and
   gains a `build`. Seeding an approximation instead would put a
   sentence on screen that the business never wrote, which is the
   one failure this feature exists to avoid (see the note over
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

   Six of the eleven are cross-kind (A1, A2, F6, F7, F8, F9), four
   want a warning that does not prune (A2, F7, F9, F12), two are
   lookups (A3, A4), one is arithmetic (A5), and three need a
   column no table has (A6, F8, F12). The four contract changes
   that clear them are listed under CONTRACT, at the foot of the
   rule array.

   AND WHAT IS *NOT* HERE, DELIBERATELY: six candidate rules that
   the same adjudication REFUTED with a measurement. They are
   recorded in WORKBOOK_RULES_REFUTED below rather than dropped,
   because a refutation with a number on it is a finding and the
   absence of one is an invitation to guess again. They are not
   seeds and must never become seeds.
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

/** The adjudication's reference for a rule. `A*` are the six from the
 *  first pass over the Boat Module; `F*` continue the numbering used by
 *  docs/specs/FITMENT_RULES.md §4, where F1–F5 ARE A1–A6 amended and
 *  F6–F12 are the rules it added. F10 and F11 are refutations, not
 *  rules, and are recorded in WORKBOOK_RULES_REFUTED instead. */
export type WorkbookRuleRef =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F12'

/**
 * WHAT THIS RULE RESTS ON — and it changes what may be done with it.
 *
 * 'asserted' the workbook STATES it: a formula, a validation list, a
 *            header limit, a Min/Max pair, a cross-sheet link, a
 *            banner or divider label. May be enforced.
 * 'observed' the workbook's VALUES hold it, at a rate quoted in
 *            `source` with its numerator and denominator. It may be
 *            shown and it may WARN. It may never filter, and it may
 *            never be described on screen as something the business
 *            wrote — because nobody wrote it. The way an observation
 *            graduates is that the business asserts it, not that it
 *            scores high enough.
 */
export type WorkbookEvidence = 'asserted' | 'observed'

export interface WorkbookRuleSeed {
  /** DETERMINISTIC and stable forever — re-seeding must not duplicate,
   *  so this is never `newId()`. Prefixed `wb:` so a workbook rule is
   *  distinguishable from an authored one at a glance in storage. */
  id: string
  /** the adjudication's reference for this rule */
  ref: WorkbookRuleRef
  /** ASSERTED or OBSERVED — see WorkbookEvidence. An 'observed' seed
   *  may never be built with a kind that prunes. */
  evidence: WorkbookEvidence
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

  /** THE SAME REASON, FOR A PERSON. `blocked` is written for whoever
   *  will implement the missing piece — it names `state.tablesFor` and
   *  `describe.literalOf`, which is right for that reader and useless
   *  to a sales manager. This is one line they can act on. Required
   *  wherever `blocked` is set: a rule that is read out of the
   *  workbook, shown on screen, and then unexplained is worse than one
   *  that was never shown. */
  plainly?: string

  /** Where this rule IS enforced, if not here. Two of the six are
   *  already running as flow rules — leaving them looking unenforced
   *  would be a second lie on top of the first. */
  enforcedIn?: string
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
   THE ELEVEN ADMITTED RULES

   Ordered as a person reads them, not as they were adjudicated:
   the motor envelope (A1, A2, F6, F7), then the propeller chain
   it drags behind it (A3, A4), then the trailer (F8, F9), then
   pre-delivery (F12), then the housekeeping (A5, A6).
   ============================================================ */

export const WORKBOOK_RULES: WorkbookRuleSeed[] = [
  /* ----------------------------------------------------------
     A1 · MAX HP IS A HARD CEILING ON THE MOTOR
          — AMENDED by FITMENT_RULES.md F1: hard on slots 1–2,
            advisory beyond.

     EVIDENCE (asserted): `Boat Module` header text — KW1 = 'Max HP',
     and it is 'Max HP' in all nine band header rows (KW1, KW3, KW143,
     KW200, KW226, KW233, KW248, KW262, KW278), paired with KV =
     'Min HP'. A Min/Max column pair whose header states a limit.
     Populated on 2068 of 2071 KW cells; blank only at KW950, KW952,
     KW1077. Verification: 1974 testable KZ cells, 0 above max; 1723
     testable LF cells, 0 above max.

     THE AMENDMENT, and why the statement above now says "standard or
     first alternative". A1's original verification tested KZ (slot 1)
     and LF (slot 2) only. Re-measured across all THIRTEEN motor slots
     on the 812 live rows (FITMENT_RULES.md F1):

       slots 1–2   0 of 1,424 above Max HP   (0.00 %)
       slots 3–13  22 of 2,026 above Max HP  (1.09 %)
       all slots   22 of 3,450               (0.64 %)

     The 22 are not errors. Every one offers the next Yamaha model step
     above the plate in an OPTIONAL slot — 50→60, 140→150, 225→250,
     425→450. Named: Boat Module!R454 Highfield CL400, plate 50 HP,
     slot 3 = F60LC; R115 Stacer 589 Sea Ranger SDF, plate 140 HP,
     slots 4–7 all F150*; R970 Formosa SRT 675, plate 225 HP, slots
     8–10 all F250*. Enforcing the ceiling across all thirteen deletes
     22 offers the dealer makes on purpose — which is A2's failure
     wearing the other sign, and it does not get made twice.

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
    evidence: 'asserted',
    statement:
      "A motor whose horsepower exceeds the boat row's Max HP must be rejected as the standard or first alternative fit, and flagged in the later option slots.",
    because: "the boat's rated maximum horsepower is the ceiling stated on its own spec row",
    source: `${WORKBOOK} · Boat Module!KV:KW · Min HP / Max HP column pair, 'Max HP' in all nine band header rows · ASSERTED · 0 of 1,424 live slot-1/slot-2 motors exceed it; 22 of 2,026 in slots 3–13 (1.09 %) do, every one the next model step up, offered on purpose`,
    kind: 'implies',
    priority: 100,
    needs: ['boat::max hp', 'motor::hp rating'],
    plainly:
      'It compares a column on the boat with a column on the motor. A sentence here can only talk about one kind of table at a time.',
    enforcedIn: 'Work out what fits what · Motor fitment',
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
      'and the motor of one pairing, plus a sentence token that renders a column on the right. ' +
      'SECOND BLOCKER, NEW: neither side compares as a number today. Motor Library!E is seeded ' +
      "as TEXT on every motor table (it holds '2 x 225' on twin-rig rows), and boat::max hp is " +
      'one concept spanning two FieldTypes — number on Stacer, Stabicraft, Haines, Highfield ' +
      'and Formosa, TEXT on Surtees and Jeanneau, whose plates read like "350 / 2 x 200 HP". ' +
      'buildConcepts takes the type of whichever table sorts first, so the control the sentence ' +
      'offers depends on table ordering. Max HP must be decomposed at import into maxHpTotal + ' +
      'maxRigCount + maxHpPerEngine before "at most" means anything (FITMENT_RULES.md F1). ' +
      'THIRD: the amendment is per-SLOT, and a ConstraintDef has no way to say "slots 1–2 only" ' +
      '— the slot is PAIR_ORDER_FIELD on the join row, which buildConcepts skips by design.',
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

     RE-MEASURED on the live cut alone (FITMENT_RULES.md F2): 72 of 757
     slot-1 motors (9.51 %) fall below their row's KV; slot 2 adds 28,
     slot 3 adds 11, slots 4–7 add 7 — 118 live breaches, 69.5 % of
     them in slots 1–2. A2's recorded 11 % is the all-rows slot-1
     figure. Both support the same admission.

     AND THE MECHANISM, which A2 did not have. Slot 1 is the row's
     LOWEST-HP motor on 718 of 719 live rows (99.9 %). The floor breaks
     BECAUSE slot 1 is chosen as the cheapest way onto the water, not
     despite it. Worked: Boat Module!R554, 'Highfield - Coaster 540
     open (PVC) LG-W-DG', KV 115 HP, KW 115 HP, slots 1–2 both F90XB
     at 90 HP. So the breach is a price decision, and a rule that
     removed it would be removing the dealer's entry offer.
     ---------------------------------------------------------- */
  {
    id: 'wb:boat-min-hp-floor',
    ref: 'A2',
    evidence: 'asserted',
    statement:
      "A motor whose horsepower is below the boat row's Min HP must be flagged, not blocked.",
    because: "the boat's spec row states a minimum rated horsepower",
    source: `${WORKBOOK} · Boat Module!KV:KW · Min HP / Max HP column pair, 'Min HP' in all nine band header rows · ASSERTED · and the dealer breaks it on purpose: 72 of 757 live standard-fit motors (9.51 %) sit below the plate, because slot 1 is the row's lowest-HP motor on 99.9 % of rows`,
    kind: 'implies',
    priority: 50,
    needs: ['boat::min hp', 'motor::hp rating'],
    plainly:
      'Same reason — boat against motor — and it must warn rather than block, which a sentence cannot yet do. Nearly one standard-fit motor in ten is below the plate on purpose, because it is the cheapest way onto the water.',
    enforcedIn: 'Work out what fits what · Motor fitment',
    blocked:
      'NO ADVISORY KIND, and cross-kind besides. The admission is conditional on this rule ' +
      'never filtering, and every ConstraintKind the contract has — implies, requires, ' +
      'excludes, table — REMOVES values in lib/configure/solve.prune. Seeding it as implies ' +
      "would reject 221 of the workbook's own recommended motors (72 of 757 on the live cut), " +
      'which is the exact failure the adjudication forbade. NEEDS: a non-blocking kind (or a ' +
      'severity on ConstraintDef) that records a warning without pruning a domain — plus ' +
      'everything A1 needs. This missing severity is the single most reused blocker in the ' +
      'file: A2, F7, F9 and F12 all wait on it.',
  },

  /* ----------------------------------------------------------
     F6 · SHAFT LENGTH MUST MATCH THE TRANSOM

     THE CLEANEST CROSS-KIND RULE IN THE WORKBOOK, and it is not
     expressed anywhere. Breach rate 0.08 %, against Max HP's 0.64 %.

     EVIDENCE (asserted, both sides): `Boat Module!KX` headed
     'Shaft Lgth' in all nine band header rows, and Motor Module (1)
     .xlsx · `Motor Library!F` headed 'Shaft Length'. The two
     vocabularies reconcile through a six-entry fold:

       S = SS = 15"     L = LS = 20"     XL = 25"     UL = XXL = 30"

     established twice. INSIDE the Motor Library: the letter after the
     digits in the Yamaha model code (F90**X**B) agrees with column F
     on 234 of 234 rows, zero exceptions. ACROSS the join: 3,902 of
     3,905 live loose-motor cells agree = 99.92 %.

     THE THREE MISSES ARE NAMED, which is why they are misses and not
     a rate: Boat Module!KZ115 reads 'Yamaha - F115LB' where F115XB
     was meant; LF137 and LF138 read 'F115XB2' where F115LB2 was meant.
     Three single-letter typos in 3,905 cells.

     SPELLING IS PER BRAND AND MEANS THE SAME THING. Highfield writes
     S/L/XL and never LS/SS (588 live rows: XL 207, S 204, L 146,
     LS 0, SS 0); every other brand writes LS/SS and never plain L/S
     (Stacer's 91 live rows: LS 64, XL 19, SS 8, L 0, S 0). Folding
     them is required, not optional.

     SCOPE, written into the admission: it excludes FACTORY BOAT+ENGINE
     PACKAGES. 52 of the 55 live misses are packages — 'SIG 620BRX w
     Yamaha - F200XSA2 (White)' ×11, 'SIG 543SF CC w Yamaha - F150XSA2
     (White)' ×9 — where the boat row says LS (20") and the bundled
     motor is a 25" X-shaft. Those rows ARE in the Motor Library, so
     "not in the library" is the WRONG exclusion; the right one is
     "the value is a bundle, not a motor", and this project already
     draws that line structurally (see the blocker).
     ---------------------------------------------------------- */
  {
    id: 'wb:pairing-shaft-length-matches-transom',
    ref: 'F6',
    evidence: 'asserted',
    statement:
      "A motor whose shaft length is not the length the boat's transom is cut for must be rejected.",
    because: "the transom is cut for one shaft length and the leg has to reach the water at it",
    source: `${WORKBOOK} · Boat Module!KX 'Shaft Lgth' × Motor Module (1).xlsx · Motor Library!F 'Shaft Length' · ASSERTED headers both sides; the six-entry fold S=SS=15" L=LS=20" XL=25" UL=XXL=30" verified 234/234 inside the Motor Library against the Yamaha model-code letter · 3,902 of 3,905 live loose-motor cells agree (99.92 %); the 3 misses are single-letter typos at Boat Module!KZ115, LF137, LF138`,
    kind: 'implies',
    priority: 90,
    needs: ['boat::shaft lgth', 'motor::shaft length in'],
    plainly:
      "It compares the boat's transom against the motor's leg — two different tables — and the two spell the same length differently: Highfield writes L where Stacer writes LS, and both mean twenty inches.",
    blocked:
      'CROSS-KIND, plus TWO SPELLING PROBLEMS. The cross-kind wall is exactly A1\'s and is not ' +
      'repeated here. SECOND BLOCKER: the two sides do not compare as written. Boat Module!KX ' +
      "is TEXT carrying 'S' / 'L' / 'XL' / 'UL' / 'SS' / 'LS' / 'XXL'; Motor Library!F is " +
      'inches. The six-entry fold is verified 234/234 inside the Motor Library, but nothing in ' +
      'this app applies it — there is no normalised shaft column on any boat table. THIRD ' +
      'BLOCKER: the MOTOR side is two concepts, not one. Yamaha Outboards carries ' +
      "'Shaft Length in' as a NUMBER and ePropulsion Outboards carries 'Shaft Length' as TEXT; " +
      'columns.ts keys a concept as kind + normalised NAME, so those are two separate concepts ' +
      'and state.tablesFor — which keeps only tables carrying EVERY concept named — would let a ' +
      'rule naming either reach exactly one motor table. NEEDS: everything A1 needs, plus KX ' +
      'folded to inches at import (or a normalised numeric column seeded beside it), plus one ' +
      'spelling of the motor column across the motor tables. NOTE, in this rule\'s favour: the ' +
      'factory boat+engine packages that cause 52 of the 55 misses are ALREADY excluded ' +
      'structurally here — the seed puts them in Haines Signature Factory Packages and Jeanneau ' +
      "Factory Packages, which are kind 'package', not kind 'motor', so a motor-kind rule never " +
      'sees them. That separation must not be undone.',
  },

  /* ----------------------------------------------------------
     F7 · A REMOTE BOAT NEVER TAKES A TILLER MOTOR

     OBSERVED — and it is labelled that way on the card, in `source`,
     and here, because the sheet states no such rule. It is admitted
     as a WARNING and may never filter.

     EVIDENCE: `Boat Module!KY` headed 'Eng Configuration' (asserted
     header), populated on 2,004 of 2,005 rows, exactly TWO values —
     Remote 1,424 / Tiller 579. Cross-tabbed against Motor Module (1)
     .xlsx · `Motor Library!J` 'Control' over every resolved assigned
     motor cell:

       Remote boat × tiller-handle motor    0 of 7,830
       Remote boat × manual-start motor     0 of 7,830
       Remote boat × manual-tilt motor      0 of 7,830
       Tiller boat × remote motor         106 of 1,206  (8.8 %)

     THE ASYMMETRY IS THE FINDING and must not be flattened. A tiller
     boat can be up-specced to a remote helm and 8.8 % of them are. A
     remote boat is never down-specced to a tiller. Writing this as an
     equality would reject 106 pairings the workbook itself lists.

     KNOCK-ON, recorded because it changes the configurator: Motor
     Library!K 'Starting' and L 'Tilt & Trim' have NO counterpart
     column anywhere on the boat row and are fully determined by the
     motor. Control, Starting and Tilt & Trim are not choices to
     offer. The only choice the boat makes is tiller versus remote.
     ---------------------------------------------------------- */
  {
    id: 'wb:pairing-remote-boat-excludes-tiller-motor',
    ref: 'F7',
    evidence: 'observed',
    statement:
      'A boat set up for a remote helm must not be offered a tiller-handle motor.',
    because: 'the hull is set up for a remote helm, and a tiller motor is steered from the engine',
    source: `${WORKBOOK} · Boat Module!KY 'Eng Configuration' (asserted header; 2,004 of 2,005 rows, exactly two values — Remote 1,424 / Tiller 579) × Motor Module (1).xlsx · Motor Library!J 'Control' · OBSERVED, not asserted: 0 of 7,830 remote-boat cells name a tiller, manual-start or manual-tilt motor. It does NOT run the other way — 106 of 1,206 tiller-boat cells (8.8 %) name a remote motor.`,
    kind: 'excludes',
    priority: 40,
    needs: ['boat::eng configuration', 'motor::control'],
    plainly:
      'It compares a column on the boat with a column on the motor, and it should warn rather than block — neither of which a sentence can do yet. It also runs only one way: a tiller boat CAN take a remote motor, and 8.8 % of them do.',
    blocked:
      'CROSS-KIND, plus NO ADVISORY SEVERITY, plus OBSERVED. The cross-kind wall is A1\'s. The ' +
      "severity is A2's: this is a pattern in 7,830 values and not a rule the business wrote, " +
      'so it may warn and may never prune, and every ConstraintKind prunes. The KIND is right ' +
      "as written, and that is worth stating so nobody 'fixes' it: kind:'excludes' names two " +
      'VALUES — Remote on the boat, Tiller on the motor — and forbids only that pair. It does ' +
      'not forbid the mirror, which is why the 106 tiller-boat/remote-motor pairings survive ' +
      "it. Rewriting it as an equality between the two COLUMNS ('Control must equal Eng " +
      "Configuration') would reject all 106 and would be a different, false rule. NEEDS: " +
      "everything A1 needs, plus A2's non-blocking severity. Both columns exist and are " +
      "seeded — boat::eng configuration on all seven boat tables, motor::control on Yamaha " +
      'Outboards — so this rule is waiting on the contract alone, not on an import.',
  },

  /* ----------------------------------------------------------
     A3 · THE PROPELLER COMES FROM THE MOTOR
          — AMENDED by FITMENT_RULES.md F3/R7. The statement as
            first written ("must be the motor's DEFAULT") is FALSE
            on 16.2 % of live cells and must never be enforced.

     EVIDENCE (asserted): formula, 1201 cells in LC alone —
       LC5 = VLOOKUP(KZ5,'[4]Motor Library'!$C:$ZZ,200,0)
     repeated identically for all 13 motor slots. The index was
     resolved against the cached external link: xl/externalLinks/
     externalLink4.xml, sheetId 0 = 'Motor Library', row 4 →
     C4 = 'MODEL', GT4 = 'Prop Option - Default', and
     col(GT) - col(C) + 1 = 200.

     THE AMENDMENT. The formula is real and asserted; what it asserts
     is a DEFAULT, and the business overtypes it. Measured on the
     values rather than the formulas, over 4,017 live pairings:

       prop EQUALS the motor's GT default        3,367 = 83.82 %
       prop IS IN the motor's GT:KO option list  3,890 = 96.84 %

     75 of the 262 motors in live use carry more than one prop across
     their assignments; 'Yamaha - F225XCB' appears against six.

     So the rule is a DOMAIN WITH A DEFAULT, not a derivation: the
     prop must be one of the motor's prop options, and GT is the one
     pre-selected. That is 96.84 %, it is the shape the configurator
     wants, and importing Motor Library!GT:KO ('Prop Option - Default'
     … 'Prop Option -100') clears the second blocker below in the same
     pass. The override rate — 8.3 % on Prop Description, 6.8 % on
     Prop Part No. — is the instruction: derive it, show it, let it be
     changed.
     ---------------------------------------------------------- */
  {
    id: 'wb:pairing-prop-from-motor',
    ref: 'A3',
    evidence: 'asserted',
    statement:
      "A pairing's Prop Description must be one of the motor's propeller options from the Motor Library, and the motor's default is the one pre-selected.",
    because: 'the motor library lists the propellers that motor is offered with, and names one as its default',
    source: `${WORKBOOK} · Boat Module!LC (and the 12 sibling slots) · =VLOOKUP(KZ,'Motor Library'!C:ZZ,200,0) → Motor Library!GT 'Prop Option - Default' · ASSERTED lookup · on the values: the prop is IN the motor's GT:KO option list on 3,890 of 4,017 live pairings (96.84 %) but EQUALS the default on only 3,367 (83.82 %), so the default is a pre-selection and not an obligation`,
    kind: 'implies',
    needs: ['custom::prop description'],
    plainly:
      "It reads a list off a third row — the motor's entry in the Motor Library. A sentence compares what is in front of it. And it can only ever suggest: the business picks a different propeller on one pairing in six.",
    blocked:
      'A DERIVATION, NOT A COMPARISON. The obligation reads a column on a THIRD row — the ' +
      "Motor Library row for the motor on this pairing. ValueExpr has no lookup, and FieldPath's " +
      'one viaFieldId hop is dropped by both evaluators (configure/evaluate.clauseFieldId ' +
      'returns undefined for a hop; constraints/state.clauseHolds ignores it outright). ' +
      'SECOND BLOCKER: the target columns are not seeded. Motor Library!GT:KO — 100 columns, ' +
      "'Prop Option - Default' through 'Prop Option -100' — are absent from src/demos/" +
      "northside.ts; the motor tables carry Motor Library!O 'Prop', which is a different " +
      'column. NEEDS: an evaluated relationship hop, and GT:KO seeded on the motor tables as ' +
      'the option list with GT as the default. THIRD, AND IT IS A WARNING NOT A GAP: whoever ' +
      'unblocks this must implement the AMENDED statement — membership in the option list, ' +
      "96.84 % — and not the original 'must be the default', which is false on 650 of 4,017 " +
      'live pairings and would overwrite the propeller the business chose.',
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
    evidence: 'asserted',
    statement:
      "A pairing's Prop Part No. must be the Parts Module code for its Prop Description.",
    because: 'the parts module holds the code for that propeller description',
    source: `${WORKBOOK} · Boat Module!LB · =IFERROR(VLOOKUP(LC,'Parts Maintenance'!C:ZZ,3,0),) → Parts Module (3).xlsx · Parts Maintenance!E 'Code' · ASSERTED by formula on 1,236 cells; index 3 of C:ZZ verified by opening Parts Module (3).xlsx directly`,
    kind: 'table',
    needs: ['custom::prop part no.', 'custom::prop description'],
    plainly:
      'It looks a value up in another table. A sentence can compare two things; it cannot go and fetch one.',
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
     F8 · A TRAILER SERIES IS BUILT FOR ONE BOAT BRAND

     THIS IS THE RULE THE OWNER ASKED FOR — "highfield have special
     trailers or whatever" — and it is the only candidate in either
     workbook that both holds at 100 % AND actually rejects something.
     It does roughly 96 % of the selecting.

     EVIDENCE (asserted): `Trailer Module!A` carries 47 series banners.
     ELEVEN of them name a boat brand outright:
       A140 'REDCO - Highfield'                 A152 'REDCO - Formosa'
       A105 'REDCO - Stabicraft Steel Trailers' A113 '… Alloy Trailers'
       A197 'GFAB - Stabicraft Series'          A212 'GFAB - Highfield Series'
       A87  'REDCO - Surtees Trailers'          A95  '… Surtees Alloy Trailers'
       A127 'REDCO - Merry Fisher Trailers'     A133 'REDCO - Cap Camarat Trailers'
       A626 'DUNBIER / HAINES BMT TRAILERS (NB: Only available in
             Haines BMT Package)'
     and `Trailer Module!E` embeds the boat model in parentheses on
     seven rows, every one of them Highfield: TA600-MOB (SP560),
     TA600T-MOB (SP660), TA700T-EH (SP700), TA730T-EH (SP800),
     TA800T-EH (SP760), TA800T-EH1 (SP800), RS480-MO (PA460).

     VERIFIED: 581 of 581 testable live pairings, ZERO counter-
     examples, with per-brand 100 % for Stacer (142/142), Stabicraft
     (121/121), Surtees (29/29), Highfield (197/197) and Formosa
     (92/92). Independently 615/615 on a wider cut.

     AND IT DISCRIMINATES, which is the whole point and what separates
     it from F9: it leaves 0.92 %–7.83 % of the 434 live trailers
     standing — for Highfield, 12 of 434 = 2.76 %; Stacer 34 = 7.83 %.
     A gate that leaves 97.7 % of a catalogue (F9) has not chosen a
     trailer. A gate that leaves 3 % has.

     THE CORRECTION WORTH STATING, because the owner asked in these
     words: "Highfield have special trailers" is true and asserted —
     but BESPOKE IS THE NORM, NOT THE HIGHFIELD EXCEPTION. 74 of 152
     live boat models (48.7 %) get a model-designated trailer, and
     100 % of Stabicraft, Haines, Merry Fisher and Cap Camarat models
     do. STACER IS THE ONE BRAND THAT IS BAND-DRIVEN: 0 of 148 Stacer
     trailer names mention Stacer; they are picked against ATM and a
     size band. And the Highfield cradle is named for a SIZE, not a
     model — SP600 (6.52 m) takes the 660 cradle, SP900 (9.12 m)
     reuses the 800 because the ladder runs out at eight cradles.
     ---------------------------------------------------------- */
  {
    id: 'wb:pairing-trailer-series-matches-boat-brand',
    ref: 'F8',
    evidence: 'asserted',
    statement:
      "A boat may only be offered a trailer from a series built for that boat's brand.",
    because: 'the trailer series is built for that boat brand and its cradle is cut to that hull',
    source: `${WORKBOOK} · Boat Module!NZ 'Std Trailer' / OA..OI 'Trailer - Option 2..10' × Trailer Module.xlsx · Trailer Module!A · eleven series banners naming a boat brand (A87, A95, A105, A113, A127, A133, A140, A152, A197, A212, A626) and seven Trailer Module!E codes embedding the Highfield model in parentheses · ASSERTED · 581 of 581 testable live pairings, 0 counter-examples; it leaves 0.92–7.83 % of the 434 live trailers standing (Highfield 12 of 434 = 2.76 %)`,
    kind: 'implies',
    priority: 100,
    needs: ['boat::brand', 'trailer::series brand'],
    plainly:
      'This is the rule that actually picks a trailer, and we cannot write it. The boat brand is the NAME OF ITS TABLE rather than a column on it, and the trailer brand is buried inside a series heading. Two columns have to be created before this can be said at all.',
    blocked:
      'NEITHER SIDE HAS A COLUMN — a harder blocker than A1, which at least has both. LEFT ' +
      'SIDE: the boat brand is the table IDENTITY. ONE TABLE PER BRAND is the substrate ' +
      'decision, and src/demos/northside.ts states it in its own header ("Brand is therefore ' +
      'NOT a hierarchy level — the table IS the brand"), so buildConcepts never produces ' +
      'boat::brand and no clause can name it. RIGHT SIDE: half present. Every trailer table ' +
      "carries a 'Series' TEXT column, but it holds the banner VERBATIM — 'REDCO - Highfield', " +
      "'GFAB - Stabicraft Series', 'DUNBIER / HAINES BMT TRAILERS (NB: Only available in " +
      "Haines BMT Package)' — so the boat brand is a substring sharing the cell with the " +
      'trailer maker, and testing it means parsing a heading rather than comparing a value. ' +
      'NEEDS, in this order: (1) a Brand column written on every boat table and a Series Brand ' +
      'column derived from the banner on every trailer table at import (FITMENT_RULES.md ' +
      '§6.4) — 135 of 476 trailer rows name a brand in their banner; (2) everything A1 needs, ' +
      'because even with both columns it is still boat-against-trailer. UNTIL THEN THE APP ' +
      'CHECKS NOTHING THAT ACTUALLY PICKS A TRAILER: the ATM floor (F9) passes 97.7 % of the ' +
      'catalogue, and this is the 3 % gate.',
  },

  /* ----------------------------------------------------------
     F9 · A TRAILER MUST BE RATED TO CARRY THE BOAT
          — a floor that WARNS. Never a selector.

     EVIDENCE (asserted): `Trailer Module!K` headed 'ATM (KG)',
     numeric on 459 of 463 cells, against the boat band's own weight
     column. 530 of 530 live pairings hold = 100.00 %; independently
     219 of 219 on slot-1 pairings across five bands using five
     different boat-side weight columns.

     BUT IT SELECTS ALMOST NOTHING, which is why it is admitted as a
     floor and rejected as the trailer rule: a mean 97.70 % of the
     live catalogue also passes it (median 100.00 %, min 48.33 %, over
     1,696 boats). F8 is the rule that chooses; this one catches a
     mistake.

     THE TRAP, recorded so nobody falls in it. Comparing ATM against a
     FIXED COLUMN LETTER also scores 100 % — but only because in the
     Highfield band Q is 'Max People' (12) and in Merry Fisher P is
     'Water Capacity' (50 ltr). The boat-side weight column is a
     DIFFERENT COLUMN IN EVERY BAND:

       Stacer      Q  'BMT Weight (Dry)'
       Stabicraft  Q  'Tow Weight @ (Dry)'
       Surtees     M  'App. Tow Weight'
       Highfield   S  'Boat Weight'   (P here is Max Load, a PAYLOAD)
       Formosa     P  'Hull Weight (Dry)'
       Jeanneau · Merry Fisher · Cap Camarat · Haines — no weight-
       headed column in the band AT ALL.

     AND THE LIVE RULE THIS OVERTURNS. src/demos/northside.ts seeds
     'Trailer fitment — Highfield' as Trailer!K ATM >= Highfield!P
     Max Load. Re-measured: 190/190 = 100 % on the real pairings, and
     it leaves 94.31 % of the NSM Custom table standing (median
     97.26 %). It is never violated and it selects almost nothing —
     and Max Load is an AFLOAT PAYLOAD, not towed mass. Its own
     description already admits the test is wrong. Keep it as a floor
     if you like; it is not the trailer rule. F8 is.
     ---------------------------------------------------------- */
  {
    id: 'wb:pairing-trailer-atm-carries-boat',
    ref: 'F9',
    evidence: 'asserted',
    statement:
      "A trailer whose rated ATM is below the boat's weight must be flagged, not blocked.",
    because: 'the trailer has to be rated to carry the boat that sits on it',
    source: `${WORKBOOK} · the boat band's own weight column — Stacer Q 'BMT Weight (Dry)', Stabicraft Q 'Tow Weight @ (Dry)', Surtees M 'App. Tow Weight', Highfield S 'Boat Weight', Formosa P 'Hull Weight (Dry)' — × Trailer Module.xlsx · Trailer Module!K 'ATM (KG)' (numeric on 459 of 463 rows) · ASSERTED headers · 530 of 530 live pairings hold (100.00 %), but so does a mean 97.70 % of the live catalogue, so it is a floor and not a selector`,
    kind: 'implies',
    priority: 30,
    needs: ['trailer::atm (kg)', 'boat::boat weight'],
    plainly:
      'Every brand writes the boat\'s weight under a different heading — "BMT Weight", "Tow Weight", "App. Tow Weight", "Boat Weight", "Hull Weight" — so this is five rules rather than one, and two of our seven boat tables have no weight column at all and can never be checked.',
    blocked:
      'FIVE COLUMNS WHERE A SENTENCE NEEDS ONE — and cross-kind besides. columns.ts keys a ' +
      'concept as kind + normalised NAME, so the boat-side weight is FIVE separate concepts in ' +
      "this project: Stacer 'BMT Weight (Dry) kg' (Q), Stabicraft 'Tow Weight @ (Dry) kg' (Q), " +
      "Surtees 'App. Tow Weight kg' (M), Highfield 'Boat Weight kg' (S), Formosa 'Hull Weight " +
      "(Dry) kg' (P). state.tablesFor keeps only tables carrying EVERY concept named, so each " +
      'spelling reaches exactly ONE boat table and there is no sentence that reaches all five. ' +
      'SECOND: Jeanneau and Haines Signature carry NO weight column — the band does not have ' +
      'one — so two of the seven boat tables are not merely unscoped but UNTESTABLE, and ' +
      'whatever surface runs this must be able to report "not evaluable here" rather than ' +
      'silently passing. THIRD: it must WARN and not filter (the A2 severity), because a floor ' +
      'that passes 97.7 % of the catalogue is a safety check and not a menu. NEEDS: everything ' +
      "A1 needs, plus A2's non-blocking severity, plus either one normalised Boat Weight " +
      'concept across the boat tables or a per-brand rule and a block that can say it did not ' +
      'run. DO NOT "FIX" THIS BY COMPARING A FIXED COLUMN LETTER: that scores 100 % too, ' +
      "because Highfield's P is Max Load and Merry Fisher's P is Water Capacity.",
  },

  /* ----------------------------------------------------------
     F12 · A TILLER BOAT NEVER GETS A DUAL-BATTERY PD KIT

     OBSERVED. The workbook states no such rule; this is a pattern in
     1,196 values with no counter-example. Admitted as a WARNING.

     EVIDENCE: `Boat Module!KY` 'Eng Configuration' cross-tabbed
     against the ten P/D lines `Boat Module!JT..KC`. Every multi-
     battery and multi-terminal pre-delivery line, without exception,
     lands on a Remote boat:

       Battery Terminals (2 pairs)     576 / 576  Remote
       Battery Terminals (3 pairs)       2 / 2
       2 x MFM70 Batteries             512 / 512
       2 x MFM50                        60 / 60
       2 x MRV87                        34 / 34
       3 x MRV87                         5 / 5
       Batteries (Qty 2) - MF31-931      7 / 7
       ─────────────────────────────  1,196 / 1,196 Remote, 0 Tiller

     THE CONTROL, which is what makes this an observation about
     BATTERIES and not about the P/D block in general: 'Battery
     Terminals (1 pair)' splits 762 Remote / 289 Tiller.

     AND A CORRECTION TO THE SPECIFICATION, which matters more than
     the rule. FITMENT_RULES.md §5.8 lists F12 as "the only new rule
     expressible on the sentence surface — single-kind, both columns
     on the boat". That is true OF THE WORKBOOK and false OF THIS
     APP, and the reason is the specification's own §5.4: JT..KC was
     correctly modelled as SIX JOIN TABLES, not as columns. So the
     part now sits on a join row as a reference into Parts &
     Accessories, which is kind 'accessory'. F12 is cross-kind here.
     See the blocker. Nothing is wrong with the seed; the sentence
     surface simply does not reach across the join it created.
     ---------------------------------------------------------- */
  {
    id: 'wb:boat-tiller-excludes-dual-battery-pd',
    ref: 'F12',
    evidence: 'observed',
    statement:
      'A tiller-steered boat must not be given a two-battery pre-delivery kit.',
    because: 'a twin-battery install belongs to a remote helm, and a tiller boat has no second circuit to feed',
    source: `${WORKBOOK} · Boat Module!KY 'Eng Configuration' × Boat Module!JT..KC 'P/D - Parts & Accessories - 01..10' · OBSERVED, not asserted: 1,196 multi-battery cells, 1,196 on Remote boats and 0 on Tiller — Battery Terminals (2 pairs) 576/576, (3 pairs) 2/2, 2 x MFM70 Batteries 512/512, 2 x MFM50 60/60, 2 x MRV87 34/34, 3 x MRV87 5/5, Batteries (Qty 2) - MF31-931 7/7. The control: 'Battery Terminals (1 pair)' splits 762 Remote / 289 Tiller.`,
    kind: 'excludes',
    priority: 20,
    needs: ['boat::eng configuration', 'accessory::parts & accessories'],
    plainly:
      'In the price file both halves of this sit on the boat row, so it looked like the one rule we could write. Here the parts list is its own table, so it became a comparison across two tables again — and being a pattern rather than a stated rule, it should warn rather than block.',
    blocked:
      'NOT SINGLE-KIND HERE, AND NO ADVISORY SEVERITY. FITMENT_RULES.md §5.8 lists this as the ' +
      'one new rule expressible on the sentence surface, because in the WORKBOOK both columns ' +
      'sit on the boat row — KY and JT..KC. IN THIS PROJECT THEY DO NOT, and correctly so: the ' +
      'same specification (§5.4) modelled JT..KC as six join tables (Highfield × P/D Parts and ' +
      "five siblings), so the part is a `reference` on a join row pointing at Parts & " +
      "Accessories, kind 'accessory'. Two things follow. (1) columns.ts RULEABLE excludes " +
      "'reference', and buildConcepts skips PAIR fields outright, so the part is not a concept " +
      'at all and no sentence can name it. (2) Even seeded as text it would be an ' +
      'accessory-kind column against a boat-kind one — the A1 wall, again. THIRD: it is ' +
      'OBSERVED. The business never wrote it, so it may warn and may never prune, and every ' +
      "ConstraintKind prunes. NEEDS: A2's non-blocking severity, and a rule that can be scoped " +
      'to a JOIN ROW — reading the boat on one side and the part on the other — which is the ' +
      'same pair-scoped FieldPath A1 needs, pointed at a different pair. OR: take the ' +
      'observation to the business and have them ASSERT it, at which point it stops being an ' +
      'observation and the severity question goes away.',
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
    /* a formula states it: =100%-SUM(QD:QG) on 378 master cells */
    evidence: 'asserted',
    statement: 'The five deposit stages on a boat row must add up to 100 %.',
    because: 'the payment stages have to add up to the whole price',
    source: `${WORKBOOK} · Boat Module!QD:QH · =100%-SUM(QD:QG) on 378 master cells · ASSERTED by formula; of the 2,005 rows where all five stages are numeric, rows summing to anything but exactly 1.0: 0`,
    kind: 'implies',
    needs: ['boat::on handover'],
    plainly:
      'It adds five columns together. A sentence compares one column to one value.',
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
    /* the sheet's own divider label says it, in words, in a cell */
    evidence: 'asserted',
    statement: 'A boat whose source row is below the OBSOLETE divider must not be offered.',
    because: 'the sheet lists these models under its obsolete-models divider',
    source: `${WORKBOOK} · Boat Module!A1005 'OBSOLETE' / C1005 'OBSOLETE MODELS (Models that ar No Longer Available)' · ASSERTED by the divider label itself, the last of the nine entries in column A · it cuts the boat universe from 2,005 rows to 812. AND IT HAS A TWIN: Trailer Module.xlsx · Trailer Module!A656 'OBSOLETE' / C656 'OBSOLETE TRAILERS - Trailers No Longer Available', which 30 of 674 live trailer pairings (4.5 %) point below — all 30 Surtees, 8 of them in the Std Trailer slot`,
    kind: 'implies',
    needs: ['boat::source'],
    plainly:
      'It tests where a row sat in the spreadsheet, and no column carries that position.',
    blocked:
      'NO COLUMN TO TEST. The rule is a row-number threshold; the boat tables carry Source as ' +
      "TEXT ('Boat Module!R956') and CompareOp has no numeric extraction from text — " +
      "startsWith/contains cannot express \"> 1005\". SECOND BLOCKER: nothing to exclude. " +
      'src/demos/northside.ts seeds Boat Module rows 4–1004 only, so no obsolete row is in the ' +
      "model (the string 'OBSOLETE' does not occur in it). NEEDS: the divider read at import " +
      "into a seeded flag column (a boolean 'Obsolete'), which is the honest shape anyway — a " +
      'rule should test a fact about the boat, not the address it was read from. Also note the ' +
      'obsolete region duplicates live models (row 1015 = row 115 Stacer 589; rows 1534–1548 = ' +
      'rows 829–844 Highfield SP560), so the importer must dedupe on D Model Code. AND THE ' +
      "TWIN NEEDS THE SAME COLUMN: Trailer Module!A656 is the identical mechanism, and it " +
      'earns its keep immediately — 30 of 674 live trailer pairings point below it, every one ' +
      'of them Surtees, 8 of those in the Std Trailer slot. A live boat offering a ' +
      'discontinued trailer as its standard is a thing the owner should be shown, which means ' +
      'those pairs must be imported and marked, not dropped.',
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
   CONTRACT — the four changes that clear all eleven

   Ordered by how many admitted rules each one unblocks, so the
   list doubles as a work order. Nothing here is a guess: each is
   named on the seeds it releases, and every seed above names the
   ones it is waiting for.

   1 · A PAIR-SCOPED FieldPath (a RowScope, which ViewColumn
       already carries) so a rule can name the boat AND the motor
       — or the boat and the trailer — of ONE pairing, plus a
       sentence token that renders a COLUMN on the right-hand
       side.                        unblocks A1 A2 F6 F7 F8 F9 (6)
       The stored shape is already there: ValueExpr has
       { kind: 'field' } and solve.enforceClause narrows both
       columns from it. The gap is describe.literalOf, which
       returns null for a field right-hand side and would print an
       unfinished sentence on the card.

   2 · A NON-BLOCKING SEVERITY on ConstraintDef (or a fifth
       ConstraintKind) that records a warning without pruning a
       domain.                          unblocks A2 F7 F9 F12 (4)
       Every kind the contract has — implies, requires, excludes,
       table — removes values in solve.prune. Four of the eleven
       rules are admitted ON CONDITION they never filter, and two
       of those four (F7, F12) are OBSERVED rather than asserted,
       where filtering would be a straightforward falsehood.

   3 · AN EVALUATED RELATIONSHIP HOP. FieldPath.viaFieldId exists
       and is DROPPED by both evaluators today — evaluate.
       clauseFieldId returns undefined for a hop, state.clauseHolds
       ignores it outright.                     unblocks A3 A4 (2)

   4 · A FORMULA RIGHT-HAND SIDE THE SOLVER EVALUATES.
       { kind: 'formula' } returns 'M' today.      unblocks A5 (1)

   AND FIVE IMPORT-SIDE COLUMNS, which are not contract changes at
   all — they are seeds, and they belong to tools/seed:
     · a boolean `Obsolete` on boats and on trailers        (A6)
     · `Brand` on every boat table and `Series Brand` on
       every trailer table                                  (F8)
     · `Shaft Lgth` folded to inches on the boat tables     (F6)
     · Motor Library!GT:KO as the motor's prop options      (A3)
     · Boat Module!QD..QH, the five deposit stages          (A5)
   ============================================================ */

/* ============================================================
   REFUTED — candidate rules that a measurement KILLED

   These are NOT seeds and must never become seeds. They are here
   because the same adjudication that admitted the eleven above
   tested these and found them false, and a refutation with a
   number on it is a finding, while the absence of one is an
   invitation to guess again. Every one of them is a rule somebody
   would plausibly write on a wet Tuesday by looking at the column
   headings — which is exactly why the numbers are recorded.

   The headline, because it is the one most likely to be
   re-derived: THERE IS NO TRAILER LENGTH RULE. Trailer Module!H
   'Boat Size (Mtr)' is not a length. Across its 456 populated
   cells there are 277 point sizes, 142 MODEL DESIGNATORS
   ('Highfield 660', 'SP600', 'Formosa 525', '2050', 'Jet Ski'),
   36 ranges and 1 pair — and 499 of the 674 live pairings (74.0 %)
   land on a trailer whose H is a model designator. The size
   reading is the minority case.
   ============================================================ */

export interface RefutedRuleRecord {
  /** FITMENT_RULES.md's reference for the refutation */
  ref: 'F10' | 'F11'
  /** the rule as somebody would write it */
  candidate: string
  /** the number that kills it — numerator, denominator, rate */
  measured: string
  /** why it fails, in the same voice the blockers use */
  verdict: string
  /** workbook · sheet · column, so the refutation can be re-checked */
  source: string
}

export const WORKBOOK_RULES_REFUTED: RefutedRuleRecord[] = [
  {
    ref: 'F10',
    candidate: "A trailer's ATM must cover the boat's weight PLUS its Max Load.",
    measured: '73 of 139 Highfield standard pairings = 52.5 %',
    verdict:
      "REFUTED. It rejects the dealer's OWN standard cradle for the PA660EW across 51 rows — " +
      '740 kg + 1,287 kg = 2,027 kg against an ATM of 1,990. Max Load is an AFLOAT PAYLOAD, ' +
      'not towed mass, so adding it to the hull weight is a category error. Seeding it would ' +
      "repeat A2's exact failure: a rule that rejects the business's own recommendation.",
    source: `${WORKBOOK} · Boat Module!P 'Max Load' (Highfield band) + S 'Boat Weight' × Trailer Module.xlsx · Trailer Module!K 'ATM (KG)'`,
  },
  {
    ref: 'F10',
    candidate: "A trailer's Between Guards must be at least the boat's beam.",
    measured: '0 of 93 = 0.0 %',
    verdict:
      'REFUTED SYSTEMATICALLY — and this is not a near miss to be tuned. Between Guards is the ' +
      'trailer FRAME (1,400–2,300 mm) and is always narrower than the hull beam ' +
      '(1,900–2,930 mm), because the hull sits over the guards rather than between them. ' +
      'Delete the idea rather than reversing the operator.',
    source: `Trailer Module.xlsx · Trailer Module!M 'Between Guards (mm)' × ${WORKBOOK} · the band's beam column`,
  },
  {
    ref: 'F10',
    candidate: "The trailer's Boat Size band must contain the boat's hull length.",
    measured: '83 of 166 = 50.0 %, and testable on only 166 of 674 pairings',
    verdict:
      'REFUTED. A coin flip dressed as a tolerance, on a quarter of the data. Widening the ' +
      'band until it passes is fitting the rule to the answer.',
    source: `Trailer Module.xlsx · Trailer Module!H 'Boat Size (Mtr)' × ${WORKBOOK} · hull length`,
  },
  {
    ref: 'F10',
    candidate: "The trailer's Boat Size must be at least the boat's hull length.",
    measured: '8 of 85 = 9.4 % on one measurement, 127 of 166 = 76.5 % on another',
    verdict:
      'REFUTED ON BOTH MEASUREMENTS. The median of (Boat Size − hull length) is −0.34 m: the ' +
      'column is a nominal size CLASS, typically a third of a metre under the hull length ' +
      'because the hull length includes bow overhang past the trailer bed. The two ' +
      'measurements disagree because the denominator does, which is itself the tell.',
    source: `Trailer Module.xlsx · Trailer Module!H 'Boat Size (Mtr)' × ${WORKBOOK} · hull length`,
  },
  {
    ref: 'F11',
    candidate:
      "Any rule at all on the trailer's Between Guards or Trailer Length dimensions.",
    measured:
      "Between Guards populated on 74 of 476 rows (15.5 %); Trailer Length on 75 (15.8 %)",
    verdict:
      'REFUTED ON COVERAGE, WHATEVER THE HIT RATE. A rule evaluable for one trailer in seven ' +
      'is not a rule. Trailer Length >= hull length scores 93/93 = 100 % — on 93 of 674 ' +
      'pairings, and near-vacuously. A gate that cannot see six trailers in seven has not ' +
      'checked them; it has passed them.',
    source: `Trailer Module.xlsx · Trailer Module!M 'Between Guards (mm)', N 'Trailer Length (Mtr)'`,
  },
  {
    ref: 'F11',
    candidate: "The motor's weight must not exceed the boat's Max Main Motor Weight.",
    measured:
      'real where testable — 49 of 49 — but populated as an actual motor weight on 10 of 2,005 boat rows, and Motor Library!FF WEIGHT on 121 of 362 models',
    verdict:
      'REFUTED AS DATA, not as physics. The column means five different things across the nine ' +
      'bands, and on the Formosa band it is Q while on Highfield Q is Max People. The envelope ' +
      'is real and the columns to test it with are empty. Do not seed it; ask for the weights.',
    source: `${WORKBOOK} · Boat Module!Q 'Max Main Motor Weight' (Formosa band) × Motor Module (1).xlsx · Motor Library!FF 'WEIGHT'`,
  },
]

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
