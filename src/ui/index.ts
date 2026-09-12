/* ============================================================
   THE PRIMITIVES LAYER.

   Five components, each with its own co-located stylesheet, in a
   namespace (`ui-`) that appears in none of the 47 stylesheets
   and none of the 166 components that were here before them.

   WHY IT EXISTS — the survey that argued for it, run over the
   tree the day this landed. A "treatment" below is a class that
   draws its own ground AND its own box; the app column drops
   src/design, which is the /design.html reference page rather
   than anything a dealer opens.

       treatment      distinct   stylesheets   app-only
       button              295            39   278 / 34
       card                662            41   612 / 36
       row                 220            36   207 / 31
       section head        121            25   105 / 22
       field                33            19    32 / 19

   137 of the 295 buttons are missing at least one of hover,
   press and focus, which DESIGN_PRINCIPLES rule 8 says every
   pressable thing has; 90 have no `:active` rule at all. The 121
   section heads use 11 distinct font-sizes and 16 distinct
   letter-spacings for a style the system defines exactly once,
   as `--t-label-*`. That is the argument: a redesign of this app
   currently has to be done between 22 and 39 times, and the
   drift between those copies is what "the app looks bad" means
   when you measure it instead of looking at it.

   WHY THIS IS NOT THE SHARED OVERRIDE LAYER CLAUDE.md FORBIDS.
   The rule is "do not create a shared override layer — two
   stylesheets fighting over one screen is worse than the problem
   it solves", and it is a good rule. Four things keep it true
   here, by construction rather than by intention:

     1. NOTHING TO FIGHT WITH. The `ui-` namespace is unused in
        the existing tree, verified. No selector in these five
        files can match an element any feature rule also matches.
     2. NOTHING REACHES OUT. Every selector is one class, or one
        class plus one of its own ARIA states. No element
        selectors, no `*`, no `!important`, no resets, and no
        selector that descends into markup this layer did not
        render.
     3. NOTHING LOADS UNTIL IT IS USED. Each stylesheet is
        imported by its own component, not by main.tsx. A screen
        that has not adopted a primitive does not load a byte of
        it. An override layer is global by definition; this is
        the opposite.
     4. ADOPTION IS DELETION, ENFORCED BY THE TYPES. None of the
        five accepts `className` or `style`. A feature cannot
        keep its `.xx-btn` rule pointing at the same element and
        layer this underneath — adopting <Button> means deleting
        that rule, because there is no way to half-adopt. If a
        screen needs a look this layer does not have, the answer
        is a new tone here, argued once, for every screen. That
        is what stops five files becoming the forty-eighth.

   WHAT IS DELIBERATELY NOT HERE. No feature has been converted.
   Converting while inventing is how a primitives layer ends up
   fitting one screen and nothing else; the conversion is the
   next pass, and it should delete CSS rather than add it.
   ============================================================ */

export { Button } from './Button'
export type { ButtonProps, ButtonSize, ButtonTone } from './Button'

export { Card } from './Card'
export type { CardKind, CardPad, CardProps, CardTone } from './Card'

export { Row } from './Row'
export type { RowProps } from './Row'

export { Field } from './Field'
export type { FieldProps, FieldType } from './Field'

export { SectionHead } from './SectionHead'
export type { SectionHeadLevel, SectionHeadProps } from './SectionHead'

/* ADDED BY THE REBUILD. `Stepper` is the first primitive written
   for the two-register system rather than retrofitted onto it: it
   is SHOWROOM only, it exists because `DESIGN_SYSTEM.md` §9.6
   reversed PHASE_TWO's "no step rail and no progress at all", and
   it beats the app it replaces on the one thing that rail got
   wrong — production's is display-only. */
export { Stepper } from './Stepper'
export type { Step, StepperProps } from './Stepper'

/* THE MOTION LAYER. No React in it: the physics, the durations and
   the orchestration are data, and they were inside a provider
   module until the rebuild split them out. `features/views/
   stillness.tsx` re-exports them so its fourteen consumers did not
   have to move in the same commit. */
export {
  CAM_FIT_MS,
  CAM_MS,
  cameraMs,
  D_EXIT,
  D_FAST,
  D_MED,
  D_PRESS,
  D_SCENE,
  D_SHEET,
  D_SLOW,
  enter,
  INSTANT,
  RISE,
  SPRING,
  SPRING_GRABBED,
  SPRING_QUICK,
  SPRING_SLOW,
  stagger,
  STAGGER_MS,
  staggerVar,
  transitionFor,
} from './motion'

/* THE SHOWROOM SURFACES. `ProductStage` is the register's §2
   requirement — the thing being sold, present and large. `PriceBar`
   is the figure that stays on screen for the whole of a build, and
   never invents a tax rate the price file does not carry. */
export { ProductStage } from './ProductStage'
export type { ProductStageProps, StagePicture } from './ProductStage'

export { PriceBar } from './PriceBar'
export type { PriceBarProps, PriceBarTax, PriceLevelChoice } from './PriceBar'

/* THE MARQUE'S ENTRANCE — reactbits Split Text ported native, and
   the mechanism `DESIGN_SYSTEM.md` §2 asks every Showroom screen
   for. See `Marque.tsx` for why it splits on words and not glyphs. */
export { Completion } from './Completion'
export type { CompletionProps, CompletionStep, CompletionTax } from './Completion'

export { Marque } from './Marque'
export type { MarqueProps } from './Marque'
