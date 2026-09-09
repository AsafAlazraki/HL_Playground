/* ============================================================
   THE DASHBOARD — a salesperson's day, arranged by them.

   WHAT THIS SURFACE IS FOR. The app exists so a business can
   sell a complicated product easily. The front door should
   therefore be the SELLING, not the schema: what I have quoted,
   what state those quotes are in, where I was, the places in the
   business, and the stock underneath all of it. The drawing of
   fifty-one tables is still one press away on the rail, where it
   belongs, under DATA.

   AND IT IS THEIRS. Every card can be taken off, put back and
   moved; every fast action is chosen, named and ordered by the
   person who presses it. The arrangement is filed under their
   `AppUser.id` AND their `orgSlug` (see arrangement.ts), so a
   second person signing into the same browser gets their own
   dashboard rather than inheriting somebody else's.

   AND IT FITS THE VIEWPORT. Three cards, not five, and they are
   sized to the room the page has rather than stacked into a
   scroller — an overview you have to scroll is a list. The three
   quote boxes that used to sit across the top are one card with
   the states as filters inside it, opening on DRAFTS, because a
   resumable draft is the most valuable thing on this screen.

   THE FOUR RULES THIS SCREEN IS BUILT AGAINST:

     · NOTHING IS INVENTED. Every figure is counted at paint from
       the store, the quote registry, the lint engine and the
       rule register. There is no placeholder, no sample and no
       chart over history this app is not keeping.

     · UNDOABLE MEANS A TOAST WITH UNDO, NEVER A DIALOG (rule 9).
       Six acts on this page change the arrangement and every one
       of them says what it did and offers to take it back. There
       is not one confirm sheet in this feature.

     · REORDERING IS A GESTURE, SO IT GETS A SPRING (§4) — and
       the same reorder from the keyboard gets none, because §4
       also says never animate a keyboard-initiated act. See
       reorder.ts.

     · A THING THAT CANNOT BE DONE SAYS WHY, WHERE IT IS
       (rule 10). The one refusal here is the eight-button cap on
       the fast-action row, and it is a sentence in the place the
       Add control would be.

   WHY THE UNDO IS NOT `sayUndoable`. That helper pins the top of
   the PROJECT store's history stack, which is right for anything
   that changes the sheet. Nothing on this page changes the
   sheet: an arrangement is a preference, it is not in the store
   and it is not in the undo stack. So the note carries the
   previous arrangement by value and puts that back — the same
   shape of promise, over the state that actually moved.
   ============================================================ */

import { useCallback, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, DotsSixVertical, Plus, Sliders, X } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { say } from '@/store/notes'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { SPRING, transitionFor, useStillness } from '@/features/views/stillness'
import type { AppUser } from '@/features/auth/session'
import {
  cardsNotPlaced,
  defaultArrangement,
  useArrangement,
  withCardAdded,
  withCardRemoved,
  withCardsMoved,
  withLinkAdded,
  withLinkRemoved,
  withLinkRenamed,
  withLinksMoved,
  type Arrangement,
  type CardId,
  type LinkTarget,
} from './arrangement'
import { CARDS, firstName, greeting } from './cards'
import { censusLine, sheetCensus } from './census'
import { linkOffers, resolveLinks } from './links'
import { Button, Card, SectionHead } from '@/ui'
import { QuickLinks } from './QuickLinks'
import { CardBody } from './CardBody'
import { Tray, type TrayKind } from './Tray'
import { useReorder } from './reorder'
import type { DashboardActs } from './acts'
import './dashboard.css'

const MARK_WEIGHT = weightFor(ICON_SIZE.tiny)

export interface DashboardProps extends DashboardActs {
  /** who is signed in. Everything on this page that says "my"
   *  means this person, and the arrangement is filed under them. */
  user: AppUser
}

