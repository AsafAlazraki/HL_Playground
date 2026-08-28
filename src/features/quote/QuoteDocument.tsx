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
     the unpriced notice · the dealer's own note · footer

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
import { money } from './pricing'
import { lineAmount, linesOf, looseLines, quoteTotals } from './totals'
import { FrozenPhoto } from './photo'
import type { QuoteDef, QuoteLine } from './types'

export interface QuoteDocumentProps {
  quote: QuoteDef
}

export function QuoteDocument({ quote }: QuoteDocumentProps): ReactElement {
  const totals = quoteTotals(quote)
  const issued = quote.issuedAt ?? quote.updatedAt

  /* THE LINES NO SECTION CLAIMS, AND WHY THE DOCUMENT HAS TO DRAW
     THEM. `quoteTotals` sums `quote.lines`; this page used to draw
     only `quote.sections`, so any line held by `lines` and by no
     section was CHARGED and never PRINTED. Measured on the shipped
     build: the Package figure includes it, no row on the page does.

     It is not hypothetical. `isQuoteish` (quotes.ts) is a shape check
     — `Array.isArray(sections)` and nothing more — so a quote read
     back from storage or arriving in a file can carry lines no
     section names; `addFreeLine` puts a typed line in the last
     section and there is no last section on a quote with none; and
     `removeLine`'s undo restores a line to `lines` and to a section
     only when it found one to restore it to.

     `looseLines` was written for exactly this and `QuoteBuild` has
     drawn it since; the one page a customer keeps did not. */
  const loose = looseLines(quote)

  /* A REVISED QUOTATION SAYS SO, AND IT SAID NOTHING AT ALL.
     "Make a new version" mints a copy carrying `supersedesId`, and
     `QuotePage` tells the salesperson it "says on it that it
     supersedes this one" — measured on the running app, it does not:
     `supersedesId` reaches the diary as " · new version" and reaches
     this page nowhere. A customer holding two quotations for the
     same hull, with different totals and nothing on either saying
     which replaces which, is the fault that promise exists to
     prevent.

     One word, in the caption a customer reads first, and it is the
     most this page can honestly say: `supersedesId` is an ID, and
     `makeNewVersion` (quotes.ts) does NOT freeze the superseded
     quote's REFERENCE onto the copy. Naming it would mean reaching
     into the live registry from a frozen document, which is the one
     thing this file may never do. The reference belongs on the copy
     at mint time; that is a change in quotes.ts and is reported, not
     papered over here. */
  const kind = quote.supersedesId === undefined ? 'Quotation' : 'Revised quotation'

  return (
    <article className="qt-doc" aria-label={`${kind} ${quote.reference}`}>
      <span className="qt-tick qt-tick--tl" aria-hidden="true" />
      <span className="qt-tick qt-tick--tr" aria-hidden="true" />

      {/* -- 1. the title block ------------------------------- */}
      <header className="qt-doc-head">
        <div className="qt-doc-who">
          <p className="mono-label">{kind}</p>
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
        {/* THE RIG, AS LARGE AS THE PAGE HONESTLY ALLOWS. 220px was a
            catalogue tile on the one document a customer ever reads;
            300 is a third of the sheet's measure and still leaves the
            name and the spec strip a full column beside it. The print
            block caps it at 55mm so the whole rig reaches page 1, and
            the box is reserved before the bytes land so a picture
            arriving late never re-paginates a document mid-print. */}
        <FrozenPhoto
          img={quote.subjectImage}
          fallbackAlt={quote.subjectLabel}
          className="qt-doc-photo"
          w={300}
          h={225}
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

        {/* AND THE LINES NO SECTION CLAIMS, LAST AND WITH NO HEADING.
            The build screen files these under "Typed onto the quote",
            which is true of the one route that makes them there and
            false of the two that make them in a file — so on the
            customer's copy they are drawn as what they provably are:
            lines of this quote. A heading here would be a claim about
            where they came from, and this document invents nothing.
            `.qt-doc-loose` gives the group the same air a section head
            would have given it, so it reads as its own block rather
            than as more of the one above. */}
        {loose.length > 0 ? (
          <tbody className="qt-doc-loose">
            {loose.map((line) => (
              <DocLine key={line.id} line={line} />
            ))}
          </tbody>
        ) : null}
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

      {/* -- 6b. what the dealer wrote on it -------------------
          THE ONE PLACE THIS DOCUMENT CARRIES CONDITIONS, and it was
          set as the smallest reading text on the page — 12px, soft
          ink, no caption, floating between a carmine warning and the
          closing rule. The header above says why there are no
          twenty-seven clauses: writing plausible ones would be
          fabricating a contract. What the dealer TYPED is not
          fabricated, and the field they typed it in is labelled "Note
          on the quote" with the placeholder "validity, conditions —
          printed as typed". On a $150,000 quotation that is the
          sentence a customer needs after the total, so it is given a
          rule, the caption the field already carries, and the reading
          size the rest of the document uses.

          The caption is the field's own word. "Terms" would be a
          claim this app has no right to make about a free-text line
          somebody typed. */}
      {quote.note ? (
        <section className="qt-doc-note">
          <p className="mono-label">Note</p>
          <p className="qt-doc-note-say">{quote.note}</p>
        </section>
      ) : null}

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
        {/* NO STAR ON THE CUSTOMER'S COPY, AND IT IS THE SAME FACT
            TWICE. A recommended line drew an ochre star AND the word
            "recommended" beside it, in one cell. This file's own
            header rules that "carmine appears in exactly two places —
            an unpriced line, and a credit. Everything else is ink,
            hairline and paper", and an ochre glyph is neither; on a
            mono printer it lands as a grey dot with no legend on the
            page to read it by. The word survives, because a word
            needs no key. The star stays on the two WORKING screens
            (`QuoteEditor`, `QuoteBuild`), where a dense row is scanned
            rather than read and `.qt-star` still holds its column. */}
        <span className="qt-doc-line-name">
          {line.label}
          {/* THE SPACE IS LOAD-BEARING AND IT WAS MISSING. JSX eats
              the newline between an expression and the next element,
              so the name and the stamp arrived as one unbreakable
              run: measured at 375px of window, the description
              cell's min-content was 147.3px — "F4SMHA" welded to
              "RECOMMENDED" — and that single run set the whole line
              table's floor, laying the rig out at 244.2px inside a
              213px column. With a break opportunity between them the
              rig lays out at 213px, exactly the column it is in. */}
          {line.recommended ? (
            <>
              {' '}
              <span className="qt-doc-tag mono-label">recommended</span>
            </>
          ) : null}
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
