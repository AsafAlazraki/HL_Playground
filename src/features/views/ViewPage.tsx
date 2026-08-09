/* ============================================================
   THE VIEW PAGE — "for this thing, what else goes with it?"

   Read mode is the default and is COMPLETELY CLEAN: the thing's
   name and its specs, then one quiet block per related table.
   Nothing on it exists for the person who built it — it is a page
   you would put in front of a customer.

   One control: the ⚙ in the top-right. It does not open a screen
   and it does not open a form that represents this page. It grows
   handles on the drawing already in front of you, and pressing it
   again takes them away. THE USER NEVER LEAVES THE PAGE THEY ARE
   CONFIGURING.

   Drag a table in from the panel and we look at both tables and
   offer a rule in one English sentence, with three buttons. Until
   one of them is pressed, NOTHING has been created: no block, no
   rule, and above all no join table.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent as ReactDragEvent, ReactElement } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Gear, Plus, Warning, X } from '@phosphor-icons/react'
import {
  accentVar,
  rowLabel,
  type CellValue,
  type ClauseGroup,
  type EntityDef,
  type RowData,
} from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import { defaultColumns, formatCell, formatRange, rangePairs, splitUnit } from './columns'
import { levelCaption, levelOptions, levelValues, oneOf, rowsInScope, singular } from './describe'
import { findJoinTable, makeEngine, type Ctx } from './pairs'
import { addBlock, setBlockRule, useViewDef, walkBlocks } from './viewDefs'
import { BlockCard, type PendingDrop } from './BlockCard'
import { RuleOffer } from './RuleOffer'
import { KindMark } from './marks'
import { SPRING, SPRING_SOFT, StillnessProvider, transitionFor, useStillness } from './stillness'
import { isTableDrag, readTableDrag } from './dnd'
import './views.css'

export interface ViewPageProps {
  viewId: string
  rowId: string
}

/** Drop a sentence's leading capital without flattening the names inside
 *  it — "All variants in SP560" must not become "…in sp560". */
const uncapitalise = (s: string): string =>
  s.length > 1 && s[1] === s[1].toLowerCase() ? s[0].toLowerCase() + s.slice(1) : s

export function ViewPage(props: ViewPageProps): ReactElement {
  return (
    <StillnessProvider>
      <ViewPageBody {...props} />
    </StillnessProvider>
  )
}

/* ---------------------------------------------------------- */

