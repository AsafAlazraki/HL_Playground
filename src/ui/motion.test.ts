/* ============================================================
   THE MOTION LAYER — the parts a unit test can actually see.

   THE CSS CROSS-CHECK IS NOT HERE, and the reason is worth
   recording because it cost an hour. `system.css` declares
   `--d-press` and friends for CSS transitions; `motion.ts`
   declares `D_PRESS` and friends for `motion`, which cannot read a
   custom property. Two copies of one number want a guard.

   That guard cannot live in vitest. A CSS file read through
   `?raw` — both as a direct import and through
   `import.meta.glob`, the form the rest of this repo uses — comes
   back as an EMPTY STRING in this project: vitest processes the
   specifier before the query is honoured. Measured:
   `typeof css === 'string'`, `length === 0`. An empty subject
   makes every assertion pass vacuously, which is the worst
   outcome a guard can have — it reports green and means nothing,
   which is the exact failure `CLAUDE.md` records about a contrast
   sweep that measured the wrong screen.

   So the duration cross-check lives in `tools/check-styles.mjs`,
   with the other source-scanning guards, in node, where reading a
   file is native. Same shape as `check-stores.mjs` reading
   `forgetBusiness.ts` for its two lists.

   What is left here is what a unit test is actually good at: the
   arithmetic, and the invariants between the numbers.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import {
  D_EXIT,
  D_FAST,
  D_MED,
  D_PRESS,
  D_SCENE,
  D_SHEET,
  D_SLOW,
  SPRING,
  SPRING_GRABBED,
  SPRING_QUICK,
  SPRING_SLOW,
  stagger,
  STAGGER_MS,
} from './motion'

describe('the stagger', () => {
  it('starts at zero, so the first item does not wait', () => {
    expect(stagger(0)).toBe(0)
  })

  it('is 40ms a step, in seconds because that is what motion takes', () => {
    expect(STAGGER_MS).toBe(40)
    expect(stagger(1)).toBeCloseTo(0.04)
    expect(stagger(3)).toBeCloseTo(0.12)
  })

  /* PAST THE CAP A STAGGER READS AS THE PAGE BEING SLOW. Ten items
     is 400ms end to end; forty would be 1.6 seconds of a list
     assembling itself while somebody waits to press something. */
  it('caps, so a long list does not become a loading sequence', () => {
    expect(stagger(10)).toBeCloseTo(0.4)
    expect(stagger(40)).toBeCloseTo(0.4)
    expect(stagger(400)).toBeCloseTo(0.4)
  })
})

describe('the durations', () => {
  /* A thing leaving has already been decided about. Making a person
     wait for it is making them wait for an answer they gave. */
  it('exit is faster than every enter', () => {
    expect(D_EXIT).toBeLessThan(D_MED)
    expect(D_EXIT).toBeLessThan(D_SHEET)
    expect(D_EXIT).toBeLessThan(D_SCENE)
  })

  it('rise monotonically, so a bigger surface never moves quicker', () => {
    const ramp = [D_PRESS, D_FAST, D_MED, D_SLOW, D_SHEET, D_SCENE]
    expect(ramp).toEqual([...ramp].sort((a, b) => a - b))
  })

  /* UI STAYS UNDER 300ms. A 180ms dropdown feels more responsive
     than a 400ms one. Only the Showroom scene change is allowed
     past it, because it is a whole stage arriving once per quote. */
  it('keeps every UI duration under 300ms', () => {
    for (const d of [D_PRESS, D_FAST, D_MED, D_SLOW]) expect(d).toBeLessThan(300)
    expect(D_SCENE).toBeGreaterThan(300)
  })
})

describe('the springs', () => {
  /** ζ = c / 2√(k·m) — the damping ratio Apple states and `motion`
   *  does not take. Recomputed here from the triplet actually
   *  shipped, so the comment in `motion.ts` is checkable rather
   *  than taken on faith. */
  const zeta = (s: { stiffness?: number; damping?: number; mass?: number }) =>
    (s.damping ?? 0) / (2 * Math.sqrt((s.stiffness ?? 0) * (s.mass ?? 1)))

  /** response = 2π / √(k/m), in seconds. */
  const response = (s: { stiffness?: number; mass?: number }) =>
    (2 * Math.PI) / Math.sqrt((s.stiffness ?? 0) / (s.mass ?? 1))

  it('are critically damped, except the one a person grabbed', () => {
    expect(zeta(SPRING)).toBeCloseTo(1, 2)
    expect(zeta(SPRING_QUICK)).toBeCloseTo(1, 2)
    expect(zeta(SPRING_SLOW)).toBeCloseTo(1, 2)
    /* ζ 0.8 is about 1.5% overshoot: life on a gesture, a wobble on
       a menu. Reserved for a surface that carried momentum. */
    expect(zeta(SPRING_GRABBED)).toBeCloseTo(0.8, 2)
  })

  it('hit the responses the comments claim — 220 / 300 / 400ms', () => {
    expect(response(SPRING_QUICK)).toBeCloseTo(0.22, 2)
    expect(response(SPRING)).toBeCloseTo(0.3, 2)
    expect(response(SPRING_SLOW)).toBeCloseTo(0.4, 2)
  })

  it('separate by about 1.36 per step, so they read as one object', () => {
    const step = response(SPRING) / response(SPRING_QUICK)
    expect(step).toBeGreaterThan(1.25)
    expect(step).toBeLessThan(1.45)
  })
})
