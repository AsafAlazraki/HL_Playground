/* ============================================================
   NEW TABLE — two questions on one sheet.

   1. What kind of table is this?   (click a card, it advances)
   2. How is it structured?         (chains, a live preview, a name)

   Deliberately NOT a wizard: no step counter, no Next, no summary
   screen. Question one answers itself the moment you click, and
   question two arrives with its answer already chosen — the
   default preset is selected, the name is filled in, and the only
   button on the sheet is CREATE TABLE. The preview does the
   explaining, so nothing has to be read twice.

   A PRESET IS A STARTING POINT, NEVER A CAGE. The chosen chain is
   typed in, not read off: every level plate on it is a text field,
   each plate carries an × that removes that level, and + LEVEL adds
   one on the end. The real workbooks are the argument — Highfield
   runs Brand ▸ Series ▸ Model ▸ Variant, trailers say Series, motors
   have no taxonomy level at all, and only Stacer writes "Range" — so
   both HOW MANY levels there are and WHAT THEY ARE CALLED belong to
   whoever is selling the things, per table.
   ============================================================ */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactElement } from 'react'
import { createPortal } from 'react-dom'
import {
  accentVar,
  TABLE_KINDS,
  type StructurePreset,
  type TableKind,
  type XY,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { TableKindSymbol } from './symbols'
import { buildPreview, previewNote } from './preview'
import { applyStructure } from './structure'
import { tableCentrePosition } from './dnd'
import './tablekit.css'

/** One deeper than the deepest real taxonomy on file (Brand ▸ Series ▸
 *  Model ▸ Variant), so nobody is capped at what we happened to see —
 *  and shallow enough that the preview stays a glance, not a scroll. */
const MAX_LEVELS = 5

/** What a level plate says when the user has emptied it and tried to
 *  create anyway. Quiet, inline, and gone the moment they type. */
const BLANK_LEVEL_NOTE = 'Every level needs a name.'

/** "put the caret in whatever the last plate turns out to be" — the
 *  index cannot be worked out at click time, because two clicks in one
 *  tick both see the chain as it was before either of them landed. */
const FOCUS_LAST = -1

/** Two chains that would build the same table. */
const sameChain = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((level, i) => level === b[i])

const KIND_ORDER: TableKind[] = [
  'boat',
  'motor',
  'trailer',
  'accessory',
  'package',
  'dealer',
  'custom',
]

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

function CrossMark({ size = 11 }: { size?: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.4 2.4 9.6 9.6M9.6 2.4 2.4 9.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function BackMark(): ReactElement {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true" focusable="false">
      <path
        d="M5.7 1.4 2.7 4.5l3 3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* The chain link and the group caret are drawn, not typed: ▸ and ▾ set
   as lumpy dashes at 9–10px in Archivo, which is exactly the size they
   are used at here. */
function ChainArrow(): ReactElement {
  return (
    <svg width="7" height="8" viewBox="0 0 8 8" aria-hidden="true" focusable="false">
      <path
        d="M3 1.9 5.2 4 3 6.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function GroupCaret(): ReactElement {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" focusable="false">
      <path
        d="M1.9 3 4 5.2 6.1 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** `Brand ▸ Range ▸ Model`, each level on its own small plate. */
function Chain({ levels }: { levels: string[] }): ReactElement {
  if (levels.length === 0) {
    return (
      <span className="tk-chain">
        <span className="tk-plate">One list</span>
      </span>
    )
  }
  return (
    <span className="tk-chain">
      {levels.map((level, i) => (
        /* index keys: two levels may briefly share a name while one is
           being typed over, and the plates never reorder */
        <span className="tk-chain-step" key={i}>
          {i > 0 && (
            <span className="tk-chain-arrow">
              <ChainArrow />
            </span>
          )}
          <span className="tk-plate">{level}</span>
        </span>
      ))}
    </span>
  )
}

/* The plate grows with what is typed into it: 10px mono, 0.1em of
   letter-spacing per character, plus two pixels for the caret. The
   plate's own padding lives on the shell around this input, not here. */
function plateWidth(value: string): string {
  const n = Math.max(4, value.length)
  return `calc(${n}ch + ${(n * 0.1).toFixed(2)}em + 2px)`
}

export interface NewTableDialogProps {
  /** omit it and the dialog is up: hosts that mount it on demand need no flag */
  open?: boolean
  /** skips straight to question two — how a dragged chip arrives */
  initialKind?: TableKind
  /** the same thing under the name the canvas's drop request uses */
  kind?: TableKind
  /** flow-space top-left for the new table; omitted lets the store place it */
  position?: XY
  onClose: () => void
}

export function NewTableDialog({
  open: openProp,
  initialKind,
  kind: kindProp,
  position,
  onClose,
}: NewTableDialogProps): ReactElement | null {
  const open = openProp ?? true
  const startKind = initialKind ?? kindProp ?? null
  const rootRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const firstCardRef = useRef<HTMLButtonElement | null>(null)
  const levelRefs = useRef<(HTMLInputElement | null)[]>([])
  const addRef = useRef<HTMLButtonElement | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  const [kind, setKind] = useState<TableKind | null>(startKind)
  const [structureId, setStructureId] = useState<string>(
    startKind ? TABLE_KINDS[startKind].structures[0].id : '',
  )
  /* the levels as the user has them — seeded from a preset, theirs after */
  const [levels, setLevels] = useState<string[]>(
    startKind ? TABLE_KINDS[startKind].structures[0].levels : [],
  )
  const [name, setName] = useState<string>(startKind ? TABLE_KINDS[startKind].label : '')
  const [nameTouched, setNameTouched] = useState(false)
  /* a level plate to put the caret in once it has been rendered */
  const [focusLevel, setFocusLevel] = useState<number | null>(null)
  /* the emptied plate that stopped the last CREATE — index, or null.
     Not a modal, not a disabled button: the sheet just says which one. */
  const [blankAt, setBlankAt] = useState<number | null>(null)

  /* every opening starts clean — a dialog that remembers the last
     answer is a dialog you have to check before you trust it */
  useEffect(() => {
    if (!open) return
    setKind(startKind)
    setStructureId(startKind ? TABLE_KINDS[startKind].structures[0].id : '')
    setLevels(startKind ? TABLE_KINDS[startKind].structures[0].levels : [])
    setName(startKind ? TABLE_KINDS[startKind].label : '')
    setNameTouched(false)
    setBlankAt(null)
  }, [open, startKind])

  /* focus goes into the sheet and comes back out to whatever opened it */
  useEffect(() => {
    if (!open) return
    const returnTo = document.activeElement as HTMLElement | null
    return () => {
      if (returnTo && typeof returnTo.focus === 'function' && document.contains(returnTo)) {
        returnTo.focus()
      }
    }
  }, [open])

  const step: 1 | 2 = kind ? 2 : 1

  useEffect(() => {
    if (!open) return
    if (step === 1) firstCardRef.current?.focus()
    /* question two opens with the caret in the first level: the fastest
       way to say "these words are yours" is to be already in one. Enter
       still creates the table, so a dragged chip is two keystrokes. */
    else (levelRefs.current[0] ?? nameRef.current)?.focus()
    /* deliberately not keyed on the chosen preset: refocusing on every
       change would fight the user's pointer */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step])

  /* A level that was just added takes the caret, with its placeholder
     name selected so the first keystroke replaces it; a level that was
     just removed hands the caret to its neighbour rather than dropping
     it on the body. The index is resolved HERE, against what actually
     rendered, so a fast second click can never aim at a plate that is
     no longer on the chain. */
  useEffect(() => {
    if (focusLevel === null) return
    setFocusLevel(null)
    const last = levels.length - 1
    const at = focusLevel === FOCUS_LAST ? last : Math.min(focusLevel, last)
    const el = at >= 0 ? levelRefs.current[at] : null
    if (el) {
      el.focus()
      el.select()
    } else {
      /* the chain is empty now — the only thing left to press is + LEVEL */
      addRef.current?.focus()
    }
  }, [focusLevel, levels.length])

  /* The sheet owns the keyboard while it is up. Escape closes it, Tab
     cycles inside it, and Delete/Backspace never reach the canvas's
     window listener — a focused card must not delete the selected table. */
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current
      if (!root) return
      const inside = event.target instanceof Node && root.contains(event.target)

      if (event.key === 'Tab') {
        if (!inside && document.activeElement !== document.body) return
        const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (!active || !root.contains(active)) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
        event.stopPropagation()
        return
      }

      if (!inside) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') event.stopPropagation()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  const meta = kind ? TABLE_KINDS[kind] : null
  const preset: StructurePreset | null = useMemo(() => {
    if (!meta) return null
    return meta.structures.find((p) => p.id === structureId) ?? meta.structures[0]
  }, [meta, structureId])

  /* the preview follows the levels as they are typed, not the preset —
     rename Range to Series and the boats underneath do not move */
  const preview = useMemo(
    () => (kind && preset ? buildPreview(kind, levels) : null),
    [kind, preset, levels],
  )

  /* read inside a setState updater, so it must not be state */
  const nameTouchedRef = useRef(false)
  nameTouchedRef.current = nameTouched

  /* true once the chain stops being the preset and starts being theirs */
  const edited = useMemo(
    () => (preset ? !sameChain(preset.levels, levels) : false),
    [preset, levels],
  )

  /* a name the user typed survives changing your mind about the kind;
     an untouched one keeps following the kind's own label */
  const chooseKind = useCallback((next: TableKind) => {
    const first = TABLE_KINDS[next].structures[0]
    setKind(next)
    setStructureId(first.id)
    setLevels(first.levels)
    setBlankAt(null)
    setName((prev) => (nameTouchedRef.current ? prev : TABLE_KINDS[next].label))
  }, [])

  const back = useCallback(() => setKind(null), [])

  const choosePreset = useCallback((p: StructurePreset) => {
    setStructureId(p.id)
    setLevels(p.levels)
    setBlankAt(null)
    /* the button they pressed has just become the editable chain, so
       the caret goes into it rather than falling out onto the page */
    setFocusLevel(0)
  }, [])

  const renameLevel = useCallback((at: number, value: string) => {
    setLevels((prev) => prev.map((level, i) => (i === at ? value : level)))
    /* the note is about the plate you are in; typing in it answers it */
    setBlankAt((prev) => (prev === at ? null : prev))
  }, [])

  /* add and remove read the chain THROUGH the updater, never off the
     render they were declared in: pressing + LEVEL twice quickly must
     add two levels, not the same level twice */
  const addLevel = useCallback(() => {
    setLevels((prev) =>
      prev.length >= MAX_LEVELS ? prev : [...prev, `Level ${prev.length + 1}`],
    )
    setFocusLevel(FOCUS_LAST)
    setBlankAt(null)
  }, [])

  /* Any plate can go, not just the last one — a dealer who nests
     Brand ▸ Series ▸ Model and does not use series takes the middle
     one out, and Model moves up. */
  const removeLevel = useCallback((at: number) => {
    setLevels((prev) => prev.filter((_, i) => i !== at))
    setBlankAt(null)
    /* the caret goes to the plate on the left, or to + LEVEL if that
       was the last one — a modal must never leave focus on the body */
    setFocusLevel(Math.max(0, at - 1))
  }, [])


  const create = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      if (!kind || !preset) return

      /* A level with no name is not a level. Say so on the plate it
         belongs to and put the caret back in it — never a second
         window on top of this one to deliver one short sentence. */
      const blank = levels.findIndex((level) => level.trim().length === 0)
      if (blank >= 0) {
        setBlankAt(blank)
        setFocusLevel(blank)
        return
      }

      const kindMeta = TABLE_KINDS[kind]
      const wanted = levels.map((level) => level.trim())

      /* HOW THE USER'S WORDS GET THROUGH: `createTable` only speaks
         preset — { kind, structureId, name, position } — so start it on
         the preset of this kind that is ALREADY the right depth (fewest
         columns to fix), then reconcile the words afterwards through
         updateField / addField / removeField. See ./structure.ts. */
      const base =
        kindMeta.structures.find((p) => p.levels.length === wanted.length) ?? preset

      const entity = useProjectStore.getState().createTable({
        kind,
        structureId: base.id,
        name: name.trim() || kindMeta.label,
        /* both ways in land the same way: where the user is looking */
        position: position ?? tableCentrePosition(),
      })

      const asBuilt =
        base.levels.length === wanted.length &&
        base.levels.every((level, i) => level === wanted[i])
      if (!asBuilt) applyStructure(entity.id, wanted)

      closeRef.current()
    },
    [kind, preset, levels, name, position],
  )

  if (!open || typeof document === 'undefined') return null

  const accent = meta ? accentVar(meta.accent) : 'var(--ink)'
  const style = { '--tk-ink': accent } as CSSProperties

  return createPortal(
    <div
      className="tk-overlay"
      ref={overlayRef}
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) closeRef.current()
      }}
    >
      <div className="tk-scrim" aria-hidden="true" />
      <div
        className="tk-dialog"
        ref={rootRef}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tk-question"
      >
        <header className="tk-head">
          <div className="tk-head-top">
            {step === 2 && (
              <button type="button" className="tk-back" onClick={back}>
                <BackMark />
                Table kinds
              </button>
            )}
            {step === 2 && meta && kind ? (
              <span className="tk-kind-tag">
                <TableKindSymbol kind={kind} size={16} />
                {meta.label}
              </span>
            ) : (
              <span className="mono-label tk-eyebrow">New table</span>
            )}
            <button
              type="button"
              className="tk-close"
              onClick={() => closeRef.current()}
              aria-label="Close without creating a table"
              title="Close (Esc)"
            >
              <CrossMark />
            </button>
          </div>
          <h2 className="block-heading tk-question" id="tk-question">
            {step === 1 ? 'What kind of table is this?' : 'How is it structured?'}
          </h2>
        </header>

        {step === 1 || !meta || !preset || !preview ? (
          <div className="tk-step1">
            <div className="tk-kinds">
              {KIND_ORDER.map((k, i) => {
                const m = TABLE_KINDS[k]
                return (
                  <button
                    key={k}
                    type="button"
                    ref={i === 0 ? firstCardRef : undefined}
                    className={`tk-kind-card tk-kind-card--${k}`}
                    style={{ '--tk-ink': accentVar(m.accent) } as CSSProperties}
                    onClick={() => chooseKind(k)}
                  >
                    <span className="tk-kind-sym">
                      <TableKindSymbol kind={k} size={30} />
                    </span>
                    <span className="tk-kind-label">{m.label}</span>
                    <span className="tk-kind-blurb">{m.blurb}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <form className="tk-form" onSubmit={create}>
            <div className="tk-step2">
              <div className="tk-options" role="group" aria-label="How the table is structured">
                {meta.structures.map((p) => {
                  if (p.id !== preset.id) {
                    /* an alternative identical to what you already have is
                       not an alternative — empty the chain and this is what
                       stops a second row underneath it also saying ONE LIST */
                    if (sameChain(p.levels, levels)) return null
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="tk-opt"
                        onClick={() => choosePreset(p)}
                      >
                        <Chain levels={p.levels} />
                        <span className="tk-opt-cap">{p.caption}</span>
                      </button>
                    )
                  }
                  /* THE CHOSEN CHAIN IS TYPED IN, NOT READ OFF. */
                  return (
                    <div key={p.id} className="tk-opt is-on" role="group" aria-label="Your levels">
                      <div className="tk-chain">
                        {levels.length === 0 && <span className="tk-plate">One list</span>}
                        {levels.map((level, i) => (
                          <span className="tk-chain-step" key={i}>
                            {i > 0 && (
                              <span className="tk-chain-arrow">
                                <ChainArrow />
                              </span>
                            )}
                            <span
                              className={`tk-plate tk-lvl${
                                blankAt === i ? ' is-blank' : ''
                              }`}
                            >
                              <input
                                ref={(el) => {
                                  levelRefs.current[i] = el
                                }}
                                className="tk-lvl-in"
                                value={level}
                                style={{ width: plateWidth(level) }}
                                aria-label={`Level ${i + 1} name`}
                                aria-invalid={blankAt === i || undefined}
                                aria-describedby={
                                  blankAt === i ? 'tk-lvl-note' : undefined
                                }
                                spellCheck={false}
                                autoComplete="off"
                                onChange={(e) => renameLevel(i, e.target.value)}
                              />
                              <button
                                type="button"
                                className="tk-lvl-x"
                                onClick={() => removeLevel(i)}
                                aria-label={`Remove the ${
                                  level.trim() || `level ${i + 1}`
                                } level`}
                                title="Remove this level"
                              >
                                <CrossMark size={8} />
                              </button>
                            </span>
                          </span>
                        ))}
                        {levels.length < MAX_LEVELS && (
                          <button
                            type="button"
                            ref={addRef}
                            className="tk-plate tk-plate-add"
                            onClick={addLevel}
                          >
                            + level
                          </button>
                        )}
                      </div>
                      <span className="tk-opt-cap">
                        {edited ? 'Your own structure.' : p.caption}
                      </span>
                      {blankAt !== null && (
                        <p className="tk-lvl-note" id="tk-lvl-note" role="status">
                          {BLANK_LEVEL_NOTE}
                        </p>
                      )}
                    </div>
                  )
                })}
                {levels.length > 0 && (
                  <p className="tk-lvl-hint">
                    These levels are yours — click one to rename it, × takes it
                    out.
                  </p>
                )}
              </div>

              <div className="tk-preview">
                <div className="tk-preview-head">
                  <span className="mono-label">Preview</span>
                  <span className="tk-preview-sub">how your rows will sit</span>
                </div>
                <ul className="tk-prev-list">
                  {preview.lines.map((line) => (
                    <li
                      key={line.key}
                      className={`tk-prev-line tk-d${Math.min(line.depth, 3)}${
                        line.isLeaf ? ' is-leaf' : ''
                      }`}
                      style={{ '--tk-d': line.depth } as CSSProperties}
                    >
                      <span className="tk-prev-caret">
                        {line.isLeaf ? null : <GroupCaret />}
                      </span>
                      <span className="tk-prev-label">{line.label}</span>
                      {line.count !== undefined && (
                        <span className="tk-prev-count">{line.count}</span>
                      )}
                    </li>
                  ))}
                  {preview.truncated && (
                    <li className="tk-prev-line is-more" aria-hidden="true">
                      <span className="tk-prev-caret" />
                      <span className="tk-prev-label">…</span>
                    </li>
                  )}
                </ul>
                <p className="tk-preview-note">{previewNote(levels)}</p>
              </div>
            </div>

            <footer className="tk-foot">
              <label className="tk-name">
                <span className="mono-label">Table name</span>
                <input
                  ref={nameRef}
                  className="field-input"
                  value={name}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => {
                    setName(e.target.value)
                    setNameTouched(true)
                  }}
                />
              </label>
              <button type="submit" className="btn btn-primary tk-create">
                Create table
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
