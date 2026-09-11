/* ============================================================
   WHICH RULES GOVERN A MODULE — and the tenth verb that decides
   whether anyone may change them.

   THE TWO FAILURES THIS FILE GUARDS.

   1. A RULE SHOWN IN THE WRONG PLACE, OR NOT SHOWN AT ALL. Scope
      here is COMPUTED off the columns, never assigned — so the
      test that matters is that pointing a module at another table
      changes the answer, and that a rule naming a column nobody
      has is claimed by nobody. If this ever became a stored
      `ruleIds`, these assertions are what would catch the day it
      disagreed with the sheet.

   2. A WRITING VERB THAT ARRIVES ON. `DEFAULT_CAPABILITIES` is
      `['browse','search','open']` — "nothing that writes is on by
      default" — and writing a business rule is the most
      consequential write in the product. A regression that seeded
      it ON would be invisible on screen (the panel would simply be
      there) and is asserted here instead.

   NO BUSINESS RULE IS INVENTED IN THIS FILE. The workbook
   assertions are read from `WORKBOOK_RULES`, by reference, and the
   test states the reference rather than restating the rule.
   ============================================================ */
import { beforeEach, describe, expect, it } from 'vitest'
import type {
  ConstraintDef,
  EntityDef,
  FieldDef,
  ModuleDef,
  RuleDef,
  RuleNode,
} from '@/types/model'
import { buildConcepts, conceptIndex } from '@/features/constraints/columns'
import { WORKBOOK_RULES } from '@/features/constraints/workbookRules'
import {
  constraintsFor,
  flowRulesFor,
  kindOfConceptKey,
  moduleConceptKeys,
  moduleKinds,
  workbookRulesFor,
} from './moduleRules'
import { DEFAULT_CAPABILITIES, MODULE_CAPABILITIES } from '@/types/model'
import { DESIGNER_CAPABILITIES, capabilityStates, capabilityWords } from './designer'

const STAMP = '2026-01-01T00:00:00.000Z'

const field = (id: string, name: string, type: FieldDef['type'] = 'number'): FieldDef => ({
  id,
  name,
  type,
})

const table = (
  id: string,
  name: string,
  kind: EntityDef['kind'],
  fields: FieldDef[],
): EntityDef => ({
  id,
  name,
  accent: 'blue',
  kind,
  fields,
  position: { x: 0, y: 0 },
  createdAt: STAMP,
  updatedAt: STAMP,
})

/* Two boat brands carrying the SAME column, which is the whole point
   of a concept: one table per brand (CONFIGURATOR_SPEC §3-zero). */
const HIGHFIELD = table('boat_highfield', 'Highfield', 'boat', [
  field('hf_name', 'Model', 'text'),
  field('hf_maxhp', 'Max HP'),
])
const STACER = table('boat_stacer', 'Stacer', 'boat', [
  field('st_name', 'Model', 'text'),
  field('st_maxhp', 'Max HP'),
])
const YAMAHA = table('mot_yamaha', 'Yamaha Outboards', 'motor', [
  field('ya_name', 'Model', 'text'),
  field('ya_hp', 'HP Rating'),
])
/* A table a rule can say nothing about: a picture and a formula. Both
   are refused by `buildConcepts` — a picture is not a value anybody
   states in a sentence, and a calculated total is an outcome rather
   than a choice. */
const PLATES = table('plates', 'Reference Plates', 'custom', [
  field('pl_img', 'Photo', 'image'),
  field('pl_calc', 'Worked out', 'formula'),
])

const entities: Record<string, EntityDef> = {
  boat_highfield: HIGHFIELD,
  boat_stacer: STACER,
  mot_yamaha: YAMAHA,
  plates: PLATES,
}

const concepts = buildConcepts(entities)
const index = conceptIndex(concepts)

