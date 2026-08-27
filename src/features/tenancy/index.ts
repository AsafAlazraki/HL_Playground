/* ============================================================
   THE ORGANISATION — save, load, and the seam for many customers.

   MOUNTING IT (the whole job, and the orchestrator's two lines):

     1. THE SCREEN, under SETTINGS in the rail:

          import { ConfigurationsPanel } from '@/features/tenancy'
          <ConfigurationsPanel user={user} />

        It fills whatever box it is put in, scrolls itself, brings
        its own stylesheet, and takes no other prop. `user` is the
        signed-in `AppUser` the shell already holds.

     2. THE RESTORE, once, immediately after sign-in and after
        `useProjectStore.getState().init()` has resolved:

          const out = await restoreForSignIn(user)
          if (out.kind === 'restored') say({ text: … })
          if (out.kind === 'unreadable') say({ text: out.say, tone: 'warn' })

        It is safe to call unconditionally: it opens the org's newest
        configuration ONLY onto an empty sheet, and says which of the
        four things happened. See the block above `restoreForSignIn`
        for why "restore on every sign-in" would destroy work.

        THE ORDER MATTERS. Called before `init()` resolves it would
        see an empty store, restore over a sheet that is about to be
        hydrated from Dexie, and the two would fight — the same class
        of race `db/repository.ts` records under "an unknown disk is
        reconciled against itself".

   ---------------------------------------------------------------
   WHAT IT IS

   One business's whole working set, saved under `AppUser.orgSlug`,
   listed with when and by whom and what is in it counted, and
   openable again. The file format is the app's OWN export envelope —
   `io/exportPayload` writes it, `io/envelope` validates it,
   `io/apply` puts it back — so a saved configuration and a `.json`
   on somebody's desktop are the same thing, and there is no second
   format to keep in step.

   THE SEAM FOR MANY IS `ConfigArchive` (archive.ts) and `orgSlug`.
   Every record is filed under the tenant and every read is scoped by
   it, today, with one tenant — because adding the tenant key later
   means rewriting every query in the app on the day the second
   customer signs up. Swap the Dexie implementation for an HTTP one
   and nothing above that file changes.

   THE ADMIN APP IS NOT BUILT, deliberately: the brief says "we will
   focus on this a lot more later". What one org becoming many
   actually costs is written out concretely in docs/plan/TENANCY.md —
   what is per-org, what is per-user, what is global, and the six
   places in this codebase that would have to change.
   ============================================================ */

/* -- the screen ---------------------------------------------- */
export { ConfigurationsPanel } from './ConfigurationsPanel'
export type { ConfigurationsPanelProps } from './ConfigurationsPanel'

/* -- saving and opening, without a DOM ------------------------ */
export {
  saveConfiguration,
  listConfigurations,
  openConfiguration,
  removeConfiguration,
  restoreForSignIn,
  suggestedConfigName,
  subscribeToArchive,
  archiveVersion,
} from './configs'
export type { SaveOutcome, OpenOutcome, RemoveOutcome, RestoreOutcome } from './configs'

/* -- the persistence seam ------------------------------------- */
export { configArchive, setConfigArchive, memoryArchive } from './archive'
export type { ConfigArchive, ConfigRecord, ConfigPayload } from './archive'
