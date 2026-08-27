/* ============================================================
   REORDERING — the one gesture on this page.

   WHY A SPRING AND NOT A TRANSITION. DESIGN_PRINCIPLES §4:
   "springs own anything a person can grab". Dragging a card into
   a new place is exactly that, and it is the only thing on the
   dashboard a person grabs — everything else here is a press, so
   everything else here is a CSS transition. The spring is
   `SPRING` from `features/views/stillness.tsx`: ζ 1.0, response
   300ms, no bounce, because this drag carries no momentum (§4
   again — overshoot is reserved for a flick or a throw).

   WHAT THE CARD DOES WHILE IT IS HELD, AND WHAT IT DOES NOT.
   It does not free-follow the pointer. It LIFTS — elevation and
   a ring, no transform — and it moves between slots, springing,
   as the pointer crosses them. That is a decision and not a
   shortcut:

     · a card that free-follows has to be transformed by hand
       while the layout spring is also transforming it, and the
       two fight on every frame the spring has not settled;
     · §4 says a list ROW darkens rather than scaling so its
       neighbours do not look like they moved — a lifted card
       that also grew would be that mistake at card size, where
       0.97 on a 236px card is a 7px shrink and reads as a glitch.

   So the grab is expressed in light, and the movement is
   expressed in the spring, and nothing on this page is animated
   by two systems at once.

   THE KEYBOARD MOVES IT TOO, AND MOVES IT INSTANTLY. §4:
   "never animate a keyboard-initiated action". Arrow keys on the
   handle reorder with no motion at all, which is also the only
   way this is usable without a pointer. `instant` is the flag
   that says so, cleared on the next frame so the following drag
   springs again.

   THE HIT TEST IS ARITHMETIC AND HAS A TEST. `slotAt` takes
   rectangles and a point and returns an index; it knows nothing
   about the DOM, so the one part of a drag that can be wrong in
   a way nobody notices is the part that is checked.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { moveItem } from './arrangement'

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

const centreOf = (r: Rect): { x: number; y: number } => ({
  x: (r.left + r.right) / 2,
  y: (r.top + r.bottom) / 2,
})

/** WHICH SLOT A POINTER IS OVER.
 *
 *  Inside one → that one. Outside all of them → the NEAREST by
 *  centre distance, never -1: a grid has gaps between its cards
 *  and a gutter down each side, and a drag that stops answering
 *  the moment the pointer is between two cards is a drag that
 *  feels broken for most of its travel. -1 is reserved for the
 *  one case where there is genuinely no answer: no slots at all.
 *
 *  Rectangles are in the pointer's own coordinate space, so a
 *  caller measuring with `getBoundingClientRect` must use client
 *  coordinates. Both are viewport-relative; mixing them is the
 *  mistake this note exists to prevent. */
export function slotAt(slots: readonly Rect[], x: number, y: number): number {
  if (slots.length === 0) return -1
  for (let i = 0; i < slots.length; i += 1) {
    const s = slots[i]
    if (x >= s.left && x <= s.right && y >= s.top && y <= s.bottom) return i
  }
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let i = 0; i < slots.length; i += 1) {
    const c = centreOf(slots[i])
    const d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y)
    if (d < bestDistance) {
      bestDistance = d
      best = i
    }
  }
  return best
}

/** The indices to draw while a drag is in flight: `count` slots
 *  with the one being dragged shown in the slot the pointer is
 *  over. Identity when nothing is being dragged. */
export function previewOrder(count: number, from: number, to: number): number[] {
  const identity = Array.from({ length: count }, (_, i) => i)
  if (from < 0 || to < 0) return identity
  return moveItem(identity, from, to)
}

export interface ReorderApi {
  /** original indices in the order they should be DRAWN */
  order: number[]
  /** the index (in the drawn order) currently held, or -1 */
  held: number
  /** true for exactly one commit after a keyboard move */
  instant: boolean
  /** put this on the scroller/grid that holds the slots */
  containerRef: (el: HTMLElement | null) => void
  /** put these on each item's grab handle. Two, not five: the rest
   *  of the drag is bound to the window — see `begin` below. */
  handleProps: (index: number) => {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
    onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void
  }
}

export interface ReorderOptions {
  count: number
  /** commit — called once, on release, and only when the item
   *  actually ended up somewhere else */
  onMove: (from: number, to: number) => void
  /** the attribute the slots carry, so the hook can measure them
   *  without knowing anything about the markup */
  slotAttr: string
}

