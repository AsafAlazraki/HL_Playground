/* ============================================================
   A WINDOW.

   The app is a desktop. A module, a table, the rules, a quote —
   each is an APP, and opening one opens a window: draggable by
   its titlebar, raised when you touch it, closed by the red
   light, zoomed by the green one, and standing beside the others
   rather than replacing them.

   That last clause is the whole point of the change. Every one of
   these used to be a "stage" — a single slot, so opening a table
   closed the rules, and comparing two tables was impossible. A
   person configuring a boat wants the boat, the motors that fit
   it and the quote open at once, which is what a desktop is FOR.

   THE TRAFFIC LIGHTS ARE REAL CONTROLS, not decoration: close,
   minimise to the dock, and zoom to fill the desktop. They are
   grey until the pointer is over the window, exactly as they are
   on a Mac, so an unfocused window is quiet.

   DRAGGING USES POINTER CAPTURE and moves the window 1:1 with the
   pointer from wherever it was grabbed — never snapping the
   titlebar to the cursor, which is the thing that instantly
   reads as fake.
   ============================================================ */

import { useCallback, useRef } from 'react'
import type { ReactNode } from 'react'

export interface WinFrame {
  x: number
  y: number
  w: number
  h: number
}

export interface WinProps {
  title: ReactNode
  frame: WinFrame
  z: number
  focused: boolean
  zoomed: boolean
  /** playing its exit — see the note in Shell.tsx */
  leaving?: 'closing' | 'minimising'
  onFocus: () => void
  onClose: () => void
  onMinimise: () => void
  onZoom: () => void
  onMove: (xy: { x: number; y: number }) => void
  children: ReactNode
}

export function Win({
  title,
  frame,
  z,
  focused,
  zoomed,
  leaving,
  onFocus,
  onClose,
  onMinimise,
  onZoom,
  onMove,
  children,
}: WinProps) {
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  const onBarDown = useCallback(
    (e: React.PointerEvent) => {
      onFocus()
      if (zoomed) return
      /* the offset from WHERE IT WAS GRABBED, so the window does not
         jump its titlebar under the cursor */
      drag.current = { dx: e.clientX - frame.x, dy: e.clientY - frame.y }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [frame.x, frame.y, onFocus, zoomed],
  )

  const onBarMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current
      if (!d) return
      onMove({
        x: Math.max(-frame.w + 120, e.clientX - d.dx),
        /* never above the menu bar, and never dragged fully off the
           bottom — a window you cannot grab again is a window lost */
        y: Math.min(Math.max(28, e.clientY - d.dy), window.innerHeight - 60),
      })
    },
    [frame.w, onMove],
  )

  const endDrag = useCallback((e: React.PointerEvent) => {
    drag.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* the pointer was already gone */
    }
  }, [])

  const style = zoomed
    ? { left: 8, top: 34, width: 'calc(100vw - 16px)', height: 'calc(100vh - 126px)', zIndex: z }
    : { left: frame.x, top: frame.y, width: frame.w, height: frame.h, zIndex: z }

  return (
    <section
      className={`win${focused ? ' is-focused' : ''}${zoomed ? ' is-zoomed' : ''}${
        leaving ? ` is-${leaving}` : ''
      }`}
      style={style}
      onPointerDown={onFocus}
      aria-label={typeof title === 'string' ? title : undefined}
    >
      <header
        className="win-bar"
        onPointerDown={onBarDown}
        onPointerMove={onBarMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onZoom}
      >
        <div className="win-lights">
          <button
            type="button"
            className="win-light win-light--close"
            aria-label="Close"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
          />
          <button
            type="button"
            className="win-light win-light--min"
            aria-label="Minimise"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onMinimise}
          />
          <button
            type="button"
            className="win-light win-light--zoom"
            aria-label="Zoom"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onZoom}
          />
        </div>
        <div className="win-title">{title}</div>
        <div className="win-bar-end" />
      </header>

      <div className="win-body">{children}</div>
    </section>
  )
}
