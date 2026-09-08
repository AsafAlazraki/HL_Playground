/* ============================================================
   THE REGISTER — everybody you have sold to, and what you quoted
   them.

   IT IS A TABLE, DRAWN AS A LIST. Every row here is a row of an
   ordinary base table: the same rows the sheet edits, the finder
   finds, the exporter carries and Ctrl+Z puts back. This screen adds
   ONE thing the sheet cannot show, and it is the reason the screen
   exists — how many quotes each person has been given, and when the
   last one was. That fact lives in the quote registry, not in a
   cell, so no column could ever hold it.

   THE COUNTS ARE READ, NEVER WRITTEN. A quote points at a customer;
   a customer does not keep a list of quotes. One direction only,
   which is why a quote can be deleted, imported or superseded
   without anybody having to remember to fix a counter — the same
   discipline the module index keeps for its own activity strip.

   TWO EMPTY STATES, BECAUSE THEY ARE TWO DIFFERENT FACTS.
     · no register at all  — this project has no customers table yet,
                             and making one is a STRUCTURAL act, so it
                             is offered by name and it is undoable.
     · a register, nobody in it — the table is there and waiting.
   Answering both with one blank screen is how a person concludes the
   app lost something.

   AND BOTH OF THEM ARE NOW A PAGE RATHER THAN A PARAGRAPH. What was
   here was the right WORDS in the wrong shape: an eyebrow, two
   sentences and a button, in a 560px grey card, on the screen a
   dealer meets before they have a single customer. It now opens on
   a line at the display step, states what is true in counted figures
   — tables, quotes, customers — and puts the one act underneath
   them. Nothing said here is new; it is the same facts, given the
   room a first screen needs.

   THE PRIMARY ACT IS DRAWN ONCE. "New customer" used to stand in the
   head AND be the thing the empty state was asking for, so an empty
   register showed two ways to do the only thing there was to do. The
   head keeps it once there is a list to add to.

   NOTHING HERE KNOWS WHAT IS SOLD. Not a marine word, not a boat,
   not a hull. A customer is a customer whether the yard sells
   trailers or tractors.
   ============================================================ */

