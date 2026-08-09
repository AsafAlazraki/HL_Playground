/* ============================================================
   Empty states — drafting plates, never placeholders.
   Four of them: no sheets at all, a sheet with no columns, a sheet
   with no rows, and a view whose filters have hidden everything.
   ============================================================ */
import type { JSX, ReactNode } from 'react'
import { PlateGlyph, PlateTicks } from './glyphs'

function Plate({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children?: ReactNode
}): JSX.Element {
  return (
    <div className="tb-platewrap">
      <div className="tb-plate">
        <PlateTicks />
        <PlateGlyph />
        <p className="tb-plate-title">{title}</p>
        <p className="tb-plate-sub">{body}</p>
        {children ? <div className="tb-plate-actions">{children}</div> : null}
      </div>
    </div>
  )
}

export function NoEntitiesPlate({
  onCreate,
}: {
  onCreate: () => void
}): JSX.Element {
  return (
    <Plate
      title="No tables yet"
      body="This is where a table's columns and rows are laid out. Make the first one and it lands here."
    >
      <button className="btn btn-primary" onClick={onCreate}>
        <span aria-hidden="true">+</span> New table
      </button>
    </Plate>
  )
}

export function NoFieldsPlate({
  entityName,
  onAddColumn,
}: {
  entityName: string
  onAddColumn: () => void
}): JSX.Element {
  return (
    <Plate
      title="No columns yet"
      body={`${entityName} has nothing to hold. Add the first column and start typing straight into it.`}
    >
      <button className="btn btn-primary" onClick={onAddColumn}>
        <span aria-hidden="true">+</span> Add first column
      </button>
    </Plate>
  )
}

export function NoRowsPlate({
  entityName,
  onAddRow,
}: {
  entityName: string
  onAddRow: () => void
}): JSX.Element {
  return (
    <Plate
      title="Nothing logged yet"
      body={`The columns are ready. Add the first ${entityName.toLowerCase()} row — or paste a block straight from Excel to fill the whole table at once.`}
    >
      <button className="btn btn-primary" onClick={onAddRow}>
        <span aria-hidden="true">+</span> Add first row
      </button>
    </Plate>
  )
}

export function NoMatchPlate({
  total,
  onClear,
}: {
  total: number
  onClear: () => void
}): JSX.Element {
  return (
    <Plate
      title="Nothing matches"
      body={`All ${total} ${total === 1 ? 'row is' : 'rows are'} still here — the search and the columns you narrowed simply hide every one of them.`}
    >
      <button className="btn" onClick={onClear}>
        Show them all
      </button>
    </Plate>
  )
}
