/* ============================================================
   WHAT ARE YOU QUOTING — the first Showroom screen.

   It is the first thing a dealer sees when they start work, and
   the screen it replaces failed the register on three counts,
   measured at 1280x800 on the real seed:

     scale contrast   3.68x   against the >=6x §2 requires
     type steps       4       the ramp's middle unused again
     card heights     72 · 108 · 134 · 144 · 170 · 207
     photographs      0

   SIX CARD HEIGHTS IS THE TELL. Every card was sized by its own
   text, so a two-line brand name made its whole row taller and a
   one-line name left a hole under it. A row of things to choose
   between should read as a row of things to choose between.

   AND ZERO PHOTOGRAPHS, on the opening screen of a business that
   sells boats. `godly-and-what-transfers.md` records the picker as
   already drawing "the row's own photograph" — that is true of the
   SECOND screen, once a place is open. The place cards themselves
   were type on a tint.

   THE HUE IS THE KIND, NOT A CATEGORY COLOUR. The old cards were
   washed blue, cream and pink by the module they sat under, which
   is decoration keyed to a heading. `QuoteDoor.kind` is the thing
   itself — boat, motor, trailer, package — and §3 is explicit: a
   hue only ever appears on something that HAS that kind.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { Field } from '@/ui'
import { markOf } from '@/lib/mark'
import { useProjectStore } from '@/store/useProjectStore'
import { buildEntries } from '@/features/modules/read'
import type { IndexEntry } from '@/features/modules/read'
import { quoteDoors } from './start'
import type { QuoteDoor } from './start'
import { marqueOf } from './marque'
import { FrozenPhoto } from './photo'
import './picker-screen.css'

export interface PickerScreenProps {
  /** open a place — the second screen, which already draws rows
   *  with their own photographs. */
  onOpen: (door: QuoteDoor) => void
  onClose?: () => void
}

