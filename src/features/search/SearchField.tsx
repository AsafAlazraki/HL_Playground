/* ============================================================
   ONE SEARCH FIELD, AND IT IS THE COMMAND PALETTE.

   WHERE IT STANDS, in present tense, because this header has twice
   outlived the chrome it named. It stands in `Finder` — a panel
   summoned over whatever is on screen — and it is reached two ways:
   Ctrl+K / Cmd+K from anywhere, bound both here and in the shell,
   and the "Find anything" row in the navy rail, which prints that
   shortcut beside itself. There is no masthead and there is no
   dock. The paragraphs below that mention either are describing
   what was measured at the time, and are kept because the
   measurements are why this file is shaped the way it is.

   THE FAILURE THIS PREVENTS, measured on the real file (21 tables,
   651 rows): `document.querySelectorAll('input,textarea')` returned
   NOTHING, and Ctrl+K opened nothing. Reaching one boat took six
   clicks, one dead end and a 1,203px scroll — and it only worked
   because the person already knew which of the 21 tables it lives
   in. Three scoped find boxes exist elsewhere (the view stage's row
   rail, the FOCUS lens, a column filter); not one of them can answer
   "which table is this in", because each is already standing inside
   the answer.

   SO THIS ONE IS UNSCOPED AND SITS ABOVE EVERY STAGE. The masthead
   is the only chrome present on all six stages and on the sheet, so
   a field here is the only field that is always reachable.

   THE ANSWER TEACHES THE STRUCTURE. Hits are grouped under the table
   they live in, each group stamped with that table's name and its
   kind mark. A person who searches once has learnt where that kind
   of thing lives; a flat list would have handed them the row and
   left the map unread. Tables whose own NAME matches are listed
   first, in their own group, because "which of 21" is the literal
   question the audit found unanswered.

   NO DEBOUNCE, AND THAT IS A DECISION. Scanning 651 pre-folded
   strings for a substring is arithmetic; deferring it would only add
   latency to something already well under a millisecond. What costs
   is PAINT, so the answer is capped at the top (8 per table, 40 in
   all — `DEFAULT_LIMITS`) and says out loud what it hid. The index
   itself is built only while the field is open, so a closed field
   costs the app nothing on every store write.

   ESCAPE PUTS FOCUS BACK. Opening records `document.activeElement`
   and Escape returns it — a search that strands the keyboard at the
   top of the document has moved the person, not just the camera.
   Escape is handled ON THE INPUT, never on the window: the sheet is
   made of editable grids whose own Escape means "revert this cell",
   and a global one would eat it.

   CTRL+K IS BOUND IN THE CAPTURE PHASE. Table nodes call
   `stopPropagation` on keydown at their own root (EntityTableNode),
   which kills a bubble-phase window listener while a cell is being
   edited — so the one shortcut that has to work from anywhere is
   taken on the way down rather than on the way up.

   THREE THINGS THIS FIELD DRAWS THAT ARE RULINGS, NOT DECORATION.
   `rowSearch.ts` argues all three; what is here is how they read.

     1. A PAIR LIST IS NEVER A DESTINATION. A line whose words were
        found in a pair list draws the PLACE IT OPENS and says, in
        normal case beside it, which list they were read in — so
        nothing lands on a pair-record sheet and nothing pretends the
        pair was the answer.
     2. HISTORY IS ANSWERED AND SAID. A retired table's caption reads
        "History, not stock" where a live one reads its row count,
        and the sticky heading over its rows carries a HISTORY stamp,
        which is on screen for every one of its rows that is.
     3. THE ROW TRAVELS. Choosing a row hands its id to the shell,
        which hands it to the sheet — the register opens ON the row,
        marked, instead of at the top of eighty-three of them.
   ============================================================ */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, JSX, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { coverPhoto, type CoverPhoto } from '@/features/table/coverPhoto'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { accentVar } from '@/types/model'
