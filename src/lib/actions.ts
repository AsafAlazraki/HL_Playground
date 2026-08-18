/* ============================================================
   THE ACTION BAR'S REGISTER — what the page you are on can DO.

   THE INSTRUCTION THIS ANSWERS, verbatim in docs/specs/ACTION_BAR.md:
   "Reminder again that the bottom bar should have all of the actions
   and things in it. As a secondary bottom bar. think an action bar
   slightly above it with actions relevant to the page you are on when
   needed. smaller."

   THE MEASUREMENT. The register spent THREE STACKED BARS before a row
   of data — back/title/doors, then search plus seven controls, then
   the sections strip — 131px of chrome at 1440, on every screen,
   whether or not anybody was using any of it. That is the same fault
   the 260px rail had, and this design killed the rail for exactly
   that reason ("the first table row drawn 608px down a 744px
   column"). The register then grew three bars back on top of the
   page.

   WHY A REGISTER AND NOT A PROP. The bar is drawn inside `.dk-wrap`,
   beside the dock — it is furniture, fixed to the window, and it is
   deliberately NOT inside the stage whose actions it carries. So a
   stage cannot hand it anything by prop: they are siblings. This is a
   module-level store read through `useSyncExternalStore`, exactly
   like `rowRevealState` and `tableFitState` next door, and for the
   same reason: it is SESSION state and nothing here may reach the
   project store, because everything written there persists to disk
   and exports, and which button is on a toolbar is not a fact about
   somebody's business.

   TWO PUBLISHERS, ONE BAR, AND THE ORDER IS DECLARED. A table page's
   actions come from two places that cannot see each other: the STAGE
   knows the doors (Fitment, Columns) and the SHEET inside it knows
   the register (search, sections, fit, the row commands). Neither can
   pass through the other without threading eight props through a
   component that has no opinion about any of them. So each publishes
   its own groups under its own key, and every group carries a `rank`
   — the bar flattens the lot and sorts. `rank` is the left-to-right
   reading of the bar, written down once, in one place, rather than
   being an accident of which component mounted first.

   IT LIVES IN `src/lib` BECAUSE BOTH SIDES IMPORT IT. The renderer is
   `src/app/ActionBar.tsx`; the publishers are a stage in `src/app`
   and a sheet in `src/features`. A feature importing from `src/app`
   would be a layering inversion the rest of this tree does not make,
   so the vocabulary sits under both. Nothing here imports the store,
   which is the rule `src/lib` already keeps.

   THE VOCABULARY IS CLOSED, ON PURPOSE. An action bar that took
   arbitrary JSX would be a second stylesheet within a month: every
   caller would size its own buttons and the bar would drift into
   eight bars that happen to share a position. Four shapes cover every
   control the register had and every one the other stages have —
   `button`, `search`, `panel`, `chip` — and the bar owns all of their
   type, spacing and states. A page that needs a fifth shape adds it
   here, where every page gets it.
   ============================================================ */
