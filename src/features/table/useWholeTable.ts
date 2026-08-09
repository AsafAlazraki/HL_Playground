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
                        are drawn, so all of them are on screen at
                        once. Dense on purpose — for seeing the table,
                        not for reading it.

   Two invariants are worth stating because they are what make the
   three feel like one idea:

   1. A folded band's columns are GONE from the addressable set (that
      is `useSectionedView`'s doing, upstream) — never hidden-but-
      focusable. So folding is also how you stop Tab, paste and fill
      from walking through forty money columns.
   2. While a fit is on, the sheet ALWAYS fits: fold or reveal a band
      and the remaining columns take the freed room back immediately.
      A control that says "fit" and then leaves you scrolling is worse
      than no control.

   State lives in the two session-lived modules next door
   (`tableSectionState`, `tableFitState`), keyed by entityId, because
   both survive the unmount of the canvas AND of the FOCUS lens.
   ============================================================ */
import { useCallback, useMemo } from 'react'
import type { RefObject } from 'react'
import { accentVar, type ColumnSection, type FieldDef } from '@/types/model'
import {
  buildSections,
  fitColumnWidths,
  foldWidthFor,
  layoutColumns,
  type ColumnLayout,
  type ColumnSlot,
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
}

export interface WholeTable {
  /** the bands that actually hold columns, in column order */
  bands: BandChip[]
  /** every band folded shut — the toggle now reads EXPAND ALL */
  allFolded: boolean
  /** columns the table has, folded ones included */
  totalColumns: number
  /** columns the grid is drawing right now */
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
}): WholeTable {
  const collapsed = useCollapsedSections(entityId)
  const fit = useFitWidths(entityId)
  const fitted = fit !== undefined

  /* One chip per band that HOLDS something. A declared section with no
     columns left in it is not a band — a chip reading `PRICING · 0`
     would be a control that does nothing. */
  const bands = useMemo<BandChip[]>(() => {
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
    const out: BandChip[] = []
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

  const shownColumns = useMemo(
    () => slots.reduce((n, s) => (s.kind === 'field' ? n + 1 : n), 0),
    [slots],
  )

  /* Re-share the window whenever the drawn columns change WHILE a fit
     is on — invariant 2 in the header. Returns the widths in force
     afterwards, so a caller that also needs geometry can use them. */
  const refit = useCallback(
    (nextSlots: ColumnSlot[]): Record<string, number> => {
      const el = viewportRef.current
      if (!fitted || !el) return widths
      const next = fitColumnWidths(nextSlots, widths, el.clientWidth)
      setFitWidths(entityId, next)
      return { ...widths, ...next }
    },
    [entityId, fitted, widths, viewportRef],
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
      const x = bandLeftOf(layoutColumns(model.slots, inForce, foldW), sectionId)
      if (x === undefined) return
      /* Now, and again once the fold has been committed. Both are
         needed: while the band is still folded the sheet is narrower
         than it is about to be, and the browser clamps a scrollLeft
         past the current content — so the first set lands short and
         the second one lands. A timeout rather than an animation frame
         deliberately: it runs whether or not the window is painting. */
      el.scrollLeft = x
      window.setTimeout(() => {
        el.scrollLeft = x
      }, 0)
    },
    [collapsed, entityId, modelFor, refit, widths, viewportRef],
  )

  const toggleFit = useCallback(() => {
    if (fitted) {
      clearFitWidths(entityId)
      return
    }
    const el = viewportRef.current
    if (!el) return
    const next = fitColumnWidths(slots, widths, el.clientWidth)
    /* nothing flexible on the sheet — every band folded, say. Latching
       the control on would leave a pressed button that changed nothing */
    if (Object.keys(next).length === 0) return
    setFitWidths(entityId, next)
  }, [fitted, entityId, slots, widths, viewportRef])

  return {
    bands,
    allFolded,
    totalColumns: allFields.length,
    shownColumns,
    fitted,
    toggleAllBands,
    revealBand,
    toggleFit,
  }
}
