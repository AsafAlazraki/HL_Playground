/* ============================================================
   A WARNING WARNS, AND TAKES NOTHING.

   `ConstraintDef.severity` arrived with one promise attached that is
   worth more than the feature itself: ABSENT MEANS 'block', so
   nothing written before the field existed changes meaning. The
   first block below proves that by solving the same model three
   ways — severity absent, severity 'block' — and asserting the two
   answers are the same object, key for key.

   Everything after it proves the other half: a rule written 'warn'
   removes nothing, empties nothing, contradicts nothing, and still
   says why.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { ConstraintDef, FieldDef } from '@/types/model'
import { solve, warningsFor, MAX_ROUNDS } from './solve'

const field = (id: string, options: string[]): FieldDef => ({
  id,
  name: id,
  type: 'select',
  options,
})

const num = (id: string): FieldDef => ({ id, name: id, type: 'number' })

let seq = 0
const rule = (over: Partial<ConstraintDef>): ConstraintDef => ({
  id: `c${++seq}`,
  kind: 'implies',
  if: { combinator: 'AND', clauses: [] },
  because: 'the hull is not rated for that much power',
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

/** hull is 'small' => motor must be '90'. The shape every case below
 *  varies by exactly one field. */
const hullPicksMotor = (severity?: 'block' | 'warn'): ConstraintDef =>
  rule({
    id: 'hull-picks-motor',
    kind: 'implies',
    if: {
      combinator: 'AND',
      clauses: [{ id: 'k1', left: { fieldId: 'hull' }, op: 'eq', right: { kind: 'literal', value: 'small' } }],
    },
    then: {
      combinator: 'AND',
      clauses: [{ id: 'k2', left: { fieldId: 'motor' }, op: 'eq', right: { kind: 'literal', value: '90' } }],
    },
    ...(severity ? { severity } : {}),
  })

const model = (constraints: ConstraintDef[]) => ({
  fields: [field('hull', ['small', 'large']), field('motor', ['90', '150', '300'])],
  constraints,
  chosen: { hull: 'small' },
})

describe('absent severity is exactly what it always was', () => {
  it('solves identically with severity absent and severity block', () => {
    const absent = solve(model([hullPicksMotor()]))
    const explicit = solve(model([hullPicksMotor('block')]))

    expect(absent.domains).toEqual(explicit.domains)
    expect(absent.blocked).toEqual(explicit.blocked)
    expect(absent.settled).toEqual(explicit.settled)
    expect(absent.fired).toEqual(explicit.fired)
    expect(absent.problems).toEqual(explicit.problems)
  })

  it('still prunes, still records the reason, still fires', () => {
    const s = solve(model([hullPicksMotor()]))
    expect(s.domains.motor).toEqual(['90'])
    expect(s.blocked.motor['150'].because).toBe('the hull is not rated for that much power')
    expect(s.blocked.motor['150'].constraintId).toBe('hull-picks-motor')
    expect(s.fired).toContain('hull-picks-motor')
    /* and it says nothing on the warning channel */
    expect(s.warned).toEqual({})
    expect(s.warnedBy).toEqual([])
  })
})

describe('warn keeps the value and annotates it', () => {
  const warned = () => solve(model([hullPicksMotor('warn')]))

  it('removes nothing from the domain', () => {
    expect(warned().domains.motor).toEqual(['90', '150', '300'])
  })

  it('blocks nothing at all', () => {
    expect(warned().blocked).toEqual({})
  })

  it('annotates every value the same rule would have removed', () => {
    const s = warned()
    expect(Object.keys(s.warned.motor).sort()).toEqual(['150', '300'].sort())
    expect(warningsFor(s, 'motor', '150')).toEqual([
      { constraintId: 'hull-picks-motor', because: 'the hull is not rated for that much power' },
    ])
  })

  it('says nothing about the value it agrees with', () => {
    expect(warningsFor(warned(), 'motor', '90')).toEqual([])
  })

  it('does not appear in `fired`, and does appear in `warnedBy`', () => {
    const s = warned()
    expect(s.fired).toEqual([])
    expect(s.warnedBy).toEqual(['hull-picks-motor'])
  })

  it('raises no problem, even when it disagrees with every value there is', () => {
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['150', '300'])],
      constraints: [hullPicksMotor('warn')],
      chosen: { hull: 'small' },
    })
    expect(s.problems).toEqual([])
    expect(s.domains.motor).toEqual(['150', '300'])
    expect(Object.keys(s.warned.motor)).toHaveLength(2)
  })

  it('never settles a field by warning about the alternatives', () => {
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['90', '150'])],
      constraints: [hullPicksMotor('warn')],
      chosen: { hull: 'small' },
    })
    expect(s.settled.motor).toBeUndefined()
  })
})

describe('a warning may not reason backwards either', () => {
  /* The contrapositive is the solver's sharpest tool: "B has become
     impossible, so A is ruled out" is what makes choosing a motor
     narrow the hull list. A warning must not get it — a coincidence
     reasoned backwards deletes just as much business as one reasoned
     forwards. */
  it('leaves the condition side whole', () => {
    const s = solve({
      fields: [field('hull', ['small', 'large']), field('motor', ['150'])],
      constraints: [hullPicksMotor('warn')],
      chosen: {},
    })
    expect(s.domains.hull).toEqual(['small', 'large'])
    expect(s.blocked).toEqual({})
    /* and it did notice — the note is on the hull value the
       contrapositive would have removed */
    expect(s.warnedBy).toEqual(['hull-picks-motor'])
  })

  it('the same rule as `block` does remove it', () => {
    const s = solve({
      fields: [field('hull', ['small', 'large']), field('motor', ['150'])],
      constraints: [hullPicksMotor('block')],
      chosen: {},
    })
    expect(s.domains.hull).toEqual(['large'])
  })
})

