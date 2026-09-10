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

import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from 'react'
import { useCallback, useMemo, useState } from 'react'
import { DotsSixVertical, Lock, Plus, ShieldCheck } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  canBeModuleMaster,
  isRetired,
  type EntityDef,
  type ModuleDef,
} from '@/types/model'
/* THE SAME PICTURE RESOLVER THE FRONT DOOR USES. It answers only for
   addresses this repository ships a copy of, and returns null rather
   than substituting anything. */
import { coverPhoto, type CoverPhoto } from '@/features/table/coverPhoto'
import { ICON_SIZE } from '@/lib/icons'
import { accessReading, type AccessReading } from './read'
import { AccessScreen } from './AccessScreen'
import { reorderTo } from './designer'
import { placeFilters, placesOf, placesUnder, type Place } from './places'
import { PageHead } from '@/features/page'
/* THE PRIMITIVES. A card, a button and a caption are drawn by
   src/ui now, and every local rule that used to draw them is gone
   from modules.css — the primitives take no className, so there was
   no way to keep one and layer the other. */
import { Button, Card, SectionHead } from '@/ui'
/* WHAT THE SHEET SUGGESTS, AND THE LIST THAT DRAWS IT — UX_PASS §8.
   BY DIRECT PATH, not through `@/features/dashboard`: that barrel
   pulls in the front door's cards, which import this screen back.
   The two files reached for here are a hook over the store and a
   list of Rows, and neither knows anything about a dashboard. */
import { Proposals, useProposals } from '@/features/dashboard/ProposeList'
/* THE DRAG, AND IT IS THE FRONT DOOR'S OWN. By direct path for the
   reason above: a hook over rectangles and pointer events, with no
   dashboard behind it. */
import { useReorder } from '@/features/dashboard/reorder'
/* THE SPRING THE DRAG MOVES BY — DESIGN_PRINCIPLES §4, "springs own
   anything a person can grab". The same three the front door uses, so
   a card that slides here and a card that slides there move at one
   speed. `transitionFor` returns no transition at all under reduced
   motion and for the one commit after a KEYBOARD move (§4: never
   animate a keyboard-initiated action). */
