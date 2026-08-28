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

   AND BOTH OF THEM ARE NOW A PAGE RATHER THAN A PARAGRAPH. What was
   here was the right WORDS in the wrong shape: an eyebrow, two
   sentences and a button, in a 560px grey card, on the screen a
   dealer meets before they have a single customer. It now opens on
   a line at the display step, states what is true in counted figures
   — tables, quotes, customers — and puts the one act underneath
   them. Nothing said here is new; it is the same facts, given the
   room a first screen needs.

   THE PRIMARY ACT IS DRAWN ONCE. "New customer" used to stand in the
   head AND be the thing the empty state was asking for, so an empty
   register showed two ways to do the only thing there was to do. The
   head keeps it once there is a list to add to.

   NOTHING HERE KNOWS WHAT IS SOLD. Not a marine word, not a boat,
   not a hull. A customer is a customer whether the yard sells
   trailers or tractors.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import { money } from '@/lib/money'
import { PageHead } from '@/features/page'
import { Picker } from '@/features/picker'
import { localDay, quoteTotals, useQuotes } from '@/features/quote'
import { customerRegister, matchCustomers, readCustomers } from './customers'
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
  /** the day of their latest, in the reader's own locale */
  last: string
  /** and the raw stamp of it, because a date drawn for a person is
   *  not a date a sort can trust — "3 Aug" and "3 Aug" are the same
   *  string in two different years */
  at: string
  /** everything they have been quoted, summed */
  worth: number
}

/** One counted figure with its term under it — the same drawing
 *  Home's masthead uses, so the two pages read as one app. Every
 *  value handed to this has been counted; nothing is estimated and
 *  nothing is a placeholder. */
function Fig({ n, of }: { n: number; of: string }): ReactElement {
  return (
    <div className="cx-fig">
      <dt className="cx-fig-word">{of}</dt>
      <dd className="cx-fig-n">{n.toLocaleString()}</dd>
    </div>
  )
}

