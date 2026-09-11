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

   ── THE CHOICE SURFACE — CONFIGURATOR_PLAYBOOK §3 ────────────

   Both layers are BANDS with a caption and a count, in one grammar.

   LAYER ONE. Eighteen cards in one undifferentiated grid is what §3
   asks against; `bandsOf` cuts the dealer's own order into runs of
   one kind — Boats 7 · Motors 2 · Packages 2 · Trailers 7 on the
   real sheet — and never moves a card. The caption sits in a left
   gutter, so four headings cost no vertical space.

   LAYER TWO. `OFFERED n of m` over the list, `HELD BACK n` under it
   where the catalogue really refused rows. The count that used to
   sit BELOW fifty rows is above them, phrased as the thing to do.

   SELECTION IS AN OUTLINE. Outlines take no part in layout, so
   nothing reflows when the highlight moves down 50 rows; hover is
   the same ring at `--accent-line` alpha, so hovering previews
   selection. That is Porsche's move and §3 calls it the cheapest
   legibility win in the corpus. The ring is the only thing that
   moves, and it does not move on the keyboard — see below.

   ── MOTION: THERE IS NONE ON OPEN, AND THAT IS THE RULE ──────

   The budget's one absolute is that a keyboard-initiated act is
   never animated, and this dialog is opened from a button on the
   rail — Enter or Space, every time, for anyone driving with the
   keyboard. It does not fade, rise or scale, and neither does the
   scrim: a scrim that fades IS the dialog animating on open under
   another name.

   AND THE SELECTION RING LANDS ON THE FRAME THE ARROW KEY DOES.
   §6 budgets 120ms for a selection ring arriving, and §1 says
   nothing keyboard-initiated animates; both are right, because they
   are about two different inputs. picker.css declares the transition
   on `:hover` alone, so a pointer gets the 120ms preview and a person
   holding ArrowDown through fifty rows gets no smear at all.

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
import { TABLE_KINDS } from '@/types/model'
import type { EntityDef, ModuleDef, RowData } from '@/types/model'
import { ICON_SIZE } from '@/lib/icons'
import { TableKindSymbol } from '@/features/tablekit'
/* THE DEALER'S OWN WORD FOR ONE HEADING — "series", "category",
   "section". Read rather than named so a group whose banner cell is
   empty can say what is missing in the dealer's own noun. Deep path,
   the same convention `HomeStage`, `TableStage` and `fitment` already
   use for this file. */
import { branchNoun } from '@/features/table/grouping'
import { useConstraints } from '@/features/constraints/constraintDefs'
import { createViewFor, useViewDefs } from '@/features/views/viewDefs'
import type { IndexEntry } from '@/features/modules/read'
/* WHAT A ROW SHARES WITH THE ROWS BESIDE IT — the reduction the
   option cards already use, applied to the list a hull is chosen
   from. */
import { splitOnSharedStem, type LabelParts } from './distinguish'
import {
  SEARCH_MIN,
  SUBJECT_CAP,
  catalogueOf,
  flowPreview,
  quoteDoors,
  subjectsIn,
  type FlowPreview,
  type QuoteDoor,
  type SubjectList,
} from './start'
import { placeRules, subjectVerdict, type SubjectVerdict } from './subjectRules'
import { unsellableSubject } from './freeze'
import { createQuoteFromView, unaddressedDraftFor } from './quotes'
import { quoteTotals } from './totals'
import { FlowFoot, FlowLine, RunningTotal } from './flow'
import { PlaceMark } from '@/features/modules/PlaceMark'
import { FrozenPhoto } from './photo'
/* THE PRIMITIVES. Every button, the place card, the shut rows and
   every uppercase caption on this screen are src/ui's, and the local
   rules that drew them are gone from picker.css — adopting a
   primitive is deleting the rule, because none of the five accepts a
   className to layer under. What picker.css still draws itself is
   the search combobox and the option row, and the reasons are on
   the rules. */
