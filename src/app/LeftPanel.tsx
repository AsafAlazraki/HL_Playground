/* ============================================================
   THE PANEL — one calm column, one scroll.

   Top: the front door, then ONE LINE that opens the table-type
   tray. Below: the tables you actually have, GROUPED BY WHAT THEY
   HOLD — Boats, Motors, Trailers, Accessories — and, folded away
   under the products, the two kinds of table that are NOT stock:
   Relationships and Retired.

   WHY THE FOLDS. Measured at 1280x800 with the real file loaded:
   the panel is 744px tall, the type rail took 370 of it and the
   four sheet-wide doors 238, so the first table row was drawn at
   y=795 — five pixels below the window. ZERO of 48 tables were
   visible without scrolling, and 27 of those 48 were joins. The
   owner's words were "no confused on number 1 — make simple".
   Two folds and nothing else:

     THE TYPE TRAY, behind "Add a table". Seven chips, a head, a
     hint and a primary button, none of which a person needs while
     they are looking for STACER. It opens by itself while the
     sheet is empty, because the invitation card on the sheet
     points at it ("drag a table type from the left").

     RELATIONSHIPS, behind one line that says how many. A JOIN IS
     NOT A THING YOU SELL: it records what goes with what, it is
     made and maintained on the view pages, and nobody navigates by
     one. It is still HERE, one press away, because the panel is
     the only index of the sheet and a table you cannot reach is a
     table that rots.

     RETIRED, the same way. `isRetired` says a table is history
     rather than stock — the rows stay so an old quote still reads,
     and no surface a customer sees offers them. It therefore does
     not belong in the product list at all, and it is not deleted
     from the panel either: somebody still has to maintain it.

   WHY GROUPED. With the real Master Price File this list is 21
   products: seven boat brands, eight trailer brands, two motor
   libraries, a parts table and three packages. Alphabetical, that
   is a wall — DUNBIER sits between two boat brands and nobody
   scanning it can tell which is which. The kind is the only axis a
   salesperson thinks in, so the kind is the axis the list is cut
   on: quiet mono subhead, count, names A→Z inside. ONE scroll
   region still — subheads and folds are paragraphs in the same
   column, not panes, and nothing here scrolls on its own.

   RELATIONSHIPS DO NOT LOOK LIKE PRODUCTS. A join is not a thing
   you sell, so it is not drawn with a product mark and it carries
   no "what goes with this" door; it gets the crossing arrows.

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

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowsLeftRight, CaretRight } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { TABLE_KINDS, accentVar, isRetired, type EntityDef, type TableKind } from '@/types/model'
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
const RETIRED_KEY = '__retired'

interface PanelGroup {
  key: string
  label: string
  items: EntityDef[]
  /** NOT a product: drawn folded, under everything you can sell.
   *  The two of these are Relationships and Retired. */
  folded: boolean
  /** said once, under the head, when the fold is open */
  note?: string
}

export interface LeftPanelProps {
  /** open the dashboard — the places in the business, and the way to
   *  make one. Absent = the door is not drawn, so this panel still
   *  works for a host that has no module system. */
  onOpenDashboard?: () => void
  /** whether that stage is open, so the door can say so */
  dashboardOpen?: boolean
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
  onOpenDashboard,
  dashboardOpen = false,
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
     looking for a brand, and a brand is found alphabetically.

