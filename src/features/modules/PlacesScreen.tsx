/* ============================================================
   EVERY PLACE (mo-) — SHOWROOM.

   THE STRUCTURE HERE WAS ALREADY RIGHT, which makes this the
   shortest of the rebuilds and worth saying out loud: photographic
   cards, filter chips that carry their own counts, a census in the
   head. What it did not have, measured at 1280x800 on the real seed:

     register        NONE      a catalogue of what you sell is
                               Showroom, and it never said so
     scale contrast  3.09x     against the >=6x §2 requires
     card wells      ragged    "Highfield Inflatables" wraps to two
                               lines and its photograph is shorter
                               than every other card's in the row

   THE THIRD ONE IS THE SAME FAULT THE PICKER HAD. A card sized by
   its own string makes its neighbours lie about how much room a
   picture gets — and the only thing that decided it was how long a
   brand's name happens to be. Two lines of name, one of census, and
   the well is a ratio.

   `doorPicture` IS THE ENGINE, unchanged: the biggest photograph
   any row of the place carries, a held copy before a hotlink,
   because taking the FIRST in row order gave the Boats door a grey
   close-up of a hull fitting and the Trailers door a wordmark.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { Field, Marque } from '@/ui'
import { FrozenPhoto } from '@/features/quote/photo'
import { doorPicture } from '@/features/dashboard/doors'
import { ICON_SIZE } from '@/lib/icons'
import { usePlaces } from '@/features/dashboard/usePlaces'
import { PlaceMark } from './PlaceMark'
import type { EntityDef, ImageRef } from '@/types/model'
import type { Place } from './places'
import { placeFilters, placesUnder } from './places'
import './places-screen.css'

export interface PlacesScreenProps {
  /** open one place — its own catalogue */
  onOpen: (moduleId: string) => void
  /** the place's settings, WITHOUT opening it on the way. Opening it
   *  first would swap this stage for the module's own window and
   *  take the request with it — `ModuleStage` carries that
   *  measurement. */
  onSettings: (moduleId: string) => void
  onNew: () => void
}

