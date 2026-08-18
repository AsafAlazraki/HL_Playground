/* ============================================================
   WRITE A NEW RULE — one live sentence, six dropdowns, one button.

   Zero required metadata. No name (the sentence IS the name), no
   kind picker, no entity picker, no save-then-configure. The draft is
   a real ConstraintDef rendered by the SAME <RuleSentence> the cards
   use, so what you are about to add looks exactly like what you will
   get, and the builder can never drift from the editor.
   ============================================================ */

import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Plus } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { newId, nowIso } from '@/lib/id'
import type { ConstraintDef } from '@/types/model'
import { isUnsetField } from './columns'
import {
  INDICATIVE,
  isUnary,
  literalOf,
  valueWords,
  type SentenceCtx,
} from './describe'
import { emptyClause, inferKind, singleGroup } from './edit'
import { createConstraint } from './constraintDefs'
import { missingChoice, tablesFor } from './state'
import { RuleSentence } from './RuleSentence'
import { BECAUSE_PLACEHOLDER } from './RuleCard'
import { useSentenceCtx } from './useCtx'
import './constraints.css'

export const NEW_RULE_CAPTION =
  'It reads as a sentence, and it takes effect the moment you add it.'

/* ---------------------------------------------------------- */
/* The draft                                                  */
/* ---------------------------------------------------------- */

/* AN EMPTY SENTENCE, AND IT MUST STAY EMPTY.
 *
 * This used to open on a rule the app had composed for itself: the two
 * best-ranked columns it could find, each with a value picked off the
 * front of its own list. On the seeded sheet that read "When
 * Discontinued is yes, Wheel Size in must be 0" — a plausible, precise,
 * entirely invented claim about this dealership — with ADD RULE already
 * live beside the words "nothing else to fill in". One press and a rule
 * nobody wrote was in the register, wearing "You, just now" as its
 * source.
 *
 * The ranking was well meant: a sentence whose every word is a dropdown
 * teaches the idea in one look. But a teaching example and a live draft
 * cannot be the same object, because the button under it commits it. So
 * the draft opens with nothing answered, the words say which choices are
 * being asked for, and the button says why it is not available yet.
 */
function makeDraft(ctx: SentenceCtx): ConstraintDef | null {
  if (ctx.concepts.length === 0) return null
  const now = nowIso()
  return {
    id: newId(),
    kind: 'implies',
    if: singleGroup(emptyClause()),
    then: singleGroup(emptyClause()),
    because: '',
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }
}

/** A draft survives a change to the sheet as long as every column it
 *  has been pointed at is still there. An unanswered slot is always
 *  still valid — there is nothing in it to go stale. */
const draftStillValid = (draft: ConstraintDef, ctx: SentenceCtx): boolean =>
  [...draft.if.clauses, ...(draft.then?.clauses ?? [])].every(
    (c) => isUnsetField(c.left.fieldId) || ctx.index.has(c.left.fieldId),
  )

/** When nobody writes a reason, write one that is at least true: the
 *  condition itself, phrased to read after "because". */
function autoBecause(draft: ConstraintDef, ctx: SentenceCtx): string {
  const clause = draft.if.clauses[0]
  const concept = clause ? ctx.index.get(clause.left.fieldId) : undefined
  if (!clause || !concept) return 'that is how this is set up'
  if (isUnary(clause.op)) return `${concept.name.toLowerCase()} ${INDICATIVE[clause.op]}`
  return `${concept.name.toLowerCase()} ${INDICATIVE[clause.op]} ${valueWords(literalOf(clause.right))}`
}

const AUTO_WHY =
  'Written here, in the list. It behaves exactly like every other rule: it runs in both directions, so a choice on either side narrows the other.'

/* ---------------------------------------------------------- */
/* The component                                              */
/* ---------------------------------------------------------- */

export interface NewRuleSentenceProps {
  /** the pane opens the rule it just added */
  onAdded?: (id: string) => void
  /** the heading over the builder. Defaults to the pane's own words;
   *  a module names its own subject — "Write a rule for Boats" — so
   *  the sentence a person is about to write says where they are. */
  title?: string
  /** the columns the sentence may name — see `RuleSentenceProps`. */
  conceptKeys?: ReadonlySet<string>
}

export function NewRuleSentence({
  onAdded,
  title = 'Write a new rule',
  conceptKeys,
}: NewRuleSentenceProps): ReactElement | null {
  const ctx = useSentenceCtx()
  const [draft, setDraft] = useState<ConstraintDef | null>(() => makeDraft(ctx))

  useEffect(() => {
    setDraft((current) =>
      current && draftStillValid(current, ctx) ? current : makeDraft(ctx),
    )
  }, [ctx])

  if (!draft) return null

  const missing = missingChoice(draft, ctx)
  const ready = missing === null
  const reach = ready ? tablesFor(draft, ctx).length : 0

  const add = (): void => {
    if (!ready) return
    const added = createConstraint({
      kind: inferKind(draft),
      if: draft.if,
      ...(draft.then ? { then: draft.then } : {}),
      because: draft.because.trim() || autoBecause(draft, ctx),
      why: AUTO_WHY,
    })
    setDraft(makeDraft(ctx))
    onAdded?.(added.id)
  }

  return (
    <section className="cn-new">
      <header className="cn-new-head">
        <span className="cn-new-mark">
          <Plus size={ICON_SIZE.small} weight={weightFor(ICON_SIZE.small)} />
        </span>
        <h3 className="cn-new-title">{title}</h3>
        <p className="cn-new-cap">{NEW_RULE_CAPTION}</p>
      </header>

      <RuleSentence
        constraint={draft}
        editable
        big
        onChange={setDraft}
        conceptKeys={conceptKeys}
      />

      <p className="cn-because is-editing">
        <label className="cn-because-kw" htmlFor="cn-new-because">
          because
        </label>
        <input
          id="cn-new-because"
          className="cn-because-input"
          value={draft.because}
          placeholder={BECAUSE_PLACEHOLDER}
          onChange={(e) => setDraft({ ...draft, because: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
      </p>

      <div className="cn-new-foot">
        <button
          type="button"
          className="cn-add"
          onClick={add}
          disabled={!ready}
          /* the reason is beside the button and readable — never a
             tooltip, and never a disabled control with no explanation */
          aria-describedby={ready ? undefined : 'cn-new-why'}
        >
          Add rule
        </button>
        {ready ? (
          /* WHAT IT WILL BITE ON, COUNTED FROM THE SHEET. One table per
             brand means a rule about boats is a rule about seven
             tables, and a rule naming two kinds is a rule about none —
             which is worth knowing BEFORE it is added rather than from
             an empty status line afterwards. */
          <span className="cn-new-why">
            {reach === 0
              ? 'No table carries both of these columns, so this rule would never apply.'
              : `It applies to ${reach} table${reach === 1 ? '' : 's'}.`}
          </span>
        ) : (
          <span className="cn-new-why" id="cn-new-why">
            {missing}
          </span>
        )}
      </div>
    </section>
  )
}
