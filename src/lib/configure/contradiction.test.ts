/* ============================================================
   THE SOLVER SAYING "NO".

   `warn.test.ts` is 305 lines and 15 cases, and every assertion it
   makes about the contradiction channel is that it is EMPTY —
   `expect(s.problems).toEqual([])`, four times over. That is the
   correct thing for a file about warnings to assert, and it left the
   other half unmeasured: before this file, nothing anywhere asserted
   that `problems` ever FIRES. The engine's third stated property,
   solve.ts:23 — "NEVER A SILENT FAILURE. A domain that empties is
   reported as a problem naming the constraint that emptied it, in
   plain English" — had no test.

   There are exactly four places a `problem` is raised, and all four
   are covered below:

     solve.ts:280   a domain emptied by `prune`
     solve.ts:393   an OR group with every disjunct false
     solve.ts:424   a `table` with no surviving combination
     solve.ts:578   the MAX_ROUNDS runaway  (NOT covered — see the
                    note at the foot of this file)

   Messages are asserted as WHOLE STRINGS. They are the sentence a
   dealer reads when a boat cannot be built, so a test that only
   checked `problems.length` would let the wording rot silently.

   One case is asserted as a KNOWN DEFECT, with `it.fails`, at
   "a contradiction the solver cannot see". The assertion inside it
   is the full-strength correct one; it is not weakened.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { CellValue, ClauseGroup, ConstraintDef, FieldDef } from '@/types/model'
import { explain, solve } from './solve'

const field = (id: string, options: string[], name?: string): FieldDef => ({
  id,
  name: name ?? id,
  type: 'select',
  options,
})

const num = (id: string): FieldDef => ({ id, name: id, type: 'number' })
const yesNo = (id: string): FieldDef => ({ id, name: id, type: 'boolean' })

let seq = 0
const rule = (over: Partial<ConstraintDef>): ConstraintDef => ({
  id: `c${++seq}`,
  kind: 'implies',
  if: { combinator: 'AND', clauses: [] },
  because: 'reason',
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

/** An AND group of `<field> <op> <literal>` clauses — the shape of
 *  nearly every sentence the editor can write. */
const and = (...cl: Array<[string, string, CellValue]>): ClauseGroup => ({
  combinator: 'AND',
  clauses: cl.map(([f, op, v], i) => ({
    id: `k${i}`,
    left: { fieldId: f },
    op: op as ConstraintDef['if']['clauses'][number]['op'],
    right: { kind: 'literal', value: v },
  })),
})

const or = (...cl: Array<[string, string, CellValue]>): ClauseGroup => ({
  ...and(...cl),
  combinator: 'OR',
})

/* hull is small => motor must be the 90 */
const only90 = (over: Partial<ConstraintDef> = {}) =>
  rule({
    id: 'r-eq90',
    if: and(['hull', 'eq', 'small']),
    then: and(['motor', 'eq', '90']),
    because: 'the transom is rated for 90 only',
    ...over,
  })

/* hull is small => motor must NOT be the 90. Directly contradicts
   `only90` the moment hull is small: one rule says the domain is
   exactly {90}, the other says it excludes 90. */
const never90 = (over: Partial<ConstraintDef> = {}) =>
  rule({
    id: 'r-ne90',
    if: and(['hull', 'eq', 'small']),
    then: and(['motor', 'neq', '90']),
    because: 'the 90 is discontinued',
    ...over,
  })

const contradiction = (constraints: ConstraintDef[]) =>
  solve({
    fields: [field('hull', ['small']), field('motor', ['90', '150'])],
    constraints,
    chosen: { hull: 'small' },
  })

/* ---------------------------------------------------------- */

