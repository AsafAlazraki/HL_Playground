/* ============================================================
   THE ORG ARCHIVE — where a saved configuration is kept.

   ONE ORG TODAY. THE SHAPE FOR MANY. Every record here is filed
   under `orgSlug`, and every read is scoped by it. There is exactly
   one org in this build (`features/auth/session.ts` seeds
   `northside-marine`) and the scoping still costs nothing, because
   the alternative — adding the tenant key later — means rewriting
   every query in the app at the moment the second customer signs up.
   See docs/plan/TENANCY.md.

   ---------------------------------------------------------------
   WHY THIS IS A SECOND DEXIE DATABASE AND NOT A NEW TABLE ON THE
   FIRST ONE.

   `src/db/database.ts` holds THE LIVE SHEET — one project, one row
   per store, rewritten differentially on every keystroke, and
   emptied wholesale by `repository.wipe()` when somebody clears the
   sheet. An archive kept in that database would be inside the thing
   it exists to survive: the round trip this feature is FOR is "save,
   clear the sheet, load it back", and step two must not be able to
   reach step three.

   It is still Dexie, still local-first, still behind a repository
   interface, and it is the same seam as `ProjectRepository`: swap
   `ConfigArchive` for an HTTP implementation and nothing above this
   file changes. That is the point of the interface, and it is why
   the tenancy work starts here rather than in a component.

   ---------------------------------------------------------------
   TWO TABLES, AND THE SPLIT IS PERFORMANCE, NOT TIDINESS.

   A Northside envelope is 15,691 rows of JSON — megabytes. Drawing
   a LIST of saved configurations must not read megabytes per row, so
   the counted facts a list draws (`ConfigRecord`) live in one table
   and the envelope text lives in another, keyed the same. Listing
   reads the first only; opening reads the second.

   ---------------------------------------------------------------
   THE ENVELOPE IS STORED AS TEXT, DELIBERATELY.

   Not as an object. Three things follow from that and all three are
   wanted:

     1. It cannot share a reference with the live store, so a saved
        configuration can never be mutated from underneath by an edit
        made after it was saved.
     2. It is the same bytes a `.json` file would hold, so it is read
        back through `validateEnvelope` — the SAME validator that
        reads a file a person picked. A record written by an older
        build is refused in the same sentence as an old file, rather
        than trusted because it came from us.
     3. Its size is a number, so the list can say what a saved
        configuration costs.
   ============================================================ */

import Dexie, { type EntityTable } from 'dexie'
import type { EnvelopeSummary } from '@/features/io/readEnvelope'

/** What a saved configuration IS, minus the envelope itself. This is
 *  what a list draws, and every figure on it was counted at the
 *  moment it was saved — nothing here is estimated. */
export interface ConfigRecord {
  id: string
  /** THE TENANT KEY. `AppUser.orgSlug`, and every read is scoped by
   *  it. One value today; the column that makes many possible. */
  orgSlug: string
  /** the business's own name at the moment it was saved, so a record
   *  reads as somebody's even if the slug is all a query has */
  orgName: string
  /** what the person called it — "Northside Marine — Master Price File" */
  name: string
  savedAt: string
  /** who saved it. `AppUser`, by value: the record must still say who
   *  made it after that person's account is gone. */
  savedBy: { name: string; email: string }
  /** the project revision this configuration is, off the same counter
   *  "Save a copy" prints as REV */
  rev: number
  /** the size of the envelope in bytes, counted */
  bytes: number
  /** tables, columns, rows, modules, pages, rules, quotes — counted by
   *  `summariseEnvelope`, which is the one counting implementation in
   *  the app and is shared with the file-import preview */
  counts: EnvelopeSummary
}

/** The envelope, as the text it would be in a file. Kept apart from
 *  the record above so listing never reads it. */
export interface ConfigPayload {
  id: string
  json: string
}

/** Persistence for the org archive. A future backend implements this
 *  same interface and nothing above it changes — the same arrangement
 *  `ProjectRepository` already makes for the live sheet. */
