/* ============================================================
   The request that carries a chosen row from the search to the
   sheet. Four properties, and each one is a defect that was either
   just fixed or has to stay fixed.

   IT WAITS. The request is published BEFORE the table stage exists,
   so a request that only reached an already-mounted listener would
   be lost every single time — which is the whole path this feature
   is on.

   IT IS PER TABLE. Two places asking for two rows must not overwrite
   each other's answer.

   IT IS CONSUMED ONCE. A table page that kept "you came here for row
   41" would jump back to row 41 on every re-mount and every
   re-focus, which is the camera arguing with the person.

   AND THE SAME ROW TWICE IS TWO ARRIVALS. Picking one result,
   walking away and picking it again has to land twice; without the
   token the second request is byte-identical to the first and a
   subscriber comparing values would ignore it.

   `rowRevealOf` is the exact function the hook hands to
   `useSyncExternalStore`, so reading through it here is reading what
   a mounted sheet reads.
   ============================================================ */
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearRowReveal,
  forgetRowReveal,
  requestRowReveal,
  rowRevealOf,
} from './rowRevealState'

describe('rowRevealState — the request that carries a chosen row', () => {
  afterEach(() => {
    clearRowReveal('t1')
    clearRowReveal('t2')
  })

  it('waits for the sheet rather than needing it to be listening', () => {
    requestRowReveal('t1', 'r1')
    expect(rowRevealOf('t1')?.rowId).toBe('r1')
  })

  it('is kept per table, so two sheets cannot steal each other’s row', () => {
    requestRowReveal('t1', 'r1')
    requestRowReveal('t2', 'r2')
    expect(rowRevealOf('t1')?.rowId).toBe('r1')
    expect(rowRevealOf('t2')?.rowId).toBe('r2')
  })

  it('is gone once it has been consumed, and takes nothing else with it', () => {
    requestRowReveal('t1', 'r1')
    requestRowReveal('t2', 'r2')
    clearRowReveal('t1')
    expect(rowRevealOf('t1')).toBeUndefined()
    expect(rowRevealOf('t2')?.rowId).toBe('r2')
  })

  it('reads as a NEW request when the same row is picked again', () => {
    requestRowReveal('t1', 'r1')
    const first = rowRevealOf('t1')
    clearRowReveal('t1')
    requestRowReveal('t1', 'r1')
    const second = rowRevealOf('t1')
    expect(second?.rowId).toBe('r1')
    expect(second?.token).not.toBe(first?.token)
  })

  it('replaces a request the sheet never got to, rather than queueing it', () => {
    /* two presses in a row mean the second row is the one wanted */
    requestRowReveal('t1', 'r1')
    requestRowReveal('t1', 'r9')
    expect(rowRevealOf('t1')?.rowId).toBe('r9')
  })

  it('forgetting a table that left the board is the same act as consuming', () => {
    expect(forgetRowReveal).toBe(clearRowReveal)
    requestRowReveal('t1', 'r1')
    forgetRowReveal('t1')
    expect(rowRevealOf('t1')).toBeUndefined()
  })

  it('does not throw when there is nothing to clear', () => {
    expect(() => clearRowReveal('never-asked')).not.toThrow()
  })
})
