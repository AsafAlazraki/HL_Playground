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

/** Where the pinned display column's slot sits in `placed`, or -1.
 *  Keyed on the FIELD, never on a column index: folding a band
 *  renumbers the columns and an index captured a render ago would then
 *  pin the wrong one. */
function pinIndexOf(
  placed: readonly PlacedSlot[],
  pinFieldId: string | undefined,
): number {
  if (pinFieldId === undefined) return -1
  for (let i = 0; i < placed.length; i += 1) {
    const slot = placed[i].slot
    if (slot.kind === 'field' && slot.field.id === pinFieldId) return i
  }
  return -1
}

/** How much width the pinned display column holds against the left
 *  edge — 0 when nothing is pinned (no display column, or its band is
 *  folded away).
 *
 *  Anything that scrolls a column to the left edge has to subtract
 *  this, or it parks the thing it just revealed UNDER the pin, which
 *  is the failure the pin exists to prevent turned inside out. */
export function pinWidthOf(
  layout: ColumnLayout,
  pinFieldId: string | undefined,
): number {
  const i = pinIndexOf(layout.placed, pinFieldId)
  return i < 0 ? 0 : layout.placed[i].w
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
 *  the row-number gutter is what a 1280px screen has room for, which is
 *  the smallest window this is promised on. (It used to have to make
 *  room for a locked UID column in front of the reader's own as well;
 *  the register stopped drawing that — see useTableData.ts — so the
 *  floor now has more slack than it was set with, not less.) */
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

   Three slots are always drawn whatever the scroll position:

     THE LOCKED IDENTIFIER. Slot 0 is the row's permanent id. It is
     addressed as column 0 by every keyboard, paste and fill path, and
     it is never allowed to leave the DOM.

     THE PINNED DISPLAY COLUMN. The one column that says WHICH row you
     are looking at by NAME. It is drawn `position: sticky`, and a
     sticky element that has been windowed out of the DOM sticks to
     nothing — so it is kept here for exactly the same reason the
     identifier is.

     THE LIVE EDITOR'S COLUMN, when there is one. An editor that
     unmounted mid-keystroke because the sheet scrolled would commit
     on the blur it caused; `editCol` makes that unrepresentable.

   The result is the row's whole lay-out, gaps included, rather than
   four fields the caller has to assemble: with two slots that can be
   dragged forward out of order there is dead width BETWEEN them as
   well as either side, and a caller that forgot one would draw a row
   narrower than the sheet says it is.

   Pure — no DOM, no React. Same file as the rest of the column
   geometry so the three can never disagree.
   ============================================================ */

/** One thing a row lays out: a drawn column, or the dead width of the
 *  columns the window skipped. A gap carries no `data-r`/`data-c`, so
 *  it is not a cell, cannot be selected and cannot be typed into. */
export type DrawItem =
  | { kind: 'slot'; placed: PlacedSlot }
  | { kind: 'gap'; w: number; key: string }

const asSlot = (placed: PlacedSlot): DrawItem => ({ kind: 'slot', placed })

/** The slots crossing `[scrollLeft, scrollLeft + available]`, in draw
 *  order, with every skipped run held open as one gap.
 *
 *  `available` is the scroller's own client width; an unmeasured
 *  scroller (0) draws everything rather than nothing, which is what
 *  keeps the very first paint correct. */
export function windowColumns(
  layout: ColumnLayout,
  scrollLeft: number,
  available: number,
  overscan: number,
  editCol?: number,
  pinFieldId?: string,
): DrawItem[] {
  const placed = layout.placed
  const n = placed.length
  if (n === 0) return []

  const all = (): DrawItem[] => placed.map(asSlot)
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

  if (editCol !== undefined) {
    for (let i = 0; i < n; i += 1) {
      const slot = placed[i].slot
      if (slot.kind === 'field' && slot.col === editCol) {
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

  /* Slots dragged forward out of the window. The identifier is slot 0
     and comes first by construction; the pin is only added when it is
     a DIFFERENT slot that the window has already left behind — which
     is what stops it being drawn twice when the display column is
     itself the first column, or is still on screen. */
  const ahead: number[] = []
  if (from > 0) ahead.push(0)
  const pin = pinIndexOf(placed, pinFieldId)
  if (pin > 0 && pin < from) ahead.push(pin)

  const items: DrawItem[] = []
  let filled = 0
  for (const i of ahead) {
    const p = placed[i]
    if (p.x > filled) items.push({ kind: 'gap', w: p.x - filled, key: `gap:${filled}` })
    items.push(asSlot(p))
    filled = p.x + p.w
  }

  const startX = placed[from].x
  if (startX > filled) items.push({ kind: 'gap', w: startX - filled, key: 'gap:l' })
  for (let i = from; i < to; i += 1) items.push(asSlot(placed[i]))

  const endSlot = placed[to - 1]
  const tail = layout.total - (endSlot.x + endSlot.w)
  if (tail > 0) items.push({ kind: 'gap', w: tail, key: 'gap:r' })
  return items
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
 *  A system column, if one is ever drawn again, keeps its width too.
 *  The register draws none today: the column that says WHICH row you
 *  are looking at is the gutter, and the gutter is already fixed. The
 *  branch stays because `visibleFields` still declares one and this
 *  must not start squeezing it if anything takes the model up on it.
 *
 *  AND THE FROZEN NAME COLUMN, which is the fourth and was the one
 *  this function had already promised in words and never delivered. The
 *  note above used to say "FIT must never squeeze the one column that
 *  says WHICH row you are looking at" while the code exempted only a
 *  system column — and the register draws none. So the display column
 *  went into the share with the rest, and one press of FIT turned every
 *  boat on Stacer into "Stacer - 4…". A row without a readable name is
 *  not a row you can price. It is exempt now, by id, from the caller
 *  that already knows which column the grid freezes.
 *
 *  What is left is shared out equally, and the remainder is spent one
 *  pixel at a time from the left so the sheet's right edge lands
 *  exactly on the window's rather than a few pixels inside it.
 *
 *  `FIT_MIN_COL_W` is the contract's 116px floor and the share stops
 *  there: when the columns cannot all fit above it, the sheet stays
 *  wider than the window and scrolls. `fitsWindow` reports which of the
 *  two happened, so the caller can say so.
 *
 *  `widths` is for the flexible columns only — merge it OVER the
 *  reader's own, never in place of them, so one press back is a delete
 *  and restores what they had rather than recomputing defaults. */
export interface FitReport {
  /** widths for the flexible columns only, to be merged OVER the
   *  reader's own */
  widths: Record<string, number>
  /** the whole sheet now lies inside the window. False = the 116px
   *  floor bound and the register still scrolls sideways. */
  fitsWindow: boolean
  /** how many of the drawn columns are on screen after the fit —
   *  every one of them when `fitsWindow` */
  onScreen: number
  /** how many columns took part in the share */
  shared: number
}

export function fitColumns(
  slots: readonly ColumnSlot[],
  widths: Record<string, number>,
  available: number,
  pinFieldId?: string,
): FitReport {
  const foldW = foldWidthFor(slots, widths, available)
  let fixed = GUTTER_W + ADD_COL_W
  const flex: FieldDef[] = []
  for (const slot of slots) {
    if (slot.kind === 'fold') {
      fixed += foldW
      continue
    }
    if (isSystemFieldId(slot.field.id) || slot.field.id === pinFieldId) {
      fixed += widthOf(slot.field, widths)
      continue
    }
    flex.push(slot.field)
  }
  if (flex.length === 0) {
    return { widths: {}, fitsWindow: fixed <= available, onScreen: 0, shared: 0 }
  }

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
  /* how much of the sheet the window holds, counting only the columns
     that were shared out — the fixed part is on screen by definition */
  const fitsWindow = each * flex.length <= room
  const onScreen = fitsWindow
    ? flex.length
    : Math.max(0, Math.floor(Math.max(0, room) / each))
  return { widths: out, fitsWindow, onScreen, shared: flex.length }
}

/* ---------------------------------------------------------- */
/* the spanning band header                                   */
/* ---------------------------------------------------------- */

export interface HeaderBand {
  key: string
  /** absent = a run of columns in no band: drawn plainly, no header */
  section?: ColumnSection
  collapsed: boolean
  /** how many columns this band covers — the aria-colspan */
  count: number
  /** how many columns the whole RUN holds when the pin cut it in
   *  half. The fold control still folds the entire section, so it has
   *  to keep saying "11 columns" on a piece that spans one. */
  runCount?: number
  /** first addressable column of the run, for aria-colindex */
  from: number
  x: number
  w: number
  /** this run is exactly the pinned display column, and freezes with
   *  it — so the pin never sits under another section's name */
  pinned?: true
  /** what is left of a run the pin cut in half: draws its section's
   *  ink and stays the fold control, but does NOT repeat the name.
   *  A section names itself ONCE, on the piece that is always on
   *  screen — three IDENTITY labels in a row read as three sections. */
  muted?: true
}

/** One entry per drawn run. Consecutive columns of the same band
 *  merge; a folded chip is its own run; everything unbanded merges
 *  into runs of its own so the caller draws nothing over it.
 *
 *  THE PINNED COLUMN BREAKS ITS RUN. A frozen column carries its own
 *  header, or the reader is looking at a name that belongs to whatever
 *  band happened to scroll under it. So the run holding the pin is cut
 *  into up to three: what is before it, the pin on its own (frozen
 *  with the column), and what is after. Every piece keeps the section
 *  it always had and the same total width, so the heading row and the
 *  data rows still line up to the pixel. */
export function bandsOf(
  layout: ColumnLayout,
  pinFieldId?: string,
): HeaderBand[] {
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
    const isPin = pinFieldId !== undefined && slot.field.id === pinFieldId
    if (!isPin && open && open.section?.id === slot.section?.id) {
      open.count += 1
      open.w = x + w - open.x
      continue
    }
    const band: HeaderBand = {
      key: slot.section ? `b:${slot.section.id}:${x}` : `p:${x}`,
      ...(slot.section ? { section: slot.section } : {}),
      collapsed: false,
      count: 1,
      from: slot.col,
      x,
      w,
      ...(isPin ? { pinned: true as const } : {}),
    }
    out.push(band)
    /* a pinned run is closed the moment it opens: the column after it
       starts a fresh run of the same section rather than joining the
       frozen one and being dragged out of place with it */
    open = isPin ? null : band
  }

  /* The pin cuts at most one same-section piece off each side of its
     run — a pinned run closes immediately, so only the neighbours can
     be halves of the run it split. They keep their ink and their fold
     control and give up the name. */
  const at = out.findIndex((b) => b.pinned === true)
  const cut = at < 0 ? undefined : out[at].section?.id
  if (cut !== undefined) {
    const pieces = [out[at]]
    for (const side of [out[at - 1], out[at + 1]]) {
      if (side && !side.collapsed && side.section?.id === cut) {
        side.muted = true
        pieces.push(side)
      }
    }
    /* every piece names the whole run: the fold control on any of them
       folds all of it, and a tooltip that promised "1 column" while
       folding eleven would be a lie about what the press does */
    const runCount = pieces.reduce((n, p) => n + p.count, 0)
    for (const p of pieces) p.runCount = runCount
  }

  return out
}

/** The chip's own words: `PRICING · 4`. */
export const foldChipText = (section: ColumnSection, count: number): string =>
  `${section.name} · ${count}`
