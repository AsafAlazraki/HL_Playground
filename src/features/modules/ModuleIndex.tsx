/* ============================================================
   THE INDEX — the catalogue, and the one genuinely new drawing
   in the module system.

   WHAT IT IS. Every row of every table a module points at, cut
   into sections by TABLE and then into groups by that table's own
   `hierarchy`. Brand first, because the tables are per-brand: a
   salesperson sees HIGHFIELD ▸ Sport ▸ SP460 and STACER ▸ Open
   Boats in one place, and each brand keeps its own columns.

   WHY IT DID NOT EXIST. `ViewPage` requires a rowId — it answers
   "for THIS thing, what goes with it?" — and the closest thing to
   a list in the app is the view stage's capped row rail. With 21
   tables and 651 rows loaded, you could not ask the app for a boat
   by name. This is the screen that answers.

   THE THREE REFUSALS BUILT INTO IT.

   1. NO PRICE IS INVENTED. The price column is resolved in
      `read.ts` through the quote feature's own ladder, and a table
      that declares nothing prints nothing. A blank tile face is a
      table that needs a price column, and it says so by being
      blank rather than by showing a zero.

   2. NO COST REACHES IT. `priceReadOf` refuses cost and margin
      bands twice over. This screen is the one a customer reads
      over a shoulder.

   3. NO PICTURE IS FAKED, AND NO ABSENCE IS LEFT UNEXPLAINED. A row
      with no picture draws plain paper. A row whose picture is an
      ADDRESS the browser is not allowed to fetch says so, in the
      well the photograph would have filled: "Held as a link", with
      the host on the title. Those are two different facts about a
      dealer's data and drawing them the same way — 111 blank wells
      out of 174 — read as a broken screen. Never a hatched
      rectangle, never a filename, and never another boat's
      photograph standing in. The verdict is `@/lib/imageSources`',
      shared with the table cell and the view page, so a picture
      that is a plate in the grid is never a broken glyph here.

   IT MUST STAY SMOOTH AT 651 ROWS. The entry list is built once
   per data change, the price and picture columns are resolved once
   per table, and the drawing is capped at `INDEX_CAP` with the
   remainder stated in words — the same discipline, and the same
   sentence shape, as the view stage's rail.

   WHAT A MODULE IS THAT A TABLE IS NOT — the overview band, drawn
   above the catalogue and derived from nothing but the data.

   A module opening onto rows alone is the table again, one screen
   further in, and that is exactly what it looked like. A place in
   the business has to say, in the first two seconds, WHAT YOU CAN
   DO HERE — not only what is in it. Four strips do that, and
   every figure in them is read, never written:

     INSIDE          the member tables as chips, each with its own
                     count, each scrolling to that run. This is the
                     brand level made navigable: seven price files,
                     not one flat list of 174 hulls.
     WHAT GOES WITH  the tables reachable through a declared join,
                     and on how many of these tables each one is —
                     "Yamaha Outboards, on 6 of 7". The asymmetry
                     is real (Haines Signature and Jeanneau take
                     factory packages instead) and saying it is the
                     alternative to shipping headings that are
                     empty for four brands out of seven.
     WHAT YOU CAN DO the verbs that are switched on. One that this
                     renderer performs is stated with the contract's
                     own sentence; one it does not is a DISABLED
                     control saying where the act happens instead.
                     That second case used to be a separate strip
                     below the header; it belongs here, beside the
                     verbs that do work, because a person reading a
                     row of capabilities wants the whole row.
     WHAT HAS        the quotes raised against these tables, and the
     HAPPENED        rows changed since they were added. THE ONLY
     LATELY          STRIP THAT CAN BE ABSENT, and it is absent on a
                     freshly loaded sheet, because nothing has
                     happened yet and saying so in a heading would be
                     four words where the truth is none. `read.ts`
                     explains why both signals are exactly zero there
                     and why neither can be faked into life.

   THE FIRST THREE ANSWER WHAT A CATALOGUE ANSWERS. The fourth is
   what makes this an application: a place that remembers what was
   done in it. It arrives during a demonstration rather than before
   one — press "Quote this one" on any boat and it is drawn on the
   way back.

   ONE CONTROL: THE GEAR, top right. It does not navigate and it
   does not open a form that represents this module. It grows
   handles on the drawing already in front of you — the name and
   the description become the fields they came from, every table's
   heading grows a move and a take-out, and the designer strip
   appears under the header. Pressing it again subtracts them.
   Nothing that was on the clean page MOVES between the two modes:
   the heads, the groups and the faces are drawn from the same
   sections either way. That is the promise `ViewPage.tsx:252-266`
   and `BlockCard.tsx:1-14` already make, inherited rather than
   reinvented.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CaretRight,
  Check,
  Gear,
  LinkSimple,
  MagnifyingGlass,
  X,
} from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  accentVar,
  isRetired,
  rowLabel,
  TABLE_KINDS,
  type ImageRef,
  type ModuleDef,
} from '@/types/model'
import { TableKindSymbol } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'
import {
  HELD_AS_LINK,
  heldAsLinkNote,
  imageLabel,
  measuredClosedHost,
  noteImageFailed,
  noteImageLoaded,
  useImageDisplay,
} from '@/lib/imageSources'
import { heldBackRowCount } from '@/features/views/sellable'
/* THE SUBMODULES, NOT THE BARREL. `@/features/views` re-exports
   `ViewPage` and everything under it; this file wants one rule and one
   registry, and naming them directly keeps the whole item page out of
   the module chunk. It is the same import shape `read.ts` beside it
   already uses. */
