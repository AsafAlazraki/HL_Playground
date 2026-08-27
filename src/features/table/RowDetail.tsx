/* ============================================================
   THE ROW, READ AS A ROW.

   THE COMPLAINT THIS ANSWERS, verbatim: "the tables — still too
   complicated and hard to use visually."

   THE DIAGNOSIS. The grid is not wrong. A price register IS a grid,
   and every editing behaviour on it — sort, filter, fill, paste a
   block from Excel, retype a Series to re-file a boat — is a grid
   behaviour and stays exactly as capable as it was. What was wrong is
   that the grid was the ONLY way in. Reading one boat on Highfield
   Inflatables means crossing 33 columns and 4,248px of sheet, in a
   window that holds twelve of them: the answer to "what is this boat"
   was a sideways scroll with the name pinned at the left edge and the
   figure you wanted three bands away.

   So this is the second way in, and it is the highest-value change on
   the surface: press a row and every field of it stands still in one
   column, filed under the table's OWN sections — Identity, Capacity,
   Cost Build, Hull Only Pricing — each value editable exactly as it
   is in the grid, by the same coercion, into the same store, with the
   same refusals.

   FOUR DECISIONS WORTH THE WORDS:

   1. EVERY FIELD, INCLUDING THE ONES THE GRID IS NOT DRAWING. The
      grid's `fields` are the ADDRESSABLE set — a folded band's columns
      are out of it, and on the card the filing columns are too. A
      record with columns missing is not a record, so this walks
      `entity.fields`, which is all of them, always. Folding a band
      still folds the band; it no longer hides the value from the one
      surface whose whole job is to show it.

   2. IT IS A PANEL BESIDE THE GRID, NOT A SHEET OVER IT. The row you
      are reading stays on screen, lit, in its drawer, with its
      neighbours above and below — so stepping through fifteen
      variants of one model is stepping down a list you can still see,
      and the answer to "which of these am I looking at" never leaves
      the window. A modal over the sheet would have taken that away.
      Under 900px there is no room for both, and only then does it
      cover the sheet.

   3. THE VALUES DO NOT LOOK LIKE A FORM UNTIL YOU TOUCH ONE. 33
      outlined input boxes stacked in a column is the same visual noise
      the complaint is about, wearing different clothes. Every value is
      a live control from the first frame — no press to "start editing"
      — but it draws as text until the pointer or the caret arrives.

   4. A MONEY FIGURE READS AS MONEY AND EDITS AS A NUMBER. Out of
      focus a price is `$41,340`, the app's one money format, exactly
      as the cell paints it. In focus it is `41340`, exactly as the
      cell editor seeds it — so what you type is what the store keeps.

   WHAT IS NOT HERE, deliberately: no delete, no reorder, no column
   commands. This is a reading and typing surface for ONE row. Every
   act on the TABLE stays on the action bar where it already was.
   ============================================================ */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { motion } from 'motion/react'
import {
  accentVar,
  isImageValue,
  rowLabel,
  type CellValue,
  type ColumnSection,
  type EntityDef,
  type FieldDef,
  type ImageRef,
  type RowData,
} from '@/types/model'
import { SPRING, transitionFor, useStillness } from '@/features/views/stillness'
import {
  ImageLightbox,
  ImageStrip,
  readImageFiles,
  type LightboxState,
} from './ImageCell'
import { CaretGlyph, CrossGlyph, StepGlyph, TickGlyph } from './glyphs'
import {
  FORMULA_ERROR_TITLES,
  cellPrintText,
  cellText,
  isEmptyCell,
  isFormulaError,
  moveImage,
  pad2,
} from './helpers'
import type { LeafNoun } from './grouping'
import { countLabel } from './grouping'

/** One drawer this row is filed in — "Series: Sport", outermost first. */
export interface FiledUnder {
  level: string
  value: string
}

export interface RowDetailProps {
  entity: EntityDef
  row: RowData
  /** stored values with the formula columns already worked out */
  values: Record<string, CellValue>
  /** where the row sits in what is on screen, 0-based */
  index: number
  /** how many rows are on screen */
  shown: number
  /** how many the table holds, narrowing or no narrowing */
  held: number
  noun: LeafNoun
  filedUnder: FiledUnder[]
  targetEntityOf: (f: FieldDef) => EntityDef | undefined
  targetRowsOf: (f: FieldDef) => RowData[] | undefined
  /** typed text, coerced exactly as the cell editor coerces it. False
   *  means the value was refused and said so — the box puts itself
   *  back rather than keeping a string the store never took. */
  onSetText: (field: FieldDef, text: string) => boolean
  /** a picker's own canonical value — an option, a row id, a tick */
  onSetValue: (field: FieldDef, v: CellValue) => void
  onImages: (fieldId: string, next: ImageRef[]) => void
  /** ±1 through the rows on screen */
  onStep: (delta: number) => void
  onClose: () => void
}