const mod = (id: string, tableIds: string[]): ModuleDef => ({
  id,
  name: id,
  description: '',
  tableIds,
  capabilities: ['browse', 'search', 'open'],
  index: 'rows',
  accent: 'blue',
  order: 0,
  createdAt: STAMP,
  updatedAt: STAMP,
})

const BOATS = mod('m_boats', ['boat_highfield', 'boat_stacer'])
const MOTORS = mod('m_motors', ['mot_yamaha'])

const constraint = (id: string, fieldId: string): ConstraintDef => ({
  id,
  kind: 'implies',
  if: {
    combinator: 'AND',
    clauses: [
      { id: `${id}#if`, left: { fieldId }, op: 'gt', right: { kind: 'literal', value: 0 } },
    ],
  },
  because: 'a test wrote it',
  enabled: true,
  createdAt: STAMP,
  updatedAt: STAMP,
})

const flowRule = (id: string, rootEntityId: string, searches?: string): RuleDef => {
  const nodes: RuleNode[] = [
    { id: `${id}-s`, kind: 'start', position: { x: 0, y: 0 }, config: {} },
  ]
  if (searches) {
    nodes.push({
      id: `${id}-m`,
      kind: 'match',
      position: { x: 100, y: 0 },
      config: {
        targetEntityId: searches,
        group: { combinator: 'AND', clauses: [] },
        emptyBehavior: 'skip',
      },
    })
  }
  return {
    id,
    name: id,
    rootEntityId,
    enabled: true,
    nodes,
    edges: [],
    createdAt: STAMP,
    updatedAt: STAMP,
  }
}

/* ---------------------------------------------------------- */

describe('the module vocabulary', () => {
  it('reads the kinds off the tables, deduped, in the module’s own order', () => {
    expect(moduleKinds([HIGHFIELD, STACER])).toEqual(['boat'])
    expect(moduleKinds([YAMAHA, HIGHFIELD])).toEqual(['motor', 'boat'])
    expect(moduleKinds([])).toEqual([])
  })

  it('reads a kind off a concept key, and refuses one it does not know', () => {
    expect(kindOfConceptKey('boat::max hp')).toBe('boat')
    expect(kindOfConceptKey('trailer::atm (kg)')).toBe('trailer')
    expect(kindOfConceptKey('hovercraft::lift')).toBeUndefined()
    expect(kindOfConceptKey('')).toBeUndefined()
  })

  it('offers the columns on THIS module’s tables and no others', () => {
    const boatKeys = moduleConceptKeys(BOATS, concepts)
    expect(boatKeys.has('boat::max hp')).toBe(true)
    expect(boatKeys.has('motor::hp rating')).toBe(false)

    const motorKeys = moduleConceptKeys(MOTORS, concepts)
    expect(motorKeys.has('motor::hp rating')).toBe(true)
    expect(motorKeys.has('boat::max hp')).toBe(false)
  })

  it('offers a shared column to a module holding only ONE of its tables', () => {
    /* `boat::max hp` lives on both brands. A module about Stacer alone
       must still be able to write about it — the concept is the column,
       not the table. */
    const keys = moduleConceptKeys(mod('m_stacer', ['boat_stacer']), concepts)
    expect(keys.has('boat::max hp')).toBe(true)
  })
})

