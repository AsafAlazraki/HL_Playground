/* ============================================================
   SAVE THE ORG'S CONFIGURATION, AND OPEN IT AGAIN.

   THE BRIEF, VERBATIM: "let's simplify for now. We know we need the
   functionality for new customers with new tenancies etc. and to be
   able to manage them in a seperate admin app. But load and save
   northside marine config please."

   So this file does the simple thing, and does it through the app's
   own machinery rather than beside it.

   ---------------------------------------------------------------
   NOTHING HERE IS A SECOND FILE FORMAT.

   A saved configuration IS the envelope `Save a copy` writes — same
   `buildExportPayload`, same `validateEnvelope`, same `applyReplace`.
   Three functions the app already had, already tested against the
   real 15,691-row seed (`io/envelope.roundtrip.test.ts`,
   `io/restoreAfterClear.test.ts`), already the thing a `.json` on
   somebody's desktop holds.

   The temptation was to serialise the store directly — it is fewer
   lines and it looks like less work. It is a second format the day
   after it is written: `EXPORT_VERSION` moves and one of the two
   readers does not, and the one that does not is this one, because
   nobody remembers the archive is a file. Reusing the envelope means
   a configuration saved by this build is openable by the import door,
   and a file from the import door is storable here, for free and for
   ever.

   WHAT THE ENVELOPE DOES NOT CARRY, said plainly rather than
   discovered later — see the report and docs/plan/TENANCY.md:

     · ROLES. `ProjectExport.roles` is declared in the contract and
       `io/exportPayload.ts` never writes it, so the named jobs at the
       dealership and every module grant that points at one do not
       survive a save. That is a gap in io/, which is not this
       workflow's to edit. It is one line there and one loop in
       `io/apply.ts`.
     · The DASHBOARD ARRANGEMENT does travel: it is `ModuleDef.order`
       (model.ts: "position on the dashboard, ascending"), modules are
       exported in that order and `applyReplace` puts `order` back.
       There is no separate arrangement object to lose.
     · CUSTOMERS travel as data, because the register is a base table
       with a well-known id (`features/crm` — "there is no customer
       object, no customer store"), so its rows are in `rows` like any
       other table's.

   ---------------------------------------------------------------
   EVERY REFUSAL IS A SENTENCE (rule 10). Nothing here throws at a
   caller and nothing returns a bare false: a save that cannot happen
   says what stopped it, in words a dealer can act on, and the surface
   prints that sentence where the act was attempted.
   ============================================================ */

import { newId, nowIso } from '@/lib/id'
import { useProjectStore } from '@/store/useProjectStore'
import type { AppUser } from '@/features/auth/session'
/* DEEP IMPORTS, NOT THE BARREL, AND FOR A REASON THAT IS TESTED
   RATHER THAN STYLISTIC. `@/features/io` re-exports `ImportExportMenu`
   and `Freshness`, which are React components; pulling the barrel in
   would drag JSX into a suite that runs in `environment: 'node'` with
   no React plugin (vitest.config.ts). `io/restoreAfterClear.test.ts`
   reaches for these same three modules directly for the same reason.
   Two of them — `buildExportPayload` and `validateEnvelope` — are not
   on the barrel at all. io/ is not this workflow's to edit. */
import { applyReplace } from '@/features/io/apply'
import { buildExportPayload } from '@/features/io/exportPayload'
import { validateEnvelope } from '@/features/io/envelope'
import { summariseEnvelope, type EnvelopeSummary } from '@/features/io/readEnvelope'
import { configArchive, type ConfigRecord } from './archive'

/* ------------------------------------------------------------ */
/* naming                                                        */
/* ------------------------------------------------------------ */

/** What to call this configuration if the person does not type
 *  anything.
 *
 *  IT IS NOT "ORG — PROJECT" UNCONDITIONALLY, and the reason is a
 *  real one rather than a taste: `setOrganisation` OVERWRITES
 *  `meta.name` with the business name (useProjectStore.ts:820), so
 *  after onboarding the two are the same string and the obvious
 *  formula produces "Northside Marine — Northside Marine". A project
 *  that already begins with the business's name is already named. */
export function suggestedConfigName(): string {
  const s = useProjectStore.getState()
  const project = s.meta.name.trim()
  const org = s.meta.org?.name.trim()
  if (!org) return project
  if (!project || project === org || project.startsWith(org)) return project || org
  return `${org} — ${project}`
}

/* ------------------------------------------------------------ */
/* save                                                          */
/* ------------------------------------------------------------ */

export type SaveOutcome =
  | { ok: true; record: ConfigRecord }
  | { ok: false; why: string }

