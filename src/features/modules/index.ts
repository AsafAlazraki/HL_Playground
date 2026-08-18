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

   THE DESIGNER IS A STRIP, NOT A SCREEN. `ModuleIndex` owns the one
   gear and mounts `ModuleDesigner` under its own header; no host
   passes a mode in and no host has to draw a way back out of one.
   Its handles write through the store's `updateModule` and through
   `@/features/views`' own view helpers — this feature keeps no
   second registry of anything.

   WHAT IS NOT BUILT YET, and is drawn DISABLED rather than absent:
     - reordering dashboard cards (Dashboard)
     - add / edit / delete / relate / quote / export inside a module
       (ModuleIndex draws a disabled control and one sentence for
       each capability that is switched on but not yet performed;
       the same sentence is on the switch that turns it on)
     - pointing a module at a picture or price column other than the
       one the table resolves, and putting extra columns on an index
       face. `ModuleDef` has no field to remember either, so the
       designer draws one disabled control and names the thing an
       admin can do today: change it on the table itself.
   ============================================================ */

export { Dashboard } from './Dashboard'
export type { DashboardProps } from './Dashboard'

export { NewModuleDialog } from './NewModuleDialog'
export type { NewModuleDialogProps } from './NewModuleDialog'

export { ModuleIndex } from './ModuleIndex'
export type { ModuleIndexProps } from './ModuleIndex'

/* The designer — exported for completeness, not because a host needs
   it. `ModuleIndex` mounts it behind its own gear; a second surface
   mounting it would be a second way into the same handles. */
export { ModuleDesigner } from './ModuleDesigner'
export type { ModuleDesignerProps } from './ModuleDesigner'

/* Reading a module — exported because the shell needs the same row
   count the dashboard card shows, and because nothing else may grow
   a second opinion about which column is a price. */
export {
  moduleTables,
  /* the tables the CATALOGUE draws — `moduleTables` minus the ones
     that are history rather than stock */
  listedTables,
  moduleRowCount,
  moduleHeldCount,
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

/* Reading a module as the DESIGNER reads it — which verbs are on, off
   or refused, and what every block is bound to. Exported so a future
   surface that has to explain a module (an export, a review, a role
   screen) says the same sentences the strip says. */
export {
  capabilityStates,
  capabilityWords,
  nextCapabilities,
  tableBindings,
  blockBindings,
  columnCandidates,
  effectiveColumns,
  moveId,
  moveViewBlock,
  DESIGNER_CAPABILITIES,
  NOT_YET_SAYS,
} from './designer'
export type {
  CapabilityState,
  DesignerCapability,
  TableBinding,
  BlockBinding,
} from './designer'

/* THE TENTH VERB — `configure`, "set what must always be true here".
   It is not in `ModuleCapability` yet and `ruleCapability.ts` carries
   the exact line the contract needs, plus the registry holding it in
   the meantime. Exported so a host can reset it with the project and
   so a test can assert the deliberate default: OFF. */
export {
  RULE_CAPABILITY,
  RULE_CAPABILITY_META,
  forgetModuleRuleCapabilities,
  moduleConfiguresRules,
  setModuleConfiguresRules,
  useModuleConfiguresRules,
} from './ruleCapability'
export type { RuleCapabilityKey } from './ruleCapability'

/* WHICH RULES GOVERN A MODULE — computed off the columns, never
   stored. Exported because a quote, an export or a review that has to
   explain a module must reach the same answer this panel draws. */
export {
  constraintsFor,
  flowRulesFor,
  kindOfConceptKey,
  moduleConceptKeys,
  moduleKinds,
  workbookRulesFor,
} from './moduleRules'
export type { FlowRole, GoverningFlowRule, GoverningSeed } from './moduleRules'

/* The rules panel — exported for completeness like the designer, not
   because a host mounts it. `ModuleDesigner` grows it as its fourth
   panel exactly when the verb that promises it is on. */
export { ModuleRulesPanel, rulesPanelId } from './ModuleRulesPanel'
export type { ModuleRulesPanelProps } from './ModuleRulesPanel'
