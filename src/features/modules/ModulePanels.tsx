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

   ── THE PRIMITIVES PASS ──────────────────────────────────────
   Every card here is `<Card>`, every list line is `<Row>`, every
   button is `<Button>` and every caption is `<SectionHead>`, all
   from src/ui. The local rules that drew them — `.md-hcard`,
   `.md-hq`, `.md-stock`, `.md-series`, `.md-q`, `.md-price-one`,
   `.md-price-level`, `.md-hcard-all`, `.md-hcard-go` and their
   states — are deleted from modules.css, not layered under. The
   one thing the layer cannot yet say is a trailing FIGURE on an
   activating row (a button may not hold a button, so `trail` is
   only offered on a still row), so a total, a price or a day sits
   in `meta`, in mono and in full ink. That gap is reported, once,
   rather than worked around with a sixth internal layout.
   ============================================================ */

import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { type EntityDef, type ModuleDef } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'
import { localDay, priceLevelsFor, quoteTotals, useQuotes } from '@/features/quote'
import { ACTIVITY_EMPTY_HERE, ActivityList, useModuleActivity } from '@/features/activity'
import { money } from '@/lib/money'
import { markOf } from '@/lib/mark'
import { FrozenPhoto } from '@/features/quote/photo'
import { Button, Card, Row, SectionHead } from '@/ui'
import {
  buildEntries,
  categoryDrawers,
  listedTables,
  moduleCensus,
  moduleTables,
  priceReadOf,
  relatedTables,
} from './read'
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

  /* WHAT IS REACHABLE FROM HERE through a join somebody declared. */
  const related = useMemo(() => relatedTables(module, entities), [module, entities])

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
     saying all along: the seven series, each with what it holds and
     what it costs — the whole 588 accounted for in seven lines, and
     the shape a dealer actually thinks in. `categoryDrawers` is
     already this reader and is already tested: it cuts entries by
     their banner, counts each, and finds the cheapest and dearest
     REAL ROW under it — never an average and never a guess. */
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
     is the same reading twice. */
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
      {/* THE RANGE LEADS, AND THE TWO CARDS THAT ARE USUALLY EMPTY DO
          NOT. Measured on a freshly loaded price file: "Recent quotes
          — Nothing quoted from here yet" and "Activity — Nothing has
          changed in here yet", side by side, the first thing on a page
          about a brand with 588 boats. So the range is the tall card
          on the left because it is the only one that is never empty,
          and the deals and the log are a narrow rail beside it. */}
      <div className="md-home-grid">
        {/* ---- the range, as doors ----------------------------- */}
        {cells.length > 0 || census.branches.length > 0 ? (
          <section aria-label="The range">
            <Card tone="raised" pad="md">
              <div className="md-stack">
                <SectionHead
                  level="h3"
                  action={
                    <Button tone="ghost" size="sm" onClick={() => onStock()}>
                      Open catalog
                    </Button>
                  }
                >
                  The range
                </SectionHead>

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

                {/* A SERIES OPENS THE CATALOGUE. Where a table carries
                    twelve headings or more the catalogue files itself
                    into drawers and lands on this one; below that it
                    is a grouped list and the press simply opens it.
                    Both are honest and neither pretends to a filter
                    that is not there. The two ends of the band are
                    REAL ROWS, never an average. */}
                {series.length > 1 ? (
                  /* ============================================================
                     THE SERIES ARE DOORS WITH BOATS ON THEM.

                     This was eleven rows of text — a name, a count and a
                     price band, all at one weight, running off the bottom
                     of the screen — on the page a dealer lands on when
                     they press their own brand. Measured: the largest
                     thing on it was the module's name in the chrome, and
                     the subject of the screen had no picture anywhere.

                     Every series already knows its own best photograph:
                     `categoryDrawers` picks it off the entries it is
                     already walking, with `doorPicture`'s preference, so
                     the front door, a place's card and a series inside it
                     cannot disagree about which one is the good one.

                     It is the same shelf every other Showroom screen in
                     this app uses. A dealer who has learnt to push
                     through the Classics on the catalogue has learnt to
                     push through them here.
                     ============================================================ */
                  <ul className="md-shelf">
                    {series.map((d) => (
                      <li key={d.key} className="md-shelf-cell">
                        <button
                          type="button"
                          className="md-door"
                          data-kind={d.kind}
                          onClick={() => onStock(d.key)}
                        >
                          <span className="md-door-well">
                            {d.img ? (
                              <FrozenPhoto
                                img={d.img}
                                fallbackAlt={d.name || `No ${d.of}`}
                                className="md-door-img"
                                w={320}
                                h={200}
                              />
                            ) : (
                              <span className="md-door-mono">{markOf(d.name || d.of)}</span>
                            )}
                          </span>
                          <span className="md-door-say">
                            <span className="t-subtitle md-door-name">
                              {d.name || `No ${d.of}`}
                            </span>
                            <span className="t-caption md-door-facts">
                              <span className="md-figure">
                                {grouped(d.count)} {d.count === 1 ? d.of : d.ofMany}
                              </span>
                              {d.low ? (
                                <span className="md-figure">
                                  {d.low === d.high ? d.low : `${d.low}–${d.high}`}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : preview.length > 0 ? (
                  /* A FLAT TABLE HAS NO SERIES TO SHOW — Formosa declares
                     no grouping at all — so it keeps the row strip, which
                     is the right answer for a range that is simply a
                     list. */
                  <ul className="md-home-stock">
                    {preview.map((e) => (
                      <li key={`${e.tableId}:${e.rowId}`}>
                        <Row
                          dense
                          name={e.label}
                          meta={
                            <span className="md-meta">
                              {e.branch ? <span>{e.branch}</span> : null}
                              {e.price ? <span className="md-figure">{e.price}</span> : null}
                            </span>
                          }
                          onActivate={() => onOpen(e.tableId, e.rowId)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Card>
          </section>
        ) : null}

        {/* ---- the rail: what has happened here ------------- */}
        <div className="md-home-rail">
          {/* ---- the deals ------------------------------------- */}
          <section aria-label="Recent quotes">
            <Card tone="raised" pad="md">
              <div className="md-stack">
                <SectionHead
                  level="h3"
                  action={
                    recent.length > 0 && onQuotes ? (
                      <Button tone="ghost" size="sm" onClick={onQuotes}>
                        All {raised}
                      </Button>
                    ) : undefined
                  }
                >
                  Recent quotes
                </SectionHead>

                {recent.length === 0 ? (
                  /* THE EMPTY STATE OFFERS THE ACT rather than narrating
                     a route to it. */
                  <div className="md-hcard-none">
                    <p className="md-hcard-none-say">Nothing quoted from here yet.</p>
                    {onNewQuote ? (
                      <Button tone="primary" onClick={onNewQuote}>
                        Start a quote
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <ul className="md-hq-list">
                    {recent.map((q) => {
                      /* THE SUBJECT AS THE QUOTE FROZE IT — never
                         re-read from the sheet. A boat renamed since
                         is still the boat this was written for. */
                      const meta = (
                        <span className="md-meta">
                          <span>{q.customer.name.trim() || 'No customer yet'}</span>
                          <span className="md-figure">{money(quoteTotals(q).total)}</span>
                          <span className="md-figure">{localDay(q.createdAt)}</span>
                        </span>
                      )
                      return (
                        <li key={q.id}>
                          {onOpenQuote ? (
                            <Row
                              dense
                              name={q.subjectLabel}
                              meta={meta}
                              onActivate={() => onOpenQuote(q.id)}
                            />
                          ) : (
                            <Row dense name={q.subjectLabel} meta={meta} />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </Card>
          </section>

          {/* ---- what changed here ----------------------------- */}
          <section aria-label="Activity">
            <Card tone="raised" pad="md">
              <div className="md-stack">
                <SectionHead level="h3">Activity</SectionHead>
                {/* SCOPED TO THIS PLACE. Until today `Entry.moduleId` was
                    written by nothing at all, so this card could only
                    ever have been empty — see the note in activity.ts
                    about what the stamp claims and what it does not. */}
                {here.length === 0 ? (
                  <p className="md-hcard-none-say">{ACTIVITY_EMPTY_HERE}</p>
                ) : (
                  <div className="md-home-log">
                    <ActivityList orgSlug={orgSlug} moduleId={owner.id} limit={ACTIVITY_ROWS} />
                  </div>
                )}
              </div>
            </Card>
          </section>
        </div>
      </div>

      {/* ---- where else to go -------------------------------- */}
      {siblings.length > 1 || related.length > 0 ? (
        <div className="md-home-foot">
          {siblings.length > 1 ? (
            <section className="md-home-strip">
              <SectionHead level="h3">Also in {owner.name}</SectionHead>
              <ul className="md-home-chips">
                {siblings.map((t) => {
                  const at = t.id === (place ?? master?.id)
                  return (
                    <li key={t.id}>
                      {/* EVERY SIBLING IS A DOOR, including the one
                          you are standing in — pressing it changes
                          nothing, which is honest, and a chip that
                          stopped being pressable the moment it became
                          current would move under the pointer.

                          A CHIP, NOT A BUTTON. The layer has no chip
                          yet — a pill carrying a kind hue with an
                          `aria-current` — so this one stays local,
                          and is reported as the gap it is. */}
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
              <SectionHead level="h3">Goes with these</SectionHead>
              <ul className="md-home-links">
                {related.map((r) => (
                  <li className="md-home-link" key={r.tableId}>
                    <TableKindSymbol kind={kindOf(r.kind)} size={ICON_SIZE.tiny} />
                    <span className="md-home-link-name">{r.name}</span>
                    {/* "on 3 of 7" IS THE FACT, and it was drawn even
                        when it read "on 1 of 1" — a share of one is
                        not a share, it is a yes. */}
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

  /* WHAT THIS PLACE HAS OUT, added up. Every quote raised from here,
     at what it comes to — the one figure a person opening this tab is
     usually after, and it was the one thing the tab did not say. */
  const worth = raised.reduce((n, q) => n + quoteTotals(q).total, 0)

  return (
    <ul className="md-qs">
      <li className="md-qs-worth" role="presentation">
        <b className="md-qs-worth-n ds-mono">{money(worth)}</b>
        <span className="md-qs-worth-say">
          across {raised.length === 1 ? 'one quote' : `${grouped(raised.length)} quotes`}
        </span>
      </li>
      {raised.map((q) => {
        /* THE SUBJECT AS THE QUOTE FROZE IT. Never re-read from the
           sheet: a quote prints what it froze, and a boat renamed
           since is still the boat this was written for.

           THE STATE IS THE ONE LABEL ON THE LINE; the reference and
           the day are values a person reads back to somebody on the
           phone, so they are figures, not stamps. `quoteTotals` is
           the same reader the dashboard card and the board's cards
           take, so three surfaces cannot disagree about what a deal
           comes to. */
        const meta = (
          <span className="md-meta">
            <span className="mono-label">{q.state === 'issued' ? 'Given' : 'Draft'}</span>
            <span className="md-figure">{q.reference}</span>
            <span className="md-figure">{money(quoteTotals(q).total)}</span>
            <span className="md-figure">{localDay(q.createdAt)}</span>
          </span>
        )
        return (
          <li key={q.id}>
            {onOpenQuote ? (
              <Row
                name={q.subjectLabel}
                meta={meta}
                label={`Open the quote for ${q.subjectLabel}, ${q.reference}`}
                onActivate={() => onOpenQuote(q.id)}
              />
            ) : (
              /* A FACT THAT CANNOT BE OPENED IS BETTER THAN A CONTROL
                 THAT DOES NOTHING — the same shape the item rows take
                 when this place cannot open one. */
              <Row name={q.subjectLabel} meta={meta} />
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
        /* ONE CARD PER TABLE, IN THE TABLE'S OWN KIND. `<Card kind>`
           is the primitive's kind ground — the rail this card wore is
           the hue under the whole card now, at the mix card.css
           measured for a name on it.

           THE TABLE'S NAME IS NOT A CAPTION. It keeps its own case
           and the heading step, so it is not `<SectionHead>`, whose
           one style is the uppercase label — rule 3. */
        <Card tone="flat" pad="md" kind={kindOf(table.kind)} key={table.id}>
          <section className="md-stack" aria-label={table.name}>
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
                    <li key={l.key}>
                      <Row
                        name={l.label}
                        /* THE COLUMN IT IS, in the business's own words,
                           so a number can always be traced back. Mono,
                           because it is an identifier. */
                        meta={<span className="md-price-col">{column?.name ?? l.fieldId}</span>}
                        trail={
                          <>
                            <span className="md-price-scope mono-label">
                              {l.scope === 'quote' ? 'whole quote' : 'per line'}
                            </span>
                            {face && face.field.id === l.fieldId ? (
                              <span className="k-chip">On the face</span>
                            ) : null}
                          </>
                        }
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </Card>
      ))}

      {/* THE RULES THAT GOVERN IT — the same panel the designer
          mounts, so there is one drawing of a module's rules and not
          two that can drift. */}
      <ModuleRulesPanel module={module} tables={tables} />
    </div>
  )
}
