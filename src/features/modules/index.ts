/* ============================================================
   MODULES — a place in the business, made by the person who runs
   it. See docs/plan/MODULE_SYSTEM.md §§1, 3, 4.

   MOUNTING IT (the whole job — this feature mounts nothing itself):

     import { Dashboard, NewModuleDialog, ModuleIndex }
       from '@/features/modules'

     <Dashboard onOpen={setOpenModuleId} onNew={() => setNew(true)} />
     {isNew && <NewModuleDialog onClose={...} onCreated={setOpenModuleId} />}
     <ModuleIndex module={modules[openModuleId]} onOpen={(tableId, rowId) => …} />

   Each brings its own stylesheet and reads the store itself; the
   only props are the three navigation callbacks above.

   THE DETAIL SURFACE IS NOT HERE, and that is the point. A module's
   detail page is `@/features/views`' ViewPage, minted with the
   module by `createModule` and reachable as `module.viewId`. The
   drag, the offer, the refusal and the `__origin` audit all stay
   where they already work. `ModuleIndex.onOpen` hands out the table
   and the row, which is exactly what `ViewStage` takes.

   WHAT IS NOT BUILT YET, and is drawn DISABLED rather than absent:
     - reordering dashboard cards (Dashboard)
     - add / edit / delete / relate / quote / export inside a module
       (ModuleIndex draws a disabled control and one sentence for
       each capability that is switched on but not yet performed)
   Both belong to the module designer — plan §10, phase 2.
   ============================================================ */

export { Dashboard } from './Dashboard'
export type { DashboardProps } from './Dashboard'

export { NewModuleDialog } from './NewModuleDialog'
export type { NewModuleDialogProps } from './NewModuleDialog'

export { ModuleIndex } from './ModuleIndex'
export type { ModuleIndexProps } from './ModuleIndex'

/* Reading a module — exported because the shell needs the same row
   count the dashboard card shows, and because nothing else may grow
   a second opinion about which column is a price. */
export {
  moduleTables,
  moduleRowCount,
  priceReadOf,
  imageFieldOf,
  hasPictures,
  hasPrices,
  kindPlural,
  trailOf,
  buildEntries,
  groupEntries,
} from './read'
export type { PriceRead, IndexEntry, IndexGroup, IndexSection } from './read'
