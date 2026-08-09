/* ============================================================
   Column sections — what makes a 40-column price sheet readable.

   A section is NOT a second ordering. It is the run of CONSECUTIVE
   columns sharing a `sectionId`, read straight off the field order
   the table already has. That is the whole rule, and it is why
   nothing here can ever disagree with the columns on screen.

   Three shapes come out of this file:

     fields   the ADDRESSABLE columns — index === grid column index.
              Folding a band takes its columns out of this set, so
              every cell the grid can reach is still a real cell and
              keyboard nav, paste-by-rowId, fill and copy need no
              idea sections exist. (Exactly how a folded drawer takes
              rows out of the addressable set next door in
              `grouping.ts`.)

     slots    what is DRAWN, left to right: a column, or the chip a
              folded band leaves behind. The chip holds real width in
              the header AND in every row, so the three rows can
              never drift out of alignment.

     bands    the spanning header above the headings — one entry per
              run. A run of unbanded columns is reported too, with no
              section on it, so the caller can draw nothing over it
              rather than an empty header.

   Pure: no React, no DOM, no store.
   ============================================================ */
import { isSystemFieldId, type ColumnSection, type FieldDef } from '@/types/model'
import {
  ADD_COL_W,
  FIT_MIN_COL_W,
  FOLD_W,
  GUTTER_W,
  MAX_COL_W,
  widthOf,
} from './helpers'

/* ---------------------------------------------------------- */
/* slots                                                      */
/* ---------------------------------------------------------- */

export interface FieldSlot {
  kind: 'field'
  field: FieldDef
  /** index into `SectionModel.fields` — the grid's own column index */
  col: number
  /** the band this column is in, when it is in one */
  section?: ColumnSection
}

export interface FoldSlot {
  kind: 'fold'
  section: ColumnSection
  /** how many columns this chip is standing in for */
  count: number
}

export type ColumnSlot = FieldSlot | FoldSlot

export interface SectionModel {
  /** the columns the grid addresses — folded ones are gone */
  fields: FieldDef[]
  /** what the header and the rows draw, in order */
  slots: ColumnSlot[]
  /** true when at least one run is actually in a band */
  banded: boolean
}

/** Build the model for one table.
 *
 *  Identity matters: when nothing is folded and nothing is banded the
 *  SAME `fields` array is handed straight back, so every memo
 *  downstream (`hasFormula`, `buildViewRows`, `viewRows`) keeps
 *  biting and a section-less table costs exactly nothing. */
export function buildSections(
  fields: FieldDef[],
  sections: readonly ColumnSection[] | undefined,
  collapsed: ReadonlySet<string>,
): SectionModel {
  if (!sections || sections.length === 0) {
    return { fields, slots: plainSlots(fields), banded: false }
  }

  const byId = new Map<string, ColumnSection>()
  for (const s of sections) byId.set(s.id, s)

  /* a sectionId nobody declared is not a band — the column is drawn
     plainly rather than under a header with no name */
  const sectionOf = (f: FieldDef): ColumnSection | undefined =>
    f.sectionId === undefined ? undefined : byId.get(f.sectionId)

  let banded = false
  for (const f of fields) {
    if (sectionOf(f)) {
      banded = true
      break
    }
  }
  if (!banded) return { fields, slots: plainSlots(fields), banded: false }

  const kept: FieldDef[] = []
  const slots: ColumnSlot[] = []

  let i = 0
  while (i < fields.length) {
    const section = sectionOf(fields[i])
    /* the run: consecutive columns sharing this exact band (or sharing
       "no band at all") */
    let end = i + 1
    while (end < fields.length && sectionOf(fields[end])?.id === section?.id) end += 1

    if (section && collapsed.has(section.id)) {
      slots.push({ kind: 'fold', section, count: end - i })
    } else {
      for (let k = i; k < end; k += 1) {
        slots.push({ kind: 'field', field: fields[k], col: kept.length, section })
        kept.push(fields[k])
      }
    }
    i = end
  }

  /* nothing was folded away: hand the original array back so its
     identity — and every memo keyed on it — survives */
  const same = kept.length === fields.length
  return { fields: same ? fields : kept, slots, banded: true }
}

const plainSlots = (fields: FieldDef[]): ColumnSlot[] =>
  fields.map((field, col) => ({ kind: 'field' as const, field, col }))

/* ---------------------------------------------------------- */
/* geometry                                                   */
/* ---------------------------------------------------------- */

export interface PlacedSlot {
  slot: ColumnSlot
  x: number
  w: number
}

export interface ColumnLayout {
  /** every drawn slot with its left edge and width, gutter excluded */
  placed: PlacedSlot[]
  /** left edge of addressable column c */
  left: number[]
  /** right edge of addressable column c */
  right: number[]
  /** width of every slot together */
  total: number
}

