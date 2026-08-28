/* ============================================================
   ONE DEAL, OVER THE BOARD — the glance.

   THIS WAS A PANE BESIDE THE COLUMNS AND IS NOW A POPUP OVER
   THEM, and the argument that moved it is the one the pane's own
   header made and then only half kept. The board's job is "where
   is everything"; the answer is the ARRANGEMENT of the columns,
   and anything that costs you that answer makes you rebuild it on
   the way back. A pane in the row did not hide the board — it
   narrowed it, which reflows every column and moves the card you
   were pointing at. A popup leaves the board exactly where it was
   and puts the deal on top of it.

   AND IT IS NOT A CONTRADICTION OF "NEW QUOTE IS A PAGE".
   Starting a quote IS the work and deserves a page of its own.
   Glancing at a deal is a glance, and a glance that costs you your
   place on the board is not one. The two rules point the same way:
   the container should match the size of the act.

   THE BOARD IS STILL VISIBLE BEHIND IT, deliberately. The scrim is
   a wash rather than a blackout — you can still see which column
   the open card is standing in, which is the fact you were reading
   when you clicked it.

   WHAT THAT COSTS, said rather than glossed. The pane could be
   dragged past: you could pick up another card while reading one.
   A modal cannot, and should not — `aria-modal` is a promise to a
   screen reader that nothing behind this matters, and a board that
   quietly accepted a drop while claiming that would be lying to
   half its users. Escape and the scrim are both one gesture away,
   so the cost of putting the popup down to move a card is one
   press. Seeing the board is worth more than dragging through it.

   WHAT IS HERE AND WHAT IS ON THE PAGE. This carries the whole
   deal at a glance: the subject and its photograph, four specs,
   the money, the stage and how long it has stood there, the
   customer, the last three notes, the links and the files. The
   PAGE behind it carries all of it — every spec, every note. The
   pieces are the same components with a different `limit`; see
   `dealParts.tsx`, which exists so a fix lands in both.

   THE KEYBOARD OWNS IT AS MUCH AS THE MOUSE DOES. It takes focus
   when it opens, Tab cycles inside it and never escapes to the
   board underneath, Escape closes it, and the board puts focus
   back on the card it was about. A modal a keyboard can fall out
   of is a modal that traps a screen reader on a page it cannot
   see.
   ============================================================ */

import { useCallback, useEffect, useRef } from 'react'
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ArrowSquareOut, ArrowsOutSimple, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import type { QuoteDef } from '@/features/quote'
import { useDealDesk } from './dealDesk'
import { DealFacts, DealFiles, DealLinks, DealPhoto, DealThread } from './dealParts'
import type { StageDef } from './stageStore'

/** HOW MANY SPECS BELONG ON A GLANCE. The document prints all of
 *  them and so does the page; a subject with nineteen frozen specs
 *  would push the conversation off the bottom of the thing that
 *  exists to show it. Four, and the rest are counted rather than
 *  hidden. */
const SPECS = 4

/** HOW MUCH OF THE THREAD. The last three are what "where is this
 *  up to" means; the rest is a record, and the record has a page. */
const NOTES = 3

export interface DealOverviewProps {
  orgSlug: string
  quote: QuoteDef
  /** where this deal is standing. Undefined only while a stored
   *  stage id and a stored stage list disagree — the case `stageOf`
   *  covers — and then the row simply is not drawn. */
  stage: StageDef | undefined
  onClose: () => void
  onOpenQuote: (quoteId: string) => void
  /** the whole record, behind this one */
  onOpenRecord: () => void
}

export function DealOverview({
  orgSlug,
  quote,
  stage,
  onClose,
  onOpenQuote,
  onOpenRecord,
}: DealOverviewProps): JSX.Element {
  const desk = useDealDesk(orgSlug, quote)
  const self = useRef<HTMLDivElement | null>(null)

  /* FOCUS FOLLOWS THE POPUP, and lands on the popup rather than on
     the first control in it. Landing in a text box is a decision
     the person has not made yet; the board hands focus back to the
     card on the way out. */
  useEffect(() => {
    self.current?.focus()
  }, [quote.id])

  /** TAB CYCLES INSIDE, and this is the half most popups skip.
   *  Without it the third Tab is on a card underneath, which a
   *  sighted person cannot see and a screen reader announces as
   *  though the deal had closed. */
  const trap = useCallback((e: ReactKeyboardEvent): void => {
    if (e.key !== 'Tab') return
    const root = self.current
    if (!root) return
    const can = [...root.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])',
    )].filter((el) => el.offsetParent !== null || el === document.activeElement)
    if (can.length === 0) return
    const first = can[0]
    const last = can[can.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  return (
    /* THE SCRIM IS A BUTTON'S JOB DONE BY A DIV, and the keyboard
       is served by Escape rather than by making the wash tabbable —
       a focus stop whose whole content is "the space around the
       thing you are reading" is a stop nobody wants to land on. */
    <div
      className="do-scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="do"
        ref={self}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={`${quote.reference} — ${quote.customer.name.trim() || quote.subjectLabel}`}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onClose()
            return
          }
          trap(e)
        }}
      >
        <header className="do-head">
          <span className="do-ref ds-mono">{quote.reference}</span>
          <button type="button" className="do-shut" onClick={onClose} aria-label="Close">
            <X size={ICON_SIZE.small} aria-hidden="true" />
          </button>
          {/* THE CUSTOMER IS THE HEADING, for the same reason it is
              on the card: a deal is a person waiting on an answer,
              and the reference is an index number. */}
          <h2 className="do-who">{quote.customer.name.trim() || 'No customer yet'}</h2>
          <p className="do-what">{quote.subjectLabel}</p>
        </header>

        <div className="do-body">
          <div className="do-left">
            <DealPhoto quote={quote} />
            <DealFacts
              quote={quote}
              stage={stage}
              arrived={desk.arrived}
              specLimit={SPECS}
            />
          </div>

          <div className="do-right">
            <DealThread
              quote={quote}
              notes={desk.notes}
              limit={NOTES}
              text={desk.note.text}
              onText={desk.note.setText}
              why={desk.note.why}
              unkept={desk.note.unkept}
              onAdd={desk.note.add}
            />
          </div>

          {/* LINKS AND FILES RUN THE FULL WIDTH, under both columns.
              They are a list of things attached to the deal and a
              list reads across; boxed into the left column they
              would each be 40 characters wide and every filename
              would wrap. */}
          <div className="do-under">
            <DealLinks
              quote={quote}
              links={desk.links}
              onAdd={desk.link.add}
              onDrop={desk.link.drop}
              why={desk.link.why}
              onTyping={desk.link.clearWhy}
            />
            <DealFiles
              quote={quote}
              files={desk.files}
              ready={desk.filesReady}
              onChoose={desk.file.choose}
              onDrop={desk.file.drop}
              why={desk.file.why}
              did={desk.file.did}
            />
          </div>
        </div>

        <footer className="do-foot">
          {/* TWO DOORS, AND THEY GO TO DIFFERENT PLACES. The record
              is everything said and attached; the quote is the
              document itself. Naming both is cheaper than one
              button that has to guess which was meant. */}
          <button type="button" className="do-more" onClick={onOpenRecord}>
            <ArrowsOutSimple size={ICON_SIZE.tiny} aria-hidden="true" />
            The whole record
          </button>
          <button type="button" className="do-open" onClick={() => onOpenQuote(quote.id)}>
            Open the quote
            <ArrowSquareOut size={ICON_SIZE.tiny} aria-hidden="true" />
          </button>
        </footer>
      </div>
    </div>
  )
}