/** Save the whole working set under this user's organisation.
 *
 *  `includeData` is not offered. A configuration is a RESTORE POINT
 *  for one business's own machine, so it is always the full copy —
 *  the structure-only choice exists on the export card because that
 *  file is handed to somebody else, and a restore point that quietly
 *  dropped 15,691 rows would be the silent-loss failure the export
 *  card's own header was written against. */
export async function saveConfiguration(user: AppUser, name?: string): Promise<SaveOutcome> {
  const slug = user.orgSlug.trim()
  if (!slug) {
    /* Cannot happen with the seeded operator, and it is checked
       anyway: an unscoped record is a record that belongs to every
       tenant at once, which is the one failure a multi-tenant store
       must never be able to reach. */
    return { ok: false, why: 'This account is not attached to a business, so there is nowhere to file a configuration.' }
  }

  const store = useProjectStore.getState()
  if (Object.keys(store.entities).length === 0) {
    return {
      ok: false,
      why: 'There are no tables on the sheet, so there is nothing to save yet. Load your price file or make a table first.',
    }
  }

  const title = (name ?? '').trim() || suggestedConfigName()
  if (!title) {
    return { ok: false, why: 'Give this configuration a name so you can find it again.' }
  }

  /* THE REV IS ISSUED BY THE ACT OF SAVING, exactly as `saveCopyOfSheet`
     issues it for a file. A saved configuration IS a revision of the
     org's set-up, and two of them sharing a number would make the list
     unreadable in the one column that is supposed to order it. */
  const rev = useProjectStore.getState().bumpExportCount()
  const file = buildExportPayload(rev, true)
  const json = JSON.stringify(file)
  const counts: EnvelopeSummary = summariseEnvelope(file)

  const record: ConfigRecord = {
    id: newId(),
    orgSlug: slug,
    orgName: user.orgName,
    name: title,
    savedAt: nowIso(),
    savedBy: { name: user.name, email: user.email },
    rev,
    bytes: new TextEncoder().encode(json).length,
    counts,
  }

  try {
    await configArchive().write(record, json)
  } catch (e) {
    /* A BROWSER REFUSING STORAGE IS A REAL ANSWER, not an exception to
       swallow: a quota, a private window, a full disk. The person is
       about to believe their configuration is safe, so they are told
       it is not, in the place they pressed save. */
    return {
      ok: false,
      why: `This browser would not store the configuration: ${reasonOf(e)} Save a copy to a file instead — Import & export ▸ Everything.`,
    }
  }

  bumpArchive()
  return { ok: true, record }
}

/* ------------------------------------------------------------ */
/* list                                                          */
/* ------------------------------------------------------------ */

/** Every configuration this org has saved, newest first. Scoped by
 *  `orgSlug` and by nothing else — see the header of archive.ts. */
export async function listConfigurations(orgSlug: string): Promise<ConfigRecord[]> {
  if (!orgSlug.trim()) return []
  try {
    return await configArchive().list(orgSlug.trim())
  } catch {
    /* A LIST THAT CANNOT BE READ IS AN EMPTY LIST TO A CALLER, and the
       surface says so where the list would be rather than throwing
       through a render. */
    return []
  }
}

/* ------------------------------------------------------------ */
/* open                                                          */
/* ------------------------------------------------------------ */

export type OpenOutcome =
  | { ok: true; record: ConfigRecord; counts: EnvelopeSummary }
  | { ok: false; why: string }

/** Put a saved configuration back on the sheet.
 *
 *  THIS REPLACES THE SHEET AND IT CANNOT BE UNDONE. `replaceProject`
 *  calls `forgetHistory()` — a swap is not a step, because undoing
 *  into a project that is no longer open would restore tables the
 *  screens have never heard of. So this is one of the genuinely
 *  irreversible acts rule 9 keeps dialogs for, and the surface that
 *  calls it MUST confirm first, stating the blast radius computed
 *  (`sheetNow` / `sheetFacts` in io/ do that counting already).
 *
 *  The quotes already here are left alone — `applyReplace` adds the
 *  file's quotes by id and never overwrites one, because the copy in
 *  this browser may be the newer one. */
export async function openConfiguration(id: string): Promise<OpenOutcome> {
  let found: { record: ConfigRecord; json: string } | null
  try {
    found = await configArchive().read(id)
  } catch (e) {
    return { ok: false, why: `This browser would not read the configuration back: ${reasonOf(e)}` }
  }
  if (!found) {
    return {
      ok: false,
      why: 'That configuration is no longer here. It may have been removed on this machine — the list beside this has what is left.',
    }
  }

  let raw: unknown
  try {
    raw = JSON.parse(found.json)
  } catch {
    return {
      ok: false,
      why: `“${found.record.name}” cannot be read back, so something has changed it since it was saved. Open a different one, or a saved copy from a file.`,
    }
  }

  /* THE SAME VALIDATOR A FILE GOES THROUGH. A record written by an
     older build of this app is not trusted because we wrote it: it is
     checked, and refused in the same sentence a stale file is refused
     in. That is the whole reason the envelope is stored as text. */
  const res = validateEnvelope(raw)
  if (!res.ok) return { ok: false, why: res.error }

  applyReplace(res.data)
  return { ok: true, record: found.record, counts: summariseEnvelope(res.data) }
}