/* ============================================================
   A FOLDED SHAPE YOU HAVE TO SCROLL IS NOT A SHAPE.

   COLLAPSE ALL exists to put the table's SHAPE on one screen: eleven
   bands instead of fifty-nine columns. At the chip's natural width
   eleven of them are 1452px, so on any window narrower than that the
   one control whose whole purpose is "see all of it" still leaves you
   scrolling — the same failure the fit note downstairs calls out.

   So the chips share the window when they have to, exactly as the
   columns do under FIT, and keep their natural width when there is
   room. They never go below `FOLD_MIN_W`: under that the band's name
   stops reading and the chip is a coloured rectangle.
   ============================================================ */

/** Narrowest a folded band's chip is ever drawn. Eleven of these plus
 *  the gutter and the locked identifier is what a 1280px screen has
 *  room for, which is the smallest window this is promised on. */
export const FOLD_MIN_W = 64

/** The width every folded chip is drawn at, given the window. Pure —
 *  the same answer for `layoutColumns`, for the grid and for the
 *  band-scroll arithmetic, so the three can never disagree. */
export function foldWidthFor(
  slots: readonly ColumnSlot[],
  widths: Record<string, number>,
  available: number,
): number {
  let folds = 0
  let fixed = GUTTER_W + ADD_COL_W
  for (const slot of slots) {
    if (slot.kind === 'fold') folds += 1
    else fixed += widthOf(slot.field, widths)
  }
  if (folds === 0) return FOLD_W
  /* an unmeasured window is not a reason to squeeze anything */
  if (!Number.isFinite(available) || available <= 0) return FOLD_W
  const per = Math.floor((available - fixed) / folds)
  if (per >= FOLD_W) return FOLD_W
  return Math.max(FOLD_MIN_W, per)
}

/** Where each slot sits. A folded chip takes real width, which is
 *  what keeps the band row, the heading row and the data rows in
 *  the same columns. */
export function layoutColumns(
  slots: readonly ColumnSlot[],
  widths: Record<string, number>,
  foldW: number = FOLD_W,
): ColumnLayout {
  const placed: PlacedSlot[] = []
  const left: number[] = []
  const right: number[] = []
  let x = 0
  for (const slot of slots) {
    const w = slot.kind === 'fold' ? foldW : widthOf(slot.field, widths)
    placed.push({ slot, x, w })
    if (slot.kind === 'field') {
      left[slot.col] = x
      right[slot.col] = x + w
    }
    x += w
  }
  return { placed, left, right, total: x }
}

/* ============================================================
   THE COLUMN WINDOW — the other half of the windowing.

   Rows have been windowed for a long time. Columns never were, so a
   fifty-nine column register on a 520px card drew all fifty-nine of
   them on every row: six on screen, fifty-three past the right-hand
   edge, and every one of them re-composited on every pan frame.

   This is the exact mirror of `firstLineAt` next door in
   `grouping.ts`: the run of slots the window actually crosses, plus a
   little overscan, with the skipped width either side handed back as
   two numbers. The caller draws those two numbers as spacers, so the
   row stays a flex row of the same total width and the header, the
   band row and the data rows can never drift apart.

   Two slots are always drawn whatever the scroll position:

     THE LOCKED IDENTIFIER. Slot 0 is the row's permanent id. It is
     the one column that says WHICH row you are looking at, it is
     addressed as column 0 by every keyboard, paste and fill path, and
     it is never allowed to leave the DOM.

     THE LIVE EDITOR'S COLUMN, when there is one. An editor that
     unmounted mid-keystroke because the sheet scrolled would commit
     on the blur it caused; `keepCol` makes that unrepresentable.

   Pure — no DOM, no React. Same file as the rest of the column
   geometry so the three can never disagree.
   ============================================================ */

export interface ColumnWindow {
  /** slot 0 when it is outside the window — drawn anyway, in place */
  lead: PlacedSlot | null
  /** skipped width between the lead and the first drawn slot */
  padLeft: number
  /** the slots to draw, in order */
  drawn: PlacedSlot[]
  /** skipped width after the last drawn slot */
  padRight: number
}

const NO_SLOTS: PlacedSlot[] = []

/** The slots crossing `[scrollLeft, scrollLeft + available]`.
 *
 *  `available` is the scroller's own client width; an unmeasured
 *  scroller (0) draws everything rather than nothing, which is what
 *  keeps the very first paint correct. */
