/* ============================================================
   WHAT ARE YOU QUOTING — the door "New quote" opens.

   ── THE INSTRUCTION, VERBATIM, AND IT WAS GIVEN TWICE ────────

   > "that is the flow of how i want it from new quote — opens
   >  popup with small module cards not the way it is now! i
   >  thought i made that clear"

   It was clear. What shipped twice was a TWO-PANE PICKER: a list
   of places down the left with a paragraph under each, and rows on
   the right. PHASE_TWO §1 names it as the thing to fix and draws
   the shape it should have been:

       ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
       │ HF │ │ YA │ │ ST │ │ DU │ │ GF │   ← logo, name, count
       └────┘ └────┘ └────┘ └────┘ └────┘

       [ search everything ]

   So: LAYER ONE is a GRID OF SMALL CARDS, and pressing one OPENS
   IT IN PLACE to that module's rows. Same dialog, same objects,
   one layer deeper — never a second column of prose.

   ── THE BRAND LOGO, WHICH WAS BUILT AND NEVER SURFACED ───────

   `ModuleDef.logo` is an `ImageRef` and `features/modules/logo.ts`
   has carried the size ceiling, the kind refusal and the fallback
   since it was written. PHASE_TWO §1 records that the capability
   exists and nothing shows it. The face of a card here is the
   module's own logo, with the kind's crest as the fallback —
   which is exactly what the code already does.

   ── WHAT DID NOT CHANGE, AND MUST NOT ────────────────────────

   1 · A SHUT DOOR SAYS WHY, AND IS STILL DRAWN. Five of the nine
       modules on the real sheet cannot raise a price, each for a
       different true reason. Dropping them would teach a dealer
       that their own modules are not really the shape of this app.
       They are a QUIET BAND BENEATH the grid now rather than half
       the list — PHASE_TWO's own words — and each still carries
       its sentence and the door to the switch that clears it.

   2 · THE WALK IS SHOWN BEFORE IT IS TAKEN. A quote's steps are
       its view's blocks, so what you are quoting decides what the
       configurator will hold. `flowPreview` reads it from the same
       relationships that will build it and creates nothing.

   3 · THE CONSTRAINT SOLVER ANSWERS FIRST. `subjectRules.ts` runs
       `solve()` over the highlighted row and draws what the rules
       already decide, each in the rule's own `because`.

   ── THE PROSE BUDGET ─────────────────────────────────────────

   §1a's rule for a card is "a name and ONE fact. Not a name, a
   subtitle, a two-line description, a count, a qualifier and a row
   of verbs." A card here is a logo, a name and a count. The
   module's description — a paragraph, on every one of nine —
   is gone from this surface entirely. It lives on the module's own
   page, which is one press away and is where a person asking what
   a module is for actually goes.

   The dialog's own subtitle went the same way. "A quote is made
   from the row being sold, so it starts with a thing rather than
   with a blank page. Choose the place, then the one." is 25 words
   explaining a grid of nine labelled cards.

   ── MOTION: THERE IS NONE ON OPEN, AND THAT IS THE RULE ──────

   The budget's one absolute is that a keyboard-initiated act is
   never animated, and this dialog is opened from a button on the
   rail — Enter or Space, every time, for anyone driving with the
   keyboard. It does not fade, rise or scale, and neither does the
   scrim: a scrim that fades IS the dialog animating on open under
   another name.

   ── WHAT IT MAY NOT DO ───────────────────────────────────────

   IT DOES NOT READ THE PROJECT STORE. The sheet arrives as props
   from the shell, which is already reading all three for the rail.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  Info,
  MagnifyingGlass,
  Warning,
  X,
} from '@phosphor-icons/react'
import type { EntityDef, ModuleDef, RowData } from '@/types/model'
import { ICON_SIZE } from '@/lib/icons'
import { TableKindSymbol } from '@/features/tablekit'
import { useConstraints } from '@/features/constraints/constraintDefs'
import { createViewFor, useViewDefs } from '@/features/views/viewDefs'
import type { IndexEntry } from '@/features/modules/read'
import {
  SEARCH_MIN,
  SUBJECT_CAP,
  catalogueOf,
  flowPreview,
  quoteDoors,
  subjectsIn,
  type FlowPreview,
  type QuoteDoor,
} from './start'
import { placeRules, subjectVerdict, type SubjectVerdict } from './subjectRules'
import { unsellableSubject } from './freeze'
import { createQuoteFromView, unaddressedDraftFor } from './quotes'
import { quoteTotals } from './totals'
import { FlowFoot, FlowLine, RunningTotal } from './flow'
import { PlaceMark } from '@/features/modules/PlaceMark'
import { FrozenPhoto } from './photo'
import './picker.css'

export interface QuoteStartProps {
  /** the sheet, handed over rather than read — see the header */
  modules: Record<string, ModuleDef>
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
  /** a quote was minted, and the shell opens it */
  onStarted: (quoteId: string) => void
  /** open a place's own page — the door under every refusal, and the
   *  way to the settings that would clear it. Absent = the refusal is
   *  still SAID and not offered as a door. */
  onOpenPlace?: (moduleId: string) => void
  /** OPEN ALREADY STANDING IN A PLACE.
   *
   *  A quick action on a module tile says "start a quote HERE", and
   *  a picker that then asks which place to start in has thrown the
   *  answer away. Absent — pressing New quote in the rail — it
   *  opens on the grid of places, which is still the right first
   *  screen when nobody has said where.
   *
   *  It is the INITIAL value only, not a lock: the back arrow to
   *  the grid works exactly as it does when nothing was passed. */
  startAt?: string
  onClose: () => void
}

