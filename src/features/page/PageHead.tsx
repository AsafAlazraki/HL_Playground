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
}

export function PageHead({
  eyebrow,
  name,
  line,
  count,
  acts,
  tools,
  tight = false,
}: PageHeadProps): JSX.Element {
  return (
    <>
      <header className={`ph${tight ? ' is-tight' : ''}`}>
        <div className="ph-say">
          {eyebrow ? <span className="mono-label ph-eyebrow">{eyebrow}</span> : null}
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