import { Button, Card, Row, SectionHead } from '@/ui'
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
  const bands = useMemo(() => bandsOf(open), [open])

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

      /* ── `/` PUTS THE CARET IN THE SEARCH, FROM ANYWHERE ─────────
         §1's first line about a dealer: speed over ceremony, and
         "every picker is type-ahead". Arrowing 50 rows to reach a
         hull whose model code they already know is the ceremony.
         Guarded on the field itself so typing a slash INTO the search
         is a slash, and nothing here animates — the caret lands on
         the frame the key does. */
      if (event.key === '/' && event.target !== findRef.current) {
        const el = findRef.current
        if (!el) return
        event.preventDefault()
        el.focus()
        el.select()
        return
      }

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
            /* THE STAGE'S OWN FIRST LINE, so it takes the step whose
               definition is exactly that — `.ds-hero`, "the first line
               of a stage that IS the page. ONE per stage." It wrote its
               own clamp until now (visual-qa finding 7); picker.css
               carries the measurement and the reasoning. */
            <h2 className="qs-q ds-hero" id="qs-q">
              What are you quoting?
            </h2>
          ) : (
            <div className="qs-here">
              <Button
                tone="neutral"
                onClick={() => setPlaceId(null)}
                aria-label="Back to the modules"
                title="Back to the modules (Esc)"
              >
                <ArrowLeft size={ICON_SIZE.small} weight="bold" aria-hidden="true" />
              </Button>
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
              {/* THE PLACE IS THE SUBJECT OF THIS LAYER, and
                  `.ds-display-xl` is the step the contract writes for
                  it — "a name that is one of SEVERAL and is the point
                  of the screen — a kind door, A MODULE PLACE, a band
                  head." One rung under the question it replaces,
                  because it shares its line with the arrow, the mark
                  and the count. It was `.qs-q--here`, a size-only
                  modifier that drew Archivo at 22px — the floor fault
                  §8.11 exists to prevent. */}
              <h2 className="qs-q ds-display-xl" id="qs-q">
                {door.name}
              </h2>
              <span className="qs-here-n">{countSay(door)}</span>
            </div>
          )}

          <Button
            tone="ghost"
            onClick={() => closeRef.current()}
            aria-label="Close without starting a quote"
            title="Close (Esc)"
          >
            <X size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          </Button>
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
                {/* ── FOUR BANDS, IN THE SHEET'S OWN ORDER ──────────
                    §3 asks a choice surface for group headings, and
                    eighteen ungrouped cards is the thing it asks
                    against: a dealer looking for a trailer reads all
                    eighteen. Measured on the real sheet — Boats 7,
                    Motors 2, Packages 2, Trailers 7 — and every kind
                    already arrives as one consecutive run, so
                    `bandsOf` CUTS the order rather than sorting it.
                    start.ts:186's rule holds untouched: nothing moves.

                    THE HEADING IS <SectionHead>, the system's one
                    uppercase style, with the count in the dealer's
                    noun and a hairline to the edge. It used to be a
                    local caption block in a 72px left gutter — a
                    gutter chosen to keep the shut band above the fold
                    at 1280x800, which the cards' new display-tier
                    names would have pushed below it anyway. The
                    band's cards wear the subject's step and the
                    heading sits above them, where a band head sits
                    everywhere else in this app. */}
                <ul className="qs-grid" aria-label="The places you can quote from">
                  {bands.map((b) => (
                    <li key={b.key} className="qs-band" role="presentation">
                      <SectionHead count={placesSay(b.doors.length)} rule>
                        {b.label}
                      </SectionHead>
                      <ul className="qs-band-grid" aria-label={b.label}>
                        {b.doors.map((d) => (
                          <li key={d.key} className="qs-cell">
                            <ModuleCard
                              door={d}
                              band={b.label}
                              onPick={() => setPlaceId(d.key)}
                            />
                          </li>
                        ))}
                      </ul>
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
                    {/* A BUTTON, SO ITS LABEL IS SENTENCE CASE. Rule 3
                        keeps uppercase for captions and stamps, and
                        this one wore `.mono-label` on a control. */}
                    <Button
                      tone="ghost"
                      size="sm"
                      aria-expanded={showShut}
                      onClick={() => setShowShut((v) => !v)}
                    >
                      <span className="qs-shut-cap">No quoting here yet</span>
                      <span className="qs-shut-n">{shut.length}</span>
                      <span className={`qs-shut-mark${showShut ? ' is-open' : ''}`} aria-hidden="true">
                        <CaretDown size={ICON_SIZE.tiny} weight="bold" />
                      </span>
                    </Button>
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
              {/* THE SHORTCUT IS RENDERED, WHICH IS HOW IT IS LEARNED.
                  `dense-tables-and-selection.md` marks it "adopt —
                  cheap": Superhuman prints the key beside the thing it
                  reaches, and a shortcut nobody can see is not a
                  feature. One glyph, and it goes when the field is
                  already the thing being typed into. */}
              <kbd className="qs-find-key" aria-hidden="true">
                /
              </kbd>
            </div>

            {/* ── THE BANDS, AND THE COUNT THAT WAS AT THE BOTTOM ────
                §3 wants the count on the band header, over the list.
                It was under it: "The first 50 of 588 are drawn. The
                search reaches every one of them." — 50 rows and one
                scroll away from the moment a person decides whether
                to scroll or to type, and phrased as a fact about the
                renderer rather than as something to do. §1's dealer
                knows the model number; this is the line that tells
                them typing it is the fast way, before they scroll. */}
            {list ? (
              <div className="qs-bands">
                <SectionHead count={offeredSay(list)} rule>
                  Offered
                </SectionHead>
                {list.hidden > 0 ? (
                  <p className="qs-band-say">
                    The first {SUBJECT_CAP} are drawn — type a model or a series to reach the
                    other {list.hidden.toLocaleString()}.
                  </p>
                ) : null}

                {/* ── AND WHAT THE CATALOGUE HELD BACK ───────────────
                    `buildEntries` refuses a discontinued row and every
                    row of a retired table, and until now it did it in
                    silence — the one thing §5 forbids outright ("never
                    hide; count and attribute the removal"). The census
                    already counted them. On the Northside sheet this
                    is 0 for all eighteen open places, so it draws on
                    none of them; a sheet that retires a hull gets the
                    number rather than a shorter list. */}
                {door.census.held > 0 ? (
                  <>
                    <SectionHead count={door.census.held.toLocaleString()} rule>
                      Held back
                    </SectionHead>
                    <p className="qs-band-say">
                      No longer sold. They stay on the sheet so the quotes already written against
                      them still open, and none of them is drawn here.
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}

            {/* THE COUNT, FOR A READER WHO CANNOT SEE THE BAND. §3:
                "Result count announced in an sr-only live region." The
                visible form is two figures and a rule between them,
                which is a shape rather than a sentence. */}
            <p className="qs-said" role="status" aria-live="polite">
              {list && !list.waiting && query.trim() !== ''
                ? `${list.matched.length.toLocaleString()} of ${list.all.length.toLocaleString()} in ${door.name} match “${query.trim()}”.`
                : ''}
            </p>

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
              {list?.sections.map((sec) => {
                /* ── THE TABLE'S NAME IS ALREADY THE HEADING ────────
                   Measured on the real sheet: every one of the
                   eighteen open places holds exactly ONE table, so
                   this sticky bar printed the same string as the 30px
                   `<h2>` forty pixels above it — the duplicated eyebrow
                   `5d00103` was written to end, in a second place. It
                   is drawn only where a place really spans two tables
                   and the bar is telling you which one you are in. */
                const named = (list?.sections.length ?? 0) > 1
                const word = branchNoun(entities[sec.tableId])
                return (
                  <div
                    className={`qs-sec${named ? ' qs-sec--named' : ''}`}
                    key={sec.tableId}
                    role="group"
                    aria-label={sec.name}
                  >
                    {named ? (
                      <div className="qs-sec-head" role="presentation">
                        <span className="qs-sec-name">{sec.name}</span>
                        <span className="qs-sec-count">{sec.count}</span>
                      </div>
                    ) : null}
                    {sec.groups.map((grp) => {
                      /* A HEADING THE FILE DOES NOT CARRY IS A FACT,
                         not an absence. Stabicraft ships one live
                         model whose banner cell is empty and it
                         floated, unheaded, above "Fisher Series" —
                         indistinguishable from a table that declares
                         no grouping at all. §3's third band is exactly
                         this state, and the word is the dealer's own
                         column heading rather than one chosen here. */
                      const head =
                        grp.trail !== ''
                          ? grp.trail
                          : sec.groups.length > 1 && word
                            ? `Not filed under a ${word.one}`
                            : ''
                      return (
                        <div className="qs-grp" key={grp.key} role="presentation">
                          {head === '' ? null : (
                            <p className="qs-grp-head" role="presentation">
                              {/* THE HEADING KEEPS ITS OWN CASE. It was
                                  `.mono-label`, which uppercases, and
                                  the string is a NAME off the price
                                  file — "Classic ▸ CL260" came out
                                  "CLASSIC ▸ CL260". Rule 3 and
                                  DESIGN_CONTRACT §11: uppercase is a
                                  label style, never a name style, and
                                  it is lossy — some of these headings
                                  ("ASSAULT PROS") really are shouted
                                  on the sheet and some are not, and
                                  after the transform a dealer cannot
                                  tell which. */}
                              <span className="qs-grp-trail">{head}</span>
                              <span className="qs-grp-n">{grp.entries.length}</span>
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
                                  /* WHAT THIS ROW SHARES WITH ITS
                                     SIBLINGS AND WHAT IT DOES NOT,
                                     computed over the GROUP — which
                                     is the set a person is actually
                                     choosing between. */
                                  parts={splitOnSharedStem(
                                    grp.entries.map((e) => e.label),
                                    grp.entries.indexOf(entry),
                                  )}
                                  at={at}
                                  on={at === hi}
                                  titled={grp.trail !== ''}
                                  pictured={door.census.pictured > 0}
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
                      )
                    })}
                  </div>
                )
              })}
            </div>
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
                  {/* THE PRICE CAME OFF THIS STRIP, AND THEN SO DID
                      THE NAME.

                      The price went first, and the note is worth
                      keeping: it sat on the right of the name at
                      `--t-mono-lg-size`, and 60px lower — the moment
                      the quote existed — the same number was on the
                      build screen's bar at clamp(22px, 1.9vw, 30px)
                      on the LEFT. One figure, two sizes, two places.

                      THE NAME IS THE SAME FAULT ONE STEP ON. It was a
                      20px title, and `FlowLine at="choose"` fifty
                      pixels under it already prints the chosen row's
                      label — the flow's own permanent statement of the
                      answer, in the identical slot on the two screens
                      that follow. Three statements of one string on
                      one screen (the outlined row, this, the flow
                      line) is the duplicated-eyebrow fault `5d00103`
                      was written to end, and this one cost 56px of
                      the list: measured at 1280x800, the list showed
                      five of 588 boats with this block in and eight
                      without it. A choice surface that can show five
                      rows is not a choice surface. */}
                  <Walk preview={preview} />

                  {verdict === null || verdict.problems.length === 0 ? null : (
                    <Verdict verdict={verdict} />
                  )}

                  {barred === '' ? null : (
                    <div className="qs-hold s-warned">
                      <p className="qs-hold-say">
                        <Warning size={ICON_SIZE.small} weight="fill" aria-hidden="true" />
                        <span>{barred}</span>
                      </p>
                    </div>
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
                        ? /* THE FACT IS IN THE FIGURE SLOT NOW, so this
                             one goes quiet rather than saying the same
                             thing a second time. */
                          ''
                        : /* NOT "THE BOAT". Measured on the sheet: this
                             line sat under $1,999 on ePropulsion
                             Outboards and called an electric outboard
                             a boat, and it would call a trailer one
                             too. §6 asks for the dealer's own noun,
                             and the honest answer where the noun
                             changes per place is to use none — the
                             figure above it is already the row's, and
                             the clause that carries the meaning is the
                             second half. */
                          'before anything is added'
                  }
                  nil="nothing highlighted yet"
                />
                {chosen === undefined || barred !== '' ? null : (
                  <>
                    {/* THE ACT SAYS WHICH ACT IT IS. A button reading
                        "Start the quote" that opens a document made
                        twenty minutes ago is a lie about what just
                        happened, and the person would have to read the
                        reference to notice. */}
                    {/* `.qb-price-act` is build.css's — the position of
                        "whatever the screen's own last act is" on the
                        bar it owns — and it sits on the group, because
                        a Button takes no className of its own. */}
                    <span className="qs-acts qb-price-act">
                      <Button tone="primary" size="lg" onClick={() => start(false)}>
                        {standing ? 'Back to the quote you started' : 'Start the quote'}
                        <ArrowRight size={ICON_SIZE.small} weight="bold" aria-hidden="true" />
                      </Button>
                      {/* AND THE OTHER ONE STAYS POSSIBLE. Two quotes for
                          one hull to two customers is an ordinary
                          Tuesday; the draft is only offered back while
                          NOBODY is named on it (see `unaddressedDraftFor`),
                          so this is the door out of that one case. */}
                      {standing ? (
                        <Button tone="neutral" size="lg" onClick={() => start(true)}>
                          Start another
                        </Button>
                      ) : null}
                    </span>
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

/** A band head's count, in the noun the list's own label uses —
 *  "The places you can quote from". §6: a figure with a noun, never
 *  a bare number beside a caption. */
const placesSay = (n: number): string => `${n} ${n === 1 ? 'place' : 'places'}`

/* ============================================================
   THE BANDS OF LAYER ONE — a CUT of the order, never a sort.

   `quoteDoors` hands back the dealer's own dashboard order and
   start.ts:186 is explicit that re-ranking it would be "a second
   opinion about where a dealer's own places live". So this walks
   that order once and closes a band whenever the kind changes: on
   the Northside sheet that yields Boats 7 · Motors 2 · Packages 2 ·
   Trailers 7, because each module is one kind and every kind
   already arrives as one run. A sheet that interleaves kinds gets
   more bands — never a moved card.
   ============================================================ */

interface DoorBand {
  key: string
  /** the kind's own label — "Boats", "Trailers" */
  label: string
  doors: QuoteDoor[]
}

function bandsOf(open: readonly QuoteDoor[]): DoorBand[] {
  const bands: DoorBand[] = []
  for (const door of open) {
    const label = TABLE_KINDS[door.kind].label
    const last = bands[bands.length - 1]
    if (last && last.label === label) last.doors.push(door)
    else bands.push({ key: `${door.kind}-${bands.length}`, label, doors: [door] })
  }
  return bands
}

/** §3's group-heading figure: what survives narrowing over what the
 *  place holds. One number when nothing is narrowing it, because
 *  "588 of 588" is a fraction pretending to be news. */
const offeredSay = (list: SubjectList): string =>
  list.matched.length === list.all.length
    ? list.all.length.toLocaleString()
    : `${list.matched.length.toLocaleString()} of ${list.all.length.toLocaleString()}`

/* ============================================================
   ONE MODULE — a small card: the logo, the name, the count.

   The logo is `ModuleDef.logo`, which `features/modules/logo.ts`
   has been able to hold since it was written and which nothing had
   ever drawn. `FrozenPhoto` draws NOTHING when the address cannot
   be painted, so the kind's own crest underneath it is the
   fallback rather than a broken glyph.
   ============================================================ */

function ModuleCard({
  door,
  band,
  onPick,
}: {
  door: QuoteDoor
  /** the caption of the band this card sits under, so the card never
   *  repeats it */
  band: string
  onPick: () => void
}): ReactElement {
  /* ── THE EYEBROW, AND IT IS USUALLY NOTHING NOW ────────────────
     §1a asks a card for "a name and ONE fact", and this had two —
     the count, and a category that the band caption above it now
     states once for every card under it. Measured on the real
     sheet: sixteen of eighteen cards printed a word already on
     screen ("Boats", "Motors", "Trailers"); the two Jeanneau and
     Haines factory-package cards keep theirs, because the module is
     called Factory Packages and the band is called Packages, and
     that difference is a real fact about the dealer's sheet.

     The second test is the one the dashboard tile already makes
     (CardBody.tsx:704) and this card never did: where the place IS
     the module, the eyebrow would print the heading a second time
     sixty pixels under the first. picker.test.tsx:240 records that
     fault against the fixture's `Road Gear` and says the fix
     belongs here. It is here. */
  const cat = door.moduleName === band || door.moduleName === door.name ? '' : door.moduleName
  /* THE CARD IS <Card>. Its kind arrives as `data-kind`, which ds.css
     resolves to `--kind` and card.css draws as a 6% ground and a 14%
     border — the tint the module tile already measured at 4.5:1 for
     a name on it. The 3px kind rail and the `.k-lift` hover glow went
     with the local `.qs-card` rule: a Card takes no className, so
     there is nothing to layer them under, and the primitive's own
     hover, press, focus ring and button semantics are the card's. */
  return (
    <Card kind={door.kind} onActivate={onPick} label={`${door.name}, ${countSay(door)}`}>
      {/* THE NAME IS THE SUBJECT OF THIS SCREEN and wears the display
          tier — `.ds-display-xl`, the step ds.css writes for "a name
          that is one of SEVERAL and is the point of the screen — a
          kind door, A MODULE PLACE". The question above the grid is
          `.ds-hero`, one per stage; the chrome around both is 11–12px.
          picker.css derives the grid's column floor from the step's
          own size token so a one-word name never runs out of cell.

          THE BRAND'S MARK IS THE FACE WHEN THERE IS ONE, exactly as
          on the dashboard tiles, and `PlaceMark` is the one
          implementation of "what mark does this place get" — the
          dealer's upload, then the bundled brand mark, then nothing.
          The name is always in the markup; CSS hides it only when a
          mark was really painted, so a mark that cannot be drawn
          leaves a named card rather than an empty one. */}
      <span className="qs-card-face">
        <span className="qs-card-mark">
          <PlaceMark
            logo={door.module.logo}
            name={door.name}
            master={door.tables[0]}
            size={22}
            fallback="none"
          />
        </span>
        <span className="qs-card-name ds-display-xl">{door.name}</span>
      </span>
      {/* THE COUNT IS FIRST, so the figure lands at the same x on
          every card in the band whether or not that card carries a
          second word. A column of counts that jogs sideways on two
          cards out of eighteen is the sort of thing nobody names and
          everybody feels. */}
      <span className="qs-card-foot">
        <span className="qs-card-n">{countSay(door)}</span>
        {cat === '' ? null : <span className="qs-card-cat">{cat}</span>}
      </span>
    </Card>
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
  /* A <Row>: the place is the name, the refusal is the metadata
     beside it, and the door out is a Button in the trail — a still
     row, because a row with its own control cannot also be a target. */
  return (
    <li>
      <Row
        name={door.name}
        meta={door.refusal}
        trail={
          onOpenPlace ? (
            <Button size="sm" tone="neutral" onClick={() => onOpenPlace(door.moduleId)}>
              Open {door.name}
            </Button>
          ) : undefined
        }
      />
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
        <Button tone="neutral" onClick={() => onOpenPlace(door.moduleId)}>
          Open {door.name}
          <ArrowRight size={ICON_SIZE.small} weight="bold" aria-hidden="true" />
        </Button>
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
  parts,
  at,
  on,
  titled,
  pictured,
  onPick,
  onTake,
}: {
  entry: IndexEntry
  entity: EntityDef | undefined
  /** the label cut into what the siblings share and what this row
   *  is. Both are printed; only the weight differs. */
  parts: LabelParts
  at: number
  on: boolean
  /** Does the group above this row already print its trail? When it
   *  does, the row must not print it again — see below. */
  titled: boolean
  /** DOES THIS PLACE HOLD A PICTURE AT ALL? Read off the census, not
   *  off this row: a well drawn for a row whose neighbours have
   *  photographs is a fallback, and a well drawn on a table where
   *  nothing has one is 32 identical grey squares down the left of a
   *  list. Measured — ePropulsion Outboards is the one place on the
   *  sheet with `pictured: 0`, and its rows go from 54px to 40px
   *  with the column gone. */
  pictured: boolean
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
        /* §3: "The accessible name carries the price." One utterance
           with the name, where it sits and what it costs, instead of
           three nodes read in DOM order.

           THE TRAIL DROPS OUT ON THE SAME TEST THE VISIBLE ONE DOES.
           Measured in the accessibility tree: under a titled group
           every option read "Adventure ▸ ADV7. Highfield - ADV7 (HYP)
           B-G-B. $105,930" — the heading's own words, again, on all
           seven rows beneath it. What the eye is spared the ear
           should be spared too. */
        aria-label={[titled ? '' : entry.trail, entry.label, entry.price]
          .filter((s) => s !== '')
          .join('. ')}
        className={`qs-row${pictured ? '' : ' qs-row--flat'}${on ? ' is-on' : ''}`}
        onClick={onPick}
        onDoubleClick={onTake}
      >
        {pictured ? (
          <span className="qs-row-pic" aria-hidden="true">
            {/* `FrozenPhoto` draws NOTHING when the address cannot be
                painted, so the well falls back to the kind's own mark. */}
            <TableKindSymbol kind={entity?.kind ?? 'custom'} size={16} />
            {entry.img ? (
              <FrozenPhoto
                img={entry.img}
                fallbackAlt={entry.label}
                className="qs-row-img"
                /* THE PICTURE IS THE IDENTIFIER, so it is worth room.
                   44x30 was a favicon of a boat on the screen where
                   somebody picks between a $2,770 Roll-Up and a
                   $129,830 Sport, and the label alone —
                   "CL400 (PVC) DG-G-DG" — does not tell them apart. */
                w={72}
                h={48}
              />
            ) : null}
          </span>
        ) : null}
        <span className="qs-row-say">
          {/* THE NAME, WITH THE EYE SENT TO WHAT DIFFERS.

              Measured: seven hulls under "Adventure ▸ ADV7" whose
              names agree for twenty-two of twenty-eight characters,
              at one identical price, with the six that differ LAST —
              past where the eye stops on a scan. A person choosing a
              $105,930 boat was reading the same string seven times.

              NOTHING IS REMOVED. The full name is what a salesperson
              reads back to a customer, so the stem stays and changes
              WEIGHT: the shared part quiet, this row's own part in
              ink. `splitOnSharedStem` hands back an empty stem
              wherever the reduction would not be honest — one
              sibling, a one-word stem, a tail that would be empty —
              and then this is exactly what it was. */}
          <span className="qs-row-name">
            {parts.stem === '' ? null : <span className="qs-row-stem">{parts.stem} </span>}
            {parts.tail}
          </span>
          {/* THE TRAIL, AND ONLY WHERE IT HAS NOT JUST BEEN SAID.
              Groups are cut BY the trail, so a row inside a titled
              group carries the heading's own words by construction —
              "CLASSIC ▸ CL400" as the heading and "Classic ▸ CL400"
              under each of the rows beneath it. With the model code
              in the label as well, `CL400` appeared four times in
              three lines. A flat table has no heading and keeps it. */}
          {entry.trail === '' || titled ? null : (
            <span className="qs-row-trail">{entry.trail}</span>
          )}
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
    <div className="qs-hold s-warned">
      <p className="qs-hold-say">
        <Info size={ICON_SIZE.small} weight="fill" aria-hidden="true" />
        <span>{verdict.say}</span>
      </p>
      <ul className="qs-hold-list">
        {verdict.problems.map((p) => (
          <li className="qs-hold-item" key={p}>
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}
