/* ============================================================
   MODULES — a place in the business, made by the person who runs
   it. See docs/plan/MODULE_SYSTEM.md §§1, 3, 4.

   MOUNTING IT (the whole job — this feature mounts nothing itself):

     import { Dashboard, NewModuleDialog, ModuleIndex, ModuleSettings }
       from '@/features/modules'

     <Dashboard onOpen={setOpenModuleId} onSettings={openSetup} onNew={…} />
     {isNew && <NewModuleDialog onClose={...} onCreated={setOpenModuleId} />}
     <ModuleIndex module={m} onOpen={(tableId, rowId) => …} onSettings={…} />
     <ModuleSettings module={m} onDone={backToCatalogue} />

   Each brings its own stylesheet and reads the store itself; the
   only props are the navigation callbacks above.

   THE DETAIL SURFACE IS NOT HERE, and that is the point. A module's
   detail page is `@/features/views`' ViewPage, minted with the
   module by `createModule` and reachable as `module.viewId`. The
   drag, the offer, the refusal and the `__origin` audit all stay
   where they already work. `ModuleIndex.onOpen` hands out the table
   and the row, which is exactly what `ViewStage` takes.

   THERE IS ONE SET-UP SURFACE AND IT IS `ModuleSettings`. Every
   change to a module — its name, its mark, who may act in it, its
   verbs, its tables, its item page and its rules — is made there and
   nowhere else. `ModuleDesigner` is mounted INSIDE it rather than
   beside it, so `tableIds` and `capabilities` have one writer each;
   the index is the catalogue and carries no editing handles of its
   own. ModuleSettings.tsx carries the whole argument, including what
   moved out of the index and where it went.

   Its handles write through the store's `updateModule`, the store's
   new `roles` slice, and `@/features/views`' own view helpers — this
   feature keeps no second registry of anything.

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

/* THE WORKSPACE IS WHAT A HOST MOUNTS FOR A MODULE — five tabs, of
   which the catalogue is one. It keeps the name `ModuleIndex` because
   that is the name a host already asks for and the props it already
   passes; what changed is what stands behind it. `ModuleStock` is the
   catalogue on its own, exported because the workspace is not the only
   honest place to draw one. */
export { ModuleIndex } from './ModuleWorkspace'
export type { ModuleIndexProps, ModuleTab } from './ModuleWorkspace'

export { ModuleStock } from './ModuleIndex'
export type { ModuleStockProps } from './ModuleIndex'

export { ModuleHome, ModulePricing, ModuleQuotes } from './ModulePanels'
export type { ModuleHomeProps, ModulePricingProps, ModuleQuotesProps } from './ModulePanels'

/* WHAT THE MODULES GRID DRAWS A CARD FOR. A module holding one table
   is one place; a module holding more is one place per table, so
   Highfield, Yamaha and Stacer are doors rather than names inside a
   card called Boats. Exported because a picker, an export or a review
   that has to list the places must reach the same answer this grid
   draws. */
export { moduleAt, placeFilters, placesOf, placesUnder } from './places'
export type { Place, PlaceFilter } from './places'

/* WHICH DOOR SOMEBODY CAME THROUGH — the seam the shell's route does
   not carry yet, and what it is and is not. */
export { forgetPlaces, placeFor, rememberPlace } from './openPlace'

export { ModuleSettings } from './ModuleSettings'
export type { ModuleSettingsProps } from './ModuleSettings'

/* WHO MAY DO WHAT, ACROSS THE WHOLE DEALERSHIP — the screen the rail's
   SETTINGS door promises. The Dashboard mounts it in place of the list
   of places; it is exported because a host that ever gives the access
   screen a stage of its own needs it, and because `AccessGrid` is the
   ONE editor for `ModuleDef.access` and nothing may grow a second. */
export { AccessScreen } from './AccessScreen'
export type { AccessScreenProps } from './AccessScreen'

export { AccessGrid } from './AccessGrid'
export type { AccessGridProps } from './AccessGrid'

