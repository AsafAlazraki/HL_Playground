/* ============================================================
   THE CATALOGUE OF STARTING POINTS — what the price file already
   asserts, offered as the first move of a sentence.

   It is drawn in the action bar's panel rather than on the page,
   because it is a way IN to the sentence and not a thing to read: the
   page below already carries the sixteen rules in full, with their
   evidence, under `RulesLedger`. Two copies of one list on one
   screen is the fault this app keeps catching in the price file
   itself.

   EVERY ROW IS PRESSABLE AND EVERY ROW ANSWERS. One that can point the
   sentence at its columns does so and the panel gets out of the way.
   One that cannot says WHY where it stands — `aria-disabled` and a
   live guard rather than the `disabled` attribute, which is the
   precedent `BandStrip` set in this codebase and the reason the
   sentence survives a Tab: a disabled control drops out of the tab
   order and takes its own explanation with it.
   ============================================================ */

import { useState } from 'react'
import type { ReactElement } from 'react'
import { kindLabel } from './columns'
import { offerKindWords, type StartingPoint } from './startingPoints'
import './constraints.css'

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many)

/** What this surface can do with the rule, in one phrase, computed. */
function stateWords(offer: StartingPoint): string {
  switch (offer.state) {
    case 'points': {
      const n = offer.columns.length
      return `Points at ${n} ${plural(n, 'column', 'columns')} on your ${kindLabel(offer.kinds[0])} tables`
    }
    case 'cross-kind':
      return `Spans ${offerKindWords(offer.kinds)}`
    default: {
      const n = offer.missing.length
      return `${n} ${plural(n, 'column', 'columns')} your sheet does not have`
    }
  }
}

export interface StartingPointListProps {
  offers: StartingPoint[]
  /** pointing the sentence at an offer's columns */
  onPick: (offer: StartingPoint) => void
}

export function StartingPointList({ offers, onPick }: StartingPointListProps): ReactElement {
  /* one reason open at a time — a panel of sixteen open explanations is
     a wall, and the question being asked is about one rule */
  const [why, setWhy] = useState<string | null>(null)

  return (
    <ul className="cn-offers">
      {offers.map((offer) => {
        const can = offer.state === 'points'
        const open = why === offer.seed.id
        return (
          <li key={offer.seed.id} className="cn-offer">
            <button
              type="button"
              className={can ? 'cn-offer-hit is-live' : 'cn-offer-hit'}
              aria-disabled={can ? undefined : true}
              aria-expanded={can ? undefined : open}
              onClick={() => (can ? onPick(offer) : setWhy(open ? null : offer.seed.id))}
            >
              <span className="cn-offer-ref">{offer.seed.ref}</span>
              <span className="cn-offer-says">{offer.seed.statement}</span>
              <span className="cn-offer-state">{stateWords(offer)}</span>
            </button>

            {open && offer.refusal !== null && (
              <div className="cn-offer-why">
                <p className="cn-offer-why-say">{offer.refusal}</p>

                {offer.missing.length > 0 && (
                  <ul className="cn-offer-gone">
                    {offer.missing.map((m) => (
                      <li key={`${m.kind}::${m.name}`} className="cn-offer-key">
                        {m.name}
                        <span className="cn-offer-key-on"> · {kindLabel(m.kind)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* THE ADJUDICATOR'S OWN LINE FOR A PERSON. `blocked` is
                    written for whoever will implement the missing piece;
                    this is the one sentence a sales manager can act on,
                    and it is verbatim from the seed. */}
                {offer.seed.plainly !== undefined && (
                  <p className="cn-offer-plainly">{offer.seed.plainly}</p>
                )}

                {/* WHERE IT IS ALREADY RUNNING. A rule the app enforces
                    somewhere else must not read as unprotected here. */}
                {offer.seed.enforcedIn !== undefined && (
                  <p className="cn-offer-where">Running today in {offer.seed.enforcedIn}</p>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
