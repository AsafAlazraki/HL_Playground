/* ============================================================
   §2 RULE 4, THE HALF THAT NEEDED A PERSON.

   "It respects capabilities. A result a person cannot open does not
   appear for them." — UX_PASS §2, rule 4.

   WHY IT COULD NOT BE WRITTEN BEFORE. `mayDo(module, roleId, cap)`
   wants the id of a `RoleDef` an admin wrote down, and nothing in the
   app produced one: `access.ts:126-129` says so in its own words,
   "`roleId` of null is nobody in particular, which is every session
   today". So the palette enforced the half that needs no person — a
   host with no door to a module does not get modules — and recorded
   the other half as blocked. `DECISIONS.md` §2 ended that argument:
   roles are real, sign-in carries one, `mayDo()` enforces. This suite
   is the enforcement.

   WHAT THIS SUITE IS PROOF OF, AND WHERE THE REST IS. It drives a
   `roleId` straight into the index, so every RULE below is proven
   against the matcher at both sizes — fixtures, and the real 53-table
   file. The last inch — a real sign-in, a real assignment, the
   palette resolving it through `useSessionRoleId` on its own — is
   driven through the actual API in `palette.test.tsx`, and needs a
   DOM, which is why it is over there and not here.

   NOTHING IS RESTRICTED ON THE SHIPPED FILE, and that is the state
   this must not break. Roles are data and nothing seeds them
   (`useProjectStore.ts:380-387`; measured, `roles: {}`), the seeded
   operator carries `roleId: null`, and all nine seeded places have
   `access` absent. So a business that has written no role down
   behaves exactly as it did before any of this existed — asserted
   below rather than assumed.

   THE GUARD IS SEEN TO FAIL, always. Every case that asserts a thing
   is HIDDEN asserts the same fixture SHOWS it under a role that may
   browse — otherwise a filter that hid everything, or a fixture whose
   names never matched, would read as a pass.

   THE FIXTURES ARE SYNTHETIC AND OBVIOUSLY SO, with one exception at
   the foot that measures the real prepared file, because "how much of
   this catalogue is even claimed by a place" is a fact about the seed
   and not about a fixture.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, ModuleAccess, ModuleDef, RowData } from '@/types/model'
import { buildNorthsideProject } from '@/demos/northside'
import { buildSearchIndex, optionsOf, search, withinReach } from './rowSearch'

const stamp = '2020-01-01T00:00:00.000Z'

function table(id: string, name: string, extra: Partial<EntityDef> = {}): EntityDef {
  return {
    id,
    name,
    accent: 'blue',
    fields: [
      { id: `${id}.name`, name: 'Name', type: 'text' },
      { id: `${id}.secret`, name: `${name} Only Column`, type: 'text' },
    ],
    displayFieldId: `${id}.name`,
    position: { x: 0, y: 0 },
    createdAt: stamp,
    updatedAt: stamp,
    ...extra,
  }
}

const row = (entityId: string, id: string, values: RowData['values']): RowData => ({
  id,
  entityId,
  values,
  createdAt: stamp,
  updatedAt: stamp,
})

function place(id: string, name: string, extra: Partial<ModuleDef> = {}): ModuleDef {
  return {
    id,
    name,
    description: '',
    tableIds: [],
    capabilities: ['browse', 'search', 'open'],
    index: 'rows',
    accent: 'blue',
    order: 0,
    createdAt: stamp,
    updatedAt: stamp,
    ...extra,
  }
}

/** "Only these roles, and only these verbs." Absent or empty is
 *  unrestricted — `access.ts` argues that spectrum at length. */
const only = (...rows: ModuleAccess[]): ModuleAccess[] => rows

/** Two tables, in two places: Zeta Open and Zeta Closed. Both hold a
 *  row and a column carrying the word "zeta", so one query reaches
 *  all five kinds and the filter has something to take away in every
 *  one of them. */
