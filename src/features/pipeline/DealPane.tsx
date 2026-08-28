/* ============================================================
   ONE DEAL, OPEN — its facts and what has been said about it.

   A PANE BESIDE THE BOARD, NOT A PANEL OVER IT AND NOT A PAGE.
   Three shapes were possible and the board decides between them:

     A panel across the top, like `StageEditor`. That one is about
     the WHOLE board — every column at once — so pushing every
     column down to make room is honest. This is about ONE card,
     and shoving five columns down to talk about a card in the
     third of them moves the thing you were looking at.

     A page. The board's entire job is "where is everything"; the
     answer is the arrangement of the columns, and walking away
     from it to read four lines and a thread throws that answer
     away and makes you rebuild it on the way back.

     A pane in the same row as the columns, which is what this is.
     The board keeps its shape, narrows, and goes on scrolling and
     accepting drops while the pane is open — you can drag another
     card while reading this one. The card it belongs to is marked,
     so the pane and the board never disagree about which deal is
     open.

   OPENING A CARD OPENS THIS, AND NOT THE QUOTE, which is a change
   to what a click on a card did. The reason is the same one: nine
   times in ten the question is "what is happening with this one",
   and that used to cost leaving the board and coming back. The
   document is one press away and named as such — `Open the quote`
   is the pane's only primary act.

   THE DOCUMENT'S STATE AND THE DEAL'S STAGE ARE DRAWN AS TWO
   FACTS, side by side and labelled. `stages.ts` exists to keep
   them apart and until now the distinction was only in a comment:
   a person looking at a card in `Won` had no way to see that the
   document underneath is still a draft. Two rows in the fact list
   is the cheapest possible way to make a load-bearing distinction
   visible.

   ADDING A NOTE IS UNDOABLE, so it is a toast with UNDO (rule 9)
   and never a confirm. UNDO removes THAT note by id rather than
   "the last one", which is the only honest thing it can mean once
   two people are typing.

   WHAT CANNOT BE DONE SAYS WHY, WHERE IT HAPPENS (rule 10). The
   Add button is never disabled: pressing it with an empty box
   prints the reason under the box. And a browser that refuses to
   store the note says so under the thread rather than letting the
   note quietly not survive a refresh — see `dealNotes.ts`.

   NO PHOTOGRAPHS AND NO UPLOADS, deliberately. Everything this app
   stores is IndexedDB and localStorage, and a dealership's photos
   exhaust both. docs/plan/SALES_BOARD.md §5 records that the
   storage decision has not been made; a paperclip button drawn
   before it is made is a promise this build cannot keep.
   ============================================================ */