describe('a domain emptied is a contradiction, reported', () => {
  it('fires when one rule requires a value another forbids', () => {
    const s = contradiction([only90(), never90()])

    /* r-eq90 removes 150, leaving {90}; r-ne90 then removes 90 and the
       column is dead. The rule NAMED is the one that emptied it. */
    expect(s.domains.motor).toEqual([])
    expect(s.problems).toEqual([
      {
        constraintId: 'r-ne90',
        message: 'Nothing is left for motor, because the 90 is discontinued.',
      },
    ])
  })

  it('a dead column is not settled, and does not throw on the way out', () => {
    const s = contradiction([only90(), never90()])
    expect(s.settled.motor).toBeUndefined()
    expect(s.settled.hull).toBe('small')
  })

  it('both rules are in `fired` — the contradiction is not one rule misbehaving', () => {
    expect(contradiction([only90(), never90()]).fired).toEqual(['r-eq90', 'r-ne90'])
  })

  it('empties a yes/no column too — [true, false] is a domain like any other', () => {
    const s = solve({
      fields: [field('hull', ['small']), yesNo('kicker')],
      constraints: [
        rule({
          id: 'b1',
          if: and(['hull', 'eq', 'small']),
          then: { combinator: 'AND', clauses: [{ id: 'z1', left: { fieldId: 'kicker' }, op: 'isTrue' }] },
          because: 'a small hull always carries a kicker',
        }),
        rule({
          id: 'b2',
          if: and(['hull', 'eq', 'small']),
          then: { combinator: 'AND', clauses: [{ id: 'z2', left: { fieldId: 'kicker' }, op: 'isFalse' }] },
          because: 'there is no bracket for a kicker on a small hull',
        }),
      ],
      chosen: { hull: 'small' },
    })
    expect(s.domains.kicker).toEqual([])
    expect(s.problems).toEqual([
      {
        constraintId: 'b2',
        message: 'Nothing is left for kicker, because there is no bracket for a kicker on a small hull.',
      },
    ])
    /* and both halves of the boolean domain know which rule took them */
    expect(s.blocked.kicker.true.constraintId).toBe('b2')
    expect(s.blocked.kicker.false.constraintId).toBe('b1')
  })

  it('fires from a field-against-field clause, where no literal is involved', () => {
    /* arc consistency, solve.ts:317-340: `a` survives only if some
       surviving `b` can go with it. b is 5 and a is {1,2}, so nothing
       on the left can beat anything on the right. */
    const s = solve({
      fields: [field('a', ['1', '2']), field('b', ['5'])],
      constraints: [
        rule({
          id: 'r-gt',
          if: and(['b', 'eq', '5']),
          then: {
            combinator: 'AND',
            clauses: [{ id: 'z', left: { fieldId: 'a' }, op: 'gt', right: { kind: 'field', path: { fieldId: 'b' } } }],
          },
          because: 'the tender must be longer than the cradle',
        }),
      ],
      chosen: {},
    })
    expect(s.domains.a).toEqual([])
    expect(s.problems).toEqual([
      { constraintId: 'r-gt', message: 'Nothing is left for a, because the tender must be longer than the cradle.' },
    ])
  })

  it('fires from the OR "is one of" collapse, which prunes without going through enforceClause', () => {
    /* solve.ts:384-388 narrows the column to the union of the
       disjuncts. The union is {90, 300} and the column holds only 150. */
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['150'])],
      constraints: [
        rule({
          id: 'r-union',
          if: and(['hull', 'eq', 'small']),
          then: or(['motor', 'eq', '90'], ['motor', 'eq', '300']),
          because: 'only the 90 and the 300 are approved for that hull',
        }),
      ],
      chosen: { hull: 'small' },
    })
    expect(s.domains.motor).toEqual([])
    expect(s.problems[0].message).toBe(
      'Nothing is left for motor, because only the 90 and the 300 are approved for that hull.',
    )
  })

  it('reads the reason as an empty tail when the rule has none', () => {
    /* becauseOf trims, so '   ' is no reason at all: the sentence has
       to stand on its own rather than trailing ", because .". */
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['90'])],
      constraints: [
        rule({ id: 'e1', if: and(['hull', 'eq', 'small']), then: and(['motor', 'eq', '150']), because: '   ' }),
      ],
      chosen: { hull: 'small' },
    })
    expect(s.problems).toEqual([{ constraintId: 'e1', message: 'Nothing is left for motor.' }])
    expect(s.blocked.motor['90'].because).toBe('')
  })
})

