/* ============================================================
   WHO MAY DO WHAT, IN ONE MODULE.

   THE FAULT THIS FIXES, NAMED. docs/plan/hl-admin.md §2.3: "Roles are
   data. Permissions are code." Production lets an admin invent the
   role "Yard Manager" and gives them no way to invent a thing that
   role is or is not allowed to do — eleven permission ids, fixed in a
   TypeScript array, one of them (`can_edit_boat_data`) with the
   industry hardcoded into its own name, and a twelfth that is read by
   the app and appears in no admin screen at all.

   SO BOTH HALVES ARE DATA HERE. A role is a `RoleDef` an admin wrote
   in their own words. What that role may do is `ModuleAccess`, stored
   on the module, IN THE MODULE'S OWN CAPABILITY VOCABULARY — which is
   the second half of the argument and the one this file exists to
   enforce.

   ACCESS CAN NEVER EXCEED THE MODULE, AND THAT IS A TYPE-LEVEL CLAIM
   THIS FILE MAKES TRUE AT RUNTIME. A module declares what CAN be done
   in it (`ModuleDef.capabilities`); access says which of those a role
   actually gets. Granting `quote` to a role in a module that cannot
   quote is not a smaller permission — it is a contradiction. Two
   places make that unreachable rather than merely discouraged:

     · `withGrant` REFUSES a capability the module does not offer, and
       hands back the access list unchanged, so nothing downstream has
       to check;
     · every READER intersects with `module.capabilities` first, so a
       grant that was legal when it was made and is not any more —
       somebody switched `quote` off in the designer an hour later —
       stops being in force the same instant, without a migration and
       without a stale row on screen.

   The second is the load-bearing one. A capability list is edited on
   another panel of the same page; if access were merely validated on
   write, every switch flicked in the designer would silently leave a
   role holding a verb its module no longer has.

   ABSENT MEANS UNRESTRICTED, AND SO DOES EMPTY, AND THE SCREEN IS A
   GRID OF TICKS BECAUSE OF IT. `ModuleDef.access` absent is how every
   module written before roles existed behaved and must keep behaving.
   An empty list means the same thing, and a row holding no
   capabilities is dropped rather than stored — so the whole spectrum
   is one gesture:

       no tick anywhere   → open to everyone
       one tick           → closed to everyone but the roles ticked
       untick them all    → open again

   The alternative — keeping an empty row, so a module can be
   RESTRICTED with nobody able to act in it — is a wall with no door
   on either side, reachable by unticking a box and escapable by no
   control on the screen. It is not a state a dealer ever means, and
   the type has no way to distinguish it from "I have not decided
   yet", so it is not a state this file can produce.

   NOTHING HERE INVENTS A ROLE, A GRANT OR A DEFAULT. A new role
   arrives with NO capabilities, in every module, and an admin ticks
   what the job actually does. `DEFAULT_CAPABILITIES` is the module's
   own default and is deliberately not borrowed here: "everyone can
   browse" is a decision about somebody's business, and nobody has
   made it.

   THE TENTH VERB IS NOT GRANTABLE. `configure` lives in
   `ruleCapability.ts` because `ModuleCapability` does not carry it
   yet, and `ModuleAccess.capabilities` is typed `ModuleCapability[]`
   — so it cannot appear in a grant. That is stated on screen rather
   than hidden: see `ModuleSettings`. When the contract grows the verb
   this file needs no change; the grid gains a column.
   ============================================================ */

import {
  MODULE_CAPABILITIES,
  type ModuleAccess,
  type ModuleCapability,
  type ModuleDef,
  type RoleDef,
} from '@/types/model'

/** The contract's own declaration order — the order the designer's
 *  switches, the dashboard card's verbs and this grid's columns all
 *  read in, so nobody has to learn a second one. */
const CONTRACT_ORDER = Object.keys(MODULE_CAPABILITIES) as ModuleCapability[]

/** The verbs THIS module offers, in the contract's order. These are
 *  the grid's columns, and they are the only things that can ever be
 *  granted here. */