import { bestAnsweredRow, LANDING_SCAN } from '@/features/views/landing'
import { createViewFor } from '@/features/views/viewDefs'
import { useQuotes } from '@/features/quote'
import {
  buildEntries,
  capEntries,
  groupEntries,
  listedTables,
  moduleActivity,
  moduleTables,
  relatedTables,
  type IndexEntry,
  type IndexSection,
} from './read'
import { capabilityStates, moveId, NOT_YET_SAYS } from './designer'
import { ModuleDesigner } from './ModuleDesigner'
import { rulesPanelId } from './ModuleRulesPanel'
import { RULE_CAPABILITY, useModuleConfiguresRules } from './ruleCapability'
import './modules.css'

/** How many items are drawn before the page asks you to narrow.
 *  240 is two full screens of tiles at any sensible width — enough
 *  that nobody meets the cap while browsing one brand, small
 *  enough that seven brands at once stay instant. */
const INDEX_CAP = 240

export interface ModuleIndexProps {
  module: ModuleDef
  /** clicking an item — the table it belongs to and the row itself */
  onOpen: (tableId: string, rowId: string) => void
  /** Opening one of the quotes raised here. Absent = the quotes are
   *  still NAMED, as a fact about this place, but they are not doors —
   *  the same shape `canOpen` gives an item, and the reason this
   *  feature still imports nothing from the app. */
  onOpenQuote?: (quoteId: string) => void
}

