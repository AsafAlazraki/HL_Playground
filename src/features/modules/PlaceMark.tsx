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
import { markFor } from './brandLogos'
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

  /** WHAT TO DRAW WHEN THERE IS NO MARK AT ALL.
   *
   *  'kind' — the boat, the motor, the trailer. Right on the
   *  modules screen, where the symbol sits in the corner of a
   *  photograph and is the only thing saying what sort of place
   *  this is.
   *
   *  'none' — nothing, and the caller draws nothing in its place.
   *  Right on the dashboard tiles, where fourteen tiles carrying
   *  four repeated symbols is not identity, it is wallpaper: the
   *  kind is already the tile's colour, and a legend above the
   *  grid says what the colours mean once rather than fourteen
   *  times.
   *
   *  Default 'kind', which is what every existing caller wants. */
  fallback?: 'kind' | 'none'
}

export function PlaceMark({
  logo,
  name,
  master,
  size,
  fallback = 'kind',
}: PlaceMarkProps): JSX.Element | null {
  /* THE MODULE'S OWN LOGO FIRST, THEN THE BRAND'S. `markFor` is
     one line and it is written down in `brandLogos.ts` rather than
     here so that every surface drawing a place resolves the mark
     the same way — a screen that skipped the fallback would show
     Highfield's wordmark on one page and a grey square on the
     next. An uploaded logo always wins; nothing here writes. */
  const mark = markFor(logo, name)
  const { paint, probe, at } = useImageDisplay(mark?.src ?? '')

  if (mark && paint) {
    const alt = mark.alt?.trim() ?? ''
    return (
      <img
        className="md-place-logo"
        src={at}
        /* a mark whose alt is the place's own name is decorative
           HERE, because the name is drawn beside it — repeating it
           makes a screen reader say the module twice */
        alt={alt === name ? '' : alt}
        /* NO width/height ATTRIBUTES, and that is deliberate. Every
           one of these is a WORDMARK — Highfield is 6430x701 — so a
           square box would letterbox it into a smear. The caller's
           CSS gives it a slot and `object-fit: contain` fits the
           mark to it; `size` below is the square the FALLBACK
           symbol is drawn at, which is a different question. */
        loading={probe ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={() => noteImageLoaded(mark.src)}
        onError={() => noteImageFailed(mark.src)}
      />
    )
  }

  if (fallback === 'none') return null
  return <TableKindSymbol kind={kindOf(master?.kind)} size={size} />
}
