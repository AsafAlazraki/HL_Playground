/* ============================================================
   FITMENT — the fan-out.

   What the app knows about WHAT GOES WITH WHAT, counted off the
   loaded sheet rather than quoted from a specification. The stage
   in src/app mounts `FanOut`; everything else here is the reading
   behind it, and it is pure so a test can measure it against the
   whole price file without a browser.

   The rule ENGINE is not here. F8 — the one rule in the price file
   that both holds everywhere and actually narrows a list — lives in
   `@/features/constraints/trailerFitment` and is called, never
   re-implemented. There is one selector in this app and there will
   go on being one.

   ── AND ONE THING THAT IS NOT A COUNT ─────────────────────────

   `Rig` takes ONE hull and runs the business's own rules against it
   through `@/lib/configure` — an arc-consistency solver that records
   the reason at the moment an option is removed, and that nothing in
   this app had ever called. Same discipline as the fan-out: the
   reading (`rigReading.ts`) is pure and is measured against the whole
   price file in `rig.test.ts`, and no sentence a person reads is
   written here. The solver is not re-implemented either, and it is
   the second engine this directory draws and never duplicates.
   ============================================================ */

export { FanOut } from './FanOut'
export type { FanOutProps } from './FanOut'

/* THE RIG — one hull, every rule the business has written run
   against it, and the reason beside everything that no longer fits.
   The reading is pure and is measured against the whole price file
   in `rig.test.ts`; `Rig` is the surface, mounted by `FanOut`. */
export { Rig } from './Rig'
export type { RigProps } from './Rig'
export {
  readRig,
  readStarters,
  CHOICE_CAP,
  DRAW_CAP,
  CATALOGUE_CAP,
  type OptionState,
  type RigCandidate,
  type RigCatalogue,
  type RigFact,
  type RigHull,
  type RigInput,
  type RigNote,
  type RigOption,
  type RigProject,
  type RigReading,
  type RigReason,
  type RigSlot,
  type RigStarter,
} from './rigReading'
export {
  readFanOut,
  readRoles,
  subjectKindOf,
  type Fan,
  type FanProject,
  type FanReading,
  type Provenance,
  type RoleSpread,
  type Strand,
  type StrandGroup,
} from './reading'
