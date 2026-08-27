/* ============================================================
   WHAT ARE YOU QUOTING — the door "New quote" opens.

   ── WHY THERE IS A DIALOG HERE AT ALL ────────────────────────

   A quote in this app cannot be empty. `createQuoteFromView(viewId,
   rowId)` mints one FROM THE ROW BEING SOLD — one rig, one customer,
   one moment — so "New quote" has nothing to create until somebody
   has said WHAT. The rail's primary act used to open the finder,
   which is a good answer to "find me a row" and the wrong answer to
   "what am I selling": the finder ranks 15,691 rows of fifty-one
   tables by name, so the first thing a salesperson meets is a
   registration fee band and a labour rate beside the hull they meant.

   The right first question is the one the business already answers
   for itself. A MODULE is a place in the business, made by the person
   who runs it, and it declares in its own settings whether a price
   may be raised there. So:

     LAYER ONE   the places — nine of them on the real sheet, four of
                 which declare Quote and five of which do not.
     LAYER TWO   what that place holds, cut by table and by the
                 table's own banner column, down to the row.

   Both layers are on screen at once rather than one behind the other.
   A person changing their mind about the place should not have to
   press Back to do it, and a two-pane picker is one press from any
   row in any place at any time.

   ── THE THREE THINGS THAT MAKE THIS BETTER THAN WHAT IT STUDIED ──

   1 · A SHUT DOOR SAYS WHY, AND IS STILL DRAWN. Labour Rates, Oils &
       Consumables and Registration Costs are real places a dealer
       made, and none of them can raise a price — the first two
       declare only Browse and Search. Dropping them would teach a
       person that their own modules are not really the shape of this
       app; drawing them dead with no explanation is the "disabled
       control with no reason" §6 forbids. Each one carries the
       sentence that names the switch, and a door to the settings
       where the switch is. `start.ts` computes every refusal.

   2 · THE WALK IS SHOWN BEFORE IT IS TAKEN. A quote's steps are its
       view's blocks, so what you are quoting decides which steps
       exist: a Highfield hull opens Boat · Motors · Trailers · Dealer
       Fit · Who it is for, and a Yamaha opens its own shorter walk.
       That is knowable from the same relationships that will build
       it, so the footer draws the stops for the highlighted row
       before a document exists. Nothing is created to draw it.

   3 · THE CONSTRAINT SOLVER ANSWERS FIRST. `src/lib/configure` has
       been able to say what a choice already decides — and why an
       option is gone — since it was written, and nothing had ever
       called it. `subjectRules.ts` is the first caller and this is
       where it is drawn: what this row rules out downstream, what
       disagrees with it, and what contradicts it, each in the rule's
       own `because`. Where the reference silently omits, this says.

   ── MOTION: THERE IS NONE ON OPEN, AND THAT IS THE RULE ──────

   The motion budget's one absolute is that a keyboard-initiated act
   is never animated, and this dialog is opened from a button on the
   rail — Enter or Space, every time, for anyone driving with the
   keyboard. So it does not fade, does not rise and does not scale.
   The scrim does not fade either: a scrim that fades IS the dialog
   animating on open, wearing a different name.

   What moves is feedback and nothing else: hover, press on
   pointer-down, and focus, all from `ds.css`'s durations. A list row
   DARKENS rather than scaling, so its neighbours never look like
   they moved.

   ── WHAT IT MAY NOT DO ───────────────────────────────────────

   IT DOES NOT READ THE PROJECT STORE. `@/features/quote` makes one
   claim a reviewer can check in a single grep — `useProjectStore`
   appears in `freeze.ts` and nowhere else in this feature — and a
   picker is not an exception worth spending it on. The sheet arrives
   as props from the shell, which is already reading all three of
   them for the rail. The two live reads that do touch the store are
   `unsellableSubject` and `createQuoteFromView`, both of which live
   in this feature's own store-facing files and are called the way
   everything there is called: from an event, or once, about one row.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Info, MagnifyingGlass, Warning, X } from '@phosphor-icons/react'
import {
  accentVar,
  type EntityDef,
  type ModuleDef,
  type RowData,
} from '@/types/model'
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
import { createQuoteFromView } from './quotes'
import { FrozenPhoto } from './photo'
import './picker.css'

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

export interface QuoteStartProps {
  /** the sheet, handed over rather than read — see the header */
  modules: Record<string, ModuleDef>
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
  /** a quote was minted, and the shell opens it */
  onStarted: (quoteId: string) => void
  /** open a place's own page — the door under every refusal, and the
   *  way to the settings that would clear it. Absent = the refusal is
   *  still SAID and not offered as a door, so this works anywhere. */
  onOpenPlace?: (moduleId: string) => void
  onClose: () => void
}

