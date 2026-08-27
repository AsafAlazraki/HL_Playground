import type { EntityTable } from 'dexie'
import { db } from './database'
import type {
  EntityDef,
  GroupDef,
  ProjectMeta,
  RowData,
  RuleDef,
  ViewDef,
  ModuleDef,
  RoleDef,
} from '@/types/model'

/** Everything the UI layer needs from persistence. A future backend
 *  implements this same interface; nothing above it changes. */
export interface ProjectSnapshot {
  meta: ProjectMeta
  entities: EntityDef[]
  groups: GroupDef[]
  rules: RuleDef[]
  rows: RowData[]
  views: ViewDef[]
  modules: ModuleDef[]
  /** the named jobs at the dealership. A project made before roles
   *  existed loads with none, which is the unrestricted state. */
  roles: RoleDef[]
}

export interface ProjectRepository {
  load(): Promise<ProjectSnapshot | null>
  saveAll(snapshot: ProjectSnapshot): Promise<void>
  wipe(): Promise<void>
}

export const defaultMeta = (): ProjectMeta => ({
  id: 'default',
  name: 'Untitled Sheet',
  exportCount: 0,
  updatedAt: new Date().toISOString(),
})

/* ============================================================
   THE WRITE IS THE DIFFERENCE, NOT THE PROJECT.

   WHAT WAS HERE, AND WHAT IT COST. `saveAll` cleared all seven stores
   and wrote the entire project back on every debounced flush. Measured
   in the built app against the Northside file:

     rows on disk   records written per cell edit   transaction
       3,566              3,651 (+7 clears)            1,195 ms
      10,698             10,783 (+7 clears)           10,539 ms

   Ten and a half seconds to record ONE typed letter, at a scale the
   file is heading for. IT ARRIVED, and then it kept going: the seed
   is 15,691 rows now (SEED_AT_FULL_SCALE.md §8.2, since both
   libraries carry their whole sheet), so the second row of that table
   is not the projection any more — it is below the sheet a dealer
   opens. Worse than the length is the arithmetic: the
   flush is debounced at 400ms, so a person typing at a normal pace
   starts a new ten-second write every six hundred milliseconds, and
   the queue never drains — eight keystrokes issued eight full-project
   writes and fifty-six store clears. That is the "stops draining"
   failure, and no amount of tuning the debounce fixes it, because the
   work per flush is O(the whole project).

   WHAT REPLACES IT, AND WHY THIS AND NOT A DIRTY FLAG. The obvious
   answer is to have every mutation declare what it touched. That
   means editing forty call sites in the store and being right at all
   forty, for ever; one missed declaration is a silently unsaved edit,
   which is the worst class of bug this app can have.

   The store is already immutable and structurally shared: a row that
   did not change in this update is THE SAME OBJECT as the row that
   was written last time. So the difference can be READ rather than
   declared — one identity comparison per record — and it cannot go
   stale, because it is derived from the data that is actually being
   saved. A cell edit touches one row object, so one row is written.

   THE CONTRACT IS UNCHANGED. `saveAll(s)` still means "after this
   resolves, the disk holds exactly `s`". Records that left the
   snapshot are deleted; records that arrived or changed are put;
   records whose object is the same one we last wrote are left alone.
   Restoring is byte-for-byte what it was.

   WHAT IT COSTS TO KEEP. One `Map<id, object>` per store — pointers,
   not copies, so ~11,000 of them is a few hundred kilobytes against
   the megabytes the rows themselves already occupy.

   THE LEDGER MAY NEVER BE AHEAD OF THE DISK. It is updated only after
   the transaction resolves, and a failed write throws it away
   entirely, so the next save falls back to writing everything. A
   ledger that recorded an intention rather than a fact would quietly
   skip records that never landed.

   AND WRITES DO NOT OVERLAP. `saveAll` is chained behind whatever is
   already in flight. Two full-project writes racing was survivable
   because each was self-contained; two DIFFERENTIAL writes racing
   would read the same ledger and both decide a record was unchanged.
   ============================================================ */

/** Everything the last successful write put on disk, by store, as the
 *  object identities it wrote. `null` means "we do not know what is
 *  down there" — the next save writes everything. */