/** WHERE EACH CARD'S "Open" GOES, and which cards have one.
 *
 *  A partial map on purpose. Four of the seven cards are a glance
 *  at a page that exists; three are complete in themselves — the
 *  activity log, the reviewer's findings and where-you-have-been
 *  have no single screen that is "more of this". Returning
 *  `undefined` for those is what stops the header growing a
 *  control that lies. */
function openFor(id: CardId, acts: DashboardActs): (() => void) | undefined {
  switch (id) {
    case 'my-quotes':
      return acts.onOpenQuotes
    case 'my-modules':
      return acts.onOpenModules
    case 'the-price-file':
      return acts.onOpenDataModel
    case 'rules-warning':
      return acts.onOpenRules
    default:
      return undefined
  }
}

export function Dashboard({ user, ...acts }: DashboardProps): JSX.Element {
  const { still } = useStillness()
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const modules = useProjectStore((s) => s.modules)

  const who = useMemo(
    () => ({ userId: user.id, orgSlug: user.orgSlug }),
    [user.id, user.orgSlug],
  )
  const { arrangement, apply, restore } = useArrangement(who)

  const [arranging, setArranging] = useState(false)
  const [tray, setTray] = useState<TrayKind | null>(null)

  /* ONE PLACE THAT SAYS WHAT JUST HAPPENED, AND OFFERS IT BACK.
     Every act below goes through it, so none of them can forget
     — and the undo puts back the WHOLE arrangement rather than
     inverting one operation, which is what makes it exact even
     when two things changed at once. */
  const done = useCallback(
    (text: string, before: Arrangement) => {
      say({
        text,
        act: {
          label: 'Undo',
          onPick: () => {
            restore(before)
            /* NOT lower-cased. Every one of these sentences opens
               with a card's NAME or a person's own word for a
               button, and §2 rule 3 keeps a name in its own case —
               "undone — my quotes moved to 3 of 5" is this page
               re-typing something the person wrote. */
            say({ text: `Undone — ${text}` })
          },
        },
      })
    },
    [restore],
  )

  const rowCount = useCallback(
    (entityId: string) => rowsByEntity[entityId]?.length ?? 0,
    [rowsByEntity],
  )

  const resolved = useMemo(
    () => resolveLinks(arrangement.links, entities, modules, rowCount),
    [arrangement.links, entities, modules, rowCount],
  )

  const offers = useMemo(
    () => linkOffers(arrangement, entities, modules),
    [arrangement, entities, modules],
  )

  const spare = useMemo(() => cardsNotPlaced(arrangement), [arrangement])

  /* WHAT THE FILE HOLDS — DECISIONS.md §3, settled 2026-09-09.
     Counted at paint off the two things this component already
     subscribes to, so the strip costs one pass over the entity
     keys and no extra render. `null` on an empty sheet, and the
     header simply closes up. See census.ts for why this is the
     sheet-wide reader and not `fileTally`. */
  const census = useMemo(
    () => censusLine(sheetCensus(entities, rowsByEntity)),
    [entities, rowsByEntity],
  )

  /* -- the acts ------------------------------------------- */

  const moveCard = useCallback(
    (from: number, to: number) => {
      const id = arrangement.cards[from]
      const before = apply((a) => withCardsMoved(a, from, to))
      if (id) done(`${CARDS[id].name} moved to ${to + 1} of ${arrangement.cards.length}`, before)
    },
    [apply, arrangement.cards, done],
  )

  /* THE KEYBOARD HAS TO LAND SOMEWHERE. Taking a card off unmounts
     the button that was just pressed, and React puts nothing in its
     place — measured: press "Take My quotes off the dashboard" with
     the keyboard and `document.activeElement` is `document.body`, so
     the next Tab starts again at the top of the rail. In a mode whose
     whole purpose is to take several cards off in a row, that is the
     work being thrown away between each one.

     ADD A CARD is where it goes. It is the inverse act, it is the last
     thing in the grid, it is the one control arrange mode always draws
     however many cards are left — including none, which is the case a
     "focus the next card" rule cannot answer — and it leaves the
     remaining cards one Shift+Tab behind the caret. The frame's wait is
     for React to commit the removal first; the toast that says what
     happened is already `aria-live` and is not disturbed by this. */
  const dropCard = useCallback(
    (id: CardId) => {
      const before = apply((a) => withCardRemoved(a, id))
      done(`${CARDS[id].name} taken off the dashboard`, before)
      requestAnimationFrame(() => {
        document.getElementById('dsh-add')?.focus()
      })
    },
    [apply, done],
  )

  const addCard = useCallback(
    (id: CardId) => {
      const before = apply((a) => withCardAdded(a, id))
      done(`${CARDS[id].name} added`, before)
    },
    [apply, done],
  )

  /* THE LINK MOVE IS OVER THE **DRAWN** LIST, and the stored one
     may be longer — a link whose table is gone is kept and not
     drawn (see links.ts). So the drawn indices are translated
     back to stored ones before anything is written; moving the
     second visible button must not move the second stored one. */
  const moveLink = useCallback(
    (from: number, to: number) => {
      const drawn = resolved.live
      const a = arrangement.links.findIndex((l) => l.id === drawn[from]?.id)
      const b = arrangement.links.findIndex((l) => l.id === drawn[to]?.id)
      if (a < 0 || b < 0) return
      const before = apply((x) => withLinksMoved(x, a, b))
      done(`${drawn[from].label} moved to ${to + 1} of ${drawn.length}`, before)
    },
    [apply, arrangement.links, resolved.live, done],
  )

  /* SAME LANDING AS `dropCard` ABOVE, for the same measured reason:
     the pressed button is unmounted and the keyboard falls to
     `document.body`. "Add a fast action" is the row's own inverse and
     is always drawn while arranging. */
  const dropLink = useCallback(
    (id: string, label: string) => {
      const before = apply((a) => withLinkRemoved(a, id))
      done(`${label} taken off the fast actions`, before)
      requestAnimationFrame(() => {
        document.getElementById('dsh-fast-add')?.focus()
      })
    },
    [apply, done],
  )

  const renameLink = useCallback(
    (id: string, name: string, was: string) => {
      const before = apply((a) => withLinkRenamed(a, id, name))
      const clean = name.trim()
      done(clean ? `${was} is now “${clean}”` : `${was} is called what it opens again`, before)
    },
    [apply, done],
  )

  const addLink = useCallback(
    (target: LinkTarget, label: string) => {
      const before = apply((a) => withLinkAdded(a, target))
      done(`${label} added to the fast actions`, before)
    },
    [apply, done],
  )

  const startAgain = useCallback(() => {
    const before = apply(() => defaultArrangement())
    done('Dashboard set back to the one everybody starts with', before)
  }, [apply, done])

  /* -- the card grid -------------------------------------- */

  const reorder = useReorder({
    count: arrangement.cards.length,
    onMove: moveCard,
    slotAttr: 'data-dsh-card',
  })
  const spring = transitionFor(still || reorder.instant, SPRING)

  const now = new Date()
  const stamp = now.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="dsh">
      {/* ATMOSPHERE, AND NOTHING ELSE. A sibling of the scroller so
          it holds still while the cards move past it; every stop is
          under 6% alpha, so no ratio measured on the ink ramp
          changes because it is there. */}
      <div className="dsh-sky ds-aurora" aria-hidden="true" />

      {/* THE RESTING DASHBOARD DOES NOT SCROLL, AND ARRANGE MODE
          DOES. An overview you have to scroll is a list (PHASE_TWO
          §1c), so the cards size to the space instead of stacking
          past the bottom of it — measured before this pass, the
          page overflowed by 51px at 1440x900, 469px at 1280x800 and
          799px at 1024x768.

          Arrange mode is the one exception and it is a mode, not
          the screen: it adds a tray of every card and link this
          build has, and squeezing that into a fixed box would give
          a person a 40px-tall list to pick from. It is entered
          deliberately, it is left the same way, and nothing is
          measured in it. */}
      <div className={`dsh-in${arranging ? ' is-arranging' : ''}`}>
        <header className="dsh-head ds-rise">
          <div className="dsh-head-say">
            {/* A GREETING IS NOT THE SUBJECT, AND IT WAS THE HERO.
                Measured at 1280x800 on the real seed: "Good
                afternoon, Asaf" set at 32.7px in Archivo and was, by
                a factor of 2.2, the largest glyph on the front door.
                The second largest was 15px — the card names, the
                door names, every heading on the screen. So the one
                thing this dashboard set at display size was a hello,
                and the things it exists to show were all one step
                above a caption.

                IT IS STILL HERE AND IT IS STILL AN `h1`. Heading
                level is structure, not size: a screen still owes a
                reader one top-level heading and this is it. What
                changed is that it stopped shouting. The greeting and
                the date are now one line of the header's own
                caption — who is here and what day it is, which is
                the whole of what they ever said.

                WHAT TOOK THE DISPLAY STEP IS THE SUBJECT: the doors
                downstairs (`.dsh-door-name`, --t-display-xl) and the
                pipeline figure on the quotes card (`.dsh-worth-n`,
                --t-figure-xl). Both are counted from the store, and
                neither is a courtesy.

                AND THE DOORS ARE NOW THE LARGER OF THE TWO, which
                they were not when the tier landed. At 1280 the door
                name is 34.00px against the figure's 33.43px, so the
                front door reads at 3.09x whether or not a quote has
                been raised — it was 2.44x on an empty book and 3.04x
                on a drafted one, because the only display-tier step
                on the screen was the one an empty book does not
                draw. */}
            <h1 className="dsh-hail">
              {greeting(now)}, {firstName(user.name)}
            </h1>
            <p className="ds-label dsh-stamp">{stamp}</p>
          </div>

          {/* ============================================================
              THE COUNTED FIGURES, BACK AS A QUIET STRIP.

              DECISIONS.md §3, settled by the owner 2026-09-09: §1's
              objection was to counts as the SUBJECT of a screen, not
              to counts existing, and §2.1 — the later, narrower
              statement — asks for them back "as a quiet strip, not as
              the subject". PHASE_TWO §1 and §2.1 are amended to match.

              IT IS IN THE HEADER BECAUSE THAT IS THE ONE PLACE IT
              COSTS NOTHING. Measured at 1280x800 on the real seed
              when it landed: the header band was 49.7px tall and
              992px wide, of which the greeting used 290 and the Edit
              button 90 — about 600px of the page holding nothing at
              all. Meanwhile the grid below it was 638.3px and the
              modules card was already running 975px of tiles through
              a 509px window. A strip in its own row, above or below
              the grid, is height taken straight off that window.
              On the greeting's own line it takes none: the header is
              as tall as `.dsh-head-say`, and 16px of caption cannot
              raise that. That still holds now the greeting is a
              caption too — the header is bounded by the Edit
              button's own 32px, and all three of these lines fit
              inside it with room over.

              IT DOES NOT OUTRANK ANYTHING, AND IT NOW HAS LESS TO
              OUTRANK. It was written against a 33px display
              greeting; the greeting is a 12px caption since the
              display tier landed, so the strip and the greeting are
              the same step. That is correct rather than a problem —
              they are two halves of one header caption, one about
              the person and one about the file, and neither is the
              subject. What the strip must not outrank is the DOORS
              and the DRAFTS, and those are now 26.9px and 33.4px at
              1280 against its 12: it is quieter relative to the
              subject than it has ever been. Tertiary ink on the page
              ground, no surface, no rule, no elevation, nothing
              pressable. The lit cards below are still the only paper
              on the screen.

              IT IS NOT A CARD AND IT IS NOT ARRANGEABLE, which is
              why Edit does not offer to take it off. It belongs to
              the same class as the date stamp above the greeting —
              the header's own caption, about the file rather than
              about the day's work.

              NOTHING ANIMATES. `.ds-rise` on the header is the
              entrance the greeting already had and this rides it;
              there is no count-up and no transition on the figures,
              because a figure that moves is a figure a person waits
              for before they can read it.
              ============================================================ */}
          {census ? (
            <p className="dsh-strip">
              <span className="dsh-strip-n">{census.rows.n}</span>
              {` ${census.rows.noun} ${census.joiner} `}
              <span className="dsh-strip-n">{census.tables.n}</span>
              {` ${census.tables.noun}`}
            </p>
          ) : null}

          <div className="dsh-head-acts">
            {arranging ? (
              <Button tone="ghost" onClick={startAgain}>
                Start again
              </Button>
            ) : null}
            {/* "Edit", not "Arrange". Arranging is what the mode
                DOES, and it was named for the mechanism rather
                than for the person's intent — you press it
                because you want to change your dashboard, and
                every other application in the world calls that
                Edit.

                NEUTRAL IN BOTH STATES. Button draws no look for
                `aria-pressed` (reported as the gap it is), so the
                state is carried by the word and the glyph — Done
                and an X while the mode is on — and the attribute
                still announces it. */}
            <Button
              tone="neutral"
              glyph={
                arranging ? (
                  <X size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                ) : (
                  <Sliders size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                )
              }
              aria-pressed={arranging}
              onClick={() => {
                setArranging((v) => !v)
                setTray(null)
              }}
            >
              {arranging ? 'Done' : 'Edit'}
            </Button>
          </div>
        </header>

        {/* THE PARAGRAPH THAT WAS HERE IS GONE, AND THIS COMMENT IS
            ITS ENTIRE REPLACEMENT.

            "This is the dashboard everybody starts with. Press
            Arrange to choose what is on it, what it is called and
            what order it goes in." — twenty-four words, on the
            screen a person sees most often, explaining a button
            eighteen pixels away that says Arrange. Measured at
            1600x1000 it was 24 of the 246 visible words on this
            surface and the single largest run of prose on it.

            The button is the explanation. If Arrange is not
            self-evident the fix is a better button, not a paragraph
            defending it. */}
        <QuickLinks
          links={resolved.live}
          stranded={resolved.stranded}
          arranging={arranging}
          acts={acts}
          onMove={moveLink}
          onRemove={dropLink}
          onRename={renameLink}
          onAdd={() => setTray('links')}
        />

        {arranging && tray !== null ? (
          <Tray
            kind={tray}
            cardOffers={spare}
            linkOffers={offers}
            onAddCard={addCard}
            onAddLink={addLink}
            onClose={() => setTray(null)}
          />
        ) : null}

        <div className="dsh-grid" ref={reorder.containerRef}>
          {reorder.order.map((original, slot) => {
            const id = arrangement.cards[original]
            if (!id) return null
            return (
              <motion.section
                layout
                transition={spring}
                key={id}
                data-dsh-card=""
                /* THE GRID READS THIS, and grants it only when
                   the column is wide enough for four tracks and
                   the card is not currently drawing its empty
                   sentence — both conditions live in
                   dashboard.css, where the width that decides
                   them is known. See `CardMeta.wide`. */
                data-wide={CARDS[id].wide ? '' : undefined}
                /* AND THIS ONE ASKS FOR BOTH ROWS. The grid flows
                   down a column before it moves right, so a card
                   spanning two rows takes a column to itself and
                   the two half-height cards stack beside it. */
                data-tall={CARDS[id].tall ? '' : undefined}
                /* THE SECTION IS A SHELL, NOT A SURFACE. The layout
                   spring writes its transform here, and the grid
                   reads `data-tall` / `data-wide` here; the paper
                   is the <Card> inside it, which this feature does
                   not paint. `.dsh-card` is a one-cell grid so the
                   Card fills its row without a property being set
                   on the primitive's own element. */
                className="dsh-card ds-fade"
                style={{ ['--i' as string]: slot }}
                aria-label={CARDS[id].name}
              >
                {/* flat while arranging: a card being moved about
                    has no business casting a shadow, and the grip
                    in its head is the affordance. No held state is
                    drawn — the card is visibly moving, which is the
                    feedback, and `aria-current` would be a lie. */}
                <Card tone={arranging ? 'flat' : 'raised'} pad="none">
                  <div className="dsh-card-head">
                    {/* THE CARD'S NAME IS A SECTION CAPTION — the one
                        uppercase style, drawn by SectionHead, and
                        still the h2 a screen reader navigates by.
                        It is chrome: at the label step it cannot
                        outrank the doors and the drafts, which is
                        the whole point of the display tier below
                        it. The mark that sat beside it is gone with
                        the rule that drew it. */}
                    <SectionHead
                      level="h2"
                      rule
                      action={
                        arranging ? (
                          <>
                            <button
                              type="button"
                              className="dsh-grip"
                              aria-label={`Move ${CARDS[id].name}. Arrow keys move it.`}
                              {...reorder.handleProps(original)}
                            >
                              <DotsSixVertical size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                            </button>
                            <Button
                              tone="danger"
                              size="sm"
                              aria-label={`Take ${CARDS[id].name} off the dashboard`}
                              onClick={() => dropCard(id)}
                            >
                              <X size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                            </Button>
                          </>
                        ) : openFor(id, acts) ? (
                          /* THE DOOR OUT OF THE CARD. One control,
                             one position, one word — and only where
                             there is somewhere to go: `openFor`
                             returns nothing for the activity log,
                             which is complete on the card. */
                          <Button
                            tone="ghost"
                            size="sm"
                            aria-label={`Open ${CARDS[id].name}`}
                            onClick={openFor(id, acts)}
                          >
                            <span className="dsh-open-say">Open</span>
                            <ArrowUpRight size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                          </Button>
                        ) : undefined
                      }
                    >
                      {CARDS[id].name}
                    </SectionHead>
                  </div>
                  <div className="dsh-card-body">
                    <CardBody
                      id={id}
                      me={user.name}
                      userId={user.id}
                      orgSlug={user.orgSlug}
                      acts={acts}
                    />
                  </div>
                </Card>
              </motion.section>
            )
          })}

          {arranging ? (
            /* A SUNKEN CARD THAT ACTIVATES: card.css calls that tone
               "an empty slot, a drop target, a placeholder", which
               is exactly what a card-shaped hole in the grid is. The
               id is where the keyboard lands after a card is taken
               off — see `dropCard`. */
            <Card tone="sunken" pad="none" id="dsh-add" onActivate={() => setTray('cards')}>
              <span className="dsh-add-in">
                <span aria-hidden="true">
                  <Plus size={ICON_SIZE.medium} weight={weightFor(ICON_SIZE.medium)} />
                </span>
                <span className="ds-small">
                  {spare.length > 0
                    ? `Add a card — ${spare.length} left`
                    : 'Every card is already on'}
                </span>
              </span>
            </Card>
          ) : null}
        </div>

        {arrangement.cards.length === 0 && !arranging ? (
          <div className="dsh-bare">
            {/* THE CONTROL IS CALLED EDIT, so this says Edit. The
                header's button was renamed and these two were not,
                so the one screen with nothing on it told a person to
                press a word that appears nowhere on it. */}
            <p className="dsh-bare-say ds-body">
              Your dashboard has no cards on it. That is a choice this app will
              keep — press Edit to put some back.
            </p>
            <Button tone="primary" onClick={() => setArranging(true)}>
              Edit
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