describe('the message names the choice when a person made one', () => {
  it('says "your choice of X no longer works" for a chosen select', () => {
    const s = solve({
      fields: [field('hull', ['small', 'large']), field('motor', ['90', '150', '300'])],
      constraints: [only90({ because: 'the hull is not rated for that much power' })],
      chosen: { hull: 'small', motor: '300' },
    })
    expect(s.problems).toEqual([
      {
        constraintId: 'r-eq90',
        message: 'Your choice of 300 for motor no longer works, because the hull is not rated for that much power.',
      },
    ])
  })

  it('says it for an open column too — the only way a number ever empties', () => {
    /* A number column has no enumerable list (domain.ts:29-46), so it
       can only be narrowed to the one value the person typed. That
       makes 9 both the domain and the choice. */
    const s = solve({
      fields: [field('hull', ['small']), num('length')],
      constraints: [
        rule({
          id: 'r-len',
          if: and(['hull', 'eq', 'small']),
          then: and(['length', 'lte', 5]),
          because: 'no trailer in the file is that long',
        }),
      ],
      chosen: { hull: 'small', length: 9 },
    })
    expect(s.domains.length).toEqual([])
    expect(s.problems).toEqual([
      {
        constraintId: 'r-len',
        message: 'Your choice of 9 for length no longer works, because no trailer in the file is that long.',
      },
    ])
  })

  it('says "nothing is left" when the column emptied without being chosen', () => {
    /* same rule, same emptied column — the only difference is whether
       the person put the value there. */
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['300'])],
      constraints: [only90({ because: 'the hull is not rated for that much power' })],
      chosen: { hull: 'small' },
    })
    expect(s.problems[0].message).toBe(
      'Nothing is left for motor, because the hull is not rated for that much power.',
    )
  })
})

describe('the reason is the one recorded at the moment of removal', () => {
  /* This is the repo's stated differentiator (solve.ts:17-21): every
     pruned value carries `{ constraintId, because }` written by the
     code doing the pruning, never reconstructed afterwards. A
     contradiction is where that is easiest to get wrong, because two
     rules disagree about the same column at once. */

  it('gives each dead value the rule that actually took it, not the last rule to complain', () => {
    const s = contradiction([only90(), never90()])
    expect(s.blocked.motor['150']).toEqual({
      constraintId: 'r-eq90',
      because: 'the transom is rated for 90 only',
    })
    expect(s.blocked.motor['90']).toEqual({
      constraintId: 'r-ne90',
      because: 'the 90 is discontinued',
    })
  })

  it('`explain` returns that same record for a value lost to a contradiction', () => {
    const s = contradiction([only90(), never90()])
    expect(explain(s, 'motor', '90')).toEqual({
      constraintId: 'r-ne90',
      because: 'the 90 is discontinued',
    })
    expect(explain(s, 'motor', 'never-existed')).toBeUndefined()
  })

  it('priority changes WHO IS BLAMED for the emptiness, and nothing else', () => {
    /* orderConstraints (solve.ts:498-511) sorts priority-first, and the
       comment there says removal is order-independent but the naming is
       not. Both halves of that claim are asserted here: the per-value
       reasons are identical whichever rule runs first — each rule takes
       its own values either way — while the rule named on `problems`
       is whichever one ran second and found the column already down to
       the values it forbids. */
    const eqFirst = contradiction([only90({ priority: 10 }), never90({ priority: 0 })])
    const neFirst = contradiction([only90({ priority: 0 }), never90({ priority: 10 })])

    expect(eqFirst.blocked).toEqual(neFirst.blocked)
    expect(eqFirst.domains).toEqual(neFirst.domains)

    expect(eqFirst.fired).toEqual(['r-eq90', 'r-ne90'])
    expect(neFirst.fired).toEqual(['r-ne90', 'r-eq90'])

    expect(eqFirst.problems[0]).toEqual({
      constraintId: 'r-ne90',
      message: 'Nothing is left for motor, because the 90 is discontinued.',
    })
    expect(neFirst.problems[0]).toEqual({
      constraintId: 'r-eq90',
      message: 'Nothing is left for motor, because the transom is rated for 90 only.',
    })
  })

  it('is deterministic — the same input twice gives the same sentence', () => {
    expect(contradiction([only90(), never90()])).toEqual(contradiction([only90(), never90()]))
  })
})