import { SPRING, transitionFor, useStillness } from '@/features/views/stillness'
import { motion } from 'motion/react'
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

  /* WHAT THIS SHEET SUGGESTS, read on every paint and drawn only in
     the empty state. It is the SAME reading the front door takes —
     one hook, one derivation — so the two screens cannot come to
     different conclusions about the same tables. It goes silent on
     its own: the reading is over tables no module holds. */
  const proposed = useProposals()

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

  /* ── THE RUNS, WHICH ARE WHAT IS ACTUALLY DRAGGED ────────────────
     MODULE_SYSTEM §3 Screen 5: "Cards are dragged into order." The
     grid draws PLACES and ordering is a fact about MODULES, so what
     a drag moves is a module's whole run — the seven Highfield-to-
     Haines cards travel together, exactly as the arrows already move
     them. One slot per run, on the card that leads it.

     THE HOOK IS THE FRONT DOOR'S. `useReorder` carries the spring,
     the window-bound pointer handling, the arrow keys and a hit test
     with its own test (`slotAt`). A second drag implementation here
     would be a second set of answers to "which slot is the pointer
     over", and the two would drift. */
  const runs = useMemo(() => {
    const seen: string[] = []
    for (const seat of deck) {
      if (!seen.includes(seat.place.moduleId)) seen.push(seat.place.moduleId)
    }
    return seen
  }, [deck])

  /* THE DROP IS OVER THE WHOLE LIST, not the visible one — see
     `reorderTo`. Five of twenty-six cards can be showing and the
     twenty-one off screen keep their order. */
  const drop = useCallback(
    (from: number, to: number) => {
      const fromId = runs[from]
      const toId = runs[to]
      if (fromId === undefined || toId === undefined) return
      for (const at of reorderTo(order, fromId, toId)) updateModule(at.id, { order: at.order })
    },
    [runs, order, updateModule],
  )

  const reorder = useReorder({ count: runs.length, onMove: drop, slotAttr: 'data-md-run' })
  const { still } = useStillness()
  const spring = transitionFor(still || reorder.instant, SPRING)

  /* THE DECK, IN THE ORDER THE DRAG IS PREVIEWING. Each run's cards
     stay together and in their own order; only the runs move. */
  const drawn = useMemo(() => {
    if (reorder.order.every((n, i) => n === i)) return deck
    return reorder.order.flatMap((runIndex) =>
      deck.filter((seat) => seat.place.moduleId === runs[runIndex]),
    )
  }, [deck, reorder.order, runs])

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

      {/* ONE HEADER, THE APPLICATION'S. This screen used to draw
          the business's name at 64px over its own eyebrow with its
          own 24px gutter — a landing surface's header on the fifth
          screen of a working day, and the third different header
          anatomy in the app. `PageHead` is the one anatomy: what
          kind of page, what it is, what you can do to it, and then
          the page's own filters on their own row. See
          features/page/PageHead.tsx for the five it replaced.

          THE NAME IS "Modules", NOT THE DEALERSHIP'S. The rail
          carries the business's name at the top of every screen;
          repeating it here as the largest words on the page told
          somebody who pressed "Modules" the name of the company
          they work for. The eyebrow keeps it.

          AND WHAT THE WIDTH PASS MEASURED, because this anatomy is
          the answer to it. The organisation's name, the count under
          it and the two things you may do to this page were a
          full-width banner over a 1080px column of cards: at 2560
          that left half the window empty and STILL gave the cards
          three columns. The fix that pass drew was to move the
          banner into a 340px rail beside the grid, so the facts took
          a column suited to their content and the cards took the
          rest. `PageHead` reaches the same end by the other route —
          the header is that same narrow group of related facts, on
          one row, and the GRID takes every pixel under it. Nothing
          on this screen is stretched to fill: the header stops where
          its content stops and the grid answers a wider window with
          MORE COLUMNS, never with wider cards.

          THE COUNT IS THAT PASS'S ONE FACT, in `PageHead`'s own
          slot. It read "N modules · N tables" in the rail — the fact
          that tells an admin the sheet is all still here. It reads
          in PLACES now, because places are what the grid draws and a
          count that disagrees with the cards under it is the fault
          `read.ts` exists to prevent. The table figure is still on
          the screen and is now the actionable half of itself: the
          sentence under the grid says how many tables are not in a
          place yet, and only while that is true of something. */}
      <PageHead
        eyebrow={business === '' ? 'This sheet' : name}
        name="Modules"
        count={`${places.length} ${places.length === 1 ? 'place' : 'places'}`}
        acts={
          <>
            {/* THE DOOR THE RAIL PROMISES. Drawn whether or not
                there are places: the screen behind it says honestly
                that access is granted in a place when there are
                none yet. */}
            <Button
              tone="neutral"
              glyph={<ShieldCheck size={ICON_SIZE.tiny} weight="light" />}
              onClick={() => setSurface('access')}
            >
              Access &amp; roles
            </Button>

            {/* REORDER STANDS WITH THE PAGE'S OTHER ACT, and it is
                drawn only when there is an order to put things in.

                It was a button and a sentence stranded under the
                last row of cards — on a nine-card grid a long way
                from the control that puts you in the mode, and
                further at every width above 1180 where the grid gets
                another column and another row of scroll. And it was
                offered against ONE module with a sentence beside it
                excusing itself: a dead control explaining why it is
                dead. One module cannot be arranged, so there is no
                control, which is the same refusal made in the place
                it applies. */}
            {/* WHILE IT IS ON IT IS THE PRIMARY ACT ON THE PAGE —
                the accent, once, on the mode the person is in — and
                the word on it says which way it goes. */}
            {moduleCount > 1 ? (
              <Button
                tone={ordering ? 'primary' : 'neutral'}
                aria-pressed={ordering}
                onClick={() => setOrdering((v) => !v)}
              >
                {ordering ? 'Done' : 'Reorder'}
              </Button>
            ) : null}
          </>
        }
        tools={
          /* FILTER BY TYPE. Every chip is a kind that is really
             present, in TABLE_KINDS' own order, carrying its own
             count and — when it is on — its own hue. `.k-filter` is
             the system's, so this chip and a chip anywhere else in
             the app are one control. */
          chips.length > 2 ? (
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
          ) : undefined
        }
      />

      {moduleCount === 0 ? (
        /* THE EMPTY STATE PROPOSES BEFORE IT EXPLAINS — UX_PASS §8.

           WHAT IT USED TO SAY, on a sheet holding a dealer's whole
           price file: a definition of the word module, a count of
           the tables, and a button that opened a blank panel. Every
           one of those is true and none of them is an answer. The
           store already knew that fifty-three of those tables
           declare a kind and that seven of them say boat.

           THE COUNT LINE TURNS ROUND WHEN A PROPOSAL ARRIVES. It
           said "You have 53 tables and no modules" — true, and it
           ends on the word for what is missing. The same figure
           reads "From your 53 tables, these look like places in
           your business" and introduces the list under it, which is
           §8's own sentence. It stays a SENTENCE: rule 3 keeps
           uppercase for labels, and a shouted line with a number in
           it reads as a heading that swallowed one.

           THE DEFINITION STAYS EITHER WAY. Module is this app's own
           noun and this is the one screen where somebody meets it;
           the proposals show what one would be, and the sentence
           says what one IS. */
        <div className="md-empty">
          <Card tone="raised" pad="lg">
            <div className="md-empty-in">
              <SectionHead level="none">Nothing here yet</SectionHead>
              <p className="md-empty-say">
                A module is a place in your business — the boats you sell, the trailers, the
                quotes you have raised. You pick the table it is about and give it a name.
              </p>
              {/* THE COUNT LINE DOES §8's JOB NOW. It was "You have 53
                  tables and no modules" — a true sentence that ends
                  in the word for what is missing. The same figure,
                  turned to face the other way, introduces the list
                  underneath it. A sentence and not a heading: rule 3
                  reserves uppercase for labels, and this one carries
                  a value. */}
              <p className="md-empty-count">
                {proposed.proposals.length > 0 ? (
                  <>
                    From your{' '}
                    <strong>
                      {tableCount} {tableCount === 1 ? 'table' : 'tables'}
                    </strong>
                    , these look like places in your business.
                  </>
                ) : (
                  <>
                    You have{' '}
                    <strong>
                      {tableCount} {tableCount === 1 ? 'table' : 'tables'}
                    </strong>{' '}
                    and no modules.
                  </>
                )}
              </p>
              {proposed.proposals.length > 0 ? (
                <Proposals
                  reading={proposed}
                  /* NO LABEL OVER IT. The sentence above IS the
                     label, and the list takes none rather than
                     shouting a second one. */
                  why
                  /* THE THIRD CLICK LANDS IN THE MODULE, the same as
                     it does from the front door. */
                  onCreated={(id) => onOpen(id)}
                />
              ) : null}
              {/* REFUSED, NOT DISABLED. `<Button refusedBecause>` keeps
                  the control in the tab order, blocks the press and
                  draws the reason beneath it, tied by aria-describedby
                  — rule 10, once, in the primitive.

                  IT STEPS DOWN WHEN THERE IS A PROPOSAL. One accent
                  per screen (§5): with places offered above it, the
                  proposals are the act and this is the escape hatch
                  §8 asks to keep one click away — so it says what it
                  is for rather than repeating the primary's word. */}
              <Button
                tone={proposed.proposals.length > 0 ? 'ghost' : 'primary'}
                glyph={<Plus size={ICON_SIZE.tiny} weight="bold" />}
                onClick={onNew}
                refusedBecause={
                  canMakeModule
                    ? undefined
                    : 'A module is about a table, and there are none yet. Start one from New table on the bar, or load your price file from Home.'
                }
              >
                {proposed.proposals.length > 0 ? 'Pick a table myself' : 'New module'}
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* THE GRID SCROLLS, THE PAGE NEVER DOES. `1fr` rows inside a
              definite height, so the cards grow when there are few and
              the box â€” not the document â€” scrolls when there are many. */}
          <ul className="md-grid" ref={reorder.containerRef}>
            {drawn.map((seat, i) => (
              <PlaceCard
                key={seat.place.key}
                place={seat.place}
                module={seat.module}
                master={seat.master}
                cover={seat.cover}
                onOpen={onOpen}
                ordering={ordering}
                /* the run's own slot and grab, on the card that leads
                   it — `leads` is the same flag the arrows used */
                runIndex={runs.indexOf(seat.place.moduleId)}
                grab={reorder.handleProps}
                spring={spring}
                held={reorder.held >= 0 && runs[reorder.order[reorder.held] ?? -1] === seat.place.moduleId}
                index={i}
              />
            ))}

            {/* NEW MODULE IS A CARD IN THE GRID. Creating a place and
                opening one are the same gesture at the same size — a
                sunken `<Card>`, the well the primitive draws for "an
                empty slot", which is exactly what this is.

                REFUSED IS NOT A BUTTON. `<Card>` is a button only
                when it can be activated; with no table to be about,
                it is a still card carrying the sentence, so there is
                nothing to press and the reason is where the act would
                have been (rule 10). */}
            <li className="md-grid-slot ds-rise" style={{ '--i': deck.length } as CSSProperties}>
              {canMakeModule ? (
                <Card tone="sunken" pad="none" label="New module" onActivate={onNew}>
                  <span className="md-place-new">
                    <Plus size={ICON_SIZE.medium} weight="light" aria-hidden="true" />
                    <span className="md-place-new-word">New module</span>
                  </span>
                </Card>
              ) : (
                <Card tone="sunken" pad="none">
                  <span className="md-place-new">
                    <Plus size={ICON_SIZE.medium} weight="light" aria-hidden="true" />
                    <span className="md-place-new-word">New module</span>
                    <span className="md-place-refused">
                      A module is about a table, and there are none yet.
                    </span>
                  </span>
                </Card>
              )}
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
  /** which RUN this card belongs to, and -1 for a card whose module
   *  has gone. Only the card that LEADS a run carries the slot the
   *  drag measures and the handle that starts one — a module moves as
   *  a whole, so seven grabbable cards for one module would be seven
   *  ways to do one thing. */
  runIndex: number
  /** the front door's own handle bindings, for the leading card */
  grab: (index: number) => {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void
  }
  /** this card's run is the one being carried */
  held: boolean
  /** how the card travels between slots — nothing at all under
   *  reduced motion, or after a keyboard move */
  spring: ReturnType<typeof transitionFor>
  index: number
}

