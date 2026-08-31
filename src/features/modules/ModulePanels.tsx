/* ============================================================
   THE THREE PANELS A MODULE GREW — Dashboard, Quotes and Pricing.

   These are not new capabilities. Every figure and every sentence
   below was already computed by a reader in `read.ts`, `access.ts`
   or `moduleRules.ts`, and every one of them was drawn as part of
   a six-strip band stacked on top of the catalogue. The band is
   gone; the readers are the same ones; each answer now stands in
   the room it is about.

     DASHBOARD  what is in this place, counted, with its
                photography — plus the other places in its module,
                what goes with these, and what may be done here.
     QUOTES     every quote raised from here. The overview band
                named four and said "and N more are in Quotes";
                this is the N.
     PRICING    the columns that price it, the levels those columns
                are rungs of, and the rules that govern them.

   NOTHING IS INVENTED IN ANY OF THEM. A place that prices nothing
   says so; a place nobody has quoted from says so; a rule nobody
   wrote does not appear.
   ============================================================ */

import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { CaretRight } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { type EntityDef, type ModuleDef } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'
import { coverPhoto } from '@/features/table/coverPhoto'
import { localDay, priceLevelsFor, quoteTotals, useQuotes } from '@/features/quote'
import { ACTIVITY_EMPTY_HERE, ActivityList, useModuleActivity } from '@/features/activity'
import { money } from '@/lib/money'
import {
  buildEntries,
  categoryDrawers,
  listedTables,
  moduleCensus,
  moduleTables,
  priceReadOf,
  relatedTables,
} from './read'
import { capabilityStates } from './designer'
import { useModuleConfiguresRules } from './ruleCapability'
import { ModuleRulesPanel } from './ModuleRulesPanel'
import './modules.css'

const grouped = (n: number): string => n.toLocaleString('en-AU')

/** How many of each a GLANCE is. The full list of either is one
 *  press away — the Quotes tab, and the whole log — and a dashboard
 *  that reprints them is two lists of one thing. */
const RECENT_QUOTES = 4
const ACTIVITY_ROWS = 6
/** How much of the range the dashboard shows. The catalogue tab is
 *  one press away and draws all of it. */
const PREVIEW_ROWS = 6

/* ============================================================
   DASHBOARD — what is in this place
   ============================================================ */

export interface ModuleHomeProps {
  /** the module narrowed to the place being stood at */
  module: ModuleDef
  /** the module itself, for the places beside this one */
  owner: ModuleDef
  place: string | undefined
  onOpen: (tableId: string, rowId: string) => void
  onOpenQuote?: ((quoteId: string) => void) | undefined
  /** stand at another of the module's places, without leaving it */
  onPlace: (tableId: string) => void
  /** the door into the stock — the catalogue tab, by another route */
  /** Open the catalogue. `at` is a drawer key (`categoryDrawers`)
   *  when a particular series was pressed, and absent when the card's
   *  own "Open catalog" was — the catalogue lands on that series where
   *  it files itself into drawers, and simply opens where it does not. */
  onStock: (at?: string) => void
  /** the module's own quotes tab, from the recent-quotes card */
  onQuotes?: (() => void) | undefined
  /** start a quote standing in this place. Absent = the card says
   *  nothing has been quoted and offers no button, which is better
   *  than a button that cannot work. */
  onNewQuote?: (() => void) | undefined
  /** whose business this is. The activity log is kept per
   *  organisation, so a card that reads it is TOLD which one rather
   *  than reaching for the session — the same arrangement every
   *  other derivation in this feature keeps. */
  orgSlug: string
}

