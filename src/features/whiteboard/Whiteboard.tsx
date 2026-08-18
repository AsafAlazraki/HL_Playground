/* ============================================================
   THE BLUEPRINT SHEET

   One drawing: the tables you sell things from, pinned to a navy
   sheet, edited in place. One instrument on it: a zoom cluster with
   FIT. Nothing else — no layer switcher, no card-detail toggle, no
   palette, no minimap, no rule readout. The sheet is the hero; the
   chrome exists to keep out of its way.

   ------------------------------------------------------------
   OFF THE DEFAULT PATH — kept working, simply not drawn

   Everything below still compiles, still has its state, still has
   its styles. None of it is rendered. To bring a piece back:

   1. THE ERD (schema cards + zone frames)
        import { EntityNode } from './EntityNode'
        import { ZoneNode } from './ZoneNode'
        import { useDerivedGraph } from './useDerivedGraph'
      Add `entity: EntityNode, zone: ZoneNode` to `nodeTypes`, call
      `useDerivedGraph({ detail, modes, blockedIds, underlay, locked,
      onSetMode })` and concat its nodes with `tableNodes`. Two nodes
      may never claim one id, so cards and tables are alternatives:
      draw one or the other, never both. Zone membership on drag-stop
      (a card's centre against every zone rect) is in git history at
      `onNodeDragStop`; it is deliberately absent here because a
      520px register has a different centre from a 240px card.

   2. THE RULE FLOW (plates, palette, RUN, the lane-separation
      relayout, the flow-vs-cards camera pan)
        import { RulePaletteStrip, isPaletteDrag, onPaletteDrop,
                 ruleNodeTypes, useRuleGraph, useRuleIssues,
                 useRuleRun } from '@/features/rules'
      Spread `ruleNodeTypes` into `nodeTypes`, concat `useRuleGraph`'s
      nodes and edges, and render `<RulePaletteStrip>` over the sheet.
      `nodesConnectable` must go back to "only inside a rule", and
      `onConnect` back to `connectRuleNodes`.

   3. THE LAYER SWITCHER (ENTITIES / RULES / BOTH)
      Its state never left: `SHEET_LAYERS`, `useSheetLayer`,
      `setSheetLayer`, `layerShowsRules`, `layerGhostsEntities` in
      `canvasState.ts`. Draw the segmented control in a `<Panel
      position="top-left">` and feed the answer to 1 and 2 above.

   4. THE CARD DETAIL / COMPACT TOGGLE and the per-card S/D/C pins
      live in `cardModes.ts` and are consumed by `useDerivedGraph`'s
      `detail` + `modes` inputs. They only mean anything once 1 is
      back — a table has one level of detail: all of it.
   ------------------------------------------------------------
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react'
import type {
  Edge,
  EdgeChange,
  FitViewOptions,
  Node,
  NodeChange,
  NodeMouseHandler,
  NodeTypes,
  OnMove,
  OnNodeDrag,
} from '@xyflow/react'
import { useProjectStore } from '@/store/useProjectStore'
import { sayUndoable } from '@/store/notes'
import {
  DEFAULT_TABLE_NODE_SIZE,
  tableNodeTypes,
  useEntityTableNodes,
  useExpandedTableNodes,
} from '@/features/table'
import type { TableKind, XY } from '@/types/model'
import {
  EDGE_MARKER,
  EDGE_MARKER_SELECTED,
  useRelationshipEdges,
} from './useDerivedGraph'
import { isTableKindDrag, readTableKindDrag } from './tableKindDrop'
import {
  claimLayerFrame,
  getCanvasCamera,
  requestNewTable,
  resetCanvasSession,
  setCanvasCamera,
} from './canvasState'
import './whiteboard.css'

/* THE ONLY THING THE SHEET DRAWS. Table nodes come from
   `features/table`, fully built — we give them a stage and a camera. */
const nodeTypes: NodeTypes = { ...tableNodeTypes }

/* TEMP-DEV-BRIDGE-START */
import { DEMOS } from '@/demos'
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__hl = {
    store: useProjectStore,
    demos: DEMOS,
  }
}
/* TEMP-DEV-BRIDGE-END */

const GRID = 16
const SNAP_GRID: [number, number] = [GRID, GRID]
/* PER-SIDE PADDING, because the panel floats over the left edge. A
   scalar padding is symmetric, so FIT would centre the sheet in the
   CONTAINER and hand the leftmost 260px to a surface sitting on top of
   it — the tables at the left of the drawing would be framed perfectly
   and then covered up. The extra left padding is the panel's own width
   expressed as a share of a 1280px window, plus the 0.12 everything
   else gets. */
const FIT_VIEW_OPTIONS: FitViewOptions = {
  padding: { top: 0.12, right: 0.12, bottom: 0.12, left: 0.32 },
  maxZoom: 1,
}

const snap = (n: number): number => Math.round(n / GRID) * GRID

/** Under the cursor: the table's header, centred. */
const DROP_HEADER_H = 24

/* The smallest window the sheet is ever framed in. Without it, FIT on a
   sheet holding one table blows a single 520px frame up to maximum zoom
   and calls it fitting — `fitBounds` honours the canvas maxZoom, not
   common sense. A floor on the framed area keeps one table looking like
   one table on a big sheet. */
const MIN_FRAME_W = 1120
const MIN_FRAME_H = 720

