export { SignIn } from './SignIn'
export {
  signIn,
  signOut,
  currentUser,
  demoAccount,
  /* WHAT A PERSON MAY REACH. `atLeast` is the only way to ask —
     an equality against one rung is a gate that stays shut when a
     rung is added above it. */
  atLeast,
  ROLE_NAME,
  /* WHOSE JOB THIS IS — the write half of `AppUser.roleId`, and the
     bus that says it changed. `App.tsx` holds the identity in
     `useState`; an assignment made mid-session reaches everything
     else through the subscription. */
  setSessionRole,
  subscribeToSession,
  type AppUser,
  type Role,
  type SignInProblem,
} from './session'
/* ============================================================
   THE ARGUMENT `mayDo` WANTS — DECISIONS.md §2.

   `mayDo(module, roleId, capability)` was handed `null` in every
   real session, so the access grid claimed a restriction it was not
   enforcing. These four are the only way to produce that argument;
   nothing anywhere should read `user.roleId` itself, and nothing
   here decides anything with the answer. See `./role` for why this
   is deliberately not a `mayThisPerson(...)` wrapper.
   ============================================================ */
export { sessionRoleId, roleInForce, roleOf, useSessionRoleId } from './role'
export { WhoChip, readTheme, applyTheme } from './WhoChip'
export type { WhoChipProps, ThemeChoice } from './WhoChip'
