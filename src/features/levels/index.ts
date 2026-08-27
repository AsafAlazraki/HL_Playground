/* ============================================================
   LEVELS — set a value once, at any rung, and every row beneath
   it takes it.

   MOUNT IT LIKE THIS

     import { LevelEditor } from '@/features/levels'

     <LevelEditor />                        // opens on its own picker
     <LevelEditor entityId={id} />          // pinned to one table
     <LevelEditor entityId={id} push={push} />  // into a surface that
                                                // owns a toast strip

   With no `push` the notes go to the app-wide bus that `UndoKeys`
   already draws, so nothing else has to be mounted for UNDO to
   work.

   THE ONE THING A LATER SESSION MUST NOT UNDO. A level does not
   store anything. Setting at a level writes real cells through
   `useProjectStore.updateCell`, which is why the value reaches
   quotes, view pages, modules, rules and exports without any of
   them being told about levels. `levels.ts`'s header argues this
   at length; read it before adding a defaults table.
   ============================================================ */

export { LevelEditor } from './LevelEditor'
export type { LevelEditorProps } from './LevelEditor'

/* The model and the arithmetic, for anything that wants to state a
   blast radius or set a level without this screen. */
export {
  TABLE_LEVEL_KEY,
  buildLevelModel,
  columnRefusal,
  describeDone,
  isBlankText,
  levelColumns,
  levelKeyOf,
  planLines,
  planReset,
  planSet,
  standingsAt,
  tallyAt,
  trailTo,
  valueText,
} from './levels'
export type {
  BuildOpts,
  LevelColumn,
  LevelModel,
  LevelNode,
  PlanInput,
  PlanLine,
  PlanLineTone,
  RefLabel,
  RowStanding,
  SetPlan,
  Standing,
  Tally,
  TallyEntry,
} from './levels'

/* The mutation. One synchronous loop, one undo step, one toast. */
export { applyLevelPlan } from './apply'
export type { ApplyResult } from './apply'

/* The store seams, for a shell that wants to offer the table
   choice in its own chrome rather than through the picker. */
export { useLevelModel, useLevelTables, useRefLabel, useRefOptions } from './useLevels'
export type { LevelTable, RefOption } from './useLevels'
