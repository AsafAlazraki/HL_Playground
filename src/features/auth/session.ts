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
    },
  },
]

const KEY = 'hl.session.user'

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
}

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
    return seeded ? { ...seeded.user } : u
  } catch {
    return null
  }
}

export function signOut(): void {
  try {
    globalThis.localStorage?.removeItem(KEY)
  } catch {
    /* nothing to forget */
  }
}

/** The one seeded account, so the sign-in screen can offer it
 *  rather than making somebody guess a demo credential. */
export const demoAccount = (): { email: string; password: string } => ({
  email: SEEDED[0]!.user.email,
  password: SEEDED[0]!.password,
})
