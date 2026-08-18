/* ============================================================
   THE RULE CONFIGURATOR, WIRED TO ONE MODULE'S SUBJECT.

   WHAT IT IS. The designer's fourth panel. It appears when the
   tenth verb — `configure`, "set what must always be true here" —
   is switched on, and it is the affordance that verb promises: a
   place where an admin actually writes, switches and reads the
   rules governing THIS module's tables.

   IT BUILDS NO SECOND ENGINE. Every rule on this panel is drawn by
   the component that already draws it in BUSINESS RULES:
   `RuleCard` for a limit, `NewRuleSentence` for writing one,
   `WorkbookRuleList` for what the price file itself states. The
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

     3 · WHAT YOUR PRICE FILE ALREADY STATES. The workbook rules
         whose columns are of a kind these tables carry, with their
         evidence, their measured rate and an honest status. This is
         the half a person cannot get anywhere else: what is NOT
         being checked, in writing, so they do not assume it is.

   NOTHING HERE IS INVENTED. There is no seeded example, no
   suggested rule and no plausible sentence anywhere on this panel.
   Section 3's every line traces to a cell in a workbook; sections 1
   and 2 draw what is in the project and say so plainly when that is
   nothing.
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
  WorkbookRuleList,
  evaluateConstraints,
  sortConstraints,
  useConstraints,
  useSentenceCtx,
} from '@/features/constraints'
import { kindLabel } from '@/features/constraints/columns'
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

  /* WHICH HALF OF A CROSS-KIND RULE IS THIS MODULE'S. A1 compares the
     boat's Max HP with the motor's HP Rating; it is claimed by Boats
     AND by Motors, and each of them needs telling that the other half
     is somebody else's column. Said once, over the list, rather than
     on eight cards — the cards carry the rule and its evidence, and a
     repeated annotation on most of them would read as a warning. */
  const crossing = governing.filter((g) => g.alsoKinds.length > 0)
  const otherKinds = [...new Set(crossing.flatMap((g) => g.alsoKinds))]

  return (
    <section
      className="md-panel"
      id={rulesPanelId(module.id)}
      aria-label={`The rules ${module.name} goes by`}
    >
      <h3 className="md-panel-name mono-label">The rules it goes by</h3>
      <p className="md-panel-say">
        Every rule here names a column on a table this module is about. Nothing is assigned:
        point this module at another table and the rules it goes by change with it.
      </p>

      {/* -- 1 · WHAT MUST ALWAYS BE TRUE ----------------------- */}
      <div className="md-rules-well">
        <p className="md-rules-cap mono-label">What must always be true</p>
        <p className="md-rules-say">
          A limit has no output — you can only ever break it. Switch one off and everything
          it ruled out comes straight back.
          {limits.length > 0 ? (
            <>
              {' '}
              <span className="md-rules-count">
                {limits.length} {limits.length === 1 ? 'rule' : 'rules'}
                {conflicts > 0
                  ? ` · ${conflicts} disagreeing with the rows`
                  : ''}
              </span>
            </>
          ) : null}
        </p>

        {limits.length === 0 ? (
          <p className="md-rules-none">
            No rule anyone has written names a column on {subject} yet. The sentence below is
            the way to write the first one.
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

      {/* -- 2 · WHAT THIS PLACE WORKS OUT ---------------------- */}
      <div className="md-rules-well">
        <p className="md-rules-cap mono-label">What this place works out</p>
        <p className="md-rules-say">
          A derivation has no truth value — it walks the rows and hands back a list. These are
          drawn in <b>Fitment</b> on the bar; the switch here is the same switch.
        </p>

        {flows.length === 0 ? (
          <p className="md-rules-none">
            Nothing works out a list from {subject} yet. Fitment on the bar is where one is
            built.
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

      {/* -- 3 · WHAT THE PRICE FILE STATES --------------------- */}
      <div className="md-rules-well">
        {seeds.length === 0 ? (
          <>
            <p className="md-rules-cap mono-label">From your price file</p>
            <p className="md-rules-none">
              <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              Nothing read out of your price file talks about {subject}. That is not a
              guarantee it holds no rules — it is a statement about what has been adjudicated
              so far, and the whole list is in Business rules.
            </p>
          </>
        ) : (
          <WorkbookRuleList
            liveIds={liveIds}
            seeds={seeds}
            scope={
              `These are the ones naming a column on ${subject}.` +
              (crossing.length > 0
                ? ` ${crossing.length} of them compare that column with one on ${kindWords(otherKinds)}, so the same rule is drawn in those places too.`
                : '') +
              ' The rest of the list — and the trailer selector, the registration table and what the import left out — are in Business rules on the bar.'
            }
          />
        )}
      </div>
    </section>
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
    <li className="md-flow">
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
          several hundred words of measurement — which is exactly what
          makes them trustworthy and exactly what cannot be dumped into
          a panel. Clamped to three lines with the whole of it in the
          DOM, and one press opens it. Nothing truncates mid-word. */}
      {rule.description ? (
        <>
          <p className={`md-flow-say${open ? ' is-open' : ''}`}>{rule.description}</p>
          <button
            type="button"
            className="md-linkbtn"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Less' : 'Why it is what it is'}
          </button>
        </>
      ) : null}
    </li>
  )
}
