/* ============================================================
   THE ARGUMENT `mayDo` HAS BEEN MISSING.

   THE FAULT, NAMED. `mayDo(module, roleId, capability)`
   (`features/modules/access.ts:131`) is the one question the app is
   supposed to ask about what a person may do in a place. It was
   handed `roleId === null` in EVERY real session, and that file says
   so itself at line 126: "nobody in particular, which is every
   session today". The consequence was not that access was loose —
   it was that the access grid LIED. An administrator ticking three
   verbs for "Yard Manager" was told they had restricted a module,
   and what actually happened was that every person, themselves
   included, was refused there. A safety claim the app did not
   honour, in either direction.

   DECISIONS.md §2 settled it: real users with roles. This file is
   the whole of that wiring on the identity side. It produces the
   argument; it does not decide anything with it.

   THREE RULES, AND THEY ARE WHY THIS IS A FILE AND NOT A FIELD READ.

   1. NOBODY READS `user.roleId`. Every surface asks
      `sessionRoleId(user)` or `useSessionRoleId()`. A field read
      spread across thirty files is thirty places that have to
      remember that `undefined` and `null` mean the same thing, and
      one of them will not.

   2. AN ID THAT NAMES NO ROLE IS NOT A ROLE. `roleInForce` resolves
      the assignment against the dealership's actual `RoleDef`s. A
      role can be deleted while somebody is signed in holding it, and
      a stale id that still LOOKS like an assignment is worse than
      none: the screen would say "Yard Manager" for a job nobody has.
      The store already covers the other half — `deleteRole`
      (`useProjectStore.ts:1541-1557`) strips that role's grants from
      every module in the same step, so a module whose only role was
      the deleted one goes back to UNRESTRICTED rather than becoming
      a wall nobody is on the right side of.

   3. THIS FILE HAS NO OPINION ABOUT ACCESS. It does not import
      `mayDo`, does not wrap it, and must never grow a "may this
      person…" helper. `access.ts`'s header is explicit that nothing
      else may grow a second opinion about what a role may do, and a
      convenience wrapper here is exactly how a second opinion
      starts. Ask `mayDo` directly, with what this file returns.

   WHAT IS NOT WIRED, so the next hand knows the seam: no production
   surface calls `mayDo` yet — `access.test.ts` is its only caller —
   so nothing is gated on a role today, by design. Wiring the
   catalogue, the palette and the write verbs to the answer is the
   work this file unblocks, not the work it does.
   ============================================================ */

import { useSyncExternalStore } from 'react'
import type { RoleDef } from '@/types/model'
import { currentUser, subscribeToSession, type AppUser } from './session'

/**
 * THE ROLE ID THIS SESSION ASKS WITH — the one way to produce
 * `mayDo`'s second argument.
 *
 * Takes a missing user and answers `null`, for the reason `atLeast`
 * takes one: "nobody is signed in" and "signed in with no job
 * written down yet" are the same answer to every caller, and forcing
 * each one to test twice is how a gate ends up open on the path
 * nobody thought about.
 *
 * `null` is not a lockout. See the seeded operator in `session.ts`:
 * a module is restricted only by naming a role that exists, so in a
 * business that has written none down every module is unrestricted
 * and `mayDo` answers on the module's own capability list alone.
 */
export const sessionRoleId = (user: AppUser | null | undefined): string | null =>
  user?.roleId ?? null

/**
 * THE SAME ANSWER, RESOLVED AGAINST THE ROLES THAT ACTUALLY EXIST.
 *
 * Prefer this wherever the dealership's roles are already to hand —
 * a screen reading `useProjectStore(s => s.roles)` has them for
 * nothing. An id naming no role answers `null`: see rule 2 above.
 *
 * Takes the roles as an argument rather than reaching for the store,
 * so this stays importable from a `node` test suite with no Dexie
 * and no React — the same reason `configs.ts` takes its `AppUser`
 * as a parameter instead of calling `currentUser()`.
 */
export function roleInForce(
  user: AppUser | null | undefined,
  roles: readonly RoleDef[],
): string | null {
  const id = sessionRoleId(user)
  if (id === null) return null
  return roles.some((r) => r.id === id) ? id : null
}

/**
 * The `RoleDef` itself, for a screen that has to NAME the job.
 *
 * Separate from `roleInForce` because they answer different
 * questions and a caller that only needs the id should not be handed
 * an object it is then tempted to read `capabilities` off — a
 * `RoleDef` has none. What a role may do lives on the MODULE
 * (`ModuleDef.access`), which is the whole argument of `access.ts`.
 */
export const roleOf = (
  user: AppUser | null | undefined,
  roles: readonly RoleDef[],
): RoleDef | null => roles.find((r) => r.id === sessionRoleId(user)) ?? null

/**
 * THE LIVE READ, for a surface that is not handed the user as a prop.
 *
 * An assignment can change mid-session, and a component gating on a
 * stale role is the failure this whole file exists to stop pointing
 * the other way. A STRING OR NULL, so the snapshot
 * `useSyncExternalStore` compares is a primitive and no read can
 * ever loop it — the same reason `useConfiguringCount`
 * (`modules/ruleCapability.ts:157`) returns a number.
 *
 * A surface that ALREADY has the user as a prop should use
 * `sessionRoleId(user)` instead: `App.tsx` holds the identity in
 * React state and passing it down is one source of truth rather
 * than two.
 */
export function useSessionRoleId(): string | null {
  const read = (): string | null => sessionRoleId(currentUser())
  return useSyncExternalStore(subscribeToSession, read, read)
}
