/* ============================================================
   THE FILES ON A DEAL — and why they are in IndexedDB.

   EVERYTHING ELSE THIS FEATURE STORES IS `localStorage`: the stage
   overrides, the stage list, the notes, the links, the card
   choice. That is right for all five — they are small, they are
   text, and they are read on every render. It is wrong for a
   photograph. The whole ORIGIN gets 5-10 MB of localStorage,
   shared with the dashboard's arrangement, the pipeline, the tile
   order and the activity log, and a dealership photographing four
   boats a day exhausts it inside a week. IndexedDB holds orders of
   magnitude more, and Dexie is already in this application.

   ITS OWN DATABASE, NOT A SIXTH TABLE IN `src/db/database.ts`, and
   the reason is what that database IS. `helmlogic-dynamic-config`
   holds the PROJECT — the tables, rows, views, rules, modules and
   roles — and the project is exported as an envelope, archived by
   tenancy, and replaced wholesale by an import. A deal's
   photographs are none of those things: they belong beside the
   quote exactly as its notes do, and putting them in the project
   would mean re-importing a price file destroyed or duplicated
   every attachment a dealership had taken. A second database name
   is one line and it cannot do that.

   THE FILE IS STORED AS A BLOB, NOT AS A `data:` URL, and that is
   the one place this deliberately differs from
   `features/modules/logo.ts`. A mark lives on a `ModuleDef`, which
   is a record in a JSON envelope, so it has to be a string and
   pays base64's ~1.37x on every byte. Nothing here is ever
   serialised into a record — IndexedDB stores a Blob natively, so
   a 4 MB photograph occupies 4 MB and is handed to an `<img>`
   through `URL.createObjectURL`.

   AND THE FILE IS KEPT EXACTLY AS IT IS. `logo.ts` redraws
   anything over 96 KB because a module's mark is drawn at 56px and
   a 12 MB sign-writer's file in a project record is a real cost.
   The opposite is true here: the thing being attached IS the
   photograph of the boat, a dealer will want to open it full size,
   and a store built to hold it has no reason to re-encode it. What
   was done to somebody's file is still SAID (`logo.ts`'s rule, and
   the better half of it) — it just says "kept exactly as it is".

   THE CEILING IS PER FILE AND THE REFUSAL NAMES BOTH NUMBERS.
   `FILE_MAX_BYTES` is not about arithmetic failing; it is about
   what a person can be handed back. A refusal reading "too large"
   with no measured size beside it leaves them guessing how far
   over they are — the sentence `logo.ts` writes, in the same shape.

   WHAT IS NOT HERE, said out loud rather than left to be assumed:
   there is no ceiling on the TOTAL a deal or an organisation may
   hold. A browser's IndexedDB quota is a fraction of free disk and
   is not a number this app can read, so a limit written here would
   be invented. What happens instead is honest: the browser refuses
   the write, `putFile` returns the refusal, and the pane prints it
   where the file was dropped.

   THE PURE HALF IS PURE. `filePlan`, `sizeSay`'s use and
   `keptNote` take their inputs as arguments, so
   `dealFiles.test.ts` tests the whole decision without a browser
   or a database.
   ============================================================ */

import { useCallback, useEffect, useState } from 'react'
import Dexie, { type EntityTable } from 'dexie'
import { sizeSay } from '@/features/modules'

/** One file attached to one deal. `orgSlug` and `quoteId` are on
 *  the record rather than in a compound key so a deal can be
 *  emptied with one `where` and Dexie can index the pair. */
export interface DealFile {
  id: string
  orgSlug: string
  quoteId: string
  name: string
  /** the browser's declared type. Kept as given: it is what decides
   *  whether the pane can draw a thumbnail. */
  type: string
  size: number
  at: number
  who?: string
  blob: Blob
}

/** The most one file may be. 20 MB is a photograph off a phone with
 *  room to spare and a PDF of a survey report; above it a person is
 *  attaching something a browser tab should not be holding. */
export const FILE_MAX_BYTES = 20 * 1024 * 1024

/** How many files one deal may carry. Not a storage limit — a
 *  reading limit: a pane listing sixty attachments is a pane
 *  nobody scans, and the number is said in the refusal. */
export const FILE_MAX_PER_DEAL = 20

/* ---------------------------------------------------------- */
/* The decision, taken before a byte is read                   */
/* ---------------------------------------------------------- */

export type FilePlan = { do: 'refuse'; why: string } | { do: 'keep' }

/** What a chosen file is used for, decided on its declared size and
 *  the deal's current count alone — no bytes read, so an enormous
 *  one is refused before it is in memory. */
export function filePlan(
  file: { name: string; size: number },
  heldAlready: number,
): FilePlan {
  if (heldAlready >= FILE_MAX_PER_DEAL) {
    return {
      do: 'refuse',
      why: `This deal already holds ${FILE_MAX_PER_DEAL} files, which is as many as this pane can list and still be read. Remove one to make room.`,
    }
  }
  if (file.size > FILE_MAX_BYTES) {
    return {
      do: 'refuse',
      /* BOTH NUMBERS, the sentence `logo.ts` writes. A ceiling with
         no measured size beside it leaves a person guessing. */
      why: `${file.name} is ${sizeSay(file.size)}, and a file is not attached to a deal above ${sizeSay(
        FILE_MAX_BYTES,
      )}. Attach a link to it instead, or save a smaller copy.`,
    }
  }
  if (file.size === 0) {
    return { do: 'refuse', why: `${file.name} is empty — there is nothing in it to attach.` }
  }
  return { do: 'keep' }
}

