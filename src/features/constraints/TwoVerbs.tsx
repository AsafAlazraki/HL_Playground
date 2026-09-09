/* ============================================================
   ONE DOOR, TWO VERBS.

   UX_PASS §11's first fix. Until this, a person with a rule in
   their head had to know which of two PLACES it belonged in
   before they could write it: Business rules, or Fitment. Audit
   finding 5 is what that costs — "motors must never exceed max HP"
   reads as a limit, sends you to Business rules, and there is no
   refusal sentence and no pointer to where it does live.

   The distinction is real and it is not going away: a limit has no
   output and can only ever be broken; a fit has no truth value and
   just produces rows. What was wrong was making it a NAVIGATION
   decision. It is a verb, so it is two words on one surface, each
   explained by what it makes rather than by what it is.

   THE COUNTS ARE COUNTED. Each card says how many of that kind
   this business has written, on this render, from the store.
   ============================================================ */

import type { ReactElement } from 'react'
import { ArrowRight, Funnel } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import './constraints.css'

export type Verb = 'limit' | 'fit'

export interface TwoVerbsProps {
  verb: Verb
  onPick: (verb: Verb) => void
  limits: number
  fits: number
  /** one of this business's own limits, said as a sentence — omitted
   *  when they have not written one, because a plausible example of a
   *  rule nobody wrote is how invented data gets on screen */
  limitExample?: string
  /** the same, for a fit */
  fitExample?: string
}

const n = (x: number): string => x.toLocaleString('en-AU')

export function TwoVerbs({
  verb,
  onPick,
  limits,
  fits,
  limitExample,
  fitExample,
}: TwoVerbsProps): ReactElement {
  const card = (
    id: Verb,
    icon: ReactElement,
    name: string,
    makes: string,
    count: number,
    example: string | undefined,
  ): ReactElement => (
    <button
      type="button"
      role="radio"
      aria-checked={verb === id}
      className={verb === id ? 'cn-door-card is-on' : 'cn-door-card'}
      onClick={() => onPick(id)}
    >
      <span className="cn-door-verb">
        {icon}
        {name}
        <span className="cn-door-n">{n(count)}</span>
      </span>
      <span className="cn-door-makes">{makes}</span>
      {example && <span className="cn-door-eg">{example}</span>}
    </button>
  )

  return (
    <div className="cn-door" role="radiogroup" aria-label="What kind of rule you are writing">
      {card(
        'limit',
        <Funnel size={ICON_SIZE.small} weight={weightFor(ICON_SIZE.small)} />,
        'A limit',
        'Checks every row and tells you which ones break it.',
        limits,
        limitExample,
      )}
      {card(
        'fit',
        <ArrowRight size={ICON_SIZE.small} weight={weightFor(ICON_SIZE.small)} />,
        'A fit',
        'Works out the pairs, and shows them where the thing is.',
        fits,
        fitExample,
      )}
    </div>
  )
}
