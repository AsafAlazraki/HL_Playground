/* ============================================================
   WHO IS SIGNED IN.

   ⚠️ READ THIS BEFORE YOU BUILD ON IT.

   THIS IS NOT AUTHENTICATION. It is a sign-in SCREEN and a
   remembered identity, and it provides no security whatsoever:
   the app is local-first, everything runs in the browser, and the
   credential below is in the JavaScript bundle where anybody can
   read it. Nothing here keeps anyone out of anything.

   It exists for three honest reasons:
     1. The product needs to know WHO is quoting — a quote is
        "prepared by" somebody, and that name belongs on the
        document a customer receives.
     2. The dashboard is per-person: my quotes, my customers, my
        day. Without an identity there is no "my".
     3. Multi-tenancy is coming. A signed-in user belongs to an
        ORGANISATION, and the seam where that is decided has to
        exist before the admin app can be built against it.

   WHEN REAL AUTH ARRIVES it replaces `signIn` and `currentUser`
   and nothing else: every caller already asks this module rather
   than checking a password itself, which is the whole point of
   putting it behind a function today.

   NOTHING IS INVENTED. There is exactly one seeded user because
   exactly one was asked for. The app does not pretend to have a
   team it does not have.

   A FOURTH REASON ARRIVED, and it does not weaken the warning
   above. `AppUser.roleId` is the dealership's own word for what
   this person's job is, and `mayDo` reads it — so a role now
   changes what the app OFFERS. That is a CONFIGURATION, not a
   security boundary: it is the difference between a salesperson's
   screen and a manager's, and anybody who wants past it can still
   edit localStorage. Nothing on this seam should ever be described
   to a user as protection. See `./role` for the one way to ask, and
   the seeded operator below for why the default cannot lock the
   owner out of his own app.
   ============================================================ */

export interface AppUser {
  id: string
  /** what they are called on a quote they prepared */
  name: string
  email: string
  /** their part in the business, shown on the dashboard */
  title: string
  /** the organisation they belong to. One today; the seam for many. */
  orgSlug: string
  orgName: string

  /** WHAT THIS PERSON MAY REACH, as a named rung rather than a
   *  flag. It began as `admin: boolean` and that was one question
   *  too few: administering a dealership's own settings and
   *  administering the SHAPE OF ITS DATA are different jobs, and
   *  the second is the one that can break the first.
   *
   *  THE LADDER:
   *    'sales'       quote, browse the catalogue, keep customers.
   *                  No Admin door at all.
   *    'admin'       the dealership's own set-up — modules, roles,
   *                  business rules, saved configurations,
   *                  import/export. Everything about how THIS
   *                  business sells.
   *    'super-admin' the same, plus the data model and the tables
   *                  themselves. The shape everything else is
   *                  built on, and the one place a wrong move
   *                  costs a price file.
   *
   *  IT IS NOT A `RoleDef`, and the two must not be merged. A
   *  `RoleDef` is the dealership's own word for a job and it
   *  grants CAPABILITIES INSIDE A MODULE — browse Boats, quote
   *  from Trailers. This says which of the APPLICATION a person
   *  gets. A salesperson can hold every capability in every module
   *  and still have no business editing the data model; the two
   *  answer different questions and a person needs both.
   *
   *  ORDERED, so a check is `atLeast(user, 'admin')` and never a
   *  list of equalities somebody will forget to extend. */
  role: Role

  /** THE DEALERSHIP'S OWN WORD FOR THIS PERSON'S JOB — a `RoleDef`
   *  id (`types/model.ts:927`), or nothing.
   *
   *  THIS IS THE SECOND HALF OF THE QUESTION `role` ABOVE ANSWERS,
   *  and the paragraph above is the reason the two are separate
   *  fields rather than one: `role` says which of the APPLICATION a
   *  person reaches, this says what they may do INSIDE A MODULE.
   *  `mayDo(module, roleId, capability)`
   *  (`features/modules/access.ts:131`) wants exactly this value and
   *  had no source for it until now — it was handed `null` in every
   *  real session, so the access grid told an administrator they had
   *  restricted something they had not.
   *
   *  NEVER READ THIS FIELD. Ask `sessionRoleId(user)` (`./role`).
   *  It is optional here because a stored session written before the
   *  field existed is missing it, which is the exact failure
   *  `currentUser` below already carries a paragraph about, and
   *  because "no role written down yet" and "this session predates
   *  roles" are the same answer to every caller — the same reasoning
   *  `atLeast` uses for a null user.
   *
   *  IT DEFAULTS TO `null`, AND THAT DEFAULT CANNOT LOCK ANYBODY
   *  OUT. See the seeded operator below for the whole argument. */
  roleId?: string | null
}

/** The rungs, in order. `ORDER` is the only place the ladder's
 *  shape is written down; everything else asks `atLeast`. */
export type Role = 'sales' | 'admin' | 'super-admin'

