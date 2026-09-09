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

   THE ROWS ARE `<Row>`. A row that can be pinned activates; a row
   that cannot — already here, or no longer sold — is a STILL row,
   with the reason under it in the words this file has always used.
   The primitive has no refused state of its own (Button and Field
   do), so the reason is not attached to a control the way it was
   when this was an `aria-disabled` button; it is in the document,
   directly under the row it is about, which is rule 10's "where it
   is". What that loses — a keyboard stop on the refused row — is
   reported where the primitives are, not patched here.

   Typing in here stops every animation on the page: the stillness
   provider derives that from focus itself, so the Field needs no
   wiring to say so.
   ============================================================ */

import { useEffect, useId, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import { isDiscontinued, rowLabel, type CellValue, type EntityDef, type RowData } from '@/types/model'
import { ICON_SIZE } from '@/lib/icons'
import { Button, Card, Field, Row } from '@/ui'
import { bandOf, formatCell } from './columns'
import { oneOf, singular } from './describe'

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
  const [query, setQuery] = useState('')
  const searchId = useId()
  const byId = useMemo(() => new Map(entity.fields.map((f) => [f.id, f])), [entity])

  /* the caret lands in the search the moment the panel opens — the
     Field owns its input, so it is reached by the id it was given */
  useEffect(() => {
    document.getElementById(searchId)?.focus()
  }, [searchId])

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
      aria-label={`Add ${oneOf(entity.name)}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <Card tone="flat" pad="none">
        <div className="vw-add-bar">
          <div className="vw-add-grow">
            <Field
              id={searchId}
              label={`Search ${entity.name}`}
              type="search"
              value={query}
              placeholder={`Search every ${one}…`}
              onChange={setQuery}
            />
          </div>
          <Button tone="ghost" size="md" aria-label="Close" title="Close" onClick={onClose}>
            <X size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          </Button>
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
              const label = rowLabel(entity, row)
              /* the cells beside the name, and the one chip that says
                 what stands between this row and the page */
              const meta = (
                <>
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
                </>
              )
              return (
                <li key={row.id}>
                  {here || gone ? (
                    <Row dense name={label} meta={meta} />
                  ) : (
                    <Row
                      dense
                      lead={<Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />}
                      name={label}
                      meta={meta}
                      label={`Add ${label}`}
                      onActivate={() => onPick(row.id)}
                    />
                  )}
                  {/* ── THE REASON IS ON THE ROW, NOT IN THE TOOLTIP ──
                      It was a `title` once, which fails on touch, on
                      keyboard and for a second on a mouse. The form is
                      §5's: the kind's own word, the file's fact about
                      this option, the file's fact about where it is
                      going — and then the fix, which is one box on a
                      sheet the reader owns. */}
                  {gone ? (
                    <p className="vw-add-why">
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
      </Card>
    </section>
  )
}
