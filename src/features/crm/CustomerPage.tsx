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

   ------------------------------------------------------------
   WHAT THE TWO-COLUMN PASS CHANGED, AND WHAT WAS MEASURED.

   1. THE DETAILS WERE A BANNER, NOT A FORM. Measured at 1600x1000:
      Name at 520px on its own row, then Phone, Email, Address and
      Notes as FOUR boxes of 280px strung across 1180px in one line,
      left edges at 322 / 622 / 922 / 1222. A phone number is
      eleven characters. The page ended at y=545 in a 920px well —
      375px of nothing under a screen whose own subject had been
      spread to the horizon to fill it. Details now hold one column
      at a measure a person can actually read down, and the history
      — which is what the screen is FOR — takes the room that was
      empty.

   2. FOUR CAPTIONS SAYING TWO THINGS. Three of them were the same
      69 characters, word for word. `groupByDescription` collapses a
      run of columns sharing one sentence into one caption under the
      group; 294 characters of caption became 156, and neither fact
      was lost. See form.ts for why the sentences were kept.

   3. THE EMPTY HISTORY WAS A FOUR-STEP ROUTE — "open a table, press
      Fitment, pick the one you are selling and press Quote this
      one, then choose this customer at the top of the quote". 44
      words of navigation instructions on the screen of a customer
      who has been quoted nothing. It is now the true short thing
      and the act itself, which is the shape every other empty state
      in this app already takes.

   4. THE CONTACT LINES WERE DRAWN TWICE — once under the name as a
      read-only strip, and again three inches below in the very
      boxes that hold them. The strip went; the boxes are the truth
      and they are editable.

   5. `PageHead` REPLACED THIS PAGE'S OWN HEADER. The register next
      door already had it, and a person walking from the row to the
      record crossed THREE different left edges to get here. This
      page's own `.cx-one-head` was `max-width: 1180px` centred in
      the 1336px well, so its title began at 322. The register's
      `PageHead` sat inside `.cx-scroll`'s own 20px inset and began
      at 276 — a second gutter on a child that already had one,
      which is the mistake the convention warns about. Modules and
      Quotes began at 256. Two different title sizes on top of that
      (52px here, 34px everywhere else). One header, one gutter, one
      size: the scroller's horizontal inset is gone and all three
      begin at 256, which is the figure crm.css records at the top
      of the file.

   6. A RECORD WITH NO NAME IS NOT A HEADLINE. "no name yet" was set
      in 52px italic Archivo — a placeholder given the largest voice
      on the screen, and the one thing on it that is not a fact
      about the customer. It is now the ordinary page-title step,
      where it reads as what it is: this page has no name yet, and
      the first box below is where the name goes. The register's own
      name COLUMN keeps its italic marker, and that is not a
      disagreement: that slot is a name slot and the italic is what
      says it is empty; this slot is a page title, and the honest
      title of a page about an unnamed customer is that fact.

   7. A HISTORY ROW SAID ITS DATE TWICE. `20260828-05 · 2026-08-28`
      — the reference is stamped from the same three local fields
      `localDay` formats, deliberately, so one moment can never be
      two calendar days. The row now prints the day only when the
      reference is not already carrying it, which is the imported
      case (`Q-7`, `seed-3`). See `dayWorthSaying` in form.ts.

   AND THE ONE THING NOT DONE HERE, so nobody reads it as an
   oversight: the New quote button below starts a quote, it does not
   ADDRESS it to this customer. `Stage` carries `{ kind: 'start', at }`
   where `at` is a place, not a person, and `QuoteStart` has nowhere
   to put a customer — so pre-addressing is a change to the shell's
   own union and to the picker, neither of which is this file's. The
   label is therefore the same words the rail uses and promises the
   same thing; "Quote them" would have been a lie.
   ============================================================ */

