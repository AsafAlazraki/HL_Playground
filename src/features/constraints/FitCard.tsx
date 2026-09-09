/* ============================================================
   ONE FIT — a card holding one sentence, one switch, one answer.

   The same card `RuleCard` is for a limit: collapsed it is prose,
   clicking it opens the SAME words as live dropdowns, and the
   switch is a switch rather than a delete, for the same reason —
   a rule that can only be deleted is a rule nobody dares touch.

   WHAT IS DIFFERENT, AND IT IS ONE THING. A limit has no output;
   you can only ever break it. A fit has no truth value; it just
   produces rows. So this card carries the rows — `FitResult`, the
   live answer, open beside the sentence being edited.

   AND WHAT IT REFUSES TO DRAW. A `RuleDef` that branches, loops or
   writes is not a sentence, and this card does not pretend
   otherwise: `readFit` returns null and the card says so, names the
   canvas as the place that CAN edit it, and shows the rule's own
   name rather than a sentence it cannot say. Rule 10 — anything
   that cannot be done says why, where it is.
   ============================================================ */

import type { ReactElement } from 'react'
import { GitBranch } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import type { RuleDef } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { Switch } from './RuleCard'
import { FitResult } from './FitResult'
import { FitSentence } from './FitSentence'
import { compileFit, entityOf, readFit, type FitDraft } from './fit'
import { useSentenceCtx } from './useCtx'
import './constraints.css'

export interface FitCardProps {
  rule: RuleDef
  open: boolean
  onOpen: (open: boolean) => void
}

export function FitCard({ rule, open, onOpen }: FitCardProps): ReactElement {
  const ctx = useSentenceCtx()
  const updateRule = useProjectStore((s) => s.updateRule)
  const draft = readFit(rule)

  const classes = ['cn-card', 'cn-card--fit', rule.enabled ? '' : 'is-off', open ? 'is-open' : '']
    .filter(Boolean)
    .join(' ')

  /* ---- the rule this grammar cannot say -------------------- */

  if (!draft) {
    const kinds = [...new Set(rule.nodes.map((n) => n.kind))].filter(
      (k) => k !== 'start' && k !== 'match' && k !== 'output',
    )
    return (
      <article className={classes}>
        <header className="cn-card-top">
          <ul className="cn-badges">
            <li className="cn-badge cn-badge--off">
              <GitBranch size={ICON_SIZE.tiny} weight={weightFor(ICON_SIZE.tiny)} />
              drawn, not said
            </li>
          </ul>
          <Switch
            on={rule.enabled}
            onChange={(enabled) => updateRule(rule.id, { enabled })}
          />
        </header>
        <p className="cn-card-prose">{rule.name}</p>
        <p className="cn-meta">
          This rule {kinds.length > 0 ? `uses ${kinds.join(', ')} — steps ` : 'does something '}a
          sentence cannot say, so it is edited on the rule builder under Fitment. Nothing about it
          is lost; it simply has no words here.
        </p>
      </article>
    )
  }

  /* ---- the ordinary case: it is a sentence ----------------- */

  const write = (next: FitDraft): void => {
    const compiled = compileFit(next, rule)
    updateRule(rule.id, {
      name: compiled.name,
      rootEntityId: compiled.rootEntityId,
      nodes: compiled.nodes,
      edges: compiled.edges,
    })
  }

  const source = entityOf(ctx, draft.sourceEntityId)
  const rows = ctx.rowsByEntity[draft.sourceEntityId]?.length ?? 0

  return (
    <article className={classes}>
      <header className="cn-card-top">
        <ul className="cn-badges">
          <li className="cn-badge cn-badge--active">a fit</li>
        </ul>
        <Switch on={rule.enabled} onChange={(enabled) => updateRule(rule.id, { enabled })} />
      </header>

      {open ? (
        <div className="cn-card-body">
          <FitSentence draft={draft} ctx={ctx} editable onChange={write} />
          <FitResult draft={draft} ctx={ctx} base={rule} onChange={write} />
        </div>
      ) : (
        <button
          type="button"
          className="cn-card-open"
          onClick={() => onOpen(true)}
          aria-expanded={false}
        >
          <FitSentence draft={draft} ctx={ctx} />
        </button>
      )}

      <footer className="cn-card-foot">
        <span className="cn-meta">
          {rule.enabled
            ? `over ${rows.toLocaleString('en-AU')} ${source?.name ?? 'rows'}`
            : 'switched off'}
        </span>
        {open && (
          <button type="button" className="cn-done" onClick={() => onOpen(false)}>
            Done
          </button>
        )}
      </footer>
    </article>
  )
}
