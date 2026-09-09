/* ============================================================
   SECTION HEAD — the component. The measurement (105 uppercase
   treatments across 22 app stylesheets, 11 font-sizes and 16
   letter-spacings for a style the system defines exactly once) is
   in section-head.css.

   IT IS A HEADING BY DEFAULT. A section caption is the thing a
   screen-reader user navigates a long screen by; drawing it as a
   <div> because it is small text is how a stage of forty bands
   becomes one undifferentiated wall. `level` chooses h2/h3/h4,
   and `'none'` is available for the case where the caption is
   genuinely not a heading — a group caption inside a card that
   already has one.

   THE CASE IS NOT CHANGED IN JAVASCRIPT. The uppercase is
   `text-transform` in CSS, so the real string stays in the DOM
   and `getByRole('heading', { name: 'Hull only pricing' })`
   finds it. Rule 3 calls uppercasing content lossy; doing it in
   CSS is the version that is not.

   THE COUNT IS THE CALLER'S SENTENCE, not a number this component
   formats. §6: use the dealer's nouns — "40 boats in 3 series",
   not "40 ROWS". The row noun comes from the table, so a
   motorcycle shop reads "40 bikes" for free, and that is a fact
   only the caller has.

   NO `className`, NO `style` — see Button.tsx for why that is the
   mechanism and not the manners.
   ============================================================ */

import type { ReactNode } from 'react'
import './section-head.css'

export type SectionHeadLevel = 'h2' | 'h3' | 'h4' | 'none'

export interface SectionHeadProps {
  /** The caption, in its real case. CSS uppercases it; nothing
      here touches the string. */
  children: ReactNode
  /** What the section holds, in the dealer's nouns — "40 boats",
      "3 open drafts". Drawn as a value, so it is not uppercased. */
  count?: ReactNode
  /** Controls belonging to this section, at the end of the line. */
  action?: ReactNode
  /** Heading level, or 'none' for a caption that is genuinely not
      a heading in the document outline. */
  level?: SectionHeadLevel
  /** A hairline filling the width between the caption and the
      action. Decorative and aria-hidden. */
  rule?: boolean
  id?: string
}

export function SectionHead({
  children,
  count,
  action,
  level = 'h3',
  rule = false,
  id,
}: SectionHeadProps) {
  const caption =
    level === 'none' ? (
      <span className="ui-section-caption">{children}</span>
    ) : level === 'h2' ? (
      <h2 className="ui-section-caption">{children}</h2>
    ) : level === 'h4' ? (
      <h4 className="ui-section-caption">{children}</h4>
    ) : (
      <h3 className="ui-section-caption">{children}</h3>
    )

  return (
    <div className="ui-section" id={id}>
      {caption}
      {count === undefined ? null : <span className="ui-section-count">{count}</span>}
      {rule ? <span className="ui-section-rule" aria-hidden="true" /> : null}
      {action ? <span className="ui-section-action">{action}</span> : null}
    </div>
  )
}
