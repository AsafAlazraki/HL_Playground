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
import { DotsSixVertical, Plus, Sliders, X } from '@phosphor-icons/react'
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
import { linkOffers, resolveLinks } from './links'
import { QuickLinks } from './QuickLinks'
import { CardBody, CardMark } from './CardBody'
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
            say({ text: `Undone — ${text.toLowerCase()}` })
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

  /* -- the acts ------------------------------------------- */

  const moveCard = useCallback(
    (from: number, to: number) => {
      const id = arrangement.cards[from]
      const before = apply((a) => withCardsMoved(a, from, to))
      if (id) done(`${CARDS[id].name} moved to ${to + 1} of ${arrangement.cards.length}`, before)
    },
    [apply, arrangement.cards, done],
  )

  const dropCard = useCallback(
    (id: CardId) => {
      const before = apply((a) => withCardRemoved(a, id))
      done(`${CARDS[id].name} taken off the dashboard`, before)
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

  const dropLink = useCallback(
    (id: string, label: string) => {
      const before = apply((a) => withLinkRemoved(a, id))
      done(`${label} taken off the fast actions`, before)
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

      <div className="dsh-in">
        <header className="dsh-head ds-rise">
          <div className="dsh-head-say">
            <p className="ds-label dsh-stamp">{stamp}</p>
            <h1 className="ds-display-lg dsh-hail">
              {greeting(now)}, {firstName(user.name)}
            </h1>
            <p className="dsh-who ds-small">
              {user.title} · {user.orgName}
            </p>
          </div>

          <div className="dsh-head-acts">
            {arranging ? (
              <button type="button" className="dsh-restart" onClick={startAgain}>
                Start again
              </button>
            ) : null}
            <button
              type="button"
              className={`dsh-arrange${arranging ? ' is-on' : ''}`}
              aria-pressed={arranging}
              onClick={() => {
                setArranging((v) => !v)
                setTray(null)
              }}
            >
              <span className="dsh-arrange-mark" aria-hidden="true">
                {arranging ? (
                  <X size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                ) : (
                  <Sliders size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                )}
              </span>
              {arranging ? 'Done' : 'Arrange'}
            </button>
          </div>
        </header>

        {/* SAID ONCE, AND THEN NEVER AGAIN. `touched` is false only
            until the person changes something; a permanent hint is
            a permanent apology. */}
        {!arrangement.touched && !arranging ? (
          <p className="dsh-hint ds-small">
            This is the dashboard everybody starts with. Press Arrange to choose
            what is on it, what it is called and what order it goes in.
          </p>
        ) : null}

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
                /* NOT `.ds-lit`. That utility sets `box-shadow`
                   outright, and this card's own rule sets
                   `box-shadow` too — one of them would silently
                   win. The lit top edge is written into
                   `.dsh-card` beside its elevation instead, which
                   is the same light and only one declaration. */
                className={`dsh-card ds-fade${arranging ? ' is-arranging' : ''}${
                  reorder.held === slot ? ' is-held' : ''
                }`}
                style={{ ['--i' as string]: slot }}
                aria-label={CARDS[id].name}
              >
                <header className="dsh-card-head">
                  {arranging ? (
                    <button
                      type="button"
                      className="dsh-grip"
                      aria-label={`Move ${CARDS[id].name}. Arrow keys move it.`}
                      {...reorder.handleProps(original)}
                    >
                      <DotsSixVertical size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                    </button>
                  ) : (
                    <span className="dsh-card-mark" aria-hidden="true">
                      <CardMark id={id} />
                    </span>
                  )}
                  <h2 className="dsh-card-name ds-heading">{CARDS[id].name}</h2>
                  {arranging ? (
                    <button
                      type="button"
                      className="dsh-drop"
                      aria-label={`Take ${CARDS[id].name} off the dashboard`}
                      onClick={() => dropCard(id)}
                    >
                      <X size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
                    </button>
                  ) : null}
                </header>
                <div className="dsh-card-body">
                  <CardBody id={id} me={user.name} acts={acts} />
                </div>
              </motion.section>
            )
          })}

          {arranging ? (
            <button
              type="button"
              className="dsh-card dsh-add"
              onClick={() => setTray('cards')}
            >
              <span className="dsh-add-mark" aria-hidden="true">
                <Plus size={ICON_SIZE.medium} weight={weightFor(ICON_SIZE.medium)} />
              </span>
              <span className="dsh-add-say ds-small">
                {spare.length > 0
                  ? `Add a card — ${spare.length} left`
                  : 'Every card is already on'}
              </span>
            </button>
          ) : null}
        </div>

        {arrangement.cards.length === 0 && !arranging ? (
          <div className="dsh-bare">
            <p className="dsh-bare-say ds-body">
              Your dashboard has no cards on it. That is a choice this app will
              keep — press Arrange to put some back.
            </p>
            <button type="button" className="dsh-act" onClick={() => setArranging(true)}>
              Arrange
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