export function QuoteStart({
  modules,
  entities,
  rowsByEntity,
  onStarted,
  onOpenPlace,
  onClose,
}: QuoteStartProps): ReactElement | null {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const findRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  /* THE PLACES, IN THE DASHBOARD'S OWN ORDER, each with the reason it
     cannot start a quote or '' when it can. */
  const doors = useMemo(
    () => quoteDoors(modules, entities, rowsByEntity),
    [modules, entities, rowsByEntity],
  )
  const open = useMemo(() => doors.filter((d) => d.refusal === ''), [doors])

  /* WHERE IT OPENS. On the first place that can actually raise a
     price — never on a shut one, because a picker whose first screen
     is a refusal reads as an app that is broken rather than as a
     module that is configured for something else. */
  const [placeId, setPlaceId] = useState<string | null>(
    () => (open[0] ?? doors[0])?.moduleId ?? null,
  )
  const door = doors.find((d) => d.moduleId === placeId) ?? null

  /* a place struck from the sheet while this is up must not leave the
     right-hand pane pointing at nothing */
  useEffect(() => {
    if (placeId !== null && doors.some((d) => d.moduleId === placeId)) return
    setPlaceId((open[0] ?? doors[0])?.moduleId ?? null)
  }, [doors, open, placeId])

  const [query, setQuery] = useState('')
  const [hi, setHi] = useState(-1)

  /* the search belongs to the place it is searching: walking to the
     trailers with "yamaha" still typed is a narrowing nobody asked
     for, and it is the same rule the build's own step search keeps */
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

  /* THE HIGHLIGHT IS THE CHOICE. One cursor, moved by the arrows and
     set by a press, and the footer reads it — so the walk and the
     verdict under the list are always about the row a person is
     looking at, and Enter never starts a quote for something else. */
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

  /* THE RULES OF THE PLACE, resolved once per place rather than once
     per press of the down arrow — `buildConcepts` walks every column
     of all fifty-one tables and its answer does not change with the
     row. See `placeRules`. */
  const rules = useMemo(
    () => (door && door.refusal === '' ? placeRules(door.module, entities, constraints) : null),
    [door, entities, constraints],
  )

  const verdict: SubjectVerdict | null = useMemo(
    () =>
      rules && chosenEntity && chosenRow
        ? subjectVerdict(rules, chosenEntity, chosenRow)
        : null,
    [rules, chosenEntity, chosenRow],
  )

  /* THE LAST GATE, AND IT IS A LIVE READ ABOUT ONE ROW. The list has
     already refused every discontinued row and every retired table;
     this is the same sentence the view stage draws instead of "Quote
     this one", asked here so the two surfaces refuse identically. */
  const barred = chosen ? unsellableSubject(chosen.tableId, chosen.rowId) : ''

  /* ---------------------------------------------------------- */
  /* Starting one                                                */
  /* ---------------------------------------------------------- */

  const start = useCallback(() => {
    if (!chosen || barred !== '') return
    /* THE VIEW IS RESOLVED AT THE MOMENT OF THE PRESS, not while the
       list is being drawn. `createViewFor` is idempotent — asking
       twice for the same table hands back the same page — and it
       creates no table, no column and no join, so nothing about the
       sheet changes because somebody arrowed down a list. Structure
       is never a side effect (§7); a page for a table a person has
       just asked to sell is not structure. */
    const view = createViewFor(chosen.tableId)
    const made = createQuoteFromView(view.id, chosen.rowId)
    if (!made) return
    closeRef.current()
    onStarted(made.id)
  }, [chosen, barred, onStarted])

  /* ---------------------------------------------------------- */
  /* The keyboard                                                */
  /* ---------------------------------------------------------- */

  /* THE CARET LANDS IN THE SEARCH, because that is what a person who
     pressed New quote is about to do — and it lands there again when
     the place changes, so switching from Boats to Motors leaves the
     keyboard where the next word is going to be typed rather than on
     the place button that was pressed. */
  useEffect(() => {
    findRef.current?.focus()
  }, [placeId])

  /* FOCUS GOES INTO THE PANEL AND COMES BACK OUT TO WHATEVER OPENED
     IT — and for a while it did not, because this read
     `document.activeElement` from inside an effect. Effects run in
     declaration order, so the autofocus above had ALREADY put the
     caret in the search field by the time this one looked: what it
     captured as "whatever opened it" was `.qs-find-in`, a control
     inside the panel it was about to unmount. Closing therefore
     focused a detached node and the keyboard landed on `document.body`
     — measured: press New quote, press Escape, activeElement is BODY,
     and the next Tab starts again at the top of the rail.

     A ref initialised during RENDER is read before any effect of this
     component or its children has run, which is the only moment the
     trigger is still the active element. */
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

  /* THE HIGHLIGHTED ROW IS SCROLLED TO WITHOUT SMOOTHING. It lands on
     the same frame as the keypress — the motion budget's one
     absolute — and `block: 'nearest'` keeps a mouse-driven list still. */
  useEffect(() => {
    if (hi < 0) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-at="${hi}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [hi])

  /* THE PANEL OWNS THE KEYBOARD WHILE IT IS UP. Escape closes it, Tab
     cycles inside it, and Delete/Backspace never reach the canvas's
     own window listener — the whiteboard is still mounted underneath
     and a Backspace there offers to delete the selected table.

     THE ARROWS ARE NOT REFUSED IN THE SEARCH FIELD, and that is the
     one place this differs from the build's own shortcuts. There, an
     arrow key belongs to the caret because the field is beside a
     shelf; here the field IS the control for the list under it — the
     combobox every search box on the web behaves like — so Down from
     the caret walks the rows and Enter takes the highlighted one. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const root = rootRef.current
      if (!root) return
      const inside = event.target instanceof Node && root.contains(event.target)

      if (event.key === 'Tab') {
        if (!inside && document.activeElement !== document.body) return
        const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (!active || !root.contains(active)) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
        event.stopPropagation()
        return
      }

      if (!inside) return

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
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
        /* ENTER BELONGS TO THE SEARCH FIELD AND TO NOTHING ELSE HERE.
           This is the combobox half of the pattern: Down walks the
           rows, Enter takes the one that is highlighted. EVERY BUTTON
           ON THIS DIALOG IS ITS OWN JOB — the first version tested
           only for a place button, which meant Enter on CLOSE started
           a quote instead of closing, and Enter on "Open Labour Rates"
           did the same. A control that does something other than what
           it says is worse than one that does nothing. */
        if (event.target !== findRef.current) return
        if (hi < 0) return
        event.preventDefault()
        start()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [shown.length, hi, start])

  if (typeof document === 'undefined') return null

  /* ---------------------------------------------------------- */

  return createPortal(
    <div
      className="qs-overlay"
      ref={overlayRef}
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) closeRef.current()
      }}
    >
      {/* NO FADE. See §MOTION in this file's header — a scrim that
          fades is the dialog animating on open under another name,
          and this dialog is opened from a key. */}
      <div className="qs-scrim" aria-hidden="true" />

      <div
        className="qs-dialog"
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qs-q"
      >
        <header className="qs-head">
          <div className="qs-head-top">
            <span className="mono-label qs-eyebrow">New quote</span>
            <button
              type="button"
              className="qs-close"
              onClick={() => closeRef.current()}
              aria-label="Close without starting a quote"
              title="Close (Esc)"
            >
              <X size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <h2 className="ds-display-lg qs-q" id="qs-q">
            What are you quoting?
          </h2>
          <p className="qs-sub">
            A quote is made from the row being sold, so it starts with a thing rather than
            with a blank page. Choose the place, then the one.
          </p>
        </header>

        <div className="qs-body">
          {/* ── LAYER ONE ───────────────────────────────────── */}
          <aside className="qs-places" aria-label="The places in your business">
            {doors.length === 0 ? (
              <p className="qs-places-none">
                There are no places in this business yet. A module is what turns a table
                into somewhere you can sell from — make one, and everything in it can
                start a quote.
              </p>
            ) : (
              <ul className="qs-place-list">
                {doors.map((d) => (
                  <PlaceRow
                    key={d.moduleId}
                    door={d}
                    on={d.moduleId === placeId}
                    onPick={() => setPlaceId(d.moduleId)}
                  />
                ))}
              </ul>
            )}
            {doors.length > 0 ? (
              <p className="qs-places-foot">
                {open.length === 0
                  ? 'No place here raises a price yet.'
                  : `${open.length} of ${doors.length} ${
                      doors.length === 1 ? 'place' : 'places'
                    } can start a quote.`}
              </p>
            ) : null}
          </aside>

          {/* ── LAYER TWO ───────────────────────────────────── */}
          <section className="qs-hold" aria-label="What this place holds">
            {door === null ? (
              <p className="qs-void">Choose a place on the left.</p>
            ) : door.refusal !== '' ? (
              <Refusal door={door} onOpenPlace={onOpenPlace} />
            ) : (
              <>
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
                  <span className="qs-find-count">{door.say}</span>
                </div>

                {list && list.waiting ? (
                  <p className="qs-note">
                    {door.name} holds {list.all.length}. Type {SEARCH_MIN} letters and the
                    whole of it is searched — one letter narrows nothing worth drawing.
                  </p>
                ) : null}

                {list && !list.waiting && list.matched.length === 0 ? (
                  <p className="qs-note">
                    Nothing in {door.name} answers to “{query.trim()}”. The search runs
                    over every one of the {list.all.length} it holds, and over the headings
                    they sit under.
                  </p>
                ) : null}

                <div className="qs-list" id="qs-list" role="listbox" ref={listRef} tabIndex={-1}>
                  {/* A LISTBOX MAY ONLY CONTAIN OPTIONS AND GROUPS. The
                      table is a `group` with its own name; everything
                      between it and a row — the banner, the two
                      wrappers and the `li` — is presentational, so a
                      screen reader hears fifty options under four
                      named groups rather than a tree of divs. */}
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
                                    start()
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
                    The first {SUBJECT_CAP} of {list.matched.length} are drawn. Type a word
                    above to reach the rest — the search runs over the whole place, not
                    over what is on screen.
                  </p>
                ) : null}
              </>
            )}
          </section>
        </div>

        {/* ── THE FOOTER: WHAT THIS CHOICE BUYS ─────────────── */}
        <footer className="qs-foot">
          {chosen === undefined || preview === null ? (
            <p className="qs-foot-hint">
              Highlight one and this says what the quote will walk through, and what the
              rules of the business already decide about it.
            </p>
          ) : (
            <>
              <div className="qs-picked">
                <span className="qs-picked-say">
                  {chosen.trail === '' ? null : (
                    <span className="qs-picked-trail">{chosen.trail}</span>
                  )}
                  <span className="qs-picked-name">{chosen.label}</span>
                </span>
                {chosen.price === '' ? (
                  <span className="qs-picked-nil">no price on this one</span>
                ) : (
                  <span className="qs-picked-price">{chosen.price}</span>
                )}
              </div>

              <Walk preview={preview} />

              {verdict === null ? null : <Verdict verdict={verdict} />}

              {barred === '' ? (
                <button type="button" className="qs-go" onClick={start}>
                  <span className="qs-go-lab mono-label">Start the quote</span>
                  <span className="qs-go-name">{chosen.label}</span>
                  <ArrowRight size={ICON_SIZE.small} weight="bold" aria-hidden="true" />
                </button>
              ) : (
                <p className="qs-barred">
                  <Warning size={ICON_SIZE.small} weight="fill" aria-hidden="true" />
                  <span>{barred}</span>
                </p>
              )}
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  )
}

