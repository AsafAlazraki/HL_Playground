/* ============================================================
   ONE PAGE HEADER, FOR EVERY PAGE.

   THE FAULT THIS FIXES. Five surfaces, five headers, five
   different spacings. Measured before this existed:

     Modules      a 64px hero over an eyebrow, 24px gutters
     Dashboard    a 44px greeting over a date stamp, 32px gutters
     Pipeline     a 20px heading beside a count, 32px gutters
     Admin        a 52px hero, 24px gutters
     Customers    no header at all — the page began with a card

   Every one was defensible on its own screen and together they
   read as five applications. A person moving between them re-finds
   the title, the actions and the filters each time, because none
   of the three is ever in the same place twice.

   THE ANATOMY, and it is fixed:

     eyebrow    what KIND of page this is. Uppercase is legal here
                and only here (§3: a label, never a name).
     name       what this page IS. One line, one size.
     line       one sentence, optional, and never two.
     acts       what you can do to the whole page, top right.
     tools      the page's own filters and search, on their own row
                beneath — because a filter is about the CONTENTS
                and the header is about the page.

   WHAT IT DOES NOT DO. It does not scroll, it does not carry a
   back button (the rail is how you move between pages, and a stage
   that is genuinely nested draws its own return), and it never
   holds two sentences. The prose budget starts here.
   ============================================================ */

import type { JSX, ReactNode } from 'react'
import { SectionHead } from '@/ui'

export interface PageHeadProps {
  /** what kind of page this is — "YOUR BUSINESS", "SELLING".
   *  Optional, and drawn uppercase because it is a label. */
  eyebrow?: string
  /** what this page is. The one thing that is never optional. */
  name: string
  /** one sentence. Two is a paragraph and belongs somewhere else. */
  line?: string
  /** a counted fact drawn beside the name — "25 places", "3 quotes".
   *  Mono and tabular, because it is a figure. */
  count?: ReactNode
  /** what can be done to the whole page. Top right, at the name's
   *  own optical line. */
  acts?: ReactNode
  /** filters, search, view switches — the page's own row beneath
   *  the header, drawn only when there is something in it. */
  tools?: ReactNode
  /** a quieter, shorter header for a page that is mostly content —
   *  the catalogue, a table. Same anatomy, less air. */
  tight?: boolean
  /* ============================================================
     THE PAGE WHOSE NAME IS THE ONLY HEADLINE ON IT.

     page.css argues at length why this head takes the TITLE step
     and not a display one, and it is right about the screens it
     measured: on Modules, `.ph-name` at 30.72px outranked the
     twenty-five brand names at 26.88 — "the application talking
     about itself, louder than the business's own data".

     ADMIN HAS NO SUCH SUBJECT. It is four settings; its largest
     value is a sentence in a text field. With the head at the title
     step the whole screen measured 2.18x scale contrast, under
     Cockpit's 2.5-3.2x band, because nothing on it was allowed to
     be large — chrome least of all.

     So this is opt-in and it is NOT a size: it is the claim that
     this page has no subject that should outrank its name. Never
     set it on a page that lists the business's own things.
     ============================================================ */
  lead?: boolean
}

export function PageHead({
  eyebrow,
  name,
  line,
  count,
  acts,
  tools,
  tight = false,
  lead = false,
}: PageHeadProps): JSX.Element {
  return (
    <>
      <header className={`ph${tight ? ' is-tight' : ''}${lead ? ' is-lead' : ''}`}>
        <div className="ph-say">
          {/* THE EYEBROW IS THE SYSTEM'S ONE UPPERCASE STYLE, drawn by the
              primitive that owns it. It is `level="none"`: the `h1` two
              lines down is the heading here, and a second heading naming
              the KIND of page above the one naming the page would be the
              outline this header exists to stop. */}
          {eyebrow ? <SectionHead level="none">{eyebrow}</SectionHead> : null}
          <div className="ph-line-1">
            <h1 className="ph-name">{name}</h1>
            {count !== undefined ? <span className="ph-count ds-mono">{count}</span> : null}
          </div>
          {line ? <p className="ph-line">{line}</p> : null}
        </div>
        {acts ? <div className="ph-acts">{acts}</div> : null}
      </header>
      {tools ? <div className={`ph-tools${tight ? ' is-tight' : ''}`}>{tools}</div> : null}
    </>
  )
}
