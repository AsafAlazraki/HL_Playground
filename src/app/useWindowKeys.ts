/* ============================================================
   WINDOW KEYS — the shortcuts a desktop is expected to have.

   THE CONSTRAINT THAT SHAPES ALL OF THIS: this app is made of
   editable grids. A bare key handler on the window would eat the
   `w` of every word typed into a cell, and a bare Escape would
   fight the grid's own revert-this-edit. Shell.tsx has said "NO
   WINDOW KEY HANDLER" since it was written, and it was right.

   So every shortcut here is MODIFIER-GATED - Cmd on a Mac, Ctrl
   elsewhere - which is exactly what a desktop shortcut is anyway.
   Nothing plain is bound. Typing is never touched.

     Cmd/Ctrl + Tab      cycle windows, most-recent first, with
                         the switcher showing while held
     Cmd/Ctrl + `        cycle in the other direction
     Cmd/Ctrl + W        close the focused window
     Cmd/Ctrl + M        minimise it to the dock
     Cmd/Ctrl + 1..9     focus the nth window
     Cmd/Ctrl + Ctrl + F zoom (macOS's own fill-the-screen)

   THE SWITCHER IS HELD, NOT TOGGLED, like the real one: it appears
   on the first Tab while the modifier is down, moves with each
   further Tab, and commits when the modifier is released. That
   release is why this listens for keyup on the modifier itself.
   ============================================================ */

import { useEffect, useRef, useState } from 'react'

export interface WindowKeysApi {
  /** ids, bottom of the stack first — the last is focused */
  ids: string[]
  raise: (id: string) => void
  close: (id: string) => void
  minimise: (id: string) => void
  zoom: (id: string) => void
}

export function useWindowKeys({ ids, raise, close, minimise, zoom }: WindowKeysApi) {
  /* while the switcher is up this is the index into the MRU order;
     null means it is not up */
  const [pick, setPick] = useState<number | null>(null)
  const api = useRef({ ids, raise, close, minimise, zoom })
  api.current = { ids, raise, close, minimise, zoom }

  useEffect(() => {
    /* most-recently-used order: the focused window first, which is
       what makes a single Tab flip between the last two — the
       behaviour people actually use the switcher for */
    const mru = () => [...api.current.ids].reverse()

    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      const list = mru()
      if (list.length === 0) return

      if (e.key === 'Tab' || e.key === '`') {
        e.preventDefault()
        const back = e.shiftKey || e.key === '`'
        setPick((p) => {
          const cur = p ?? 0
          const n = list.length
          return (cur + (back ? -1 : 1) + n) % n
        })
        return
      }

      const focused = list[0]
      if (!focused) return

      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        api.current.close(focused)
        return
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        api.current.minimise(focused)
        return
      }
      if ((e.key === 'f' || e.key === 'F') && e.ctrlKey && e.metaKey) {
        e.preventDefault()
        api.current.zoom(focused)
        return
      }
      if (/^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1
        const target = api.current.ids[i]
        if (target) {
          e.preventDefault()
          api.current.raise(target)
        }
      }
    }

    /* COMMIT ON RELEASE OF THE MODIFIER, which is what makes it a
       held switcher rather than a dialog. */
    const onUp = (e: KeyboardEvent) => {
      if (e.key !== 'Meta' && e.key !== 'Control') return
      setPick((p) => {
        if (p === null) return null
        const target = mru()[p]
        if (target) api.current.raise(target)
        return null
      })
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onUp)
    /* a lost blur must not strand the switcher on screen */
    window.addEventListener('blur', () => setPick(null))
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  const order = [...ids].reverse()
  return { switcher: pick === null ? null : { order, index: pick } }
}
