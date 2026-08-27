/* ============================================================
   THE DASHBOARD — the front door, arranged by the person behind it.

   MOUNTING IT (the whole job):

     import { Dashboard } from '@/features/dashboard'
     import { currentUser } from '@/features/auth/session'

     const user = currentUser()
     ...
     {user ? (
       <Dashboard
         user={user}
         onOpenTable={(id) => setStage({ kind: 'table', entityId: id })}
         onOpenModule={(id) => setStage({ kind: 'module', moduleId: id })}
         onOpenModules={() => setStage({ kind: 'module', moduleId: null })}
         onOpenQuote={(id) => setStage({ kind: 'quote', quoteId: id })}
         onOpenQuotes={() => setStage({ kind: 'quote', quoteId: null })}
         onOpenCustomers={() => setStage({ kind: 'customer', customerId: null })}
         onOpenRules={() => setStage({ kind: 'rules' })}
         onOpenDataModel={() => setStage(null)}
         onNewQuote={() => setStarting(true)}
         onFind={() => setFinding(true)}
       />
     ) : null}

   It fills whatever box it is put in, scrolls itself, and brings
   its own stylesheet. It takes no other prop. Every one of the
   ten verbs is a NAVIGATION and the dashboard performs none of
   them itself — see acts.ts.

   ---------------------------------------------------------------
   THE INVARIANT, so a reviewer can check it in one grep

     NOTHING ON THIS PAGE IS A STORED FIGURE.

   `arrangement.ts` persists two ordered lists and a boolean, and
   holds no count of anything. Every number drawn is computed at
   paint by a pure function in `cards.ts` from the project store,
   the quote registry, the lint engine and the rule register. If
   that holds, nothing here can go stale, and nothing here can be
   invented.

   ---------------------------------------------------------------
   WHAT THIS FEATURE NEEDS FROM THE ORCHESTRATOR

   1. TO BE WHAT A PERSON LANDS ON AFTER SIGN-IN, with the table
      gallery moving under DATA. `SideNav`'s "Home" row already
      points at `{ kind: 'home' }`; what that stage draws is the
      one line that has to change.

   2. NOTHING ELSE. It creates no table, writes no row, and adds
      no key to `ProjectExport`. The arrangement is a person's
      preference and deliberately does NOT travel in a saved copy
      of the project — see the header of arrangement.ts.

   A LATER MOVE THAT WOULD COST ONE IMPORT PATH: if a `dashboards`
   slice ever lands on the store + Dexie, `readArrangement` /
   `writeArrangement` are the two functions to re-point, and
   nothing above them changes. They are already the only two
   places in this feature that touch storage.
   ============================================================ */

export { Dashboard } from './Dashboard'
export type { DashboardProps } from './Dashboard'
export type { DashboardActs } from './acts'

/* -- the persistence, and the pure operations over it -------- */
export {
  CARD_IDS,
  DEFAULT_CARDS,
  DEFAULT_LINKS,
  LINK_LIMIT,
  PLAIN_LINK_KINDS,
  cardsNotPlaced,
  defaultArrangement,
  forgetArrangements,
  hasLinkTo,
  isCardId,
  keyFor,
  moveItem,
  parseArrangement,
  readArrangement,
  sameTarget,
  setArrangement,
  useArrangement,
  withCardAdded,
  withCardRemoved,
  withCardsMoved,
  withLinkAdded,
  withLinkRemoved,
  withLinkRenamed,
  withLinksMoved,
  writeArrangement,
} from './arrangement'
export type {
  Arrangement,
  ArrangementApi,
  CardId,
  LinkKind,
  LinkTarget,
  QuickLink,
  Who,
} from './arrangement'

/* -- what each card is, and the arithmetic behind it --------- */
export {
  CARDS,
  LENS_NAME,
  LENS_NONE,
  QUOTE_LENSES,
  biggestTables,
  byCustomer,
  countLenses,
  lensHolds,
  quotesUnder,
  fileTally,
  firstName,
  greeting,
  isStockTable,
  moduleRows,
  plural,
  resolveRecent,
  rollFindings,
  rollQuotes,
  rollRules,
} from './cards'
export type {
  CardMeta,
  CustomerBand,
  FileTally,
  FindingRoll,
  ModuleRow,
  QuoteRoll,
  ResolvedRecent,
  QuoteLens,
  RuleRoll,
  TableRow,
} from './cards'

/* -- resolving a stored link against the project as it stands - */
export { BAND_NAME, linkOffers, resolveLink, resolveLinks } from './links'
export type { LinkMark, LinkOffer, ResolvedLink, ResolvedLinks } from './links'

/* -- the one gesture ----------------------------------------- */
export { previewOrder, slotAt, useReorder } from './reorder'
export type { Rect, ReorderApi, ReorderOptions } from './reorder'