export function offeredCapabilities(module: ModuleDef): ModuleCapability[] {
  const set = new Set(module.capabilities)
  return CONTRACT_ORDER.filter((k) => set.has(k))
}

/**
 * Is this module open to everyone?
 *
 * Absent OR empty. See the header: an empty list is the shape "take
 * the last role out" would otherwise leave behind, and it would mean
 * a module nobody can act in.
 */
export const isUnrestricted = (module: ModuleDef): boolean =>
  module.access === undefined || module.access.length === 0

/** The access list, normalised: never undefined, never with two rows
 *  for one role. */
const listOf = (module: ModuleDef): ModuleAccess[] => module.access ?? []

/**
 * What one role may actually do here, right now.
 *
 * INTERSECTED WITH THE MODULE, ALWAYS. A stored capability the module
 * no longer offers is not in force and is not returned — see the
 * header for why that is checked on read rather than only on write.
 */
export function grantedTo(module: ModuleDef, roleId: string): ModuleCapability[] {
  const offered = new Set(module.capabilities)
  const row = listOf(module).find((a) => a.roleId === roleId)
  if (!row) return []
  const held = new Set(row.capabilities)
  return CONTRACT_ORDER.filter((k) => offered.has(k) && held.has(k))
}

/**
 * MAY THIS ROLE DO THIS, HERE — the one question the rest of the app
 * should ever ask.
 *
 * `roleId` of null is "nobody in particular", which is every session
 * today: this build has no sign-in and no current user, so a
 * restricted module is answered honestly as "not by anyone we can
 * name". See ModuleSettings for what is said about that on screen.
 */
export function mayDo(
  module: ModuleDef,
  roleId: string | null,
  capability: ModuleCapability,
): boolean {
  if (!module.capabilities.includes(capability)) return false
  if (isUnrestricted(module)) return true
  if (roleId === null) return false
  return grantedTo(module, roleId).includes(capability)
}

/* ---------------------------------------------------------- */
/* Reading the grid                                            */
/* ---------------------------------------------------------- */

/** One row of the grid: a job, and what it may do here. */
export interface AccessRow {
  role: RoleDef
  /** in force — intersected with the module's own capabilities */
  granted: ModuleCapability[]
  /**
   * Stored against this role, but the module does not offer it any
   * more. NOT in force, and NOT silently dropped either: the screen
   * says so, because a grant that stopped applying because somebody
   * changed the module is a thing an admin should be told about
   * rather than left to discover.
   */
  lapsed: ModuleCapability[]
}

/**
 * The grid, in the order the roles were written down.
 *
 * A role with no access row at all is still a ROW here, with nothing
 * granted — because "this job has no access to this place" is an
 * answer, and leaving the job off the list would read as though the
 * app had lost it.
 */
export function accessRows(
  module: ModuleDef,
  roles: readonly RoleDef[],
): AccessRow[] {
  const offered = new Set(module.capabilities)
  return roles.map((role) => {
    const row = listOf(module).find((a) => a.roleId === role.id)
    const held = new Set(row?.capabilities ?? [])
    return {
      role,
      granted: CONTRACT_ORDER.filter((k) => offered.has(k) && held.has(k)),
      lapsed: CONTRACT_ORDER.filter((k) => !offered.has(k) && held.has(k)),
    }
  })
}

/**
 * Role ids named by this module's access that no longer exist.
 *
 * `deleteRole` clears them in the same step it deletes the role, so
 * this should be empty — but a module can also arrive from a file, and
 * `ProjectExport` cannot carry roles yet (see index.ts). Named rather
 * than assumed away.
 */
export function orphanRoleIds(module: ModuleDef, roles: readonly RoleDef[]): string[] {
  const known = new Set(roles.map((r) => r.id))
  return listOf(module)
    .map((a) => a.roleId)
    .filter((id) => !known.has(id))
}

