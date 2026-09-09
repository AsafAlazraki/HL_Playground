/* ============================================================
   Empty states — a plate with the act that fixes it on it.
   Four of them: no sheets at all, a sheet with no columns, a sheet
   with no rows, and a view whose filters have hidden everything.

   THE PLATE IS A CARD — the src/ui primitive, raised, with the
   large inset. The drafting frame it used to draw for itself (a
   dashed border, four corner ticks, its own shadow) is gone with
   the local rule: a surface is a surface everywhere in the app or
   it is not a system. What is kept is the motif, the title step
   and the sentence — the parts that are this plate's own.

   THE ACT IS A BUTTON — the primitive too, primary because on an
   empty surface it is the one thing there is to press.
   ============================================================ */
import type { JSX, ReactNode } from 'react'
import { Button, Card } from '@/ui'
import { PlateGlyph } from './glyphs'

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
        <Card tone="raised" pad="lg">
          <div className="tb-plate-body">
            <PlateGlyph />
            <p className="tb-plate-title">{title}</p>
            <p className="tb-plate-sub">{body}</p>
            {children ? <div className="tb-plate-actions">{children}</div> : null}
          </div>
        </Card>
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
      <Button tone="primary" glyph="+" onClick={onCreate}>
        New table
      </Button>
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
      <Button tone="primary" glyph="+" onClick={onAddColumn}>
        Add first column
      </Button>
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
      <Button tone="primary" glyph="+" onClick={onAddRow}>
        Add first row
      </Button>
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
      <Button tone="neutral" onClick={onClear}>
        Show them all
      </Button>
    </Plate>
  )
}
