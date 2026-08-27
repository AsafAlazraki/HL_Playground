/* ============================================================
   THE ACCESS RULES — and the one that matters most.

   ACCESS CAN NEVER EXCEED THE MODULE. Every test below that names a
   capability the module does not offer is testing that one claim from
   a different direction: refused on write, dropped on read, dropped
   again the moment the module's own capability list shrinks under it.

   And the second claim, which is quieter and just as easy to get
   wrong: ABSENT MEANS UNRESTRICTED — so does empty, and no path
   through this file may leave a module with an empty access list.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { ModuleCapability, ModuleDef, RoleDef } from '@/types/model'
import {
  accessRows,
  grantedTo,
  isUnrestricted,
  mayDo,
  offeredCapabilities,
  orphanRoleIds,
  withGrant,
  withoutRole,
} from './access'

const AT = '2026-08-27T00:00:00.000Z'

function makeModule(
  capabilities: ModuleCapability[],
  access?: ModuleDef['access'],
): ModuleDef {
  return {
    id: 'm1',
    name: 'Motors',
    description: '',
    tableIds: ['t1'],
    capabilities,
    index: 'rows',
    accent: 'carmine',
    order: 0,
    ...(access ? { access } : {}),
    createdAt: AT,
    updatedAt: AT,
  }
}

const role = (id: string, name: string): RoleDef => ({
  id,
  name,
  createdAt: AT,
  updatedAt: AT,
})

const sales = role('r1', 'Salesperson')
const service = role('r2', 'Service manager')

describe('the module is the vocabulary', () => {
  it('offers only what the module carries, in the contract’s order', () => {
    /* deliberately written out of order — the reading is normalised */
    const m = makeModule(['open', 'browse', 'edit'])
    expect(offeredCapabilities(m)).toEqual(['browse', 'open', 'edit'])
  })

  it('REFUSES a grant the module does not offer, changing nothing', () => {
    const m = makeModule(
      ['browse', 'search', 'open'],
      [{ roleId: 'r1', capabilities: ['browse'] }],
    )
    /* a module that cannot quote cannot grant quoting — a contradiction,
       not a smaller permission */
    const next = withGrant(m, 'r1', 'quote', true)
    expect(next).toEqual([{ roleId: 'r1', capabilities: ['browse'] }])
    expect(grantedTo({ ...m, access: next }, 'r1')).toEqual(['browse'])
  })

  it('drops a grant that LAPSED when the module lost the capability', () => {
    /* the grant was legal when it was made */
    const before = makeModule(['browse', 'quote'], [{ roleId: 'r1', capabilities: ['browse', 'quote'] }])
    expect(grantedTo(before, 'r1')).toEqual(['browse', 'quote'])

    /* somebody switched quoting off in the designer an hour later */
    const after = { ...before, capabilities: ['browse'] as ModuleCapability[] }
    expect(grantedTo(after, 'r1')).toEqual(['browse'])

    /* and it is REPORTED rather than silently forgotten */
    const [row] = accessRows(after, [sales])
    expect(row.granted).toEqual(['browse'])
    expect(row.lapsed).toEqual(['quote'])
  })

  it('mayDo can never answer true beyond the module', () => {
    const m = makeModule(['browse'], [{ roleId: 'r1', capabilities: ['browse', 'edit'] }])
    expect(mayDo(m, 'r1', 'browse')).toBe(true)
    expect(mayDo(m, 'r1', 'edit')).toBe(false)
    /* not even when the module is open to everyone */
    const open = makeModule(['browse'])
    expect(mayDo(open, null, 'browse')).toBe(true)
    expect(mayDo(open, null, 'edit')).toBe(false)
  })
})

