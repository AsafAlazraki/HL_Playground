/* ============================================================
   ReviewPanel — the rail that reads the sheet back to you.

   WHAT IT IS. Fifteen data-quality rules run over the whole
   project; this is where their findings stand. A summary, the
   ledger of rules that fired, then the open rule's marks grouped
   by the table they belong to. Each mark teaches — the `why`
   sentence gets the typographic care — and, where the engine can
   derive one, offers a correction that is one press.

   SEVERITY IS THE FIRST THING YOU READ, and three things carry it,
   none of them a filter control:

     · ORDER. Blockers rank first in the ledger; tables carrying a
       blocker come first inside it. The worst thing on the sheet
       is the first thing on the rail.
     · COLOUR. A blocker is `--danger`, an advisory is `--warning`.
       Two hues, both measured over the card they sit on.
     · SHAPE. A blocker's margin rule is solid, an advisory's is
       dashed — which survives being colour-blind, and survives
       `prefers-contrast: more` where the washes go.

   ── ONE RULE WAS DROWNING THE PANEL ─────────────────────────────

   MEASURED, in the browser, against the real price file: 53
   tables, 15,691 rows, **142 findings**. 108 of them are one rule
   — `text-low-cardinality`, firing on 50 of the 53 tables. This
   rail grouped strictly by table, so it drew 53 group heads and
   142 cards: **195 blocks and 142 sentences**, of which 108 taught
   the same lesson with a different noun in it. Grouping by table
   also shattered the one systemic finding across fifty groups, so
   the single most useful fact about this sheet — *three quarters
   of your marks are one rule* — was the one fact the panel could
   not say.

   `explaining-a-refusal.md` names that shape and names who
   commits it. It is conda's classic solver: list the facts flatly
   and stop. The study's map marks it **reject**, with the line
   "this is what our refusals look like today if we stop
   improving them".

   SO THE PANEL LEADS WITH THE CONCLUSION AND KEEPS THE DERIVATION
   ONE PRESS AWAY, which is PubGrub's whole posture, and it
   enumerates rather than repeats, which is Figma's. `rollup.ts`
   holds both borrowings and the argument for each. Here:

     · THE LEDGER. Seven rows for 142 marks — each rule, its
       count, how many tables it touched, ranked blockers-first.
       Every row is a door. Nothing is hidden: a rule that fired a
       hundred times says so, in a figure, at the top.
     · THE ROLL. Inside a table, one card per RULE rather than per
       finding. Jeanneau Factory Packages had eight free-text
       cards; it has one, listing its eight columns, teaching the
       lesson once, with one press that does all eight.
     · THE ESCAPE HATCH. "Show every mark" sits at the foot of the
       ledger and states its own cost — npm's `--force`, priced.
       A person who wants the wall may have it; it is not the
       thing they are handed.

   Rows a person actually sees, at rest: **8 ledger rows + the
   worst rule's groups**, which on this file is 12 blocks against
   the 195 it drew before. Opening the hundred-finding rule is its
   worst case at 108 blocks — 50 tables, each one press from being
   fixed — and the sentence count over the whole rail falls from
   142 to 81. Every figure in this paragraph is asserted in
   `rollup.test.ts` against the real seed, so it cannot go stale in
   silence.

   PER-TABLE READING IS NOT LOST. `FindingBadge` puts a table's
   count on its own card, `FieldMark` puts a column's marks on its
   own row, and the dashboard tile ranks them. The rail is the
   report; those three are the margin notes.

   ── APPLYING A FIX ──────────────────────────────────────────────

   Applying mutates the store, which re-derives the list — so the
   card is gone on the very next render. We hold a short "mark
   cleared" ghost in its place so the correction is legible instead
   of a silent disappearance.

     · IT IS UNDOABLE FROM ON SCREEN. `sayUndoable` pins the exact
       history step these writes fold into and puts UNDO on the
       note (rule 9). The rail's own duplicate live region went
       with it, so a screen reader hears the act once, not twice.
     · A FIX THAT DID NOT CLEAR ITS MARK SAYS SO. Renaming one of
       three columns that share a name leaves two. The card says
       what happened, on itself, while it is flashing.
     · AND ANYTHING THAT MOVES DATA ASKS FIRST. `FixConfirm` holds
       the whole argument for where that line falls and why it is
       not drawn around every fix.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, JSX } from 'react'
import { accentVar } from '@/types/model'
import type { AccentKey, EntityDef } from '@/types/model'
import { applyLintFix } from '@/lib/lint'
import type { FindingSeverity, LintFinding, LintFix } from '@/lib/lint'
import { useProjectStore } from '@/store/useProjectStore'
import { sayUndoable } from '@/store/notes'
import { useLintFindings } from './useLintFindings'
import {
  columnsLine,
  fieldNamesOf,
  marksLabel,
  pluralize,
  ruleTitle,
  severityWord,
} from './describe'
import { EVERY_MARK, buildGroups, buildLedger, resolveOpenRule } from './rollup'
import type { Roll, RollGroup, RuleRow } from './rollup'
import { FixConfirm, fixesNeedConfirm } from './FixConfirm'
import { AdvisoryMark, CloseGlyph, PencilCross, PencilTick, TargetArrow } from './glyphs'
import './review.css'

const FLASH_MS = 1500

interface Flash {
  key: number
  /** every finding the press was aimed at — a roll clears together */
  findingIds: string[]
  entityId: string
  entityName: string
  accent: AccentKey
  title: string
  severity: FindingSeverity
  fixLabel: string
  /** position the roll held inside its group when the fix was applied */
  index: number
}

