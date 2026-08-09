/* ============================================================
   Popover — the small sheet the header row speaks through.

   PORTALLED TO THE DOCUMENT, and fixed-positioned there.

   `position: fixed` resolves against the nearest TRANSFORMED
   ancestor, not the window — and a table on the blueprint lives
   inside a React Flow node carrying `translate(x,y)` under a viewport
   carrying `translate()scale()`. Rendered in place, a sheet anchored
   at a window coordinate therefore lands hundreds of pixels from the
   button that opened it, and the button reads as dead. Rendered into
   the document body, the anchor rect means what it says, no
   `overflow: hidden` between here and the root can clip it, and it
   flips above its anchor when there is no room below.

   Portalled in the DOM, still a child in the React tree — so the
   grid's own paste and key guards still see these events and still
   stop them.

   Keystrokes and pastes stop here: the grid mounts ONE keydown
   handler on `role="grid"`, and a Ctrl+V typed into an input inside
   this sheet is a paste into that input, never a block paste into
   the register.
   ============================================================ */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { JSX, ReactNode } from 'react'

export function Popover({
  anchor,
  width,
  label,
  onClose,
  children,
}: {
  anchor: DOMRect
  width: number
  label: string
  onClose: () => void
  children: ReactNode
}): JSX.Element {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState({ left: anchor.left, top: anchor.bottom + 4 })

  useLayoutEffect(() => {
    const h = rootRef.current?.offsetHeight ?? 240
    const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8))
    const below = anchor.bottom + 4
    const top =
      below + h > window.innerHeight - 8
        ? Math.max(8, anchor.top - h - 4)
        : below
    setPos({ left, top })
  }, [anchor, width])

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    /* capture, so a mousedown on a cell closes this before it selects */
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={rootRef}
      className="tb-menu tb-pop"
      style={{ left: pos.left, top: pos.top, width }}
      role="dialog"
      aria-label={label}
      onKeyDown={(e) => e.stopPropagation()}
      onPaste={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  )
}