/* ---------------------------------------------------------- */
/* the table's own sections, as blocks                        */
/* ---------------------------------------------------------- */

interface FieldBlock {
  key: string
  section: ColumnSection | undefined
  fields: FieldDef[]
}

/** Fields in the table's own order, gathered under the section each one
 *  names. A section is one block wherever its columns sit, so a reader
 *  meets "Hull Only Pricing" once; columns in no section keep their
 *  place in the order and take no heading, exactly as the band row
 *  above the grid draws an unbanded run as nothing at all. */
function blocksOf(entity: EntityDef): FieldBlock[] {
  const byId = new Map<string, ColumnSection>()
  for (const s of entity.sections ?? []) byId.set(s.id, s)

  const out: FieldBlock[] = []
  const at = new Map<string, FieldBlock>()
  for (const f of entity.fields) {
    const section = f.sectionId ? byId.get(f.sectionId) : undefined
    const key = section ? `s:${section.id}` : 'plain'
    let block = at.get(key)
    if (!block) {
      block = { key, section, fields: [] }
      at.set(key, block)
      out.push(block)
    }
    block.fields.push(f)
  }
  return out
}

/* ---------------------------------------------------------- */
/* one value                                                  */
/* ---------------------------------------------------------- */

/** A text, number or date column: a live box that draws as text until
 *  it is touched. Committed on blur and on Enter, put back on Escape —
 *  the same three keys the cell editor answers to. */
function TypedValue({
  field,
  value,
  onSetText,
}: {
  field: FieldDef
  value: CellValue
  onSetText: (field: FieldDef, text: string) => boolean
}): JSX.Element {
  /* WHAT IT COPIES vs WHAT IT PAINTS — the same split the cell makes.
     `raw` is the exact inverse of the coercion, so what is typed is
     what is stored; `shown` is the app's one money format. */
  const raw = cellText(value, field)
  const shown = cellPrintText(field, value, raw)

  const [draft, setDraft] = useState(raw)
  const [live, setLive] = useState(false)
  /* the store is the truth: a value changed anywhere else — a fill, a
     paste, an undo — lands here, unless this box is the one being
     typed into */
  useEffect(() => {
    if (!live) setDraft(raw)
  }, [raw, live])

  const commit = (): void => {
    setLive(false)
    if (draft === raw) return
    if (!onSetText(field, draft)) setDraft(raw)
  }

  return (
    <input
      className={'tb-dv-in' + (field.type === 'number' ? ' tb-dv-in-num' : '')}
      type={field.type === 'date' ? 'date' : 'text'}
      inputMode={field.type === 'number' ? 'decimal' : undefined}
      spellCheck={false}
      value={live ? draft : shown}
      aria-label={field.name}
      onFocus={() => {
        setDraft(raw)
        setLive(true)
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        /* the panel steps rows on ↑ / ↓ / j / k, and none of that may
           happen while somebody is typing a value into it */
        e.stopPropagation()
        if (e.key === 'Enter') {
          commit()
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') {
          setDraft(raw)
          setLive(false)
          e.currentTarget.blur()
        }
      }}
    />
  )
}

/** A list column or a link column: the same canonical pick the cell's
 *  own editor writes — an option string, or a row id. */
