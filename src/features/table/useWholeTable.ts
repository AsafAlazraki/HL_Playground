/* ============================================================
   useWholeTable — seeing ALL of a wide register, not a window onto
   it.

   The real Boats table is fifty-eight columns in eleven bands and
   about eight columns fit on screen. Grouped rows solved the vertical
   problem; nothing solved the horizontal one. Reading it meant
   scrolling past forty columns to reach "Hull Only Pricing", and
   folding the bands one at a time meant eleven clicks.

   This hook is the whole answer, and it is deliberately three things
   and no more:

     FOLD EVERY BAND    one press turns fifty-eight columns into eleven
                        chips — `IDENTITY · 6`, `PRICING · 5` — and the
                        table's SHAPE fits one screen. This is the
                        primary answer.
     REACH ONE BAND     the strip's chips: pick a band by name and the
                        sheet scrolls to it, opening it if it was
                        folded. No traversal.
     FIT EVERY COLUMN   share the window out between the columns that
                        are drawn — down to the 116px floor and no
                        further. As many columns as can be READ, not as
                        many as will physically go.

   Two invariants are worth stating because they are what make the
   three feel like one idea:

   1. A folded band's columns are GONE from the addressable set (that
      is `useSectionedView`'s doing, upstream) — never hidden-but-
      focusable. So folding is also how you stop Tab, paste and fill
      from walking through forty money columns.
   2. While a fit is on, the sheet is re-shared the moment the drawn
      columns change: fold or reveal a band and the rest take the freed
      room back immediately.

   AND THE ONE THAT USED TO BE HERE AND WAS WRONG. It read "while a fit
   is on, the sheet ALWAYS fits", and FIT delivered that by working to a
   private 28px floor — under the contract's 116px, and under
   `.tb-cell`'s own CSS floor, so the maths said 39px while the paint
   said 116 and the band header drew 39px bands over 116px columns.
   Measured at 1280: one press took Stacer from 26 clipped values to
   119 and cut the band strip to "Id…", "Registr…". Fitting all of them
   at a width where none of them can be read is not fitting. The floor
   wins now, the register scrolls sideways when it must — DESIGN_CONTRACT
   §2 allows exactly that — and `onFit` says so out loud when it does.

   State lives in the two session-lived modules next door
   (`tableSectionState`, `tableFitState`), keyed by entityId, because
   both survive the unmount of the canvas AND of the FOCUS lens.
   ============================================================ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import { accentVar, isSystemFieldId, type ColumnSection, type FieldDef } from '@/types/model'
import {
  buildSections,
  fitColumns,
  foldWidthFor,
  layoutColumns,
  pinWidthOf,
  type ColumnLayout,
  type ColumnSlot,
  type FitReport,
} from './sections'
import { setSectionsFolded, useCollapsedSections } from './tableSectionState'
import { clearFitWidths, setFitWidths, useFitWidths } from './tableFitState'

/** One band, as the strip draws it. */
export interface BandChip {
  id: string
  name: string
  /** the band's own ink, already a CSS value */
  ink: string
  /** how many columns it holds — the same number folded or open, so
   *  the chip never changes its mind about how big the band is */
  count: number
  folded: boolean
  /**
   * The window's left edge is inside this band — i.e. this is the band
   * the reader is ON. Exactly one chip carries it.
   *
   * THE STRIP USED TO SAY NOTHING ABOUT WHERE YOU WERE. Eight chips,
   * all identical, over a register 58 columns wide: the one fact a map
   * has to carry — you are here — was the fact it did not have.
   */
  here: boolean
  /**
   * Pressing this chip cannot move the view: the scroll position it
   * asks for is the one the sheet is already at.
   *
   * WHY THREE CHIPS APPEARED TO DO NOTHING. `revealBand` parks a band's
   * left edge beside the frozen name column, and the browser clamps any
   * scrollLeft past the end of the content. On Highfield Inflatables the
   * last three bands all sit inside the final window, so all three
   * clamp to the same maximum — press any one and the other two become
   * presses that change nothing at all, with no way to tell from
   * looking. They are not broken; those columns are already on screen.
   * So the chip says that instead of pretending to be a door.
   *
   * A FOLDED band is never `stuck`, whatever the scroll: pressing it
   * opens it, which is a real change.
   */
  stuck: boolean
}

