/* ============================================================
   THE CUSTOMER STAGE — the shell's box around `@/features/crm`.

   Seventh time the same job, and deliberately the seventh of the
   SAME kind rather than a new kind: the feature ships a register
   and a person's page and imports nothing from the app. What it
   cannot know is where the way back lives, that only one thing may
   cover the sheet at a time, and that a quote opens in a window of
   its own. Only the shell knows those.

   WHAT THIS FILE IS, AND ALL IT IS:
     1. a way back   — one control, top left, always there;
     2. a crumb      — what is on screen, in the bar's own voice;
     3. a box        — `<CustomerList>` or `<CustomerPage>` fills it
                       and scrolls itself;
     4. one link     — "All customers", from a person back to the
                       register, because the door on the dock is
                       behind the stage a person is standing on.

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
import { ArrowLeft, CaretLeft } from '@phosphor-icons/react'
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
  onClose: () => void
}

export function CustomerStage({
  customerId,
  onOpen,
  onOpenQuote,
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
        {/* BACK ONLY FROM A CUSTOMER, never from the register.
            Customers is one of the rail's four doors — you do not
            arrive at it FROM anywhere, so "Back" pointed at whatever
            happened to be open before and read as a control that had
            lost its place. The same fix the quotes list got. */}
        {openId ? (
          <button type="button" className="shell-view-back" onClick={onClose} aria-label="Back">
            <ArrowLeft size={ICON_SIZE.small} aria-hidden="true" />
            <span>Back</span>
          </button>
        ) : null}

        <p className="shell-view-what">
          <span className="shell-view-what-name">{openId ? 'Customer' : 'Customers'}</span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          {/* THE ASIDE SAYS WHAT SORT OF PLACE THIS IS, never what is
              in it — the rule ModuleStage's own aside was written
              from. The person's name is the page's business; the bar
              says the durable thing. */}
          <span className="shell-view-what-say">
            {openId ? 'the history with one of them' : 'the people you sell to'}
          </span>
        </p>

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
            onRemoved={() => onOpen(null)}
          />
        ) : (
          <CustomerList onOpen={(rowId) => onOpen(rowId)} openId={openId} />
        )}
      </div>
    </div>
  )
}