/* ============================================================
   ONE PLACE — a door, open or shut, and never merely absent
   ============================================================ */

function PlaceRow({
  door,
  on,
  onPick,
}: {
  door: QuoteDoor
  on: boolean
  onPick: () => void
}): ReactElement {
  const shut = door.refusal !== ''
  const style = { '--qs-mark': accentVar(door.module.accent) } as CSSProperties
  return (
    <li className="qs-place-slot">
      <button
        type="button"
        className={`qs-place${on ? ' is-on' : ''}${shut ? ' is-shut' : ''}`}
        style={style}
        aria-current={on ? 'true' : undefined}
        aria-label={
          shut ? `${door.name} — ${door.refusal}` : `${door.name}, ${door.say}`
        }
        onClick={onPick}
      >
        <span className="qs-place-mark" aria-hidden="true">
          {door.module.logo ? (
            <FrozenPhoto
              img={door.module.logo}
              fallbackAlt={door.name}
              className="qs-place-logo"
              w={28}
              h={28}
            />
          ) : null}
          <TableKindSymbol kind={door.kind} size={18} />
        </span>
        <span className="qs-place-say">
          <span className="qs-place-name">{door.name}</span>
          <span className="qs-place-census">{door.say}</span>
        </span>
        {shut ? <span className="mono-label qs-place-shut">no quoting</span> : null}
      </button>
    </li>
  )
}

