/* ============================================================
   THE RIG, MEASURED — against the whole seed, and against the one
   thing the surface must never be caught doing.

   WHAT THIS GUARDS, and each one is a way the screen could lie:

     1 · NOTHING IS INVENTED. Every option a slot draws was read out
         of a live cell of a table that carries that column. A menu
         the app made up is the single failure this price file's
         owner is angriest about.
     2 · THE REASON IS THE RULE'S OWN. Every refusal sentence is
         `ConstraintDef.because`, character for character, out of
         `explain()`. Not paraphrased, not composed here, and not
         written in the component either — a hand-written string
         drifts from the rule the day somebody edits it.
     3 · A REFUSAL IS NEVER SILENT. Every refused option and every
         refused row carries at least one reason. That is
         DESIGN_PRINCIPLES rule 10, and this is where it is either
         kept or not.
     4 · A REFUSED OPTION STAYS ON THE LIST. The option count of a
         column does not move when a rule starts refusing half of
         it. A dealer has to be able to see that the thing exists.
     5 · A WARNING TAKES NOTHING AWAY. The same rule at severity
         'warn' refuses nothing, flags instead, and the row stays
         offered — the guarantee `solve.ts` rule 5 makes, read at
         the surface that would break it first.
     6 · CHANGING THE HULL RE-PROPAGATES. The identical rule against
         a different hull leaves a different set standing.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { buildNorthsideProject } from '@/demos/northside'
import { buildConcepts, fieldOn, representativeFieldId } from '@/features/constraints'
import { isDiscontinued, readCell } from '@/types/model'
import type { ConstraintDef } from '@/types/model'
import { readFanOut } from './reading'
import { readRig, readStarters, type RigProject } from './rigReading'

const seed = buildNorthsideProject()
const project: RigProject = {
  entities: Object.fromEntries(seed.entities.map((e) => [e.id, e])),
  rowsByEntity: seed.rowsByEntity,
}
const reading = readFanOut(project)
const concepts = buildConcepts(project.entities)
const starters = readStarters(project, reading)

const conceptFor = (key: string) => {
  const found = concepts.find((c) => c.key === key)
  if (!found) throw new Error(`the seed no longer carries ${key}`)
  return found
}

const SERIES = conceptFor('boat::series')
const CONTROL = conceptFor('motor::control')

/** The one value of Yamaha's Control column this rule leaves standing.
 *  Read off the sheet, never typed: a literal here would be a second
 *  place the price file is described. */
const KEPT = (() => {
  const bare = readRig({ project, constraints: [], reading, hull: starters[0], chosen: {} })
  const slot = bare.slots.find((s) => s.key === CONTROL.key)
  if (!slot || slot.options.length < 2) throw new Error('motor::control is no longer a menu')
  return String(slot.options[0].value)
})()

/** The series the hull we test against actually carries. */
const seriesOf = (starter: { tableId: string; rowId: string }): string => {
  const table = project.entities[starter.tableId]
  const field = table ? fieldOn(SERIES, table) : undefined
  const row = (project.rowsByEntity[starter.tableId] ?? []).find((r) => r.id === starter.rowId)
  const v = field && row ? readCell(row, field.id) : null
  return v === null || v === undefined ? '' : String(v)
}

const HULL = starters.find((s) => seriesOf(s) !== '')!
const OTHER = starters.find((s) => seriesOf(s) !== '' && seriesOf(s) !== seriesOf(HULL))!

const BECAUSE = 'the hull is set up for a remote helm and a tiller motor is steered from the engine'

