/* ============================================================
   THE FAN-OUT, DRAWN — what fits what, as a picture of the price
   file rather than a picture of a rule editor.

   > "the what fits what and the business rules and stuff look half
   >  baked with how good everything else is … the really beautiful
   >  ways to visualise AND create those should be based on the MPF
   >  stuff that you have defined"

   WHAT WAS ON THIS SURFACE BEFORE. A rail holding two rules, a
   blank canvas, and a sentence asking the reader to pick one. The
   canvas is real and it stays — it is behind `Rule builder` on the
   action bar — but it answered a question nobody standing here had
   asked. FITMENT names a fact about the business, and the fact was
   already on the sheet: 28 relationship tables, 8,679 pairings,
   every one of them traced to a cell.

   ── WHAT IS DRAWN, AND WHY EACH PART IS HERE ──────────────────

     1 · ONE CARD PER SUBJECT TABLE, largest first, with a bar per
         relationship. The bar is COVERAGE — how much of that table
         the relationship actually reaches — because that is the
         proportion with a meaning at every scale, and it is the one
         that shows the gaps. Highfield's two trailer tables hold
         197 pairings against 588 hulls and reach 146 of them; the
         pairing count alone would have read as plenty.
     2 · WHAT A PERSON DECIDED versus what a formula worked out.
         `__origin` carries it on every row — 'rule' where the
         workbook cell was a live external link, 'added' where the
         same text was typed. The count — 352 of 61,854 live fan-out
         cells are formulas — is carried on the Origin column's own
         description in src/demos/northside.ts. It is NOT in
         FITMENT_RULES.md: an earlier draft of this file cited a
         §4.4 that does not exist, and the nearest thing the spec
         measures is a different denominator (507 of 26,018 cells,
         §3). Cite the column. Nobody has ever shown a dealer which half of
         their own catalogue is a lookup.
     3 · THE ASYMMETRY. Six of these tables take a loose outboard
         and two take a factory package instead; three carry a
         dealer-fit block and four carry none. That is real business
         fact, it is invisible from inside any one table, and it
         falls out of counting.
     4 · THE ONE RULE THAT PICKS. F8 — a trailer's series heading
         names the brand it is built for — drawn as the proportion
         of the catalogue it leaves standing, because a rule that
         leaves 2.8 % has chosen and a rule that leaves 97.7 % has
         not. It runs through `selectPartners` in
         @/features/constraints/trailerFitment, which is the only
         implementation of it in the app and stays that way.
     5 · WHAT IS HELD BACK, said out loud rather than dropped.

   ── EVERY FIGURE IS COMPUTED ON RENDER ────────────────────────

   Nothing on this page is typed in. The specification's own figures
   appear only on the provenance lines at the foot of each block,
   where they can be checked against the workbook rather than
   believed. A number that moves with the data cannot go stale, and
   that is the whole argument of this app.

   ── THE ONE THING THE BAR DOES THAT NEEDS DEFENDING ───────────

   The bar's fill takes the PARTNER TABLE'S OWN KIND HUE, through
   `accentVar` exactly as a card rail does. DESIGN_CONTRACT §1 says
   a kind hue is a rail, a dot or a glyph and never a fill behind
   text: there is no text on or behind a bar, and a proportion of a
   catalogue drawn in that catalogue's own colour is the same claim
   the card rail makes on Home, laid on its side. The track under it
   is `--paper-sunken`, which the contract names for exactly this.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import { TableKindSymbol } from '@/features/tablekit'
import { accentVar } from '@/types/model'
import type { AccentKey, EntityDef } from '@/types/model'
import { countLabel, kindNoun, leafNoun } from '@/features/table/grouping'
import type { LeafNoun } from '@/features/table/grouping'
import {
  TRAILER_ATM_FLOOR,
  TRAILER_FITMENT,
  bannerField,
  marqueVocabulary,
  readCatalogue,
  readMarques,
  readPartnerRows,
  type PartnerRowReading,
} from '@/features/constraints/trailerFitment'
import { ledgerFor } from '@/features/constraints/ruleLedger'
import { heldBackSentence, retiredTableSentence } from '@/features/views/sellable'
/* THE MECHANISM. See `THE RULE THAT PICKS, MADE PRESSABLE` below for
   what each of its four properties is doing on this page and why this
   band — the one place in the app that states a measured selection
   rate — was the worst possible surface to have been stating it
   without letting anybody check it. */
