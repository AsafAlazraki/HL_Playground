/* ============================================================
   THE ENGINE SPEAKS THE DEALER'S NOUN, NOT THE SCHEMA'S.

   DESIGN_PRINCIPLES §"No jargon in chrome" — not "entity", not
   "UID", not "cardinality" — and DESIGN_CONTRACT:334 says the same.
   `src/features/rules` was swept for the word once already
   (CLUELESS_USER_TESTS F20), and the sweep stopped at the feature
   boundary: the sentences a person actually reads in the toolbar's
   notes list and in the results rail's warnings are written HERE, by
   `validateRule` and by `runRule`, and every one of them still said
   "entity". O5 counted five of them. There are twenty.

   A word swap is the easiest fix in the application to make and the
   easiest to undo — the next person writing a new blocker reaches for
   the vocabulary of the type they are holding, which is `EntityDef`.
   So the fix is asserted rather than trusted: this file drives the
   engine to each of the eleven refusals that named the wrong noun and
   reads what comes back.

   THE PROBE IS THE FINDING'S OWN. "Open a rule with an unconfigured
   Match and read the notes" — that is the first test below, and the
   sentence it reads is the one O5 quotes by line number.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, RuleDef, RuleNode } from '@/types/model'
import { runRule, validateRule } from './index'

/* ---------------------------------------------------------- */
/* the smallest project a rule can be written about            */
/* ---------------------------------------------------------- */

const boats: EntityDef = {
  id: 'e-boat',
  name: 'Highfield Inflatables',
  accent: 'blue',
  createdAt: '2020-01-01T00:00:00.000Z',
  fields: [
    { id: 'f-name', name: 'Model', type: 'text' },
    { id: 'f-hp', name: 'Max HP', type: 'number' },
  ],
} as EntityDef

