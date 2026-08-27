/* ============================================================
   PICTURES ON THE PAGE — the row's mark, never a broken glyph.

   IMAGE_SPEC §4. Two placements and nothing else: the SUBJECT'S own
   photograph, which is now the hero of the page rather than a plate
   beside its name, and the related row's photograph across the head
   of its card. Both are READ-ONLY in both modes — a picture is
   edited in the table, in one place, and this page shows the result.
   Configure mode is for deciding WHAT GOES WITH THIS BOAT, and a
   photograph is not a member of that argument. (§4.3)

   THE SIZES ARE THE ONLY THING THAT MOVED. Both placements draw the
   ROW'S OWN picture and nothing else: no stand-in, no sibling's
   photograph, no plate where a fetch failed. Growing a picture is
   not licence to invent one.

   THE RULE HERE IS THE OPPOSITE OF THE RULE IN THE CELL. In the
   table a picture we cannot fetch is drawn as a reference plate,
   because the plate says "there is a record here you may want to
   fix". This is the page you put in front of a customer: there is
   nothing to fix and nobody to fix it, so a picture we cannot fetch
   is drawn as NOTHING, and the page reads exactly as it did before
   pictures existed. A hatched rectangle here is noise. (§4.1)

   THE VERDICT IS NOT TAKEN HERE. Whether an address may be painted
   is decided once per HOST in '@/lib/imageSources' and shared with
   the cell and the lightbox, so a picture that is a plate in the
   table is never a broken glyph on the page that sells the boat.
   ============================================================ */

import type { ReactElement } from 'react'
import {
  primaryImage,
  rowLabel,
  type EntityDef,
  type FieldDef,
  type ImageRef,
  type RowData,
} from '@/types/model'
import { noteImageFailed, noteImageLoaded, useImageDisplay } from '@/lib/imageSources'

/* ---------------------------------------------------------- */
/* Which column, and which picture                            */
/* ---------------------------------------------------------- */

/** The first picture column on a table, in the author's own column
 *  order.
 *
 *  NOT a member of `block.columns`: pictures are excluded from
 *  SHOWABLE (columns.ts), nothing in the codebase writes
 *  `ViewBlock.columns`, and a photograph is the row's MARK rather
 *  than one of its numbers. A table with no picture column returns
 *  undefined, and every caller then costs nothing. */
export function pictureField(entity: EntityDef | undefined): FieldDef | undefined {
  return entity?.fields.find((f) => f.type === 'image')
}

/** The picture a row shows: index 0 of its first picture column.
 *  Order is the only thing that elects the primary — drag the third
 *  thumbnail in the cell to the front and this changes with it.
 *
 *  Read STRAIGHT OFF THE ROW rather than through the rule engine. An
 *  image cell is stored, never computed, so `valuesOf()` would
 *  re-evaluate every formula on the table once per row to hand back
 *  an array that was already sitting there. */
export function rowPicture(row: RowData, field: FieldDef | undefined): ImageRef | undefined {
  if (!field) return undefined
  return primaryImage(row.values[field.id] ?? null)
}

/* ---------------------------------------------------------- */
/* Drawing one                                                */
/* ---------------------------------------------------------- */

interface PaintedProps {
  img: ImageRef
  alt: string
  className: string
  w: number
  h: number
}

/** One picture, or nothing at all. There is no third outcome on this
 *  page: no placeholder, no frame, no filename. */