     THREE BUCKETS, AND RETIRED WINS. A retired table is history
     whatever it holds, so it is tested first: a retired join is
     filed under Retired rather than under Relationships, because
     the question a person has about it ("why is this still here?")
     is answered by the one word, not by the other. */
  const groups = useMemo<PanelGroup[]>(() => {
    const byKind = new Map<string, EntityDef[]>()
    for (const e of tables) {
      const key = isRetired(e) ? RETIRED_KEY : e.role === 'join' ? JOIN_KEY : kindOf(e.kind)
      const bucket = byKind.get(key)
      if (bucket) bucket.push(e)
      else byKind.set(key, [e])
    }
    const byName = (a: EntityDef, b: EntityDef): number => a.name.localeCompare(b.name)
    const out: PanelGroup[] = []
    for (const kind of KIND_ORDER) {
      const items = byKind.get(kind)
      if (!items || items.length === 0) continue
      out.push({
        key: kind,
        label: TABLE_KINDS[kind].label,
        items: items.sort(byName),
        folded: false,
      })
    }
    const joins = byKind.get(JOIN_KEY)
    if (joins && joins.length > 0) {
      out.push({
        key: JOIN_KEY,
        label: 'Relationships',
        items: joins.sort(byName),
        folded: true,
        note: 'What goes with what — not things you sell. Made and changed on a table’s own page.',
      })
    }
    const retired = byKind.get(RETIRED_KEY)
    if (retired && retired.length > 0) {
      out.push({
        key: RETIRED_KEY,
        label: 'Retired',
        items: retired.sort(byName),
        folded: true,
        note: 'Kept so old quotes still read. Nothing a customer sees offers them.',
      })
    }
    return out
  }, [tables])

  /* ------------------------------------------------------------
     WHAT IS OPEN.

     AN EMPTY SHEET OVERRIDES THE PREFERENCE. The invitation card in
     the middle of the blueprint ends "Or drag a table type from the
     left onto the sheet" — it points at the tray, so on an empty
     sheet the tray is there, and there is nothing else in this column
     for a fold to be protecting. Once tables exist the fold is shut
     unless the person says otherwise, and their word then stands
     until they say something else.

     Read off the sheet each render rather than frozen at mount on
     purpose — although App.tsx does hold the whole app back until
     Dexie has answered, so this never sees the empty half-second of a
     project that has data. */
  const [typesPref, setTypesPref] = useState<boolean | null>(null)
  const typesOpen = tables.length === 0 || (typesPref ?? false)

  const [folds, setFolds] = useState<Record<string, boolean>>({})

  /* Which folded group holds the selection, if any. */
  const selectedFoldKey = useMemo<string | null>(() => {
    if (selectedId === null) return null
    const group = groups.find((g) => g.folded && g.items.some((e) => e.id === selectedId))
    return group ? group.key : null
  }, [groups, selectedId])

  /* A SELECTION MUST NEVER LAND SOMEWHERE YOU CANNOT SEE. Search and
     the canvas can both select a join, and a row inside a shut fold
     is a row that is not rendered — so the panel would answer a click
     with nothing, which is the exact failure the doors were added to
     end.

     Adjusted DURING RENDER rather than in an effect, and that is the
     whole point: React re-runs this component before it commits, so
     the row exists in the SAME commit as the selection and the
     scroll-into-view below finds it. Opening it in an effect would
     mount the row one commit late, after that effect had already run
     and found nothing to scroll. `seenSelection` is the guard that
     makes this run once per selection, not on every render. */
  const [seenSelection, setSeenSelection] = useState<string | null>(null)
  if (selectedId !== seenSelection) {
    setSeenSelection(selectedId)
    if (selectedFoldKey !== null) {
      setFolds((current) =>
        current[selectedFoldKey] ? current : { ...current, [selectedFoldKey]: true },
      )
    }
  }

  /* The head counts what the list above it actually shows. The folded
     groups carry their own counts on their own lines, so nothing is
     hidden from the total — it is just told in three numbers instead
     of one. */
  const productCount = useMemo(
    () => groups.reduce((total, g) => (g.folded ? total : total + g.items.length), 0),
    [groups],
  )

