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

   A REGISTER'S THING IS ITS HEADING, NOT ITS ROW — and this is the
   drawing that answers "show the data as things rather than rows".

   A CATALOGUE HAS FACES. 810 boats carry 723 photographs and 810
   prices, so a grid of tiles is a thing a person shops, and that is
   what Boats, Motors, Factory Packages and Trailers draw.

   A REGISTER HAS NONE. Parts & Accessories is 2,860 live lines and
   exactly ZERO pictures, and 2,860 names in one scroll is the
   spreadsheet the dealer already has, one screen further in. But the
   workbook itself banners those lines under 206 headings — 179
   Categories on the parts sheet, 25 Sections on the rigging sheet,
   and one drawer each for the lines banner'd under a spacer —
   and a heading IS a thing: you press Anodes because a customer has
   asked for an anode. So a register with more headings than
   `DRAWER_FLOOR` opens onto its DRAWERS, each carrying its own count
   and the cheapest and dearest line inside it, and pressing one
   narrows the page to that drawer.

   THE NARROWING OBEYS THE ONE PATTERN WORTH TAKING (hl-journeys §4),
   and beats it on the part that matters: the rule is NAMED in the
   dealer's own column word ("one Category on Parts & Accessories"),
   the count put away is STATED rather than left as a silence, SHOW
   ALL switches it off entirely, and SEARCH LOOKS STRAIGHT PAST IT —
   type three letters with a drawer open and you are searching all
   2,860 again, with a sentence saying so. HelmLogic's own parts grid
   inside a quote has no search at all.

   NOTHING IS HIDDEN AND NOTHING IS REORDERED. A drawer is a distinct
   value of the first rung of that table's own `hierarchy`, counted
   over the rows this page already built; a table that banners nothing
   produces none, and a register of four bands (Registration Costs)
   stays the plain list it should be.

   THE FIRST THREE ANSWER WHAT A CATALOGUE ANSWERS. The fourth is
   what makes this an application: a place that remembers what was
   done in it. It arrives during a demonstration rather than before
   one — press "Quote this one" on any boat and it is drawn on the
   way back.

   ONE CONTROL: SETTINGS, top right. THIS PAGE IS THE CATALOGUE AND
   NOTHING ELSE. It used to grow the designer strip over itself, and
   grow handles on its own headings, so that a module could be edited
   where it was read. That is the right instrument for two panels and
   the wrong one for seven: with roles, a mark and the attachment list
   to say as well, the catalogue would have started four screens down
   its own page. So the gear became a door — `ModuleSettings` is one
   surface where every change to a module is made, and this page is
   what that surface is about. See ModuleSettings.tsx for the whole
   argument, including what moved and where it went.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import {
  CaretRight,
  Gear,
  LinkSimple,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  accentVar,
  isRetired,
  rowLabel,
  TABLE_KINDS,
  type ImageRef,
  type ModuleDef,
  type TableKind,
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
/* THE MECHANISM, NOT A SECOND COPY OF IT. This page narrowed by a
   drawer, searched past the drawer and withheld what is no longer
   sold, and it said all three in prose it wrote itself — three
   sentences, three sets of arithmetic, and nothing anywhere checking
   that they agreed with each other or with the contract next door.
   `applied.test.ts` names this file as the surface it was waiting
   for. See the note above `curation` in the body for what each of the
   four properties now maps onto here. */
import { CurationNote, readCuration, searchReach } from '@/features/curation'
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
  categoryDrawers,
  censusLine,
  DRAWER_FLOOR,
  drawerKey,
  groupEntries,
  listedTables,
  moduleActivity,
  moduleCensus,
  moduleTables,
  relatedTables,
  type Drawer,
  type IndexEntry,
  type IndexSection,
} from './read'
import { capabilityStates, NOT_YET_SAYS } from './designer'
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
  /** THE ONE DOOR OUT OF THE CATALOGUE AND INTO THE SET-UP OF THIS
   *  PLACE. `focus` names the panel to land on: the rules verb on this
   *  page promises a rules panel, and a door that opened the top of a
   *  five-panel page would not be keeping that promise. */
  onSettings: (focus?: 'rules') => void
}

