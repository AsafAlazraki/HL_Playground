/* ============================================================
   A KEPT PATTERN COMES HOME, OR SAYS WHY IT CANNOT.

   `adoptionBlocker` is the register's half of rule 10: a kept
   pattern this app cannot state as a sentence must SAY SO on its
   own card, not sit in a list quietly doing nothing.

   The first test here is not about words at all — it is about the
   key. A finding names a column with `buildConcepts`'s key
   ('trailer::atm (kg)'), and `conceptIndex` is keyed by FIELD ID,
   not by that. Confusing the two does not throw and does not fail a
   type check: every adoption simply comes back "no table carries
   that column any more", which reads as a fact about the project.
   The mistake was made once while this was written, so it is pinned
   with a real two-table resolution rather than a mock.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { EntityDef } from '@/types/model'
import { NOT_EXPRESSIBLE } from '@/lib/observed/adopt'
import { adoptionBlocker, decisionFrom, type KeptPattern } from './discoveredRules'
import type { Candidate } from './discover'

const NOW = '2026-08-21T00:00:00.000Z'

const table = (
  id: string,
  name: string,
  kind: EntityDef['kind'],
  fields: Array<[string, string]>,
): EntityDef => ({
  id,
  name,
  kind,
  accent: 'blue',
  position: { x: 0, y: 0 },
  fields: fields.map(([fid, fname]) => ({ id: fid, name: fname, type: 'number' as const })),
  createdAt: NOW,
  updatedAt: NOW,
})

/* two tables of each kind, so the resolver has to pick a
   representative rather than being handed exactly one */
const entities: Record<string, EntityDef> = {
  e_b1: table('e_b1', 'Highfield', 'boat', [['f_hw_1', 'Boat Weight kg']]),
  e_b2: table('e_b2', 'Stabicraft', 'boat', [['f_hw_2', 'Boat Weight kg']]),
  e_t1: table('e_t1', 'GFAB Trailers', 'trailer', [['f_atm_1', 'ATM (KG)']]),
  e_t2: table('e_t2', 'Dunbier Trailers', 'trailer', [['f_atm_2', 'ATM (KG)']]),
}

const kept = (over: Partial<KeptPattern> = {}): KeptPattern => ({
  id: 'dx:bound:boat·trailer:trailer·ATM (KG)>=boat·Boat Weight kg',
  decision: 'kept',
  shape: 'numeric-bound',
  relationship: 'Boats ▸ Trailers',
  statement: 'A trailer’s “ATM (KG)” is never below the boat’s “Boat Weight kg”.',
  because: '530 of 530 pairings the price file writes hold it',
  source: '“ATM (KG)” on 2 trailer tables against “Boat Weight kg” on 2 boat tables',
  evidence: 'observed',
  enforcement: 'warn',
  binds: {
    far: { kind: 'trailer', name: 'ATM (KG)', conceptKey: 'trailer::atm (kg)', tables: 2 },
    near: { kind: 'boat', name: 'Boat Weight kg', conceptKey: 'boat::boat weight kg', tables: 2 },
  },
  hits: 530,
  tested: 530,
  meanLeft: 0.31,
  catalogue: 434,
  counterExampleTotal: 0,
  decidedAt: NOW,
  ...over,
})

describe('the concept key resolves to a real column', () => {
  it('adopts a bound whose two columns both exist here', () => {
    expect(adoptionBlocker(kept(), entities)).toBeUndefined()
  })

  it('says which column is missing when one is not here', () => {
    const { e_t1, e_t2, ...boatsOnly } = entities
    void e_t1
    void e_t2
    expect(adoptionBlocker(kept(), boatsOnly)).toContain('ATM (KG)')
  })

  it('is not fooled by a key that only looks right', () => {
    const wrongCase = kept({
      binds: {
        far: { kind: 'trailer', name: 'ATM (KG)', conceptKey: 'trailer::ATM (KG)', tables: 2 },
        near: { kind: 'boat', name: 'Boat Weight kg', conceptKey: 'boat::boat weight kg', tables: 2 },
      },
    })
    /* the key is normalised to lower case by `buildConcepts`, so this
       one genuinely names nothing — and the answer says so */
    expect(adoptionBlocker(wrongCase, entities)).toContain('ATM (KG)')
  })
})

describe('a shape that cannot be said', () => {
  it('names its own blocker, in words', () => {
    const said = adoptionBlocker(kept({ shape: 'categorical-selector' }), entities)
    expect(said).toBe(NOT_EXPRESSIBLE['categorical-selector'])
  })

  it('answers for a decision stored before the columns were recorded', () => {
    expect(adoptionBlocker(kept({ binds: undefined }), entities)).toContain('re-run discovery')
  })
})

describe('a dismissal is not a rule and is never asked about', () => {
  it('has no blocker, because it was never going to be one', () => {
    expect(adoptionBlocker(kept({ decision: 'dismissed' }), entities)).toBeUndefined()
  })
})

describe('the decision records the columns it was measured on', () => {
  it('copies `binds` off the candidate, so adoption has something to point at', () => {
    const candidate = {
      id: 'dx:bound:x',
      shape: 'numeric-bound',
      relationship: 'Boats ▸ Trailers',
      relationshipKey: 'boat·trailer',
      binds: kept().binds,
      statement: 'anything',
      because: 'anything',
      source: 'anything',
      evidence: 'observed',
      enforcement: 'warn',
      hits: 1,
      tested: 1,
      rate: 1,
      discrimination: null,
      uniqueness: null,
      counterExamples: [],
      counterExampleTotal: 0,
      rejectsRecommendation: 0,
      wouldDelete: null,
      excluded: { left: {}, right: {} },
      verdict: 'warning',
      threshold: 'anything',
      admitted: true,
    } as unknown as Candidate

    const stored = decisionFrom(candidate, 'kept')
    expect(stored.binds?.far.conceptKey).toBe('trailer::atm (kg)')
    expect(stored.evidence).toBe('observed')
    expect(adoptionBlocker(stored, entities)).toBeUndefined()
  })
})
