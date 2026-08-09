/* ============================================================
   THE PANEL — one calm column, one scroll.

   Top: the table-type rail (drag a type onto the sheet, or press
   CREATE TABLE). Below it: the tables you actually have, GROUPED
   BY WHAT THEY HOLD — Boats, Motors, Trailers, Accessories, then
   Relationships last.

   WHY GROUPED. With the real Master Price File this list is 23
   entries: nine boat brands, seven trailer brands, two motor
   libraries, a parts table and four joins. Alphabetical, that is a
   wall — DUNBIER sits between two boat brands and a join sits
   between two products, and nobody scanning it can tell which is
   which. The kind is the only axis a salesperson thinks in, so the
   kind is the axis the list is cut on: quiet mono subhead, count,
   names A→Z inside. ONE scroll region still — the subheads are
   paragraphs in the same column, not panes.

   RELATIONSHIPS GO LAST AND DO NOT LOOK LIKE PRODUCTS. A join is
   not a thing you sell, so it is not drawn with a product mark and
   it carries no "what goes with this" door; it gets the crossing
   arrows and the plain words BOATS ↔ MOTORS underneath its name.

   TWO THINGS A ROW DOES. Clicking it aims the sheet at that table
   (unchanged). Selecting it also opens ONE quiet line beneath it —
   "What goes with each one?" — which is the door to the view page.
   It is a sentence rather than an icon on purpose: a person who has
   never seen this app cannot guess a glyph, and the whole feature
   was unreachable until this line existed. It is phrased without
   the table's name because a name may be plural ("Parts") and
   "what goes with a Parts?" is not English.

   EVERY TABLE ROW IS DRAGGABLE. The view page accepts a table
   dragged onto it; `setTableDragData` is the payload the page
   already listens for.

   ONE SET OF KIND MARKS IN THE APP. This file used to draw its
   own (`app/kindGlyphs.tsx`, now deleted) while the rail and the
   new-table dialog drew tablekit's — so the same boat appeared as
   two different boats a hundred pixels apart. The marks belong to
   the module that owns table kinds; `TableKindSymbol` is the only
   place they are drawn now.
   ============================================================ */

