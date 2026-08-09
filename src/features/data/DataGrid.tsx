/* ============================================================
   DataGrid — the DATA tab of the inspector.
   A drafting-sheet data entry table: dimension-line row count,
   sticky column headers with type tags, per-type editors,
   computed FX columns, red-pencil delete strikes.
   ============================================================ */
import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  FIELD_TYPES,
  type CellValue,
  type EntityDef,
  type FieldType,
  type RowData,
} from '@/types/model'
import { evaluateRowValues, type EvalContext } from '@/lib/formula'
import { Cell } from './Cell'
import { isEmptyCell, pad2 } from './helpers'
import './datagrid.css'

/** minimum column width per field type (px) — the grid scrolls sideways */
const COL_MIN: Record<FieldType, number> = {
  text: 132,
  number: 104,
  boolean: 76,
  date: 138,
  select: 128,
  reference: 148,
  formula: 118,
  /* a thumbnail strip needs room for ~3 before it scrolls */
  image: 168,
}

const NO_ROWS: RowData[] = []

/* ---------------------------------------------------------- */
/* corner registration ticks (drafting plate motif)           */
/* ---------------------------------------------------------- */

function PlateTicks(): JSX.Element {
  return (
    <>
      <span className="dg-tick dg-tick-tl" aria-hidden="true" />
      <span className="dg-tick dg-tick-tr" aria-hidden="true" />
      <span className="dg-tick dg-tick-bl" aria-hidden="true" />
      <span className="dg-tick dg-tick-br" aria-hidden="true" />
    </>
  )
}

