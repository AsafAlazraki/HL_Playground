/* ============================================================
   WHAT THE DASHBOARD CAN DO, AND WHO ACTUALLY DOES IT.

   Ten verbs, and the dashboard performs none of them. Every one
   is handed in by the shell, because every one is a NAVIGATION —
   "put this on the screen" — and where a thing goes on the
   screen is the shell's business and never a feature's. That is
   the same arrangement `SideNav` makes (its eleven props are the
   same list, one door short) and it is what lets this whole
   feature be tested and read without a router.

   IT IS ONE INTERFACE RATHER THAN TEN PROPS SO THAT A CARD CAN
   BE HANDED THE WHOLE SET. Each card body needs two or three of
   them; threading them individually through a switch would be
   forty props that all mean "go there".

   NOTHING HERE WRITES. No verb on this page changes the price
   file, so the dashboard needs no undo of its own for anything
   except its own arrangement — which is where the only UNDO in
   this feature is, and why.
   ============================================================ */

export interface DashboardActs {
  /** open one table as a page */
  onOpenTable: (entityId: string) => void
  /** open one module — a place in the business */
  onOpenModule: (moduleId: string) => void
  /** the dashboard OF modules, which is where a new one is made */
  onOpenModules: () => void
  /** open one quote, draft or document */
  onOpenQuote: (quoteId: string) => void
  /** every quote raised here */
  onOpenQuotes: () => void
  /** the customer register */
  onOpenCustomers: () => void
  /** the rules a dealer has written */
  onOpenRules: () => void
  /** the drawing — the app's one permanent surface */
  onOpenDataModel: () => void
  /** the picker that starts a quote. A quote is minted from the
   *  row being sold, so this can never mean "create empty".
   *
   *  The optional module is WHERE to start: a quick action on a
   *  brand's tile knows the answer to the picker's first question
   *  and passing it saves asking. Omitted, the picker opens on the
   *  grid of places, which is what the rail's New quote does. */
  onNewQuote: (moduleId?: string) => void
  /** the finder */
  onFind: () => void
}
