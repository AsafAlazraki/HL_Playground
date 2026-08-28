/* ============================================================
   ONE DEAL, WHOLE — the file behind the glance.

   THE OVERVIEW IS THE GLANCE AND THIS IS THE FILE. `DealOverview`
   trims: four specs, the last three notes, the board still visible
   behind it. Nothing here is trimmed. Every spec, every note, every
   link, every attachment, and the stage the deal is standing in
   with how long it has stood there.

   IT IS THE SAME COMPONENTS WITH NO `limit`. Two screens drawing
   one deal from two sets of markup is the shape where a fact gets
   fixed in one and stays wrong in the other for six months, so
   `dealParts.tsx` owns the pieces and this owns a layout.

   WHY IT LIVES INSIDE THE BOARD RATHER THAN BEING A STAGE OF ITS
   OWN. A stage is the shell's to make, and `src/app` is not this
   feature's to edit. What that costs is stated rather than hidden:
   the page above still carries the Quotes header while this is
   open, which is one line in `QuoteStage.tsx` — draw the header
   only when no deal record is open — and it is left for whoever
   owns that file. Everything else about this screen is finished:
   it takes the whole board region, it has its own way back, and
   the board's arrangement is restored exactly when you use it.

   THE WAY BACK IS ONE CONTROL, TOP LEFT, ALWAYS THERE — the shape
   every stage in this app uses, so a person who has learned it
   once does not have to learn it again here. Escape does the same
   thing, because Escape is the way out everywhere.
   ============================================================ */

import { useEffect, useRef } from 'react'
import type { JSX } from 'react'
import { ArrowLeft, ArrowSquareOut } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import type { QuoteDef } from '@/features/quote'
import { useDealDesk } from './dealDesk'
import { DealFacts, DealFiles, DealLinks, DealPhoto, DealThread } from './dealParts'
import type { StageDef } from './stageStore'

export interface DealPageProps {
  orgSlug: string
  quote: QuoteDef
  stage: StageDef | undefined
  onBack: () => void
  onOpenQuote: (quoteId: string) => void
}

export function DealPage({
  orgSlug,
  quote,
  stage,
  onBack,
  onOpenQuote,
}: DealPageProps): JSX.Element {
  const desk = useDealDesk(orgSlug, quote)
  const self = useRef<HTMLDivElement | null>(null)

  /* FOCUS ARRIVES WITH THE SCREEN. Opening this from the popup left
     focus on a button that no longer exists, which drops a keyboard
     user at the top of the document on the next Tab. */
  useEffect(() => {
    self.current?.focus()
  }, [quote.id])

  return (
    <div
      className="dr"
      ref={self}
      tabIndex={-1}
      role="region"
      aria-label={`The whole record for ${quote.reference}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onBack()
        }
      }}
    >
      <div className="dr-bar">
        <button type="button" className="dr-back" onClick={onBack}>
          <ArrowLeft size={ICON_SIZE.small} aria-hidden="true" />
          <span>The board</span>
        </button>
        <span className="dr-ref ds-mono">{quote.reference}</span>
        <button type="button" className="dr-open" onClick={() => onOpenQuote(quote.id)}>
          Open the quote
          <ArrowSquareOut size={ICON_SIZE.tiny} aria-hidden="true" />
        </button>
      </div>

      <div className="dr-well">
        <header className="dr-head">
          {/* THE CUSTOMER IS THE HEADING here as it is everywhere
              else a deal is drawn: a deal is a person waiting on an
              answer. */}
          <h2 className="dr-who">{quote.customer.name.trim() || 'No customer yet'}</h2>
          <p className="dr-what">{quote.subjectLabel}</p>
        </header>

        <div className="dr-cols">
          <div className="dr-col">
            <DealPhoto quote={quote} />
            {/* NO `specLimit`. This is the file: it prints all of
                them, which is the one thing it is for. */}
            <DealFacts quote={quote} stage={stage} arrived={desk.arrived} />
          </div>

          <div className="dr-col dr-col-wide">
            <DealThread
              quote={quote}
              notes={desk.notes}
              text={desk.note.text}
              onText={desk.note.setText}
              why={desk.note.why}
              unkept={desk.note.unkept}
              onAdd={desk.note.add}
            />
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
      </div>
    </div>
  )
}
