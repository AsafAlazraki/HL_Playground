/* ============================================================
   Onboarding symbols — the brand mark, and the industry marks.

   ONE SET OF INDUSTRY / KIND ICONS EXISTS, and it is '@/lib/icons'
   (Phosphor). A second, hand-drawn set used to live in this file —
   four 72x44 "plates" (MarineSymbol / AutomotiveSymbol /
   MotorcycleSymbol / OtherSymbol on a shared dashed datum line).
   They were already switched off and kept only as documentation of
   the datum treatment, which meant the tree carried two competing
   drawings of a boat. They are DELETED. If the datum line is ever
   revived it belongs in one place, next to the icons it decorates.

   What is left here is deliberately NOT industry iconography:
   `HelmMark` is the product's own mark, and it is drawn by hand
   precisely because no icon library ships it.
   ============================================================ */

import type { ReactElement } from 'react'
import type { IndustryKey } from '@/types/model'
import { ICON_SIZE, INDUSTRY_ICON, weightFor } from '@/lib/icons'

const ink = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/** The HelmLogic mark — a DIMENSION BRACKET over three stacked plates.
 *
 *  Deliberately NOT a ship's wheel. ART_DIRECTION.md bans single-industry
 *  metaphors from the frame: this product also serves Automotive and
 *  Motorcycles, and a wheel would tell a bike dealer they are using
 *  somebody else's tool. A measured stack is the universal language of
 *  technical product documentation — it reads the same in any industry,
 *  and it says what the app actually does: it measures and structures. */
export function HelmMark({ size = 30 }: { size?: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
    >
      {/* dimension line with its two extension ticks */}
      <path d="M3.5 5.2 V2.6 M24.5 5.2 V2.6 M3.5 3.9 H24.5" {...ink} />
      {/* three plates, the middle one inset — a structured stack */}
      <rect x="3.5" y="8.4" width="21" height="4.6" rx="0.6" {...ink} />
      <rect x="7.2" y="15.1" width="17.3" height="4.6" rx="0.6" {...ink} />
      <rect x="3.5" y="21.8" width="21" height="4.6" rx="0.6" {...ink} />
    </svg>
  )
}

/* THE LOCKUP LIVES ON THE NAVY HALF NOW, and it is drawn once by
   `Onboarding.tsx` rather than by each screen.

   `BrandLockup` used to be exported from here so step 1 and the
   saved-copy screen could each draw their own — which is the shape
   of the drift it was written to fix, one level up: two callers, one
   component, and the moment a third screen appeared it was three
   places that had to agree about a badge. The slab has ONE head, the
   screens hang inside it, and the accent that used to fill the badge
   is barred on `--chrome` anyway (1.9:1, measured). `HelmMark` above
   is the whole of what this file still owes onboarding. */

/** Reading order of the four choices — Marine leads, because it is the
 *  one that works. */
export const INDUSTRY_ORDER: IndustryKey[] = [
  'marine',
  'automotive',
  'motorcycle',
  'other',
]

/* The industry marks come from Phosphor via '@/lib/icons' — the app's
   single register of iconography, shared with the table-kind rail, the
   new-table dialog and the table cards, so a boat is the same boat
   everywhere. Hand-rolling them was tried and was not good enough: a
   hull as an arc, and a motorcycle that read as a bicycle.

   IT IS DRAWN AT ITS OWN ASPECT NOW. The four marks used to be
   rendered at `ICON_SIZE.large` and then forced to 96x59 by a
   `width`/`height` pair in onboarding.css — a square glyph squashed by
   a third on the second screen anybody sees. The size is a parameter,
   the stylesheet does layout only, and the stroke weight comes from
   `weightFor` so it agrees with every other mark in the app at that
   size rather than being chosen here. */
export function IndustryMark({
  industry,
  size = ICON_SIZE.large,
}: {
  industry: IndustryKey
  size?: number
}): ReactElement {
  const Icon = INDUSTRY_ICON[industry]
  return <Icon size={size} weight={weightFor(size)} aria-hidden />
}