interface Ledger {
  meta: ProjectMeta | null
  entities: Map<string, EntityDef>
  groups: Map<string, GroupDef>
  rules: Map<string, RuleDef>
  rows: Map<string, RowData>
  views: Map<string, ViewDef>
  modules: Map<string, ModuleDef>
  roles: Map<string, RoleDef>
}

const emptyLedger = (): Ledger => ({
  meta: null,
  entities: new Map(),
  groups: new Map(),
  rules: new Map(),
  rows: new Map(),
  views: new Map(),
  modules: new Map(),
  roles: new Map(),
})

/** What one store's write comes to: the records to put, the keys to
 *  delete, and the ledger the write leaves behind if it lands. */
interface StoreDiff<T> {
  put: T[]
  remove: string[]
  next: Map<string, T>
  /** nothing to do at all — skip the store */
  quiet: boolean
}

/** THE DIFFERENCE, BY IDENTITY. `known` is what the last successful
 *  write left on disk; anything whose object is not that exact object
 *  is written again, because a changed record is always a new object
 *  in an immutable store. Exported for the unit test. */
export function diffStore<T extends { id: string }>(
  next: readonly T[],
  known: Map<string, T>,
): StoreDiff<T> {
  const nextMap = new Map<string, T>()
  const put: T[] = []
  for (const item of next) {
    nextMap.set(item.id, item)
    if (known.get(item.id) !== item) put.push(item)
  }
  const remove: string[] = []
  for (const id of known.keys()) if (!nextMap.has(id)) remove.push(id)
  return { put, remove, next: nextMap, quiet: put.length === 0 && remove.length === 0 }
}

class DexieProjectRepository implements ProjectRepository {
  /** what the last successful write left on disk */
  private ledger: Ledger | null = null

  /** the write in flight, so the next one queues behind it */
  private chain: Promise<void> = Promise.resolve()

  async load(): Promise<ProjectSnapshot | null> {
    const meta = await db.meta.get('default')
    if (!meta) {
      /* nothing on disk: the ledger says so exactly, so a first save
         on an empty database writes only what the project holds */
      this.ledger = emptyLedger()
      return null
    }
    const [entities, groups, rules, rows, views, modules, roles] = await Promise.all([
      db.entities.toArray(),
      db.groups.toArray(),
      db.rules.toArray(),
      db.rows.toArray(),
      db.views.toArray(),
      db.modules.toArray(),
      db.roles.toArray(),
    ])
    const snapshot = { meta, entities, groups, rules, rows, views, modules, roles }
    /* THE OBJECTS WE HAND UP ARE THE OBJECTS ON DISK. The store keeps
       these very objects until something edits them, so the first save
       after a load writes only what the session has actually changed
       rather than re-writing the file it just read. */
    this.ledger = {
      meta,
      entities: new Map(entities.map((x) => [x.id, x])),
      groups: new Map(groups.map((x) => [x.id, x])),
      rules: new Map(rules.map((x) => [x.id, x])),
      rows: new Map(rows.map((x) => [x.id, x])),
      views: new Map(views.map((x) => [x.id, x])),
      modules: new Map(modules.map((x) => [x.id, x])),
      roles: new Map(roles.map((x) => [x.id, x])),
    }
    return snapshot
  }

  saveAll(s: ProjectSnapshot): Promise<void> {
    /* one at a time, and a failed write must not stop the next one */
    const run = this.chain.then(
      () => this.write(s),
      () => this.write(s),
    )
    this.chain = run.catch(() => undefined)
    return run
  }