/** A press waiting on the house question. */
interface Pending {
  fixes: LintFix[]
  findingIds: string[]
  where: string
  columns: string[]
  entity: EntityDef | undefined
  entityId: string
  title: string
  severity: FindingSeverity
  fixLabel: string
  index: number
}

/* ---------------------------------------------------------- */
/* The ledger                                                 */
/* ---------------------------------------------------------- */

function LedgerRow({
  row,
  open,
  onPick,
}: {
  row: RuleRow
  open: boolean
  onPick: () => void
}): JSX.Element {
  return (
    <li className="rv-led-item">
      <button
        type="button"
        className="rv-led"
        data-severity={row.severity}
        aria-pressed={open}
        onClick={onPick}
        title={`${pluralize(row.count, 'mark', 'marks')} — ${row.title}`}
      >
        <span className="rv-led-fig">{row.count}</span>
        <span className="rv-led-name">{row.title}</span>
        <span className="rv-led-where">
          {pluralize(row.tables, 'table', 'tables')}
        </span>
      </button>
    </li>
  )
}

/* ---------------------------------------------------------- */
/* Cards                                                      */
/* ---------------------------------------------------------- */

/** The head every card shares: the rule's name, its word, its address. */
function CardHead({
  severity,
  title,
  address,
  where,
  onSelect,
}: {
  severity: FindingSeverity
  title: string
  address: string
  where: string
  onSelect: () => void
}): JSX.Element {
  const blocker = severity === 'blocker'
  return (
    <button
      type="button"
      className="rv-card-head"
      onClick={onSelect}
      aria-label={`${title} — ${address}. Find ${where} on the sheet`}
      title={`Find ${where} on the sheet`}
    >
      <span className="rv-card-titlerow">
        <span className="rv-card-mark" aria-hidden="true">
          {blocker ? <PencilCross /> : <AdvisoryMark />}
        </span>
        <span className="rv-card-title">{title}</span>
        <span className="rv-card-sev">{severityWord(severity)}</span>
      </span>
      <span className="rv-card-target">
        <span className="rv-card-arrow" aria-hidden="true">
          <TargetArrow />
        </span>
        <span className="rv-card-address">{address}</span>
      </span>
    </button>
  )
}