const ORDER: readonly Role[] = ['sales', 'admin', 'super-admin']

/** The dealership's own word for each rung, for a screen that has
 *  to say it. Never generated from the id — "super-admin" with the
 *  hyphen taken out is not a name a person wrote. */
export const ROLE_NAME: Record<Role, string> = {
  sales: 'Sales',
  admin: 'Administrator',
  'super-admin': 'Super admin',
}

/** Is this person at least this far up the ladder?
 *
 *  Takes `null` and answers false, because "nobody is signed in"
 *  and "signed in without the rung" are the same answer to every
 *  caller and forcing each one to test twice is how a gate ends up
 *  open on the path nobody thought about. */
export function atLeast(user: AppUser | null | undefined, rung: Role): boolean {
  if (!user) return false
  return ORDER.indexOf(user.role) >= ORDER.indexOf(rung)
}

/** The seeded operator. See the warning above: this is a demo
 *  credential in a public bundle, not a secret. */
const SEEDED: ReadonlyArray<{ user: AppUser; password: string }> = [
  {
    password: '123456',
    user: {
      id: 'u-asafa1',
      name: 'Asaf Alazraki',
      email: 'asafa1@northsidemarine.com.au',
      title: 'Sales',
      orgSlug: 'northside-marine',
      orgName: 'Northside Marine',
      /* THE ONE SEEDED OPERATOR OWNS THIS TENANCY, so they hold
         the top rung — the data model and the tables included.
         There is one account in this build and it is the person
         who commissioned it. */
      role: 'super-admin',

      /* ========================================================
         NULL, AND THIS IS THE DEFAULT THE WHOLE ROLE SYSTEM
         RESTS ON. Read this before changing it.

         WHY NOT AN INVENTED ID. `RoleDef`s are DATA and NOTHING
         SEEDS THEM — `useProjectStore.ts:380-387` says so in its
         own words: "There are no roles until somebody writes one
         down, because the app cannot know whether a yard runs on
         one person or on nine." Any non-null value here would
         name a role that does not exist. That is a dangling id —
         the precise thing `deleteRole` goes out of its way to
         prevent (`useProjectStore.ts:1541-1557`) — and it would
         read on screen as an assignment while granting nothing.

         WHY IT CANNOT LOCK ANYBODY OUT, structurally rather than
         by luck. `mayDo` refuses a null role only when the module
         is RESTRICTED (`access.ts:136-139`), and a module is
         restricted only by carrying an access row that names an
         existing `RoleDef` (`access.ts:233-258`; the grid offers
         a row per role that exists, `AccessGrid.tsx:152`). With
         no roles written down there is no row to write, so
         `isUnrestricted` is true everywhere and `mayDo` answers
         `module.capabilities.includes(capability)` for ANY
         roleId, null included. Verified: neither the demo seed
         nor `createModule` writes `access`. A single-person
         business therefore behaves exactly as it did before this
         field existed — see `role.test.ts`, which asserts that
         equality rather than describing it.

         WHAT IS STILL POSSIBLE, said plainly rather than
         discovered later: once an administrator writes a role
         down, assigns it to themselves, and then restricts a
         module WITHOUT ticking that role, they are refused —
         honestly, because that is what they asked for. Guarding
         the person doing the restricting is the grid's job, not
         this field's. Two things already blunt it: `deleteRole`
         hands a module whose last role went back to unrestricted,
         and the Admin door is gated on `atLeast` (the ladder),
         which no `RoleDef` can take away. */
      roleId: null,
    },
  },
]

const KEY = 'hl.session.user'

/* ============================================================
   THE SESSION CHANGES WHILE THE APP IS OPEN, so it has to be
   subscribable.

   Until roles, the signed-in user was written once at sign-in and
   read as a value: `App.tsx:26` holds it in `useState` and passes
   it down. A role ASSIGNMENT is different — an administrator can
   change it mid-session, and every surface asking `mayDo` has to
   see the new answer without a reload.

   `useSyncExternalStore` over a module-level listener set is the
   house pattern for exactly this and is already used by four
   files (`modules/ruleCapability.ts:88-106`,
   `constraints/constraintDefs.ts`, `app/moduleRecent.ts`,
   `activity/activity.ts`), so this grows no new mechanism. The
   hook itself is `useSessionRoleId` in `./role`.
   ============================================================ */
const listeners = new Set<() => void>()

/** Tell me when the signed-in identity changes — sign-in, sign-out,
 *  or a role assignment. Returns the unsubscribe. */
export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function publish(): void {
  /* THE SET ITSELF, NOT A COPY OF IT. `ruleCapability.ts` spreads
     here and pays a lint warning for it; the copy is not needed and
     the ratchet is at its ceiling. A `Set` iterated with `for…of` is
     defined against deletion mid-loop — a listener that unsubscribes
     itself is simply not visited — which is the only mutation this
     bus can see: nothing subscribes from inside a notification. */
  for (const listener of listeners) listener()
}

