/* ============================================================
   THE COLUMN MAPPER'S MEMORY — CONFIG_FINDINGS adopt 11.

   What is asserted is what the memory REFUSES, because everything it
   offers is only as good as what it declines to offer:

     · it remembers a DECISION and never a guess — only what a person
       committed is written;
     · it does not remember "make a new column", because replaying
       that would make a second column of the same name every month;
     · it drops a remembered column that has gone from the table AND
       names it, rather than sending a supplier's price at a field id
       nothing resolves;
     · and it recognises a block by its HEADINGS, so a supplier who
       reorders a column is still recognised while a different block
       is not.
   ============================================================ */

import { beforeEach, describe, expect, it } from 'vitest'
import type { EntityDef } from '@/types/model'
import type { MapTo } from './pasteBlock'
import {
  KEEP,
  applyTo,
  fingerprintOf,
  forget,
  forgetAllMappings,
  mappingsFor,
  normHeader,
  recall,
  remember,
} from './mapMemory'

const ORG = 'northside'
const ISO = '2026-01-01T00:00:00.000Z'

const table = (fieldIds: string[]): EntityDef => ({
  id: 'e-parts',
  name: 'Parts',
  accent: 'blue',
  fields: fieldIds.map((id) => ({ id, name: id, type: 'text' as const })),
  displayFieldId: fieldIds[0] ?? '',
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
})

const toField = (fieldId: string): MapTo => ({ to: 'field', fieldId })
const SKIP: MapTo = { to: 'skip' }
const NEW: MapTo = { to: 'new', name: 'Rebate', type: 'number' }

beforeEach(() => {
  forgetAllMappings()
  globalThis.localStorage?.clear()
})

describe('recognising a block by its headings', () => {
  it('reads the same shape however the columns are ordered', () => {
    expect(fingerprintOf(['Part No', 'Cost'])).toBe(fingerprintOf(['Cost', 'Part No']))
  })

  it('reads past case, punctuation and spacing, which is how one column arrives spelled three ways', () => {
    expect(normHeader('Part  No.')).toBe(normHeader('PART_NO'))
  })

  it('HAS NO SHAPE AT ALL WITHOUT HEADINGS, and refuses to match on one', () => {
    expect(fingerprintOf(['', '  '])).toBe('')
    expect(remember('e-parts', ['', ''], [SKIP, SKIP], 1, ORG)).toBeNull()
  })

  it('does not confuse two different suppliers', () => {
    remember('e-parts', ['Part No', 'Cost'], [toField('f1'), toField('f2')], 1, ORG)
    expect(recall('e-parts', ['SKU', 'Price'], ORG)).toBeNull()
  })

  it('does not carry a mapping from one table to another', () => {
    remember('e-parts', ['Part No'], [toField('f1')], 1, ORG)
    expect(recall('e-other', ['Part No'], ORG)).toBeNull()
  })
})

describe('what it keeps, and what it will not', () => {
  it('keeps a column somebody pointed at a field', () => {
    remember('e-parts', ['Part No', 'Cost'], [toField('f1'), toField('f2')], 1, ORG)
    const back = recall('e-parts', ['Part No', 'Cost'], ORG)
    expect(back?.columns['part no']).toEqual({ to: 'field', fieldId: 'f1' })
  })

  it('keeps a deliberate skip, because choosing to ignore a column is a decision too', () => {
    remember('e-parts', ['Part No', 'Notes'], [toField('f1'), SKIP], 1, ORG)
    expect(recall('e-parts', ['Part No', 'Notes'], ORG)?.columns.notes).toEqual({ to: 'skip' })
  })

  it('DOES NOT REMEMBER "MAKE A NEW COLUMN", which would make one every month', () => {
    remember('e-parts', ['Part No', 'Rebate'], [toField('f1'), NEW], 1, ORG)
    const back = recall('e-parts', ['Part No', 'Rebate'], ORG)
    expect(back?.columns.rebate).toBeUndefined()
    expect(back?.columns['part no']).toBeDefined()
  })

  it('keeps nothing at all when every choice was a new column', () => {
    expect(remember('e-parts', ['Rebate'], [NEW], 1, ORG)).toBeNull()
  })

  it('replaces the mapping for a shape rather than stacking two', () => {
    remember('e-parts', ['Part No'], [toField('f1')], 1, ORG)
    remember('e-parts', ['Part No'], [toField('f2')], 2, ORG)
    expect(mappingsFor('e-parts', ORG)).toHaveLength(1)
    expect(recall('e-parts', ['Part No'], ORG)?.columns['part no']).toEqual({
      to: 'field',
      fieldId: 'f2',
    })
  })

  it('keeps the newest KEEP shapes and drops the oldest', () => {
    for (let i = 0; i < KEEP + 2; i += 1) {
      remember('e-parts', [`Col ${i}`], [toField('f1')], 1000 + i, ORG)
    }
    expect(mappingsFor('e-parts', ORG)).toHaveLength(KEEP)
    expect(recall('e-parts', ['Col 0'], ORG)).toBeNull()
    expect(recall('e-parts', [`Col ${KEEP + 1}`], ORG)).not.toBeNull()
  })

  it('is forgotten when asked', () => {
    const kept = remember('e-parts', ['Part No'], [toField('f1')], 1, ORG)
    if (!kept) throw new Error('should have kept one')
    forget('e-parts', kept.fingerprint, ORG)
    expect(recall('e-parts', ['Part No'], ORG)).toBeNull()
  })
})

describe('a column that has gone since', () => {
  it('IS DROPPED AND NAMED, rather than aiming a price at a field id nothing resolves', () => {
    remember('e-parts', ['Part No', 'Cost'], [toField('f1'), toField('f2')], 1, ORG)
    const back = recall('e-parts', ['Part No', 'Cost'], ORG)
    if (!back) throw new Error('should have recalled')
    const applied = applyTo(back, table(['f1']))
    expect(applied.columns['part no']).toEqual({ to: 'field', fieldId: 'f1' })
    expect(applied.columns.cost).toBeUndefined()
    expect(applied.lost).toEqual(['cost'])
  })

  it('keeps a skip whatever the table looks like, because a skip names no column', () => {
    remember('e-parts', ['Notes'], [SKIP], 1, ORG)
    const back = recall('e-parts', ['Notes'], ORG)
    if (!back) throw new Error('should have recalled')
    expect(applyTo(back, table([])).columns.notes).toEqual({ to: 'skip' })
    expect(applyTo(back, table([])).lost).toEqual([])
  })
})
