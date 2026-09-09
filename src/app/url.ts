/* ============================================================
   THE ADDRESS OF THE PLACE YOU ARE IN.

   Shell.tsx's header said, for months: "ROUTING, in full: nothing
   named and nothing drawn → onboarding. Otherwise → the
   configurator. There is no router, no URL and no third state."
   That was true and it was measured again on 2026-09-09, at 1280 x
   800 on the real seed: sign in, press Quotes, press Data, open
   Boats — `location.href` is `http://localhost:5101/` at every one
   of those, `history.length` never moves, and pressing Back leaves
   the application entirely and lands on whatever the tab was
   showing before it. PHASE_TWO §6 phase 7 is the last unbuilt
   phase, and this is it.

   THIS IS THE SMALLEST HONEST ROUTER, and the two words are doing
   work.

     SMALLEST — it adds no dependency, owns no navigation and
     replaces nothing. Shell.tsx's stage model already decides
     where a person goes; this file only writes down where they
     ARE and reads it back. `history.pushState`, `popstate`,
     `URLSearchParams`: three browser primitives, no library.

     HONEST — every address it writes, it can read; every address
     it reads, it can write. `queryFor` and `placeFor` are each
     other's inverse, and the test beside this file walks all
     seventeen places through both directions rather than trusting
     the claim.

   THE URL NAMES THE WINDOW, AND `winKey` IS WHAT A WINDOW IS.

   That one rule decides everything that follows, including the
   four things that did NOT become linkable. `winKit.tsx:154`
   already answers "when are two stages the same place?" — two
   presses on Boats raise one window, and the module TAB, the row
   open inside a module and the panel showing in Admin are all
   deliberately excluded from that key because they are positions
   INSIDE a place rather than places. An address that carried one
   of them would be an address for something that is not a window:
   Back would move the URL and not the screen, the effect in
   Shell.tsx would see the two disagree and push a correction, and
   Forward would be destroyed by a keystroke nobody pressed. So
   the addressable set is exactly the set of distinct windows, and
   `queryFor` is one-to-one with `winKey` by construction. The
   test asserts that, place by place, so the two cannot drift.

   TWO KEYS, AND IT OWNS NO OTHERS. `?at=` names the place and
   `?id=` names its subject:

     /                            home — the day
     ?at=drawing                  the sheet, under every window
     ?at=tables                   all tables
     ?at=table&id=<entity>        one register
     ?at=goes-with&id=<entity>    what goes with each one
     ?at=columns&id=<entity>      the columns of one table
     ?at=configure                Configure, before a table is chosen
     ?at=configure&id=<entity>    Configure, on one table
     ?at=rules                    business rules
     ?at=fitment                  what fits what
     ?at=quotes                   every quote
     ?at=quote&id=<quote>         one quote
     ?at=new-quote                what are you quoting
     ?at=modules                  every module
     ?at=module&id=<module>       one module
     ?at=customers                the register of people
     ?at=customer&id=<customer>   one person
     ?at=history                  the diary
     ?at=data                     the shape of what you sell
     ?at=admin                    the organisation

   THE WORDS ARE THE APP'S OWN WORDS, not the union's. The stage
   kinds are `gallery`, `levels`, `design`, `flow`, `start` and
   `view`; the dock and `winTitle` call those places All tables,
   Configure, Columns, Fitment, New quote and What goes with each
   one, and commit 4c4a3e2 already ruled that the dock's nouns are
   canonical. An address is chrome a person reads and sometimes
   types, so it says `?at=fitment`, never `?at=flow`.

   CONFIGURATOR_PLAYBOOK.md:364 WANTS `?quote=1042&fix=…&from=…`
   and this writes `?at=quote&id=1042`. The deviation is deliberate
   and it is one rule against twenty: a bespoke key per place is
   twenty spellings to keep in step, and the two the playbook is
   really asking for — Cancel is a navigation, Back and refresh
   both work, the sheet is pasteable into a message — are
   properties of having an address at all, not of its spelling.
   `fix` and `from` are the cascade sheet's own state and are NOT
   handled here; when that sheet is built they are added to this
   file, which is the one place that knows what a URL means. Until
   then this router rewrites the whole query, so a param it has
   never heard of does not survive a navigation. Said out loud
   because it is the seam somebody will meet.
   ============================================================ */

