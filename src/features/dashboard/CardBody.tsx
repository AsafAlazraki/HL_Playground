/* ============================================================
   THE SIX CARDS, AND ONE OF THEM USED TO BE THREE.

   EVERY FIGURE ON THIS PAGE IS COUNTED HERE AND NOW. The
   arithmetic is in `cards.ts` so it can be tested; this file is
   the drawing of it, and it holds no numbers of its own.

   THREE RULES THIS FILE KEEPS, ALL OF THEM CHECKABLE BY READING
   IT TOP TO BOTTOM:

     1. NOTHING IS INVENTED. There is no placeholder figure, no
        sample row, no percentage of a target nobody set, and no
        chart over data this app is not keeping. Where a trend
        would be the obvious thing to draw, it is absent, because
        the app records no history to draw one from.

     2. A CARD WITH NOTHING IN IT SAYS SO IN A SENTENCE AND
        OFFERS THE ACT THAT WOULD GIVE IT SOMETHING. Never a
        blank rectangle and never a spinner over an answer that
        is already known to be zero.

     3. EVERY FIGURE IS MONO AND TABULAR. `.ds-mono` and
        `.ds-mono-sm` for figures inside a row; `.dsh-fig-n` for
        the large counted ones, which is a whole type step — size,
        weight, leading and tracking together (§2 rule 6) —
        declared in dashboard.css because the system has no mono
        step above 15px. DESIGN_PRINCIPLES §2: a number in a
        column is what mono is for, and money lines up on the
        decimal because of it.

   ONE ACCENT, AND IT IS NOT SPENT HERE. §1 asks for roughly four
   appearances a screen, and a page of cards each with an accent
   figure on it is that budget spent before anything else is
   counted.
   So the cards are ink and surface only: the large figure leads
   by SIZE, not by colour. The accent on this screen is the one
   primary fast action, the focus ring, and hover.

   THE KIND HUES ARE A SEPARATE VOCABULARY AND THEY DO APPEAR —
   in one form, on the three cards that list things which HAVE a
   kind. `Row` takes an optional `kind` and draws the kind's own
   mark in the kind's own hue: a glyph, which is exactly what §1
   allows a second hue to be, beside a rail and a dot. It is
   never a tint behind a name, and never on a card's chrome — a
   dashboard of differently-tinted cards is still the theme
   §1 forbids, and that is not what this is. What it is, is the
   same fact the rail and the sheet already draw, drawn the same
   way: `EntityDef.kind` is what the dealer said the table holds.

   AND THE HUE IS NEVER THE ONLY CARRIER. Each kind's mark is a
   different SHAPE as well as a different colour, so the row reads
   the same to somebody who cannot separate indigo from amber.
   Measured on the real set, the marks clear 4.09:1 at worst
   against every ground a row wears — rest, hover and press, in
   both themes — against a 3:1 floor for a graphical object.
   ============================================================ */