import { useCallback, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react'
import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { ICON_SIZE } from '@/lib/icons'
import { money } from '@/lib/money'
import { PageHead } from '@/features/page'
import { Picker } from '@/features/picker'
import { localDay, quoteTotals, useQuotes } from '@/features/quote'
import { customerRegister, matchCustomers, readCustomers } from './customers'
import { addCustomer, ensureCustomerRegister } from './register'
import './crm.css'

export interface CustomerListProps {
  /** open one customer */
  onOpen: (rowId: string) => void
  /** the row that is already open, if the stage has one */
  openId?: string | null
}

/* ============================================================
   THE LETTER KEYS, AND THE ONE WCAG CLAUSE NOBODY IN THE COHORT
   MEETS.

   `J`, `K` and `X` are SINGLE-CHARACTER SHORTCUTS, and WCAG 2.1.4
   is a **Level A** success criterion: a single-character shortcut
   must be turn-off-able, remappable, OR active only while the
   component that owns it has focus. `dense-tables-and-selection.md`
   records that Linear and Superhuman both ship large single-key
   vocabularies and NEITHER documents a way to disable or remap
   them — "adopt — free differentiator and a real liability".

   THIS SCREEN TAKES TWO OF THE THREE REMEDIES, not one.

     1. SCOPE. Every key below is handled on the list's own
        `onKeyDown`, so a letter only means anything while focus is
        already inside the register. Type a `j` into the find box —
        which is a sibling, in the page header — and it is a `j`.
        That alone satisfies 2.1.4.

     2. AN OFF SWITCH, said out loud, in the list's own foot. Off,
        `J`/`K`/`X` are ordinary letters again and every function
        they carried is still on the keyboard: arrows move,
        `Shift`+arrows extend, `Ctrl`/`Cmd`+`A` takes all of them,
        `Escape` clears, `Enter` opens. Not one of those is a
        single-character shortcut — 2.1.4 exempts a key pressed with
        a modifier and exempts the non-printable keys — so turning
        the letters off costs the keyboard nothing at all.

   IT IS THE DEVICE'S PREFERENCE, NOT THE BUSINESS'S, which is why
   it is stored the way the dashboard stores a person's tile order
   and not in the project. A browser that refuses storage answers
   `true`, because the shortcut being ON is the behaviour the rest
   of this file was written for.
   ============================================================ */
const LETTER_KEYS = 'hl.crm.letters.v1'

function readLetterKeys(): boolean {
  try {
    return globalThis.localStorage?.getItem(LETTER_KEYS) !== 'off'
  } catch {
    return true
  }
}

function writeLetterKeys(on: boolean): void {
  try {
    globalThis.localStorage?.setItem(LETTER_KEYS, on ? 'on' : 'off')
  } catch {
    /* a browser that will not store it still honours it this session */
  }
}

/** What the list knows about one person beyond their own cells. */
interface Activity {
  quotes: number
  /** the day of their latest, in the reader's own locale */
  last: string
  /** and the raw stamp of it, because a date drawn for a person is
   *  not a date a sort can trust — "3 Aug" and "3 Aug" are the same
   *  string in two different years */
  at: string
  /** everything they have been quoted, summed */
  worth: number
}

export function CustomerList({ onOpen, openId }: CustomerListProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const quotes = useQuotes()
  const [find, setFind] = useState('')
  const [order, setOrder] = useState<'name' | 'recent' | 'worth' | 'most'>('name')

  const table = customerRegister(entities)
  const rows = table ? (rowsByEntity[table.id] ?? []) : []

  const people = useMemo(
    () => (table ? readCustomers(table, rows) : []),
    [table, rows],
  )

  /* ONE PASS OVER THE DIARY, not one per person: a register of two
     hundred against a diary of a thousand is 200,000 comparisons the
     naive way, on every keystroke in the find box. */
  const activity = useMemo(() => {
    const by = new Map<string, Activity>()
    for (const q of quotes) {
      const rowId = q.customerRef?.rowId
      if (!rowId) continue
      /* WHAT THEY HAVE BEEN QUOTED, summed. It is the figure a CRM
         is opened for — "who is worth calling back" — and it could
         not be a column on the customers table because it lives in
         the quote registry, which is the same reason the count and
         the date could not. */
      const worth = quoteTotals(q).total
      const seen = by.get(rowId)
      /* the diary is already newest-first, so the FIRST one seen for
         a person is their latest — no second sort */
      if (seen) {
        seen.quotes += 1
        seen.worth += worth
      } else {
        by.set(rowId, { quotes: 1, last: localDay(q.createdAt), at: q.createdAt, worth })
      }
    }
    return by
  }, [quotes])

  /* HOW THE BOOK IS ORDERED. Four answers, and each is a real
     question somebody asks of a register: who is new, who is worth
     the most, who has been quoted most often, and — the default —
     alphabetical, because that is how you find a person whose name
     you already know.

     SEARCH ORDERS BY RELEVANCE AND THAT WINS. `matchCustomers`
     ranks a name that STARTS with the query above one that merely
     contains it; re-sorting that alphabetically would throw the
     ranking away and put the best match in the middle. So the sort
     applies to the whole book and steps aside while somebody is
     typing. */
  const shown = useMemo(() => {
    const hit = matchCustomers(people, find, people.length)
    if (find.trim() !== '') return hit
    const rank = [...hit]
    switch (order) {
      case 'recent':
        return rank.sort(
          (a, b) => (activity.get(b.rowId)?.at ?? '').localeCompare(activity.get(a.rowId)?.at ?? ''),
        )
      case 'worth':
        return rank.sort(
          (a, b) => (activity.get(b.rowId)?.worth ?? 0) - (activity.get(a.rowId)?.worth ?? 0),
        )
      case 'most':
        return rank.sort(
          (a, b) => (activity.get(b.rowId)?.quotes ?? 0) - (activity.get(a.rowId)?.quotes ?? 0),
        )
      default:
        /* A NAMELESS ROW SORTS LAST, not first under an empty
           string — the same rule the board keeps. */
        return rank.sort((a, b) => {
          if (a.name === '' && b.name === '') return 0
          if (a.name === '') return 1
          if (b.name === '') return -1
          return a.name.localeCompare(b.name)
        })
    }
  }, [people, find, order, activity])

  /* how many of the people in the book have ever been quoted — the
     one number on this page that says what a CRM is for */
  const withQuotes = useMemo(
    () => people.filter((c) => activity.has(c.rowId)).length,
    [people, activity],
  )

  /* ============================================================
     WALKING THE BOOK WITHOUT A MOUSE, AND MARKING PEOPLE IN IT.

     MEASURED BEFORE THIS: on a register of twelve, ArrowDown did
     nothing, `J` did nothing, `X` did nothing, and the list held
     TWELVE tab stops — one per row — so the only keyboard route to
     the ninth person was Tab pressed nine times. There was no
     selection model of any kind: zero checkboxes, zero
     `aria-selected`, `tabIndex` 0 on every row.

     THE MODEL IS THE ONE `dense-tables-and-selection.md` RECORDS,
     and every part of it is somebody's published behaviour rather
     than an invention:

       ↑ ↓ / J K            move            Linear
       Shift + ↑ ↓ / J K    extend          Superhuman — "same axis
                                            as movement"
       Shift + click        extend          Linear
       X                    mark one        Linear
       Ctrl / Cmd + A       all of them     the ARIA grid baseline
       Escape               clear           Linear
       Home / End           the ends        the ARIA grid baseline

     ONE TAB STOP, NOT TWELVE. A roving tabindex — the APG's own
     alternative to `aria-activedescendant`, and the pattern the
     quote shelf already uses in this repo — puts the cursor's row
     at 0 and every other row at −1, so Tab enters the register and
     Tab leaves it.

     THE CHECKBOX IS A REAL CHECKBOX and it is the selection state,
     announced natively, rather than a role this list invented. It
     is `tabIndex={-1}` so it does not put a second stop on every
     row: the keyboard reaches it through `X` and through
     Shift+arrow, both of which are listed in the foot.

     WHAT SELECTING IS FOR, and it is deliberately not a bulk
     action. Nothing in this feature acts on many people at once,
     and a checkbox wired to nothing is a control that does nothing.
     What a selection does here is COUNT — the same two figures the
     rows already carry, summed for the set you picked, which is the
     question a register is opened with: who is worth calling back.
     Figma's lesson from the same study, one size down: a set of
     things is something you enumerate and read, not an error state.
     ============================================================ */
  const [cursor, setCursor] = useState(0)
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set<string>())
  const [letters, setLetters] = useState(readLetterKeys)
  const anchor = useRef(0)
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([])

  /* THE CURSOR IS CLAMPED WHERE IT IS READ, not corrected in an
     effect. Searching and re-sorting both change the list under it,
     and a stored index that outlives its list is how a register
     scrolls to a row that is no longer there. */
  const at = shown.length === 0 ? -1 : Math.min(cursor, shown.length - 1)

  const move = useCallback(
    (to: number, extend: boolean) => {
      const n = shown.length
      if (n === 0) return
      const next = Math.max(0, Math.min(to, n - 1))
      setCursor(next)
      if (extend) {
        const lo = Math.min(anchor.current, next)
        const hi = Math.max(anchor.current, next)
        const set = new Set<string>()
        for (let i = lo; i <= hi; i++) {
          const c = shown[i]
          if (c) set.add(c.rowId)
        }
        setPicked(set)
      } else {
        anchor.current = next
      }
      /* `.focus()` scrolls the row into view on its own, and it does
         it instantly — DESIGN_PRINCIPLES §4: nothing a keyboard
         starts is allowed to animate. */
      rowRefs.current[next]?.focus()
    },
    [shown],
  )

  const mark = useCallback((rowId: string) => {
    setPicked((held) => {
      const set = new Set(held)
      if (set.has(rowId)) set.delete(rowId)
      else set.add(rowId)
      return set
    })
  }, [])

  /* WHAT THE SET IS WORTH. Read from the same `activity` map the
     rows draw from, so the tally and the column can never disagree,
     and never written anywhere. */
  const tally = useMemo(() => {
    let given = 0
    let worth = 0
    for (const rowId of picked) {
      const act = activity.get(rowId)
      if (!act) continue
      given += act.quotes
      worth += act.worth
    }
    return { given, worth }
  }, [picked, activity])

  /* THE KEYS HANG ON THE ROW, NOT ON THE LIST, and that is the
     scoping WCAG 2.1.4 asks for made structural rather than
     promised: the handler is on the one element that can hold the
     focus, so a letter cannot mean anything unless a customer is
     already under the cursor. A `<ul>` is not an interactive
     element and does not get to listen for keys. */
  const onKeys = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      /* A LETTER HELD WITH A COMMAND KEY IS SOMEBODY ELSE'S. The
         window switcher owns Ctrl/Cmd + W, M and the digits; the
         finder owns Ctrl/Cmd + K. None of them may be shadowed. */
      const cmd = e.metaKey || e.ctrlKey || e.altKey
      const key = e.key
      const down = key === 'ArrowDown' || (letters && !cmd && (key === 'j' || key === 'J'))
      const up = key === 'ArrowUp' || (letters && !cmd && (key === 'k' || key === 'K'))

      if ((down || up) && !cmd) {
        e.preventDefault()
        move(at + (down ? 1 : -1), e.shiftKey)
        return
      }
      if (key === 'Home' && !cmd) {
        e.preventDefault()
        move(0, e.shiftKey)
        return
      }
      if (key === 'End' && !cmd) {
        e.preventDefault()
        move(shown.length - 1, e.shiftKey)
        return
      }
      if (letters && !cmd && (key === 'x' || key === 'X')) {
        const c = shown[at]
        if (c) {
          e.preventDefault()
          mark(c.rowId)
        }
        return
      }
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (key === 'a' || key === 'A')) {
        e.preventDefault()
        setPicked(new Set(shown.map((c) => c.rowId)))
        return
      }
      /* ESCAPE IS ONLY OURS WHILE THERE IS A SELECTION TO CLEAR.
         With nothing marked it keeps bubbling, because Escape on a
         stage is the stage's own way back — see `app/stageKeys.ts`,
         which is explicit that a widget only takes the key when it
         genuinely owns it. */
      if (key === 'Escape' && picked.size > 0) {
        e.preventDefault()
        e.stopPropagation()
        setPicked(new Set<string>())
      }
    },
    [at, letters, mark, move, picked, shown],
  )

  /* ============================================================
     NO REGISTER YET — and making one is a table, so it is offered
     by name, in a sentence, and it is undoable (§7).
     ============================================================ */
  if (!table) {
    return (
      <div className="cx-root">
        <div className="ds-aurora ds-grain cx-sky" aria-hidden="true" />
        <div className="cx-scroll">
          <div className="cx-empty ds-rise">
            <span className="cx-empty-eyebrow">No customer register yet</span>
            <h2 className="cx-empty-title">Everybody you sell to, in one book.</h2>
            {/* AN EMPTY STATE KEEPS ITS SENTENCE AND ITS ACT — one
                sentence. This was three: what a customer is, where the
                register lives, and what it saves you. The first two are
                what the heading and the button say. */}
            <p className="cx-empty-say">
              So the second quote to somebody starts from what you know.
            </p>

            {/* THE COUNTED STRIP GOES — PHASE_TWO §1, "a count belongs on
                the thing it counts". Three big figures on an empty
                state, one of them a count of TABLES, is the schema
                announcing itself on the one screen whose whole job is a
                sentence and a button. */}
            <button
              type="button"
              className="cx-act cx-act--primary"
              onClick={() => ensureCustomerRegister()}
            >
              <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
              Create the Customers table
            </button>
            {/* THIS SENTENCE IS NOT PROSE AND IT STAYS. DESIGN_PRINCIPLES
                §7: structure is never a side effect — a table this button
                creates is named before it is made, and it is undoable.
                What was cut is the middle clause telling you a table is
                a table. */}
            <p className="cx-empty-why">
              <em>Name</em>, <em>Phone</em>, <em>Email</em>, <em>Address</em>,{' '}
              <em>Notes</em> — undo with Ctrl+Z.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cx-root">
      <div className="ds-aurora ds-grain cx-sky" aria-hidden="true" />
      <div className="cx-scroll">
        {/* THE FRAME SCROLLS; THE PAGE INSIDE IT HAS A WIDTH.

            `.cx-scroll` is the frame, and it is the only thing that
            moves. It gave up its own horizontal inset so that every
            block under the header takes `--page-gutter` once and
            nothing else — measured after: the title, the rows, the
            details and the history all begin at 256.

            THIS is the page, and it is a GRID OF TWO TRACKS: the
            application's header, then the body of the register. It
            takes the measure — `min(var(--measure), 1900px)`, see
            `.cx-page` in crm.css for the arithmetic — because above
            1180px the design used to have no opinion at all, and a
            register row carries five things. Past ~1900px it stops
            being a row you can scan and becomes a name at one end of
            the desk and a number at the other, so the page declines
            the width rather than spending it.

            THE HEAD STAYS A BANNER ACROSS BOTH TRACKS. Turning it
            into a sticky column beside the list was the earlier
            answer to a 2560px window, and it was written when this
            screen drew its own `.cx-head`. It draws `PageHead` now —
            the same header Modules, Quotes and Data use — and
            Customers is not the one page in the application whose
            title, actions and find box sit somewhere else. */}
        <div className="cx-page">
          {/* THE APPLICATION'S HEADER, and this page used to have none
              at all — it began with a card. See features/page. */}
          <PageHead
            eyebrow="Register"
            name={table.name}
            count={
              withQuotes === 0
                ? `${people.length} ${people.length === 1 ? 'person' : 'people'}`
                : `${people.length} · ${withQuotes} quoted`
            }
            {...(table.description ? { line: table.description } : {})}
            acts={
              <>
                <div className="cx-find">
                  <span className="cx-find-mark" aria-hidden="true">
                    <MagnifyingGlass size={ICON_SIZE.small} weight="light" />
                  </span>
                  <input
                    className="cx-find-input"
                    type="search"
                    value={find}
                    placeholder="Find a customer"
                    aria-label="Find a customer by name, contact or note"
                    onChange={(e) => setFind(e.target.value)}
                  />
                </div>

                {/* THE SORT STEPS ASIDE WHILE SOMEBODY IS TYPING.
                    `matchCustomers` ranks by relevance and re-sorting
                    that alphabetically would bury the best match in the
                    middle of the list, so the control says so rather
                    than appearing to be ignored. */}
                {/* THE SAME DROPDOWN THE BOARD USES. Two sort
                    controls that looked different were two things to
                    learn; both were native selects, which is to say
                    neither looked like this application. */}
                <Picker
                  label="Sort"
                  value={find.trim() === '' ? order : 'match'}
                  options={
                    find.trim() === ''
                      ? [
                          { id: 'name' as const, label: 'Name A\u2013Z' },
                          { id: 'recent' as const, label: 'Quoted most recently' },
                          { id: 'worth' as const, label: 'Worth the most' },
                          { id: 'most' as const, label: 'Most quotes' },
                        ]
                      : [{ id: 'match' as const, label: 'Best match' }]
                  }
                  ariaLabel="How to order the register"
                  /* THE SORT STEPS ASIDE WHILE SOMEBODY IS SEARCHING,
                     and says why rather than appearing ignored.
                     `matchCustomers` ranks a name that STARTS with the
                     query above one that merely contains it, and
                     re-sorting that alphabetically would bury the best
                     match in the middle of the list. */
                  {...(find.trim() === ''
                    ? {}
                    : { disabledWhy: 'While you are searching, the closest names come first.' })}
                  onPick={(id) => {
                    if (id !== 'match') setOrder(id)
                  }}
                />

                <button
                  type="button"
                  className="cx-act cx-act--primary"
                  onClick={() => {
                    const row = addCustomer()
                    if (row) onOpen(row.id)
                  }}
                >
                  <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                  New customer
                </button>
              </>
            }
          />

          {/* THE BODY IS THE SECOND TRACK, and it is a box of its own
              so that it can be one. A grid child that holds a list of
              rows needs `min-width: 0`, or the widest contact line in
              the register sets the width of the page. See `.cx-main`. */}
          <div className="cx-main">
            {people.length === 0 ? (
              <div className="cx-empty ds-rise">
                <span className="cx-empty-eyebrow">Nobody in it yet</span>
                <h2 className="cx-empty-title">The register is here and waiting.</h2>
                <p className="cx-empty-say">Add somebody, or file them from a quote.</p>

                <button
                  type="button"
                  className="cx-act cx-act--primary"
                  onClick={() => {
                    const row = addCustomer()
                    if (row) onOpen(row.id)
                  }}
                >
                  <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                  New customer
                </button>
              </div>
            ) : shown.length === 0 ? (
              /* A DEAD END SAYS WHAT ELSE IT WOULD HAVE ANSWERED TO. The
                 register is searched by name AND by everything in the
                 contact lines and the note — see `haystack` — so saying so
                 is the difference between "no" and "try this". */
              <p className="cx-none">
                Nothing matches “{find.trim()}”. Their name is searched, and so is anything
                in their contact details.
              </p>
            ) : (
              <ul className={`cx-rows${withQuotes > 0 ? ' cx-rows--quoted' : ''}`}>
                {/* ── THE FIND BOX ANSWERED SILENTLY ────────────────────
                    Typing in it removed rows from the list and said
                    nothing at all, so a register of two hundred that
                    narrowed to nine looked exactly like a register of
                    nine — and the head above it went on printing 200,
                    which is the reading a person would then have to
                    reconcile on their own. One line, only while
                    something is typed, and it is the same accounting the
                    palette prints along its own foot.

                    A LIST ITEM, BECAUSE IT IS INSIDE A LIST. A <p> here
                    would be an invalid child of <ul> and a screen reader
                    would read the list's length wrong; `role="presentation"`
                    takes it back out of the count. */}
                {find.trim() !== '' ? (
                  <li className="cx-shown" role="presentation">
                    <span className="cx-num">{shown.length}</span> of{' '}
                    <span className="cx-num">{people.length}</span> — the rest do not match
                    “{find.trim()}”.
                  </li>
                ) : null}
                {shown.map((c, i) => {
                  const act = activity.get(c.rowId)
                  const who = c.name === '' ? 'A customer with no name yet' : c.name
                  const on = picked.has(c.rowId)
                  return (
                    <li
                      key={c.rowId}
                      className={`cx-row${openId === c.rowId ? ' is-open' : ''}${
                        on ? ' is-picked' : ''
                      }`}
                    >
                      {/* THE MARK, AND IT COSTS THE ROW NO COLUMN.
                          Linear reveals the checkbox on hover so it
                          never takes width from the data; this one
                          lives in the gutter the row already had, is
                          drawn only on hover, on focus, or when it is
                          ticked, and is the same 14px box whether it
                          is visible or not — so nothing on the row
                          moves when the pointer arrives. */}
                      <input
                        type="checkbox"
                        className="cx-pick"
                        tabIndex={-1}
                        checked={on}
                        aria-label={`Select ${who}`}
                        onChange={() => {
                          setCursor(i)
                          anchor.current = i
                          mark(c.rowId)
                          /* THE CURSOR FOLLOWS THE TICK. Focus is
                             left on the row rather than on the box,
                             so the next ArrowDown continues from the
                             person just marked — and so the list
                             keeps its one tab stop. */
                          rowRefs.current[i]?.focus()
                        }}
                      />
                      <button
                        type="button"
                        className="cx-row-open"
                        ref={(n) => {
                          rowRefs.current[i] = n
                        }}
                        tabIndex={i === Math.max(at, 0) ? 0 : -1}
                        onKeyDown={onKeys}
                        onClick={(e) => {
                          /* SHIFT+CLICK EXTENDS RATHER THAN OPENS —
                             the pointer half of Shift+↑↓, and the
                             same key on the same act as Linear's. */
                          if (e.shiftKey) {
                            e.preventDefault()
                            move(i, true)
                            return
                          }
                          setCursor(i)
                          anchor.current = i
                          onOpen(c.rowId)
                        }}
                        aria-label={who}
                      >
                        <span className="cx-row-name">
                          {c.name === '' ? (
                            <span className="cx-blank">no name yet</span>
                          ) : (
                            c.name
                          )}
                        </span>
                        <span className="cx-row-contact">{c.contact.join('  ·  ')}</span>
                        <span className="cx-row-when">{act?.last ?? ''}</span>
                        {/* WHAT THEY HAVE BEEN QUOTED. Drawn only where
                            there is something to draw: a column of em
                            dashes down a new register is noise, and the
                            count beside it already says "none". */}
                        <span className="cx-num cx-row-worth">
                          {act ? money(act.worth) : ''}
                        </span>
                        <span className="cx-num cx-row-count">
                          {act
                            ? `${act.quotes} ${act.quotes === 1 ? 'quote' : 'quotes'}`
                            : '—'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* ── THE FOOT: WHAT IS MARKED, AND WHAT THE KEYS ARE ──
                ONE BAR, TWO STATES, AND IT NEVER CHANGES HEIGHT, so
                the row under the cursor cannot move because the bar
                changed its mind. With nothing marked it teaches the
                keyboard — Superhuman's habit of rendering the
                shortcut beside the act it performs, which the study
                marks "adopt — cheap". With something marked it says
                what the set is worth.

                IT IS STICKY TO THE SCROLLER, not to the list, so a
                register of three hundred still shows the tally while
                you are three hundred rows into marking it up.

                THE FIGURES ARE MONO AND THEY DO NOT MOVE. Money
                never animates — §4 — and this is money. */}
            {shown.length > 0 ? (
              <div className="cx-foot">
                {picked.size > 0 ? (
                  <p className="cx-foot-say">
                    {/* A SET WITH NOTHING IN IT IS SAID IN WORDS, NOT
                        IN ZEROES. "0 quotes, $0 between them" is a
                        figure printed where the file holds none, and
                        the row beside it already declines to draw an
                        empty money column for the same reason. */}
                    <span className="cx-num">{picked.size}</span> marked
                    {tally.given === 0 ? (
                      ' — none of them quoted yet.'
                    ) : (
                      <>
                        {' — '}
                        <span className="cx-num">{tally.given}</span>{' '}
                        {tally.given === 1 ? 'quote' : 'quotes'},{' '}
                        <span className="cx-num">{money(tally.worth)}</span> between them.
                      </>
                    )}
                  </p>
                ) : (
                  <p className="cx-foot-say">
                    <kbd className="cx-key">↑</kbd>
                    <kbd className="cx-key">↓</kbd> move ·{' '}
                    {letters ? (
                      <kbd className="cx-key">X</kbd>
                    ) : (
                      <>
                        <kbd className="cx-key">Shift</kbd>
                        <kbd className="cx-key">↑</kbd>
                      </>
                    )}{' '}
                    mark · <kbd className="cx-key">Enter</kbd> open
                  </p>
                )}
                <div className="cx-foot-acts">
                  {picked.size > 0 ? (
                    <button
                      type="button"
                      className="cx-foot-act"
                      onClick={() => setPicked(new Set<string>())}
                    >
                      Clear
                    </button>
                  ) : null}
                  {/* THE 2.1.4 SWITCH. It says which state it is in
                      rather than which state it would move to, so it
                      reads the same as the thing it controls. */}
                  <button
                    type="button"
                    className="cx-foot-act"
                    aria-pressed={letters}
                    onClick={() => {
                      setLetters((on) => {
                        writeLetterKeys(!on)
                        return !on
                      })
                    }}
                  >
                    {letters ? 'Letter keys on' : 'Letter keys off'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
