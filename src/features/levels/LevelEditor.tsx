/* ============================================================
   CONFIGURE AT EVERY LEVEL — the screen.

   The owner's brief, verbatim: "so easy to configure boats. on an
   individual level, on a brand level. on a range or model level.
   same for all the other stuff. just so easy. and that when saved
   that flows onto the quotes."

   FOUR PANES, LEFT TO RIGHT, IN THE ORDER THE SENTENCE IS SPOKEN:

     WHICH LEVEL   the table, its Series, their Models. Every rung
                   carries its own count in mono, because the count
                   is the thing a person is deciding on.
     WHICH COLUMN  every column at that level with WHAT IT ALREADY
                   SAYS beside it — "all 199 agree · XL",
                   "187 of 199 · XL", "split", "none set". This is
                   the pane that makes the screen worth having: it
                   answers "what is inconsistent about my Ocean
                   Masters" before anybody has typed anything.
     THE ACT       the value, and the blast radius COUNTED before
                   the button, never after.
     THE ROWS      who differs, and one press to put them back.

   THREE THINGS IT DELIBERATELY DOES NOT DO:

     · IT NEVER ASKS. Rule 9 — the act is undoable, so it happens
       and a toast offers UNDO. There is no confirm sheet anywhere
       in this file, and the blast radius is on screen BEFORE the
       press rather than in a dialog after it.
     · IT NEVER DISABLES A CONTROL SILENTLY. Rule 10 — every
       refusal is a sentence in the place the thing is refused: a
       formula column says it is worked out from other columns, a
       split level says which two values are tied, a level where
       everything already agrees says so.
     · IT NEVER INVENTS A FIGURE. Every number on screen comes out
       of `levels.ts`, which counts rows. Where a level has no
       answer it says "split" rather than picking the first one.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { rowLabel, type CellValue, type FieldDef } from '@/types/model'
import type { PushNote } from '@/store/notes'
import {
  TABLE_LEVEL_KEY,
  levelColumns,
  planReset,
  planSet,
  standingsAt,
  tallyAt,
  type LevelModel,
  type LevelNode,
  type SetPlan,
  type Tally,
} from './levels'
import { applyLevelPlan } from './apply'
import { useLevelModel, useLevelTables } from './useLevels'
import { SetPanel } from './SetPanel'
import './levels.css'

export interface LevelEditorProps {
  /** the table being configured. With none, the door opens on its
   *  own picker rather than on an empty frame. */
  entityId?: string | null
  /** called when the picker is used, so a shell that owns the
   *  choice can keep it. Omitted: the choice lives here. */
  onPickTable?: (entityId: string) => void
  /** the surface's own toast strip, when it has one. With none,
   *  notes go to the app-wide bus `UndoKeys` draws. */
  push?: PushNote
}

export function LevelEditor({ entityId, onPickTable, push }: LevelEditorProps): JSX.Element {
  const [ownPick, setOwnPick] = useState<string | null>(null)
  const chosen = entityId ?? ownPick
  const model = useLevelModel(chosen)

  if (!model) {
    return (
      <TablePicker
        onPick={(id) => {
          setOwnPick(id)
          onPickTable?.(id)
        }}
      />
    )
  }

  return (
    <LevelStage
      key={model.entity.id}
      model={model}
      push={push}
      onBack={
        entityId
          ? undefined
          : () => {
              setOwnPick(null)
            }
      }
    />
  )
}

/* ---------------------------------------------------------- */
/* the picker                                                 */
/* ---------------------------------------------------------- */

