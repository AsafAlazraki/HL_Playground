/* ============================================================
   TABLE KIND SYMBOLS — one mark per kind, drawn by Phosphor.

   These used to be hand-authored SVG on a 24-unit grid. They were
   rejected: a boat re-derived from memory reads as a wobbly clip
   art next to real typography, and every new kind meant drawing a
   new one badly. The marks now come from '@/lib/icons', which is
   the app's single source of truth for iconography — the rail, the
   dialog, the table card and the shell all end up asking the same
   library for the same glyph, so a boat is the same boat
   everywhere.

   WEIGHT IS THE ART DIRECTION, and it is a function of size, not a
   choice made per call site: `weightFor` gives 'light' (a hairline
   at chrome sizes) and steps down to 'thin' only where 1px still
   reads. Never 'bold', never 'fill' — this is a drawing office.

   The export contract is unchanged (`TableKindSymbol({kind, size})`
   and `kindOf`), so the shell, the whiteboard and the table card
   keep compiling without knowing any of this happened.
   ============================================================ */
import type { ReactElement } from 'react'
import { TABLE_KINDS, type TableKind } from '@/types/model'
import { TABLE_KIND_ICON, weightFor } from '@/lib/icons'
import './tablekit.css'

export interface TableKindSymbolProps {
  kind: TableKind
  size?: number
  /** give the mark an accessible name when it stands without a label */
  title?: string
}

/** The mark for a table kind, inked in `currentColor`. */
export function TableKindSymbol({
  kind,
  size = 20,
  title,
}: TableKindSymbolProps): ReactElement {
  const Mark = TABLE_KIND_ICON[kind] ?? TABLE_KIND_ICON.custom
  return (
    <Mark
      className="tk-symbol"
      size={size}
      weight={weightFor(size)}
      /* colour is inherited, never declared — the accent lives on the
         parent as `--tk-ink`, and the mark just takes the ink it is given */
      color="currentColor"
      alt={title}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    />
  )
}

/** Convenience for callers that only hold an `EntityDef.kind`. */
export const kindOf = (kind: TableKind | undefined): TableKind =>
  kind && kind in TABLE_KINDS ? kind : 'custom'