/** What was done to somebody's file, in their words, said beside
 *  the file it produced. `logo.ts` says what it redrew; this says
 *  that it redrew nothing, which is the fact worth having. */
export const keptNote = (file: { name: string; size: number }): string =>
  `${file.name} was stored exactly as it is, all ${sizeSay(file.size)} of it. The copy on your disk is untouched.`

/** A picture can be drawn; everything else is listed by name. */
export const isPicture = (type: string): boolean => /^image\//i.test(type)

/* ---------------------------------------------------------- */
/* The database                                                */
/* ---------------------------------------------------------- */

const files = new Dexie('helmlogic-deal-files') as Dexie & {
  files: EntityTable<DealFile, 'id'>
}

/* `[orgSlug+quoteId]` is a compound index and not a compound key:
   the id stays the primary key so one file can be removed by id
   without knowing which deal it is on. */
files.version(1).stores({ files: 'id, [orgSlug+quoteId]' })

/** An id readable in a debugger, minted from the instant, the same
 *  shape `mintNoteId` and `mintLinkId` use. Uniqueness is the
 *  database's — `add` throws on a collision and `putFile` reports
 *  it — rather than a scan of every row to avoid one. */
const mintFileId = (at: number): string =>
  `f${at.toString(36)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`

/** What a deal holds. Blobs and all — a listing is what the pane
 *  draws thumbnails from, and Dexie hands the Blob back without
 *  reading it into a string. */
export async function filesFor(orgSlug: string, quoteId: string): Promise<DealFile[]> {
  try {
    const rows = await files.files.where('[orgSlug+quoteId]').equals([orgSlug, quoteId]).toArray()
    return rows.sort((a, b) => (a.at === b.at ? (a.id < b.id ? -1 : 1) : a.at - b.at))
  } catch {
    /* a browser with IndexedDB switched off draws a deal with
       nothing attached, which is the truth about what it can read */
    return []
  }
}

export type FilePut = { ok: true; file: DealFile; note: string } | { ok: false; why: string }

/** Store one chosen file. The plan is taken first, so a refusal
 *  costs nothing; a browser that then refuses the write says so in
 *  a sentence rather than leaving a file that is not there after a
 *  refresh — the rule `dealNotes.ts` set for a lost note. */
export async function putFile(
  orgSlug: string,
  quoteId: string,
  file: File,
  who: string | undefined,
  now = Date.now(),
): Promise<FilePut> {
  const held = await filesFor(orgSlug, quoteId)
  const plan = filePlan(file, held.length)
  if (plan.do === 'refuse') return { ok: false, why: plan.why }

  const row: DealFile = {
    id: mintFileId(now),
    orgSlug,
    quoteId,
    name: file.name,
    type: file.type,
    size: file.size,
    at: now,
    ...(who ? { who } : {}),
    blob: file,
  }
  try {
    await files.files.add(row)
  } catch {
    return {
      ok: false,
      why: `This browser refused to store ${file.name}. It is usually out of room — clearing this site's data on a machine that has been used for years is what frees it.`,
    }
  }
  return { ok: true, file: row, note: keptNote(file) }
}

/** Remove one, by id. What UNDO calls after a removal — and the
 *  reason `putFile` returns the whole row: putting it back is
 *  `restoreFile`, not "attach it again", which would lose who
 *  attached it and when. */
export async function dropFile(id: string): Promise<void> {
  try {
    await files.files.delete(id)
  } catch {
    /* nothing to say: the listing is re-read either way and will
       show the file still there, which is the truth */
  }
}

export async function restoreFile(row: DealFile): Promise<boolean> {
  try {
    await files.files.put(row)
    return true
  } catch {
    return false
  }
}

/* ---------------------------------------------------------- */
/* Reading it                                                  */
/* ---------------------------------------------------------- */

/** THE LISTING, AND A HANDLE TO RE-READ IT.
 *
 *  Not `useSyncExternalStore` like every other store in this
 *  feature, and the difference is not a style choice: those five
 *  are synchronous reads of a parsed object and this is a promise.
 *  A snapshot function that returns a new array every call makes
 *  `useSyncExternalStore` loop forever, which is the trap that
 *  shape sets for anything asynchronous. So: state, an effect, and
 *  an explicit `again` the writers call. */
export function useDealFiles(
  orgSlug: string,
  quoteId: string,
): { list: DealFile[]; again: () => void; ready: boolean } {
  const [list, setList] = useState<DealFile[]>([])
  const [ready, setReady] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    setReady(false)
    void filesFor(orgSlug, quoteId).then((rows) => {
      if (!live) return
      setList(rows)
      setReady(true)
    })
    return () => {
      live = false
    }
  }, [orgSlug, quoteId, tick])

  const again = useCallback(() => setTick((n) => n + 1), [])
  return { list, again, ready }
}

/** for tests, and for a sign-out that should leave nothing behind */
export async function forgetDealFiles(): Promise<void> {
  try {
    await files.files.clear()
  } catch {
    /* nothing stored is nothing to clear */
  }
}