export function ModuleIndex({
  module,
  onOpen,
  onOpenQuote,
  onSettings,
}: ModuleIndexProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const updateModule = useProjectStore((s) => s.updateModule)
  /* Quotes live in their own registry rather than the project store —
     a document is frozen and must not move when the sheet does. */
  const quotes = useQuotes()
  const [query, setQuery] = useState('')
  /* WHICH DRAWER IS OPEN, or none. A position inside this page and
     nowhere else: it is not stored on the module, because which
     heading somebody is reading is not a fact about the place. */
  const [openKey, setOpenKey] = useState<string | null>(null)
  /* PROPERTY 3 — THE NARROWING SWITCHED OFF, WITHOUT LOSING IT.
     `openKey = null` would also show everything, and it is not the
     same act: it forgets which drawer was open, so the switch could
     only ever go one way and "Show what fits" would have nothing to
     go back to. The drawer is remembered and the rule is suspended. */
  const [showAll, setShowAll] = useState(false)

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
  /* THE DISCONTINUED HALF ONLY. `listed` is the module's tables minus
     the retired ones, so this is `countDiscontinued` over live tables
     and nothing else — the bucket `@/features/curation` calls
     `withheld` and prints in the contract's own words. */
  const heldSold = useMemo(() => heldBackRowCount(listed, rowsByEntity), [listed, rowsByEntity])
  const retiredTables = useMemo(() => tables.filter(isRetired), [tables])
  /* AND THE RETIRED HALF, WHICH IS A FACT ABOUT TABLES. Its rows were
     never candidates for this catalogue, so they are not in the pool
     the curation note does arithmetic over; folding them in would
     print "no longer sold" over stock that is nothing of the kind. It
     gets its own sentence, once, naming the tables. */
  const retiredRows = useMemo(
    () => retiredTables.reduce((n, t) => n + (rowsByEntity[t.id]?.length ?? 0), 0),
    [retiredTables, rowsByEntity],
  )

  /* WHAT THIS PLACE IS MADE OF, in the dealer's own nouns. The same
     reader the dashboard card prints, so the card and the page it
     opens can never say two different things about one module. */
  const census = useMemo(
    () => moduleCensus(module, entities, rowsByEntity),
    [module, entities, rowsByEntity],
  )

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

  /* THE DRAWERS — the headings this register is banner'd under, built
     off the entries this page already made rather than off the rows a
     second time. Empty for a table that banners nothing. */
  const drawers = useMemo(() => categoryDrawers(entries, listed), [entries, listed])

  /* A REGISTER WITH MANY HEADINGS FILES ITSELF. A catalogue never
     does — its rows have faces — and neither does a register of four
     bands, which wants reading rather than opening. */
  const filing = module.index === 'rows' && drawers.length >= DRAWER_FLOOR
  const searching = canSearch && query.trim() !== ''

  const drawer = filing ? drawers.find((d) => d.key === openKey) : undefined
  /* the rule is in force: a drawer is open and nobody has switched
     it off */
  const narrowed = drawer !== undefined && !showAll

  /* A DRAWER FROM ANOTHER MODULE IS NOT A DRAWER HERE. Switching
     modules without unmounting would otherwise leave a key pointing
     at a heading on a table this place does not list — and leave the
     switch reading "Show what fits" with nothing to fit. */
  useEffect(() => {
    setOpenKey(null)
    setShowAll(false)
  }, [module.id])

  /* ── WHAT THE RULE ADMITS, COUNTED BEFORE ANYBODY TYPES ──────────
     `@/features/curation` is explicit that a search box is a pair of
     spectacles and not a curation: its three counts are counts of
     ROWS the rule decided about, and a figure that moved while
     somebody typed would be a second, quieter search result sitting
     next to the first. So the admitted set is a function of the
     drawer and the switch, and of nothing else. */
  const admitted = useMemo(
    () =>
      drawer === undefined || showAll
        ? entries
        : entries.filter((e) => drawerKey(e.tableId, e.branch) === drawer.key),
    [entries, drawer, showAll],
  )

  const admittedIds = useMemo(
    () => new Set(admitted.map((e) => `${e.tableId}:${e.rowId}`)),
    [admitted],
  )

  /* ── PROPERTY 2, AND THE BEHAVIOUR THAT CHANGED ──────────────────
     This page used to drop the drawer the moment three letters were
     typed, and say so in a sentence. It was honest and it was still
     the wrong shape: the narrowing a person chose vanished under
     them, the count of what the search had reached was never stated,
     and there was nothing to press to get it back — the drawer
     re-appeared when the box was cleared, which reads as the app
     changing its mind twice.

     `searchReach` searches the POOL and splits the answer: `within`
     is what the drawer already holds, `beyond` is what it is standing
     in front of. The drawer stays where it was put, the count on the
     far side is printed, and the sentence itself is the door. Word by
     word, not one long string — the lesson the view stage's rail
     learned and this file learned again, now written down once in
     `reach.ts` instead of a third time here. */
  const reach = useMemo(
    () =>
      searchReach({
        pool: entries,
        offered: admittedIds,
        idOf: (e: IndexEntry) => `${e.tableId}:${e.rowId}`,
        hayOf: (e: IndexEntry) => e.hay,
        term: canSearch ? query : '',
      }),
    [entries, admittedIds, canSearch, query],
  )

  const scope = reach.active ? reach.within : admitted

  /* THE CAP IS SHARED OUT, NOT SPENT IN ORDER. A flat slice gave the
     whole budget to the first tables and left the last one undrawn —
     and an undrawn table has no section head, so the member chip that
     promises to go to it pressed to no effect. See `capEntries`. */
  const shown = useMemo(() => capEntries(scope, INDEX_CAP), [scope])
  const hidden = scope.length - shown.length
  const sections = useMemo(() => groupEntries(shown, listed), [shown, listed])

  /* ============================================================
     THE FOUR PROPERTIES, THROUGH THE ONE MECHANISM.

     What this page used to draw itself, and what now maps onto what:

       1 · IT EXPLAINS ITSELF   `md-narrow-say` named the drawer and
           its column word. The same words, now the `what` clause of a
           `Narrowing`, so the chip and the paragraph are built from
           one string instead of two near-identical ones.
       2 · IT CAN BE SEARCHED PAST   it was, and it said so — but it
           dropped the drawer to do it and never counted what it
           reached. See the `reach` memo.
       3 · IT CAN BE SWITCHED OFF   `md-narrow-off` said "Show all",
           which is a state and not an act, and only went one way.
       4 · THE COUNT IS STATED   it was, twice, in two paragraphs with
           two denominators — the drawer's arithmetic here and the
           discontinued contract's over in `md-held`. A reader had no
           way to tell whether the two numbers overlapped. They are
           disjoint, they add up, and now they are ONE sentence,
           because the mechanism owns the arithmetic and delegates the
           words for the withheld half to `sellable.ts` itself.

     NO RATE IS CLAIMED. `Narrowing.measured` is optional exactly for
     this: nobody has measured how often a category heading is the
     right way to cut this register, so this narrowing says nothing
     about a rate rather than reaching for a plausible one.

     THE CAP IS NOT IN HERE. `INDEX_CAP` is a drawing budget, not a
     rule about the data — the mechanism's own note calls a cosmetic
     filter a pair of spectacles — so `md-more` keeps its own
     sentence below, in its own words, about its own number. */
  const curation = useMemo(
    () =>
      readCuration({
        /* the dealer's own word for the things in here, which is what
           `censusLine` already prints in the header */
        name: census.noun,
        counts: {
          pool: entries.length + heldSold,
          matched: admitted.length + heldSold,
          offered: admitted.length,
        },
        narrowings:
          narrowed && drawer
            ? [
                {
                  id: drawer.key,
                  what:
                    drawer.name === ''
                      ? `these sit under no ${drawer.of} on ${drawer.tableName}`
                      : `${drawer.name} is one ${drawer.of} on ${drawer.tableName}`,
                },
              ]
            : [],
        showingAll: showAll && drawer !== undefined,
        search: { term: query, beyond: reach.beyond.length },
      }),
    [census.noun, entries.length, heldSold, admitted.length, narrowed, drawer, showAll, query, reach.beyond.length],
  )

  /* The drawers cut by table, so each run keeps the head — and the
     anchor — a member chip already scrolls to. */
  const drawerRuns = useMemo(() => {
    const out: { tableId: string; list: Drawer[] }[] = []
    for (const d of drawers) {
      const last = out[out.length - 1]
      if (last && last.tableId === d.tableId) last.list.push(d)
      else out.push({ tableId: d.tableId, list: [d] })
    }
    return out
  }, [drawers])

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

  /* THE RULE VERB'S DOOR. It opens the one set-up surface and names
     the panel it promised, so pressing "Set rules" lands on the rules
     rather than at the top of five panels. The scroll belongs to the
     page that mounts, which is why this hands over a name and not a
     scroll. */
  const openRules = (): void => onSettings('rules')

  const style = { '--md-accent': accentVar(module.accent) } as CSSProperties

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
          <h2 className="md-idx-name">{module.name}</h2>
          {module.description === '' ? null : (
            <p className="md-idx-desc">{module.description}</p>
          )}
          {/* WHAT IS IN HERE, NOT JUST HOW MUCH. This read "2,937
              items · 3 tables · 699 not sold", which is three true
              figures and no picture of the place. `censusLine` names
              the dealer's own word for one of them and how many of
              their own headings they fall under, and it is the same
              sentence the dashboard card prints. */}
          <p className="md-idx-facts mono-label">
            {censusLine(census)}
            {multiTable ? ` · ${tables.length} tables` : ''}
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
          className="md-gear"
          title={`Set up ${module.name} — what may be done here, who may do it, and what it is attached to`}
          onClick={() => onSettings()}
        >
          <Gear size={ICON_SIZE.small} weight="light" aria-hidden="true" />
          <span className="md-gear-word">Settings</span>
        </button>
      </header>

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
                        /* AND IT CLEARS THE NARROWING ON THE WAY, for
                           the same reason it clears the find box: "show
                           me Rigging Kits" while a Parts drawer is open
                           would scroll to a head that is not drawn. */
                        onClick={() => {
                          setOpenKey(null)
                          setShowAll(false)
                          setGoingTo(t.id)
                        }}
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

      {/* THE NARROWING, NAMED — through `@/features/curation` and not
          in this file's own words. See the `curation` memo above for
          which part of this page each of the four properties replaced,
          and why the cap below is deliberately not in it.

          THE SEARCH BOX IS NOT HANDED OVER. The mechanism carries one,
          for surfaces that had none; this page has had a find box in
          its header since it was written, it is where a person looks
          for it, and two boxes on one screen searching the same rows
          is worse than either of the faults being fixed. So the READING
          takes the search — the term and the count on the far side of
          the narrowing — and the component draws the reach line and the
          switch. Property 2 is the count and the door, not the box. */}
      <CurationNote
        reading={curation}
        showingAll={showAll && drawer !== undefined}
        onShowAll={drawer === undefined ? undefined : setShowAll}
        tone="page"
      />

      {!canOpen ? (
        <p className="md-idx-note">
          Opening one is switched off for this module, so these are a list to read
          rather than a way in.
        </p>
      ) : null}

      {/* WHAT THIS CATALOGUE IS NOT SHOWING, AND WHY — THE HALF THAT
          IS ABOUT TABLES. The rows a module holds that are no longer
          sold are now said once, by the curation note above, in the
          discontinued contract's own clause; saying them again here
          with a second denominator is exactly the two-sentences fault
          that made a reader work out which count covered what.

          A RETIRED TABLE IS A DIFFERENT FACT and it kept its sentence.
          Its rows are not discontinued stock — the whole price file is
          history — so they were never candidates for this catalogue and
          are not in the pool the note does arithmetic over. It names
          the tables, because a person looking for a trailer wants the
          name of the file it went to, not a tally. */}
      {retiredTables.length > 0 && retiredRows > 0 ? (
        <p className="md-held" role="note">
          {retiredTables.map((t) => t.name).join(', ')}{' '}
          {retiredTables.length === 1 ? 'is' : 'are'} history rather than stock, so the{' '}
          {retiredRows.toLocaleString()} {retiredRows === 1 ? 'row' : 'rows'} on{' '}
          {/* THE PRONOUN FOLLOWS THE TABLE, NOT THE ROWS. One table of
              ten rows is "the 10 rows on IT"; two tables of one row
              each is "the 1 row on THEM". Reading both off the same
              count put "OBSOLETE Trailers … the 10 rows on them" on
              screen, which is the sentence a reader stops at. */}
          {retiredTables.length === 1 ? 'it' : 'them'}{' '}
          {retiredRows === 1 ? 'is' : 'are'} not listed here.{' '}
          {retiredTables.length === 1 ? 'The table stays' : 'The tables stay'} on the sheet,
          and a quote that already names one still opens, still totals and still prints.
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
          Browsing is switched off for {module.name}, so this list is not drawn. Press
          Settings to switch it back on.
        </p>
      ) : entries.length === 0 ? (
        <p className="md-none">
          {tables.length === 0
            ? 'The tables this module was made from are no longer on the sheet.'
            : listed.length === 0
              ? 'Every table in this module is history rather than stock, so there is nothing here to sell. The tables and their rows stay on the sheet.'
              : heldSold > 0
                ? 'Nothing in this module is still being sold. The rows stay on the sheet and a quote already naming one still opens.'
                : 'These tables have no rows yet. Add rows on the sheet and they appear here.'}
        </p>
      ) : scope.length === 0 ? (
        /* NOTHING IN THE OFFER. Whether anything exists on the OTHER
           side of the narrowing is the reach line's sentence, above,
           and it is a door — so this one says only what is true here
           and never implies the row is gone. */
        <p className="md-none">Nothing here matches “{query.trim()}”.</p>
      ) : filing && openKey === null && !searching ? (
        /* THE REGISTER, FILED. Its things are its headings, and each
           one carries what the sheet says about it: how many lines,
           and the cheapest and dearest of them. */
        drawerRuns.map((run) => {
          const section = listed.find((t) => t.id === run.tableId)
          if (!section) return null
          return (
            <section
              className="md-sec"
              key={run.tableId}
              id={`md-sec-${module.id}-${run.tableId}`}
              aria-label={section.name}
            >
              {multiTable ? (
                <SectionHead
                  name={section.name}
                  kind={section.kind && section.kind in TABLE_KINDS ? section.kind : 'custom'}
                  count={memberCounts.get(section.id) ?? 0}
                />
              ) : null}
              <ul className="md-drawers">
                {run.list.map((d) => (
                  <DrawerFace
                    key={d.key}
                    drawer={d}
                    /* opening a drawer puts the rule back IN force —
                       otherwise a person who pressed "Show everything"
                       once would open the next drawer onto the whole
                       register and read the switch as broken */
                    onOpen={() => {
                      setOpenKey(d.key)
                      setShowAll(false)
                    }}
                  />
                ))}
              </ul>
            </section>
          )
        })
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
}

function Section({
  domId,
  section,
  showHead,
  mode,
  canOpen,
  onOpen,
}: SectionProps): ReactElement {
  return (
    <section className="md-sec" id={domId} aria-label={section.name}>
      {showHead ? (
        <SectionHead name={section.name} kind={section.kind} count={section.count} />
      ) : null}

      {section.groups.map((group) => (
        <div className="md-grp" key={group.key}>
          {group.trail === '' ? null : (
            <p className="md-grp-trail mono-label">{group.trail}</p>
          )}
          {mode === 'tiles' ? (
            <ul className="md-tiles">
              {group.entries.map((e) => (
                <Tile
                  key={e.rowId}
                  entry={e}
                  /* WHAT THE THING IS WHEN THERE IS NO PHOTOGRAPH OF IT.
                     Its table's symbol and its own heading — both facts
                     this page already holds, handed down rather than
                     looked up again per tile. See `NoPicture`. */
                  kind={section.kind}
                  tableName={section.name}
                  canOpen={canOpen}
                  onOpen={onOpen}
                />
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
/* One table's head                                            */
/* ---------------------------------------------------------- */

/** THE SAME HEAD OVER BOTH DRAWINGS. A register that files itself
 *  into drawers still belongs to a table and still keeps that table's
 *  anchor so a member chip reaches it. Extracted rather than copied
 *  because two heads that could drift apart is two heads.
 *
 *  IT CARRIES NO HANDLES ANY MORE. Moving a table up the module's
 *  list and taking one out are the designer's "What this place lists",
 *  on the settings page — one owner for `tableIds` rather than two
 *  surfaces writing it. See ModuleSettings.tsx. */
function SectionHead({
  name,
  kind,
  count,
}: {
  name: string
  kind: TableKind
  count: number
}): ReactElement {
  return (
    <div className="md-sec-head">
      <span className="md-sec-mark">
        <TableKindSymbol kind={kind} size={ICON_SIZE.small} />
      </span>
      <h3 className="md-sec-name block-heading">{name}</h3>
      <span className="md-sec-count mono-label">{count}</span>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* A drawer — a register's thing                              */
/* ---------------------------------------------------------- */

/** One heading, as an object rather than a row: the sheet's own banner
 *  word, how many lines sit under it, and the cheapest and dearest of
 *  those lines. Both ends of the range are a REAL row in the drawer —
 *  never an average, never a rounding, and absent altogether when the
 *  table prices nothing. */
function DrawerFace({
  drawer,
  onOpen,
}: {
  drawer: Drawer
  onOpen: () => void
}): ReactElement {
  const range =
    drawer.low === '' ? '' : drawer.low === drawer.high ? drawer.low : `${drawer.low} – ${drawer.high}`
  /* THE SHEET REALLY DOES BANNER SOME LINES UNDER NOTHING — 27 parts
     and 74 dealer-fit packages sit under a spacer — so the drawer that
     holds them says so rather than being given a name it never had. */
  const name = drawer.name === '' ? `Under no ${drawer.of}` : drawer.name
  return (
    <li>
      <button
        type="button"
        className="md-drawer"
        aria-label={
          range === ''
            ? `${name}, ${drawer.count} of ${drawer.count === 1 ? 'one' : 'them'}`
            : `${name}, ${drawer.count}, ${range}`
        }
        onClick={onOpen}
      >
        <span className="md-drawer-top">
          <span className="md-drawer-mark">
            <TableKindSymbol kind={drawer.kind} size={ICON_SIZE.tiny} />
          </span>
          <span className="md-drawer-n mono-label">{drawer.count.toLocaleString('en-AU')}</span>
        </span>
        <span className="md-drawer-name">{name}</span>
        {range === '' ? null : <span className="md-drawer-range">{range}</span>}
      </button>
    </li>
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

/* ============================================================
   A TILE EARNS ITS SPACE.

   A photograph, a name and a price is enough to recognise a boat and
   not enough to choose between two of them — so the salesperson
   pressed a tile, read one number, came back, pressed the next. The
   face now carries the two or three FIGURES THAT DECIDE A SALE
   underneath the price.

   WHICH FIGURES IS NOT A DECISION THIS FILE MAKES. `tileFacts.ts`
   measures every column a person could sort or filter by — how much
   of the table it is filled on, and how far it splits the rows — and
   nominates the best two or three. Money is refused outright, because
   the tile already carries the one price the ladder adjudicated and a
   second money figure beside it is the "which number do I quote"
   failure. On the real sheet that produces OA Length, Int Length and
   Boat Weight on Highfield, ATM and Tare on NSM Custom Trailers, and
   nothing at all on Parts & Accessories. Nobody typed any of them.

   THE LABEL IS THE COLUMN'S OWN NAME, sentence case, because a name
   is a name (DESIGN_CONTRACT §3). The column's `description` — which
   on this sheet cites the workbook cell the figure was read out of —
   is on the title, so a figure on a customer-facing tile can always
   be traced back to the cell it came from.
   ============================================================ */
function Tile({
  entry,
  kind,
  tableName,
  canOpen,
  onOpen,
}: FaceProps & { kind: TableKind; tableName: string }): ReactElement {
  const facts = entry.facts ?? []
  const body = (
    <>
      <span className="md-tile-pic">
        <TilePicture
          img={entry.img}
          alt={entry.label}
          kind={kind}
          says={entry.branch === '' ? tableName : entry.branch}
        />
      </span>
      <span className="md-tile-name">{entry.label}</span>
      {/* NO EMPTY PRICE SLOT. A table that prices nothing draws no
          line at all, rather than a dash a salesperson could read as
          "free" or "ask". */}
      {entry.price === '' ? null : <span className="md-tile-price">{entry.price}</span>}
      {facts.length === 0 ? null : (
        <span className="md-tile-facts">
          {facts.map((f) => (
            <span className="md-tile-fact" key={f.label} title={f.say === '' ? undefined : f.say}>
              <span className="md-tile-fact-of">{f.label}</span>
              <span className="md-tile-fact-n">{f.value}</span>
            </span>
          ))}
        </span>
      )}
    </>
  )
  /* ONE SENTENCE FOR A READER, in the order the tile draws it. The
     face is now up to six spans and a picture; announced run together
     they are not a name. */
  const said = [entry.label, entry.price, ...facts.map((f) => `${f.label} ${f.value}`)]
    .filter((w) => w !== '')
    .join(', ')
  return (
    <li>
      {canOpen ? (
        <button
          type="button"
          className="md-tile"
          aria-label={said}
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
  kind,
  says,
}: {
  img: ImageRef | undefined
  alt: string
  kind: TableKind
  says: string
}): ReactElement | null {
  if (!img) return <NoPicture kind={kind} says={says} />
  return <Painted img={img} alt={alt} kind={kind} says={says} />
}

/* ============================================================
   A MISSING PHOTOGRAPH READS AS A DECISION, NOT AS A HOLE.

   THE MEASUREMENT. 108 of the 184 pictures on this sheet are local
   and paint; 76 are addresses on a host that will not serve them, and
   87 rows across the catalogue modules carry no picture column value
   at all. A grid where two tiles in five are empty grey wells does not
   read as "these rows have no photograph" — it reads as broken
   software, and a stakeholder stops trusting the page before they have
   read a word on it.

   A WELL CANNOT ANSWER THAT AND A PLATE CAN. So all three outcomes now
   draw the SAME SHAPE — a mark and one line of words, centred, on the
   sunken well — and only the words differ:

     the picture         the photograph
     an address we       a link mark and “Held as a link”, with the
       cannot paint        host's own reason on the title
     no picture at all   the TABLE'S OWN SYMBOL and the row's own
                           heading — “Sport”, “Open Boats”, “Anodes” —
                           so the tile still says what the thing IS

   Repeated down a grid, a shape somebody chose reads as a convention.
   That is the whole difference between a decision and a defect, and it
   costs nothing but consistency.

   NOTHING IS INVENTED AND NOTHING IS SUBSTITUTED. The word on the
   plate is the row's own first hierarchy value, or its table's name
   when the table banners nothing — both already resolved by
   `buildEntries`. Never another row's photograph, never a filename,
   never a hatched rectangle standing in for a picture that does not
   exist.

   CONTRAST. `--ink-soft` (#4b5462) on `--paper-sunken` (#f1f2f5) is
   6.8:1, both opaque — the same pair `.md-tile-held` measured beside
   it. `--ink-faint` would be 4.26:1 over this well and fails.
   ============================================================ */
function NoPicture({ kind, says }: { kind: TableKind; says: string }): ReactElement {
  return (
    <span className="md-tile-plain" aria-hidden="true">
      <TableKindSymbol kind={kind} size={ICON_SIZE.small} />
      {says === '' ? null : <span className="md-tile-plain-say">{says}</span>}
    </span>
  )
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
function HeldAsLink({
  img,
  kind,
  says,
}: {
  img: ImageRef
  kind: TableKind
  says: string
}): ReactElement {
  const why = heldAsLinkNote(img.src)
  return (
    <span className="md-tile-held" role="img" aria-label={`${imageLabel(img)} — ${why}`} title={why}>
      <span className="md-tile-held-mark">
        <TableKindSymbol kind={kind} size={ICON_SIZE.small} />
        <LinkSimple size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
      </span>
      <span className="md-tile-held-say">{HELD_AS_LINK}</span>
      {says === '' ? null : <span className="md-tile-plain-say">{says}</span>}
    </span>
  )
}

function Painted({
  img,
  alt,
  kind,
  says,
}: {
  img: ImageRef
  alt: string
  kind: TableKind
  says: string
}): ReactElement | null {
  const { paint, probe, at } = useImageDisplay(img.src)
  /* AND THE PLATE CARRIES WHAT THE THING IS TOO. "Held as a link" says
     why there is no photograph; the row's own heading says what the
     tile is a tile OF. A person scanning a brand with 93 reference
     plates in it needs the second one as much as the first. */
  if (!paint) return <HeldAsLink img={img} kind={kind} says={says} />
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
