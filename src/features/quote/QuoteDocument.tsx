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

import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { money } from './pricing'
import { lineAmount, linesOf, looseLines, quoteTotals } from './totals'
import { FrozenPhoto } from './photo'
import { useSceneKind } from './scene'
import { useImageDisplay } from '@/lib/imageSources'
import { marqueOf } from './marque'
import { colourwayOf, splitVariant } from './colourway'
import type { QuoteDef, QuoteLine } from '@/types/model'

export interface QuoteDocumentProps {
  quote: QuoteDef
  /** WHAT THE PAGE PUTS BESIDE THE DOCUMENT — Print, a new version,
   *  the customer's other quotes. Screen furniture, never paper:
   *  `.qt-doc-acts` is hidden in the print block. It is a prop and
   *  not a child of the page so the document's side column can hold
   *  it where Porsche's summary holds its own — under the price. */
  aside?: ReactNode
}

/* ============================================================
   THE TRIM, READ RATHER THAN PRINTED AS A CODE.

   `(PVC) WH` is a material and a colourway. The brackets are the
   sheet's punctuation, not the dealer's, and `colourway.ts` reads
   the code out of the map the original HelmLogic has shipped since
   it was seeded — so `B-G-B` prints as "Black / Grey / Black".

   A CODE NOBODY CAN READ PRINTS AS ITSELF. 121 of Highfield's 604
   rows carry a token no production map has (`I`, `O`, `R`, `WH`),
   and half a translation reads as one that worked. Those print
   exactly what the price file carries.
   ============================================================ */
function readTrim(trim: string): string {
  const { material, code } = splitVariant(trim)
  const clean = material.replace(/[()]/g, ' ').replace(/s+/g, ' ').trim()
  const read = colourwayOf(code)
  const say = read.read ? read.say : code
  if (clean === '') return say
  return say === '' ? clean : `${clean} · ${say}`
}

