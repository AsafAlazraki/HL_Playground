/* ============================================================
   THE SALES BOARD — every deal, and where it is.

   THE SCREEN THIS REPLACES was a list of quotes sorted by date.
   A list answers "what happened last"; a manager on a Monday is
   asking "where is everything, and what is stuck", which is a
   question about SHAPE and no list can draw a shape.

   DRAGGING IS THE POINT, so it is built properly rather than with
   HTML5 drag-and-drop: that API has no touch support, no keyboard
   story, and a drag image the page cannot style. This uses pointer
   capture — one pointer, one card, and the column under the
   pointer lights up.

   AND IT IS KEYBOARD-OPERABLE, which is the half most boards skip.
   Every card is a button; left and right move it a column; Enter
   opens it. A board only a mouse can work is a board the person
   who lives in it all day cannot use.

   MOVING A DEAL DOES NOT EDIT THE DOCUMENT. See `stages.ts`: the
   stage is stored beside the quote, so a frozen, issued quote can
   be dragged from Issued to Won without one word of the document
   changing — which is exactly what a person expects and exactly
   what putting a third value in `QuoteState` would have broken.

   IT IS UNDOABLE, and by rule 9 that is a toast with UNDO rather
   than a confirmation. The toast also puts the move in the audit
   log, because the log listens to the same bus.
   ============================================================ */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { JSX, PointerEvent as ReactPointerEvent } from 'react'
import {
  ArrowsDownUp,
  CaretDoubleLeft,
  CaretDoubleRight,
  ChatTeardropText,
  MagnifyingGlass,
  Sliders,
} from '@phosphor-icons/react'
import { ICON_SIZE } from '@/lib/icons'
import { money } from '@/lib/money'
import { useProjectStore } from '@/store/useProjectStore'
import type { TableKind } from '@/types/model'
import { PageHead } from '@/features/page'
import { StageEditor } from './StageEditor'
import {
  SORTS,
  kindOfQuote,
  matches,
  sortDeals,
  sortLabel,
  typeChips,
  type SortId,
} from './finding'
import { say } from '@/store/notes'
import { quoteTotals, useQuotes, type QuoteDef } from '@/features/quote'
import { DealPane } from './DealPane'
import { countOf, useDealNotes } from './dealNotes'
import { boardOf, moveTo, stageOf, useStages, type StageId } from './stages'
import { useStageDefs, type StageDef } from './stageStore'

export interface BoardProps {
  orgSlug: string
  onOpen: (quoteId: string) => void
}

