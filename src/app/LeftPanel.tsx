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
   (unchanged). Selecting it also opens two quiet lines beneath it —
   "What goes with each one?" and "What is each column allowed to
   hold?" — the doors to the view page and to the column setup. They
   are sentences rather than icons on purpose: a person who has never
   seen this app cannot guess a glyph, and both features were
   unreachable until these lines existed. They are phrased without
   the table's name because a name may be plural ("Parts") and
   "what goes with a Parts?" is not English — the NAME is carried in
   `aria-label` instead, where two doors a line apart have to be told
   apart without looking.

   DOORS ABOUT THE WHOLE SHEET HANG ABOVE THE LIST, not on a row:
   "Business rules" (what has to be true) and "Work out what fits
   what" (walk every row, collect the matches). They appear only once
   there is a table to act on.

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

import { Fragment, useEffect, useMemo, useRef } from 'react'
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
  /** open the column setup for a table */
  onOpenDesign?: (entityId: string) => void
  /** the table whose page is open, so the row can say so */
  openViewEntityId?: string | null
  /** the table whose column setup is open, same reason */
  openDesignEntityId?: string | null
  /** open the sentence-rules pane */
  onOpenRules?: () => void
  /** whether that pane is open, so the door can say so */
  rulesOpen?: boolean
  /** open the flow builder — the rules that walk rows and collect matches */
  onOpenFlow?: () => void
  /** whether that stage is open, so the door can say so */
  flowOpen?: boolean
  /** open the list of quotes already made */
  onOpenQuotes?: () => void
  /** whether that stage is open, so the door can say so */
  quotesOpen?: boolean
  /** how many there are. The door is drawn only when this is above
   *  zero — see the note on the door itself. */
  quoteCount?: number
}