/* ============================================================
   THE OPENING FRAME HAS A FLOOR, AND IT IS A MEASUREMENT.

   A drawing nobody can read is not a drawing. Measured at 1440x900 on
   the seeded sheet — 53 tables spanning 2,920 x 5,600 drawing units,
   the height binding — the one framing licence landed the camera at
   zoom 0.138571. `.tb-lod-name` is authored at 34px inside the canvas
   transform, so it drew at 4.7px: under the 8.4px floor `tableLod.ts`
   measures as the size below which neither face resolves at all. Every
   figure and band on the plate was finer than that again. The sheet was
   a field of grey rectangles and the screen said nothing about itself.

   WHERE 0.4 COMES FROM. The plate has two tiers of type that carry
   meaning: the name at `--display-l-size` 34px, and the two figures at
   22px mono. Against tableLod's 8.4px floor:

       zoom   name (34px)   figures (22px)
       0.14        4.7 px        3.1 px     <- what it opened at
       0.25        8.5 px        5.5 px     name only
       0.38       12.9 px        8.4 px     <- both clear the floor
       0.40       13.6 px        8.8 px     the floor, rounded up
       0.60       20.4 px       13.2 px     the plate gives way to a grid

   So 0.4 is the lowest zoom at which everything on a plate that carries
   meaning is legible, with the 11px band chips left as texture — which
   `table-node.css` already records as a known limit only a second LOD
   tier would fix. It is the same argument `FlowStage.MIN_READABLE = 0.68`
   makes about its own 10px micro-labels; the number differs because the
   type does.

   WHAT IT COSTS, STATED. At 0.4 on a 1440x900 window the frame holds
   the full width of the drawing and about the top 37% of its height —
   roughly half the tables. That is the trade the brief asked for: a
   legible opening frame beats all 52 cards at once. FIT is untouched
   and still frames every table, because a recovery control that
   refuses to recover is worse than a first frame that shows less (the
   note on `minZoom` below is the same lesson), and the legend names it.
   ============================================================ */
const MIN_READABLE = 0.4

/** Air between the drawing and the edge of the pane, in screen pixels,
 *  when the opening frame is anchored rather than fitted. */
const OPEN_FRAME_PAD = 24

/* ============================================================
   THE RESERVE MAY NOT DEPEND ON WHAT THE FRAME DECIDES.

   The legend gains one sentence — "Opened close enough to read. Fit …
   frames all 52" — exactly when the readable floor binds, and that
   sentence is inside the block whose height the framing arithmetic
   reserves. So a reserve measured from the block as drawn chases its own
   tail: it measures three lines, the frame lands, the block grows to
   four, and the top row of cards is left sitting under it. Measured at
   1440x900: the first row's headers were clipped by 48px.

   So when that line is NOT on the block, the reserve adds room for it —
   two lines of 12px at 1.5, rounded up. Generous by a few pixels in the
   case where it never appears, which costs a little air above the top
   row and can never hide a card.
   ============================================================ */
const LEGEND_MORE_H = 40

/**
 * How much of our left edge a floating panel is covering right now.
 *
 * `--panel-w` is the one place that knows the panel's width and every
 * consumer reads it (shell.css:51) — but the panel itself has not been
 * mounted since the masthead went, `LeftPanel` being imported by
 * nothing. So the token kept reserving 260px of a 1440px window for a
 * surface that is not there: measured, FIT put the drawing between x=562
 * and x=967 with 473px of empty pane to its right, off centre by exactly
 * the strip it was avoiding.
 *
 * The honest test is whether the panel is ON SCREEN, not whether its
 * width is declared. Nothing is removed and nothing is hard-coded: the
 * day `LeftPanel` is mounted again this reads its width off the same
 * token and the arithmetic below is right without being touched.
 */
function panelCover(el: HTMLElement): number {
  if (!el.ownerDocument.querySelector('.shell-panel')) return 0
  const px = Number.parseFloat(getComputedStyle(el).getPropertyValue('--panel-w'))
  return Number.isFinite(px) ? px : 0
}

/** Anything the sheet can draw — one type today, and the mirror below
 *  is written so a second one costs nothing. */
type CanvasNode = Node

/* ------------------------------------------------------------ */
/* FIT — four corner brackets, the drafting mark for "frame it"  */
/* ------------------------------------------------------------ */

function FitGlyph(): JSX.Element {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M1 4.2V1h3.2M7.8 1H11v3.2M11 7.8V11H7.8M4.2 11H1V7.8" />
    </svg>
  )
}

/* ------------------------------------------------------------ */
/* Canvas                                                       */
/* ------------------------------------------------------------ */

interface CanvasProps {
  onDropTableKind?: (kind: TableKind, position: XY) => void
}