export function PlacesScreen({ onOpen, onSettings, onNew }: PlacesScreenProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const modules = useProjectStore((s) => s.modules)
  const places = usePlaces()
  const [chip, setChip] = useState('all')
  const [query, setQuery] = useState('')

  /* A PLACE HAS NO PICTURE OF ITS OWN, so it borrows the best one
     its own stock carries. Built once per place rather than per
     render: `doorPicture` walks every row of every table behind it,
     and Highfield alone is 604. */
  const covers = useMemo(() => {
    const found = new Map<string, ReturnType<typeof doorPicture>>()
    for (const p of places) {
      const module = modules[p.moduleId]
      const ids = p.tableId ? [p.tableId] : (module?.tableIds ?? [])
      found.set(p.key, doorPicture(ids, entities, rowsByEntity))
    }
    return found
  }, [places, modules, entities, rowsByEntity])

  const chips = useMemo(() => placeFilters(places), [places])
  const typed = query.trim().toLowerCase()
  const shown = useMemo(() => {
    const byChip = placesUnder(places, chip)
    if (typed === '') return byChip
    return byChip.filter((p) =>
      `${p.name} ${p.moduleName} ${p.typeLabel}`.toLowerCase().includes(typed),
    )
  }, [places, chip, typed])

  const rows = places.reduce((n, p) => n + p.census.items, 0)

  /* THE SHELVES. One band per kind that has anything in it, in the
     order the chips are in — which is `TABLE_KINDS`' own order, so
     the two can never disagree about what a kind is called or where
     it comes. `placeFilters` already resolves every kind present
     with its label and its count, and reusing it here is the reason
     a band head and its chip always say the same number. */
  const bands = useMemo(() => {
    const out: { kind: string; label: string; places: Place[] }[] = []
    for (const c of chips) {
      if (c.kind === undefined) continue
      const held = shown.filter((p) => p.kind === c.kind)
      if (held.length > 0) out.push({ kind: c.kind, label: c.label, places: held })
    }
    return out
  }, [chips, shown])

  return (
    <div className="mo" data-register="showroom">
      <div className="mo-port">
        <div className="mo-col">
          <header className="mo-head">
            <div className="mo-head-say">
              <Marque as="h1" className="t-marque mo-marque">Modules</Marque>
              <p className="t-small mo-sub">
                {places.length} {places.length === 1 ? 'place' : 'places'} ·{' '}
                {rows.toLocaleString('en-AU')} {rows === 1 ? 'row' : 'rows'} in them
              </p>
            </div>
            <div className="mo-head-do">
              <Field
                label="Find a place"
                value={query}
                onChange={setQuery}
                placeholder="Highfield, Yamaha, trailers…"
                type="search"
                autoComplete="off"
              />
              <button type="button" className="mo-new" onClick={onNew}>
                New module
              </button>
            </div>
          </header>

          {/* THE CHIPS CARRY THEIR OWN COUNTS, which is what makes a
              filter answerable before it is pressed. `placeFilters`
              resolves them and they are the same census the cards
              print, so the two can never disagree. */}
          <div className="mo-chips" role="group" aria-label="Narrow by what a place holds">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                className={c.key === chip ? 'mo-chip is-on' : 'mo-chip'}
                aria-pressed={c.key === chip}
                onClick={() => setChip(c.key)}
              >
                {c.label}
                <span className="mo-chip-n">{c.count}</span>
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="t-small mo-none">
              Nothing here matches “{query}”. Clear the search to see all {places.length} places.
            </p>
          ) : (
            bands.map((band) => (
              <section key={band.kind} className="mo-band" aria-label={band.label}>
                {/* ============================================================
                    THE SHELF HEAD, AND IT IS NOT THE CHIP SAID TWICE.

                    This screen drew one flat grid of twenty-five cards
                    with a row of filter chips over it, so the only way
                    to answer "how many brands of boat do I carry" was
                    to press a chip and count what was left. The kinds
                    are the shape of the business and they were being
                    held in a filter.

                    So the places stand on shelves, one band per kind,
                    in the order `TABLE_KINDS` declares — the same
                    grammar as the catalogue, the picker, a place and
                    the front door. The chips stay, because pressing
                    one is still the fastest way to see only motors;
                    what changes is that you no longer have to.
                    ============================================================ */}
                <p className="mo-band-head">
                  <span className="t-label mo-band-name">{band.label}</span>
                  <span className="t-label mo-band-count">
                    {band.places.length}{' '}
                    {band.places.length === 1 ? 'place' : 'places'}
                  </span>
                </p>
                <ul className="mo-grid">
                  {band.places.map((place) => (
                    <Tile
                      key={place.key}
                      place={place}
                      cover={covers.get(place.key)}
                  /* THE PLACE'S OWN MARK, which this screen had been
                     drawing initials in place of. `ModuleDef.logo`
                     is uploadable in module settings and
                     `brandLogos` carries a default per brand;
                     `PlaceMark` is the one implementation that
                     resolves the two and falls back to the KIND
                     rather than to letters. */
                      logo={modules[place.moduleId]?.logo}
                      master={
                        place.tableId
                          ? entities[place.tableId]
                          : entities[
                              modules[place.moduleId]?.tableIds.find((id) => entities[id]) ?? ''
                            ]
                      }
                      onOpen={() => onOpen(place.moduleId)}
                      onSettings={() => onSettings(place.moduleId)}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Tile({
  place,
  cover,
  logo,
  master,
  onOpen,
  onSettings,
}: {
  place: Place
  cover: ReturnType<typeof doorPicture>
  /** the module's own uploaded mark, if it has one */
  logo: ImageRef | undefined
  /** the table this card stands for, so the kind fallback is the
   *  right kind rather than a guess */
  master: EntityDef | undefined
  onOpen: () => void
  onSettings: () => void
}): ReactElement {
  return (
    <li className="mo-cell">
      <div className="mo-tile" data-kind={place.kind}>
        <button type="button" className="mo-face" data-press="card" onClick={onOpen}>
          <span className="mo-well">
            {/* ============================================================
                THE PLACE'S MARK, NOT ITS INITIALS — AND IT SITS ON
                THE PHOTOGRAPH RATHER THAN UNDER IT.

                This drew `markOf(place.name)` — "HI" over Highfield
                Inflatables, "PA" over Parts & Accessories — which is
                the exact thing `PlaceMark` exists to replace. Its
                own header says why: initials are a mark that says
                nothing the name beside it has not already said, while
                the kind symbol says what SORT of place this is.

                THE FIRST WIRING PUT IT UNDER THE PICTURE, where the
                plate goes, and every photographed brand covered it —
                which is to say it drew nothing on the twenty-two
                places that have a yard shot. The shipped dashboard
                had this right all along: over the photograph it
                steps into a chip on the app's own surface, because a
                wordmark laid straight onto a yard shot is a wordmark
                nobody can read; with no photograph behind it, it IS
                the face.
                ============================================================ */}
            <span className={cover ? 'mo-mark is-over' : 'mo-mark'}>
              <PlaceMark
                logo={logo}
                name={place.name}
                master={master}
                size={cover ? ICON_SIZE.medium : ICON_SIZE.large}
              />
            </span>
            <FrozenPhoto img={cover} fallbackAlt={place.name} className="mo-img" w={480} h={300} />
            <span className="k-rail mo-rail" aria-hidden="true" />
          </span>
          <span className="mo-say">
            <span className="t-title mo-name">{place.name}</span>
            <span className="t-caption mo-count">
              {/* THE DEALER'S OWN PLURAL, and what is held back said
                  in words rather than subtracted in silence. */}
              {place.retired
                ? 'no longer sold'
                : `${place.census.items.toLocaleString('en-AU')} ${place.census.noun}`}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="mo-set"
          onClick={onSettings}
          aria-label={`Settings for ${place.name}`}
        >
          Settings
        </button>
      </div>
    </li>
  )
}
