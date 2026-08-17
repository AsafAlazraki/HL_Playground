/* ============================================================
   A BLOCK — one related table, drawn for one row.

   READ MODE is a spec table and nothing else: symbol, name, count
   chip, a hairline of column names, the rows. No handles, no
   dashed outlines, no buttons that only make sense to whoever
   built the page.

   CONFIGURE MODE grows handles on exactly the same drawing —
   the header strip (rule · filter · remove), a keep/remove toggle
   and a star per row, a drag grip, and ADD at the foot. Nothing
   moves position between the two modes, so leaving configure mode
   is a subtraction and never a surprise.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { CSSProperties, DragEvent as ReactDragEvent, ReactElement } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUUpLeft,
  Check,
  DotsSixVertical,
  Funnel,
  MagnifyingGlass,
  Plus,
  Sliders,
  Star,
  Trash,
  X,
} from '@phosphor-icons/react'
import {
  accentVar,
  displayFieldOf,
  isDiscontinued,
  rowLabel,
  type CellValue,
  type ClauseGroup,
  type ColumnFilter,
  type EntityDef,
  type RowData,
  type ViewBlock,
} from '@/types/model'
import type { RuleEngine } from '@/lib/rules/evaluate'
import { bandOf, defaultColumns, formatCell } from './columns'
import { countChip, isCuratedOnly, oneOf, plural, singular, summariseRule } from './describe'
import { applyFilters, filterableColumns, valuesInUse } from './filter'
import {
  clearRecommended,
  ensureJoinTable,
  evalPairRule,
  joinRefFor,
  relatedRows,
  writePair,
  type Ctx,
  type JoinRef,
  type RelatedRow,
} from './pairs'
import {
  heldBackSentence,
  retiredPairsSentence,
  retiredTableSentence,
} from './sellable'
import { MAX_DEPTH, removeBlock, setBlockFilters, setBlockRule, updateBlock } from './viewDefs'
import { AddPanel } from './AddPanel'
import { RuleOffer } from './RuleOffer'
import { KindMark } from './marks'
import { RowPicture, pictureField } from './pictures'
import { SPRING, SPRING_QUICK, SPRING_SLOW, transitionFor, useStillness } from './stillness'
import { isRowDrag, isTableDrag, readRowDrag, readTableDrag, setRowDragData } from './dnd'

/** A table dropped in and waiting for an answer. Nothing exists yet. */
export interface PendingDrop {
  /** null = dropped on the page itself */
  parentBlockId: string | null
  tableId: string
  /** bumped per drop, so dropping the same table twice asks twice */
  seq: number
}

export interface BlockCardProps {
  viewId: string
  block: ViewBlock
  /** the root counts as 1, so a top-level block is 2 */
  depth: number
  ctx: Ctx
  engine: RuleEngine
  /** the row this block hangs off — the boat, or the motor above it */
  sourceEntity: EntityDef
  sourceRow: RowData
  /** every row a decision written here lands on. A level chosen in the
   *  page header supplies all the rows of that level; absent = this row
   *  alone, which is what a nested block always means. */
  appliesTo?: string[]
  configuring: boolean
  /** stagger position for the arrival */
  index: number
  onDropTable: (parentBlockId: string, tableId: string) => void
  onRefuse: (message: string) => void
  /** the offer is drawn WHERE THE BLOCK WILL GO, never in a modal */
  pending: PendingDrop | null
  onPendingUse: (rule: ClauseGroup | undefined) => void
  onPendingCancel: () => void
}