import { useCallback, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import {
  ClockCounterClockwise,
  DotsSixVertical,
  FileText,
  Pulse,
  Scales,
  SealWarning,
  SquaresFour,
  Table,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { useQuotes, quoteTotals } from '@/features/quote'
import type { QuoteDef } from '@/features/quote'
import { useLintFindings } from '@/features/review'
/* BY DIRECT PATH, and for the reason the store's own imports
   give: `@/features/constraints` is the feature's barrel and
   pulls its whole React surface — the ledger, the discovery
   panel, the sentence editor — back in behind one count.
   `constraintDefs.ts` imports react, the model, the store and
   one lib helper, and nothing else. */
import { useConstraints } from '@/features/constraints/constraintDefs'
/* THE SAME BOAT EVERYWHERE. `tablekit` is the app's one source
   of a kind's mark — the rail, the dialog, the table card and the
   sheet all ask it for the same glyph, so a dashboard that drew
   its own would be the eighth drawing of a boat in this build. */
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import type { TableKind } from '@/types/model'
import { money } from '@/lib/money'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import type { CardId } from './arrangement'
import {
  CARDS,
  LENS_NAME,
  LENS_NONE,
  QUOTE_LENSES,
  biggestTables,
  byCustomer,
  countLenses,
  fileTally,
  moduleRows,
  plural,
  quotesUnder,
  resolveRecent,
  rollFindings,
  rollRules,
  quotesPerPlace,
} from './cards'
import type { QuoteLens } from './cards'
import type { DashboardActs } from './acts'
import { useRecentPicks } from './useRecentPicks'
import { useReorder } from './reorder'
import { applyOrder, useTileOrder, type TileWho } from './tileOrder'
import { PlaceMark, placeFilters, placesOf, rememberPlace } from '@/features/modules'
import { ActivityList, useActivity } from '@/features/activity'

const MARK = ICON_SIZE.small
const MARK_WEIGHT = weightFor(MARK)

/** The mark on each card's header. One size, one weight, so all
 *  of them read as one set — the rail's own discipline. */
export const CARD_ICON: Record<CardId, Icon> = {
  'my-quotes': FileText,
  'my-modules': SquaresFour,
  activity: Pulse,
  'the-price-file': Table,
  'recently-opened': ClockCounterClockwise,
  'data-quality': SealWarning,
  'rules-warning': Scales,
}

export function CardMark({ id }: { id: CardId }): JSX.Element {
  const Glyph = CARD_ICON[id]
  return <Glyph size={MARK} weight={MARK_WEIGHT} />
}

/* ---------------------------------------------------------- */
/* The shared pieces                                          */
/* ---------------------------------------------------------- */

/** WHAT A CARD SAYS WHEN IT HAS NOTHING TO SAY: the sentence,
 *  and the one act that would change that. Never two acts — a
 *  card is a glance, and a glance holds one decision. */
function Nothing({
  say,
  act,
  onAct,
}: {
  say: string
  act?: string
  onAct?: () => void
}): JSX.Element {
  return (
    <div className="dsh-empty">
      <p className="dsh-empty-say ds-small">{say}</p>
      {act && onAct ? (
        <button type="button" className="dsh-act" onClick={onAct}>
          {act}
        </button>
      ) : null}
    </div>
  )
}

/** One large counted figure with the words that qualify it. The
 *  figure is mono because it is a figure; the words are not. */
function Figure({
  n,
  say,
  onPick,
  lead,
}: {
  n: number
  say: string
  onPick?: () => void
  /** the one figure on this card a person reads first */
  lead?: boolean
}): JSX.Element {
  const body = (
    <>
      <span className={`dsh-fig-n${lead ? ' is-lead' : ''}`}>
        {n.toLocaleString()}
      </span>
      <span className="dsh-fig-say ds-caption">{say}</span>
    </>
  )
  if (!onPick) return <div className="dsh-fig">{body}</div>
  return (
    <button type="button" className="dsh-fig dsh-fig-btn" onClick={onPick}>
      {body}
    </button>
  )
}

/** A row in a card's list. It DARKENS on press rather than
 *  scaling (§4) so its neighbours do not look like they moved.
 *
 *  AND WHEN IT HAS A KIND, THE KIND CARRIES A SURFACE. `data-kind`
 *  is set on the ROW, not on the mark, which is what lets `--kind`
 *  resolve for both the full-height rail (`.k-rail`, ds.css) and
 *  the glyph inside it. That is the amendment §1 now carries: a
 *  hue may carry a rail, and it only ever appears on something
 *  that HAS that kind. Two things of one kind are one colour
 *  everywhere in the app.
 *
 *  THE FIGURE IN THE TAIL IS NEVER THE HUE. A price is not
 *  decorative, so `tail` stays ink and mono however loud the rail
 *  beside it is.
 *
 *  THE HUE IS NEVER THE ONLY CARRIER either: the glyph is a
 *  different SHAPE per kind, so the row reads the same to
 *  somebody who cannot separate indigo from amber. */
function Row({
  title,
  under,
  tail,
  kind,
  label,
  onPick,
}: {
  title: string
  under?: ReactNode
  tail?: ReactNode
  /** WHAT THIS ROW IS. `EntityDef.kind` is a fact the dealer set,
   *  and it is why "Rigging Kits" and "Highfield Inflatables" stop
   *  reading as two lines of the same thing. */
  kind?: TableKind
  label: string
  onPick: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      className={`dsh-row${kind ? ' k-rail' : ''}`}
      data-kind={kind}
      onClick={onPick}
      aria-label={label}
    >
      {kind ? (
        <span className="dsh-row-mark" aria-hidden="true">
          <TableKindSymbol kind={kind} size={ICON_SIZE.small} />
        </span>
      ) : null}
      <span className="dsh-row-main">
        <span className="dsh-row-title ds-small">{title}</span>
        {under ? <span className="dsh-row-under ds-caption">{under}</span> : null}
      </span>
      {tail ? <span className="dsh-row-tail">{tail}</span> : null}
    </button>
  )
}

/** The last line of a card: where the whole list lives. */
function More({ say, onPick }: { say: string; onPick: () => void }): JSX.Element {
  return (
    <button type="button" className="dsh-more" onClick={onPick}>
      {say}
    </button>
  )
}

/* ---------------------------------------------------------- */
/* Quotes — ONE card, with the states as filters inside it    */
/* ---------------------------------------------------------- */

/* WHY THIS IS ONE CARD AND WAS THREE.

   "My quotes", "Quotes by state" and "Where I have been" were
   three boxes across the top of the front door. Two of them were
   a heading over a number, and the number was a count of the
   list the third one drew — so the screen asked one question
   three times and answered it best in the box with the least
   room.

   The states are FILTERS now, inside the card that lists them,
   which means the chip and the rows under it are computed from
   one array by one predicate (`lensHolds`, cards.ts) and cannot
   disagree. It opens on DRAFTS, because a resumable draft is the
   most valuable thing on this screen and it was four levels down.

   NOTHING IS INVENTED HERE EITHER. Every chip's figure is a
   count of quotes that exist; "By customer" gathers the same
   rows under the name FROZEN on each document and resolves
   nothing through the register. */

const QUOTE_ROWS = 8

function Quotes({ me, acts }: { me: string; acts: DashboardActs }): JSX.Element {
  const quotes = useQuotes()
  const entities = useProjectStore((s) => s.entities)
  /* NULL UNTIL THE PERSON PICKS ONE, so the card can open on
     drafts and still fall back to All the day there are none —
     without overwriting a choice they made. A `useState('drafts')`
     would strand somebody on an empty filter the moment their
     last draft was issued. */
  const [picked, setPicked] = useState<QuoteLens | null>(null)
  const [grouped, setGrouped] = useState(false)

  const counts = useMemo(() => countLenses(quotes, me), [quotes, me])
  const lens: QuoteLens = picked ?? (counts.drafts > 0 ? 'drafts' : 'all')
  const list = useMemo(() => quotesUnder(quotes, lens, me), [quotes, lens, me])
  const bands = useMemo(
    () => (grouped ? byCustomer(list.slice(0, QUOTE_ROWS)) : []),
    [grouped, list],
  )

  if (quotes.length === 0) {
    return <Nothing say={CARDS['my-quotes'].empty} act="New quote" onAct={acts.onNewQuote} />
  }

  /* THE SUBJECT'S OWN KIND. A quote is raised FROM a row on a
     table, and that table's kind is what the rig is — so the same
     hue marks the same boat here, in the modules card and on the
     sheet. A quote whose root table has since been struck gets no
     mark rather than a grey one: an absent fact is drawn absent. */
  const kindFor = (q: QuoteDef): TableKind | undefined => {
    const entity = entities[q.rootTableId]
    return entity ? kindOf(entity.kind) : undefined
  }

  const line = (q: QuoteDef): JSX.Element => {
    const totals = quoteTotals(q)
    const customer = q.customer.name.trim()
    return (
      <Row
        key={q.id}
        kind={kindFor(q)}
        /* THE CUSTOMER IS THE HEADING, and the subject was. A deal
           is a person waiting on an answer; the boat is what they
           are waiting on. The board's cards were already drawn this
           way and this one was not, so the same three quotes read
           as two different things on two screens.

           A quote addressed to nobody says so rather than drawing
           an empty line — it is a real state and the most common
           one on a fresh sheet. */
        title={customer || 'No customer yet'}
        under={
          <>
            <span className="dsh-subject">{q.subjectLabel}</span>
            <span className={`dsh-state${q.state === 'issued' ? ' is-issued' : ' is-draft'}`}>
              {q.state === 'issued' ? 'Issued' : 'Draft'}
            </span>
          </>
        }
        tail={
          /* A QUOTE WITH AN UNPRICED LINE DOES NOT PRINT A
             CONFIDENT TOTAL. The document itself says so out loud;
             a dashboard that rounded it into one number would be
             the quieter version of the same fault. */
          totals.unpricedCount > 0 ? (
            <span className="dsh-sum is-partial ds-mono">
              {money(totals.total)}
              <span className="dsh-sum-note ds-caption">
                {plural(totals.unpricedCount, 'line unpriced', 'lines unpriced')}
              </span>
            </span>
          ) : (
            <span className="dsh-sum ds-mono">{money(totals.total)}</span>
          )
        }
        label={`Open quote ${q.reference} \u2014 ${q.subjectLabel}`}
        onPick={() => acts.onOpenQuote(q.id)}
      />
    )
  }

  /* WHAT IS IN THE PIPELINE UNDER THIS FILTER. The card listed
     three quotes and never said what they came to — the one figure
     a person opens a quotes card to see, and the only one that
     answers "how is the month going".

     IT IS COMPUTED FROM THE FILTERED LIST, not from every quote,
     so the figure and the rows beneath it can never disagree.
     Lines with no price are counted separately and said, for the
     same reason a single quote says it: a total that silently
     absorbed them would be a confident number about an incomplete
     one. */
  const worth = list.reduce((n, q) => n + quoteTotals(q).total, 0)
  const partial = list.filter((q) => quoteTotals(q).unpricedCount > 0).length

  return (
    <>
      <div className="dsh-lenses" role="group" aria-label="Which quotes">
        {QUOTE_LENSES.map((l) => (
          <button
            key={l}
            type="button"
            className="dsh-lens"
            aria-pressed={l === lens}
            onClick={() => setPicked(l)}
          >
            {LENS_NAME[l]}
            <span className="dsh-lens-n ds-mono-sm">{counts[l].toLocaleString()}</span>
          </button>
        ))}
        <button
          type="button"
          className="dsh-lens dsh-lens-by"
          aria-pressed={grouped}
          onClick={() => setGrouped((v) => !v)}
        >
          By customer
        </button>
      </div>

      {list.length > 0 ? (
        <p className="dsh-worth">
          <b className="dsh-worth-n ds-mono">{money(worth)}</b>
          <span className="dsh-worth-say">
            across {plural(list.length, 'quote', 'quotes')}
          </span>
          {partial > 0 ? (
            <span className="dsh-worth-note">
              {partial === list.length && list.length === 1
                ? 'one has a line with no price'
                : `${partial} with a line not priced`}
            </span>
          ) : null}
        </p>
      ) : null}

      {list.length === 0 ? (
        /* A FILTER THAT HOLDS NOTHING SAYS SO WHERE IT IS
           REFUSED (rule 10), and it is a fact rather than an
           apology: there ARE quotes here, just none under this
           chip. */
        <p className="dsh-none ds-small">{LENS_NONE[lens]}</p>
      ) : grouped ? (
        <div className="dsh-list">
          {bands.map((band) => (
            <div className="dsh-band" key={band.name || '—'}>
              <p className="dsh-band-name">{band.name || 'Not addressed'}</p>
              {band.quotes.map(line)}
            </div>
          ))}
        </div>
      ) : (
        <div className="dsh-list">{list.slice(0, QUOTE_ROWS).map(line)}</div>
      )}

      {/* NO "All quotes" AT THE FOOT. The card's header already
          carries Open, in the same place on every card — this was a
          second door to one place, and the one at the bottom moved
          as the list changed length. The same duplication was
          removed from the modules card. */}
    </>
  )
}

/* ---------------------------------------------------------- */
/* Where I have been                                          */
/* ---------------------------------------------------------- */

function RecentlyOpened({ acts }: { acts: DashboardActs }): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const picks = useRecentPicks()
  const rows = useMemo(
    () => resolveRecent(picks, entities, rowsByEntity),
    [picks, entities, rowsByEntity],
  )

  if (rows.length === 0) {
    return (
      <Nothing say={CARDS['recently-opened'].empty} act="Find anything" onAct={acts.onFind} />
    )
  }

  return (
    <div className="dsh-list">
      {rows.map((r) => (
        <Row
          key={r.key}
          title={r.title}
          /* THE TABLE'S OWN KIND, resolved here rather than
             remembered: `resolveRecent` already dropped any pick
             whose subject is gone, so an entity that survives that
             is present and its kind is a fact. */
          kind={entities[r.entityId] ? kindOf(entities[r.entityId].kind) : undefined}
          under={r.under ? <span className="dsh-when">{r.under}</span> : undefined}
          label={`Open ${r.under || r.title}`}
          onPick={() => acts.onOpenTable(r.entityId)}
        />
      ))}
    </div>
  )
}

/* ---------------------------------------------------------- */
/* My modules                                                 */
/* ---------------------------------------------------------- */

/* THE MODULES CARD DRAWS PLACES, AND IT USED TO DRAW CATEGORIES.
   That is the whole of this rewrite and it is worth being exact
   about, because the card looked finished while it was wrong.

   It listed the nine MODULES — Boats, Motors, Factory Packages,
   Trailers, Parts & Accessories, Dealer Fit Packages, Labour
   Rates, Oils & Consumables, Registration Costs. Those are
   categories. What a dealer opens is Highfield, Yamaha, Stacer,
   Stabicraft, Surtees, Dunbier, REDCO, Mackay, GFAB, ePropulsion,
   Jeanneau, Formosa, Haines and NSM Custom — and every one of them
   was hidden inside a grouping, behind a card that named a sibling
   and counted the rest. The modules SCREEN was fixed for exactly
   this reason (`places.ts`); the front door was still drawing the
   old shape, so the two disagreed about what a module even is.

   `placesOf` is that screen's own reader, so the card and the page
   it opens now list the same things in the same order and cannot
   drift apart.

   A TILE, NOT A ROW, because a brand is recognised by its mark
   before its name is read, and a row of text with a colour rail
   beside it throws that away. `PlaceMark` draws the dealer's own
   logo where one has been given and the kind's symbol where none
   has — the same mark this place draws on the modules screen.

   IT SCROLLS RATHER THAN TRUNCATES. Eight rows and an "All 14
   modules" link was the front door of a business admitting it
   could not show you the business.
   ---------------------------------------------------------- */

function MyModules({ acts, who }: { acts: DashboardActs; who: TileWho }): JSX.Element {
  const modules = useProjectStore((s) => s.modules)
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const { order, set } = useTileOrder(who)

  const places = useMemo(
    () => applyOrder(placesOf(modules, entities, rowsByEntity), (p) => p.key, order),
    [modules, entities, rowsByEntity, order],
  )

  /* THE PERSON'S OWN ORDER, NOT THE BUSINESS'S. Dragging a tile
     writes a key list for this person on this dashboard; it does
     not touch `ModuleDef.order`, because that would rearrange the
     modules screen for everybody who signs in. See tileOrder.ts. */
  const move = useCallback(
    (from: number, to: number): void => {
      const keys = places.map((p) => p.key)
      const [held] = keys.splice(from, 1)
      if (held === undefined) return
      keys.splice(to, 0, held)
      set(keys)
    },
    [places, set],
  )

  const reorder = useReorder({ count: places.length, onMove: move, slotAttr: 'data-dsh-tile' })

  /* ONE PASS OVER THE QUOTES FOR THE WHOLE CARD, not one per tile.
     See `quotesPerPlace`. */
  const quotes = useQuotes()
  const quotesAt = useMemo(
    () => quotesPerPlace(places, modules, quotes),
    [places, modules, quotes],
  )

  if (places.length === 0) {
    return <Nothing say={CARDS['my-modules'].empty} act="Modules" onAct={acts.onOpenModules} />
  }

  /* THE KEY, WHICH IS WHAT PAID FOR TAKING THE SYMBOLS OFF.
     Every tile used to carry a boat, a motor or a trailer, which
     meant the same four glyphs repeated 25 times to say a thing
     the tile's own colour was already saying. Said ONCE, above the
     grid, it is four words instead of 25 pictures — and it is the
     only place in this application where the kind colours are
     explained rather than merely used.

     Counted from the places on screen, so a business with no
     trailers has no trailer swatch. `placeFilters` is the modules
     screen's own reader and its first chip is "All", which is a
     filter rather than a colour and is dropped here. */
  const key = placeFilters(places).filter((f) => f.kind !== undefined)

  return (
    <>
      <ul className="dsh-key" aria-label="What the colours mean">
        {key.map((f) => (
          <li className="dsh-key-item" key={f.key} data-kind={kindOf(f.kind)}>
            <span className="dsh-key-dot" aria-hidden="true" />
            {f.label}
          </li>
        ))}
      </ul>

    <div className="dsh-tiles" ref={reorder.containerRef}>
      {reorder.order.map((original, slot) => {
        const p = places[original]
        if (!p) return null
        const master = p.tableId !== undefined ? entities[p.tableId] : undefined
        return (
          <div
            key={p.key}
            data-dsh-tile=""
            /* THE KIND CARRIES THE TILE. `data-kind` sets `--kind`
               (ds.css); the tile draws its mark plate from it, so
               the same brand is the same colour here, in the rail
               and on its own page. */
            data-kind={kindOf(p.kind)}
            className={`dsh-tile${reorder.held === slot ? ' is-held' : ''}${
              p.retired ? ' is-held-back' : ''
            }`}
          >
            <button
              type="button"
              className="dsh-tile-face"
              /* THE DOOR REMEMBERS WHICH BRAND WAS PRESSED.
                 A module workspace opened at "Boats" above a card
                 that said "Highfield" is the fault `openPlace.ts`
                 exists to prevent: the grid records the table, the
                 workspace stands there. The dashboard is a second
                 grid onto the same places and owes the same fact. */
              onClick={() => {
                rememberPlace(p.moduleId, p.tableId)
                acts.onOpenModule(p.moduleId)
              }}
            >
              {/* THE MARK IS THE HEADING WHERE THERE IS ONE.
                  A brand's wordmark IS its name, set better than
                  this application will ever set it, so drawing
                  both is saying the same word twice — once in
                  Highfield's own type and once in ours. The name
                  is still here, underneath, and CSS hides it when
                  a mark was actually painted.

                  WHY CSS AND NOT A TERNARY. Whether a mark is
                  drawn is decided inside `PlaceMark`: it needs a
                  logo AND the app's permission to paint that
                  address. A ternary here would be a second copy of
                  that decision, and the day it disagreed the tile
                  would be blank — no mark, and no name either.
                  `:has(img)` cannot disagree, because it is asking
                  the question of the thing that answered it. */}
              <span className="dsh-tile-panel">
                <PlaceMark
                  logo={modules[p.moduleId]?.logo}
                  name={p.name}
                  master={master}
                  size={ICON_SIZE.small}
                  fallback="none"
                />
                <span className="dsh-tile-name">{p.name}</span>
              </span>
            </button>

            {/* THE FOOT IS THE COUNT, AND UNDER THE CURSOR IT IS THE
                TWO THINGS YOU CAME TO DO.

                They occupy the SAME cell and cross-fade, so nothing
                moves: a row of actions that appears by growing the
                tile would shove every tile below it down the moment
                the pointer crossed one, which is the reason most
                hover-action grids feel broken. The count is what
                you read; the actions are what you press; you are
                never doing both in the same instant.

                They are real buttons and not links-in-a-button:
                nesting them inside the face would be invalid and
                would make the whole tile ambiguous to a keyboard.
                Reached by tabbing, and `:focus-within` on the tile
                keeps them up while they are. */}
            {/* THE FOOT IS A FIFTH OF THE TILE, and the mark is the
                other four. It was closer to half and half, which
                made the strip of small grey text compete with the
                thing the tile exists to show.

                THE HOVER BUTTONS ARE GONE. Quote and Catalog were
                real, they worked, and they were the wrong answer:
                two grey pills that appeared under the pointer, on a
                card whose job is to get you INTO a module — where
                both acts live anyway, with more room and more
                context. The right fix is a fast module page, not a
                shortcut past it.

                WHAT THE ROOM BOUGHT INSTEAD IS THE QUOTE COUNT. How
                many quotes are out on this brand is the one fact a
                salesperson wants off a dashboard that a row count
                cannot give them — 588 Highfield variants is the
                catalogue's size and says nothing about the day. */}
            <div className="dsh-tile-foot">
              <span className="dsh-tile-under">{p.moduleName}</span>
              <span className="dsh-tile-figs">
                <span className="dsh-tile-sum ds-mono">
                  {p.retired ? 'held' : p.census.items.toLocaleString()}
                </span>
                {/* DRAWN ONLY WHERE THERE ARE ANY. A column of "0"
                    down a grid of twenty-five tiles is noise that
                    reads as a fault; the tiles with quotes on them
                    are the ones worth spotting, and they are the
                    only ones that light up. */}
                {quotesAt[p.key] ? (
                  <span className="dsh-tile-q" title={`${quotesAt[p.key]} quotes`}>
                    <FileText size={12} weight={MARK_WEIGHT} aria-hidden="true" />
                    <span className="ds-mono">{quotesAt[p.key]}</span>
                  </span>
                ) : null}
              </span>
            </div>

            {/* THE GRIP IS ITS OWN CONTROL, NOT THE TILE. Dragging
                the face would mean a press that travels three pixels
                opens a brand instead of moving it, which is the
                fault every draggable list has. Keyboard-operable
                for the same reason the card grips are. */}
            <button
              type="button"
              className="dsh-tile-grip"
              aria-label={`Move ${p.name}. Arrow keys move it.`}
              {...reorder.handleProps(original)}
            >
              <DotsSixVertical size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
            </button>
          </div>
        )
      })}
    </div>
    </>
  )
}

/* ---------------------------------------------------------- */
/* Activity                                                   */
/* ---------------------------------------------------------- */

/** WHAT CHANGED, ANYWHERE, AND WHO CHANGED IT.
 *
 *  The rows come from `features/activity`, which listens to the
 *  note bus rather than being called by the acts it records — so
 *  this card cannot miss a change that raised a toast and cannot
 *  invent one that did not. See `activity.ts`.
 *
 *  IT IS NOT SCOPED TO THIS PERSON. "Who did it" is the whole
 *  reason a shared dealership machine wants a log, and a log
 *  filtered to me answers a question I already know the answer
 *  to. The name is on every row.
 *
 *  ITS EMPTY STATE OFFERS NOTHING, deliberately, and it is the
 *  only card on this dashboard that does. There is no act that
 *  makes activity happen: it fills as the business is used, and a
 *  button here would have to point at something unrelated. */
function Activity({ orgSlug }: { orgSlug: string }): JSX.Element {
  const rows = useActivity(orgSlug)
  if (rows.length === 0) return <Nothing say={CARDS.activity.empty} />

  /* NO LIMIT AND NO "SEE ALL" LINK. The store keeps a fortnight of
     heavy use and hands back the lot; the card scrolls. A link
     under a truncated log would have to point at a page that does
     not exist, and inventing one to justify the link is how a
     dashboard grows a screen nobody asked for. */
  return <ActivityList orgSlug={orgSlug} />
}

/* ---------------------------------------------------------- */
/* The price file                                             */
/* ---------------------------------------------------------- */

const BIG_ROWS = 8

function ThePriceFile({ acts }: { acts: DashboardActs }): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const tally = useMemo(() => fileTally(entities, rowsByEntity), [entities, rowsByEntity])
  const big = useMemo(
    () => biggestTables(entities, rowsByEntity, BIG_ROWS),
    [entities, rowsByEntity],
  )

  if (tally.tables === 0) {
    return (
      <Nothing say={CARDS['the-price-file'].empty} act="Data model" onAct={acts.onOpenDataModel} />
    )
  }

  /* ONE FIGURE, AND IT USED TO BE THREE. "24 tables" and "27
     relationships" beside it were the counted strip PHASE_TWO §1
     names and kills: nobody selling a boat needs to know how many
     tables are in use, and three big figures in the strongest
     position on a card say the app is proud of its schema. The
     count that survives is the one a salesperson reads — how much
     stock there is to sell from — and the tables are still
     counted, one per row, on the thing each count belongs to. */
  return (
    <>
      <div className="dsh-figures">
        <Figure n={tally.rows} say="rows you sell from" lead />
      </div>
      <div className="dsh-list">
        {big.map((t) => (
          <Row
            key={t.entity.id}
            title={t.entity.name}
            kind={kindOf(t.entity.kind)}
            tail={<span className="dsh-sum ds-mono">{t.rows.toLocaleString()}</span>}
            label={`Open ${t.entity.name}`}
            onPick={() => acts.onOpenTable(t.entity.id)}
          />
        ))}
      </div>
      <More say="The drawing" onPick={acts.onOpenDataModel} />
    </>
  )
}