describe('absent means unrestricted', () => {
  it('a module written before roles existed is open', () => {
    const m = makeModule(['browse', 'search', 'open'])
    expect(isUnrestricted(m)).toBe(true)
    expect(mayDo(m, null, 'browse')).toBe(true)
    expect(mayDo(m, 'r1', 'browse')).toBe(true)
  })

  it('an EMPTY list is unrestricted too — a wall with no door is not a state', () => {
    const m = makeModule(['browse'], [])
    expect(isUnrestricted(m)).toBe(true)
    expect(mayDo(m, null, 'browse')).toBe(true)
  })

  it('the first tick closes it, and only for the role that was ticked', () => {
    const m = makeModule(['browse', 'search', 'open'])
    const closed = { ...m, access: withGrant(m, 'r1', 'browse', true) }
    expect(isUnrestricted(closed)).toBe(false)
    expect(mayDo(closed, 'r1', 'browse')).toBe(true)
    /* everybody else, including nobody-in-particular, now may not */
    expect(mayDo(closed, 'r2', 'browse')).toBe(false)
    expect(mayDo(closed, null, 'browse')).toBe(false)
    /* and nothing was granted that was not ticked */
    expect(grantedTo(closed, 'r1')).toEqual(['browse'])
  })

  it('taking the LAST role out reopens it rather than leaving an empty wall', () => {
    const m = makeModule(['browse'], [{ roleId: 'r1', capabilities: ['browse'] }])
    expect(withoutRole(m, 'r1')).toBeUndefined()
    expect(isUnrestricted({ ...m, access: withoutRole(m, 'r1') })).toBe(true)
  })

  it('unticking the last box reopens it — the grid empties to the state it started in', () => {
    const m = makeModule(['browse'], [{ roleId: 'r1', capabilities: ['browse'] }])
    const next = withGrant(m, 'r1', 'browse', false)
    /* a row holding nothing is not a row: it is indistinguishable from
       an undecided one and is the only way to build a module nobody
       can act in */
    expect(next).toBeUndefined()
    expect(isUnrestricted({ ...m, access: next })).toBe(true)
  })

  it('unticking one role’s last box leaves the others in force', () => {
    const m = makeModule(
      ['browse', 'edit'],
      [
        { roleId: 'r1', capabilities: ['browse'] },
        { roleId: 'r2', capabilities: ['edit'] },
      ],
    )
    expect(withGrant(m, 'r1', 'browse', false)).toEqual([
      { roleId: 'r2', capabilities: ['edit'] },
    ])
  })
})

describe('writing a grant', () => {
  it('adds the role when it is not on the list yet', () => {
    const m = makeModule(['browse', 'edit'])
    expect(withGrant(m, 'r2', 'edit', true)).toEqual([
      { roleId: 'r2', capabilities: ['edit'] },
    ])
  })

  it('stores in the contract’s order whatever order it was ticked in', () => {
    let access = withGrant(makeModule(['browse', 'search', 'open']), 'r1', 'open', true)
    const m2 = makeModule(['browse', 'search', 'open'], access)
    access = withGrant(m2, 'r1', 'browse', true)
    expect(access).toEqual([{ roleId: 'r1', capabilities: ['browse', 'open'] }])
  })

  it('leaves every other role alone', () => {
    const m = makeModule(
      ['browse', 'edit'],
      [
        { roleId: 'r1', capabilities: ['browse'] },
        { roleId: 'r2', capabilities: ['browse', 'edit'] },
      ],
    )
    expect(withGrant(m, 'r1', 'edit', true)).toEqual([
      { roleId: 'r1', capabilities: ['browse', 'edit'] },
      { roleId: 'r2', capabilities: ['browse', 'edit'] },
    ])
  })

  it('takes a whole row out at once, and reopens when it was the last', () => {
    const m = makeModule(
      ['browse', 'edit'],
      [
        { roleId: 'r1', capabilities: ['browse', 'edit'] },
        { roleId: 'r2', capabilities: ['browse'] },
      ],
    )
    expect(withoutRole(m, 'r1')).toEqual([{ roleId: 'r2', capabilities: ['browse'] }])
    const one = makeModule(['browse'], [{ roleId: 'r2', capabilities: ['browse'] }])
    expect(withoutRole(one, 'r2')).toBeUndefined()
  })
})

describe('reading the grid', () => {
  it('draws a row for every role, including one with no access', () => {
    const m = makeModule(['browse'], [{ roleId: 'r1', capabilities: ['browse'] }])
    const rows = accessRows(m, [sales, service])
    expect(rows.map((r) => r.role.name)).toEqual(['Salesperson', 'Service manager'])
    expect(rows[1].granted).toEqual([])
  })

  it('names a role id nothing answers to rather than hiding it', () => {
    const m = makeModule(['browse'], [{ roleId: 'ghost', capabilities: ['browse'] }])
    expect(orphanRoleIds(m, [sales])).toEqual(['ghost'])
    expect(orphanRoleIds(m, [])).toEqual(['ghost'])
  })

  it('a module with no roles at all has no rows and no orphans', () => {
    const m = makeModule(['browse'])
    expect(accessRows(m, [])).toEqual([])
    expect(orphanRoleIds(m, [])).toEqual([])
  })
})