function TablePicker({ onPick }: { onPick: (id: string) => void }): JSX.Element {
  const tables = useLevelTables()

  if (tables.length === 0) {
    return (
      <section className="lv">
        <header className="lv-head">
          <p className="lv-eyebrow ds-label">Configure at every level</p>
          <h1 className="lv-title ds-display">Nothing to configure yet</h1>
          <p className="lv-sub ds-body">
            This door sets a value once and gives it to every row beneath. It needs a table
            with rows in it — import a price file, or open the sample workbook.
          </p>
        </header>
      </section>
    )
  }

  return (
    <section className="lv">
      <header className="lv-head">
        <p className="lv-eyebrow ds-label">Configure at every level</p>
        <h1 className="lv-title ds-display">Which table?</h1>
        {/* ONE LINE. What happens to a row that disagrees is said on
            that row, by the editor, at the moment it is left alone —
            which is where a person can do something about it. */}
        <p className="lv-sub ds-body">Set it once; every row beneath takes it.</p>
      </header>
      <ul className="lv-pick">
        {tables.map((t) => (
          <li key={t.entity.id}>
            <button className="lv-pick-row" type="button" onClick={() => onPick(t.entity.id)}>
              <span className="lv-pick-name ds-heading">{t.entity.name}</span>
              <span className="lv-pick-meta ds-caption">
                <span className="ds-mono-sm">{t.rows.toLocaleString()}</span>{' '}
                {t.rows === 1 ? t.noun.one : t.noun.many}
                {t.depth > 0 ? (
                  <>
                    {' · '}
                    <span className="ds-mono-sm">{t.depth}</span> level
                    {t.depth === 1 ? '' : 's'} beneath the table
                  </>
                ) : (
                  ' · one level, the whole table'
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------------------------------------------------- */
/* the stage                                                  */
/* ---------------------------------------------------------- */

interface StageProps {
  model: LevelModel
  push?: PushNote
  onBack?: () => void
}

function LevelStage({ model, push, onBack }: StageProps): JSX.Element {
  const [levelKey, setLevelKey] = useState<string>(TABLE_LEVEL_KEY)
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set([TABLE_LEVEL_KEY]))
  const [fieldId, setFieldId] = useState<string | null>(null)
  const [rowId, setRowId] = useState<string | null>(null)

  const level = model.byKey.get(levelKey) ?? model.root
  const columns = useMemo(() => levelColumns(model), [model])
  const field = fieldId ? (columns.find((c) => c.field.id === fieldId)?.field ?? null) : null

  /* WHAT EVERY COLUMN ALREADY SAYS AT THIS LEVEL. Recomputed when
     the level moves, which is the only time it can change without
     the rows changing — and the rows changing rebuilds `model`. */
  const says = useMemo(() => {
    const out = new Map<string, Tally>()
    for (const col of columns) {
      if (col.refusal !== null) continue
      out.set(col.field.id, tallyAt(model, levelKey, col.field))
    }
    return out
  }, [model, levelKey, columns])

  const pickLevel = (key: string): void => {
    setLevelKey(key)
    setRowId(null)
  }

  return (
    <section className="lv ds-rise">
      <header className="lv-head">
        <p className="lv-eyebrow ds-label">Configure at every level</p>
        <h1 className="lv-title ds-display">{model.entity.name}</h1>
        <p className="lv-sub ds-body">
          Set a value once at a level and every {model.noun.one} beneath it takes it. It is
          written onto the rows themselves, so a quote made afterwards reads it without
          being told.
        </p>
        {onBack ? (
          <button className="lv-back ds-btn ds-btn--ghost ds-btn--sm" type="button" onClick={onBack}>
            Another table
          </button>
        ) : null}
      </header>

      <div className="lv-body">
        <nav className="lv-pane lv-pane-tree" aria-label="Levels">
          <p className="lv-pane-head ds-label">Which level</p>
          <ul className="lv-tree">
            <TreeBranch
              nodes={[model.root]}
              model={model}
              levelKey={levelKey}
              open={open}
              onPick={pickLevel}
              onToggle={(key) =>
                setOpen((prev) => {
                  const next = new Set(prev)
                  if (next.has(key)) next.delete(key)
                  else next.add(key)
                  return next
                })
              }
            />
          </ul>
        </nav>

        <div className="lv-pane lv-pane-cols">
          <p className="lv-pane-head ds-label">What {level.label} says</p>
          <ul className="lv-cols">
            {columns.map((col) => (
              <li key={col.field.id}>
                <ColumnRow
                  field={col.field}
                  refusal={col.refusal}
                  tally={says.get(col.field.id)}
                  on={fieldId === col.field.id}
                  onPick={() => {
                    setFieldId(col.field.id)
                    setRowId(null)
                  }}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="lv-pane lv-pane-work">
          <Crumb model={model} level={level} rowId={rowId} onPick={pickLevel} />
          {field ? (
            <SetPanel
              /* THE DRAFT BELONGS TO ONE LEVEL AND ONE COLUMN.
                 Keying on both is what clears a half-typed value
                 when the person moves to another Series, rather
                 than leaving it aimed at rows they are no longer
                 looking at. */
              key={`${level.key}::${field.id}`}
              model={model}
              level={level}
              field={field}
              rowId={rowId}
              onPickRow={setRowId}
              push={push}
            />
          ) : (
            <p className="lv-empty ds-body">
              Pick a column on the left to see what {level.label} already says about it, and
              to set it for all{' '}
              <span className="ds-mono">{level.rows.length.toLocaleString()}</span>{' '}
              {level.rows.length === 1 ? model.noun.one : model.noun.many} beneath.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- */
/* the tree                                                   */
/* ---------------------------------------------------------- */

interface BranchProps {
  nodes: readonly LevelNode[]
  model: LevelModel
  levelKey: string
  open: ReadonlySet<string>
  onPick: (key: string) => void
  onToggle: (key: string) => void
}

function TreeBranch(props: BranchProps): JSX.Element {
  const { nodes, model, levelKey, open, onPick, onToggle } = props
  return (
    <>
      {nodes.map((node) => {
        const isOpen = open.has(node.key)
        const kids = node.children
        return (
          <li key={node.key}>
            <div
              className={node.key === levelKey ? 'lv-tree-row lv-tree-row--on' : 'lv-tree-row'}
              style={{ paddingLeft: `calc(var(--s-2) + ${node.depth} * var(--s-4))` }}
            >
              {kids.length > 0 ? (
                <button
                  className="lv-tree-twist"
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Fold' : 'Open'} ${node.label}`}
                  onClick={() => onToggle(node.key)}
                >
                  {isOpen ? (
                    <CaretDown size={ICON_SIZE.tiny} weight={weightFor(ICON_SIZE.tiny)} />
                  ) : (
                    <CaretRight size={ICON_SIZE.tiny} weight={weightFor(ICON_SIZE.tiny)} />
                  )}
                </button>
              ) : (
                <span className="lv-tree-twist lv-tree-twist--none" />
              )}
              <button
                className="lv-tree-name"
                type="button"
                aria-current={node.key === levelKey ? 'true' : undefined}
                onClick={() => onPick(node.key)}
              >
                <span className="lv-tree-label">{node.label}</span>
                <span className="lv-tree-kind ds-label">{node.levelName}</span>
              </button>
              <span className="lv-tree-count ds-mono-sm">{node.rows.length.toLocaleString()}</span>
            </div>
            {isOpen && kids.length > 0 ? (
              <ul className="lv-tree">
                <TreeBranch {...props} nodes={kids} model={model} />
              </ul>
            ) : null}
          </li>
        )
      })}
    </>
  )
}

/* ---------------------------------------------------------- */
/* one column, and what the level already says about it       */
/* ---------------------------------------------------------- */

interface ColumnRowProps {
  field: FieldDef
  refusal: string | null
  tally: Tally | undefined
  on: boolean
  onPick: () => void
}

function ColumnRow({ field, refusal, tally, on, onPick }: ColumnRowProps): JSX.Element {
  if (refusal !== null) {
    return (
      <div className="lv-col lv-col--off">
        <span className="lv-col-name">{field.name}</span>
        <span className="lv-col-says ds-caption">{refusal}</span>
      </div>
    )
  }

  return (
    <button
      className={on ? 'lv-col lv-col--on' : 'lv-col'}
      type="button"
      aria-current={on ? 'true' : undefined}
      onClick={onPick}
    >
      <span className="lv-col-name">{field.name}</span>
      <span className="lv-col-says ds-caption">{saysOf(tally)}</span>
      {tally?.commonest ? (
        <span className="lv-col-value ds-mono-sm">{tally.commonest.text}</span>
      ) : null}
    </button>
  )
}

/**
 * The one-line verdict beside a column name. Every branch is a
 * count.
 *
 * THE WORD "COMMONEST" IS LOAD-BEARING. `93 of 199` beside a
 * column reads as "the level says this"; where 93 is a plurality
 * rather than a majority the level says nothing, and the sentence
 * has to be the one that cannot be misread as an answer.
 */
function saysOf(tally: Tally | undefined): string {
  if (!tally || tally.total === 0) return 'nothing here'
  if (tally.entries.length === 0) return 'none set'
  /* EVERY ROW DIFFERENT IS NOT "SPLIT 588 WAYS". A naming or code
     column is distinct by design, and reporting it as a 588-way
     tie is a true sentence that tells a dealer nothing. */
  if (tally.entries.length === tally.total - tally.blank) return 'all different'
  if (tally.unanimous) return `all ${tally.total.toLocaleString()} agree`
  if (tally.split) return `split ${tally.entries.length} ways`
  const n = tally.commonest?.count ?? 0
  const of = `${n.toLocaleString()} of ${tally.total.toLocaleString()}`
  return tally.answer ? of : `commonest ${of}`
}

/* ---------------------------------------------------------- */
/* the breadcrumb                                             */
/* ---------------------------------------------------------- */

function Crumb({
  model,
  level,
  rowId,
  onPick,
}: {
  model: LevelModel
  level: LevelNode
  rowId: string | null
  onPick: (key: string) => void
}): JSX.Element {
  const trail: LevelNode[] = []
  let node: LevelNode | undefined = level
  while (node) {
    trail.unshift(node)
    node = node.parentKey === null ? undefined : model.byKey.get(node.parentKey)
  }
  const picked = rowId ? level.rows.find((r) => r.id === rowId) : undefined

  return (
    <nav className="lv-crumb" aria-label="This level">
      {trail.map((n, i) => (
        <span key={n.key}>
          {i > 0 ? <span className="lv-crumb-sep"> ▸ </span> : null}
          <button className="lv-crumb-step" type="button" onClick={() => onPick(n.key)}>
            {n.label}
          </button>
        </span>
      ))}
      {picked ? (
        <span>
          <span className="lv-crumb-sep"> ▸ </span>
          <span className="lv-crumb-one">{rowLabel(model.entity, picked)}</span>
        </span>
      ) : null}
    </nav>
  )
}

/* ---------------------------------------------------------- */
/* re-exported so a caller can drive the act without the UI   */
/* ---------------------------------------------------------- */

export { applyLevelPlan, planReset, planSet, standingsAt }
export type { CellValue, SetPlan }