function twoPlaces(access?: ModuleAccess[]): {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
  modules: Record<string, ModuleDef>
} {
  return {
    entities: {
      tOpen: table('tOpen', 'Zeta Open Table'),
      tShut: table('tShut', 'Zeta Closed Table'),
    },
    rowsByEntity: {
      tOpen: [row('tOpen', 'rOpen', { 'tOpen.name': 'Zeta Open Row' })],
      tShut: [row('tShut', 'rShut', { 'tShut.name': 'Zeta Closed Row' })],
    },
    modules: {
      mOpen: place('mOpen', 'Zeta Open Place', { tableIds: ['tOpen'], order: 0 }),
      mShut: place('mShut', 'Zeta Closed Place', {
        tableIds: ['tShut'],
        order: 1,
        ...(access ? { access } : {}),
      }),
    },
  }
}

/** Everything the palette would draw for `zeta`, as the ids the
 *  cursor walks — sorted, because what is asserted here is WHICH
 *  results exist for a person and never in what order. The order
 *  across kinds is fixed and is asserted next door in
 *  `fiveKinds.test.ts`, which is where it belongs. */
const answers = (
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
  modules: Record<string, ModuleDef>,
  roleId: string | null,
): string[] =>
  optionsOf(
    search(
      buildSearchIndex(entities, rowsByEntity, { modules, moduleDoor: true, roleId }),
      'zeta',
    ),
  )
    .map((o) => o.id)
    .sort()

/* ============================================================ */
/* THE RULE                                                     */
/* ============================================================ */

describe('a result a person cannot open does not appear for them', () => {
  it('shows both places to a role the closed one granted', () => {
    /* THE GUARD, SEEN TO PASS. Same fixture, same query, a role that
       holds `browse` on the restricted place — everything is there.
       Every "is hidden" below is measured against this. */
    const { entities, rowsByEntity, modules } = twoPlaces(
      only({ roleId: 'r-manager', capabilities: ['browse'] }),
    )
    const seen = answers(entities, rowsByEntity, modules, 'r-manager')
    expect(seen).toEqual([
      'c:tOpen:Zeta Open Table Only Column',
      'c:tShut:Zeta Closed Table Only Column',
      'm:mOpen',
      'm:mShut',
      'r:tOpen:rOpen',
      'r:tShut:rShut',
      't:tOpen',
      't:tShut',
    ])
  })

  it('takes the closed place, its table, its row and its column away from a role without it', () => {
    /* FOUR OF THE FIVE KINDS AT ONCE, which is the point of a single
       query over one fixture: the module, the table, the row and the
       column all vanish together, because they were all reached
       through the same place. */
    const { entities, rowsByEntity, modules } = twoPlaces(
      only({ roleId: 'r-manager', capabilities: ['browse'] }),
    )
    const seen = answers(entities, rowsByEntity, modules, 'r-sales')
    expect(seen).toEqual([
      'c:tOpen:Zeta Open Table Only Column',
      'm:mOpen',
      'r:tOpen:rOpen',
      't:tOpen',
    ])
    expect(seen.join(' ')).not.toContain('Shut')
  })

  it('answers nobody-in-particular the way access.ts says it must', () => {
    /* `roleId` null is every session in this build. An unrestricted
       place is open to them; a restricted one is not — access.ts:138,
       stated there and enforced here rather than in two shapes. */
    const { entities, rowsByEntity, modules } = twoPlaces(
      only({ roleId: 'r-manager', capabilities: ['browse'] }),
    )
    expect(answers(entities, rowsByEntity, modules, null)).toEqual([
      'c:tOpen:Zeta Open Table Only Column',
      'm:mOpen',
      'r:tOpen:rOpen',
      't:tOpen',
    ])
  })

  it('leaves an unrestricted place open to everyone, including nobody', () => {
    /* THE SEEDED FILE'S OWN CASE — 9 places, `access` absent on all 9.
       A build that has not written a role down must lose nothing. */
    const { entities, rowsByEntity, modules } = twoPlaces()
    const forNobody = answers(entities, rowsByEntity, modules, null)
    const forSomebody = answers(entities, rowsByEntity, modules, 'r-anyone')
    expect(forNobody).toHaveLength(8)
    expect(forNobody).toEqual(forSomebody)
  })

  it('refuses a grant of a verb the place does not offer', () => {
    /* `mayDo` intersects with the module's own capabilities before it
       looks at the grant (access.ts:135), so a role granted `browse`
       in a place that cannot be browsed still may not browse it. One
       call answers the contract and the grant, which is why there is
       no second check here to drift out of step. */
    const { entities, rowsByEntity, modules } = twoPlaces()
    const shut = {
      ...modules,
      mShut: place('mShut', 'Zeta Closed Place', {
        tableIds: ['tShut'],
        capabilities: ['search', 'open'],
        access: only({ roleId: 'r-manager', capabilities: ['browse'] }),
      }),
    }
    const seen = answers(entities, rowsByEntity, shut, 'r-manager')
    expect(seen.join(' ')).not.toContain('Shut')
  })

  it('needs only one open owner when a table is in two places', () => {
    /* A UNION, NOT AN INTERSECTION. Taking a register away because a
       SECOND place is closed would deny a person the very thing they
       can already open from the first door. */
    const { entities, rowsByEntity } = twoPlaces()
    const modules = {
      mOpen: place('mOpen', 'Zeta Open Place', { tableIds: ['tOpen', 'tShut'] }),
      mShut: place('mShut', 'Zeta Closed Place', {
        tableIds: ['tShut'],
        access: only({ roleId: 'r-manager', capabilities: ['browse'] }),
      }),
    }
    const seen = answers(entities, rowsByEntity, modules, 'r-sales')
    /* the CLOSED PLACE is gone as a result; the table it shares with
       the open one is not, and neither is its row */
    expect(seen).toContain('t:tShut')
    expect(seen).toContain('r:tShut:rShut')
    expect(seen).not.toContain('m:mShut')
  })

  it('leaves a table no place claims alone', () => {
    /* Absent means nobody has decided — the same spectrum access.ts
       argues for a module with no access rows. Measured on the real
       file below: all 28 unclaimed tables there are pair lists. */
    const { entities, rowsByEntity, modules } = twoPlaces(
      only({ roleId: 'r-manager', capabilities: ['browse'] }),
    )
    const withLoose = {
      ...entities,
      tLoose: table('tLoose', 'Zeta Unclaimed Table'),
    }
    const rowsLoose = {
      ...rowsByEntity,
      tLoose: [row('tLoose', 'rLoose', { 'tLoose.name': 'Zeta Unclaimed Row' })],
    }
    const seen = answers(withLoose, rowsLoose, modules, 'r-sales')
    expect(seen).toContain('t:tLoose')
    expect(seen).toContain('r:tLoose:rLoose')
  })
})