import type { ReactElement } from 'react'
import { ArrowSquareOut, Plus, Trash } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import {
  displayFieldOf,
  type CellValue,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'
import { PageHead } from '@/features/page'
import { localDay, money, quoteTotals, useCustomerQuotes } from '@/features/quote'
import { customerFormFields, customerRegister, readCustomer } from './customers'
import { dayWorthSaying, groupByDescription } from './form'
import { removeCustomer, setCustomerCell } from './register'
import './crm.css'

export interface CustomerPageProps {
  rowId: string
  /** open one of their quotes */
  onOpenQuote?: (quoteId: string) => void
  /** start a quote. Absent = the empty history states the fact and
   *  offers nothing, which is better than a button that does not
   *  go anywhere — the same rule `onOpenQuote` keeps. */
  onNewQuote?: () => void
  /** the customer is gone — the stage goes back to the list */
  onRemoved?: () => void
}

export function CustomerPage({
  rowId,
  onOpenQuote,
  onNewQuote,
  onRemoved,
}: CustomerPageProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const table = customerRegister(entities)
  const row = table ? (rowsByEntity[table.id] ?? []).find((r) => r.id === rowId) : undefined

  /* The hook runs whether or not the row is there — a hook may not be
     conditional, and an id that no longer resolves is a real state on
     this screen: a customer can be removed from the window next door.

     IT IS ALREADY NEWEST FIRST. The diary publishes sorted by
     `createdAt` descending and this filters that list without
     re-ordering it, so the history needs no sort of its own and
     cannot disagree with the register's "quoted most recently". */
  const theirs = useCustomerQuotes(rowId)

  if (!table || !row) {
    return (
      <div className="cx-root">
        <div className="ds-aurora ds-grain cx-sky" aria-hidden="true" />
        <div className="cx-scroll">
          <p className="cx-void">
          That customer is no longer in the register. Every quote written to them still
          opens and still prints — a quote keeps its own copy of the name and details it
            was given, so nothing on a document depends on this row still being
            here.
          </p>
        </div>
      </div>
    )
  }

  const read = readCustomer(table, row)
  const nameField = displayFieldOf(table)

  /* WHAT THEY HAVE BEEN QUOTED, summed — the same arithmetic the
     register's own "worth" column does, deliberately, so the figure
     beside a person's name on the list and the figure at the head of
     their record are the same number rather than two claims about
     one customer. */
  const worth = theirs.reduce((sum, q) => sum + quoteTotals(q).total, 0)

  return (
    <div className="cx-root">
      <div className="ds-aurora ds-grain cx-sky" aria-hidden="true" />
      <div className="cx-scroll">
        {/* THE APPLICATION'S HEADER, the same one the register next
            door takes. `name` is a plain string here — PageHead sets
            it as the page's title and there is no span to italicise
            inside it — so a record nobody has named says so in
            words, at the title step, instead of shouting a
            placeholder in 52px. The register's own name column
            keeps its italic marker; that slot is a NAME slot and the
            italic is what says it is empty. This slot is a page
            title, and the honest title of a page about an unnamed
            customer is that fact. */}
        <PageHead
          eyebrow="Customer"
          name={read.name === '' ? 'No name yet' : read.name}
          /* A COUNTED FACT, AND IT IS A FIGURE. `0 quotes` rather
             than "No quotes yet" because the slot is mono and
             tabular for figures, and because the panel below already
             says "Nothing quoted to them yet" — the head saying it
             too made three sentences beginning "No" stack down the
             left of one screen. The money is the same sum the
             register prints beside their name. */
          count={
            theirs.length === 0
              ? '0 quotes'
              : `${theirs.length} ${theirs.length === 1 ? 'quote' : 'quotes'} · ${money(worth)}`
          }
          acts={
            /* ── WHAT REMOVING THEM COSTS, BEFORE IT IS PRESSED ────
                This file's own header has claimed since it was
                written that "the screen that offers this says so
                before it is pressed". It did not. There was a Remove
                button and nothing else — and the fact worth knowing
                is a genuinely reassuring one, so withholding it made
                the press feel more dangerous than it is.

                IT IS NOT A CONFIRM SHEET, and it must not become
                one: the act is undoable and `removeCustomer` already
                raises a note with UNDO on it (rule 9 — a dialog is
                for the genuinely irreversible). This is the sentence
                beside the control, which is where rule 10 puts an
                explanation.

                IT IS ONLY DRAWN WHEN IT IS TRUE. Somebody with no
                quotes loses nothing but the row, and a paragraph
                explaining that documents survive would be furniture
                on the screen of a customer who has no documents. */
            <div className="cx-one-dropbox">
              <button
                type="button"
                className="cx-act cx-act--quiet cx-one-drop"
                onClick={() => {
                  removeCustomer(row.id)
                  onRemoved?.()
                }}
              >
                <Trash size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
                Remove
              </button>
              {theirs.length > 0 ? (
                <p className="cx-one-drop-say">
                  Their {theirs.length === 1 ? 'quote' : `${theirs.length} quotes`} still
                  {theirs.length === 1 ? ' opens' : ' open'} and still
                  {theirs.length === 1 ? ' prints' : ' print'} — each one kept its own
                  copy of the name and details it was given. What is lost is this page.
                </p>
              ) : null}
            </div>
          }
        />

        {/* THE TWO PANES. The container is queried rather than the
            window, because this page is mounted inside a stage well
            whose width is the window MINUS the rail — so a window
            rule would have switched to one column at a width the
            page never actually has. `views.css` makes the same
            call for the same reason. */}
        <div className="cx-rec">
          <div className="cx-rec-cols">
            {/* -- their details, from the table's own columns ------- */}
            <section className="cx-pane" aria-labelledby="crm-them-head">
              <h2 className="cx-pane-head" id="crm-them-head">
                Their details
              </h2>
              <div className="cx-form">
                {groupByDescription(customerFormFields(table)).map((group) => (
                  <div className="cx-group" key={group.fields[0]?.id ?? group.say}>
                    {group.fields.map((field) => (
                      <CustomerCell
                        key={field.id}
                        table={table}
                        row={row}
                        field={field}
                        isName={field.id === nameField?.id}
                      />
                    ))}
                    {/* ONE CAPTION FOR THE RUN. What the columns are
                        FOR, in the column's own words — not a second
                        sentence written here. */}
                    {group.say !== '' ? (
                      <p className="cx-group-say">{group.say}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            {/* -- the history with them ---------------------------- */}
            <section className="cx-pane" aria-labelledby="crm-hist-head">
              <h2 className="cx-pane-head" id="crm-hist-head">
                Quotes to them
              </h2>

              {theirs.length === 0 ? (
                /* THE ROUTE WENT AND THE ACT ARRIVED. What stood here
                   was four steps of navigation — a paragraph telling
                   somebody where the button is instead of being the
                   button. When the shell hands this page a way to
                   start one, it is one press; when it does not, the
                   page says the true short thing and claims nothing
                   it cannot do. */
                <div className="cx-hist-empty">
                  <p className="cx-hist-none">Nothing quoted to them yet.</p>
                  {onNewQuote ? (
                    <button
                      type="button"
                      className="cx-act cx-act--primary"
                      onClick={() => onNewQuote()}
                    >
                      <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                      New quote
                    </button>
                  ) : (
                    <p className="cx-hist-none">
                      A quote written to them is filed here.
                    </p>
                  )}
                </div>
              ) : (
                <ul className="cx-hist-list">
                  {theirs.map((q) => {
                    const totals = quoteTotals(q)
                    /* THE NAME THE DOCUMENT REALLY CARRIES. Said only
                       when it differs from the register today, because
                       that is the only time it tells anybody anything
                       — and when it does, it is the freeze working,
                       not a fault. */
                    const as = q.customer.name.trim()
                    /* '' for every quote this app minted, because its
                       reference already opens with the day. See
                       form.ts — the two were printing the same eight
                       digits an inch apart. */
                    const day = dayWorthSaying(q.reference, localDay(q.createdAt))
                    return (
                      <li key={q.id} className="cx-hist-row">
                        <button
                          type="button"
                          className="cx-hist-open"
                          disabled={!onOpenQuote}
                          onClick={() => onOpenQuote?.(q.id)}
                          aria-label={`Quote ${q.reference} — ${q.subjectLabel}`}
                        >
                          <span className="cx-hist-what">
                            {q.subjectLabel}
                            {as !== '' && as !== read.name ? (
                              <span className="cx-hist-as"> quoted as {as}</span>
                            ) : null}
                          </span>
                          <span className="cx-num cx-hist-total">{money(totals.total)}</span>
                          {/* THE DOCUMENT'S OWN NUMBER — what a person
                              reads back down a phone — and the day,
                              when the number is not already carrying
                              it. Mono, because both are identifiers. */}
                          <span className="cx-hist-meta">
                            <span className="cx-num cx-hist-ref">{q.reference}</span>
                            {day !== '' ? (
                              <>
                                <span className="cx-hist-dot" aria-hidden="true">
                                  ·
                                </span>
                                <span className="cx-num cx-hist-when">{day}</span>
                              </>
                            ) : null}
                          </span>
                          {/* A STATE IS A VALUE, so it keeps its own
                              case. `mono-label` uppercased it, which
                              turned "Given" and "Draft" — two words a
                              person reads — into two more stamps on a
                              screen that already had enough. */}
                          <span
                            className="cx-hist-state"
                            data-state={q.state === 'issued' ? 'given' : 'draft'}
                          >
                            {q.state === 'issued' ? 'Given' : 'Draft'}
                            {q.supersedesId ? ' · new version' : ''}
                          </span>
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
        </div>
      </div>
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
        <span className="cx-field-name">{field.name}</span>
        {/* THE BAR IT NAMED IS GONE. This sentence sent a person to
            "Tables on the bar" — the floating dock, which the
            redesign removed. A refusal whose instruction names a
            control that is not on screen is worse than no refusal:
            it is a wrong answer given confidently. Every table now
            lives under Tables in the rail down the left. */}
        <p className="cx-field-stub-say">
          This column is edited on the {table.name} table — open it under{' '}
          <em>Tables</em> in the rail on the left.
        </p>
      </div>
    )
  }

  if (field.type === 'boolean') {
    return (
      <label className="cx-field cx-field--tick">
        <input
          className="cx-tick"
          type="checkbox"
          checked={raw === true}
          onChange={(e) => write(e.target.checked)}
        />
        <span className="cx-field-name">{field.name}</span>
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <label className="cx-field">
        <span className="cx-field-name">{field.name}</span>
        <select
          className="cx-input"
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
      <span className="cx-field-name">{field.name}</span>
      <input
        className="cx-input"
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
    </label>
  )
}