export function ModuleIndex({
  module,
  onOpen,
  onOpenQuote,
}: ModuleIndexProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const updateModule = useProjectStore((s) => s.updateModule)
  /* Quotes live in their own registry rather than the project store —
     a document is frozen and must not move when the sheet does. */
  const quotes = useQuotes()
  const [query, setQuery] = useState('')
  const [designing, setDesigning] = useState(false)

  /* THE LAST NAME THAT WAS ACTUALLY A NAME. The name field is a live
     control on a stored value, so clearing it to retype it writes an
     empty string — and a module with no name is a card on the
     dashboard nobody can point at. Blur restores this rather than
     inventing a replacement. */
  const lastNamed = useRef(module.name)
  if (module.name.trim() !== '') lastNamed.current = module.name

  /* EVERY table the module points at — what the designer strip
     reorders and takes out. It has to include a retired one, or an
     admin could never see that the module still names it. */
  const tables = useMemo(() => moduleTables(module, entities), [module, entities])

  /* What the CATALOGUE draws. A retired table is history rather than
     stock, so it has no section here at all — and the sentence under
     the header says so, rather than leaving a heading to disappear. */
  const listed = useMemo(() => listedTables(module, entities), [module, entities])

  /* Built once per data change, not per keystroke: 651 rows resolve
     their label, trail, price and picture here and the search below
     only reads the string this already made. */
  const entries = useMemo(() => buildEntries(listed, rowsByEntity), [listed, rowsByEntity])

  /* NOTHING VANISHES SILENTLY. The rows this page is not drawing,
     counted, so the header can say the number in words instead of
     leaving a person to work out why 651 became 645. */
  const held = useMemo(() => heldBackRowCount(tables, rowsByEntity), [tables, rowsByEntity])
  const retiredTables = useMemo(() => tables.filter(isRetired), [tables])

  /* THE PICTURES THIS CATALOGUE CANNOT PAINT, COUNTED AND EXPLAINED
     ONCE — the same instinct as `held` above, aimed at the other thing
     a person notices before they have read a word.

     93 of the 174 tiles in Boats are reference plates. Each one already
     says "Held as a link" and carries the reason on its title, and a
     reader who never hovers still counts ninety-three empty wells and
     concludes the software is broken. A grid cannot answer that; a
     sentence can. So the reason is stated once, at the foot of the
     index, in the voice `.md-held` established — reason and
     reassurance in the same breath, because the question underneath
     "where are the photographs" is "have we lost them".

     COUNTED FROM THE RECORDED MEASUREMENT, never from the live probe
     verdict — see `measuredClosedHost` for why a page-level total has
     to be a number that cannot move while somebody is reading it. It
     names the hosts it counted and claims nothing about any other. */
  const linkedPictures = useMemo(() => {
    const byHost = new Map<string, { host: string; why: string; count: number }>()
    for (const e of entries) {
      if (!e.img) continue
      const closed = measuredClosedHost(e.img.src)
      if (closed === null) continue
      const found = byHost.get(closed.host)
      if (found) found.count += 1
      else byHost.set(closed.host, { ...closed, count: 1 })
    }
    const hosts = [...byHost.values()].sort((a, b) => b.count - a.count)
    return { hosts, total: hosts.reduce((n, h) => n + h.count, 0) }
  }, [entries])

  const canSearch = module.capabilities.includes('search')
  const canOpen = module.capabilities.includes('open')

  /* WORD BY WORD, NOT ONE LONG STRING — the lesson the view stage's
     rail already learned. "SP460 PVC" must find a row named
     "Highfield - SP460 (PVC)", and a whole-string test answers
     "nothing matches" for a row two screens down.
     Split inside the memo, so the dependency is the typed STRING and
     not an array rebuilt on every render. */
  const matches = useMemo(() => {
    if (!canSearch) return entries
    const needles = query.trim().toLowerCase().split(/\s+/).filter((w) => w !== '')
    if (needles.length === 0) return entries
    return entries.filter((e) => needles.every((n) => e.hay.includes(n)))
  }, [entries, canSearch, query])

  /* THE CAP IS SHARED OUT, NOT SPENT IN ORDER. A flat slice gave the
     whole budget to the first tables and left the last one undrawn —
     and an undrawn table has no section head, so the member chip that
     promises to go to it pressed to no effect. See `capEntries`. */
  const shown = useMemo(() => capEntries(matches, INDEX_CAP), [matches])
  const hidden = matches.length - shown.length
  const sections = useMemo(() => groupEntries(shown, listed), [shown, listed])

  const multiTable = tables.length > 1
  const browsing = module.capabilities.includes('browse')

  /* -- the overview band ------------------------------------- */

  /* How many items each member table brings, counted off the WHOLE
     list and not off what the search left — a chip whose number
     changed as you typed would be a second, quieter search result. */
  const memberCounts = useMemo(() => {
    const out = new Map<string, number>()
    for (const e of entries) out.set(e.tableId, (out.get(e.tableId) ?? 0) + 1)
    return out
  }, [entries])

  /* What is reachable from here through a join somebody declared. */
  const related = useMemo(() => relatedTables(module, entities), [module, entities])

  /* The verbs that are ON, in the contract's own order, each with
     either the sentence for what it does or the sentence for where
     it is done instead. `capabilityStates` is the same reader the
     designer strip uses, so the two can never disagree. */
  const configures = useModuleConfiguresRules(module.id)
  const acts = useMemo(
    () => capabilityStates(module, tables, configures).filter((s) => s.on),
    [module, tables, configures],
  )

  /* WHAT HAS HAPPENED HERE — quotes raised against these tables, and
     rows changed since they were loaded. Both are exactly zero on a
     freshly loaded sheet, so the strip below draws nothing at all
     until something really has happened. */
  const lately = useMemo(
    () => moduleActivity(module, entities, rowsByEntity, quotes),
    [module, entities, rowsByEntity, quotes],
  )
  const anythingLately = lately.quoteCount > 0 || lately.edited > 0

  /* ============================================================
     WHERE TO START — the one row in this catalogue that shows what the
     catalogue is FOR, chosen by a rule and never by a favourite.

     WHAT WAS MEASURED. The tiles are in the dealer's own order, cut by
     table and then by their own hierarchy, and that order is right: a
     catalogue that reordered itself by how complete each row was would
     be unrecognisable to the person whose price file it is. But the row
     a demonstration lands on is the FIRST tile, and on the real set the
     first tile of the first table of the first module is
     "Highfield - RU230KAM (PVC) WH", whose page answers two of six
     blocks. Four of the six headings on it read "0 picked". Nothing is
     wrong with that boat — it is a 2.3 m roll-up that takes no trailer
     and no rigging kit — but it is the worst possible first impression
     of a page whose whole job is showing what goes with what.

     THE VIEW STAGE ALREADY HAD THE ANSWER AND COULD NOT GIVE IT. Its
     landing rule fires only for a door that names a TABLE; a tile names
     a ROW, and it is right that it does — a person who pressed a boat
     must get that boat. So the rule is asked HERE instead, once, about
     the table the catalogue opens with, and its answer is offered as a
     door beside the reason it was chosen. Nothing is reordered, nothing
     is hidden, and the sparse rows are exactly where they were.

     WHY THE FIRST LISTED TABLE AND NOT THE WHOLE MODULE. `listed[0]` is
     the section a reader's eye lands in — it is the top of the
     catalogue and the first chip in INSIDE — so "where to start" means
     the start of what is actually in front of them. Asking all seven of
     Boats' tables would cost seven scans on open (47 ms for Highfield
     alone) to answer a question nobody asked, and would offer a boat
     from a brand five screens down.

     IT USES THE SAME SCAN DEPTH AS THE TABLE'S OWN DOOR, so pressing
     this and pressing Fitment on that table land on the SAME boat. Two
     surfaces answering one question differently is worse than either
     answer.

     AND IT ONLY OFFERS WHAT IS SOLD — but that is the RULE's promise
     now, not a filter applied here. `bestAnsweredRow` skips a
     discontinued row as a candidate and still counts it against its
     window, so this door and the table's own Fitment door cannot answer
     the same question with two different boats. The rows themselves stay
     exactly where they are.
     ============================================================ */
  const start = useMemo(() => {
    const primary = listed[0]
    if (!canOpen || !browsing || !primary) return undefined
    const rows = rowsByEntity[primary.id] ?? []
    if (rows.length === 0) return undefined
    const view = createViewFor(primary.id)
    const best = bestAnsweredRow({
      entities,
      rowsByEntity,
      entity: primary,
      rows,
      viewId: view.id,
      limit: LANDING_SCAN,
    })
    if (!best) return undefined

    /* THE SENTENCE MAY NOT CLAIM MORE THAN THE SCAN SAW. The rule stops
       at the first row that answers everything and otherwise stops at
       `LANDING_SCAN`, so on a 588-variant table "the most of any" would
       be a statement about hundreds of rows nobody read. `scanned` is how
       far it really got, and the sentence says so. */
    const say =
      best.answered >= best.of
        ? /* A PERFECT ROW IS ALLOWED THE WHOLE TABLE'S NAME. The scan
             starts at the top and stops at the first row that answers
             everything, so every row above this one was read and none of
             them did — "the first one in Highfield Inflatables that is"
             is exactly what happened, not a claim about rows nobody
             looked at. */
          `Everything that goes with it is picked — all ${best.of}. It is the first one in ${primary.name} that is.`
        : `${best.answered} of the ${best.of} tables that go with it ${
            best.answered === 1 ? 'has' : 'have'
          } something picked, which is the most in ${
            best.scanned >= rows.length ? primary.name : `the first ${best.scanned} of ${primary.name}`
          }.`

    return {
      tableId: primary.id,
      rowId: best.row.id,
      name: rowLabel(primary, best.row),
      say,
    }
  }, [canOpen, browsing, listed, entities, rowsByEntity])


  /* A CHIP SCROLLS TO ITS RUN, and clears the find box on the way:
     "show me Stacer" while three letters are typed into search would
     otherwise scroll to a heading that is not drawn. Done through
     state rather than in the handler because the run only exists
     after the render that cleared the query. */
  const [goingTo, setGoingTo] = useState<string | null>(null)
  useEffect(() => {
    if (goingTo === null) return
    setGoingTo(null)
    const el = document.getElementById(`md-sec-${module.id}-${goingTo}`)
    if (!el) return
    const still =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
  }, [goingTo, module.id])

  /* THE RULE VERB'S DOOR. It grows the designer — the same handles the
     gear grows, never a second surface — and then takes you to the
     panel it promised. Two steps, because the panel does not exist
     until the render that mounted the strip, which is exactly the
     reason the chip above goes through state too. */
  const [goingToRules, setGoingToRules] = useState(false)
  const openRules = (): void => {
    setDesigning(true)
    setGoingToRules(true)
  }
  useEffect(() => {
    if (!goingToRules || !designing) return
    setGoingToRules(false)
    const el = document.getElementById(rulesPanelId(module.id))
    if (!el) return
    const still =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
  }, [goingToRules, designing, module.id])

  const style = { '--md-accent': accentVar(module.accent) } as CSSProperties

  /** One table's heading, moved or taken out. The order written is
   *  `module.tableIds` and NOT the drawn sections: a search that
   *  matches nothing in one brand leaves that brand without a heading,
   *  and reordering by what happens to be on screen would silently
   *  drop it out of the module. */
  const moveTable = (tableId: string, dir: -1 | 1): void => {
    const next = moveId(module.tableIds, tableId, dir)
    if (next !== module.tableIds) updateModule(module.id, { tableIds: next })
  }

  return (
    <section className="md-index" style={style} aria-label={module.name}>
      <header className="md-idx-head">
        <div className="md-idx-id">
          {/* THE NAME AND THE SENTENCE ARE THE FIELDS THEY CAME FROM.
              In design mode the heading becomes the control that writes
              it, in the same place, at the same size — so a description
              is changed where it is read. There is exactly one place a
              module's description comes from, and this is it: HelmLogic
              derives its equivalent by substring-matching the name and
              therefore tells every trailer and service user they are
              configuring boat packages. */}
          {designing ? (
            <>
              <input
                className="field-input md-idx-name-edit"
                type="text"
                value={module.name}
                spellCheck={false}
                placeholder="Name this place"
                aria-label="What this module is called"
                onChange={(e) => updateModule(module.id, { name: e.target.value })}
                onBlur={() => {
                  if (module.name.trim() === '') {
                    updateModule(module.id, { name: lastNamed.current })
                  }
                }}
              />
              <textarea
                className="field-input md-idx-desc-edit"
                value={module.description}
                rows={2}
                placeholder="One line about this place, in your own words"
                aria-label={`What ${module.name} is, in one line`}
                onChange={(e) => updateModule(module.id, { description: e.target.value })}
              />
            </>
          ) : (
            <>
              <h2 className="md-idx-name">{module.name}</h2>
              {module.description === '' ? null : (
                <p className="md-idx-desc">{module.description}</p>
              )}
            </>
          )}
          <p className="md-idx-facts mono-label">
            {entries.length} {entries.length === 1 ? 'item' : 'items'}
            {multiTable ? ` · ${tables.length} tables` : ''}
            {held > 0 ? ` · ${held} not sold` : ''}
          </p>
        </div>

        {canSearch ? (
          <div className="md-idx-find">
            <MagnifyingGlass
              size={ICON_SIZE.tiny}
              weight="light"
              aria-hidden="true"
              className="md-idx-find-mark"
            />
            <input
              className="field-input md-idx-find-input"
              type="search"
              value={query}
              spellCheck={false}
              placeholder="Find one by name"
              aria-label={`Find one in ${module.name} by name`}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        ) : null}

        {/* THE ONE CONTROL. It grows handles on this page; it never
            opens another. Drawn last so it sits at the end of the bar
            whether or not the module has a search box. */}
        <button
          type="button"
          className={`md-gear${designing ? ' is-on' : ''}`}
          aria-pressed={designing}
          title={designing ? 'Done — back to the clean page' : 'Set up this module'}
          onClick={() => setDesigning((v) => !v)}
        >
          {designing ? (
            <Check size={ICON_SIZE.small} weight="bold" aria-hidden="true" />
          ) : (
            <Gear size={ICON_SIZE.small} weight="light" aria-hidden="true" />
          )}
          <span className="md-gear-word">{designing ? 'Done' : 'Set up'}</span>
        </button>
      </header>

      {designing ? <ModuleDesigner module={module} /> : null}

      {/* THE OVERVIEW BAND — see the header. Three strips, all
          derived, drawn above the catalogue rather than instead of
          it. A module with no tables left draws none of them: there
          is nothing true to say, and the sentence below says so. */}
      {tables.length > 0 ? (
        <section className="md-over" aria-label={`About ${module.name}`}>
          {multiTable ? (
            <div className="md-over-strip">
              <p className="md-over-cap mono-label">Inside</p>
              <ul className="md-chips">
                {listed.map((t) => {
                  const n = memberCounts.get(t.id) ?? 0
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="md-chip"
                        disabled={n === 0}
                        aria-label={`Go to ${t.name}, ${n} ${n === 1 ? 'item' : 'items'}`}
                        onClick={() => setGoingTo(t.id)}
                      >
                        <span className="md-chip-mark">
                          <TableKindSymbol
                            kind={t.kind && t.kind in TABLE_KINDS ? t.kind : 'custom'}
                            size={ICON_SIZE.tiny}
                          />
                        </span>
                        <span className="md-chip-name">{t.name}</span>
                        <span className="md-chip-n mono-label">{n}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {related.length > 0 ? (
            <div className="md-over-strip">
              <p className="md-over-cap mono-label">What goes with these</p>
              <ul className="md-links">
                {related.map((r) => (
                  <li className="md-link" key={r.tableId}>
                    <span className="md-link-mark">
                      <TableKindSymbol kind={r.kind} size={ICON_SIZE.tiny} />
                    </span>
                    <span className="md-link-name">{r.name}</span>
                    {/* THE SHARE, NOT A TICK. "on 3 of 7" is the fact
                        a person can act on; a tick would say only
                        that the relationship exists somewhere. */}
                    <span className="md-link-share">
                      on {r.on} of {r.of}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {acts.length > 0 ? (
            <div className="md-over-strip">
              <p className="md-over-cap mono-label">What you can do here</p>
              <ul className="md-acts">
                {acts.map((a) => {
                  /* NOT PERFORMED ON THIS SCREEN = A DISABLED CONTROL
                     THAT SAYS WHERE IT IS. An enabled control that
                     does nothing is a lie told to whoever is looking;
                     a verb quietly missing from the row is worse,
                     because the dashboard card already promised it. */
                  const elsewhere = a.refused ?? NOT_YET_SAYS[a.key]

                  /* A VERB WITH A DOOR IS A DOOR. `configure` is the
                     first capability whose act happens on THIS screen
                     rather than on an item's page, so it is the first
                     one drawn as something to press: it grows the
                     designer and takes you to the rules panel. The
                     caret is what tells a pill apart from a label —
                     three states in this row now (a door, a live
                     statement, a disabled stub) and they must not
                     look like two. */
                  const door = !elsewhere && a.key === RULE_CAPABILITY ? openRules : undefined
                  return (
                    <li className="md-act" key={a.key}>
                      {elsewhere ? (
                        <button type="button" className="md-act-verb" disabled>
                          {a.label}
                        </button>
                      ) : door ? (
                        <button
                          type="button"
                          className="md-act-verb is-live is-door"
                          onClick={door}
                        >
                          {a.label}
                          <CaretRight
                            size={ICON_SIZE.tiny}
                            weight="bold"
                            aria-hidden="true"
                          />
                        </button>
                      ) : (
                        <span className="md-act-verb is-live">{a.label}</span>
                      )}
                      <span className="md-act-say">{elsewhere ?? a.says}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {/* WHAT HAS HAPPENED LATELY — the fourth question, and the
              one that makes this an application rather than a
              catalogue. DRAWN ONLY WHEN SOMETHING HAS: a freshly
              loaded sheet has raised no quotes and changed no rows, so
              this strip is absent, and the absence is the true answer.
              It arrives the moment somebody quotes a boat. */}
          {anythingLately ? (
            <div className="md-over-strip">
              <p className="md-over-cap mono-label">What has happened lately</p>
              {lately.quotes.length > 0 ? (
                <ul className="md-lately">
                  {lately.quotes.map((q) => {
                    /* The subject as the QUOTE froze it, its reference,
                       the word the quotes list prints for its state,
                       and the day. Four facts, one line, no summary. */
                    const body = (
                      <>
                        <span className="md-late-what">{q.subject}</span>
                        <span className="md-late-state mono-label">{q.state}</span>
                        {/* MONO BECAUSE THEY ARE FIGURES, and not
                            `mono-label`, because a reference and a date
                            are values a person reads back to somebody
                            on the phone. */}
                        <span className="md-late-ref">{q.reference}</span>
                        <span className="md-late-when">{q.day}</span>
                      </>
                    )
                    return (
                      <li key={q.id}>
                        {onOpenQuote ? (
                          <button
                            type="button"
                            className="md-late"
                            aria-label={`Open the quote for ${q.subject}, ${q.reference}`}
                            onClick={() => onOpenQuote(q.id)}
                          >
                            {body}
                          </button>
                        ) : (
                          <div className="md-late is-flat">{body}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : null}

              {lately.quoteCount > lately.quotes.length ? (
                <p className="md-late-say">
                  {lately.quoteCount - lately.quotes.length} more raised here — all of
                  them are in Quotes.
                </p>
              ) : null}

              {/* THE ROWS SOMEBODY HAS WORKED ON. Not a door: there is
                  no one honest destination for a count spread across
                  two tables, and inventing one would be worse than
                  stating the fact. `updatedAt !== createdAt` is exact,
                  so this sentence can never appear for data nobody has
                  touched. */}
              {lately.edited > 0 ? (
                <p className="md-late-say">
                  {lately.edited} {lately.edited === 1 ? 'item' : 'items'} on{' '}
                  {lately.editedOn.join(', ')} {lately.edited === 1 ? 'has' : 'have'} been
                  edited since {lately.edited === 1 ? 'it was' : 'they were'} added.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* WHERE TO START — LAST IN THE BAND, AND THE ONLY THING IN
              IT THAT GOES ANYWHERE. The three strips above say what
              this place is; DESIGN_CONTRACT §6 is explicit that a
              surface says what a thing IS before it offers the action,
              so the door comes after them and immediately above the
              catalogue it points into. See the `start` memo for the
              rule, the measurement, and why it is the first listed
              table rather than all seven.

              ABSENT RATHER THAN EMPTY. A module that cannot open a row,
              cannot browse, has no rows still sold, or whose rows
              answer nothing at all draws no strip — the same promise
              WHAT HAS HAPPENED LATELY makes above it. There is no such
              thing as a quiet recommendation. */}
          {start ? (
            <div className="md-over-strip">
              <p className="md-over-cap mono-label">Where to start</p>
              <div className="md-start">
                <button
                  type="button"
                  className="md-start-door"
                  aria-label={`Open ${start.name} — ${start.say}`}
                  onClick={() => onOpen(start.tableId, start.rowId)}
                >
                  <span className="md-start-name">{start.name}</span>
                  <CaretRight size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                </button>
                {/* THE REASON TRAVELS WITH THE OFFER. A suggestion with
                    no stated basis is the "confidently wrong" case
                    DESIGN_CONTRACT §7 names; this one states exactly
                    what it counted and how far it looked. */}
                <span className="md-start-say">{start.say}</span>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {!canOpen ? (
        <p className="md-idx-note">
          Opening one is switched off for this module, so these are a list to read
          rather than a way in.
        </p>
      ) : null}

      {/* WHAT THIS CATALOGUE IS NOT SHOWING, AND WHY. A count that
          quietly dropped six rows is the defect; this sentence is the
          fix. It names the reason and the reassurance together,
          because the person reading it is asking where a trailer
          went — and because the answer is that nothing was deleted. */}
      {held > 0 ? (
        <p className="md-held" role="note">
          {retiredTables.length > 0
            ? `${retiredTables.map((t) => t.name).join(', ')} ${
                retiredTables.length === 1 ? 'is' : 'are'
              } history rather than stock, so ${
                retiredTables.length === 1 ? 'it is' : 'they are'
              } not listed here. `
            : ''}
          {held} {held === 1 ? 'item' : 'items'} in this module{' '}
          {held === 1 ? 'is' : 'are'} no longer sold and{' '}
          {held === 1 ? 'is' : 'are'} not offered here. Everything stays on the sheet,
          where it can be seen, sorted and brought back by clearing its Discontinued box —
          and a quote already naming one still opens, still totals and still prints.
        </p>
      ) : null}

      {/* AND THE OTHER THING A PERSON NOTICES FIRST. See
          `linkedPictures` above for what is counted and why the count
          is taken from the recorded measurement rather than the live
          verdict. Same class, same voice, same role as the note above
          it: the reason, then the reassurance that nothing was lost. */}
      {linkedPictures.total > 0 ? (
        <p className="md-held" role="note">
          {linkedPictures.total} {linkedPictures.total === 1 ? 'item' : 'items'} here{' '}
          {linkedPictures.total === 1 ? 'holds its photograph' : 'hold their photographs'} as
          a link rather than a picture, because{' '}
          {linkedPictures.hosts.map((h, i) => (
            <span key={h.host}>
              {i > 0 ? (i === linkedPictures.hosts.length - 1 ? ' and ' : ', ') : ''}
              {h.why}
            </span>
          ))}
          . The addresses are kept exactly as{' '}
          {linkedPictures.total === 1 ? 'it was' : 'they were'} imported and travel with every
          export, so nothing has been lost and nothing has been substituted — the day those
          pictures can be fetched, the same tiles paint them.
        </p>
      ) : null}

      {/* A module without `browse` has no index at all — that is what
          the switch means, and saying so is better than drawing an
          empty page. The header and the gear stay drawn above it, or
          switching browsing off would take away the control that
          switches it back on. */}
      {!browsing ? (
        <p className="md-none">
          Browsing is switched off for {module.name}, so this list is not drawn.
          {designing ? '' : ' Press SET UP to switch it back on.'}
        </p>
      ) : entries.length === 0 ? (
        <p className="md-none">
          {tables.length === 0
            ? 'The tables this module was made from are no longer on the sheet.'
            : listed.length === 0
              ? 'Every table in this module is history rather than stock, so there is nothing here to sell. The tables and their rows stay on the sheet.'
              : held > 0
                ? 'Nothing in this module is still being sold. The rows stay on the sheet and a quote already naming one still opens.'
                : 'These tables have no rows yet. Add rows on the sheet and they appear here.'}
        </p>
      ) : matches.length === 0 ? (
        <p className="md-none">Nothing here matches “{query.trim()}”.</p>
      ) : (
        sections.map((section) => (
          <Section
            key={section.tableId}
            /* the anchor a member chip scrolls to. Keyed on the MODULE
               too: two modules sharing a table would otherwise write
               the same id, and only one of them could be reached. */
            domId={`md-sec-${module.id}-${section.tableId}`}
            section={section}
            showHead={multiTable}
            mode={module.index}
            canOpen={canOpen}
            onOpen={onOpen}
            designing={designing}
            /* the position in the MODULE, not in what is on screen */
            first={module.tableIds[0] === section.tableId}
            last={module.tableIds[module.tableIds.length - 1] === section.tableId}
            only={module.tableIds.length === 1}
            moduleName={module.name}
            onMove={moveTable}
            onDrop={(tableId) =>
              updateModule(module.id, {
                tableIds: module.tableIds.filter((id) => id !== tableId),
              })
            }
          />
        ))
      )}

      {browsing && hidden > 0 ? (
        <p className="md-more mono-label">
          {hidden} more —{' '}
          {canSearch
            ? 'type above to narrow'
            : 'switch search on for this module to reach them'}
        </p>
      ) : null}
    </section>
  )
}

/* ---------------------------------------------------------- */
/* One table's run                                            */
/* ---------------------------------------------------------- */

interface SectionProps {
  /** the id a member chip in the overview band scrolls to */
  domId: string
  section: IndexSection
  /** the brand head, drawn only when the module spans more than one
   *  table — a one-table module already has its name in the header.
   *  DELIBERATELY UNCHANGED BY DESIGN MODE: a head that appeared only
   *  while the gear was on would push every tile under it down and
   *  back up again, and the promise is that nothing on the clean page
   *  moves. A one-table module is reordered and added to from the
   *  designer strip, where there is something to move it relative to. */
  showHead: boolean
  mode: ModuleDef['index']
  canOpen: boolean
  onOpen: (tableId: string, rowId: string) => void
  /** design mode grows the handles inside the head that is already there */
  designing: boolean
  first: boolean
  last: boolean
  only: boolean
  moduleName: string
  onMove: (tableId: string, dir: -1 | 1) => void
  onDrop: (tableId: string) => void
}

function Section({
  domId,
  section,
  showHead,
  mode,
  canOpen,
  onOpen,
  designing,
  first,
  last,
  only,
  moduleName,
  onMove,
  onDrop,
}: SectionProps): ReactElement {
  return (
    <section className="md-sec" id={domId} aria-label={section.name}>
      {showHead ? (
        <div className="md-sec-head">
          <span className="md-sec-mark">
            <TableKindSymbol kind={section.kind} size={ICON_SIZE.small} />
          </span>
          <h3 className="md-sec-name block-heading">{section.name}</h3>
          <span className="md-sec-count mono-label">{section.count}</span>
          {designing ? (
            <span className="md-sec-acts">
              <button
                type="button"
                className="md-icon-btn"
                title="Move this table up the list"
                aria-label={`Move ${section.name} up`}
                disabled={first}
                onClick={() => onMove(section.tableId, -1)}
              >
                <ArrowUp size={ICON_SIZE.tiny} weight="bold" />
              </button>
              <button
                type="button"
                className="md-icon-btn"
                title="Move this table down the list"
                aria-label={`Move ${section.name} down`}
                disabled={last}
                onClick={() => onMove(section.tableId, 1)}
              >
                <ArrowDown size={ICON_SIZE.tiny} weight="bold" />
              </button>
              <button
                type="button"
                className="md-icon-btn md-icon-btn--drop"
                /* NOTHING IS DELETED. The table, its rows and every
                   join on it stay exactly where they are; this module
                   stops listing them, and putting the table back
                   brings all of it with it. */
                title={`Take ${section.name} out of this module — the table and its rows stay on the sheet`}
                aria-label={`Take ${section.name} out of ${moduleName}`}
                disabled={only}
                onClick={() => onDrop(section.tableId)}
              >
                <X size={ICON_SIZE.tiny} weight="bold" />
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      {section.groups.map((group) => (
        <div className="md-grp" key={group.key}>
          {group.trail === '' ? null : (
            <p className="md-grp-trail mono-label">{group.trail}</p>
          )}
          {mode === 'tiles' ? (
            <ul className="md-tiles">
              {group.entries.map((e) => (
                <Tile key={e.rowId} entry={e} canOpen={canOpen} onOpen={onOpen} />
              ))}
            </ul>
          ) : (
            <ul className="md-rows">
              {group.entries.map((e) => (
                <Row key={e.rowId} entry={e} canOpen={canOpen} onOpen={onOpen} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  )
}

/* ---------------------------------------------------------- */
/* The two faces                                              */
/* ---------------------------------------------------------- */

interface FaceProps {
  entry: IndexEntry
  canOpen: boolean
  onOpen: (tableId: string, rowId: string) => void
}

function Tile({ entry, canOpen, onOpen }: FaceProps): ReactElement {
  const body = (
    <>
      <span className="md-tile-pic">
        <TilePicture img={entry.img} alt={entry.label} />
      </span>
      <span className="md-tile-name">{entry.label}</span>
      {/* NO EMPTY PRICE SLOT. A table that prices nothing draws no
          line at all, rather than a dash a salesperson could read as
          "free" or "ask". */}
      {entry.price === '' ? null : <span className="md-tile-price">{entry.price}</span>}
    </>
  )
  return (
    <li>
      {canOpen ? (
        <button
          type="button"
          className="md-tile"
          /* NAMED EXPLICITLY. The face is three spans, one of them a
             picture and one a mono figure, and a reader announcing
             them run together is not a name. */
          aria-label={entry.price === '' ? entry.label : `${entry.label}, ${entry.price}`}
          onClick={() => onOpen(entry.tableId, entry.rowId)}
        >
          {body}
        </button>
      ) : (
        <div className="md-tile is-flat">{body}</div>
      )}
    </li>
  )
}

/** The dense line. IT DOES NOT REPEAT ITS OWN TRAIL: the group
 *  heading above it already says "EPROPULSION - ELECTRIC OUTBOARDS",
 *  and printing that again on all fourteen rows underneath is a
 *  column of noise where the eye is trying to compare names and
 *  numbers. Drawn and seen; the trail is on the heading, once. */
function Row({ entry, canOpen, onOpen }: FaceProps): ReactElement {
  const body = (
    <>
      <span className="md-row-name">{entry.label}</span>
      {entry.price === '' ? null : <span className="md-row-price">{entry.price}</span>}
    </>
  )
  return (
    <li>
      {canOpen ? (
        <button
          type="button"
          className="md-row"
          aria-label={entry.price === '' ? entry.label : `${entry.label}, ${entry.price}`}
          onClick={() => onOpen(entry.tableId, entry.rowId)}
        >
          {body}
        </button>
      ) : (
        <div className="md-row is-flat">{body}</div>
      )}
    </li>
  )
}

/* ---------------------------------------------------------- */
/* The picture, or nothing at all                             */
/* ---------------------------------------------------------- */

/** One tile's picture — and THREE OUTCOMES, not two, because "there is
 *  no picture" and "the picture is somewhere we are not allowed to
 *  fetch it from" are different facts about a dealer's data and a
 *  catalogue that draws them the same way is lying about one of them.
 *
 *    a picture            → the photograph
 *    an address we cannot → the plate below: a link mark and the words
 *      paint                "Held as a link", with the host in the
 *                           title and the accessible name
 *    no picture at all    → plain paper. The row has nothing to show
 *                           and nothing is claimed.
 *
 *  WHY THIS IS NOT A MISSING FEATURE. 111 of the 174 tiles in Boats
 *  were blank wells, and nearly all of them hold a real address on
 *  `www.northsidemarine.com.au`, which serves
 *  `Cross-Origin-Resource-Policy: same-origin` behind Cloudflare. That
 *  cannot be fetched by a browser on any other origin — and a plain
 *  server-side request from the seed generator is answered 403 as well,
 *  measured on four of the addresses, so storing the pixels locally at
 *  seed time is not an option either. Both roads are closed by the
 *  origin, so the only honest move left is to SAY SO where the picture
 *  would be. No photograph is invented and no other boat's picture is
 *  ever substituted.
 *
 *  The verdict is taken per HOST in `@/lib/imageSources` and shared
 *  with the table cell and the view page — so a catalogue of 174 tiles
 *  costs at most two failed requests per host rather than one per tile
 *  (measured: two console lines for the whole Boats module), and a
 *  picture that is a plate in the grid is never a broken glyph here.
 *  The wording is the table cell's own, so a person who has seen one
 *  recognises the other.
 *
 *  Split in two so the hook is never asked about a row that has no
 *  picture at all — a conditional hook is not an option, and an
 *  empty source is not a question `useImageDisplay` should be made
 *  to answer. */
function TilePicture({
  img,
  alt,
}: {
  img: ImageRef | undefined
  alt: string
}): ReactElement | null {
  if (!img) return null
  return <Painted img={img} alt={alt} />
}

/** THE PICTURE IS HELD AS A LINK, AND THAT IS WHAT IT SAYS. Two words
 *  and a mark, quietly, in the well the photograph would have filled:
 *  repeated down a grid it reads as a convention somebody chose, which
 *  is the whole difference between this and a broken page.
 *
 *  BOTH STRINGS COME FROM `@/lib/imageSources` NOW. The label was
 *  written out here as a literal and the sentence was assembled here
 *  too, so this tile and the table cell could drift apart — and had:
 *  the cell's thumbnail said "held as a link, not shown here" while
 *  this said "Held as a link". One export each (`HELD_AS_LINK`,
 *  `heldAsLinkNote`) and they cannot.
 *
 *  The sentence is on the title and in the accessible name rather than
 *  on the tile, because it is what a person FIXING the record needs and
 *  they do that work in the table — but it is a REASON now, not just an
 *  address: for the two hosts we have measured it says what the host
 *  does, so a stakeholder reads a permission somebody else set rather
 *  than a fault in the dealership's own catalogue. */
function HeldAsLink({ img }: { img: ImageRef }): ReactElement {
  const why = heldAsLinkNote(img.src)
  return (
    <span className="md-tile-held" role="img" aria-label={`${imageLabel(img)} — ${why}`} title={why}>
      <LinkSimple size={ICON_SIZE.small} aria-hidden="true" />
      <span className="md-tile-held-say">{HELD_AS_LINK}</span>
    </span>
  )
}

function Painted({ img, alt }: { img: ImageRef; alt: string }): ReactElement | null {
  const { paint, probe, at } = useImageDisplay(img.src)
  if (!paint) return <HeldAsLink img={img} />
  return (
    <img
      className="md-tile-img"
      /* `at`, not `img.src` — the repository ships a copy of most of
         these and paints it from our own origin. The RECORD still says
         the manufacturer's address; only the request changes. */
      src={at}
      /* the author's own words when they wrote any; the row's label
         is the only honest fallback and nothing here invents one */
      alt={img.alt && img.alt.trim() !== '' ? img.alt.trim() : alt}
      /* the box is reserved before the bytes arrive, so a picture
         landing late never reflows the grid under a reader's thumb */
      width={200}
      height={132}
      /* THE PROBE IS THE ONE PICTURE on an unknown host allowed to
         make the request that settles it, so it must not be deferred.
         Everything else waits until it is on screen — a 240-tile page
         must not fetch 240 full-size photographs at once. */
      loading={probe ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => noteImageLoaded(img.src)}
      onError={() => noteImageFailed(img.src)}
    />
  )
}