describe('warn and block side by side', () => {
  const excludeLarge = rule({
    id: 'no-300-on-large',
    kind: 'implies',
    if: {
      combinator: 'AND',
      clauses: [{ id: 'x1', left: { fieldId: 'hull' }, op: 'eq', right: { kind: 'literal', value: 'small' } }],
    },
    then: {
      combinator: 'AND',
      clauses: [{ id: 'x2', left: { fieldId: 'motor' }, op: 'neq', right: { kind: 'literal', value: '300' } }],
    },
    because: 'the transom is not rated for it',
  })

  it('a value removed by a blocking rule carries no warning', () => {
    /* both rules dislike '300'. The blocking one takes it away, so
       the note must go with it: `warned` promises the value is still
       in the picker. */
    const s = solve(model([hullPicksMotor('warn'), excludeLarge]))
    expect(s.domains.motor).toEqual(['90', '150'])
    expect(s.blocked.motor['300'].constraintId).toBe('no-300-on-large')
    expect(Object.keys(s.warned.motor)).toEqual(['150'])
    expect(warningsFor(s, 'motor', '300')).toEqual([])
  })
})

describe('a warning cannot spin the solver', () => {
  it('converges: a rule that never changes a domain cannot drive a pass', () => {
    const s = solve({
      fields: [field('a', ['1', '2']), field('b', ['1', '2'])],
      constraints: [
        rule({
          id: 'w1',
          kind: 'implies',
          severity: 'warn',
          if: {
            combinator: 'AND',
            clauses: [{ id: 'p', left: { fieldId: 'a' }, op: 'eq', right: { kind: 'literal', value: '1' } }],
          },
          then: {
            combinator: 'AND',
            clauses: [{ id: 'q', left: { fieldId: 'b' }, op: 'eq', right: { kind: 'literal', value: '1' } }],
          },
        }),
      ],
      chosen: { a: '1' },
    })
    expect(s.problems).toEqual([])
    expect(MAX_ROUNDS).toBeGreaterThan(0)
    expect(s.domains.b).toEqual(['1', '2'])
  })
})

describe('a warned table rule', () => {
  it('annotates the combinations it does not approve, and removes none', () => {
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['90', '150', '300'])],
      constraints: [
        rule({
          id: 't1',
          kind: 'table',
          severity: 'warn',
          if: { combinator: 'AND', clauses: [] },
          combinations: [
            { hull: 'small', motor: '90' },
            { hull: 'small', motor: '150' },
          ],
          because: 'the price file has only ever paired those two',
        }),
      ],
      chosen: { hull: 'small' },
    })
    expect(s.domains.motor).toEqual(['90', '150', '300'])
    expect(warningsFor(s, 'motor', '300')[0].because).toBe(
      'the price file has only ever paired those two',
    )
  })
})

describe('warningsFor is total', () => {
  it('answers on junk rather than throwing', () => {
    expect(warningsFor(undefined, 'motor', '90')).toEqual([])
    expect(warningsFor({ warned: {} }, '', '90')).toEqual([])
    expect(warningsFor({ warned: {} }, 'nope', '90')).toEqual([])
  })
})

describe('an open column', () => {
  it('is never warned about, because it has no enumerable values', () => {
    const s = solve({
      fields: [field('hull', ['small']), num('length')],
      constraints: [
        rule({
          id: 'n1',
          kind: 'implies',
          severity: 'warn',
          if: {
            combinator: 'AND',
            clauses: [{ id: 'n2', left: { fieldId: 'hull' }, op: 'eq', right: { kind: 'literal', value: 'small' } }],
          },
          then: {
            combinator: 'AND',
            clauses: [{ id: 'n3', left: { fieldId: 'length' }, op: 'lte', right: { kind: 'literal', value: 5 } }],
          },
        }),
      ],
      chosen: { hull: 'small' },
    })
    expect(s.warned).toEqual({})
  })

  it('is warned about the moment a person fixes it to one value', () => {
    const s = solve({
      fields: [field('hull', ['small']), num('length')],
      constraints: [
        rule({
          id: 'n1',
          kind: 'implies',
          severity: 'warn',
          because: 'no trailer in the file is that long',
          if: {
            combinator: 'AND',
            clauses: [{ id: 'n2', left: { fieldId: 'hull' }, op: 'eq', right: { kind: 'literal', value: 'small' } }],
          },
          then: {
            combinator: 'AND',
            clauses: [{ id: 'n3', left: { fieldId: 'length' }, op: 'lte', right: { kind: 'literal', value: 5 } }],
          },
        }),
      ],
      chosen: { hull: 'small', length: 9 },
    })
    /* the choice stands — that is the whole difference */
    expect(s.domains.length).toEqual([9])
    expect(warningsFor(s, 'length', 9)[0].because).toBe('no trailer in the file is that long')
    expect(s.problems).toEqual([])
  })
})
