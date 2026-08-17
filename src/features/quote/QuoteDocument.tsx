/* ============================================================
   THE DOCUMENT — the thing a customer is handed.

   It renders from the quote's own `lines` and `adjustments` and
   NOTHING ELSE. There is no store selector in this file, no rule
   engine, no entity lookup: every label, number, spec and
   photograph on it was frozen onto the quote at the moment it was
   picked. That is what makes "a quote given on Monday says the same
   number on Friday" true rather than aspirational.

   READING ORDER is the workbook's own print order
   ('Quote Sheet'!$D$4:$AD$391), reduced to what our data can
   honestly fill:
     title block · customer · subject · the rig · the money box ·
     the unpriced notice · footer

   WHAT IS DELIBERATELY NOT ON IT
   ─────────────────────────────────────────────────────────────
   · NO TERMS AND CONDITIONS. The workbook has twenty-seven clauses.
     Writing plausible ones would be fabricating a contract.
   · NO LOGO SLOT. The workbook's is a VLOOKUP that returns #VALUE!
     in both shipped copies, and we have no logo in the data.
   · NO PAYMENT SCHEDULE, NO DEPOSIT, NO FINANCE. The workbook's own
     document-type code leaves the schedule OFF for a quotation, its
     instalments do not add up to the contract sum as shipped, and
     every finance input is a literal typed into a formula.
   · NO SIGNATURE BLOCK. `Quote Sheet` has a signature LINE, drawn,
     for a pen. A signature is a legal artefact and it needs a
     contract under it.
   · NO COST, ANYWHERE. Not one cost-banded column can reach this
     page: the only numbers on it come from a line's frozen rung.

   CARMINE APPEARS IN EXACTLY TWO PLACES — an unpriced line, and a
   credit. Everything else is ink, hairline and paper.

   PRINTING is the browser's own. No PDF library: every byte of
   layout we would otherwise duplicate in a second renderer is a byte
   that can disagree with the screen, and production's genuinely good
   @react-pdf pipeline re-sums each band inside itself and disagrees
   with its own screen. The @page rules live in quote.css.
   ============================================================ */

import type { ReactElement } from 'react'
import { Star } from '@phosphor-icons/react'
import { money } from './pricing'
import { lineAmount, linesOf, quoteTotals } from './totals'
import { FrozenPhoto } from './photo'
import type { QuoteDef, QuoteLine } from './types'

export interface QuoteDocumentProps {
  quote: QuoteDef
}