export function useReorder({ count, onMove, slotAttr }: ReorderOptions): ReorderApi {
  const container = useRef<HTMLElement | null>(null)
  const slots = useRef<Rect[]>([])
  const [from, setFrom] = useState(-1)
  const [to, setTo] = useState(-1)
  const [instant, setInstant] = useState(false)

  /* the live drag, in refs as well as in state — see the note on
     `begin` below for why the handlers cannot read the state */
  const fromLive = useRef(-1)
  const toLive = useRef(-1)
  const detach = useRef<(() => void) | null>(null)

  /* the commit, always the current one, without re-binding a
     window listener every render */
  const commit = useRef(onMove)
  commit.current = onMove

  /* one frame of no motion, then back to the spring — see the
     header. Cleared by a frame rather than a timer so it cannot
     outlive the render it was raised for. */
  useEffect(() => {
    if (!instant) return
    const id = requestAnimationFrame(() => setInstant(false))
    return () => cancelAnimationFrame(id)
  }, [instant])

  /* a drag must not outlive the surface it started on */
  useEffect(() => () => detach.current?.(), [])

  const measure = useCallback((): void => {
    const el = container.current
    if (!el) {
      slots.current = []
      return
    }
    slots.current = [...el.querySelectorAll<HTMLElement>(`[${slotAttr}]`)].map((node) => {
      const r = node.getBoundingClientRect()
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
    })
  }, [slotAttr])

  const containerRef = useCallback((el: HTMLElement | null) => {
    container.current = el
  }, [])

  /* ============================================================
     THE DRAG IS BOUND TO THE WINDOW, AND THAT IS A FIX, NOT A
     STYLE CHOICE.

     The first version put `onPointerMove` / `onPointerUp` on the
     handle and called `setPointerCapture` on pointer-down, which
     is the ordinary way to do this and is wrong HERE for a
     specific reason: this drag REORDERS ITS OWN DOM. As the
     preview order changes, React moves the card — and the grip
     inside it — with `insertBefore`, which is a removal followed
     by an insertion. Pointer capture is released when the
     capturing element leaves the document, so from the first slot
     the pointer crossed, the capture was gone and every later
     event went to whatever was under the cursor instead.

     MEASURED, before the fix: the card followed the pointer
     correctly, `pointerup` never reached the handler, the card
     stayed lifted after the mouse was released, and no move was
     ever committed — a drag that looked like it worked and did
     nothing. Bound to the window, the listeners survive the
     element being moved, which is the whole requirement.

     AND THE HANDLERS READ REFS, NOT STATE. They are closures made
     once per drag; the state they captured would be the state at
     pointer-down for the entire gesture.
     ============================================================ */
  const begin = useCallback(
    (index: number, e: ReactPointerEvent<HTMLElement>): void => {
      /* THE PRIMARY BUTTON ONLY. A right-click on a handle is a
         context menu, not the start of a drag. */
      if (e.button !== 0) return
      /* one drag at a time */
      detach.current?.()
      e.preventDefault()
      measure()

      fromLive.current = index
      toLive.current = index
      setFrom(index)
      setTo(index)

      const onPointerMove = (ev: PointerEvent): void => {
        if (fromLive.current < 0) return
        const next = slotAt(slots.current, ev.clientX, ev.clientY)
        if (next >= 0 && next !== toLive.current) {
          toLive.current = next
          setTo(next)
        }
      }

      const finish = (keep: boolean): void => {
        const a = fromLive.current
        const b = toLive.current
        fromLive.current = -1
        toLive.current = -1
        setFrom(-1)
        setTo(-1)
        off()
        if (keep && a >= 0 && b >= 0 && b !== a) commit.current(a, b)
      }

      const onPointerUp = (): void => finish(true)
      /* A CANCELLED DRAG PUTS EVERYTHING BACK. The browser cancels
         a pointer when a scroll takes over or the window loses it,
         and committing a half-finished drag would move a card the
         person never let go of. */
      const onPointerCancel = (): void => finish(false)

      const off = (): void => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerCancel)
        detach.current = null
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('pointercancel', onPointerCancel)
      detach.current = off
    },
    [measure],
  )

  const handleProps = useCallback(
    (index: number) => ({
      onPointerDown: (e: ReactPointerEvent<HTMLElement>): void => begin(index, e),
      onKeyDown: (e: ReactKeyboardEvent<HTMLElement>): void => {
        const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp'
        const on = e.key === 'ArrowRight' || e.key === 'ArrowDown'
        if (!back && !on) return
        const target = index + (back ? -1 : 1)
        if (target < 0 || target >= count) return
        e.preventDefault()
        setInstant(true)
        commit.current(index, target)
      },
    }),
    [count, begin],
  )

  return {
    order: previewOrder(count, from, to),
    held: to,
    instant,
    containerRef,
    handleProps,
  }
}