import { useLayoutEffect, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'

/** How loud a control is. There is at most ONE `primary` on a bar —
 *  see DESIGN_CONTRACT §1: "if a screen has accent everywhere,
 *  nothing on it is primary". */
export type ActionTone = 'plain' | 'primary' | 'danger'

export interface ActionButton {
  kind: 'button'
  id: string
  /** a verb, sentence case. Never uppercase — a button is one of the
   *  four things DESIGN_CONTRACT §3 names outright. */
  label: string
  /** The accessible name, when the visible words do not say WHICH
   *  thing this acts on. "Quote this one" is the right label on a page
   *  that IS one rig and the wrong accessible name for a reader who
   *  cannot see which rig — so the label stays short and this says
   *  "Quote Highfield - SP560 (PVC)". Never a different ACT from the
   *  one written on the button. */
  say?: string
  icon?: Icon
  tone?: ActionTone
  /** a latch, drawn and announced as `aria-pressed` */
  pressed?: boolean
  /**
   * WHY IT CANNOT ACT — rule 10, "anything that cannot be done says
   * why, where it is". Present means the control is inert.
   *
   * It is NOT the `disabled` attribute, and that is deliberate: a
   * disabled button drops out of the tab order and takes its own
   * explanation with it, which is the whole point of the sentence.
   * `BandStrip` set this precedent in this codebase — `aria-disabled`
   * plus a live guard on the press — and the bar follows it.
   */
  refusal?: string
  onPick: () => void
}

export interface ActionSearch {
  kind: 'search'
  id: string
  value: string
  placeholder: string
  /** the accessible name; the placeholder is not one */
  label: string
  onChange: (next: string) => void
}

export interface ActionPanel {
  kind: 'panel'
  id: string
  label: string
  /** a live second word on the control — "Sections · Capacity". The
   *  one thing a map has to say is where you are, and saying it on
   *  the closed control costs the page no height at all. */
  at?: string
  icon?: Icon
  /** accessible name of the panel this opens */
  panelLabel: string
  /** one sentence under the panel's heading, for the facts that
   *  belong with what is in it rather than on the bar */
  panelSay?: string
  /**
   * Shut the panel when a control inside it is pressed.
   *
   * Declared rather than inferred, because both answers are right for
   * different panels: a map — press a section, the sheet scrolls to it
   * — has done its job and must get out of the way so the person can
   * see the thing they asked for. A panel of latches has not.
   */
  closeOnAct?: boolean
  content: ReactNode
}

export interface ActionChip {
  kind: 'chip'
  id: string
  /** what sort of narrowing this is: "Search", "Filter", "Sort" */
  key: string
  /** the narrowing itself, in the dealer's own words */
  value: string
  /** the full sentence, for the accessible name */
  hint: string
  onRemove: () => void
}

export type ActionItem = ActionButton | ActionSearch | ActionPanel | ActionChip

export interface ActionGroup {
  id: string
  /**
   * WHERE IN THE BAR, LEFT TO RIGHT. Groups from every publisher are
   * sorted by this one number, so the reading of the bar is a fact
   * about the page rather than about mount order. The scale in use:
   *
   *   10  narrow it      — search
   *   20  what is narrowing it — the chips, and how to clear them
   *   30  see all of it  — sections, collapse, fit
   *   50  go somewhere about this subject — the doors
   *   90  change it      — delete, add
   *
   * Leave gaps. A page inserting one group between two others should
   * not have to renumber anybody else's.
   */
  rank: number
  items: ActionItem[]
}

/* ---------------------------------------------------------- */
/* the register                                               */
/* ---------------------------------------------------------- */

const byOwner = new Map<string, ActionGroup[]>()

/** The flattened, sorted answer. Cached, because `useSyncExternalStore`
 *  compares snapshots by identity and rebuilding this per read would
 *  re-render the bar forever. */
let snapshot: ActionGroup[] = []

const listeners = new Set<() => void>()

function rebuild(): void {
  const all: ActionGroup[] = []
  for (const groups of byOwner.values()) all.push(...groups)
  /* stable within a rank: two publishers that both claim 30 keep the
     order they were published in, which is at least deterministic */
  all.sort((a, b) => a.rank - b.rank)
  snapshot = all
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const read = (): ActionGroup[] => snapshot

/**
 * Publish (or, with `null`, retract) one owner's groups.
 *
 * Exported for tests and for callers outside a component. Inside one,
 * use `useActionBar` below, which retracts on unmount — a bar left
 * carrying a page that has closed is worse than no bar, because every
 * button on it points at something that is gone.
 */
export function publishActions(owner: string, groups: ActionGroup[] | null): void {
  if (groups === null || groups.length === 0) {
    if (!byOwner.delete(owner)) return
    rebuild()
    return
  }
  byOwner.set(owner, groups)
  rebuild()
}

/** What the bar would draw right now, without a renderer. The hook
 *  below reads through this, so a test reads exactly what a mounted
 *  bar does — the same arrangement `rowRevealOf` uses next door. */
export const pageActions = (): ActionGroup[] => snapshot

/** What the bar should draw right now. */
export function usePageActions(): ActionGroup[] {
  return useSyncExternalStore(subscribe, read, read)
}

const readAny = (): boolean => snapshot.length > 0

/**
 * Whether there is anything to draw — the shell asks this to decide
 * how much of the window the page may have.
 *
 * IT SUBSCRIBES TO THE BOOLEAN, NOT TO THE LIST, AND THAT IS LOAD
 * BEARING. Written as `usePageActions().length > 0` it subscribed to
 * the ARRAY's identity, so every republish re-rendered the SHELL — and
 * a shell render re-renders the stage, the register, and therefore the
 * groups the register publishes, which publishes again. Measured: "
 * Maximum update depth exceeded", raised from `rebuild`, on the first
 * table page opened. `useSyncExternalStore` compares snapshots with
 * `Object.is`, and two `true`s are the same value, so reading the
 * boolean directly ends the cycle at its source rather than papering
 * over it with a memo somewhere downstream.
 */
export function useHasPageActions(): boolean {
  return useSyncExternalStore(subscribe, readAny, readAny)
}

/**
 * Publish this component's actions for as long as it is mounted.
 *
 * `groups` is compared by identity, so a caller that builds it inside
 * a `useMemo` publishes only when something really changed. A caller
 * that does not is still correct — it simply republishes every render.
 *
 * A LAYOUT EFFECT, so the bar is right in the frame the page first
 * paints in. An ordinary effect would land it one frame late, and the
 * page would visibly open with the bar of the page before it.
 */
export function useActionBar(owner: string, groups: ActionGroup[] | null): void {
  useLayoutEffect(() => {
    publishActions(owner, groups)
  }, [owner, groups])

  /* THE RETRACTION IS ITS OWN EFFECT, keyed on the owner alone. Hung
     off the effect above it would fire on every republish — retract,
     notify, publish, notify — which is two forced re-renders of the
     bar for one changed label, and a frame in which the bar is empty
     if anything ever renders between them. Retracting is only ever
     right when this component, or this owner, is going away. */
  useLayoutEffect(() => () => publishActions(owner, null), [owner])
}
