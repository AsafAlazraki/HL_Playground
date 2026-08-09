/* ============================================================
   THE SPEC PLATE — what a register looks like from across the room.

   Zoomed out past the point where a cell can be read (see
   `tableLod.ts` for the measurement), a card stops pretending to be a
   grid and becomes the thing a drawing office would actually pin
   there: a plate.

   It is a real design object, not a grey box, and it has a job — the
   sheet must be MORE readable at low zoom, not less. So the name is
   set in the display face at a size chosen to still resolve at 0.5
   zoom (30px drawn = 15px seen, where the old card header was 11.5px
   drawn = 5.7px seen, i.e. nothing), the two figures are set as
   figures, and the bands are named. Registration ticks pin it, and the
   kind's own mark says what it holds before a word is read.

   Everything here is `--tbn-accent`, `--sp-*` and the three faces.
   The kind's mark is Phosphor through `@/lib/icons`, exactly as the
   card header draws it — nothing in this module hand-draws a glyph
   that already exists.
   ============================================================ */
import { useRef } from 'react'
import type { CSSProperties, JSX } from 'react'
import type { TableKind } from '@/types/model'
import { ICON_SIZE, TABLE_KIND_ICON, weightFor } from '@/lib/icons'
import type { BandChip } from './useWholeTable'
import type { LeafNoun } from './grouping'

/** How many band names the plate is willing to print before it just
 *  says how many more there are. Four reads as a list; eleven reads as
 *  a wall, and a wall at 0.5 zoom is texture. */
const NAMED_BANDS = 4

/* ============================================================
   THE PLATE IS THE PRESS.

   At this distance the card draws no grid, and a card with no grid
   draws no footer either — EXPAND, FOCUS and + ROW all live in the
   register. So on a sheet framed on twenty-one tables the plate is
   the ONLY object under the reader's cursor, and it therefore has to
   be the way in: press it and the camera walks to that card at a size
   its register can be read at.

   It is still the node's drag surface, and both readings have to keep
   working. They are told apart the way a browser tells them apart —
   by whether the pointer travelled. A press that moved further than
   `DRAG_SLOP` was a drag of the card and opens nothing.
   ============================================================ */

/** How far a press may travel and still be a press, in screen pixels.
 *  Wide enough for a hand that is not quite still, far short of any
 *  movement meant to carry the card somewhere. */
const DRAG_SLOP = 4

export function SheetPlate({
  name,
  kind,
  rows,
  noun,
  columns,
  bands,
  onOpen,
}: {
  name: string
  kind: TableKind | undefined
  /** how many rows the table holds */
  rows: number
  /** what those rows are called — "29 variants", never "29 records" */
  noun: LeafNoun
  /** every column the table has, folded ones included */
  columns: number
  /** the sections, in column order */
  bands: BandChip[]
  /** bring the camera to this card, close enough to read it */
  onOpen: () => void
}): JSX.Element {
  const Mark = TABLE_KIND_ICON[kind ?? 'custom'] ?? TABLE_KIND_ICON.custom
  const named = bands.slice(0, NAMED_BANDS)
  const rest = bands.length - named.length

  /** where the press started, so a drag can be told from a press */
  const from = useRef<{ x: number; y: number } | null>(null)

  return (
    <button
      type="button"
      className="tb-lod"
      title={`${name} — click to open this table`}
      onPointerDown={(e) => {
        from.current = { x: e.clientX, y: e.clientY }
      }}
      onClick={(e) => {
        const start = from.current
        from.current = null
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_SLOP) {
          return
        }
        onOpen()
      }}
    >
      {/* the plate is pinned: four registration ticks, inset so the
          card's own edge still reads as the card's edge */}
      <span className="tb-lod-ticks" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>

      {/* spans, not divs and a paragraph: the plate is one button now,
          and a button holds phrasing content. Every one of these
          already sets its own `display`, so nothing about the drawing
          changes. */}
      <span className="tb-lod-field">
        <span className="tb-lod-mark" aria-hidden="true">
          <Mark size={ICON_SIZE.large} weight={weightFor(ICON_SIZE.large)} />
        </span>
        <span className="tb-lod-name">{name}</span>
      </span>

      {named.length > 0 && (
        <span className="tb-lod-bands" aria-hidden="true">
          {named.map((b) => (
            <span
              key={b.id}
              className="tb-lod-band"
              style={{ ['--tb-band-ink' as string]: b.ink } as CSSProperties}
            >
              {b.name}
            </span>
          ))}
          {rest > 0 && <span className="tb-lod-more">{`+${rest}`}</span>}
        </span>
      )}

      {/* the title block: the two figures every reader of a register
          wants first, set as figures */}
      <span className="tb-lod-block">
        <span className="tb-lod-fig">
          <b className="tb-lod-num">{rows}</b>
          <i className="tb-lod-unit">{rows === 1 ? noun.one : noun.many}</i>
        </span>
        <span className="tb-lod-rule" aria-hidden="true" />
        <span className="tb-lod-fig">
          <b className="tb-lod-num">{columns}</b>
          <i className="tb-lod-unit">{columns === 1 ? 'column' : 'columns'}</i>
        </span>
      </span>
    </button>
  )
}