function PickValue({
  field,
  value,
  targetEntity,
  targetRows,
  onSetValue,
}: {
  field: FieldDef
  value: CellValue
  targetEntity: EntityDef | undefined
  targetRows: RowData[] | undefined
  onSetValue: (field: FieldDef, v: CellValue) => void
}): JSX.Element {
  const current = value == null ? '' : String(value)
  const options = field.options ?? []
  const rows = targetRows ?? []
  /* A VALUE THE LIST NO LONGER HOLDS IS STILL THE ROW'S VALUE. It is
     offered back rather than silently swapped for the first option —
     which is what a `<select>` with no matching option would do. */
  const stale =
    field.type === 'select' && current !== '' && !options.includes(current)
  const missing =
    field.type === 'reference' && current !== '' && !rows.some((r) => r.id === current)

  return (
    <span className="tb-dv-pickwrap">
      <select
        className="tb-dv-pick"
        value={current}
        aria-label={field.name}
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => onSetValue(field, e.target.value === '' ? null : e.target.value)}
      >
        <option value="">—</option>
        {stale && <option value={current}>{current} (no longer on the list)</option>}
        {missing && <option value={current}>(the row this pointed at is gone)</option>}
        {field.type === 'select'
          ? options.map((o, i) => (
              <option key={`${i}:${o}`} value={o}>
                {o}
              </option>
            ))
          : targetEntity
            ? rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {rowLabel(targetEntity, r)}
                </option>
              ))
            : null}
      </select>
      <span className="tb-dv-caret" aria-hidden="true">
        <CaretGlyph />
      </span>
    </span>
  )
}

/** Yes / no. A tick and the word beside it, because a lone empty box
 *  in a column of values reads as "not answered" rather than as "no". */
function BoolValue({
  field,
  value,
  onSetValue,
}: {
  field: FieldDef
  value: CellValue
  onSetValue: (field: FieldDef, v: CellValue) => void
}): JSX.Element {
  const on = value === true
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={field.name}
      className={'tb-dv-tick' + (on ? ' tb-dv-tick-on' : '')}
      title={on ? 'Yes — press to clear the tick' : 'No — press to tick'}
      onClick={() => onSetValue(field, !on)}
    >
      <span className="tb-dv-box" aria-hidden="true">
        <TickGlyph />
      </span>
      <span className="tb-dv-word">{on ? 'Yes' : 'No'}</span>
    </button>
  )
}

/* ---------------------------------------------------------- */
/* the panel                                                  */
/* ---------------------------------------------------------- */