/* ---------------------------------------------------------- */
/* Worth fixing                                               */
/* ---------------------------------------------------------- */

const FINDING_ROWS = 3

function WorthFixing({ acts }: { acts: DashboardActs }): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const findings = useLintFindings()
  const roll = useMemo(() => rollFindings(findings, FINDING_ROWS), [findings])

  if (findings.length === 0) {
    return <Nothing say={CARDS['data-quality'].empty} />
  }

  return (
    <>
      <div className="dsh-figures">
        {roll.blockers > 0 ? (
          <Figure n={roll.blockers} say={roll.blockers === 1 ? 'blocker' : 'blockers'} lead />
        ) : null}
        <Figure
          n={roll.advisories}
          say={roll.advisories === 1 ? 'advisory' : 'advisories'}
          lead={roll.blockers === 0}
        />
      </div>
      {/* THE TABLE IS THE TITLE AND THE FINDING IS THE LABEL, in
          that order, for two reasons. It is the order a person
          acts in — you go to a table and fix a thing in it, not
          the other way round. And `LintFinding.title` arrives from
          the engine already upper-case ('DUPLICATE FIELD NAME');
          §2 rule 3 allows uppercase as a LABEL and never as a
          name, so it belongs on the metadata line beside what it
          describes, not standing in for the row's name. Neither
          string is re-cased here — re-casing somebody's data is
          the lossy act the rule is about. */}
      <div className="dsh-list">
        {roll.head.map((f) => (
          <Row
            key={f.id}
            title={entities[f.entityId]?.name ?? 'A table since removed'}
            under={
              <>
                <span
                  className={`dsh-dot${f.severity === 'blocker' ? ' is-blocker' : ' is-advisory'}`}
                  aria-hidden="true"
                />
                <span className="dsh-when">{f.title}</span>
              </>
            }
            label={`Open ${entities[f.entityId]?.name ?? 'the table'} — ${f.title}`}
            onPick={() => acts.onOpenTable(f.entityId)}
          />
        ))}
      </div>
    </>
  )
}

