/* ============================================================
   THE TRAILER SELECTOR, DRAWN — the rule that picks, and the proof
   that it is picking.

   > "highfield have special trailers or whatever"

   F8 is the only rule in either workbook that both holds at 100 % and
   actually rejects something (docs/specs/FITMENT_RULES.md §1.2, F8),
   and until `trailerFitment.ts` it was not in the app: its card in the
   list above read "Not checked yet", and the only trailer test the
   project ran was the ATM floor, which passes a mean 97.70 % of the
   catalogue.

   WHY THIS IS A BLOCK AND NOT A DOOR. It is not a place in the
   business, it is the app being honest about a rule — the same job the
   workbook-rule list and the registration theme do, on the same
   surface, so a person who wants to know what is being checked reads
   one page.

   WHAT IT DRAWS, AND WHY EACH PART IS HERE

     1 · ONE LINE PER BRAND, with the share of the catalogue its series
         banner leaves standing. This is the measurement F8 is admitted
         on, and it is the answer to "is it actually picking?" — a
         Highfield hull is offered 2 of 145 trailers, not 145.
     2 · THE REGIME, per brand, as a count and never as a label. R11
         says three mechanisms put a trailer under a boat and they must
         not be flattened; two of the three can be read off the data
         and the reading is printed with its numerator, so a person can
         disagree with it.
     3 · THE FLOOR, said to be a floor. It warns and never removes, and
         where a brand's band has no weight column it says the check
         did not run rather than letting it look like a pass.
     4 · THE TWO THINGS SET ASIDE — the banners that name nobody, and
         the retired table. Neither is a rejection and both are
         counted, because a list that quietly drops rows is how a
         person learns not to trust the list.

   EVERY FIGURE IS COMPUTED FROM THE LOADED PROJECT. Nothing on this
   panel is typed in. The specification's own figures are quoted only
   as the source line at the foot, where they can be checked against
   the workbook rather than believed.
   ============================================================ */

import { useMemo } from 'react'
import type { ReactElement } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { curationNote } from '@/features/curation'
import {
  TRAILER_ATM_FLOOR,
  TRAILER_FITMENT,
  marqueVocabulary,
  readCatalogue,
  readMarques,
  type MarqueReading,
} from './trailerFitment'

const pct = (share: number): string => `${(share * 100).toFixed(1)}%`

/* F8'S RATE USED TO BE RESTATED HERE, in the sixth clause of a 62-word
   lede. It is drawn once, on F8's own card in the ledger above, where
   it is the largest thing on that card — and reading it off the
   adjudication in two places was the duplication, not the safeguard. */

/* WHAT THIS PANEL CALLS THE THINGS IT IS NARROWING. The prose around
   it has said "trailers" since it was written, and the mechanism's
   sentences have to read as part of that prose rather than as a
   component that wandered in. */
const PARTNER = 'trailers'

