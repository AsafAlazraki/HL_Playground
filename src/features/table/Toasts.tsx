/* ============================================================
   Toasts — the summary strip the table speaks through.
   Bottom-centre, mono uppercase, auto-dismissing. No library:
   one hook, one host, three lines of CSS.
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SPRING_QUICK, transitionFor, useStillness } from '@/features/views/stillness'
import { CrossGlyph } from './glyphs'

export type ToastTone = 'info' | 'warn'

export interface ToastItem {
  id: number
  text: string
  tone: ToastTone
}

export interface ToastApi {
  items: ToastItem[]
  push: (text: string, tone?: ToastTone) => void
  dismiss: (id: number) => void
}

const DWELL = 4600
/** At most three stacked notes — older ones roll off. */
const MAX_ITEMS = 3

let seq = 0

export function useToasts(): ToastApi {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) {
      clearTimeout(t)
      timers.current.delete(id)
    }
    setItems((list) => list.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (text: string, tone: ToastTone = 'info') => {
      seq += 1
      const id = seq
      setItems((list) => [...list, { id, text, tone }].slice(-MAX_ITEMS))
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id)
          setItems((list) => list.filter((x) => x.id !== id))
        }, DWELL),
      )
    },
    [],
  )

  /* never leave a timer running past unmount */
  useEffect(() => {
    const map = timers.current
    return () => {
      for (const t of map.values()) clearTimeout(t)
      map.clear()
    }
  }, [])

  return { items, push, dismiss }
}

/* ============================================================
   THE STACK — the one place in this app where a keyframe was
   demonstrably the wrong tool.

   `.tb-toast` ran `animation: sheet-in`, a keyframe, on an element
   that is pushed rapidly and capped at three by `slice(-MAX_ITEMS)`
   above. Three failures followed from that, all of them visible:

     1. NOTHING EVER LEFT. Every toast in the app vanished on
        unmount — dismissed by hand, timed out, or rolled off the
        end of the stack — with no exit at all. apple-design §7:
        what enters one way is expected to leave the same way, and
        a note that pops out of existence reads as a glitch rather
        than as a dismissal.
     2. PUSH A FOURTH AND THE OLDEST IS DELETED MID-LIFE while the
        two survivors JUMP to new positions with no transition,
        because a column of absolutely-nothing-special divs has no
        opinion about its own reflow.
     3. Keyframes restart from zero and cannot be re-targeted
        (apple-design §3, emil-design-eng's "use transitions, not
        keyframes, for rapidly-triggered elements" — the reason
        Sonner exists). A toast pushed while the previous one is
        still animating had no way to blend.

   `AnimatePresence` gives (1) a real exit along the entry path,
   `layout` gives (2) a settle instead of a jump, and a spring gives
   (3) interruptibility for free. Same 220ms response as any other
   dense, frequently-seen list.

   THE ENTRY PATH IS 8px DOWN AND 0.96 SCALE, never `scale(0)`:
   nothing in the physical world arrives from nothing, and the exit
   mirrors it exactly so a dismissal is the entry played backwards.
   ============================================================ */

export function Toasts({
  items,
  onDismiss,
}: {
  items: ToastItem[]
  onDismiss: (id: number) => void
}): JSX.Element {
  const { still } = useStillness()
  /* The host stays mounted even with nothing in it. Unmounting it on
     an empty list took the exit animation with it — there was no
     parent left for `AnimatePresence` to hold the leaving toast in.
     An empty host is a zero-size, `pointer-events: none` box. */
  return (
    <div className="tb-toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            className={'tb-toast' + (t.tone === 'warn' ? ' tb-toast-warn' : '')}
            layout={still ? false : 'position'}
            initial={still ? false : { opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={transitionFor(still, SPRING_QUICK)}
          >
            <span className="tb-toast-rule" aria-hidden="true" />
            <span className="tb-toast-text">{t.text}</span>
            <button
              type="button"
              className="tb-toast-x"
              aria-label="Dismiss message"
              title="Dismiss"
              onClick={() => onDismiss(t.id)}
            >
              <CrossGlyph />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
