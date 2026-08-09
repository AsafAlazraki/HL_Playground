import { db } from './database'
import type {
  EntityDef,
  GroupDef,
  ProjectMeta,
  RowData,
  RuleDef,
  ViewDef,
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

class DexieProjectRepository implements ProjectRepository {
  async load(): Promise<ProjectSnapshot | null> {
    const meta = await db.meta.get('default')
    if (!meta) return null
    const [entities, groups, rules, rows, views] = await Promise.all([
      db.entities.toArray(),
      db.groups.toArray(),
      db.rules.toArray(),
      db.rows.toArray(),
      db.views.toArray(),
    ])
    return { meta, entities, groups, rules, rows, views }
  }

  async saveAll(s: ProjectSnapshot): Promise<void> {
    await db.transaction(
      'rw',
      [db.meta, db.entities, db.groups, db.rules, db.rows, db.views],
      async () => {
        await Promise.all([
          db.meta.clear(),
          db.entities.clear(),
          db.groups.clear(),
          db.rules.clear(),
          db.rows.clear(),
          db.views.clear(),
        ])
        await Promise.all([
          db.meta.put(s.meta),
          s.entities.length ? db.entities.bulkPut(s.entities) : Promise.resolve(),
          s.groups.length ? db.groups.bulkPut(s.groups) : Promise.resolve(),
          s.rules.length ? db.rules.bulkPut(s.rules) : Promise.resolve(),
          s.rows.length ? db.rows.bulkPut(s.rows) : Promise.resolve(),
          s.views.length ? db.views.bulkPut(s.views) : Promise.resolve(),
        ])
      },
    )
  }

  async wipe(): Promise<void> {
    await db.transaction(
      'rw',
      [db.meta, db.entities, db.groups, db.rules, db.rows, db.views],
      async () => {
        await Promise.all([
          db.meta.clear(),
          db.entities.clear(),
          db.groups.clear(),
          db.rules.clear(),
          db.rows.clear(),
          db.views.clear(),
        ])
      },
    )
  }
}

export const repository: ProjectRepository = new DexieProjectRepository()
