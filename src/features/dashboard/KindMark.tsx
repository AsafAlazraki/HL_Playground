/* ============================================================
   THE KIND'S OWN MARK, at the head of a Row.

   Lifted out of `CardBody` the day the proposal list stopped being
   a dashboard card and became a surface two screens draw. Nothing
   about it changed; it is here so that the modules screen can lead
   a proposal with the same mark the front door does, without
   importing a file full of cards to get one glyph.
   ============================================================ */

import type { JSX } from 'react'
import type { TableKind } from '@/types/model'
import { TableKindSymbol } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'

/** THE KIND'S OWN MARK, at the head of a Row.
 *
 *  `data-kind` on the mark sets `--kind` (ds.css), so the glyph
 *  draws in the kind's hue — a glyph, which is exactly what §1
 *  allows a second hue to be. It only ever appears on something
 *  that HAS that kind: a table by what it holds, a quote by the
 *  table its subject came off. Two things of one kind are one
 *  colour everywhere in the app.
 *
 *  THE HUE IS NEVER THE ONLY CARRIER: the glyph is a different
 *  SHAPE per kind, so the row reads the same to somebody who
 *  cannot separate indigo from amber. Measured on the real set,
 *  the marks clear 4.09:1 at worst against every ground a row
 *  wears — rest, hover and press, both themes.
 *
 *  THE ROW ITSELF IS src/ui's. The rail, the hover, the press and
 *  the two type steps that used to be drawn here are Row's own;
 *  the one thing Row has no slot for is a FIGURE at the end of an
 *  activating line (its `trail` is controls, on a still row only),
 *  so the sum on a quote and the count on a table sit at the far
 *  edge of the meta line instead. Reported as the gap it is. */
export function KindMark({ kind }: { kind: TableKind }): JSX.Element {
  return (
    <span className="dsh-row-mark" data-kind={kind} aria-hidden="true">
      <TableKindSymbol kind={kind} size={ICON_SIZE.small} />
    </span>
  )
}