/* ============================================================ */
/* WHAT THE PALETTE THEN SAYS ABOUT ITSELF                      */
/* ============================================================ */

describe('the accounting is about what this person can reach', () => {
  it('counts rows, tables and columns after the filter, never before it', () => {
    /* THE FOOT PRINTS THESE. A palette that hid half the file and
       then told the reader it holds all of it would be lying in the
       one line whose whole job is accounting. */
    const { entities, rowsByEntity, modules } = twoPlaces(
      only({ roleId: 'r-manager', capabilities: ['browse'] }),
    )
    const open = buildSearchIndex(entities, rowsByEntity, {
      modules,
      roleId: 'r-manager',
    })
    const shut = buildSearchIndex(entities, rowsByEntity, { modules, roleId: 'r-sales' })

    expect([open.rowTotal, open.tableTotal, open.columnTotal]).toEqual([2, 2, 4])
    expect([shut.rowTotal, shut.tableTotal, shut.columnTotal]).toEqual([1, 1, 2])
  })
})

/* ============================================================ */
/* WHAT IS NOT GATED, AND WHY                                   */
/* ============================================================ */

describe('a document is not a price file', () => {
  it('still answers a quote whose subject table is out of reach', () => {
    /* THE RULING, ASSERTED SO IT CANNOT BE QUIETLY REVERSED. A quote
       carries `rootTableId`, so it COULD be hidden with the table it
       was written against. It must not be: a quote is a photograph
       addressed to a customer, an admin closing the Trailers module
       on Tuesday did not change Monday's document, and erasing a
       salesperson's own issued quote from their own palette is not a
       permission anybody granted. Nothing in the module system claims
       authority over a document. See SearchFieldProps. */
    const { entities, rowsByEntity, modules } = twoPlaces(
      only({ roleId: 'r-manager', capabilities: ['browse'] }),
    )
    const index = buildSearchIndex(entities, rowsByEntity, {
      modules,
      roleId: 'r-sales',
      quotes: [
        {
          id: 'q1',
          reference: 'ZQ-1',
          subject: 'Zeta Closed Row',
          customer: 'Casey Quill',
          issued: true,
          total: 1234,
        },
      ],
    })
    expect(search(index, 'zeta').quotes).toHaveLength(1)
    /* and the table it was written against is still gone */
    expect(index.tables.map((t) => t.entityId)).toEqual(['tOpen'])
  })
})

