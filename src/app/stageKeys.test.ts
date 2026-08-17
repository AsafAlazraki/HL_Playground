/* ============================================================
   THE ESCAPE ORDER, EXERCISED.

   Every case here is a thing that was true of the app when the key was
   wired up, and the reason each rung exists is named on the test rather
   than only in the module. Rung 1 — a menu or dialog that takes Escape
   in the capture phase and stops it — cannot appear here, because in
   that world this predicate is never reached at all; what CAN be
   asserted is everything that survives to be asked.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { closesStage, type StageKey } from './stageKeys'

const press = (over: Partial<StageKey> = {}): StageKey => ({
  key: 'Escape',
  alt: false,
  ctrl: false,
  meta: false,
  shift: false,
  handled: false,
  inField: false,
  ...over,
})

describe('closesStage', () => {
  it('closes the stage on a bare Escape with the focus nowhere in particular', () => {
    expect(closesStage(press())).toBe(true)
  })

  it('is only ever about Escape', () => {
    for (const key of ['Enter', 'Delete', 'Backspace', 'Tab', 'e', 'Esc', ' ']) {
      expect(closesStage(press({ key }))).toBe(false)
    }
  })

  /* THE GRID'S CELL EDITOR, twice over. `resolveKey` answers
     Escape-while-editing with `edit-cancel` and `useSheetCommands`
     calls preventDefault() before reverting — so the event arrives
     flagged — and the focus is inside `input.tb-editor` at the time, so
     it is in a field as well. Either fact alone must be enough: if one
     of them is ever dropped upstream, reverting a cell must still not
     throw the page away. */
  it('leaves an Escape the grid has already answered alone', () => {
    expect(closesStage(press({ handled: true }))).toBe(false)
    expect(closesStage(press({ inField: true }))).toBe(false)
    expect(closesStage(press({ handled: true, inField: true }))).toBe(false)
  })

  /* A search box clears itself on Escape; a quote is almost entirely
     fields. Neither may lose the page. */
  it('leaves an Escape typed into a field to the field', () => {
    expect(closesStage(press({ inField: true }))).toBe(false)
  })

  /* Modifier-gated keys belong to the desktop shortcuts in
     useWindowKeys, or to the browser. */
  it('ignores a modified Escape', () => {
    expect(closesStage(press({ meta: true }))).toBe(false)
    expect(closesStage(press({ ctrl: true }))).toBe(false)
    expect(closesStage(press({ alt: true }))).toBe(false)
    expect(closesStage(press({ shift: true }))).toBe(false)
  })
})
