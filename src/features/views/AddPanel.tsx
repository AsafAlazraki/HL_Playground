/* ============================================================
   ADD — pin one in, even when the rule says no.

   "Curation fails open, always with an escape hatch" (QUOTE_FINDINGS
   §2.5). The search covers the WHOLE table, not the rule's matches,
   and anything the rule would exclude is labelled as such before it
   is picked — so an out-of-range item on the page is never a
   mystery, and never a silent contradiction of the rule.

   ONE THING IS NOT AN ESCAPE HATCH. A row marked discontinued is
   still LISTED here — this panel is the admin's, and hiding a row
   from the person maintaining the page is how a page quietly stops
   matching the sheet — but it cannot be picked, and it says why. The
   block it would land on is a page a customer reads, and a pin is not
   an argument that the business has resumed selling something.

   Typing in here stops every animation on the page.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { MagnifyingGlass, Plus, X } from '@phosphor-icons/react'
import { isDiscontinued, rowLabel, type CellValue, type EntityDef, type RowData } from '@/types/model'
import { bandOf, formatCell } from './columns'
import { oneOf, singular } from './describe'
import { useStillness } from './stillness'

export interface AddPanelProps {
  entity: EntityDef
  rows: RowData[]
  /** already on the page — offered as "already here", never as a duplicate */
  presentIds: Set<string>
  columns: string[]
  read: (row: RowData, fieldId: string) => CellValue
  fits: (row: RowData) => boolean
  onPick: (rowId: string) => void
  onClose: () => void
}

const LIMIT = 40

export function AddPanel({
  entity,
  rows,
  presentIds,
  columns,
  read,
  fits,
  onPick,
  onClose,
}: AddPanelProps): ReactElement {
  const { beginTyping, endTyping } = useStillness()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const byId = useMemo(() => new Map(entity.fields.map((f) => [f.id, f])), [entity])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const needle = query.trim().toLowerCase()
  const results = useMemo(() => {
    const out: RowData[] = []
    for (const row of rows) {
      if (out.length >= LIMIT) break
      if (needle !== '') {
        const hay = [
          rowLabel(entity, row),
          ...columns.map((c) =>
            formatCell(byId.get(c), read(row, c), undefined, bandOf(entity, byId.get(c))),
          ),
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(needle)) continue
      }
      out.push(row)
    }
    return out
  }, [rows, needle, entity, columns, byId, read])

  const one = singular(entity.name)

  return (
    <section
      className="vw-add"
      aria-label={`Add ${oneOf(entity.name)}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="vw-add-bar">
        <MagnifyingGlass size={14} weight="light" aria-hidden="true" />
        <input
          ref={inputRef}
          className="vw-add-input"
          type="text"
          value={query}
          placeholder={`Search every ${one}…`}
          aria-label={`Search ${entity.name}`}
          spellCheck={false}
          onFocus={beginTyping}
          onBlur={endTyping}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="vw-icon-btn" onClick={onClose} title="Close">
          <X size={13} weight="bold" />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="vw-add-none">
          {entity.name} has no rows yet. Add some to the table and they will show up here.
        </p>
      ) : results.length === 0 ? (
        <p className="vw-add-none">Nothing in {entity.name} matches “{query.trim()}”.</p>
      ) : (
        <ul className="vw-add-list">
          {results.map((row) => {
            const here = presentIds.has(row.id)
            const inRule = fits(row)
            const gone = isDiscontinued(row)
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className="vw-add-row"
                  /* ── `aria-disabled`, NEVER THE `disabled` ATTRIBUTE
                     CONFIGURATOR_PLAYBOOK §5, verbatim: the row keeps
                     its place in tab order, keeps its cells, and
                     activating it re-announces the reason. Baymard's
                     finding is that users seldom notice a disabled
                     element or grasp the concept at all, and a native
                     `disabled` button is also unreachable by keyboard
                     and unreadable by a screen reader — so the one
                     person who most needs the reason is the one who
                     cannot get to it. The guard moves into the
                     handler, where it is the same guard. */
                  aria-disabled={here || gone}
                  aria-describedby={gone ? `${row.id}-why` : undefined}
                  onClick={() => {
                    if (here || gone) return
                    onPick(row.id)
                  }}
                  title={here ? 'Already on this page' : `Add ${rowLabel(entity, row)}`}
                >
                  <span className="vw-add-plus" aria-hidden="true">
                    <Plus size={12} weight="bold" />
                  </span>
                  <span className="vw-add-name">{rowLabel(entity, row)}</span>
                  <span className="vw-add-cells">
                    {columns.map((c) => (
                      <span key={c} className="vw-add-cell">
                        {formatCell(byId.get(c), read(row, c), undefined, bandOf(entity, byId.get(c)))}
                      </span>
                    ))}
                  </span>
                  {gone ? (
                    <span className="vw-tag vw-tag--out">Discontinued</span>
                  ) : here ? (
                    <span className="vw-tag vw-tag--quiet">already here</span>
                  ) : inRule ? null : (
                    <span className="vw-tag vw-tag--out">outside the rule</span>
                  )}
                </button>
                {/* ── THE REASON IS ON THE ROW, NOT IN THE TOOLTIP ──
                    It was a `title`, which is DESIGN_CONTRACT §11's
                    "every refusal says why, WHERE IT IS refused"
                    failing on all three counts a tooltip fails on: it
                    never appears on touch, it never appears on
                    keyboard focus, and it takes a second of hover
                    before it appears to a mouse. What was visible was
                    the words "no longer sold" beside a dead control —
                    which is Shopify Dawn's `"{{ option_value }} -
                    Unavailable"`, the closest thing in e-commerce to
                    what we do and the exact sentence this app exists
                    to beat (explaining-a-refusal.md, cop-out 4).

                    The form is §5's: the kind's own word, the file's
                    fact about this option, the file's fact about
                    where it is going — and then the fix, which is one
                    box on a sheet the reader owns. */}
                {gone ? (
                  <p className="vw-add-why" id={`${row.id}-why`}>
                    <b className="vw-add-word">Discontinued</b> — {entity.name} marks this
                    one as no longer sold. A block is a page a customer reads. Clear its
                    Discontinued box on the sheet to offer it again.
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
