/* ============================================================
   TableWorkspace — the full-window data lens.

   Two ways in:
   1. No props — the sheet-switching workspace. Fills its container,
      owns entity switching (reads AND writes store `selection`), and
      hands one sheet at a time to TableSheet.
   2. `entityId` — the FOCUS lens: ONE entity, no tabs, no selection
      writes. This is what an entity-table node opens for heavy data
      entry, and it is why this component is demoted rather than
      deleted.

   Column widths live here so they survive a tab switch; every other
   view concern resets with the sheet.

   WHAT IT MOUNTS IS THE CATALOGUE, NOT THE SHEET. The register is
   the catalogue's `List` density (see `Catalogue.tsx`), so opening a
   table lands on its photographs and the spreadsheet is one press
   away rather than the other way round. This component's job is
   unchanged: which table, and the widths that outlive it.
   ============================================================ */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import type { EntityDef } from '@/types/model'
import type { ActionItem } from '@/lib/actions'
import { EntityTabs } from './EntityTabs'
import { NoEntitiesPlate } from './EmptyPlates'
import { Catalogue } from './Catalogue'
import { Toasts, useToasts } from './Toasts'
import { byCreatedAt } from './helpers'
import './table.css'

export function TableWorkspace({
  entityId,
  doors,
  onCount,
}: {
  /** FOCUS lens: pin the workspace to this one entity and hide the tabs */
  entityId?: string
  /** THE HOST'S OWN DOORS, carried to the register so they land on the
   *  same action bar as its controls. A workspace with no host stage —
   *  the blueprint's focus lens — passes none, and the bar simply has
   *  one group fewer. */
  doors?: ActionItem[]
  /** how many rows the sheet is showing, and how many it holds; the
   *  title block that says it lives above this component */
  onCount?: (shown: number, total: number) => void
} = {}): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const selection = useProjectStore((s) => s.selection)
  const select = useProjectStore((s) => s.select)
  const createEntity = useProjectStore((s) => s.createEntity)

  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const toasts = useToasts()

  const pinned = entityId !== undefined

  const ordered = useMemo<EntityDef[]>(
    () => Object.values(entities).sort(byCreatedAt),
    [entities],
  )

  const rowCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const e of ordered) out[e.id] = rowsByEntity[e.id]?.length ?? 0
    return out
  }, [ordered, rowsByEntity])

  /* the tab and the store's selection are one thing seen twice —
     unless the workspace is pinned to one entity, in which case the
     caller decided and the store's selection is none of its business */
  const activeId = pinned
    ? entities[entityId]
      ? entityId
      : undefined
    : selection?.kind === 'entity' && entities[selection.id]
      ? selection.id
      : ordered[0]?.id

  useEffect(() => {
    if (pinned || !activeId) return
    if (selection?.kind === 'entity' && selection.id === activeId) return
    select({ kind: 'entity', id: activeId })
  }, [pinned, activeId, selection, select])

  const onResizeColumn = useCallback((fieldId: string, w: number) => {
    setColWidths((prev) => {
      if (w <= 0) {
        if (!(fieldId in prev)) return prev
        const next = { ...prev }
        delete next[fieldId]
        return next
      }
      if (prev[fieldId] === w) return prev
      return { ...prev, [fieldId]: w }
    })
  }, [])

  const active = activeId ? entities[activeId] : undefined

  return (
    <div className="tb-root">
      {!pinned && ordered.length > 0 && (
        <EntityTabs
          entities={ordered}
          activeId={activeId}
          rowCounts={rowCounts}
          onSelect={(id) => select({ kind: 'entity', id })}
        />
      )}

      {active ? (
        /* THE FRONT DOOR IS THE CATALOGUE, and the register is a
           density of it. That inversion is PHASE_TWO §2.2 and §5 —
           "the register stops being the front door and becomes a
           view" — and it is why this component now mounts one thing
           instead of the sheet directly. Every prop the sheet had is
           still handed to it, one level down; nothing about editing,
           sorting, sectioning or the round trip moved. */
        <Catalogue
          key={active.id}
          entityId={active.id}
          colWidths={colWidths}
          onResizeColumn={onResizeColumn}
          pushToast={toasts.push}
          doors={doors}
          onCount={onCount}
        />
      ) : (
        <NoEntitiesPlate
          onCreate={() => {
            createEntity()
          }}
        />
      )}

      <Toasts items={toasts.items} onDismiss={toasts.dismiss} />
    </div>
  )
}