describe('a rule can contradict without removing anything', () => {
  /* Three of the four problem sites raise WITHOUT a prune, so `fired`
     is empty and `blocked` is empty while `problems` is not. Anything
     downstream that infers "a rule objected" from `fired` is wrong,
     and these are the cases that prove it. */

  it('a table whose every approved combination has been ruled out', () => {
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['300'])],
      constraints: [
        rule({
          id: 't1',
          kind: 'table',
          combinations: [
            { hull: 'small', motor: '90' },
            { hull: 'small', motor: '150' },
          ],
          because: 'those are the only pairs the price file has ever quoted',
        }),
      ],
      chosen: { hull: 'small', motor: '300' },
    })
    expect(s.problems).toEqual([
      {
        constraintId: 't1',
        message:
          'None of the 2 approved combinations fit, because those are the only pairs the price file has ever quoted.',
      },
    ])
    expect(s.fired).toEqual([])
    expect(s.blocked).toEqual({})
    expect(s.domains.motor).toEqual(['300'])
  })

  it('pins the singular table sentence, which does not read as English', () => {
    /* MEASURED: with one combination, solve.ts:426 pluralises the NOUN
       and leaves the VERB alone, producing

         "None of the 1 approved combination fit, because …"

       The plural reads correctly and is asserted above; this is the
       singular branch, pinned exactly as it is so the branch is covered
       and so a fix is a deliberate edit rather than an accident. What it
       should read is a copy decision, not a test's to make — something
       in the shape of "The only approved combination does not fit,
       because …". Not fixed here: solve.ts is not this file's to touch. */
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['300'])],
      constraints: [
        rule({
          id: 't-one',
          kind: 'table',
          combinations: [{ hull: 'small', motor: '90' }],
          because: 'the price file has only ever quoted that one pair',
        }),
      ],
      chosen: { hull: 'small', motor: '300' },
    })
    expect(s.problems[0].message).toBe(
      'None of the 1 approved combination fit, because the price file has only ever quoted that one pair.',
    )
  })

  it('an OR whose every disjunct has become false', () => {
    /* solve.ts:390-394. Two different columns, so the "is one of"
       collapse does not apply and there is no single column to narrow —
       the rule is simply unsatisfiable. */
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['150']), field('colour', ['blue'])],
      constraints: [
        rule({
          id: 'r-or',
          if: and(['hull', 'eq', 'small']),
          then: or(['motor', 'eq', '90'], ['colour', 'eq', 'red']),
          because: 'a small hull needs either the 90 or the red package',
        }),
      ],
      chosen: { hull: 'small' },
    })
    expect(s.problems).toEqual([
      {
        constraintId: 'r-or',
        message:
          'This rule can no longer be satisfied, because a small hull needs either the 90 or the red package.',
      },
    ])
    expect(s.fired).toEqual([])
  })

  it('an `excludes` whose two sides have both been chosen', () => {
    const s = solve({
      fields: [field('hull', ['small', 'large']), field('motor', ['90', '300'])],
      constraints: [
        rule({
          id: 'x1',
          kind: 'excludes',
          if: and(['hull', 'eq', 'small']),
          then: and(['motor', 'eq', '300']),
          because: 'the transom is not rated for it',
        }),
      ],
      chosen: { hull: 'small', motor: '300' },
    })
    expect(s.problems).toEqual([
      {
        constraintId: 'x1',
        message: 'This rule can no longer be satisfied, because the transom is not rated for it.',
      },
    ])
    /* AND THE TRAP: both values are still in their domains and both are
       still reported as `settled`. A surface that decides a
       configuration is buildable by looking at `settled` will call this
       one buildable. `problems` is the only channel that knows. */
    expect(s.settled).toEqual({ hull: 'small', motor: '300' })
    expect(s.domains.motor).toEqual(['300'])
  })
})