function ruleFor(severity: 'block' | 'warn'): ConstraintDef {
  return {
    id: `test:${severity}`,
    kind: 'implies',
    if: {
      combinator: 'AND',
      clauses: [
        {
          id: 'if-1',
          left: { fieldId: representativeFieldId(SERIES) },
          op: 'eq',
          right: { kind: 'literal', value: seriesOf(HULL) },
        },
      ],
    },
    then: {
      combinator: 'AND',
      clauses: [
        {
          id: 'then-1',
          left: { fieldId: representativeFieldId(CONTROL) },
          op: 'eq',
          right: { kind: 'literal', value: KEPT },
        },
      ],
    },
    because: BECAUSE,
    severity,
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const BLOCKING = ruleFor('block')

const rigWith = (constraints: ConstraintDef[], hull = HULL) =>
  readRig({ project, constraints, reading, hull, chosen: {} })

/* ---------------------------------------------------------- */

describe('a rig starts from the price file and nothing else', () => {
  it('offers only hulls that are still sold, off the tables the fan-out found', () => {
    expect(starters.length).toBeGreaterThan(0)
    const tables = new Set(reading.fans.map((f) => f.subjectTableId))
    for (const starter of starters) expect(tables.has(starter.tableId)).toBe(true)

    const live = reading.fans.reduce((n, f) => n + f.subjects, 0)
    expect(starters.length).toBe(Math.min(live, 4000))
  })

  it('draws the catalogues the sheet already pairs this hull with, in its order', () => {
    const rig = rigWith([])
    expect(rig.catalogues.length).toBeGreaterThan(0)
    const fan = reading.fans.find((f) => f.subjectTableId === HULL.tableId)!
    const partners = fan.groups.flatMap((g) => g.strands).map((s) => s.partnerTableId)
    for (const catalogue of rig.catalogues) expect(partners).toContain(catalogue.tableId)
  })

  it('never invents an option — every one was read out of a live cell', () => {
    const rig = rigWith([])
    for (const slot of rig.slots.slice(0, 12)) {
      const concept = concepts.find((c) => c.key === slot.key)!
      if (concept.type === 'boolean') continue
      const held = new Set<string>()
      for (const tableId of concept.tableIds) {
        const table = project.entities[tableId]
        const field = table ? fieldOn(concept, table) : undefined
        if (!table || !field) continue
        for (const row of project.rowsByEntity[tableId] ?? []) {
          if (isDiscontinued(row)) continue
          const v = readCell(row, field.id)
          if (v === null || v === undefined || v === '' || Array.isArray(v)) continue
          held.add(String(v))
        }
      }
      for (const option of slot.options) expect(held.has(String(option.value))).toBe(true)
    }
  })

  it('refuses nothing at all when the business has stated no rule', () => {
    const rig = rigWith([])
    expect(rig.rulesInForce).toBe(0)
    expect(rig.fired).toEqual([])
    expect(rig.problems).toEqual([])
    for (const slot of rig.slots) expect(slot.refused).toBe(0)
    for (const catalogue of rig.catalogues) expect(catalogue.refused).toBe(0)
  })
})

describe('a refusal carries the rule’s own words', () => {
  it('prints `because` character for character, out of explain()', () => {
    const rig = rigWith([BLOCKING])
    const slot = rig.slots.find((s) => s.key === CONTROL.key)!
    const refused = slot.options.filter((o) => o.state === 'refused')
    expect(refused.length).toBeGreaterThan(0)
    for (const option of refused) {
      expect(option.because).toBe(BECAUSE)
      expect(option.constraintId).toBe(BLOCKING.id)
    }
  })

  it('leaves every refused option on the list, struck rather than gone', () => {
    const before = rigWith([])
    const after = rigWith([BLOCKING])
    const was = before.slots.find((s) => s.key === CONTROL.key)!
    const now = after.slots.find((s) => s.key === CONTROL.key)!
    expect(now.options.length).toBe(was.options.length)
    expect(now.open).toBeLessThan(was.open)
    expect(now.open + now.refused).toBe(now.options.length)
  })

  it('never leaves a refusal without a reason — rule 10, where it bites', () => {
    const rig = rigWith([BLOCKING])
    for (const slot of rig.slots) {
      for (const option of slot.options) {
        if (option.state === 'open' || option.state === 'chosen') continue
        expect(option.notes.length).toBeGreaterThan(0)
        expect(option.constraintId).not.toBe('')
      }
    }
    for (const catalogue of rig.catalogues) {
      for (const candidate of catalogue.candidates) {
        if (candidate.verdict === 'offered') continue
        expect(candidate.reasons.length).toBeGreaterThan(0)
        expect(candidate.reasons[0].because).toBe(BECAUSE)
      }
    }
  })

  it('names the row, its price and the cell the rule read', () => {
    const rig = rigWith([BLOCKING])
    const motors = rig.catalogues.find((c) => c.kind === 'motor')!
    const refused = motors.candidates.find((c) => c.verdict === 'refused')!
    expect(refused.label).not.toBe('')
    expect(refused.reasons[0].column).toBe(CONTROL.name)
    expect(refused.reasons[0].value).not.toBe('')
    expect(motors.offered + motors.flagged + motors.refused).toBe(motors.live)
  })
})

describe('a warning takes nothing away', () => {
  it('flags the same values and removes none of them', () => {
    const blocked = rigWith([BLOCKING])
    const warned = rigWith([ruleFor('warn')])

    const blockedSlot = blocked.slots.find((s) => s.key === CONTROL.key)!
    const warnedSlot = warned.slots.find((s) => s.key === CONTROL.key)!

    expect(warnedSlot.refused).toBe(0)
    expect(warnedSlot.flagged).toBe(blockedSlot.refused)
    expect(warnedSlot.open).toBe(warnedSlot.options.length)
    expect(warned.fired).toEqual([])
    expect(warned.warnedBy).toEqual(['test:warn'])

    const motors = warned.catalogues.find((c) => c.kind === 'motor')!
    expect(motors.refused).toBe(0)
    expect(motors.flagged).toBeGreaterThan(0)
    for (const candidate of motors.candidates) {
      if (candidate.verdict !== 'flagged') continue
      expect(candidate.reasons[0].because).toBe(BECAUSE)
    }
  })
})

describe('changing the hull re-propagates', () => {
  it('leaves a different set standing under the identical rule', () => {
    const here = rigWith([BLOCKING], HULL)
    const there = rigWith([BLOCKING], OTHER)

    expect(here.fired).toEqual([BLOCKING.id])
    expect(there.fired).toEqual([])

    const hereSlot = here.slots.find((s) => s.key === CONTROL.key)!
    const thereSlot = there.slots.find((s) => s.key === CONTROL.key)!
    expect(hereSlot.refused).toBeGreaterThan(0)
    expect(thereSlot.refused).toBe(0)
    expect(thereSlot.options.length).toBe(hereSlot.options.length)
  })

  it('reads the hull’s own cells as the facts the rules work from', () => {
    const rig = rigWith([BLOCKING])
    const fact = rig.facts.find((f) => f.key === SERIES.key)
    expect(fact).toBeDefined()
    expect(fact?.value).toBe(seriesOf(HULL))
  })
})

describe('nothing throws, for any input', () => {
  it('answers an empty project, an unknown hull and a broken rule', () => {
    const empty = readRig({
      project: { entities: {}, rowsByEntity: {} },
      constraints: [],
      reading,
      hull: null,
      chosen: {},
    })
    expect(empty.hull).toBeNull()
    expect(empty.slots).toEqual([])
    expect(empty.catalogues).toEqual([])

    const ghost = readRig({
      project,
      constraints: [
        { ...BLOCKING, id: 'ghost', if: { combinator: 'AND', clauses: [] }, then: undefined },
      ],
      reading,
      hull: { tableId: 'no-such-table', rowId: 'no-such-row' },
      chosen: {},
    })
    expect(ghost.hull).toBeNull()
    expect(ghost.problems).toEqual([])
  })
})