  private async write(s: ProjectSnapshot): Promise<void> {
    const known = this.ledger ?? emptyLedger()
    /* ============================================================
       AN UNKNOWN DISK IS RECONCILED AGAINST ITSELF.

       CAUGHT IN TESTING, AND IT IS THE ONLY WAY THIS DESIGN CAN LOSE.
       The first draft treated "no ledger" as "every record is new" and
       put them all. Putting is not replacing: records the incoming
       project does not have were left exactly where they were. A demo
       load that landed before `init()` had resolved therefore wrote 52
       fresh tables ON TOP of the 52 already down there, and the next
       open read back 156 — measured, at three loads.

       The old wholesale write did not have that bug because it cleared
       every store first. Clearing is not the answer either: it means a
       save that runs before the project has been read would empty the
       file and write nothing back over it.

       So an unknown disk is READ instead: the primary keys of each
       store, taken inside the same transaction, ARE the ledger this
       write needed. Everything the snapshot does not carry is deleted;
       everything it does is written. Identical in effect to the clear,
       and it can never delete anything the snapshot would not have
       replaced anyway.
       ============================================================ */
    const wholesale = this.ledger === null

    const entities = diffStore(s.entities, known.entities)
    const groups = diffStore(s.groups, known.groups)
    const rules = diffStore(s.rules, known.rules)
    const rows = diffStore(s.rows, known.rows)
    const views = diffStore(s.views, known.views)
    const modules = diffStore(s.modules, known.modules)
    const roles = diffStore(s.roles, known.roles)
    const metaChanged = known.meta !== s.meta

    if (
      !wholesale &&
      !metaChanged &&
      entities.quiet &&
      groups.quiet &&
      rules.quiet &&
      rows.quiet &&
      views.quiet &&
      modules.quiet &&
      roles.quiet
    ) {
      /* NOTHING MOVED. A pan, a selection or a re-render that stamped
         `updatedAt` on nothing else has no business opening a
         transaction. */
      return
    }

    const apply = async <T extends { id: string }>(
      table: EntityTable<T, 'id'>,
      diff: StoreDiff<T>,
    ): Promise<void> => {
      let gone = diff.remove
      if (wholesale) {
        /* what is actually down there, read inside this transaction */
        const onDisk = (await table.toCollection().primaryKeys()) as string[]
        gone = onDisk.filter((k) => !diff.next.has(k))
      }
      /* `id` IS the key on every one of these stores — `database.ts`
         declares all seven as `EntityTable<…, 'id'>` — but Dexie's
         `IDType` resolves through the generic and cannot see that from
         inside a function that is generic over T. The cast asserts the
         thing the seven call sites below already prove. */
      const keys = gone as unknown as Parameters<typeof table.bulkDelete>[0]
      if (gone.length > 0) await table.bulkDelete(keys)
      if (diff.put.length > 0) await table.bulkPut(diff.put)
    }

    /** meta holds one record, at the well-known key `default`; on an
     *  unknown disk anything else in that store is a leftover. */
    const applyMeta = async (): Promise<void> => {
      if (wholesale) {
        const onDisk = await db.meta.toCollection().primaryKeys()
        const gone = onDisk.filter((k) => k !== s.meta.id)
        if (gone.length > 0) await db.meta.bulkDelete(gone)
      }
      if (metaChanged || wholesale) await db.meta.put(s.meta)
    }

    await db.transaction(
      'rw',
      [
        db.meta,
        db.entities,
        db.groups,
        db.rules,
        db.rows,
        db.views,
        db.modules,
        db.roles,
      ],
      async () => {
        /* the stores are independent; the transaction is what makes
           them land together */
        await Promise.all([
          applyMeta(),
          apply(db.entities, entities),
          apply(db.groups, groups),
          apply(db.rules, rules),
          apply(db.rows, rows),
          apply(db.views, views),
          apply(db.modules, modules),
          apply(db.roles, roles),
        ])
      },
    )

    /* only now is it a fact */
    this.ledger = {
      meta: s.meta,
      entities: entities.next,
      groups: groups.next,
      rules: rules.next,
      rows: rows.next,
      views: views.next,
      modules: modules.next,
      roles: roles.next,
    }
  }

  async wipe(): Promise<void> {
    const run = this.chain.then(
      () => this.clearAll(),
      () => this.clearAll(),
    )
    this.chain = run.catch(() => undefined)
    await run
  }

  private async clearAll(): Promise<void> {
    /* THE LEDGER GOES FIRST, and it goes to `null` rather than to
       empty: between the two statements below the disk is in neither
       state, and a save that raced in must not believe it knows what
       is down there. */
    this.ledger = null
    await db.transaction(
      'rw',
      [
        db.meta,
        db.entities,
        db.groups,
        db.rules,
        db.rows,
        db.views,
        db.modules,
        db.roles,
      ],
      async () => {
        await Promise.all([
          db.meta.clear(),
          db.entities.clear(),
          db.groups.clear(),
          db.rules.clear(),
          db.rows.clear(),
          db.views.clear(),
          db.modules.clear(),
          db.roles.clear(),
        ])
      },
    )
    this.ledger = emptyLedger()
  }
}

export const repository: ProjectRepository = new DexieProjectRepository()