export function CustomerList({ onOpen, openId }: CustomerListProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const quotes = useQuotes()
  const [find, setFind] = useState('')
  const [order, setOrder] = useState<'name' | 'recent' | 'worth' | 'most'>('name')

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
      /* WHAT THEY HAVE BEEN QUOTED, summed. It is the figure a CRM
         is opened for — "who is worth calling back" — and it could
         not be a column on the customers table because it lives in
         the quote registry, which is the same reason the count and
         the date could not. */
      const worth = quoteTotals(q).total
      const seen = by.get(rowId)
      /* the diary is already newest-first, so the FIRST one seen for
         a person is their latest — no second sort */
      if (seen) {
        seen.quotes += 1
        seen.worth += worth
      } else {
        by.set(rowId, { quotes: 1, last: localDay(q.createdAt), at: q.createdAt, worth })
      }
    }
    return by
  }, [quotes])

  /* HOW THE BOOK IS ORDERED. Four answers, and each is a real
     question somebody asks of a register: who is new, who is worth
     the most, who has been quoted most often, and — the default —
     alphabetical, because that is how you find a person whose name
     you already know.

     SEARCH ORDERS BY RELEVANCE AND THAT WINS. `matchCustomers`
     ranks a name that STARTS with the query above one that merely
     contains it; re-sorting that alphabetically would throw the
     ranking away and put the best match in the middle. So the sort
     applies to the whole book and steps aside while somebody is
     typing. */
  const shown = useMemo(() => {
    const hit = matchCustomers(people, find, people.length)
    if (find.trim() !== '') return hit
    const rank = [...hit]
    switch (order) {
      case 'recent':
        return rank.sort(
          (a, b) => (activity.get(b.rowId)?.at ?? '').localeCompare(activity.get(a.rowId)?.at ?? ''),
        )
      case 'worth':
        return rank.sort(
          (a, b) => (activity.get(b.rowId)?.worth ?? 0) - (activity.get(a.rowId)?.worth ?? 0),
        )
      case 'most':
        return rank.sort(
          (a, b) => (activity.get(b.rowId)?.quotes ?? 0) - (activity.get(a.rowId)?.quotes ?? 0),
        )
      default:
        /* A NAMELESS ROW SORTS LAST, not first under an empty
           string — the same rule the board keeps. */
        return rank.sort((a, b) => {
          if (a.name === '' && b.name === '') return 0
          if (a.name === '') return 1
          if (b.name === '') return -1
          return a.name.localeCompare(b.name)
        })
    }
  }, [people, find, order, activity])

  /* how many of the people in the book have ever been quoted — the
     one number on this page that says what a CRM is for */
  const withQuotes = useMemo(
    () => people.filter((c) => activity.has(c.rowId)).length,
    [people, activity],
  )

  /* ============================================================
     NO REGISTER YET — and making one is a table, so it is offered
     by name, in a sentence, and it is undoable (§7).
     ============================================================ */
  if (!table) {
    return (
      <div className="cx-root">
        <div className="ds-aurora ds-grain cx-sky" aria-hidden="true" />
        <div className="cx-scroll">
          <div className="cx-empty ds-rise">
            <span className="cx-empty-eyebrow">No customer register yet</span>
            <h2 className="cx-empty-title">Everybody you sell to, in one book.</h2>
            {/* AN EMPTY STATE KEEPS ITS SENTENCE AND ITS ACT — one
                sentence. This was three: what a customer is, where the
                register lives, and what it saves you. The first two are
                what the heading and the button say. */}
            <p className="cx-empty-say">
              So the second quote to somebody starts from what you know.
            </p>

            {/* THE COUNTED STRIP GOES — PHASE_TWO §1, "a count belongs on
                the thing it counts". Three big figures on an empty
                state, one of them a count of TABLES, is the schema
                announcing itself on the one screen whose whole job is a
                sentence and a button. */}
            <button
              type="button"
              className="cx-act cx-act--primary"
              onClick={() => ensureCustomerRegister()}
            >
              <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
              Create the Customers table
            </button>
            {/* THIS SENTENCE IS NOT PROSE AND IT STAYS. DESIGN_PRINCIPLES
                §7: structure is never a side effect — a table this button
                creates is named before it is made, and it is undoable.
                What was cut is the middle clause telling you a table is
                a table. */}
            <p className="cx-empty-why">
              <em>Name</em>, <em>Phone</em>, <em>Email</em>, <em>Address</em>,{' '}
              <em>Notes</em> — undo with Ctrl+Z.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cx-root">
      <div className="ds-aurora ds-grain cx-sky" aria-hidden="true" />
      <div className="cx-scroll">
        {/* THE APPLICATION'S HEADER, and this page used to have none
            at all — it began with a card. See features/page. */}
        <PageHead
          eyebrow="Register"
          name={table.name}
          count={
            withQuotes === 0
              ? `${people.length} ${people.length === 1 ? 'person' : 'people'}`
              : `${people.length} · ${withQuotes} quoted`
          }
          {...(table.description ? { line: table.description } : {})}
          acts={
            <>
              <div className="cx-find">
                <span className="cx-find-mark" aria-hidden="true">
                  <MagnifyingGlass size={ICON_SIZE.small} weight="light" />
                </span>
                <input
                  className="cx-find-input"
                  type="search"
                  value={find}
                  placeholder="Find a customer"
                  aria-label="Find a customer by name, contact or note"
                  onChange={(e) => setFind(e.target.value)}
                />
              </div>

              {/* THE SORT STEPS ASIDE WHILE SOMEBODY IS TYPING.
                  `matchCustomers` ranks by relevance and re-sorting
                  that alphabetically would bury the best match in the
                  middle of the list, so the control says so rather
                  than appearing to be ignored. */}
              {/* THE SAME DROPDOWN THE BOARD USES. Two sort
                  controls that looked different were two things to
                  learn; both were native selects, which is to say
                  neither looked like this application. */}
              <Picker
                label="Sort"
                value={find.trim() === '' ? order : 'match'}
                options={
                  find.trim() === ''
                    ? [
                        { id: 'name' as const, label: 'Name A\u2013Z' },
                        { id: 'recent' as const, label: 'Quoted most recently' },
                        { id: 'worth' as const, label: 'Worth the most' },
                        { id: 'most' as const, label: 'Most quotes' },
                      ]
                    : [{ id: 'match' as const, label: 'Best match' }]
                }
                ariaLabel="How to order the register"
                /* THE SORT STEPS ASIDE WHILE SOMEBODY IS SEARCHING,
                   and says why rather than appearing ignored.
                   `matchCustomers` ranks a name that STARTS with the
                   query above one that merely contains it, and
                   re-sorting that alphabetically would bury the best
                   match in the middle of the list. */
                {...(find.trim() === ''
                  ? {}
                  : { disabledWhy: 'While you are searching, the closest names come first.' })}
                onPick={(id) => {
                  if (id !== 'match') setOrder(id)
                }}
              />

              <button
                type="button"
                className="cx-act cx-act--primary"
                onClick={() => {
                  const row = addCustomer()
                  if (row) onOpen(row.id)
                }}
              >
                <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                New customer
              </button>
            </>
          }
        />

        {people.length === 0 ? (
          <div className="cx-empty ds-rise">
            <span className="cx-empty-eyebrow">Nobody in it yet</span>
            <h2 className="cx-empty-title">The register is here and waiting.</h2>
            <p className="cx-empty-say">Add somebody, or file them from a quote.</p>

            <button
              type="button"
              className="cx-act cx-act--primary"
              onClick={() => {
                const row = addCustomer()
                if (row) onOpen(row.id)
              }}
            >
              <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
              New customer
            </button>
          </div>
        ) : shown.length === 0 ? (
          /* A DEAD END SAYS WHAT ELSE IT WOULD HAVE ANSWERED TO. The
             register is searched by name AND by everything in the
             contact lines and the note — see `haystack` — so saying so
             is the difference between "no" and "try this". */
          <p className="cx-none">
            Nothing matches “{find.trim()}”. Their name is searched, and so is anything
            in their contact details.
          </p>
        ) : (
          <ul className="cx-rows">
            {/* ── THE FIND BOX ANSWERED SILENTLY ────────────────────
                Typing in it removed rows from the list and said
                nothing at all, so a register of two hundred that
                narrowed to nine looked exactly like a register of
                nine — and the head above it went on printing 200,
                which is the reading a person would then have to
                reconcile on their own. One line, only while
                something is typed, and it is the same accounting the
                palette prints along its own foot.

                A LIST ITEM, BECAUSE IT IS INSIDE A LIST. A <p> here
                would be an invalid child of <ul> and a screen reader
                would read the list's length wrong; `role="presentation"`
                takes it back out of the count. */}
            {find.trim() !== '' ? (
              <li className="cx-shown" role="presentation">
                <span className="cx-num">{shown.length}</span> of{' '}
                <span className="cx-num">{people.length}</span> — the rest do not match
                “{find.trim()}”.
              </li>
            ) : null}
            {shown.map((c) => {
              const act = activity.get(c.rowId)
              return (
                <li
                  key={c.rowId}
                  className={`cx-row${openId === c.rowId ? ' is-open' : ''}`}
                >
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
                    <span className="cx-row-when">{act?.last ?? ''}</span>
                    {/* WHAT THEY HAVE BEEN QUOTED. Drawn only where
                        there is something to draw: a column of em
                        dashes down a new register is noise, and the
                        count beside it already says "none". */}
                    <span className="cx-num cx-row-worth">
                      {act ? money(act.worth) : ''}
                    </span>
                    <span className="cx-num cx-row-count">
                      {act
                        ? `${act.quotes} ${act.quotes === 1 ? 'quote' : 'quotes'}`
                        : '—'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
