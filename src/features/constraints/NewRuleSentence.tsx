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
import type { ColumnConcept } from './columns'
import {
  INDICATIVE,
  domainOf,
  isUnary,
  literalOf,
  valueWords,
  type SentenceCtx,
} from './describe'
import { inferKind, makeClause, singleGroup } from './edit'
import { createConstraint } from './constraintDefs'
import { RuleSentence } from './RuleSentence'
import { BECAUSE_PLACEHOLDER } from './RuleCard'
import { useSentenceCtx } from './useCtx'
import './constraints.css'

export const NEW_RULE_CAPTION =
  'It reads as a sentence, and it takes effect the moment you add it.'

/* ---------------------------------------------------------- */
/* The draft                                                  */
/* ---------------------------------------------------------- */

/** What the first sentence should open on. Two things decide it: the
 *  subject (a rule about the boats you sell beats a rule about a
 *  pairing table nobody opened), and whether every word of it can be a
 *  dropdown (a short list of values beats free text). */
const KIND_RANK: Record<string, number> = {
  boat: 0,
  motor: 1,
  trailer: 2,
  accessory: 3,
  package: 4,
  dealer: 5,
  custom: 6,
}

function scoreConcept(concept: ColumnConcept, ctx: SentenceCtx): number {
  const domain = domainOf(ctx, concept)
  const values =
    domain.control === 'choice' && domain.options.length > 0
      ? 0
      : domain.control === 'boolean'
        ? 1
        : domain.control === 'number'
          ? 2
          : 3
  /* a sentence whose every word is a dropdown teaches the idea in one
     look, so a listed column outranks the subject it belongs to */
  return values * 10 + (KIND_RANK[concept.kind] ?? 9)
}

function makeDraft(ctx: SentenceCtx): ConstraintDef | null {
  if (ctx.concepts.length === 0) return null
  const ranked = [...ctx.concepts].sort((a, b) => scoreConcept(a, ctx) - scoreConcept(b, ctx))
  const left = ranked[0]
  const right =
    ranked.find((c) => c.kind === left.kind && c.key !== left.key) ??
    ranked.find((c) => c.key !== left.key) ??
    left
  const now = nowIso()
  return {
    id: newId(),
    kind: 'implies',
    if: singleGroup(makeClause(left, ctx)),
    then: singleGroup(makeClause(right, ctx)),
    because: '',
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }
}

const draftStillValid = (draft: ConstraintDef, ctx: SentenceCtx): boolean =>
  [...draft.if.clauses, ...(draft.then?.clauses ?? [])].every((c) =>
    ctx.index.has(c.left.fieldId),
  )

function complete(draft: ConstraintDef): boolean {
  const clauses = [...draft.if.clauses, ...(draft.then?.clauses ?? [])]
  if (clauses.length < 2) return false
  return clauses.every((c) => {
    if (isUnary(c.op)) return true
    const v = literalOf(c.right)
    return v !== null && v !== undefined && v !== ''
  })
}

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
}

export function NewRuleSentence({ onAdded }: NewRuleSentenceProps): ReactElement | null {
  const ctx = useSentenceCtx()
  const [draft, setDraft] = useState<ConstraintDef | null>(() => makeDraft(ctx))

  useEffect(() => {
    setDraft((current) =>
      current && draftStillValid(current, ctx) ? current : makeDraft(ctx),
    )
  }, [ctx])

  if (!draft) return null

  const ready = complete(draft)

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
        <h3 className="cn-new-title">Write a new rule</h3>
        <p className="cn-new-cap">{NEW_RULE_CAPTION}</p>
      </header>

      <RuleSentence constraint={draft} editable big onChange={setDraft} />

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
        <button type="button" className="cn-add" onClick={add} disabled={!ready}>
          Add rule
        </button>
        <span className="cn-meta cn-meta--dim">
          {ready
            ? 'Nothing else to fill in.'
            : 'Choose a value on both sides and the button wakes up.'}
        </span>
      </div>
    </section>
  )
}