export interface ConfigArchive {
  /** newest first, scoped to one org */
  list(orgSlug: string): Promise<ConfigRecord[]>
  read(id: string): Promise<{ record: ConfigRecord; json: string } | null>
  write(record: ConfigRecord, json: string): Promise<void>
  remove(id: string): Promise<void>
}

/* ------------------------------------------------------------ */
/* the Dexie implementation                                      */
/* ------------------------------------------------------------ */

type ArchiveDb = Dexie & {
  configs: EntityTable<ConfigRecord, 'id'>
  payloads: EntityTable<ConfigPayload, 'id'>
}

/** CONSTRUCTED LAZILY, and that is not a micro-optimisation: the test
 *  suite runs in `environment: 'node'` (vitest.config.ts says why) and
 *  there is no IndexedDB there. Building the database at module scope
 *  would make importing this file fail in every node suite that
 *  touches the feature, including the round trip that is the whole
 *  point of it. */
let cached: ArchiveDb | null = null

function archiveDb(): ArchiveDb {
  if (cached) return cached
  const db = new Dexie('helmlogic-tenancy') as ArchiveDb
  /* `orgSlug` is indexed because every read is scoped by it, and
     `savedAt` because the list is newest-first. `id` is the key. */
  db.version(1).stores({
    configs: 'id, orgSlug, savedAt',
    payloads: 'id',
  })
  cached = db
  return db
}

const newest = (a: ConfigRecord, b: ConfigRecord): number =>
  a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : a.name.localeCompare(b.name)

class DexieConfigArchive implements ConfigArchive {
  async list(orgSlug: string): Promise<ConfigRecord[]> {
    const rows = await archiveDb().configs.where('orgSlug').equals(orgSlug).toArray()
    return rows.sort(newest)
  }

  async read(id: string): Promise<{ record: ConfigRecord; json: string } | null> {
    const db = archiveDb()
    const [record, payload] = await Promise.all([db.configs.get(id), db.payloads.get(id)])
    /* HALF A RECORD IS NOT A RECORD. A meta row whose payload is gone
       cannot be opened, and saying "not found" is the truth a caller
       can act on — the alternative is handing up a record and letting
       the open path fail somewhere less explicable. */
    if (!record || !payload) return null
    return { record, json: payload.json }
  }

  async write(record: ConfigRecord, json: string): Promise<void> {
    const db = archiveDb()
    /* ONE TRANSACTION, because the two tables are one fact. A meta row
       without its payload is the unopenable half-record above. */
    await db.transaction('rw', [db.configs, db.payloads], async () => {
      await db.payloads.put({ id: record.id, json })
      await db.configs.put(record)
    })
  }

  async remove(id: string): Promise<void> {
    const db = archiveDb()
    await db.transaction('rw', [db.configs, db.payloads], async () => {
      await db.payloads.delete(id)
      await db.configs.delete(id)
    })
  }
}

/* ------------------------------------------------------------ */
/* the memory implementation, and the swap                       */
/* ------------------------------------------------------------ */

/** The same archive, in a Map. It exists so the round trip can be
 *  walked without IndexedDB — and it is also the honest proof that
 *  the interface above is the seam it claims to be: if a Map can
 *  stand in for Dexie, so can an HTTP client. */
export function memoryArchive(): ConfigArchive {
  const records = new Map<string, ConfigRecord>()
  const payloads = new Map<string, string>()
  return {
    async list(orgSlug) {
      return [...records.values()].filter((r) => r.orgSlug === orgSlug).sort(newest)
    },
    async read(id) {
      const record = records.get(id)
      const json = payloads.get(id)
      if (!record || json === undefined) return null
      return { record, json }
    },
    async write(record, json) {
      payloads.set(record.id, json)
      records.set(record.id, record)
    },
    async remove(id) {
      payloads.delete(id)
      records.delete(id)
    },
  }
}

let active: ConfigArchive = new DexieConfigArchive()

export const configArchive = (): ConfigArchive => active

/** Point the feature at another archive. Two callers are intended and
 *  no third is: a test, and the day a server implementation exists. */
export function setConfigArchive(archive: ConfigArchive): void {
  active = archive
}
