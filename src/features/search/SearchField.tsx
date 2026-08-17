/* ============================================================
   ONE SEARCH FIELD, IN THE MASTHEAD, OVER EVERYTHING.

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
   ============================================================ */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, JSX, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import { accentVar } from '@/types/model'
import {
  DEFAULT_LIMITS,
  EMPTY_INDEX,
  MIN_QUERY,
  NO_RESULT,
  buildSearchIndex,
  normalizeQuery,
  optionsOf,
  search,
  type TableFacts,
} from './rowSearch'
import './search.css'

/* ------------------------------------------------------------ */

/** The modifier this platform actually uses, so the hint in the
 *  field is not a lie on half the machines that read it. Read once:
 *  a keyboard does not change under a running tab. */
const MAC = /mac|iphone|ipad|ipod/i.test(
  typeof navigator === 'undefined' ? '' : navigator.userAgent,
)
const SHORTCUT_HINT = MAC ? '⌘K' : 'Ctrl K'

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

/** What a table IS, in a couple of words, for the tables group. A
 *  join is called out because a pair row is not a product, and
 *  finding one should not read like finding one. */
function tableCaption(t: TableFacts): string {
  if (t.role === 'join') return 'Relationship'
  if (t.role === 'view') return 'Combination'
  return `${t.rowCount} row${t.rowCount === 1 ? '' : 's'}`
}

const inkStyle = (accent: TableFacts['accent']): CSSProperties =>
  ({ '--hs-ink': accentVar(accent) }) as CSSProperties

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
   *  waiting the moment the stage is closed. */
  onReveal?: (entityId: string) => void
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

  const result = useMemo(
    () => (open ? search(index, query, DEFAULT_LIMITS) : NO_RESULT),
    [open, index, query],
  )

  const options = useMemo(() => optionsOf(result), [result])

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
    (entityId: string) => {
      /* the store already knows how to be aimed at a table, and the
         sheet already walks its camera when a selection arrives from
         outside the canvas (Whiteboard.tsx's auto-pan). Nothing new
         is invented here — this is the door the panel's list uses. */
      select({ kind: 'entity', id: entityId })
      onReveal?.(entityId)
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
      case 'Enter': {
        const picked = options[cursor]
        if (!picked) return
        e.preventDefault()
        choose(picked.entityId)
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

  const typed = normalizeQuery(query)
  const tooShort = typed.length > 0 && typed.length < MIN_QUERY
  const nothing = typed.length >= MIN_QUERY && options.length === 0
  const hidden = result.rowTotal - result.rowShown

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

      {open ? (
        <div className="hs-pop" data-material>
          <ul className="hs-list" id={listId} role="listbox" aria-label="Search results">
            {result.tables.length > 0 ? (
              <li className="hs-section" role="presentation">
                <p className="hs-head hs-head--plain mono-label" id={`${baseId}-h-tables`}>
                  Tables
                </p>
                <ul
                  className="hs-group"
                  role="group"
                  aria-labelledby={`${baseId}-h-tables`}
                >
                  {result.tables.map((t) => {
                    painted += 1
                    const i = painted
                    return (
                      <li
                        key={t.table.id}
                        id={optionId(i)}
                        role="option"
                        aria-selected={i === cursor}
                        className={`hs-opt${i === cursor ? ' is-active' : ''}`}
                        style={inkStyle(t.table.accent)}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => choose(t.table.id)}
                        onPointerEnter={() => setActive(i)}
                      >
                        <span className="hs-opt-mark">
                          <TableKindSymbol
                            kind={kindOf(t.table.kind)}
                            size={ICON_SIZE.small}
                          />
                        </span>
                        <span className="hs-opt-label">
                          {marked(t.table.name, t.at, t.length)}
                        </span>
                        <span className="hs-opt-where mono-label">
                          {tableCaption(t.table)}
                        </span>
                      </li>
                    )
                  })}
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
                    <span className="hs-head-name">{g.table.name}</span>
                    <span className="hs-head-count mono-label">
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
                          aria-label={`${h.label} — in ${g.table.name}`}
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => choose(g.table.id)}
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
                        </li>
                      )
                    })}
                    {g.more > 0 ? (
                      <li className="hs-more mono-label" role="presentation">
                        +{g.more} more in {g.table.name}
                      </li>
                    ) : null}
                  </ul>
                </li>
              )
            })}
          </ul>

          {/* -- the states that have to say what to do next ------ */}
          {typed.length === 0 ? (
            <p className="hs-say">
              {index.tableTotal === 0 ? (
                <>
                  There are no tables on the sheet yet. Put one there and everything in
                  it becomes findable from here.
                </>
              ) : (
                <>
                  Type any part of a name. Every row in every table is searched, and the
                  answer is grouped by the table it lives in.
                  <span className="hs-say-count mono-label">
                    {index.rowTotal} named rows · {index.tableTotal} tables
                  </span>
                </>
              )}
            </p>
          ) : tooShort ? (
            <p className="hs-say">Keep typing — two letters or more.</p>
          ) : nothing ? (
            <p className="hs-say">
              Nothing is called “{query.trim()}”. Only the NAME of a row is searched, not
              its other columns — try part of a name, or the name of a table.
            </p>
          ) : hidden > 0 ? (
            <p className="hs-foot mono-label">
              Showing {result.rowShown} of {result.rowTotal} — keep typing to narrow it
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
