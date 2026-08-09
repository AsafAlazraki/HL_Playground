import { memo } from 'react'
import type { CSSProperties } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { FIELD_TYPES, accentVar, isSystemFieldId, visibleFields } from '@/types/model'
import type { FieldDef } from '@/types/model'
import { FindingBadge } from '@/features/review'
import { accentBrightVar } from './useDerivedGraph'
import type { EntityFlowNode } from './useDerivedGraph'
import {
  CARD_MODES,
  CARD_MODE_GLYPH,
  CARD_MODE_HINT,
  CARD_MODE_LABEL,
  previewFooterLabel,
} from './cardModes'
import type { CardMode, DataPreview, PreviewCell } from './cardModes'

/** Rows shown in detail mode before the card folds the rest into "+N more". */
const MAX_FIELD_ROWS = 14

/** How many leading formula (FX) fields must survive truncation. */
const MIN_VISIBLE_FX = 2

/* Geometry of a SCHEMA card, from whiteboard.css: header 10+8 padding
   over a 12px/1.25 name, a field row of 4+4 padding over 10.5px mono,
   and 3+5 of list padding. */
const CARD_HEAD_H = 36
const CARD_ROW_H = 24
const CARD_LIST_PAD = 8

/**
 * How tall this card stands when it is drawn IN FULL, worked out from the
 * schema alone. The RULES layer draws every card as a header-only
 * silhouette, so anything that has to keep clear of a card — lane
 * separation, chiefly — cannot ask React Flow what it measured and must
 * ask the schema instead. Counts the locked UID row (UX_REWORK §8b).
 */
export function schemaCardHeight(fieldCount: number): number {
  const rows = 1 + Math.min(fieldCount, MAX_FIELD_ROWS)
  return CARD_HEAD_H + CARD_LIST_PAD + rows * CARD_ROW_H
}

/**
 * Field rows shown on a detail card. The visible list keeps schema order,
 * with one small, honest exception: formula fields are the card's most
 * telling content, so if plain head-truncation would hide any of the first
 * two FX fields we drop trailing plain rows instead and keep those FX rows
 * visible. Total shown never exceeds MAX_FIELD_ROWS.
 */
function truncatedFields(fields: FieldDef[]): FieldDef[] {
  if (fields.length <= MAX_FIELD_ROWS) return fields
  const head = fields.slice(0, MAX_FIELD_ROWS)
  const leadFx = fields
    .filter((f) => f.type === 'formula')
    .slice(0, MIN_VISIBLE_FX)
  const rescued = leadFx.filter((f) => !head.includes(f))
  if (rescued.length === 0) return head

  /* Drop the LAST plain rows from the head to make room. */
  let toDrop = rescued.length
  const kept: FieldDef[] = []
  for (let i = head.length - 1; i >= 0; i -= 1) {
    const f = head[i]
    if (!f) continue
    if (toDrop > 0 && f.type !== 'formula') {
      toDrop -= 1
      continue
    }
    kept.unshift(f)
  }
  /* rescued FX rows sit beyond the cut, so appending keeps schema order */
  return [...kept, ...rescued]
}

/* ------------------------------------------------------------ */
/* Per-card mode control — three tiny mono glyph buttons.       */
/* Hidden on a resting card; revealed on hover, focus and for   */
/* the selected card, so an untouched sheet stays quiet.        */
/* ------------------------------------------------------------ */

