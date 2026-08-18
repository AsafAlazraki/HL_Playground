/* ============================================================
   NEVER CHARGE IT TWICE — the rung flags, against the real seed.

   `docs/specs/SERVICE_AND_THEMES.md` §3.2 theme 5 asked for one
   thing and gave the reason in one sentence:

     "`Sell inc Rego` includes registration; `Cash` does not …
      Every 'must never add this twice' sentence in QUOTE_SPEC §2.3
      is a fact about what a price column already contains. Three
      optional booleans on `PriceLevel` move all of them from prose
      into data, and the quote's rule becomes mechanical: never add
      a charge that a line's own price column already includes."

   Four properties, and each one is a way this could go green while
   the fee still gets charged twice:

     1. THE FOUR FACTS REACH THE REAL TABLES. A flag declared in
        `NAMED_LEVELS` against a column name no seeded table
        carries is a flag that will never fire. So the assertions
        run through `priceLevelsFor` on tables out of
        `src/demos/northside.ts`, never on a fixture.
     2. THE THIRD STATE SURVIVES. `false` is not `undefined`: a
        part's `Sell` is asserted NOT to contain fitting, and a
        motor's `Trade Price` has no cell either way and must stay
        silent. Coercing either into the other is how a guard
        starts refusing correct charges — or stops refusing wrong
        ones.
     3. IT ASKS THE RUNG, NOT THE TABLE. A part carries both rungs;
        which one the LINE is priced at decides the answer, and
        asking the table would refuse a fitting charge on a supply
        line, which is a charge the business makes on purpose.
     4. IT FREEZES. `QuoteLine` renders from itself and never reads
        a base table (`types.ts` header), so the fact has to be on
        the line or the document cannot say it.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import type { EntityDef, RowData } from '@/types/model'
import type { FrozenLevel } from './types'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async (_snapshot: { rows: RowData[] }) => {},
    wipe: async () => {},
  },
}))

const { buildNorthsideProject } = await import('@/demos/northside')
const {
  chargeAlreadyIn,
  chargeAlreadyInSentence,
  chargeNamedBy,
  freezeLevels,
  priceLevelsFor,
  rungIncludes,
} = await import('./pricing')
const { CHARGE_TITLE } = await import('./types')

const project = buildNorthsideProject()
const byKind = (kind: string): EntityDef[] =>
  project.entities.filter((e) => e.kind === kind && e.role !== 'join')

const levelsOn = (entity: EntityDef) => priceLevelsFor(entity)
const rung = (entity: EntityDef, key: string) => levelsOn(entity).find((l) => l.key === key)

/* ---------------------------------------------------------- */
/* 1 · the four facts land on real tables                      */
/* ---------------------------------------------------------- */

describe('what a price column already contains, on the seeded tables', () => {
  it("a trailer's Sell inc Rego says the registration fee is inside it, with the cell", () => {
    const trailers = byKind('trailer')
    expect(trailers.length).toBeGreaterThan(0)

    let carried = 0
    for (const t of trailers) {
      const cash = rung(t, 'cash')
      if (!cash) continue
      carried += 1
      expect(cash.label).toBe('Sell inc Rego')
      expect(rungIncludes(cash, 'registration')).toBe(true)
      /* the cell, not the claim — SERVICE_AND_THEMES.md §3.1 reads
         `CA = ROUNDUP(BW+BZ,)` */
      expect(cash.contains?.source).toContain('Trailer Module!CA')
      expect(cash.contains?.source).toContain('BZ')
    }
    expect(carried).toBeGreaterThan(0)
  })

  it("a boat's hull-only rungs say registration is NOT inside them", () => {
    const boats = byKind('boat')
    expect(boats.length).toBeGreaterThan(0)

    let carried = 0
    for (const b of boats) {
      const cash = rung(b, 'cash')
      if (!cash) continue
      carried += 1
      expect(rungIncludes(cash, 'registration')).toBe(false)
      /* the receipt is the two published numbers that differ by the
         fee — Managers View D41 vs D42 */
      expect(cash.contains?.source).toContain('D41')
      expect(cash.contains?.source).toContain('D42')
    }
    expect(carried).toBeGreaterThan(0)
  })

  it("a motor's Sell Price says pre-delivery is inside it", () => {
    const motors = byKind('motor')
    expect(motors.length).toBeGreaterThan(0)

    let carried = 0
    for (const m of motors) {
      const cash = rung(m, 'cash')
      if (!cash) continue
      carried += 1
      expect(rungIncludes(cash, 'preDelivery')).toBe(true)
      expect(cash.contains?.source).toContain('Motor Library!BF')
    }
    expect(carried).toBeGreaterThan(0)
  })

  it("a part's two rungs disagree about fitting labour, which is the point", () => {
    const parts = byKind('accessory')
    expect(parts.length).toBeGreaterThan(0)

    let carried = 0
    for (const p of parts) {
      const supply = rung(p, 'cash')
      const fitted = rung(p, 'fitted')
      if (!supply || !fitted) continue
      carried += 1
      expect(rungIncludes(supply, 'install')).toBe(false)
      expect(rungIncludes(fitted, 'install')).toBe(true)
    }
    expect(carried).toBeGreaterThan(0)
  })
})

/* ---------------------------------------------------------- */
/* 2 · the third state                                         */
/* ---------------------------------------------------------- */

