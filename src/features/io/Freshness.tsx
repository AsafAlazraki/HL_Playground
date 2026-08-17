/* ============================================================
   IS THIS COPY OF THE EXAMPLE THE CURRENT ONE?

   THE FAILURE THIS ANSWERS is not a bug, which is exactly why it
   needs a screen. This app is local-first: the sheet lives in the
   browser's own storage and is hydrated on load. So somebody who
   loaded the example weeks ago opens the app and gets THAT copy —
   21 tables, 43 Yamahas — while a browser seeded today holds 25
   base tables and 83. Nothing was lost and nothing is broken, and
   it reads exactly like data reverting. It has already convinced
   the owner of this repository once, and a stakeholder would have
   less reason to doubt it.

   FOUR PARTS, IN THE ORDER EVERY EMPTY STATE IN THIS APP USES:
   what sort of thing this is, what it IS in the dealer's words,
   what you already have counted from the store, and one action.
   The count is the load-bearing line: "Yamaha Outboards holds 43
   of 83" is the sentence that turns "my data reverted" into "this
   is an older copy", and it is read, never written.

   THE OFFER IS NON-DESTRUCTIVE AND SAYS SO. Pressing it goes
   through the same guard every prepared set goes through, which
   names what is on the sheet now and asks before replacing it.
   Keeping the old copy is a real answer and is drawn as one — an
   older example is a perfectly good thing to be looking at, and
   a person who chose it should not be asked twice.

   IT KNOWS NOTHING ABOUT ANY PARTICULAR EXAMPLE. Every string it
   prints is handed to it: the set's name, the tables that differ
   and their two figures. Marine content lives in src/demos and
   this file is free of it, so a pharmacy's own starting set gets
   the same sentence with its own nouns in it.
   ============================================================ */

import type { JSX } from 'react'
import './io.css'

export interface FreshnessProps {
  /** the prepared set this sheet came from, by its own name */
  setName: string
  /** tables the current set carries that this sheet has not got */
  missing: string[]
  /** tables this sheet holds at a different size */
  resized: { name: string; has: number; wants: number }[]
  /** the current set brings places to the dashboard and this has none */
  noModules: boolean
  /** how many places the current set would put on the dashboard */
  moduleCount: number
  /** load the current copy — asks before it replaces anything */
  onRefresh: () => void
  onDismiss: () => void
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`

export function Freshness({
  setName,
  missing,
  resized,
  noModules,
  moduleCount,
  onRefresh,
  onDismiss,
}: FreshnessProps): JSX.Element {
  /* WHAT DIFFERS, COUNTED, AT MOST THREE THINGS. A list of every
     table that moved would be the diff and not the answer; the
     question a person is asking is "is this the same file", and two
     examples plus a total answers it. */
  const facts: string[] = []
  if (missing.length > 0) {
    facts.push(
      `${plural(missing.length, 'table', 'tables')} it carries ${
        missing.length === 1 ? 'is' : 'are'
      } not here — ${missing.slice(0, 2).join(', ')}${missing.length > 2 ? ' and others' : ''}`,
    )
  }
  if (resized.length > 0) {
    const first = resized[0]
    facts.push(
      `${first.name} holds ${first.has} of ${first.wants}${
        resized.length > 1
          ? `, and ${plural(resized.length - 1, 'other table differs', 'other tables differ')}`
          : ''
      }`,
    )
  }
  if (noModules && moduleCount > 0) {
    facts.push(
      `it now arrives with ${plural(moduleCount, 'place', 'places')} on the dashboard, and this copy has none`,
    )
  }

  return (
    <div className="io-fresh" role="status" aria-live="polite">
      <span className="mono-label io-fresh-eyebrow">An older copy</span>
      <p className="io-fresh-say">
        This browser is showing a copy of “{setName}” that was loaded before the
        current one. Nothing has been lost — the example itself has moved on
        since, and your machine kept what it was given.
      </p>
      {facts.length > 0 ? (
        <p className="io-fresh-facts">
          {/* each fact is its own line and therefore its own sentence */}
          {facts.map((f) => (
            <span className="io-fresh-fact" key={f}>
              {f.charAt(0).toUpperCase() + f.slice(1)}.
            </span>
          ))}
        </p>
      ) : null}
      <div className="io-fresh-acts">
        <button type="button" className="io-fresh-go" onClick={onRefresh}>
          Load the current example
        </button>
        <button type="button" className="io-fresh-keep" onClick={onDismiss}>
          Keep this one
        </button>
      </div>
      <p className="io-fresh-foot">
        Loading it replaces what is on the sheet now, and asks first.
      </p>
    </div>
  )
}
