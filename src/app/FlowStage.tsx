/* ============================================================
   THE FLOW STAGE — the shell's box around `@/features/rules`.

   Third time the same lesson: a finished feature reachable from
   nothing. `@/features/rules` is not a component, it is a KIT — node
   types, a graph hook, a palette, an inspector, a toolbar, a results
   rail — and its own index.ts says "the shell/whiteboard mounts
   these". Nothing ever did. The engine runs (the two seeded rules
   answer with real motor and trailer matches), but with no canvas a
   person could not click a plate, could not change a range and could
   not draw a rule of their own: node selection and edge creation
   both arrive from a `<ReactFlow>` that did not exist. This file is
   that canvas and nothing more — no rule logic is written here.

   WHAT THIS FILE IS, AND ALL IT IS:
     1. a way back   — one control, top left, always there;
     2. an index     — `RulesList`, the rail of rules, on the left;
     3. the drawing  — a React Flow canvas of the open rule's plates,
                       with the palette strip floating on it;
     4. a right column that is EITHER the inspector for the plate you
        clicked OR the results of the last run — never both, because
        this stage is over the sheet and a third column is a wall.

   IT SITS OVER THE SHEET, like the view and rules stages, so the
   blueprint keeps its zoom and node state underneath and closing is
   instant.

   TWO PANELS STILL. The columns below are INSIDE the stage, the way
   `ViewStage` puts its row rail inside its own box. Nothing here
   re-opens the right rail the shell deleted.

   A STAGE MUST NEVER OUTLIVE ITS SUBJECT. `deleteRule` and
   `replaceProject` both leave `activeRuleId` pointing at a rule that
   is gone, so the id is treated as open only when the rule is really
   there — same guard the shell puts on `viewing`.

   KEYSTROKES STOP HERE. The whiteboard is still mounted underneath
   and still holds a window-level keydown handler: Delete or Backspace
   with a table selected offers to delete that whole table, and it
   only skips INPUT/TEXTAREA/SELECT — a stage made of buttons is not
   exempt. Stopping keydown at this root is what keeps a delete aimed
   at a plate from deleting a price file.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import {
  Background,
  BackgroundVariant,
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
  Node,
  NodeChange,
  OnBeforeDelete,
  OnConnect,
  OnNodeDrag,
} from '@xyflow/react'
import { ArrowLeft } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { sayUndoable } from '@/store/notes'
import type { RuleNode } from '@/types/model'
import {
  RuleInspector,
  RulePaletteStrip,
  RuleResultsRail,
  RuleToolbar,
  RulesList,
  isPaletteDrag,
  onPaletteDrop,
  ruleNodeTypes,
  useRuleGraph,
  useRuleRun,
} from '@/features/rules'
import { ICON_SIZE } from '@/lib/icons'
import { stageKeys, useStageEscape } from './stageKeys'

/* The sheet's grid, so plates and tables sit on the same paper. */
const GRID = 16
const SNAP_GRID: [number, number] = [GRID, GRID]

/* Plate geometry, only ever used to aim the camera — the drawing's own
   sizes live in rule-nodes.css and in `drop.ts`. */
const PLATE_W = 280
const PLATE_MID_Y = 64

/* The camera. Below MIN_READABLE a 10px micro-label is under 7px, which
   is where a drawing stops being a drawing and becomes a diagram of
   one, so the opening frame never goes under it. */
const MIN_READABLE = 0.68
const MAX_FRAME_ZOOM = 1
const FRAME_PAD = 32

export interface FlowStageProps {
  onClose: () => void
}

