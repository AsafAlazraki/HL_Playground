import Dexie, { type EntityTable } from 'dexie'
import type {
  EntityDef,
  GroupDef,
  ProjectMeta,
  RowData,
  RuleDef,
  ViewDef,
} from '@/types/model'

/** Local IndexedDB store. The repository (repository.ts) is the only
 *  module that should touch this directly. */
export const db = new Dexie('helmlogic-dynamic-config') as Dexie & {
  meta: EntityTable<ProjectMeta, 'id'>
  entities: EntityTable<EntityDef, 'id'>
  groups: EntityTable<GroupDef, 'id'>
  rules: EntityTable<RuleDef, 'id'>
  rows: EntityTable<RowData, 'id'>
  views: EntityTable<ViewDef, 'id'>
}

db.version(1).stores({
  meta: 'id',
  entities: 'id',
  groups: 'id',
  rules: 'id',
  rows: 'id, entityId',
})

/* v2 adds the views table. Dexie carries every existing store forward
   untouched, so an upgrade costs the user nothing. */
db.version(2).stores({
  meta: 'id',
  entities: 'id',
  groups: 'id',
  rules: 'id',
  rows: 'id, entityId',
  views: 'id',
})
