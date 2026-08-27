/* ============================================================
   TABLE TYPES — the quiet half of the left panel.

   Seven one-line chips you can drag onto the sheet or click to
   place. No blurbs on the chips themselves: they sit above the
   user's own tables, so they must read as a tool tray, not as a
   second index competing for attention. Everything that explains a
   kind lives in the dialog, where the choice is actually being made.

   ONE PRIMARY ACTION PER SCREEN. On an empty sheet the invitation
   card in the middle of the blueprint is that action, so the rail
   shows no button at all — two identical navy buttons 300px apart,
   both opening the same dialog, is the clutter this pass exists to
   remove. The tray stays (the invitation points at it), and the
   Create table button comes back the moment the invitation goes.

   ============================================================
   WHAT THIS PASS CHANGED.

   THE BLURB WAS IN A `title` ATTRIBUTE, WHICH IS NOT A SURFACE THIS
   APP DREW. `title={`${label} — ${blurb}`}` is the operating
   system's tooltip: it arrives after a second of stillness, in the
   OS's own face at the OS's own size, in a black box that obeys
   none of the ten rules, and it is unreachable from a keyboard.
   "A boat, motor and trailer sold together as a rig" is the whole
   difference between Package and Accessory, and it was being
   delivered by Windows.

   It has a place on the rail now — ONE line under the caption,
   which says the hovered kind's own sentence and otherwise says how
   the tray works. It is a FIXED SLOT, two lines tall whatever is in
   it, so nothing below it ever moves: a strip that reflows under
   the pointer is worse than the tooltip it replaced. It answers
   `:focus-visible` as well as `:hover`, so it is reachable by
   keyboard, which the tooltip never was.

   AND THE CHIP SAYS IT CAN BE DRAGGED. Every chip is `draggable`
   and the only sign of it was `cursor: grab`, which a person has to
   already be over the control to see. Each one carries a grip that
   fades in with the hover, so the tray reads as a tray of things
   you pick up before anything is picked up.

   THE KIND'S HUE IS A DOT AND A MARK, which is §1's sanctioned
   use — never a fill behind the name.
   ============================================================ */
import { useCallback, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { accentVar, TABLE_KINDS, type TableKind } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { TableKindSymbol } from './symbols'
import { NewTableDialog } from './NewTableDialog'
import { setTableKindDragData } from './dnd'
import './tablekit.css'

const KIND_ORDER: TableKind[] = [
  'boat',
  'motor',
  'trailer',
  'accessory',
  'package',
  'dealer',
  'custom',
]

function PlusMark(): ReactElement {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true" focusable="false">
      <path
        d="M4.5 1.1v6.8M1.1 4.5h6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Six dots in two columns — the universal grip. Drawn rather than
 *  typed: `⋮⋮` at this size is two lumpy ellipses in whatever face
 *  happens to be inherited. */
function GripMark(): ReactElement {
  return (
    <svg
      className="tk-chip-grip"
      width="7"
      height="12"
      viewBox="0 0 7 12"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor">
        <circle cx="1.6" cy="2" r="1" />
        <circle cx="5.4" cy="2" r="1" />
        <circle cx="1.6" cy="6" r="1" />
        <circle cx="5.4" cy="6" r="1" />
        <circle cx="1.6" cy="10" r="1" />
        <circle cx="5.4" cy="10" r="1" />
      </g>
    </svg>
  )
}

export function TableTypeRail(): ReactElement {
  const [pending, setPending] = useState<{ kind?: TableKind } | null>(null)
  /* WHICH CHIP IS BEING LOOKED AT, so its own sentence can be said
     in the slot below the caption rather than by the OS. Pointer and
     keyboard both set it; leaving or blurring clears it. */
  const [lit, setLit] = useState<TableKind | null>(null)
  /* the invitation card owns the primary action while the sheet is
     empty, so this one waits its turn */
  const hasTables = useProjectStore((s) => Object.keys(s.entities).length > 0)

  /* where a clicked type lands is the dialog's business — it asks the
     sheet at the moment the table is actually made */
  const open = useCallback((kind?: TableKind) => {
    setPending({ kind })
  }, [])

  const close = useCallback(() => setPending(null), [])

  /* THE SLOT NEVER CHANGES HEIGHT, so what it says can. While the
     sheet is empty the invitation card carries the instruction, so
     the resting line is blank there rather than said twice. */
  const say = lit
    ? TABLE_KINDS[lit].blurb
    : hasTables
      ? 'Drag one onto the sheet, or click to place it.'
      : ''

  return (
    <div className="tk-rail">
      {hasTables && (
        <button type="button" className="btn btn-primary tk-rail-create" onClick={() => open()}>
          <PlusMark />
          Create table
        </button>
      )}

      <div className="tk-rail-body">
        <p className="mono-label tk-rail-head">Table types</p>
        <p className="tk-rail-say" id="tk-rail-say" aria-live="polite">
          {say}
        </p>

        <ul className="tk-chips" onMouseLeave={() => setLit(null)}>
          {KIND_ORDER.map((kind, i) => {
            const meta = TABLE_KINDS[kind]
            return (
              <li key={kind}>
                <button
                  type="button"
                  className={`tk-chip${lit === kind ? ' is-lit' : ''}`}
                  style={
                    {
                      '--tk-ink': accentVar(meta.accent),
                      /* the tray arrives as a run rather than all at
                         once; capped in CSS at 14 steps */
                      '--i': i,
                    } as CSSProperties
                  }
                  draggable
                  onDragStart={(event) => setTableKindDragData(event, kind)}
                  onClick={() => open(kind)}
                  onMouseEnter={() => setLit(kind)}
                  onFocus={() => setLit(kind)}
                  onBlur={() => setLit((k) => (k === kind ? null : k))}
                  /* THE SENTENCE IS ON THE RAIL, NOT IN A TOOLTIP.
                     What is left here is the accessible name, which
                     a screen reader reads and Windows does not
                     draw. */
                  aria-describedby="tk-rail-say"
                >
                  <span className="tk-chip-sym">
                    <TableKindSymbol kind={kind} size={17} />
                  </span>
                  <span className="tk-chip-label">{meta.label}</span>
                  <GripMark />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <NewTableDialog open={pending !== null} initialKind={pending?.kind} onClose={close} />
    </div>
  )
}
