/* ============================================================
   ONE CUSTOMER — their details, and the history with them.

   THE FORM IS DERIVED, NOT DECLARED. Every field below is a column
   of the register, read in the table's own order. A dealer who adds
   "ABN" to the table gets an ABN field here, in the export and in
   the finder, with nothing in this file changed — which is the whole
   argument for a customer being a table rather than a special
   record type. The five columns this app ships are not privileged
   on this screen; they are simply the ones that happen to be there.

   WHAT IT REFUSES TO EDIT, AND SAYS SO. A picture column, a link to
   another table and a calculated column are all real column types a
   person may add here, and none of them is a text box. Rather than
   drawing a control that would lie about what it writes, each is
   named with the place it IS edited — DESIGN_CONTRACT §5's stub
   rule, and §6's "a refusal is a sentence with a reason, in the
   place where the thing is refused".

   THE HISTORY IS THE POINT OF THE SCREEN, and every word of it comes
   out of the quotes themselves. A quote FROZE this customer's name
   when it was raised, so a document that says "R Kelleher" goes on
   saying it after the register is corrected to "Rob Kelleher" — and
   when the two differ, this page says both. That is not a bug being
   confessed, it is the guarantee being shown: the number and the
   name on a document handed over in March are still what was handed
   over in March.

   NOTHING ON THIS PAGE WRITES TO A QUOTE. It reads the diary and
   opens documents; it cannot change one, and an issued quote refuses
   every edit anyway (`mutate` in quotes.ts).
   ============================================================ */