import { CurationNote, measuredRate, readCuration, searchReach } from '@/features/curation'
import { readFanOut, readRoles, type Fan, type FanReading, type StrandGroup } from './reading'
import './fitment.css'

const n = (v: number): string => v.toLocaleString()
const pct = (share: number): string => `${(share * 100).toFixed(share < 0.1 ? 2 : 1)}%`

/* ── F8'S RATE, READ FROM THE ADJUDICATION AND NEVER TYPED ────────
   The identical two lines `TrailerFitmentPanel` carries, for the
   identical reason: `RULE_LEDGER`'s F8 entry restates the seed's own
   `source` line and `ruleLedger.test.ts` asserts that it does, so this
   clause moves when the measurement moves and a hand-written
   "581 of 581" could not. `''` where the project measured nothing —
   `Narrowing.measured` is optional exactly so a rule nobody measured
   says nothing about a rate instead of reaching for one. */
const F8 = ledgerFor('F8')
const F8_RATE = F8?.measure
  ? measuredRate(F8.measure.held, F8.measure.tested, 'testable pairings in the price file')
  : ''

/** How many admitted rows are drawn before the list asks you to
 *  narrow. The rule's whole point is that it leaves a shortlist — the
 *  widest band on this seed leaves 34 — so this is only ever met with
 *  the narrowing switched OFF, which is when it should be met. */
const LIST_CAP = 60

export interface FanOutProps {
  /** open the relationship table behind a figure. A count nobody can
   *  get to the rows of is a claim rather than a reading. */
  onOpenTable?: (entityId: string) => void
}