describe('one contradiction stays one contradiction', () => {
  it('does not cascade into invented ones downstream', () => {
    /* solve.ts:267-271 freezes an emptied column, and evaluate.ts:68
       reads an empty domain as 'M'. So the rule that keys off the dead
       column neither fires nor complains — it genuinely does not know. */
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['90', '150']), field('prop', ['stainless', 'alloy'])],
      constraints: [
        only90(),
        never90(),
        rule({
          id: 'r-prop',
          if: and(['motor', 'eq', '90']),
          then: and(['prop', 'eq', 'stainless']),
          because: 'the 90 takes a stainless prop',
        }),
      ],
      chosen: { hull: 'small' },
    })
    expect(s.problems).toHaveLength(1)
    expect(s.problems[0].constraintId).toBe('r-ne90')
    expect(s.domains.prop).toEqual(['stainless', 'alloy'])
    expect(s.fired).not.toContain('r-prop')
  })

  it('reports two genuinely independent contradictions separately', () => {
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['90']), field('prop', ['stainless'])],
      constraints: [
        rule({ id: 'm1', if: and(['hull', 'eq', 'small']), then: and(['motor', 'eq', '150']), because: 'the 150 only' }),
        rule({ id: 'p1', if: and(['hull', 'eq', 'small']), then: and(['prop', 'eq', 'alloy']), because: 'the alloy prop only' }),
      ],
      chosen: { hull: 'small' },
    })
    expect(s.problems).toEqual([
      { constraintId: 'm1', message: 'Nothing is left for motor, because the 150 only.' },
      { constraintId: 'p1', message: 'Nothing is left for prop, because the alloy prop only.' },
    ])
  })

  it('says it once when one rule kills two columns that share a display name', () => {
    /* The dedupe key is `constraintId|message` (solve.ts:164) and the
       message carries the field's NAME, not its id. Two columns both
       called Motor therefore produce one line, not two identical ones.
       `blocked` still records both, so nothing is lost — this pins the
       behaviour so a future change to the key is a deliberate one. */
    const s = solve({
      fields: [field('hull', ['small']), field('mA', ['90'], 'Motor'), field('mB', ['90'], 'Motor')],
      constraints: [
        rule({
          id: 'r1',
          if: and(['hull', 'eq', 'small']),
          then: and(['mA', 'eq', '150'], ['mB', 'eq', '150']),
          because: 'the 150 only',
        }),
      ],
      chosen: { hull: 'small' },
    })
    expect(s.domains.mA).toEqual([])
    expect(s.domains.mB).toEqual([])
    expect(s.problems).toEqual([
      { constraintId: 'r1', message: 'Nothing is left for Motor, because the 150 only.' },
    ])
    expect(s.blocked.mA['90'].constraintId).toBe('r1')
    expect(s.blocked.mB['90'].constraintId).toBe('r1')
  })

  it('survives a rule pointing at deleted columns sitting beside a real one', () => {
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['90'])],
      constraints: [
        rule({ id: 'ghost', if: and(['gone', 'eq', 'x']), then: and(['alsoGone', 'eq', 'y']), because: 'a deleted column' }),
        rule({ id: 'real', if: and(['hull', 'eq', 'small']), then: and(['motor', 'eq', '150']), because: 'the 150 only' }),
      ],
      chosen: { hull: 'small' },
    })
    expect(s.problems).toEqual([
      { constraintId: 'real', message: 'Nothing is left for motor, because the 150 only.' },
    ])
  })
})

