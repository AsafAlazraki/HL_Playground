/* ============================================================
   Toasts — the summary strip the table speaks through.
   Bottom-centre, mono uppercase, auto-dismissing. No library:
   one hook, one host, three lines of CSS.
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
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

export function Toasts({
  items,
  onDismiss,
}: {
  items: ToastItem[]
  onDismiss: (id: number) => void
}): JSX.Element | null {
  if (items.length === 0) return null
  return (
    <div className="tb-toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={'tb-toast' + (t.tone === 'warn' ? ' tb-toast-warn' : '')}
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
        </div>
      ))}
    </div>
  )
}
