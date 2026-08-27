/* ============================================================
   THE PICTURE THAT STANDS FOR A TABLE.

   THE PROBLEM THIS SOLVES. The seed carries 220 real photographs
   — Northside's own yard shots, Stabicraft on turquoise water,
   a Surtees 720 on its REDCO trailer — and until now the only
   place any of them appeared at 1:1 was a 20px thumbnail inside
   an image cell. A gallery of 51 boat, motor and trailer tables
   was drawn as 51 white rectangles while the photographs sat in
   `public/seed-images` doing nothing.

   WHAT IT RETURNS, AND WHAT IT REFUSES TO RETURN.

   The first image, on the first row that has one, whose address
   we hold A LOCAL COPY OF. That last clause is the whole point
   and it is not a performance decision:

     - `seededCopy` answers only for the 220 addresses this
       repository actually ships. A remote address is refused
       here even though it might load, because a card that
       sometimes draws a picture and sometimes draws a hole is
       worse than a card that never draws one. Two of the twelve
       hosts in the seed cannot be fetched from a browser at all
       (see imageSources.ts) and one of them is Northside's own.

     - Nothing is substituted. There is no stock photograph, no
       silhouette standing in for a boat nobody photographed, no
       picture borrowed from a sibling row. A table with no held
       picture returns `null` and the card draws its own crest
       instead — which is honest, and is the rule the whole app
       is built on (§6: nothing is invented).

   COST. One pass over the rows, stopping at the first hit, and
   only over tables that HAVE an image column — the field scan
   comes first and costs nothing on the 30-odd tables that hold
   no pictures at all. The result is memoised by the caller.
   ============================================================ */

import { isImageValue, primaryImage, type EntityDef, type RowData } from '@/types/model'
import { seededCopy } from '@/lib/imageSources'

export interface CoverPhoto {
  /** same-origin path under /seed-images, safe to draw eagerly */
  at: string
  /** natural size, so a card can reserve the box and never reflow */
  w: number
  h: number
  /** the row's own words, for alt text — never invented */
  alt: string
}

/** How many rows to look at before giving up. A table whose first
 *  40 rows carry no held picture is a table without one for this
 *  purpose; walking 2,937 Parts rows to find the 41st is not worth
 *  a card's thumbnail. */
const LOOK_AT = 40

export function coverPhoto(
  entity: EntityDef,
  rows: readonly RowData[] | undefined,
): CoverPhoto | null {
  if (!rows || rows.length === 0) return null

  /* The cheap refusal first: no image column, no cover. */
  const imageFields = entity.fields.filter((f) => f.type === 'image')
  if (imageFields.length === 0) return null

  /* The row's name column, so alt text is the boat's own name
     rather than a filename. */
  const nameField =
    entity.fields.find((f) => f.name.toLowerCase() === 'name') ??
    entity.fields.find((f) => f.type === 'text')

  const limit = Math.min(rows.length, LOOK_AT)
  for (let i = 0; i < limit; i += 1) {
    const row = rows[i]
    if (!row) continue
    for (const field of imageFields) {
      const cell = row.values?.[field.id]
      if (!isImageValue(cell)) continue
      const img = primaryImage(cell)
      if (!img?.src) continue

      const held = seededCopy(img.src)
      if (!held) continue /* remote or unmeasured — refused, see above */

      const named = nameField ? row.values?.[nameField.id] : undefined
      const alt =
        img.alt ??
        (typeof named === 'string' && named.trim() ? named.trim() : entity.name)

      return { at: held.at, w: held.w, h: held.h, alt }
    }
  }
  return null
}