describe('what cannot raise a contradiction', () => {
  it('a warned rule, even when it disagrees with every value there is', () => {
    /* The complement of warn.test.ts: there the pair was one rule, here
       it is the exact pair that DOES contradict when it blocks. */
    const s = contradiction([only90({ severity: 'warn' }), never90({ severity: 'warn' })])
    expect(s.problems).toEqual([])
    expect(s.domains.motor).toEqual(['90', '150'])
    expect(s.warnedBy).toEqual(['r-eq90', 'r-ne90'])
  })

  it('a disabled rule', () => {
    const s = contradiction([only90({ enabled: false }), never90({ enabled: false })])
    expect(s.problems).toEqual([])
    expect(s.domains.motor).toEqual(['90', '150'])
  })

  it('two rules that cannot both hold over a column with no enumerable values', () => {
    /* length <= 5 AND length >= 10 is unsatisfiable, and the solver says
       nothing — correctly, on its own terms. A number column carries no
       list (domain.ts:29-46), the solver only ever REMOVES, and there is
       nothing there to remove. This is the documented price of finite
       domains, asserted so it is a known limit rather than a surprise:
       the contradiction appears the moment someone types a number. */
    const bounds = [
      rule({ id: 'r-lo', if: and(['hull', 'eq', 'small']), then: and(['length', 'lte', 5]), because: 'the small hull is under 5m' }),
      rule({ id: 'r-hi', if: and(['hull', 'eq', 'small']), then: and(['length', 'gte', 10]), because: 'the small hull is over 10m' }),
    ]
    const unanswered = solve({
      fields: [field('hull', ['small']), num('length')],
      constraints: bounds,
      chosen: { hull: 'small' },
    })
    expect(unanswered.problems).toEqual([])

    const answered = solve({
      fields: [field('hull', ['small']), num('length')],
      constraints: bounds,
      chosen: { hull: 'small', length: 7 },
    })
    expect(answered.problems).toHaveLength(1)
    expect(answered.problems[0].message).toBe(
      'Your choice of 7 for length no longer works, because the small hull is under 5m.',
    )
  })
})

