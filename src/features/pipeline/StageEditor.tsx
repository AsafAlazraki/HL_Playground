/* ============================================================
   THE STAGES, EDITED — names, colours and order.

   IT OPENS ON THE BOARD, not only in Admin, because the person who
   wants a column called "Awaiting deposit" thinks of it while
   looking at the board. It is a panel over the columns rather than
   a page: you are changing the thing you are looking at, and
   walking away to a settings screen to do it loses the sight of
   what you are changing.

   EVERY CHANGE IS IMMEDIATE, and there is no Save. A panel with a
   Save button has two truths in it — what is on screen and what is
   stored — and the board behind this one is drawn from the second.
   Typing a name renames the column you can see over your shoulder,
   which is the whole reason it is a panel.

   REMOVING A STAGE SAYS WHERE ITS DEALS WILL GO, before the act,
   and offers UNDO after it (rule 9). Nothing here can lose a deal:
   `neighbourOf` names the column to the left and the deals are
   moved there.

   WHAT CANNOT BE DONE SAYS WHY, WHERE IT IS (rule 10). Draft and
   Issued cannot be removed — a quote nobody has moved derives its
   column from the document and needs somewhere to land — and the
   reason is printed under the control rather than the control
   being greyed with no explanation.
   ============================================================ */

import { useState } from 'react'
import type { JSX } from 'react'
import { Plus, Trash, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { say } from '@/store/notes'
import { useQuotes } from '@/features/quote'
import { moveTo, stageOf, useStages } from './stages'
import {
  ANCHORS,
  TONES,
  mintId,
  neighbourOf,
  resetStages,
  setStages,
  useStageDefs,
  whyNot,
  type StageDef,
} from './stageStore'

export interface StageEditorProps {
  orgSlug: string
  onClose: () => void
}

export function StageEditor({ orgSlug, onClose }: StageEditorProps): JSX.Element {
  const stages = useStageDefs(orgSlug)
  const quotes = useQuotes()
  const at = useStages(orgSlug)
  /* the reason a removal was refused, kept per stage so it prints
     under the row it belongs to rather than at the top of the panel */
  const [refused, setRefused] = useState<Record<string, string>>({})

  const patch = (id: string, next: Partial<StageDef>): void => {
    setStages(
      orgSlug,
      stages.map((s) => (s.id === id ? { ...s, ...next } : s)),
    )
  }

  const swap = (i: number, j: number): void => {
    if (j < 0 || j >= stages.length) return
    const next = [...stages]
    const held = next[i]
    next[i] = next[j]
    next[j] = held
    setStages(orgSlug, next)
  }

  const add = (): void => {
    const name = 'New stage'
    setStages(orgSlug, [
      ...stages,
      { id: mintId(stages, name), name, empty: '', tone: 'neutral', closed: false },
    ])
  }

  const remove = (stage: StageDef): void => {
    const why = whyNot(stages, stage.id)
    if (why) {
      setRefused((r) => ({ ...r, [stage.id]: why }))
      return
    }
    const to = neighbourOf(stages, stage.id)
    if (!to) return

    /* THE DEALS MOVE FIRST, and they are recorded so UNDO can put
       both back — the stage AND the cards. A restore that returned
       the column but left its deals somewhere else would be a worse
       state than either. */
    const moved = quotes.filter((q) => stageOf(q, at, stages) === stage.id)
    for (const q of moved) moveTo(orgSlug, q, to.id)
    const before = [...stages]
    setStages(orgSlug, stages.filter((s) => s.id !== stage.id))

    say({
      text:
        moved.length === 0
          ? `${stage.name} removed.`
          : `${stage.name} removed — ${moved.length} ${
              moved.length === 1 ? 'deal' : 'deals'
            } moved to ${to.name}.`,
      act: {
        label: 'Undo',
        onPick: () => {
          setStages(orgSlug, before)
          for (const q of moved) moveTo(orgSlug, q, stage.id)
        },
      },
    })
  }

  return (
    <section className="se" aria-label="The stages on this board">
      <header className="se-head">
        <h3 className="se-name">Stages</h3>
        <p className="se-say">
          Rename them, colour them, and put them in the order your business works in.
        </p>
        <button type="button" className="se-shut" onClick={onClose} aria-label="Done">
          <X size={ICON_SIZE.small} aria-hidden="true" />
        </button>
      </header>

      <ul className="se-list">
        {stages.map((stage, i) => {
          const deals = quotes.filter((q) => stageOf(q, at, stages) === stage.id).length
          const why = refused[stage.id]
          return (
            <li className="se-row" key={stage.id} data-tone={stage.tone}>
              <span className="se-move">
                <button
                  type="button"
                  className="se-move-go"
                  aria-label={`Move ${stage.name} earlier`}
                  aria-disabled={i === 0 || undefined}
                  onClick={() => swap(i, i - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="se-move-go"
                  aria-label={`Move ${stage.name} later`}
                  aria-disabled={i === stages.length - 1 || undefined}
                  onClick={() => swap(i, i + 1)}
                >
                  ↓
                </button>
              </span>

              <input
                className="se-in"
                value={stage.name}
                aria-label={`What ${stage.name} is called`}
                onChange={(e) => patch(stage.id, { name: e.target.value })}
                /* A STAGE WITH NO NAME IS A COLUMN NOBODY CAN AIM
                   AT. Emptying the field is allowed while typing —
                   fighting the caret is worse — and it is put back on
                   the way out. */
                onBlur={(e) => {
                  if (e.target.value.trim() === '') patch(stage.id, { name: 'Stage' })
                }}
              />

              {/* COLOUR FROM A NAMED SET, not a picker. A free colour
                  well invites a choice that fails 4.5:1 against the
                  column head, and no guard in this repo can see
                  contrast. These six were measured. */}
              <span className="se-tones" role="group" aria-label={`Colour for ${stage.name}`}>
                {TONES.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    className={`se-tone${stage.tone === t.id ? ' is-on' : ''}`}
                    data-tone={t.id}
                    aria-pressed={stage.tone === t.id}
                    aria-label={t.label}
                    title={t.label}
                    onClick={() => patch(stage.id, { tone: t.id })}
                  />
                ))}
              </span>

              <label className="se-closed">
                <input
                  type="checkbox"
                  checked={stage.closed}
                  onChange={(e) => patch(stage.id, { closed: e.target.checked })}
                />
                {/* "Closed" IS THE WORD THE BOARD USES for a column
                    holding finished work — won, lost — and it is
                    drawn quieter there for it. */}
                <span>Finished work</span>
              </label>

              <span className="se-n ds-mono">{deals}</span>

              <button
                type="button"
                className="se-drop"
                aria-label={`Remove ${stage.name}`}
                onClick={() => remove(stage)}
              >
                <Trash size={ICON_SIZE.tiny} aria-hidden="true" />
              </button>

              {/* THE REFUSAL, IN THE PLACE IT HAPPENED. Not a
                  disabled button with no explanation, and not a
                  dialog somewhere else. */}
              {why ? (
                <p className="se-why" role="alert">
                  {why}
                </p>
              ) : ANCHORS.includes(stage.id) ? null : null}
            </li>
          )
        })}
      </ul>

      <footer className="se-foot">
        <button type="button" className="se-add" onClick={add}>
          <Plus size={ICON_SIZE.tiny} aria-hidden="true" />
          Add a stage
        </button>
        <button
          type="button"
          className="se-reset"
          onClick={() => {
            const before = [...stages]
            resetStages(orgSlug)
            say({
              text: 'Stages put back to the ones this build ships with.',
              act: { label: 'Undo', onPick: () => setStages(orgSlug, before) },
            })
          }}
        >
          Start again
        </button>
      </footer>
    </section>
  )
}
