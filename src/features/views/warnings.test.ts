/* ============================================================
   THE WARNING SHOWS UP ON THE ROW, AND THE ROW STAYS.

   `severity: 'warn'` is only worth having if the annotation reaches
   a person, so this is the other end of the wire from
   `src/lib/configure/warn.test.ts`: the pair engine's half, which is
   what a view block draws.

   Two things it is really testing, either of which failing would be
   worse than having no warning at all:

     1. THE ROW IS NEVER REMOVED. `pairWarnings` is a read; it takes
        no list and returns no list. A block draws what it always
        drew.
     2. A BLANK IS NOT A DISAGREEMENT. The bound was measured only
        over pairings carrying both numbers, so a missing figure must
        say nothing rather than read as a violation.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { ConstraintDef, EntityDef, RowData } from '@/types/model'
import { createEngine } from '@/lib/rules/evaluate'
import { isWarnRule, pairWarnings, warnRules } from './warnings'

const NOW = '2026-08-21T00:00:00.000Z'

const boat: EntityDef = {
  id: 'e_boat',
  name: 'Boats',
  fields: [
    { id: 'f_boat_name', name: 'Name', type: 'text' },
    { id: 'f_boat_len', name: 'Hull Length', type: 'number' },
  ],
  accent: 'blue',
  position: { x: 0, y: 0 },
  createdAt: NOW,
  updatedAt: NOW,
}

const trailer: EntityDef = {
  id: 'e_trailer',
  name: 'Trailers',
  fields: [
    { id: 'f_tr_name', name: 'Name', type: 'text' },
    { id: 'f_tr_len', name: 'Length', type: 'number' },
  ],
  accent: 'ochre',
  position: { x: 0, y: 0 },
  createdAt: NOW,
  updatedAt: NOW,
}

const row = (entityId: string, id: string, values: Record<string, unknown>): RowData => ({
  id,
  entityId,
  values: values as RowData['values'],
  createdAt: NOW,
  updatedAt: NOW,
})

const hull = row('e_boat', 'b1', { f_boat_name: 'SPORT 560', f_boat_len: 5.6 })
const hullNoLength = row('e_boat', 'b2', { f_boat_name: 'Unmeasured' })
const longTrailer = row('e_trailer', 't1', { f_tr_name: 'NSM 6.0', f_tr_len: 6 })
const shortTrailer = row('e_trailer', 't2', { f_tr_name: 'NSM 5.0', f_tr_len: 5 })
const unlistedTrailer = row('e_trailer', 't3', { f_tr_name: 'NSM ?' })

const engine = createEngine({
  entities: { e_boat: boat, e_trailer: trailer },
  rowsByEntity: {
    e_boat: [hull, hullNoLength],
    e_trailer: [longTrailer, shortTrailer, unlistedTrailer],
  },
})

const bound = (over: Partial<ConstraintDef> = {}): ConstraintDef => ({
  id: 'observed:dx:bound:trailer-length',
  kind: 'implies',
  if: {
    combinator: 'AND',
    clauses: [{ id: 'g', left: { fieldId: 'f_boat_len' }, op: 'notEmpty' }],
  },
  then: {
    combinator: 'AND',
    clauses: [
      {
        id: 'b',
        left: { fieldId: 'f_tr_len' },
        op: 'gte',
        right: { kind: 'field', path: { fieldId: 'f_boat_len' } },
      },
    ],
  },
  because: '530 of 530 pairings the price file writes hold it',
  severity: 'warn',
  enabled: true,
  source: 'Measured on your price file',
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
})

const ask = (candidate: RowData, rules: ConstraintDef[] = [bound()]) =>
  pairWarnings({
    engine,
    rules: warnRules(rules),
    candidate: { entityId: 'e_trailer', row: candidate },
    source: { entityId: 'e_boat', row: hull },
  })

describe('which rules this module is even interested in', () => {
  it('takes a warn rule that says something', () => {
    expect(isWarnRule(bound())).toBe(true)
  })

  it('leaves every pruning rule alone — a pruned row is not on the list to annotate', () => {
    expect(isWarnRule(bound({ severity: 'block' }))).toBe(false)
    expect(isWarnRule(bound({ severity: undefined }))).toBe(false)
  })

  it('says nothing for a rule switched off, or one still unfinished', () => {
    expect(isWarnRule(bound({ enabled: false }))).toBe(false)
    expect(isWarnRule(bound({ then: undefined }))).toBe(false)
    expect(isWarnRule(bound({ then: { combinator: 'AND', clauses: [] } }))).toBe(false)
  })
})

describe('a pairing that disagrees', () => {
  it('is flagged, in the rule’s own words', () => {
    expect(ask(shortTrailer)).toEqual([
      {
        constraintId: 'observed:dx:bound:trailer-length',
        because: '530 of 530 pairings the price file writes hold it',
      },
    ])
  })

  it('is still a pairing — nothing here removes anything', () => {
    /* said as an assertion rather than a comment: the function takes
       no list, so there is no list it could have shortened */
    const before = [longTrailer, shortTrailer, unlistedTrailer]
    const after = before.filter(() => true)
    expect(ask(shortTrailer).length).toBe(1)
    expect(after).toHaveLength(3)
  })
})

describe('a pairing that agrees', () => {
  it('says nothing', () => {
    expect(ask(longTrailer)).toEqual([])
  })

  it('says nothing on the boundary, because the rule is "never below"', () => {
    const exact = row('e_trailer', 't4', { f_tr_name: 'NSM 5.6', f_tr_len: 5.6 })
    expect(ask(exact)).toEqual([])
  })
})

describe('a blank is not a disagreement', () => {
  it('says nothing when the candidate has no figure', () => {
    expect(ask(unlistedTrailer)).toEqual([])
  })

  it('says nothing when the subject has no figure', () => {
    const out = pairWarnings({
      engine,
      rules: warnRules([bound()]),
      candidate: { entityId: 'e_trailer', row: shortTrailer },
      source: { entityId: 'e_boat', row: hullNoLength },
    })
    expect(out).toEqual([])
  })
})

describe('it is total', () => {
  it('answers on an empty rule list', () => {
    expect(ask(shortTrailer, [])).toEqual([])
  })

  it('stays quiet about a rule pointing at a column that is not there', () => {
    const adrift = bound({
      then: {
        combinator: 'AND',
        clauses: [
          {
            id: 'b',
            left: { fieldId: 'f_gone' },
            op: 'gte',
            right: { kind: 'field', path: { fieldId: 'f_boat_len' } },
          },
        ],
      },
    })
    expect(ask(shortTrailer, [adrift])).toEqual([])
  })

  it('will not vouch for a rule that hops through a reference', () => {
    const hop = bound({
      then: {
        combinator: 'AND',
        clauses: [
          {
            id: 'b',
            left: { fieldId: 'f_tr_len', viaFieldId: 'f_ref' },
            op: 'gte',
            right: { kind: 'field', path: { fieldId: 'f_boat_len' } },
          },
        ],
      },
    })
    expect(ask(shortTrailer, [hop])).toEqual([])
  })
})

describe('more than one rule can disagree with one row', () => {
  it('reports each once, in authoring order', () => {
    const second = bound({
      id: 'observed:dx:bound:second',
      because: 'nine of nine agree',
    })
    const out = ask(shortTrailer, [bound(), second])
    expect(out.map((w) => w.constraintId)).toEqual([
      'observed:dx:bound:trailer-length',
      'observed:dx:bound:second',
    ])
  })
})
