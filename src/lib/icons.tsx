/* ============================================================
   ICONS — one source of truth, drawn by Phosphor.

   Hand-authored SVG was tried and was not good enough: it read as
   a generic icon set, which ART_DIRECTION.md calls a failure. This
   uses a real library so every mark is professionally drawn and
   consistent, and we spend our effort on layout and typography
   instead of re-deriving a boat outline.

   WEIGHT is the art direction. 'light' (1.5px at 24px) matches the
   hairline language of the chrome; 'thin' is used only at display
   sizes where 1px still reads. Never 'bold' or 'fill' — this is a
   drawing office, not a dashboard.
   ============================================================ */

import {
  Boat,
  CarProfile,
  Engine,
  MapPin,
  Motorcycle,
  Shapes,
  Stack,
  Storefront,
  Table,
  Tag,
  TreeStructure,
  TruckTrailer,
} from '@phosphor-icons/react'
import type { Icon, IconWeight } from '@phosphor-icons/react'
import type { IndustryKey, TableKind } from '@/types/model'

export type { Icon, IconWeight }

/** What each kind of table holds, as a mark. */
export const TABLE_KIND_ICON: Record<TableKind, Icon> = {
  boat: Boat,
  motor: Engine,
  trailer: TruckTrailer,
  accessory: Tag,
  package: Stack,
  dealer: Storefront,
  custom: Table,
}

/** The industries. Marine is built; the rest are drawn but not live. */
export const INDUSTRY_ICON: Record<IndustryKey, Icon> = {
  marine: Boat,
  automotive: CarProfile,
  motorcycle: Motorcycle,
  other: Shapes,
}

/** Structure / hierarchy — used by the "how is it structured?" step. */
export const StructureIcon = TreeStructure
export const LocationIcon = MapPin

/** Sizes we actually use, so callers stop inventing their own. */
export const ICON_SIZE = {
  /** inline with mono micro-labels */
  tiny: 13,
  /** table headers, list rows, chips */
  small: 16,
  /** dialog cards, panel rails */
  medium: 22,
  /** the industry choice, empty states */
  large: 40,
  /** the one hero mark on a screen */
  hero: 56,
} as const

/** Weight by size — thin lines vanish when small, so step up. */
export function weightFor(size: number): IconWeight {
  return size >= ICON_SIZE.large ? 'thin' : 'light'
}