import {
  DEFAULT_LIMITS,
  EMPTY_INDEX,
  MIN_QUERY,
  NO_RESULT,
  browse,
  buildSearchIndex,
  normalizeQuery,
  optionsOf,
  search,
  type Option,
  type TableFacts,
} from './rowSearch'
import { clearRecent, readRecent, rememberPick } from './recent'
import './search.css'

/* ------------------------------------------------------------ */

/** The modifier this platform actually uses, so the hint in the
 *  field is not a lie on half the machines that read it. Read once:
 *  a keyboard does not change under a running tab. */
const MAC = /mac|iphone|ipad|ipod/i.test(
  typeof navigator === 'undefined' ? '' : navigator.userAgent,
)
const SHORTCUT_HINT = MAC ? '⌘K' : 'Ctrl K'

/** How far Page Up / Page Down move the cursor. Eight is one
 *  table's worth of rows (`DEFAULT_LIMITS.perTable`), so a page
 *  lands roughly on the next group's heading rather than at some
 *  arbitrary depth inside the group you were already reading. */
const PAGE = 8

/** Split a label around the matched run so the match can be inked
 *  without a second search, and without building a regular
 *  expression out of user input — which breaks the moment somebody
 *  types a bracket. */
function marked(label: string, at: number, length: number): JSX.Element {
  if (at < 0 || length <= 0) return <>{label}</>
  return (
    <>
      {label.slice(0, at)}
      <mark className="hs-mark">{label.slice(at, at + length)}</mark>
      {label.slice(at + length)}
    </>
  )
}

/** What a table IS, in a couple of words, for the tables group.
 *
 *  HISTORY SAYS SO INSTEAD OF SAYING "10 ROWS". A retired table is
 *  what an old quote was written against and is not stock; reading
 *  its row count beside every live table's row count is exactly how
 *  somebody quotes a trailer that cannot be bought. `sellable.ts`
 *  owns the sentence this shortens. */
function tableCaption(t: TableFacts): string {
  if (t.retired) return 'History, not stock'
  if (t.role === 'join') return 'Relationship'
  if (t.role === 'view') return 'Combination'
  return `${t.rowCount} row${t.rowCount === 1 ? '' : 's'}`
}

/** Where the query was actually read, when it was not read in the
 *  name being drawn: one pair list by name, or a count of them. */
const viaSays = (name: string, count: number): string =>
  count === 1 ? `in ${name}` : `in ${count} relationships`

const inkStyle = (accent: TableFacts['accent']): CSSProperties =>
  ({ '--hs-ink': accentVar(accent) }) as CSSProperties

/** One remembered destination, RESOLVED — a name that is on the
 *  sheet right now, not the id that was written down. `recent.ts`
 *  argues why nothing stored is ever drawn directly. */
interface RecallLine {
  key: string
  entityId: string
  rowId?: string
  /** the row's own label, or the table's name when a table was
   *  picked. Never an id, and never a placeholder. */
  label: string
  table: TableFacts
}

/* ------------------------------------------------------------ */

export interface SearchFieldProps {
  /** Take the keyboard on mount. Set by a surface that exists ONLY to
   *  hold this field — `Finder` — where landing anywhere else would
   *  mean a person pressing "Find anything" and then having to click
   *  the box. Never set where the field is one control among many. */
  autoFocus?: boolean
  /** THE DOOR THIS FEATURE DOES NOT OWN. Choosing a result selects
   *  the table and the sheet walks its camera to it — but while a
   *  stage (view page, quotes, modules, rules, flow, design) covers
   *  the sheet, that pan happens underneath something opaque. Only
   *  the shell knows a stage is open and only the shell can close
   *  it, so this asks. Left unset, the selection still lands and is
   *  waiting the moment the stage is closed.
   *
   *  THE ROW ID TRAVELS WITH IT, and it has to. This carried only the
   *  table, so picking one boat out of an 83-row register opened the
   *  register at the top with nothing saying which of the 83 had been
   *  picked — the search found the row and then threw it away, having
   *  had it in hand. `rowId` is absent only when what was chosen was
   *  a TABLE and there is no row to land on. */
  onReveal?: (entityId: string, rowId?: string) => void
}

