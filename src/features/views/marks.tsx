/* ============================================================
   Marks — the only place this feature draws a symbol.

   Never hand-draw an icon. `@/lib/icons` is the single source of
   truth for what a table kind looks like, at the weights the
   drawing office uses.
   ============================================================ */

import type { CSSProperties, ReactElement } from 'react'
import { accentVar, type EntityDef, type TableKind } from '@/types/model'
import { ICON_SIZE, TABLE_KIND_ICON, weightFor } from '@/lib/icons'

export const kindOf = (kind: TableKind | undefined): TableKind => kind ?? 'custom'

export function KindMark({
  entity,
  size = ICON_SIZE.small,
}: {
  entity: EntityDef | undefined
  size?: number
}): ReactElement {
  const Icon = TABLE_KIND_ICON[kindOf(entity?.kind)]
  return (
    <span
      className="vw-mark"
      style={{ '--vw-accent': entity ? accentVar(entity.accent) : 'var(--ink-soft)' } as CSSProperties}
      aria-hidden="true"
    >
      <Icon size={size} weight={weightFor(size)} />
    </span>
  )
}
