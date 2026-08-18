/* ============================================================
   THE QUOTE WHILE IT IS STILL A DRAFT.

   It opens ALREADY MADE. The subject is on it, and one section per
   view block in the view's own order: a section whose block had a
   starred row arrives as a priced line with its rigging kit and prop
   under it; a section with nothing starred shows its candidates
   exactly as the view page ordered them, and picking one is ONE
   CLICK. The salesperson never configures twice, and the list in
   front of them has not moved.

   ONE FIELD IS FOCUSED ON OPEN — the customer's name. Everything
   else about the customer sits behind a quiet disclosure and is
   never required. Production made a salesperson retype five
   free-text fields for every quote for a repeat buyer, while a
   CustomerPicker existed and was wired only into the stock branch of
   the same dialog.

   NO PLACEHOLDER HERE IS EVER A VALUE. "the customer's name" is an
   instruction; a name would be a fabricated customer that a
   screenshot cannot tell from a real one.

   NOTHING ON THIS SCREEN COMPUTES A PRICE. Every number it shows was
   frozen onto its line when that line was picked. The ONE place that
   reads live data is the candidate list — which is the picker, and a
   candidate is not part of the quote until it is minted.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement, RefObject } from 'react'
import { CaretDown, CaretRight, Plus, Star, Warning, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import {
  heldBackSentence,
  retiredPairsSentence,
  retiredTableSentence,
} from '@/features/views/sellable'
/* PURE, AND THEREFORE SAFE TO READ HERE. `crm/customers` imports no
   store, no React and nothing of ours — the deep path is what keeps
   this out of the barrel cycle described in freeze.ts. */
import {
  exactCustomer,
  matchCustomers,
  type CustomerRead,
} from '@/features/crm/customers'
import {
  OFFER_CAP,
  SUBJECT_BLOCK,
  candidateOffer,
  customerBook,
  fileCustomer,
  freezeCustomer,
  hasCustomerRegister,
  priceChanges,
  unsellableSubject,
  type PriceChange,
} from './freeze'
import {
  chargeAlreadyIn,
  chargeAlreadyInSentence,
  chargeNamedBy,
  money,
  parseAmount,
  quoteLevelChoices,
} from './pricing'
import { issueBlockers, lineAmount, linesOf, needsOverrideReason, quoteTotals } from './totals'
import {
  addAdjustment,
  addLine,
  applyPriceChanges,
  issueQuote,
  linkCustomer,
  patchQuote,
  persistNote,
  removeAdjustment,
  removeLine,
  setAdjustmentMagnitude,
  setLevel,
  setLineLevel,
  setOverride,
  setQty,
  unlinkCustomer,
  updateAdjustment,
  useCustomerQuotes,
} from './quotes'
import { FrozenPhoto } from './photo'
import { CHARGE_TITLE } from './types'
import type {
  AdjustmentKind,
  FrozenLevel,
  QuoteDef,
  QuoteLine,
  QuoteSection,
  RungCharge,
} from './types'

/** The four controls under the sections. Each is a sentence, and
 *  each signs what a person types (see SIGN in quotes.ts) so nobody
 *  has to remember a minus. */
const ADJUSTMENT_DOORS: Array<{ kind: AdjustmentKind; door: string }> = [
  { kind: 'discount', door: 'Add a discount' },
  { kind: 'rebate', door: 'Add a rebate' },
  { kind: 'tradeIn', door: 'Add a trade-in' },
  { kind: 'line', door: 'Add a line' },
]

/** THE SENTENCE UNDER THE EMPTY CUSTOMER FIELD.
 *
 *  DESIGN_PRINCIPLES rule 10: the refusal goes where the thing is
 *  refused. The foot bar says the quote cannot go out; this says which
 *  keystroke fixes it, at the field it is about — the same arrangement
 *  the override's reason field already has. Drawn only while it is
 *  true, so it is a refusal in place and not a permanent instruction
 *  nobody reads. */
const NO_CUSTOMER_WHY =
  'A quote is addressed to somebody. Until this is written it cannot be given to the customer — giving it to them freezes the document, so the name cannot be added later.'

export interface QuoteEditorProps {
  quote: QuoteDef
  /** the stage's own "it is issued now" move — drawing the document
   *  is the stage's business, not this screen's */
  onIssued?: (quote: QuoteDef) => void
  /** Open the customer this quote is addressed to. Absent = the link
   *  is still SAID (a fact is better than a control that does
   *  nothing) but not offered as a door, so this screen still works
   *  wherever it is mounted. */
  onOpenCustomer?: (rowId: string) => void
}