/* ---------------------------------------------------------- */
/* Writing it — every one returns the NEW access value          */
/* ---------------------------------------------------------- */

/** `undefined` rather than `[]`, so "no roles" is always the
 *  unrestricted state and never a wall. */
const settle = (rows: ModuleAccess[]): ModuleAccess[] | undefined =>
  rows.length === 0 ? undefined : rows

/** Take a role off this module entirely — the whole row at once, for
 *  the control that says so. Removing the LAST one hands back
 *  `undefined`: the module goes back to unrestricted, which is where
 *  it started and is the only other thing it could mean. */
export function withoutRole(
  module: ModuleDef,
  roleId: string,
): ModuleAccess[] | undefined {
  return settle(listOf(module).filter((a) => a.roleId !== roleId))
}

/**
 * Grant or revoke one capability for one role.
 *
 * REFUSES A CAPABILITY THE MODULE DOES NOT OFFER by handing back the
 * list unchanged. Not an exception and not a silent partial write:
 * the caller compares what it got back, and the screen never offers
 * the column in the first place.
 *
 * Granting to a role that is not on the list yet ADDS it — which is
 * the same act as `withRole` and is the reason that one is idempotent.
 * The stored order is the contract's, so two admins ticking the same
 * three verbs in a different sequence store the same list.
 */
export function withGrant(
  module: ModuleDef,
  roleId: string,
  capability: ModuleCapability,
  on: boolean,
): ModuleAccess[] | undefined {
  const rows = listOf(module)
  /* THE RULE. Access can never exceed the module. */
  if (on && !module.capabilities.includes(capability)) return settle(rows)

  const known = rows.some((a) => a.roleId === roleId)
  const base = known ? rows : [...rows, { roleId, capabilities: [] }]

  const next = base.map((a) => {
    if (a.roleId !== roleId) return a
    const set = new Set(a.capabilities)
    if (on) set.add(capability)
    else set.delete(capability)
    return { roleId, capabilities: CONTRACT_ORDER.filter((k) => set.has(k)) }
  })

  /* A ROW THAT HOLDS NOTHING IS NOT A ROW. See the header: an empty
     grant is indistinguishable from an undecided one, and keeping it
     is the only way to build a module nobody can act in. */
  return settle(next.filter((a) => a.capabilities.length > 0))
}

/* ---------------------------------------------------------- */
/* Saying it                                                   */
/* ---------------------------------------------------------- */

/** The verb's own label from the contract — never a word invented
 *  here, so the grid header, the designer switch and the dashboard
 *  card all print the same one. */
export const capabilityLabel = (k: ModuleCapability): string =>
  MODULE_CAPABILITIES[k].label

/**
 * What just happened, as a sentence, for the toast that offers UNDO.
 * Written here so the words and the act cannot drift apart.
 */
export function grantNote(
  roleName: string,
  moduleName: string,
  capability: ModuleCapability,
  on: boolean,
): string {
  const verb = capabilityLabel(capability).toLowerCase()
  return on
    ? `${roleName} can now ${verb} in ${moduleName}.`
    : `${roleName} can no longer ${verb} in ${moduleName}.`
}

/** WHAT THE VERB ACTUALLY PERMITS, in the contract's own words —
 *  `MODULE_CAPABILITIES[k].says`, never a gloss written twice.
 *
 *  A column head reading `Relate` tells an admin the name of a
 *  permission and nothing about what ticking it lets somebody do; the
 *  contract already carries the sentence ("say what goes with what")
 *  and the designer's own switch already prints it. The access grid
 *  prints the same one, so a verb is explained identically wherever it
 *  is granted, described or switched off. */
export const capabilitySays = (k: ModuleCapability): string =>
  MODULE_CAPABILITIES[k].says

/* ---------------------------------------------------------- */
/* Reading the WHOLE project — the access screen's own figures  */
/* ---------------------------------------------------------- */

