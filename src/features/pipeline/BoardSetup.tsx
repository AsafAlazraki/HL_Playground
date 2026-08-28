/* ============================================================
   THE BOARD, MADE YOURS — one panel, two decisions.

   IT WAS `StageEditor` AND HELD ONE OF THEM. Columns were
   editable and the card was not, so "how this board looks" lived
   half in a panel and half in nobody's hands. Two panels would
   have been worse: a person who wants their board to suit them
   thinks about the columns and the cards in one sitting, and a
   second button beside the first would make them choose which
   half of one thought they were having. Reported, about a
   different screen and in exactly these words: "uniformity mate".

   IT OPENS ON THE BOARD, not in Admin, because the person who
   wants a column called "Awaiting deposit" thinks of it while
   looking at the board. It is a panel over the columns rather than
   a page: you are changing the thing you are looking at, and
   walking away to a settings screen loses sight of what you are
   changing.

   EVERY CHANGE IS IMMEDIATE, AND THERE IS NO SAVE. A panel with a
   Save button holds two truths — what is on screen and what is
   stored — and the board behind this one is drawn from the second.
   Typing a name renames the column over your shoulder, which is
   the whole reason it is a panel.

   THE TWO HALVES ARE STORED IN DIFFERENT PLACES AND THE PANEL
   SAYS SO. Columns are the BUSINESS's: rename one and it is
   renamed for everybody who signs in. What a card shows is one
   PERSON's, keyed by them and their organisation, the way the
   dashboard's tile order already is. Putting them side by side
   without saying which is which would be the panel quietly
   teaching somebody the wrong thing about their own data.

   REMOVING A STAGE SAYS WHERE ITS DEALS WILL GO, before the act,
   and offers UNDO after it (rule 9). Nothing here can lose a deal:
   `neighbourOf` names the column to the left and the deals are
   moved there.

   WHAT CANNOT BE DONE SAYS WHY, WHERE IT IS (rule 10), three
   times over: Draft and Issued cannot be removed, a board cannot
   go below two columns, and a fifth fact cannot go on a card.
   None of the three is a greyed control.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { Plus, Trash, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { say } from '@/store/notes'
import { currentUser } from '@/features/auth'
import { useQuotes } from '@/features/quote'
import {
  CARD_CAP,
  CARD_FIELDS,
  toggleField,
  useCardFields,
  whyNotField,
  type CardFieldId,
} from './cardFields'
import { moveTo, stageOf, useStages } from './stages'
import {
  TONES,
  WASHES,
  mintId,
  neighbourOf,
  resetStages,
  setStages,
  useStageDefs,
  whyNot,
  type StageDef,
} from './stageStore'

export interface BoardSetupProps {
  orgSlug: string
  onClose: () => void
}

export function BoardSetup({ orgSlug, onClose }: BoardSetupProps): JSX.Element {
  const stages = useStageDefs(orgSlug)
  const quotes = useQuotes()
  const at = useStages(orgSlug)
  /* THE SAME KEY THE BOARD USES, memoised for the same reason —
     see `Board.tsx`. The panel and the board must agree about
     whose preference this is, or the four chips lit here would be
     a different four from the ones on the cards behind them. */
  const who = useMemo(
    () => ({ orgSlug, userId: currentUser()?.id ?? 'nobody' }),
    [orgSlug],
  )
  const card = useCardFields(who)

  /* the reason a removal was refused, kept per stage so it prints
     under the row it belongs to rather than at the top of the panel */
  const [refused, setRefused] = useState<Record<string, string>>({})
  /* the reason a fifth fact was refused. One at a time: a person
     presses one control and gets one sentence. */
  const [capped, setCapped] = useState<string | null>(null)

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
      { id: mintId(stages, name), name, about: '', tone: 'neutral', wash: 'none', closed: false },
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

  const pickField = (id: CardFieldId): void => {
    const why = whyNotField(card.fields, id)
    if (why) {
      setCapped(why)
      return
    }
    setCapped(null)
    card.set(toggleField(card.fields, id))
  }

  return (
    <section className="se" aria-label="How this board is drawn">
      <header className="se-head">
        <h3 className="se-name">This board</h3>
        <p className="se-say">
          Your columns are the dealership&rsquo;s and everybody sees them. What a card shows is
          yours alone.
        </p>
        <button type="button" className="se-shut" onClick={onClose} aria-label="Done">
          <X size={ICON_SIZE.small} aria-hidden="true" />
        </button>
      </header>

      <h4 className="mono-label se-part">Columns</h4>
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

              {/* HOW STRONGLY THE COLUMN IS TINTED — a second choice
                  from the colour, for the reason `stageStore.ts`
                  gives. Words rather than swatches: three grey
                  squares would say nothing, and the thing being
                  chosen is an amount. */}
              <span className="se-washes" role="group" aria-label={`Tint for ${stage.name}`}>
                {WASHES.map((w) => (
                  <button
                    type="button"
                    key={w.id}
                    className={`se-wash${stage.wash === w.id ? ' is-on' : ''}`}
                    aria-pressed={stage.wash === w.id}
                    onClick={() => patch(stage.id, { wash: w.id })}
                  >
                    {w.label}
                  </button>
                ))}
              </span>

              <label className="se-closed">
                <input
                  type="checkbox"
                  checked={stage.closed}
                  onChange={(e) => patch(stage.id, { closed: e.target.checked })}
                />
                {/* "Finished work" IS THE WORD THE BOARD USES for a
                    column holding won and lost, and it is drawn
                    quieter there for it. */}
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

              {/* WHAT BELONGS IN THIS COLUMN, in one line. Drawn
                  under the head when the column has cards and in the
                  body when it has none — one field, because the
                  words do not change when the last card arrives. */}
              <input
                className="se-about"
                value={stage.about}
                placeholder="What belongs here"
                aria-label={`What belongs in ${stage.name}`}
                onChange={(e) => patch(stage.id, { about: e.target.value })}
              />

              {/* THE REFUSAL, IN THE PLACE IT HAPPENED. Not a
                  disabled button with no explanation, and not a
                  dialog somewhere else. */}
              {why ? (
                <p className="se-why" role="alert">
                  {why}
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>

      <h4 className="mono-label se-part">What each card shows</h4>
      {/* THE SPINE IS SAID RATHER THAN LEFT TO BE HUNTED FOR. A
          person looking for "customer" in this list and not finding
          it would conclude the board had lost it. */}
      <p className="se-say se-spine">
        Every card draws the customer, the money, and a mark when there are notes on it.
        Choose up to {CARD_CAP} more.
      </p>
      <ul className="se-fields">
        {CARD_FIELDS.map((f) => {
          const on = card.fields.includes(f.id)
          return (
            <li key={f.id}>
              <button
                type="button"
                className={`se-field${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => pickField(f.id)}
              >
                <span className="se-field-name">{f.label}</span>
                {f.under ? <span className="se-field-say">{f.under}</span> : null}
              </button>
            </li>
          )
        })}
      </ul>
      {/* THE CAP SAYS SO RATHER THAN SWAPPING SILENTLY. A person who
          has just been told "four" can decide which of their own
          four to give up; an app that decides for them has thrown
          away the choice this panel exists to offer. */}
      {capped ? (
        <p className="se-why" role="alert">
          {capped}
        </p>
      ) : null}

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
              text: 'Columns put back to the ones this build ships with.',
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