function PlaceCard({
  place,
  module,
  master,
  cover,
  onOpen,
  ordering,
  runIndex,
  grab,
  held,
  spring,
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
    /* THE ENTRANCE IS THE SLOT'S. `<Card>` takes no class and no
       style, so the stagger (`--i`) and the rise sit on the slot
       that holds it — the same movement, one element out. */
    <motion.li
      layout
      transition={spring}
      className="md-grid-slot ds-rise"
      style={style}
      /* ONE SLOT PER RUN, ON THE CARD THAT LEADS IT. `useReorder`
         measures `[data-md-run]` and nothing else, so the hit test is
         over modules even though the grid draws places. */
      {...(place.leads && runIndex >= 0 ? { 'data-md-run': '' } : {})}
      data-held={held ? '' : undefined}
    >
      {/* THE CARD IS `<Card>`, AND THE KIND IS ITS `kind`. The rail
          this card wore is the primitive's kind ground now — 6% of
          the hue under the whole card and 14% on its edge, the mix
          card.css measured at 4.5:1 for a name on it. A place held
          back carries no hue: "no longer sold" is the fact about it,
          and it is printed in the body rather than hinted at the
          edge.

          `onActivate` makes it a real <button> with the role, the
          tab stop, the press and the focus ring — none of which this
          file has to draw any more. */}
      <Card
        tone="raised"
        pad="none"
        kind={place.retired ? undefined : place.kind}
        label={label}
        onActivate={() => {
          /* THE SEAM, BOTH WAYS. Told to the host, and remembered for
             a host that cannot carry it yet. */
          rememberPlace(place.moduleId, place.tableId)
          onOpen(place.moduleId, place.tableId)
        }}
      >
        {/* THE FACE IS A WELL, NOT A BARE GLYPH — and the name is the
            line directly under it.

            The mark and the name used to be two stacked rows: a 22px
            glyph alone on a line, then the name on the next. A row
            whose only occupant is a glyph is 28px of card height
            carrying one fact, and it left the place's name — the
            thing a person is actually scanning for — starting a
            third of the way down a 260px card. They are the same
            fact about the place, so the plate became a well that a
            dealer's own logo and a kind symbol occupy the same
            square of, and a card with a mark is the same height as a
            card without.

            HERE THE WELL IS THE WHOLE FACE, because the card grew a
            photograph. `coverPhoto` fills it where the table has
            one, the mark sits over it at the smaller step where it
            does and at the larger step where it does not, and the
            name is the first line of the body beneath — one fact
            about the place, read top to bottom, at every column
            count the grid resolves to. */}
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

        {/* ============================================================
            THE NAME IS THE SUBJECT OF THE CARD, AND IT WAS 15px, THEN
            26.88px, AND IT IS 34px NOW.

            Measured at 1280x800 on the real seed: 25 places, and the
            largest glyph anywhere in the grid was `.md-place-name` at
            **15px** — the same size as the count beside it. The
            display-lg pass took it to 26.88px and the 2026-09-09 sweep
            then measured the whole stage at 2.79x, with the page
            header's word "Modules" (`.ph-name`, 30.72px) still 3.84px
            ABOVE the twenty-five names it heads. Chrome outranking
            its own subject.

            So the name takes `.ds-display-xl` — 34.00px at 1280, the
            step ds.css cut for "a name that is one of several and is
            the point of the screen — a door, a place". Four to a
            screen is normal; twenty-five is this screen. It is above
            the chrome and below the marque, which stays one per
            screen on the workspace this card opens. The utility
            carries the whole set and `.md-place-name` keeps only the
            clamp and the reserved box (rule 6); the cell arithmetic
            is on that rule in modules.css.

            And it steps back DOWN a whole step under 1100px, where
            the track drops to 174px — see the media query there. */}
        <span className="md-place-body">
          <span className="ds-display-xl md-place-name">{place.name}</span>
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

        {/* THE TYPE CHIP IS GONE. It said "Boats" on twenty-five
            cards, under a full-height rail already drawn in the
            boat hue, on a grid whose filter chips carry the same
            eight words with the same eight colours and a count
            each. Three ways of saying one thing, and the chip was
            the one that cost a card its fourth line.

            The foot is drawn only when something has to be said in
            it, which today means a place a dealer has closed. */}
        {restricted && access ? (
          <span className="md-place-foot">
            <span className="md-place-shut" title={access.hint}>
              <Lock size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              {access.say}
            </span>
          </span>
        ) : null}
      </Card>

      {/* REORDERING IS A FACT ABOUT MODULES, NOT ABOUT THE BRANDS
          INSIDE THEM — the seven Highfield-to-Haines cards are one
          module's run and move together. So the grab is drawn once
          per run, on the card that leads it, and it names the module
          it moves rather than the card it sits on.

          IT IS A HANDLE NOW, NOT TWO ARROWS. MODULE_SYSTEM §3 Screen
          5 asks for "cards are dragged into order", and the front
          door has dragged its own cards since the arrangement landed
          — one gesture, one hook, one spring, one hit test with its
          own test. Two arrows on this screen and a grip on that one
          were two answers to one question.

          NOTHING IS LOST WITH THEM. The arrows' whole accessible
          story was the keyboard, and `handleProps` binds arrow keys
          on the handle that move the module instantly (§4: never
          animate a keyboard-initiated action). The refusal they drew
          at the ends is not needed by a control that cannot be
          pressed past one: a drag that ends where it started writes
          nothing, and an arrow key at the end of the list moves
          nothing. */}
      {ordering && place.leads && module && runIndex >= 0 ? (
        <span className="md-place-order">
          <button
            type="button"
            className="md-grip"
            aria-label={`Move ${place.moduleName}. Arrow keys move it.`}
            {...grab(runIndex)}
          >
            <DotsSixVertical size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          </button>
        </span>
      ) : null}
    </motion.li>
  )
}

/* ---------------------------------------------------------- */

