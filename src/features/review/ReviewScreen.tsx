/* ============================================================
   REVIEW (rw-) — COCKPIT.

   THE CONTENT HERE IS THE BEST-WRITTEN IN THE APP and none of it
   changes. "This table has 2 fields named CTD, so any value filed
   under that name is ambiguous — rename them to say how they
   differ" is a sentence that teaches the rule, names the columns and
   says what to do, and `describe.ts`, `rollup.ts` and the lint
   engine that produce it are untouched.

   WHAT IS WRONG IS THE BOX IT IS IN. Measured at 1280x800 on the
   real seed, 142 marks across 7 rules are drawn in a 440px column
   centred in a 1056px stage, with ~300px of empty page down each
   side — so every one of those sentences wraps three or four times
   and the roll-up, the marks and the fixes are stacked in a straw.

     register        NONE
     scale contrast  2.45x
     width used      440 of 1056px

   AND THAT IS NOT `ReviewPanel`'s FAULT. It is a RAIL — a margin
   note beside the sheet, and review.css argues its 340-440px
   clamp carefully and correctly for that job. `ReviewStage` mounts
   it as a whole page, which is where the straw comes from, and its
   own comment says so: "the panel was written as a rail that could
   be shut without leaving the screen; on a stage there is nowhere
   else to be".

   SO THE RAIL KEEPS ITS JOB and this is the PAGE: the ledger of
   rules on the left, at the Cockpit row height, and the marks for
   whichever rule is open in a column with room to be read. The rail
   is still what the sheet gets.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import type { EntityDef } from '@/types/model'
import { useLintFindings } from './useLintFindings'
import { EVERY_MARK, buildGroups, buildLedger, resolveOpenRule } from './rollup'
import type { RollGroup, RuleRow } from './rollup'
import { columnsLine, marksLabel, severityWord, targetLine } from './describe'
import './review-screen.css'

export interface ReviewScreenProps {
  /** open the table a mark is on — the way from a finding to the
   *  thing it is about. Absent = the mark is still SAID and not
   *  offered as a door, and the screen still works. */
  onOpenTable?: (entityId: string) => void
}