export function QuoteDocument({ quote, aside }: QuoteDocumentProps): ReactElement {
  /* THE COVER IS A SCENE WHEN THE BOAT'S PICTURE IS A PHOTOGRAPH —
     the chaptered configurator's rule, on the document's first page.
     The frozen picture is still the frozen picture: `scene.ts` only
     reads its pixels to decide whether it fills the cover or sits on
     white. Paper never gets the scene (the print block strips it), so
     the printed document is unchanged. */
  const cover = useSceneKind(quote.subjectImage?.src)
  const { at: coverAt, paint: coverPaints } = useImageDisplay(quote.subjectImage?.src ?? '')
  const coverScene = cover === 'scene' && coverPaints
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

  /* The frozen label, taken apart for the headline — see the note
     on the <h1> below. Every character of it still prints. */
  const lockup = marqueOf(quote.subjectLabel)

  return (
    <article className="qt-doc" aria-label={`${kind} ${quote.reference}`}>
      {/* ============================================================
          THE SHAPE IS PORSCHE'S CONFIGURATION DOCUMENT, read from
          the real PDF (out/ref/porsche-configuration.pdf, fetched
          2026-09-15) and from its on-screen summary:

            the cover   the car, large, on a light panel; the model's
                        name centred under it with a chip beside it;
                        one bold line; the code and the date as chips
            the summary "Summary", a rule, the configuration's name
                        against its price
            the tables  one centred title per section, then rows of a
                        48px thumbnail, the option, its code in grey,
                        its price — "Standard Equipment" in grey when
                        there is none
            the side    on screen only: the price, the acts, the meta

          Every fact on it is still the quote's frozen copy — this
          file reads no live data — and every one that printed before
          prints now. What changed is where it stands.
          ============================================================ */}
      <div className="qt-doc-main">
        {/* -- 1. the cover ------------------------------------- */}
        <section
          className="qt-doc-hero"
          data-scene={coverScene ? 'scene' : 'studio'}
          style={coverScene ? ({ '--qt-cover': `url("${coverAt}")` } as CSSProperties) : undefined}
        >
          {/* the box is reserved before the bytes land so a picture
              arriving late never re-paginates a document mid-print */}
          <FrozenPhoto
            img={quote.subjectImage}
            fallbackAlt={quote.subjectLabel}
            className="qt-doc-photo"
            w={880}
            h={495}
          />
          <div className="qt-doc-subject-id">
            {/* THE NAME, NOT THE SKU. `marqueOf` takes the frozen label
                apart and nothing is dropped: maker, model and trim all
                print, and the SKU is cited on the hull's own line in
                the table exactly as the price file writes it. */}
            <h1 className="qt-doc-name">
              {lockup.maker === '' ? null : (
                <span className="qt-doc-marque-maker">{lockup.maker}</span>
              )}
              <span className="qt-doc-marque-model">{lockup.model}</span>
              {lockup.trim === '' ? null : (
                <span className="qt-doc-marque-trim">{readTrim(lockup.trim)}</span>
              )}
            </h1>
            <div className="qt-doc-who">
              {/* the dealer's name is its own element and nothing else is
                  in it — a test reads it back verbatim, and rule 3 keeps
                  it off uppercase on their own paper */}
              <p className="qt-doc-kind">
                <span className="qt-doc-kind-word">{kind}</span>
                {quote.organisation ? ' from ' : null}
                {quote.organisation ? <span className="qt-doc-org">{quote.organisation}</span> : null}
              </p>
              <p className="qt-doc-chips">
                <span className="qt-doc-chip">{quote.reference}</span>
                <span className="qt-doc-chip">{dateOf(issued)}</span>
                {quote.state === 'draft' ? <span className="qt-doc-chip">Draft</span> : null}
              </p>
            </div>
          </div>
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
        </section>

        {/* -- 2. what is on it ---------------------------------- */}
        <section className="qt-doc-card">
          <h2 className="qt-doc-card-title">What is on this quote</h2>
          {/* A real <table> with a <thead>, so a long rig repeats its
              column heads on page 2 and page breaks fall between rows
              for free. The picture column has no heading: the cell is
              its own legend, and the th keeps the column count. */}
          <table className="qt-doc-lines">
            <thead>
              <tr>
                <th className="qt-col-pic">
                  <span className="qt-sr">Picture</span>
                </th>
                <th className="mono-label qt-col-desc">Option</th>
                <th className="mono-label qt-col-qty">Qty</th>
                <th className="mono-label qt-col-amt">Price</th>
              </tr>
            </thead>
            {quote.sections.map((section) => {
              const lines = linesOf(quote, section.lineIds)
              if (lines.length === 0) return null
              return (
                <tbody key={section.blockId}>
                  <tr className="qt-doc-sec">
                    <th colSpan={4} scope="colgroup">
                      {section.title}
                    </th>
                  </tr>
                  {lines.map((line) => (
                    <DocLine key={line.id} line={line} />
                  ))}
                </tbody>
              )
            })}
            {/* the lines no section claims, last and with no heading —
                a heading would be a claim about where they came from,
                and this document invents nothing */}
            {loose.length > 0 ? (
              <tbody className="qt-doc-loose">
                {loose.map((line) => (
                  <DocLine key={line.id} line={line} />
                ))}
              </tbody>
            ) : null}
          </table>
        </section>

        {/* -- 3. the unpriced notice, and the dealer's note ------- */}
        {totals.unpricedCount > 0 ? (
          <p className="qt-unpriced" role="note">
            {totals.unpricedCount === 1
              ? '1 line on this quote has no price in the price file and is not in the total.'
              : `${totals.unpricedCount} lines on this quote have no price in the price file and are not in the total.`}
          </p>
        ) : null}
        {/* what the dealer TYPED is not fabricated; "Note" is the
            field's own word, and "Terms" would be a claim this app has
            no right to make about a free-text line */}
        {quote.note ? (
          <section className="qt-doc-note">
            <p className="mono-label">Note</p>
            <p className="qt-doc-note-say">{quote.note}</p>
          </section>
        ) : null}
      </div>

      <aside className="qt-doc-side">
        {/* -- 4. the money -------------------------------------- */}
        <section className="qt-money">
          <dl className="qt-money-rows">
            <div className="qt-money-row qt-money-row--total">
              <dt>Package price</dt>
              <dd className="qt-num qt-total">{money(totals.total)}</dd>
            </div>
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

        {/* -- 5. the acts, on screen only ------------------------ */}
        {aside ? <div className="qt-doc-acts">{aside}</div> : null}

        {/* -- 6. who it is for ---------------------------------- */}
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

        {/* -- 7. the plate --------------------------------------- */}
        <header className="qt-doc-head">
          {/* THE DATE AND THE REFERENCE ARE ON THE COVER AND IN THE FOOT —
              twice, and deliberately: QUOTE_SPEC §6.7 asks the foot to
              carry them so a separated page can be identified, and the
              cover carries them as Porsche's carries its code and date.
              The plate does not say them a third time. */}
          <dl className="qt-plate">
            {quote.preparedBy ? <Plate label="Prepared by" value={quote.preparedBy} /> : null}
            {quote.state === 'draft' ? <Plate label="Status" value="Draft" /> : null}
          </dl>
        </header>
      </aside>

      {/* -- 8. the paper's footer, every page ------------------- */}
      <footer className="qt-doc-foot">
        <span className="mono-label">{quote.reference}</span>
        <span className="mono-label">{dateOf(issued)}</span>
      </footer>
    </article>
  )
}

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
      {/* ============================================================
          THE THING ITSELF, ON THE DOCUMENT A CUSTOMER READS.

          The original HelmLogic printed a picture beside every line
          and this rebuild did not, which left the one Showroom
          surface that actually leaves the building as the only one
          with no photographs on it. The teardown table lists
          "product presence" as one of four counts the original beat
          the Playground on, and this is where it beat it hardest.

          `FrozenPhoto` decides, exactly as it does everywhere else:
          a picture we cannot fetch is drawn as NOTHING, never as a
          broken glyph — "a broken glyph on a quotation is worse
          than no photograph" is that file's own header. So this
          cell is often empty, and it holds a fixed width anyway, so
          that an empty one and a full one put every description in
          the same place down the page.

          IT PRINTS. Real table layout, not a background image, so
          it survives `@media print` without asking the browser for
          background graphics — which most print dialogs have off.
          ============================================================ */}
      <td className="qt-col-pic">
        <FrozenPhoto
          img={line.image}
          fallbackAlt={line.label}
          className="qt-doc-pic"
          w={96}
          h={60}
        />
      </td>
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
            {/* THE STRIKE-THROUGH IS A DRAWING, AND THIS PAGE IS ALSO
                READ ALOUD AND PASTED INTO EMAIL. An overridden line put
                two bare figures in one cell — `$310` struck, `$240`
                plain — and every reading that is not a sighted reading
                got "three hundred and ten dollars, two hundred and
                forty dollars" with nothing to say which one is being
                charged. On the one artefact that leaves the building
                that is not a nicety: it is two prices on a quotation.

                This is the same defect commit ce85394 fixed one screen
                over ("The refusal was invisible to anyone who could not
                see the strike-through"), and the same remedy: the fact
                goes into the row's own WORDS, clipped off-screen rather
                than `display:none`, which would take it out of the
                accessibility tree — the one place it has to be. The
                override's reason already prints under the name; what
                was missing was the label on the two numbers. */}
            {overridden && line.unitPrice !== null ? (
              <>
                <span className="qt-aloud">Price file </span>
                <span className="qt-was">{money(line.unitPrice * (line.qty || 1))}</span>
                <span className="qt-aloud">, charged </span>
              </>
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
