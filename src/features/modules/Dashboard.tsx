/* ============================================================
   THE MODULES GRID — the entrance.

   ── WHAT PHASE TWO CHANGED HERE, AND THE MEASUREMENT BEHIND IT ──

   1 · IT DREW THE WRONG THING. Nine cards named Boats, Motors,
   Factory Packages, Trailers… each saying "Highfield Inflatables
   + 6 more". Those are categories; the places a dealer opens are
   Highfield, Yamaha, Stacer, Dunbier, GFAB, ePropulsion, Jeanneau,
   Stabicraft, REDCO, Mackay, Surtees, Formosa, NSM Custom, Haines
   — and every one of them was behind a card that named a sibling
   and counted the rest. `places.ts` is that correction, and the
   rule it applies is one line: a module holding one table is one
   place; a module holding more is one place per table.

   2 · THE PROSE. Measured at 1600x1000, 420 words on this screen
   of which 219 — 52% — were the app narrating itself: a paragraph
   under the hero explaining that you press a card to open it, and
   nine module descriptions averaging 21 words each. The budget is
   a name and ONE fact per card, a stage name and at most one line,
   and a sentence wherever something is refused. So: the hero keeps
   its name and loses its paragraph, the card keeps its count and
   loses its description, and the only sentences left on the screen
   are the empty state's and the refusals'.

   Every one of those descriptions is still written, still stored
   and still edited in the module's own Settings — the explanation
   moved to where it is needed rather than being deleted.

   3 · THE COUNTED STRIP IS GONE. "9 Places · 6,074 Things in them
   · 24 Tables in use" sat in the strongest position on the page,
   in the largest figures on it, and said the application is proud
   of its schema. Nobody selling a boat needs to know how many
   tables are in use. A count belongs on the thing it counts, and
   every card carries its own.

   4 · THE PAGE DOES NOT SCROLL. An overview you have to scroll is
   a list. The header is fixed, the GRID scrolls inside its own box,
   and the cards size to the height they are given — `1fr` rows
   inside a definite height, so fewer places means bigger cards and
   more places means the grid scrolls, never the page.

   5 · COLOUR. The kind hue is a full-height rail and the type is a
   chip in the same hue — the amendment DESIGN_PRINCIPLES §1 now
   carries. A hue only ever appears on something that HAS that
   kind, and no figure on this screen is a hue.

   6 · THE LOGO IS THE FACE. `ModuleDef.logo` and `logo.ts` have
   shipped since the module system landed — the 512px edge, the
   96KB keep, the 32MB refusal, the fallback for a mark that cannot
   be drawn — and nothing has ever shown one. It is the face of a
   card, with the photograph behind it where the table has one and
   the kind's own mark where it has neither.

   7 · NEW MODULE IS A CARD. Creating a place and opening one are
   the same gesture, in the same grid, at the same size.

   WHAT DID NOT CHANGE. `Access & roles` is still the rail's
   destination and still stands here. Reordering is still a fact
   about MODULES rather than about the brands inside them, so its
   arrows are drawn once per module — on the first card of its run,
   named for the module they move.
   ============================================================ */

import type { CSSProperties, ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { CaretLeft, CaretRight, Lock, Plus, ShieldCheck } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  canBeModuleMaster,
  isRetired,
  type EntityDef,
  type ImageRef,
  type ModuleDef,
} from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
/* THE ONE ANSWER ABOUT WHETHER A PICTURE MAY BE PAINTED. A module's
   logo is an address like every other picture in the app, and this is
   the module that decides — per host, once — whether an address may
   be requested at all. */
import { noteImageFailed, noteImageLoaded, useImageDisplay } from '@/lib/imageSources'
/* THE SAME PICTURE RESOLVER THE FRONT DOOR USES. It answers only for
   addresses this repository ships a copy of, and returns null rather
   than substituting anything. */