/** The sentence a card carries when the fix ran and the mark survived it. */
function StillHere(): JSX.Element {
  return (
    <p className="rv-still" role="status">
      Applied — and this mark is still here. The correction was legal but did not satisfy
      the rule on its own; read the reason above for what is left.
    </p>
  )
}

function FindingCard({
  finding,
  entity,
  flashing,
  onSelect,
  onApply,
}: {
  finding: LintFinding
  entity: EntityDef | undefined
  flashing: boolean
  onSelect: () => void
  onApply: () => void
}): JSX.Element {
  const where = entity ? entity.name : 'the sheet'
  return (
    <article
      className={`rv-card${flashing ? ' is-flashing' : ''}`}
      data-severity={finding.severity}
    >
      <CardHead
        severity={finding.severity}
        title={ruleTitle(finding.title)}
        address={columnsLine(finding, entity)}
        where={where}
        onSelect={onSelect}
      />

      <p className="rv-why">{finding.why}</p>

      {flashing ? <StillHere /> : null}

      {finding.fix ? (
        <div className="rv-fix">
          <span className="rv-fix-label">{finding.fix.label}</span>
          <button
            type="button"
            className="rv-apply"
            onClick={onApply}
            title={finding.fix.label}
          >
            Apply fix
          </button>
        </div>
      ) : (
        /* RULE 10, KEPT: what cannot be done says why, where it is.
           There is no correction this engine can derive for this one,
           and the honest next step is the door already on the card. */
        <p className="rv-nofix">
          No one-click fix for this one — press the mark above to find{' '}
          {entity ? entity.name : 'it'} on the sheet.
        </p>
      )}
    </article>
  )
}

/**
 * ONE RULE, ONE TABLE, ONE CARD — however many columns it caught.
 *
 * The head, the margin rule, the severity word and the fix row are
 * drawn once instead of eight times; the eight columns become eight
 * lines, each still its own address and still its own one press. The
 * lesson above them is `collapseWhy`'s: the engine's own sentence
 * with the per-column figures elided, so it is stated once and no
 * word of it was written here. Where no honest stem exists the card
 * falls back to a sentence per line, which is what a roll of two
 * unlike findings deserves.
 */
