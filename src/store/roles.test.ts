/* ============================================================
   ROLES IN THE STORE — the slice `ModuleDef.access` points at.

   Two things are worth a guard here and nothing else is:

     1. NOTHING SEEDS A ROLE. A fresh project has none, which is the
        state the contract calls unrestricted, and it stays that way
        until somebody writes one down.

     2. A DELETED ROLE TAKES ITS GRANTS WITH IT, in ONE step. A module
        left naming a role nobody has is a row on a settings page for
        nobody — and a module whose ONLY role was the deleted one would
        otherwise stay restricted with nothing able to act in it, which
        is the wall `access.ts` exists to make unreachable.

   Persistence is mocked: the subject is the slice, not Dexie.
   ============================================================ */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntityDef } from '@/types/model'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async () => {},
    wipe: async () => {},
  },
}))

const { useProjectStore } = await import('./useProjectStore')
const { isUnrestricted, grantedTo } = await import('@/features/modules/access')

const ISO = '2026-01-01T00:00:00.000Z'
const store = () => useProjectStore.getState()
const turn = () => Promise.resolve()

function parts(): EntityDef {
  return {
    id: 'e-parts',
    name: 'Fasteners',
    accent: 'graphite',
    kind: 'accessory',
    fields: [{ id: 'f-name', name: 'Name', type: 'text' }],
    displayFieldId: 'f-name',
    position: { x: 0, y: 0 },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

beforeEach(() => {
  store().replaceProject({
    name: 'Test Sheet',
    entities: [parts()],
    groups: [],
    rules: [],
    rowsByEntity: { 'e-parts': [] },
  })
})

describe('nothing seeds a role', () => {
  it('a fresh project has none, and a module made in it is unrestricted', () => {
    expect(Object.keys(store().roles)).toEqual([])
    const mod = store().createModule(['e-parts'], 'Parts')
    expect(mod).not.toBeNull()
    if (!mod) return
    expect(isUnrestricted(store().modules[mod.id])).toBe(true)
  })

  it('refuses a role with no name — one nobody can point at is not a role', () => {
    expect(store().createRole('   ')).toBeNull()
    expect(Object.keys(store().roles)).toEqual([])
  })

  it('keeps the dealership’s own words, and no description it did not write', () => {
    const role = store().createRole('Yard manager')
    expect(role?.name).toBe('Yard manager')
    expect(role?.description).toBeUndefined()
  })
})

describe('a deleted role takes its grants with it', () => {
  it('clears the role from every module, and reopens one that held only it', async () => {
    const role = store().createRole('Storeman')
    const other = store().createRole('Service manager')
    const a = store().createModule(['e-parts'], 'Parts')
    const b = store().createModule(['e-parts'], 'Oils')
    if (!role || !other || !a || !b) throw new Error('fixture')

    store().updateModule(a.id, {
      access: [
        { roleId: role.id, capabilities: ['browse'] },
        { roleId: other.id, capabilities: ['browse'] },
      ],
    })
    store().updateModule(b.id, { access: [{ roleId: role.id, capabilities: ['browse'] }] })
    await turn()

    store().deleteRole(role.id)

    expect(store().roles[role.id]).toBeUndefined()
    /* the module that had another role keeps it, and stays restricted */
    expect(store().modules[a.id].access).toEqual([
      { roleId: other.id, capabilities: ['browse'] },
    ])
    expect(isUnrestricted(store().modules[a.id])).toBe(false)
    /* the module whose only role is gone goes back to open, rather
       than being left restricted with nobody able to act in it */
    expect(store().modules[b.id].access).toBeUndefined()
    expect(isUnrestricted(store().modules[b.id])).toBe(true)
  })

  it('is ONE step back — the job and its grants return together', async () => {
    const role = store().createRole('Storeman')
    const mod = store().createModule(['e-parts'], 'Parts')
    if (!role || !mod) throw new Error('fixture')
    store().updateModule(mod.id, {
      access: [{ roleId: role.id, capabilities: ['browse'] }],
    })
    await turn()

    store().deleteRole(role.id)
    await turn()

    const label = store().undo()
    expect(label).toContain('Role deleted')
    expect(store().roles[role.id]?.name).toBe('Storeman')
    expect(grantedTo(store().modules[mod.id], role.id)).toEqual(['browse'])
  })

  it('does nothing at all for a role that is not there', () => {
    const before = store().roles
    store().deleteRole('nobody')
    expect(store().roles).toBe(before)
  })
})

describe('a swap replaces the whole project', () => {
  it('carries no roles into an incoming file', () => {
    store().createRole('Storeman')
    expect(Object.keys(store().roles)).toHaveLength(1)
    store().replaceProject({
      name: 'Another Sheet',
      entities: [parts()],
      groups: [],
      rules: [],
    })
    expect(Object.keys(store().roles)).toEqual([])
  })
})

describe('the snapshot carries them', () => {
  it('so a role survives a reload rather than vanishing like an early module', () => {
    store().createRole('Storeman')
    const snap = store().snapshot()
    expect(snap.roles.map((r) => r.name)).toEqual(['Storeman'])
  })
})