export function QuoteDocument({ quote }: QuoteDocumentProps): ReactElement {
  const totals = quoteTotals(quote)
  const issued = quote.issuedAt ?? quote.updatedAt

  return (
    <article className="qt-doc" aria-label={`Quotation ${quote.reference}`}>
      <span className="qt-tick qt-tick--tl" aria-hidden="true" />
      <span className="qt-tick qt-tick--tr" aria-hidden="true" />

      {/* -- 1. the title block ------------------------------- */}
      <header className="qt-doc-head">
        <div className="qt-doc-who">
          <p className="mono-label">Quotation</p>
          {quote.organisation ? <p className="qt-doc-org">{quote.organisation}</p> : null}
        </div>
        <dl className="qt-plate">
          <Plate label="Date" value={dateOf(issued)} />
          <Plate label="Reference" value={quote.reference} />
          {quote.preparedBy ? <Plate label="Prepared by" value={quote.preparedBy} /> : null}
          {quote.state === 'draft' ? <Plate label="Status" value="Draft" /> : null}
        </dl>
      </header>

      {/* -- 2. the customer ---------------------------------- */}
      {/* nothing is printed for an empty field: no "N/A", no dashes,
          no placeholder that could be mistaken for a value */}
      <section className="qt-doc-customer">
        <p className="mono-label">Prepared for</p>
        <p className="qt-doc-customer-name">
          {quote.customer.name.trim() === '' ? (
            <span className="qt-doc-blank">the customer's name is not filled in yet</span>
          ) : (
            quote.customer.name
          )}
        </p>
        {(quote.customer.contact ?? []).map((c, i) => (
          <p key={`${c}-${i}`} className="qt-doc-customer-line">
            {c}
          </p>
        ))}
      </section>

      {/* -- 3. the subject ----------------------------------- */}
      <section className="qt-doc-subject">
        <FrozenPhoto
          img={quote.subjectImage}
          fallbackAlt={quote.subjectLabel}
          className="qt-doc-photo"
          w={220}
          h={165}
        />
        <div className="qt-doc-subject-id">
          <h1 className="qt-doc-name">{quote.subjectLabel}</h1>
          {quote.subjectSpecs.length > 0 ? (
            <dl className="qt-doc-specs">
              {quote.subjectSpecs.map((s) => (
                <div key={s.label} className="qt-doc-spec">
                  <dt className="mono-label">{s.label}</dt>
                  <dd className="qt-doc-spec-val">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      {/* -- 4. the rig --------------------------------------
          A real <table> with a <thead>, so a long rig repeats its
          column heads on page 2 and page breaks fall between rows
          for free. */}
      <table className="qt-doc-lines">
        <thead>
          <tr>
            <th className="mono-label qt-col-desc">Description</th>
            <th className="mono-label qt-col-qty">Qty</th>
            <th className="mono-label qt-col-amt">Amount</th>
          </tr>
        </thead>
        {quote.sections.map((section) => {
          const lines = linesOf(quote, section.lineIds)
          if (lines.length === 0) return null
          return (
            <tbody key={section.blockId}>
              <tr className="qt-doc-sec">
                <th className="mono-label" colSpan={3} scope="colgroup">
                  {section.title}
                </th>
              </tr>
              {lines.map((line) => (
                <DocLine key={line.id} line={line} />
              ))}
            </tbody>
          )
        })}
      </table>

      {/* -- 5. the money box --------------------------------- */}
      <section className="qt-money">
        <dl className="qt-money-rows">
          <div className="qt-money-row">
            <dt>Package</dt>
            <dd className="qt-num">{money(totals.packageTotal)}</dd>
          </div>

          {quote.adjustments.map((a) => (
            <div key={a.id} className="qt-money-row">
              <dt>
                {a.label.trim() === '' ? (
                  <span className="qt-doc-blank">this line has no name yet</span>
                ) : (
                  a.label
                )}
                {a.note ? <span className="qt-money-note"> — {a.note}</span> : null}
                {/* the business's own qualifier, from Quote Sheet!R175 */}
                {a.kind === 'tradeIn' ? (
                  <span className="qt-money-note"> — subject to final inspection</span>
                ) : null}
              </dt>
              <dd className={`qt-num${a.amount < 0 ? ' is-credit' : ''}`}>{money(a.amount)}</dd>
            </div>
          ))}

          <div className="qt-money-row qt-money-row--total">
            <dt>Total</dt>
            <dd className="qt-num qt-total">{money(totals.total)}</dd>
          </div>

          {totals.totalExcludingTax === null ? (
            <p className="qt-money-say">
              The amounts above are inclusive of tax unless otherwise stated.
            </p>
          ) : (
            <div className="qt-money-row qt-money-row--tax">
              <dt>
                Total excluding tax
                <span className="qt-money-note"> — at {totals.taxRate}%</span>
              </dt>
              <dd className="qt-num">{money(totals.totalExcludingTax)}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* -- 6. the unpriced notice --------------------------- */}
      {totals.unpricedCount > 0 ? (
        <p className="qt-unpriced" role="note">
          {totals.unpricedCount === 1
            ? '1 line on this quote has no price in the price file and is not in the total.'
            : `${totals.unpricedCount} lines on this quote have no price in the price file and are not in the total.`}
        </p>
      ) : null}

      {quote.note ? <p className="qt-doc-note">{quote.note}</p> : null}

      {/* -- 7. footer ---------------------------------------- */}
      <footer className="qt-doc-foot">
        <span className="mono-label">{dateOf(issued)}</span>
        <span className="mono-label">{quote.reference}</span>
      </footer>
    </article>
  )
}

/* ---------------------------------------------------------- */

function Plate({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="qt-plate-row">
      <dt className="mono-label">{label}</dt>
      <dd className="qt-plate-val">{value}</dd>
    </div>
  )
}

function DocLine({ line }: { line: QuoteLine }): ReactElement {
  const { unit, amount, overridden } = lineAmount(line)
  return (
    <tr className="qt-doc-line">
      <td className="qt-col-desc">
        <span className="qt-doc-line-name">
          {line.recommended ? (
            <span className="qt-star" title="Recommended">
              <Star size={10} weight="fill" aria-hidden="true" />
            </span>
          ) : null}
          {line.label}
          {line.recommended ? <span className="qt-doc-tag mono-label">recommended</span> : null}
        </span>
        {/* the join's own facts — rigging kit, prop, engine hole,
            slot. True of THIS motor on THIS hull and of neither
            alone, which is why they travel with the line. */}
        {(line.pairFacts ?? []).length > 0 ? (
          <span className="qt-doc-detail">
            {(line.pairFacts ?? []).map((f) => (
              <span key={f.label} className="qt-doc-fact">
                <span className="qt-doc-fact-lab">{f.label}</span> {f.value}
              </span>
            ))}
          </span>
        ) : null}
        {/* AN OVERRIDE ALWAYS SAYS SOMETHING, EVEN WHEN NOBODY WROTE A
            REASON. A draft can no longer be issued with an unexplained
            override — `issueQuote` refuses it and the foot bar says why
            — but two documents can still reach this line: one issued
            before that gate existed, and one that arrived inside an
            imported file. For those, printing nothing would present a
            price somebody typed as though it came from the price file.
            So the absence is printed as an absence. */}
        {overridden ? (
          <span className="qt-doc-detail">
            <span className="qt-doc-fact">
              <span className="qt-doc-fact-lab">override</span>{' '}
              {(line.overrideReason ?? '').trim() === ''
                ? 'no reason given'
                : line.overrideReason}
            </span>
          </span>
        ) : null}
      </td>
      <td className="qt-col-qty qt-num">{line.qty}</td>
      <td className="qt-col-amt qt-num">
        {amount === null ? (
          /* the opposite of blank: the workbook's own showZeros="0"
             turns an unmatched lookup into empty space, which reads
             as a free inclusion */
          <span className="qt-nil">not priced here</span>
        ) : (
          <>
            {overridden && line.unitPrice !== null ? (
              <span className="qt-was">{money(line.unitPrice * (line.qty || 1))}</span>
            ) : null}
            <span>{money(amount)}</span>
            {line.qty > 1 && unit !== null ? (
              <span className="qt-each mono-label">{money(unit)} each</span>
            ) : null}
          </>
        )}
      </td>
    </tr>
  )
}

/** The date as the drawing office writes it. Locale-formatted, never
 *  a raw ISO string on a customer's document. */
function dateOf(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}
