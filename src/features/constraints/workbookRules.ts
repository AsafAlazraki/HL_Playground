/* ============================================================
   WORKBOOK RULES — the constraints the Master Price File itself
   ASSERTS or that its values OBSERVABLY hold, seeded into the
   rule registry, and the record of the ones this app cannot yet
   say.

   PROVENANCE, NOT INVENTION
   ─────────────────────────────────────────────────────────────
   Every entry below survived adjudication against the workbooks
   in `C:/Users/AsafA/Downloads` (opened read-only) and is written
   up in `docs/specs/FITMENT_RULES.md` or, for the rigging kit,
   `docs/specs/FOUR_MODULES.md` §3 — the section written once the
   eighth workbook, `Rigging Module.xlsx`, was in hand. Each entry
   carries the cell, header, formula, banner or divider label it
   came from, quoted in the comment above it, and the `because`
   clause the adjudicator wrote.

   NOTHING HERE IS TYPED TO FILL A SCREEN. If a rule cannot be
   sourced it is not written; if it was measured and failed it goes
   to WORKBOOK_RULES_REFUTED with the number that killed it.

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
   ASSERTED. The five added next (F6–F12) come from the fitment
   adjudication; two of them — F7 and F12 — are OBSERVED, and say
   so on their card, in their `source`, and in their blocker. The
   three added last are the MOTOR AND RIGGING pass: R9 (the engine
   labour, ASSERTED by formula and overridden on 0 of 2,436 cells),
   F15 (the rigging section names the boat's brand) and F16 (a
   mechanical motor never takes a Helm Master kit, OBSERVED at
   0 of 1,576).

   The last two, S1 and S2, come from a third adjudication —
   docs/specs/SERVICE_AND_THEMES.md §5.4 — and both are `blocked` ON
   PURPOSE rather than for want of a contract. S1 (a trailer's
   registration band against its own ATM) is blocked because nine live
   rows violate it and correcting one changes a price the business is
   charging today; S2 (one registration fee, read at one column) is
   blocked because it is a divergence between two SHEETS and no clause
   tests a sheet. Both are enforced as a REPORT instead — see
   `registration.ts` and the panel it draws — which is §3.1's own
   instruction: show the nine and change none.

   THE HONEST STATE OF THIS FILE: sixteen admitted rules, and ALL
   SIXTEEN are `blocked` — not one can be stated as a
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

   Eight of the sixteen are cross-kind (A1, A2, F6, F7, F8, F9,
   F15, F16), six want a warning that does not prune (A2, F7, F9,
   F12, F15, F16), three are lookups or derivations (A3, A4, R9),
   two are arithmetic (A5, R9), and six need a column no table has
   (A6, F8, F12, F15, F16, R9). The contract changes that clear
   them are listed under CONTRACT, at the foot of the rule array —
   S1 and S2 are not among them, being held back on purpose.

   AND ONE SHAPE THE CONTRACT LIST DID NOT HAVE UNTIL THE RIGGING
   PASS: F16 compares two PARTNERS OF ONE PAIRING — the motor and
   the kit chosen beside it — which are two `reference` columns on
   the same join row. That is not A1's boat-against-motor; it is
   the join row read as a row. It is written up under CONTRACT 1b.

   AND WHAT IS *NOT* HERE, DELIBERATELY: eleven candidate rules
   that the same adjudications REFUTED with a measurement. They are
   recorded in WORKBOOK_RULES_REFUTED below rather than dropped,
   because a refutation with a number on it is a finding and the
   absence of one is an invitation to guess again. They are not
   seeds and must never become seeds. Five of the eleven are about
   the motor and the rigging kit, and two of those five are the
   ones most likely to be re-derived by a reader who has not read
   the arithmetic: that the motor names the kit (53.3 %), and that
   the join may be deduped on (boat, motor) (deletes 15.95 %).
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
 *  rules, and are recorded in WORKBOOK_RULES_REFUTED instead.
 *
 *  `R9` is a RELATIONSHIP reference — FITMENT_RULES.md §3 numbers its
 *  relationships R1–R12, and R9 is the only one of them that states an
 *  obligation rather than a shape, so it is carried here under its own
 *  number rather than given a new one.
 *
 *  `F15` and `F16` are the two rigging rules from FOUR_MODULES.md §3.3,
 *  which numbered nothing. They take the next free numbers in §4's
 *  sequence (F14 is that document's table of observations-that-are-not-
 *  rules) so that every rule in this app has ONE reference. Each says in
 *  its own `source` which document and which section it came from — the
 *  number is bookkeeping, the citation is the evidence. */