export function ModuleHome({
  module,
  owner,
  place,
  onOpen,
  onPlace,
  onStock,
  onQuotes,
  onOpenQuote,
  onNewQuote,
  orgSlug,
}: ModuleHomeProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const quotes = useQuotes()

  const listed = useMemo(() => listedTables(module, entities), [module, entities])
  const census = useMemo(
    () => moduleCensus(module, entities, rowsByEntity),
    [module, entities, rowsByEntity],
  )
  const master = listed[0]
  const cover = useMemo(
    () => (master ? coverPhoto(master, rowsByEntity[master.id]) : null),
    [master, rowsByEntity],
  )

  /* WHAT IS REACHABLE FROM HERE through a join somebody declared. */
  const related = useMemo(() => relatedTables(module, entities), [module, entities])

  /* THE VERBS THAT ARE ON, in the contract's own order — the same
     reader the designer strip uses, so the two cannot disagree. */
  const configures = useModuleConfiguresRules(owner.id)
  const verbs = useMemo(
    () =>
      capabilityStates(module, moduleTables(module, entities), configures)
        .filter((s) => s.on)
        .map((s) => s.label),
    [module, entities, configures],
  )

  /* HOW MANY QUOTES CAME OUT OF HERE. A set membership on the quote's
     own `rootTableId`, never a guess — and exactly zero on a freshly
     loaded sheet, which is the honest answer. */
  const mine = useMemo(() => new Set(listed.map((t) => t.id)), [listed])
  const raised = useMemo(
    () => quotes.filter((q) => mine.has(q.rootTableId)).length,
    [quotes, mine],
  )

  /* WHAT HAS CHANGED IN HERE. Read before the branch so the card
     can choose between its two states without calling a hook
     conditionally. */
  const here = useModuleActivity(orgSlug, owner.id, ACTIVITY_ROWS)

  /* THE PLACES BESIDE THIS ONE. Only where the module holds more than
     one table, because a module that is one place has none. */
  const siblings = useMemo(
    () =>
      owner.tableIds.length > 1
        ? owner.tableIds
            .map((id) => entities[id])
            .filter((e): e is EntityDef => e !== undefined)
        : [],
    [owner, entities],
  )

  /* THE FIRST FEW THE CATALOGUE WOULD DRAW. `buildEntries` is the
     catalogue tab's own reader, asked for the entries WITHOUT their
     formatted facts — three formatted cells on 588 rows is a cost
     this strip has no use for, and `read.ts` documents that flag as
     existing for exactly this. */
  const entries = useMemo(
    () => buildEntries(listed, rowsByEntity, { facts: false }),
    [listed, rowsByEntity],
  )
  const preview = useMemo(() => entries.slice(0, PREVIEW_ROWS), [entries])

  /* THE SHAPE OF THE BRAND, which is what this card should have been
     saying all along.

     WHAT IT SAID BEFORE. "588 priced · 7 series", then six of those
     588 rows — Highfield RU230KAM (PVC) WH, RU230KAM (HYP) WH,
     RU230KAM (PVC) LG, RU230KAM (HYP) LG… four near-identical
     variant codes of the SAME model, because the first six rows of a
     sheet ordered by series are six variants of one boat. Six rows
     chosen by their position in a spreadsheet is not a range.

     WHAT IT SAYS NOW. The seven series, each with what it holds and
     what it costs: `Sport · 40 models · $8,400–$24,900`. That is the
     whole 588 accounted for in seven lines, and it is the shape a
     dealer actually thinks in — a customer asks for a Sport, not for
     an RU230KAM.

     `categoryDrawers` IS ALREADY THIS READER and is already tested.
     It cuts entries by their banner, counts each, and finds the
     cheapest and dearest REAL ROW under it — never an average and
     never a guess. It was written for the catalogue's drawers; the
     question it answers is the same one. */
  const series = useMemo(() => categoryDrawers(entries, listed), [entries, listed])

  /* THE FIGURES THIS PLACE CAN STATE ABOUT ITSELF, and each one only
     where it is true of something. A zero is a cell of chrome. */
  const cells: { term: string; figure: number }[] = []
  /* "photographed" IS NOT A SALES FACT. It counted how many rows
     carry a picture, which is a statement about how complete OUR
     data is, drawn first and largest on a page about what a
     dealership sells. The catalogue is where a missing photograph
     is worth knowing about. */
  if (census.priced > 0) cells.push({ term: 'priced', figure: census.priced })
  if (census.held > 0) cells.push({ term: 'held back', figure: census.held })
  if (raised > 0) cells.push({ term: raised === 1 ? 'quote raised' : 'quotes raised', figure: raised })
  /* THE BRANCH COUNT IS ONLY A FACT WHERE THE BRANCHES ARE NOT
     DRAWN. "7 series" printed above a list of exactly seven series
     is the same reading twice, which is the fault the row strip was
     built to fix — reintroduced by the thing that fixed it. */
  if (series.length <= 1) {
    for (const b of census.branches) cells.push({ term: b.noun, figure: b.count })
  }


  /* THE FEW MOST RECENT, for the card. The full list is the Quotes
     tab eighteen pixels above; this is a glance. */
  const recent = useMemo(
    () =>
      quotes
        .filter((q) => mine.has(q.rootTableId))
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, RECENT_QUOTES),
    [quotes, mine],
  )

  return (
    <div className="md-home">
      {/* ============================================================
          WHAT THIS PAGE USED TO BE, AND WHY IT IS NOT ANY MORE.

          A 300px desaturated top-down photograph of ONE row, drawn
          as a door labelled "Catalog" — directly beneath a tab bar
          whose second tab is Catalog. Two doors to one place and the
          big one was the worse one, because it was a picture of a
          single boat standing in for a brand of 588.

          Under it: "534 photographed", which is a fact about how
          complete our data is and not about anything a dealer sells.
          Under that, "What you can do here — Browse · Search · Open
          one · Relate · Quote": the application listing its own
          capabilities back at the person using them.

          What a place in a business should answer is what is
          HAPPENING in it and what to do next. So: the quotes raised
          from here, the record of what changed here, and the range
          itself as doors. ============================================ */}

      <div className="md-home-grid">
      {/* ============================================================
          THE RANGE LEADS, AND THE TWO CARDS THAT ARE USUALLY EMPTY
          DO NOT.

          MEASURED ON A FRESHLY LOADED PRICE FILE, which is the state
          every module is in until somebody quotes from it: "Recent
          quotes — Nothing quoted from here yet" and "Activity —
          Nothing has changed in here yet", side by side, 145px tall,
          the first thing on a page about a brand with 588 boats.
          Two empty boxes were the headline and the 588 were third.

          So the grid is inverted. The range is the tall card on the
          left because it is the only one that is never empty — a
          module with no stock has no page. The deals and the log
          become a narrow rail beside it: still first-class, still
          the same cards, but sized to what they usually hold rather
          than to what they hold on the best day of the year.
          ============================================================ */}
      {/* ---- the range, as doors ----------------------------- */}
      {cells.length > 0 || census.branches.length > 0 ? (
        <section className="md-hcard md-hcard--wide" aria-labelledby="md-home-r">
          <header className="md-hcard-head">
            <h3 className="md-hcard-name" id="md-home-r">
              The range
            </h3>
            <button type="button" className="md-hcard-all" onClick={() => onStock()}>
              Open catalog
            </button>
          </header>

          {cells.length > 0 ? (
            <dl className="md-home-figs">
              {cells.map((c) => (
                <div className="md-home-fig" key={c.term}>
                  <dd>{grouped(c.figure)}</dd>
                  <dt>{c.term}</dt>
                </div>
              ))}
            </dl>
          ) : null}

          {/* WHAT IS ACTUALLY IN HERE.

              THE SIX ROWS THIS DREW. Highfield's first six, in sheet
              order: RU230KAM (PVC) WH, RU230KAM (HYP) WH, RU230KAM
              (PVC) LG, RU230KAM (HYP) LG, RU250KAM (PVC) WH,
              RU250KAM (HYP) WH. Two models in two tube materials and
              two colours — six lines that are really two boats, all
              of them Roll-Up, chosen for nothing but being at the top
              of a spreadsheet. It told you nothing about the other
              582 and it named the same boat four times.

              THE SEVEN THIS DRAWS. Every series, what it holds and
              what it costs, biggest first — which accounts for all
              588 in seven lines and is the shape a dealer thinks in.
              Nobody asks for an RU230KAM; they ask for a Roll-Up.

              A SERIES OPENS THE CATALOGUE. Where a table carries
              twelve headings or more the catalogue files itself into
              drawers and lands on this one; below that it is a
              grouped list and the press simply opens it. Both are
              honest and neither pretends to a filter that is not
              there. */}
          {series.length > 1 ? (
            <ul className="md-home-series">
              {series.map((d) => (
                <li key={d.key}>
                  <button
                    type="button"
                    className="md-series"
                    onClick={() => onStock(d.key)}
                  >
                    <span className="md-series-name">{d.name || `No ${d.of}`}</span>
                    <span className="md-series-n ds-mono">{grouped(d.count)}</span>
                    {/* THE TWO ENDS ARE REAL ROWS, never an average:
                        the cheapest and the dearest line the drawer
                        holds. A series that prices nothing draws no
                        empty cell. */}
                    {d.low ? (
                      <span className="md-series-band ds-mono">
                        {d.low === d.high ? d.low : `${d.low}–${d.high}`}
                      </span>
                    ) : (
                      <span className="md-series-band" />
                    )}
                    <CaretRight
                      size={ICON_SIZE.small}
                      className="md-series-go"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : preview.length > 0 ? (
            /* A FLAT TABLE HAS NO SERIES TO SHOW — Formosa declares no
               grouping at all — so it keeps the row strip, which is
               the right answer for a range that is simply a list. */
            <ul className="md-home-stock">
              {preview.map((e) => (
                <li key={`${e.tableId}:${e.rowId}`}>
                  <button
                    type="button"
                    className="md-stock"
                    onClick={() => onOpen(e.tableId, e.rowId)}
                  >
                    <span className="md-stock-say">
                      <span className="md-stock-name">{e.label}</span>
                      {e.branch ? (
                        <span className="md-stock-branch">{e.branch}</span>
                      ) : null}
                    </span>
                    {e.price ? (
                      <span className="md-stock-price ds-mono">{e.price}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

        {/* ---- the rail: what has happened here ------------- */}
        <div className="md-home-rail">
          {/* ---- the deals ------------------------------------- */}
          <section className="md-hcard" aria-labelledby="md-home-q">
            <header className="md-hcard-head">
              <h3 className="md-hcard-name" id="md-home-q">
                Recent quotes
              </h3>
              {recent.length > 0 && onQuotes ? (
                <button type="button" className="md-hcard-all" onClick={onQuotes}>
                  All {raised}
                </button>
              ) : null}
            </header>

            {recent.length === 0 ? (
              /* THE EMPTY STATE OFFERS THE ACT rather than narrating a
                 route to it. The old one on the Quotes tab spends two
                 sentences explaining where quotes come from. */
              <div className="md-hcard-none">
                <p className="md-hcard-none-say">Nothing quoted from here yet.</p>
                {onNewQuote ? (
                  <button type="button" className="md-hcard-go" onClick={onNewQuote}>
                    Start a quote
                  </button>
                ) : null}
              </div>
            ) : (
              <ul className="md-hq-list">
                {recent.map((q) => (
                  <li key={q.id}>
                    <button
                      type="button"
                      className="md-hq"
                      disabled={!onOpenQuote}
                      onClick={() => onOpenQuote?.(q.id)}
                    >
                      {/* THE SUBJECT AS THE QUOTE FROZE IT — never
                          re-read from the sheet. A boat renamed since
                          is still the boat this was written for. */}
                      <span className="md-hq-what">{q.subjectLabel}</span>
                      <span className="md-hq-who">
                        {q.customer.name.trim() || 'No customer yet'}
                      </span>
                      <span className="md-hq-sum ds-mono">{money(quoteTotals(q).total)}</span>
                      <span className="md-hq-when ds-mono">{localDay(q.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---- what changed here ----------------------------- */}
          <section className="md-hcard" aria-labelledby="md-home-a">
            <header className="md-hcard-head">
              <h3 className="md-hcard-name" id="md-home-a">
                Activity
              </h3>
            </header>
            {/* SCOPED TO THIS PLACE. Until today `Entry.moduleId` was
                written by nothing at all, so this card could only ever
                have been empty — see the note in activity.ts about
                what the stamp claims and what it does not. */}
            {here.length === 0 ? (
              <p className="md-hcard-none-say">{ACTIVITY_EMPTY_HERE}</p>
            ) : (
              <ActivityList orgSlug={orgSlug} moduleId={owner.id} limit={ACTIVITY_ROWS} />
            )}
          </section>
        </div>
      </div>

      {/* ---- where else to go -------------------------------- */}
      {siblings.length > 1 || related.length > 0 ? (
        <div className="md-home-foot">
          {siblings.length > 1 ? (
            <section className="md-home-strip">
              <h3 className="mono-label md-home-cap">Also in {owner.name}</h3>
              <ul className="md-home-chips">
                {siblings.map((t) => {
                  const at = t.id === (place ?? master?.id)
                  return (
                    <li key={t.id}>
                      {/* EVERY SIBLING IS A DOOR, including the one
                          you are standing in — pressing it changes
                          nothing, which is honest, and a chip that
                          stopped being pressable the moment it became
                          current would move under the pointer. */}
                      <button
                        type="button"
                        className={`md-home-chip${at ? ' is-here' : ''}`}
                        data-kind={kindOf(t.kind)}
                        aria-current={at ? 'true' : undefined}
                        onClick={() => onPlace(t.id)}
                      >
                        <TableKindSymbol kind={kindOf(t.kind)} size={ICON_SIZE.tiny} />
                        {t.name}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {related.length > 0 ? (
            <section className="md-home-strip">
              <h3 className="mono-label md-home-cap">Goes with these</h3>
              <ul className="md-home-links">
                {related.map((r) => (
                  <li className="md-home-link" key={r.tableId}>
                    <TableKindSymbol kind={kindOf(r.kind)} size={ICON_SIZE.tiny} />
                    <span className="md-home-link-name">{r.name}</span>
                    {/* "on 3 of 7" IS THE FACT, and it was drawn even
                        when it read "on 1 of 1" — a share of one is
                        not a share, it is a yes, and a row of them
                        told a salesperson nothing five times. */}
                    {r.of > 1 ? (
                      <span className="md-home-link-share">
                        on {r.on} of {r.of}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/* ============================================================
   QUOTES — every one raised from here
   ============================================================ */

export interface ModuleQuotesProps {
  module: ModuleDef
  owner: ModuleDef
  onOpenQuote?: ((quoteId: string) => void) | undefined
}

export function ModuleQuotes({ module, owner, onOpenQuote }: ModuleQuotesProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const quotes = useQuotes()

  /* EVERY member table counts, including a retired one: its rows are
     withheld from the catalogue because they are history rather than
     stock, but a quote raised against one still happened and still
     opens. */
  const mine = useMemo(
    () => new Set(moduleTables(module, entities).map((t) => t.id)),
    [module, entities],
  )

  /* NEWEST FIRST, BY WHEN IT WAS RAISED. `createdAt`, which is the
     column the quotes list already prints — sorting by one date and
     printing another puts an old day at the top of a list that
     claims to be recent. */
  const raised = useMemo(
    () =>
      quotes
        .filter((q) => mine.has(q.rootTableId))
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [quotes, mine],
  )

  if (raised.length === 0) {
    /* AN EMPTY STATE KEEPS ITS SENTENCE. Nothing has been raised
       here, which is a true and useful answer on a freshly loaded
       sheet — and it arrives the moment somebody quotes a boat. */
    return (
      <p className="md-none">No quote has been raised from {module.name} yet.</p>
    )
  }

  return (
    <ul className="md-qs">
      {raised.map((q) => {
        const body = (
          <>
            {/* THE SUBJECT AS THE QUOTE FROZE IT. Never re-read from
                the sheet: a quote prints what it froze, and a boat
                renamed since is still the boat this was written for. */}
            <span className="md-q-what">{q.subjectLabel}</span>
            <span className="md-q-state mono-label">
              {q.state === 'issued' ? 'Given' : 'Draft'}
            </span>
            {/* MONO BECAUSE THEY ARE FIGURES, and not `mono-label`,
                because a reference and a date are values a person
                reads back to somebody on the phone. */}
            <span className="md-q-ref">{q.reference}</span>
            <span className="md-q-when">{localDay(q.createdAt)}</span>
          </>
        )
        return (
          <li key={q.id}>
            {onOpenQuote ? (
              <button
                type="button"
                className="md-q"
                aria-label={`Open the quote for ${q.subjectLabel}, ${q.reference}`}
                onClick={() => onOpenQuote(q.id)}
              >
                {body}
              </button>
            ) : (
              /* A FACT THAT CANNOT BE OPENED IS BETTER THAN A CONTROL
                 THAT DOES NOTHING — the same shape the item rows take
                 when this place cannot open one. */
              <div className="md-q is-flat">{body}</div>
            )}
          </li>
        )
      })}
      <li className="md-qs-owner">
        <span className="mono-label">
          {raised.length} raised from {owner.name}
        </span>
      </li>
    </ul>
  )
}

/* ============================================================
   PRICING — the columns, the levels, the rules
   ============================================================ */

export interface ModulePricingProps {
  module: ModuleDef
  tables: EntityDef[]
}

export function ModulePricing({ module, tables }: ModulePricingProps): ReactElement {
  /* WHAT PRICES EACH TABLE, read through the two resolvers that own
     the question — `priceLevelsFor` for the ladder the table
     declares, `priceReadOf` for the one rung a catalogue face may
     print. Both refuse a cost column by construction; neither is
     re-implemented here, because a second opinion about which
     column is a price is how a dealer's buy price reaches a screen
     a customer can read over a shoulder. */
  const read = useMemo(
    () =>
      tables.map((t) => ({
        table: t,
        levels: priceLevelsFor(t),
        face: priceReadOf(t),
      })),
    [tables],
  )

  return (
    <div className="md-price">
      {read.map(({ table, levels, face }) => (
        <section className="md-price-one" key={table.id} data-kind={kindOf(table.kind)}>
          <h3 className="md-price-name">
            <TableKindSymbol kind={kindOf(table.kind)} size={ICON_SIZE.tiny} />
            {table.name}
          </h3>

          {levels.length === 0 ? (
            /* A THING THAT CANNOT BE DONE SAYS WHY, WHERE IT IS. */
            <p className="md-price-none">
              No column on {table.name} is marked as a price, so nothing here can be
              quoted. Mark one in Settings.
            </p>
          ) : (
            <ul className="md-price-levels">
              {levels.map((l) => {
                const column = table.fields.find((f) => f.id === l.fieldId)
                return (
                  <li className="md-price-level" key={l.key}>
                    <span className="md-price-level-name">{l.label}</span>
                    {/* THE COLUMN IT IS, in the business's own words,
                        so a number can always be traced back. */}
                    <span className="md-price-col">{column?.name ?? l.fieldId}</span>
                    <span className="md-price-scope mono-label">
                      {l.scope === 'quote' ? 'whole quote' : 'per line'}
                    </span>
                    {face && face.field.id === l.fieldId ? (
                      <span className="k-chip md-price-shown">On the face</span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ))}

      {/* THE RULES THAT GOVERN IT — the same panel the designer
          mounts, so there is one drawing of a module's rules and not
          two that can drift. */}
      <ModuleRulesPanel module={module} tables={tables} />
    </div>
  )
}
