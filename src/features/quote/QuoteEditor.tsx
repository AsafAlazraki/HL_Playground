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
import type { ReactElement } from 'react'
import { CaretDown, CaretRight, Plus, Star, Warning, X } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { OFFER_CAP, SUBJECT_BLOCK, candidatesFor, priceChanges, type PriceChange } from './freeze'
import { money, parseAmount, quoteLevelChoices } from './pricing'
import { lineAmount, linesOf, quoteTotals } from './totals'
import {
  addAdjustment,
  addLine,
  applyPriceChanges,
  issueQuote,
  patchQuote,
  persistNote,
  removeAdjustment,
  removeLine,
  setAdjustmentMagnitude,
  setLevel,
  setLineLevel,
  setOverride,
  setQty,
  updateAdjustment,
} from './quotes'
import { FrozenPhoto } from './photo'
import type { AdjustmentKind, QuoteDef, QuoteLine, QuoteSection } from './types'

/** The four controls under the sections. Each is a sentence, and
 *  each signs what a person types (see SIGN in quotes.ts) so nobody
 *  has to remember a minus. */
const ADJUSTMENT_DOORS: Array<{ kind: AdjustmentKind; door: string }> = [
  { kind: 'discount', door: 'Add a discount' },
  { kind: 'rebate', door: 'Add a rebate' },
  { kind: 'tradeIn', door: 'Add a trade-in' },
  { kind: 'line', door: 'Add a line' },
]

export interface QuoteEditorProps {
  quote: QuoteDef
  /** the stage's own "it is issued now" move — drawing the document
   *  is the stage's business, not this screen's */
  onIssued?: (quote: QuoteDef) => void
}

export function QuoteEditor({ quote, onIssued }: QuoteEditorProps): ReactElement {
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

  const saveNote = persistNote()

  return (
    <div className="qt-edit">
      <div className="qt-sheet">
        <span className="qt-tick qt-tick--tl" aria-hidden="true" />
        <span className="qt-tick qt-tick--tr" aria-hidden="true" />

        {saveNote ? (
          <p className="qt-warn" role="status">
            <Warning size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
            {saveNote}
          </p>
        ) : null}

        {/* -- who it is for, and at which rung ---------------- */}
        <header className="qt-edit-head">
          <div className="qt-edit-for">
            <label className="qt-field">
              <span className="mono-label">Customer</span>
              <input
                ref={nameRef}
                className="field-input qt-input qt-input--name"
                value={quote.customer.name}
                placeholder="the customer's name"
                spellCheck={false}
                onChange={(e) =>
                  patchQuote(quote.id, { customer: { ...quote.customer, name: e.target.value } })
                }
              />
            </label>

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
              <button
                type="button"
                className="qt-icon-btn"
                title="Take this off the quote"
                onClick={() => removeAdjustment(quote.id, a.id)}
              >
                <X size={12} weight="bold" />
              </button>
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

      {/* -- the foot bar: always visible, never scrolled away - */}
      <div className="qt-foot">
        <div className="qt-foot-sum">
          <span className="mono-label">Total</span>
          <span className="qt-foot-total">{money(totals.total)}</span>
          {totals.unpricedCount > 0 ? (
            <span className="qt-foot-unpriced">
              {totals.unpricedCount} not priced
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            issueQuote(quote.id)
            onIssued?.(quote)
          }}
        >
          Give it to the customer
        </button>
      </div>
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
  const candidates = useMemo(
    () => (picking ? candidatesFor(quote, section) : []),
    [picking, quote, section],
  )

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
          </p>
        ) : (
          <p className="qt-section-empty">Nothing from {section.title} on this quote yet.</p>
        )
      ) : null}

      {subject ? null : picking ? (
        <div className="qt-picker">
          <div className="qt-picker-bar">
            <span className="mono-label">Pick from {section.title}</span>
            <button
              type="button"
              className="qt-icon-btn"
              title="Close"
              onClick={() => setPicking(false)}
            >
              <X size={12} weight="bold" />
            </button>
          </div>
          {candidates.length === 0 ? (
            <p className="qt-section-empty">
              Nothing from {section.title} goes with this one yet. Set that up on the page that
              says what goes with each one.
            </p>
          ) : (
            <ul className="qt-picker-list">
              {candidates.map((c) => (
                <li key={c.line.rowId}>
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
        {line.recommended ? (
          <span className="qt-star" title="Recommended">
            <Star size={11} weight="fill" />
          </span>
        ) : null}
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
          title="Change the price on this line"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
        </button>
        {removable ? (
          <button
            type="button"
            className="qt-icon-btn"
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
                  onChange={(e) =>
                    setOverride(quote.id, line.id, line.overridePrice, e.target.value)
                  }
                />
              </label>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