/* The designer — exported for completeness, not because a host needs
   it. `ModuleSettings` mounts it as its middle; a second surface
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
  branchOf,
  buildEntries,
  groupEntries,
  /* WHAT THIS PLACE IS MADE OF, and how it should be drawn. Exported
     because the dashboard card, the index header and the designer all
     print the same sentence, and because the store asks `moduleFace`
     what a new module is born looking like. Nothing else may grow a
     second opinion about any of it. */
  moduleCensus,
  censusLine,
  /* WHO MAY DO WHAT HERE, counted — absent access is unrestricted and
     says nothing. Exported because a card, a module's own header and
     the settings surface that writes it must all reach the same
     verdict about a grant the module can no longer honour. */
  accessReading,
  moduleFace,
  PICTURE_FLOOR,
  categoryDrawers,
  drawerKey,
  DRAWER_FLOOR,
} from './read'
export type {
  AccessReading,
  PriceRead,
  IndexEntry,
  IndexGroup,
  IndexSection,
  ModuleCensus,
  CensusBranch,
  ModuleFace,
  Drawer,
} from './read'

/* IS THIS MODULE ONE PLACE, OR A BAG? The rule the owner's "split the
   modules better" becomes when it is written down: every table agrees
   on what sort of thing it holds, and `custom` is the absence of a
   kind rather than one two tables can share. Exported so an export, a
   review or a role screen reaches the same verdict the designer draws. */
export { declaredKind, siblingOffer, splitReading } from './split'
export type { SiblingOffer, SplitPart, SplitReading } from './split'

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
  /* WHERE A CARD SITS ON THE DASHBOARD — one move, as the writes that
     make it. Exported so the order a person arranges by hand is
     worked out in one place rather than in the component drawing it. */
  reorderPlan,
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
  configuringCount,
  moduleConfiguresRules,
  setModuleConfiguresRules,
  useConfiguringCount,
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

/* ============================================================
   WHO MAY DO WHAT — the access rules.

   Exported because the whole point of `ModuleAccess` is that nothing
   else may grow a second opinion about what a role may do here.
   `mayDo` is the one question any surface should ask, and it can
   never answer true beyond `ModuleDef.capabilities`.

   WHAT THE CONTRACT STILL OWES THIS, stated rather than worked
   around: `ProjectExport` (model.ts) carries entities, groups, rules,
   rows, org, views, modules and constraints — and no roles. So a
   project exported and imported comes back with every module's
   `access` intact and nothing to resolve the role ids against;
   `orphanRoleIds` is what that looks like on screen, and it says so
   rather than dropping the grants silently. A `roles?: RoleDef[]`
   key on `ProjectExport`, and `roles` in `src/features/io`'s
   envelope, is the whole fix. Roles ARE persisted and restored
   locally: the store carries a `roles` slice and Dexie a v4 table.
   ============================================================ */
export {
  accessCensus,
  accessRows,
  capabilityLabel,
  capabilitySays,
  grantNote,
  grantedTo,
  isUnrestricted,
  mayDo,
  offeredCapabilities,
  orphanGrants,
  orphanRoleIds,
  roleReach,
  withGrant,
  withoutOrphans,
  withoutRole,
} from './access'
export type { AccessCensus, AccessRow, OrphanGrants } from './access'

/* THE MODULE'S OWN MARK, and the ceiling on it. Exported so an export,
   a review or a second surface that ever draws a logo reaches the same
   bound rather than inventing a looser one. */
export {
  LOGO_KEEP_BYTES,
  LOGO_MAX_EDGE,
  LOGO_REFUSE_BYTES,
  bytesOfDataUrl,
  fitWithin,
  logoFromAddress,
  logoPlan,
  readLogoFile,
  shrinkNote,
  sizeSay,
} from './logo'
export type { LogoPlan, LogoRead } from './logo'

/* WHAT ELSE IS ATTACHED TO A MODULE — counted off the project, never
   listed in code. Exported for the same reason every other reader here
   is: an export or a review that has to explain a module must reach
   the same six answers this page draws. */
export { linkedThings, namedFew, LINK_NAME_CAP } from './links'
export type { LinkedThing, LinkHome, LinkReadArgs } from './links'