export function ReviewScreen({ onOpenTable }: ReviewScreenProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const findings = useLintFindings()
  const [asked, setAsked] = useState<string | null>(null)

  const ledger = useMemo(() => buildLedger(findings), [findings])
  /* WHICH RULE IS OPEN IS RESOLVED, NEVER ASSUMED. A rule that was
     open and has since been fixed off the sheet is gone, and
     `resolveOpenRule` lands on the next one rather than on nothing —
     the same reader the rail uses, so the two cannot disagree. */
  const open = resolveOpenRule(ledger, asked)
  const groups = useMemo(
    () => buildGroups(findings, entities, open),
    [findings, entities, open],
  )

  const blockers = findings.reduce((n, f) => n + (f.severity === 'blocker' ? 1 : 0), 0)
  const advisories = findings.length - blockers

  return (
    <div className="rw" data-register="cockpit">
      <header className="rw-head">
        <div className="rw-head-say">
          <h1 className="t-display rw-name">Review</h1>
          <p className="t-small rw-census">
            {marksLabel(findings.length)} · {blockers} {blockers === 1 ? 'blocker' : 'blockers'} ·{' '}
            {advisories} {advisories === 1 ? 'advisory' : 'advisories'}
          </p>
        </div>
      </header>

      {findings.length === 0 ? (
        <p className="t-small rw-none">
          Nothing to correct. Every table on the sheet passes all seven rules.
        </p>
      ) : (
        <div className="rw-body">
          {/* ============================================================
              THE LEDGER — what stops work first, then what fired most.
              `buildLedger` ranks it and breaks ties on the rule's name
              so a row never jumps under the pointer between edits.
              ============================================================ */}
          <nav className="rw-ledger" aria-label="The rules that fired">
            <ul className="rw-rules">
              {ledger.map((rule) => (
                <Rule
                  key={rule.ruleId}
                  rule={rule}
                  on={rule.ruleId === open}
                  onPick={() => setAsked(rule.ruleId)}
                />
              ))}
              <li>
                <button
                  type="button"
                  className={EVERY_MARK === open ? 'rw-rule is-on' : 'rw-rule'}
                  aria-pressed={EVERY_MARK === open}
                  onClick={() => setAsked(EVERY_MARK)}
                >
                  <span className="t-small rw-rule-name">Every mark</span>
                  <span className="t-caption rw-rule-n">{findings.length}</span>
                </button>
              </li>
            </ul>
          </nav>

          <div className="rw-marks">
            {groups.map((group) => (
              <Group key={group.entityId} group={group} onOpenTable={onOpenTable} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Rule({
  rule,
  on,
  onPick,
}: {
  rule: RuleRow
  on: boolean
  onPick: () => void
}): ReactElement {
  return (
    <li>
      <button
        type="button"
        className={on ? 'rw-rule is-on' : 'rw-rule'}
        data-severity={rule.severity}
        aria-pressed={on}
        onClick={onPick}
      >
        {/* THE SEVERITY IS A RAIL AND A WORD, never a hue alone —
            §3, and `severityWord` is the app's one wording for it. */}
        <span className="rw-rule-rail" aria-hidden="true" />
        <span className="t-small rw-rule-name">{rule.title}</span>
        <span className="t-caption rw-rule-where">
          {rule.tables} {rule.tables === 1 ? 'table' : 'tables'}
        </span>
        <span className="t-caption rw-rule-n">{rule.count}</span>
      </button>
    </li>
  )
}

function Group({
  group,
  onOpenTable,
}: {
  group: RollGroup
  onOpenTable?: (entityId: string) => void
}): ReactElement {
  return (
    <section className="rw-group">
      <p className="rw-group-head">
        {onOpenTable ? (
          <button
            type="button"
            className="t-heading rw-group-name rw-group-door"
            onClick={() => onOpenTable(group.entityId)}
          >
            {group.name}
          </button>
        ) : (
          <span className="t-heading rw-group-name">{group.name}</span>
        )}
        <span className="t-caption rw-group-n">
          {group.count} {group.count === 1 ? 'mark' : 'marks'}
          {group.blockers > 0
            ? ` · ${group.blockers} ${group.blockers === 1 ? 'blocker' : 'blockers'}`
            : ''}
        </span>
      </p>

      <ul className="rw-rolls">
        {group.rolls.map((roll) => (
          <li key={roll.key} className="rw-roll" data-severity={roll.severity}>
            <p className="rw-roll-head">
              <span className="t-small rw-roll-name">{roll.title}</span>
              <span className="t-label rw-roll-sev">{severityWord(roll.severity)}</span>
            </p>
            {/* THE LESSON THE WHOLE ROLL SHARES, with the per-finding
                figures elided — `collapseWhy` finds the honest stem
                and returns EMPTY where there is none, in which case
                every sentence is drawn on its own line below rather
                than one of them standing in for the others. */}
            {roll.why === '' ? null : <p className="t-small rw-why">{roll.why}</p>}
            <ul className="rw-each">
              {roll.findings.map((f) => (
                <Mark key={f.id} why={roll.why === ''} finding={f} entity={group.entity} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Mark({
  finding,
  entity,
  why,
}: {
  finding: { id: string; why: string }
  entity: EntityDef | undefined
  why: boolean
}): ReactElement {
  const f = finding as Parameters<typeof targetLine>[0]
  const columns = columnsLine(f, entity)
  const target = targetLine(f, entity)
  return (
    <li className="rw-mark">
      <span className="t-caption rw-mark-at">{columns === '' ? target : columns}</span>
      {why ? <span className="t-small rw-mark-why">{finding.why}</span> : null}
    </li>
  )
}
