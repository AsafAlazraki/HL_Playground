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
  WarningCircle,
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
import type { RowRef, RuleEngine } from '@/lib/rules/evaluate'
import { useConstraints } from '@/features/constraints'
import { CurationNote, readCuration, searchReach } from '@/features/curation'
import type { Narrowing } from '@/features/curation'
import { bandOf, cardColumns, formatCell, priceColumnOf } from './columns'
import {
  countChip,
  isCuratedOnly,
  oneOf,
  plural,
  ruleReason,
  singular,
  summariseRule,
} from './describe'
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
import { retiredPairsSentence, retiredTableSentence } from './sellable'
import { MAX_DEPTH, removeBlock, setBlockFilters, setBlockRule, updateBlock } from './viewDefs'
import { AddPanel } from './AddPanel'
import { RuleOffer } from './RuleOffer'
import { KindMark } from './marks'
import { RowPicture, pictureField } from './pictures'
import { SPRING, SPRING_QUICK, SPRING_SLOW, transitionFor, useStillness } from './stillness'
import { isRowDrag, isTableDrag, readRowDrag, readTableDrag, setRowDragData } from './dnd'
import { pairWarnings, warnRules, type PairWarning } from './warnings'

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
  /**
   * The DOM id this block answers to, so the rig ledger's lines can
   * point at it. Absent on a nested block — a rig line names a
   * top-level list, and an id nothing links to is a promise nobody
   * made.
   */
  domId?: string
  /**
   * Just arrived at, by a press somewhere else on the page.
   *
   * A MOMENT AND NOT A SELECTION: nothing is selected by being
   * scrolled to, so the mark fades on its own rather than waiting to
   * be dismissed, and it changes no state the block acts on.
   */
  lit?: boolean
  /**
   * Whether this block prints the reason a CURATED list is short.
   *
   * Every block a page seeds is curated-only, so the reason is the
   * same clause on all of them and printing it five times buries the
   * counts beside it — which are the half that differs. The page
   * says it once above the blocks and passes `false`; the count, the
   * search and the switch are untouched, so nothing about the
   * mechanism's four properties is lost. Absent = say it, which is
   * what a block drawn outside a page should do.
   */
  sayWhyCurated?: boolean
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
    domId,
    lit = false,
    sayWhyCurated = true,
    onDropTable,
    onRefuse,
    pending,
    onPendingUse,
    onPendingCancel,
  } = props

  const { still, beginTyping, endTyping } = useStillness()
  const [panel, setPanel] = useState<'none' | 'rule' | 'filter' | 'add' | 'remove'>('none')
  const [search, setSearch] = useState('')
  /* THE NARROWING, SWITCHED OFF — property 3 of the curation
     mechanism. Component state and never a stored setting: it is a
     pair of spectacles, exactly like the filters next to it, and a
     person who switched a rule off to look for one trailer must not
     find it switched off on somebody else's screen tomorrow. */
  const [showAll, setShowAll] = useState(false)
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
      /* SWITCHING THE NARROWING OFF IS PASSING NO RULE, and that is
         the whole change — `relatedRows` already answers "every row
         of the table, minus what a person removed" for an absent
         rule, and it still applies the discontinued contract on the
         way through. So SHOW EVERYTHING cannot become a hole in the
         one gate that keeps retired stock away from a salesperson. */
      rule: showAll ? undefined : block.rule,
      join,
    })
  }, [ctx, engine, sourceEntity, sourceRow, target, block.rule, join, showAll])

  /* THE SELL PRICE LEADS, AND A COST NEVER APPEARS. See `cardColumns`
     in columns.ts for the whole argument — in one line, the type-rank
     that served a 12px table cell put `Dealer List Price`, `Landed
     CTD` and `Nett CTD` at the head of every motor card on a page
     this feature's own header calls "a page you would put in front of
     a customer". An explicit `block.columns` is still honoured: a
     person who chose the columns has chosen them. */
  const columns = useMemo(
    () => (target ? (block.columns ?? cardColumns(target)) : []),
    [target, block.columns],
  )

  /** Which of those columns is the one the table SELLS at — the only
   *  figure on a card allowed the large step. `undefined` on a table
   *  that declares no rung, and then no fact is a headline. */
  const priceField = useMemo(() => (target ? priceColumnOf(target) : undefined), [target])

  /* ── WHAT DISAGREES WITH A ROW THAT IS STILL HERE ─────────────

     A rule carrying `severity: 'warn'` removes nothing, so none of
     these rows are missing and none of them are refused. The list is
     exactly what it was; some of it now carries a note.

     Every rule in the app is read, not just the discovered ones — a
     warning is a property of the RULE, and a hand-written rule set to
     warn draws the same line for the same reason. The filter is done
     once for the block rather than once per row. */
  const rules = useConstraints()
  const warning = useMemo(() => warnRules(rules), [rules])
  const sourceRef = useMemo<RowRef>(
    () => ({ entityId: sourceEntity.id, row: sourceRow }),
    [sourceEntity.id, sourceRow],
  )
  const warnings = useMemo(() => {
    const out = new Map<string, PairWarning[]>()
    if (!target || warning.length === 0) return out
    for (const r of result.rows) {
      const found = pairWarnings({
        engine,
        rules: warning,
        candidate: { entityId: target.id, row: r.row },
        source: sourceRef,
      })
      if (found.length > 0) out.set(r.row.id, found)
    }
    return out
  }, [target, warning, result.rows, engine, sourceRef])

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

  /* ── THE CURATION MECHANISM ───────────────────────────────────

     hl-journeys.md §4, applied here rather than described. Before
     this, a block narrowed by a rule drew a count and nothing else:
     "6 fit" on a table of 434 said nothing about the 428, the
     search reached only the six, and the only way past the rule was
     to enter configure mode and edit it. That is HelmLogic's own
     failure mode — "curation hides silently nearly everywhere and
     offers no way back" — sitting in our app.

     THE POOL A SEARCH MAY ADVERTISE IS THE SELLABLE POOL. A search
     that reported "3 more match" and then, on SHOW EVERYTHING,
     produced two, would be worse than no search: the missing one is
     discontinued and `relatedRows` will never hand it over. So
     retired stock is out of the reach pool entirely, and it is
     accounted for in the note instead, in the contract's own words.
     A historic table has no reachable pool at all. */
  const poolRows = useMemo(
    () => ctx.rowsByEntity[block.tableId] ?? [],
    [ctx.rowsByEntity, block.tableId],
  )

  const reachPool = useMemo(
    () => (result.historic ? [] : poolRows.filter((r) => !isDiscontinued(r))),
    [poolRows, result.historic],
  )

  /* ONE STRING PER ROW, BUILT ONCE PER DATA CHANGE and never per
     keystroke — the lesson `ModuleIndex.buildEntries` already
     learned at 651 rows, and this pool is 434. The name comes
     first because it is the first thing anybody types. */
  const hay = useMemo(() => {
    const out = new Map<string, string>()
    if (!target) return out
    const byField = new Map(target.fields.map((f) => [f.id, f]))
    for (const row of reachPool) {
      const parts: string[] = [rowLabel(target, row)]
      for (const c of columns) {
        parts.push(
          formatCell(byField.get(c), read(row, c, target.id), undefined, bandOf(target, byField.get(c))),
        )
      }
      out.set(row.id, parts.join(' ').toLowerCase())
    }
    return out
  }, [target, reachPool, columns, read])

  const reach = useMemo(
    () =>
      searchReach({
        pool: reachPool,
        offered: new Set(result.rows.map((r) => r.row.id)),
        idOf: (r: RowData) => r.id,
        hayOf: (r: RowData) => hay.get(r.id) ?? '',
        term: search,
      }),
    [reachPool, result.rows, hay, search],
  )

  const reading = useMemo(() => {
    const reason = ruleReason(block.rule, sourceEntity, target)
    /* NO MEASURED RATE IS OFFERED HERE, and that is deliberate. A
       view block's rule is written by whoever built the page; the
       app has never run it over the whole sheet, so it has no rate
       to quote. `Narrowing.measured` is optional for exactly this
       case — the fitment surface, which HAS measured, supplies one. */
    const mute = isCuratedOnly(block.rule) && !sayWhyCurated
    const narrowings: Narrowing[] =
      showAll || mute || reason === '' ? [] : [{ id: 'rule', what: reason }]
    return readCuration({
      name: target?.name ?? 'rows',
      counts: {
        pool: poolRows.length,
        matched: result.rows.length + result.heldCount,
        offered: result.rows.length,
      },
      narrowings,
      showingAll: showAll,
      search: { term: search, beyond: reach.beyond.length },
    })
  }, [
    block.rule,
    sayWhyCurated,
    sourceEntity,
    target,
    showAll,
    poolRows.length,
    result.rows.length,
    result.heldCount,
    search,
    reach.beyond.length,
  ])

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

  /* ── WHAT SHOW EVERYTHING BROUGHT IN, AND WHY IT WAS NOT HERE ──

     Property 3 of the curation mechanism lets a person switch the
     narrowing off and see the whole table. It did that and then said
     nothing at all about WHICH of the rows in front of them the rule
     had been holding back — so a shortlist of six and a table of four
     hundred and thirty-four looked like one undifferentiated list,
     and the answer to "so what did the rule actually do?" was to
     switch it back on and count.

     Rule 10 says a thing that cannot be done says why, where it is.
     Nothing here is refused — these rows are pickable, and a person
     who wants one is right to be able to have it — but a row the rule
     excluded is a different fact from a row it admitted, and drawing
     them identically is the omission the mechanism exists to end.

     THE MARK IS A CHIP AND THE REASON IS ON IT. Four hundred
     sentences would be furniture; the rule's own summary — the same
     string the RULE handle prints — rides on each chip, and the
     count and the narrowing itself are already stated once, above the
     rows, by `CurationNote`.

     IT IS ONLY EVER DRAWN WITH THE NARROWING OFF. With the rule in
     force every row here satisfies it, so there is nothing to mark
     and the clean page is untouched.

     THE STORED ORIGIN IS THE TRUTH AND THE DRAWN ONE IS NOT, which
     is the trap here and the reason these are three functions rather
     than a boolean. `relatedRows` reports `origin: 'added'` only for
     a row the rule DOES NOT match — a pinned row the rule happens to
     agree with today is reported as a rule match, deliberately, and
     `keepOrigin` already relies on that distinction. With the
     narrowing switched off it is handed no rule to be outside of, so
     every row comes back a rule match and both facts are gone. Both
     are recomputed from `block.rule` itself, which is untouched by
     the switch. */
  const rulePinned = (r: RelatedRow): boolean => r.pair?.origin === 'added'

  /** Would this block's own rule have matched this row, pins aside?
   *  On a curated block there is no rule to match — the pair IS the
   *  answer, which is the same reading `relatedRows` takes. */
  const ruleMatches = (r: RelatedRow): boolean =>
    curated
      ? r.pair !== undefined
      : evalPairRule(engine, block.rule, { entityId: target.id, row: r.row }, {
          entityId: sourceEntity.id,
          row: sourceRow,
        })

  /** Pinned in by hand AGAINST the rule — which is what the `added`
   *  chip has always claimed, and is false of a pinned row the rule
   *  also matches. Evaluated only for the handful of rows that carry
   *  a pin. */
  const pinnedAgainstRule = (r: RelatedRow): boolean =>
    !curated && rulePinned(r) && !ruleMatches(r)

  /** On the list before SHOW EVERYTHING was pressed. Short-circuits
   *  to true while the narrowing is in force, so the clean page pays
   *  for none of this. */
  const offeredByRule = (r: RelatedRow): boolean =>
    !showAll || rulePinned(r) || ruleMatches(r)

  /** Why this one was not on the list, in the rule's own words. */
  const whyNotOffered = (): string => {
    if (curated) {
      return `Nobody picked this ${singular(target.name)} for this ${singular(
        sourceEntity.name,
      )}. It is here because you asked to see everything.`
    }
    const rule = summariseRule(block.rule, sourceEntity, target)
    return rule === ''
      ? 'The rule on this list does not bring this one in. It is here because you asked to see everything.'
      : `The rule on this list keeps ${rule} — this one does not, so it is here only because you asked to see everything.`
  }

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

  /* ── THE CHIP COUNTS THE RULE, NOT THE SWITCH ─────────────────

     Measured on Stabicraft - 1850 Fisher: two NSM Custom Trailers
     are picked for it, and pressing SHOW EVERYTHING made this chip
     read "73 picked" — three centimetres under a curation note
     correctly saying "1 of 73 · showing everything". The switch is a
     pair of spectacles, not a decision about the business, and the
     header's job is to state the decision.

     The cause is that `relatedRows` is handed no rule while the
     switch is on, so its `fitCount` and `addedCount` are counts of
     the whole table. Both are recomputed here from `block.rule`
     itself — the same two helpers the row chips use, so the head and
     the rows can never disagree — and while the switch is OFF the
     block's own counts are taken untouched, so nothing is walked
     twice on the page a salesperson actually reads. */
  const offeredCount = showAll
    ? result.rows.filter((r) => offeredByRule(r) && !pinnedAgainstRule(r)).length
    : result.fitCount
  const pinnedCount = showAll
    ? result.rows.filter((r) => pinnedAgainstRule(r)).length
    : result.addedCount

  const chip = countChip(
    offeredCount,
    result.removedCount,
    pinnedCount,
    curated ? 'picked' : 'fit',
  )

  /* NOTHING VANISHES SILENTLY, AND IT SAYS SO ONCE.
     A WHOLE TABLE that is history, or a whole JOIN that is, is not a
     narrowing anybody can switch off — there is nothing behind it to
     reach — so it keeps its own sentence and the curation note stands
     down entirely. Individual rows that are no longer sold ARE part
     of the accounting, and `curation` prints them in the discontinued
     contract's own words, merged with the rule's count into one
     paragraph rather than two competing ones. */
  const joinName = join ? ctx.entities[join.entityId]?.name : undefined
  const historicNote =
    result.historic === 'table'
      ? retiredTableSentence(target.name)
      : result.historic === 'pairs'
        ? retiredPairsSentence(target.name, joinName ?? 'That list')
        : ''
  /* THE HUE IS THE KIND'S, NOT THE TABLE'S ACCENT.
     ------------------------------------------------------------------
     DESIGN_PRINCIPLES §1, as amended: "a hue only ever appears on
     something that HAS that kind, and two things of one kind are one
     colour everywhere in the app." A trailer block drawn in the
     trailer table's own accent and a trailer tile drawn in
     `--kind-trailer` are two amber-ish colours for one noun, which is
     the difference between colour and colouring in.

     A table with no kind at all — a join, a table somebody drew
     themselves — keeps its accent, because `kindOf` would answer
     'custom' for it and slate is a worse answer than the colour its
     author chose. */
  const accent = target.kind ? 'var(--kind)' : accentVar(target.accent)
  const children = block.children ?? []

  return (
    <motion.section
      id={domId}
      className={`vw-block${dragOver ? ' is-drop' : ''}${configuring ? ' is-config' : ''}${
        lit ? ' is-found' : ''
      }`}
      /* the column tracks are declared once, here, so the header
         hairline and every row underneath can never drift apart */
      /* THE COLUMN TRACKS ARE GONE WITH THE TABLE. A block is a grid
         of cards now, so there is no shared track declaration to keep
         a header hairline and forty rows in line — each card carries
         its own facts, labelled, and the grid sizes itself. What is
         still declared here is the one thing every card in this block
         shares: the kind hue its rail is drawn in. */
      style={{ '--vw-accent': accent } as CSSProperties}
      /* ds.css resolves this to the hue; see `accent` above */
      data-kind={target.kind ?? undefined}
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
      {/* A BAND OF ONE KIND OF THING, which is what `.k-band` is
          for — see the foot of ds.css. It is the surface the amended
          §1 allows a hue to carry, and it is what stops a page of
          five blocks reading as five identical white panels. */}
      <header className="vw-block-head k-band">
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
        {/* ── HOW MANY ON THIS LIST ARE WORTH A LOOK ──────────────
            The warning notes are drawn where the value is — under the
            card they are about — which is right and is also invisible
            from the top of a block four hundred cards long. The count
            is already computed for the notes (`warnings`, above), so
            saying it costs nothing and answers "is there anything on
            this list I should know about" without scrolling it.

            THE HUE CARRIES THE GLYPH AND NOTHING ELSE. `--warning`
            over `--warning-wash` fails 4.5:1 — the measurement is
            recorded above `.vw-warn` in views.css — so the words are
            `--ink-soft` on the chip's own `--surface-3` ground (7.25:1
            measured) and the mark is 5.31:1 there. */}
        {warnings.size > 0 ? (
          <span
            className="vw-chip vw-chip--warn"
            title="A rule set to warn disagrees with these. Nothing is removed — each one says what, on the card itself."
          >
            <WarningCircle
              size={12}
              weight="regular"
              aria-hidden="true"
              className="vw-chip-mark"
            />
            {warnings.size} worth a look
          </span>
        ) : null}
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

      {/* ── WHAT NARROWED THIS, AND HOW TO GET PAST IT ──────────────
          Drawn on the CLEAN page, not behind the configure handle.
          The person who needs to find a trailer by name is the
          salesperson, and until now the only search on this block
          lived inside a panel only whoever built the page ever
          opened — a search a salesperson cannot reach is the same
          defect as no search. */}
      {historicNote === '' ? (
        <CurationNote
          reading={reading}
          showingAll={showAll}
          onShowAll={setShowAll}
          search={{
            value: search,
            onChange: setSearch,
            label: `Find ${oneOf(target.name)} by name, whether or not it fits this ${singular(
              sourceEntity.name,
            )}`,
            placeholder: `Find ${oneOf(target.name)}…`,
            onTypingStart: beginTyping,
            onTypingEnd: endTyping,
          }}
        />
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
                {/* THE PHOTOGRAPH FIRST, where the row holds one. A
                    motor with a picture is recognised before it is
                    read; one without simply starts at its name, and
                    the grid stretches the shorter card rather than
                    drawing a plate where a photograph is missing. */}
                {picField ? (
                  <span className="vw-shot">
                    <RowPicture row={r.row} field={picField} />
                  </span>
                ) : null}

                <span className="vw-row-head">
                  <span
                    className="vw-grip"
                    title={configuring ? 'Drag to reorder' : undefined}
                    aria-hidden="true"
                  >
                    {configuring ? <DotsSixVertical size={14} weight="light" /> : null}
                  </span>
                  <span className="vw-row-name" title={rowLabel(target, r.row)}>
                    {rowLabel(target, r.row)}
                  </span>
                </span>

                {/* ── THE STATE, AS A CHIP AND A RAIL ─────────────────
                    "Which one are we actually quoting?" was answered by
                    a 12px star in the row's left padding, and "this one
                    is here although the rule does not match it" by a
                    tag at the far right of a 900px line. Both are
                    facts a salesperson acts on, so both are chips at
                    the top of the card, and the recommended one takes
                    the card's rail as well — a state you can see from
                    across a desk. */}
                {r.recommended || pinnedAgainstRule(r) || !offeredByRule(r) ? (
                  <span className="vw-row-tags">
                    {r.recommended ? (
                      <span
                        className="vw-tag vw-tag--star"
                        title="Recommended — this is the one a quote is raised with"
                      >
                        <Star size={11} weight="fill" aria-hidden="true" />
                        Recommended
                      </span>
                    ) : null}
                    {/* THE PIN SURVIVES SHOW EVERYTHING. With the rule
                        switched off `relatedRows` is given no rule to be
                        outside of, so every row came back a rule match
                        and the pinned ones lost their chip exactly when
                        the list they stood out from got longer.
                        `pinnedAgainstRule` recomputes it off `block.rule`,
                        which the switch does not touch — and it keeps the
                        chip's claim exactly true, which `rulePinned`
                        alone would not: a row pinned in that the rule now
                        also matches is not an exception to it. */}
                    {pinnedAgainstRule(r) ? (
                      <span
                        className="vw-tag vw-tag--added"
                        title="Pinned in although the rule does not match it"
                      >
                        added
                      </span>
                    ) : null}
                    {!offeredByRule(r) ? (
                      <span className="vw-tag vw-tag--past" title={whyNotOffered()}>
                        {curated ? 'not picked' : 'outside the rule'}
                      </span>
                    ) : null}
                  </span>
                ) : null}

                {/* THE COLUMN NAMES CAME DOWN ONTO THE CARD. They used
                    to live once, in a hairline above forty rows; a
                    card is read on its own, so each figure carries the
                    name of the column it came out of. The SELL price
                    is set apart from the rest — it is the fact the
                    card is scanned for — and it is the only figure
                    here allowed to be, because the large step on a
                    cost column would put a dealer's buy price in front
                    of a customer. `priceColumnOf` is the quote's own
                    resolver, so the two can never disagree about which
                    column is the price. */}
                <dl className="vw-facts">
                  {columns.map((c) => {
                    const field = byId.get(c)
                    /* the band goes with the column: a figure filed
                       under Supply Pricing is money even where its
                       name is `P&A`, and `MU` is a ratio even there */
                    const band = bandOf(target, field)
                    const text = formatCell(field, readRelated(r, c), resolveRef, band)
                    if (text === '') return null
                    const cash = c === priceField
                    return (
                      <div key={c} className={`vw-fact${cash ? ' vw-fact--money' : ''}`}>
                        <dt className="vw-fact-of">{field?.name ?? ''}</dt>
                        <dd className="vw-cell">{text}</dd>
                      </div>
                    )
                  })}
                </dl>

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

              {/* THE WARNING GOES WHERE THE VALUE IS — rule 10, and the
                  reason `severity: 'warn'` exists at all. The row is
                  still on the list, still pickable, still counted; this
                  says what disagrees with it, in the rule's own words.
                  It is NOT an error: no red, no cross, no bar across the
                  row. It sits OUTSIDE `.vw-row-line` on purpose — the
                  hover and recommended tints are painted there, and
                  `--warning` fails 4.5:1 over either. Measured grounds
                  and ratios are in `views.css` above `.vw-warns`. */}
              {(warnings.get(r.row.id) ?? []).length > 0 ? (
                <ul className="vw-warns">
                  {(warnings.get(r.row.id) ?? []).map((w) => (
                    <li key={w.constraintId} className="vw-warn">
                      <WarningCircle
                        size={13}
                        weight="regular"
                        aria-hidden="true"
                        className="vw-warn-mark"
                      />
                      <span>
                        {w.because === ''
                          ? 'A rule set to warn disagrees with this one, and it does not say why.'
                          : `Worth a look, because ${w.because}.`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

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

      {/* THE ANSWER TO "WHERE DID THE TRAILER GO?" when the answer is a
          whole retired table or a whole retired join — the one case the
          curation note stands down for, because there is no narrowing
          to switch off and nothing behind it to search past. Every
          other case is in the note above the rows, where the count that
          goes with it is. */}
      {historicNote !== '' ? (
        <p className="vw-held" role="note">
          {historicNote}
        </p>
      ) : null}

      {shown.length === 0 && !(historicNote !== '' && !filtering) ? (
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
      {/* THE SEARCH BOX THAT WAS HERE IS NOW ON THE BLOCK ITSELF.
          It was reachable only from inside this panel, which only
          opens in configure mode, so the one control that lets a
          person find a row by name was hidden from the person most
          likely to want it. The curation note carries it in READ
          mode, bound to this same state — and it searches the whole
          table rather than only what the rule already admitted, which
          is the half of the job this box never did. Two boxes on one
          card writing one value would be a second, quieter search
          result, so there is one. */}
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
