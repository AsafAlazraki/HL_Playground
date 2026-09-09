/* ============================================================
   THE RULE CONFIGURATOR, WIRED TO ONE MODULE'S SUBJECT.

   WHAT IT IS. The designer's fourth panel. It appears when the
   tenth verb — `configure`, "set what must always be true here" —
   is switched on, and it is the affordance that verb promises: a
   place where an admin actually writes, switches and reads the
   rules governing THIS module's tables.

   IT BUILDS NO SECOND ENGINE. Every rule on this panel is drawn by
   the component that already draws it in BUSINESS RULES:
   `RuleCard` for a limit and `NewRuleSentence` for writing one. The
   only thing this feature adds is the SCOPE — which of them reach
   the tables this module is about — and that is computed in
   `moduleRules.ts` from the columns, never stored on the module.

   THE THREE SECTIONS, IN THE ORDER `RulesPane` PUT THEM.

     1 · WHAT MUST ALWAYS BE TRUE. The sentence rules that name a
         column on one of these tables, each with its live switch
         and its conflict count, plus the builder — with its column
         picker narrowed to this module's own columns, so an admin
         standing in Boats writes about boats. The rule they write
         still bites on every table of that kind, and the builder
         prints that reach before they add it.

     2 · WHAT THIS PLACE WORKS OUT. The flow rules that walk or
         search one of these tables. A limit and a derivation are
         different animals — a limit has no output, a derivation has
         no truth value — and a panel that mixed them would teach
         the wrong idea about both. Each one switches here and is
         drawn in FITMENT, which the section says.

     3 · WHAT YOUR PRICE FILE ALREADY STATES, as a count and not as
         a list. How many of the file's adjudicated rules are about
         the tables this module stands in, and how many of those are
         checked. The list itself — every rule with its rate, its
         reasoning and the cell it was read out of — is drawn by
         `RulesLedger` on Business rules, and drawing it twice is
         what made this the app's worst-measured screen for prose.
         See the comment over section 3 below.

   NOTHING HERE IS INVENTED. There is no seeded example, no
   suggested rule and no plausible sentence anywhere on this panel.
   Section 3's every line traces to a cell in a workbook; sections 1
   and 2 draw what is in the project and say so plainly when that is
   nothing.

   THE PANEL, ITS THREE WELLS AND EVERY ROW IN THEM ARE `<Card>`,
   the captions are `<SectionHead>` and the disclosure is a ghost
   `<Button>` — all from src/ui. The local rules that drew them
   (`.md-panel`, `.md-rules-well`, `.md-rules-cap`, `.md-flow`,
   `.md-linkbtn`) are deleted from modules.css.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { Warning } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import type { EntityDef, ModuleDef, RuleDef, TableKind } from '@/types/model'
import { ICON_SIZE } from '@/lib/icons'
import {
  NewRuleSentence,
  RuleCard,
  evaluateConstraints,
  sortConstraints,
  useConstraints,
  useSentenceCtx,
} from '@/features/constraints'
import { kindLabel } from '@/features/constraints/columns'
import { Button, Card, SectionHead } from '@/ui'
import {
  constraintsFor,
  flowRulesFor,
  moduleConceptKeys,
  moduleKinds,
  workbookRulesFor,
  type GoverningFlowRule,
} from './moduleRules'
import './modules.css'

/** The panel's own anchor, so the index's live verb can scroll to it
 *  after growing the designer. One place mints the id. */
export const rulesPanelId = (moduleId: string): string => `md-rules-${moduleId}`

/** Kinds as the words a sentence uses: "boats", "motors and packages".
 *  The kind LABEL is the plural of what the table HOLDS ("Boats",
 *  "Accessories") and it is lowercased because this reads mid-sentence
 *  — uppercase is a label style and never a noun in a sentence.
 *
 *  ONE OF THE EIGHT IS NOT A PLURAL. `custom` is labelled "Custom
 *  table", which names the TABLE rather than what is in it, so
 *  "a column on custom table" is not English. It is the one kind whose
 *  contents this app cannot name — that is what custom means — so the
 *  sentence says which tables rather than pretending to a noun for
 *  them. Read from TABLE_KINDS for the other seven, so a kind added
 *  there arrives here with its own word. */
