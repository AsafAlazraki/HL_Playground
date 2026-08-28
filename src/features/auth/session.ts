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

  /** MAY THEY CHANGE THE SHAPE OF THE BUSINESS — the data model,
   *  the tables, the rules, the roles, the saved configurations.
   *
   *  IT IS NOT A `RoleDef`, deliberately, and the two must not be
   *  merged. A `RoleDef` is the dealership's own word for a job and
   *  it grants CAPABILITIES INSIDE A MODULE — browse Boats, quote
   *  from Trailers. Administering the tenancy is not a capability of
   *  any module: it is the thing that decides what the modules ARE.
   *  A salesperson can have every capability in every module and
   *  still have no business editing the data model.
   *
   *  A BOOLEAN AND NOT A ROLE LIST, because there is exactly one
   *  question here today and inventing a second role system to
   *  answer it would leave two places to look when somebody cannot
   *  reach a screen. */
  admin: boolean
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
      /* the one seeded operator owns this tenancy */
      admin: true,
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