function PlateGlyph(): JSX.Element {
  return (
    <svg className="dg-plate-glyph" viewBox="0 0 56 34" aria-hidden="true">
      <rect x="1" y="1" width="54" height="32" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="1" y1="11" x2="55" y2="11" stroke="currentColor" strokeWidth="1" />
      <line x1="1" y1="22" x2="55" y2="22" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
      <line x1="16" y1="1" x2="16" y2="33" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/* ---------------------------------------------------------- */
/* one data row                                               */
/* ---------------------------------------------------------- */

function DgRow({
  entity,
  row,
  index,
  computed,
  entities,
  rowsByEntity,
}: {
  entity: EntityDef
  row: RowData
  index: number
  computed: Record<string, CellValue> | undefined
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
}): JSX.Element {
  const updateCell = useProjectStore((s) => s.updateCell)
  const deleteRow = useProjectStore((s) => s.deleteRow)
  const [armed, setArmed] = useState(false)

  return (
    <tr
      className={'dg-row' + (armed ? ' dg-row-armed' : '')}
      onMouseLeave={() => setArmed(false)}
    >
      <td className="dg-cell dg-cell-gutter">
        <span className="dg-rownum">{pad2(index + 1)}</span>
        <button
          type="button"
          className={'dg-del' + (armed ? ' dg-del-armed' : '')}
          aria-label={
            armed ? `Confirm — strike row ${index + 1}` : `Delete row ${index + 1}`
          }
          title={armed ? 'Click again to strike this row' : 'Delete row'}
          onClick={() => {
            if (armed) deleteRow(entity.id, row.id)
            else setArmed(true)
          }}
          onBlur={() => setArmed(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setArmed(false)
          }}
        >
          {armed ? (
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path
                d="M1.4 5.4 L4 8 L8.8 1.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <path
                d="M1.6 1.6 L8.4 8.4 M8.4 1.6 L1.6 8.4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="square"
              />
            </svg>
          )}
        </button>
      </td>

      {entity.fields.map((f) => {
        const value = f.id in row.values ? row.values[f.id] : null
        const reqEmpty =
          f.required === true && f.type !== 'formula' && isEmptyCell(value)
        const target =
          f.type === 'reference' && f.refEntityId
            ? entities[f.refEntityId]
            : undefined
        return (
          <td
            key={f.id}
            className={
              'dg-cell' +
              (f.type === 'formula' ? ' dg-cell-fx' : '') +
              (reqEmpty ? ' dg-cell-req' : '')
            }
            title={reqEmpty ? `${f.name} is required` : undefined}
          >
            <Cell
              key={`${f.id}:${f.type}`}
              field={f}
              value={value ?? null}
              rowIndex={index + 1}
              computed={computed?.[f.id] ?? null}
              targetEntity={target}
              targetRows={target ? (rowsByEntity[target.id] ?? NO_ROWS) : undefined}
              commit={(v) => updateCell(entity.id, row.id, f.id, v)}
            />
          </td>
        )
      })}
    </tr>
  )
}

/* ---------------------------------------------------------- */
/* the grid                                                   */
/* ---------------------------------------------------------- */

export function DataGrid({ entityId }: { entityId: string }): JSX.Element | null {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const addRow = useProjectStore((s) => s.addRow)
  const setInspectorTab = useProjectStore((s) => s.setInspectorTab)

  const entity = entities[entityId] as EntityDef | undefined
  const rows = rowsByEntity[entityId] ?? NO_ROWS

  const ctx = useMemo<EvalContext>(
    () => ({
      lookupRow: (eid: string, rid: string) =>
        rowsByEntity[eid]?.find((r) => r.id === rid),
      lookupEntity: (eid: string) => entities[eid],
    }),
    [rowsByEntity, entities],
  )

  const hasFormula = entity?.fields.some((f) => f.type === 'formula') ?? false

  const computedByRow = useMemo(() => {
    if (!entity || !hasFormula) return undefined
    const map: Record<string, Record<string, CellValue>> = {}
    for (const row of rows) {
      try {
        map[row.id] = evaluateRowValues(entity, row, ctx)
      } catch {
        const errs: Record<string, CellValue> = {}
        for (const f of entity.fields) if (f.type === 'formula') errs[f.id] = '#ERROR'
        map[row.id] = errs
      }
    }
    return map
  }, [entity, hasFormula, rows, ctx])

  /* entity was deleted while the DATA tab was open */
  if (!entity) return null

  const noFields = entity.fields.length === 0

  return (
    <div className="dg-root">
      {/* -- header strip: dimension annotation + add row ---- */}
      <header className="dg-head">
        <div
          className="dg-dim"
          role="status"
          aria-label={`${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`}
        >
          <span className="dg-dim-tick" aria-hidden="true" />
          <span className="dg-dim-line dg-dim-line-l" aria-hidden="true" />
          <span className="dg-dim-label">
            {rows.length} {rows.length === 1 ? 'Row' : 'Rows'}
          </span>
          <span className="dg-dim-line dg-dim-line-r" aria-hidden="true" />
          <span className="dg-dim-tick" aria-hidden="true" />
        </div>
        <button
          className="btn dg-add-btn"
          disabled={noFields}
          title={noFields ? 'Draft columns in the SCHEMA tab first' : 'Append a row'}
          onClick={() => addRow(entityId)}
        >
          <span aria-hidden="true">+</span> Add row
        </button>
      </header>

      {/* -- body -------------------------------------------- */}
      {noFields ? (
        <div className="dg-platewrap">
          <div className="dg-plate">
            <PlateTicks />
            <PlateGlyph />
            <p className="dg-plate-title">No columns drafted</p>
            <p className="dg-plate-sub">
              This sheet has no fields yet. Draft the columns in the schema
              first — data entry unlocks as soon as the sheet has structure.
            </p>
            <button className="btn" onClick={() => setInspectorTab('schema')}>
              Open schema tab
            </button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="dg-platewrap">
          <div className="dg-plate">
            <PlateTicks />
            <PlateGlyph />
            <p className="dg-plate-title">No entries on this sheet</p>
            <p className="dg-plate-sub">
              The columns are drafted and ready — log the first record to
              start the register.
            </p>
            <button className="btn btn-primary" onClick={() => addRow(entityId)}>
              <span aria-hidden="true">+</span> Add first row
            </button>
          </div>
        </div>
      ) : (
        <div className="dg-scroll">
          <table className="dg-table" aria-label={`${entity.name} data entries`}>
            <thead>
              <tr>
                <th className="dg-th dg-th-gutter" scope="col">
                  <span className="dg-gutter-label" aria-label="Row number">
                    Nº
                  </span>
                </th>
                {entity.fields.map((f) => {
                  const meta = FIELD_TYPES[f.type]
                  return (
                    <th
                      key={f.id}
                      scope="col"
                      className={'dg-th' + (f.type === 'formula' ? ' dg-th-fx' : '')}
                      style={{ minWidth: COL_MIN[f.type] }}
                    >
                      <span className="dg-th-name" title={f.name}>
                        {f.name}
                        {f.required && (
                          <span className="dg-th-req" title="Required">
                            *
                          </span>
                        )}
                      </span>
                      <span className="dg-th-meta">
                        <span className="type-tag" style={{ color: meta.cssVar }}>
                          {meta.tag}
                        </span>
                        {f.type === 'formula' && (
                          <span className="dg-th-ro" title="Computed by formula — not editable">
                            read-only
                          </span>
                        )}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <DgRow
                  key={row.id}
                  entity={entity}
                  row={row}
                  index={i}
                  computed={computedByRow?.[row.id]}
                  entities={entities}
                  rowsByEntity={rowsByEntity}
                />
              ))}
              <tr className="dg-addrow">
                <td colSpan={entity.fields.length + 1}>
                  <button
                    type="button"
                    className="dg-addrow-btn"
                    onClick={() => addRow(entityId)}
                  >
                    <span className="dg-addrow-label">
                      <span aria-hidden="true">+</span> Add row
                    </span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
