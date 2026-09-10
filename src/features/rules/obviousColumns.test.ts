/* ============================================================
   UX_PASS §5 Finding 18, and the §7 rule behind it: "A suggestion
   that is confidently wrong is worse than no suggestion. If a
   guess is weak, say it is a guess."

   So these assert the SENTENCE as hard as the pick. A control that
   chose the right column and still called an arbitrary one obvious
   would pass a test about the choice and fail the finding.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { EntityDef, FieldDef } from '@/types/model'
import { obviousColumn, obviousLabel, obviousSay } from './obviousColumns'

const ISO = '2026-01-01T00:00:00.000Z'

const f = (id: string, name: string): FieldDef => ({ id, name, type: 'text' })

const table = (over: Partial<EntityDef> & { id: string }): EntityDef => ({
  name: over.id,
  accent: 'blue',
  fields: [f('f1', 'Code'), f('f2', 'Model')],
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
  ...over,
})

/* ---------------------------------------------------------- */

describe('which column, and how firm the answer is', () => {
  it('takes the column the table nominated, not the first one', () => {
    const out = obviousColumn(table({ id: 'Boats', displayFieldId: 'f2' }))
    expect(out?.field.name).toBe('Model')
    expect(out?.guessed).toBe(false)
  })

  it('falls back to the first column and calls it a guess', () => {
    /* Column order is an accident of how somebody's spreadsheet was
       written — on the seeded set a boat table's first column is as
       likely to be a code as a name. */
    const out = obviousColumn(table({ id: 'Boats' }))
    expect(out?.field.name).toBe('Code')
    expect(out?.guessed).toBe(true)
  })

  it('falls through to the guess when displayFieldId names a deleted column', () => {
    /* A stale id must not crash and must not resolve to whatever now
       sits at that index. */
    const out = obviousColumn(table({ id: 'Boats', displayFieldId: 'gone' }))
    expect(out?.field.name).toBe('Code')
    expect(out?.guessed).toBe(true)
  })

  it('answers null for a table with no columns, which is a real state', () => {
    expect(obviousColumn(table({ id: 'New', fields: [] }))).toBeNull()
  })

  it('answers null for no table at all', () => {
    expect(obviousColumn(undefined)).toBeNull()
  })
})

describe('the button stops saying "obvious" the moment it is not', () => {
  const declared = obviousColumn(table({ id: 'A', displayFieldId: 'f2' }))
  const guessed = obviousColumn(table({ id: 'B' }))

  it('keeps the word when both tables answered for themselves', () => {
    expect(obviousLabel(declared, declared)).toBe('Use the obvious two')
  })

  it('drops it when EITHER half is a guess', () => {
    expect(obviousLabel(declared, guessed)).toBe('Use the likely two')
    expect(obviousLabel(guessed, declared)).toBe('Use the likely two')
  })

  it('counts what it is actually offering', () => {
    expect(obviousLabel(declared, null)).toBe('Use the obvious one')
    expect(obviousLabel(guessed, null)).toBe('Use the likely one')
  })
})

describe('the sentence names the columns and owns the guess', () => {
  const declared = obviousColumn(table({ id: 'A', displayFieldId: 'f2' }))
  const guessed = obviousColumn(table({ id: 'B' }))

  it('reports rather than proposes when neither is a guess', () => {
    expect(obviousSay(declared, declared)).toBe(
      'Model and Model — the columns these tables label their rows with.',
    )
  })

  it('says which half is the guess, and why', () => {
    /* The two halves can differ, and a sentence that averaged them
       would be wrong about both. */
    expect(obviousSay(declared, guessed)).toBe(
      'Model, and Code as a guess — that table has not said which column names a row, so this is the first one.',
    )
  })

  it('owns it when both are guesses', () => {
    expect(obviousSay(guessed, guessed)).toBe(
      'Code and Code — a guess. These tables have not said which column names a row, so this is the first one.',
    )
  })

  it('says nothing when there is nothing to pick', () => {
    expect(obviousSay(null, null)).toBe('')
  })
})