export function SearchField({ autoFocus, onReveal }: SearchFieldProps = {}): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const select = useProjectStore((s) => s.select)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  /** where the keyboard was standing when this opened */
  const returnToRef = useRef<HTMLElement | null>(null)
  /** an ARROW KEY moved the cursor — see the scroll effect below */
  const walkedRef = useRef(false)

  const baseId = useId()
  const listId = `${baseId}-list`
  const optionId = useCallback((i: number): string => `${baseId}-opt-${i}`, [baseId])

  /* THE INDEX IS BUILT ONLY WHILE THE FIELD IS OPEN. `entities` and
     `rowsByEntity` change identity on every store write, so a memo
     keyed on them alone would re-fold all 651 labels on every cell
     edit, for a popover nobody has opened. Closed, this is one
     comparison. */
  const index = useMemo(
    () => (open ? buildSearchIndex(entities, rowsByEntity) : EMPTY_INDEX),
    [open, entities, rowsByEntity],
  )

  /* NOTHING TYPED IS STILL A QUESTION, and it has an answer: the
     places themselves. Before this the resting field drew a paragraph
     and nothing a key could land on — the arrows did nothing, Enter
     did nothing, and the first navigable frame was two keystrokes
     away. `browse` answers with the same `TableHit` a search returns,
     so the cursor, the highlight and Enter all work unchanged. */
  const typed = normalizeQuery(query)
  const browsing = typed.length === 0

  const result = useMemo(
    () =>
      !open
        ? NO_RESULT
        : browsing
          ? browse(index)
          : search(index, query, DEFAULT_LIMITS),
    [open, browsing, index, query],
  )

  /* WHAT WAS OPENED LAST, RESOLVED AGAINST THE SHEET AS IT IS NOW.
     Read once per opening — a pick is only ever made by `choose`,
     which closes the palette, so there is nothing to watch while it
     is open. `forgot` is bumped by the Forget button so the list
     re-reads without the palette having to close and reopen.

     ONE PASS, NOT SIX SEARCHES. At most six rows are wanted out of
     15,691, so the wanted keys go into a set and the index is walked
     once — and only while nothing is typed, because a recall list is
     the answer to a question nobody is asking once they start
     spelling a name. */
  const [forgot, setForgot] = useState(0)
  const recalls = useMemo<RecallLine[]>(() => {
    if (!open || !browsing) return []
    const picks = readRecent()
    if (picks.length === 0) return []

    const wanted = new Set<string>()
    for (const p of picks) if (p.rowId) wanted.add(`${p.entityId} ${p.rowId}`)
    const labels = new Map<string, string>()
    if (wanted.size > 0) {
      for (const r of index.rows) {
        const k = `${r.entityId} ${r.rowId}`
        if (wanted.has(k) && !labels.has(k)) labels.set(k, r.label)
      }
    }

    const out: RecallLine[] = []
    for (const p of picks) {
      const table = index.facts[p.entityId]
      /* the table was deleted, or the file was replaced from Import.
         A remembered id that no longer resolves is simply dropped —
         never drawn as a dead row and never repaired into some other
         row that happens to be nearby. */
      if (!table) continue
      if (p.rowId === undefined) {
        out.push({ key: `t:${p.entityId}`, entityId: p.entityId, label: table.name, table })
        continue
      }
      const label = labels.get(`${p.entityId} ${p.rowId}`)
      if (label === undefined || label === '') continue
      out.push({
        key: `r:${p.entityId}:${p.rowId}`,
        entityId: p.entityId,
        rowId: p.rowId,
        label,
        table,
      })
    }
    return out
    /* `forgot` is a deliberate dependency: it is the only thing that
       changes the answer while the palette stays open. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, browsing, index, forgot])

  /* THE CURSOR WALKS ONE FLAT LIST AND THE RECALLS ARE AT THE TOP OF
     IT, in exactly the order they are painted — which is what makes
     the very first Enter after Ctrl+K land on where you were last
     rather than on the biggest table on the sheet. */
  const options = useMemo<Option[]>(
    () => [
      ...recalls.map(
        (r): Option =>
          r.rowId === undefined
            ? { kind: 'table', id: `recent-t:${r.entityId}`, entityId: r.entityId }
            : {
                kind: 'row',
                id: `recent-r:${r.entityId}:${r.rowId}`,
                entityId: r.entityId,
                rowId: r.rowId,
              },
      ),
      ...optionsOf(result),
    ],
    [recalls, result],
  )

  /* THE PICTURE BESIDE A PLACE. `coverPhoto` returns a held,
     same-origin photograph or null — never a substitute — so a table
     with no picture keeps its kind crest and the two forms sit in one
     list without it looking ragged. Cached against the index, so
     walking a table's first rows happens once per opening and not once
     per keystroke. */
  const covers = useMemo(() => new Map<string, CoverPhoto | null>(), [index])
  const coverOf = (id: string): CoverPhoto | null => {
    const held = covers.get(id)
    if (held !== undefined) return held
    const entity = entities[id]
    const found = entity ? coverPhoto(entity, rowsByEntity[id]) : null
    covers.set(id, found)
    return found
  }

  /* the cursor must never point past the end of a shrinking list */
  const cursor = options.length === 0 ? -1 : Math.min(active, options.length - 1)

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false)
    setQuery('')
    setActive(0)
    const back = returnToRef.current
    returnToRef.current = null
    if (restoreFocus && back && back.isConnected) back.focus()
  }, [])

  /** Remember where the keyboard was, exactly once per opening. */
  const rememberOrigin = useCallback(() => {
    if (returnToRef.current) return
    const from = document.activeElement
    returnToRef.current =
      from instanceof HTMLElement && from !== inputRef.current ? from : null
  }, [])

  /** The shortcut's way in: take focus, and take the whole word so
   *  a second Ctrl+K starts a new search rather than appending. */
  const openFromShortcut = useCallback(() => {
    rememberOrigin()
    setOpen(true)
    const el = inputRef.current
    el?.focus()
    el?.select()
  }, [rememberOrigin])

  /* -- asked for by a surface that is only this field --------- */
  useEffect(() => {
    if (autoFocus) openFromShortcut()
    /* ON MOUNT ONLY. Re-running this would drag the caret back into
       the box every time the prop's identity changed underneath a
       person mid-word. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* -- Ctrl+K / Cmd+K, from anywhere ------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'k' && e.key !== 'K') return
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      e.preventDefault()
      e.stopPropagation()
      openFromShortcut()
    }
    /* capture: a cell being edited stops keydown at the table node's
       own root, so a bubble-phase listener here would never fire */
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [openFromShortcut])

  /* -- a press anywhere else puts it away -------------------- */
  useEffect(() => {
    if (!open) return
    const onDown = (e: Event): void => {
      const root = rootRef.current
      if (root && e.target instanceof Node && root.contains(e.target)) return
      /* a press elsewhere is the person going somewhere on purpose —
         do not drag their focus back to where they were before */
      close(false)
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [open, close])

  /* -- choosing ---------------------------------------------- */
  const choose = useCallback(
    (entityId: string, rowId?: string) => {
      /* the store already knows how to be aimed at a table, and the
         sheet already walks its camera when a selection arrives from
         outside the canvas (Whiteboard.tsx's auto-pan). Nothing new
         is invented here — this is the door the panel's list uses. */
      select({ kind: 'entity', id: entityId })
      /* REMEMBERED AFTER THE ACT, NEVER BEFORE IT. Writing the pick
         first would leave a record of somewhere nobody went if the
         reveal threw; and this is a convenience, so it goes last and
         it is allowed to fail silently (`recent.ts`). */
      onReveal?.(entityId, rowId)
      rememberPick(entityId, rowId)
      close(false)
    },
    [select, onReveal, close],
  )

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') {
      /* the grid's own Escape means "revert this cell"; ours is
         local to this input and must not travel */
      e.preventDefault()
      e.stopPropagation()
      close(true)
      return
    }
    if (options.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        walkedRef.current = true
        setActive(cursor + 1 >= options.length ? 0 : cursor + 1)
        return
      case 'ArrowUp':
        e.preventDefault()
        walkedRef.current = true
        setActive(cursor - 1 < 0 ? options.length - 1 : cursor - 1)
        return
      case 'Home':
        e.preventDefault()
        walkedRef.current = true
        setActive(0)
        return
      case 'End':
        e.preventDefault()
        walkedRef.current = true
        setActive(options.length - 1)
        return
      /* A PAGE AT A TIME, AND IT CLAMPS RATHER THAN WRAPS. The
         arrows wrap because walking off the end of six options is
         obviously a walk; a PAGE that wrapped would throw somebody
         from the middle of a forty-row answer to the far end of it,
         which reads as the list having moved under them. */
      case 'PageDown':
        e.preventDefault()
        walkedRef.current = true
        setActive(Math.min(cursor + PAGE, options.length - 1))
        return
      case 'PageUp':
        e.preventDefault()
        walkedRef.current = true
        setActive(Math.max(cursor - PAGE, 0))
        return
      case 'Enter': {
        const picked = options[cursor]
        if (!picked) return
        e.preventDefault()
        choose(picked.entityId, picked.kind === 'row' ? picked.rowId : undefined)
        return
      }
      default:
        return
    }
  }

  /* Keep the highlighted option in view as the arrows walk past the
     fold — without it the cursor leaves the popover and the person
     is driving something they cannot see.
     ONLY AFTER AN ARROW, NEVER AFTER A KEYSTROKE, and that gate is
     worth 130ms per letter. `scrollIntoView` READS layout, which
     forces a synchronous whole-document reflow; on this sheet, with
     48 tables and ~50,000 elements in the document, that reflow
     measures 133ms median in a production build — the same 134ms
     that appending one empty <span> to <body> costs, so it is the
     drawing's price and not this feature's. Typing never needs it:
     a new query resets the cursor to the top of a list that is
     already scrolled to the top. Walking the list with the arrows
     genuinely does, and that is one key press, not nine. */
  useEffect(() => {
    if (!open || cursor < 0) return
    if (!walkedRef.current) return
    walkedRef.current = false
    document.getElementById(optionId(cursor))?.scrollIntoView({ block: 'nearest' })
  }, [open, cursor, optionId])

  const tooShort = typed.length > 0 && typed.length < MIN_QUERY
  const nothing = typed.length >= MIN_QUERY && options.length === 0
  const hidden = result.rowTotal - result.rowShown
  /* places the resting list named, against places there are */
  const placesLeft = (result.placeTotal ?? 0) - result.tables.length

  /* ONE LINE ALONG THE FOOT, and it is never decoration: while
     nothing is typed it is the count the rest of the app prints, and
     while something is it is what the caps hid. Empty is a legal
     state and the keys stay put, so the bar never jumps. */
  const footSay = browsing
    ? index.tableTotal > 0
      ? `${index.rowTotal.toLocaleString()} named rows · ${index.tableTotal} tables`
      : ''
    : hidden > 0
      ? `Showing ${result.rowShown} of ${result.rowTotal} — keep typing to narrow it`
      : ''

  /* a running index across the flat option list, so the Nth painted
     row carries the Nth id the arrow keys move through */
  let painted = -1

  return (
    <div
      className="hs-root"
      ref={rootRef}
      onBlur={(e) => {
        /* tabbing out of the field closes it; a click INSIDE never
           moves focus, because every option cancels its pointerdown */
        if (!open) return
        const to = e.relatedTarget
        if (to instanceof Node && rootRef.current?.contains(to)) return
        close(false)
      }}
    >
      {/* THE FIELD IS ITS OWN ROW, so the answer can be a SIBLING of
          it rather than a box hanging off it. In the Finder that lets
          the two be one continuous surface — a palette — instead of a
          collar with a second bordered card floating under it. */}
      <div className="hs-field">
        <MagnifyingGlass
          className="hs-glyph"
          size={ICON_SIZE.small}
          weight={weightFor(ICON_SIZE.small)}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          className="hs-input"
          role="combobox"
          aria-label="Find anything by name"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && cursor >= 0 ? optionId(cursor) : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Find anything"
          value={query}
          onFocus={() => {
            rememberOrigin()
            setOpen(true)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            if (!open) setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        <kbd className="hs-kbd" aria-hidden="true">
          {SHORTCUT_HINT}
        </kbd>
      </div>

      {open ? (
        <div className="hs-pop" data-material>
          <ul className="hs-list" id={listId} role="listbox" aria-label="Search results">
            {/* ── WHERE YOU WERE, FIRST ────────────────────────────
                A palette answers two questions and this is the one
                the search could never answer: not "which of fifty-one
                tables holds this" but "take me back". It is drawn
                first because it is the shortest path in the whole
                surface — Ctrl+K, Enter — and because after the second
                opening it is the only part of the resting list that
                is about THIS person's day rather than about the file.

                IT IS OFFERED WITH A WAY TO CLEAR IT. A list of where
                somebody has been is a record of their work; keeping
                one with no way to empty it is the app deciding on
                their behalf. */}
            {recalls.length > 0 ? (
              <li className="hs-section" role="presentation">
                <p className="hs-head hs-head--plain" id={`${baseId}-h-recent`}>
                  Where you were
                  <button
                    type="button"
                    className="hs-head-forget"
                    /* the palette must not close under the press —
                       every option in this list cancels its own
                       pointerdown for the same reason */
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => {
                      clearRecent()
                      setForgot((n) => n + 1)
                      setActive(0)
                    }}
                  >
                    Forget
                  </button>
                </p>
                <ul
                  className="hs-group"
                  role="group"
                  aria-labelledby={`${baseId}-h-recent`}
                >
                  {recalls.map((r) => {
                    painted += 1
                    const i = painted
                    const isRow = r.rowId !== undefined
                    const shot = isRow ? null : coverOf(r.table.id)
                    return (
                      <li
                        key={r.key}
                        id={optionId(i)}
                        role="option"
                        aria-selected={i === cursor}
                        className={`hs-opt ${
                          isRow ? 'hs-opt--row' : 'hs-opt--place'
                        }${i === cursor ? ' is-active' : ''}`}
                        style={inkStyle(r.table.accent)}
                        /* A ROW SAYS WHICH TABLE IT IS IN. There is no
                           sticky group heading over this list to carry
                           it — the recalls are deliberately mixed,
                           because the last six things you opened are
                           not sorted by table — so the line carries it
                           itself, and so does the accessible name. */
                        aria-label={
                          isRow
                            ? `${r.label} — in ${r.table.name}, opened recently`
                            : `${r.table.name} — opened recently`
                        }
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => choose(r.entityId, r.rowId)}
                        onPointerEnter={() => setActive(i)}
                      >
                        <span className="hs-opt-mark" aria-hidden="true">
                          {shot ? (
                            <img
                              className="hs-opt-shot"
                              src={shot.at}
                              alt=""
                              width={shot.w}
                              height={shot.h}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <TableKindSymbol
                              kind={kindOf(r.table.kind)}
                              size={isRow ? ICON_SIZE.tiny : ICON_SIZE.small}
                            />
                          )}
                        </span>
                        <span className="hs-opt-label">{r.label}</span>
                        <span className="hs-opt-where">
                          {isRow ? r.table.name : tableCaption(r.table)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ) : null}

            {result.tables.length > 0 ? (
              <li className="hs-section" role="presentation">
                <p className="hs-head hs-head--plain" id={`${baseId}-h-tables`}>
                  {browsing ? 'Where to go' : 'Tables'}
                </p>
                <ul
                  className="hs-group"
                  role="group"
                  aria-labelledby={`${baseId}-h-tables`}
                >
                  {result.tables.map((t) => {
                    painted += 1
                    const i = painted
                    /* A PAIR LIST ANSWERS FOR THE TABLE IT LIES WITHIN.
                       What matched was "Stacer × Yamaha — Motor
                       Fitment"; what opens is Stacer, because the
                       pairs are a fact about those boats and a pair
                       sheet is not somewhere to be sent. So the line
                       draws the place it opens and says where the
                       words were read, and the two are never confused
                       with one another. */
                    const via = t.via
                    /* THE PHOTOGRAPH, WHERE THE REPOSITORY HOLDS ONE.
                       220 real boat, motor and trailer shots ship with
                       the seed and the largest any of them was drawn
                       in this field was nothing at all. A place you
                       can recognise by sight is one you do not have
                       to read — and a table without a held picture
                       keeps its crest in the same box, so the labels
                       still start on one line. */
                    const shot = coverOf(t.table.id)
                    return (
                      <li
                        key={t.table.id}
                        id={optionId(i)}
                        role="option"
                        aria-selected={i === cursor}
                        className={`hs-opt hs-opt--place${i === cursor ? ' is-active' : ''}`}
                        style={inkStyle(t.table.accent)}
                        aria-label={
                          via
                            ? `${t.table.name} — matched ${viaSays(via.name, via.count)}`
                            : `${t.table.name} — ${tableCaption(t.table)}`
                        }
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => choose(t.table.id)}
                        onPointerEnter={() => setActive(i)}
                      >
                        <span className="hs-opt-mark">
                          {shot ? (
                            <img
                              className="hs-opt-shot"
                              src={shot.at}
                              alt=""
                              width={shot.w}
                              height={shot.h}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <TableKindSymbol
                              kind={kindOf(t.table.kind)}
                              size={ICON_SIZE.small}
                            />
                          )}
                        </span>
                        <span className="hs-opt-label">
                          {marked(t.table.name, t.at, t.length)}
                        </span>
                        {via ? (
                          <span className="hs-opt-note">
                            {viaSays(via.name, via.count)}
                          </span>
                        ) : (
                          <span className="hs-opt-where">
                            {tableCaption(t.table)}
                          </span>
                        )}
                      </li>
                    )
                  })}
                  {/* WHAT THE RESTING LIST LEFT OUT, said rather than
                      silently dropped — and it says what to do about
                      it in the same breath.

                      IT NAMES WHAT IT IS COUNTING, and it has to. The
                      foot says "51 tables" while this list holds 26
                      PLACES, because twenty-five of those tables are
                      relationships and a relationship opens the table
                      it is about rather than standing as somewhere to
                      be sent (`rowSearch.ts` argues it). Both figures
                      are true; a bare "and 18 more" invited a reader
                      to add it to 8 and find it did not reach 51. */}
                  {browsing && placesLeft > 0 ? (
                    <li className="hs-more" role="presentation">
                      {placesLeft} more places to open — type any part of a name
                    </li>
                  ) : null}
                </ul>
              </li>
            ) : null}

            {result.groups.map((g) => {
              const headId = `${baseId}-h-${g.table.id}`
              return (
                <li className="hs-section" role="presentation" key={g.table.id}>
                  {/* THE HEADING IS THE LESSON: table name, kind mark,
                      and how many of its rows matched — so the answer
                      says WHERE the thing lives, not merely that it
                      exists somewhere. */}
                  <p className="hs-head" id={headId} style={inkStyle(g.table.accent)}>
                    <span className="hs-head-mark">
                      <TableKindSymbol
                        kind={kindOf(g.table.kind)}
                        size={ICON_SIZE.tiny}
                      />
                    </span>
                    {/* THE TABLE'S NAME IS A NAME, so it is drawn as
                        one. This heading uppercased it, and uppercase
                        is lossy on content — "OBSOLETE Trailers — No
                        Longer Available" is a name whose own emphasis
                        disappears when the whole line shouts. */}
                    <span className="hs-head-name">{g.table.name}</span>
                    {/* AND IF IT IS HISTORY, THE HEADING SAYS SO. It is
                        sticky, so this stamp is on screen for every one
                        of its rows that is — which is the point: no row
                        of a retired table can be read as stock. */}
                    {g.table.retired ? (
                      <span className="hs-head-was">History</span>
                    ) : null}
                    <span className="hs-head-count">
                      {g.total} match{g.total === 1 ? '' : 'es'}
                    </span>
                  </p>
                  <ul className="hs-group" role="group" aria-labelledby={headId}>
                    {g.hits.map((h) => {
                      painted += 1
                      const i = painted
                      return (
                        <li
                          key={h.rowId}
                          id={optionId(i)}
                          role="option"
                          aria-selected={i === cursor}
                          className={`hs-opt hs-opt--row${i === cursor ? ' is-active' : ''}`}
                          style={inkStyle(g.table.accent)}
                          /* THE TABLE NAME IS ON EVERY ROW, IT IS JUST
                             NOT PAINTED TWICE. It was, and it read as
                             40 copies of "HIGHFIELD INFLATABL…" — the
                             names here run to 39 characters, so a
                             repeat in the row's right margin truncates
                             on nearly every line and teaches nothing.
                             The heading above the group carries it in
                             full and is sticky, so it is on screen for
                             every row that is; and this label carries
                             it unconditionally for a screen reader,
                             which reads an option's accessible name
                             and not the heading it happens to sit
                             under. */
                          aria-label={
                            `${h.label} — in ${g.table.name}` +
                            (g.table.retired ? ', history rather than stock' : '') +
                            (h.via ? `, matched in ${h.via}` : '')
                          }
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => choose(g.table.id, h.rowId)}
                          onPointerEnter={() => setActive(i)}
                        >
                          <span className="hs-opt-mark" aria-hidden="true">
                            <TableKindSymbol
                              kind={kindOf(g.table.kind)}
                              size={ICON_SIZE.tiny}
                            />
                          </span>
                          <span className="hs-opt-label">
                            {marked(h.label, h.at, h.length)}
                          </span>
                          {/* the words were read on a pair, and the
                              answer is the thing the pair is about —
                              so the line says where they were read */}
                          {h.via ? (
                            <span className="hs-opt-note">{viaSays(h.via, 1)}</span>
                          ) : null}
                        </li>
                      )
                    })}
                    {g.more > 0 ? (
                      <li className="hs-more" role="presentation">
                        +{g.more} more in {g.table.name}
                      </li>
                    ) : null}
                  </ul>
                </li>
              )
            })}
          </ul>

          {/* -- the states that have to say what to do next ------
              THE RESTING STATE NO LONGER NEEDS A PARAGRAPH. The list
              above it is the places themselves, so the instructions
              that used to fill this box have become the one line of
              accounting along the foot. What is left here is the three
              states that genuinely have nothing to show. */}
          {browsing && index.tableTotal === 0 ? (
            <p className="hs-say">
              There are no tables on the sheet yet. Put one there and everything in it
              becomes findable from here.
            </p>
          ) : tooShort ? (
            <p className="hs-say">Keep typing — two letters or more.</p>
          ) : nothing ? (
            <p className="hs-say">
              Nothing is called “{query.trim()}”. Only the name of a row is searched, not
              its other columns — try part of a name, or the name of a table.
            </p>
          ) : null}

          {/* -- the foot: what this answer is, and how to drive it --
              THE KEYS ARE ON SCREEN because this is a keyboard
              surface first. They were discoverable only by trying
              them, which is the same defect as a control with no
              label. Marked aria-hidden: a screen reader is already
              told this is a listbox and reads its own keys. */}
          <div className="hs-foot">
            <span className="hs-foot-say">{footSay}</span>
            <span className="hs-keys" aria-hidden="true">
              <kbd className="hs-key">↑</kbd>
              <kbd className="hs-key">↓</kbd>
              <span className="hs-key-say">move</span>
              <kbd className="hs-key">↵</kbd>
              <span className="hs-key-say">open</span>
              <kbd className="hs-key">Esc</kbd>
              <span className="hs-key-say">close</span>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