import { coverPhoto, type CoverPhoto } from '@/features/table/coverPhoto'
import { ICON_SIZE } from '@/lib/icons'
import { accessReading, type AccessReading } from './read'
import { AccessScreen } from './AccessScreen'
import { reorderPlan } from './designer'
import { placeFilters, placesOf, placesUnder, type Place } from './places'
import { rememberPlace } from './openPlace'
import { PlaceMark } from './PlaceMark'
import './modules.css'

export interface DashboardProps {
  /**
   * Open a place.
   *
   * THE SECOND ARGUMENT IS THE SEAM. A card names a TABLE inside a
   * module — Highfield inside Boats — and a workspace that opened at
   * the module would put "Boats" above a card that said "Highfield".
   * A host that carries the fact should pass it straight through to
   * `ModuleIndex`'s `place`; one that does not still gets the right
   * screen, because the grid also tells the feature which door it
   * was (see `openPlace.ts`, which says exactly what that is and is
   * not).
   */
  onOpen: (moduleId: string, tableId?: string) => void
  /** put the create panel up */
  onNew: () => void
  /**
   * Open this module's settings.
   *
   * NO LONGER DRAWN ON A CARD — a module's set-up is a TAB inside it
   * now, beside its stock and its pricing, which is where a person
   * looking for it goes. It is still the route the access screen
   * hands out, so a job holding a grant is one press from the place
   * that granted it.
   */
  onSettings?: (moduleId: string) => void
}

const grouped = (n: number): string => n.toLocaleString('en-AU')

