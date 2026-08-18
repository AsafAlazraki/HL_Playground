/* ============================================================
   THE REGISTER — everybody you have sold to, and what you quoted
   them.

   IT IS A TABLE, DRAWN AS A LIST. Every row here is a row of an
   ordinary base table: the same rows the sheet edits, the finder
   finds, the exporter carries and Ctrl+Z puts back. This screen adds
   ONE thing the sheet cannot show, and it is the reason the screen
   exists — how many quotes each person has been given, and when the
   last one was. That fact lives in the quote registry, not in a
   cell, so no column could ever hold it.

   THE COUNTS ARE READ, NEVER WRITTEN. A quote points at a customer;
   a customer does not keep a list of quotes. One direction only,
   which is why a quote can be deleted, imported or superseded
   without anybody having to remember to fix a counter — the same
   discipline the module index keeps for its own activity strip.

   TWO EMPTY STATES, BECAUSE THEY ARE TWO DIFFERENT FACTS.
     · no register at all  — this project has no customers table yet,
                             and making one is a STRUCTURAL act, so it
                             is offered by name and it is undoable.
     · a register, nobody in it — the table is there and waiting.
   Answering both with one blank screen is how a person concludes the
   app lost something.

   NOTHING HERE KNOWS WHAT IS SOLD. Not a marine word, not a boat,
   not a hull. A customer is a customer whether the yard sells
   trailers or tractors.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import { localDay, useQuotes } from '@/features/quote'
import {
  customerRegister,
  liveTableCount,
  matchCustomers,
  readCustomers,
} from './customers'
import { addCustomer, ensureCustomerRegister } from './register'
import './crm.css'

export interface CustomerListProps {
  /** open one customer */
  onOpen: (rowId: string) => void
  /** the row that is already open, if the stage has one */
  openId?: string | null
}

/** What the list knows about one person beyond their own cells. */
interface Activity {
  quotes: number
  /** the newest quote's day, or '' when there is none */
  last: string
}

export function CustomerList({ onOpen, openId }: CustomerListProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  /* THE SAME NUMBER HOME SAYS — see `liveTableCount`, which carries
     the reason and the test. */
  const tableCount = useMemo(() => liveTableCount(entities), [entities])
  const quotes = useQuotes()
  const [find, setFind] = useState('')

  const table = customerRegister(entities)
  const rows = table ? (rowsByEntity[table.id] ?? []) : []

  const people = useMemo(
    () => (table ? readCustomers(table, rows) : []),
    [table, rows],
  )

  /* ONE PASS OVER THE DIARY, not one per person: a register of two
     hundred against a diary of a thousand is 200,000 comparisons the
     naive way, on every keystroke in the find box. */
  const activity = useMemo(() => {
    const by = new Map<string, Activity>()
    for (const q of quotes) {
      const rowId = q.customerRef?.rowId
      if (!rowId) continue
      const seen = by.get(rowId)
      /* the diary is already newest-first, so the FIRST one seen for
         a person is their latest — no second sort */
      if (seen) seen.quotes += 1
      else by.set(rowId, { quotes: 1, last: localDay(q.createdAt) })
    }
    return by
  }, [quotes])

  const shown = useMemo(
    () => matchCustomers(people, find, people.length),
    [people, find],
  )

  /* how many of the people in the book have ever been quoted — the
     one number on this page that says what a CRM is for */
  const withQuotes = useMemo(
    () => people.filter((c) => activity.has(c.rowId)).length,
    [people, activity],
  )

  /* ============================================================
     NO REGISTER YET — and making one is a table, so it is offered
     by name, in a sentence, and it is undoable (DESIGN_CONTRACT §7).
     ============================================================ */
  if (!table) {
    return (
      <div className="cx-root">
        <div className="cx-empty">
          <span className="mono-label cx-empty-eyebrow">No customer register yet</span>
          <p className="cx-empty-say">
            A customer is a row in a table, the same as everything else here. The
            register is where their name and contact details live, so the second quote
            to somebody starts from what you already know instead of from a blank field.
          </p>
          <p className="cx-empty-count">
            You have{' '}
            <strong>
              {tableCount} {tableCount === 1 ? 'table' : 'tables'}
            </strong>{' '}
            and no customer register.
          </p>
          <button
            type="button"
            className="btn btn-primary cx-new"
            onClick={() => ensureCustomerRegister()}
          >
            <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
            Create the Customers table
          </button>
          <p className="cx-empty-why">
            It arrives with <em>Name</em>, <em>Phone</em>, <em>Email</em>,{' '}
            <em>Address</em> and <em>Notes</em>, and it is an ordinary table from then
            on — add your own columns, rename it, or take it out again with Ctrl+Z.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="cx-root">
      <header className="cx-head">
        <div className="cx-head-id">
          <h1 className="cx-head-name">{table.name}</h1>
          {table.description ? (
            <p className="cx-head-desc">{table.description}</p>
          ) : null}
          <p className="mono-label cx-head-facts">
            {people.length} {people.length === 1 ? 'customer' : 'customers'}
            {people.length > 0 ? ` · ${withQuotes} quoted` : ''}
          </p>
        </div>

        <div className="cx-head-acts">
          {people.length > 0 ? (
            <div className="cx-find">
              <span className="cx-find-mark" aria-hidden="true">
                <MagnifyingGlass size={ICON_SIZE.small} weight="light" />
              </span>
              <input
                className="field-input cx-find-input"
                value={find}
                placeholder="Find a customer"
                aria-label="Find a customer"
                spellCheck={false}
                onChange={(e) => setFind(e.target.value)}
              />
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-primary cx-new"
            onClick={() => {
              const row = addCustomer()
              if (row) onOpen(row.id)
            }}
          >
            <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
            New customer
          </button>
        </div>
      </header>

      {people.length === 0 ? (
        <div className="cx-empty">
          <span className="mono-label cx-empty-eyebrow">Nobody in it yet</span>
          <p className="cx-empty-say">
            The register is here and empty. Add somebody now, or address a quote to a
            name and file them from the quote itself — either way lands in this table.
          </p>
          <p className="cx-empty-count">
            You have{' '}
            <strong>
              {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'}
            </strong>{' '}
            and no customers.
          </p>
        </div>
      ) : shown.length === 0 ? (
        <p className="cx-none">Nothing matches “{find.trim()}”.</p>
      ) : (
        <ul className="cx-rows">
          {shown.map((c) => {
            const act = activity.get(c.rowId)
            return (
              <li key={c.rowId} className={`cx-row${openId === c.rowId ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="cx-row-open"
                  onClick={() => onOpen(c.rowId)}
                  aria-label={c.name === '' ? 'A customer with no name yet' : c.name}
                >
                  <span className="cx-row-name">
                    {c.name === '' ? (
                      <span className="cx-blank">no name yet</span>
                    ) : (
                      c.name
                    )}
                  </span>
                  <span className="cx-row-contact">{c.contact.join('  ·  ')}</span>
                  <span className="mono-label cx-row-when">{act?.last ?? ''}</span>
                  <span className="cx-num cx-row-count">
                    {act ? `${act.quotes} ${act.quotes === 1 ? 'quote' : 'quotes'}` : '—'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
