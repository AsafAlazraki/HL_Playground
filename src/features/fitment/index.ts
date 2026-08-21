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
   ============================================================ */

export { FanOut } from './FanOut'
export type { FanOutProps } from './FanOut'
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
