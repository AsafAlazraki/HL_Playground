/* ============================================================
   THE FRONT DOOR (fd-) — SHOWROOM.

   THE ROW THIS ANSWERS IS THE OWNER'S OWN WORDS, `BACKLOG.md:153`:
   "i saw the design of the new home dashboard. HATE IT", and "The
   bottom bar in that image is disgusting". The row asked the right
   question and never got an answer — is it the LAYOUT, the CONTENT
   or the FINISH? Measured at 1280x800 on the real seed, it is all
   three, and here is the evidence rather than the opinion:

     register            NONE      home is Showroom and never said so
     scale contrast      3.09x     against the >=6x §2 requires
     largest type        34px      a card title; the <h1> is 14px
     the greeting        14px      run together with the date and the
                                   row count as one undifferentiated
                                   line of small text
     the fourth card     no photo  an empty green field with a tag
                                   glyph, a quarter of the grid
     the fourth card     orphaned  three across, one alone beneath

   WHAT IS KEPT, AND IT IS EVERYTHING THAT DECIDES ANYTHING.
   `doorsOf` is the census, the one-module rule and the dealer's own
   plural; `doorPicture` is the argument about WHICH photograph
   (the biggest, held copy first, because the first in row order
   gave the Boats door a grey close-up of a hull fitting).
   `rollQuotes`, `resolveRecent`, `fileTally` and `greeting` are
   likewise untouched. None of that was the problem. What it was
   drawn as was.

   THE GREETING IS THE MARQUE, which is the whole of the type fix:
   there is nothing else on a front door big enough to carry a
   Showroom ramp, and a 34px card title over an 11px caption cannot
   reach 6x at any width.

   AND A KIND HUE IS A RAIL, NOT A WASH. The shipped cards are
   washed blue, cream, cream and green across their whole face —
   which is §3's "decoration keyed to a category" — while the thing
   that actually has the kind is the stock behind the door. The
   rail sits on the photograph of that stock.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { MagnifyingGlass, Plus, Receipt } from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { markOf } from '@/lib/mark'
import { PlaceMark } from '@/features/modules'
import { marqueOf } from '@/features/quote/marque'
import { useProjectStore } from '@/store/useProjectStore'
import { Button, Marque } from '@/ui'
import type { AppUser } from '@/features/auth/session'
import { FrozenPhoto } from '@/features/quote/photo'
import { useQuotes } from '@/features/quote/quotes'
import type { DashboardActs } from './acts'
import { doorPicture, doorsOf } from './doors'
import type { Door } from './doors'
import { money } from '@/lib/money'
import { quoteTotals } from '@/features/quote/totals'
import { usePlaces } from './usePlaces'
import { fileTally, greeting, resolveRecent, rollQuotes } from './cards'
import { useRecentPicks } from './useRecentPicks'
import './home-screen.css'

export interface HomeScreenProps extends DashboardActs {
  user: AppUser
}

/** The name a person is greeted by. Their own first name where they
 *  have one, and nothing at all where they do not — "Good morning,
 *  " with a trailing comma is worse than "Good morning". */
function firstNameOf(user: AppUser): string {
  const whole = (user.name ?? '').trim()
  if (whole === '') return ''
  return whole.split(/\s+/)[0] ?? ''
}