describe('the limits that reach a module', () => {
  const onHighfield = constraint('c_hf', 'hf_maxhp')
  const onYamaha = constraint('c_ya', 'ya_hp')
  const onNothing = constraint('c_gone', 'a column struck from the sheet')
  const all = [onHighfield, onYamaha, onNothing]

  it('claims a rule naming a column on one of its tables', () => {
    expect(constraintsFor(all, BOATS, index).map((c) => c.id)).toEqual(['c_hf'])
    expect(constraintsFor(all, MOTORS, index).map((c) => c.id)).toEqual(['c_ya'])
  })

  it('claims a rule written against a SIBLING brand’s column', () => {
    /* Authored on Highfield, and Stacer carries the same column — so a
       module about Stacer alone is governed by it, because the engine
       evaluates it against Stacer's rows too. Anything narrower would
       show a person a shorter list than the one biting their data. */
    const stacer = mod('m_stacer', ['boat_stacer'])
    expect(constraintsFor(all, stacer, index).map((c) => c.id)).toEqual(['c_hf'])
  })

  it('claims nothing for a rule whose column is gone', () => {
    const nowhere = constraintsFor([onNothing], BOATS, index)
    expect(nowhere).toEqual([])
  })

  it('changes its answer when the module is pointed elsewhere', () => {
    const before = constraintsFor(all, BOATS, index).map((c) => c.id)
    const after = constraintsFor(
      all,
      { ...BOATS, tableIds: ['mot_yamaha'] },
      index,
    ).map((c) => c.id)
    expect(before).toEqual(['c_hf'])
    expect(after).toEqual(['c_ya'])
  })
})

describe('the derivations that reach a module', () => {
  const walks = flowRule('r_walks', 'boat_highfield')
  const searches = flowRule('r_searches', 'boat_highfield', 'mot_yamaha')
  const elsewhere = flowRule('r_elsewhere', 'plates')
  const rules = [walks, searches, elsewhere]

  it('names the table it walks', () => {
    const found = flowRulesFor(rules, BOATS)
    expect(found.map((f) => [f.rule.id, f.role])).toEqual([
      ['r_walks', 'walks'],
      ['r_searches', 'walks'],
    ])
  })

  it('names a rule that SEARCHES this module’s table, rooted somewhere else', () => {
    /* The seeded fitment rules are rooted on a boat table and search the
       motor and trailer tables. A module about motors that was told
       nothing works out anything about it would be wrong twice over —
       two rules are reading its rows on every boat page in the app. */
    const found = flowRulesFor(rules, MOTORS)
    expect(found.map((f) => [f.rule.id, f.role, f.tableId])).toEqual([
      ['r_searches', 'searches', 'mot_yamaha'],
    ])
  })

  it('prefers WALKS when a rule does both', () => {
    const both = flowRule('r_both', 'boat_highfield', 'boat_stacer')
    expect(flowRulesFor([both], BOATS)).toEqual([
      { rule: both, role: 'walks', tableId: 'boat_highfield' },
    ])
  })
})

describe('the workbook rules that govern a subject', () => {
  it('claims the seeds naming a column of a kind this module carries', () => {
    const boats = workbookRulesFor(['boat']).map((g) => g.seed.ref)
    /* A1 — the boat's Max HP is the ceiling on the motor. Stated by the
       workbook's own Min/Max header pair; see FITMENT_RULES.md F1. */
    expect(boats).toContain('A1')
    /* F8 — the trailer's series banner names the boat's brand. */
    expect(boats).toContain('F8')
    /* S2 reads one trailer column and names no boat column. */
    expect(boats).not.toContain('S2')
  })

  it('claims a cross-kind rule from BOTH sides, and says which half is whose', () => {
    const fromBoats = workbookRulesFor(['boat']).find((g) => g.seed.ref === 'A1')
    const fromMotors = workbookRulesFor(['motor']).find((g) => g.seed.ref === 'A1')
    expect(fromBoats?.onKinds).toEqual(['boat'])
    expect(fromBoats?.alsoKinds).toEqual(['motor'])
    expect(fromMotors?.onKinds).toEqual(['motor'])
    expect(fromMotors?.alsoKinds).toEqual(['boat'])
  })

  it('keeps the order the adjudication reads in', () => {
    const claimed = workbookRulesFor(['boat', 'motor', 'trailer', 'accessory', 'custom'])
    expect(claimed.map((g) => g.seed.id)).toEqual(WORKBOOK_RULES.map((s) => s.id))
  })

  it('claims nothing for a kind no seed names', () => {
    expect(workbookRulesFor(['package'])).toEqual([])
    expect(workbookRulesFor([])).toEqual([])
  })
})

