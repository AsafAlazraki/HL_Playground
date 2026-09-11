/* ============================================================
   THE ROUND TRIP, AND THE REFUSAL.

   `fitSentence.ts` is a new authoring surface over an unchanged
   model, so the only two things worth asserting are that it does not
   change a rule it opens and closes, and that it REFUSES a rule it
   cannot say. A flattener that quietly dropped a condition node would
   pass every other test anybody would think to write.

   IT IS TESTED AGAINST THE REAL SEED as well as against fixtures,
   because the two rules in the prepared file are the only fitment
   rules that exist anywhere — written by `northside.ts`'s own factory
   before this file existed, which makes them the honest input.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { RuleDef } from '@/types/model'
import { OUT_HANDLE } from '@/types/model'
import { compileFit, fitShapeOf, idsOf, isFitSentence, readFit } from './fitSentence'
import { buildNorthsideProject } from '@/demos/northside'

const ISO = '2026-01-01T00:00:00.000Z'

/** The shape the seed's factory emits, by hand so the test does not
 *  depend on the seed to state what it is testing. */
function linear(over: Partial<RuleDef> = {}): RuleDef {
  return {
    id: 'r1',
    name: 'Motor fitment',
    description: 'what fits what',
    rootEntityId: 'e-boat',
    enabled: true,
    nodes: [
      { id: 'n-start', kind: 'start', position: { x: 80, y: 0 }, config: {} },
      {
        id: 'n-match',
        kind: 'match',
        position: { x: 400, y: 0 },
        config: {
          targetEntityId: 'e-motor',
          group: {
            combinator: 'AND',
            clauses: [
              {
                id: 'c1',
                left: { fieldId: 'f-hp' },
                op: 'gte',
                right: { kind: 'field', path: { fieldId: 'f-minhp' } },
              },
              {
                id: 'c2',
                left: { fieldId: 'f-hp' },
                op: 'lte',
                right: { kind: 'field', path: { fieldId: 'f-maxhp' } },
              },
            ],
          },
          emptyBehavior: 'skip',
        },
      },
      {
        id: 'n-out',
        kind: 'output',
        position: { x: 720, y: 0 },
        config: {
          label: 'Motors that fit',
          columns: [
            { scope: 'source', fieldId: 'f-name', label: 'Boat' },
            { scope: 'match', fieldId: 'f-hp', label: 'HP' },
          ],
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n-start', target: 'n-match', sourceHandle: OUT_HANDLE },
      { id: 'e2', source: 'n-match', target: 'n-out', sourceHandle: OUT_HANDLE },
    ],
    createdAt: ISO,
    updatedAt: ISO,
    ...over,
  }
}

describe('a rule the sentence may edit', () => {
  it('is the three nodes wired in order', () => {
    expect(isFitSentence(linear())).toBe(true)
    expect(fitShapeOf(linear())).not.toBeNull()
  })

  it('READS THE SCOPE THE MODEL MEANS: the left of a comparison is the CANDIDATE', () => {
    const s = readFit(linear())
    /* the motor's HP on the left, the boat's Min HP on the right —
       the one thing a sentence could get backwards */
    expect(s?.clauses[0]).toMatchObject({
      fieldId: 'f-hp',
      op: 'gte',
      right: { kind: 'field', path: { fieldId: 'f-minhp' } },
    })
  })

  it('carries every part of the rule, not only the clauses', () => {
    const s = readFit(linear())
    expect(s).toMatchObject({
      sourceEntityId: 'e-boat',
      targetEntityId: 'e-motor',
      combinator: 'AND',
      label: 'Motors that fit',
      whenNothingFits: 'skip',
      enabled: true,
    })
    expect(s?.columns).toHaveLength(2)
  })
})

describe('what it refuses, rather than flattening', () => {
  const refused = (rule: RuleDef): void => {
    expect(isFitSentence(rule)).toBe(false)
    expect(readFit(rule)).toBeNull()
    expect(idsOf(rule)).toBeNull()
  }

  it('REFUSES A RULE THAT BRANCHES — the whole reason the canvas stays', () => {
    const r = linear()
    r.nodes.push({
      id: 'n-if',
      kind: 'condition',
      position: { x: 400, y: 200 },
      config: { branches: [] },
    })
    refused(r)
  })

  it('refuses a second match, which is two questions and not one', () => {
    const r = linear()
    const m = r.nodes[1]
    if (m === undefined) throw new Error('fixture')
    r.nodes.push({ ...m, id: 'n-match-2' })
    refused(r)
  })

  it('REFUSES THE RIGHT THREE NODES WIRED THE WRONG WAY ROUND, because the engine walks edges and not the node list', () => {
    const r = linear()
    r.edges = [
      { id: 'e1', source: 'n-start', target: 'n-out', sourceHandle: OUT_HANDLE },
      { id: 'e2', source: 'n-out', target: 'n-match', sourceHandle: OUT_HANDLE },
    ]
    refused(r)
  })

  it('refuses a clause that reaches through a link, rather than losing the hop', () => {
    const r = linear()
    const m = r.nodes[1]
    if (m?.kind !== 'match') throw new Error('fixture')
    const c = m.config.group.clauses[0]
    if (c === undefined) throw new Error('fixture')
    c.left = { viaFieldId: 'f-brand', fieldId: 'f-hp' }
    expect(readFit(r)).toBeNull()
  })

  it('refuses one that is missing a node altogether', () => {
    const r = linear()
    r.nodes = r.nodes.filter((n) => n.kind !== 'output')
    refused(r)
  })
})

describe('the round trip', () => {
  it('GIVES BACK THE SAME RULE, node ids and all, so an edit is an edit', () => {
    const before = linear()
    const s = readFit(before)
    const ids = idsOf(before)
    if (!s || !ids) throw new Error('fixture should be readable')
    const after = compileFit(s, ids)
    expect(after).toEqual(before)
  })

  it('keeps the ids of the rule it came from', () => {
    const before = linear()
    const ids = idsOf(before)
    expect(ids?.nodes).toEqual(['n-start', 'n-match', 'n-out'])
    expect(ids?.edges).toEqual(['e1', 'e2'])
  })

  it('survives a rule with no description and no columns', () => {
    const bare = linear({ description: undefined })
    const out = bare.nodes[2]
    if (out?.kind !== 'output') throw new Error('fixture')
    out.config = { label: 'Anything' }
    const s = readFit(bare)
    const ids = idsOf(bare)
    if (!s || !ids) throw new Error('should be readable')
    expect(s.description).toBeUndefined()
    expect(s.columns).toEqual([])
    const back = compileFit(s, ids)
    expect(back.description).toBeUndefined()
    expect('description' in back).toBe(false)
  })

  it('carries OR through rather than assuming every rule is AND', () => {
    const r = linear()
    const m = r.nodes[1]
    if (m?.kind !== 'match') throw new Error('fixture')
    m.config.group.combinator = 'OR'
    const s = readFit(r)
    const ids = idsOf(r)
    if (!s || !ids) throw new Error('should be readable')
    expect(s.combinator).toBe('OR')
    expect(compileFit(s, ids)).toEqual(r)
  })

  it('writes a NEW rule into the same three lanes the canvas draws', () => {
    const s = readFit(linear())
    if (!s) throw new Error('fixture')
    const made = compileFit(
      { ...s, id: 'r2', name: 'Trailer fitment' },
      { nodes: ['a', 'b', 'c'], edges: ['d', 'e'], y: 320 },
    )
    expect(made.nodes.map((n) => n.position)).toEqual([
      { x: 80, y: 320 },
      { x: 400, y: 320 },
      { x: 720, y: 320 },
    ])
    /* and it is still a rule the sentence can re-open */
    expect(isFitSentence(made)).toBe(true)
  })
})

/* ============================================================
   AND AGAINST THE ONLY FITMENT RULES THAT EXIST.

   The two in the prepared file were written by `northside.ts`'s own
   factory before this module did, which makes them the honest input:
   if the sentence cannot open the app's own rules it is a surface for
   rules nobody has.
   ============================================================ */

describe('the rules the prepared file actually carries', () => {
  const seed = buildNorthsideProject()
  const rules = seed.rules

  it('has fitment rules to read at all', () => {
    expect(rules.length).toBeGreaterThan(0)
  })

  it('CAN SAY EVERY ONE OF THEM — none needs the canvas', () => {
    const unreadable = rules.filter((r) => !isFitSentence(r)).map((r) => r.name)
    expect(unreadable).toEqual([])
  })

  it('gives each one back unchanged, node ids, positions, clauses and all', () => {
    for (const rule of rules) {
      const s = readFit(rule)
      const ids = idsOf(rule)
      if (!s || !ids) throw new Error(`${rule.name} should be readable`)
      expect(compileFit(s, ids)).toEqual(rule)
    }
  })

  it('reads the boat as the source and the motor as the thing being found', () => {
    const motor = rules.find((r) => /motor fitment/i.test(r.name))
    if (!motor) throw new Error('the seed should carry a motor fitment rule')
    const s = readFit(motor)
    expect(s?.sourceEntityId).toBe(motor.rootEntityId)
    expect(s?.sourceEntityId).not.toBe(s?.targetEntityId)
    /* every clause compares a column of the candidate against
       something — a sentence with no comparisons is not a fit */
    expect(s?.clauses.length).toBeGreaterThan(0)
  })
})