function Painted({ img, alt, className, w, h }: PaintedProps): ReactElement | null {
  const { paint, probe, at } = useImageDisplay(img.src)
  /* NOT a plate, not a frame, not the filename — nothing. On the page
     that sells the boat there is nobody to fix a broken address, so
     the header and the row read exactly as they did before pictures
     existed. `useImageDisplay` also turns this off the moment a source
     fails, so a broken glyph never survives a frame. */
  if (!paint) return null
  return (
    <img
      className={className}
      /* the copy the repository holds when there is one — see
         `useImageDisplay`. The record keeps the maker's address. */
      src={at}
      alt={alt}
      /* the box is reserved before the bytes arrive, so a picture
         landing late never moves the row it sits in */
      width={w}
      height={h}
      /* THE PROBE IS THE ONE PICTURE on an unknown host allowed to
         make the request that settles it, so it must not be deferred.
         Everything else waits until it is on screen: a page carries a
         subject plate plus one mark per related row, and eager marks
         would fetch a full-size photograph for every row of a block
         nobody has scrolled to. (§1.6) */
      loading={probe ? 'eager' : 'lazy'}
      decoding="async"
      /* A BLOCK ROW IS DRAGGABLE IN CONFIGURE MODE. An <img> is
         natively draggable, so without this the picture would claim
         the gesture and hand the row's drop handler an image instead
         of the reorder it was waiting for. */
      draggable={false}
      /* the verdict is the module's, not ours: this page's successes
         and failures teach the table's cells, and the table's teach
         this page */
      onLoad={() => noteImageLoaded(img.src)}
      onError={() => noteImageFailed(img.src)}
    />
  )
}

/* ---------------------------------------------------------- */
/* The two placements                                         */
/* ---------------------------------------------------------- */

/** THE SAME PHOTOGRAPH, GIVEN THE PAGE.
 *
 *  120×90 was chosen so a picture could never drive the header's
 *  height, and that was the right size for a header made of a name
 *  and five specs. This page is now a HERO — the boat is the largest
 *  thing on it — so the subject's own photograph takes a column of
 *  its own and the words take the other. Everything else about it is
 *  unchanged: it is the row's OWN picture, index 0 of its first
 *  picture column, and a picture we cannot fetch is still drawn as
 *  nothing at all rather than as a plate. Nothing is substituted —
 *  a sibling row's photograph would be a lie about this hull. (§4.1)
 *
 *  The box is reserved at the 16:10 the CSS crops to, so the hero
 *  never reflows when the bytes land. */
export function HeroPicture({
  entity,
  row,
}: {
  entity: EntityDef
  row: RowData
}): ReactElement | null {
  const img = rowPicture(row, pictureField(entity))
  if (!img) return null
  return (
    <Painted
      img={img}
      alt={img.alt && img.alt.trim() !== '' ? img.alt.trim() : rowLabel(entity, row)}
      className="vw-hero-img"
      w={800}
      h={500}
    />
  )
}

/** True when this row has a picture of its own to draw. The hero asks
 *  before it lays itself out: a page with a photograph is two columns
 *  and a page without one is a single wide column, and neither may
 *  reserve a box for the other. */
export const hasPicture = (entity: EntityDef | undefined, row: RowData): boolean =>
  entity !== undefined && rowPicture(row, pictureField(entity)) !== undefined

/** A related row's photograph, across the head of its card.
 *
 *  IT WAS A 24px MARK IN A TABLE ROW. The block is a grid of cards
 *  now, so the picture is the first thing about a motor a person
 *  sees rather than a stamp beside its name — which is what 220 real
 *  photographs were shipped for. The field is still resolved once for
 *  the whole block and handed down, so a block of forty rows does not
 *  scan the table's columns forty times.
 *
 *  A ROW WITH NO PICTURE STILL DRAWS NOTHING. The card is simply
 *  shorter and the grid stretches it; there is no plate, no
 *  silhouette and no borrowed photograph. */
export function RowPicture({
  row,
  field,
}: {
  row: RowData
  field: FieldDef | undefined
}): ReactElement | null {
  const img = rowPicture(row, field)
  if (!img) return null
  return (
    <Painted
      img={img}
      /* the row's name is the very next thing in the card, so an alt
         that repeated it would make a screen reader say everything
         twice. Decorative unless the author wrote something the
         picture alone carries. */
      alt={img.alt?.trim() ?? ''}
      className="vw-pic-img"
      w={320}
      h={200}
    />
  )
}