export function RowDetail({
  entity,
  row,
  values,
  index,
  shown,
  held,
  noun,
  filedUnder,
  targetEntityOf,
  targetRowsOf,
  onSetText,
  onSetValue,
  onImages,
  onStep,
  onClose,
}: RowDetailProps): JSX.Element {
  const { still } = useStillness()
  const panelRef = useRef<HTMLElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const addToRef = useRef<{ fieldId: string; existing: ImageRef[] } | null>(null)
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)

  const blocks = useMemo(() => blocksOf(entity), [entity])

  /* THE KEYS LAND ON THE PANEL, so the panel has to hold the caret the
     moment it opens — otherwise Escape belongs to whatever had focus
     before and the first ↓ scrolls the page instead of stepping a row.
     Focus moves back to the grid on close, in `TableSheet`. */
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true })
    /* on open only: re-running on every row would steal the caret out
       of a value box the moment a fill or an undo touched this row */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* A NEW ROW IS READ FROM ITS TOP. Stepping from a boat whose Motor
     Fitment you were reading to the next one used to leave the panel
     scrolled 600px down, so the next boat opened at a band nobody
     asked for. `useLayoutEffect` so it never paints at the old offset
     first. */
  useLayoutEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [row.id])

  const name = rowLabel(entity, row)
  const columns = entity.fields.length
  const filled = entity.fields.filter((f) => !isEmptyCell(values[f.id])).length

  const onPanelKey = (e: ReactKeyboardEvent<HTMLElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
      return
    }
    /* A CONTROL OWNS ITS OWN KEYS. Every value box stops its keydown
       before it reaches here, so this only ever sees keys typed at the
       panel itself. */
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const back = e.key === 'ArrowUp' || e.key === 'k'
    const on = e.key === 'ArrowDown' || e.key === 'j'
    if (!back && !on) return
    e.preventDefault()
    onStep(back ? -1 : 1)
  }

  /* A ROW CAN BE OPEN AND NOT BE ON THE SHEET. Narrow the register
     while a row is open — type into the search, filter a column, fold
     the drawer it is in — and it is still a row of this table, still
     readable and still editable here; there is simply nowhere to step
     to. Both controls say that, in a sentence, where they are; and
     the position line says it too rather than printing "00 of 588". */
  const inView = index >= 0
  const canBack = inView && index > 0
  const canOn = inView && index < shown - 1
  const noStep = inView
    ? undefined
    : 'This row is not in what the search and the filters have left on screen.'

  return (
    <motion.aside
      className="tb-detail"
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label={`${name} — every column`}
      onKeyDown={onPanelKey}
      initial={still ? false : { opacity: 0, x: 26 }}
      animate={{ opacity: 1, x: 0 }}
      exit={still ? { opacity: 0 } : { opacity: 0, x: 26 }}
      transition={transitionFor(still, SPRING)}
    >
      <header className="tb-detail-head">
        <div className="tb-detail-headtop">
          {/* WHERE THIS ROW SITS, in the drawers the dealer filed it
              in. On a flat table there are none and this is absent
              rather than empty. */}
          {filedUnder.length > 0 && (
            <p className="tb-detail-filed">
              {filedUnder.map((f, i) => (
                <span key={`${f.level}:${i}`} className="tb-detail-filedstep">
                  {i > 0 && (
                    <span className="tb-detail-filedsep" aria-hidden="true">
                      ›
                    </span>
                  )}
                  <span className="tb-detail-filedlab">{f.level}</span>
                  <span className="tb-detail-filedval">{f.value}</span>
                </span>
              ))}
            </p>
          )}
          <div className="tb-detail-step">
            <button
              type="button"
              className="tb-detail-nav"
              aria-label={`Previous ${noun.one}`}
              title={
                noStep ??
                (canBack
                  ? `Previous ${noun.one} — ↑ or K`
                  : `This is the first ${noun.one} on screen`)
              }
              disabled={!canBack}
              onClick={() => onStep(-1)}
            >
              <StepGlyph dir="up" />
            </button>
            <button
              type="button"
              className="tb-detail-nav"
              aria-label={`Next ${noun.one}`}
              title={
                noStep ??
                (canOn
                  ? `Next ${noun.one} — ↓ or J`
                  : `This is the last ${noun.one} on screen`)
              }
              disabled={!canOn}
              onClick={() => onStep(1)}
            >
              <StepGlyph dir="down" />
            </button>
            <button
              type="button"
              className="tb-detail-x"
              aria-label="Close this row"
              title="Close — Escape"
              onClick={onClose}
            >
              <CrossGlyph />
            </button>
          </div>
        </div>

        <h2 className="tb-detail-name">{name}</h2>

        {/* EVERY FIGURE HERE IS COUNTED. Where the row sits in what is
            on screen, how many the table holds when those two differ,
            and how many of its columns actually carry a value. */}
        <p className="tb-detail-say">
          {inView ? (
            <span className="tb-detail-pos">
              {pad2(index + 1)}
              <span className="tb-detail-of"> of </span>
              {shown}
            </span>
          ) : (
            <span className="tb-detail-out">
              not among the {shown} on screen
            </span>
          )}
          {shown !== held && (
            <span className="tb-detail-held">{countLabel(held, noun)} in the table</span>
          )}
          {/* WHAT IS ACTUALLY FILLED IN, counted. A record whose every
              column carries a value says so in one phrase rather than
              making a reader compare two identical figures. */}
          <span className="tb-detail-cols">
            {filled === columns
              ? `every one of ${columns} columns filled in`
              : `${filled} of ${columns} columns filled in`}
          </span>
        </p>
      </header>

      <div className="tb-detail-body" ref={bodyRef}>
        {blocks.map((block) => (
          <section
            key={block.key}
            className={'tb-detail-sec' + (block.section ? '' : ' tb-detail-sec-plain')}
            style={
              block.section
                ? {
                    ['--tb-sec-ink' as string]: accentVar(
                      block.section.accent ?? 'graphite',
                    ),
                  }
                : undefined
            }
            aria-label={block.section?.name}
          >
            {block.section && (
              <h3 className="tb-detail-secname">
                <span className="tb-detail-secrule" aria-hidden="true" />
                {block.section.name}
              </h3>
            )}
            <dl className="tb-detail-list">
              {block.fields.map((f) => {
                const v = values[f.id] ?? null
                const empty = isEmptyCell(v)
                return (
                  <div
                    key={f.id}
                    className={'tb-detail-f' + (empty ? ' tb-detail-f-empty' : '')}
                  >
                    <dt className="tb-detail-lab">
                      <span className="tb-detail-labname">{f.name}</span>
                      {f.required === true && (
                        <span
                          className="tb-detail-req"
                          title={`${f.name} is required`}
                          aria-label="Required"
                        >
                          *
                        </span>
                      )}
                      {f.description !== undefined && f.description !== '' && (
                        <span className="tb-detail-note">{f.description}</span>
                      )}
                    </dt>
                    <dd className="tb-detail-val">
                      {f.type === 'formula' ? (
                        /* WORKED OUT, NOT TYPED — and it says which,
                           because a read-only box a person cannot get a
                           caret into and which never says why is the
                           thing rule 10 exists to prevent. */
                        isFormulaError(v) ? (
                          <span
                            className="tb-dv-fx tb-dv-fx-err"
                            title={FORMULA_ERROR_TITLES[v]}
                          >
                            {v}
                          </span>
                        ) : (
                          <span
                            className={'tb-dv-fx' + (empty ? ' tb-dv-fx-empty' : '')}
                            title={
                              f.formula === undefined
                                ? 'Worked out from other columns'
                                : `Worked out from other columns: ${f.formula}`
                            }
                          >
                            {empty ? '—' : cellPrintText(f, v, cellText(v, f))}
                          </span>
                        )
                      ) : f.type === 'image' ? (
                        <span className="tb-dv-imgs">
                          <ImageStrip
                            field={f}
                            kind={entity.kind}
                            cellKey={`detail:${row.id}:${f.id}`}
                            images={isImageValue(v) ? v : []}
                            isActive
                            onOpen={(at) =>
                              setLightbox({
                                images: isImageValue(v) ? v : [],
                                index: at,
                                fieldName: f.name,
                                kind: entity.kind,
                                rowId: row.id,
                                fieldId: f.id,
                              })
                            }
                            onAdd={() => {
                              addToRef.current = {
                                fieldId: f.id,
                                existing: isImageValue(v) ? v : [],
                              }
                              fileRef.current?.click()
                            }}
                            onAddImages={(added) =>
                              onImages(f.id, [...(isImageValue(v) ? v : []), ...added])
                            }
                            onRemove={(at) =>
                              onImages(
                                f.id,
                                (isImageValue(v) ? v : []).filter((_, k) => k !== at),
                              )
                            }
                            onReorder={(from, to) =>
                              onImages(f.id, moveImage(isImageValue(v) ? v : [], from, to))
                            }
                            onDropFiles={(files) => {
                              void readImageFiles(files).then((added) => {
                                if (added.length > 0) {
                                  onImages(f.id, [
                                    ...(isImageValue(v) ? v : []),
                                    ...added,
                                  ])
                                }
                              })
                            }}
                          />
                        </span>
                      ) : f.type === 'boolean' ? (
                        <BoolValue field={f} value={v} onSetValue={onSetValue} />
                      ) : f.type === 'select' || f.type === 'reference' ? (
                        <PickValue
                          field={f}
                          value={v}
                          targetEntity={targetEntityOf(f)}
                          targetRows={targetRowsOf(f)}
                          onSetValue={onSetValue}
                        />
                      ) : (
                        <TypedValue field={f} value={v} onSetText={onSetText} />
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        ))}
      </div>

      {/* THE ROW'S PERMANENT IDENTIFIER, in the one place a person who
          needs it can copy it from. It is not a column any more (see
          `useTableData`) and it is not shouted at anybody who does not
          need it — it is here, and in the gutter's own tooltip. */}
      <footer className="tb-detail-foot">
        <span className="tb-detail-footlab">Identifier</span>
        <span className="tb-detail-footid">{row.id}</span>
      </footer>

      {/* one chooser for the whole panel — the same shape the grid uses */}
      <input
        ref={fileRef}
        className="tb-filein"
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const target = addToRef.current
          addToRef.current = null
          const files = e.target.files
          if (target && files && files.length > 0) {
            void readImageFiles(files).then((added) => {
              if (added.length > 0) {
                onImages(target.fieldId, [...target.existing, ...added])
              }
            })
          }
          e.target.value = ''
        }}
      />

      {lightbox && (
        <ImageLightbox
          state={lightbox}
          onIndex={(at) => setLightbox((s) => (s ? { ...s, index: at } : s))}
          /* the plate's promote button is a move-to-index-0, the same
             array move the drag performs — order is the only thing that
             elects the primary picture, here as in the grid */
          onPromote={(at) => {
            const list = moveImage(lightbox.images, at, 0)
            onImages(lightbox.fieldId, list)
            setLightbox({ ...lightbox, images: list, index: 0 })
          }}
          onClose={() => {
            setLightbox(null)
            panelRef.current?.focus({ preventScroll: true })
          }}
        />
      )}
    </motion.aside>
  )
}