export function LeftPanel({
  onOpenView,
  onOpenDesign,
  openViewEntityId = null,
  openDesignEntityId = null,
  onOpenRules,
  rulesOpen = false,
  onOpenFlow,
  flowOpen = false,
  onOpenQuotes,
  quotesOpen = false,
  quoteCount = 0,
}: LeftPanelProps) {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const selection = useProjectStore((s) => s.selection)
  const select = useProjectStore((s) => s.select)

  const tables = useMemo(() => Object.values(entities), [entities])

  /* ------------------------------------------------------------
     BRING THE DOORS INTO VIEW.

     Selecting a table reveals one or two sentences beneath its row —
     they are the only way to the view page, the column setup and,
     through the view page, the quote. At 1280x800 they were drawn
     BELOW THE BOTTOM OF THE WINDOW for every one of the 21 seeded
     tables, and nothing scrolled them up: measured with the panel at
     rest, the list starts at y=704, a row is 35px and the door pair
     is 82px, so a row must sit at y<=683 for both to land on an
     800px screen. Clicking a table therefore looked like NOTHING
     HAPPENED — the camera moved on the canvas and the panel did not
     visibly change. Four of the five finished features sat behind
     that miss.

     `block: 'nearest'` is the whole trick: a row already fully on
     screen is not moved at all, so this never yanks the list under
     someone who can already see what they clicked. The doors render
     INSIDE the row's <li>, so scrolling the <li> carries them with
     it.

     Keyed on the id alone, so it fires when the SELECTION changes and
     not on every store write — a row that scrolled itself back under
     the reader's thumb on every keystroke would be worse than the
     bug. */
  const selectedId = selection?.kind === 'entity' ? selection.id : null
  const selectedRow = useRef<HTMLLIElement | null>(null)

  useEffect(() => {
    if (selectedId === null) return
    const li = selectedRow.current
    if (!li) return
    /* after paint: the doors mount in the same commit as the
       selection, and measuring before they exist scrolls to the row's
       old, shorter box */
    const id = requestAnimationFrame(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      li.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [selectedId])

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

      {/* THE DOOR BACK TO A QUOTE, AND IT GOES ABOVE THE TWO RULE
          DOORS — because it is the only one of the three that a
          salesperson opens every morning, and because the thing
          behind it is a document with a customer's name on it.

          IT APPEARS ONLY ONCE THERE IS A QUOTE, and that is the same
          lesson the two doors below it already learned the hard way:
          an empty door on top ("Business rules / what has to be
          true", opening a pane reading "No rules yet") taught people
          the panel had nothing for them, and they never tried the
          second sentence. A door onto an empty list is worse here,
          not better, because a quote is not something you go and
          make from this panel — it is made ON a view page, and the
          view page's own control is the only honest way in. So until
          one exists there is nothing to come back TO, and the panel
          stays quiet.

          The count is on the door for the same reason the table list
          carries one: a person coming back wants to know whether
          Tuesday's quote is still there before they click. */}
      {onOpenQuotes && quoteCount > 0 ? (
        <button
          type="button"
          className={`shell-panel-rules${quotesOpen ? ' is-open' : ''}`}
          /* NAMED AND PRESSED EXPLICITLY, like the two below: the
             label is built from two spans, one of them a 10px
             uppercase aside, and a reader announcing them run
             together is not a name. */
          aria-label="Quotes we have made"
          aria-pressed={quotesOpen}
          onClick={onOpenQuotes}
        >
          <span className="shell-panel-rules-text">Quotes we have made</span>
          {/* The count and nothing more. A sentence that has to read
              correctly at one AND at forty ends up reading badly at
              one — "1 document, each with its own date" — so it says
              the number, which is the fact a person came back for. */}
          <span className="shell-panel-rules-say mono-label">
            {quoteCount} made so far
          </span>
        </button>
      ) : null}

      {/* THE DOOR TO THE FLOW BUILDER, AND IT GOES FIRST OF THE TWO
          RULE DOORS.
          Two doors about rules sat here in the other order, and the
          empty one was on top: "Business rules / what has to be true"
          opens a pane reading "No rules yet", while this one opens two
          rules that already answer the question a person came with. A
          sales manager asking which motors fit a hull clicked the first
          sentence, found nothing, and had no reason to try the second.
          The one that answers something is the one you meet first.

          Deliberately NOT a second name for the door below. That one
          states a constraint — something that has to be true of any
          answer. This one PRODUCES an answer: it walks every row of a
          table and hands back the list of matches. Two different jobs,
          so two sentences, and neither of them says node, graph, flow
          or engine — words nobody selling boats has a use for. */}
      {tables.length > 0 && onOpenFlow ? (
        <button
          type="button"
          className={`shell-panel-rules${flowOpen ? ' is-open' : ''}`}
          /* NAMED AND PRESSED EXPLICITLY. The label is built from two
             spans, one of them a 10px uppercase aside, and a reader
             announcing them run together is not a name — so it is
             stated once, plainly. `aria-pressed` is the honest
             semantic: this is a toggle, not a link. */
          aria-label="Work out what fits what"
          aria-pressed={flowOpen}
          onClick={onOpenFlow}
        >
          <span className="shell-panel-rules-text">Work out what fits what</span>
          <span className="shell-panel-rules-say mono-label">
            walk every row, collect the matches
          </span>
        </button>
      ) : null}

      {/* THE DOOR TO THE CONSTRAINTS PANE. A constraint is written
          about the whole sheet rather than about one table, so it hangs
          here rather than on a row — and it only appears once there is
          something to write one against. Its aside no longer reads
          "what has to be true", which was too close to the sentence
          above it to choose between; it says what a constraint IS. */}
      {tables.length > 0 && onOpenRules ? (
        <button
          type="button"
          className={`shell-panel-rules${rulesOpen ? ' is-open' : ''}`}
          aria-label="Business rules"
          aria-pressed={rulesOpen}
          onClick={onOpenRules}
        >
          <span className="shell-panel-rules-text">Business rules</span>
          <span className="shell-panel-rules-say mono-label">
            limits every row must keep
          </span>
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
                    <li key={e.id} ref={isSel ? selectedRow : undefined}>
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

                      {/* WHY THIS ROW OFFERS NOTHING. Selecting a link
                          table used to open no doors at all and say
                          nothing about it — one click earlier a product
                          table had offered two, so the app simply
                          stopped answering. Neither door fits a join
                          (see the two notes below), so the row says so
                          instead of going quiet. */}
                      {isSel && group.isJoin ? (
                        <p className="shell-tbl-note">
                          A link table records pairs, so it has no setup of its own —
                          open one of the tables it links.
                        </p>
                      ) : null}

                      {/* THE DOOR TO THE VIEW PAGE. One sentence, only on
                          the table you just clicked, never on a join. */}
                      {isSel && !group.isJoin ? (
                        <button
                          type="button"
                          className={`shell-tbl-door${isOpen ? ' is-open' : ''}`}
                          /* named and pressed like the door under it —
                             two sentences a line apart have to be told
                             apart without looking */
                          aria-label={`What goes with each ${e.name} row`}
                          aria-pressed={isOpen}
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

                      {/* THE DOOR TO THE COLUMN SETUP. Also per table, so
                          it sits with the other one under the row you just
                          clicked — and also NEVER ON A JOIN. A join built
                          in the app carries system columns the grid keeps
                          locked, and the designer draws every column as an
                          ordinary renameable, retypeable, deletable field:
                          it would happily delete the column the pairs page
                          addresses by id. The sentence avoids "field",
                          "schema" and "type" as nouns — a person who has
                          never seen the app is being asked what a column is
                          ALLOWED to hold, which is the actual question. */}
                      {isSel && !group.isJoin && onOpenDesign ? (
                        <button
                          type="button"
                          className={`shell-tbl-door${
                            openDesignEntityId === e.id ? ' is-open' : ''
                          }`}
                          /* the two doors under one row say different
                             things but sit one line apart, so each states
                             its own name and which table it belongs to */
                          aria-label={`What is each column of ${e.name} allowed to hold`}
                          aria-pressed={openDesignEntityId === e.id}
                          onClick={() => onOpenDesign(e.id)}
                        >
                          <span className="shell-tbl-door-text">
                            What is each column allowed to hold?
                          </span>
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
