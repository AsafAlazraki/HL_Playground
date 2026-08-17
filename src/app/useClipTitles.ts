/* ============================================================
   A CLAMPED NAME STILL SAYS ALL OF ITSELF.

   DESIGN_CONTRACT §3: "If a name does not fit it wraps or clamps to
   two lines with the full text still in the DOM." Full text in the DOM
   answers a screen reader, and Home's cards already do that properly
   with an `aria-label`. It does not answer the EYE: measured at 1280,
   "Haines Signature × Dunbier/Haines BMT — Trailer Fitment" wants 2.2
   lines of a two-line clamp on its 230px card, so a sighted reader saw
   "…BMT —" and had no way at all to find out what came after it.

   THE TITLE IS MEASURED, NOT ASSUMED, and that is the whole point of
   doing it here instead of writing `title={name}` at the call site. A
   tooltip on every card would repeat, on forty-nine cards, a name the
   reader is already looking at — and a surface that speaks whenever the
   pointer crosses it teaches people to ignore it, which costs the one
   card that had something to say. So the elements are asked whether
   they are actually cut (`scrollHeight` past `clientHeight`, which is
   what a clamp produces, or `scrollWidth` past `clientWidth`, which is
   what an ellipsis does) and only those get a title.

   ONE FORCED LAYOUT, and it is unavoidable: the question "were you
   cut" cannot be answered before the browser has laid the text out.
   It is asked once when the names change and once per resize, never per
   frame, and every read is taken before the first write so nothing in
   between invalidates one. `setAttribute('title')` does not affect
   layout, so the loop cannot thrash.

   A RESIZE IS THE OTHER HALF. The clamp is a function of the column
   width, and Home's grid is `auto-fill` — dragging the window narrower
   cuts names that fitted a moment ago. One `ResizeObserver` on the
   container catches every one of them.
   ============================================================ */
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

/** Marks every element inside the returned ref's element matching
 *  `selector` with its own full text as a `title` — when, and only
 *  when, the element is actually clipped.
 *
 *  `selector` must name elements whose whole content is the text: the
 *  title is taken from `textContent`, so an element wrapping a figure
 *  and a word beside it would produce a run-together tooltip.
 *
 *  `key` is what the caller has changed. Pass the names, joined: the
 *  pass is re-taken when they move and at no other time. */
export function useClipTitles<T extends HTMLElement>(
  selector: string,
  key: string,
): (el: T | null) => void {
  const root = useRef<T | null>(null)
  const ro = useRef<ResizeObserver | null>(null)

  const read = useCallback(() => {
    const el = root.current
    if (!el) return
    const marks: { el: Element; text: string | null }[] = []
    for (const node of el.querySelectorAll(selector)) {
      const cut =
        node.scrollHeight > node.clientHeight + 1 ||
        node.scrollWidth > node.clientWidth + 1
      marks.push({ el: node, text: cut ? node.textContent : null })
    }
    for (const mark of marks) {
      if (mark.text === null || mark.text === '') mark.el.removeAttribute('title')
      else mark.el.setAttribute('title', mark.text)
    }
  }, [selector])

  const attach = useCallback(
    (el: T | null) => {
      ro.current?.disconnect()
      ro.current = null
      root.current = el
      if (!el) return
      read()
      const obs = new ResizeObserver(read)
      obs.observe(el)
      ro.current = obs
    },
    [read],
  )

  /* the names changed under a container that did not resize — a table
     renamed, one added, a group folded */
  useLayoutEffect(read, [read, key])

  useEffect(() => () => ro.current?.disconnect(), [])

  return attach
}