/* ------------------------------------------------------------ */
/* remove                                                        */
/* ------------------------------------------------------------ */

export type RemoveOutcome = { ok: true } | { ok: false; why: string }

/** Forget one saved configuration. It does not touch the sheet. */
export async function removeConfiguration(id: string): Promise<RemoveOutcome> {
  try {
    await configArchive().remove(id)
  } catch (e) {
    return { ok: false, why: `This browser would not remove it: ${reasonOf(e)}` }
  }
  bumpArchive()
  return { ok: true }
}

/* ------------------------------------------------------------ */
/* sign-in                                                       */
/* ------------------------------------------------------------ */

export type RestoreOutcome =
  /** the sheet was empty and the org's newest configuration is on it now */
  | { kind: 'restored'; record: ConfigRecord; counts: EnvelopeSummary }
  /** there is work on the sheet already, and it is newer than any file */
  | { kind: 'sheet-in-use'; say: string }
  /** this org has never saved one */
  | { kind: 'nothing-saved' }
  /** there is one and it could not be opened; the reason is printable */
  | { kind: 'unreadable'; say: string }

/* ============================================================
   WHAT HAPPENS WHEN SOMEBODY SIGNS IN.

   THE RULE: RESTORE ONLY ONTO AN EMPTY SHEET.

   The obvious reading of "restored on sign-in" is "open the org's
   newest configuration every time somebody signs in". That is wrong,
   and it is wrong in the way that destroys work: this app is
   local-first and the live sheet ALREADY survives a reload through
   Dexie, so the sheet a person finds when they sign in is their own
   unsaved Tuesday afternoon. Opening the last saved configuration
   over it would throw that away — silently, on a screen nobody
   pressed anything on, and unrecoverably, because a swap clears the
   undo stack.

   So the restore happens exactly when there is nothing to lose: no
   tables on the sheet. That is the state a new browser is in, the
   state after CLEAR SHEET, and the state a second machine is in — the
   three cases where "where is my configuration?" is the actual
   question. In every other case the sheet IS the org's configuration,
   more current than anything filed, and the caller is told so in a
   sentence it can print rather than being left to guess.
   ============================================================ */

export async function restoreForSignIn(user: AppUser): Promise<RestoreOutcome> {
  const s = useProjectStore.getState()
  if (Object.keys(s.entities).length > 0) {
    return {
      kind: 'sheet-in-use',
      say: 'Your sheet is already open, so nothing was restored over it. Saved configurations are in Settings.',
    }
  }

  const list = await listConfigurations(user.orgSlug)
  const newest = list[0]
  if (!newest) return { kind: 'nothing-saved' }

  const res = await openConfiguration(newest.id)
  if (!res.ok) return { kind: 'unreadable', say: res.why }
  return { kind: 'restored', record: res.record, counts: res.counts }
}

/* ------------------------------------------------------------ */
/* subscription — so a list redraws after a save                 */
/* ------------------------------------------------------------ */

/* The archive is async and off-store, so nothing in the app is
   subscribed to it. This is the smallest thing that makes a list
   correct: a version number that changes when the archive does, and
   the listeners that want to hear about it. Same shape as the quote
   registry's `republish`, and for the same reason — a surface must
   not have to remember to re-read. */
let version = 0
const listeners = new Set<() => void>()

function bumpArchive(): void {
  version += 1
  const waiting = [...listeners]
  /* told on a microtask: a save may be issued from inside an effect,
     and React must not be told a store changed mid-render */
  queueMicrotask(() => {
    for (const l of waiting) if (listeners.has(l)) l()
  })
}

export function subscribeToArchive(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export const archiveVersion = (): number => version

/** Tests swap the archive under the feature; the version has to move
 *  with it or a mounted list would keep the previous archive's rows. */
export function forgetArchiveCache(): void {
  bumpArchive()
}

/* ------------------------------------------------------------ */

/** A thrown thing as a sentence ending in a full stop, because it is
 *  printed inside one. Never "[object Object]". */
function reasonOf(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
  const text = raw.trim()
  if (!text) return 'it did not say why.'
  return /[.!?]$/.test(text) ? text : `${text}.`
}