function ModeControl({
  entityId,
  entityName,
  mode,
  pinned,
  onSetMode,
}: {
  entityId: string
  entityName: string
  mode: CardMode
  pinned: boolean
  onSetMode: (entityId: string, mode: CardMode) => void
}) {
  return (
    <div
      className={`wb-modes nodrag${pinned ? ' wb-modes--pinned' : ''}`}
      role="group"
      aria-label={`Card mode — ${entityName}`}
    >
      {CARD_MODES.map((m) => {
        const on = m === mode
        const isPin = on && pinned
        return (
          <button
            key={m}
            type="button"
            className={`wb-mode-btn${on ? ' wb-mode-btn--on' : ''}`}
            aria-pressed={on}
            aria-label={CARD_MODE_LABEL[m]}
            title={
              isPin
                ? `${CARD_MODE_HINT[m]} — pinned; click to follow the sheet view`
                : CARD_MODE_HINT[m]
            }
            onClick={() => onSetMode(entityId, m)}
          >
            {CARD_MODE_GLYPH[m]}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------ */
/* DATA mode — a compact chrome mini-table inside the card      */
/* ------------------------------------------------------------ */

function PreviewValue({ cell }: { cell: PreviewCell }) {
  if (cell.kind === 'empty') {
    return (
      <span className="wb-data-nil" aria-hidden="true">
        —
      </span>
    )
  }
  if (cell.kind === 'bool') {
    return cell.on ? (
      <span className="wb-data-yes" role="img" aria-label="yes">
        ✓
      </span>
    ) : (
      <span className="wb-data-no" role="img" aria-label="no">
        –
      </span>
    )
  }
  return <>{cell.text}</>
}

function DataTable({
  preview,
  entityName,
}: {
  preview: DataPreview
  entityName: string
}) {
  /* UID is always column one now, so "no columns" has to mean no columns
     of the reader's own — a table of nothing but row ids tells you
     nothing, and the designed note says more (UX_REWORK §8b). */
  if (preview.columns.every((c) => isSystemFieldId(c.id))) {
    return <p className="wb-entity-nofields">No data columns</p>
  }

  return (
    <div className="wb-data" role="table" aria-label={`${entityName} — data`}>
      <div className="wb-data-row wb-data-row--head" role="row">
        {preview.columns.map((c) => (
          <span
            className={`wb-data-cell${
              isSystemFieldId(c.id) ? ' wb-data-cell--sys' : ''
            }`}
            role="columnheader"
            key={c.id}
            title={
              isSystemFieldId(c.id)
                ? 'UID — the row’s permanent identifier, assigned by the app'
                : c.name
            }
          >
            {c.name}
          </span>
        ))}
      </div>

      {preview.cells.map((row, ri) => (
        <div
          /* a read-only slice of rows — the index is the stable key here */
          key={`r${ri}`}
          className={`wb-data-row${ri % 2 === 1 ? ' wb-data-row--alt' : ''}`}
          role="row"
        >
          {row.map((cell, ci) => {
            const col = preview.columns[ci]
            const align = cell.kind === 'bool' ? 'c' : cell.kind === 'value' ? cell.align : 'l'
            const system = !!col && isSystemFieldId(col.id)
            return (
              <span
                key={col ? col.id : `c${ci}`}
                className={`wb-data-cell wb-data-cell--${align}${
                  system ? ' wb-data-cell--sys' : ''
                }`}
                role="cell"
                title={cell.kind === 'value' ? cell.text : undefined}
              >
                <PreviewValue cell={cell} />
              </span>
            )
          })}
        </div>
      ))}

      <div className="wb-data-foot" role="row">
        <span className="wb-data-foot-cell" role="cell">
          {previewFooterLabel(preview)}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ */
/* Card                                                         */
/* ------------------------------------------------------------ */

function EntityNodeImpl({ data, selected }: NodeProps<EntityFlowNode>) {
  const { entity, mode, pinned, rowCount, preview, flagged, zoneAccent } = data
  const style = {
    '--wb-accent': accentVar(entity.accent),
    /* membership ticks read in the zone's BRIGHT accent on the navy sheet */
    '--wb-tick': zoneAccent
      ? accentBrightVar(zoneAccent)
      : 'var(--canvas-ink-soft)',
  } as CSSProperties

  /* -- RULES layer: a flat navy silhouette ------------------
     Not a faded card — the paper is taken away entirely and what
     is left is the outline and the name, printed on the sheet in
     canvas ink. The flow plates hold the only lit contrast on the
     layer, and nothing of theirs lands on top of a field row,
     because there are no field rows. (UX_REWORK §3) */
  if (data.underlay) {
    return (
      <div
        className={`wb-entity wb-entity--underlay${
          selected ? ' wb-entity--selected' : ''
        }${zoneAccent ? ' wb-entity--zoned' : ''}${
          flagged ? ' wb-entity--flagged' : ''
        }`}
        style={style}
      >
        <Handle
          className="wb-port"
          type="target"
          position={Position.Left}
          isConnectable={false}
        />
        <Handle
          className="wb-port"
          type="source"
          position={Position.Right}
          isConnectable={false}
        />

        <i className="wb-tick wb-tick--tl" aria-hidden="true" />
        <i className="wb-tick wb-tick--tr" aria-hidden="true" />
        <i className="wb-tick wb-tick--bl" aria-hidden="true" />
        <i className="wb-tick wb-tick--br" aria-hidden="true" />

        <header className="wb-entity-head">
          <span className="wb-entity-chip" aria-hidden="true" />
          <h3 className="wb-entity-name block-heading" title={entity.name}>
            {entity.name}
          </h3>
          {/* the red pencil never goes quiet, not even on an underlay */}
          <span className="wb-entity-mark">
            <FindingBadge entityId={entity.id} />
          </span>
        </header>
      </div>
    )
  }

  /* UID first, always: the row's own id, surfaced as a locked system
     column (UX_REWORK §8b). It is never the row folded into "+N more" —
     truncation only ever eats the reader's own fields. */
  const [systemField, ...userFields] = visibleFields(entity)
  const shown = [systemField, ...truncatedFields(userFields)]
  const overflow = userFields.length - (shown.length - 1)
  const fieldCount = entity.fields.length

  const className = [
    'wb-entity',
    `wb-entity--${mode}`,
    selected ? 'wb-entity--selected' : '',
    zoneAccent ? 'wb-entity--zoned' : '',
    flagged ? 'wb-entity--flagged' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} style={style}>
      <Handle
        className="wb-port"
        type="target"
        position={Position.Left}
        isConnectable={false}
      />
      <Handle
        className="wb-port"
        type="source"
        position={Position.Right}
        isConnectable={false}
      />

      <i className="wb-tick wb-tick--tl" aria-hidden="true" />
      <i className="wb-tick wb-tick--tr" aria-hidden="true" />
      <i className="wb-tick wb-tick--bl" aria-hidden="true" />
      <i className="wb-tick wb-tick--br" aria-hidden="true" />

      <header className="wb-entity-head">
        <span className="wb-entity-chip" aria-hidden="true" />
        <h3 className="wb-entity-name block-heading" title={entity.name}>
          {entity.name}
        </h3>
        <div className="wb-entity-meta">
          <ModeControl
            entityId={entity.id}
            entityName={entity.name}
            mode={mode}
            pinned={pinned}
            onSetMode={data.onSetMode}
          />
          <span className="wb-entity-mark">
            <FindingBadge entityId={entity.id} />
          </span>
          <span
            className="wb-entity-rows"
            title={`${rowCount} row${rowCount === 1 ? '' : 's'} of data`}
          >
            N={rowCount}
          </span>
        </div>
      </header>

      {mode === 'data' && preview ? (
        <DataTable preview={preview} entityName={entity.name} />
      ) : mode === 'schema' ? (
        <>
          <ul className="wb-entity-fields">
            {shown.map((f) => {
              const system = isSystemFieldId(f.id)
              return (
                <li
                  className={`wb-field${system ? ' wb-field--sys' : ''}`}
                  key={f.id}
                >
                  {system ? (
                    <i
                      className="wb-field-lock"
                      aria-hidden="true"
                      title="System column — assigned by the app, never edited"
                    />
                  ) : null}
                  <span
                    className="wb-field-name"
                    title={system ? f.description : f.name}
                  >
                    {f.name}
                    {f.required && !system ? (
                      <em className="wb-field-req" title="Required">
                        *
                      </em>
                    ) : null}
                  </span>
                  <span
                    className="type-tag"
                    style={{ color: FIELD_TYPES[f.type].cssVar }}
                    title={FIELD_TYPES[f.type].label}
                  >
                    {FIELD_TYPES[f.type].tag}
                  </span>
                </li>
              )
            })}
            {overflow > 0 ? (
              <li className="wb-field-more">
                +{overflow} more field{overflow === 1 ? '' : 's'}
              </li>
            ) : null}
          </ul>
          {/* the UID row is always there, so "no fields" now means the
              reader has drafted none of their own — say exactly that */}
          {fieldCount === 0 ? (
            <p className="wb-entity-nofields">No fields drafted</p>
          ) : null}
        </>
      ) : (
        <div
          className="wb-dim"
          aria-label={`${fieldCount} field${fieldCount === 1 ? '' : 's'}`}
        >
          <span className="wb-dim-end" aria-hidden="true" />
          <span className="wb-dim-line wb-dim-line--l" aria-hidden="true" />
          <span className="wb-dim-label">
            {fieldCount} field{fieldCount === 1 ? '' : 's'}
          </span>
          <span className="wb-dim-line wb-dim-line--r" aria-hidden="true" />
          <span className="wb-dim-end" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

/**
 * A card draws its own data and whether it is selected. It draws nothing
 * from where it sits, so React Flow's positional props — which change on
 * every pixel of every drag — must not be allowed to re-render it. With
 * `data` cached per id in `useDerivedGraph`, this is what keeps a drag
 * to one card's worth of work instead of the whole sheet's.
 */
const sameCardProps = (
  a: NodeProps<EntityFlowNode>,
  b: NodeProps<EntityFlowNode>,
): boolean =>
  a.id === b.id && a.data === b.data && a.selected === b.selected

export const EntityNode = memo(EntityNodeImpl, sameCardProps)
