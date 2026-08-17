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
    (duration: number) => {
      if (tableNodes.length === 0) {
        void rf.fitView({ ...FIT_VIEW_OPTIONS, duration })
        return
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
        return
      }
      /* pad a thin drawing out to a minimum window, so one table is
         framed rather than shoved into the reader's face */
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      let width = Math.max(maxX - minX, MIN_FRAME_W)
      const height = Math.max(maxY - minY, MIN_FRAME_H)
      let x = cx - width / 2
      const y = cy - height / 2

      /* THE PANEL FLOATS OVER OUR LEFT EDGE, SO FIT MUST FRAME INTO
         WHAT IS LEFT. `fitBounds` takes one scalar padding and has no
         per-side option, so the correction is arithmetic — which is
         what this whole function already is, and for the same reason:
         we can vouch for it.

         Framing content of width Wc into the FULL container gives
         scale containerW/Wc, and the leftmost 260px of that lands
         under glass. We want scale (containerW − panelW)/Wc instead,
         so we hand fitBounds a box widened by containerW/(containerW −
         panelW) and moved left by exactly the strip the panel covers,
         measured in canvas units at that same scale. The empty strip
         then sits under the panel and every table lands to the right
         of it. Measured before this: FIT put 6 of 22 tables behind the
         panel, the leftmost at x=233 under a 260px surface. */
      const containerW = wrapRef.current?.getBoundingClientRect().width ?? 0
      const panelPx = wrapRef.current
        ? Number.parseFloat(getComputedStyle(wrapRef.current).getPropertyValue('--panel-w'))
        : 0
      const hidden = Number.isFinite(panelPx) ? panelPx : 0
      /* guard the degenerate window — a container narrower than its own
         panel would divide by zero or flip the sign */
      if (containerW > hidden + 1) {
        const visible = containerW - hidden
        const scaled = width * (containerW / visible)
        x -= (width * hidden) / visible
        width = scaled
      }

      void rf.fitBounds({ x, y, width, height }, { padding: 0.06, duration })
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
    frameTables(420)
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
    frameTables(420)
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