export function QuoteEditor({
  quote,
  onIssued,
  onOpenCustomer,
}: QuoteEditorProps): ReactElement {
  const totals = quoteTotals(quote)
  const levels = useMemo(() => quoteLevelChoices(quote.lines), [quote.lines])
  const [details, setDetails] = useState(false)
  const [contact, setContact] = useState(false)
  const [changes, setChanges] = useState<PriceChange[] | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  /* the first thing to do on this screen is type a name, so the
     caret is already there — one field, focused on open */
  useEffect(() => {
    nameRef.current?.focus()
  }, [quote.id])

  /* WHAT THE DOCUMENT ALREADY SAYS ABOUT THE CUSTOMER IS NOT HIDDEN.
     The contact block is a quiet disclosure because most quotes have
     nothing in it — but a quote that DOES carry contact lines is a
     quote whose lines print on the customer's page and travel into
     the register when the name beside them is filed, and a person
     cannot check what they cannot see. So it opens itself exactly
     when there is something in it, once per document, and closes
     again on a quote that has none. Collapsing it by hand still
     works: this only runs when a different quote arrives. */
  useEffect(() => {
    setContact((quote.customer.contact ?? []).length > 0)
  }, [quote.id])

  const saveNote = persistNote()

  /* THE LAST CHECKPOINT BEFORE A CUSTOMER SEES THIS. A live read, on
     the DRAFT only: the subject was frozen onto the document when it
     was minted and the document prints what it froze, so this can
     never change a number — it is the sentence a salesperson needs
     before pressing "Give it to the customer" on a hull the business
     has stopped selling. `QuoteDocument` deliberately does not draw
     it: an issued quote is a record of what was offered. */
  const subjectNote = quote.state === 'draft' ? unsellableSubject(quote.rootTableId, quote.rootRowId) : ''

  /* EVERYTHING THAT STOPS THIS GOING OUT — computed from the quote
     itself by `issueBlockers`, which `issueQuote` also calls, so the
     button, the sentences beside it, the note under the customer field
     and the registry cannot disagree about whether it may. Every
     reason that applies is printed: a person who fixes one and is then
     refused for a second reason nobody mentioned has been told half
     the truth. */
  const refusals = issueBlockers(quote)

  return (
    /* THE DOCUMENT SCROLLS AND THE TOTAL DOES NOT — and they are
       SIBLINGS, which is the whole of the fix.

       The total used to be `position: sticky; bottom: 0` as the last
       child of `.qt-edit`, inside the page's own scrollport, so at the
       top and the middle of the scroll it floated over the middle of the
       quote with lines passing behind it. It is opaque, so nothing was
       hidden; it was still a total painted across its own document, and
       a total is the END of a document.

       Of the two answers — give the scroller room, or stop it being
       sticky — the first is the trap DESIGN_CONTRACT §8.7 was written
       from: a sticky box is floored by its scroll container's CONTENT
       box, so padding the scrollport lifts the bar off the bottom edge
       and lets the document go on painting through the strip beneath it.
       That was measured once already (the note on `.qt-root`).

       So the bar leaves the scroll entirely. `.qt-root--edit` is the
       column, `.qt-edit` is the scrollport inside it, and the total is a
       sibling BELOW that scrollport where no line can reach it. Nothing
       is sticky, nothing is padded to clear anything, the 78px the dock
       needs is still reserved once on `.shell-stage`, and the running
       total stays visible while a person works. */
    <>
      <div className="qt-edit">
        <div className="qt-sheet">
          <span className="qt-tick qt-tick--tl" aria-hidden="true" />
          <span className="qt-tick qt-tick--tr" aria-hidden="true" />

          {subjectNote !== '' ? (
            <p className="qt-warn" role="status">
              <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              {subjectNote}
            </p>
          ) : null}

          {saveNote ? (
            <p className="qt-warn" role="status">
              <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              {saveNote}
            </p>
          ) : null}

          {/* -- who it is for, and at which rung ---------------- */}
          <header className="qt-edit-head">
            <div className="qt-edit-for">
              <CustomerField
                quote={quote}
                nameRef={nameRef}
                onOpenCustomer={onOpenCustomer}
              />

              {levels.length > 1 ? (
                <div className="qt-levels" role="group" aria-label="Price level">
                  <span className="mono-label">Priced at</span>
                  {levels.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      className={`qt-chip${quote.levelKey === l.key ? ' is-on' : ''}`}
                      aria-pressed={quote.levelKey === l.key}
                      onClick={() => setLevel(quote.id, l.key)}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="qt-edit-subject">
              <FrozenPhoto
                img={quote.subjectImage}
                fallbackAlt={quote.subjectLabel}
                className="qt-edit-photo"
                w={120}
                h={90}
              />
              <div>
                <p className="mono-label">{quote.reference}</p>
                <h1 className="qt-edit-name">{quote.subjectLabel}</h1>
              </div>
            </div>
          </header>

          <button
            type="button"
            className="qt-disclose"
            aria-expanded={contact}
            onClick={() => setContact((v) => !v)}
          >
            {contact ? <CaretDown size={11} weight="bold" /> : <CaretRight size={11} weight="bold" />}
            Add contact details
          </button>
          {contact ? (
            <label className="qt-field qt-field--wide">
              <span className="mono-label">Contact</span>
              <textarea
                className="field-input qt-input"
                rows={3}
                value={(quote.customer.contact ?? []).join('\n')}
                placeholder={'one line each — as it should print on the quote'}
                onChange={(e) =>
                  patchQuote(quote.id, {
                    customer: {
                      ...quote.customer,
                      contact: e.target.value.split('\n').filter((l) => l.trim() !== ''),
                    },
                  })
                }
              />
            </label>
          ) : null}

          {/* -- the rig ----------------------------------------- */}
          {quote.sections.map((section) => (
            <SectionCard key={section.blockId} quote={quote} section={section} />
          ))}

          {/* -- adjustments ------------------------------------- */}
          <section className="qt-adjustments">
            <p className="mono-label">Adjustments</p>
            {quote.adjustments.map((a) => (
              <div key={a.id} className="qt-adj">
                <input
                  className="field-input qt-input"
                  value={a.label}
                  placeholder={
                    a.kind === 'tradeIn'
                      ? 'what is being traded in'
                      : a.kind === 'rebate'
                        ? 'the rebate, as it should print'
                        : a.kind === 'discount'
                          ? 'why the discount is given'
                          : 'what this line is for'
                  }
                  onChange={(e) => updateAdjustment(quote.id, a.id, { label: e.target.value })}
                />
                <input
                  className="field-input qt-input qt-input--amount"
                  inputMode="decimal"
                  value={a.amount === 0 ? '' : String(Math.abs(a.amount))}
                  placeholder="amount"
                  aria-label="Amount"
                  onChange={(e) =>
                    setAdjustmentMagnitude(quote.id, a.id, parseAmount(e.target.value) ?? 0)
                  }
                />
                <span className={`qt-adj-sign${a.amount < 0 ? ' is-credit' : ''}`}>
                  {money(a.amount)}
                </span>
                {/* AN × IS NOT A NAME. Every one of these buttons drew an
                    icon and a `title` and nothing else, so a screen
                    reader announced five unnamed buttons on a document
                    about to be handed to a customer. The label names the
                    ROW it acts on, not the shape it is drawn as, because
                    five identical "Remove"s in a list is the same defect
                    one step further on. */}
                <button
                  type="button"
                  className="qt-icon-btn"
                  aria-label={`Take ${a.label.trim() === '' ? 'this adjustment' : a.label} off the quote`}
                  title="Take this off the quote"
                  onClick={() => removeAdjustment(quote.id, a.id)}
                >
                  <X size={12} weight="bold" />
                </button>
                <AlreadyInThePrice label={a.label} lines={quote.lines} />
              </div>
            ))}
            <div className="qt-adj-doors">
              {ADJUSTMENT_DOORS.map((d) => (
                <button
                  key={d.kind}
                  type="button"
                  className="qt-adj-door"
                  onClick={() => addAdjustment(quote.id, d.kind)}
                >
                  <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                  {d.door}
                </button>
              ))}
            </div>
          </section>

          {/* -- the details nobody needs on the way in ---------- */}
          <button
            type="button"
            className="qt-disclose"
            aria-expanded={details}
            onClick={() => setDetails((v) => !v)}
          >
            {details ? <CaretDown size={11} weight="bold" /> : <CaretRight size={11} weight="bold" />}
            Reference, tax and notes
          </button>
          {details ? (
            <div className="qt-details">
              <label className="qt-field">
                <span className="mono-label">Prepared by</span>
                <input
                  className="field-input qt-input"
                  value={quote.preparedBy ?? ''}
                  placeholder="your name"
                  onChange={(e) => patchQuote(quote.id, { preparedBy: e.target.value })}
                />
              </label>
              <label className="qt-field">
                <span className="mono-label">Reference</span>
                <input
                  className="field-input qt-input"
                  value={quote.reference}
                  onChange={(e) => patchQuote(quote.id, { reference: e.target.value })}
                />
              </label>
              <label className="qt-field">
                <span className="mono-label">Tax rate %</span>
                <input
                  className="field-input qt-input"
                  inputMode="decimal"
                  value={quote.taxRate === undefined ? '' : String(quote.taxRate)}
                  /* BLANK IS NOT ZERO and blank is the default: there is
                     no tax-rate column anywhere in the data, so the
                     document prints the inclusive sentence until a
                     person states a rate */
                  placeholder="leave blank if the total is tax-inclusive"
                  onChange={(e) => {
                    const n = parseAmount(e.target.value)
                    patchQuote(quote.id, { taxRate: n === null ? undefined : n })
                  }}
                />
              </label>
              <label className="qt-field qt-field--wide">
                <span className="mono-label">Note on the quote</span>
                <input
                  className="field-input qt-input"
                  value={quote.note ?? ''}
                  placeholder="validity, conditions — printed as typed"
                  onChange={(e) => patchQuote(quote.id, { note: e.target.value })}
                />
              </label>
            </div>
          ) : null}

          {/* -- today's prices, as a diff and never silently ---- */}
          <section className="qt-reread">
            {changes === null ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setChanges(priceChanges(quote))}
              >
                Re-read today's prices
              </button>
            ) : changes.length === 0 ? (
              <p className="qt-reread-say">
                Nothing has moved — every line still matches today's price file.
                <button type="button" className="qt-linkbtn" onClick={() => setChanges(null)}>
                  Close
                </button>
              </p>
            ) : (
              <div className="qt-reread-diff">
                <p className="mono-label">What would change</p>
                <ul className="qt-reread-list">
                  {changes.map((c) => (
                    <li key={c.lineId} className="qt-reread-row">
                      <span className="qt-reread-name">{c.label}</span>
                      {c.gone ? (
                        <span className="qt-nil">that row is no longer on the sheet</span>
                      ) : (
                        <span className="qt-num">
                          <span className="qt-was">
                            {c.from === null ? 'not priced' : money(c.from)}
                          </span>
                          {c.to === null ? 'not priced' : money(c.to)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="qt-reread-acts">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      applyPriceChanges(quote.id, changes)
                      setChanges(null)
                    }}
                  >
                    Use today's prices
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setChanges(null)}>
                    Leave them as they are
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* -- the foot bar: under the document, never over it ---- */}
      <div className="qt-foot">
        <div className="qt-foot-line">
          <div className="qt-foot-sum">
            <span className="mono-label">Total</span>
            <span className="qt-foot-total">{money(totals.total)}</span>
            {totals.unpricedCount > 0 ? (
              <span className="qt-foot-unpriced">
                {totals.unpricedCount} not priced
              </span>
            ) : null}
          </div>
          {/* DISABLED, WITH THE REASONS ONE LINE AWAY — never a disabled
              control on its own. `issueQuote` refuses the same cases, so
              the button and the registry cannot disagree; if it ever
              returns false the document stays a draft and the stage is
              not told anything happened. */}
          <button
            type="button"
            className="btn btn-primary"
            disabled={refusals.length > 0}
            onClick={() => {
              if (issueQuote(quote.id)) onIssued?.(quote)
            }}
          >
            Give it to the customer
          </button>
        </div>
        {refusals.length > 0 ? (
          <div className="qt-foot-whys" role="status">
            {refusals.map((why) => (
              <p key={why} className="qt-foot-why">
                {why}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}

/* ============================================================
   WHO IT IS FOR — a typed name, or a customer.

   BOTH WAYS IN STAY OPEN, and that is the whole design. Every quote
   this app has ever raised was addressed to a name somebody typed,
   and a walk-in who gives a name and no details is a real deal, not
   a filing error. So the control is the same input it always was:
   typing works, typing is enough, and the quote can be issued on a
   typed name alone.

   What is NEW sits underneath it. When the project has a customer
   register, what has been typed is matched against it, and choosing
   somebody does two separate things that must not be confused:

     · it FREEZES their name and contact lines onto this document,
       exactly the way a price is frozen onto a line — corrected in
       the register on Friday, the quote handed over on Monday still
       says what it said;
     · it writes the ROW ID beside them, and that id answers exactly
       one question ever — "what else have we quoted them?".

   WHY THE PICKER READS LIVE DATA AND THE DOCUMENT NEVER DOES. This
   feature keeps `useProjectStore` to freeze.ts so a drawn quote can
   never touch the store; a picker is the declared exception, in this
   screen's own header — "The ONE place that reads live data is the
   candidate list ... and a candidate is not part of the quote until
   it is minted". The register is read on FOCUS, into state, and
   nothing on this screen re-reads it while it is being drawn.

   IT NEVER MAKES A TABLE. Filing a typed name adds a ROW to a
   register that already exists. If there is none, this says so and
   names the place where one is made — DESIGN_CONTRACT §7, structure
   is never a side effect of typing.
   ============================================================ */

/** What was read out of the register when the field was last
 *  focused. `has` and an empty `list` are different facts: no
 *  register at all, and a register with nobody in it yet. */
interface Book {
  has: boolean
  list: CustomerRead[]
}

function CustomerField({
  quote,
  nameRef,
  onOpenCustomer,
}: {
  quote: QuoteDef
  nameRef: RefObject<HTMLInputElement | null>
  onOpenCustomer?: (rowId: string) => void
}): ReactElement {
  const [book, setBook] = useState<Book | null>(null)
  const [open, setOpen] = useState(false)

  const typed = quote.customer.name
  const noCustomer = typed.trim() === ''
  const ref = quote.customerRef

  /* THE HISTORY, counted from the quote registry rather than looked
     up: `useCustomerQuotes` subscribes to the same published list the
     diary draws from, so this number and that page can never
     disagree. Called unconditionally with '' when there is no link,
     because a hook may not be conditional. */
  const theirs = useCustomerQuotes(ref?.rowId ?? '')
  const others = Math.max(0, theirs.length - 1)

  /* THE ONE LIVE READ, and it is an event. */
  const read = (): Book => {
    const next = { has: hasCustomerRegister(), list: customerBook() }
    setBook(next)
    return next
  }

  const suggestions = book && book.has ? matchCustomers(book.list, typed) : []
  const already = book && book.has ? exactCustomer(book.list, typed) : undefined
  /* offered only for a name that is really new, in a register that
     really exists, and never while this quote is already linked */
  const canFile = book?.has === true && !ref && !already && !noCustomer

  const link = (frozen: ReturnType<typeof freezeCustomer>): void => {
    if (!frozen) return
    linkCustomer(quote.id, frozen)
    setOpen(false)
  }

  return (
    <div
      className="qt-who"
      /* the list closes when focus leaves the whole control, never on
         the input's own blur — a blur fires on the way to the option
         being clicked, and closing there is why so many pickers
         cannot be clicked at all */
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <label className="qt-field">
        <span className="mono-label">Customer</span>
        <input
          ref={nameRef}
          className="field-input qt-input qt-input--name"
          value={typed}
          placeholder="the customer's name"
          spellCheck={false}
          autoComplete="off"
          aria-describedby={noCustomer ? `${quote.id}-who` : undefined}
          onFocus={() => {
            read()
            setOpen(true)
          }}
          onChange={(e) => {
            /* TYPING OVER A LINKED NAME DOES NOT SILENTLY UNLINK IT.
               The document is what the person is editing; the link is
               a separate fact with its own control beneath, which
               says what it does. Quietly dropping a pointer because
               somebody fixed a spelling is the kind of invisible
               state change this app is being written against. */
            patchQuote(quote.id, { customer: { ...quote.customer, name: e.target.value } })
            if (!open) read()
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && open) {
              e.stopPropagation()
              setOpen(false)
            }
          }}
        />
      </label>

      {/* -- who this document is addressed to, as a record -------- */}
      {ref ? (
        <p className="qt-who-link">
          <span className="qt-who-link-say">
            Filed under <strong>{typed.trim() === '' ? 'this customer' : typed}</strong> in
            Customers
            {others > 0
              ? ` · ${others} other quote${others === 1 ? '' : 's'} to them`
              : ' · this is their first quote'}
          </span>
          {onOpenCustomer ? (
            <button
              type="button"
              className="qt-who-act"
              onClick={() => onOpenCustomer(ref.rowId)}
            >
              Open them
            </button>
          ) : null}
          <button
            type="button"
            className="qt-who-act"
            /* it takes the POINTER off and leaves every word of the
               document where it is — see `unlinkCustomer` */
            title="Keep the name on this quote and stop it pointing at that record"
            onClick={() => unlinkCustomer(quote.id)}
          >
            Not them
          </button>
        </p>
      ) : null}

      {/* -- the picker ------------------------------------------- */}
      {open && book && book.has && suggestions.length > 0 ? (
        <ul className="qt-who-list" role="listbox" aria-label="Customers">
          {suggestions.map((c) => (
            <li key={c.rowId}>
              <button
                type="button"
                className="qt-who-opt"
                onClick={() => link(freezeCustomer(c.rowId))}
              >
                <span className="qt-who-opt-name">
                  {c.name === '' ? 'no name yet' : c.name}
                </span>
                <span className="qt-who-opt-say">{c.contact.join('  ·  ')}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* THE NAME IS NOT IN THE BOOK YET. An offer, in the words of
          what it does, and it adds a ROW — never a table. */}
      {open && canFile ? (
        <button
          type="button"
          className="qt-who-act qt-who-file"
          onClick={() => link(fileCustomer(typed, quote.customer.contact ?? []))}
        >
          Add {typed.trim()} to your customers
        </button>
      ) : null}

      {/* THERE IS NOWHERE TO FILE THEM YET, said once the field has
          been used and only then — a permanent instruction under an
          empty field is furniture nobody reads. It names the place
          rather than offering to build a table from inside a quote. */}
      {open && book && !book.has && !noCustomer ? (
        <p className="qt-who-none">
          This quote will print their name and details either way. To keep them —
          so a second quote to them starts from what you already know — open{' '}
          <em>Customers</em> on the bar and start the register there.
        </p>
      ) : null}

      {/* THE REFUSAL COMES LAST, UNDER EVERYTHING. It used to sit
          straight beneath the input, which pushed the register's own
          matches three lines away from the field they belong to — a
          picker that is not attached to its control reads as an
          unrelated list. The sentence is still in place (rule 10) and
          still the field's `aria-describedby`, which is what a screen
          reader follows; only the visual order moved. */}
      {noCustomer ? (
        <span className="qt-field-why" id={`${quote.id}-who`}>
          {NO_CUSTOMER_WHY}
        </span>
      ) : null}
    </div>
  )
}

/* ============================================================
   ONE SECTION — what goes with the subject, from one table
   ============================================================ */

function SectionCard({
  quote,
  section,
}: {
  quote: QuoteDef
  section: QuoteSection
}): ReactElement {
  const [picking, setPicking] = useState(false)
  const lines = linesOf(quote, section.lineIds)
  const subject = section.blockId === SUBJECT_BLOCK

  /* LIVE READ, ON PURPOSE AND ONLY HERE. Deferred until the picker is
     open so a drawn quote never touches the store. */
  const offer = useMemo(
    () => (picking ? candidateOffer(quote, section) : { candidates: [], heldCount: 0 }),
    [picking, quote, section],
  )
  const candidates = offer.candidates

  /* WHAT THE PICKER REFUSED TO OFFER, in the same words the view page
     uses. A menu that is quietly three items short is a menu nobody
     can trust, and the salesperson looking at it is the person who
     would otherwise have quoted a trailer the business stopped
     selling. */
  const refusedNote =
    offer.historic === 'table'
      ? retiredTableSentence(section.title)
      : offer.historic === 'pairs'
        ? retiredPairsSentence(section.title, 'The list it was picked from')
        : heldBackSentence(offer.heldCount, section.title)

  return (
    <section className="qt-section">
      <header className="qt-section-head">
        <h2 className="mono-label">{section.title}</h2>
      </header>

      {lines.map((line) => (
        <LineRow key={line.id} quote={quote} line={line} removable={!subject} />
      ))}

      {/* AN EMPTY SECTION MUST SAY WHY IT IS EMPTY. When the view page
          had rows picked but none starred, the quote deliberately does
          not choose between them — a block is a menu and a rig takes
          one. Saying only "Nothing from Yamaha Outboards on this quote
          yet" reads as "you configured nothing", which is false and
          sent people back to re-pick what they had already picked. So
          the count comes with it, and it names the star as the way to
          make the choice stick next time. */}
      {lines.length === 0 && !picking ? (
        section.pickedCount && section.pickedCount > 1 ? (
          <p className="qt-section-empty">
            {section.pickedCount} {section.title} were picked for this one, so none was
            chosen for you — pick the one you are quoting. Starring it on the page makes
            it come across on its own next time.
            {section.heldCount ? ` ${heldBackSentence(section.heldCount, section.title)}` : ''}
          </p>
        ) : (
          <p className="qt-section-empty">
            Nothing from {section.title} on this quote yet.
            {/* AND WHY THERE MIGHT BE NOTHING. Frozen at mint, so this
                still reads true after the sheet changes. */}
            {section.heldCount ? ` ${heldBackSentence(section.heldCount, section.title)}` : ''}
          </p>
        )
      ) : null}

      {subject ? null : picking ? (
        <div className="qt-picker">
          <div className="qt-picker-bar">
            <span className="mono-label">Pick from {section.title}</span>
            <button
              type="button"
              className="qt-icon-btn"
              aria-label={`Close the ${section.title} picker`}
              title="Close"
              onClick={() => setPicking(false)}
            >
              <X size={12} weight="bold" />
            </button>
          </div>
          {candidates.length === 0 ? (
            <p className="qt-section-empty">
              {refusedNote !== ''
                ? refusedNote
                : /* THE PLACE IS CALLED FITMENT, and this sentence was the
                     last copy in the app still directing somebody to a
                     page by a name that page no longer uses — the phrase
                     the owner named outright as confusing. Same door,
                     same act, the name the bar and the button both use. */
                  `Nothing from ${section.title} goes with this one yet. Set that up on the table's Fitment page.`}
            </p>
          ) : (
            <ul className="qt-picker-list">
              {/* keyed on the minted line, never on the row: one hull
                  offers the same motor in several slots, so a row id is
                  not unique among candidates (FITMENT_RULES.md §1.4) */}
              {candidates.map((c) => (
                <li key={c.line.id}>
                  <button
                    type="button"
                    className="qt-pick"
                    disabled={c.alreadyLineId !== undefined}
                    onClick={() => {
                      addLine(quote.id, section.blockId, c.line)
                      setPicking(false)
                    }}
                  >
                    {c.line.recommended ? (
                      <span className="qt-star" title="Recommended">
                        <Star size={11} weight="fill" />
                      </span>
                    ) : null}
                    <span className="qt-pick-name">{c.line.label}</span>
                    <span className="qt-pick-facts">
                      {(c.line.pairFacts ?? [])
                        .slice(0, 2)
                        .map((f) => `${f.label} ${f.value}`)
                        .join('  ·  ')}
                    </span>
                    <span className="qt-num">
                      {c.line.unitPrice === null ? (
                        <span className="qt-nil">not priced here</span>
                      ) : (
                        money(c.line.unitPrice)
                      )}
                    </span>
                    {c.alreadyLineId !== undefined ? (
                      <span className="mono-label qt-pick-on">on the quote</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {candidates.length > 0 && refusedNote !== '' ? (
            <p className="qt-section-empty" role="note">
              {refusedNote}
            </p>
          ) : null}
          {candidates.length === OFFER_CAP ? (
            <p className="qt-section-empty mono-label">
              First {OFFER_CAP} — narrow the list on the sheet to see the rest
            </p>
          ) : null}
        </div>
      ) : (
        <button type="button" className="qt-add" onClick={() => setPicking(true)}>
          <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          Add from {section.title}
        </button>
      )}
    </section>
  )
}

/* ============================================================
   WHAT THIS PRICE ALREADY HAS IN IT

   Four cells in the Master Price File say a price column contains a
   charge, and they were a paragraph at the head of `pricing.ts`
   until `RungContents` made them data. This draws them where a
   person can act on them: beside the column name the line was
   priced from, on the panel that already answers "where did this
   number come from".

   ONLY WHAT A CELL SAYS. `true` prints; `false` prints, because "the
   fitting is NOT in this one" is the sentence that tells a
   salesperson the fitting charge below it is correct; `undefined`
   prints nothing, because a rung nobody has measured has nothing to
   report and a row of "unknown" on every line would be noise wearing
   the shape of information.
   ============================================================ */

function ContainedCharges({ level }: { level: FrozenLevel | undefined }): ReactElement | null {
  const c = level?.contains
  if (!c) return null

  const said: Array<{ charge: RungCharge; has: boolean }> = []
  if (c.includesRegistration !== undefined)
    said.push({ charge: 'registration', has: c.includesRegistration })
  if (c.includesInstall !== undefined) said.push({ charge: 'install', has: c.includesInstall })
  if (c.includesPreDelivery !== undefined)
    said.push({ charge: 'preDelivery', has: c.includesPreDelivery })
  if (said.length === 0) return null

  return (
    <p className="qt-line-holds">
      {said.map((s, i) => (
        <span key={s.charge}>
          {i > 0 ? ' ' : ''}
          {s.has ? 'Has ' : 'Does not have '}
          <b>{CHARGE_TITLE[s.charge]}</b> in it.
        </span>
      ))}
      <span className="qt-line-holds-src">{c.source}</span>
    </p>
  )
}

/* ============================================================
   IT IS ALREADY IN THE PRICE — the one place a fee gets charged
   twice, and the sentence that catches it.

   THE FAILURE, from `docs/specs/SERVICE_AND_THEMES.md` §5.2:
   "The trailer must not get a second rego line. Its fee is inside
   `Sell inc Rego`. That is a fact about the column and is enforced
   by the `rung` flags of theme 5, NOT by a developer remembering."
   A free line is where a person types the word `Registration` and an
   amount, and until now nothing in this app knew that the trailer
   two rows above already had that fee inside its price.

   IT SAYS, IT DOES NOT STOP. Six of the nineteen rows in
   `Registration Costs` are fees that are NOT the one already inside
   `Sell inc Rego` — the boat and trailer transfer fees, the
   replacement plate, the unregistered vehicle permit, the VIN plate
   and the PPSR fee — and every one of them is a legitimate second
   registration line on a document that also carries a trailer. A
   guard that refused those would be refusing a charge the business
   makes, and a warning that is wrong is a warning people learn to
   click past. So this is DESIGN_PRINCIPLES rule 10 (say why, where
   it is) and not rule 9: nothing is undone, nothing is blocked, and
   the evidence is on screen beside the field that caused it.

   IT COSTS NOTHING WHEN IT HAS NOTHING TO SAY. No typed label, no
   matching charge, or no line whose column contains it, and this
   draws nothing at all — chrome charged to the page only when it is
   used.
   ============================================================ */

function AlreadyInThePrice({
  label,
  lines,
}: {
  label: string
  lines: QuoteLine[]
}): ReactElement | null {
  const charge = chargeNamedBy(label)
  if (!charge) return null
  const found = chargeAlreadyIn(lines, charge)
  const say = chargeAlreadyInSentence(found, charge)
  if (!say) return null

  /* one cell per distinct source, in the order the lines are on the
     quote — two trailers cite the same formula and it is said once */
  const cells = [...new Set(found.map((f) => f.source).filter((x) => x !== ''))]

  return (
    <p className="qt-adj-already" role="status">
      {say} Adding it here charges it twice — unless this one is a different fee, which is
      a thing the fee table has several of.
      <span className="qt-adj-already-src">{cells.join(' · ')}</span>
    </p>
  )
}

/* ============================================================
   ONE LINE — frozen, and every control on it says which number
   it is changing
   ============================================================ */

function LineRow({
  quote,
  line,
  removable,
}: {
  quote: QuoteDef
  line: QuoteLine
  removable: boolean
}): ReactElement {
  const [open, setOpen] = useState(false)
  const { amount, overridden } = lineAmount(line)
  const otherLevels = line.levels.filter((l) => l.key !== line.levelResolved)

  return (
    <div className={`qt-line${open ? ' is-open' : ''}`}>
      <div className="qt-line-main">
        {/* ALWAYS THE CELL, CONDITIONALLY THE STAR — see `.qt-star` in
            quote.css. Dropping the element dropped the grid track with
            it and moved every figure on the row. */}
        <span className="qt-star" title={line.recommended ? 'Recommended' : undefined}>
          {line.recommended ? <Star size={11} weight="fill" /> : null}
        </span>
        <span className="qt-line-name">{line.label}</span>

        <span className="qt-line-detail">
          {(line.pairFacts ?? []).map((f) => (
            <span key={f.label} className="qt-doc-fact">
              <span className="qt-doc-fact-lab">{f.label}</span> {f.value}
            </span>
          ))}
        </span>

        <input
          className="field-input qt-input qt-input--qty"
          inputMode="numeric"
          aria-label={`Quantity of ${line.label}`}
          value={String(line.qty)}
          onChange={(e) => setQty(quote.id, line.id, Number(e.target.value.replace(/\D/g, '')))}
        />

        <span className="qt-num qt-line-amount">
          {amount === null ? (
            <span className="qt-nil">not priced here</span>
          ) : (
            <>
              {overridden && line.unitPrice !== null ? (
                <span className="qt-was">{money(line.unitPrice * (line.qty || 1))}</span>
              ) : null}
              {money(amount)}
            </>
          )}
        </span>

        <button
          type="button"
          className="qt-icon-btn"
          aria-expanded={open}
          aria-label={`Where ${line.label}'s price came from, and how to change it`}
          title="Change the price on this line"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
        </button>
        {removable ? (
          <button
            type="button"
            className="qt-icon-btn"
            aria-label={`Take ${line.label} off the quote`}
            title={`Take ${line.label} off the quote`}
            onClick={() => removeLine(quote.id, line.id)}
          >
            <X size={12} weight="bold" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="qt-line-open">
          <p className="qt-line-where mono-label">
            {line.priceColumnName === null
              ? 'no price column on this table'
              : `read from ${line.priceColumnName}`}
            {line.sourceNote ? ` · ${line.sourceNote}` : ''}
          </p>

          {/* WHAT IS INSIDE THAT NUMBER, where the number's provenance
              already is. It is drawn only where a cell says something —
              a rung nobody has measured says nothing rather than
              "unknown", which would be a label on every line in the app
              for a question nobody asked. */}
          <ContainedCharges level={line.levels.find((l) => l.key === line.levelResolved)} />

          {otherLevels.length > 0 ? (
            <div className="qt-levels" role="group" aria-label="Which price on this line">
              <span className="mono-label">Price this line at</span>
              {line.levels.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  className={`qt-chip${line.levelResolved === l.key ? ' is-on' : ''}`}
                  aria-pressed={line.levelResolved === l.key}
                  onClick={() => setLineLevel(quote.id, line.id, l.key)}
                >
                  {l.label}
                  <span className="qt-chip-num">
                    {l.value === null ? '—' : money(l.value)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="qt-override">
            <label className="qt-field">
              <span className="mono-label">Override the price</span>
              <input
                className="field-input qt-input"
                inputMode="decimal"
                value={line.overridePrice === undefined ? '' : String(line.overridePrice)}
                placeholder="leave blank to use the price file"
                onChange={(e) =>
                  setOverride(
                    quote.id,
                    line.id,
                    parseAmount(e.target.value) ?? undefined,
                    line.overrideReason,
                  )
                }
              />
            </label>
            {line.overridePrice !== undefined ? (
              <label className="qt-field qt-field--wide">
                <span className="mono-label">Why</span>
                <input
                  className="field-input qt-input"
                  value={line.overrideReason ?? ''}
                  placeholder="the reason this price is different"
                  aria-describedby={needsOverrideReason(line) ? `${line.id}-why` : undefined}
                  onChange={(e) =>
                    setOverride(quote.id, line.id, line.overridePrice, e.target.value)
                  }
                />
                {/* THE SAME REFUSAL, AT THE FIELD IT IS ABOUT. The foot
                    bar says the quote cannot go out; this says which
                    keystroke fixes it. Both come from
                    `needsOverrideReason`, so neither can be true while
                    the other is false. */}
                {needsOverrideReason(line) ? (
                  <span className="qt-field-why" id={`${line.id}-why`}>
                    Until this is written the quote cannot be given to the customer — an issued
                    quote is read-only, so the reason cannot be added later.
                  </span>
                ) : null}
              </label>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