export function TrailerFitmentPanel(): ReactElement | null {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  const reading = useMemo(() => {
    const project = { entities, rowsByEntity }
    const marques = marqueVocabulary(project, TRAILER_FITMENT)
    return {
      marques,
      catalogue: readCatalogue(project, TRAILER_FITMENT, marques),
      readings: readMarques(project, TRAILER_FITMENT, { marques, floor: TRAILER_ATM_FLOOR }),
    }
  }, [entities, rowsByEntity])

  const { catalogue, readings } = reading

  /* NOTHING TO SAY IS SAID BY SAYING NOTHING. A sheet with no series
     banner naming anything is somebody else's data, not a broken
     import, and a panel about trailer series on a furniture dealer's
     sheet would be this app talking about itself. */
  if (readings.length === 0) return null

  const warned = readings.reduce((n, r) => n + r.floorWarned, 0)
  const unchecked = readings.filter((r) => r.loadColumn === null)

  return (
    <section className="cn-band" aria-label="How a trailer is chosen">
      {/* THE EYEBROW IS THE POINTER. F8 and F9 in workbookRules.ts
          both carry `enforcedIn: 'Business rules · The trailer
          selector'`, and their cards print that string as "CHECKED
          IN …". A pointer nobody can find on the page it points at is
          worse than no pointer, so these four words are the same four
          words, and uppercase is right here because an eyebrow is a
          LABEL — DESIGN_PRINCIPLES rule 3. */}
      <p className="cn-band-eyebrow mono-label">The trailer selector</p>
      <h3 className="cn-band-title">A trailer's series says which boat it is built for</h3>
      {/* ONE LINE, AND IT IS THE MEASUREMENT. The 62 words that stood
          here restated the heading, then explained the floor block that
          is 40px below and says the same thing about itself. The figure
          is the part a person cannot read off anything else. */}
      <p className="cn-band-lede">
        {catalogue.named} of {catalogue.live} name a boat brand in their series heading.
      </p>

      {/* ---- one line per brand ---- */}
      <ul className="cn-tf-list">
        {readings.map((r) => (
          <BrandLine key={r.marque.name} reading={r} />
        ))}
      </ul>

      {/* ---- the floor, said to be a floor ---- */}
      <div className="cn-tf-floor">
        <p className="cn-tf-floor-head">
          The weight floor warns. It never takes a trailer off the list.
        </p>
        {/* WHY IT IS A FLOOR AND NOT A SELECTOR, in one clause rather
            than three. FITMENT_RULES.md's A2 failure is promoting this
            to the thing that picks the trailer, so the reason it cannot
            pick stays — shortened, not moved. */}
        <p className="cn-tf-floor-note">
          Nearly every trailer clears nearly every hull.{' '}
          {warned > 0 ? (
            <>
              {warned} {warned === 1 ? 'hull is' : 'hulls are'} offered a trailer in their own
              series rated under their weight, and {warned === 1 ? 'it stays' : 'they stay'} on
              the list with the warning beside {warned === 1 ? 'it' : 'them'}.
            </>
          ) : (
            <>No hull here is offered a trailer in its own series rated under its weight.</>
          )}
        </p>
        {unchecked.length > 0 && (
          <p className="cn-tf-floor-note cn-tf-floor-note--quiet">
            {/* A REFUSAL KEEPS ITS SENTENCE. A check that has not run
                must never be mistaken for a check that passed. */}
            Not run for <b>{unchecked.map((r) => r.marque.name).join(', ')}</b> — no weight
            column to compare.
          </p>
        )}
      </div>

      {/* ---- what was set aside, and never rejected ---- */}
      <ul className="cn-tf-aside">
        <li className="cn-tf-aside-item">
          <b className="cn-tf-aside-n">{catalogue.unnamed}</b>
          <span className="cn-tf-aside-what">
            trailers sit under a heading that names no brand. They are <b>not ruled out</b> —
            the price file itself offers some of them, so the honest answer is that the
            heading does not say, and they are listed after the ones that do.
          </span>
        </li>
        {catalogue.retiredRows > 0 && (
          <li className="cn-tf-aside-item">
            <b className="cn-tf-aside-n">{catalogue.retiredRows}</b>
            <span className="cn-tf-aside-what">
              trailers are held back before any of this runs, because{' '}
              <b>{catalogue.retiredTables.join(', ')}</b>{' '}
              {catalogue.retiredTables.length === 1 ? 'is' : 'are'} history rather than stock.
              Nothing is deleted, and a quote that already names one still opens, still totals
              and still prints.
            </span>
          </li>
        )}
        {catalogue.discontinued > 0 && (
          <li className="cn-tf-aside-item">
            <b className="cn-tf-aside-n">{catalogue.discontinued}</b>
            <span className="cn-tf-aside-what">
              trailers on live tables are no longer sold, so they are not offered here.
            </span>
          </li>
        )}
      </ul>

      {/* THE PROVENANCE IS THE POINT, same as the workbook list above:
          anyone can write a rule and claim the business asked for it,
          and this line is how you check. */}
      <p className="cn-wb-src">
        Trailer Module.xlsx · Trailer Module!A — eleven series banners name a boat brand
        (A87, A95, A105, A113, A127, A133, A140, A152, A197, A212, A626) · ASSERTED · 581 of
        581 testable live pairings, 0 counter-examples, leaving 0.92–7.83% of the 434 live
        trailers standing · the weight floor is Trailer Module!K “ATM (KG)” against each
        band's own weight column, 530 of 530 live pairings, and a mean 97.70% of the
        catalogue also clears it · docs/specs/FITMENT_RULES.md §1.2, R11, F8, F9
      </p>
      <p className="cn-wb-src">
        The brand is read from each table's own name and the series brand from the heading,
        because neither is a column yet. FITMENT_RULES.md §6.4 asks for a Brand column on
        every boat table and a Series Brand column on every trailer table at import; until
        those exist this rule runs but cannot be written as a sentence.
      </p>
    </section>
  )
}