import type { Stage } from './winKit'

/** WHERE THE APP IS, as the URL says it.
 *
 *  `stage: null` is THE DRAWING — the surface under every window,
 *  which is a place a person can be and the only one that is not a
 *  window. Shell.tsx's `setStage(null)` means exactly this and has
 *  since before there was a URL to say it in. */
export interface Place {
  stage: Stage | null
}

/* the two keys this router owns, written once so the reader and
   the writer cannot disagree about their names */
const AT = 'at'
const ID = 'id'

/** One place, as a query string. `URLSearchParams` rather than
 *  string concatenation because ids are `nanoid(10)` today and a
 *  hand-made one tomorrow, and an id with a `&` in it must not be
 *  able to invent a second parameter. */
function query(at: string, id?: string | null): string {
  const q = new URLSearchParams()
  q.set(AT, at)
  if (id) q.set(ID, id)
  return `?${q.toString()}`
}

/** THE ADDRESS OF A PLACE. `''` for home, deliberately: the front
 *  door of the application is `/` and not `/?at=home`, so a link
 *  to the app and a link to what a person sees on arrival are the
 *  same link. */
export function queryFor(stage: Stage | null): string {
  if (stage === null) return query('drawing')
  switch (stage.kind) {
    case 'home':
      return ''
    case 'gallery':
      return query('tables')
    /* the diary carries a customer in the union and NOT in the
       address, because `winKey` collapses both to one window —
       see the header */
    case 'history':
      return query('history')
    case 'levels':
      return query('configure', stage.entityId)
    case 'table':
      return query('table', stage.entityId)
    case 'view':
      return query('goes-with', stage.entityId)
    case 'design':
      return query('columns', stage.entityId)
    case 'rules':
      return query('rules')
    case 'flow':
      return query('fitment')
    case 'quote':
      return stage.quoteId ? query('quote', stage.quoteId) : query('quotes')
    /* the TAB is not in the address, for the reason in the header:
       `winKey` deliberately makes every tab of one module one
       window, and an address for something that is not a window
       fights Back */
    case 'module':
      return stage.moduleId ? query('module', stage.moduleId) : query('modules')
    case 'customer':
      return stage.customerId
        ? query('customer', stage.customerId)
        : query('customers')
    /* `start.at` — the place the picker opens standing in — is
       collapsed by `winKey` the same way, so it is not addressed */
    case 'start':
      return query('new-quote')
    case 'data':
      return query('data')
    case 'admin':
      return query('admin')
  }
}

/** Home, fresh each time. Never a shared constant: a `Stage` ends
 *  up inside `Shell`'s window array, and one object in two windows
 *  is the kind of thing that is fine until it is not. */
const home = (): Place => ({ stage: { kind: 'home' } })

/** WHAT AN ADDRESS MEANS. Total, and it never throws: a person can
 *  type anything into an address bar, and a paste that lost its
 *  tail is the commonest thing that arrives here.
 *
 *  ANYTHING UNREADABLE IS HOME, including a place that needs a
 *  subject and was given none — `?at=quote` with no id is not the
 *  quotes list, it is a broken link to one quote, and answering it
 *  with the front door is the one response that is never wrong.
 *  The address is then corrected in place by `correctAddress`, so
 *  a bad link self-heals into a good one rather than sitting in
 *  the bar disagreeing with the screen. */
export function placeFor(search: string): Place {
  const q = new URLSearchParams(search)
  const id = q.get(ID)
  switch (q.get(AT)) {
    case 'drawing':
      return { stage: null }
    case 'tables':
      return { stage: { kind: 'gallery' } }
    case 'history':
      return { stage: { kind: 'history', customerId: null } }
    /* the one place whose subject is genuinely optional — Configure
       opens on its own picker when no table has been chosen yet
       (Shell.tsx:403-407 says the same thing from the other side) */
    case 'configure':
      return { stage: { kind: 'levels', entityId: id } }
    case 'table':
      return id ? { stage: { kind: 'table', entityId: id } } : home()
    case 'goes-with':
      return id ? { stage: { kind: 'view', entityId: id } } : home()
    case 'columns':
      return id ? { stage: { kind: 'design', entityId: id } } : home()
    case 'rules':
      return { stage: { kind: 'rules' } }
    case 'fitment':
      return { stage: { kind: 'flow' } }
    case 'quotes':
      return { stage: { kind: 'quote', quoteId: null } }
    case 'quote':
      return id ? { stage: { kind: 'quote', quoteId: id } } : home()
    case 'modules':
      return { stage: { kind: 'module', moduleId: null } }
    case 'module':
      return id ? { stage: { kind: 'module', moduleId: id } } : home()
    case 'customers':
      return { stage: { kind: 'customer', customerId: null } }
    case 'customer':
      return id ? { stage: { kind: 'customer', customerId: id } } : home()
    case 'new-quote':
      return { stage: { kind: 'start', at: null } }
    case 'data':
      return { stage: { kind: 'data' } }
    case 'admin':
      return { stage: { kind: 'admin' } }
    default:
      return home()
  }
}