  return (
    <nav className="shell-panel" aria-label="Tables">
      {/* THE FRONT DOOR, AND IT IS THE FIRST THING IN THE COLUMN.

          Every other door here is about the sheet — a rule written
          about it, a walk over it, a document made from a row of it.
          This one is about the BUSINESS: the places in it, and what
          people are allowed to do when they are standing in one. It
          is what a stakeholder is shown first, so it is what the
          panel offers first, above the type rail and above both rule
          doors.

          IT IS ALWAYS DRAWN, unlike the quote door beside it. That
          one waits for a quote to exist because a quote is made
          somewhere else and a door onto an empty list teaches people
          the panel has nothing for them. This door is the only way to
          make the thing behind it, so hiding it until one exists
          would hide it forever.

          IT DOES NOT REPLACE THE SHEET. Whether the dashboard becomes
          the app's home is open question 1 in the plan and nobody has
          answered it; a door is the honest shape until somebody does.

          NAMED AND PRESSED EXPLICITLY, like every door below it: the
          label is two spans, one of them a 10px uppercase aside, and
          a reader announcing them run together is not a name. */}
      {onOpenDashboard ? (
        <button
          type="button"
          className={`shell-panel-rules is-front${dashboardOpen ? ' is-open' : ''}`}
          aria-label="Dashboard"
          aria-pressed={dashboardOpen}
          onClick={onOpenDashboard}
        >
          <span className="shell-panel-rules-text">Dashboard</span>
        </button>
      ) : null}

      {/* THE TYPE TRAY, BEHIND ONE LINE.

          The rail is 370px of a 744px panel — half the column spent
          on seven chips nobody looks at twice a day, drawn above the
          twenty-one tables they use all day. Folding it is the single
          biggest thing that can be done for this panel and it costs
          nothing: everything inside is one press away, the CREATE
          TABLE button included.

          A DISCLOSURE, SO `aria-expanded` AND NOT `aria-pressed`.
          The doors below are toggles — a stage is open or it is not.
          This one reveals the thing underneath it, which is what
          expanded means, and a reader is told which state it is in
          either way.

          It is NOT unmounted when shut in some clever way: the rail
          simply is not rendered, so its dialog cannot be left open
          behind a closed fold.

          AND ON AN EMPTY SHEET THERE IS NO LINE AT ALL — the tray
          stands open as it always did. A control that cannot change
          what you are looking at is worse than no control, and with
          no tables there is nothing under this fold to protect. */}
      {/* THE TYPE TRAY MOVED TO THE FOOT OF THE COLUMN — see the end
          of this file. It is how you make your SECOND table, which is
          a setup act, and it was standing between the reader and the
          seventeen tables they use all day. */}

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
      {/* THE THREE DOORS ARE ONE GROUP, UNDER ONE HEADING.

          They used to be three bordered cards stacked loose between
          a button and the table list, each with a second line of
          prose underneath it — "walk every row, collect the
          matches", "limits every row must keep", "1 made so far".
          Read together they are a brochure, and a person looking for
          their boats had to get past all of it.

          Grouped and unadorned they are what they always were: three
          places to go. The prose is gone; the count stays on Quotes,
          because "is Tuesday's quote still there" is the actual
          question somebody comes back with. */}
      {(onOpenQuotes && quoteCount > 0) ||
      (tables.length > 0 && (onOpenFlow || onOpenRules)) ? (
        <div className="shell-panel-head">
          <span className="mono-label">Work</span>
        </div>
      ) : null}

      {onOpenQuotes && quoteCount > 0 ? (
        <button
          type="button"
          className={`shell-panel-rules${quotesOpen ? ' is-open' : ''}`}
          aria-label="Quotes"
          aria-pressed={quotesOpen}
          onClick={onOpenQuotes}
        >
          <span className="shell-panel-rules-text">Quotes</span>
          <span className="shell-panel-rules-count">{quoteCount}</span>
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
          aria-label="What fits what"
          aria-pressed={flowOpen}
          onClick={onOpenFlow}
        >
          <span className="shell-panel-rules-text">What fits what</span>
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
        </button>
      ) : null}

      {tables.length === 0 ? (
        <p className="shell-panel-none">Your tables appear here.</p>
      ) : (
        <>
          {productCount > 0 ? (
            <div className="shell-panel-head">
              <span className="mono-label">Tables</span>
              <span className="shell-panel-count">{pad2(productCount)}</span>
            </div>
          ) : null}

          {groups.map((group) => {
            /* a folded group draws its head as the thing you press */
            const open = group.folded ? (folds[group.key] ?? false) : true
            return (
            <Fragment key={group.key}>
              {group.folded ? (
                <button
                  type="button"
                  className={`shell-fold${open ? ' is-open' : ''}`}
                  /* the count is drawn as a bare number and a reader
                     announcing "Relationships 27" run together is not
                     a name — so the name is stated, once, in words */
                  aria-label={`${group.label}, ${group.items.length} ${
                    group.items.length === 1 ? 'table' : 'tables'
                  }`}
                  aria-expanded={open}
                  onClick={() =>
                    setFolds((current) => ({ ...current, [group.key]: !open }))
                  }
                >
                  <CaretRight
                    className="shell-fold-mark"
                    size={ICON_SIZE.tiny}
                    weight="bold"
                    aria-hidden="true"
                  />
                  <span className="mono-label shell-fold-text">{group.label}</span>
                  <span className="shell-fold-count">{pad2(group.items.length)}</span>
                </button>
              ) : (
                <div className="shell-grp">
                  <span className="mono-label shell-grp-label">{group.label}</span>
                  <span className="shell-grp-count">{pad2(group.items.length)}</span>
                </div>
              )}
              {open && group.note ? <p className="shell-grp-note">{group.note}</p> : null}

              <ul className="shell-tbl-list" hidden={!open}>
                {(open ? group.items : []).map((e) => {
                  const isSel = selection?.kind === 'entity' && selection.id === e.id
                  const rows = rowsByEntity[e.id]?.length ?? 0
                  const isOpen = openViewEntityId === e.id
                  /* per ROW, not per group: a retired join still gets
                     the crossing arrows and still gets no doors */
                  const isJoinRow = e.role === 'join'
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
                          {isJoinRow ? (
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
                      {isSel && isJoinRow ? (
                        <p className="shell-tbl-note">
                          A link table records pairs, so it has no setup of its own —
                          open one of the tables it links.
                        </p>
                      ) : null}

                      {/* THE DOOR TO THE VIEW PAGE. One sentence, only on
                          the table you just clicked, never on a join. */}
                      {isSel && !isJoinRow ? (
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
                      {isSel && !isJoinRow && onOpenDesign ? (
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
            )
          })}
        </>
      )}

      {/* THE TYPE TRAY, AT THE FOOT.

          It used to be the second thing in the column, above every
          table. Measured at 1280x800 with the real file loaded it was
          370px of a 744px panel — half the column spent on seven
          chips, standing between the reader and the seventeen tables
          they use all day.

          Folding it was the previous answer and it was not enough,
          because the fold still sat in the reading path. Making a
          table is a SETUP act — you do it on the day you build the
          model and rarely again — so it belongs where setup belongs,
          at the bottom, still one press away.

          A DISCLOSURE, so `aria-expanded` and not `aria-pressed`: it
          reveals the thing underneath it rather than toggling a
          stage. And on an empty sheet it stands open, because the
          invitation card on the sheet points straight at it. */}
      {tables.length > 0 ? (
        <div className="shell-panel-foot">
          <button
            type="button"
            className={`shell-fold shell-fold--action${typesOpen ? ' is-open' : ''}`}
            aria-expanded={typesOpen}
            onClick={() => setTypesPref(!typesOpen)}
          >
            <CaretRight
              className="shell-fold-mark"
              size={ICON_SIZE.tiny}
              weight="bold"
              aria-hidden="true"
            />
            <span className="shell-fold-say">Add a table</span>
          </button>
          {typesOpen ? <TableTypeRail /> : null}
        </div>
      ) : (
        <TableTypeRail />
      )}
    </nav>
  )
}
