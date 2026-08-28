/* ============================================================
   THE MARK FOR A PLACE — the dealer's own, or the kind's.

   ONE IMPLEMENTATION, THREE SURFACES. This was written inside the
   modules dashboard and then wanted by the front door's module
   tiles and by anything else that draws a module small. A mark
   that is drawn twice drifts twice, and the fallback is the half
   that drifts: one screen shows a boat, the other shows a grey
   square, and the same module reads as two things.

   WHY IT IS NOT AN `<img>` WITH A FALLBACK. `useImageDisplay` is
   the app's single answer to "may this address be painted here":
   it holds the per-host verdict, resolves an address we ship a
   local copy of to that copy, and returns `paint: false` for
   everything it will not request. So a logo that cannot be drawn
   is never a broken glyph and never an empty box — the kind
   symbol takes its place, which is what a module without a logo
   draws anyway. The two states are the same shape and the same
   size, so a logo arriving later does not move the layout.

   THE FALLBACK IS THE KIND, NOT INITIALS. "PA" over Parts &
   Accessories is a mark that says nothing the name beside it has
   not already said; the kind symbol says what sort of place this
   is, which is a second fact. Kind marks are drawn in exactly one
   place in this application — `tablekit` — so the boat on the
   front door is the boat on the module screen.
   ============================================================ */

import type { JSX } from 'react'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { noteImageFailed, noteImageLoaded, useImageDisplay } from '@/lib/imageSources'
import type { EntityDef, ImageRef } from '@/types/model'

export interface PlaceMarkProps {
  logo: ImageRef | undefined
  /** the module's name — used to suppress alt text that merely
   *  repeats the name the mark already sits beside */
  name: string
  /** the module's primary table, which is where the kind comes
   *  from. Undefined is legitimate: a module can be made before
   *  its table is */
  master: EntityDef | undefined
  /** the drawn size in px. The caller decides, because a tile and
   *  a page header want different marks and neither should have
   *  to override CSS to get one. */
  size: number
}

export function PlaceMark({ logo, name, master, size }: PlaceMarkProps): JSX.Element {
  const { paint, probe, at } = useImageDisplay(logo?.src ?? '')

  if (logo && paint) {
    const alt = logo.alt?.trim() ?? ''
    return (
      <img
        className="md-place-logo"
        src={at}
        /* a logo whose alt is the module's name is decorative HERE,
           because the name is drawn next to it — repeating it makes
           a screen reader say the module twice */
        alt={alt === name ? '' : alt}
        width={size}
        height={size}
        loading={probe ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={() => noteImageLoaded(logo.src)}
        onError={() => noteImageFailed(logo.src)}
      />
    )
  }

  return <TableKindSymbol kind={kindOf(master?.kind)} size={size} />
}