import type { ReactElement } from 'react'
import { ArrowSquareOut, Trash } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import {
  displayFieldOf,
  type CellValue,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'
import { localDay, money, quoteTotals, useCustomerQuotes } from '@/features/quote'
import { customerFormFields, customerRegister, readCustomer } from './customers'
import { removeCustomer, setCustomerCell } from './register'
import './crm.css'

export interface CustomerPageProps {
  rowId: string
  /** open one of their quotes */
  onOpenQuote?: (quoteId: string) => void
  /** the customer is gone — the stage goes back to the list */
  onRemoved?: () => void
}

export function CustomerPage({
  rowId,
  onOpenQuote,
  onRemoved,
}: CustomerPageProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const table = customerRegister(entities)
  const row = table ? (rowsByEntity[table.id] ?? []).find((r) => r.id === rowId) : undefined

  /* The hook runs whether or not the row is there — a hook may not be
     conditional, and an id that no longer resolves is a real state on
     this screen: a customer can be removed from the window next door. */
  const theirs = useCustomerQuotes(rowId)

  if (!table || !row) {
    return (
      <div className="cx-root">
        <p className="cx-void">
          That customer is no longer in the register. Every quote written to them still
          opens and still prints — a quote keeps its own copy of the name and details it
          was given, so nothing on a document depends on this row still being here.
        </p>
      </div>
    )
  }

  const read = readCustomer(table, row)
  const nameField = displayFieldOf(table)

  return (
    <div className="cx-root">
      <header className="cx-one-head">
        <div className="cx-one-id">
          <h1 className="cx-one-name">
            {read.name === '' ? <span className="cx-blank">no name yet</span> : read.name}
          </h1>
          {read.contact.length > 0 ? (
            <p className="cx-one-contact">{read.contact.join('  ·  ')}</p>
          ) : null}
          <p className="mono-label cx-one-facts">
            {theirs.length === 0
              ? 'No quotes yet'
              : `${theirs.length} ${theirs.length === 1 ? 'quote' : 'quotes'}`}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-ghost cx-one-drop"
          onClick={() => {
            removeCustomer(row.id)
            onRemoved?.()
          }}
        >
          <Trash size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
          Remove
        </button>
      </header>

      {/* -- their details, from the table's own columns ---------- */}
      <section className="cx-form" aria-label="Details">
        {customerFormFields(table).map((field) => (
          <CustomerCell
            key={field.id}
            table={table}
            row={row}
            field={field}
            isName={field.id === nameField?.id}
          />
        ))}
      </section>

      {/* -- the history with them -------------------------------- */}
      <section className="cx-hist" aria-label="Quotes">
        <p className="mono-label cx-hist-head">Quotes to them</p>

        {theirs.length === 0 ? (
          <p className="cx-hist-none">
            Nothing has been quoted to them yet. A quote is written from the row you are
            selling — open a table, press <em>Fitment</em>, pick the one you are selling
            and press <em>Quote this one</em>, then choose this customer at the top of
            the quote.
          </p>
        ) : (
          <ul className="cx-hist-list">
            {theirs.map((q) => {
              const totals = quoteTotals(q)
              /* THE NAME THE DOCUMENT REALLY CARRIES. Said only when
                 it differs from the register today, because that is
                 the only time it tells anybody anything — and when it
                 does, it is the freeze working, not a fault. */
              const as = q.customer.name.trim()
              return (
                <li key={q.id} className="cx-hist-row">
                  <button
                    type="button"
                    className="cx-hist-open"
                    disabled={!onOpenQuote}
                    onClick={() => onOpenQuote?.(q.id)}
                    aria-label={`Quote ${q.reference} — ${q.subjectLabel}`}
                  >
                    <span className="mono-label cx-hist-when">{localDay(q.createdAt)}</span>
                    <span className="cx-hist-what">
                      {q.subjectLabel}
                      {as !== '' && as !== read.name ? (
                        <span className="cx-hist-as"> quoted as {as}</span>
                      ) : null}
                    </span>
                    <span className="mono-label cx-hist-state">
                      {q.state === 'issued' ? 'Given' : 'Draft'}
                      {q.supersedesId ? ' · new version' : ''}
                    </span>
                    <span className="cx-num cx-hist-total">{money(totals.total)}</span>
                    {onOpenQuote ? (
                      <ArrowSquareOut
                        size={ICON_SIZE.small}
                        weight="light"
                        aria-hidden="true"
                        className="cx-hist-go"
                      />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

/* ============================================================
   ONE COLUMN OF THE REGISTER, drawn as whatever it is
   ============================================================ */

/** The types this page can honestly edit. Everything else is named
 *  with the surface that edits it rather than approximated here. */
const EDITABLE = new Set(['text', 'number', 'date', 'boolean', 'select'])

function CustomerCell({
  table,
  row,
  field,
  isName,
}: {
  table: EntityDef
  row: RowData
  field: FieldDef
  isName: boolean
}): ReactElement {
  const raw: CellValue = row.values[field.id] ?? null
  const write = (v: CellValue): void => setCustomerCell(row.id, field.id, v)

  if (!EDITABLE.has(field.type)) {
    return (
      <div className="cx-field cx-field--stub">
        <span className="mono-label">{field.name}</span>
        <p className="cx-field-stub-say">
          This column is edited on the {table.name} table — open it from <em>Tables</em>{' '}
          on the bar.
        </p>
      </div>
    )
  }

  if (field.type === 'boolean') {
    return (
      <label className="cx-field cx-field--tick">
        <input
          type="checkbox"
          checked={raw === true}
          onChange={(e) => write(e.target.checked)}
        />
        <span className="mono-label">{field.name}</span>
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <label className="cx-field">
        <span className="mono-label">{field.name}</span>
        <select
          className="field-input cx-input"
          value={typeof raw === 'string' ? raw : ''}
          onChange={(e) => write(e.target.value === '' ? null : e.target.value)}
        >
          {/* an empty option is a REAL choice: "nobody has said yet" */}
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    )
  }

  const text = raw === null || raw === undefined ? '' : String(raw)

  return (
    <label className={`cx-field${isName ? ' cx-field--name' : ''}`}>
      <span className="mono-label">{field.name}</span>
      <input
        className="field-input cx-input"
        type={field.type === 'date' ? 'date' : 'text'}
        inputMode={field.type === 'number' ? 'decimal' : undefined}
        value={text}
        spellCheck={false}
        /* NO PLACEHOLDER IS EVER A VALUE — the same rule the quote's
           customer field keeps. A blank field says nothing rather
           than suggesting a name nobody typed. */
        placeholder={isName ? 'their name' : ''}
        onChange={(e) => {
          const v = e.target.value
          if (field.type !== 'number') {
            write(v === '' ? null : v)
            return
          }
          if (v.trim() === '') {
            write(null)
            return
          }
          const n = Number(v)
          /* what a person typed is kept when it is not yet a number —
             half of "12." is not zero, and blanking it as they type
             is how a field fights its typist */
          write(Number.isFinite(n) ? n : v)
        }}
      />
      {field.description ? (
        <span className="cx-field-say">{field.description}</span>
      ) : null}
    </label>
  )
}