function ViewPageBody({ viewId, rowId }: ViewPageProps): ReactElement {
  const view = useViewDef(viewId)
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const { still } = useStillness()

  const [configuring, setConfiguring] = useState(false)
  const [picking, setPicking] = useState(false)
  const [pending, setPending] = useState<PendingDrop | null>(null)
  const [refusal, setRefusal] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [scope, setScope] = useState<number | undefined>(undefined)
  const seq = useRef(0)

  const ctx: Ctx = useMemo(() => ({ entities, rowsByEntity }), [entities, rowsByEntity])
  const engine = useMemo(() => makeEngine(ctx), [ctx])

  const root: EntityDef | undefined = view ? entities[view.rootTableId] : undefined
  const row: RowData | undefined = useMemo(
    () => (root ? (rowsByEntity[root.id] ?? []).find((r) => r.id === rowId) : undefined),
    [root, rowsByEntity, rowId],
  )

  const levels = useMemo(() => (root && row ? levelOptions(root, row) : []), [root, row])
  const deepest = levels.length > 0 ? levels[0].scope : undefined

  /* the rows a decision lands on: this one, or every row of the level
     chosen in the header. Computed once, here, so a block never has to
     work out what "all variants in SP560" means. */
  const appliesTo = useMemo(
    () =>
      root && row ? rowsInScope(root, rowsByEntity[root.id] ?? [], row, scope ?? deepest) : [],
    [root, row, rowsByEntity, scope, deepest],
  )

  /* THE SAME TABLES THE DRAG OFFERS, as a list that can be clicked.
     Dragging a table across the window was the ONLY way to put one on a
     page — one gesture, no keyboard, and nothing to try when it missed.
     The drag is now the shortcut, not the door. */
  const addable = useMemo<EntityDef[]>(() => {
    if (!view || !root) return []
    const taken = new Set(view.blocks.map((b) => b.tableId))
    return Object.values(entities)
      .filter((e) => e.role !== 'join' && e.id !== root.id && !taken.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [entities, view, root])

  /* the safe answer is the narrow one, so the default is always
     "this row only" — and it resets when the page changes row */
  useEffect(() => {
    setScope(deepest)
  }, [deepest, rowId, viewId])

  /* a refusal is a sentence, not a dialog: it says why and goes away */
  useEffect(() => {
    if (!refusal) return
    const t = setTimeout(() => setRefusal(null), 7000)
    return () => clearTimeout(t)
  }, [refusal])

  const refuse = useCallback((message: string) => {
    setPending(null)
    setRefusal(message)
  }, [])

  const offerDrop = useCallback((parentBlockId: string | null, tableId: string) => {
    seq.current += 1
    setRefusal(null)
    setConfiguring(true)
    setPending({ parentBlockId, tableId, seq: seq.current })
  }, [])

  const onPageDrop = (e: ReactDragEvent<HTMLElement>): void => {
    if (!isTableDrag(e)) return
    e.preventDefault()
    setDragOver(false)
    const tableId = readTableDrag(e)
    if (!tableId || !view || !root) return
    if (tableId === root.id) {
      refuse(`You are already looking at ${oneOf(root.name)} — pick a different table.`)
      return
    }
    if (view.blocks.some((b) => b.tableId === tableId)) {
      refuse(`${entities[tableId]?.name ?? 'That table'} is already on this page.`)
      return
    }
    offerDrop(null, tableId)
  }

  /** Accepting the offer is the ONLY thing that creates a block. An
   *  existing join is adopted; a new one is not made until someone
   *  actually curates (see pairs.ts). */
  const acceptPending = (rule: ClauseGroup | undefined): void => {
    if (!pending || !view) return
    const parentAt = pending.parentBlockId
      ? walkBlocks(view).find((b) => b.block.id === pending.parentBlockId)
      : undefined
    const sourceId = parentAt ? parentAt.block.tableId : view.rootTableId
    const join = findJoinTable(entities, sourceId, pending.tableId)
    const id = addBlock(view.id, pending.parentBlockId, {
      tableId: pending.tableId,
      ...(join ? { joinTableId: join.entityId } : {}),
    })
    if (id) setBlockRule(view.id, id, rule)
    setPending(null)
  }

  const cancelPending = useCallback(() => setPending(null), [])

  /* -- nothing to draw --------------------------------------- */

  if (!view || !root || !row) {
    return (
      <div className="vw-root">
        <div className="vw-sheet">
          <p className="vw-void">
            {!view
              ? 'That page has not been set up.'
              : !root
                ? 'The table this page was drawn for is no longer here.'
                : 'That row is no longer here.'}
          </p>
        </div>
      </div>
    )
  }

  const trail = levelValues(root, row)
    .slice(0, -1)
    .filter((v) => v !== '')
  const pendingHere = pending && pending.parentBlockId === null ? pending : null
  const pendingTable = pendingHere ? entities[pendingHere.tableId] : undefined

  return (
    <div
      className={`vw-root${configuring ? ' is-config' : ''}${dragOver ? ' is-drop' : ''}`}
      style={{ '--vw-root-accent': accentVar(root.accent) } as CSSProperties}
      onDragOver={(e) => {
        if (!isTableDrag(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setDragOver(false)
      }}
      onDrop={onPageDrop}
    >
      <div className="vw-sheet">
        <span className="vw-tick vw-tick--tl" aria-hidden="true" />
        <span className="vw-tick vw-tick--tr" aria-hidden="true" />

        <header className="vw-head">
          <div className="vw-head-id">
            {trail.length > 0 ? (
              <p className="vw-trail mono-label">
                {trail.map((t, i) => (
                  <span key={`${t}-${i}`} className="vw-trail-step">
                    {i > 0 ? (
                      <span className="vw-trail-sep" aria-hidden="true">
                        ▸
                      </span>
                    ) : null}
                    {t}
                  </span>
                ))}
              </p>
            ) : (
              <p className="vw-trail mono-label">
                <KindMark entity={root} size={ICON_SIZE.tiny} />
                {root.name}
              </p>
            )}

            <h1 className="vw-name">{rowLabel(root, row)}</h1>
            <SpecStrip entity={root} row={row} engine={engine} />
          </div>

          <button
            type="button"
            className={`vw-gear${configuring ? ' is-on' : ''}`}
            aria-pressed={configuring}
            title={configuring ? 'Done — back to the clean page' : 'Set up this page'}
            onClick={() => {
              setConfiguring((v) => !v)
              setPicking(false)
              setPending(null)
              setRefusal(null)
            }}
          >
            {configuring ? <Check size={16} weight="bold" /> : <Gear size={16} weight="light" />}
            <span className="vw-gear-word">{configuring ? 'Done' : 'Set up'}</span>
          </button>
        </header>

        <AnimatePresence initial={false}>
          {configuring && levels.length > 1 ? (
            <motion.div
              key="levels"
              className="vw-levels"
              initial={still ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={transitionFor(still, SPRING_SOFT)}
            >
              <label className="vw-levels-lab">
                <span className="mono-label">Changes apply to</span>
                <select
                  className="field-input vw-select"
                  value={scope ?? deepest ?? 0}
                  onChange={(e) => setScope(Number(e.target.value))}
                >
                  {levels.map((l) => (
                    <option key={l.scope} value={l.scope}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="vw-levels-note">
                What you keep, drop or star lands on{' '}
                {uncapitalise(levelCaption(root, row, scope ?? deepest ?? 0))}
                {appliesTo.length > 1 ? ` — ${appliesTo.length} of them` : ''}. Change one of them
                on its own later and that one wins.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {refusal ? (
            <motion.p
              key={refusal}
              className="vw-refusal"
              role="status"
              initial={still ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={transitionFor(still, SPRING)}
            >
              <Warning size={14} weight="light" aria-hidden="true" />
              <span className="vw-refusal-text">{refusal}</span>
              <button
                type="button"
                className="vw-icon-btn"
                title="Dismiss"
                onClick={() => setRefusal(null)}
              >
                <X size={12} weight="bold" />
              </button>
            </motion.p>
          ) : null}
        </AnimatePresence>

        <div className="vw-blocks">
          {view.blocks.map((block, i) => (
            <BlockCard
              key={block.id}
              viewId={view.id}
              block={block}
              depth={2}
              ctx={ctx}
              engine={engine}
              sourceEntity={root}
              sourceRow={row}
              appliesTo={appliesTo}
              configuring={configuring}
              index={i}
              onDropTable={offerDrop}
              onRefuse={refuse}
              pending={pending}
              onPendingUse={acceptPending}
              onPendingCancel={cancelPending}
            />
          ))}
        </div>

        {pendingHere && pendingTable ? (
          <RuleOffer
            key={pendingHere.seq}
            root={root}
            target={pendingTable}
            onUse={acceptPending}
            onCancel={cancelPending}
          />
        ) : null}

        {view.blocks.length === 0 && !pendingHere ? (
          <section className="vw-nothing">
            <p className="vw-nothing-line">Nothing goes with this yet.</p>
            <p className="vw-nothing-sub">
              {configuring
                ? `Add a table below — or drag one in from the left — and we will work out how it relates to this ${singular(root.name)}.`
                : 'Press SET UP, then add a table.'}
            </p>
          </section>
        ) : null}

        <AnimatePresence initial={false}>
          {configuring ? (
            <motion.div
              key="foot"
              className="vw-foot"
              initial={still ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={transitionFor(still, SPRING_SOFT)}
            >
              {picking ? (
                <section
                  className="vw-add vw-pickzone"
                  aria-label={`Add a table to this ${singular(root.name)}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      setPicking(false)
                    }
                  }}
                >
                  <div className="vw-add-bar">
                    <span className="mono-label vw-add-lead">
                      What else goes with {oneOf(root.name)}?
                    </span>
                    <button
                      type="button"
                      className="vw-icon-btn"
                      title="Close"
                      onClick={() => setPicking(false)}
                    >
                      <X size={13} weight="bold" />
                    </button>
                  </div>

                  {addable.length === 0 ? (
                    <p className="vw-add-none">
                      Every other table is already on this page.
                    </p>
                  ) : (
                    <ul className="vw-add-list">
                      {addable.map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            className="vw-add-row"
                            title={`Show ${e.name} on this page`}
                            onClick={() => {
                              setPicking(false)
                              offerDrop(null, e.id)
                            }}
                          >
                            <span className="vw-add-plus" aria-hidden="true">
                              <KindMark entity={e} />
                            </span>
                            <span className="vw-add-name">{e.name}</span>
                            <span className="vw-add-cells">
                              <span className="vw-add-cell">
                                {(rowsByEntity[e.id] ?? []).length}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : (
                <button
                  type="button"
                  className={`vw-dropzone${dragOver ? ' is-over' : ''}`}
                  onClick={() => setPicking(true)}
                >
                  <Plus size={13} weight="bold" aria-hidden="true" />
                  <span className="mono-label">
                    Add a table — or drag one in from the left
                  </span>
                </button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* The spec plate — the row's own facts, set as data           */
/* ---------------------------------------------------------- */

interface Spec {
  label: string
  value: string
}

function SpecStrip({
  entity,
  row,
  engine,
}: {
  entity: EntityDef
  row: RowData
  engine: ReturnType<typeof makeEngine>
}): ReactElement | null {
  const specs = useMemo<Spec[]>(() => {
    const values = engine.valuesOf({ entityId: entity.id, row })
    const read = (fieldId: string): CellValue => values[fieldId] ?? null
    const out: Spec[] = []
    const used = new Set<string>(entity.hierarchy ?? [])
    /* "HP · 90–115 HP" reads like a stutter; the label already said it */
    const withUnit = (label: string, text: string, unit?: string): Spec =>
      unit && unit.toLowerCase() !== label.toLowerCase()
        ? { label, value: `${text} ${unit}` }
        : { label, value: text }

    /* an envelope reads as ONE fact — 90–115 HP, never two columns */
    for (const pair of rangePairs(entity)) {
      used.add(pair.min.id)
      used.add(pair.max.id)
      const text = formatRange(read(pair.min.id), read(pair.max.id), pair.min.name)
      if (text === '') continue
      out.push(withUnit(pair.label, text, splitUnit(pair.min.name).unit))
    }

    for (const fieldId of defaultColumns(entity, 8)) {
      if (out.length >= 5) break
      if (used.has(fieldId)) continue
      const field = entity.fields.find((f) => f.id === fieldId)
      if (!field) continue
      const text = formatCell(field, read(fieldId))
      if (text === '') continue
      const { base, unit } = splitUnit(field.name)
      out.push(withUnit(base, text, unit))
    }
    return out
  }, [entity, row, engine])

  if (specs.length === 0) return null
  return (
    <dl className="vw-specs">
      {specs.map((s) => (
        <div key={s.label} className="vw-spec">
          <dt className="mono-label">{s.label}</dt>
          <dd className="vw-spec-val">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}