export function Dashboard({ onOpen, onNew, onSettings }: DashboardProps): ReactElement {
  const org = useProjectStore((s) => s.meta.org)
  const projectName = useProjectStore((s) => s.meta.name)
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const modules = useProjectStore((s) => s.modules)
  const updateModule = useProjectStore((s) => s.updateModule)

  /* THE BUSINESS'S NAME WHERE WE HAVE IT, AND THE SHEET'S OTHERWISE —
     and the eyebrow says which. Calling a document "your business" at
     the hero step is a small lie told in the largest type on the page. */
  const business = org?.name?.trim() ?? ''
  const name = business === '' ? projectName : business
  const tableCount = Object.keys(entities).length

  const [ordering, setOrdering] = useState(false)
  const [surface, setSurface] = useState<'places' | 'access'>('places')
  const [filter, setFilter] = useState('all')

  /* ONE READ PER CARD, ONCE. The census and the photograph were both
     resolved inline in the render, so every keystroke anywhere in the
     shell re-counted 15,691 rows nine times over. */
  const places = useMemo(
    () => placesOf(modules, entities, rowsByEntity),
    [modules, entities, rowsByEntity],
  )

  const chips = useMemo(() => placeFilters(places), [places])

  /* A CHIP THAT NO LONGER EXISTS ADMITS EVERYTHING. Deleting the last
     trailer while the Trailers chip is on would otherwise leave an
     empty grid under a chip nobody could see was still pressed. */
  const live = chips.some((c) => c.key === filter) ? filter : 'all'
  const shown = useMemo(() => placesUnder(places, live), [places, live])

  const deck = useMemo(
    () =>
      shown.map((place) => {
        const module = modules[place.moduleId]
        /* the table this card stands for, or the module's primary —
           the one whose photograph and kind mark the card wears */
        const master = place.tableId
          ? entities[place.tableId]
          : module
            ? entities[module.tableIds.find((id) => entities[id]) ?? '']
            : undefined
        return {
          place,
          module,
          master,
          cover: master ? coverPhoto(master, rowsByEntity[master.id]) : null,
        }
      }),
    [shown, modules, entities, rowsByEntity],
  )

  /* ============================================================
     THE ONE ACTION HAD TO BE POSSIBLE BEFORE IT WAS OFFERED.

     On a cleared install this page offered NEW MODULE — and the panel
     behind that button answers "There are no tables to make a module
     from yet". So the empty state's single action opened a second
     empty state. A module is ABOUT a table; with no tables there is
     nothing for it to be about, and the card says so where it is
     refused rather than in a tooltip.
     ============================================================ */
  const canMakeModule = tableCount > 0

  /* HOW MANY TABLES ARE NOT IN A PLACE YET — the one figure the cards
     cannot carry, because it is about what is NOT on this screen. It
     is a sentence under the grid, not a plate at the top of it, and
     only when it is true of something. */
  const spare = useMemo(() => {
    const covered = new Set<string>()
    for (const m of Object.values(modules)) for (const id of m.tableIds) covered.add(id)
    const placeable = Object.values(entities).filter(
      (e) => canBeModuleMaster(e) && !isRetired(e) && !covered.has(e.id),
    )
    return placeable.length
  }, [modules, entities])

  /* THE MODULES IN THE ORDER THEY ARE DRAWN IN — which is what
     `reorderPlan` works against, and which is NOT the order of the
     grid: a filter shows five of twenty-six cards and the first one
     visible is not necessarily the first module. An "earlier" refused
     on the wrong card, or offered on a card that cannot move, is a
     control that lies about what it will do. */
  const order = useMemo(
    () =>
      Object.values(modules).sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name),
      ),
    [modules],
  )
  const firstModule = order[0]?.id
  const lastModule = order[order.length - 1]?.id

  const move = (id: string, dir: -1 | 1): void => {
    for (const at of reorderPlan(order, id, dir)) updateModule(at.id, { order: at.order })
  }

  const moduleCount = Object.keys(modules).length

  /* ONE SURFACE AT A TIME. The access screen REPLACES the grid rather
     than growing under it. */
  if (surface === 'access') {
    return <AccessScreen onPlaces={() => setSurface('places')} onSettings={onSettings} />
  }

  return (
    <div className="md-dash">
      {/* THE ATMOSPHERE, AND IT CARRIES NOTHING. Removed outright under
          `prefers-reduced-transparency` and `prefers-contrast: more`. */}
      <div className="ds-aurora ds-grain md-dash-sky" aria-hidden="true" />

      <header className="md-dash-mast">
        <div className="md-dash-say">
          <span className="mono-label md-dash-eyebrow">
            {business === '' ? 'This sheet' : 'Your business'}
          </span>
          {/* THE ONE BIG THING ON THE SCREEN. Nothing else here is
              above the heading step, which is what makes it a
              hierarchy rather than seven sizes. */}
          <h1 className="ds-hero md-dash-org">{name}</h1>
        </div>

        <div className="md-dash-acts">
          {/* THE DOOR THE RAIL PROMISES. Drawn whether or not there
              are places: the screen behind it says honestly that
              access is granted in a place when there are none yet. */}
          <button type="button" className="btn md-access" onClick={() => setSurface('access')}>
            <ShieldCheck size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
            Access &amp; roles
          </button>

          {moduleCount > 1 ? (
            <button
              type="button"
              className={`btn md-order${ordering ? ' is-on' : ''}`}
              aria-pressed={ordering}
              onClick={() => setOrdering((v) => !v)}
            >
              {ordering ? 'Done' : 'Reorder'}
            </button>
          ) : null}
        </div>
      </header>

      {/* FILTER BY TYPE. Every chip is a kind that is really present,
          in TABLE_KINDS' own order, carrying its own count and — when
          it is on — its own hue. `.k-filter` is the system's, so this
          chip and a chip anywhere else in the app are one control. */}
      {chips.length > 2 ? (
        <div className="md-filters" role="group" aria-label="Show one type of place">
          <ul className="md-filter-row">
            {chips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  className="k-filter md-filter"
                  data-kind={chip.kind}
                  aria-pressed={live === chip.key}
                  onClick={() => setFilter(chip.key)}
                >
                  {chip.label}
                  <span className="md-filter-n">{chip.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {moduleCount === 0 ? (
        /* THE EMPTY STATE KEEPS ITS SENTENCE AND ITS ACT — the one
           place on this screen prose earns its space. */
        <div className="md-empty">
          <span className="mono-label md-empty-eyebrow">Nothing here yet</span>
          <p className="md-empty-say">
            A module is a place in your business — the boats you sell, the trailers, the
            quotes you have raised. You pick the table it is about and give it a name.
          </p>
          <p className="md-empty-count">
            You have{' '}
            <strong>
              {tableCount} {tableCount === 1 ? 'table' : 'tables'}
            </strong>{' '}
            and no modules.
          </p>
          <button
            type="button"
            className="btn btn-primary md-empty-do"
            onClick={onNew}
            disabled={!canMakeModule}
            aria-describedby={canMakeModule ? undefined : 'md-dash-why'}
          >
            <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
            New module
          </button>
          {canMakeModule ? null : (
            <p className="md-empty-why" id="md-dash-why">
              A module is about a table, and there are none yet. Start one from{' '}
              <em>New table</em> on the bar, or load your price file from <em>Home</em>.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* THE GRID SCROLLS, THE PAGE NEVER DOES. `1fr` rows inside a
              definite height, so the cards grow when there are few and
              the box — not the document — scrolls when there are many. */}
          <ul className="md-grid">
            {deck.map((seat, i) => (
              <PlaceCard
                key={seat.place.key}
                place={seat.place}
                module={seat.module}
                master={seat.master}
                cover={seat.cover}
                onOpen={onOpen}
                ordering={ordering}
                first={seat.place.moduleId === firstModule}
                last={seat.place.moduleId === lastModule}
                onMove={move}
                index={i}
              />
            ))}

            {/* NEW MODULE IS A CARD IN THE GRID. Creating a place and
                opening one are the same gesture at the same size. */}
            <li className="md-grid-slot">
              <button
                type="button"
                className="md-place md-place--new"
                style={{ '--i': deck.length } as CSSProperties}
                onClick={() => {
                  if (canMakeModule) onNew()
                }}
                aria-disabled={canMakeModule ? undefined : true}
                aria-describedby={canMakeModule ? undefined : 'md-grid-why'}
              >
                <span className="md-place-face md-place-face--new">
                  <Plus size={ICON_SIZE.medium} weight="light" aria-hidden="true" />
                </span>
                <span className="md-place-name">New module</span>
                {canMakeModule ? null : (
                  <span className="md-place-refused" id="md-grid-why">
                    A module is about a table, and there are none yet.
                  </span>
                )}
              </button>
            </li>
          </ul>

          {/* THE ONE FIGURE THE CARDS CANNOT CARRY, because it is about
              what is NOT on this screen — and only while it is true. */}
          {spare > 0 ? (
            <p className="md-dash-spare">
              {spare} {spare === 1 ? 'table is' : 'tables are'} not in a place yet.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- */

interface PlaceCardProps {
  place: Place
  /** the module this place belongs to — always present, because a
   *  place is derived from one */
  module: ModuleDef | undefined
  /** the table the card stands for, and whose photograph it wears */
  master: EntityDef | undefined
  cover: CoverPhoto | null
  onOpen: (moduleId: string, tableId?: string) => void
  ordering: boolean
  /** the ends of the module ORDER, where one of the two moves is
   *  refused. Not the ends of the grid: a filter can show any five of
   *  twenty-six cards, and a control refused because of where a card
   *  happens to sit under a filter would be refusing the wrong thing. */
  first: boolean
  last: boolean
  onMove: (moduleId: string, dir: -1 | 1) => void
  index: number
}

function PlaceCard({
  place,
  module,
  master,
  cover,
  onOpen,
  ordering,
  first,
  last,
  onMove,
  index,
}: PlaceCardProps): ReactElement {
  /* Absent access reads as unrestricted, which is what every module
     in this project is today: the card then says nothing whatever
     about access. A module that has gone from under a place cannot
     be restricted either, so the same reading serves both. */
  const access: AccessReading | undefined = module ? accessReading(module) : undefined
  const restricted = access?.restricted === true
  const style = { '--i': index } as CSSProperties

  /* ONE FACT. What is in here, counted, in the dealer's own noun —
     and for a table that is history rather than stock, the fact is
     that it is history. */
  const fact = place.retired
    ? 'No longer sold'
    : `${grouped(place.census.items)} ${place.census.noun}`

  const label = restricted && access
    ? `Open ${place.name} — ${fact}. ${access.hint}`
    : `Open ${place.name} — ${fact}`

  return (
    <li className="md-grid-slot">
      <button
        type="button"
        /* THE KIND CARRIES THE RAIL, unless the place is held back —
           in which case the state does, because "no longer sold" is
           the more important fact about it and two rails on one edge
           is one rail too many. */
        className={`md-place ds-rise${place.retired ? ' s-held' : ' k-rail-thick k-lift'}`}
        data-kind={place.retired ? undefined : place.kind}
        style={style}
        aria-label={label}
        onClick={() => {
          /* THE SEAM, BOTH WAYS. Told to the host, and remembered for
             a host that cannot carry it yet. */
          rememberPlace(place.moduleId, place.tableId)
          onOpen(place.moduleId, place.tableId)
        }}
      >
        <span className="md-place-face">
          {cover ? (
            <img
              className="md-place-shot"
              src={cover.at}
              alt=""
              width={cover.w}
              height={cover.h}
              /* THE FIRST ROW IS NOT LAZY. This is a landing surface
                 and the top row is above the fold at every width. */
              loading={index < 6 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          ) : null}
          <span className={`md-place-mark${cover ? ' is-over' : ''}`}>
            <PlaceMark
              logo={module?.logo}
              name={place.name}
              master={master}
              size={cover === null ? ICON_SIZE.large : ICON_SIZE.medium}
            />
          </span>
        </span>

        <span className="md-place-body">
          <span className="md-place-name">{place.name}</span>
          <span className="md-place-fact">
            {place.retired ? (
              <span className="md-place-held">{fact}</span>
            ) : (
              <>
                <b className="md-place-n">{grouped(place.census.items)}</b>
                <span className="md-place-noun">{place.census.noun}</span>
              </>
            )}
          </span>
        </span>

        <span className="md-place-foot">
          {/* THE TYPE, IN ITS OWN HUE. `.k-chip` is the system's, so
              a boat is the same colour here as anywhere else. */}
          <span className="k-chip md-place-type">{place.typeLabel}</span>
          {restricted && access ? (
            <span className="md-place-shut" title={access.hint}>
              <Lock size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              {access.say}
            </span>
          ) : null}
        </span>
      </button>

      {/* REORDERING IS A FACT ABOUT MODULES, NOT ABOUT THE BRANDS
          INSIDE THEM — the seven Highfield-to-Haines cards are one
          module's run and move together. So the arrows are drawn once
          per run, on the card that leads it, and they name the module
          they move rather than the card they sit on. */}
      {ordering && place.leads && module ? (
        <span className="md-place-order">
          <button
            type="button"
            className="md-place-move"
            aria-label={`Move ${place.moduleName} earlier`}
            title={first ? `${place.moduleName} is already first` : `Move ${place.moduleName} earlier`}
            aria-disabled={first || undefined}
            onClick={() => {
              if (!first) onMove(place.moduleId, -1)
            }}
          >
            <CaretLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="md-place-move"
            aria-label={`Move ${place.moduleName} later`}
            title={last ? `${place.moduleName} is already last` : `Move ${place.moduleName} later`}
            aria-disabled={last || undefined}
            onClick={() => {
              if (!last) onMove(place.moduleId, 1)
            }}
          >
            <CaretRight size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          </button>
        </span>
      ) : null}
    </li>
  )
}

/* ---------------------------------------------------------- */

