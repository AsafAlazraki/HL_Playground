/* ============================================================
   THE NAME COLUMN TAKES THE ROOM ITS NAMES NEED.

   THE FAULT, MEASURED. `span.tb-val` inside `div.tb-cell.tb-cell-pin`
   was clipped on 26 of Stacer's 26 rows and 40 of Highfield's 40, at
   1280 AND at 1920 — the two lists byte-identical, because the column
   was a FIXED 184px (`DEFAULT_COL_W.text`) and a wider window bought
   nothing at all. "Stacer - 499 Sea Ranger SDF (Centre Console)" wants
   277px of 12.5px Inter and had 159. Every hull on the sheet read as
   "Stacer - 499 Sea Ranger S…", and the frozen column exists precisely
   so that a salesperson forty columns into the price band still knows
   WHICH boat they are pricing. A register whose name column is
   unreadable is not a register.

   WHY A TYPE DEFAULT CANNOT ANSWER IT. `DEFAULT_COL_W` is keyed on the
   column's TYPE, and a type cannot know that this dealer's model names
   run to forty-four characters while another's run to twelve. The
   width has to come from the data, so it is measured from the data.

   WHAT IS MEASURED, AND WHAT IS NOT. The display column's painted text,
   for every row of the table (not the filtered set — a width that moved
   when a search narrowed would be a second thing to think about). The
   longest few strings by character count are the only ones actually put
   through the canvas: a proportional face means the longest string is
   not always the widest, but among the longest two dozen it is, and
   twenty-four measurements per table is nothing while 2,519 — the
   largest seeded table — would be felt.

   THE CEILING IS A SHARE OF THE WINDOW, WHICH IS THE POINT.
   DESIGN_CONTRACT §2: "a register is allowed to be wider than the
   window; that is what sideways scroll is for". So the name may grow
   past the type default — but the pin FREEZES, and a frozen column that
   ate two thirds of a 1280px screen would leave the price bands
   nowhere to be. It gets at most `NAME_MAX_SHARE` of the scroller,
   never less than the 184px it has today, and never more than
   `MAX_COL_W`. A wider window therefore buys a wider name, which is
   exactly what the fixed width refused to do.

   IT IS A DEFAULT, NOT A DECISION. The result is merged UNDER the
   reader's own widths, so a drag still wins, "reset this column" still
   returns here, and a fit still overlays it.

   Pure at the bottom (`widestOf`, `nameColumnWidth`), a hook on top.
   ============================================================ */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { displayFieldOf, type EntityDef, type RowData } from '@/types/model'
import { cellPrintText, DEFAULT_COL_W, MAX_COL_W, valueForField } from './helpers'
import { cellToText } from '@/features/table/core'

/** Most of the scroller the frozen name column may take. At 1280 that
 *  is 486px, at 1920 the `MAX_COL_W` ceiling takes over — and on a
 *  520px card on the blueprint it is barely more than the default,
 *  which is right: the card is not the place to read a whole name. */
export const NAME_MAX_SHARE = 0.38

/** A cell's own horizontal cost: `.tb-cell`'s `padding: 0 var(--sp-3)`
 *  twice, its 1px right-hand rule, and a pixel of slack so a name that
 *  measures exactly its box does not ellipsise on a rounding error. */
export const CELL_TEXT_INSET = 12 * 2 + 1 + 1

/** How many of the longest strings are actually measured. */
const PROBE = 24

/** The widest of `values`, in pixels, measuring only the longest
 *  `probe` of them. Pure — `measure` is injected, so this is testable
 *  without a canvas and cannot depend on a live DOM. */
export function widestOf(
  values: readonly string[],
  measure: (s: string) => number,
  probe: number = PROBE,
): number {
  if (values.length === 0) return 0
  const longest = new Set(
    [...values]
      .filter((v) => v !== '')
      .sort((a, b) => b.length - a.length)
      .slice(0, probe),
  )
  let w = 0
  for (const v of longest) w = Math.max(w, measure(v))
  return w
}

/** The width the name column wants, given the widest name in it and the
 *  scroller it has to freeze inside. Never narrower than the type
 *  default, so no register loses room it had today. */
