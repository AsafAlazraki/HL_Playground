/* ============================================================
   ROW — the component. The measurement (207 self-drawn row
   treatments across 31 app stylesheets) and the 40px / wrap /
   darken-on-press reasoning are in row.css.

   THERE IS NO `children`. A row is lead + name + meta + trail,
   and the shape IS the API: four named slots, so 207 authors
   cannot arrive at 207 different internal layouts again. If a row
   needs a fifth thing, it needs a fifth slot here, argued once.

   THE TYPE FORBIDS THE INVALID CASE. `onActivate` makes the row a
   <button>; a `trail` puts controls inside it. Both at once is a
   button inside a button — invalid HTML, and the inner control is
   unreachable in some screen readers. The props are a union, so
   that combination does not compile rather than shipping and
   looking fine. A row that needs both a whole-row target and its
   own actions is a still row with a Button in its trail.

   NO `className`, NO `style` — see Button.tsx for why that is the
   mechanism and not the manners.
   ============================================================ */

import type { ReactNode } from 'react'
import './row.css'

interface RowBase {
  /** The thing a person scans the list for. */
  name: ReactNode
  /** Metadata beside what it describes — a count, a date, a
      status. Caption step at the ink floor. */
  meta?: ReactNode
  /** A mark at the head of the line: a dot, a glyph, a checkbox. */
  lead?: ReactNode
  /** 34px instead of 40px, for a register where the density is
      the point. `--h-row-dense` is the system's one exception. */
  dense?: boolean
  /** The current one of a set. Drawn from `aria-current`, so the
      look cannot exist without the announcement. */
  current?: boolean
  id?: string
}

export type RowProps = RowBase &
  (
    | {
        /** Present ⇒ the whole row is a button. */
        onActivate: () => void
        /** An accessible name, when `name` is not one on its own. */
        label?: string
        trail?: never
      }
    | {
        onActivate?: never
        label?: never
        /** Controls at the end of the line. Only on a still row —
            a button inside a button is invalid HTML. */
        trail?: ReactNode
      }
  )

export function Row({
  name,
  meta,
  lead,
  trail,
  dense = false,
  current = false,
  onActivate,
  label,
  id,
}: RowProps) {
  const classes = ['ui-row']
  if (dense) classes.push('ui-row--dense')
  if (onActivate) classes.push('ui-row--action')

  const body = (
    <>
      {lead ? <span className="ui-row-lead">{lead}</span> : null}
      <span className="ui-row-main">
        <span className="ui-row-name">{name}</span>
        {meta ? <span className="ui-row-meta">{meta}</span> : null}
      </span>
      {trail ? <span className="ui-row-trail">{trail}</span> : null}
    </>
  )

  const shared = {
    id,
    className: classes.join(' '),
    'aria-current': current || undefined,
  }

  if (onActivate) {
    return (
      <button {...shared} type="button" aria-label={label} onClick={onActivate}>
        {body}
      </button>
    )
  }

  return <div {...shared}>{body}</div>
}