export function FanOut({ onOpenTable }: FanOutProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  const reading = useMemo(
    () => readFanOut({ entities, rowsByEntity }),
    [entities, rowsByEntity],
  )
  const roles = useMemo(() => readRoles(reading), [reading])

  /* WHICH BRAND'S SHORTLIST IS OPEN, and the two controls the
     mechanism needs to do its work on it. A position inside this page
     and nowhere else — nothing here is a fact about the data. */
  const [picked, setPicked] = useState<string | null>(null)
  const [pickQuery, setPickQuery] = useState('')
  const [pickAll, setPickAll] = useState(false)

  /* F8, through the one implementation of it there is. It is memoised
     apart from the fan-out because it is the expensive half — it runs
     a selection per subject row — and neither depends on the other. */
  const selector = useMemo(() => {
    const project = { entities, rowsByEntity }
    const marques = marqueVocabulary(project, TRAILER_FITMENT)
    if (marques.length === 0) return null
    /* the partner side's own colour, so the rule's bars read as the
       same catalogue the fan cards drew above rather than as a new
       idea. Taken off the data, never named here. */
    const partner = Object.values(entities).find(
      (e) => e.role !== 'join' && e.kind === TRAILER_FITMENT.partnerKind,
    )
    const readings = readMarques(project, TRAILER_FITMENT, {
      marques,
      floor: TRAILER_ATM_FLOOR,
    })
    const catalogue = readCatalogue(project, TRAILER_FITMENT, marques)
    return {
      accent: partner?.accent ?? 'graphite',
      /* the floor's own reading, summed — it warns, it never filters */
      floorWarned: readings.reduce((sum, r) => sum + r.floorWarned, 0),
      floorUnchecked: readings.filter((r) => r.loadColumn === null).map((r) => r.marque.name),
      /* the words this block uses for both sides, and the name of the
         column the heading lives in, all read off the tables
         themselves — this feature knows what a relationship is and
         nothing about what the business sells */
      noun: leafNoun(partner),
      heading: (partner ? bannerField(partner)?.name : undefined) ?? 'heading',
      catalogue,
      /* THE CATALOGUE ROW BY ROW, so the rate above can be CHECKED
         rather than believed. Read through the selector's own file —
         see `readPartnerRows` for why the walk lives beside the rule
         and not here. */
      rows: readPartnerRows(project, TRAILER_FITMENT, marques),
      readings,
      /* ── WHAT WAS SET ASIDE BEFORE THE RULE EVER RAN ────────────
         Said ONCE, at the foot of the band, and in the discontinued
         contract's own sentences rather than in words this file made
         up. The shortlists above count against the LIVE catalogue —
         which is what F8 was measured on — so a person reading "12 of
         434" needs to be told, somewhere, what the 434 already
         excludes. Anywhere else and there would be two paragraphs
         about one set of rows with two different denominators, which
         is the fault `@/features/curation` exists to end. */
      setAside: [
        ...catalogue.retiredTables.map((name) => retiredTableSentence(name)),
        heldBackSentence(catalogue.discontinued, leafNoun(partner).many),
      ]
        .filter((line) => line !== '')
        .join(' '),
    }
  }, [entities, rowsByEntity])

  /* ============================================================
     THE RULE THAT PICKS, MADE PRESSABLE — the four properties on the
     one band that most needed them.

     WHAT WAS WRONG WITH THIS BAND. It is the only surface in the app
     that prints a MEASURED selection rate, and it printed eleven of
     them — "4 of 434 · 0.92% of the catalogue" — with no way on earth
     to see the four. A rate nobody can check is the same claim
     HelmLogic's tooltip makes ("wrong HP band, wrong length") with a
     number bolted on, and a number bolted onto an unverifiable claim
     is worse than none: it is confidently wrong, which
     DESIGN_CONTRACT §7 names outright.

     THE FOUR PROPERTIES, AND WHAT EACH ONE IS HERE.

       1 · IT EXPLAINS ITSELF   the narrowing is F8, in the price
           file's own word for the column — `selector.heading`, read
           off the partner table — and it carries the rate the
           adjudication measured. This is the exemplar sentence
           `curation.ts`'s header is written around, and this is the
           surface it was written about.
       2 · IT CAN BE SEARCHED PAST   the box searches the WHOLE live
           catalogue, not the shortlist. Somebody who can see a
           trailer on the sheet and types its name is told how many
           match on the far side of the rule and handed one press that
           fetches them. That is the exact failure `reach.ts` was
           written for, and the reason it is not "search the list you
           are looking at".
       3 · IT CAN BE SWITCHED OFF   the whole catalogue, F8 suspended.
           A person who does not believe the rule can see what it set
           aside and decide for themselves.
       4 · THE COUNT IS STATED   "422 trailers are not offered here,
           because …" — never left as 434 minus 12.

     THE DENOMINATOR IS THE LIVE CATALOGUE, which is the same choice
     `TrailerFitmentPanel` made and for its reason: `MarqueReading`
     already counts against live rows, so folding the withheld ones
     into this pool would count them twice and put two different
     totals for one catalogue on one screen. The discontinued and
     retired rows are said ONCE, at the foot of the band, in
     `sellable.ts`'s own sentences. */
  const pick = useMemo(() => {
    if (!selector || picked === null) return null
    const marque = selector.readings.find((r) => r.marque.name === picked)
    if (!marque) return null

    /* NEVER OFFERED, so never in the pool a search reaches into. The
       contract holds these back before any rule runs. */
    const live = selector.rows.filter((r) => !r.discontinued)
    const admitted = pickAll ? live : live.filter((r) => r.bannerMarque === picked)
    const admittedIds = new Set(admitted.map((r) => r.rowId))

    const found = searchReach({
      pool: live,
      offered: admittedIds,
      idOf: (r: PartnerRowReading) => r.rowId,
      hayOf: (r: PartnerRowReading) => r.hay,
      term: pickQuery,
    })

    return {
      marque,
      admitted,
      shown: (found.active ? found.within : admitted).slice(0, LIST_CAP),
      drawn: found.active ? found.within.length : admitted.length,
      searching: found.active,
      reading: readCuration({
        name: selector.noun.many,
        counts: { pool: live.length, matched: admitted.length, offered: admitted.length },
        narrowings: pickAll
          ? []
          : [
              {
                id: 'f8',
                what: `the ${selector.heading} names ${picked}`,
                /* THE ONE CLAUSE THAT IS THE WHOLE OF OUR ADVANTAGE
                   HERE — and it rides with the reason it belongs to
                   rather than floating free, which is what
                   `curationChip` refuses to let a caller do. */
                measured: F8_RATE,
              },
            ],
        showingAll: pickAll,
        search: { term: pickQuery, beyond: found.beyond.length },
      }),
    }
  }, [selector, picked, pickAll, pickQuery])

  if (reading.fans.length === 0) return <NothingYet />

  /* THE WORD FOR THE WHOLE SET, WHICH IS NOT ANY ONE TABLE'S WORD.
     Each card below counts in its own table's noun — 588 variants, 91
     models, both the dealer's own — and the total across them is
     neither. `kindNoun` is the one word true of all of them; a sheet
     whose subject kind carries no word says "rows" and says it once,
     rather than borrowing a word from the biggest table and putting
     it on six others. */
  const noun =
    (reading.subjectKind ? kindNoun(reading.subjectKind) : null) ??
    leafNoun(undefined)

  const { derived, typed } = reading.provenance
  const derivedShare = reading.pairs === 0 ? 0 : derived / reading.pairs

  return (
    <section className="fo-root" aria-label="What fits what">
      <div className="fo-page">
        <header className="fo-head">
          <p className="fo-eyebrow">From your price file</p>
          <h2 className="fo-title">What one {noun.one} can be sold with</h2>
          <p className="fo-lede">
            Your price file already records what may go with what, and it keeps{' '}
            {reading.roles.length} kinds of pairing: {reading.roles.join(', ')}. Every
            figure below is counted off the sheet as it stands right now, so the moment a
            pairing changes, so does the picture.
          </p>

          <ul className="fo-ledger">
            <Stat figure={n(reading.subjects)} word={noun.many} />
            <Stat figure={n(reading.pairs)} word="pairings between them" />
            <Stat
              figure={n(reading.partnerTables)}
              word={`catalogues they draw from, across ${n(reading.joinTables)} relationship tables`}
            />
            <Stat
              figure={n(derived)}
              word={`of those pairings a formula worked out — ${pct(derivedShare)}`}
            />
          </ul>
        </header>

        {/* ---- the fans ---- */}
        <ul className="fo-fans">
          {reading.fans.map((fan) => (
            <FanCard
              key={fan.subjectTableId}
              fan={fan}
              entity={entities[fan.subjectTableId]}
              onOpenTable={onOpenTable}
            />
          ))}
        </ul>

        {/* ---- decided or looked up ---- */}
        <section className="fo-band" aria-label="What a person decided">
          <p className="fo-band-eyebrow">How each pairing got there</p>
          <h3 className="fo-band-title">
            {n(typed)} of these {n(reading.pairs)} pairings were typed by a person
          </h3>
          <p className="fo-band-lede">
            Every pairing remembers how it arrived. {n(derived)} of them came from a live
            link in the workbook — the business pointed at a row in a library and the
            spreadsheet fetched it. The other {n(typed)} somebody decided and typed in.
            That is the difference between a lookup that can be re-run and a judgement
            only your people hold, and until this page nothing here told you which was
            which.
          </p>
          <Derived reading={reading} onOpenTable={onOpenTable} />
          <p className="fo-src">
            Read from the Origin column every relationship table carries · &lsquo;rule&rsquo;
            where the workbook cell was a live external link and the business pointed at
            the library row, &lsquo;added&rsquo; where the same text was typed · 352 of
            61,854 live fan-out cells are formulas · the count is stated on the
            Origin column itself, in src/demos/northside.ts
          </p>
        </section>

        {/* ---- the asymmetry ---- */}
        <section className="fo-band" aria-label="What differs between them">
          <p className="fo-band-eyebrow">Where they differ</p>
          <h3 className="fo-band-title">Not every {noun.one} has every relationship</h3>
          <p className="fo-band-lede">
            The tables are not variations on one shape. Each row below is one relationship,
            which of your {noun.many} carry it, and which carry none — an absence is a
            business decision and it does not show from inside a table.
          </p>
          <ul className="fo-roles">
            {roles.map((role) => (
              <li className="fo-role" key={role.role}>
                <p className="fo-role-head">
                  <span className="fo-role-name">{role.role}</span>
                  <b className="fo-role-n">{n(role.pairs)}</b>
                </p>
                <p className="fo-role-say">
                  {/* "7 of 7 tables carry it" is a true sentence that
                      makes a reader stop and do arithmetic to find out
                      nothing is missing. When nothing is missing, say
                      so in words. */}
                  {role.absent.length === 0 ? (
                    <>Every table carries it</>
                  ) : (
                    <>
                      {role.present.length} of {reading.fans.length}{' '}
                      {role.present.length === 1 ? 'table carries' : 'tables carry'} it
                    </>
                  )}
                  {' — '}
                  {role.present.map((p) => p.tableName).join(', ')}.
                  {role.absent.length > 0 ? (
                    <>
                      {' '}
                      <span className="fo-role-none">
                        {role.absent.join(', ')}{' '}
                        {role.absent.length === 1 ? 'has' : 'have'} none.
                      </span>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- the rule that picks ---- */}
        {selector && selector.readings.length > 0 ? (
          <section className="fo-band" aria-label="The rule that picks">
            <p className="fo-band-eyebrow">The one rule that picks</p>
            <h3 className="fo-band-title">
              A {selector.noun.one}&rsquo;s {selector.heading} says which {noun.one} it is
              built for
            </h3>
            <p className="fo-band-lede">
              {selector.catalogue.named} of {selector.catalogue.live} {selector.noun.many}{' '}
              sit under a {selector.heading} that names a brand, and that is what chooses.
              The bar is how much of the whole catalogue each brand&rsquo;s headings leave
              standing — a rule that leaves three of a hundred has picked something, and
              one that leaves ninety-eight has not.
            </p>
            <ul className="fo-picks">
              {selector.readings.map((r) => {
                const open = picked === r.marque.name
                return (
                  /* WRITTEN OUT, NOT INTERPOLATED — `check-styles`
                     only trusts a string literal inside a className,
                     and a class it cannot read is a class nobody
                     notices going unstyled. */
                  <li className={open ? 'fo-pick is-open' : 'fo-pick'} key={r.marque.name}>
                    {/* THE BAR IS NOW A DOOR. Everything inside it is
                        what it always was — the count, the proportion,
                        the price file's own series headings — and the
                        one thing that changed is that pressing it
                        shows you the rows the figure is about. A
                        measured claim with nothing behind it was the
                        defect; see the `pick` memo. */}
                    <button
                      type="button"
                      className="fo-pick-door"
                      aria-expanded={open}
                      onClick={() => {
                        setPicked(open ? null : r.marque.name)
                        /* a new brand starts with the rule IN force
                           and nothing typed — otherwise a shortlist
                           opens pre-filtered by somebody else's search */
                        setPickAll(false)
                        setPickQuery('')
                      }}
                    >
                      <span className="fo-pick-head">
                        <span className="fo-pick-name">{r.marque.name}</span>
                        <span className="fo-pick-n">
                          <b>{r.selected}</b> of {r.catalogue}
                        </span>
                      </span>
                      <Bar share={r.share} accent={selector.accent} />
                      <span className="fo-pick-say">
                        {pct(r.share)} of the catalogue · {r.marque.banners.join(' · ')}
                      </span>
                    </button>

                    {open && pick ? (
                      <div className="fo-pick-open">
                        <CurationNote
                          reading={pick.reading}
                          showingAll={pickAll}
                          onShowAll={setPickAll}
                          search={{
                            value: pickQuery,
                            onChange: setPickQuery,
                            label: `Find a ${selector.noun.one} by name, across the whole catalogue`,
                            placeholder: `Find a ${selector.noun.one}…`,
                          }}
                        />
                        {pick.shown.length === 0 ? (
                          <p className="fo-pick-none">
                            {pick.searching
                              ? `Nothing on this shortlist matches “${pickQuery.trim()}”.`
                              : `No ${selector.noun.one} on the sheet carries a ${selector.heading} naming ${r.marque.name}.`}
                          </p>
                        ) : (
                          <ul className="fo-list">
                            {pick.shown.map((row) => (
                              <li className="fo-list-row" key={row.rowId}>
                                <span className="fo-list-name">{row.label}</span>
                                {/* THE EVIDENCE, NOT A TICK. The
                                    heading is the cell the rule read,
                                    verbatim, so a reader can check the
                                    verdict against their own file
                                    rather than take it. */}
                                <span className="fo-list-banner">{row.banner}</span>
                                <span className="fo-list-table">{row.tableName}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {pick.drawn > pick.shown.length ? (
                          <p className="fo-list-more">
                            {n(pick.drawn - pick.shown.length)} more are on the list and not
                            drawn — type above to narrow.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
            {/* THE FLOOR, SAID TO BE A FLOOR, AND MEASURED RATHER THAN
                CLAIMED. This paragraph read "no trailer in this price
                file is rated under the weight of the boat it is offered
                against", which is F9's finding about the WORKBOOK'S OWN
                pairings (530 of 530) and is not true of what the
                selector admits: on this seed the banner admits a
                candidate under the floor for 31 hulls, and every one
                stays on the list with the warning beside it. A page
                about being honest with numbers may not round a warning
                down to zero, so the count is computed. */}
            <p className="fo-band-note">
              A capacity floor is checked alongside it and it only ever warns — it takes
              nothing off the list.{' '}
              {selector.floorWarned > 0 ? (
                <>
                  {selector.floorWarned} {noun.one}
                  {selector.floorWarned === 1 ? ' is' : 's are'} offered a{' '}
                  {selector.noun.one} in {selector.floorWarned === 1 ? 'its' : 'their'} own
                  series rated under {selector.floorWarned === 1 ? 'its' : 'their'} weight,
                  and {selector.floorWarned === 1 ? 'it stays' : 'they stay'} on the list
                  with the warning beside {selector.floorWarned === 1 ? 'it' : 'them'}.
                </>
              ) : (
                <>
                  No {noun.one} here is offered a {selector.noun.one} in its own series
                  rated under its weight.
                </>
              )}
              {selector.floorUnchecked.length > 0 ? (
                <>
                  {' '}
                  It does not run at all for <b>{selector.floorUnchecked.join(', ')}</b>,
                  whose bands carry no weight column — a check that has not run, not a check
                  that passed.
                </>
              ) : null}{' '}
              The whole account of both — where each runs, where it cannot, and what it sets
              aside — is on <b>Business rules</b>.
            </p>
            {/* see `setAside` in the selector memo for why this is one
                line, here, and in the contract's own words */}
            {selector.setAside === '' ? null : (
              <p className="fo-band-note">{selector.setAside}</p>
            )}
            <p className="fo-src">
              Computed by the selector in src/features/constraints/trailerFitment.ts, which
              is the only implementation of this rule in the app · Trailer Module!A, eleven
              series banners naming a boat brand · ASSERTED · 581 of 581 testable live
              pairings, 0 counter-examples · docs/specs/FITMENT_RULES.md §1.2, F8, F9, R11
            </p>
          </section>
        ) : null}

        {/* ---- held back ---- */}
        <HeldBack reading={reading} noun={noun.many} />

        {/* NAME THE OTHER FACE. This page COUNTS what the price file
            already states; the canvas behind `Rule builder` DERIVES a
            list by walking rows. Somebody who opens the wrong one does
            not discover their mistake, they conclude the thing they
            wanted cannot be done — so each says what it is not. */}
        <p className="fo-tail">
          Everything here is counted from the pairings your file already holds. To work one
          out instead — walk every row of a table and collect what matches — open{' '}
          <b>Rule builder</b> on the bar.
        </p>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- */
/* One subject table                                           */
/* ---------------------------------------------------------- */

function FanCard({
  fan,
  entity,
  onOpenTable,
}: {
  fan: Fan
  entity: EntityDef | undefined
  onOpenTable?: (entityId: string) => void
}): ReactElement {
  const noun = leafNoun(entity)
  return (
    <li
      className="fo-fan"
      style={{ '--fo-accent': accentVar(fan.subjectAccent) } as CSSProperties}
    >
      <p className="fo-fan-head">
        <span className="fo-fan-mark">
          <TableKindSymbol kind={fan.subjectKind} size={ICON_SIZE.small} />
        </span>
        <span className="fo-fan-name">{fan.subjectTableName}</span>
        <span className="fo-fan-count">{countLabel(fan.subjects, noun)}</span>
      </p>

      <ul className="fo-rows">
        {fan.groups.map((group) => (
          <GroupRow
            key={group.role}
            group={group}
            subjects={fan.subjects}
            noun={noun}
            onOpenTable={onOpenTable}
          />
        ))}
      </ul>
    </li>
  )
}

function GroupRow({
  group,
  subjects,
  noun,
  onOpenTable,
}: {
  group: StrandGroup
  subjects: number
  noun: LeafNoun
  onOpenTable?: (entityId: string) => void
}): ReactElement {
  const live = group.strands.filter((s) => !s.heldBack)
  const held = group.strands.filter((s) => s.heldBack)
  const only = live.length === 1 ? live[0] : null

  /* A CARRIED FACT IS A SHARE OF THE PAIRINGS IT IS CARRIED ON, not a
     share of the table. "2,177 of 2,519 Motor pairings name a rigging
     kit" is the reading; "456 of 588 hulls" is true and answers a
     question nobody asked about a column. Summed over every strand,
     because Jeanneau's rigging column is carried on two motor tables
     and one of them is not the denominator. */
  const offered =
    group.via === 'column'
      ? live.reduce((sum, s) => sum + s.pairs + s.blank, 0)
      : subjects
  const share = offered === 0 ? 0 : (group.via === 'column' ? group.pairs : group.reached) / offered
  const carriedOn = live[0]?.carriedOnRole

  return (
    <li className="fo-row">
      <p className="fo-row-head">
        <span className="fo-row-role">{group.role}</span>
        <b className="fo-row-n">{n(group.pairs)}</b>
      </p>

      <Bar share={share} accent={live[0]?.partnerAccent ?? 'slate'} />

      <p className="fo-row-say">
        {group.via === 'column' ? (
          group.pairs === 0 ? (
            <>
              Named on none of the {n(offered)} {carriedOn} pairings it could sit on.
            </>
          ) : (
            <>
              on {n(group.pairs)} of {n(offered)} {carriedOn} pairings
            </>
          )
        ) : group.missing === 0 ? (
          <>every {noun.one}</>
        ) : (
          <>
            {n(group.reached)} of {n(subjects)} {noun.many}
          </>
        )}
        {only && only.pairs > 0 ? (
          <>
            {' · '}
            <PartnerName
              name={only.partnerTableName}
              used={only.partnersUsed}
              of={only.partnerCatalogue}
            />
          </>
        ) : null}
        {group.provenance.derived > 0 ? (
          <>
            {' · '}
            <span className="fo-row-derived">{n(group.provenance.derived)} derived</span>
          </>
        ) : null}
      </p>

      {only === null && live.length > 0 ? (
        <ul className="fo-strands">
          {live.map((strand) => (
            <li className="fo-strand" key={strand.id}>
              <TableDoor
                name={strand.joinTableName}
                label={strand.carriedOn ?? strand.partnerTableName}
                entityId={strand.joinTableId}
                onOpenTable={onOpenTable}
              />
              <span className="fo-strand-n">{n(strand.pairs)}</span>
              <span className="fo-strand-of">
                {strand.partnersUsed} of {strand.partnerCatalogue}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {held.map((strand) => (
        <p className="fo-row-held" key={strand.id}>
          {n(strand.pairs)} more sit on <b>{strand.joinTableName}</b>, which is history
          rather than stock. They are not offered, and nothing is deleted — a quote that
          already names one still opens.
        </p>
      ))}
    </li>
  )
}

function PartnerName({
  name,
  used,
  of,
}: {
  name: string
  used: number
  of: number
}): ReactElement {
  return (
    <span className="fo-row-partner">
      {used} of {of} {name}
    </span>
  )
}

/* ---------------------------------------------------------- */
/* Blocks                                                      */
/* ---------------------------------------------------------- */

function Bar({ share, accent }: { share: number; accent: AccentKey }): ReactElement {
  /* A HAIRLINE FLOOR, so a real relationship never draws as nothing.
     Merry Fisher's headings leave 4 of 434 trailers standing — 0.92 %
     — and at 0.92 % of a 240px track that is two pixels of paint. A
     bar that rounds a true reading down to invisible has told the
     reader there is nothing there, which is the opposite of what the
     figure beside it says. */
  const width = share <= 0 ? 0 : Math.max(1.5, Math.min(100, share * 100))
  return (
    <span
      className="fo-bar"
      aria-hidden="true"
      style={{ '--fo-bar-accent': accentVar(accent) } as CSSProperties}
    >
      <span className="fo-bar-fill" style={{ width: `${width}%` }} />
    </span>
  )
}

function Stat({ figure, word }: { figure: string; word: string }): ReactElement {
  return (
    <li className="fo-stat">
      <b className="fo-stat-n">{figure}</b>
      <span className="fo-stat-word">{word}</span>
    </li>
  )
}

function TableDoor({
  name,
  label,
  entityId,
  onOpenTable,
}: {
  name: string
  label: string
  entityId: string
  onOpenTable?: (entityId: string) => void
}): ReactElement {
  if (!onOpenTable) return <span className="fo-door-flat">{label}</span>
  return (
    <button
      type="button"
      className="fo-door"
      onClick={() => onOpenTable(entityId)}
      aria-label={`Open ${name}`}
    >
      <span className="fo-door-name">{label}</span>
      <ArrowSquareOut size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
    </button>
  )
}

function Derived({
  reading,
  onOpenTable,
}: {
  reading: FanReading
  onOpenTable?: (entityId: string) => void
}): ReactElement | null {
  /* Every relationship table with at least one derived pairing,
     heaviest share first — the ones at the top are the parts of the
     catalogue that maintain themselves.

     PAIRINGS ONLY. A rigging kit carried on a motor pairing has the
     same Origin cell as the pairing it sits on, so counting the
     column strand as well listed "Highfield × Yamaha" twice with two
     different denominators — 80 of 2,519 and 72 of 2,177 — which
     reads as two facts and is one. Filtered to the pairing, this
     column sums to the 305 in the sentence above it. */
  const rows = reading.fans
    .flatMap((fan) => fan.groups.flatMap((g) => g.strands))
    .filter((s) => s.via === 'table' && !s.heldBack && s.provenance.derived > 0)
    .map((s) => ({
      id: s.id,
      joinTableId: s.joinTableId,
      name: s.joinTableName,
      derived: s.provenance.derived,
      pairs: s.pairs,
    }))
    .sort((a, b) => b.derived / b.pairs - a.derived / a.pairs || b.derived - a.derived)

  if (rows.length === 0) return null

  return (
    <ul className="fo-derived">
      {rows.map((row) => (
        <li className="fo-derived-row" key={row.id}>
          <TableDoor
            name={row.name}
            label={row.name}
            entityId={row.joinTableId}
            onOpenTable={onOpenTable}
          />
          <span className="fo-derived-bar" aria-hidden="true">
            <span
              className="fo-derived-fill"
              style={{ width: `${Math.max(1.5, (row.derived / row.pairs) * 100)}%` }}
            />
          </span>
          <span className="fo-derived-n">
            <b>{n(row.derived)}</b> of {n(row.pairs)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function HeldBack({
  reading,
  noun,
}: {
  reading: FanReading
  noun: string
}): ReactElement | null {
  const gaps = reading.fans
    .flatMap((fan) =>
      fan.groups
        .filter((g) => !g.heldBack && g.missing > 0 && g.via === 'table')
        .map((g) => ({
          key: `${fan.subjectTableId}:${g.role}`,
          table: fan.subjectTableName,
          role: g.role,
          missing: g.missing,
          subjects: fan.subjects,
        })),
    )
    .sort((a, b) => b.missing - a.missing)

  if (gaps.length === 0 && reading.heldBackPairs === 0) return null

  return (
    <section className="fo-band" aria-label="What does not resolve">
      <p className="fo-band-eyebrow">What is not there</p>
      <h3 className="fo-band-title">The gaps, counted rather than hidden</h3>
      <p className="fo-band-lede">
        A relationship that reaches most of a table still leaves the rest with nothing to
        offer. These are the {noun} the price file records no partner for, which is a
        question for whoever keeps the file rather than a fault in it.
      </p>
      <ul className="fo-gaps">
        {gaps.map((gap) => (
          <li className="fo-gap" key={gap.key}>
            <b className="fo-gap-n">{n(gap.missing)}</b>
            {/* NOT A POSSESSIVE. Four of the seven table names in this
                seed already end in s, and "Highfield Inflatables's 588
                rows" is a sentence a person stumbles over. The table
                keeps its own name, spelled its own way, and the
                sentence goes round it. */}
            <span className="fo-gap-say">
              of the {n(gap.subjects)} rows on <b>{gap.table}</b> are paired with no{' '}
              {gap.role} anywhere on the sheet.
            </span>
          </li>
        ))}
        {reading.heldBackPairs > 0 ? (
          <li className="fo-gap" key="held">
            <b className="fo-gap-n">{n(reading.heldBackPairs)}</b>
            <span className="fo-gap-say">
              pairings are held back before any of this is counted, because{' '}
              <b>{reading.heldBackTables.join(', ')}</b>{' '}
              {reading.heldBackTables.length === 1 ? 'is' : 'are'} history rather than
              stock.
            </span>
          </li>
        ) : null}
      </ul>
    </section>
  )
}

function NothingYet(): ReactElement {
  const tables = useProjectStore((s) => Object.keys(s.entities).length)
  return (
    <section className="fo-root" aria-label="What fits what">
      <div className="fo-page">
        <div className="fo-void">
          <p className="fo-void-eyebrow">Nothing fits anything yet</p>
          <p className="fo-void-say">
            Fitment counts the pairings your price file already records — what may be sold
            with what, and how much of each catalogue that leaves standing. It reads them
            off relationship tables, and there are none on this sheet.
          </p>
          <p className="fo-void-count">
            You have <strong className="fo-void-n">{tables}</strong>{' '}
            {tables === 1 ? 'table' : 'tables'} and no relationships between them.
          </p>
          <p className="fo-void-note">
            A relationship is made by adding a Link column to a table, on{' '}
            <b>What goes with each one</b>.
          </p>
        </div>
      </div>
    </section>
  )
}