describe('undefined is a state and is never coerced', () => {
  it("a motor's Trade Price claims nothing about pre-delivery, because no cell says", () => {
    const motor = byKind('motor').find((m) => rung(m, 'trade'))
    expect(motor).toBeDefined()
    const trade = rung(motor as EntityDef, 'trade')
    expect(trade).toBeDefined()
    expect(rungIncludes(trade, 'preDelivery')).toBeUndefined()
  })

  it('a rung with no contents at all answers undefined for every charge', () => {
    const bare: Pick<FrozenLevel, 'contains'> = {}
    expect(rungIncludes(bare, 'registration')).toBeUndefined()
    expect(rungIncludes(bare, 'install')).toBeUndefined()
    expect(rungIncludes(bare, 'preDelivery')).toBeUndefined()
    expect(rungIncludes(undefined, 'registration')).toBeUndefined()
  })

  it('a charge asserted absent never reads as present', () => {
    const parts = byKind('accessory')
    const supply = parts.map((p) => rung(p, 'cash')).find((l) => l !== undefined)
    expect(supply).toBeDefined()
    /* false, and therefore NOT true — the distinction the guard
       stands on */
    expect(rungIncludes(supply, 'install')).toBe(false)
    expect(rungIncludes(supply, 'install')).not.toBe(true)
  })
})

/* ---------------------------------------------------------- */
/* 3 · the rule asks the rung the line is priced at             */
/* ---------------------------------------------------------- */

const line = (label: string, levels: FrozenLevel[], resolved: string) => ({
  label,
  levelResolved: resolved,
  priceColumnName: levels.find((l) => l.key === resolved)?.label ?? null,
  levels,
})

describe('never add a charge a line already carries', () => {
  const trailer = byKind('trailer').find((t) => rung(t, 'cash')) as EntityDef
  const part = byKind('accessory').find((p) => rung(p, 'fitted')) as EntityDef
  const boat = byKind('boat').find((b) => rung(b, 'cash')) as EntityDef

  const frozen = (entity: EntityDef): FrozenLevel[] => freezeLevels(entity, {})

  it('finds the trailer whose price already has the fee in it', () => {
    const lines = [
      line('Redco Sportsman', frozen(trailer), 'cash'),
      line('Highfield Sport 520', frozen(boat), 'cash'),
    ]
    const found = chargeAlreadyIn(lines, 'registration')
    expect(found).toHaveLength(1)
    expect(found[0].line).toBe('Redco Sportsman')
    expect(found[0].column).toBe('Sell inc Rego')
    expect(found[0].source).toContain('Trailer Module!CA')
  })

  it('leaves the boat alone — its own rung says the fee is not inside it', () => {
    const found = chargeAlreadyIn([line('Highfield Sport 520', frozen(boat), 'cash')], 'registration')
    expect(found).toHaveLength(0)
  })

  it('a part priced at supply may be charged for fitting; the same part fitted may not', () => {
    const levels = frozen(part)
    expect(chargeAlreadyIn([line('Racor filter', levels, 'cash')], 'install')).toHaveLength(0)
    expect(chargeAlreadyIn([line('Racor filter', levels, 'fitted')], 'install')).toHaveLength(1)
  })

  it('says it in one sentence naming the line and the column, or says nothing', () => {
    const lines = [line('Redco Sportsman', frozen(trailer), 'cash')]
    const say = chargeAlreadyInSentence(chargeAlreadyIn(lines, 'registration'), 'registration')
    expect(say).toContain('Redco Sportsman')
    expect(say).toContain('Sell inc Rego')
    expect(say).toContain(CHARGE_TITLE.registration)
    expect(chargeAlreadyInSentence([], 'registration')).toBeNull()
  })
})

/* ---------------------------------------------------------- */
/* 4 · what a typed label is naming                            */
/* ---------------------------------------------------------- */

describe('reading a charge out of a typed label', () => {
  it("catches the business's own words for a registration line", () => {
    for (const typed of [
      'Registration',
      'Boat Registration',
      'Trailer rego',
      'REGISTRATION - 6.01m to 10.00m',
    ]) {
      expect(chargeNamedBy(typed)).toBe('registration')
    }
  })

  it('catches pre-delivery and fitting', () => {
    expect(chargeNamedBy('Pre Delivery')).toBe('preDelivery')
    expect(chargeNamedBy('PDI')).toBe('preDelivery')
    expect(chargeNamedBy('Installation')).toBe('install')
    expect(chargeNamedBy('Fitting')).toBe('install')
  })

  it('does not fire on a word that merely rhymes, and never on nothing', () => {
    /* "Registry" and "Regular" are not "rego"; "Preparation" is not
       "pre delivery". A warning a person has learned to ignore is how
       the real one gets ignored too. */
    for (const typed of ['', '   ', 'Regular service', 'Registry entry', 'Preparation']) {
      expect(chargeNamedBy(typed)).toBeNull()
    }
  })
})

/* ---------------------------------------------------------- */
/* 5 · it freezes onto the line                                */
/* ---------------------------------------------------------- */

describe('the fact travels on the frozen line', () => {
  it('freezeLevels carries contents through, so a document can say it', () => {
    const trailer = byKind('trailer').find((t) => rung(t, 'cash')) as EntityDef
    const levels = freezeLevels(trailer, {})
    const cash = levels.find((l) => l.key === 'cash')
    expect(cash?.contains?.includesRegistration).toBe(true)
    expect(cash?.contains?.source).toBeTruthy()
  })

  it('a rung with nothing to say carries no `contains` key at all', () => {
    const motor = byKind('motor').find((m) => rung(m, 'trade')) as EntityDef
    const trade = freezeLevels(motor, {}).find((l) => l.key === 'trade')
    expect(trade).toBeDefined()
    expect(trade && 'contains' in trade).toBe(false)
  })
})
