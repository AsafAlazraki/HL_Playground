/* ============================================================
   A FROZEN PHOTOGRAPH — or nothing at all.

   The ImageRef on a quote line was copied by value at pick time and
   points at a third-party host: the seeded pictures are addresses on
   yamaha-motor.com.au, stacer.com.au and northsidemarine.com.au, and
   any of them may 404 next year.

   There is no third outcome here. No placeholder, no frame, no
   filename, no hatched rectangle — a quote is the document you put
   in front of a customer, and on it a picture we cannot fetch is
   drawn as NOTHING, exactly as the view page's read mode does it. A
   broken glyph on a quotation is worse than no photograph.

   The verdict is not taken here either: whether an address may be
   painted at all is decided once per HOST in '@/lib/imageSources'
   and shared with the table cell, the view page and this document,
   so a picture that failed once is never asked for again.
   ============================================================ */

import type { ReactElement } from 'react'
import type { ImageRef } from '@/types/model'
import { noteImageFailed, noteImageLoaded, useImageDisplay } from '@/lib/imageSources'

export interface FrozenPhotoProps {
  img: ImageRef | undefined
  /** the subject's or the line's own name — never invented */
  fallbackAlt: string
  className: string
  w: number
  h: number
}

export function FrozenPhoto({
  img,
  fallbackAlt,
  className,
  w,
  h,
}: FrozenPhotoProps): ReactElement | null {
  /* the hook must run on every render, so the early return for
     "there is no picture" happens after it, not before */
  const { paint, probe, at } = useImageDisplay(img?.src ?? '')
  if (!img || !paint) return null
  return (
    <img
      className={className}
      /* THE FROZEN VALUE IS `img.src` AND STAYS `img.src`. `at` is
         only where the pixels are fetched from — the repository's own
         copy when it holds one, the maker's address when it does not.
         A quote raised today cites the same place it always did. */
      src={at}
      alt={img.alt && img.alt.trim() !== '' ? img.alt.trim() : fallbackAlt}
      /* the box is reserved before the bytes arrive, so a picture
         landing late never moves the line it sits in — and never
         re-paginates a document halfway through printing it */
      width={w}
      height={h}
      loading={probe ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => noteImageLoaded(img.src)}
      onError={() => noteImageFailed(img.src)}
    />
  )
}
