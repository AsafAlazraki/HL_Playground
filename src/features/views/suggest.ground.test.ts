/* ============================================================
   HOW MUCH THE FILE ACTUALLY SAID — `RuleSuggestion.ground`.

   UX_PASS §5, finding 18: *"the guided path USE THE OBVIOUS TWO
   picks the first column of each table, which on the real data is
   `Series` on both sides — 193 rows naming neither the boat nor the
   motor. A suggestion that is confidently wrong is worse than no
   suggestion. Prefer `displayFieldId`; where the guess is weak, say
   it is a guess."*

   `RuleOffer` draws the caveat and demotes the button off one
   boolean — `ground === 'guess'` — so the whole of "say it is a
   guess" rests on this function classifying its own four answers
   honestly. That is not visible on screen when it goes wrong: a
   coincidence reclassified as `declared` simply loses its sentence
   and gets its blue button back, silently, which is the exact
   failure the finding is about.

   Measured on the real seed at 1280×800 (2026-09-09): six of the
   seventeen tables a Highfield page offers to relate suggest
   `Matrix is the same as Matrix` — a boat-to-boat column two hull
   brands happen to share. All six are guesses. This pins that.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, FieldDef, FieldType } from '@/types/model'
import { suggestRule } from './suggest'

const field = (id: string, name: string, type: FieldType = 'text'): FieldDef => ({
  id,
  name,
  type,
})

const table = (id: string, name: string, fields: FieldDef[]): EntityDef => ({
  id,
  name,
  accent: 'blue',
  fields,
  position: { x: 0, y: 0 },
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

describe('suggestRule — what the file said, and what we merely noticed', () => {
  it('a reference column pointing at the other table is DECLARED', () => {
    const boats = table('e-boats', 'Boats', [field('f-name', 'Model')])
    const motors = table('e-motors', 'Motors', [
      field('m-name', 'Model'),
      { id: 'm-boat', name: 'Boat', type: 'reference', refEntityId: 'e-boats' },
    ])
    const s = suggestRule(boats, motors)
    expect(s.kind).toBe('link')
    expect(s.ground).toBe('declared')
  })

  it('a Min/Max envelope naming a quantity the other side carries is DECLARED', () => {
    const boats = table('e-boats', 'Boats', [
      field('b-name', 'Model'),
      field('b-min', 'Min HP', 'number'),
      field('b-max', 'Max HP', 'number'),
    ])
    const motors = table('e-motors', 'Motors', [
      field('m-name', 'Model'),
      field('m-hp', 'HP', 'number'),
    ])
    const s = suggestRule(boats, motors)
    expect(s.kind).toBe('range')
    expect(s.ground).toBe('declared')
  })

  /* THE ONE THE FINDING IS ABOUT. Two tables using one word is not a
     relationship, and the app used to offer it in the same voice as
     the two above. */
  it('two columns that merely share a name is a GUESS, and says so', () => {
    const boats = table('e-boats', 'Boats', [field('b-name', 'Model'), field('b-mx', 'Matrix')])
    const others = table('e-other', 'Stacer', [
      field('o-name', 'Model'),
      field('o-mx', 'Matrix'),
    ])
    const s = suggestRule(boats, others)
    expect(s.kind).toBe('match')
    expect(s.ground).toBe('guess')
    /* the evidence line stops claiming the two are about one thing */
    expect(s.because).toContain('they share a name')
  })

  it('nothing found is a guess with nothing to commit', () => {
    const boats = table('e-boats', 'Boats', [field('b-name', 'Model')])
    const rates = table('e-rates', 'Labour Rates', [field('r-rate', 'Rate', 'number')])
    const s = suggestRule(boats, rates)
    expect(s.kind).toBe('none')
    expect(s.group).toBeUndefined()
    expect(s.ground).toBe('guess')
  })

  /* A DECLARED LINK BEATS A COINCIDENCE, which is the ordering that
     keeps the caveat rare enough to mean something. */
  it('a link column wins over a shared name on the same pair of tables', () => {
    const boats = table('e-boats', 'Boats', [field('b-name', 'Model'), field('b-mx', 'Matrix')])
    const motors = table('e-motors', 'Motors', [
      field('m-mx', 'Matrix'),
      { id: 'm-boat', name: 'Boat', type: 'reference', refEntityId: 'e-boats' },
    ])
    expect(suggestRule(boats, motors).ground).toBe('declared')
  })
})