/* ---------------------------------------------------------- */
/* One brand                                                   */
/* ---------------------------------------------------------- */

function BrandLine({ reading: r }: { reading: MarqueReading }): ReactElement {
  /* The narrowing carries no `measured` here — see the note beside
     `cn-tf-hidden` below — and no discontinued half either: this
     reading's own denominator is already the LIVE catalogue, so
     folding the withheld rows in would count them twice. They have
     their own line, once, under "set aside". */
  const hidden = curationNote({
    name: PARTNER,
    counts: { pool: r.catalogue, matched: r.selected, offered: r.selected },
    narrowings: [{ id: 'f8', what: 'the series banner names this brand' }],
    showingAll: false,
  })

  return (
    <li className="cn-tf-item">
      <p className="cn-tf-brand">
        {r.marque.name}
        <span className="cn-tf-brand-table">{r.subjectTableName}</span>
      </p>

      <p className="cn-tf-count">
        <b className="cn-tf-count-n">{r.selected}</b>
        <span className="cn-tf-count-of">
          of {r.catalogue} trailers — {pct(r.share)} of the catalogue
        </span>
      </p>

      <p className="cn-tf-series">{r.marque.banners.join(' · ')}</p>

      {/* ── THE COUNT OF WHAT WAS HIDDEN, STATED ────────────────────
          "12 of 434" is a true line that leaves the reader to work out
          422, and a number a person has to compute is a number they
          were not told. `@/features/curation` owns the arithmetic, so
          this count and the one above it are read off the same three
          figures and can never drift apart. The measured rate is on
          the band's lede rather than on all eight of these lines: it
          is the same clause every time, and eight copies of it is
          furniture. */}
      <p className="cn-tf-hidden">{hidden}</p>

      <p className="cn-tf-how">
        {r.hulls === 0 ? (
          <>No hull of this brand is offered a trailer on this sheet.</>
        ) : r.hullsNamingModel > 0 ? (
          <>
            {r.hullsNamingModel} of {r.hulls} hulls are offered a trailer that names their own
            model, so the cradle is cut for the hull.
          </>
        ) : (
          <>
            None of the {r.hulls} hulls finds its own model named in that series, so the pick
            inside it is made on something other than the model.
          </>
        )}
        {r.channel ? (
          <>
            {' '}
            Sold one way only: <b>{r.channel.value}</b>, on every row of the table.
          </>
        ) : null}
      </p>

      <p className="cn-tf-floor-line">
        {r.loadColumn ? (
          <>
            Weight floor read from <b>{r.loadColumn}</b>
            {r.floorWarned > 0 ? <> · {r.floorWarned} hulls warned</> : null}
            {r.floorNotEvaluable > 0 ? (
              <> · {r.floorNotEvaluable} hulls leave that column empty</>
            ) : null}
          </>
        ) : (
          <>No weight column on this band, so the weight floor never runs.</>
        )}
      </p>
    </li>
  )
}
