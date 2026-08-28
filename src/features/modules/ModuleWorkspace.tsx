/* ============================================================
   A MODULE IS A TYPED WORKSPACE, and this is the workspace.

   WHAT WAS WRONG. Pressing a module opened its CATALOGUE, with a
   six-strip overview band stacked above it explaining what a module
   is. Everything a place actually does — its stock, the quotes
   raised in it, the columns that price it, its set-up — was either
   in that band as a read-only sentence or behind a gear in the
   corner. So a module was one long page that talked about itself,
   and the four things it holds had no rooms of their own.

   FIVE TABS, AND THE NAMES ARE THE PLAN'S:

     Dashboard   what is in this place, counted, with its photography
     Stock       the catalogue, and the register as a density on it
     Quotes      every quote raised from here
     Pricing     the price columns, the levels, the rules
     Settings    its configuration, its categories, its access

   THE HEADER IS THE PLACE, NOT THE BAG. The modules grid draws one
   card per PLACE (`places.ts`) — Highfield, not "Boats · Highfield
   Inflatables + 6 more" — so the workspace opens standing at the
   table that was pressed, and says which module it belongs to as a
   quiet eyebrow rather than as its title. `moduleAt` is the one
   narrowing and every reader takes it, so the count in this header
   and the count on the card that opened it are the same read.

   THE LOGO IS THE FACE OF THE HEADER, for the same reason it is the
   face of the card: `ModuleDef.logo` has shipped since the module
   system landed and nothing had ever drawn one.

   WHICH TAB IS OPEN IS A POSITION, NOT A FACT ABOUT THE BUSINESS,
   so it is state here and is not written to the module. The tabs
   themselves are a real tablist: arrows move between them, Home and
   End reach the ends, and the panel is labelled by its own tab.

   NOTHING ANIMATES BETWEEN TABS. This is a 100+/day surface reached
   by a press and by a keystroke, and the motion budget bars both.
   ============================================================ */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { currentUser } from '@/features/auth'
import { PlaceMark } from './PlaceMark'
import { accentVar, type ImageRef, type ModuleDef } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'
import { moduleCensus, moduleTables } from './read'
import { moduleAt } from './places'
import { placeFor } from './openPlace'
import { ModuleStock } from './ModuleIndex'
import { ModuleSettings } from './ModuleSettings'
import { ModuleHome, ModulePricing, ModuleQuotes } from './ModulePanels'
import './modules.css'

export type ModuleTab = 'home' | 'stock' | 'quotes' | 'pricing' | 'settings'

const TABS: { key: ModuleTab; label: string }[] = [
  { key: 'home', label: 'Dashboard' },
  /* CATALOG, NOT STOCK. "Stock" is what a warehouse holds; this is
     what the dealer SELLS, and the person opening it is choosing
     something to quote rather than counting inventory. The key stays
     `stock` so no stored tab choice breaks. */
  { key: 'stock', label: 'Catalog' },
  { key: 'quotes', label: 'Quotes' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'settings', label: 'Settings' },
]

export interface ModuleIndexProps {
  module: ModuleDef
  /**
   * The table this workspace stands at, when the module holds more
   * than one. THE SEAM: the modules grid names a place and the
   * shell's route carries only the module, so a host that can carry
   * both should pass it here. One that cannot still arrives at the
   * right place — see `openPlace.ts`, which says exactly what that
   * channel is and is not.
   */
  place?: string
  /** clicking an item — the table it belongs to and the row itself */
  onOpen: (tableId: string, rowId: string) => void
  /** Opening one of the quotes raised here. Absent = the quotes are
   *  still NAMED, as a fact about this place, but they are not doors. */
  onOpenQuote?: (quoteId: string) => void
  /** START A QUOTE STANDING IN THIS PLACE. Only the shell can put
   *  the picker on screen, so it is handed down; absent, the
   *  dashboard's empty quotes card states the fact and offers no
   *  button rather than offering one that cannot work. */
  onNewQuote?: (() => void) | undefined
  /** The shell's own door into set-up, kept because the access screen
   *  hands out that route. Set-up is a TAB here, so this workspace
   *  never calls it; a host that still wants a separate settings page
   *  can. */
  onSettings?: (focus?: 'rules') => void
}