import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { ArrowSquareOut, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { money } from '@/lib/money'
import { whenSay } from '@/features/activity'
import { say } from '@/store/notes'
import { quoteTotals, type QuoteDef } from '@/features/quote'
import { composeNote, dropNote, notesFor, saveNote, whyNotNote, type NoteBag } from './dealNotes'
import type { StageDef } from './stageStore'

export interface DealPaneProps {
  orgSlug: string
  quote: QuoteDef
  /** where this deal is standing. Undefined only while a stored
   *  stage id and a stored stage list disagree — the same case
   *  `stageOf` covers — and then the row simply is not drawn. */
  stage: StageDef | undefined
  notes: NoteBag
  onClose: () => void
  onOpenQuote: (quoteId: string) => void
}

/** HOW MANY SPECS BELONG ON A PANE. The document prints all of
 *  them; this is a glance at a deal, and a subject with nineteen
 *  frozen specs would push the conversation off the bottom of the
 *  pane the pane exists for. Four, and the rest are counted rather
 *  than hidden. */
const SPECS = 4

/** A stamp, or nothing — never "Invalid Date". Every date on this
 *  pane is a stored ISO string and a document written by an older
 *  build can carry one this build cannot parse. */
function stamp(iso: string | undefined): string {
  if (!iso) return ''
  const at = Date.parse(iso)
  return Number.isNaN(at) ? '' : whenSay(at)
}

export function DealPane({
  orgSlug,
  quote,
  stage,
  notes,
  onClose,
  onOpenQuote,
}: DealPaneProps): JSX.Element {
  const [text, setText] = useState('')
  /* the refusal, and the storage warning. Two different facts: the
     first is about what was typed and clears on the next attempt,
     the second is about the browser and stands until the pane is
     closed. */
  const [why, setWhy] = useState<string | null>(null)
  const [unkept, setUnkept] = useState(false)

  const thread = notesFor(notes, quote.id)
  const totals = quoteTotals(quote)
  const foot = useRef<HTMLDivElement | null>(null)
  const self = useRef<HTMLElement | null>(null)

  /* FOCUS FOLLOWS THE PANE, because a keyboard is how this board is
     meant to be worked (see Board.tsx). Enter on a card opened this
     and left focus behind on the card, so Escape hit nothing and
     Tab walked into the next column instead of into the thread —
     the pane was mouse-only for one press. The pane takes focus
     itself rather than the textarea: landing in a text box is a
     decision the person has not made yet, and the board hands focus
     back to the card it belongs to on the way out. */
  useEffect(() => {
    self.current?.focus()
  }, [quote.id])

  /* THE PANE STARTS AT THE BOTTOM OF THE THREAD, because the last
     thing said is the thing you opened it to read. `scrollIntoView`
     on a sentinel rather than arithmetic on scrollHeight: the
     facts above are variable height and the sentinel is right
     whatever they measure. */
  useEffect(() => {
    foot.current?.scrollIntoView({ block: 'end' })
  }, [quote.id, thread.length])

  /* WHAT WAS TYPED BELONGS TO THE DEAL IT WAS TYPED ON. Opening a
     second card must not carry a half-written sentence about the
     first one into it. */
  useEffect(() => {
    setText('')
    setWhy(null)
    setUnkept(false)
  }, [quote.id])

  const add = (): void => {
    const refusal = whyNotNote(text)
    if (refusal) {
      setWhy(refusal)
      return
    }
    setWhy(null)
    const note = composeNote(orgSlug, text)
    const kept = saveNote(orgSlug, quote.id, note)
    setUnkept(!kept)
    setText('')

    /* `say` WITH ITS OWN ACT, not `sayUndoable` — for the reason
       `Board.tsx` gives about a stage move: this touches no project
       store at all, so pinning the top of that undo stack would
       offer to reverse whatever unrelated edit happened last.

       The sentence names the deal AND who it is for, because the
       audit log listens to this same bus and "Note added to Q-1042"
       tells a manager nothing they can act on. */
    say({
      text: `Note added to ${quote.reference} — ${
        quote.customer.name.trim() || quote.subjectLabel
      }.`,
      act: { label: 'Undo', onPick: () => dropNote(orgSlug, quote.id, note.id) },
    })
  }

  const specs = quote.subjectSpecs.slice(0, SPECS)
  const moreSpecs = quote.subjectSpecs.length - specs.length

  return (
    <aside
      className="dp"
      ref={self}
      tabIndex={-1}
      aria-label={`${quote.reference} — ${quote.customer.name.trim() || quote.subjectLabel}`}
      /* ESCAPE CLOSES IT, from anywhere inside including the
         textarea. A pane you can only leave with the mouse is a
         pane the person who lives on this board all day resents. */
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <header className="dp-head">
        <span className="dp-ref ds-mono">{quote.reference}</span>
        <button type="button" className="dp-shut" onClick={onClose} aria-label="Close">
          <X size={ICON_SIZE.small} aria-hidden="true" />
        </button>
        {/* THE CUSTOMER IS THE HEADING here for the same reason it
            is on the card: a deal is a person waiting on an answer,
            and the reference is an index number. */}
        <h2 className="dp-who">{quote.customer.name.trim() || 'No customer yet'}</h2>
        <p className="dp-what">{quote.subjectLabel}</p>
      </header>

      <div className="dp-body">
        <dl className="dp-facts">
          {stage ? (
            <div className="dp-fact">
              <dt className="dp-fact-say">Stage</dt>
              <dd className="dp-fact-is">
                <span className="dp-stage" data-tone={stage.tone}>
                  {stage.name}
                </span>
              </dd>
            </div>
          ) : null}
          {/* THE DOCUMENT, WHICH IS NOT THE STAGE. See the header. */}
          <div className="dp-fact">
            <dt className="dp-fact-say">Document</dt>
            <dd className="dp-fact-is">
              {quote.state === 'issued'
                ? `Issued${stamp(quote.issuedAt) ? ` ${stamp(quote.issuedAt)}` : ''}`
                : 'Draft'}
            </dd>
          </div>
          <div className="dp-fact">
            <dt className="dp-fact-say">Total</dt>
            <dd className="dp-fact-is ds-mono">
              {money(totals.total)}
              {/* A QUOTE WITH AN UNPRICED LINE DOES NOT PRINT A
                  CONFIDENT TOTAL — the document says so out loud and
                  so does the dashboard, so this does too. */}
              {totals.unpricedCount > 0 ? (
                <span className="dp-partial">
                  {totals.unpricedCount === 1
                    ? '1 line unpriced'
                    : `${totals.unpricedCount} lines unpriced`}
                </span>
              ) : null}
            </dd>
          </div>
          {quote.preparedBy ? (
            <div className="dp-fact">
              <dt className="dp-fact-say">Prepared by</dt>
              <dd className="dp-fact-is">{quote.preparedBy}</dd>
            </div>
          ) : null}
          {stamp(quote.updatedAt) ? (
            <div className="dp-fact">
              <dt className="dp-fact-say">Last touched</dt>
              <dd className="dp-fact-is">{stamp(quote.updatedAt)}</dd>
            </div>
          ) : null}
          {specs.map((s) => (
            <div className="dp-fact" key={s.label}>
              <dt className="dp-fact-say">{s.label}</dt>
              <dd className="dp-fact-is">{s.value}</dd>
            </div>
          ))}
        </dl>
        {moreSpecs > 0 ? (
          <p className="dp-more">
            {moreSpecs === 1
              ? '1 more spec is on the quote.'
              : `${moreSpecs} more specs are on the quote.`}
          </p>
        ) : null}

        <button type="button" className="dp-open" onClick={() => onOpenQuote(quote.id)}>
          Open the quote
          <ArrowSquareOut size={ICON_SIZE.tiny} aria-hidden="true" />
        </button>

        <h3 className="mono-label dp-thread-say">Notes</h3>
        {thread.length === 0 ? (
          /* A FACT, NOT AN INSTRUCTION. The box below is the
             instruction and it is right there. */
          <p className="dp-none">Nothing said about this deal yet.</p>
        ) : (
          <ol className="dp-thread">
            {thread.map((n) => (
              <li className="dp-note" key={n.id}>
                <p className="dp-note-top">
                  {/* NO NAME IS DRAWN WHERE THERE IS NO NAME. A note
                      written with nobody signed in still has a time,
                      and "System" would be an invention — the rule
                      `activity.ts` keeps for its own entries. */}
                  {n.who ? <span className="dp-note-who">{n.who}</span> : null}
                  <span className="dp-note-when ds-mono">{whenSay(n.at)}</span>
                </p>
                <p className="dp-note-text">{n.text}</p>
              </li>
            ))}
          </ol>
        )}

        {unkept ? (
          /* THE ONE THING `stages.ts` SWALLOWS AND THIS MUST NOT.
             See dealNotes.ts: a lost stage override is a card back
             where the document says it goes; a lost note is a
             person's words gone with no trace. */
          <p className="dp-warn" role="status">
            This browser refused to store that note — it is here for now, and will not be
            here after a refresh.
          </p>
        ) : null}
        <div ref={foot} />
      </div>

      <form
        className="dp-say"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <textarea
          className="dp-say-in"
          value={text}
          rows={2}
          placeholder="What happened?"
          aria-label={`Add a note to ${quote.reference}`}
          onChange={(e) => {
            setText(e.target.value)
            if (why) setWhy(null)
          }}
          /* ENTER MAKES A NEW LINE AND ⌘/CTRL-ENTER ADDS. A note is
             prose — "rang him Tuesday, he wants the T-top, ringing
             back Friday" wants a second line — and a box where Enter
             sends is a box that loses the second sentence. */
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              add()
            }
          }}
        />
        {/* THE REFUSAL, UNDER THE BOX IT IS ABOUT. The button is
            never disabled — a control that does nothing and says
            nothing is the failure rule 10 is written against. */}
        {why ? (
          <p className="dp-why" role="alert">
            {why}
          </p>
        ) : null}
        <div className="dp-say-foot">
          <span className="dp-say-hint">Ctrl + Enter</span>
          <button type="submit" className="dp-say-go">
            Add note
          </button>
        </div>
      </form>
    </aside>
  )
}