/* ---------------------------------------------------------- */
/* The tenth verb                                             */
/* ---------------------------------------------------------- */

describe('the tenth verb, now that the contract carries it', () => {
  /* IT SPENT A RELEASE OUTSIDE `ModuleCapability`, in a browser-local
     registry, because the model file was another hand's that session.
     `ruleCapability.ts` wrote down the exact two lines the contract
     needed and named the cost: the switch did not travel in an export.
     The contract carries it now and the registry is deleted, so these
     assert the verb the way the other nine are asserted — off the
     module. */

  it('carries the entry the registry wrote for it, word for word', () => {
    expect(MODULE_CAPABILITIES.configure.label).toBe('Set rules')
    expect(MODULE_CAPABILITIES.configure.says).toBe('set what must always be true here')
  })

  it('SITS BETWEEN RELATE AND QUOTE, which is where the words read right', () => {
    /* The record's order IS the display order — a card prints the
       verbs in it — so a person reads the three reads, then the three
       writes, then the three a manager does: say what goes with what,
       set what must always be true, raise a price. */
    const i = DESIGNER_CAPABILITIES.indexOf('configure')
    expect(DESIGNER_CAPABILITIES[i - 1]).toBe('relate')
    expect(DESIGNER_CAPABILITIES[i + 1]).toBe('quote')
    /* every verb appears, and exactly once */
    expect(new Set(DESIGNER_CAPABILITIES).size).toBe(DESIGNER_CAPABILITIES.length)
    expect(DESIGNER_CAPABILITIES).toContain('browse')
    expect(DESIGNER_CAPABILITIES).toContain('import')
  })

  it('IS NOT IN THE DEFAULTS — nothing that writes is on by default', () => {
    /* And writing a business rule is the most consequential write in
       the product. */
    expect(DEFAULT_CAPABILITIES).not.toContain('configure')
    const rules = capabilityStates(BOATS, [HIGHFIELD, STACER]).find((s) => s.key === 'configure')
    expect(rules?.on).toBe(false)
    expect(rules?.refused).toBeUndefined()
  })

  it('is read off the module, per module, like the other nine', () => {
    const configuring = { ...BOATS, capabilities: [...BOATS.capabilities, 'configure' as const] }
    expect(
      capabilityStates(configuring, [HIGHFIELD, STACER]).find((s) => s.key === 'configure')?.on,
    ).toBe(true)
    expect(
      capabilityStates(MOTORS, [HIGHFIELD]).find((s) => s.key === 'configure')?.on,
    ).toBe(false)
  })

  it('says the same list on the dashboard card as on the index', () => {
    /* One reader for both, so a card promising less than the place it
       opens onto is not possible. */
    expect(capabilityWords(BOATS)).toEqual(['Browse', 'Search', 'Open one'])
    const configuring = { ...BOATS, capabilities: [...BOATS.capabilities, 'configure' as const] }
    expect(capabilityWords(configuring)).toEqual(['Browse', 'Search', 'Open one', 'Set rules'])
  })

  it('refuses, with the reason and the fix, on tables no sentence can name', () => {
    const plates = mod('m_plates', ['plates'])
    const state = capabilityStates(plates, [PLATES]).find((s) => s.key === 'configure')
    expect(state?.refused).toContain('Reference Plates')
    expect(state?.refused).toContain('switches on')
  })

  it('refuses when the tables are gone, like every other verb', () => {
    const gone = mod('m_gone', ['struck'])
    for (const state of capabilityStates(gone, [])) {
      expect(state.refused).toBeTruthy()
    }
  })

  it('is never described as not-yet-built — it is performed', () => {
    const configuring = { ...BOATS, capabilities: [...BOATS.capabilities, 'configure' as const] }
    const state = capabilityStates(configuring, [HIGHFIELD, STACER]).find(
      (s) => s.key === 'configure',
    )
    expect(state?.on).toBe(true)
    expect(state?.note).toBeUndefined()
    expect(state?.refused).toBeUndefined()
  })
})