/** Why a sign-in did not land, as a sentence, in the place it
 *  failed — never a bare "invalid credentials" (rule 10). */
export type SignInProblem =
  | { kind: 'no-email'; say: string }
  | { kind: 'no-password'; say: string }
  | { kind: 'unknown-email'; say: string }
  | { kind: 'wrong-password'; say: string }

export function signIn(
  email: string,
  password: string,
): { ok: true; user: AppUser } | { ok: false; problem: SignInProblem } {
  const e = email.trim().toLowerCase()
  if (!e) {
    return { ok: false, problem: { kind: 'no-email', say: 'Enter the email you sign in with.' } }
  }
  if (!password) {
    return { ok: false, problem: { kind: 'no-password', say: 'Enter your password.' } }
  }
  const found = SEEDED.find((s) => s.user.email.toLowerCase() === e)
  if (!found) {
    /* NAMES THE ACCOUNT THAT DOES EXIST, deliberately. A real
       authentication system must not confirm which emails are
       registered; this one has a single seeded demo operator and
       hiding that helps nobody — a person locked out of a demo by
       a typo is the only outcome silence produces here. Replace
       this the moment sign-in reaches a server. */
    return {
      ok: false,
      problem: {
        kind: 'unknown-email',
        say: `No account here for that email. This build carries one: ${SEEDED[0]!.user.email}`,
      },
    }
  }
  if (found.password !== password) {
    return {
      ok: false,
      problem: { kind: 'wrong-password', say: 'That password does not match this account.' },
    }
  }
  remember(found.user)
  return { ok: true, user: found.user }
}

function remember(user: AppUser): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(user))
  } catch {
    /* a browser refusing storage still gets a working session for
       as long as the tab is open */
  }
  publish()
}

/** A stored `roleId`, cleaned. Storage is JSON somebody else's
 *  session wrote, so it is parsed rather than trusted: anything that
 *  is not a non-empty string is "no role", which is the same answer
 *  as a session written before the field existed. */
const storedRoleId = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

export function currentUser(): AppUser | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    if (!raw) return null
    const u = JSON.parse(raw) as AppUser
    if (!u || typeof u.email !== 'string') return null

    /* A STORED SESSION IS A COPY, AND THE SEED IS THE ORIGINAL.
       A session written before a field existed is missing it — the
       `admin` flag arrived after people were already signed in, and
       reading those sessions back gave every one of them a falsy
       flag and hid the Admin door from its owner.

       So a stored session is refreshed from the seeded account with
       the same email, and only what identifies the SESSION survives
       — nothing here is a merge. If the email is not one this build
       ships, the stored copy stands as it is: it is somebody's
       session and this function's job is to read it, not to judge
       it. */
    const seeded = SEEDED.find((a) => a.user.email === u.email)
    if (!seeded) return u

    /* AND `roleId` IS THE ONE EXCEPTION TO "THE SEED IS THE
       ORIGINAL", because it is the one field that is not a fact
       about the account. Name, email, org and rung are what this
       build ships and a stored copy of them can only be stale. A
       role ASSIGNMENT is something an administrator did at this
       dealership, after sign-in, and refreshing it off the seed
       would silently revoke it on every reload — which is the same
       class of bug as the `admin` flag above, pointed the other
       way. So: identity from the seed, assignment from the
       session. */
    return { ...seeded.user, roleId: storedRoleId(u.roleId) }
  } catch {
    return null
  }
}

/**
 * ASSIGN THIS SESSION A JOB — the write half of `roleId`.
 *
 * `null` takes the assignment away, and the two are one call
 * deliberately: an admin screen that could only grant would leave a
 * person holding a role nobody can remove.
 *
 * IT DOES NOT VALIDATE THE ID AGAINST THE DEALERSHIP'S ROLES, and
 * that is not an omission. This module knows nothing about the
 * project store — importing it here would put the identity behind
 * Dexie, and `configs.ts` already depends on the reverse. Resolving
 * an id that no longer names a role is `roleInForce` in `./role`,
 * which every reader goes through.
 *
 * Returns the identity as it now stands, so a caller holding the
 * user in React state (`App.tsx:26`) can lift it without a second
 * read — and every other subscriber hears it through
 * `subscribeToSession`.
 */
export function setSessionRole(roleId: string | null): AppUser | null {
  const user = currentUser()
  if (!user) return null
  const next: AppUser = { ...user, roleId: storedRoleId(roleId) }
  remember(next)
  return next
}

export function signOut(): void {
  try {
    globalThis.localStorage?.removeItem(KEY)
  } catch {
    /* nothing to forget */
  }
  publish()
}

/** The one seeded account, so the sign-in screen can offer it
 *  rather than making somebody guess a demo credential. */
export const demoAccount = (): { email: string; password: string } => ({
  email: SEEDED[0]!.user.email,
  password: SEEDED[0]!.password,
})
