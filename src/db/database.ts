import Dexie, { type EntityTable } from 'dexie'
import type {
  EntityDef,
  GroupDef,
  ProjectMeta,
  RowData,
  RuleDef,
  ViewDef,
  ModuleDef,
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
  modules: EntityTable<ModuleDef, 'id'>
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

/* v3 adds the modules table — the places in the business an admin makes
   for their organisation. Dexie carries every existing store forward
   untouched, so this costs an existing project nothing: a sheet made
   before modules existed opens with no modules rather than an error.

   THE FAILURE THIS PREVENTS is the one that matters most for something
   a person builds by hand: a module took three clicks to make and
   vanished on the next refresh, because ProjectSnapshot never carried
   it. Everything else in the app survived a reload and this did not,
   which is the worst possible shape for a bug — it looks like the app
   works until the moment somebody's work is destroyed. */
db.version(3).stores({
  meta: 'id',
  entities: 'id',
  groups: 'id',
  rules: 'id',
  rows: 'id, entityId',
  views: 'id',
  modules: 'id',
})
