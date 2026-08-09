/* ============================================================
   Toolbar — quick search, active filter chips, the two controls that
   put the WHOLE table on one screen, the dimension read-out in both
   axes, and the row actions.

   Order is the reasoning: narrow it (search, chips) · look at all of
   it (collapse, fit) · how much of it am I seeing (rows, columns) ·
   change it (delete, add). Four controls is the budget for the whole
   feature and two of them are here; the other two are the band strip
   below and the band headers on the sheet itself.

   The middle two — the whole-table controls and the two-axis read-out
   — are drawn by `WholeTableControls.tsx`, because an EXPANDED card
   on the blueprint needs exactly the same instruments and there may
   only ever be one of each.
   ============================================================ */
import type { JSX } from 'react'
import type { FieldDef } from '@/types/model'
import type { ColumnFilter, SortState } from '@/features/table/core'
import { DimensionReadout, WholeTableControls } from './WholeTableControls'
import { CrossGlyph, SearchGlyph } from './glyphs'

function chipLabel(f: ColumnFilter, field: FieldDef | undefined): string {
  const name = field?.name ?? 'Column'
  if (f.kind === 'contains') return `${name} ∋ ${f.text}`
  if (f.selected.length === 0) return `${name}: none`
  if (f.selected.length <= 2) return `${name}: ${f.selected.join(', ')}`
  return `${name}: ${f.selected.length} values`
}

export function TableToolbar({
  fields,
  search,
  onSearch,
  filters,
  onRemoveFilter,
  sort,
  onClearSort,
  onClearView,
  shown,
  total,
  columns,
  shownColumns,
  hasBands,
  allFolded,
  fitted,
  canFit,
  onToggleBands,
  onToggleFit,
  selectedRows,
  onAddRow,
  onDeleteRows,
  canEdit,
}: {
  fields: FieldDef[]
  search: string
  onSearch: (s: string) => void
  filters: ColumnFilter[]
  onRemoveFilter: (fieldId: string) => void
  sort: SortState | null
  onClearSort: () => void
  onClearView: () => void
  shown: number
  total: number
  /** columns the table has, including any folded into a band */
  columns: number
  /** columns the sheet is drawing right now */
  shownColumns: number
  /** the table has bands, so there is something to collapse */
  hasBands: boolean
  allFolded: boolean
  fitted: boolean
  /** there is a sheet to fit — not a designed empty plate */
  canFit: boolean
  onToggleBands: () => void
  onToggleFit: () => void
  selectedRows: number
  onAddRow: () => void
  onDeleteRows: () => void
  canEdit: boolean
}): JSX.Element {
  const sortField = sort ? fields.find((f) => f.id === sort.fieldId) : undefined

  return (
    <div className="tb-toolbar">
      <label className="tb-search" title="Search every column, including calculated ones">
        <span className="tb-search-icon" aria-hidden="true">
          <SearchGlyph />
        </span>
        <input
          className="tb-search-input"
          type="text"
          value={search}
          spellCheck={false}
          placeholder="Search rows…"
          aria-label="Search rows"
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && search !== '') {
              e.stopPropagation()
              onSearch('')
            }
          }}
        />
        {search !== '' && (
          <button
            type="button"
            className="tb-search-clear"
            aria-label="Clear search"
            title="Clear search"
            onClick={() => onSearch('')}
          >
            <CrossGlyph />
          </button>
        )}
      </label>

      <div className="tb-chips">
        {sortField && sort && (
          <button
            type="button"
            className="tb-chip tb-chip-sort"
            title="Clear the sort — rows return to entry order"
            onClick={onClearSort}
          >
            <span className="tb-chip-key">Sort</span>
            <span className="tb-chip-val">
              {sortField.name} {sort.dir === 'asc' ? '↑' : '↓'}
            </span>
            <CrossGlyph />
          </button>
        )}
        {filters.map((f) => {
          const field = fields.find((x) => x.id === f.fieldId)
          return (
            <button
              key={f.fieldId}
              type="button"
              className="tb-chip"
              title={`Remove the ${field?.name ?? 'column'} filter`}
              onClick={() => onRemoveFilter(f.fieldId)}
            >
              <span className="tb-chip-key">Filter</span>
              <span className="tb-chip-val">{chipLabel(f, field)}</span>
              <CrossGlyph />
            </button>
          )
        })}
      </div>

      {/* -- SEEING ALL OF IT, and HOW MUCH AM I SEEING ---------
          Both are shared with the expanded card on the blueprint —
          see WholeTableControls.tsx. */}
      <WholeTableControls
        hasBands={hasBands}
        allFolded={allFolded}
        fitted={fitted}
        canFit={canFit}
        onToggleBands={onToggleBands}
        onToggleFit={onToggleFit}
      />

      <DimensionReadout
        shown={shown}
        total={total}
        columns={columns}
        shownColumns={shownColumns}
        onClearView={onClearView}
      />

      <div className="tb-actions">
        <button
          type="button"
          className="btn btn-danger tb-del-btn"
          disabled={selectedRows === 0}
          title={
            selectedRows === 0
              ? 'Select whole rows from the number gutter to delete them'
              : `Delete the ${selectedRows} selected ${selectedRows === 1 ? 'row' : 'rows'}`
          }
          onClick={onDeleteRows}
        >
          {selectedRows === 0
            ? 'Delete rows'
            : `Delete ${selectedRows} ${selectedRows === 1 ? 'row' : 'rows'}`}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canEdit}
          title={canEdit ? 'Append a row' : 'Draft a column first'}
          onClick={onAddRow}
        >
          <span aria-hidden="true">+</span> Row
        </button>
      </div>
    </div>
  )
}