/* ============================================================
   A SHUT DOOR, WITH THE REASON AND THE CONTROL THAT CLEARS IT

   §6: "a refusal is a sentence with a reason, in the place where the
   thing is refused." Not a tooltip, not a greyed row, and never a
   door that opens onto an empty shelf.
   ============================================================ */

function Refusal({
  door,
  onOpenPlace,
}: {
  door: QuoteDoor
  onOpenPlace?: (moduleId: string) => void
}): ReactElement {
  return (
    <div className="qs-refusal">
      <span className="mono-label qs-refusal-eyebrow">Not a place to raise a price</span>
      <h3 className="qs-refusal-name">{door.name}</h3>
      <p className="qs-refusal-why">{door.refusal}</p>
      {door.description === '' ? null : (
        <p className="qs-refusal-desc">{door.description}</p>
      )}
      <p className="qs-refusal-count">{door.say}</p>
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
              painted — no broken glyph, no hatched box — so the well
              falls back to the kind's own mark underneath it. */}
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
   THE WALK THIS CHOICE BUYS — the flow, adapting, before it runs

   Not a progress bar and not a promise: every stop on it is a table
   this one is really related to, read from the view the quote will
   actually be minted from. A motor is shorter than a boat because a
   motor is joined to fewer things — there is no flag anywhere that
   says so.
   ============================================================ */

function Walk({ preview }: { preview: FlowPreview }): ReactElement {
  return (
    <div className="qs-walk">
      <span className="mono-label qs-walk-lab">
        {preview.stops.length} {preview.stops.length === 1 ? 'stop' : 'stops'}
      </span>
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

   Three channels and they are not the same thing, which is why they
   are three blocks rather than one list:

     removed      values this choice takes off other columns
     disagrees    a rule unhappy with this row that removes nothing
     contradicts  the choices cannot all be true

   Every line carries the rule's own `because`, recorded at the
   moment of removal rather than reconstructed afterwards.
   ============================================================ */

function Verdict({ verdict }: { verdict: SubjectVerdict }): ReactElement {
  const loud = verdict.problems.length > 0
  return (
    <div className={`qs-verdict${loud ? ' is-loud' : ''}`}>
      <p className="qs-verdict-say">
        <Info size={ICON_SIZE.small} weight="fill" aria-hidden="true" />
        <span>{verdict.say}</span>
      </p>

      {verdict.problems.length > 0 ? (
        <ul className="qs-verdict-list">
          {verdict.problems.map((p) => (
            <li className="qs-verdict-item qs-verdict-item--stop" key={p}>
              {p}
            </li>
          ))}
        </ul>
      ) : null}

      {verdict.narrowings.length > 0 ? (
        <ul className="qs-verdict-list">
          {verdict.narrowings.map((n) => (
            <li className="qs-verdict-item" key={`${n.constraintId}-${n.where}-${n.value}`}>
              <span className="qs-verdict-where">{n.where}</span>
              <span className="qs-verdict-gone">{n.value}</span>
              <span className="qs-verdict-why">because {n.because}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {verdict.disagreements.length > 0 ? (
        <ul className="qs-verdict-list">
          {verdict.disagreements.map((d) => (
            <li className="qs-verdict-item qs-verdict-item--warn" key={`${d.constraintId}-${d.where}`}>
              <span className="qs-verdict-where">{d.where}</span>
              <span className="qs-verdict-gone">{d.value}</span>
              <span className="qs-verdict-why">because {d.because}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