export function windowColumns(
  layout: ColumnLayout,
  scrollLeft: number,
  available: number,
  overscan: number,
  keepCol?: number,
): ColumnWindow {
  const placed = layout.placed
  const n = placed.length
  if (n === 0) return { lead: null, padLeft: 0, drawn: NO_SLOTS, padRight: 0 }

  const all = (): ColumnWindow => ({
    lead: null,
    padLeft: 0,
    drawn: placed,
    padRight: 0,
  })
  if (!Number.isFinite(available) || available <= 0) return all()

  /* the frozen gutter covers the first `GUTTER_W` of the window, so a
     column hiding under it is genuinely not on screen */
  const left = scrollLeft - GUTTER_W
  const right = scrollLeft + available

  let from = 0
  while (from < n && placed[from].x + placed[from].w <= left) from += 1
  let to = from
  while (to < n && placed[to].x < right) to += 1

  from = Math.max(0, from - overscan)
  to = Math.min(n, to + overscan)

  if (keepCol !== undefined) {
    for (let i = 0; i < n; i += 1) {
      const slot = placed[i].slot
      if (slot.kind === 'field' && slot.col === keepCol) {
        if (i < from) from = i
        if (i >= to) to = i + 1
        break
      }
    }
  }

  /* scrolled clean past the end (a fold can do that in one frame):
     one column is still a sheet, none is a blank card */
  if (to <= from) {
    from = Math.max(0, n - 1)
    to = n
  }
  if (from === 0 && to === n) return all()

  const lead = from > 0 ? placed[0] : null
  const startX = placed[from].x
  const endSlot = placed[to - 1]
  return {
    lead,
    padLeft: lead ? Math.max(0, startX - (lead.x + lead.w)) : Math.max(0, startX),
    drawn: placed.slice(from, to),
    padRight: Math.max(0, layout.total - (endSlot.x + endSlot.w)),
  }
}

/* ---------------------------------------------------------- */
/* fitting every column into the window                       */
/* ---------------------------------------------------------- */

/** Widths that put every DRAWN column inside `available` pixels.
 *
 *  Three things are not negotiable and so are not shared out:
 *  the row-number gutter, the + COLUMN plate, and every folded band's
 *  chip — those keep the width `foldWidthFor` gave them, because
 *  folding a band is a decision the reader already made and fitting
 *  must not undo it.
 *  The locked identifier keeps its width too: FIT must never squeeze
 *  the one column that says WHICH row you are looking at.
 *
 *  What is left is shared out equally, and the remainder is spent one
 *  pixel at a time from the left so the sheet's right edge lands
 *  exactly on the window's rather than a few pixels inside it.
 *
 *  Returns widths for the flexible columns only — merge it OVER the
 *  reader's own widths, never in place of them, so one press back
 *  restores what they had rather than recomputing defaults. */
export function fitColumnWidths(
  slots: readonly ColumnSlot[],
  widths: Record<string, number>,
  available: number,
): Record<string, number> {
  const foldW = foldWidthFor(slots, widths, available)
  let fixed = GUTTER_W + ADD_COL_W
  const flex: FieldDef[] = []
  for (const slot of slots) {
    if (slot.kind === 'fold') {
      fixed += foldW
      continue
    }
    if (isSystemFieldId(slot.field.id)) {
      fixed += widthOf(slot.field, widths)
      continue
    }
    flex.push(slot.field)
  }
  if (flex.length === 0) return {}

  const room = available - fixed
  const per = Math.floor(room / flex.length)
  const each = Math.max(FIT_MIN_COL_W, Math.min(MAX_COL_W, per))
  /* only an unclamped share can be topped up — at the floor or the
     ceiling there is no remainder to spend */
  let spare = each === per ? room - per * flex.length : 0

  const out: Record<string, number> = {}
  for (const f of flex) {
    const extra = spare > 0 ? 1 : 0
    spare -= extra
    out[f.id] = each + extra
  }
  return out
}

/* ---------------------------------------------------------- */
/* the spanning band header                                   */
/* ---------------------------------------------------------- */

export interface HeaderBand {
  key: string
  /** absent = a run of columns in no band: drawn plainly, no header */
  section?: ColumnSection
  collapsed: boolean
  /** how many columns this band covers */
  count: number
  /** first addressable column of the run, for aria-colindex */
  from: number
  x: number
  w: number
}

/** One entry per drawn run. Consecutive columns of the same band
 *  merge; a folded chip is its own run; everything unbanded merges
 *  into runs of its own so the caller draws nothing over it. */
export function bandsOf(layout: ColumnLayout): HeaderBand[] {
  const out: HeaderBand[] = []
  let open: HeaderBand | null = null

  for (const { slot, x, w } of layout.placed) {
    if (slot.kind === 'fold') {
      open = null
      out.push({
        key: `f:${slot.section.id}:${x}`,
        section: slot.section,
        collapsed: true,
        count: slot.count,
        from: -1,
        x,
        w,
      })
      continue
    }
    if (open && open.section?.id === slot.section?.id) {
      open.count += 1
      open.w = x + w - open.x
      continue
    }
    open = {
      key: slot.section ? `b:${slot.section.id}:${x}` : `p:${x}`,
      ...(slot.section ? { section: slot.section } : {}),
      collapsed: false,
      count: 1,
      from: slot.col,
      x,
      w,
    }
    out.push(open)
  }

  return out
}

/** The chip's own words: `PRICING · 4`. */
export const foldChipText = (section: ColumnSection, count: number): string =>
  `${section.name} · ${count}`
