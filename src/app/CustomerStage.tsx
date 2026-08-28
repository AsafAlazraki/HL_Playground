/* ============================================================
   THE CUSTOMER STAGE — the shell's box around `@/features/crm`.

   Seventh time the same job, and deliberately the seventh of the
   SAME kind rather than a new kind: the feature ships a register
   and a person's page and imports nothing from the app. What it
   cannot know is where the way back lives, that only one thing may
   cover the sheet at a time, and that a quote opens in a window of
   its own. Only the shell knows those.

   WHAT THIS FILE IS, AND ALL IT IS:
     1. one link     — "All customers", from a person back to the
                       register, because the door on the rail is
                       behind the stage a person is standing on. It
                       is the ONLY control on the bar, and it used to
                       be one of two;
     2. a box        — `<CustomerList>` or `<CustomerPage>` fills it
                       and scrolls itself;
     3. two wires    — a quote opens in a window of its own, and the
                       picker that starts one is a dialog the shell
                       hosts. Neither is a thing a feature can do for
                       itself, and both are optional.

   THE CRUMB IS GONE AND SO IS "BACK". Both pages under this stage
   now draw `PageHead`, which names them better than a centred line
   in the bar could; and two ways back from one screen was a
   question about which of them was the real one. The reasoning for
   each is on the bar itself.

   IT WRITES NO CRM LOGIC. Not a count, not a match, not a cell.

   THE LIST AND THE PERSON ARE ONE STAGE KIND, carrying `customerId:
   null` for the register — exactly as the quote stage carries
   `quoteId: null` for the diary. It is one stage rather than two
   because it is one place a person is; it takes the id from the
   SHELL rather than holding it here because a quote links straight
   to the customer it is addressed to, and a stage that kept the id
   privately could not be opened onto anybody.

   A STAGE MUST NEVER OUTLIVE ITS SUBJECT. A customer can be removed
   from inside this very stage, so `onRemoved` returns to the
   register rather than to the sheet — and an id that no longer
   resolves is answered by the feature's own page, which explains
   that the documents written to them still open.
   ============================================================ */

import type { ReactElement } from 'react'
import { CaretLeft } from '@phosphor-icons/react'
import { CustomerList, CustomerPage } from '@/features/crm'
import { ICON_SIZE } from '@/lib/icons'
import { stageKeys, useStageEscape } from './stageKeys'

export interface CustomerStageProps {
  /** the person being looked at, or null for the register of them */
  customerId: string | null
  /** The shell holds which one is open, so the door on the dock and
   *  the stage can never disagree about what is on screen. Passing
   *  null goes back to the register without closing the stage. */
  onOpen: (customerId: string | null) => void
  /** open one of their quotes in a window of its own. Absent = the
   *  history is still LISTED, because a fact that cannot be opened
   *  is better than a control that does nothing. */
  onOpenQuote?: (quoteId: string) => void
  /** start a quote — the picker, which is a dialog the shell hosts
   *  and not something a feature can open for itself.
   *
   *  IT IS OPTIONAL FOR THE SAME REASON `onOpenQuote` IS. Absent,
   *  the customer page's empty history states the fact and offers
   *  nothing; present, it offers the act instead of a paragraph
   *  describing where the act lives. A stage that could not be
   *  mounted without a picker would be a stage the tests cannot
   *  mount. */
  onNewQuote?: () => void
  onClose: () => void
}

export function CustomerStage({
  customerId,
  onOpen,
  onOpenQuote,
  onNewQuote,
  onClose,
}: CustomerStageProps): ReactElement {
  const openId = customerId

  useStageEscape(onClose)

  return (
    <div
      className="shell-viewstage"
      role="region"
      aria-label={openId ? 'Customer' : 'Customers'}
      /* DELETE AND BACKSPACE STOP AT THIS ROOT, the line every other
         stage carries: the sheet's window-level handler offers to
         delete the whole SELECTED TABLE on either key, and a
         Backspace clearing the last letter of a customer's name must
         never offer to strike a price file off the sheet. Escape
         still travels, so the shell can close this page with it —
         and only when the focus is not in a field. */
      onKeyDown={stageKeys}
    >
      <div className="shell-view-bar">
        {/* ONE WAY BACK, AND IT IS THE ONE THAT SAYS WHERE IT GOES.

            A customer's page carried two. "Back", top left, and "All
            customers" on the right of the same bar — measured at
            1600x1000 they sat 48px apart on two rows, because the
            bar had wrapped to hold them both. Two controls doing one
            job is worse than either alone: a person has to work out
            whether they differ.

            "All customers" is the survivor because it NAMES ITS
            DESTINATION, and because the two did not in fact agree —
            "Back" called `onClose`, which empties the window, while
            the register is one step up rather than out. The control
            that read as the obvious way out was the one that went
            somewhere else.

            NOTHING IS LOST. Escape still closes the stage
            (`useStageEscape`), the rail's four doors are how you
            move between pages, and the register half of this same
            stage has had no back control since it stopped pretending
            you arrive at Customers from somewhere.

            THE CRUMB WENT WITH IT, under the rule that took it off
            every other stage this week: the bar names the page only
            where the surface under it has no `PageHead`. One
            customer now has one — eyebrow "Customer", the person's
            name as the title, their quotes as the counted fact — so
            "Customer · the history with one of them" had become a
            second, quieter title sitting directly on top of a better
            one, which is the same "two titles and the centred one
            wins the eye" that the pipeline was reported for.

            So the bar for a customer is one control, and the bar for
            the register is empty — which is what a stage looks like
            when the page below it can name itself. */}
        {openId ? (
          <div className="shell-quote-acts">
            <button
              type="button"
              className="btn shell-quote-act"
              aria-label="Back to all customers"
              onClick={() => onOpen(null)}
            >
              <CaretLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
              All customers
            </button>
          </div>
        ) : null}
      </div>

      {/* THE WELL DOES NOT SCROLL, the page inside it does — `.cx-root`
          is `height: 100%; overflow: auto` in the feature's own
          stylesheet, and a second scroller here would nest a scrollbar
          inside a scrollbar. */}
      <div className="shell-module-well">
        {openId ? (
          <CustomerPage
            /* keyed on the row, so moving between two customers is a
               different page rather than the same page re-pointed */
            key={openId}
            rowId={openId}
            onOpenQuote={onOpenQuote}
            {...(onNewQuote ? { onNewQuote } : {})}
            onRemoved={() => onOpen(null)}
          />
        ) : (
          <CustomerList onOpen={(rowId) => onOpen(rowId)} openId={openId} />
        )}
      </div>
    </div>
  )
}