describe('a contradiction the solver cannot see', () => {
  /* MEASURED, NOT INFERRED. The three cases below are the same
     violated configuration — hull 'small' and motor '300' chosen, and
     an `excludes` rule saying those two may never be chosen together —
     written three ways that differ only in the OPERATOR.

       eq       / eq         -> problem raised   (asserted, passes)
       contains / eq         -> problem raised   (asserted, passes)
       contains / contains   -> NOTHING          (the defect)

     WHY. `excludes` only ever acts through `negateGroup`
     (solve.ts:466-477), and NEG_OP (evaluate.ts:159-171) has no
     opposite for 'contains', 'startsWith' or 'endsWith' — there is no
     "does not contain" in the operator vocabulary. `negateClause`
     therefore returns undefined, `negateGroup` declines, and BOTH
     branches of the excludes case do nothing at all. One negatable
     side is enough to save it, because the other branch still runs;
     when both sides are un-negatable there is no branch left.

     It is specific to `excludes`. The same un-negatable operator on an
     `implies` is fine (asserted below), because implies enforces its
     `then` directly through `compare` and never needs a negation.

     A fix belongs in solve.ts, which this file may not touch. The
     shape of it: in `applyConstraint`'s 'excludes' case, when
     evalGroup(if) === 'T' AND evalGroup(then) === 'T' the rule is
     violated by definition, whatever the operators — that deserves an
     addProblem of its own rather than being reachable only as a
     side effect of pruning. */

  const bothChosen = (ifOp: string, thenOp: string, ifValue: string, thenValue: string) =>
    solve({
      fields: [field('hull', ['small', 'large']), field('motor', ['90', '300'])],
      constraints: [
        rule({
          id: 'x',
          kind: 'excludes',
          if: and(['hull', ifOp, ifValue]),
          then: and(['motor', thenOp, thenValue]),
          because: 'the transom is not rated for it',
        }),
      ],
      chosen: { hull: 'small', motor: '300' },
    })

  it('is seen when both sides can be negated', () => {
    expect(bothChosen('eq', 'eq', 'small', '300').problems).toEqual([
      { constraintId: 'x', message: 'This rule can no longer be satisfied, because the transom is not rated for it.' },
    ])
  })

  it('is seen when only ONE side can be negated — either one', () => {
    expect(bothChosen('contains', 'eq', 'sm', '300').problems).toHaveLength(1)
    expect(bothChosen('eq', 'contains', 'small', '3').problems).toHaveLength(1)
  })

  it('is NOT seen when NEITHER side can be negated — and it should be', () => {
    /* Documenting the defect from the other end, so it is visible
       without reading `it.fails`: this passes today, and the day the
       fix lands it fails and points here. */
    const s = bothChosen('contains', 'contains', 'sm', '3')
    expect(s.problems).toEqual([])
    expect(s.fired).toEqual([])
    expect(s.blocked).toEqual({})
    /* the rule is violated: both sides are definitely true */
    expect(s.domains.hull).toEqual(['small'])
    expect(s.domains.motor).toEqual(['300'])
  })

  it.fails('KNOWN DEFECT: `excludes` with un-negatable operators on both sides is silent', () => {
    /* `it.fails` because the assertion below is the CORRECT one and
       solve.ts does not satisfy it yet. Delete the `.fails` when
       `excludes` raises a problem from evalGroup(if) === 'T' &&
       evalGroup(then) === 'T' directly. */
    expect(bothChosen('contains', 'contains', 'sm', '3').problems).toEqual([
      { constraintId: 'x', message: 'This rule can no longer be satisfied, because the transom is not rated for it.' },
    ])
  })

  it('the same un-negatable operator on an `implies` is caught', () => {
    const s = solve({
      fields: [field('hull', ['small']), field('motor', ['300'])],
      constraints: [
        rule({
          id: 'i1',
          kind: 'implies',
          if: and(['hull', 'contains', 'sm']),
          then: and(['motor', 'contains', '9']),
          because: 'a small hull takes a 9-series motor',
        }),
      ],
      chosen: { hull: 'small', motor: '300' },
    })
    expect(s.problems).toEqual([
      {
        constraintId: 'i1',
        message: 'Your choice of 300 for motor no longer works, because a small hull takes a 9-series motor.',
      },
    ])
  })

  it('and says nothing when the two sides are merely POSSIBLE together', () => {
    /* The counterpart that must stay silent: nothing chosen, so both
       sides evaluate 'M' and a rule that fires on a maybe would remove
       an option the person could still have had. */
    const s = solve({
      fields: [field('hull', ['small', 'large']), field('motor', ['300', '90'])],
      constraints: [
        rule({
          id: 'x6',
          kind: 'excludes',
          if: and(['hull', 'eq', 'small']),
          then: and(['motor', 'eq', '300']),
          because: 'the transom is not rated for it',
        }),
      ],
      chosen: {},
    })
    expect(s.problems).toEqual([])
    expect(s.domains.hull).toEqual(['small', 'large'])
    expect(s.domains.motor).toEqual(['300', '90'])
  })
})

/* ============================================================
   NOT COVERED, AND SAID PLAINLY.

   solve.ts:574-581 — the MAX_ROUNDS runaway — has no test here. Every
   propagation pass either removes at least one value or ends the loop,
   and removal is monotonic, so the round count is bounded by the total
   number of values across all domains. Reaching 1001 rounds therefore
   needs a model of more than 1000 enumerable values arranged to give up
   exactly one per pass. Not verified whether such a model can be built
   at all with this operator set; it was not attempted, so that branch
   is unmeasured rather than known-good.
   ============================================================ */
