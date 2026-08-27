/* ============================================================
   HISTORY, AS ONE DOOR.

   Two screens, one place: the diary of every quote, and one
   customer's own page. They are the same question at two altitudes,
   and a person moves between them constantly — "who did this go
   to?" then "what else have we sent them?" then back — so they share
   a stage rather than being two entries on the rail.

   WHY THE SWITCH LIVES HERE AND NOT IN THE SHELL. The shell would
   need a second route, a second remembered id and a back button of
   its own; this needs one piece of state. Neither screen knows the
   other exists — `QuoteHistory` takes an `onOpenCustomer` and
   `CustomerHistory` takes an `onBack`, and this is the twenty lines
   that tie the two callbacks together. A stage that wants only the
   diary, or only one customer, mounts that one directly.

   IT NEVER OPENS A QUOTE ITSELF. `onOpenQuote` goes straight out to
   the caller, because a quote belongs on the quote stage and this
   feature has no business drawing a document.
   ============================================================ */

import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { CustomerHistory } from './CustomerHistory'
import { QuoteHistory } from './QuoteHistory'

export interface HistoryStageProps {
  /** open one quote — on the quote stage, which this feature does
   *  not own and does not draw */
  onOpenQuote: (quoteId: string) => void
  /** the quote the stage already has open, so its row can say so */
  openId?: string | null
  /**
   * Land on one customer rather than on the diary — what a "their
   * history" control elsewhere in the app would pass. Changing it
   * moves the stage; clearing it returns to the diary.
   */
  customerId?: string | null
}

export function HistoryStage({
  onOpenQuote,
  openId,
  customerId,
}: HistoryStageProps): ReactElement {
  const [focus, setFocus] = useState<string | null>(customerId ?? null)

  /* The prop is the caller's instruction and it wins whenever it
     changes — including when it clears. Internal state exists so the
     back button and the "their history" link work without asking the
     shell to hold a second id. */
  useEffect(() => {
    setFocus(customerId ?? null)
  }, [customerId])

  if (focus !== null && focus !== '') {
    return (
      <CustomerHistory
        rowId={focus}
        onOpenQuote={onOpenQuote}
        onBack={() => setFocus(null)}
      />
    )
  }

  return (
    <QuoteHistory
      onOpenQuote={onOpenQuote}
      openId={openId}
      onOpenCustomer={(rowId) => setFocus(rowId)}
    />
  )
}
