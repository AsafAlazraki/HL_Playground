/* ============================================================
   THE PIN AND THE FOLD, pinned against the real seed.

   UX_PASS §7 states the task the whole register is for: "reading a
   price without losing the product". §9 item 6 is the answer — a
   pinned display column, so a 33-column sheet scrolled 3,724px to
   reach `Dealer List Price` still says which boat the figure belongs
   to. That much has shipped for a while, and the first block below
   holds it in place.

   THE HALF THAT HAD NOT SHIPPED, and the reason this file exists.
   A folded band drops its columns out of the addressable set, which
   is right for every band but one. Measured here on the real file:
   the display column lives INSIDE a band on 53 of 53 tables, so
   folding that band took the pin with it and `pinWidthOf` went to
   zero. Two one-press routes to that screen, both measured at a
   1280px window:

     Rigging Kits, 44 columns — fold IDENTITY on its own and the sheet
     is still 5,444px against a 1,280px window: 4,164px of sideways
     scroll with nothing on it that names a row.

     COLLAPSE ALL, then open the money band — which is the reason
     COLLAPSE ALL exists (`useWholeTable`: "reading it meant scrolling
     past forty columns to reach Hull Only Pricing"). On Highfield
     Inflatables that landed on twelve slots, 588 rows of dollars, and
     no boat.

   So the pin survives its own band's fold. The cost is one column
   instead of one chip — 184px against 132px — and the last block
   holds the promise that has to pay for it: COLLAPSE ALL still puts
   the table's whole shape inside 1280 on every table in the file.

   Everything is measured through the same pure functions the grid
   draws with, because this failure is silent: nothing throws, the
   sheet simply stops saying what you are reading.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { displayFieldOf, type EntityDef, type FieldDef } from '@/types/model'
import { buildNorthsideProject } from '@/demos/northside'
import {
  bandsOf,
  buildSections,
  FOLD_MIN_W,
  foldWidthFor,
  layoutColumns,
  pinWidthOf,
  type ColumnSlot,
} from './sections'
import { ADD_COL_W, GUTTER_W } from './helpers'
import { NAME_MAX_SHARE } from './nameColumnWidth'

const project = buildNorthsideProject()
const byName = (name: string): EntityDef => {
  const e = project.entities.find((x) => x.name === name)
  if (!e) throw new Error(`no table named ${name} in the seed`)
  return e
}

/** The smallest window the register is promised on — the same number
 *  `FOLD_MIN_W` was set against in `sections.ts`. */
const WINDOW = 1280

const pinOf = (e: EntityDef): FieldDef => {
  const d = displayFieldOf(e)
  if (!d) throw new Error(`${e.name} has no display column`)
  return d
}

const everyBand = (e: EntityDef): Set<string> =>
  new Set((e.sections ?? []).map((s) => s.id))

/** The sheet exactly as the grid would lay it out, at `WINDOW`, with
 *  `folded` shut. Default widths: nobody has dragged anything. */
function sheet(
  e: EntityDef,
  folded: Set<string>,
): { drawn: boolean; pinW: number; width: number; scroll: number } {
  const pin = pinOf(e)
  const model = buildSections(e.fields, e.sections, folded, pin.id)
  const foldW = foldWidthFor(model.slots, {}, WINDOW)
  const layout = layoutColumns(model.slots, {}, foldW)
  const width = GUTTER_W + layout.total + ADD_COL_W
  return {
    drawn: model.fields.some((f) => f.id === pin.id),
    pinW: pinWidthOf(layout, pin.id),
    width,
    scroll: Math.max(0, width - WINDOW),
  }
}

describe('what the pin is for', () => {
  it('is the identity column, on every table in the file', () => {
    for (const e of project.entities) {
      const pin = displayFieldOf(e)
      expect(pin, e.name).toBeDefined()
      expect(e.fields.some((f) => f.id === pin?.id), e.name).toBe(true)
    }
  })

  it('holds its width at the far right of the widest sheet', () => {
    /* 44 columns and 650 rows: the widest table in the file. Nothing
       folded, scrolled as far right as it goes — the pin is frozen, so
       the name is still 184px of the window. */
    const kits = byName('Rigging Kits')
    expect(kits.fields.length).toBe(44)
    const open = sheet(kits, new Set())
    expect(open.scroll).toBeGreaterThan(4000)
    expect(open.pinW).toBe(184)
  })
})