export interface WholeTable {
  /** the bands that actually hold columns, in column order */
  bands: BandChip[]
  /** the band the window's left edge is in, by name — the strip prints
   *  it, because a lit chip says "here" and a sentence says which */
  atBandName: string | undefined
  /** every band folded shut — the toggle now reads EXPAND ALL */
  allFolded: boolean
  /**
   * The columns a PERSON has, folded ones included — which is
   * `entity.fields.length`, and NOT the locked UID column the grid draws
   * in front of them.
   *
   * ONE NUMBER, TWO SCREENS. Home's card reads `e.fields.length` and this
   * readout read `visibleFields(entity).length`, so Yamaha Outboards was
   * "27 columns" on the front door and "COLUMNS 28" over its own
   * register. The band chips are the tie-breaker: they already summed to
   * 27, because UID carries no `sectionId` and is in no band. A column
   * nobody can rename, retype, reorder or delete (model.ts UID_FIELD) is
   * not a column a person counts.
   */
  totalColumns: number
  /** columns the grid is drawing right now, on the same footing */
  shownColumns: number
  /** the window is currently shared out between the drawn columns */
  fitted: boolean
  /** fold every band, or open every one */
  toggleAllBands: () => void
  /** bring one band into view, opening it if it was folded */
  revealBand: (sectionId: string) => void
  /** share the window out between the drawn columns, or hand the
   *  reader's own widths back */
  toggleFit: () => void
}

/** Left edge of the first slot belonging to one band, gutter excluded —
 *  which is exactly the scrollLeft that parks it against the frozen
 *  gutter (see the active-cell reveal in `Grid`). */
function bandLeftOf(layout: ColumnLayout, sectionId: string): number | undefined {
  for (const { slot, x } of layout.placed) {
    const id = slot.kind === 'fold' ? slot.section.id : slot.section?.id
    if (id === sectionId) return x
  }
  return undefined
}