export function FlowStage({ onClose }: FlowStageProps): ReactElement {
  const rules = useProjectStore((s) => s.rules)
  const activeRuleId = useProjectStore((s) => s.activeRuleId)

  /* NEVER TRUST THE REMEMBERED ID. `deleteRule` and `replaceProject`
     leave `activeRuleId` set; only the list and the demo loader clear
     it, so an import through `features/io` would hand this stage an id
     with no rule behind it and every child would draw an empty box. */
  const ruleId = activeRuleId && rules[activeRuleId] ? activeRuleId : null

  /* Escape is the control in track 1 of the bar, on the keyboard. The
     rule canvas underneath keeps its own Delete/Backspace — that belongs
     to the plate a person has selected, and this stage root lets nothing
     of the sort travel. */
  useStageEscape(onClose)

  /* the plate the inspector is open on — canvas-local, because a
     selection is a thing you are doing here, not a thing the project
     remembers */
  const [nodeId, setNodeId] = useState<string | null>(null)
  useEffect(() => setNodeId(null), [ruleId])

  const { result, running, clear } = useRuleRun(ruleId)

  /* ONE SIDE COLUMN, TWO THINGS TO SAY, AND THE READER DECIDES WHICH.
     A run answers the question, so RUN turns the column over to the
     answer. But the next thing a person does with an answer is ask how
     it was reached — so clicking a step turns it back to that step,
     rather than leaving them looking at a table of results with the
     inspector unreachable until they threw the results away. The
     answer is not lost either way: the toolbar keeps the headline
     numbers, and RUN brings the table back. */
  const [side, setSide] = useState<'step' | 'results'>('step')
  useEffect(() => {
    if (running || result) setSide('results')
  }, [running, result])
  useEffect(() => setSide('step'), [ruleId])

  const pickNode = (id: string | null) => {
    setNodeId(id)
    if (id) setSide('step')
  }

  const showResults = !!ruleId && side === 'results' && (running || !!result)

  return (
    <div
      className="shell-viewstage shell-flowstage"
      role="region"
      aria-label="Fitment"
      /* see the header note — the sheet's Delete handler would take a
         whole table with it. Escape travels, so the shell can close this
         page with it; see stageKeys.ts for the whole order. */
      onKeyDown={stageKeys}
    >
      <div className="shell-view-bar">
        {/* `shell-view-back`, no `btn`, labelled "Back" — TableStage is
            the calibration and `.btn` would stamp this in 11px uppercase
            mono instead of the 12.5px control label the bar uses. */}
        <button type="button" className="shell-view-back" onClick={onClose} aria-label="Back">
          <ArrowLeft size={ICON_SIZE.small} aria-hidden="true" />
          <span>Back</span>
        </button>
        <p className="shell-view-what">
          {/* Fitment, not "What fits what" — commit 4c4a3e2's rule: a
              place is a noun naming what is on the screen, never a
              question. The bar was renamed and the stages it opens
              were not, so the two disagreed. */}
          <span className="shell-view-what-name">Fitment</span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          {/* NOT AD COPY. This read "walk the rows, collect the matches",
              which DESIGN_PRINCIPLES §6 names as the outgoing build's
              failure by that exact phrasing: a door caption written as a
              brochure line. The aside says what SORT of place this is —
              and it borrows the words the rules pane already uses to
              point here ("to work out what goes with something, use
              Fitment"), so the two doors describe each other the same
              way round. */}
          <span className="shell-view-what-say">the rules that work out what fits</span>
        </p>
      </div>

      <div className="shell-view-split">
        <aside className="shell-view-rail shell-flow-rail" aria-label="Rules">
          <RulesList />
        </aside>

        {ruleId ? (
          /* keyed on the rule: a different rule is a different drawing,
             and it must be framed for itself — the seeded plates sit
             hundreds of pixels above the origin, so a canvas that kept
             the previous camera would open on blank paper */
          <ReactFlowProvider key={ruleId}>
            <FlowCanvas ruleId={ruleId} nodeId={nodeId} onPickNode={pickNode} />
          </ReactFlowProvider>
        ) : (
          <div className="shell-flow-void">
            <p className="shell-view-void">
              Pick a rule on the left to see how it works out its answer, or draft
              a new one.
            </p>
            {/* NAME THE OTHER SURFACE — the mirror of the line in
                RulesPane. A rule here DERIVES a list; a rule there states
                a LIMIT. Someone who opens the wrong one does not realise
                they opened the wrong one, they conclude the thing they
                wanted is impossible. */}
            {/* the door is on the bar, not to the left — there is no
                left panel in this shell any more */}
            <p className="shell-flow-void-other">
              These rules produce answers. For a limit every row must keep — a
              maximum, a required value — use <b>Business rules</b> on the bar.
            </p>
          </div>
        )}

        {ruleId ? (
          /* THE ANSWER GETS THE ROOM. A run of the seeded motor rule
             comes back eight columns wide; in a 304px column five of
             them were off screen, including the motor — the answer to
             the question the feature exists to ask. While results are
             up the column takes half the stage and the drawing keeps
             the rest; clicking a plate hands the width straight back. */
          <aside
            className={`shell-flow-side${showResults ? ' is-results' : ''}`}
            aria-label={showResults ? 'Results' : 'Step'}
          >
            {showResults ? (
              <RuleResultsRail
                ruleId={ruleId}
                onClose={() => {
                  clear()
                  setSide('step')
                }}
              />
            ) : (
              <RuleInspector ruleId={ruleId} nodeId={nodeId} />
            )}
          </aside>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ */
/* The drawing                                                  */
/* ------------------------------------------------------------ */

interface FlowCanvasProps {
  ruleId: string
  nodeId: string | null
  onPickNode: (id: string | null) => void
}

function FlowCanvas({ ruleId, nodeId, onPickNode }: FlowCanvasProps): ReactElement {
  const { nodes: derived, edges: derivedEdges } = useRuleGraph(ruleId)
  const moveRuleNode = useProjectStore((s) => s.moveRuleNode)
  const connectRuleNodes = useProjectStore((s) => s.connectRuleNodes)
  const deleteRuleNode = useProjectStore((s) => s.deleteRuleNode)
  const deleteRuleEdge = useProjectStore((s) => s.deleteRuleEdge)

  const rf = useReactFlow()
  const nodesInitialized = useNodesInitialized()
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const [nodes, setNodes] = useState<Node[]>(derived)
  const [edges, setEdges] = useState<Edge[]>(derivedEdges)
  /* a palette chip is being dragged over the paper right now */
  const [dropping, setDropping] = useState(false)

  /* -- store -> local mirror ----------------------------------
     `useRuleGraph` hands back the SAME node object when nothing about
     a plate changed, so this pass usually allocates nothing and React
     bails out of the update. A gesture in flight owns its own
     position until it lands, or the plate snaps back under the
     cursor mid-drag. */
  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      let changed = prev.length !== derived.length
      const next = derived.map((dn, i) => {
        const p = prevById.get(dn.id)
        if (!p) {
          changed = true
          return dn
        }
        if (p.dragging) {
          changed = true
          return { ...dn, position: p.position, dragging: true, selected: p.selected }
        }
        if (
          p.data === dn.data &&
          p.position.x === dn.position.x &&
          p.position.y === dn.position.y
        ) {
          if (prev[i] !== p) changed = true
          return p
        }
        changed = true
        const rebuilt: Node = { ...dn, selected: p.selected }
        /* keep what React Flow measured — dropping it takes the plate
           back to "not initialised" and flashes the whole drawing */
        if (p.measured && p.type === dn.type) rebuilt.measured = p.measured
        return rebuilt
      })
      return changed ? next : prev
    })
  }, [derived])

  /* -- which plate carries the mark: a walk, not a rebuild ---- */
  useEffect(() => {
    setNodes((prev) => {
      let changed = false
      const next = prev.map((n) => {
        const want = n.id === nodeId
        if (!!n.selected === want) return n
        changed = true
        return { ...n, selected: want }
      })
      return changed ? next : prev
    })
  }, [nodeId, derived])

  useEffect(() => setEdges(derivedEdges), [derivedEdges])

  const onNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds))
  }, [])

  const onNodeDragStop = useCallback<OnNodeDrag<Node>>(
    (_event, node) => {
      moveRuleNode(ruleId, node.id, { x: node.position.x, y: node.position.y })
    },
    [moveRuleNode, ruleId],
  )

  /* THE WIRE IS THE WHOLE POINT. The sheet under this stage hard-codes
     `nodesConnectable={false}` — links between tables are made by
     adding a Link column, never by dragging. A rule is the opposite:
     the line from one step to the next is the rule. */
  const onConnect = useCallback<OnConnect>(
    (conn) => {
      if (!conn.source || !conn.target) return
      connectRuleNodes(ruleId, {
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle ?? undefined,
      })
    },
    [connectRuleNodes, ruleId],
  )

  /* A LINE IS CHEAP, A STEP IS NOT — AND BOTH ARE NOW UNDOABLE, which
     is what took the question away.

     This held `window.confirm("Delete this step from the rule? …
     Everything set up on it goes too, AND THERE IS NO UNDO.")`. The
     last clause was true when it was written and is not any more:
     `deleteRuleNode` and `deleteRuleEdge` each record a step, `rules`
     is in the undo slice, and a plate comes back with every clause
     still on it. Rule 9 — an undoable act gets a note with UNDO, not a
     dialog — so `onBeforeDelete` now consents and `onNodesDelete` says
     what happened afterwards.

     ONE NOTE FOR THE WHOLE GESTURE, not one per plate and not one per
     handler. React Flow's `deleteElements` calls `onNodesDelete` and
     `onEdgesDelete` for the SAME gesture, in the same turn of the
     event loop — deleting a plate always delivers its wires to the
     second one — and the store folds every op in that turn into ONE
     history entry. Two notes each offering to undo "their" step would
     be describing a stack that holds one, so the count is gathered in
     a ref and spoken once, on the microtask after the burst closes.
     The plate outranks the wire in the sentence: a person who deleted
     a step knows its lines went, and a person who cut only a line
     never hears about plates. */
  const onBeforeDelete = useCallback<OnBeforeDelete<Node, Edge>>(async () => true, [])

  const goneRef = useRef({ nodes: 0, edges: 0, queued: false })

  const noteDeleted = useCallback(() => {
    const gone = goneRef.current
    if (gone.queued) return
    gone.queued = true
    queueMicrotask(() => {
      const { nodes, edges } = gone
      gone.nodes = 0
      gone.edges = 0
      gone.queued = false
      if (nodes > 0) {
        sayUndoable(
          nodes === 1
            ? 'Deleted one step and the lines joined to it'
            : `Deleted ${nodes} steps and the lines joined to them`,
        )
      } else if (edges > 0) {
        sayUndoable(edges === 1 ? 'Deleted one line' : `Deleted ${edges} lines`)
      }
    })
  }, [])

  const onNodesDelete = useCallback(
    (going: Node[]) => {
      for (const n of going) deleteRuleNode(ruleId, n.id)
      if (going.some((n) => n.id === nodeId)) onPickNode(null)
      goneRef.current.nodes += going.length
      noteDeleted()
    },
    [deleteRuleNode, nodeId, noteDeleted, onPickNode, ruleId],
  )

  const onEdgesDelete = useCallback(
    (going: Edge[]) => {
      for (const e of going) deleteRuleEdge(ruleId, e.id)
      goneRef.current.edges += going.length
      noteDeleted()
    },
    [deleteRuleEdge, noteDeleted, ruleId],
  )

  /* -- the palette's two ways in ------------------------------ */
  const dropPoint = useCallback(() => {
    const el = wrapRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
  }, [rf])

  /* -- FRAME IT ONCE, AND FRAME IT LEGIBLY --------------------
     The two seeded rules sit at y = -420 and y = -900, so a canvas
     that opened at the origin would show a person an empty sheet and
     a palette. Framed once the plates have been measured — the sizes
     are not known before that — and never again, because after that
     the camera is the reader's.

     NOT `fitView`, AND THE FLOOR ON THE ZOOM IS WHY. Three plates
     across a 524px canvas fit at scale 0.49, which draws the 10px
     micro-labels at five pixels: the drawing was framed and unreadable
     in the same gesture. Below MIN_READABLE the camera stops shrinking
     and the frame is pinned to the TOP-LEFT of the drawing instead —
     a flow is read from its Start, and centring a drawing that does
     not fit cuts the first plate in half to show equal amounts of the
     last one. Everything else is one pan away. */
  const framedRef = useRef(false)
  useEffect(() => {
    const el = wrapRef.current
    if (framedRef.current || !nodesInitialized || nodes.length === 0 || !el) return
    framedRef.current = true

    const box = el.getBoundingClientRect()
    const bounds = rf.getNodesBounds(nodes)
    if (bounds.width === 0 || bounds.height === 0) return

    const fitZoom = Math.min(
      box.width / (bounds.width + FRAME_PAD * 2),
      box.height / (bounds.height + FRAME_PAD * 2),
    )
    const zoom = Math.min(MAX_FRAME_ZOOM, Math.max(MIN_READABLE, fitZoom))
    const spare = (span: number, room: number) => Math.max(FRAME_PAD, (room / zoom - span) / 2)

    void rf.setViewport(
      {
        zoom,
        x: (spare(bounds.width, box.width) - bounds.x) * zoom,
        y: (spare(bounds.height, box.height) - bounds.y) * zoom,
      },
      { duration: 320 },
    )
  }, [nodesInitialized, nodes, rf])

  /* A NEW PLATE MUST BE WHERE THE READER IS LOOKING. A clicked chip
     lands to the right of the plate the inspector is on, which on a
     narrow canvas is off the edge — an add nobody can see reads as an
     add that did not happen. The camera is moved by ARITHMETIC, not by
     `fitView`: fitView silently skips nodes React Flow has not measured
     yet, and a plate one tick old is exactly that. */
  const showNode = useCallback(
    (node: RuleNode) => {
      const anchor = useProjectStore
        .getState()
        .rules[ruleId]?.edges.find((e) => e.target === node.id)?.source
      const from = anchor
        ? useProjectStore.getState().rules[ruleId]?.nodes.find((n) => n.id === anchor)
        : undefined
      const cx = from
        ? (from.position.x + node.position.x) / 2 + PLATE_W / 2
        : node.position.x + PLATE_W / 2
      const cy = from
        ? (from.position.y + node.position.y) / 2 + PLATE_MID_Y
        : node.position.y + PLATE_MID_Y
      void rf.setCenter(cx, cy, { zoom: rf.getZoom(), duration: 260 })
    },
    [rf, ruleId],
  )

  return (
    <div
      className={`shell-flow-canvas${dropping ? ' is-dropping' : ''}`}
      ref={wrapRef}
      onDragOver={(event) => {
        if (!isPaletteDrag(event)) return
        /* without this the browser never fires `drop` */
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        setDropping(true)
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(event) => {
        setDropping(false)
        const point = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY })
        const node = onPaletteDrop(event, ruleId, point)
        /* open the new step straight away: a plate that lands unconfigured
           and unselected reads as a bug rather than as a next question */
        if (node) onPickNode(node.id)
      }}
    >
      <ReactFlow
        className="shell-flow-rf"
        nodes={nodes}
        edges={edges}
        nodeTypes={ruleNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_event, node) => onPickNode(node.id)}
        onPaneClick={() => onPickNode(null)}
        onConnect={onConnect}
        onBeforeDelete={onBeforeDelete}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodesConnectable
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={null}
        selectionKeyCode={null}
        zoomOnDoubleClick={false}
        disableKeyboardA11y
        snapToGrid
        snapGrid={SNAP_GRID}
        minZoom={0.15}
        maxZoom={1.75}
      >
        <Background
          id="flow-grid-minor"
          variant={BackgroundVariant.Lines}
          gap={16}
          color="var(--canvas-grid-minor)"
        />
        <Background
          id="flow-grid-major"
          variant={BackgroundVariant.Lines}
          gap={80}
          color="var(--canvas-grid-major)"
        />
      </ReactFlow>

      {/* THE INSTRUMENTS, floated on the paper rather than given a band
          of their own: RUN and the validity stamp above, the node tray
          below. Both are `position: absolute` and need this relative
          box — the strip's own stylesheet says so. */}
      <div className="shell-flow-tools nodrag nopan nowheel">
        <RuleToolbar ruleId={ruleId} />
      </div>

      <RulePaletteStrip
        dropPoint={dropPoint}
        /* the plate the inspector is on is the plate a new step follows */
        anchorNodeId={nodeId}
        onNodeAdded={(node) => {
          onPickNode(node.id)
          showNode(node)
        }}
      />
    </div>
  )
}