/** WHAT THE HISTORY ENTRY IS CALLED. Every entry said "HelmLogic —
 *  Dynamic Config" until this existed, which makes the Back
 *  button's long-press menu a column of one repeated word — a list
 *  of places nobody can tell apart is only half an address.
 *
 *  It is the PLACE and not its subject: the subject's name lives in
 *  a registry this file deliberately does not read (`quotes.ts`,
 *  `modules`, the store), and `winTitle` — which does resolve them
 *  — hands back a ReactNode with an icon in it, which is not a
 *  title. The nouns below are that function's, word for word, so
 *  the switcher and the browser cannot call one place two things. */
export function titleFor(stage: Stage | null): string {
  const name = (): string => {
    if (stage === null) return 'The drawing'
    switch (stage.kind) {
      case 'home':
        return 'Home'
      case 'gallery':
        return 'All tables'
      case 'history':
        return 'History'
      case 'levels':
        return 'Configure'
      case 'table':
        return 'Table'
      case 'view':
        return 'What goes with each one'
      case 'design':
        return 'Columns'
      case 'rules':
        return 'Business rules'
      case 'flow':
        return 'Fitment'
      case 'quote':
        return stage.quoteId ? 'Quote' : 'Quotes'
      case 'module':
        return stage.moduleId ? 'Module' : 'Modules'
      case 'customer':
        return stage.customerId ? 'Customer' : 'Customers'
      case 'start':
        return 'New quote'
      case 'data':
        return 'Data'
      case 'admin':
        return 'Admin'
    }
  }
  return `${name()} · HelmLogic`
}

/** The whole address, so a deployment under a sub-path keeps its
 *  path and an anchor somebody put in the bar survives a move. */
const href = (q: string): string =>
  `${window.location.pathname}${q}${window.location.hash}`

/** WHERE THE URL SAYS WE ARE, right now. Read live rather than
 *  captured at module load, because the shell can mount more than
 *  once in one document — sign out, sign back in — and the honest
 *  answer to "where am I" is the address as it stands, not the
 *  address the tab was opened with. */
export const placeNow = (): Place => placeFor(window.location.search)

/** THE CANONICAL SPELLING, PUT BACK IN THE BAR WITHOUT A NEW
 *  HISTORY ENTRY.
 *
 *  `?at=quote` with no id, `?at=nonsense`, a stray `&utm_source` —
 *  all of them read as some place, and the address should say the
 *  place it was read as. `replaceState`, never `pushState`: this
 *  runs on load and on every Back, and a push here would leave a
 *  forward entry a person did not make and destroy the one they
 *  were walking towards. */
export function correctAddress(): void {
  const want = queryFor(placeNow().stage)
  if (want === window.location.search) return
  window.history.replaceState(null, '', href(want))
}

/** MOVING. The push is skipped when the address already says this,
 *  which is what makes Back and Forward free of a fight: a
 *  `popstate` sets the stage the address already names, so by the
 *  time this runs the two agree and there is nothing to write.
 *  That guard is only sound because `queryFor` is one-to-one with
 *  `winKey` — see the header.
 *
 *  IT TAKES THE TWO STRINGS AND NOT THE STAGE, so the caller can
 *  compute both during render and hand this an effect whose
 *  dependencies are exactly what it reads. A `Stage` object in the
 *  dependency list would be an identity the shell does not promise
 *  and the linter cannot check. */
export function showPlace(address: string, title: string): void {
  document.title = title
  if (address === window.location.search) return
  window.history.pushState(null, '', href(address))
}