describe('the fold used to take it, and does not now', () => {
  it('files the display column inside a band on all 53 tables', () => {
    /* the measurement the whole change rests on: were this a handful
       of tables it would be an edge case, and it is not */
    const inside = project.entities.filter((e) => {
      const pin = displayFieldOf(e)
      return (
        pin?.sectionId !== undefined &&
        (e.sections ?? []).some((s) => s.id === pin.sectionId)
      )
    })
    expect(project.entities.length).toBe(53)
    expect(inside.length).toBe(53)
  })

  it('keeps the name when its own band is folded on its own', () => {
    /* one press, on the widest table, and the sheet still scrolls four
       thousand pixels sideways */
    const kits = byName('Rigging Kits')
    const pin = pinOf(kits)
    const shut = sheet(kits, new Set([pin.sectionId ?? '']))
    expect(shut.scroll).toBeGreaterThan(4000)
    expect(shut.drawn).toBe(true)
    expect(shut.pinW).toBe(184)
  })

  it('keeps the name through COLLAPSE ALL, on every table in the file', () => {
    for (const e of project.entities) {
      const all = sheet(e, everyBand(e))
      expect(all.drawn, e.name).toBe(true)
      expect(all.pinW, e.name).toBeGreaterThan(0)
    }
  })

  it('keeps the name on the walk COLLAPSE ALL exists for', () => {
    /* fold everything, then open the money band — the two presses that
       take a reader from a 33-column sheet to the prices */
    const highfield = byName('Highfield Inflatables')
    const money = (highfield.sections ?? []).find((s) => s.name === 'Hull Only Pricing')
    expect(money).toBeDefined()
    const folded = everyBand(highfield)
    folded.delete(money?.id ?? '')
    const at = sheet(highfield, folded)
    expect(at.drawn).toBe(true)
    expect(at.pinW).toBe(184)
  })

  it('leaves the pin addressable — it is the same cell, not a copy', () => {
    /* a folded band's columns leave `fields`, and `fields` IS the
       addressable set: keyboard, paste-by-rowId, fill and copy all
       index it. The pin has to still be in there, or the grid draws a
       name nobody can select. */
    const stacer = byName('Stacer')
    const pin = pinOf(stacer)
    const model = buildSections(stacer.fields, stacer.sections, everyBand(stacer), pin.id)
    expect(model.fields).toEqual([pin])
    const slot = model.slots.find((s) => s.kind === 'field')
    expect(slot?.kind === 'field' && slot.field.id).toBe(pin.id)
    expect(slot?.kind === 'field' && slot.col).toBe(0)
  })
})

describe('the header over a pin whose run is folded', () => {
  const stacer = byName('Stacer')
  const pin = pinOf(stacer)
  const model = buildSections(stacer.fields, stacer.sections, everyBand(stacer), pin.id)
  const layout = layoutColumns(model.slots, {}, foldWidthFor(model.slots, {}, WINDOW))
  const bands = bandsOf(layout, pin.id)

  it('names the section once, over the column that stayed', () => {
    const identity = bands.filter((b) => b.section?.id === pin.sectionId)
    expect(identity.length).toBe(1)
    expect(identity[0].pinned).toBe(true)
    /* not `collapsed`: it spans a real, addressable column and keeps
       its aria colindex. `folded` is what says the rest went. */
    expect(identity[0].collapsed).toBe(false)
  })

  it('reports the whole run, not the one column it spans', () => {
    const identity = bands.find((b) => b.section?.id === pin.sectionId)
    const run = stacer.fields.filter((f) => f.sectionId === pin.sectionId).length
    expect(run).toBe(7)
    expect(identity?.folded).toBe(run)
    /* what the press does. `count` is 1 — the piece is one column —
       and a control offering to fold "1 column" while folding seven
       would be a lie about the press. */
    expect(identity?.count).toBe(1)
    expect(identity?.runCount).toBe(run)
  })

  it('leaves every other band a chip, exactly as before', () => {
    const chips = bands.filter((b) => b.collapsed)
    expect(chips.length).toBe((stacer.sections ?? []).length - 1)
    for (const c of chips) expect(c.folded).toBeUndefined()
  })
})

describe('what the extra column costs', () => {
  it('still puts every whole shape inside a 1280px window', () => {
    /* the promise COLLAPSE ALL is FOR: "a folded shape you have to
       scroll is not a shape" (sections.ts). The pin is 184px where a
       chip was 132px, so this is the number that had to be re-measured
       rather than assumed. */
    let widest = 0
    let name = ''
    for (const e of project.entities) {
      const all = sheet(e, everyBand(e))
      if (all.width > widest) {
        widest = all.width
        name = e.name
      }
    }
    expect(widest, name).toBeLessThanOrEqual(WINDOW)
    /* the measured figure, so a new band or a wider display column
       cannot quietly eat the 84px of headroom that is left */
    expect(widest).toBe(1196)
  })

  it('leaves the eleven-chip promise standing at a maximal name', () => {
    /* the pin is not always 184px — `nameColumnWidth` grows it up to
       `NAME_MAX_SHARE` of the scroller. The worst case the header note
       on `FOLD_MIN_W` claims, checked here rather than trusted: eleven
       bands, a 1280px window, a name at its own ceiling. */
    const name = Math.round(NAME_MAX_SHARE * WINDOW)
    expect(name).toBe(486)
    const slots: ColumnSlot[] = [
      { kind: 'field', field: pinOf(byName('Stacer')), col: 0 },
      ...Array.from({ length: 11 }, (_, i) => ({
        kind: 'fold' as const,
        section: { id: `s${i}`, name: `BAND ${i}` },
        count: 4,
      })),
    ]
    const widths = { [pinOf(byName('Stacer')).id]: name }
    const foldW = foldWidthFor(slots, widths, WINDOW)
    expect(foldW).toBe(FOLD_MIN_W)
    const width = GUTTER_W + layoutColumns(slots, widths, foldW).total + ADD_COL_W
    expect(width).toBeLessThanOrEqual(WINDOW)
    expect(width).toBe(1278)
  })

  it('costs one column against one chip, and nothing else', () => {
    const stacer = byName('Stacer')
    const pin = pinOf(stacer)
    const withPin = sheet(stacer, everyBand(stacer))
    const withoutPin = ((): number => {
      const model = buildSections(stacer.fields, stacer.sections, everyBand(stacer))
      const foldW = foldWidthFor(model.slots, {}, WINDOW)
      return GUTTER_W + layoutColumns(model.slots, {}, foldW).total + ADD_COL_W
    })()
    /* 184px of pinned text column in place of a 132px chip */
    expect(withPin.width - withoutPin).toBe(52)
    expect(pin.type).toBe('text')
  })
})