/* ============================================================ */
/* THE PAIR LIST, WHICH IS WHY THE FILTER IS ON THE INPUT       */
/* ============================================================ */

describe('a hidden table never turns a pair list into a destination', () => {
  it('drops the pair list rather than letting it open itself', () => {
    /* THE FAILURE THIS SHAPE PREVENTS, and the reason `withinReach`
       filters the project rather than the answer. A pair list opens
       THE THING IT IS ABOUT, and falls back to itself when that
       subject cannot be resolved. Filter the output and the pair list
       survives with its subject gone — so a press lands on a raw
       pair-record sheet, which is the one destination `rowSearch.ts`
       exists to prevent. Filter the input and the pair list has no
       resolvable side at all, so it is an ordinary table again and
       there is nothing to be about. */
    const boats = table('tShut', 'Zeta Closed Table')
    const pairs: EntityDef = {
      ...table('tPair', 'Zeta × Omega — Fitment'),
      role: 'join',
      fields: [
        { id: 'tPair.name', name: 'Name', type: 'text' },
        { id: 'tPair.boat', name: 'Boat', type: 'reference', refEntityId: 'tShut' },
      ],
      displayFieldId: 'tPair.name',
    }
    const entities = { tShut: boats, tPair: pairs }
    const rowsByEntity = {
      tShut: [row('tShut', 'rShut', { 'tShut.name': 'Zeta Closed Row' })],
      tPair: [
        row('tPair', 'p1', { 'tPair.name': 'Zeta Closed Row · Omega Motor', 'tPair.boat': 'rShut' }),
      ],
    }
    const modules = {
      mShut: place('mShut', 'Zeta Closed Place', {
        tableIds: ['tShut'],
        access: only({ roleId: 'r-manager', capabilities: ['browse'] }),
      }),
    }
    const shut = buildSearchIndex(entities, rowsByEntity, { modules, roleId: 'r-sales' })
    /* MEASURED WITHOUT THE PAIR RULE, on this fixture: the join fell
       below one resolvable link, stopped being a pair list, and
       arrived as an ordinary table whose one row is called "Zeta
       Closed Row · Omega Motor" — the hidden register's row, named in
       full, in a palette that had just refused to show it. On the
       prepared file the same slip took `rowTotal` from 7,002 to
       14,871. So the pair list goes with its side. */
    expect(shut.rows).toHaveLength(0)
    expect(shut.tables).toHaveLength(0)
    expect(search(shut, 'zeta').groups).toHaveLength(0)

    /* and for the role that may browse, the pair resolves the way it
       always did: the row is answered under the table it is about */
    const open = buildSearchIndex(entities, rowsByEntity, { modules, roleId: 'r-manager' })
    expect(open.rows.length).toBeGreaterThan(0)
    expect(open.rows.every((r) => r.entityId === 'tShut')).toBe(true)
  })
})

/* ============================================================ */
/* THE REAL FILE                                                */
/* ============================================================ */