/* ---------------------------------------------------------- */
/* Rules that warn                                            */
/* ---------------------------------------------------------- */

const RULE_ROWS = 3

function RulesThatWarn({ acts }: { acts: DashboardActs }): JSX.Element {
  const constraints = useConstraints()
  const roll = useMemo(() => rollRules(constraints), [constraints])

  if (roll.enabled === 0) {
    return (
      <Nothing
        say="No rules are switched on here yet. A rule is a sentence about what must always be true."
        act="Business rules"
        onAct={acts.onOpenRules}
      />
    )
  }

  if (roll.warning.length === 0) {
    return <Nothing say={CARDS['rules-warning'].empty} act="Business rules" onAct={acts.onOpenRules} />
  }

  return (
    <>
      <div className="dsh-figures">
        <Figure n={roll.warning.length} say="warn rather than remove" lead />
        <Figure n={roll.enabled} say="rules switched on" />
      </div>
      <div className="dsh-list">
        {roll.warning.slice(0, RULE_ROWS).map((c) => (
          <Row
            key={c.id}
            title={c.because}
            under={<span className="dsh-when">Annotates the row; removes nothing</span>}
            label={`Open business rules — ${c.because}`}
            onPick={acts.onOpenRules}
          />
        ))}
      </div>
      <More say="All business rules" onPick={acts.onOpenRules} />
    </>
  )
}

