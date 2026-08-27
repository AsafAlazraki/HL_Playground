/* ============================================================
   Cell rendering — the painted (read-only) face of every cell, and
   the ONE live editor the grid ever mounts.

   Painting is deliberately cheap: text nodes and a glyph or two, no
   inputs. The editor is rendered into the active cell only.
   ============================================================ */
import { useEffect, useRef } from 'react'
import type { JSX, ReactNode } from 'react'
import {
  isSystemFieldId,
  rowLabel,
  type CellValue,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'
import { FORMULA_ERROR_TITLES, isFormulaError } from './helpers'
import { TickGlyph } from './glyphs'

/* ---------------------------------------------------------- */
/* search hit underlay                                        */
/* ---------------------------------------------------------- */

function highlight(text: string, query: string): ReactNode {
  const q = query.trim()
  if (q === '' || text === '') return text
  const hay = text.toLowerCase()
  const needle = q.toLowerCase()
  const out: ReactNode[] = []
  let i = 0
  let n = 0
  for (;;) {
    const at = hay.indexOf(needle, i)
    if (at < 0) break
    if (at > i) out.push(text.slice(i, at))
    out.push(
      <mark key={(n += 1)} className="tb-hit">
        {text.slice(at, at + needle.length)}
      </mark>,
    )
    i = at + needle.length
  }
  if (out.length === 0) return text
  if (i < text.length) out.push(text.slice(i))
  return out
}

/* ---------------------------------------------------------- */
/* money, aligned on the point                                */
/* ---------------------------------------------------------- */

/* `money()` prints `$41,340` for a whole amount and `$41,340.50` for
   one with cents — which is right for a sentence and wrong for a
   COLUMN, because a run of both puts the decimal point in two
   different places and the eye can no longer compare two prices by
   their shape. Measured on Highfield Inflatables' Retail Pricing
   band, that is most of the column.

   The cents therefore take a slot of their own, exactly as wide as
   `.00` in the mono face (3ch, and `ch` is the digit advance in a
   monospace), and a whole amount leaves that slot EMPTY rather than
   closing it up. Every point in the column lands on the same pixel.

   NOTHING ABOUT THE VALUE MOVES. This is the painted face only:
   `copyText` is what Ctrl+C yields and what the editor seeds with, so
   the store still holds 41340 and an export still carries it.

   The test is the CURRENCY MARK, not the column's name: `money()` in
   `@/lib/money` is the only formatter in the app that emits one, so a
   painted string starting `$` or `−$` came from it and nothing else
   can be mistaken for it. A measurement column — "OA Length m" — has
   no mark and keeps its ordinary right-aligned face. */
const MONEY_FACE = /^[−-]?\$/

function moneyFace(text: string, search: string): ReactNode {
  const dot = text.lastIndexOf('.')
  if (dot < 0) {
    return (
      <>
        {highlight(text, search)}
        <span className="tb-cents" aria-hidden="true" />
      </>
    )
  }
  return (
    <>
      {highlight(text.slice(0, dot), search)}
      <span className="tb-cents">{highlight(text.slice(dot), search)}</span>
    </>
  )
}

/* ---------------------------------------------------------- */
/* painted cell                                               */
/* ---------------------------------------------------------- */

export function CellFace({
  field,
  value,
  text,
  search,
  isActive,
  onToggleBool,
  brokenRef,
}: {
  field: FieldDef
  /** stored value — or the computed one for a formula field */
  value: CellValue
  text: string
  search: string
  isActive: boolean
  onToggleBool: () => void
  /** reference whose target entity is gone */
  brokenRef: boolean
}): JSX.Element {
  /* system column (UID): the row's own id, drawn as the app's ink
     rather than the user's — mono, soft, and never an editor */
  if (isSystemFieldId(field.id)) {
    return <span className="tb-val tb-sys">{highlight(text, search)}</span>
  }

  if (field.type === 'formula') {
    const empty = value === null || value === undefined || value === ''
    if (isFormulaError(value)) {
      return (
        <span className="tb-fx tb-fx-err" title={FORMULA_ERROR_TITLES[value]}>
          {value}
        </span>
      )
    }
    const fxMoney = typeof value === 'number' && MONEY_FACE.test(text)
    return (
      <span
        className={
          'tb-fx' +
          (typeof value === 'number' ? ' tb-num' : '') +
          (fxMoney ? ' tb-money' : '') +
          (empty ? ' tb-fx-empty' : '')
        }
      >
        {empty ? '—' : fxMoney ? moneyFace(text, search) : highlight(text, search)}
      </span>
    )
  }

  if (field.type === 'boolean') {
    const on = value === true
    return (
      <span className="tb-boolwrap">
        <button
          type="button"
          tabIndex={-1}
          role="checkbox"
          aria-checked={on}
          aria-label={field.name}
          className={'tb-check' + (on ? ' tb-check-on' : '')}
          title={
            isActive
              ? on
                ? 'Yes — click to clear the tick'
                : 'No — click to tick'
              : 'Select the cell, then click (or press Enter) to toggle'
          }
          onClick={(e) => {
            /* first click selects the cell, a second one marks it —
               so dragging a range across booleans never flips them */
            if (!isActive) return
            e.stopPropagation()
            onToggleBool()
          }}
        >
          <TickGlyph />
        </button>
      </span>
    )
  }

  if (brokenRef) {
    return (
      <span className="tb-refbroken" title="The table this column points at is no longer on the sheet">
        #REF?
      </span>
    )
  }

  if (text === '') return <span className="tb-empty" aria-hidden="true" />

  const isMoney = field.type === 'number' && MONEY_FACE.test(text)
  const cls =
    'tb-val' +
    (field.type === 'number' ? ' tb-num' : '') +
    (isMoney ? ' tb-money' : '') +
    (field.type === 'date' ? ' tb-date' : '') +
    (field.type === 'select' || field.type === 'reference' ? ' tb-pick' : '')
  return (
    <span className={cls}>
      {isMoney ? moneyFace(text, search) : highlight(text, search)}
    </span>
  )
}

/* ---------------------------------------------------------- */
/* the single live editor                                     */
/* ---------------------------------------------------------- */

export function CellEditor({
  field,
  draft,
  targetEntity,
  targetRows,
  onDraft,
  onPick,
  onBlurCommit,
}: {
  field: FieldDef
  draft: string
  targetEntity: EntityDef | undefined
  targetRows: RowData[] | undefined
  onDraft: (t: string) => void
  /** select / reference commit a value straight through */
  onPick: (v: CellValue) => void
  /** blur = commit whatever is in the draft (unless the grid already did) */
  onBlurCommit: () => void
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const selectRef = useRef<HTMLSelectElement | null>(null)

  useEffect(() => {
    const el = inputRef.current
    if (el) {
      el.focus()
      /* caret at the end — date inputs reject setSelectionRange */
      if (el.type === 'text') {
        const n = el.value.length
        try {
          el.setSelectionRange(n, n)
        } catch {
          /* non-text input: focus alone is enough */
        }
      }
      return
    }
    selectRef.current?.focus()
  }, [])

  if (field.type === 'select') {
    const options = field.options ?? []
    const stale = draft !== '' && !options.includes(draft)
    return (
      <select
        ref={selectRef}
        className="tb-editor tb-editor-pick"
        value={draft}
        aria-label={field.name}
        onChange={(e) => onPick(e.target.value === '' ? null : e.target.value)}
        onBlur={onBlurCommit}
      >
        <option value="">—</option>
        {stale && <option value={draft}>{draft} (stale)</option>}
        {options.map((o, i) => (
          <option key={`${i}:${o}`} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'reference') {
    const rows = targetRows ?? []
    const missing = draft !== '' && !rows.some((r) => r.id === draft)
    return (
      <select
        ref={selectRef}
        className="tb-editor tb-editor-pick"
        value={draft}
        aria-label={field.name}
        onChange={(e) => onPick(e.target.value === '' ? null : e.target.value)}
        onBlur={onBlurCommit}
      >
        <option value="">—</option>
        {missing && <option value={draft}>(missing)</option>}
        {targetEntity &&
          rows.map((r) => (
            <option key={r.id} value={r.id}>
              {rowLabel(targetEntity, r)}
            </option>
          ))}
      </select>
    )
  }

  if (field.type === 'date') {
    return (
      <input
        ref={inputRef}
        className="tb-editor tb-editor-date"
        type="date"
        value={draft}
        aria-label={field.name}
        onChange={(e) => onDraft(e.target.value)}
        onBlur={onBlurCommit}
      />
    )
  }

  return (
    <input
      ref={inputRef}
      className={'tb-editor' + (field.type === 'number' ? ' tb-editor-num' : '')}
      type="text"
      inputMode={field.type === 'number' ? 'decimal' : undefined}
      value={draft}
      spellCheck={false}
      aria-label={field.name}
      onChange={(e) => onDraft(e.target.value)}
      onBlur={onBlurCommit}
      /* Enter / Escape / Tab are resolved by the grid's single keydown
         handler (this event bubbles to it) — nothing is handled twice. */
    />
  )
}