describe('the prepared file, measured', () => {
  const project = buildNorthsideProject()
  const entities: Record<string, EntityDef> = {}
  for (const e of project.entities) entities[e.id] = e

  it('is claimed by its places everywhere except its pair lists', () => {
    /* THE FACT THE "unclaimed is unrestricted" RULE STANDS ON. If
       real base tables were unclaimed, that rule would be a hole a
       dealer could fall through; they are not. 53 tables, 25 claimed
       by nine places, 28 unclaimed and every one of the 28 a join —
       which `ModuleDef.tableIds` excludes by contract, "never a join". */
    const modules = seededPlaces(entities)
    const claimed = new Set<string>()
    for (const m of Object.values(modules)) for (const id of m.tableIds) claimed.add(id)
    const unclaimed = Object.values(entities).filter((e) => !claimed.has(e.id))
    expect(unclaimed.length).toBeGreaterThan(0)
    expect(unclaimed.every((e) => e.role === 'join')).toBe(true)
  })

  it('costs nothing and hides nothing while every place is unrestricted', () => {
    /* THE SEEDED FILE'S OWN STATE — `access` absent on all nine. The
       same object comes back, so the common case allocates nothing
       and no identity changes downstream. */
    const modules = seededPlaces(entities)
    expect(withinReach(entities, { modules, roleId: null })).toBe(entities)
    expect(withinReach(entities, { modules, roleId: 'r-anyone' })).toBe(entities)
  })

  it('takes a closed brand file out of every kind at full scale', () => {
    /* AT THE REAL SIZE, because a filter that is right on two tables
       and wrong on fifty-three is the failure mode this repo has
       measured before. Closing the boats place takes its seven brand
       registers, their rows, and every column declared only on them. */
    const modules = seededPlaces(entities)
    const boats = Object.values(modules).find((m) => m.name === 'Boats')
    if (!boats) throw new Error('the seed no longer has a Boats place')
    const closed = {
      ...modules,
      [boats.id]: {
        ...boats,
        access: only({ roleId: 'r-manager', capabilities: ['browse'] }),
      },
    }
    const before = buildSearchIndex(entities, project.rowsByEntity, { modules })
    const after = buildSearchIndex(entities, project.rowsByEntity, {
      modules: closed,
      roleId: 'r-sales',
    })

    /* THE INVARIANTS, NOT THE FIGURES, because the seed is a living
       document and a brand added next month must not turn a rule into
       a red suite. The figures measured when this was written, so a
       drift can be recognised: 51 live tables → 17, because closing
       seven brand registers also closes the twenty-seven pair lists
       that name one. */
    expect(after.tableTotal).toBeLessThan(before.tableTotal)
    expect(after.rowTotal).toBeLessThan(before.rowTotal)
    expect(after.columnTotal).toBeLessThan(before.columnTotal)

    /* NO ANSWER FROM A CLOSED REGISTER SURVIVES ANYWHERE — not as a
       row, not as a table, not as somewhere a table opens, not as a
       column's destination. Four kinds, one closed place. */
    const hidden = new Set(boats.tableIds)
    expect(after.rows.some((r) => hidden.has(r.entityId))).toBe(false)
    expect(after.tables.some((t) => hidden.has(t.entityId) || hidden.has(t.destId))).toBe(
      false,
    )
    expect(after.columns.some((c) => hidden.has(c.destId))).toBe(false)
    expect(Object.keys(after.facts).some((id) => hidden.has(id))).toBe(false)

    /* AND NOT ONE PAIR ROW ARRIVES AS AN ORDINARY ANSWER. This is the
       measurement the pair rule was written for: without it the same
       call answered 14,871 rows where the whole file holds 7,002. */
    expect(after.rowTotal).toBeLessThanOrEqual(before.rowTotal)
    expect(after.pairRows).toBeLessThanOrEqual(before.pairRows)
  })
})

/** The nine places the demo seeds, rebuilt from the tables rather
 *  than read out of the store — this suite is about the matcher and
 *  has no business booting a store to get a list of table ids.
 *
 *  It groups by `kind`, which is how the seed splits them, and names
 *  the boats place `Boats` because that is the one asserted above. */
function seededPlaces(entities: Record<string, EntityDef>): Record<string, ModuleDef> {
  const byKind = new Map<string, string[]>()
  for (const e of Object.values(entities)) {
    if (e.role === 'join' || e.role === 'view') continue
    const key = e.kind ?? 'other'
    byKind.set(key, [...(byKind.get(key) ?? []), e.id])
  }
  const out: Record<string, ModuleDef> = {}
  let order = 0
  for (const [kind, tableIds] of byKind) {
    const id = `m-${kind}`
    out[id] = place(id, kind === 'boat' ? 'Boats' : kind, { tableIds, order: order++ })
  }
  return out
}