function RollCard({
  roll,
  entity,
  flashing,
  onSelect,
  onApplyOne,
  onApplyAll,
}: {
  roll: Roll
  entity: EntityDef | undefined
  flashing: boolean
  onSelect: () => void
  onApplyOne: (finding: LintFinding) => void
  onApplyAll: () => void
}): JSX.Element {
  const n = roll.findings.length
  const where = entity ? entity.name : 'the sheet'
  const fixable = roll.findings.filter((f) => f.fix)
  const all = fixable.length === n && n > 0
  const label = roll.findings[0].fix?.label ?? ''

  return (
    <article
      className={`rv-card rv-roll${flashing ? ' is-flashing' : ''}`}
      data-severity={roll.severity}
    >
      <CardHead
        severity={roll.severity}
        title={roll.title}
        address={pluralize(n, 'column', 'columns')}
        where={where}
        onSelect={onSelect}
      />

      {roll.why ? <p className="rv-why">{roll.why}</p> : null}

      <ul className="rv-roll-list">
        {roll.findings.map((f) => {
          const names = fieldNamesOf(f, entity)
          return (
            <li className="rv-roll-item" key={f.id}>
              <span className="rv-roll-name">{names.length > 0 ? names.join(', ') : where}</span>
              {roll.why ? null : <span className="rv-roll-why">{f.why}</span>}
              {f.fix ? (
                <button
                  type="button"
                  className="rv-apply rv-apply-sm"
                  onClick={() => onApplyOne(f)}
                  title={`${f.fix.label} — ${names.join(', ') || where}`}
                  aria-label={`${f.fix.label} — ${names.join(', ') || where}`}
                >
                  Fix
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>

      {flashing ? <StillHere /> : null}

      {all ? (
        <div className="rv-fix">
          <span className="rv-fix-label">{label}</span>
          <button
            type="button"
            className="rv-apply"
            onClick={onApplyAll}
            title={`${label} — all ${n}`}
          >
            Apply to all {n}
          </button>
        </div>
      ) : (
        <p className="rv-nofix">
          {fixable.length === 0
            ? `No one-click fix for these — press the mark above to find ${where} on the sheet.`
            : `${fixable.length} of these ${n} have a one-click fix; the rest are above.`}
        </p>
      )}
    </article>
  )
}

function GhostCard({ flash }: { flash: Flash }): JSX.Element {
  return (
    <article className="rv-card rv-ghost" data-severity={flash.severity} aria-hidden="true">
      <span className="rv-ghost-row">
        <span className="rv-ghost-mark">
          <PencilTick />
        </span>
        <span className="rv-ghost-title">{ruleTitle(flash.title)}</span>
      </span>
      <span className="rv-ghost-note">Cleared · {flash.fixLabel}</span>
    </article>
  )
}

/* ---------------------------------------------------------- */
/* Empty (clean sheet) plate                                  */
/* ---------------------------------------------------------- */

function CleanPlate({ hasEntities }: { hasEntities: boolean }): JSX.Element {
  return (
    <div className="rv-clean">
      <div className="rv-clean-plate">
        <span className="rv-clean-mark" aria-hidden="true">
          <PencilTick />
        </span>
        <p className="rv-clean-stamp">
          {hasEntities ? 'Nothing to correct' : 'Nothing drawn yet'}
        </p>
        {/* an empty state keeps its sentence — one of them. The list of
            what a mark can be about is what the marks themselves say,
            when there are any. */}
        <p className="rv-clean-prose">
          {hasEntities
            ? 'Marks appear as the model drifts, and clear as you fix it.'
            : 'Draw a table and the review starts.'}
        </p>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* Panel                                                      */
/* ---------------------------------------------------------- */

/** Right-rail review panel. `onClose` closes the rail. */
export function ReviewPanel({ onClose }: { onClose: () => void }): JSX.Element {
  const findings = useLintFindings()
  const entities = useProjectStore((s) => s.entities)
  const select = useProjectStore((s) => s.select)

  const [flashes, setFlashes] = useState<Flash[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const flashSeq = useRef(0)

  useEffect(
    () => () => {
      for (const t of timers.current) clearTimeout(t)
      timers.current = []
    },
    [],
  )

  const blockers = findings.reduce((n, f) => n + (f.severity === 'blocker' ? 1 : 0), 0)
  const total = findings.length
  const advisories = total - blockers
  const clean = total === 0
  const entityCount = Object.keys(entities).length

  const ledger = useMemo(() => buildLedger(findings), [findings])
  const openRule = resolveOpenRule(ledger, picked)
  const groups = useMemo(
    () => buildGroups(findings, entities, openRule),
    [findings, entities, openRule],
  )

  /* ── APPLYING, IN TWO HALVES ────────────────────────────────────
     `request` decides whether the house question is owed (FixConfirm
     holds that argument); `commit` is the half that writes. They are
     separate because the sheet's Apply button has to call the second
     one directly, with the same arguments the first one weighed. */

  const commit = (p: Pending) => {
    for (const fix of p.fixes) applyLintFix(fix)

    /* RULE 9. `sayUndoable` pins the exact history step these writes
       folded into and puts UNDO on the note. It MUST be raised in
       this turn of the event loop — it reads the top of the stack on
       a microtask — so it stands here, immediately after the
       mutations, and never inside the timeout that clears the ghost.
       A roll's writes all land in this same turn, which is why one
       note covers eight columns and one Ctrl+Z takes them back. */
    sayUndoable(
      p.fixes.length === 1
        ? `${p.fixLabel} — applied`
        : `${p.fixLabel} — applied to ${p.fixes.length} columns`,
    )

    const flash: Flash = {
      key: (flashSeq.current += 1),
      findingIds: p.findingIds,
      entityId: p.entityId,
      entityName: p.entity?.name ?? '',
      accent: p.entity?.accent ?? 'graphite',
      title: p.title,
      severity: p.severity,
      fixLabel: p.fixLabel,
      index: p.index,
    }
    setFlashes((prev) => [...prev, flash])
    /* NOT ANNOUNCED TWICE. This rail kept its own visually-hidden
       live region and spoke the fix into it; the toast raised above
       is itself `role="status" aria-live="polite"`, so keeping both
       would read the same sentence to a screen reader twice and only
       one of the two carries the Undo a person can actually reach. */

    const t = setTimeout(() => {
      setFlashes((prev) => prev.filter((f) => f.key !== flash.key))
    }, FLASH_MS)
    timers.current.push(t)
  }

  const request = (
    group: RollGroup,
    roll: Roll,
    index: number,
    subset: LintFinding[],
  ) => {
    const fixes = subset.map((f) => f.fix).filter((f): f is LintFix => !!f)
    if (fixes.length === 0) return
    const columns: string[] = []
    for (const f of subset) for (const n of fieldNamesOf(f, group.entity)) columns.push(n)
    const p: Pending = {
      fixes,
      findingIds: subset.map((f) => f.id),
      where: group.name,
      columns,
      entity: group.entity,
      entityId: group.entityId,
      title: roll.title,
      severity: roll.severity,
      fixLabel: fixes[0].label,
      index,
    }
    if (fixesNeedConfirm(fixes)) setPending(p)
    else commit(p)
  }

  /* which live findings a flash is still waiting on */
  const flashingIds = useMemo(() => {
    const live = new Set(findings.map((f) => f.id))
    const out = new Set<string>()
    for (const flash of flashes) {
      for (const id of flash.findingIds) if (live.has(id)) out.add(id)
    }
    return out
  }, [findings, flashes])

  /* a flash whose findings ALL went becomes a ghost, in the place its
     card held; one that left any behind flashes the card instead */
  const ghostsByEntity = useMemo(() => {
    const live = new Set(findings.map((f) => f.id))
    const map = new Map<string, Flash[]>()
    for (const flash of flashes) {
      if (flash.findingIds.some((id) => live.has(id))) continue
      const list = map.get(flash.entityId)
      if (list) list.push(flash)
      else map.set(flash.entityId, [flash])
    }
    return map
  }, [findings, flashes])

  return (
    <aside className="rv-rail" aria-label="Review">
      <header className="rv-head">
        <div className="rv-head-row">
          <span className="rv-eyebrow">Review</span>
          <span className="rv-head-rule" aria-hidden="true" />
          <button
            type="button"
            className="rv-close"
            onClick={onClose}
            aria-label="Close review"
            title="Close review"
          >
            <CloseGlyph />
          </button>
        </div>

        {/* THE SUMMARY, AND IT IS COUNTED. Two figures and a sentence
            say what a rubber stamp in 17px letterspaced capitals used
            to, and can be read from further away. */}
        <div
          className="rv-sum"
          data-tone={clean ? 'clean' : blockers > 0 ? 'blocker' : 'advisory'}
        >
          <p className="rv-sum-line">
            {clean ? 'Nothing to correct' : `${marksLabel(total)} on the sheet`}
          </p>
          {clean ? (
            <p className="rv-sum-say">
              Every table has been checked against all fifteen rules.
            </p>
          ) : (
            <div className="rv-sum-tally">
              <span className="rv-sum-cell" data-kind="blocker">
                <b className="rv-sum-fig">{blockers}</b>
                <span className="rv-sum-word">
                  {blockers === 1 ? 'blocker' : 'blockers'}
                </span>
              </span>
              <span className="rv-sum-cell" data-kind="advisory">
                <b className="rv-sum-fig">{advisories}</b>
                <span className="rv-sum-word">
                  {advisories === 1 ? 'advisory' : 'advisories'}
                </span>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── THE LEDGER ────────────────────────────────────────────
          The rules that fired, ranked, counted, each a door. This is
          the row that says "108 of your 142 marks are one rule", and
          it is the only place on the rail that can say it. */}
      {ledger.length > 0 ? (
        <nav className="rv-ledger" aria-label="Rules that fired">
          {/* NOT A SECOND COUNT OF THE MARKS — the summary two inches
              above already gives that, and saying "4 marks" twice on
              one panel is the duplication rule 3 of the redesign keeps
              catching. This line says the thing only this region
              knows: how many rules made them, and that they are
              ranked. */}
          <p className="rv-ledger-say">
            {`${pluralize(ledger.length, 'rule', 'rules')} made them — worst first.`}
          </p>
          <ul className="rv-led-list">
            {ledger.map((row) => (
              <LedgerRow
                key={row.ruleId}
                row={row}
                open={openRule === row.ruleId}
                onPick={() => setPicked(row.ruleId)}
              />
            ))}
          </ul>
          {/* THE ESCAPE HATCH, AND IT STATES ITS OWN COST. npm offers
              `--force` without saying which way is safer; this one
              says exactly what pressing it produces. */}
          <button
            type="button"
            className="rv-led-all"
            aria-pressed={openRule === EVERY_MARK}
            onClick={() => setPicked(EVERY_MARK)}
          >
            {`Show every mark (${total})`}
          </button>
        </nav>
      ) : null}

      <div className="rv-body">
        {groups.length === 0 && ghostsByEntity.size === 0 ? (
          <CleanPlate hasEntities={entityCount > 0} />
        ) : (
          groups.map((g, gi) => {
            const items: JSX.Element[] = g.rolls.map((roll, i) =>
              roll.findings.length === 1 ? (
                <FindingCard
                  key={roll.key}
                  finding={roll.findings[0]}
                  entity={g.entity}
                  flashing={flashingIds.has(roll.findings[0].id)}
                  onSelect={() => select({ kind: 'entity', id: g.entityId })}
                  onApply={() => request(g, roll, i, roll.findings)}
                />
              ) : (
                <RollCard
                  key={roll.key}
                  roll={roll}
                  entity={g.entity}
                  flashing={roll.findings.some((f) => flashingIds.has(f.id))}
                  onSelect={() => select({ kind: 'entity', id: g.entityId })}
                  onApplyOne={(f) => request(g, roll, i, [f])}
                  onApplyAll={() => request(g, roll, i, roll.findings)}
                />
              ),
            )
            for (const ghost of ghostsByEntity.get(g.entityId) ?? []) {
              items.splice(Math.min(ghost.index, items.length), 0, (
                <GhostCard key={`ghost-${ghost.key}`} flash={ghost} />
              ))
            }
            return (
              <section
                className="rv-group ds-rise"
                key={g.entityId}
                style={{ '--i': gi } as CSSProperties}
              >
                <header className="rv-group-head">
                  <span
                    className="rv-dot"
                    style={{ '--rv-accent': accentVar(g.accent) } as CSSProperties}
                    aria-hidden="true"
                  />
                  <h3 className="rv-group-name" title={g.name}>
                    {g.name}
                  </h3>
                  <span
                    className="rv-group-count"
                    data-kind={g.blockers > 0 ? 'blocker' : 'advisory'}
                    aria-label={
                      g.blockers > 0
                        ? `${pluralize(g.blockers, 'blocker', 'blockers')} here`
                        : `${pluralize(g.count, 'advisory', 'advisories')} here`
                    }
                  >
                    {g.count}
                  </span>
                </header>
                <div className="rv-cards">{items}</div>
              </section>
            )
          })
        )}
      </div>

      {pending ? (
        <FixConfirm
          fixes={pending.fixes}
          where={pending.where}
          columns={pending.columns}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const p = pending
            setPending(null)
            commit(p)
          }}
        />
      ) : null}
    </aside>
  )
}
