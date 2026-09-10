/* ============================================================
   ONE RULE — a card holding one sentence, one switch and one reason.

   THE SWITCH IS THE EVERYDAY CONTROL, and it is on the collapsed
   card: a rule that can only be deleted is a rule nobody dares touch,
   and the whole "ask why → switch it off → watch the option come
   back" loop depends on being able to pause one.

   DELETE IS THE OTHER ACT, and it is only on the OPEN card. Owner's
   decision, 2026-09-11, overturning CONFIGURATOR_SPEC §4b's "rules
   toggle off, they are never deleted" — the cost of that rule was
   that dead rules accumulated for the life of the sheet and the only
   removal threw away the good ones too. It sits beside Done rather
   than beside the switch, because a list of collapsed cards is
   something a person scrolls and a stray press there should never be
   able to remove somebody's authoring.

   IT ASKS NOTHING AND SAYS EVERYTHING. Rule 9: an undoable act gets
   a toast with UNDO, not a dialog. The registry is outside the
   project store's history, so Ctrl+Z cannot reach it — the toast
   carries the definition itself and puts it back on press.

   Collapsed, the card is prose. Clicking it opens the SAME sentence
   with the same words as live dropdowns. There is no edit mode to
   find, no inspector to open, and no form.
   ============================================================ */

import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { WarningDiamond } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import type { ConstraintDef } from '@/types/model'
import { RuleSentence } from './RuleSentence'
import { deleteConstraint, putConstraint, restoreConstraint, setConstraintEnabled } from './constraintDefs'
import { describeConstraint } from './describe'
import { say } from '@/store/notes'
import { setBecause } from './edit'
import { BADGE_LABEL, badgesFor, statusNote, type ConstraintStatus } from './state'
import './constraints.css'

/* AN INSTRUCTION, NOT AN EXAMPLE. This used to read "an aluminium
   propeller corrodes away in salt water" — a sentence so plausible
   that on a screen, in a screenshot, or over someone's shoulder it
   read as a rule this business had actually written. It had not. A
   placeholder that can be mistaken for content is a way of inventing
   data, and it was marine besides, in a product that is meant to
   arrive in any industry. It now says what to type. */
export const BECAUSE_PLACEHOLDER = 'why this rule exists, in plain words'

export interface RuleCardProps {
  constraint: ConstraintDef
  status?: ConstraintStatus
  open: boolean
  onOpen: (open: boolean) => void
}

export function RuleCard({ constraint, status, open, onOpen }: RuleCardProps): ReactElement {
  const badges = badgesFor(constraint, status)
  const note = constraint.enabled ? statusNote(status) : 'switched off'
  const conflict = constraint.enabled && (status?.conflicts ?? 0) > 0

  const classes = [
    'cn-card',
    conflict ? 'is-conflict' : '',
    constraint.enabled ? '' : 'is-off',
    open ? 'is-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={classes}>
      <header className="cn-card-top">
        <ul className="cn-badges">
          {badges.map((b) => (
            <li key={b} className={`cn-badge cn-badge--${b}`}>
              {b === 'conflict' && (
                <WarningDiamond size={ICON_SIZE.tiny} weight={weightFor(ICON_SIZE.tiny)} />
              )}
              {BADGE_LABEL[b]}
            </li>
          ))}
        </ul>
        <Switch
          on={constraint.enabled}
          onChange={(on) => setConstraintEnabled(constraint.id, on)}
        />
      </header>

      {open ? (
        <div className="cn-card-body">
          <RuleSentence constraint={constraint} editable />
        </div>
      ) : (
        <button
          type="button"
          className="cn-card-open"
          onClick={() => onOpen(true)}
          aria-expanded={false}
        >
          <RuleSentence constraint={constraint} />
        </button>
      )}

      <Because constraint={constraint} open={open} />

      <footer className="cn-card-foot">
        <span className="cn-meta">{note}</span>
        {constraint.source && <span className="cn-meta cn-meta--dim">{constraint.source}</span>}
        {open && (
          <>
            {/* THE SENTENCE IS THE NAME (there is no other), so the
                toast quotes it — a note reading "Rule deleted" would
                be about a thing a person cannot identify a minute
                later, and this one has to be recognisable long enough
                to decide whether to press UNDO. */}
            <button
              type="button"
              className="cn-drop"
              onClick={() => {
                const gone = deleteConstraint(constraint.id)
                if (!gone) return
                onOpen(false)
                say({
                  text: `Deleted "${describeConstraint(gone)}"`,
                  act: { label: 'Undo', onPick: () => restoreConstraint(gone) },
                })
              }}
            >
              Delete
            </button>
            <button type="button" className="cn-done" onClick={() => onOpen(false)}>
              Done
            </button>
          </>
        )}
      </footer>
    </article>
  )
}

/* ---------------------------------------------------------- */
/* The reason                                                 */
/* ---------------------------------------------------------- */

/** The clause a person meets when an option is unavailable, so it is
 *  written to read after the word "because" — not a name, not the
 *  expression. Collapsed it is part of the prose; open it is the one
 *  thing on the card you actually type. */
function Because({ constraint, open }: { constraint: ConstraintDef; open: boolean }): ReactElement {
  const [draft, setDraft] = useState(constraint.because)
  const dirty = useRef(false)

  useEffect(() => {
    if (!dirty.current) setDraft(constraint.because)
  }, [constraint.because])

  if (!open) {
    return (
      <p className="cn-because">
        <span className="cn-because-kw">because</span>{' '}
        {constraint.because || <span className="cn-because-none">no reason written yet</span>}
      </p>
    )
  }

  const commit = (): void => {
    dirty.current = false
    const next = draft.trim()
    if (next !== constraint.because) putConstraint(setBecause(constraint, next))
  }

  return (
    <p className="cn-because is-editing">
      <label className="cn-because-kw" htmlFor={`because-${constraint.id}`}>
        because
      </label>
      <input
        id={`because-${constraint.id}`}
        className="cn-because-input"
        value={draft}
        placeholder={BECAUSE_PLACEHOLDER}
        onChange={(e) => {
          dirty.current = true
          setDraft(e.target.value)
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
        }}
      />
    </p>
  )
}

/* ---------------------------------------------------------- */
/* The switch                                                 */
/* ---------------------------------------------------------- */

export function Switch({
  on,
  onChange,
}: {
  on: boolean
  onChange: (on: boolean) => void
}): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? 'Rule is on' : 'Rule is off'}
      className={on ? 'cn-switch is-on' : 'cn-switch'}
      onClick={() => onChange(!on)}
    >
      <span className="cn-switch-track">
        <span className="cn-switch-knob" />
      </span>
      <span className="cn-switch-word">{on ? 'ON' : 'OFF'}</span>
    </button>
  )
}
