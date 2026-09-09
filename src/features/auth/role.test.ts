/* ============================================================
   THE SIGNED-IN IDENTITY CARRIES A JOB — DECISIONS.md §2.

   WHAT THIS SUITE IS ACTUALLY FOR, and it is one claim above all
   the others: TURNING THE ROLE ON MUST NOT LOCK THE OWNER OUT.

   Everything in this app worked because `mayDo` was handed
   `roleId === null` and every module was unrestricted, so it
   permitted. The moment `roleId` is real, a wrong default refuses
   the one seeded operator — the person who owns the tenancy —
   everywhere, on his own machine, with no screen able to undo it.
   `SearchField.tsx:360-370` names that exact risk in its own header
   as the reason it did not filter on `mayDo`.

   So the regression proof is written as an EQUALITY rather than as
   a description: for every capability, on every module a fresh
   project produces, the answer with the demo account's real role is
   the answer the app gave yesterday with `null`. Not "still works" —
   the same boolean.

   ASSERTED THROUGH THE REAL DOORS. `signIn` is the function the
   sign-in screen calls and `createModule` is the one the designer
   calls, so the day somebody rewrites either of them this fails
   rather than passing against a fixture built to agree with it.

   The repository is mocked for the reason `ruleCapabilityReset`
   mocks it: this suite is `node` with no IndexedDB, and what is
   under test is the identity and the store's own defaults, not
   Dexie.
   ============================================================ */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModuleCapability, ModuleDef, RoleDef, RowData } from '@/types/model'
import { MODULE_CAPABILITIES } from '@/types/model'
import { isUnrestricted, mayDo } from '@/features/modules/access'

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

const { useProjectStore } = await import('@/store/useProjectStore')
const { currentUser, demoAccount, setSessionRole, signIn, signOut, subscribeToSession } =
  await import('./session')
const { roleInForce, roleOf, sessionRoleId } = await import('./role')

const store = (): ReturnType<typeof useProjectStore.getState> => useProjectStore.getState()

/* `environment: 'node'`, so there is no localStorage until one is
   installed — the same fake `arrangement.test.ts` uses, and for the
   same reason: a session is only a session because it survives a
   reload, and nothing else here can show that. */
function installStorage(): Map<string, string> {
  const map = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v)
      },
      removeItem: (k: string) => {
        map.delete(k)
      },
    },
    configurable: true,
    writable: true,
  })
  return map
}

const CAPS = Object.keys(MODULE_CAPABILITIES) as ModuleCapability[]

const AT = '2026-09-09T00:00:00.000Z'
const role = (id: string, name: string): RoleDef => ({
  id,
  name,
  createdAt: AT,
  updatedAt: AT,
})

function signInAsDemo(): NonNullable<ReturnType<typeof currentUser>> {
  const { email, password } = demoAccount()
  const out = signIn(email, password)
  expect(out.ok).toBe(true)
  if (!out.ok) throw new Error('the seeded account did not sign in')
  return out.user
}

beforeEach(() => {
  installStorage()
  signOut()
})

describe('the demo account signs in with a role id', () => {
  it('carries the field, and it is null', () => {
    const user = signInAsDemo()
    expect(user.roleId).toBeNull()
    expect(sessionRoleId(user)).toBeNull()
  })

  it('answers null for nobody signed in, exactly as `atLeast` does', () => {
    expect(sessionRoleId(null)).toBeNull()
    expect(sessionRoleId(undefined)).toBeNull()
    expect(currentUser()).toBeNull()
  })
})

describe('THE LOCKOUT — the default cannot refuse the owner anything', () => {
  beforeEach(() => {
    store().replaceProject({
      name: 'Test Sheet',
      entities: [],
      groups: [],
      rules: [],
      rowsByEntity: {},
    })
  })

  it('a fresh project writes down no roles, so no module can be restricted', () => {
    /* THE STRUCTURAL HALF OF THE ARGUMENT. A module is restricted
       only by an access row naming a role that exists, and roles are
       data nothing seeds (`useProjectStore.ts:380-387`). No roles,
       no rows, no restriction — and `mayDo` never reaches the line
       that refuses a null. */
    const table = store().createEntity({ name: 'Boats' })
    const module = store().createModule([table.id], 'Boats', 'The boats we sell')
    expect(module).not.toBeNull()
    if (!module) return

    expect(Object.keys(store().roles)).toHaveLength(0)
    expect(module.access).toBeUndefined()
    expect(isUnrestricted(module)).toBe(true)
  })

  it('answers every capability identically to the null it replaced', () => {
    /* THE REGRESSION PROOF, as an equality. `null` is what every
       real session passed before today. */
    const table = store().createEntity({ name: 'Motors' })
    const module = store().createModule([table.id], 'Motors', 'The motors we sell')
    if (!module) throw new Error('no module')

    const user = signInAsDemo()
    const id = sessionRoleId(user)

    for (const cap of CAPS) {
      expect(mayDo(module, id, cap)).toBe(mayDo(module, null, cap))
      /* and both are the module's own contract, which is the whole
         of what the app could honestly answer yesterday */
      expect(mayDo(module, id, cap)).toBe(module.capabilities.includes(cap))
    }
  })

  it('reaches every module a fresh project has, not just one', () => {
    const boats = store().createEntity({ name: 'Boats' })
    const motors = store().createEntity({ name: 'Motors' })
    store().createModule([boats.id], 'Boats', 'The boats we sell')
    store().createModule([motors.id], 'Motors', 'The motors we sell')

    const user = signInAsDemo()
    const id = sessionRoleId(user)
    const modules = Object.values(store().modules)
    expect(modules.length).toBe(2)

    for (const m of modules) {
      expect(isUnrestricted(m)).toBe(true)
      for (const cap of m.capabilities) expect(mayDo(m, id, cap)).toBe(true)
    }
  })
})