/** shortest true form of a date on a card */
function whenSay(iso: string, now = Date.now()): string {
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return ''
  const days = Math.floor((now - at) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function Board({ orgSlug, onOpen }: BoardProps): JSX.Element {
  const all = useQuotes()
  const entities = useProjectStore((st) => st.entities)
  const at = useStages(orgSlug)
  /* THE DEALERSHIP'S OWN COLUMNS — named, coloured and ordered in
     the panel behind the Stages button. See `stageStore.ts`. */
  const stages = useStageDefs(orgSlug)

  const [query, setQuery] = useState('')
  const [type, setType] = useState<TableKind | 'all'>('all')

  /* ONE SORT FOR THE BOARD, AND AN OVERRIDE PER COLUMN.
     Five sort controls in five column heads is five loud controls
     all saying the same word. One in the toolbar covers the case a
     person actually has — "show me the big ones" — and the
     per-column menu is there for the one column they want to look
     at differently. A column with no override is not in this map,
     so changing the board sort still moves it. */
  const [sort, setSort] = useState<SortId>('recent')
  const [perCol, setPerCol] = useState<Partial<Record<StageId, SortId>>>({})
  const [menu, setMenu] = useState<StageId | null>(null)
  const [editing, setEditing] = useState(false)

  /* WHAT HAS BEEN SAID ABOUT EACH DEAL. One read of one store for
     the whole board — the card only needs a count, and asking the
     store per card would be eighty reads of the same object. */
  const notes = useDealNotes(orgSlug)

  /** the deal whose pane is open, by id. See `DealPane` for why a
   *  card opens a pane rather than the document. */
  const [open, setOpen] = useState<string | null>(null)

  /* COLUMNS FOLDED OUT OF THE WAY, so the three that matter get
     the width. It is component state and not a store, and the
     decision is deliberate: everything this feature persists is a
     fact about the BUSINESS — its stages, and where each deal
     stands — shared by everybody who signs in on this machine.
     Which columns I have folded is a fact about ME at this moment,
     and this app has no per-person view store to put it in. The
     board's own sort is not persisted either, for the same reason;
     one of them quietly persisting and the other not would be the
     confusing half of both answers. */
  const [shut, setShut] = useState<readonly StageId[]>([])

  /* THE CHIPS ARE COUNTED OFF EVERY QUOTE, not off the filtered
     list: a type chip whose count changed as you typed would be
     counting the search rather than the business. */
  const chips = useMemo(() => typeChips(all, entities), [all, entities])

  const quotes = useMemo(
    () =>
      all.filter(
        (q) =>
          (type === 'all' || kindOfQuote(q, entities) === type) && matches(q, query),
      ),
    [all, entities, type, query],
  )

  const columns = useMemo(() => boardOf(quotes, at, stages), [quotes, at, stages])

  /* THE OPEN DEAL IS FOUND IN `all`, NOT IN THE FILTERED LIST.
     Typing in the search must not slam shut the pane you were
     reading — the filter is about which cards are drawn, and the
     pane is a thing you deliberately opened. It resolves to
     undefined only when the quote itself is gone, and then nothing
     is drawn, which is the truth. */
  const openQuote = open === null ? undefined : all.find((q) => q.id === open)

  /* the card under the pointer, and the column it is over. Both null
     at rest, so nothing on the board is lit when nobody is dragging */
  const [held, setHeld] = useState<string | null>(null)
  const [over, setOver] = useState<StageId | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)

  /** Close the pane and put focus back on the card it was about.
   *  The pane takes focus when it opens (see `DealPane`), so
   *  without this a keyboard user who pressed Escape would be left
   *  with focus on nothing and the next Tab would restart at the
   *  top of the page. The frame's wait is for React to have drawn
   *  the card again before it is asked to take focus. */
  const shutPane = useCallback((): void => {
    const was = open
    setOpen(null)
    if (was === null) return
    requestAnimationFrame(() => {
      boardRef.current
        ?.querySelector<HTMLElement>(`[data-deal="${CSS.escape(was)}"]`)
        ?.focus()
    })
  }, [open])

  const move = useCallback(
    (q: QuoteDef, to: StageId): void => {
      const from = stageOf(q, at, stages)
      if (from === to) return
      moveTo(orgSlug, q, to)
      /* `say` WITH ITS OWN ACT, NOT `sayUndoable`. That helper pins
         the top of the PROJECT store's undo stack, and a stage move
         does not touch the project store at all — it would have
         offered a button that undid whatever unrelated edit
         happened last. This act puts the card back exactly where it
         was, which is the only honest thing an Undo on this screen
         can mean.

         The sentence names both ends, so the audit log — which
         listens to this same bus — reads as a history rather than
         as a list of nudges. */
      say({
        text: `${q.reference} moved to ${stages.find((s) => s.id === to)?.name ?? to}.`,
        act: { label: 'Undo', onPick: () => moveTo(orgSlug, q, from) },
      })
    },
    [orgSlug, at, stages],
  )

  /** WHICH COLUMN IS UNDER THE POINTER, measured rather than
   *  tracked. Reading the columns' boxes on each move is a handful
   *  of rect reads and is always right; a drop target kept in state
   *  goes stale the moment the board scrolls under the drag. */
  const columnAt = useCallback((x: number): StageId | null => {
    const root = boardRef.current
    if (!root) return null
    for (const el of root.querySelectorAll<HTMLElement>('[data-stage]')) {
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right) return el.dataset['stage'] as StageId
    }
    return null
  }, [])

  const begin = useCallback(
    (q: QuoteDef, e: ReactPointerEvent<HTMLElement>): void => {
      /* PRIMARY BUTTON ONLY, and never a modified press: a
         right-click or a ctrl-click on a card is a context menu or a
         selection, not the start of a drag. */
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey) return
      const startX = e.clientX
      const startY = e.clientY
      let dragging = false

      const onMove = (ev: PointerEvent): void => {
        /* A THRESHOLD, so a click is a click. Without it a press
           that wanders two pixels opens nothing and moves a deal —
           the fault every draggable list has. */
        if (!dragging) {
          if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 6) return
          dragging = true
          setHeld(q.id)
        }
        setOver(columnAt(ev.clientX))
      }
      const finish = (ev: PointerEvent): void => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', finish)
        window.removeEventListener('pointercancel', cancel)
        if (dragging) {
          const to = columnAt(ev.clientX)
          if (to) move(q, to)
        } else {
          /* A PRESS THAT DID NOT TRAVEL OPENS THE DEAL'S PANE, not
             the document. See `DealPane`: the board's answer is its
             own arrangement, and leaving it to read four facts and
             a thread throws that answer away. The document is one
             named press further in. */
          setOpen(q.id)
        }
        setHeld(null)
        setOver(null)
      }
      const cancel = (): void => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', finish)
        window.removeEventListener('pointercancel', cancel)
        setHeld(null)
        setOver(null)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', finish)
      window.addEventListener('pointercancel', cancel)
    },
    [columnAt, move],
  )

  const total = quotes.length
  const narrowed = total !== all.length

  return (
    <div className="pb" ref={boardRef}>
      <PageHead
        eyebrow="Selling"
        name="Pipeline"
        /* THE COUNT SAYS WHEN IT IS A SUBSET. "12 quotes" while a
           search is on is a lie by omission; "12 of 84" is the same
           control admitting what it is doing. */
        count={`${narrowed ? `${total} of ${all.length}` : total} ${
          all.length === 1 ? 'quote' : 'quotes'
        }`}
        acts={
          <>
            <label className="pb-find">
              <MagnifyingGlass size={ICON_SIZE.small} aria-hidden="true" />
              <input
                className="pb-find-in"
                type="search"
                value={query}
                placeholder="Search quotes"
                aria-label="Search quotes by reference, customer or what is being sold"
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <label className="pb-sort">
              <span className="pb-sort-say">Sort</span>
              <select
                className="pb-sort-in"
                value={sort}
                aria-label="How to order every column"
                onChange={(e) => {
                  setSort(e.target.value as SortId)
                  /* A BOARD-WIDE SORT CLEARS THE OVERRIDES, or the
                     control appears not to work on exactly the
                     columns somebody had already touched. */
                  setPerCol({})
                }}
              >
                {SORTS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {/* THE DEALERSHIP'S OWN COLUMNS. It sits on the board
                rather than only in Admin because the person who
                wants a stage called "Awaiting deposit" is looking
                at the board when they think of it. */}
            <button
              type="button"
              className="pb-stages-go"
              aria-expanded={editing}
              onClick={() => setEditing((v) => !v)}
            >
              <Sliders size={ICON_SIZE.tiny} aria-hidden="true" />
              Stages
            </button>
          </>
        }
        tools={
          /* WHAT SORT OF THING IS BEING SOLD. The same filter the
             modules grid carries, in the same words and the same
             hues, because it is the same question about the same
             catalogue. Drawn only where there is more than one type
             to choose between — a lone "All" chip is a control with
             no choice in it. */
          chips.length > 2 ? (
            <ul className="pb-types" aria-label="Show one type of quote">
              {chips.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    className="k-filter pb-type"
                    data-kind={c.kind}
                    aria-pressed={type === c.key}
                    onClick={() => setType(c.key)}
                  >
                    {c.label}
                    <span className="pb-type-n">{c.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : undefined
        }
      />

      {editing ? (
        <StageEditor orgSlug={orgSlug} onClose={() => setEditing(false)} />
      ) : null}

      {/* THE FLOOR: the columns, and the open deal beside them. A
          pane in the same row rather than over the board — see
          `DealPane` for the argument. The board narrows, keeps its
          shape, and goes on taking drops while the pane is open. */}
      <div className={`pb-floor${openQuote ? ' has-deal' : ''}`}>
        <div className="pb-cols">
          {stages.map((stage) => {
            const deals = sortDeals(columns[stage.id], perCol[stage.id] ?? sort)

            /* A FOLDED COLUMN IS STILL A COLUMN. It keeps its
               `data-stage`, so `columnAt` still finds it and a card
               can be dropped on it without unfolding it first — which
               is exactly what somebody who folded Lost wants to do
               with the next dead deal. */
            if (shut.includes(stage.id)) {
              return (
                <section
                  key={stage.id}
                  className={`pb-col is-shut${stage.closed ? ' is-closed' : ''}${
                    over === stage.id ? ' is-over' : ''
                  }`}
                  data-stage={stage.id}
                  data-tone={stage.tone}
                  aria-label={stage.name}
                >
                  <button
                    type="button"
                    className="pb-col-open"
                    aria-expanded={false}
                    aria-label={`Unfold ${stage.name}, ${deals.length} ${
                      deals.length === 1 ? 'deal' : 'deals'
                    }`}
                    onClick={() => setShut((s) => s.filter((id) => id !== stage.id))}
                  >
                    <CaretDoubleRight size={ICON_SIZE.tiny} aria-hidden="true" />
                    <span className="pb-col-shut-n ds-mono">{deals.length}</span>
                    <span className="pb-col-shut-name">{stage.name}</span>
                  </button>
                </section>
              )
            }

            /* THE COLUMN'S MONEY, and it is the reason a board beats a
               list at a glance: what is sitting in Issued is what the
               month depends on. Unpriced lines are excluded rather
               than counted as zero — see `quoteTotals`. */
            const sum = deals.reduce((n, q) => n + quoteTotals(q).total, 0)
            return (
              <section
                key={stage.id}
                className={`pb-col${stage.closed ? ' is-closed' : ''}${
                  over === stage.id ? ' is-over' : ''
                }`}
                data-stage={stage.id}
                data-tone={stage.tone}
                aria-label={stage.name}
              >
                <header className="pb-col-head">
                  <h3 className="pb-col-name">{stage.name}</h3>
                  <span className="pb-col-n ds-mono">{deals.length}</span>
                  {/* THIS COLUMN'S OWN ORDER. Quiet until the column is
                      under the cursor or its menu is open, and lit
                      whenever it differs from the board's — an override
                      you cannot see is a board that has stopped
                      explaining itself. */}
                  <span className="pb-col-sort">
                    <button
                      type="button"
                      className={`pb-col-sortgo${perCol[stage.id] ? ' is-set' : ''}`}
                      aria-expanded={menu === stage.id}
                      aria-label={`Order ${stage.name}. ${sortLabel(perCol[stage.id] ?? sort)}`}
                      onClick={() => setMenu(menu === stage.id ? null : stage.id)}
                    >
                      <ArrowsDownUp size={ICON_SIZE.tiny} aria-hidden="true" />
                    </button>
                    {menu === stage.id ? (
                      <ul className="pb-col-menu">
                        {SORTS.map((o) => (
                          <li key={o.id}>
                            <button
                              type="button"
                              className={`pb-col-pick${
                                (perCol[stage.id] ?? sort) === o.id ? ' is-on' : ''
                              }`}
                              onClick={() => {
                                setPerCol((m) => ({ ...m, [stage.id]: o.id }))
                                setMenu(null)
                              }}
                            >
                              {o.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </span>
                  {/* FOLD IT AWAY. Quiet until the column is under the
                      cursor, like the sort beside it — five fold
                      handles lit at once is five controls competing
                      with five column names. */}
                  <button
                    type="button"
                    className="pb-col-shutgo"
                    aria-expanded={true}
                    aria-label={`Fold ${stage.name} away`}
                    onClick={() => setShut((s) => [...s, stage.id])}
                  >
                    <CaretDoubleLeft size={ICON_SIZE.tiny} aria-hidden="true" />
                  </button>
                </header>
                {deals.length > 0 ? (
                  <p className="pb-col-sum ds-mono">{money(sum)}</p>
                ) : null}

                <div className="pb-col-body">
                  {deals.length === 0 ? (
                    /* AN EMPTY COLUMN SAYS WHY IT IS EMPTY. "Nothing
                       won yet" and "nothing matches what you typed" are
                       different facts, and a column giving the first
                       answer to the second question is simply wrong. */
                    <p className="pb-none">
                      {narrowed ? 'Nothing here matches.' : stage.empty || 'Nothing here yet.'}
                    </p>
                  ) : (
                    deals.map((q) => {
                      const t = quoteTotals(q)
                      /* HOW MANY THINGS HAVE BEEN SAID ABOUT IT — and
                         a zero is not drawn at all. A badge reading 0
                         on eighty cards would make the board look
                         busy while saying nothing; the count exists so
                         the board can show WHICH deals have a
                         conversation on them, which is only a fact
                         about the ones that do. Same rule the
                         dashboard's own counts keep. */
                      const said = countOf(notes, q.id)
                      return (
                        <button
                          type="button"
                          key={q.id}
                          data-deal={q.id}
                          className={`pb-card${held === q.id ? ' is-held' : ''}${
                            open === q.id ? ' is-open' : ''
                          }`}
                          onPointerDown={(e) => begin(q, e)}
                          /* THE KEYBOARD'S OWN WAY ACROSS THE BOARD.
                             Left and right move a column; Enter opens.
                             `preventDefault` so the arrows do not also
                             scroll the board sideways underneath. */
                          onKeyDown={(e) => {
                            const i = stages.findIndex((s) => s.id === stage.id)
                            if (e.key === 'ArrowRight' && i < stages.length - 1) {
                              e.preventDefault()
                              move(q, stages[i + 1].id)
                            } else if (e.key === 'ArrowLeft' && i > 0) {
                              e.preventDefault()
                              move(q, stages[i - 1].id)
                            } else if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setOpen(q.id)
                            }
                          }}
                          aria-label={`${q.reference}, ${q.customer.name || 'no customer'}, in ${stage.name}${
                            said > 0
                              ? `, ${said} ${said === 1 ? 'note' : 'notes'}`
                              : ''
                          }. Left and right arrows move it.`}
                        >
                          <span className="pb-card-top">
                            <span className="pb-card-ref ds-mono">{q.reference}</span>
                            {/* THE COUNT SITS IN THE METADATA ROW, NOT THE
                                MONEY ROW. It was measured in the foot first
                                and it cost the seller's name three
                                characters on a 250px column — "Dana
                                Whitcom…". A badge is metadata and belongs
                                with the reference and the date; the foot is
                                a figure and a name and had no room for a
                                third thing. */}
                            {said > 0 ? (
                              <span className="pb-card-said">
                                <ChatTeardropText
                                  size={ICON_SIZE.tiny}
                                  aria-hidden="true"
                                />
                                <span className="pb-card-said-n ds-mono">{said}</span>
                              </span>
                            ) : null}
                            <span className="pb-card-when ds-mono">{whenSay(q.updatedAt)}</span>
                          </span>
                          {/* THE CUSTOMER IS THE HEADING, because the
                              deal is a person waiting on an answer. A
                              quote with nobody on it yet says so rather
                              than drawing an empty line. */}
                          <span className="pb-card-who">
                            {q.customer.name.trim() || 'No customer yet'}
                          </span>
                          <span className="pb-card-what">{q.subjectLabel}</span>
                          <span className="pb-card-foot">
                            <span className="pb-card-sum ds-mono">{money(t.total)}</span>
                            {q.preparedBy ? (
                              <span className="pb-card-by">{q.preparedBy}</span>
                            ) : null}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </section>
            )
          })}
        </div>

        {openQuote ? (
          <DealPane
            orgSlug={orgSlug}
            quote={openQuote}
            stage={stages.find((s) => s.id === stageOf(openQuote, at, stages))}
            notes={notes}
            onClose={shutPane}
            onOpenQuote={onOpen}
          />
        ) : null}
      </div>
    </div>
  )
}