export function BlockCard(props: BlockCardProps): ReactElement | null {
  const {
    viewId,
    block,
    depth,
    ctx,
    engine,
    sourceEntity,
    sourceRow,
    appliesTo,
    configuring,
    index,
    onDropTable,
    onRefuse,
    pending,
    onPendingUse,
    onPendingCancel,
  } = props

  const { still, beginTyping, endTyping } = useStillness()
  const [panel, setPanel] = useState<'none' | 'rule' | 'filter' | 'add' | 'remove'>('none')
  const [search, setSearch] = useState('')
  const [openRemoved, setOpenRemoved] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [dropRowId, setDropRowId] = useState<string | null>(null)

  const target = ctx.entities[block.tableId]

  const join = useMemo(
    () =>
      target ? joinRefFor(ctx.entities, block.joinTableId, sourceEntity.id, target.id) : null,
    [ctx.entities, block.joinTableId, sourceEntity.id, target],
  )

  const read = useMemo(
    () =>
      (row: RowData, fieldId: string, entityId: string): CellValue =>
        engine.valuesOf({ entityId, row })[fieldId] ?? null,
    [engine],
  )

  const result = useMemo((): ReturnType<typeof relatedRows> => {
    if (!target) {
      return {
        rows: [],
        removed: [],
        fitCount: 0,
        addedCount: 0,
        removedCount: 0,
        held: [],
        heldCount: 0,
      }
    }
    return relatedRows({
      ctx,
      engine,
      sourceEntity,
      sourceRow,
      targetEntityId: target.id,
      rule: block.rule,
      join,
    })
  }, [ctx, engine, sourceEntity, sourceRow, target, block.rule, join])

  const columns = useMemo(
    () => (target ? (block.columns ?? defaultColumns(target)) : []),
    [target, block.columns],
  )

  /* THE PICTURE TRACK IS A PROPERTY OF THE BLOCK, NOT OF THE ROW.
     Resolved once here: if it were decided per row, a block where
     only some rows carry a photograph would draw its names at two
     different left edges and stop reading as a table. */
  const picField = useMemo(() => pictureField(target), [target])

  const filters = useMemo(() => block.filters ?? [], [block.filters])
  const readRelated = useMemo(
    () => (r: RelatedRow, fieldId: string) => (target ? read(r.row, fieldId, target.id) : null),
    [read, target],
  )

  /* the NAME is the first thing anyone types, so the search covers the
     column the row is named by as well as the columns beside it */
  const searchFieldIds = useMemo(() => {
    const nameId = target ? displayFieldOf(target)?.id : undefined
    return nameId && !columns.includes(nameId) ? [nameId, ...columns] : columns
  }, [target, columns])

  const shown = useMemo(() => {
    if (!target) return []
    return applyFilters({
      rows: result.rows,
      filters,
      search,
      searchFieldIds,
      entity: target,
      read: readRelated,
    })
  }, [result.rows, filters, search, searchFieldIds, target, readRelated])

  if (!target) {
    return (
      <section className="vw-block vw-block--gone">
        <p className="vw-gone">The table this block showed is no longer here.</p>
        {configuring ? (
          <button type="button" className="btn btn-danger" onClick={() => removeBlock(viewId, block.id)}>
            Take it off the page
          </button>
        ) : null}
      </section>
    )
  }

  const byId = new Map(target.fields.map((f) => [f.id, f]))
  const resolveRef = (refEntityId: string | undefined, rowId: string): string => {
    if (!refEntityId) return rowId
    const e = ctx.entities[refEntityId]
    const row = (ctx.rowsByEntity[refEntityId] ?? []).find((r) => r.id === rowId)
    return e && row ? rowLabel(e, row) : ''
  }

  const curated = isCuratedOnly(block.rule)

  /** "Would the rule have brought this in?" — always true when there is
   *  no rule to be outside of, so a curated block never labels its own
   *  contents as exceptions. */
  const fits = (row: RowData): boolean =>
    curated ||
    evalPairRule(engine, block.rule, { entityId: target.id, row }, {
      entityId: sourceEntity.id,
      row: sourceRow,
    })

  /* -- curation: every write lands on a join row -------------- */

  const withJoin = (fn: (j: JoinRef) => void): void => {
    const resolved = join ?? ensureJoinTable(sourceEntity.id, target.id)
    if (!resolved) return
    if (block.joinTableId !== resolved.entityId) {
      updateBlock(viewId, block.id, { joinTableId: resolved.entityId })
    }
    fn(resolved)
  }

  const targets = appliesTo && appliesTo.length > 0 ? appliesTo : [sourceRow.id]

  const address = (j: JoinRef, targetRowId: string) => ({
    join: j,
    sourceEntityId: sourceEntity.id,
    sourceRowIds: targets,
    targetRowId,
  })

  const removeRow = (row: RowData): void => {
    withJoin((j) => writePair(address(j, row.id), { origin: 'removed', recommended: false }))
  }

  const restoreRow = (row: RowData): void => {
    withJoin((j) => writePair(address(j, row.id), { origin: fits(row) ? 'rule' : 'added' }))
  }

  const addRow = (rowId: string): void => {
    withJoin((j) => writePair(address(j, rowId), { origin: 'added' }))
    setPanel('none')
  }

  /** The origin a write must CARRY FORWARD.
   *
   *  Never the origin the row is currently DRAWN with: a pinned-in row
   *  whose rule happens to match it today is drawn as "fit", and writing
   *  that back would quietly demote it to a rule match — so the next time
   *  the rule narrowed, a manual addition would vanish without a trace.
   *  The stored origin on the pair is the truth, and it is preserved. */
  const keepOrigin = (r: RelatedRow | undefined): 'rule' | 'added' =>
    r?.pair?.origin === 'added' ? 'added' : 'rule'

  const toggleStar = (r: RelatedRow): void => {
    withJoin((j) => {
      if (r.recommended) {
        writePair(address(j, r.row.id), { recommended: false })
        return
      }
      clearRecommended(ctx, j, sourceEntity, targets)
      writePair(address(j, r.row.id), { recommended: true, origin: keepOrigin(r) })
    })
  }

  /** Order is what the salesperson sees, so it is written on the pairs —
   *  every row in the block gets a position, not just the two that moved. */
  const moveRow = (fromRowId: string, toRowId: string): void => {
    if (fromRowId === toRowId) return
    const order = result.rows.map((r) => r.row.id)
    const from = order.indexOf(fromRowId)
    const to = order.indexOf(toRowId)
    if (from < 0 || to < 0) return
    order.splice(to, 0, ...order.splice(from, 1))
    withJoin((j) => {
      order.forEach((rowId, i) => {
        const r = result.rows.find((x) => x.row.id === rowId)
        writePair(address(j, rowId), { order: i, origin: keepOrigin(r) })
      })
    })
  }

  /* -- nesting ------------------------------------------------ */

  const acceptsNesting = depth + 1 <= MAX_DEPTH

  const onBlockDrop = (e: ReactDragEvent<HTMLElement>): void => {
    if (!isTableDrag(e)) return
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const tableId = readTableDrag(e)
    if (!tableId) return
    const dropped = ctx.entities[tableId]?.name ?? 'That table'
    if (!acceptsNesting) {
      onRefuse(
        `Three levels is as deep as a page goes, and ${target.name} already sits under ${sourceEntity.name}. Drop ${dropped} on the page instead.`,
      )
      return
    }
    if (tableId === target.id) {
      onRefuse(`${target.name} is already on this page.`)
      return
    }
    onDropTable(block.id, tableId)
  }

  /* -- drawing ------------------------------------------------ */

  const filtering = search.trim() !== '' || filters.length > 0
  const chip = countChip(
    result.fitCount,
    result.removedCount,
    result.addedCount,
    curated ? 'picked' : 'fit',
  )

  /* NOTHING VANISHES SILENTLY. A block that would have offered eight
     and offers six says so here, in words, with the reason and the
     reassurance in the same breath — the count on its own is the
     defect this sentence exists to fix. */
  const joinName = join ? ctx.entities[join.entityId]?.name : undefined
  const heldNote =
    result.historic === 'table'
      ? retiredTableSentence(target.name)
      : result.historic === 'pairs'
        ? retiredPairsSentence(target.name, joinName ?? 'That list')
        : heldBackSentence(result.heldCount, target.name)
  const accent = accentVar(target.accent)
  const children = block.children ?? []

  return (
    <motion.section
      className={`vw-block${dragOver ? ' is-drop' : ''}${configuring ? ' is-config' : ''}`}
      /* the column tracks are declared once, here, so the header
         hairline and every row underneath can never drift apart */
      style={
        {
          '--vw-accent': accent,
          '--vw-cols': columns.length,
          '--vw-grip': configuring ? '20px' : '0px',
          '--vw-acts': configuring ? '58px' : '0px',
          /* the tag track is only worth its width when something is in
             it — an empty one was eating the row's name */
          '--vw-tags': result.addedCount > 0 ? 'auto' : '0px',
          /* the same costs-nothing-when-unused deal: a table with no
             picture column never pays for a picture column */
          '--vw-pic': picField ? '24px' : '0px',
        } as CSSProperties
      }
      aria-label={`${target.name} for ${rowLabel(sourceEntity, sourceRow)}`}
      initial={still ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      /* THE LARGEST THING THAT MOVES ON THIS PAGE, so it gets the
         longest response. apple-design §4's move/reposition row is
         damping 1.0 / response 0.4 and this is that row exactly: a
         whole block card taking its place. At the 300ms default a
         surface this size reads as a snap rather than as an arrival.
         The stagger stays at 50ms, inside emil-design-eng's 30–80ms
         band, and is dropped entirely when the page must not move. */
      transition={{ ...transitionFor(still, SPRING_SLOW), delay: still ? 0 : 0.05 * index }}
      onDragOver={(e) => {
        if (!isTableDrag(e)) return
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        /* dragleave bubbles up from every child, so without this the
           outline flickers off every time the cursor crosses a row */
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setDragOver(false)
      }}
      onDrop={onBlockDrop}
    >
      <header className="vw-block-head">
        <KindMark entity={target} />
        <h2 className="vw-block-name block-heading">{target.name}</h2>
        <span
          className="vw-chip"
          title={
            curated
              ? `${result.fitCount} picked by hand`
              : `${result.fitCount} match the rule`
          }
        >
          {chip}
          {result.heldCount > 0 ? ` · ${result.heldCount} not sold` : ''}
          {filtering ? ` · ${shown.length} shown` : ''}
        </span>
        {depth > 2 && configuring ? (
          <span className="vw-forwhom mono-label">for this {singular(sourceEntity.name)}</span>
        ) : null}
      </header>

      <AnimatePresence initial={false}>
        {configuring ? (
          <motion.div
            key="strip"
            className="vw-strip"
            initial={still ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            /* The third `height` animation that was on the 424ms
               over-damped spring. A strip of three buttons growing out
               of a header is a small surface answering a press, so it
               takes the default response — and it is now 124ms less of
               a wait before the handles are usable. */
            transition={transitionFor(still, SPRING)}
          >
            <button
              type="button"
              className={`vw-strip-btn${panel === 'rule' ? ' is-on' : ''}`}
              aria-pressed={panel === 'rule'}
              onClick={() => setPanel(panel === 'rule' ? 'none' : 'rule')}
            >
              <Sliders size={13} weight="light" />
              Rule
              <span className="vw-strip-note">{summariseRule(block.rule, sourceEntity, target)}</span>
            </button>
            <button
              type="button"
              className={`vw-strip-btn${panel === 'filter' ? ' is-on' : ''}`}
              aria-pressed={panel === 'filter'}
              onClick={() => setPanel(panel === 'filter' ? 'none' : 'filter')}
            >
              <Funnel size={13} weight="light" />
              Filter
              {filtering ? <span className="vw-strip-dot" aria-hidden="true" /> : null}
            </button>
            <button
              type="button"
              className={`vw-strip-btn vw-strip-btn--end${panel === 'remove' ? ' is-on' : ''}`}
              aria-pressed={panel === 'remove'}
              onClick={() => setPanel(panel === 'remove' ? 'none' : 'remove')}
            >
              <Trash size={13} weight="light" />
              Remove
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {configuring && panel === 'remove' ? (
        <div className="vw-confirm" role="group">
          <p className="vw-confirm-ask">
            Take {target.name} off this page? Nothing is deleted — everything you picked, dropped
            or starred is kept
            {join && ctx.entities[join.entityId]
              ? ` in ${ctx.entities[join.entityId].name}`
              : ''}
            , so putting {target.name} back brings it all with it.
          </p>
          <div className="vw-confirm-acts">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => removeBlock(viewId, block.id)}
            >
              Take it off
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setPanel('none')}>
              Keep it
            </button>
          </div>
        </div>
      ) : null}

      {configuring && panel === 'rule' ? (
        <RuleOffer
          root={sourceEntity}
          target={target}
          current={block.rule}
          changing
          onUse={(rule) => {
            setBlockRule(viewId, block.id, rule)
            setPanel('none')
          }}
          onCancel={() => setPanel('none')}
        />
      ) : null}

      {configuring && panel === 'filter' ? (
        <FilterBar
          entity={target}
          rows={result.rows}
          filters={filters}
          search={search}
          read={readRelated}
          onSearch={setSearch}
          onFilters={(next) => setBlockFilters(viewId, block.id, next)}
          onTypingStart={beginTyping}
          onTypingEnd={endTyping}
        />
      ) : null}

      {result.rows.length > 0 ? (
        <div className="vw-cols" aria-hidden="true">
          <span className="vw-col-grip" />
          {/* no word above a photograph — the track is held, not labelled */}
          <span className="vw-col-pic" />
          <span className="vw-col-name mono-label">
            {displayFieldOf(target)?.name ?? target.name}
          </span>
          {columns.map((c) => (
            <span key={c} className="vw-col mono-label">
              {byId.get(c)?.name ?? ''}
            </span>
          ))}
          <span className="vw-col-tail" />
          <span className="vw-col-acts" />
        </div>
      ) : null}

      {/* KEYED BY THE SUBJECT, NOT JUST BY THE ROWS INSIDE IT. Picking a
          different boat in the rail does not mean "these trailers left" —
          it means this is a different list. Without the key the departing
          rows were handed to AnimatePresence as an exit, and an exit to
          `height: 0` under a `layout` prop never completed: switching from
          a boat with one trailer to a boat with none left the first boat's
          trailer painted under a header reading 0 PICKED, beside the words
          "No NSM Custom Trailers picked for this Highfield Inflatable yet."
          One contradictory block, held indefinitely.

          Keying the list on the source row makes the switch a remount, so
          nothing has to animate its way out. Removing a row from the boat
          you are actually on still animates — `sourceRow.id` has not
          changed there, so this list is the same list. */}
      <ul className="vw-rows" key={sourceRow.id}>
        <AnimatePresence initial={false}>
          {shown.map((r) => (
            <motion.li
              key={r.row.id}
              className={`vw-row${r.recommended ? ' is-star' : ''}${
                dropRowId === r.row.id ? ' is-droptarget' : ''
              }`}
              layout={still ? false : 'position'}
              initial={still ? false : { opacity: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              /* THE MOST-SEEN ANIMATION IN THE FEATURE. Every star,
                 every remove, every filter keystroke moves these rows,
                 dozens of times an hour — emil-design-eng's frequency
                 table says drastically reduce at that rate, and the
                 quick spring is that reduction. It stays a spring
                 rather than becoming nothing because these rows carry
                 `layout`: a row leaving mid-flight must be grabbable
                 and re-targetable, which is exactly what a keyframe
                 cannot do (apple-design §3). */
              transition={transitionFor(still, SPRING_QUICK)}
            >
              {/* the native drag lives on a plain element: `motion` claims
                  onDragStart for its own gesture, and the two must not meet */}
              <div
                className="vw-row-line"
                draggable={configuring || undefined}
                onDragStart={(e) => {
                  if (!configuring) return
                  setRowDragData(e, block.id, r.row.id)
                }}
                onDragOver={(e) => {
                  if (!configuring || !isRowDrag(e)) return
                  e.preventDefault()
                  e.stopPropagation()
                  setDropRowId(r.row.id)
                }}
                onDragLeave={() => setDropRowId((id) => (id === r.row.id ? null : id))}
                onDrop={(e) => {
                  if (!configuring || !isRowDrag(e)) return
                  e.preventDefault()
                  e.stopPropagation()
                  setDropRowId(null)
                  const from = readRowDrag(e, block.id)
                  if (from) moveRow(from, r.row.id)
                }}
              >
                <span
                  className="vw-grip"
                  title={configuring ? 'Drag to reorder' : undefined}
                  aria-hidden="true"
                >
                  {configuring ? <DotsSixVertical size={14} weight="light" /> : null}
                </span>

                {/* The span is drawn whether or not this row has a
                    picture: the track is the block's, so an empty one
                    keeps the row aligned with the rest. Read-only —
                    the strip in the table is where order is changed,
                    and this is where the change is seen. */}
                <span className="vw-pic">
                  {picField ? <RowPicture row={r.row} field={picField} /> : null}
                </span>

                {r.recommended ? (
                  <span className="vw-star" title="Recommended">
                    <Star size={12} weight="fill" />
                  </span>
                ) : null}

                <span className="vw-row-name" title={rowLabel(target, r.row)}>
                  {rowLabel(target, r.row)}
                </span>

                {columns.map((c) => (
                  <span key={c} className="vw-cell">
                    {/* the band goes with the column: a figure filed
                        under Supply Pricing is money even where its
                        name is `P&A`, and `MU` is a ratio even there */}
                    {formatCell(
                      byId.get(c),
                      readRelated(r, c),
                      resolveRef,
                      bandOf(target, byId.get(c)),
                    )}
                  </span>
                ))}

                <span className="vw-row-tags">
                  {r.origin === 'added' ? (
                    <span className="vw-tag vw-tag--added" title="Pinned in although the rule does not match it">
                      added
                    </span>
                  ) : null}
                </span>

                <span className="vw-row-acts">
                  {configuring ? (
                    <>
                      <button
                        type="button"
                        className={`vw-icon-btn${r.recommended ? ' is-on' : ''}`}
                        aria-pressed={r.recommended}
                        title={r.recommended ? 'Not the recommended one' : 'Recommend this one'}
                        onClick={() => toggleStar(r)}
                      >
                        <Star size={13} weight={r.recommended ? 'fill' : 'light'} />
                      </button>
                      <button
                        type="button"
                        className="vw-icon-btn vw-icon-btn--drop"
                        title={`Do not show ${rowLabel(target, r.row)} here`}
                        onClick={() => removeRow(r.row)}
                      >
                        <X size={13} weight="bold" />
                      </button>
                    </>
                  ) : null}
                </span>
              </div>

              {children.length > 0 ? (
                <div className="vw-nest">
                  {children.map((child, i) => (
                    <BlockCard
                      key={child.id}
                      viewId={viewId}
                      block={child}
                      depth={depth + 1}
                      ctx={ctx}
                      engine={engine}
                      sourceEntity={target}
                      sourceRow={r.row}
                      configuring={configuring}
                      index={i}
                      onDropTable={onDropTable}
                      onRefuse={onRefuse}
                      pending={pending}
                      onPendingUse={onPendingUse}
                      onPendingCancel={onPendingCancel}
                    />
                  ))}
                </div>
              ) : null}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* THE ANSWER TO "WHERE DID THE TRAILER GO?" — drawn on the clean
          page as well as in configure mode, because the person asking
          is usually the salesperson looking at it. */}
      {heldNote !== '' ? (
        <p className="vw-held" role="note">
          {heldNote}
        </p>
      ) : null}

      {shown.length === 0 && !(heldNote !== '' && !filtering) ? (
        <p className="vw-empty">
          {filtering
            ? 'Nothing here matches what you are looking for.'
            : result.removedCount > 0
              ? `Every ${singular(target.name)} here has been taken off this ${singular(sourceEntity.name)}.`
              : curated
                ? `No ${plural(target.name)} picked for this ${singular(sourceEntity.name)} yet.`
                : `No ${plural(target.name)} fit this ${singular(sourceEntity.name)} yet.`}
          {filtering ? (
            <button
              type="button"
              className="vw-linkbtn"
              onClick={() => {
                setSearch('')
                setBlockFilters(viewId, block.id, [])
              }}
            >
              Clear
            </button>
          ) : null}
        </p>
      ) : null}

      {/* the count chip in the head already SAYS "1 removed" on the clean
          page; the chip that REOPENS them is a handle, so it is only here */}
      {configuring && result.removedCount > 0 ? (
        <div className="vw-removed">
          <button
            type="button"
            className="vw-removed-chip"
            aria-expanded={openRemoved}
            onClick={() => setOpenRemoved((v) => !v)}
            title="Show what was taken off, and put any of it back"
          >
            {result.removedCount} removed
          </button>
          {openRemoved ? (
            <ul className="vw-removed-list">
              {result.removed.map(({ row }) => (
                <li key={row.id} className="vw-removed-row">
                  {/* the same `title` its sibling above carries: the name
                      clamps to two lines and a long enough one is still
                      cut, so the whole of it stays reachable */}
                  <span className="vw-row-name" title={rowLabel(target, row)}>
                    {rowLabel(target, row)}
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => restoreRow(row)}>
                    <ArrowUUpLeft size={13} weight="light" />
                    Put it back
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* THE OFFER, drawn exactly where the nested block will land */}
      {pending && pending.parentBlockId === block.id && ctx.entities[pending.tableId] ? (
        <div className="vw-nest vw-nest--offer">
          <RuleOffer
            key={pending.seq}
            root={target}
            target={ctx.entities[pending.tableId]}
            onUse={onPendingUse}
            onCancel={onPendingCancel}
          />
        </div>
      ) : null}

      {configuring ? (
        <div className="vw-block-foot">
          {panel === 'add' ? (
            <AddPanel
              entity={target}
              rows={ctx.rowsByEntity[target.id] ?? []}
              presentIds={new Set(result.rows.map((r) => r.row.id))}
              columns={columns}
              read={(row, fieldId) => read(row, fieldId, target.id)}
              fits={fits}
              onPick={addRow}
              onClose={() => setPanel('none')}
            />
          ) : (
            <button type="button" className="btn btn-ghost vw-add-btn" onClick={() => setPanel('add')}>
              <Plus size={13} weight="bold" />
              Add {oneOf(target.name)}
            </button>
          )}
        </div>
      ) : null}
    </motion.section>
  )
}

/* ============================================================
   The filter bar — a view setting, never a rule.
   ============================================================ */

interface FilterBarProps {
  entity: EntityDef
  rows: RelatedRow[]
  filters: ColumnFilter[]
  search: string
  read: (r: RelatedRow, fieldId: string) => CellValue
  onSearch: (v: string) => void
  onFilters: (next: ColumnFilter[]) => void
  onTypingStart: () => void
  onTypingEnd: () => void
}

function FilterBar({
  entity,
  rows,
  filters,
  search,
  read,
  onSearch,
  onFilters,
  onTypingStart,
  onTypingEnd,
}: FilterBarProps): ReactElement {
  const cols = filterableColumns(entity)
  const byId = new Map(entity.fields.map((f) => [f.id, f]))

  const selectedFor = (fieldId: string): string[] => {
    const hit = filters.find((f) => f.kind === 'values' && f.fieldId === fieldId)
    return hit && hit.kind === 'values' ? hit.selected : []
  }

  const toggle = (fieldId: string, value: string): void => {
    const current = selectedFor(fieldId)
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    const rest = filters.filter((f) => !(f.kind === 'values' && f.fieldId === fieldId))
    onFilters(next.length > 0 ? [...rest, { kind: 'values', fieldId, selected: next }] : rest)
  }

  return (
    <div className="vw-filter" role="group" aria-label={`Narrow what is shown from ${entity.name}`}>
      <div className="vw-filter-search">
        <MagnifyingGlass size={14} weight="light" aria-hidden="true" />
        <input
          className="vw-add-input"
          type="text"
          value={search}
          placeholder="Search what is shown…"
          aria-label={`Search the ${entity.name} shown here`}
          spellCheck={false}
          onFocus={onTypingStart}
          onBlur={onTypingEnd}
          onChange={(e) => onSearch(e.target.value)}
        />
        {search !== '' ? (
          <button type="button" className="vw-icon-btn" title="Clear" onClick={() => onSearch('')}>
            <X size={13} weight="bold" />
          </button>
        ) : null}
      </div>

      {cols.map((fieldId) => {
        const values = valuesInUse(rows, fieldId, read)
        if (values.length < 2) return null
        const selected = selectedFor(fieldId)
        return (
          <div key={fieldId} className="vw-filter-row">
            <span className="mono-label">{byId.get(fieldId)?.name ?? ''}</span>
            <span className="vw-filter-chips">
              {values.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`vw-fchip${selected.includes(v) ? ' is-on' : ''}`}
                  aria-pressed={selected.includes(v)}
                  onClick={() => toggle(fieldId, v)}
                >
                  {selected.includes(v) ? <Check size={11} weight="bold" /> : null}
                  {v}
                </button>
              ))}
            </span>
          </div>
        )
      })}

      {filters.length > 0 || search !== '' ? (
        <button
          type="button"
          className="vw-linkbtn"
          onClick={() => {
            onSearch('')
            onFilters([])
          }}
        >
          Clear all
        </button>
      ) : null}
    </div>
  )
}