describe('an assignment is the session’s, and it survives a reload', () => {
  it('persists, and the seed refresh does not revoke it', () => {
    /* THE BUG THIS PINS. `currentUser` refreshes a stored session
       from the seeded account, which is right for name, email, org
       and rung and would be WRONG for a role somebody was given an
       hour ago — it would revoke the assignment on every reload,
       silently. Same class as the `admin` flag the refresh exists
       for, pointed the other way. */
    signInAsDemo()
    const after = setSessionRole('r-yard-manager')
    expect(after?.roleId).toBe('r-yard-manager')

    /* reading it back IS the reload: nothing survives but storage */
    expect(sessionRoleId(currentUser())).toBe('r-yard-manager')
    /* and the identity is still the seed's, not the stored copy's */
    expect(currentUser()?.role).toBe('super-admin')
  })

  it('takes it away again, because a grant that cannot be undone is a trap', () => {
    signInAsDemo()
    setSessionRole('r-yard-manager')
    expect(setSessionRole(null)?.roleId).toBeNull()
    expect(sessionRoleId(currentUser())).toBeNull()
  })

  it('goes when the person does', () => {
    signInAsDemo()
    setSessionRole('r-yard-manager')
    signOut()
    expect(currentUser()).toBeNull()
    expect(sessionRoleId(currentUser())).toBeNull()
  })

  it('assigns nothing when nobody is signed in', () => {
    expect(setSessionRole('r-yard-manager')).toBeNull()
    expect(currentUser()).toBeNull()
  })

  it('reads a junk id as no role rather than as a role', () => {
    signInAsDemo()
    setSessionRole('   ')
    expect(sessionRoleId(currentUser())).toBeNull()

    /* storage is JSON somebody else's session wrote */
    globalThis.localStorage.setItem(
      'hl.session.user',
      JSON.stringify({ ...signInAsDemo(), roleId: 7 }),
    )
    expect(sessionRoleId(currentUser())).toBeNull()
  })
})

describe('an id that names no role is not a role', () => {
  const roles = [role('r1', 'Yard Manager'), role('r2', 'Salesperson')]

  it('resolves an assignment against the roles that exist', () => {
    signInAsDemo()
    setSessionRole('r1')
    expect(roleInForce(currentUser(), roles)).toBe('r1')
    expect(roleOf(currentUser(), roles)?.name).toBe('Yard Manager')
  })

  it('answers null once the role is deleted under it', () => {
    /* the other half is the store's: `deleteRole` strips that
       role's grants from every module in the same step, so the
       module it was the only role of goes back to UNRESTRICTED
       rather than becoming a wall nobody is on the right side of
       (`useProjectStore.ts:1541-1557`). */
    signInAsDemo()
    setSessionRole('r-gone')
    expect(sessionRoleId(currentUser())).toBe('r-gone')
    expect(roleInForce(currentUser(), roles)).toBeNull()
    expect(roleOf(currentUser(), roles)).toBeNull()
  })

  it('answers null for nobody signed in', () => {
    expect(roleInForce(null, roles)).toBeNull()
    expect(roleOf(undefined, roles)).toBeNull()
  })
})

describe('a role that IS restricted still answers honestly', () => {
  /* NOT A CHANGE OF BEHAVIOUR — proof that supplying a real id makes
     `mayDo` enforce what the grid claims, which is the whole of
     DECISIONS.md §2. Nothing in the app reaches this state today
     because nothing seeds a role or an access row. */
  const restricted: ModuleDef = {
    id: 'm1',
    name: 'Motors',
    description: '',
    tableIds: ['t1'],
    capabilities: ['browse', 'search', 'open'],
    index: 'rows',
    accent: 'carmine',
    order: 0,
    access: [{ roleId: 'r1', capabilities: ['browse'] }],
    createdAt: AT,
    updatedAt: AT,
  }

  it('permits the role the grid ticked and refuses the one it did not', () => {
    signInAsDemo()
    setSessionRole('r1')
    expect(mayDo(restricted, sessionRoleId(currentUser()), 'browse')).toBe(true)
    expect(mayDo(restricted, sessionRoleId(currentUser()), 'open')).toBe(false)

    setSessionRole('r2')
    expect(mayDo(restricted, sessionRoleId(currentUser()), 'browse')).toBe(false)
  })
})

describe('the session says when it changed', () => {
  it('publishes on sign-in, assignment and sign-out, and stops on unsubscribe', () => {
    let beats = 0
    const off = subscribeToSession(() => {
      beats += 1
    })

    signInAsDemo()
    expect(beats).toBe(1)
    setSessionRole('r1')
    expect(beats).toBe(2)
    signOut()
    expect(beats).toBe(3)

    off()
    signInAsDemo()
    expect(beats).toBe(3)
  })

  it('still signs in when the browser refuses storage', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new Error('this browser blocks site data')
      },
      configurable: true,
    })
    const { email, password } = demoAccount()
    const out = signIn(email, password)
    expect(out.ok).toBe(true)
    if (out.ok) expect(sessionRoleId(out.user)).toBeNull()
  })
})