import { Fragment, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { ArrowsLeftRight, CaretRight } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { TABLE_KINDS, accentVar, type EntityDef, type TableKind } from '@/types/model'
import { TableKindSymbol, TableTypeRail, kindOf } from '@/features/tablekit'
import { setTableDragData } from '@/features/views'
import { ICON_SIZE } from '@/lib/icons'

const pad2 = (n: number): string => String(n).padStart(2, '0')

/* Products first, in the order a rig is built — hull, then what
   hangs off it, then what carries it, then the extras. Anything
   the presets do not cover falls to the end of the products. */
const KIND_ORDER: TableKind[] = [
  'boat',
  'motor',
  'trailer',
  'accessory',
  'package',
  'dealer',
  'custom',
]

const JOIN_KEY = '__joins'

interface PanelGroup {
  key: string
  label: string
  items: EntityDef[]
  /** joins are relationships, not products: different mark, no door */
  isJoin: boolean
}

export interface LeftPanelProps {
  /** open the "what goes with this?" page for a table */
  onOpenView: (entityId: string) => void
  /** the table whose page is open, so the row can say so */
  openViewEntityId?: string | null
  /** open the sentence-rules pane */
  onOpenRules?: () => void
  /** whether that pane is open, so the door can say so */
  rulesOpen?: boolean
}

export function LeftPanel({
  onOpenView,
  openViewEntityId = null,
  onOpenRules,
  rulesOpen = false,
}: LeftPanelProps) {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const selection = useProjectStore((s) => s.selection)
  const select = useProjectStore((s) => s.select)

  const tables = useMemo(() => Object.values(entities), [entities])

  /* Grouped by kind, each group A→Z. Order inside a group is by NAME
     (not createdAt): once the list is cut into kinds, a person is
     looking for a brand, and a brand is found alphabetically. */
  const groups = useMemo<PanelGroup[]>(() => {
    const byKind = new Map<string, EntityDef[]>()
    for (const e of tables) {
      const key = e.role === 'join' ? JOIN_KEY : kindOf(e.kind)
      const bucket = byKind.get(key)
      if (bucket) bucket.push(e)
      else byKind.set(key, [e])
    }
    const out: PanelGroup[] = []
    for (const kind of KIND_ORDER) {
      const items = byKind.get(kind)
      if (!items || items.length === 0) continue
      out.push({
        key: kind,
        label: TABLE_KINDS[kind].label,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
        isJoin: false,
      })
    }
    const joins = byKind.get(JOIN_KEY)
    if (joins && joins.length > 0) {
      out.push({
        key: JOIN_KEY,
        label: 'Relationships',
        items: joins.sort((a, b) => a.name.localeCompare(b.name)),
        isJoin: true,
      })
    }
    return out
  }, [tables])

  return (
    <nav className="shell-panel" aria-label="Tables">
      <TableTypeRail />

      {/* THE DOOR TO THE RULES. A rule is written about the whole sheet
          rather than about one table, so it hangs here rather than on a
          row — and it only appears once there is something to write a
          rule against. */}
      {tables.length > 0 && onOpenRules ? (
        <button
          type="button"
          className={`shell-panel-rules${rulesOpen ? ' is-open' : ''}`}
          /* NAMED AND PRESSED EXPLICITLY. The label is built from two
             spans, one of them a 10px uppercase aside, and a reader
             announcing "Business ruleswhat has to be true" is not a
             name — so it is stated once, plainly. `aria-pressed` is
             the honest semantic: this is a toggle, not a link. */
          aria-label="Business rules"
          aria-pressed={rulesOpen}
          onClick={onOpenRules}
        >
          <span className="shell-panel-rules-text">Business rules</span>
          <span className="shell-panel-rules-say mono-label">what has to be true</span>
        </button>
      ) : null}

      {tables.length === 0 ? (
        <p className="shell-panel-none">Your tables appear here.</p>
      ) : (
        <>
          <div className="shell-panel-head">
            <span className="mono-label">Tables</span>
            <span className="shell-panel-count">{pad2(tables.length)}</span>
          </div>

          {groups.map((group) => (
            <Fragment key={group.key}>
              <div className="shell-grp">
                <span className="mono-label shell-grp-label">{group.label}</span>
                <span className="shell-grp-count">{pad2(group.items.length)}</span>
              </div>
              {group.isJoin ? (
                <p className="shell-grp-note">What goes with what — not things you sell.</p>
              ) : null}

              <ul className="shell-tbl-list">
                {group.items.map((e) => {
                  const isSel = selection?.kind === 'entity' && selection.id === e.id
                  const rows = rowsByEntity[e.id]?.length ?? 0
                  const isOpen = openViewEntityId === e.id
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        className={`shell-tbl${isSel ? ' is-selected' : ''}`}
                        style={{ '--row-accent': accentVar(e.accent) } as CSSProperties}
                        aria-current={isSel || undefined}
                        title={`Show ${e.name} on the sheet — or drag it onto a page to relate it`}
                        /* the view page listens for exactly this payload */
                        draggable
                        onDragStart={(event) => setTableDragData(event, e.id)}
                        onClick={() => select({ kind: 'entity', id: e.id })}
                      >
                        <span className="shell-tbl-glyph">
                          {group.isJoin ? (
                            <ArrowsLeftRight size={16} weight="light" aria-hidden="true" />
                          ) : (
                            /* `kindOf` covers a table drafted before kinds
                               existed — it draws as CUSTOM rather than blank */
                            <TableKindSymbol kind={kindOf(e.kind)} size={17} />
                          )}
                        </span>
                        <span className="shell-tbl-name">{e.name}</span>
                        <span
                          className="shell-tbl-rows"
                          title={`${rows} row${rows === 1 ? '' : 's'}`}
                        >
                          {rows}
                        </span>
                      </button>

                      {/* THE DOOR TO THE VIEW PAGE. One sentence, only on
                          the table you just clicked, never on a join. */}
                      {isSel && !group.isJoin ? (
                        <button
                          type="button"
                          className={`shell-tbl-door${isOpen ? ' is-open' : ''}`}
                          onClick={() => onOpenView(e.id)}
                        >
                          <span className="shell-tbl-door-text">What goes with each one?</span>
                          <CaretRight
                            size={ICON_SIZE.tiny}
                            weight="bold"
                            aria-hidden="true"
                          />
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </Fragment>
          ))}
        </>
      )}
    </nav>
  )
}