export function PickerScreen({ onOpen, onClose }: PickerScreenProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const modules = useProjectStore((s) => s.modules)
  const [query, setQuery] = useState('')

  const doors = useMemo(
    () => quoteDoors(modules, entities, rowsByEntity),
    [modules, entities, rowsByEntity],
  )

  /* A PLACE HAS NO PICTURE OF ITS OWN, so it borrows the first one
     its own stock carries. That is not a guess about the business —
     it is a photograph of something the place actually holds, which
     is what a showroom floor is.

     Built once per door rather than per render: `buildEntries` walks
     every row of every table the door stands for, and Highfield
     alone is hundreds. */
  const covers = useMemo(() => {
    const found = new Map<string, IndexEntry['img']>()
    for (const door of doors) {
      const entries = buildEntries(door.tables, rowsByEntity, { facts: false })
      found.set(door.key, entries.find((e) => e.img)?.img)
    }
    return found
  }, [doors, rowsByEntity])

  const hunting = query.trim().length > 0
  const shown = hunting
    ? doors.filter((d) =>
        `${d.name} ${d.moduleName} ${d.description}`.toLowerCase().includes(query.toLowerCase()),
      )
    : doors

  /* ============================================================
     A PLACE YOU CANNOT QUOTE FROM IS NOT A CARD.

     Seven of the twenty-five refuse, and their reasons are two
     sentences long — "Parts & Accessories is for browse, search and
     open one. Turn Quote on in its settings and anything in it can
     start one." The first draft put that in the card's own text
     block, which forced a choice between clipping the reason to one
     line (rule 10 broken silently) and giving every card in the app
     four lines it does not need.

     Neither. A photographic card at 320px is an offer, and five of
     the nine modules cannot make one — drawing them as offers and
     then refusing the click is the shape the UX audit calls a dead
     control. They go under the grid as rows, named, with the whole
     reason and the way to change it. The grid above is then, all of
     it, places a quote can actually start.

     THE GROUPS ARE THE BUSINESS'S OWN MODULES, in its own order.
     ============================================================ */
  const { groups, closed } = useMemo(() => {
    const by = new Map<string, QuoteDoor[]>()
    const shut: QuoteDoor[] = []
    for (const d of shown) {
      if (d.refusal !== '') {
        shut.push(d)
        continue
      }
      by.set(d.moduleName, [...(by.get(d.moduleName) ?? []), d])
    }
    return { groups: [...by.entries()], closed: shut }
  }, [shown])

  const openTotal = doors.filter((d) => d.refusal === '').length

  /* THE SCREEN OWNS ITS OWN SCROLLPORT, and that is not a style
     choice — `.shell-stage` is `overflow: hidden` and hands every
     stage a box of exactly the window's height (shell.css). A screen
     that does not scroll inside itself simply has its lower half cut
     off: measured here at scrollHeight 3,936 in a clientHeight of
     800, with four of the five module groups and every refusal below
     the cut and no way to reach them. `.qp` is the port and
     `.qp-col` is the column inside it, so the scrollbar rides the
     window edge and the measure still centres. */
  return (
    <div className="qp" data-register="showroom">
      <div className="qp-col">
        <header className="qp-head">
          <div className="qp-head-say">
            <h1 className="t-marque qp-ask">What are you quoting?</h1>
            <p className="t-small qp-sub">
              {openTotal} {openTotal === 1 ? 'place' : 'places'} you can start from.
            </p>
          </div>
          <div className="qp-head-do">
            <Field
              label="Find a place"
              value={query}
              onChange={setQuery}
              placeholder="Highfield, Yamaha, trailers…"
              type="search"
              autoComplete="off"
            />
            {onClose ? (
              <button type="button" className="qp-shut" onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path
                    d="M4 4 L12 12 M12 4 L4 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            ) : null}
          </div>
        </header>

        {groups.length === 0 && closed.length === 0 ? (
          <p className="t-small qp-none">
            Nothing here matches “{query}”. Clear the search to see all {doors.length} places.
          </p>
        ) : null}

        {groups.map(([moduleName, inGroup]) => (
          <section className="qp-group" key={moduleName}>
            <p className="qp-group-head">
              <span className="t-label qp-group-name">{moduleName}</span>
              <span className="t-caption qp-group-count">
                {inGroup.length} {inGroup.length === 1 ? 'place' : 'places'}
              </span>
            </p>

            <ul className="qp-grid">
              {inGroup.map((door) => (
                <DoorCard
                  key={door.key}
                  door={door}
                  cover={covers.get(door.key)}
                  onOpen={() => onOpen(door)}
                />
              ))}
            </ul>
          </section>
        ))}

        {/* THE PLACES THAT CANNOT START ONE, under the ones that can,
          each with the whole reason and the setting that changes it.
          Rows rather than cards: a row is a fact about the business,
          a card is an offer, and these are not offering anything. */}
        {closed.length > 0 ? (
          <section className="qp-group">
            <p className="qp-group-head">
              <span className="t-label qp-group-name">Not set up to quote</span>
              <span className="t-caption qp-group-count">
                {closed.length} {closed.length === 1 ? 'place' : 'places'}
              </span>
            </p>

            <ul className="qp-offs">
              {closed.map((door) => (
                <li className="qp-off" key={door.key} data-kind={door.kind}>
                  <span className="k-rail qp-off-rail" aria-hidden="true" />
                  <span className="qp-off-say">
                    <span className="t-heading qp-off-name">{door.name}</span>
                    <span className="t-small qp-off-why">{door.refusal}</span>
                  </span>
                  <span className="t-caption qp-off-count">{door.say}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}

function DoorCard({
  door,
  cover,
  onOpen,
}: {
  door: QuoteDoor
  cover: IndexEntry['img']
  onOpen: () => void
}): ReactElement {
  /* A brand name is a name, not an identifier, so the lockup mostly
     passes it through — but `Haines Signature Factory Packages` is
     four facts welded together like a subject label, and splitting
     it is what stops a card being three lines of display type. */
  const lockup = marqueOf(door.name)

  return (
    <li className="qp-cell">
      <button
        type="button"
        className="qp-card"
        data-kind={door.kind}
        data-press="card"
        onClick={onOpen}
      >
        <span className="qp-well">
          {/* ============================================================
              THE PLATE IS ALWAYS DRAWN, AND THE PHOTOGRAPH COVERS IT.

              Four of the eighteen places hold no photographed stock —
              trailers, rigging — and three more hold a picture whose
              HOST `imageSources` has already refused, so `FrozenPhoto`
              correctly returns null. An empty well on a quarter of the
              grid reads as a screen that failed to load.

              Asking a second time which of those two it is would be a
              second verdict that can disagree with the first. Instead
              the plate is underneath every card and the photograph is
              opaque on top of it: whatever paints, paints. On the
              plate is the place's own initials over its own kind's
              tint — the name and the kind, which is everything the app
              knows about a place with no picture. It is decorative
              (the name is in full directly below), so it is hidden
              from the reader that would otherwise say it twice.
              ============================================================ */}
          <span className="qp-plate" aria-hidden="true">
            <span className="t-display qp-mono">{markOf(door.name)}</span>
          </span>
          <FrozenPhoto
            img={cover}
            fallbackAlt={`Something from ${door.name}`}
            className="qp-img"
            w={420}
            h={264}
          />
          <span className="k-rail qp-rail" aria-hidden="true" />
        </span>

        {/* THE TEXT BLOCK IS A FIXED BUDGET — two lines of name, one
            of qualification, two of census — and that is what makes
            every card the same height. Sized by its own string this
            grid produced NINE heights in one view, and even after
            that was fixed a census that wrapped on three cards put
            two heights back.

            THERE IS NO QUALIFICATION LINE, and there was: `marqueOf`
            returns a trim for a model name and not one of the
            eighteen place names has one, so the slot was a blank line
            under every card on the screen — dead air that reads as
            something that failed to load. The census says what the
            place holds and that is the qualification. */}
        <span className="qp-say">
          <span className="t-title qp-name">{lockup.model || door.name}</span>
          {/* THE CENSUS IN THE BUSINESS'S OWN WORDS — "588 variants",
              "209 motors". `door.say` is what the dashboard prints
              for the same place, so the two can never disagree. */}
          <span className="t-caption qp-say-count">{door.say}</span>
        </span>
      </button>
    </li>
  )
}