export function useWholeTable({
  entityId,
  sections,
  allFields,
  slots,
  widths,
  viewportRef,
  pinFieldId,
  onFit,
}: {
  entityId: string
  sections: readonly ColumnSection[] | undefined
  /** every addressable column of the table, folded ones included */
  allFields: FieldDef[]
  /** what the grid draws right now: columns, plus a folded band's chip */
  slots: ColumnSlot[]
  /** the widths in force — the reader's own, with any fit merged over */
  widths: Record<string, number>
  /** the grid's own scroller, so the window can be measured and a band
   *  can be scrolled to */
  viewportRef: RefObject<HTMLDivElement | null>
  /** the display column the grid freezes at the left edge, when there
   *  is one. REACH ONE BAND has to scroll a band clear of it, or the
   *  control that exists to bring a band into view parks it under the
   *  pin instead. */
  pinFieldId?: string
  /** Told when a fit landed at the 116px floor rather than inside the
   *  window, so the host can say so where the press happened. Not
   *  called when the whole sheet fits: the screen says that itself. */
  onFit?: (report: FitReport) => void
}): WholeTable {
  const collapsed = useCollapsedSections(entityId)
  const fit = useFitWidths(entityId)
  const fitted = fit !== undefined

  /* One chip per band that HOLDS something. A declared section with no
     columns left in it is not a band — a chip reading `PRICING · 0`
     would be a control that does nothing. */
  const bands = useMemo<Omit<BandChip, 'here' | 'stuck'>[]>(() => {
    if (!sections || sections.length === 0) return []
    const counts = new Map<string, number>()
    /* column order, not declaration order: the strip is a map of the
       sheet and has to run left to right the way the sheet does */
    const order: string[] = []
    for (const f of allFields) {
      if (f.sectionId === undefined) continue
      const seen = counts.get(f.sectionId)
      if (seen === undefined) order.push(f.sectionId)
      counts.set(f.sectionId, (seen ?? 0) + 1)
    }
    const byId = new Map(sections.map((s) => [s.id, s]))
    const out: Omit<BandChip, 'here' | 'stuck'>[] = []
    for (const id of order) {
      const section = byId.get(id)
      if (!section) continue
      out.push({
        id,
        name: section.name,
        ink: accentVar(section.accent ?? 'graphite'),
        count: counts.get(id) ?? 0,
        folded: collapsed.has(id),
      })
    }
    return out
  }, [sections, allFields, collapsed])

  const allFolded = bands.length > 0 && bands.every((b) => b.folded)

  /* the system column is exempt from both figures, so `total - shown`
     stays the number of columns a fold actually took away */
  const totalColumns = useMemo(
    () => allFields.reduce((n, f) => (isSystemFieldId(f.id) ? n : n + 1), 0),
    [allFields],
  )

  const shownColumns = useMemo(
    () =>
      slots.reduce(
        (n, s) => (s.kind === 'field' && !isSystemFieldId(s.field.id) ? n + 1 : n),
        0,
      ),
    [slots],
  )

  /* Re-share the window whenever the drawn columns change WHILE a fit
     is on — invariant 2 in the header. Returns the widths in force
     afterwards, so a caller that also needs geometry can use them. */
  const refit = useCallback(
    (nextSlots: ColumnSlot[]): Record<string, number> => {
      const el = viewportRef.current
      if (!fitted || !el) return widths
      const next = fitColumns(nextSlots, widths, el.clientWidth, pinFieldId).widths
      setFitWidths(entityId, next)
      return { ...widths, ...next }
    },
    [entityId, fitted, widths, viewportRef, pinFieldId],
  )

  /* What the sheet WILL be once a fold changes — worked out from the
     same pure builder the render uses, so the scroll target and the
     re-fit are right on the frame the fold lands, with no waiting for
     a layout pass. */
  const modelFor = useCallback(
    (nextCollapsed: ReadonlySet<string>) =>
      buildSections(allFields, sections, nextCollapsed),
    [allFields, sections],
  )

  /* ============================================================
     WHERE THE WINDOW IS, AND WHICH CHIPS ARE DOORS.

     Both answers come off ONE piece of geometry — the same layout
     `revealBand` scrolls with, so what a chip says and what it would do
     can never disagree. The layout is derived from the columns and the
     widths in force, which is exactly when it can change.

     THE SUBSCRIPTION IS BANDED, not continuous. A scroll handler that
     wrote `scrollLeft` into state would re-render the whole register on
     every frame of a sideways drag — the fault `tableLod.ts` is written
     around. This one computes the ANSWER (which band, which chips are
     inert) and hands back the previous object unless it actually
     changed, so dragging across the middle of one band costs one read
     per event and no render at all.
     ============================================================ */
  const layout = useMemo(() => {
    const model = modelFor(collapsed)
    const el = viewportRef.current
    const foldW = foldWidthFor(model.slots, widths, el?.clientWidth ?? 0)
    return layoutColumns(model.slots, widths, foldW)
  }, [modelFor, collapsed, widths, viewportRef])

  const [reach, setReach] = useState<{ hereId: string | null; stuck: string[] }>({
    hereId: null,
    stuck: [],
  })

  useEffect(() => {
    const el = viewportRef.current
    if (!el || bands.length === 0) return
    const pin = pinWidthOf(layout, pinFieldId)

    const read = (): void => {
      /* the browser will not scroll past the end of the content, so the
         target every chip really lands on is its own clamped to that */
      const max = Math.max(0, el.scrollWidth - el.clientWidth)
      const at = el.scrollLeft

      const stuck: string[] = []
      for (const b of bands) {
        const x = bandLeftOf(layout, b.id)
        if (x === undefined) continue
        const target = Math.min(Math.max(0, x - pin), max)
        /* a folded band always has something to do: open itself */
        if (!b.folded && Math.abs(target - at) < 1) stuck.push(b.id)
      }

      /* ============================================================
         WHICH BAND THE VIEW IS IN — the one taking up the most of it.

         The first version of this named the band CONTAINING the left
         edge, which is the literal answer and the wrong one. Measured on
         Highfield Inflatables scrolled to the end: the left edge sits in
         the last two cut-off columns of Motor Envelope while Registration,
         Hull Only Pricing and Source fill the rest of the window with
         their headers legible — so the strip said "Motor Envelope" about
         a screen that plainly showed three other bands. Whichever band
         has the most of the window is the one a person would name, and it
         is measured in the same pixels the reader is looking at.
         ============================================================ */
      const from = at + pin
      const to = at + el.clientWidth
      const seen = new Map<string, number>()
      for (const p of layout.placed) {
        const id = p.slot.kind === 'fold' ? p.slot.section.id : p.slot.section?.id
        if (id === undefined) continue
        const w = Math.min(p.x + p.w, to) - Math.max(p.x, from)
        if (w <= 0) continue
        seen.set(id, (seen.get(id) ?? 0) + w)
      }
      let hereId: string | null = null
      let hereW = 0
      /* `bands` order, so a tie between two equal slivers resolves to
         the leftmost rather than to whatever the map iterated first */
      for (const b of bands) {
        const w = seen.get(b.id) ?? 0
        if (w > hereW) {
          hereW = w
          hereId = b.id
        }
      }
      /* nothing of any band in the window — only the pin is showing */
      if (hereId === null) hereId = bands[0]?.id ?? null

      setReach((prev) => {
        if (
          prev.hereId === hereId &&
          prev.stuck.length === stuck.length &&
          prev.stuck.every((id, i) => id === stuck[i])
        ) {
          return prev
        }
        return { hereId, stuck }
      })
    }

    read()
    el.addEventListener('scroll', read, { passive: true })
    /* the window changing width moves every band's target, and a fold
       changes the content width without a scroll event of its own */
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', read)
      ro.disconnect()
    }
  }, [bands, layout, pinFieldId, viewportRef])

  const chips = useMemo<BandChip[]>(
    () =>
      bands.map((b) => ({
        ...b,
        here: b.id === reach.hereId,
        stuck: reach.stuck.includes(b.id),
      })),
    [bands, reach],
  )

  const atBandName = useMemo(
    () => chips.find((b) => b.here)?.name,
    [chips],
  )

  const toggleAllBands = useCallback(() => {
    if (bands.length === 0) return
    const fold = !allFolded
    const ids = bands.map((b) => b.id)
    setSectionsFolded(entityId, ids, fold)

    const next = new Set(collapsed)
    for (const id of ids) {
      if (fold) next.add(id)
      else next.delete(id)
    }
    refit(modelFor(next).slots)

    /* folded, the whole table is on screen — so start at its left
       edge rather than wherever the reader had scrolled to */
    if (fold) {
      const el = viewportRef.current
      if (el) el.scrollLeft = 0
    }
  }, [bands, allFolded, entityId, collapsed, refit, modelFor, viewportRef])

  const revealBand = useCallback(
    (sectionId: string) => {
      const wasFolded = collapsed.has(sectionId)
      const next = new Set(collapsed)
      next.delete(sectionId)
      if (wasFolded) setSectionsFolded(entityId, [sectionId], false)

      const model = modelFor(next)
      const inForce = wasFolded ? refit(model.slots) : widths
      const el = viewportRef.current
      if (el === null) return
      /* the same fold width the grid will draw with, or the scroll
         target lands on a column that is not where we think it is */
      const foldW = foldWidthFor(model.slots, inForce, el.clientWidth)
      const layout = layoutColumns(model.slots, inForce, foldW)
      const x = bandLeftOf(layout, sectionId)
      if (x === undefined) return
      /* land the band BESIDE the frozen name column, never under it */
      const target = Math.max(0, x - pinWidthOf(layout, pinFieldId))
      /* Now, and again once the fold has been committed. Both are
         needed: while the band is still folded the sheet is narrower
         than it is about to be, and the browser clamps a scrollLeft
         past the current content — so the first set lands short and
         the second one lands. A timeout rather than an animation frame
         deliberately: it runs whether or not the window is painting. */
      el.scrollLeft = target
      window.setTimeout(() => {
        el.scrollLeft = target
      }, 0)
    },
    [collapsed, entityId, modelFor, refit, widths, viewportRef, pinFieldId],
  )

  const toggleFit = useCallback(() => {
    if (fitted) {
      clearFitWidths(entityId)
      return
    }
    const el = viewportRef.current
    if (!el) return
    const report = fitColumns(slots, widths, el.clientWidth, pinFieldId)
    /* nothing flexible on the sheet — every band folded, say. Latching
       the control on would leave a pressed button that changed nothing */
    if (Object.keys(report.widths).length === 0) return
    setFitWidths(entityId, report.widths)
    /* AND SAY WHAT IT DID, when what it did is not what "fit" sounds
       like. The 116px floor is the contract's, and when it binds the
       register stays wider than the window — which is allowed, and is
       the reader's to know at the moment of the press rather than
       something to work out from a scrollbar. */
    if (!report.fitsWindow) onFit?.(report)
  }, [fitted, entityId, slots, widths, viewportRef, pinFieldId, onFit])

  return {
    bands: chips,
    atBandName,
    allFolded,
    totalColumns,
    shownColumns,
    fitted,
    toggleAllBands,
    revealBand,
    toggleFit,
  }
}