const rule = (nodes: RuleNode[], rootEntityId = 'e-boat'): RuleDef => ({
  id: 'r1',
  name: 'A rule',
  rootEntityId,
  enabled: true,
  nodes: [{ id: 'n-start', kind: 'start', position: { x: 0, y: 0 }, config: {} }, ...nodes],
  edges: nodes.map((n) => ({ id: `e-${n.id}`, source: 'n-start', target: n.id })),
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

const ctx = { entities: { 'e-boat': boats }, rowsByEntity: { 'e-boat': [] } }

const notes = (r: RuleDef): string[] => validateRule(r, ctx).map((i) => i.message)

const node = <K extends RuleNode['kind']>(id: string, kind: K, config: unknown): RuleNode =>
  ({ id, kind, position: { x: 0, y: 0 }, config }) as RuleNode

/* every sentence this file provokes, for the blanket assertion */
const said: string[] = []
const read = (r: RuleDef): string[] => {
  const out = notes(r)
  said.push(...out)
  return out
}

/* ---------------------------------------------------------- */

describe('the notes a person reads say "table"', () => {
  /* O5's own verification step, in one assertion */
  it('an unconfigured Match asks for a table, not an entity', () => {
    const out = read(rule([node('n-m', 'match', { group: { combinator: 'AND', clauses: [] } })]))
    expect(out).toContain('Match has no table to search — choose what it should match against.')
  })

  it('a Match pointed at a table that has gone says table', () => {
    const out = read(
      rule([
        node('n-m', 'match', {
          targetEntityId: 'e-gone',
          group: { combinator: 'AND', clauses: [] },
        }),
      ]),
    )
    expect(out).toContain('Match searches a table that no longer exists.')
  })

  it('a rule whose root has been deleted says table', () => {
    const out = read(rule([], 'e-gone'))
    expect(out).toContain('The table this rule runs against no longer exists — choose another.')
  })

  it('a For each with nothing chosen, and one pointed at a table that has gone', () => {
    expect(read(rule([node('n-l', 'loop', { source: { kind: 'entity', entityId: '' } })]))).toContain(
      'For each has no table to loop over — choose one.',
    )
    expect(
      read(rule([node('n-l', 'loop', { source: { kind: 'entity', entityId: 'e-gone' } })])),
    ).toContain('For each loops over a table that no longer exists.')
  })

  it('a Create action with no table, and one pointed at a table that has gone', () => {
    expect(
      read(rule([node('n-a', 'action', { action: { op: 'create', entityId: '', values: {} } })])),
    ).toContain('Action (create) has no table to create rows in — choose one.')
    expect(
      read(
        rule([node('n-a', 'action', { action: { op: 'create', entityId: 'e-gone', values: {} } })]),
      ),
    ).toContain('Action (create) creates rows in a table that no longer exists.')
  })

  /* "join entity" is the same jargon wearing a second hat. The
     inspector's own control is labelled "Link table"
     (RuleInspector.tsx:823) and describe.ts:555 says "Pick or create a
     link table"; the refusal now agrees with both. */
  it('a Link action names a link table, never a join entity', () => {
    expect(
      read(
        rule([
          node('n-a', 'action', {
            action: { op: 'link', joinEntityId: '', sourceFieldId: '', matchFieldId: '' },
          }),
        ]),
      ),
    ).toContain('Action (link) has no link table — choose or create one.')
    expect(
      read(
        rule([
          node('n-a', 'action', {
            action: { op: 'link', joinEntityId: 'e-gone', sourceFieldId: '', matchFieldId: '' },
          }),
        ]),
      ),
    ).toContain('Action (link) writes into a link table that no longer exists.')
  })

  it('a condition that follows a dead link says table', () => {
    const out = read(
      rule([
        node('n-f', 'filter', {
          group: {
            combinator: 'AND',
            clauses: [{ left: { fieldId: 'f-name', viaFieldId: 'f-hp' }, op: 'eq' }],
          },
        }),
      ]),
    )
    expect(out).toContain('Filter: "Max HP" no longer links to a table that exists.')
  })
})

describe('the refusal a RUN prints says "table" too', () => {
  /* `runRule` calls `validateRule` first and a blocker stops it before
     a row is read, so what a person sees after pressing RUN is the
     blocker's own sentence. Asserted here rather than assumed, because
     it reaches the reader through a different surface — the results
     rail, not the toolbar's notes.

     WHAT IS NOT ASSERTED, AND WHY. `walk.ts` and `lib/rules/effects.ts`
     carry their own copies of three of these sentences (walk.ts:220,
     :283, :409; effects.ts:75, :158, :175) and they were reworded in
     the same pass. They are belt-and-braces — every one of them fires
     on a condition `validateRule` has already raised as a blocker, so
     `runRule` never gets far enough to print them, and no test can
     reach them without reaching past the public entry points. They are
     listed here so the next person knows they exist and that a fourth
     copy of a sentence is a thing this module already has. */
  it('the run refuses in the same words the notes use', () => {
    const gone = runRule(rule([], 'e-gone'), ctx)
    const dead = runRule(
      rule([
        node('n-m', 'match', {
          targetEntityId: 'e-gone',
          group: { combinator: 'AND', clauses: [] },
        }),
      ]),
      ctx,
    )
    said.push(gone.error ?? '', dead.error ?? '')
    expect(gone.error).toBe('The table this rule runs against no longer exists — choose another.')
    expect(dead.error).toBe('Match searches a table that no longer exists.')
  })
})

/* ---------------------------------------------------------- */

describe('and none of them says the schema word', () => {
  /* THE GUARD, over every sentence the tests above provoked. A new
     refusal written with `EntityDef` in hand fails here rather than
     reaching a dealer. */
  it('no sentence the engine produced contains "entity"', () => {
    expect(said.length).toBeGreaterThan(12)
    expect(said.filter((s) => /\bentit(y|ies)\b/i.test(s))).toEqual([])
  })
})