function WhiteboardCanvas({ onDropTableKind }: CanvasProps): JSX.Element {
  const select = useProjectStore((s) => s.select)
  const moveEntity = useProjectStore((s) => s.moveEntity)
  const selection = useProjectStore((s) => s.selection)

  /* THE DRAWING. Node ids ARE entity ids, so a table carries its own
     position, commits through `moveEntity` on drag-stop, and every
     relationship line stays attached without a word of translation. */
  const tableNodes = useEntityTableNodes()
  const derivedEdges = useRelationshipEdges()

  const [nodes, setNodes] = useState<CanvasNode[]>(tableNodes)
  const [edges, setEdges] = useState<Edge[]>(derivedEdges)

  const rf = useReactFlow<CanvasNode, Edge>()
  const nodesInitialized = useNodesInitialized()
  const wrapRef = useRef<HTMLDivElement | null>(null)
  /** the legend, so the framing arithmetic can reserve its exact height
   *  rather than a constant that drifts from the sentence it draws */
  const legendRef = useRef<HTMLElement | null>(null)
  /** set right before any select() triggered from inside the canvas */
  const selectFromCanvasRef = useRef(false)
  /** the reader has taken the pen — the sheet is theirs from here */
  const interactedRef = useRef(false)

  /* The camera is restored from the session, never re-fitted: coming
     back to this component must land on the same square inch of sheet
     the reader left it on. */
  const [initialCamera] = useState(getCanvasCamera)
  /* which tables are expanded — read so the opening frame can land on
     one rather than on the whole drawing (see the framing effect) */
  const expandedTables = useExpandedTableNodes()

  /* a table type is being dragged over the sheet right now */
  const [dropping, setDropping] = useState(false)

  /* WHAT THE LEGEND COUNTS: the cards that are DRAWN, not the rows in
     the store. Two of the seeded 52 are retired, which Home holds back
     and the sheet still draws — a title block reading 50 over 52 visible
     cards is the disagreement every count in this app is written to
     avoid. So the total is the node list's own length, and the joins are
     counted among exactly those nodes. */
  const entities = useProjectStore((s) => s.entities)
  const shape = useMemo(() => {
    let joins = 0
    for (const n of tableNodes) if (entities[n.id]?.role === 'join') joins += 1
    return { tables: tableNodes.length, joins }
  }, [tableNodes, entities])

  /* -- store -> local mirror ----------------------------------
     Identity is the whole point: a node whose data, position and
     geometry are unchanged is handed BACK, not rebuilt, and when
     nothing at all changed the previous array is returned so React
     bails out of the update entirely. Selection is not handled here —
     see below. */
  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      let changed = prev.length !== tableNodes.length
      const next = tableNodes.map((dn, i) => {
        const p = prevById.get(dn.id)
        if (!p) {
          changed = true
          return dn
        }
        if (p.dragging || p.resizing) {
          /* a gesture in flight owns the geometry until it lands */
          changed = true
          const held: CanvasNode = {
            ...dn,
            selected: p.selected,
            position: p.position,
          }
          if (p.dragging) held.dragging = true
          if (p.resizing) {
            held.resizing = true
            held.width = p.width
            held.height = p.height
          }
          return held
        }
        if (
          p.data === dn.data &&
          p.type === dn.type &&
          p.position.x === dn.position.x &&
          p.position.y === dn.position.y &&
          p.zIndex === dn.zIndex &&
          p.width === dn.width &&
          p.height === dn.height
        ) {
          if (prev[i] !== p) changed = true
          return p
        }
        changed = true
        const rebuilt: CanvasNode = { ...dn, selected: p.selected }
        /* keep what React Flow measured — dropping it would take the
           node back to "not initialised" and flash the whole sheet */
        if (p.measured && p.type === dn.type) rebuilt.measured = p.measured
        return rebuilt
      })
      return changed ? next : prev
    })
  }, [tableNodes])

  /* -- selection: a cheap pass, not a rebuild ------------------
     Only the table that gained or lost the mark is allocated; every
     other node object is handed back untouched. */
  useEffect(() => {
    setNodes((prev) => {
      let changed = false
      const next = prev.map((n) => {
        const want =
          !!selection && selection.kind === 'entity' && selection.id === n.id
        if (!!n.selected === want) return n
        changed = true
        return { ...n, selected: want }
      })
      return changed ? next : prev
    })
    /* `tableNodes` is here so a table that arrives already selected
       gets its mark — the pass allocates nothing when every flag is
       already right, so it costs a walk and no more. */
  }, [selection, tableNodes])

  useEffect(() => {
    setEdges((prev) => {
      const prevById = new Map(prev.map((e) => [e.id, e]))
      let changed = prev.length !== derivedEdges.length
      const next = derivedEdges.map((e, i) => {
        const p = prevById.get(e.id)
        if (p && p.selected) {
          changed = true
          return { ...e, selected: true, markerEnd: EDGE_MARKER_SELECTED }
        }
        if (p === e) {
          if (prev[i] !== p) changed = true
          return p
        }
        changed = true
        return e
      })
      return changed ? next : prev
    })
  }, [derivedEdges])

  /* -- React Flow interaction state --------------------------- */
  const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setEdges((eds) =>
      applyEdgeChanges(changes, eds).map((e) => ({
        ...e,
        markerEnd: e.selected ? EDGE_MARKER_SELECTED : EDGE_MARKER,
      })),
    )
  }, [])

  /* -- selection ---------------------------------------------- */
  const selectNode = useCallback(
    (node: CanvasNode) => {
      interactedRef.current = true
      selectFromCanvasRef.current = true
      select({ kind: 'entity', id: node.id })
    },
    [select],
  )

  const onNodeClick = useCallback<NodeMouseHandler<CanvasNode>>(
    (_event, node) => selectNode(node),
    [selectNode],
  )

  const onNodeDragStart = useCallback<OnNodeDrag<CanvasNode>>(
    (_event, node) => selectNode(node),
    [selectNode],
  )

  const onPaneClick = useCallback(() => {
    interactedRef.current = true
    /* Only flag when select(null) will actually change state: with the
       selection already null the store won't re-render, the auto-pan
       effect never runs, and a stale flag would swallow the next
       external auto-pan. */
    if (useProjectStore.getState().selection !== null) {
      selectFromCanvasRef.current = true
    }
    select(null)
  }, [select])

  /* -- the camera the reader parked ---------------------------- */

  /* DROP THE PANEL'S BLUR WHILE THE CAMERA MOVES. backdrop-filter
     re-samples its backdrop every frame, and during a pan that backdrop
     is the one thing on screen guaranteed to be changing — so the most
     expensive surface in the app is repainted continuously at exactly
     the moment the canvas can least afford it. The sheet already runs
     at 12-24fps at legible zoom.

     The class goes on .shell-body rather than in React state on
     purpose: a state write here would re-render the whole shell on
     every frame of a pan, which is the cost we are trying to avoid.
     This toggles one class on one element and CSS does the rest. */
  const bodyRef = useRef<HTMLElement | null>(null)
  const panning = useCallback((on: boolean): void => {
    bodyRef.current ??= document.querySelector('.shell-body')
    bodyRef.current?.classList.toggle('is-panning', on)
  }, [])

  const onMoveStart = useCallback<OnMove>(
    (event) => {
      /* null = the app moved the camera; an event = the reader did */
      if (event) interactedRef.current = true
      panning(true)
    },
    [panning],
  )

  const onMoveEnd = useCallback<OnMove>(
    (_event, viewport) => {
      setCanvasCamera(viewport)
      panning(false)
    },
    [panning],
  )

  /* a component that unmounts mid-pan must not leave the sheet
     permanently un-blurred */
  useEffect(() => () => panning(false), [panning])

  useEffect(
    () => () => {
      /* on the way out: park the camera so coming back lands on the
         same square inch of sheet */
      setCanvasCamera(rf.getViewport())
    },
    [rf],
  )

  /* -- drag commit --------------------------------------------- */
  const onNodeDragStop = useCallback<OnNodeDrag<CanvasNode>>(
    (_event, node) => {
      interactedRef.current = true
      moveEntity(node.id, { x: node.position.x, y: node.position.y })
    },
    [moveEntity],
  )

  /* ============================================================
     DROPPING A TABLE TYPE

     The left rail's chips are draggable. The sheet accepts them and
     then asks the one question a table cannot be built without: how
     is it structured? So a drop NEVER creates a table on its own —
     it publishes what was dropped and where, and the kit's dialog
     opens on it, pre-set to that kind, positioned where you let go.

     THE TARGET IS THE SHEET'S RECTANGLE, NOT ITS DOM SUBTREE. On an
     empty sheet the shell pins its invitation card over the middle
     of the blueprint — the most natural place in the world to aim a
     drop, and a plain `onDrop` on this element would never see it,
     because the card is a sibling that swallows the event. Listening
     at the window and testing the pointer against our own bounds
     means anything let go over the sheet lands on the sheet,
     whatever happens to be painted on top of it. Nothing outside
     those bounds is touched: `preventDefault` is called only for a
     table-type drag inside them, so every other drop target in the
     app behaves exactly as it did.
     ============================================================ */

  useEffect(() => {
    const overSheet = (event: DragEvent): boolean => {
      const el = wrapRef.current
      if (!el) return false
      const r = el.getBoundingClientRect()
      return (
        event.clientX >= r.left &&
        event.clientX <= r.right &&
        event.clientY >= r.top &&
        event.clientY <= r.bottom
      )
    }

    const onDragOver = (event: DragEvent) => {
      if (!isTableKindDrag(event)) return
      if (!overSheet(event)) {
        setDropping(false)
        return
      }
      /* without this the browser never fires `drop` */
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
      setDropping(true)
    }

    const onDrop = (event: DragEvent) => {
      if (!isTableKindDrag(event)) return
      setDropping(false)
      if (!overSheet(event)) return
      const kind = readTableKindDrag(event)
      if (!kind) return
      event.preventDefault()
      const point = rf.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      /* the frame lands centred under the cursor, header first, on the
         same grid every other table is on */
      const position: XY = {
        x: snap(point.x - DEFAULT_TABLE_NODE_SIZE.w / 2),
        y: snap(point.y - DROP_HEADER_H),
      }
      interactedRef.current = true
      if (onDropTableKind) onDropTableKind(kind, position)
      else requestNewTable(kind, position)
    }

    /* cancelled, or dropped somewhere else entirely */
    const onDragEnd = () => setDropping(false)

    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragend', onDragEnd)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragend', onDragEnd)
    }
  }, [onDropTableKind, rf])

  /* -- Delete / Escape ------------------------------------------
     Table nodes stop keyboard events at their own root, so a cell
     edit never reaches this handler.

     A TABLE HOLDS REAL DATA, AND THAT IS AN ARGUMENT FOR A WAY BACK
     RATHER THAN FOR A QUESTION. This raised `window.confirm("Delete
     the table “Highfield Inflatables” and its 63 rows?")`, which
     was right when `deleteEntity` was permanent. It is not:
     `deleteEntity` records a step, `entities` and `rowsByEntity` are
     both in the undo slice, and the table comes back with all 63 rows
     in their order. Rule 9 — an undoable act gets a note with UNDO,
     not a dialog.

     THE COUNT STAYS IN THE SENTENCE. It was the best thing about the
     confirm and it costs nothing to keep: a stray Backspace that took
     63 rows off the sheet must say 63, or the note reads as though a
     frame was tidied away. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return
        }
      }
      const store = useProjectStore.getState()
      const sel = store.selection

      if (event.key === 'Escape') {
        if (sel) store.select(null)
        return
      }
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (!sel || sel.kind !== 'entity') return

      const entity = store.entities[sel.id]
      if (!entity) return
      event.preventDefault()
      const rows = store.rowsByEntity[sel.id]?.length ?? 0
      store.deleteEntity(sel.id)
      sayUndoable(
        rows > 0
          ? `Deleted “${entity.name}” and its ${rows} row${rows === 1 ? '' : 's'}`
          : `Deleted “${entity.name}”`,
      )
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  /* -- react to a table picked OUTSIDE the canvas ---------------
     A pan, never a fit: the drawing stays exactly the size the reader
     left it, the sheet just slides far enough to show what they
     picked. */
  const autoPanArmedRef = useRef(false)

  useEffect(() => {
    const fromCanvas = selectFromCanvasRef.current
    selectFromCanvasRef.current = false
    /* NOT on the first run after mount: the camera has just been
       restored to where the reader parked it, and the selection
       standing there is one they made before they left. */
    if (!autoPanArmedRef.current) {
      autoPanArmedRef.current = true
      return
    }
    if (fromCanvas || !selection || selection.kind !== 'entity') return

    const entity = useProjectStore.getState().entities[selection.id]
    if (!entity) return
    const internal = rf.getInternalNode(selection.id)
    const x = entity.position.x
    const y = entity.position.y
    const w = internal?.measured.width ?? DEFAULT_TABLE_NODE_SIZE.w
    const h = internal?.measured.height ?? DEFAULT_TABLE_NODE_SIZE.h

    const el = wrapRef.current
    if (!el) return
    const viewport = rf.getViewport()
    const rect = el.getBoundingClientRect()
    /* THE PANEL FLOATS OVER OUR LEFT EDGE, so the container's box is
       wider than the region a person can actually see. Without this
       inset a node sitting behind the panel satisfies `x >= minX` and
       the camera decides it is already on screen — so clicking a table
       in the list would aim at something the list itself is covering,
       and the doors-into-view work would be quietly undone for every
       table on the left of the sheet. The panel's width is declared
       once, on .shell-body, and read here rather than repeated. */
    const panelPx = Number.parseFloat(
      getComputedStyle(el).getPropertyValue('--panel-w'),
    )
    const hidden = Number.isFinite(panelPx) ? panelPx : 0
    const minX = (-viewport.x + hidden) / viewport.zoom
    const minY = -viewport.y / viewport.zoom
    const maxX = minX + rect.width / viewport.zoom
    const maxY = minY + rect.height / viewport.zoom
    if (x >= minX && y >= minY && x + w <= maxX && y + h <= maxY) return

    void rf.setCenter(x + w / 2, y + h / 2, {
      duration: 480,
      zoom: viewport.zoom,
    })
  }, [selection, rf])

  /* ============================================================
     CAMERA — rationed on purpose

     A position the reader chose is theirs. The sheet is framed in
     exactly two places: the first time it is drawn in a session, and
     when FIT is pressed. Nothing else may move the camera on its own
     — which is what made moved tables look like they had jumped back.

     Bounds are ARITHMETIC, never `fitView`: React Flow's fitView
     silently skips every node it has not measured yet, and a fresh
     sheet hands it several 520px frames at once, so it would frame
     whichever one happened to be measured first. Every table node
     already carries an exact position and frame size.
     ============================================================ */

  const frameTables = useCallback(
    /**
     * @param readable When true the camera refuses to go below
     * `MIN_READABLE` and anchors the drawing's top-left corner instead
     * of fitting all of it. That is the OPENING frame only. FIT passes
     * false, because FIT must always be able to fit — see the note on
     * `minZoom` below, and `MIN_READABLE` above for the measurement.
     * @returns true when the readable floor bound, i.e. the frame does
     * NOT hold every table. The legend says so where the reader can see
     * it, rather than leaving them to wonder what happened to the rest.
     */
    (duration: number, readable = false): boolean => {
      if (tableNodes.length === 0) {
        void rf.fitView({ ...FIT_VIEW_OPTIONS, duration })
        return false
      }
      let minX = Number.POSITIVE_INFINITY
      let minY = Number.POSITIVE_INFINITY
      let maxX = Number.NEGATIVE_INFINITY
      let maxY = Number.NEGATIVE_INFINITY
      for (const n of tableNodes) {
        minX = Math.min(minX, n.position.x)
        minY = Math.min(minY, n.position.y)
        maxX = Math.max(maxX, n.position.x + (n.width ?? 0))
        maxY = Math.max(maxY, n.position.y + (n.height ?? 0))
      }
      /* a camera is never moved on arithmetic we cannot vouch for */
      if (!Number.isFinite(minX) || !Number.isFinite(minY) || maxX <= minX) {
        return false
      }
      /* pad a thin drawing out to a minimum window, so one table is
         framed rather than shoved into the reader's face */
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      let width = Math.max(maxX - minX, MIN_FRAME_W)
      let height = Math.max(maxY - minY, MIN_FRAME_H)
      let x = cx - width / 2
      let y = cy - height / 2

      /* WHAT IS FLOATING OVER OUR EDGES, SO FRAMING CAN AVOID IT.
         `fitBounds` takes one scalar padding and has no per-side
         option, so the correction is arithmetic — which is what this
         whole function already is, and for the same reason: we can
         vouch for it.

         TWO INSETS NOW, not one. The left is the floating panel, when
         one is mounted (`panelCover` — the token used to reserve 260px
         for a surface that has not existed since the masthead went, and
         the drawing sat 473px off centre because of it). The top is the
         legend, which says what this screen IS and must never be the
         thing hiding a card: it is measured rather than assumed, so the
         reserve cannot drift from the sentence.

         Framing content of width Wc into the FULL container gives scale
         containerW/Wc, and the leftmost inset of that lands under
         glass. We want scale (containerW − inset)/Wc instead, so we hand
         fitBounds a box widened by containerW/(containerW − inset) and
         moved left by exactly the strip that is covered, measured in
         canvas units at that same scale. The empty strip then sits under
         the panel and every table lands clear of it. Measured before the
         left half of this: FIT put 6 of 22 tables behind the panel, the
         leftmost at x=233 under a 260px surface. The vertical axis is
         the same transform with height for width. */
      const el = wrapRef.current
      const rect = el?.getBoundingClientRect()
      const containerW = rect?.width ?? 0
      const containerH = rect?.height ?? 0
      const insetL = el ? panelCover(el) : 0
      /* THE LEGEND BAND IS RESERVED ON THE OPENING FRAME AND NOT ON FIT,
         and that is a measurement rather than an oversight. Reserving it
         for FIT costs 240px of an 822px pane — measured, it took FIT from
         zoom 0.155 to 0.102 on the seeded sheet, i.e. it made the one
         control whose whole job is "show me the shape of all of it" show
         a third less of it. At FIT zoom nothing on a card is legible
         anyway (see MIN_READABLE), the block takes no pointer events, and
         the zoom cluster already floats over the opposite corner. On the
         OPENING frame it is the other way round: that frame is the one a
         person reads, so no card may open underneath the sentence
         explaining the screen. */
      const legendEl = readable ? legendRef.current : null
      const insetT = legendEl
        ? legendEl.getBoundingClientRect().height +
          /* see LEGEND_MORE_H — the line the block is about to gain */
          (legendEl.querySelector('.wb-legend-more') ? 0 : LEGEND_MORE_H) +
          OPEN_FRAME_PAD
        : 0

      /* guard the degenerate window — a container narrower than its own
         panel would divide by zero or flip the sign */
      const visibleW = containerW - insetL
      const visibleH = containerH - insetT
      if (containerW > insetL + 1) {
        const scaled = width * (containerW / visibleW)
        x -= (width * insetL) / visibleW
        width = scaled
      }
      if (containerH > insetT + 1) {
        const scaled = height * (containerH / visibleH)
        y -= (height * insetT) / visibleH
        height = scaled
      }

      /* ============================================================
         THE FLOOR, on the opening frame only.

         `fitBounds` would land on min(vw/Wc, vh/Hc) once its own 6%
         padding is taken out; the same arithmetic here answers "would
         that be legible?" BEFORE the camera moves, so the drawing never
         flashes through an illegible frame on its way to a readable one.

         Below the floor the camera stops fitting and ANCHORS instead:
         the drawing's top-left corner is placed at the top-left of what
         a reader can actually see, at exactly MIN_READABLE. Top-left and
         not centre, because that is where the eye starts and where the
         first cards on this sheet are; a centred readable frame on a
         5,600-unit-tall drawing opens on its middle, which is nobody's
         idea of the beginning.
         ============================================================ */
      if (readable && visibleW > 1 && visibleH > 1) {
        const pad = 1.12
        const wouldBe = Math.min(visibleW / (width * pad), visibleH / (height * pad))
        if (wouldBe < MIN_READABLE) {
          const z = MIN_READABLE
          void rf.setViewport(
            {
              zoom: z,
              x: insetL + OPEN_FRAME_PAD - minX * z,
              y: insetT + OPEN_FRAME_PAD - minY * z,
            },
            { duration },
          )
          return true
        }
      }

      void rf.fitBounds({ x, y, width, height }, { padding: 0.06, duration })
      return false
    },
    [rf, tableNodes],
  )

  /* the drawing has been replaced wholesale (import, demo, reset):
     there is no reader placement left to protect, so the session
     starts again and the sheet may frame itself once more */
  const entityKey = useMemo(
    () => tableNodes.map((n) => n.id).sort().join(','),
    [tableNodes],
  )
  const prevEntityKeyRef = useRef<string | null>(null)
  const [drawingRev, setDrawingRev] = useState(0)

  useEffect(() => {
    const prev = prevEntityKeyRef.current
    prevEntityKeyRef.current = entityKey
    if (prev === null || prev === entityKey) return
    const prevIds = prev ? prev.split(',') : []
    const nextIds = entityKey ? entityKey.split(',') : []
    if (nextIds.length === 0) return
    /* An EMPTY sheet gaining its first table is not a replaced drawing —
       it is the whole point of the screen. Resetting the session here
       would throw away the camera the reader is looking through and
       re-frame the sheet the instant they let go of their first table. */
    if (prevIds.length === 0) return
    if (nextIds.some((id) => prevIds.includes(id))) return
    resetCanvasSession()
    interactedRef.current = false
    setDrawingRev((r) => r + 1)
  }, [entityKey])

  const firstFrameRef = useRef(true)
  /**
   * The opening frame hit the readable floor, so it does NOT hold every
   * table — the legend says which control frames the rest.
   *
   * IT HAS TO SURVIVE THE COMPONENT, because the camera does.
   * `.shell-sheet-layer` unmounts whole every time a page opens over the
   * sheet, so this state is thrown away on every visit while
   * `getCanvasCamera` — module state — is restored. Measured: come back
   * to the drawing a second time and the frame was still the readable
   * one while the sentence explaining it had gone.
   *
   * A camera still sitting exactly on the readable floor is still that
   * frame, so the line is still true. Zoom at all and it is not, and the
   * line goes — which is the same thing FIT does to it explicitly.
   */
  const [framedPart, setFramedPart] = useState(
    () => Math.abs((initialCamera?.zoom ?? 0) - MIN_READABLE) < 1e-6,
  )

  /* ============================================================
     THE ONE FRAME IS NEVER SPENT ON A PANE WITH NO SIZE.

     The sheet is a SECTION now, not a backdrop: `Shell` draws it
     inside `.shell-sheet-layer`, which carries `hidden` — i.e.
     `display: none` — the whole time any window is in front. That is
     their decision and it is the right one; the cost is that this
     canvas can mount, initialise its nodes and spend its single
     framing licence while its container measures 0 × 0.

     What that produced, measured at 1280 × 782 after pressing Data
     model with a table window open: `matrix(0.04, …)` — React Flow's
     minZoom floor — with all fifty-two cards packed into a 93 × 118
     speck in the top-left corner, 1.1 % of the pane. The drawing was
     perfect and the camera was nonsense, and because the licence is
     one-shot, revealing the sheet could never put it right. Pressing
     FIT recovered it (0.13, 28 %), which is how we know it was only
     ever the camera.

     So the licence waits for a pane that can be measured, and a
     ResizeObserver re-runs this effect at the moment the sheet is
     revealed and gains one. Nothing else about the camera changes —
     it is still framed exactly twice, on the first real draw of a
     session and on FIT.
     ============================================================ */
  const [paneMeasured, setPaneMeasured] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const read = (): void => {
      const { width, height } = el.getBoundingClientRect()
      setPaneMeasured(width > 1 && height > 1)
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!nodesInitialized || tableNodes.length === 0) return
    /* a hidden sheet has no box to frame into, and framing into one
       would burn the session's only frame on a degenerate transform */
    if (!paneMeasured) return
    /* the licence is claimed only once there is something to frame —
       an empty sheet must not spend it and leave the first table the
       reader creates off camera */
    if (!claimLayerFrame('table')) return
    const first = firstFrameRef.current
    firstFrameRef.current = false
    /* the reader got to the sheet before we ever framed it — leave it */
    if (first && interactedRef.current) return

    /* AN EXPANDED CARD IS FRAMED, NOT LEFT WHERE IT FELL.

       The expanded-frames key is in localStorage and survives a
       reload; the camera is module state and does not. So the app
       used to come back with a card sized to the WHOLE PANE sitting
       at whatever canvas coordinate it happened to occupy, with the
       viewport at its default — which put half of it behind the
       panel, the rest off the right edge, and its own COLLAPSE
       button somewhere off screen. There was no other way out,
       because every control for an expanded card is drawn ON the
       card.

       If a table is expanded, it IS what the reader left the sheet
       looking at, so it is what the camera opens on. */
    const expandedIds = Object.keys(expandedTables)
    const target = expandedIds.find((id) =>
      tableNodes.some((n) => n.id === id),
    )
    if (target) {
      const node = rf.getNode(target)
      if (node) {
        void rf.fitBounds(
          {
            x: node.position.x,
            y: node.position.y,
            width: node.width ?? DEFAULT_TABLE_NODE_SIZE.w,
            height: node.height ?? DEFAULT_TABLE_NODE_SIZE.h,
          },
          { padding: 0.06, duration: 0 },
        )
        return
      }
    }
    /* THE OPENING FRAME TAKES THE READABLE FLOOR. See `MIN_READABLE`:
       the seeded sheet fitted at 0.1386, where the plate's own name
       drew at 4.7px. What the frame did NOT hold is not left to be
       guessed at — it is handed to the legend, which says it. */
    setFramedPart(frameTables(420, true))
  }, [
    frameTables,
    nodesInitialized,
    paneMeasured,
    tableNodes,
    drawingRev,
    expandedTables,
    rf,
  ])

  const onFit = useCallback(() => {
    interactedRef.current = true
    /* FIT MUST ALWAYS BE ABLE TO FIT — no floor here, deliberately.
       The one recovery control on this sheet may not refuse to recover;
       the note on `minZoom` below is the same lesson, learned the hard
       way. Once it has run, every table IS in the frame, so the legend's
       line about the rest of them stops being true and goes. */
    frameTables(420)
    setFramedPart(false)
  }, [frameTables])

  /* THE EMPTY SHEET is not answered here. The shell pins ONE
     invitation card to the blueprint (`EmptyState` / `.shell-invite`)
     — organisation named, one sentence, one button, and the line
     about dragging a type from the left. A second plate drawn by the
     canvas would land straight on top of it, which is the clutter
     this pass exists to remove. What the sheet DOES answer is the
     drag: the hairline frame in `.wb-root--drop`. */

  return (
    <div
      className={`wb-root${dropping ? ' wb-root--drop' : ''}`}
      ref={wrapRef}
    >
      {/* ============================================================
          THE TITLE BLOCK — what this drawing is, on the drawing.

          This screen is the second item on the dock and it said nothing
          about itself: 52 cards on an infinite plane, no bar, no name,
          no sentence. Every other place in this app has a 52px toolbar
          that names it; the sheet is the one surface underneath all of
          them and adding a toolbar to it would be a second bar on the
          screen the moment a window opens over it.

          So it takes the form a drawing office would use instead — a
          title block, pinned to the paper, in the same card the rest of
          the app is made of. It counts what is drawn rather than what is
          stored, so it can never disagree with the cards beside it, and
          `pointer-events: none` keeps every pan, drag and drop on the
          sheet exactly as it was. Its height is measured by the framing
          arithmetic above, so no card ever opens underneath it.
          ============================================================ */}
      {tableNodes.length > 0 ? (
        <aside className="wb-legend" ref={legendRef} aria-label="What this drawing shows">
          <span className="mono-label wb-legend-eyebrow">Data model</span>
          <p className="wb-legend-say">
            Every table you have, drawn where you put it, with a line wherever one
            table points at another. Press a card to open its register.
          </p>
          <p className="wb-legend-count">
            <b>{shape.tables}</b> tables
            {shape.joins > 0 ? (
              <>
                <i aria-hidden="true" />
                <b>{shape.joins}</b> of them relationships
              </>
            ) : null}
          </p>
          {/* WHAT THE FRAME LEFT OUT, SAID OUT LOUD. A first frame that
              holds half the drawing is only honest if it admits it and
              names the control that shows the rest — which is the FIT
              bracket bottom left, and it is still the one thing on this
              sheet that always frames every table. */}
          {framedPart ? (
            <p className="wb-legend-more">
              Opened close enough to read. <b>Fit</b>, bottom left, frames all{' '}
              {shape.tables} at once.
            </p>
          ) : null}
        </aside>
      ) : null}

      <ReactFlow<CanvasNode, Edge>
        className="wb-canvas"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
        defaultViewport={initialCamera ?? undefined}
        /* a double-click belongs to the cell under it, never to the
           camera — tables are edited in place */
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        multiSelectionKeyCode={null}
        selectionKeyCode={null}
        /* links are made by adding a Link column, never by dragging a
           wire between two tables */
        nodesConnectable={false}
        edgesReconnectable={false}
        /* A card that is not on screen is not drawn at all. Every table
           node carries an exact frame size, so React Flow can answer
           "is this inside the window" from arithmetic — and a node it
           has never measured is rendered once regardless, so the first
           framing pass still has every frame to work with.

           This is the cheapest of the four savings and the last line of
           defence behind them: the level-of-detail plate and the column
           window cut what a VISIBLE card costs; this cuts the ones that
           are not visible at all to nothing. */
        /* FIT MUST ALWAYS BE ABLE TO FIT. `fitBounds` silently honours the
           canvas floor: with the default minZoom, a sheet of 23 tables
           spanning ~5,700px needs zoom 0.13 to frame, the camera clamps at
           the floor, and FIT appears to do NOTHING — which is exactly how a
           reader ends up stranded on a corner of their own drawing with the
           one recovery control dead in their hand. The floor is now lower
           than any drawing we can produce. Nothing is legible down there,
           and nothing needs to be: the level-of-detail plate is what a card
           becomes, and seeing the SHAPE of the sheet is the whole point of
           being zoomed out that far. */
        onlyRenderVisibleElements
        /* a 520px frame on a sheet of 520px frames: the one you are
           working in has to come to the top */
        elevateNodesOnSelect
        disableKeyboardA11y
        snapToGrid
        snapGrid={SNAP_GRID}
        minZoom={0.04}
        maxZoom={1.75}
      >
        <Background
          id="wb-grid-minor"
          variant={BackgroundVariant.Lines}
          gap={16}
          color="var(--canvas-grid-minor)"
        />
        <Background
          id="wb-grid-major"
          variant={BackgroundVariant.Lines}
          gap={80}
          color="var(--canvas-grid-major)"
        />

        {/* THE ONLY INSTRUMENT ON THE SHEET: zoom, and FIT. */}
        <Controls
          position="bottom-left"
          showInteractive={false}
          showFitView={false}
          aria-label="Sheet zoom"
        >
          <ControlButton
            className="wb-ctl-fit"
            onClick={onFit}
            title="Fit every table to the view"
            aria-label="Fit every table to the view"
          >
            <FitGlyph />
          </ControlButton>
        </Controls>
      </ReactFlow>
    </div>
  )
}

/* ------------------------------------------------------------ */
/* Public component                                             */
/* ------------------------------------------------------------ */

export interface WhiteboardProps {
  /** Where a dropped table type goes. Left unset, the sheet publishes
   *  it through `requestNewTable` and whoever hosts the kit's
   *  `NewTableDialog` picks it up with `useNewTableRequest()`. Either
   *  way the structure question still gets asked — a drop places a
   *  table, it does not create one. */
  onDropTableKind?: (kind: TableKind, position: XY) => void
}

export function Whiteboard({ onDropTableKind }: WhiteboardProps = {}): JSX.Element {
  return (
    <ReactFlowProvider>
      <WhiteboardCanvas onDropTableKind={onDropTableKind} />
    </ReactFlowProvider>
  )
}