export function ModuleIndex({
  module: owner,
  place,
  onOpen,
  onOpenQuote,
  onNewQuote,
}: ModuleIndexProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  /* WHOSE BUSINESS THIS IS, for the activity card. From the
     session, not the sheet: `OrgProfile` carries a display name and
     no slug, and every per-organisation store in this app is keyed
     by the signed-in person's `orgSlug`. Two keys for one business
     is a log that empties when somebody renames the dealership. */
  const orgSlug = currentUser()?.orgSlug ?? 'northside-marine'

  /* MOVING BETWEEN THE PLACES OF ONE MODULE, without leaving it.
     The seven brands in Boats are seven doors on the grid, and a
     person comparing two of them should not have to go out to the
     grid and back in. Which one is being stood at is a position on
     this page — the same kind of fact as which tab is open — so it is
     state here and is written nowhere. */
  const [pick, setPick] = useState<string | undefined>(undefined)

  /* THE PROP WINS, and what the grid remembered is the fallback. A
     host that carries the place properly is believed over anything
     this feature remembered on its own; a person who has moved since
     arriving wins over both. */
  const at = pick ?? place ?? placeFor(owner.id)

  /* A REMEMBERED TABLE THAT IS NOT THIS MODULE'S IS NOT A PLACE.
     `moduleAt` already refuses it; this is only so the header knows
     whether it is standing at a brand or at the whole module. */
  const standing = at !== undefined && owner.tableIds.length > 1 && owner.tableIds.includes(at)
  const module = useMemo(() => moduleAt(owner, standing ? at : undefined), [owner, standing, at])

  const table = standing && at ? entities[at] : undefined
  const tables = useMemo(() => moduleTables(module, entities), [module, entities])
  const census = useMemo(
    () => moduleCensus(module, entities, rowsByEntity),
    [module, entities, rowsByEntity],
  )

  const [tab, setTab] = useState<ModuleTab>('home')
  const bar = useRef<HTMLDivElement | null>(null)

  /* A REAL TABLIST. Arrow keys move, Home and End reach the ends, and
     focus follows — which is what makes the tab bar reachable without
     a pointer. The move does not animate: keyboard-initiated. */
  const onKeys = useCallback((e: KeyboardEvent<HTMLButtonElement>): void => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(e.key)) return
    e.preventDefault()
    const at = TABS.findIndex((t) => t.key === (e.currentTarget.dataset.at as ModuleTab))
    const last = TABS.length - 1
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? last
          : e.key === 'ArrowLeft'
            ? (at + last) % TABS.length
            : (at + 1) % TABS.length
    const wanted = TABS[next]
    if (!wanted) return
    setTab(wanted.key)
    bar.current?.querySelector<HTMLButtonElement>(`#md-tab-${wanted.key}`)?.focus()
  }, [])

  const style = { '--md-accent': accentVar(owner.accent) } as CSSProperties
  const name = table ? table.name : owner.name

  return (
    <section className="md-work" style={style} aria-label={name} data-kind={kindOf(table?.kind ?? tables[0]?.kind)}>
      <header className="md-work-head">
        {/* THE BRAND'S OWN MARK. This drew `WorkMark`, which was a
            THIRD copy of "what mark does this place get" — after the
            modules grid's and the dashboard tiles' — and it had
            drifted in both the ways a third copy drifts: it did not
            know about the bundled brand marks (`brandLogos.ts`), so
            Highfield got a generic boat glyph here while its wordmark
            was drawn on the two screens either side of this one; and
            it set `width={44} height={44}` on an image that is always
            a wordmark, which is the same square-on-a-9:1-file bug
            fixed in `.md-place-logo` today.

            `PlaceMark` is the one implementation. */}
        <span className="md-work-mark">
          <PlaceMark
            logo={owner.logo}
            name={name}
            master={table ?? tables[0]}
            size={ICON_SIZE.medium}
          />
        </span>
        <div className="md-work-id">
          {/* THE MODULE IT BELONGS TO, and only when that is not the
              name below it. Two cases print the same word twice: a
              module that is one place, and a module whose primary
              table it was named after — Parts & Accessories is both a
              module and a table, and the eyebrow read "PARTS &
              ACCESSORIES" over "Parts & Accessories". */}
          {standing && owner.name !== name ? (
            <span className="mono-label md-work-of">{owner.name}</span>
          ) : null}
          <h2 className="ds-display-lg md-work-name">{name}</h2>
        </div>
        {/* ONE FACT, THE SAME ONE THE CARD CARRIED. A figure is never
            a hue and is always mono and tabular. */}
        <p className="md-work-fact">
          <b className="md-work-n">{census.items.toLocaleString('en-AU')}</b>
          <span className="md-work-noun">{census.noun}</span>
        </p>
      </header>

      <div className="md-work-tabs" role="tablist" aria-label={`${name} — what to look at`} ref={bar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`md-tab-${t.key}`}
            type="button"
            role="tab"
            data-at={t.key}
            className="md-work-tab"
            aria-selected={tab === t.key}
            aria-controls="md-work-panel"
            tabIndex={tab === t.key ? 0 : -1}
            onKeyDown={onKeys}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className="md-work-body"
        id="md-work-panel"
        role="tabpanel"
        aria-labelledby={`md-tab-${tab}`}
        tabIndex={0}
      >
        {tab === 'home' ? (
          <ModuleHome
            module={module}
            owner={owner}
            place={standing ? at : undefined}
            onOpen={onOpen}
            onOpenQuote={onOpenQuote}
            onPlace={setPick}
            onStock={() => setTab('stock')}
            /* THE TWO DOORS THE DASHBOARD'S CARDS NEED. Both are
               tabs of this same workspace, so the workspace hands
               them down rather than the panel reaching for a
               router — the arrangement every other panel here
               keeps. */
            onQuotes={() => setTab('quotes')}
            {...(onNewQuote ? { onNewQuote } : {})}
            orgSlug={orgSlug}
          />
        ) : tab === 'stock' ? (
          /* KEYED ON THE PLACE, so switching brands is a new page
             rather than the same page re-pointed: the find box and
             the drawer that is open both belong to the place. */
          <ModuleStock key={`${owner.id}:${at ?? ''}`} module={owner} place={standing ? at : undefined} onOpen={onOpen} />
        ) : tab === 'quotes' ? (
          <ModuleQuotes module={module} owner={owner} onOpenQuote={onOpenQuote} />
        ) : tab === 'pricing' ? (
          <ModulePricing module={module} tables={tables} />
        ) : (
          /* SET-UP IS ABOUT THE MODULE, NOT ABOUT THE BRAND, and it
             says so itself: it keeps its own heading, which names the
             module and counts everything in it. The way out is the
             tab bar, so it is drawn without its own back control. */
          <ModuleSettings module={owner} bare onDone={() => setTab('home')} />
        )}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- */

