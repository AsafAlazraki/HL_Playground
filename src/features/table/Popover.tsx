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
import type { CSSProperties, JSX, ReactNode } from 'react'

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
  /* `flipped` = the sheet had no room below and sits ABOVE its anchor.
     `originX` = where the button is, in this sheet's own coordinates. */
  const [pos, setPos] = useState({
    left: anchor.left,
    top: anchor.bottom + 4,
    originX: Math.min(anchor.width / 2, width),
    flipped: false,
  })

  useLayoutEffect(() => {
    const h = rootRef.current?.offsetHeight ?? 240
    const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8))
    const below = anchor.bottom + 4
    const flipped = below + h > window.innerHeight - 8
    const top = flipped ? Math.max(8, anchor.top - h - 4) : below
    /* THE SHEET GREW FROM THE MIDDLE OF ITSELF, WHICH IS NOWHERE.
       Every one of these sheets scaled from `50% 50%` — the browser
       default — so a menu hanging off a column head at the far right
       of a fifty-nine column register appeared to swell out of a point
       in the middle of the grid rather than out of the button that was
       pressed. apple-design §7: a popover must originate from the
       element that triggered it, or the spatial relationship between
       press and content is simply not stated.

       Clamped into the sheet's own box, because the sheet is nudged
       away from the window edge (the `Math.max(8, …)` above) and the
       anchor can therefore end up outside it — an origin past the edge
       would scale the sheet in from off-screen. */
    const originX = Math.max(0, Math.min(width, anchor.left + anchor.width / 2 - left))
    setPos({ left, top, originX, flipped })
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

  /* The origin is handed down BOTH ways on purpose: `transformOrigin`
     so the entry animation already in the stylesheet is anchored today
     without a stylesheet change, and `--pop-origin` so any rule that
     wants to key off it later reads one value rather than recomputing
     it. `data-pop-flip` states which side the anchor is on, which is
     the one thing the shared `sheet-in` keyframe cannot know: it lifts
     the sheet 6px on the way in, and when flipped that 6px travels
     AWAY from the button. Mirroring it needs a keyframe, which is a
     stylesheet this step does not own — the attribute is the hook. */
  const style = {
    left: pos.left,
    top: pos.top,
    width,
    transformOrigin: `${pos.originX}px ${pos.flipped ? 'bottom' : 'top'}`,
    '--pop-origin': `${pos.originX}px ${pos.flipped ? 'bottom' : 'top'}`,
  } as CSSProperties

  return createPortal(
    <div
      ref={rootRef}
      className="tb-menu tb-pop"
      style={style}
      data-pop-flip={pos.flipped ? 'above' : 'below'}
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