const CUSTOM_WORDS = 'tables of your own'

function kindWords(kinds: readonly TableKind[]): string {
  const words = kinds.map((k) => (k === 'custom' ? CUSTOM_WORDS : kindLabel(k).toLowerCase()))
  if (words.length <= 1) return words[0] ?? ''
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

export interface ModuleRulesPanelProps {
  module: ModuleDef
  /** the module's tables, already resolved by the designer */
  tables: EntityDef[]
}

export function ModuleRulesPanel({ module, tables }: ModuleRulesPanelProps): ReactElement {
  const rules = useProjectStore((s) => s.rules)
  const updateRule = useProjectStore((s) => s.updateRule)
  const constraints = useConstraints()
  const ctx = useSentenceCtx()
  const [openId, setOpenId] = useState<string | null>(null)

  /* -- 1 · the limits ---------------------------------------- */

  const mine = useMemo(
    () => constraintsFor(constraints, module, ctx.index),
    [constraints, module, ctx.index],
  )
  const statuses = useMemo(() => evaluateConstraints(mine, ctx), [mine, ctx])
  const limits = useMemo(() => sortConstraints(mine, statuses), [mine, statuses])
  const conflicts = Object.values(statuses).filter((s) => s.conflicts > 0).length

  /* The columns a rule written HERE may name. Narrowing the picker is
     the whole of "a module configures the rules governing ITS
     subject" — everything downstream of the sentence is the engine's
     own, unchanged. */
  const conceptKeys = useMemo(
    () => moduleConceptKeys(module, ctx.concepts),
    [module, ctx.concepts],
  )

  /* -- 2 · the derivations ----------------------------------- */

  const flows = useMemo(
    () => flowRulesFor(Object.values(rules), module),
    [rules, module],
  )

  /* -- 3 · the workbook -------------------------------------- */

  const kinds = useMemo(() => moduleKinds(tables), [tables])
  const governing = useMemo(() => workbookRulesFor(kinds), [kinds])
  const seeds = useMemo(() => governing.map((g) => g.seed), [governing])
  const liveIds = useMemo(() => new Set(constraints.map((c) => c.id)), [constraints])

  const subject = kinds.length === 0 ? 'these tables' : kindWords(kinds)

  /* HOW MANY OF THE CUT ARE ACTUALLY CHECKED, computed the same way
     the ledger computes it: the engine is carrying the id, or the
     seed names the surface enforcing it. `seed.blocked` is only a
     default for when neither is true, so it is never read here. */
  const checked = seeds.filter((s) => liveIds.has(s.id) || s.enforcedIn).length

  return (
    <Card tone="flat" pad="md" id={rulesPanelId(module.id)}>
      <section className="md-panel" aria-label={`The rules ${module.name} goes by`}>
        <SectionHead level="h3">The rules it goes by</SectionHead>
        {/* NO PARAGRAPH UNDER THE HEADING. It said every rule here
            names a column on a table this module is about — which is
            what the two captions below already say by naming them. */}

        {/* -- 1 · WHAT MUST ALWAYS BE TRUE ----------------------- */}
        <Card tone="flat" pad="md">
          <div className="md-stack">
            <SectionHead
              level="none"
              count={
                limits.length > 0
                  ? `${limits.length} ${limits.length === 1 ? 'rule' : 'rules'}${
                      conflicts > 0 ? ` · ${conflicts} disagreeing with the rows` : ''
                    }`
                  : undefined
              }
            >
              What must always be true
            </SectionHead>

            {limits.length === 0 ? (
              <p className="md-rules-none">
                No rule anyone has written names a column on {subject} yet.
              </p>
            ) : (
              <ul className="md-rules-list">
                {limits.map((constraint) => (
                  <li key={constraint.id}>
                    <RuleCard
                      constraint={constraint}
                      status={statuses[constraint.id]}
                      open={openId === constraint.id}
                      onOpen={(open) => setOpenId(open ? constraint.id : null)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {/* THE PICKER IS NARROWED, THE RULE IS NOT — and the builder
                already says how far it reaches, counted from the sheet,
                before anybody presses Add. One column is one column
                wherever it appears: a rule written here about Max HP
                holds on every boat table that has the column, not only
                the ones in this module. */}
            <NewRuleSentence
              title={`Write a rule for ${module.name}`}
              conceptKeys={conceptKeys}
              onAdded={setOpenId}
            />
          </div>
        </Card>

        {/* -- 2 · WHAT THIS PLACE WORKS OUT ---------------------- */}
        <Card tone="flat" pad="md">
          <div className="md-stack">
            <SectionHead level="none">What this place works out</SectionHead>
            {/* The sentence that stood here explained what a derivation
                is. The rows below name each one and carry its own switch,
                which is the explanation. */}

            {flows.length === 0 ? (
              <p className="md-rules-none">
                Nothing works out a list from {subject} yet — Fitment builds those.
              </p>
            ) : (
              <ul className="md-flows">
                {flows.map((f) => (
                  <FlowRow
                    key={f.rule.id}
                    governing={f}
                    table={tables.find((t) => t.id === f.tableId)}
                    onSet={(enabled) => updateRule(f.rule.id, { enabled })}
                  />
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* -- 3 · WHAT THE PRICE FILE STATES --------------------- */}
        {/* THE LIST CAME OFF THIS PANEL AND THE COUNT STAYED. Measured,
            this tab: 1,868 visible words with 82.3 % of them in runs of
            twelve or more, and thirteen of those sentences appeared
            VERBATIM on Business rules, which draws every one of the
            same seeds through `RulesLedger`. What this panel keeps is
            the part Business rules cannot say: the CUT — how many of
            the file's rules are about the tables this module is
            standing in, and how many of those are actually checked. */}
        <Card tone="flat" pad="md">
          <div className="md-stack">
            <SectionHead level="none">From your price file</SectionHead>
            {seeds.length === 0 ? (
              <p className="md-rules-none">
                <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
                Nothing adjudicated so far talks about {subject} — which is not the same as
                there being none.
              </p>
            ) : (
              <p className="md-rules-say">
                <span className="md-rules-count">
                  {seeds.length} {seeds.length === 1 ? 'rule' : 'rules'} about {subject} ·{' '}
                  {checked} checked
                </span>{' '}
                In full on Business rules.
              </p>
            )}
          </div>
        </Card>
      </section>
    </Card>
  )
}

/* ---------------------------------------------------------- */
/* One derivation                                             */
/* ---------------------------------------------------------- */

const ROLE_SAYS: Record<GoverningFlowRule['role'], string> = {
  walks: 'walks every row of',
  searches: 'searches',
}

function FlowRow({
  governing,
  table,
  onSet,
}: {
  governing: GoverningFlowRule
  table: EntityDef | undefined
  onSet: (enabled: boolean) => void
}): ReactElement {
  const [open, setOpen] = useState(false)
  const rule: RuleDef = governing.rule
  const where = `${ROLE_SAYS[governing.role]} ${table?.name ?? 'a table in this module'}`

  return (
    <li>
      <Card tone="flat" pad="sm">
        <div className="md-stack">
          {/* THE SWITCH STAYS LOCAL. The layer has no switch yet — a
              two-state control whose state is the knob's position,
              not a colour — so this one keeps `.md-switch` and is
              reported as the gap it is. */}
          <button
            type="button"
            className="md-switch"
            role="switch"
            aria-checked={rule.enabled}
            aria-label={`${rule.name} — ${where}`}
            onClick={() => onSet(!rule.enabled)}
          >
            <span className="md-switch-track" aria-hidden="true">
              <span className="md-switch-knob" />
            </span>
            <span className="md-cap-id">
              <span className="md-cap-label">{rule.name}</span>
              <span className="md-cap-says">{where}</span>
            </span>
          </button>

          {/* THE REASON IS THE EVIDENCE, and on the seeded rules it is
              several hundred words of measurement — which is exactly
              what makes them trustworthy and exactly what cannot be
              dumped into a panel. Shut by default: the same string,
              verbatim, one press away, which is the shape `RulesLedger`
              already uses for the same material. */}
          {rule.description ? (
            <>
              <Button
                tone="ghost"
                size="sm"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? 'Less' : 'Why it is what it is'}
              </Button>
              {open ? <p className="md-flow-say">{rule.description}</p> : null}
            </>
          ) : null}
        </div>
      </Card>
    </li>
  )
}