export function QuoteStart({
  modules,
  entities,
  rowsByEntity,
  onStarted,
  onOpenPlace,
  startAt,
  onClose,
}: QuoteStartProps): ReactElement | null {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const findRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  const doors = useMemo(
    () => quoteDoors(modules, entities, rowsByEntity),
    [modules, entities, rowsByEntity],
  )
  const open = useMemo(() => doors.filter((d) => d.refusal === ''), [doors])
  const shut = useMemo(() => doors.filter((d) => d.refusal !== ''), [doors])

  /* NOTHING IS CHOSEN WHEN IT OPENS, and that is the change. The
     two-pane picker had to land on a place because the right-hand
     pane could not be empty; a grid can be the whole first screen,
     which is what makes pressing a card feel like opening a door
     rather than like moving a highlight. */
  const [placeId, setPlaceId] = useState<string | null>(startAt ?? null)
  const [showShut, setShowShut] = useState(false)
  /* MATCHED ON THE DOOR'S KEY, and then on the module's id.
     `startAt` comes from a module tile and names a MODULE; the
     doors are places. Where a module is one place the two strings
     are the same; where it is several, the first of them is the
     honest landing — better than opening on the grid and throwing
     the answer away. */
  const door =
    doors.find((d) => d.key === placeId) ??
    doors.find((d) => d.moduleId === placeId) ??
    null

  /* a place struck from the sheet while this is up must not leave the
     dialog pointing at nothing */
  useEffect(() => {
    if (placeId === null || door !== null) return
    setPlaceId(null)
  }, [doors, placeId, door])

  const [query, setQuery] = useState('')
  const [hi, setHi] = useState(-1)

  /* the search belongs to the place it is searching: walking to the
     trailers with "yamaha" still typed is a narrowing nobody asked for */
  useEffect(() => {
    setQuery('')
    setHi(-1)
  }, [placeId])
  useEffect(() => {
    setHi(-1)
  }, [query])

  /* THE CATALOGUE IS BUILT ONCE PER PLACE AND FILTERED PER KEYSTROKE.
     Boats holds 810 rows and Parts 719; formatting a price cell for
     every one of them on every letter typed is the cost the reference
     hides behind a two-character floor instead of avoiding. */
  const catalogue = useMemo(
    () => (door && door.refusal === '' ? catalogueOf(door, rowsByEntity) : null),
    [door, rowsByEntity],
  )
  const list = useMemo(
    () => (door && catalogue ? subjectsIn(door, catalogue, query) : null),
    [door, catalogue, query],
  )
  const shown = list?.shown ?? []

  const chosen: IndexEntry | undefined = hi >= 0 ? shown[hi] : undefined
  const chosenEntity = chosen ? entities[chosen.tableId] : undefined
  const chosenRow = chosen
    ? (rowsByEntity[chosen.tableId] ?? []).find((r) => r.id === chosen.rowId)
    : undefined

  const views = useViewDefs()
  const constraints = useConstraints()

  const preview: FlowPreview | null = useMemo(
    () => (chosenEntity ? flowPreview(chosenEntity, entities, views) : null),
    [chosenEntity, entities, views],
  )

  const rules = useMemo(
    () => (door && door.refusal === '' ? placeRules(door.module, entities, constraints) : null),
    [door, entities, constraints],
  )

  const verdict: SubjectVerdict | null = useMemo(
    () => (rules && chosenEntity && chosenRow ? subjectVerdict(rules, chosenEntity, chosenRow) : null),
    [rules, chosenEntity, chosenRow],
  )

  /* THE LAST GATE, AND IT IS A LIVE READ ABOUT ONE ROW. The list has
     already refused every discontinued row and every retired table;
     this is the same sentence the view stage draws instead of "Quote
     this one", asked here so the two surfaces refuse identically. */
  const barred = chosen ? unsellableSubject(chosen.tableId, chosen.rowId) : ''

  /* ── THE DRAFT THIS PERSON ALREADY STARTED FOR THIS ROW ──────────
     Read at render, the same way `unsellableSubject` above is: this
     screen is the focused window and the shell keys the stage on the
     focused window's id, so coming back to it is a fresh mount and a
     fresh read. `quotes.ts` carries the measurement this answers —
     three drafts for one boat after two attempts, with the build on
     the one nothing on screen mentioned. */
  const standing = chosen ? unaddressedDraftFor(chosen.tableId, chosen.rowId) : undefined

  const start = useCallback(
    (fresh: boolean) => {
      if (!chosen || barred !== '') return
      /* ── FORWARD AGAIN GOES BACK TO THE SAME DOCUMENT ──────────
         Unless a person asked for another one in as many words. */
      if (!fresh && standing) {
        onStarted(standing.id)
        return
      }
      /* `createViewFor` is idempotent and creates no table, no column
         and no join, so nothing about the sheet changes because
         somebody arrowed down a list. Structure is never a side
         effect (§7); a page for a table a person has just asked to
         sell is not structure. */
      const view = createViewFor(chosen.tableId)
      const made = createQuoteFromView(view.id, chosen.rowId)
      if (!made) return
      /* ── AND IT NO LONGER CLOSES ITSELF ────────────────────────
         `closeRef.current()` was here, and it is what made stepping
         back impossible: the picker is a stage in the shell's window
         stack (`winKit.tsx`, `{ kind: 'start' }`) and closing it left
         nothing behind the quote to step back TO. Measured before
         this — from a configured quote the only route to Choose was
         the rail's New quote, which is not a way back but a new act,
         and it minted a second draft.

         Leaving it standing is what a stack means: the quote opens on
         top, the stage's own Back pops it, and the screen underneath
         is the one the person came from. Nothing is duplicated —
         `winKey` is `'start'` for every picker, so pressing New quote
         again raises this one rather than opening a second. */
      onStarted(made.id)
    },
    [chosen, barred, standing, onStarted],
  )

  /* THE CARET LANDS IN THE SEARCH once a place is open, because that
     is what a person who just pressed a module card is about to do.
     On the GRID it does not: the first thing there is a card, and
     stealing focus into a search field would put the keyboard
     somewhere the eye is not. */
  useEffect(() => {
    if (placeId !== null) findRef.current?.focus()
  }, [placeId])

  /* FOCUS COMES BACK OUT TO WHATEVER OPENED IT. A ref initialised
     during RENDER is read before any effect of this component or its
     children has run, which is the only moment the trigger is still
     the active element — reading `document.activeElement` from
     inside an effect captured a control inside the panel instead,
     and closing then focused a detached node. */
  const cameFrom = useRef<HTMLElement | null>(
    typeof document === 'undefined' || !(document.activeElement instanceof HTMLElement)
      ? null
      : document.activeElement,
  )
  useEffect(() => {
    const returnTo = cameFrom.current
    return () => {
      if (returnTo && returnTo.isConnected) returnTo.focus()
    }
  }, [])

  useEffect(() => {
    if (hi < 0) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-at="${hi}"]`)
    /* no smoothing: keyboard-initiated, so it lands on the same frame */
    el?.scrollIntoView({ block: 'nearest' })
  }, [hi])

  /* THE PANEL OWNS THE KEYBOARD WHILE IT IS UP. Escape steps BACK to
     the grid from inside a place and closes from the grid, which is
     the one behaviour a dialog with two layers owes a person: the
     key that means "out of here" should undo one layer at a time. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const root = rootRef.current
      if (!root) return
      const inside = event.target instanceof Node && root.contains(event.target)

      /* NO FOCUS TRAP, BECAUSE THIS IS NOT A DIALOG ANY MORE.
         A trap is the one thing a modal owes a keyboard — it is
         also the thing that makes a modal a modal. This is a page:
         Tab walks out of it into the rail exactly as it does on
         every other page, which is what a person expects when the
         thing they are looking at is a screen rather than a sheet
         over one. */
            if (!inside) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (placeId !== null) setPlaceId(null)
        else closeRef.current()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.stopPropagation()
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (shown.length === 0) return
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setHi((n) => {
          const next = n + step
          if (next < 0) return shown.length - 1
          if (next >= shown.length) return 0
          return next
        })
        return
      }
      if (event.key === 'Enter') {
        /* ENTER BELONGS TO THE SEARCH FIELD AND TO NOTHING ELSE. Every
           button on this dialog is its own job — the first version
           tested only for a place button, so Enter on CLOSE started a
           quote instead of closing. */
        if (event.target !== findRef.current) return
        if (hi < 0) return
        event.preventDefault()
        start(false)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [shown.length, hi, start, placeId])

  return (
    /* A PAGE, NOT A POPUP.

       This was a dialog in a portal over a scrim, and starting a
       quote is not an interruption of the work — it IS the work,
       and the most important thing this application does. A sheet
       over a dimmed dashboard says "answer this and get back to
       what you were doing"; a page says "this is what you are
       doing". It also gets the whole window, which a configurator
       wants and a dialog can never have.

       What went with the dialog: the scrim, the portal, the
       click-outside-to-close, `aria-modal`, and the focus trap.
       What stayed: Escape (back a step, then out), the arrow keys
       and Enter over the list, and the back arrow — none of which
       were ever modal behaviours. */
    <div className="qs-page" ref={rootRef}>
        <header className="qs-head">
          {door === null ? (
            <h2 className="qs-q" id="qs-q">
              What are you quoting?
            </h2>
          ) : (
            <div className="qs-here">
              <button
                type="button"
                className="qs-back"
                onClick={() => setPlaceId(null)}
                aria-label="Back to the modules"
              >
                <ArrowLeft size={ICON_SIZE.small} weight="bold" aria-hidden="true" />
              </button>
              <span className="qs-here-mark" aria-hidden="true">
                {door.module.logo ? (
                  <FrozenPhoto
                    img={door.module.logo}
                    fallbackAlt={door.name}
                    className="qs-here-logo"
                    w={32}
                    h={32}
                  />
                ) : (
                  <TableKindSymbol kind={door.kind} size={20} />
                )}
              </span>
              <h2 className="qs-q qs-q--here" id="qs-q">
                {door.name}
              </h2>
              <span className="qs-here-n">{countSay(door)}</span>
            </div>
          )}

          <button
            type="button"
            className="qs-close"
            onClick={() => closeRef.current()}
            aria-label="Close without starting a quote"
            title="Close (Esc)"
          >
            <X size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          </button>
        </header>

        {door === null ? (
          /* ── LAYER ONE: THE GRID ─────────────────────────── */
          <div className="qs-body">
            {doors.length === 0 ? (
              <p className="qs-void">
                There are no places in this business yet. A module is what turns a table into
                somewhere you can sell from — make one, and everything in it can start a quote.
              </p>
            ) : (
              <>
                <ul className="qs-grid" aria-label="The places you can quote from">
                  {open.map((d) => (
                    <li key={d.key} className="qs-cell">
                      <ModuleCard door={d} onPick={() => setPlaceId(d.key)} />
                    </li>
                  ))}
                </ul>

                {/* A QUIET BAND BENEATH — never half the list, and
                    never simply absent.

                    IT IS SHUT BY DEFAULT AND SAYS ITS COUNT. Five
                    shut doors on the real sheet is five refusal
                    sentences — 110 words, permanently, on the first
                    screen of a dialog whose job is to let somebody
                    pick a boat. The COUNT is always said, one press
                    gives every sentence in full and in place, and the
                    door to the switch that clears each one comes with
                    it. Rule 10 asks for a reason where the thing is
                    refused; it does not ask for five paragraphs in
                    front of the nine cards that work. */}
                {shut.length > 0 ? (
                  <div className="qs-shut">
                    <button
                      type="button"
                      className="qs-shut-head"
                      aria-expanded={showShut}
                      onClick={() => setShowShut((v) => !v)}
                    >
                      <span className="mono-label qs-shut-cap">No quoting here yet</span>
                      <span className="qs-shut-n">{shut.length}</span>
                      <span className={`qs-shut-mark${showShut ? ' is-open' : ''}`} aria-hidden="true">
                        <CaretDown size={ICON_SIZE.tiny} weight="bold" />
                      </span>
                    </button>
                    {showShut ? (
                      <ul className="qs-shut-list">
                        {shut.map((d) => (
                          <ShutRow key={d.key} door={d} onOpenPlace={onOpenPlace} />
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : door.refusal !== '' ? (
          <div className="qs-body">
            <Refusal door={door} onOpenPlace={onOpenPlace} />
          </div>
        ) : (
          /* ── LAYER TWO: THE MODULE, OPENED IN PLACE ──────── */
          <div className="qs-body qs-body--rows">
            <div className="qs-find">
              <MagnifyingGlass
                size={ICON_SIZE.small}
                weight="bold"
                className="qs-find-mark"
                aria-hidden="true"
              />
              <input
                ref={findRef}
                className="qs-find-in"
                type="search"
                role="combobox"
                aria-expanded="true"
                aria-controls="qs-list"
                aria-activedescendant={hi >= 0 ? `qs-opt-${hi}` : undefined}
                aria-label={`Search ${door.name}`}
                placeholder={`Search ${door.name.toLowerCase()}`}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
              />
            </div>

            {list && list.waiting ? (
              <p className="qs-note">
                Type {SEARCH_MIN} letters and the whole of {door.name} is searched.
              </p>
            ) : null}

            {list && !list.waiting && list.matched.length === 0 ? (
              <p className="qs-note">
                Nothing in {door.name} answers to “{query.trim()}”. The search runs over every one
                of the {list.all.length} it holds, and over the headings they sit under.
              </p>
            ) : null}

            <div className="qs-list" id="qs-list" role="listbox" ref={listRef} tabIndex={-1}>
              {/* A LISTBOX MAY ONLY CONTAIN OPTIONS AND GROUPS. The
                  table is a `group` with its own name; everything
                  between it and a row is presentational. */}
              {list?.sections.map((sec) => (
                <div className="qs-sec" key={sec.tableId} role="group" aria-label={sec.name}>
                  <div className="qs-sec-head" role="presentation">
                    <span className="qs-sec-name">{sec.name}</span>
                    <span className="qs-sec-count">{sec.count}</span>
                  </div>
                  {sec.groups.map((grp) => (
                    <div className="qs-grp" key={grp.key} role="presentation">
                      {grp.trail === '' ? null : (
                        <p className="mono-label qs-grp-head" role="presentation">
                          {grp.trail}
                        </p>
                      )}
                      <ul className="qs-rows" role="presentation">
                        {grp.entries.map((entry) => {
                          const at = shown.indexOf(entry)
                          return (
                            <SubjectRow
                              key={`${entry.tableId}::${entry.rowId}`}
                              entry={entry}
                              entity={entities[entry.tableId]}
                              at={at}
                              on={at === hi}
                              onPick={() => setHi(at)}
                              onTake={() => {
                                setHi(at)
                                start(false)
                              }}
                            />
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {list && list.hidden > 0 ? (
              <p className="qs-note qs-note--cap">
                The first {SUBJECT_CAP} of {list.matched.length} are drawn. The search reaches every
                one of them.
              </p>
            ) : null}
          </div>
        )}

        {/* ── THE FOOTER: WHAT THIS CHOICE BUYS ─────────────── */}
        {door !== null && door.refusal === '' ? (
          <>
            <div className="qs-foot">
              {chosen === undefined || preview === null ? (
                <p className="qs-foot-hint">Highlight one to see what its quote will hold.</p>
              ) : (
                <>
                  {/* THE PRICE CAME OFF THIS STRIP. It was on the right
                      of the name, at `--t-mono-lg-size` — and 60px
                      lower, the moment the quote existed, the same
                      number was on the build screen's bar at
                      clamp(22px, 1.9vw, 30px) on the LEFT. One figure,
                      two sizes, two places, and a person watching it
                      lost it at the one moment they pressed a button.
                      It is on the bar below now, in the slot the total
                      will occupy for the rest of the flow. */}
                  <div className="qs-picked">
                    <span className="qs-picked-say">
                      {chosen.trail === '' ? null : (
                        <span className="qs-picked-trail">{chosen.trail}</span>
                      )}
                      <span className="qs-picked-name">{chosen.label}</span>
                    </span>
                  </div>

                  <Walk preview={preview} />

                  {verdict === null || verdict.problems.length === 0 ? null : (
                    <Verdict verdict={verdict} />
                  )}

                  {barred === '' ? null : (
                    <p className="qs-barred">
                      <Warning size={ICON_SIZE.small} weight="fill" aria-hidden="true" />
                      <span>{barred}</span>
                    </p>
                  )}
                </>
              )}
            </div>

            {/* ── THE FLOW'S OWN BAR, AND THIS IS ITS FIRST SCREEN ──
                Same object, same slot, same face and same size as the
                total on the two screens that follow — see flow.tsx.
                What it carries here is the hull's own price, because
                there is no document yet, and the label says exactly
                that rather than calling it a total. */}
            <FlowFoot
              line={
                <FlowLine
                  at="choose"
                  facts={{ choose: chosen === undefined ? 'nothing yet' : chosen.label }}
                />
              }
            >
              <div className="qb-price-bar">
                {/* ── AND WHEN A DRAFT IS STANDING, IT IS ITS TOTAL ──
                    The figure a person left is the figure they come
                    back to. `chosen.amount` is the row's price as a
                    NUMBER — the field `IndexEntry` carries so nothing
                    re-parses a rendered string — and `quoteTotals` is
                    the one summation, so neither figure here is a
                    second reading of anything. */}
                <RunningTotal
                  label={standing ? 'Total' : 'Starts at'}
                  amount={
                    standing
                      ? quoteTotals(standing).total
                      : chosen === undefined
                        ? null
                        : (chosen.amount ?? null)
                  }
                  sub={
                    standing
                      ? standing.reference
                      : chosen === undefined
                        ? 'nothing highlighted'
                        : 'the boat, before anything is added'
                  }
                />
                {chosen === undefined || barred !== '' ? null : (
                  <>
                    {/* THE ACT SAYS WHICH ACT IT IS. A button reading
                        "Start the quote" that opens a document made
                        twenty minutes ago is a lie about what just
                        happened, and the person would have to read the
                        reference to notice. */}
                    <button type="button" className="qs-go qb-price-act" onClick={() => start(false)}>
                      <span className="qs-go-name">
                        {standing ? 'Back to the quote you started' : 'Start the quote'}
                      </span>
                      <ArrowRight size={ICON_SIZE.small} weight="bold" aria-hidden="true" />
                    </button>
                    {/* AND THE OTHER ONE STAYS POSSIBLE. Two quotes for
                        one hull to two customers is an ordinary
                        Tuesday; the draft is only offered back while
                        NOBODY is named on it (see `unaddressedDraftFor`),
                        so this is the door out of that one case. */}
                    {standing ? (
                      <button
                        type="button"
                        className="qs-again"
                        onClick={() => start(true)}
                      >
                        Start another
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </FlowFoot>
          </>
        ) : null}
    </div>
  )
}

/** A NAME AND ONE FACT. `censusLine` is the dashboard's full
 *  sentence — "2,860 accessories across 179 categories and 25
 *  sections · 727 no longer sold" — which is right on a dashboard
 *  and is six facts on a card 168px wide. This is the count and the
 *  dealer's own plural for the thing, and nothing else. */
const countSay = (door: QuoteDoor): string =>
  `${door.census.items.toLocaleString()} ${door.census.noun}`

/* ============================================================
   ONE MODULE — a small card: the logo, the name, the count.

   The logo is `ModuleDef.logo`, which `features/modules/logo.ts`
   has been able to hold since it was written and which nothing had
   ever drawn. `FrozenPhoto` draws NOTHING when the address cannot
   be painted, so the kind's own crest underneath it is the
   fallback rather than a broken glyph.
   ============================================================ */

function ModuleCard({ door, onPick }: { door: QuoteDoor; onPick: () => void }): ReactElement {
  return (
    <button
      type="button"
      className="qs-card k-lift"
      data-kind={door.kind}
      aria-label={`${door.name}, ${countSay(door)}`}
      onClick={onPick}
    >
      {/* THE BRAND'S MARK IS THE CARD, exactly as it is on the
          dashboard tiles, and `PlaceMark` is the one implementation
          of "what mark does this place get" — the dealer's upload,
          then the bundled brand mark, then nothing. The kind symbol
          is NOT the fallback here: this grid is coloured by kind
          already and the eyebrow says the category in words.

          The name is still in the markup and CSS hides it when a
          mark was really painted, so a mark that cannot be drawn
          leaves a named card rather than an empty one. */}
      <span className="qs-card-mark">
        <PlaceMark
          logo={door.module.logo}
          name={door.name}
          master={door.tables[0]}
          size={22}
          fallback="none"
        />
        <span className="qs-card-name">{door.name}</span>
      </span>
      <span className="qs-card-foot">
        <span className="qs-card-cat">{door.moduleName}</span>
        <span className="qs-card-n">{countSay(door)}</span>
      </span>
    </button>
  )
}

/* ============================================================
   A SHUT DOOR, AS A QUIET BAND RATHER THAN HALF THE LIST

   §6: "a refusal is a sentence with a reason, in the place where
   the thing is refused." Not a tooltip, not a greyed row, and
   never a door that opens onto an empty shelf.
   ============================================================ */

function ShutRow({
  door,
  onOpenPlace,
}: {
  door: QuoteDoor
  onOpenPlace?: (moduleId: string) => void
}): ReactElement {
  return (
    <li className="qs-shut-row s-held">
      <span className="qs-shut-name">{door.name}</span>
      <span className="qs-shut-why s-say">{door.refusal}</span>
      {onOpenPlace ? (
        <button
          type="button"
          className="qs-shut-go"
          onClick={() => onOpenPlace(door.moduleId)}
        >
          Open {door.name}
        </button>
      ) : null}
    </li>
  )
}

/** The whole panel, when a place that cannot quote is reached
 *  directly. It cannot happen from the grid — a shut door is a band
 *  and not a card — and it survives because a module's verbs can be
 *  switched off while this dialog is up. */
function Refusal({
  door,
  onOpenPlace,
}: {
  door: QuoteDoor
  onOpenPlace?: (moduleId: string) => void
}): ReactElement {
  return (
    <div className="qs-refusal">
      <p className="qs-refusal-why">{door.refusal}</p>
      {onOpenPlace ? (
        <button
          type="button"
          className="qs-refusal-go"
          onClick={() => onOpenPlace(door.moduleId)}
        >
          <span>Open {door.name}</span>
          <ArrowRight size={ICON_SIZE.small} weight="bold" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

/* ============================================================
   ONE ROW OF THE CATALOGUE — the thing being sold
   ============================================================ */

function SubjectRow({
  entry,
  entity,
  at,
  on,
  onPick,
  onTake,
}: {
  entry: IndexEntry
  entity: EntityDef | undefined
  at: number
  on: boolean
  onPick: () => void
  onTake: () => void
}): ReactElement {
  return (
    <li className="qs-row-slot" role="presentation">
      <button
        type="button"
        id={`qs-opt-${at}`}
        data-at={at}
        role="option"
        aria-selected={on}
        className={`qs-row${on ? ' is-on' : ''}`}
        onClick={onPick}
        onDoubleClick={onTake}
      >
        <span className="qs-row-pic" aria-hidden="true">
          {/* `FrozenPhoto` draws NOTHING when the address cannot be
              painted, so the well falls back to the kind's own mark. */}
          <TableKindSymbol kind={entity?.kind ?? 'custom'} size={16} />
          {entry.img ? (
            <FrozenPhoto
              img={entry.img}
              fallbackAlt={entry.label}
              className="qs-row-img"
              w={56}
              h={38}
            />
          ) : null}
        </span>
        <span className="qs-row-say">
          <span className="qs-row-name">{entry.label}</span>
          {entry.trail === '' ? null : <span className="qs-row-trail">{entry.trail}</span>}
        </span>
        <span className="qs-row-price">{entry.price}</span>
      </button>
    </li>
  )
}

/* ============================================================
   THE WALK THIS CHOICE BUYS — the bands, before they exist

   Not a progress bar and not a promise: every stop on it is a
   table this one is really related to, read from the view the
   quote will actually be minted from. A motor is shorter than a
   boat because a motor is joined to fewer things — there is no
   flag anywhere that says so.
   ============================================================ */

function Walk({ preview }: { preview: FlowPreview }): ReactElement {
  return (
    <div className="qs-walk">
      <ol className="qs-walk-stops">
        {preview.stops.map((stop) => (
          <li
            key={stop.id}
            className={`qs-walk-stop${stop.subject ? ' is-subject' : ''}${
              stop.handover ? ' is-end' : ''
            }`}
          >
            {stop.title}
          </li>
        ))}
      </ol>
      {preview.note === '' ? null : <p className="qs-walk-note">{preview.note}</p>}
    </div>
  )
}

/* ============================================================
   WHAT THE RULES ALREADY DECIDE — the solver, drawn

   ONLY THE CONTRADICTIONS ARE DRAWN HERE NOW. The panel used to
   print three channels and its own summary sentence on every
   highlight — sixty words, most often to say that nothing had
   happened, on a surface whose job is to let somebody pick a boat.
   `solve()` still runs and every channel still exists; what
   reaches this dialog is the one that is a REFUSAL, which is the
   one the prose budget always keeps. The narrowings are drawn
   where they act, on the band whose options they removed.
   ============================================================ */

function Verdict({ verdict }: { verdict: SubjectVerdict }): ReactElement {
  return (
    <div className="qs-verdict is-loud">
      <p className="qs-verdict-say">
        <Info size={ICON_SIZE.small} weight="fill" aria-hidden="true" />
        <span>{verdict.say}</span>
      </p>
      <ul className="qs-verdict-list">
        {verdict.problems.map((p) => (
          <li className="qs-verdict-item qs-verdict-item--stop" key={p}>
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}