/* ---------------------------------------------------------- */
/* The refusal list — MODULE_SYSTEM §5                         */
/* ---------------------------------------------------------- */

describe('a capability that cannot be turned on says what is missing', () => {
  /* §5's rule, and three of the seven verbs that can fail it were
     silent: an admin could switch them on, watch the switch move, and
     change nothing — the same safety lie `writeCaps.ts` was written to
     end, pointed at the designer instead of the catalogue.

     EVERY READING IS BORROWED, NOT INVENTED. `renameFieldOf` is the
     catalogue's own test for a column a rename may type into,
     `relatedTables` is what the module's links panel counts, and the
     register count is the one `travelCaps` refuses a file on. Asking
     one question in two places with two answers is how a switch and a
     surface come to disagree. */

  const refusal = (
    m: ModuleDef,
    tables: EntityDef[],
    key: string,
    sheet?: Record<string, EntityDef>,
  ): string | undefined => capabilityStates(m, tables, sheet).find((s) => s.key === key)?.refused

  it('REFUSES EDIT where no table names its rows in a typeable column', () => {
    /* Reference Plates is a picture and a formula. A rename would be
       writing a free string into a select or a calculated total. */
    const plates = mod('m_plates', ['plates'])
    const said = refusal(plates, [PLATES], 'edit')
    expect(said).toContain('names its rows in a column that can be typed into')
    expect(said).toContain('Reference Plates')
  })

  it('allows edit where a table does name its rows', () => {
    expect(refusal(BOATS, [HIGHFIELD, STACER], 'edit')).toBeUndefined()
  })

  it('REFUSES RELATE where nothing on the sheet is related to these tables', () => {
    /* `relate` is "pin and unpin rows inside related blocks". With no
       relationship there is no block to pin in, and the fix is on the
       data model rather than on this panel. */
    const said = refusal(BOATS, [HIGHFIELD, STACER], 'relate', entities)
    expect(said).toContain('is related to')
    expect(said).toContain('data model')
  })

  it('ASKS NOTHING ABOUT RELATIONSHIPS WITHOUT THE SHEET, rather than guessing', () => {
    /* The question is about tables this module does NOT hold, so a
       caller who cannot supply the sheet gets every other refusal and
       no claim about this one. The first draft answered it from the
       module's own tables, which made the count 0 for every module in
       the app — right on Labour Rates by accident, wrong on Boats,
       where seven brands are the source of every fitment join. */
    expect(refusal(BOATS, [HIGHFIELD, STACER], 'relate')).toBeUndefined()
  })

  it('REFUSES A FILE WHERE THE PLACE DRAWS MORE THAN ONE REGISTER', () => {
    /* `travelCaps`'s own refusal, said at the switch as well as at the
       bar: switching it on would promise a control that refuses the
       moment it is pressed. */
    for (const key of ['export', 'import']) {
      const said = refusal(BOATS, [HIGHFIELD, STACER], key)
      expect(said, key).toContain('2 registers')
      expect(said, key).toContain('a file is one of them')
    }
  })

  it('allows a file where the place draws one', () => {
    for (const key of ['export', 'import']) {
      expect(refusal(MOTORS, [YAMAHA], key), key).toBeUndefined()
    }
  })

  it('STILL REFUSES EVERY VERB WHEN THE TABLES ARE GONE, and says that instead', () => {
    /* The whole-module refusal outranks the per-verb ones: a person
       whose tables left the sheet does not need to be told which
       column a rename would type into. */
    const gone = mod('m_gone', ['struck'])
    for (const state of capabilityStates(gone, [])) {
      expect(state.refused, state.key).toContain('no longer on the sheet')
    }
  })
})
