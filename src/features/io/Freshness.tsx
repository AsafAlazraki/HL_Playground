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

   AND THE FAILURE IT CAUSED, WHICH WAS WORSE THAN THE ONE IT
   ANSWERS. Staleness was decided by comparing row counts, so
   ADDING ONE ROW raised this panel — which then printed "Nothing
   has been lost" over an offer to load the current example, and
   loading it would have destroyed the row that had just been
   typed. The verdict now comes from the fingerprint the browser
   was SEEDED with (`@/demos/seedStamp`) and an edit cannot reach
   it. Whoever changes the detection reads that file first.

   FOUR PARTS, IN THE ORDER EVERY EMPTY STATE IN THIS APP USES:
   what sort of thing this is, what it IS in the dealer's words,
   what you already have counted from the store, and one action.
   The count is the load-bearing line: "Yamaha Outboards holds 43
   of 83" is the sentence that turns "my data reverted" into "this
   is an older copy", and it is read, never written.

   THE OFFER CANNOT COST ANYBODY THEIR WORK. It used to hand off
   to `window.confirm`; it now asks the house question, states the
   blast radius counted from the store, and leads with the answer
   a native dialog had no room for — SAVE A COPY FIRST, which
   writes the sheet to a file before the replace happens. Keeping
   the old copy is still a real answer and is drawn as one; an
   older example is a perfectly good thing to be looking at, and
   a person who chose it is not asked again (the choice is
   recorded against the version it was about).

   IT KNOWS NOTHING ABOUT ANY PARTICULAR EXAMPLE. Every string it
   prints about the set is handed to it: the set's name, the tables
   that differ and their two figures. Marine content lives in
   src/demos and this file is free of it, so a pharmacy's own
   starting set gets the same sentence with its own nouns in it.
   ============================================================ */

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import type { JSX } from 'react'
import { FALLBACK_FLOOR, floorAbove } from '@/lib/noteFloor'
import { ConfirmFacts, ConfirmSheet } from '@/features/designer/ConfirmSheet'
import { nextCopyName, saveCopyOfSheet } from './saveCopy'
import { sheetFacts, sheetNow } from './sheetNow'
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
  /** put the current copy of the set on the sheet. The caller does the
   *  load and nothing else — every question in front of it, including
   *  saving a copy of what is about to be replaced, is asked here. */
  onLoadCurrent: () => void
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
  onLoadCurrent,
  onDismiss,
}: FreshnessProps): JSX.Element {
  const [asking, setAsking] = useState(false)

  /* ============================================================
     THE FLOOR IS MEASURED, NOT CHOSEN — src/lib/noteFloor.ts.

     This card sat at a hardcoded `bottom: 96px`, a number that
     cleared the floating dock. The dock is gone: navigation is a
     persistent rail down the left now (app/SideNav.tsx), so 96px
     is 96px of air on most screens and still not enough on the
     one stage that parks an action bar over its floor. It is the
     mistake `noteFloor.ts` was extracted to stop repeating, and
     the two-tab notice in the opposite corner had already been
     moved onto the measurement while this one was left behind —
     two notices, same job, two different arithmetics.

     Everything that must not be covered declares
     `[data-note-clear]`; this floors itself above all of it, and
     the next instrument to park over a page costs one attribute
     and no arithmetic here.
     ============================================================ */
  const [floor, setFloor] = useState(0)
  const remeasure = useCallback(() => setFloor(floorAbove()), [])
  useLayoutEffect(() => {
    remeasure()
  }, [remeasure])
  useEffect(() => {
    window.addEventListener('resize', remeasure)
    return () => window.removeEventListener('resize', remeasure)
  }, [remeasure])
  const lift = { bottom: `${floor > 0 ? floor + 16 : FALLBACK_FLOOR + 16}px` }

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
    <>
      <div className="io-fresh" style={lift} role="status" aria-live="polite">
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
          <button type="button" className="io-fresh-go" onClick={() => setAsking(true)}>
            Load the current example
          </button>
          <button type="button" className="io-fresh-keep" onClick={onDismiss}>
            Keep this one
          </button>
        </div>
        {/* THE BLAST RADIUS STAYS — it is the one thing a person cannot
            read off the two buttons, and §7 requires it before a
            destructive act. The reassurance about the copy is on the
            confirm sheet's own choice, where the copy is actually
            offered, so it is not said twice. */}
        <p className="io-fresh-foot">Loading replaces this sheet.</p>
      </div>

      {asking ? (
        <ConfirmSheet
          eyebrow="Load the current example"
          question={`Put the current “${setName}” on the sheet instead of this copy?`}
          choices={[
            {
              label: 'Save a copy, then load',
              note: `Writes ${nextCopyName()} to your downloads first.`,
              onPick: () => {
                saveCopyOfSheet(true)
                setAsking(false)
                onLoadCurrent()
              },
            },
            {
              label: 'Load without saving',
              note: 'Anything typed into this copy is gone for good.',
              destructive: true,
              onPick: () => {
                setAsking(false)
                onLoadCurrent()
              },
            },
          ]}
          onCancel={() => setAsking(false)}
        >
          <ConfirmFacts items={sheetFacts(sheetNow())} />
        </ConfirmSheet>
      ) : null}
    </>
  )
}