export function HomeScreen({ user, ...acts }: HomeScreenProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const modules = useProjectStore((s) => s.modules)
  const places = usePlaces()
  const quotes = useQuotes()
  const picks = useRecentPicks()

  /* THE CLOCK IS READ ONCE PER MOUNT, not per render. A greeting
     that changes word halfway through an afternoon because
     something else on the page re-rendered is a screen arguing with
     itself. */
  const [now] = useState(() => new Date())

  const doors = useMemo(
    () => doorsOf(places, modules, entities, rowsByEntity),
    [places, modules, entities, rowsByEntity],
  )
  const tally = useMemo(() => fileTally(entities, rowsByEntity), [entities, rowsByEntity])
  const roll = useMemo(() => rollQuotes(quotes, user.name ?? ''), [quotes, user])
  const recent = useMemo(
    () => resolveRecent(picks, entities, rowsByEntity),
    [picks, entities, rowsByEntity],
  )

  /* ============================================================
     THE BRANDS — PHOTOGRAPHED FIRST, THEN BY SIZE.

     Ranked by row count alone this band came back as Parts &
     Accessories, Dealer Fit Packages, Rigging Kits and Mackay
     Trailers: the four biggest tables on the sheet, four monograms
     in a row, and not one of the names a dealer would say out
     loud. A front door for a boat business that never shows a boat
     is ranking by the wrong fact.

     A PHOTOGRAPH IS THE FACT THAT MATTERS HERE. A place whose
     stock is photographed is a place that can be shown to a
     customer, which is what this band is for; the rest are one
     press away on Modules and the count beside the heading says
     so. Within each half it is still biggest-first, so the order
     is never arbitrary.

     Six, and not twenty-five: `doorPicture` walks every row of
     every table behind a place, and this screen is opened forty
     times a day. */
  const brands = useMemo(() => {
    const live = places.filter((p) => !p.retired && p.census.items > 0)
    const withCover = live.map((place) => {
      const module = modules[place.moduleId]
      const ids = place.tableId ? [place.tableId] : (module?.tableIds ?? [])
      return {
        place,
        cover: doorPicture(ids, entities, rowsByEntity),
        /* the brand's own mark and the table it stands for, so the
           band can draw what `PlaceMark` resolves rather than the
           two letters this screen had been settling for */
        logo: module?.logo,
        master: entities[ids.find((id) => entities[id]) ?? ''],
      }
    })
    return withCover
      .sort((a, b) => {
        const pic = Number(Boolean(b.cover)) - Number(Boolean(a.cover))
        return pic !== 0 ? pic : b.place.census.items - a.place.census.items
      })
      .slice(0, 6)
  }, [places, modules, entities, rowsByEntity])

  const name = firstNameOf(user)
  const day = now.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="fd" data-register="showroom">
      <div className="fd-port">
        <div className="fd-col">
          <header className="fd-head">
            {/* THE GREETING ARRIVES A WORD AT A TIME — §2 asks every
                Showroom screen for a choreographed entrance and this
                screen simply painted its heading. `Marque` is
                reactbits' Split Text ported native; it splits on
                WORDS, never glyphs, because §4 forbids a cut inside
                one and a per-letter animation is that cut made
                visible forty times. */}
            <Marque as="h1" className="t-hero fd-hello">
              {`${greeting(now)}${name === '' ? '' : `, ${name}`}`}
            </Marque>
            {/* THE DAY AND THE FILE, as two facts under the marque
                rather than three strings sharing one 14px line with
                the greeting. `fileTally` is the same census the rail
                counts from, so the two can never disagree. */}
            {/* "ROWS OF STOCK", AND THE WORDS MATTER. `fileTally`
                counts stock tables and leaves joins out, on purpose —
                folding them in inflates "what you sell" with pairs —
                so it reads 7,002 across 24 where the rail reads 53
                and the load toast reads 15,691 across 53. Three true
                figures, and a front door that prints one of them
                unqualified next to a rail printing another is a
                screen disagreeing with itself. */}
            <p className="t-small fd-day">
              {day} · {tally.rows.toLocaleString('en-AU')} rows of stock across {tally.tables}{' '}
              {tally.tables === 1 ? 'table' : 'tables'}
            </p>
          </header>

          <div className="fd-acts">
            <Button
              tone="primary"
              size="lg"
              glyph={<Plus size={ICON_SIZE.tiny} weight="bold" />}
              onClick={() => acts.onNewQuote()}
            >
              New quote
            </Button>
            <Button
              size="lg"
              glyph={<MagnifyingGlass size={ICON_SIZE.tiny} weight="light" />}
              onClick={acts.onFind}
            >
              Find anything
            </Button>
            <Button
              size="lg"
              glyph={<Receipt size={ICON_SIZE.tiny} weight="light" />}
              onClick={acts.onOpenQuotes}
            >
              Quotes
            </Button>
          </div>

          {doors.length > 0 ? (
            <section className="fd-band">
              <p className="fd-band-head">
                <span className="t-label fd-band-name">What you sell</span>
                <span className="t-caption fd-band-count">
                  {doors.length} {doors.length === 1 ? 'kind' : 'kinds'}
                </span>
              </p>
              <ul className="fd-grid">
                {doors.map((door) => (
                  <DoorTile key={door.kind} door={door} onOpen={acts.onOpenModule} />
                ))}
              </ul>
            </section>
          ) : null}

          {/* ============================================================
              THE BRANDS, WITH THEIR OWN STOCK'S PHOTOGRAPHY.

              The four kind doors above are the roll-up; this is what
              a dealer actually thinks in. Northside sells Highfield,
              Stabicraft, Stacer, Formosa, Jeanneau, Surtees — and a
              front door that never names one of them is a front door
              for a database rather than for a business.

              SIX, BY SIZE, because `doorPicture` walks every row of
              every table behind a place and twenty-five of those on
              a screen somebody opens forty times a day is a cost
              with nothing behind it. The rest are one press away and
              the band says so.
              ============================================================ */}
          {brands.length > 0 ? (
            <section className="fd-band">
              <p className="fd-band-head">
                <span className="t-label fd-band-name">Your brands</span>
                <button type="button" className="t-caption fd-more" onClick={acts.onOpenModules}>
                  All {places.length}
                </button>
              </p>
              <ul className="fd-brands">
                {brands.map((b) => (
                  <li key={b.place.key} className="fd-brand-cell">
                    <button
                      type="button"
                      className="fd-brand"
                      data-kind={b.place.kind}
                      data-press="card"
                      onClick={() => acts.onOpenModule(b.place.moduleId)}
                    >
                      {/* NO MATERIALISE ON A THUMBNAIL. It was here for
                          one build and it was wrong twice over: §5's
                          blur-and-scale is for the HERO — the one
                          picture a screen is about — and six of them
                          resolving at once is the scattered-effect
                          failure rather than a choreographed entrance.
                          It also meant a grid of blurs for the 620ms
                          before the photographs landed.

                          The plate is under every one, as it is in
                          every other grid in the app: three of the six
                          biggest places sell parts and rigging and
                          carry no photograph at all, and a lit well
                          with nothing in it is a coloured smear. */}
                      <span className="fd-brand-well">
                        {/* THE BRAND'S MARK, ON the photograph. This drew
                            `markOf` — "HI", "YO", "DT" — while the app
                            has had `ModuleDef.logo`, a per-brand default
                            table and one component to resolve them the
                            whole time. Over a yard shot it steps into a
                            chip on the app's own surface; with nothing
                            behind it, it is the face. */}
                        <span className={b.cover ? 'fd-brand-mark is-over' : 'fd-brand-mark'}>
                          <PlaceMark
                            logo={b.logo}
                            name={b.place.name}
                            master={b.master}
                            size={ICON_SIZE.medium}
                          />
                        </span>
                        <FrozenPhoto
                          img={b.cover}
                          fallbackAlt={b.place.name}
                          className="fd-brand-img"
                          w={360}
                          h={225}
                        />
                      </span>
                      <span className="fd-brand-say">
                        <span className="t-heading fd-brand-name">{b.place.name}</span>
                        <span className="t-caption fd-brand-n">
                          {b.place.census.items.toLocaleString('en-AU')} {b.place.census.noun}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="fd-panes">
            {/* ============================================================
                TWO PANELS, AND EACH SAYS WHAT IT HOLDS OR WHY IT IS
                EMPTY. The shipped pair read "NO QUOTES YET" and
                "NOTHING OPENED YET" over a third of the screen — an
                empty state drawn at the size of a full one. They are
                the same width as each other and no taller than what
                is in them.
                ============================================================ */}
            <section className="fd-pane">
              <p className="fd-band-head">
                <span className="t-label fd-band-name">Quotes</span>
                {quotes.length > 0 ? (
                  <button type="button" className="t-caption fd-more" onClick={acts.onOpenQuotes}>
                    All {quotes.length}
                  </button>
                ) : null}
              </p>
              {roll.mine.length === 0 ? (
                <p className="t-small fd-empty">
                  A quote is what a customer is handed — the boat, what goes with it, and the price.
                  You have {places.length} {places.length === 1 ? 'place' : 'places'} to raise one
                  from.
                </p>
              ) : (
                /* ============================================================
                   A QUOTE CARRIES A PHOTOGRAPH OF ITS OWN BOAT, frozen
                   onto it at `freeze` time, and this list drew none of
                   them — a row of grey text for a document whose whole
                   subject is a picture. `subjectImage` is on every
                   quote and costs nothing to draw.

                   AND THE FIGURE IS THE ONE THE DOCUMENT PRINTS.
                   `quoteTotals` reads the quote's own frozen lines, so
                   the card and the page it opens cannot disagree.
                   ============================================================ */
                <ul className="fd-quotes">
                  {roll.mine.slice(0, 3).map((q) => {
                    const lockup = marqueOf(q.subjectLabel)
                    const totals = quoteTotals(q)
                    return (
                      <li key={q.id}>
                        <button
                          type="button"
                          className="fd-quote"
                          data-press="card"
                          onClick={() => acts.onOpenQuote(q.id)}
                        >
                          <span className="fd-quote-well">
                            <FrozenPhoto
                              img={q.subjectImage}
                              fallbackAlt={q.subjectLabel}
                              className="fd-quote-img"
                              w={160}
                              h={100}
                            />
                          </span>
                          <span className="fd-quote-say">
                            <span className="t-heading fd-quote-name">
                              {lockup.model || q.subjectLabel}
                            </span>
                            <span className="t-caption fd-quote-who">
                              {q.customer.name.trim() === ''
                                ? 'nobody yet'
                                : q.customer.name}
                              {' · '}
                              {q.state === 'issued' ? 'given to the customer' : 'draft'}
                            </span>
                          </span>
                          <span className="t-small fd-quote-sum">{money(totals.total)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="fd-pane">
              <p className="fd-band-head">
                <span className="t-label fd-band-name">Where you have been</span>
              </p>
              {recent.length === 0 ? (
                <p className="t-small fd-empty">
                  What you open shows up here. There {tally.tables === 1 ? 'is' : 'are'}{' '}
                  {tally.tables} {tally.tables === 1 ? 'table' : 'tables'} on the sheet.
                </p>
              ) : (
                <ul className="fd-rows">
                  {recent.slice(0, 4).map((r) => (
                    <li key={r.key}>
                      <button
                        type="button"
                        className="fd-row"
                        onClick={() => acts.onOpenTable(r.entityId)}
                      >
                        <span className="t-heading fd-row-name">{r.title}</span>
                        <span className="t-caption fd-row-say">{r.under}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function DoorTile({
  door,
  onOpen,
}: {
  door: Door
  onOpen: (moduleId: string) => void
}): ReactElement {
  return (
    <li className="fd-cell">
      <button
        type="button"
        className="fd-tile"
        data-kind={door.kind}
        data-press="card"
        onClick={() => onOpen(door.moduleId)}
      >
        <span className="fd-well">
          {/* The plate is under every tile and the photograph covers
              it. Accessories carries no picture on this sheet, and an
              empty well on a quarter of the grid reads as a screen
              that failed to load. */}
          <span className="fd-plate" aria-hidden="true">
            <span className="t-display fd-mono">{markOf(door.label)}</span>
          </span>
          <FrozenPhoto
            img={door.picture}
            fallbackAlt={door.label}
            className="fd-img"
            w={420}
            h={264}
          />
        </span>
        <span className="fd-say">
          <span className="t-title fd-name">{door.label}</span>
          {/* THE DEALER'S OWN PLURAL — "810 boats", "2,860
              accessories" — which `doorsOf` resolves and refuses to
              pick when two places disagree. */}
          <span className="t-caption fd-count">
            {door.items.toLocaleString('en-AU')} {door.noun}
          </span>
        </span>
      </button>
    </li>
  )
}
