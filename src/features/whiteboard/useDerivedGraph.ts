/* ============================================================
   Store → React Flow (the ERD half of the sheet).

   The store is the source of truth; the whiteboard keeps a local
   mirror of what this hook returns so a drag stays smooth, and
   commits back on drag-stop / resize-end.

   IDENTITY IS THE CONTRACT. Every node object here is cached per
   id and handed back UNCHANGED while nothing about that card has
   actually changed. Moving one card must not re-render the other
   twenty-three; editing a cell nobody has opened in DATA mode
   must not re-derive the drawing at all.
   ============================================================ */

import { useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { MarkerType } from '@xyflow/react'
import type { Edge, EdgeMarker, Node } from '@xyflow/react'
import { useProjectStore } from '@/store/useProjectStore'
import type { AccentKey, EntityDef, GroupDef, RowData } from '@/types/model'
import { buildPreview, defaultCardMode } from './cardModes'
import type { CardMode, DataPreview } from './cardModes'

/** Bright accent variant — for strokes/labels sitting ON the navy canvas. */
export const accentBrightVar = (a: AccentKey): string =>
  `var(--accent-${a}-bright)`

/* One shared empty list, so an entity with no rows keeps a stable
   reference between renders instead of allocating a fresh []. */
const EMPTY_ROWS: RowData[] = []

/* ------------------------------------------------------------ */
/* Node data shapes (plain type aliases so they satisfy the     */
/* Record<string, unknown> constraint on React Flow node data)  */
/* ------------------------------------------------------------ */

export type EntityNodeData = {
  entity: EntityDef
  /** effective lens for this card: sheet default, or its own override */
  mode: CardMode
  /** true when the card holds a per-card override of the sheet default */
  pinned: boolean
  rowCount: number
  /** mini-table for DATA mode; null in every other mode */
  preview: DataPreview | null
  /** the reviewer found at least one BLOCKER on this entity */
  flagged: boolean
  /** accent of the zone this entity sits in — its corner ticks take this ink */
  zoneAccent: AccentKey | null
  /** RULES layer: the card is a flat navy silhouette, not a paper card */
  underlay: boolean
  /** set / release this card's mode override (Whiteboard component state) */
  onSetMode: (entityId: string, mode: CardMode) => void
}

export type ZoneNodeData = {
  group: GroupDef
  memberCount: number
}

export type EntityFlowNode = Node<EntityNodeData, 'entity'>
export type ZoneFlowNode = Node<ZoneNodeData, 'zone'>
export type WbNode = EntityFlowNode | ZoneFlowNode

/* Layering: zones sit under edges, edges under entity cards. */
export const Z_ZONE = 1
export const Z_EDGE = 5
/** A lit link rises above the other lines and stays under every card:
 *  following one must never mean it disappears behind its neighbours,
 *  and a line must never be drawn across the table it lands on. */
export const Z_EDGE_LIT = 6
export const Z_ENTITY = 10

/* ============================================================
   ONE ARROWHEAD, AND IT IS THE COLOUR OF ITS OWN LINE.

   There used to be two marker definitions — a grey one and a
   selected one — swapped on the edge object as the reader clicked.
   Two problems with that. A marker lives in a shared `<defs>`, so
   it cannot answer :hover, which is where a line is followed most;
   and a per-state marker means a per-state edge object, i.e. the
   whole edge array re-allocated to change a colour.

   `context-stroke` is SVG 2's answer: inside a marker it resolves
   to the stroke of the path that referenced it. So there is now
   ONE definition for all ~64 links, and the head is always exactly
   the ink of its line — at rest, under the cursor, lit, or dimmed
   behind a spotlight — with no edge object rewritten to do it.
   Every state below is CSS on the path and nothing else.

   THE FALLBACK IS REAL. React Flow writes the colour as an inline
   `fill`/`stroke`, so a browser that does not know `context-stroke`
   drops the declaration and the rule in `whiteboard.css`
   (`.react-flow__arrowhead .arrowclosed`) is what paints the head.
   It is a plain token, so the arrows are quiet rather than absent.

   `markerUnits` is React Flow's default, `strokeWidth` — which is
   the other half of the trick: thicken a line on hover and its
   head grows with it.
   ============================================================ */
export const EDGE_MARKER: EdgeMarker = {
  type: MarkerType.ArrowClosed,
  width: 16,
  height: 16,
  color: 'context-stroke',
}

/* ------------------------------------------------------------ */
/* Rows: the narrowest possible dependency                      */
/* ------------------------------------------------------------ */

/**
 * Rows reach a card in exactly two places: the `N=` count every card
 * carries, and the mini-table a DATA-mode card draws. This stamp changes
 * for those two and nothing else, so typing in a cell of an entity no
 * card is showing as DATA leaves the whole ERD derivation untouched.
 */
function useRowsStamp(
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
  dataKey: string,
): number {
  const ref = useRef({
    stamp: 0,
    counts: '\u0000',
    key: '\u0000',
    rows: [] as RowData[][],
    all: null as Record<string, RowData[]> | null,
  })
  const s = ref.current

  let counts = ''
  for (const id of Object.keys(entities)) {
    counts += `${id}:${(rowsByEntity[id] ?? EMPTY_ROWS).length};`
  }

  const dataIds = dataKey ? dataKey.split(',') : []
  const rows = dataIds.map((id) => rowsByEntity[id] ?? EMPTY_ROWS)
  /* a DATA card showing a link cell reads the OTHER entity's rows too, so
     for those the whole row map is the honest dependency */
  const crossRef = dataIds.some((id) =>
    entities[id]?.fields.some((f) => f.type === 'reference'),
  )

  const changed =
    counts !== s.counts ||
    dataKey !== s.key ||
    rows.length !== s.rows.length ||
    rows.some((r, i) => r !== s.rows[i]) ||
    (crossRef && rowsByEntity !== s.all)

  if (changed) {
    s.stamp += 1
    s.counts = counts
    s.key = dataKey
    s.rows = rows
    s.all = rowsByEntity
  }
  return s.stamp
}

/* ------------------------------------------------------------ */
/* Store -> graph derivation                                    */
/* ------------------------------------------------------------ */

export interface GraphInput {
  /** the sheet-wide DETAIL/COMPACT toggle — supplies the default mode */
  detail: boolean
  /** per-card mode overrides, keyed by entityId (component state) */
  modes: Record<string, CardMode>
  /** entity ids the reviewer marked with a blocker */
  blockedIds: ReadonlySet<string>
  /** RULES layer: cards drop to a flat navy silhouette */
  underlay: boolean
  /** RULES layer: the ERD is a drawing to read, not a thing to shove */
  locked: boolean
  onSetMode: (entityId: string, mode: CardMode) => void
}

interface CardEntry {
  node: EntityFlowNode
  /** inputs the preview was built from, so it is only rebuilt when stale */
  entity: EntityDef
  rows: RowData[]
  entityMap: Record<string, EntityDef>
  rowMap: Record<string, RowData[]>
}

/** Everything a card draws. Position lives on the node, not in here. */
const sameCardData = (a: EntityNodeData, b: EntityNodeData): boolean =>
  a.entity === b.entity &&
  a.mode === b.mode &&
  a.pinned === b.pinned &&
  a.rowCount === b.rowCount &&
  a.preview === b.preview &&
  a.flagged === b.flagged &&
  a.zoneAccent === b.zoneAccent &&
  a.underlay === b.underlay &&
  a.onSetMode === b.onSetMode

/* ============================================================
   WHAT INK A LINK IS DRAWN IN.

   The kind of the table it POINTS AT. A link column means "this row
   names one of those", so the honest colour for the line is the
   colour of the thing being named — and the payoff is that the
   hubs of a 53-table drawing announce themselves without a legend:
   every line converging on a boat table is indigo, everything
   landing on the outboards is orange, and the shape of the business
   is visible from the opening frame.

   This is the licensed use of a kind hue and not a stretch of it —
   a line, like a rail or a dot, never a fill behind text and never
   chrome. The eight hues are cut to roughly equal luminance, so a
   sheet of mixed links still reads as one drawing rather than as
   wiring. The single accent is untouched: nothing here is blue
   because it is actionable, only because a boat is indigo.
   ============================================================ */
export const tableInk = (t: EntityDef | undefined): string =>
  `var(--kind-${t?.kind ?? (t?.role === 'join' ? 'join' : 'custom')})`

/* ============================================================
   RELATIONSHIP LINES — on their own, because they outlived the
   cards that used to carry them.

   The configurator sheet draws TABLES, not schema cards, but a link
   column still means one table points at another and that is worth
   a line. It costs no chrome, no toggle and no explanation, so it
   stays: same derivation, same identity cache, no card in sight.
   Node ids are entity ids on both drawings, so an edge attaches to a
   table exactly as it attached to a card.
   ============================================================ */
export function useRelationshipEdges(): Edge[] {
  const entities = useProjectStore((s) => s.entities)
  const edgeCache = useRef(new Map<string, Edge>())

  return useMemo<Edge[]>(() => {
    const next = new Map<string, Edge>()
    const out: Edge[] = []
    for (const e of Object.values(entities)) {
      for (const f of e.fields) {
        if (f.type !== 'reference' || !f.refEntityId) continue
        const target = entities[f.refEntityId]
        if (!target) continue
        /* NOT `.toUpperCase()`. The label is the COLUMN'S NAME — the
           dealer wrote "Series", "Boat Weight kg" — and this line was
           uppercasing it in TypeScript rather than in CSS, so the
           capitals were baked into the DOM where nothing downstream
           could get their capitalisation back. DESIGN_PRINCIPLES rule
           3: uppercase is a label style, never a name. The chip's type
           lives in `.wb-canvas .react-flow__edge-text`. */
        const label = f.name
        const ink = tableInk(target)
        /* the whole sentence, for a reader who cannot see the line at
           all — "Rigging Kits · Boat points at Highfield Inflatables" */
        const said = `${e.name} · ${f.name} points at ${target.name}`
        const prev = edgeCache.current.get(f.id)
        if (
          prev &&
          prev.source === e.id &&
          prev.target === f.refEntityId &&
          prev.label === label &&
          prev.ariaLabel === said &&
          (prev.style as Record<string, string> | undefined)?.['--wb-line'] ===
            ink
        ) {
          next.set(f.id, prev)
          out.push(prev)
          continue
        }
        const edge: Edge = {
          id: f.id,
          source: e.id,
          target: f.refEntityId,
          /* BEZIER, NOT SMOOTHSTEP, and it is about this drawing in
             particular. Every node here is a 520px register on a
             coarse grid, so orthogonal segments run ALONG the card
             edges and along each other: three links into one table
             arrive as one grey line. A curve leaves the card square
             and then bows clear of it, so the same three arrive as
             three arcs a person can follow with their eye. */
          type: 'default',
          className: 'wb-edge',
          zIndex: Z_EDGE,
          /* the ink travels on the PATH, where the state rules are —
             one custom property instead of eight classes */
          style: { '--wb-line': ink } as CSSProperties,
          label,
          labelBgPadding: [7, 4],
          labelBgBorderRadius: 5,
          ariaLabel: said,
          /* a 1.8px line is a hard thing to point at; the invisible
             hit path is what makes following one comfortable */
          interactionWidth: 26,
          /* SELECTING A LINE IS RETIRED. Pointing at one lights it,
             and pointing at a TABLE lights every line it is on —
             both better answers than a click that only ever changed
             a colour, and neither needs the edge array rewritten. */
          selectable: false,
          focusable: false,
          markerEnd: EDGE_MARKER,
        }
        next.set(f.id, edge)
        out.push(edge)
      }
    }
    edgeCache.current = next
    return out
  }, [entities])
}

/**
 * Derives React Flow nodes + edges from the project store.
 *
 * OFF THE DEFAULT PATH — this is the ERD half of the sheet (schema
 * cards + zone frames). The configurator draws tables instead; see
 * "OFF THE DEFAULT PATH" in `Whiteboard.tsx` for how to bring it back.
 * The edges are shared with the table drawing through
 * `useRelationshipEdges` above.
 */
export function useDerivedGraph({
  detail,
  modes,
  blockedIds,
  underlay,
  locked,
  onSetMode,
}: GraphInput): {
  nodes: WbNode[]
  edges: Edge[]
} {
  const entities = useProjectStore((s) => s.entities)
  const groups = useProjectStore((s) => s.groups)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)

  /* read inside the memo without making the memo depend on it — the rows
     stamp below is the dependency that actually matters */
  const rowsRef = useRef(rowsByEntity)
  rowsRef.current = rowsByEntity

  /* which cards are showing a mini-table right now (a plain string, so it
     is a value the memos can depend on rather than a fresh Set) */
  const dataKey = useMemo(() => {
    const fallback = defaultCardMode(detail)
    return Object.keys(entities)
      .filter((id) => (modes[id] ?? fallback) === 'data')
      .sort()
      .join(',')
  }, [entities, modes, detail])

  const rowsStamp = useRowsStamp(entities, rowsByEntity, dataKey)

  const cardCache = useRef(new Map<string, CardEntry>())
  const zoneCache = useRef(new Map<string, ZoneFlowNode>())

  const nodes = useMemo<WbNode[]>(() => {
    const rowMap = rowsRef.current

    const memberCount: Record<string, number> = {}
    for (const e of Object.values(entities)) {
      if (e.groupId && groups[e.groupId]) {
        memberCount[e.groupId] = (memberCount[e.groupId] ?? 0) + 1
      }
    }

    /* -- zone frames ------------------------------------------ */
    const nextZones = new Map<string, ZoneFlowNode>()
    const zones: ZoneFlowNode[] = Object.values(groups).map((g) => {
      const count = memberCount[g.id] ?? 0
      const prev = zoneCache.current.get(g.id)
      if (
        prev &&
        prev.data.group === g &&
        prev.data.memberCount === count &&
        prev.width === g.size.w &&
        prev.height === g.size.h &&
        prev.position.x === g.position.x &&
        prev.position.y === g.position.y
      ) {
        nextZones.set(g.id, prev)
        return prev
      }
      const node: ZoneFlowNode = {
        id: g.id,
        type: 'zone',
        position: { x: g.position.x, y: g.position.y },
        width: g.size.w,
        height: g.size.h,
        zIndex: Z_ZONE,
        data: { group: g, memberCount: count },
      }
      nextZones.set(g.id, node)
      return node
    })
    zoneCache.current = nextZones

    /* -- entity cards ----------------------------------------- */
    const nextCards = new Map<string, CardEntry>()
    const fallbackMode = defaultCardMode(detail)

    const cards: EntityFlowNode[] = Object.values(entities).map((e) => {
      const prev = cardCache.current.get(e.id)
      const zone = e.groupId ? groups[e.groupId] : undefined
      const rows = rowMap[e.id] ?? EMPTY_ROWS
      const override = modes[e.id]
      const mode = override ?? fallbackMode

      /* the mini-table is the expensive part: rebuilt only when the card,
         its own rows, or (for link cells) the maps it reads through move */
      let preview: DataPreview | null = null
      if (mode === 'data' && !underlay) {
        const crossRef = e.fields.some((f) => f.type === 'reference')
        const reusable =
          prev !== undefined &&
          prev.node.data.preview !== null &&
          prev.entity === e &&
          prev.rows === rows &&
          (!crossRef ||
            (prev.entityMap === entities && prev.rowMap === rowMap))
        preview = reusable
          ? prev.node.data.preview
          : buildPreview(e, rows, entities, rowMap)
      }

      const data: EntityNodeData = {
        entity: e,
        mode,
        pinned: override !== undefined,
        rowCount: rows.length,
        preview,
        flagged: blockedIds.has(e.id),
        zoneAccent: zone ? zone.accent : null,
        underlay,
        onSetMode,
      }

      if (
        prev &&
        sameCardData(prev.node.data, data) &&
        prev.node.position.x === e.position.x &&
        prev.node.position.y === e.position.y &&
        prev.node.draggable === !locked
      ) {
        const kept: CardEntry = {
          node: prev.node,
          entity: e,
          rows,
          entityMap: entities,
          rowMap,
        }
        nextCards.set(e.id, kept)
        return prev.node
      }

      const node: EntityFlowNode = {
        id: e.id,
        type: 'entity',
        position: { x: e.position.x, y: e.position.y },
        zIndex: Z_ENTITY,
        draggable: !locked,
        data,
      }
      nextCards.set(e.id, {
        node,
        entity: e,
        rows,
        entityMap: entities,
        rowMap,
      })
      return node
    })
    cardCache.current = nextCards

    /* zones first so they also paint below entities in DOM order */
    return [...zones, ...cards]
  }, [
    entities,
    groups,
    rowsStamp,
    detail,
    modes,
    blockedIds,
    underlay,
    locked,
    onSetMode,
  ])

  /* -- relationship edges — the same lines the table sheet draws */
  const edges = useRelationshipEdges()

  return { nodes, edges }
}