/* ---------------------------------------------------------- */
/* The switch                                                 */
/* ---------------------------------------------------------- */

export interface CardBodyProps {
  id: CardId
  /** the signed-in person's name, as it is frozen onto a quote */
  me: string
  /** who is looking. The tile order on the modules card is this
   *  person's own preference rather than the business's, so the
   *  card needs the same pair the arrangement is keyed by. */
  userId: string
  /** whose business this is. The activity log is kept per
   *  organisation, so a card that reads it needs to be told which
   *  one rather than reaching for the session itself — the same
   *  reason every other derivation in this feature takes its
   *  inputs as arguments. */
  orgSlug: string
  acts: DashboardActs
}

export function CardBody({ id, me, userId, orgSlug, acts }: CardBodyProps): JSX.Element {
  switch (id) {
    case 'my-quotes':
      return <Quotes me={me} acts={acts} />
    case 'recently-opened':
      return <RecentlyOpened acts={acts} />
    case 'my-modules':
      return <MyModules acts={acts} who={{ userId, orgSlug }} />
    case 'activity':
      return <Activity orgSlug={orgSlug} />
    case 'the-price-file':
      return <ThePriceFile acts={acts} />
    case 'data-quality':
      return <WorthFixing acts={acts} />
    case 'rules-warning':
      return <RulesThatWarn acts={acts} />
  }
}