export function nameColumnWidth(widestText: number, available: number): number {
  const floor = DEFAULT_COL_W.text
  const ceiling = Math.max(
    floor,
    Math.min(MAX_COL_W, Math.round(available * NAME_MAX_SHARE)),
  )
  return Math.max(floor, Math.min(ceiling, Math.ceil(widestText + CELL_TEXT_INSET)))
}

/* ---------------------------------------------------------- */
/* measuring against the face the cell is actually drawn in    */
/* ---------------------------------------------------------- */

/** The font a value cell is painted with, read off a live one so this
 *  can never drift from `table.css`. `null` until a cell exists — the
 *  first render draws with the type default and the layout effect below
 *  corrects it before the browser paints. */
function paintedFont(): string | null {
  const cell = document.querySelector('.tb-val')
  if (!cell) return null
  const cs = getComputedStyle(cell)
  if (cs.fontSize === '') return null
  return `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
}

let canvas: HTMLCanvasElement | null = null

/** THE FONT IS SET INSIDE THE CLOSURE, NOT OUTSIDE IT. One canvas is
 *  shared, so a second measurer built while the first is still in use
 *  would silently re-point the first at its own face — and the register
 *  now measures three faces (the sans a name is drawn in, the mono a
 *  figure is, the mono a date is). Every call states its own font. */
function measurerFor(font: string): (s: string) => number {
  canvas ??= document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return (s) => s.length * 7
  return (s) => {
    ctx.font = font
    return ctx.measureText(s).width
  }
}

/* ---------------------------------------------------------- */
/* the same measurement, per painted cell                     */
/* ---------------------------------------------------------- */

/** Above this many distinct strings the cache is dropped whole. A
 *  register's painted vocabulary is small and hugely repetitive —
 *  Rigging Kits draws "TILLER CONVERSION KITS" on twenty-six rows — so
 *  this is a ceiling against a session that walks fifty registers, not
 *  a working size. */
const CLIP_CACHE_MAX = 20000

/** The three faces a value cell is drawn in, keyed by the class that
 *  selects them. A NAME is Inter at 12.5px; a FIGURE is IBM Plex Mono
 *  at 12px, which is nearly a fifth wider per digit, and a money value
 *  measured against the sans reads as fitting when it is cut — the one
 *  value on the sheet where that matters most. A DATE is the mono again
 *  at 11.5px. Read off live cells so none of it can drift from
 *  `table.css`. */
const VALUE_FACES = { text: '.tb-val', num: '.tb-num', date: '.tb-date' } as const
export type ValueFace = keyof typeof VALUE_FACES

function faceFonts(): Record<ValueFace, string> | null {
  const base = paintedFont()
  if (base === null) return null
  const out = { text: base, num: base, date: base }
  for (const face of ['num', 'date'] as const) {
    const el = document.querySelector(VALUE_FACES[face])
    if (!el) continue
    const cs = getComputedStyle(el)
    if (cs.fontSize === '') continue
    out[face] = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  }
  return out
}

/** Painted width of a string in the face its cell draws it in, cached
 *  across cells and re-taken when the faces change.
 *
 *  WHY THIS EXISTS AS WELL AS `widestOf`. `mayBeClipped` decides, per
 *  painted cell, whether the value carries itself as a title. Its own
 *  note said a canvas measurement there would be "thousands per
 *  scroll" — and thousands of `measureText` calls WOULD be felt. What
 *  is not felt is a Map lookup, because a register's painted vocabulary
 *  is far smaller than its cell count and hugely repetitive. Measured
 *  on Rigging Kits, the largest register there is: its 640 rows x 44
 *  columns are 28,160 cells and 4,430 distinct strings, each measured
 *  once. Instrumented live, `measureText` is called 345 times across a
 *  sweep of all 44 columns and ZERO times across forty vertical scroll
 *  steps after that — every cell on the way down is a cache hit.
 *
 *  `undefined` until a cell has been painted to read the faces off —
 *  the first frame falls back to `mayBeClipped`'s character estimate,
 *  and the state set here re-renders with the measured answer. */
export function usePaintedWidth():
  | ((s: string, face: ValueFace) => number)
  | undefined {
  const [fonts, setFonts] = useState<Record<ValueFace, string> | null>(null)
  const cache = useRef<Map<string, number>>(new Map())

  useLayoutEffect(() => {
    const next = faceFonts()
    if (next === null) return
    if (
      fonts === null ||
      next.text !== fonts.text ||
      next.num !== fonts.num ||
      next.date !== fonts.date
    ) {
      setFonts(next)
    }
  })

  /* A webfont arriving after the first measurement invalidates every
     entry: Inter is wider than the fallback they were taken in. */
  const [facesIn, setFacesIn] = useState(false)
  useEffect(() => {
    if (facesIn) return
    let live = true
    void document.fonts?.ready.then(() => {
      if (live) setFacesIn(true)
    })
    return () => {
      live = false
    }
  }, [facesIn])

  return useMemo(() => {
    if (fonts === null) return undefined
    cache.current = new Map()
    const of: Record<ValueFace, (s: string) => number> = {
      text: measurerFor(fonts.text),
      num: measurerFor(fonts.num),
      date: measurerFor(fonts.date),
    }
    return (s: string, face: ValueFace): number => {
      const key = `${face} ${s}`
      const hit = cache.current.get(key)
      if (hit !== undefined) return hit
      if (cache.current.size >= CLIP_CACHE_MAX) cache.current = new Map()
      const w = of[face](s)
      cache.current.set(key, w)
      return w
    }
    /* `facesIn` is a re-measure trigger and is read for no other reason */
  }, [fonts, facesIn])
}

/* ---------------------------------------------------------- */
/* the hooks                                                  */
/* ---------------------------------------------------------- */

/** One box's own width, kept current. A callback ref rather than a
 *  `useRef` so the first measurement happens the moment the element
 *  lands, and a `ResizeObserver` so a window resize — the whole point
 *  of a share of the window — reaches the width. */
export function useBoxWidth(): [(el: HTMLElement | null) => void, number] {
  const [w, setW] = useState(0)
  const ro = useRef<ResizeObserver | null>(null)

  const attach = useCallback((el: HTMLElement | null) => {
    ro.current?.disconnect()
    ro.current = null
    if (!el) return
    const read = (): void =>
      setW((prev) => {
        const next = el.clientWidth
        /* 0 is "not being painted" — a card skipped by
           `content-visibility: auto` measures 0 and adopting it would
           collapse the ceiling to the floor. Keep the last real one. */
        return next <= 0 || next === prev ? prev : next
      })
    read()
    const obs = new ResizeObserver(read)
    obs.observe(el)
    ro.current = obs
  }, [])

  useEffect(() => () => ro.current?.disconnect(), [])

  return [attach, w]
}

const NO_WIDTHS: Record<string, number> = {}

/** The name column's width, as a one-entry width map to merge UNDER the
 *  reader's own. `{}` when the table has no display column, no rows, or
 *  nothing has been painted yet. */
export function useNameColumnWidth(
  entity: EntityDef | undefined,
  rows: readonly RowData[],
  /** the scroller the pin freezes inside; 0 before it is measured */
  available: number,
): Record<string, number> {
  const [font, setFont] = useState<string | null>(null)

  /* BEFORE PAINT, deliberately. The first render draws the pin at the
     type default; this runs on the same frame, and the state it sets
     re-renders synchronously — so the corrected width is what the
     browser actually paints, with no flash of a narrow column. */
  useLayoutEffect(() => {
    const next = paintedFont()
    if (next !== null && next !== font) setFont(next)
  })

  /* A webfont that arrives after the first measurement invalidates it:
     Inter is wider than the fallback it was measured in. One re-measure
     when the faces are in, and never again. */
  const [facesIn, setFacesIn] = useState(false)
  useEffect(() => {
    if (facesIn) return
    let live = true
    void document.fonts?.ready.then(() => {
      if (live) setFacesIn(true)
    })
    return () => {
      live = false
    }
  }, [facesIn])

  const field = entity ? displayFieldOf(entity) : undefined

  const widest = useMemo(() => {
    if (!field || font === null || rows.length === 0) return 0
    const measure = measurerFor(font)
    const texts = rows.map((row) => {
      const value = valueForField(row, field, row.values)
      return cellPrintText(field, value, cellToText(value, field))
    })
    return widestOf(texts, measure)
    /* `facesIn` is a re-measure trigger and is read for no other reason */
  }, [field, font, rows, facesIn])

  return useMemo(() => {
    if (!field || widest === 0 || available <= 0) return NO_WIDTHS
    return { [field.id]: nameColumnWidth(widest, available) }
  }, [field, widest, available])
}