/**
 * Access across every place at once.
 *
 * WHY IT IS HERE AND NOT ON THE SCREEN THAT DRAWS IT. Every figure
 * below is `isUnrestricted`, `grantedTo` or `orphanRoleIds` applied
 * once per module, and each of those already answers a question this
 * file has an opinion about. A screen adding up `module.access.length`
 * itself would count a grant the module can no longer honour as though
 * it were in force — which is the one thing the header of this file
 * says a reader must never do.
 */
export interface AccessCensus {
  /** jobs written down at this dealership */
  roles: number
  modules: number
  /** modules somebody has closed */
  restricted: number
  /** modules open to everyone — absent OR empty access */
  open: number
  /** grants IN FORCE: one role, one verb, one place. */
  grants: number
  /** stored, and the module does not offer that verb any more */
  lapsed: number
  /** stored against a role id this project does not have */
  orphans: number
}

export function accessCensus(
  modules: readonly ModuleDef[],
  roles: readonly RoleDef[],
): AccessCensus {
  let restricted = 0
  let grants = 0
  let lapsed = 0
  let orphans = 0

  for (const module of modules) {
    if (isUnrestricted(module)) continue
    restricted += 1
    for (const row of accessRows(module, roles)) {
      grants += row.granted.length
      lapsed += row.lapsed.length
    }
    orphans += orphanRoleIds(module, roles).length
  }

  return {
    roles: roles.length,
    modules: modules.length,
    restricted,
    open: modules.length - restricted,
    grants,
    lapsed,
    orphans,
  }
}

/**
 * IN HOW MANY PLACES THIS JOB MAY ACTUALLY ACT.
 *
 * In force, so a role holding only lapsed verbs in a module does not
 * count that module — and an UNRESTRICTED module counts for every
 * role, because a place open to everyone is a place this job may work
 * in. That second clause is the one a screen gets wrong by reading
 * `access` alone: it would report a brand-new dealership, where every
 * module is open and nothing is restricted, as nine jobs that may go
 * nowhere.
 */
export function roleReach(modules: readonly ModuleDef[], roleId: string): number {
  return modules.filter(
    (m) => isUnrestricted(m) || grantedTo(m, roleId).length > 0,
  ).length
}

/**
 * A PLACE HOLDING GRANTS FOR A ROLE THAT IS NOT THERE.
 *
 * Named rather than assumed away — see `orphanRoleIds`. What makes it
 * worth its own reader is the second field: clearing the last such row
 * hands the module back to UNRESTRICTED, which is a change to who may
 * work there and must be said in the sentence that offers the act, not
 * discovered afterwards.
 */
export interface OrphanGrants {
  module: ModuleDef
  /** the ids, in the order the module stored them */
  roleIds: string[]
  /** stored capabilities across those rows — what would go */
  capabilities: number
  /** clearing them leaves no access row at all, so the module goes
   *  back to open-to-everyone */
  opensUp: boolean
}

export function orphanGrants(
  modules: readonly ModuleDef[],
  roles: readonly RoleDef[],
): OrphanGrants[] {
  const out: OrphanGrants[] = []
  for (const module of modules) {
    const ids = orphanRoleIds(module, roles)
    if (ids.length === 0) continue
    const rows = listOf(module)
    out.push({
      module,
      roleIds: ids,
      capabilities: rows
        .filter((a) => ids.includes(a.roleId))
        .reduce((n, a) => n + a.capabilities.length, 0),
      opensUp: rows.length === ids.length,
    })
  }
  return out
}

/**
 * Every orphan row off one module at once.
 *
 * Written here rather than as a loop over `withoutRole` on the screen
 * for the reason the whole file exists: `settle` is what turns "no rows
 * left" into `undefined` rather than into a wall nobody is on the right
 * side of, and a caller filtering the array itself would not know that.
 */
export function withoutOrphans(
  module: ModuleDef,
  roles: readonly RoleDef[],
): ModuleAccess[] | undefined {
  const known = new Set(roles.map((r) => r.id))
  return settle(listOf(module).filter((a) => known.has(a.roleId)))
}
