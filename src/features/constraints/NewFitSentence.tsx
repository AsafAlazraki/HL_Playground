/* ============================================================
   WRITING A FIT — the composer, beside its own answer.

   The limit composer next door (`NewRuleSentence`) writes a
   `ConstraintDef`; this one writes a `RuleDef`, through
   `compileFit`, into the same store the canvas edits. Same shape,
   same footer contract, same refusal rule: nothing is disabled in
   silence — the footer names the choice still to be made and puts
   the cursor in the exact word it is talking about.

   THE ANSWER IS BESIDE THE SENTENCE, NOT BEHIND A BUTTON. That is
   UX_PASS §11's second fix and the reason this composer is split
   the way `NewRuleSentence` is: you write the words on the left
   and the rows they produce are already on the right. Nobody
   presses RUN to find out they have built 193 rows headed
   `Series` / `Series`.

   NOTHING IS CREATED UNTIL "ADD". The draft lives here; the store
   sees one act, and that act is undoable like every other —
   `createRule` and `updateRule` both go through the store's own
   `mutate`, so ⌘Z takes the whole rule back.
   ============================================================ */

import { useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Plus } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { useProjectStore } from '@/store/useProjectStore'
import { FitResult } from './FitResult'
import { FitSentence } from './FitSentence'
import { blankFit, compileFit, fitMissing, type FitDraft } from './fit'
import { useSentenceCtx } from './useCtx'
import './constraints.css'

export interface NewFitSentenceProps {
  /** the id of the rule that was just written, so the pane can open it */
  onAdded?: (id: string) => void
}

export function NewFitSentence({ onAdded }: NewFitSentenceProps): ReactElement {
  const ctx = useSentenceCtx()
  const createRule = useProjectStore((s) => s.createRule)
  const updateRule = useProjectStore((s) => s.updateRule)

  /* A BLANK SENTENCE NAMES NOTHING. The limit composer learned this
     the hard way — a default that reads like an answer is how a
     business fact nobody stated gets stated. Both tables start
     unchosen and the footer says which one to pick first. */
  const [draft, setDraft] = useState<FitDraft>(() => blankFit(undefined, undefined))
  const [sought, setSought] = useState<string | null>(null)
  const sentenceRef = useRef<HTMLDivElement | null>(null)
  const seekTimer = useRef<number | null>(null)

  const gap = useMemo(() => fitMissing(ctx, draft), [ctx, draft])
  const ready = gap === null

  /** Put the cursor in the word the footer is talking about — the
   *  sentence's own id for the token, written into the DOM by
   *  `Tokens`. */
  const seek = (): void => {
    const id = gap?.tokenId
    if (!id) return
    const host = sentenceRef.current?.querySelector<HTMLElement>(`[data-tok="${id}"]`)
    host?.querySelector<HTMLSelectElement | HTMLInputElement>('select, input')?.focus()
    setSought(id)
    if (seekTimer.current !== null) window.clearTimeout(seekTimer.current)
    seekTimer.current = window.setTimeout(() => setSought(null), 1600)
  }

  const add = (): void => {
    if (!ready) return
    const compiled = compileFit(draft)
    const rule = createRule(draft.sourceEntityId, compiled.name)
    updateRule(rule.id, {
      name: compiled.name,
      rootEntityId: compiled.rootEntityId,
      nodes: compiled.nodes,
      edges: compiled.edges,
    })
    setDraft(blankFit(undefined, undefined))
    onAdded?.(rule.id)
  }

  return (
    <section className="cn-new cn-new--fit">
      <header className="cn-new-head">
        <span className="cn-new-mark">
          <Plus size={ICON_SIZE.small} weight={weightFor(ICON_SIZE.small)} />
        </span>
        <h3 className="cn-new-title">Say what fits what</h3>
        <p className="cn-new-cap">
          One sentence, and the pairs it makes are on the right as you write it.
        </p>
      </header>

      <div className="cn-new-split">
        <div className="cn-new-work">
          <div className="cn-new-say" ref={sentenceRef}>
            <FitSentence
              draft={draft}
              ctx={ctx}
              editable
              big
              onChange={setDraft}
              soughtTokenId={sought}
            />
          </div>
        </div>

        <aside className="cn-new-effect" aria-label="What this rule would find">
          <FitResult draft={draft} ctx={ctx} onChange={setDraft} />
        </aside>
      </div>

      <div className="cn-new-foot">
        <button
          type="button"
          className="cn-add"
          onClick={add}
          disabled={!ready}
          aria-describedby={ready ? undefined : 'cn-new-fit-why'}
        >
          Add rule
        </button>
        {gap !== null && (
          <button
            type="button"
            className="cn-new-why is-seek"
            id="cn-new-fit-why"
            onClick={seek}
          >
            <span className="cn-new-why-say">{gap.says}</span>
            <span className="cn-new-why-go">Take me to it</span>
          </button>
        )}
      </div>
    </section>
  )
}