export type WorkbookRuleRef =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'R9'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F12'
  | 'F15'
  | 'F16'
  /* S1 and S2 come from a different adjudication —
     docs/specs/SERVICE_AND_THEMES.md §5.4, which specifies both and
     names widening this union as "the one contract change the rules
     side needs". They are lettered S rather than F because a
     reference that does not say which document to open is a
     reference nobody checks. */
  | 'S1'
  | 'S2'

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
   THE FOURTEEN ADMITTED RULES

   Ordered as a person reads them, not as they were adjudicated:
   the motor envelope (A1, A2, F6, F7), then the propeller chain
   it drags behind it (A3, A4), then the RIGGING KIT the motor
   drags behind it (F15, F16) and the labour those two settle
   between them (R9), then the trailer (F8, F9), then
   pre-delivery (F12), then the housekeeping (A5, A6).

   WHERE THE RIGGING KIT SITS, stated once because every rule
   below depends on it: THE KIT BELONGS TO THE (BOAT, MOTOR)
   PAIRING AND TO NEITHER SIDE ALONE (FITMENT_RULES.md R5,
   FOUR_MODULES.md §3.3). It is a column on the boat × motor
   join, never a join of its own and never a domain hanging off
   the motor — the motor predicts it on 53.3 % of real pairs, and
   the 79.4 % that once made it look like a domain was one
   sentinel matching another. That measurement is kept in
   WORKBOOK_RULES_REFUTED so it is not made again.
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
     F15 · A RIGGING KIT COMES FROM A SECTION BUILT FOR THE
           BOAT'S BRAND — the trailer rule (F8) again, on the
           other partner, and it reaches one pairing in seven.

     THE ONE RIGGING RULE THAT SURVIVED. FOUR_MODULES.md §3.3
     measured every candidate selector by majority vote over the
     3,945 live (boat, motor, kit) triples. The four the brief
     named came last: hull material 15.76 %, motor brand 18.77 %,
     HP band 26.03 %, motor Control 26.10 %. All four are refuted
     below. This one is asserted by the sheet's own banner rows.

     EVIDENCE (asserted): `Rigging Kits!C` carries band headers over
     each run, and EIGHT of them name a boat brand — rows 546, 616,
     659, 670, 695, 715, 733, 766. Measured: 555 of 571 testable
     live triples = 97.20 %.

     THE 16 COUNTER-EXAMPLES ARE ONE CLASS, AND THE KITS ARE RIGHT.
     Cap Camarat hulls (Boat Module rows 249, 250, 251, 255, 256,
     257) take Cap Camarat kits while `Boat Module!E Matrix` labels
     those rows `Merry Fisher`. The brand COLUMN is wrong, not the
     pairing. Fold Jeanneau's three marques — Jeanneau, Merry
     Fisher, Cap Camarat — into one brand group and it is 571 of
     571 = 100.00 %, discriminating to between 0.96 % and 9.32 % of
     the 622 live kits.

     AND THE SCOPE IS SMALL, WHICH IS THE HONEST HALF. It reaches
     571 of 3,945 live triples — 14.5 % — because the big brand has
     no bespoke catalogue: Highfield carries 588 live boats and
     2,519 live triples against a HIGHFIELD RIGGING KITS section of
     EXACTLY TWO KITS, and draws everything else from the generic
     Yamaha sections. Haines Signature takes the sentinel
     `HAINES - Factory Fit Rigging Kit` on 117 of 117. Same shape as
     the trailers, same correction: bespoke is the norm for the
     small brands and generic for the big one.
     ---------------------------------------------------------- */
  {
    id: 'wb:pairing-rigging-section-matches-boat-brand',
    ref: 'F15',
    evidence: 'asserted',
    statement:
      "A boat may only be paired with a rigging kit from a factory-fit section named for that boat's brand.",
    because: 'that section is the factory-fit range built for this boat brand',
    source: `Rigging Module.xlsx · Rigging Kits!C band header rows 546, 616, 659, 670, 695, 715, 733, 766 — eight sections naming a boat brand · ASSERTED by the banner labels · 555 of 571 testable live triples (97.20 %); the 16 counter-examples are one class — Cap Camarat hulls at Boat Module rows 249, 250, 251, 255, 256, 257 taking Cap Camarat kits while Boat Module!E 'Matrix' labels them Merry Fisher — so folding Jeanneau's three marques into one group gives 571 of 571 (100.00 %), leaving between 0.96 % and 9.32 % of the 622 live kits. It is evaluable on only 571 of 3,945 live triples (14.5 %): Highfield's own section holds exactly two kits and its 2,519 triples come from the generic Yamaha sections instead · FOUR_MODULES.md §3.3`,
    kind: 'implies',
    priority: 60,
    needs: ['boat::brand', 'accessory::section'],
    plainly:
      'The rigging sections are named after boat brands, so this is the trailer rule again on a different part — but it can only answer for one pairing in seven, because the biggest brand has two kits of its own and takes everything else from the general Yamaha ranges. And the boat\'s brand is still the name of its table rather than a column on it.',
    blocked:
      "LEFT SIDE HAS NO COLUMN — F8's blocker exactly, because it is F8's rule on another " +
      'partner. The boat brand is the table IDENTITY (one table per brand), so buildConcepts ' +
      'never produces boat::brand and no clause can name it. RIGHT SIDE IS SEEDED AND HALF ' +
      "USABLE: rig_kits carries `Section` — the band header row, VERBATIM — so the brand is a " +
      'substring sharing the cell with the range name and the vintage the business writes into ' +
      'the same banner ("As at 01.07.2024", "Season 2024 as at 28.05.2024"). Testing it means ' +
      'parsing a heading rather than comparing a value, which is the same shape F8 is blocked ' +
      "on and needs the same fix: a derived `Section Brand` column written at import. THIRD: " +
      'IT MUST WARN, not filter, and the surface must be able to say NOT EVALUABLE HERE — it ' +
      'reaches 571 of 3,945 live triples, and a gate that silently passes the other 85.5 % has ' +
      'not checked them. That is F9\'s requirement, met for a different reason. FOURTH, AND DO ' +
      'NOT "FIX" IT BY WIDENING THE MATCH: the 16 counter-examples are a defect in Boat ' +
      'Module!E Matrix and not in the kits, so the correct handling is to fold Jeanneau, Merry ' +
      'Fisher and Cap Camarat into ONE brand group (571/571) — relabelling the kits to match ' +
      'the boat column would encode the defect as a rule. NEEDS: everything F8 needs, plus ' +
      "A2's non-blocking severity.",
  },

  /* ----------------------------------------------------------
     F16 · A MECHANICAL-CONTROL MOTOR NEVER TAKES A HELM MASTER
           RIGGING KIT

     OBSERVED, and it is the ONLY ZERO in the whole rigging
     cross-tab — which is exactly why it is worth writing and
     exactly why it may not filter.

     EVIDENCE: Motor Module (1).xlsx · `Motor Library!J 'Control'`
     (asserted header) cross-tabbed against the kit named beside
     that motor on the pairing:

       mechanical-control motor × Helm Master kit    0 of 1,576
       digital-control (DEC) motor × mechanical kit  137 cells

     THE ASYMMETRY IS THE FINDING, as it was for F7. A digital
     motor can be rigged mechanically and 137 pairings are. A
     mechanical motor is never given the digital package. Writing
     this as an equality between the motor's control generation and
     the kit's would reject those 137 pairings the workbook itself
     lists.

     AND IT IS THE SAME FACT F13 FOUND FROM THE OTHER END: of the
     203 places where horsepower DESCENDS between adjacent motor
     slots, 166 (81.8 %) coincide with a change of Rigging Kit
     Option and 129 (63.5 %) with a change of the motor's Control
     value. The slot ladder restarts at each control generation
     because the rigging changes with it. Row 154, Stabicraft 2050
     Frontier FT, runs thirteen slots in three blocks: 1–4 Mech +
     Hydraulic, 5–9 DEC + Hydraulic, 10–12 DEC + Digital Electric
     Steering.
     ---------------------------------------------------------- */
  {
    id: 'wb:pairing-mechanical-motor-excludes-helm-master-kit',
    ref: 'F16',
    evidence: 'observed',
    statement:
      'A motor with mechanical controls must not be paired with a Helm Master rigging kit.',
    because: 'a Helm Master kit belongs with a digitally controlled motor, and this one is mechanical',
    source: `Motor Module (1).xlsx · Motor Library!J 'Control' (asserted header) × Rigging Module.xlsx · Rigging Kits!C, the Helm Master kits · OBSERVED, not asserted: 0 of 1,576 mechanical-control pairings name a Helm Master kit — the only zero in the whole rigging cross-tab. It does NOT run the other way: a digital-control (DEC) motor takes a mechanical kit on 137 cells · FOUR_MODULES.md §3.3`,
    kind: 'excludes',
    priority: 25,
    needs: ['motor::control', 'accessory::rigging kit'],
    plainly:
      "It compares the motor's control type with the rigging kit chosen beside it, and those are two different tables joined through one pairing. It runs one way only — a digital motor CAN be rigged mechanically, and 137 pairings are — and it is a pattern rather than a rule the business wrote, so it should warn rather than block.",
    blocked:
      'TWO PARTNERS OF ONE PAIRING, WHICH IS A SHAPE THE CONTRACT HAS NOT GOT. This is not ' +
      "A1's boat-against-motor: the motor and the kit are two `reference` columns on the SAME " +
      'boat × motor join row, so a rule that could say it would have to be scoped to the JOIN ' +
      'ROW and read two of its links. columns.ts RULEABLE excludes `reference` and ' +
      'buildConcepts skips PAIR fields, so neither side is a concept a sentence can name. ' +
      'SECOND: "Helm Master" IS NOT A COLUMN. It is a token inside Rigging Kits!C, the same ' +
      "shape as F8's series banner — the kit's control generation would have to be derived at " +
      'import before any clause could test it. THIRD: OBSERVED. The business never wrote this ' +
      'down; it may warn and may never prune, and every ConstraintKind prunes ' +
      "(lib/configure/solve.prune). FOURTH, AND DO NOT \"FIX\" IT BY MAKING IT SYMMETRICAL: an " +
      "equality between the motor's control generation and the kit's would reject the 137 live " +
      "pairings where a DEC motor takes a mechanical kit. NEEDS: A2's non-blocking severity, a " +
      'rule scoped to a join row that can read two partners of one pairing (CONTRACT 1b), and ' +
      "the kit's control generation as a real column.",
  },

  /* ----------------------------------------------------------
     R9 · THE ENGINE LABOUR IS THE STANDARD-FIT MOTOR PLUS ITS
          RIGGING KIT, AND NOTHING ELSE

     THE ONE FIGURE IN THE WHOLE FAN-OUT THE BUSINESS NEVER
     ARGUES WITH. Hand-override rate 0 of 2,436 cells — 0.0 %,
     not once, anywhere in the sheet. Compare the rigging kit
     itself at 94.0 % overtyped, the motor slot at 96.8 %, prop
     description 8.3 %, prop part no. 6.8 %. THE OVERRIDE RATE IS
     THE INSTRUCTION (FITMENT_RULES.md §5.7): 0 % means carry it
     as a computed column, and this is the only 0 % in the file.

     EVIDENCE (asserted, by formula, on all 812 live rows) — and
     every lookup is $-ANCHORED to slot 1, so it can never walk to
     slot 2:

       UF Motor PD Labour      = VLOOKUP($KZ,'[4]Motor Library'!$C:$ZZ,28,0)
                                 → Motor Library!AD 'Labour (Hrs)'
       UG Motor Install Labour = VLOOKUP($KZ,'[4]Motor Library'!$C:$ZZ,87,0)
                                 → Motor Library!CK 'TTF'
       UH Rigging Kit Labour   = VLOOKUP($LA,'[5]Rigging Kits'!$C:$ZZ,13,0)
                                 → Rigging Kits!O 'NSM Lab (Hrs)'
       UJ Total Engine Labour  = ROUNDUP(SUM(UF:UI),)
       SX Est Hrs              = $JN + $UJ

     AND IT IS A SECOND, INDEPENDENT ASSERTION THAT SLOT 1 IS THE
     RECOMMENDATION: the boat is priced against slot 1's motor and
     slot 1's kit alone, which is the same thing the header
     'Recommended Motor Option' says in words.

     THE RIGGING HALF IS ALREADY HERE AND THE MOTOR HALF IS NOT.
     rig_kits carries O as `NSM Lab (Hrs)` — hand-typed on 1,244
     rows, zero formulas, 51 distinct values, median 5.65
     (FOUR_MODULES.md §3.4) — so the number UH returns is seeded.
     Motor Library!AD and CK are not on any motor table.
     ---------------------------------------------------------- */
  {
    id: 'wb:boat-engine-labour-from-standard-fit',
    ref: 'R9',
    evidence: 'asserted',
    statement:
      "A boat's engine labour must be the standard-fit motor's own pre-delivery and installation hours plus its rigging kit's fitting hours, and nothing else.",
    because:
      'the hours on the job are the hours that motor takes to prepare and install plus the hours its rigging kit takes to fit',
    source: `${WORKBOOK} · Boat Module!UF/UG/UH/UJ · UF = VLOOKUP($KZ,'Motor Library'!C:ZZ,28,0) → Motor Library!AD 'Labour (Hrs)'; UG = VLOOKUP($KZ,…,87,0) → Motor Library!CK 'TTF'; UH = VLOOKUP($LA,'Rigging Kits'!C:ZZ,13,0) → Rigging Kits!O 'NSM Lab (Hrs)'; UJ = ROUNDUP(SUM(UF:UI),) · ASSERTED by formula on all 812 live rows, every lookup $-anchored to slot 1 so it never walks to slot 2 · hand-override rate 0 of 2,436 cells (0.0 %) — the only 0 % in the workbook, against 94.0 % on the rigging kit itself · FITMENT_RULES.md R9`,
    kind: 'implies',
    priority: 80,
    needs: ['motor::labour (hrs)', 'motor::ttf', 'accessory::nsm lab (hrs)'],
    plainly:
      'It adds up three numbers from three different tables — the motor\'s preparation hours, its installation hours and its rigging kit\'s fitting hours. Two of those columns are not on the sheet yet. The business has never once overridden this figure in 2,436 rows, so it is arithmetic rather than a judgement, and it is real money a quote currently cannot show.',
    blocked:
      'A DERIVATION ACROSS THREE TABLES, AND THEN ARITHMETIC. Two of the three obligations read ' +
      'a column on a THIRD row (the Motor Library row for the motor on this pairing, and the ' +
      "Rigging Kits row for its kit), which is A3's and A4's blocker: ValueExpr has no lookup, " +
      "and FieldPath's one viaFieldId hop is dropped by both evaluators. Then they are SUMMED, " +
      "which is A5's blocker: a Clause compares one column to one value and ValueExpr's " +
      "{ kind: 'formula' } branch is not evaluated. SECOND: TWO OF THE THREE COLUMNS ARE NOT " +
      'SEEDED. Motor Library!AD `Labour (Hrs)` and CK `TTF` are absent from every motor table ' +
      'in src/demos/northside.ts. The rigging side IS seeded — rig_kits carries O as `NSM Lab ' +
      '(Hrs)` — so this rule is two columns away from being computable, not a research ' +
      'project. THIRD, AND IT IS AN IMPORT GAP RATHER THAN A CONTRACT ONE: the answer belongs ' +
      'on the PAIR. FOUR_MODULES.md §3.7 asks for two read-through columns on each boat × motor ' +
      'join — Rigging Kit Labour (Hrs) ← rig_kits.O and Rigging Sell ← rig_kits.AC — and ' +
      'neither is on any of the eight joins today, so a quote line carries the kit but not what ' +
      'fitting it costs. NEEDS: an evaluated relationship hop (A3/A4), a formula right-hand ' +
      'side the solver evaluates (A5), and Motor Library!AD and CK seeded on the motor tables.',
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
      'This is the rule that picks a trailer, and it now runs — a Highfield hull is offered 2 of the 145 trailers on the sheet instead of all of them. It still cannot be written as a SENTENCE here, because the boat brand is the NAME OF ITS TABLE rather than a column on it and the trailer brand is buried inside a series heading, so the selector reads the heading instead. Two columns written at import would let it be said in words as well as run.',
    enforcedIn: 'Business rules · The trailer selector',
    blocked:
      'RUNS, BUT NOT AS A SENTENCE. src/features/constraints/trailerFitment.ts evaluates this ' +
      'rule against the loaded tables and the Business rules pane draws the result: it derives ' +
      "the boat's marque from its table name (or, where a table holds several, from its " +
      "outermost level — the seed's Jeanneau table holds Merry Fisher and Cap Camarat as " +
      "ranges) and the trailer's series brand from the banner in the table's outermost level. " +
      'Measured on src/demos/northside.ts: 308 of 308 testable live pairings, 0 counter-' +
      'examples, and it leaves 1.38–13.10 % of the 145 live trailers standing — Highfield 2. ' +
      'THAT PARSING IS AN INTERIM AND IS MARKED AS ONE: FITMENT_RULES.md §6.4 asks for a real ' +
      "`Brand` column on every boat table and a `Series Brand` column on every trailer table, " +
      'and until those exist the rule cannot be a ConstraintDef. What follows is why. ' +
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
      'because even with both columns it is still boat-against-trailer. THE LINE THIS NOTE USED ' +
      'TO END ON — "until then the app checks nothing that actually picks a trailer" — is no ' +
      'longer true, and the selector above is why. It is still true that the SENTENCE surface ' +
      'checks nothing that picks a trailer.',
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
      'Every brand writes the boat\'s weight under a different heading — "BMT Weight", "Tow Weight", "App. Tow Weight", "Boat Weight", "Hull Weight" — so this is five rules rather than one, and two of our seven boat tables have no weight column at all. It now runs beside the trailer selector as a WARNING: it says which trailers are under-rated for the hull and it never takes one off the list, and where a brand has no weight column it says so instead of quietly passing.',
    enforcedIn: 'Business rules · The trailer selector',
    blocked:
      'RUNS AS A WARNING, AND MAY NEVER BE MORE. src/features/constraints/trailerFitment.ts ' +
      "reads it per boat table off that band's own weight column — TRAILER_ATM_FLOOR quotes the " +
      'five headers from this rule verbatim — and annotates a candidate without ever removing ' +
      'one. Its test proves that by running the whole selection twice, with the floor and ' +
      'without, over all 174 seeded hulls and requiring the same list both times. Measured on ' +
      'the seed: 115 of 115 evaluable live pairings clear it, it leaves a mean 87.42 % of the ' +
      'catalogue standing against the series banner\'s 13.10 % ceiling, and it reports "not ' +
      'evaluable" on Jeanneau and Haines Signature rather than passing them. IT IS STILL NOT A ' +
      'SENTENCE, for the reasons that follow, and it must never become a filter. ' +
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

  /* ----------------------------------------------------------
     S1 · A TRAILER'S REGISTRATION BAND MUST MATCH ITS ATM
          — and it is BLOCKED ON PURPOSE, which is the whole point.

     SERVICE_AND_THEMES.md §5.4 specifies this seed and specifies that
     it must not run: "Nine live rows violate it, seven undercharging
     by $117. The app must SHOW the nine long before it may RESOLVE
     them — resolving changes a price the business is charging today."

     EVIDENCE (asserted): a band table and a mass column, which is as
     stated as evidence gets. `Registration Module.xlsx` ·
     `Registration Costs!C15:C19` bands trailer registration on ATM
     MASS and says so in the labels themselves — 'Small Trailers - Up
     to 1.02t', 'Large Trailers - Over 1.021t', 'Heavy Trailers - Over
     4.55t', plus the catalogued decline 'Registration - NOT REQUIRED'.
     `Trailer Module!BY 'Rego Type'` names one of those bands on the
     trailer row; `Trailer Module!K 'ATM (KG)'` states that trailer's
     rated mass, numeric on 459 of 463 cells.

     THE NINE, from MPF_GROUND_TRUTH §14 and not re-derived here:
     Trailer Module rows 60, 61, 224–227, 398, 401 and 403. Seven of
     the nine undercharge by $117 each — the gap between the small
     band's 166 and the large band's 283.

     AND IT IS RUNNING, as a report, in this feature. §3.1's own
     sentence for it is "Offer it as a check that shows the nine and
     changes none — which is exactly the shape workbookRules.ts exists
     for", and `registration.ts` is that check: it tests ONLY the bound
     each band label states, names the words it read the bound out of,
     and writes nothing. Three of the nine are in the seeded subset and
     the surface draws all three. So `enforcedIn` points there rather
     than leaving this card reading as unprotected.
     ---------------------------------------------------------- */
  {
    id: 'wb:trailer-rego-band-matches-atm',
    ref: 'S1',
    evidence: 'asserted',
    statement: "A trailer's registration band must match its ATM.",
    because: 'the mass band a trailer is registered in is the band its own rated weight falls in',
    source: `Registration Module.xlsx · Registration Costs!C15:C19 — trailer registration banded on ATM mass, each band stating its own bound in its label ('Up to 1.02t', 'Over 1.021t', 'Over 4.55t') × Trailer Module.xlsx · Trailer Module!BY 'Rego Type' against !K 'ATM (KG)' (numeric on 459 of 463 rows) · ASSERTED by a band table and a mass column · NINE live rows contradict their own ATM — rows 60, 61, 224–227, 398, 401, 403 — seven of them undercharging by $117 each, the gap between the 166 small band and the 283 large one (MPF_GROUND_TRUTH §14, not re-derived)`,
    kind: 'implies',
    priority: 25,
    needs: ['trailer::rego type', 'trailer::atm (kg)'],
    enforcedIn: 'Business rules · Registration is one fee table',
    plainly:
      'Nine trailers are registered in a weight band their own rated weight contradicts, and seven of them are being undercharged. This is deliberately shown rather than enforced: correcting one changes a price the business is charging today, so the app points at them and touches nothing.',
    blocked:
      'BLOCKED ON PURPOSE, and the purpose is the finding. FIRST: it must WARN and never ' +
      'prune. Every ConstraintKind the contract has — implies, requires, excludes, table — ' +
      'removes values in solve.prune, and pruning here would delete nine trailers the dealer ' +
      'is actively selling. This is CONTRACT 2, the same non-blocking severity A2, F7, F9 and ' +
      'F12 are waiting on, and it is the A2 failure exactly: a rule that rejects the ' +
      "business's own recommendation does not get made twice. SECOND: the bound lives inside " +
      "the band LABEL and in a different unit — 'Up to 1.02t' against a column headed " +
      "'ATM (KG)' — so a clause comparing a column to a literal has to restate a threshold " +
      'the fee table already holds, three times over, in kilograms the label never wrote. ' +
      'That is CONTRACT 3, an evaluated relationship hop into Registration Costs, which is ' +
      "the honest shape: the rule should READ the band's bound, not carry a copy of it. " +
      'UNTIL BOTH LAND the check runs as a report — src/features/constraints/registration.ts, ' +
      'drawn on the rules pane — which shows the rows and changes none of them.',
  },

  /* ----------------------------------------------------------
     S2 · ONE REGISTRATION FEE, READ AT ONE COLUMN

     SERVICE_AND_THEMES.md §5.4 specifies this seed and its blocker in
     one line: "It is a cross-file divergence, not a row-level rule;
     there is no clause shape for it yet. Record it, show it, change
     nothing."

     EVIDENCE (asserted): two formulas, pointing at two different
     columns of the SAME external table, by hard-coded ordinal.

       Trailer Module!BZ = VLOOKUP(BY,'[3]Registration Costs'!$C:$ZZ,9,0)
                           ordinal 9 → column K SELL → 283.00
       Managers View!G23 = VLOOKUP($DB$75,'[10]…',8,0)*$M$54
                           ordinal 8 → column J CTD  → 282.19

     Eighty-one cents on every trailer, forever, because two
     hard-coded ordinals count into one external table. A
     boat-and-trailer package therefore carries one fee at retail and
     one at cost on the same document — and the boat's own line
     (Managers View!K34/D23/A23) reads ordinal 8, agreeing with the
     quote sheet and disagreeing with the trailer sheet.

     WHY IT IS A SEED AND NOT A NOTE. §3.1 calls this "the exact class
     of fault the app exists to end", and the app ends it by holding
     ONE fee table with BOTH columns named — which the seed already
     does. What is still missing is a rule that can SAY so, because the
     divergence is between two files rather than between two rows.

     AND THE MODEL REFUSES TO PICK A SIDE, deliberately.
     `registration.ts` exposes a `FeeRung` of 'ctd' | 'sell' with no
     default, because §6.2 Q1 is a question only the owner can answer:
     "If the answer is 'cost — we pass it through at what it costs
     us', say so, and 3rd Party Recovery becomes the app's word too."
     Defaulting here would be answering the owner's question for him.
     ---------------------------------------------------------- */
  {
    id: 'wb:registration-fee-read-at-one-column',
    ref: 'S2',
    evidence: 'asserted',
    statement: 'One registration fee must be read at one column.',
    because:
      'the same fee is read at cost in one place and at retail in another, so one document can carry both',
    source: `Registration Module.xlsx · Registration Costs!J 'CTD' and !K 'SELL' · ASSERTED by two formulas counting into the same external table by hard-coded ordinal: Trailer Module!BZ = VLOOKUP(BY,'[3]Registration Costs'!$C:$ZZ,9,0) reads ordinal 9 = K SELL = 283.00, while Managers View!G23 reads ordinal 8 = J CTD = 282.19 for the same trailer on the same deal, and the boat's own line (Managers View!K34) also reads ordinal 8 · 81 cents on every trailer, and a boat-and-trailer package carries one fee at retail and one at cost on one document`,
    kind: 'implies',
    priority: 25,
    needs: ['trailer::rego ($)'],
    enforcedIn: 'Business rules · Registration is one fee table',
    plainly:
      'The same registration fee is read from two different columns by two different sheets, so a package quote can charge 81 cents more for the trailer than the boat. One table now holds both columns and neither is a default — which of them is the policy is a question for the owner, not for this app.',
    blocked:
      'NOT A ROW-LEVEL RULE. Every ConstraintDef this app has tests a ROW against a value; ' +
      'this tests one SHEET against another sheet, and there is no clause shape for it — ' +
      'neither side of the divergence is a column on a row that could fail. It is recorded ' +
      'here because a fault the app exists to end must be findable, and shown on the ' +
      'registration panel because the fix is structural rather than conditional: one table, ' +
      'both columns named, and a caller that has to state which rung it wants. WHAT WOULD ' +
      'CLOSE IT is not a contract change at all — it is an answer. SERVICE_AND_THEMES §6.2 Q1: ' +
      'one of those two ordinals is the policy and the other is a counting error, and only ' +
      'the owner can say which. Until then feeForBand() offers both rungs and defaults to ' +
      'neither, which is the one behaviour that cannot be wrong.',
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
   CONTRACT — the five changes that clear all fourteen

   Ordered by how many admitted rules each one unblocks, so the
   list doubles as a work order. Nothing here is a guess: each is
   named on the seeds it releases, and every seed above names the
   ones it is waiting for.

   1 · A PAIR-SCOPED FieldPath (a RowScope, which ViewColumn
       already carries) so a rule can name the boat AND the motor
       — or the boat and the trailer — of ONE pairing, plus a
       sentence token that renders a COLUMN on the right-hand
       side.                    unblocks A1 A2 F6 F7 F8 F9 F15 (7)
       The stored shape is already there: ValueExpr has
       { kind: 'field' } and solve.enforceClause narrows both
       columns from it. The gap is describe.literalOf, which
       returns null for a field right-hand side and would print an
       unfinished sentence on the card.

   1b· THE SAME THING POINTED AT ONE JOIN ROW, so a rule can read
       TWO PARTNERS OF ONE PAIRING — the motor and the rigging kit
       chosen beside it — rather than the source and one partner.
                                            unblocks F16 F12 (2)
       This is not a second mechanism, it is the same RowScope
       resolving to the join row instead of the source row. It is
       written separately because 1 as stated does not cover it,
       and F16 is the first rule to need it.

   2 · A NON-BLOCKING SEVERITY on ConstraintDef (or a fifth
       ConstraintKind) that records a warning without pruning a
       domain.                  unblocks A2 F7 F9 F12 F15 F16 (6)
       Every kind the contract has — implies, requires, excludes,
       table — removes values in solve.prune. Four of the eleven
       rules are admitted ON CONDITION they never filter, and two
       of those four (F7, F12) are OBSERVED rather than asserted,
       where filtering would be a straightforward falsehood.

   3 · AN EVALUATED RELATIONSHIP HOP. FieldPath.viaFieldId exists
       and is DROPPED by both evaluators today — evaluate.
       clauseFieldId returns undefined for a hop, state.clauseHolds
       ignores it outright.                  unblocks A3 A4 R9 (3)

   4 · A FORMULA RIGHT-HAND SIDE THE SOLVER EVALUATES.
       { kind: 'formula' } returns 'M' today.   unblocks A5 R9 (2)

   AND EIGHT IMPORT-SIDE COLUMNS, which are not contract changes at
   all — they are seeds, and they belong to tools/seed:
     · a boolean `Obsolete` on boats and on trailers        (A6)
     · `Brand` on every boat table and `Series Brand` on
       every trailer table                                  (F8)
     · `Section Brand` on the rigging kits, derived from the
       band header the same way `Series Brand` is           (F15)
     · the kit's control generation, derived from its name  (F16)
     · `Shaft Lgth` folded to inches on the boat tables     (F6)
     · Motor Library!GT:KO as the motor's prop options      (A3)
     · Motor Library!AD 'Labour (Hrs)' and CK 'TTF' on the
       motor tables                                         (R9)
     · Boat Module!QD..QH, the five deposit stages          (A5)

   AND TWO READ-THROUGHS ON THE BOAT × MOTOR JOIN, which are not a
   rule at all but are what turns R9 into a number on a quote:
   Rigging Kit Labour (Hrs) ← rig_kits.O and Rigging Sell ←
   rig_kits.AC, on all eight joins (FOUR_MODULES.md §3.7). The kit
   already travels onto a quote line; what fitting it costs does
   not, and the median is $3,370.
   ============================================================ */

/* ============================================================
   REFUTED — candidate rules that a measurement KILLED

   These are NOT seeds and must never become seeds. They are here
   because the same adjudications that admitted the fourteen above
   tested these and found them false, and a refutation with a
   number on it is a finding, while the absence of one is an
   invitation to guess again. Every one of them is a rule somebody
   would plausibly write on a wet Tuesday by looking at the column
   headings — which is exactly why the numbers are recorded.

   TWO HEADLINES, because these are the two most likely to be
   re-derived.

   THERE IS NO TRAILER LENGTH RULE. Trailer Module!H
   'Boat Size (Mtr)' is not a length. Across its 456 populated
   cells there are 277 point sizes, 142 MODEL DESIGNATORS
   ('Highfield 660', 'SP600', 'Formosa 525', '2050', 'Jet Ski'),
   36 ranges and 1 pair — and 499 of the 674 live pairings (74.0 %)
   land on a trailer whose H is a model designator. The size
   reading is the minority case.

   THE MOTOR DOES NOT DETERMINE THE RIGGING KIT. It looked as
   though it did at 79.4 %, and that figure was one sentinel
   matching another: NR - ENGINE NOT REQUIRED is a real Motor
   Library row whose Rigging Option - 01 is NR - RIGGING KIT NOT
   REQUIRED, so 16,267 of the 20,640 "matches" were those two
   strings meeting. On real pairs it is 53.3 %. The kit belongs to
   the PAIRING, which is why it is a column on the boat × motor
   join and why (boat, motor) must never be made unique — a UNIQUE
   constraint there deletes 641 live offerings.
   ============================================================ */

export interface RefutedRuleRecord {
  /** Where the refutation is written up. `F10`/`F11` are
   *  FITMENT_RULES.md §4's own refutation numbers; `R8`, `R10` and
   *  `F13` are its rules and relationships whose REJECTED half is
   *  recorded here; the two `§` refs are sections that carry a
   *  refutation without numbering it. Every record also cites its
   *  document in `verdict` or `source`. */
  ref: 'F10' | 'F11' | 'R8' | 'R10' | 'F13' | 'FITMENT §1.4' | 'FOUR_MODULES §3.3'
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
  /* ----------------------------------------------------------
     THE MOTOR AND THE RIGGING KIT — five refutations, and the
     first two are the ones that would do real damage.
     ---------------------------------------------------------- */
  {
    ref: 'R8',
    candidate:
      "The rigging kit is nominated by the motor, exactly as the propeller is — take it from the motor's own Rigging Option list.",
    measured:
      '2,098 of 3,933 live real pairs are members of the list = 53.34 %; 1,066 of 3,933 equal Rigging Option - 01 = 27.10 %; and the formula that would assert it fires on 507 of 26,018 cells = 1.9 %, the other 97.1 % being hand-typed literals',
    verdict:
      'REFUTED AT ANY SEVERITY — and the 79.4 % that made it look true is a DENOMINATOR ' +
      'ARTEFACT. `NR - ENGINE NOT REQUIRED` is a real Motor Library row (C502) whose ' +
      '`Rigging Option - 01` is `NR - RIGGING KIT NOT REQUIRED`, so 16,267 of the 20,640 ' +
      '"matches" are one sentinel matching another. Strip them and membership falls to 53.3 %, ' +
      'which is not a domain — it is barely better than a coin flip — and the misses are not ' +
      'near-matches to be tuned: they are brand-specific pre-rig SKUs (`Yamaha/Stacer ' +
      '|703-6Y52L-11-05 |Side Mount Rigging Kit`) that the generic Yamaha list does not carry. ' +
      "Seeding Motor Library!DA:EX as a domain would block half the dealer's own listings. AND " +
      "THE MECHANISM IS NOW KNOWN, which is why no amount of tuning saves it: a kit's identity " +
      'is mount × gauge × harness × CABLE LENGTH, and cable length is a property of the HULL, ' +
      "not the motor — monotone in Boat Module!G Hull Length across 1,146 live cells (10' → " +
      "3.36 m median, 13' → 4.59, 15' → 6.16, 17' → 7.39, no inversion). A lookup keyed on the " +
      'motor asks a one-sided question of a two-sided fact and can only ever return one ' +
      'arbitrary length. KEEP THE FACT AS PROVENANCE, NEVER AS A FILTER: the Motor Library ' +
      'does publish a permitted set per motor, the boat module fetches item 1 of it on 507 ' +
      'cells, and the business overrides that answer on 94.0 % of cells. Show it in the ' +
      "join's rigging column description; do not gate anything with it. " +
      'FITMENT_RULES.md §1.1 / R8, FOUR_MODULES.md §3.2.',
    source: `${WORKBOOK} · Boat Module!LA and its twelve sibling Rigging Kit Option columns · =VLOOKUP(<motor slot>,'[4]Motor Library'!$C:$ZZ,103,0) on 507 cells (the 39 Formosa rows × 13 slots) → Motor Library!DA 'Rigging Option - 01', DB..EX 'Rigging Option - 02..50'`,
  },
  {
    ref: 'FITMENT §1.4',
    candidate:
      'A boat and a motor name one pairing, so the join can be deduped on (boat, motor) — or, failing that, on (boat, motor, rigging kit).',
    measured:
      'a UNIQUE constraint on (boat, motor) deletes 641 of 4,018 live motor edges = 15.95 %; adding the rigging kit still deletes 392 = 9.76 %; adding the prop description as well still deletes 264 = 6.57 %',
    verdict:
      'REFUTED. THERE IS NO NATURAL KEY, and every candidate for one destroys real offerings. ' +
      'Adding the rigging kit recovers only 249 of the 641, and 264 live edges are ' +
      'byte-identical across two slots of the same row. THE PAIR\'S IDENTITY IS ITS SLOT ' +
      'INDEX — which is why `__order` is not decoration but the primary key of a join row, and ' +
      'why the importer must never dedupe. Worked, because the shape is easy to miss: ' +
      'Highfield ADV7 slots 4–9 are all `F250XSB2`, distinguished only by six Helm Master ' +
      'rigging packages. Six real things the dealer sells, which any dedupe turns into one. ' +
      'DUPLICATES HERE ARE OFFERINGS, NOT NOISE. FITMENT_RULES.md §1.4, §5.6.',
    source: `${WORKBOOK} · Boat Module!KZ..NX, the thirteen five-column motor slots, over the 812 live rows`,
  },
  {
    ref: 'FOUR_MODULES §3.3',
    candidate:
      "The rigging kit can be selected from the motor's brand, or its HP band, or its control type, or the hull's material.",
    measured:
      'majority vote over the 3,945 live (boat, motor, kit) triples: hull material 15.76 %, motor brand 18.77 %, HP band 26.03 %, motor Control 26.10 % — against motor + hull length at 80.66 % and the pair itself at 93.79 %',
    verdict:
      'REFUTED, ALL FOUR — they are the four WORST predictors in the table that measured them, ' +
      'and they were the four the brief proposed. Nothing here overturns the relationship; it ' +
      'EXPLAINS it. The kit belongs to the (boat, motor) pairing and to neither side alone, ' +
      'and even the pair reaches only 93.79 % because the same pair is legitimately offered ' +
      'more than one kit. A selector right one time in four would put the wrong kit on three ' +
      'quotes in four, and a kit with its fitting is a median $3,370 and a maximum $44,310. ' +
      'THE BOAT BRAND IS THE ONE THING IN THIS FAMILY THAT DOES HOLD, and it is admitted ' +
      'above as F15 at 571/571 — but on 14.5 % of triples, which is why it warns and does not ' +
      'select. FOUR_MODULES.md §3.3.',
    source: `Rigging Module.xlsx · Rigging Kits!C × ${WORKBOOK} · Boat Module!LA and its twelve siblings, cross-tabbed against Motor Library!Q 'Supplier', E 'HP Rating', J 'Control' and the (HYP)/(PVC) token in the boat's own name`,
  },
  {
    ref: 'F13',
    candidate:
      'The motor slots are a ladder of increasing horsepower, so the display order can be recomputed by sorting on HP.',
    measured:
      'HP is non-decreasing end to end on 527 of 719 live rows = 73.3 %; of the 203 adjacent descents, 166 (81.8 %) coincide with a change of Rigging Kit Option and 129 (63.5 %) with a change of the motor’s Control value',
    verdict:
      'REFUTED — and the 27 % that fails is the information, not the noise. THE LADDER ' +
      'RESTARTS at each change of control generation, and the rigging kit changes with it: ' +
      'Boat Module!R154, Stabicraft 2050 Frontier FT, runs its thirteen slots in three blocks ' +
      '— slots 1–4 Mech + Hydraulic (150→175), 5–9 DEC + Hydraulic (150→200), 10–12 DEC + ' +
      'Digital Electric Steering (150→200). Each block ascends and each restarts. A sort by HP ' +
      'destroys the boundaries a salesperson reads the menu by. Carry the raw slot index; ' +
      'never derive it. Occupancy, by contrast, IS monotone — only 9 of 813 live rows have a ' +
      'hole — so the ladder is a list of blocks and not a rank. FITMENT_RULES.md F13.',
    source: `${WORKBOOK} · Boat Module!KZ..NX × Motor Module (1).xlsx · Motor Library!E 'HP Rating', J 'Control'`,
  },
  {
    ref: 'R10',
    candidate:
      'Slot 1 is not really the recommendation, so `recommended` should become a multi-value flag or a soft rank.',
    measured:
      'on real deals the quoted motor sits in slot 1 on 17 of 77 (22.1 %) and the modal choice is slot 3 (24.7 %); for trailers slot 1 wins 30 of 66 (45.5 %) — but the quoted motor is SOMEWHERE in the thirteen slots on 71 of 77 (92.2 %)',
    verdict:
      'REFUTED AS A CHANGE TO THE CATALOGUE. One slot is headed `Recommended Motor Option` and ' +
      'the other twelve are headed `Motor Option 2..13`, identically in all nine band header ' +
      'rows, and the labour allowance is priced from slot 1 alone ($KZ/$LA-anchored — R9 ' +
      'above). A second recommended row is not in the data, and inventing one is precisely the ' +
      'failure this file exists to prevent. THE STATISTIC IS REAL AND IT IS A USAGE FACT, NOT ' +
      'A CATALOGUE FACT: it says carry all thirteen slots, which we do, and it belongs on a ' +
      'screen as usage. AND THE FLAG MUST BE ALLOWED TO BE ABSENT FOR A WHOLE ROW: `Std ' +
      'Trailer` is populated on only 350 of 812 live boats (43.1 %), so defaulting the star to ' +
      '"the first row we found" would assert a standard trailer for 462 boats that have none. ' +
      'FITMENT_RULES.md R10, §5.6.',
    source: `${WORKBOOK} · Boat Module!KZ 'Recommended Motor Option' and LF..NT 'Motor Option 2..13' in all nine band header rows; NZ 'Std Trailer'`,
  },

  /* ----------------------------------------------------------
     THE TRAILER, THE DIMENSIONS AND THE MOTOR WEIGHT — the six
     from the fitment pass, unchanged.
     ---------------------------------------------------------- */
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
