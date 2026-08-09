/* ============================================================
   TABLE TYPES — the quiet half of the left panel.

   Seven one-line chips you can drag onto the sheet or click to
   place. No blurbs here: the chips sit above the user's own
   tables, so they must read as a tool tray, not as a second index
   competing for attention. Everything that explains a kind lives
   in the dialog, where the choice is actually being made.

   ONE PRIMARY ACTION PER SCREEN. On an empty sheet the invitation
   card in the middle of the blueprint is that action, so the rail
   shows no button at all — two identical navy buttons 300px apart,
   both opening the same dialog, is the clutter this pass exists to
   remove. The tray stays (the invitation points at it), and the
   CREATE TABLE button comes back the moment the invitation goes.
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

export function TableTypeRail(): ReactElement {
  const [pending, setPending] = useState<{ kind?: TableKind } | null>(null)
  /* the invitation card owns the primary action while the sheet is
     empty, so this one waits its turn */
  const hasTables = useProjectStore((s) => Object.keys(s.entities).length > 0)

  /* where a clicked type lands is the dialog's business — it asks the
     sheet at the moment the table is actually made */
  const open = useCallback((kind?: TableKind) => {
    setPending({ kind })
  }, [])

  const close = useCallback(() => setPending(null), [])

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
        {/* said once: while the sheet is empty the invitation card says it */}
        {hasTables && (
          <p className="tk-rail-hint">Drag one onto the sheet, or click to place it.</p>
        )}

        <ul className="tk-chips">
          {KIND_ORDER.map((kind) => {
            const meta = TABLE_KINDS[kind]
            return (
              <li key={kind}>
                <button
                  type="button"
                  className="tk-chip"
                  style={{ '--tk-ink': accentVar(meta.accent) } as CSSProperties}
                  draggable
                  onDragStart={(event) => setTableKindDragData(event, kind)}
                  onClick={() => open(kind)}
                  title={`${meta.label} — ${meta.blurb}`}
                >
                  <span className="tk-chip-sym">
                    <TableKindSymbol kind={kind} size={17} />
                  </span>
                  <span className="tk-chip-label">{meta.label}</span>
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
