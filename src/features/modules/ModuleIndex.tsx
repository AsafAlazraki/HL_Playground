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

   IT IS THE STOCK TAB NOW, AND IT IS SCOPED TO ONE PLACE.

   Two things changed and both are subtractions. The overview band
   that stood above these tiles — INSIDE, WHAT GOES WITH THESE, WHAT
   YOU CAN DO HERE, WHO MAY WORK HERE, WHAT HAS HAPPENED LATELY,
   WHERE TO START — was a module's own overview drawn on top of its
   catalogue because there was nowhere else to put it. There is now:
   `ModuleWorkspace` gives a module five tabs and this is one of
   them, so the overview is the Dashboard tab and the gear is the
   Settings tab. Every reader that fed those strips is unchanged and
   every one of them still runs; only where their answers are drawn
   moved. And nothing was deleted — `capabilityStates`, `accessRows`,
   `relatedTables` and `moduleActivity` are all still called, one
   room over.

   AND `place` NARROWS THE MODULE TO ONE TABLE. The modules grid
   draws one card per PLACE, so pressing Highfield must open
   Highfield and not the seven-brand bag it is filed in. That is one
   line — `moduleAt(owner, place)` — because every reader below takes
   a `ModuleDef`, so narrowing the module narrows the census, the
   entries, the drawers and the face at once.

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

   AND THE ONE THING THAT CAME BACK, WHICH IS NOT THE DESIGNER. The
   designer stayed on the settings page; three WRITE VERBS did not,
   because they were never a design surface — `add`, `edit` and
   `delete` are things a person does to a boat while standing in front
   of it, and they had been switches with no consumer since the module
   system landed. They are drawn here exactly while their switch is on,
   and every one of them is undoable. `writeCaps.ts` carries the
   reading and the sentences, and says precisely what is still blocked
   on somebody deciding who signs in.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { LinkSimple, ListBullets, Plus, SquaresFour } from '@phosphor-icons/react'
/* THE PRIMITIVES. A tile and a drawer are `<Card>`, the dense line
   is `<Row>`, every act is `<Button>` and the find box is `<Field>`.
   The local rules that drew them — `.md-tile`, `.md-row`,
   `.md-drawer`, `.md-quote-it`, `.md-face-act`, `.md-idx-add`,
   `.md-idx-find-*` and every hover, press and focus arm under them —
   are deleted from modules.css rather than layered under. */
import { Button, Card, Field, Row } from '@/ui'
import { useProjectStore } from '@/store/useProjectStore'
import { say, sayUndoable } from '@/store/notes'
import {
  accentVar,
  isRetired,
  TABLE_KINDS,
  type FieldDef,
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
import {
  buildEntries,
  capEntries,
  categoryDrawers,
  DRAWER_FLOOR,
  drawerKey,
  groupEntries,
  listedTables,
  moduleCensus,
  moduleTables,
  type Drawer,
  type IndexEntry,
  type IndexSection,
} from './read'
import { moduleAt } from './places'
/* ============================================================
   THE THREE WRITE VERBS, AND THE SWITCH THAT USED TO CHANGE
   NOTHING.

   This page read `browse`, `search` and `open` and stopped. `add`,
   `edit` and `delete` were in the contract, on the designer's
   switches and in the access grid's columns, and a grep of every
   `.tsx` in this feature found none of them outside a test — so an
   administrator could switch `edit` off for Boats and take nothing
   away, because there was nothing here to take.

   `writeCaps.ts` answers the three verbs and carries the sentences.
   It asks `mayDo(module, roleId, verb)` — so the ACCESS GRID decides
   this page as well as the designer's switches, which is
   `DECISIONS.md` §2 — and `useSessionRoleId` (`features/auth/role.ts`)
   is the only way the job standing here is produced. Never
   `user.roleId`: that file's own rule 1, and it is right, because
   `undefined` and `null` mean the same thing there and one of thirty
   readers would forget.
   ============================================================ */
import { useSessionRoleId } from '@/features/auth'
import {
  addLabel,
  addSays,
  addedSay,
  readWrites,
  removedSay,
  renamedSay,
  withheldSay,
} from './writeCaps'
import './modules.css'

/** How many items are drawn before the page asks you to narrow.
 *  240 is two full screens of tiles at any sensible width — enough
 *  that nobody meets the cap while browsing one brand, small
 *  enough that seven brands at once stay instant. */
const INDEX_CAP = 240

export interface ModuleStockProps {
  module: ModuleDef
  /** WHICH OF THE MODULE'S TABLES THIS IS THE STOCK OF, when the
   *  module holds more than one. The modules grid draws one card per
   *  PLACE — Highfield inside Boats — so a stock page that listed all
   *  seven brands would undo the split on the first press. Absent =
   *  the whole module, which is what a one-table module always is. */
  place?: string
  /** WHICH DRAWER TO OPEN ON, from the dashboard's range card. A
   *  SEED AND NOT A CONTROL: it sets where this page starts and the
   *  page owns it from there, which is why it is read once into
   *  `useState` rather than watched. The workspace keys this
   *  component on it, so arriving at a second series is a new page.
   *
   *  It does nothing where the catalogue is not filing itself into
   *  drawers — under `DRAWER_FLOOR` headings it is a grouped list,
   *  and landing on a drawer that is not drawn would be a lie. */
  openAt?: string
  /** clicking an item — the table it belongs to and the row itself */
  onOpen: (tableId: string, rowId: string) => void
  /** raise a quote for one item, standing here. See `FaceProps`. */
  onQuote?: ((tableId: string, rowId: string) => void) | undefined
  /** WHICH JOB IS STANDING HERE, for `mayDo`. Absent = ask the
   *  session, which is what the app does; a caller passes it only to
   *  stand this page up as somebody in particular, which is what a
   *  test does. `null` is a value and means "nobody in particular",
   *  so it is NOT the same as leaving it off. */
  roleId?: string | null
}

export function ModuleStock({
  module: owner,
  place,
  openAt,
  onOpen,
  onQuote,
  roleId,
}: ModuleStockProps): ReactElement {
  /* THE PLACE, NOT THE BAG IT IS FILED IN. Every reader below takes a
     `ModuleDef`, so narrowing the module to one of its tables narrows
     the census, the entries, the drawers and the face in one line —
     rather than each of them growing a second argument. */
  const module = useMemo(() => moduleAt(owner, place), [owner, place])
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  /* THE THREE WRITES, TAKEN OFF THE STORE ONE AT A TIME rather than
     as an object, so a catalogue nobody may write to subscribes to
     three stable function references and re-renders for none of them. */
  const addRow = useProjectStore((s) => s.addRow)
  const deleteRow = useProjectStore((s) => s.deleteRow)
  const updateCell = useProjectStore((s) => s.updateCell)
  const [query, setQuery] = useState('')
  /* WHICH FACE IS BEING RENAMED — `${tableId}:${rowId}`, or none. A
     position inside this page, like the open drawer and the density:
     it is not a fact about the business and it is written nowhere. */
  const [renaming, setRenaming] = useState<string | null>(null)
  /* WHICH DRAWER IS OPEN, or none. A position inside this page and
     nowhere else: it is not stored on the module, because which
     heading somebody is reading is not a fact about the place. */
  const [openKey, setOpenKey] = useState<string | null>(openAt ?? null)
  /* PROPERTY 3 — THE NARROWING SWITCHED OFF, WITHOUT LOSING IT.
     `openKey = null` would also show everything, and it is not the
     same act: it forgets which drawer was open, so the switch could
     only ever go one way and "Show what fits" would have nothing to
     go back to. The drawer is remembered and the rule is suspended. */
  const [showAll, setShowAll] = useState(false)

  /* GALLERY OR LIST — the catalogue and the register as one page at
     two densities. `moduleFace` decides which a place is BORN as and
     `ModuleDef.index` stores that decision; this is the person
     standing here overruling it for as long as they are, which is
     exactly why it is not written back. */
  const [dense, setDense] = useState<ModuleDef['index']>(() => owner.index)

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

  /* MORE THAN ONE TABLE IN VIEW — which, standing at a PLACE, is
     false by construction. It stays because a module whose tables an
     admin has not split is still one place, and its brand heads are
     the only thing telling seven runs apart. */
  const multiTable = tables.length > 1
  const browsing = module.capabilities.includes('browse')
  const canSearch = module.capabilities.includes('search')
  const canOpen = module.capabilities.includes('open')

  /* WHICH JOB IS STANDING HERE. Watched, not read once: an assignment
     can change mid-session and `role.ts` carries the subscription for
     exactly that reason — a catalogue still offering Take out to
     somebody whose job lost it an hour ago is the failure this whole
     wiring exists to stop, pointing the other way.

     THE PROP WINS WHERE A CALLER NAMED A JOB, and `null` is a value:
     "nobody in particular" is a job a test stands the page up as, and
     it is not the same as leaving the prop off. */
  const live = useSessionRoleId()
  const who = roleId === undefined ? live : roleId

  /* ── WHAT MAY BE WRITTEN HERE ────────────────────────────────────
     Off = nothing is drawn and nothing is said. Withheld = nothing is
     drawn and the reason IS said. On = the affordance works. On and
     blocked = the sentence, below the header, in the place the act
     would have been. See `writeCaps.ts`. */
  const writes = useMemo(
    () => readWrites(module, tables, listed, who),
    [module, tables, listed, who],
  )

  /* ONE WORDING PER FACT. With the tables off the sheet all three
     verbs are blocked by the same sentence, and printing it three
     times is how a person starts wondering whether they are three
     faults — the lesson `accessSay.ts` was written to record.

     THE WITHHELD VERBS ARE ONE SENTENCE FOR THE SAME REASON, and it
     comes FIRST: "you may not" is a different order of fact from "you
     may and it cannot work here", and a person who has been refused
     on account of their job does not need to read about the sheet. */
  /* THE ADD BUTTON CARRIES ITS OWN REFUSAL. `<Button refusedBecause>`
     draws the sentence beneath the control and ties it on with
     aria-describedby, so the add sentence is NOT repeated in this
     list — one wording per fact, in the place the act was refused.
     The edit and delete refusals explain affordances that are
     absent, so they stay here, under the header. */
  const refusals = useMemo(() => {
    const out: string[] = []
    if (writes.withheld.length > 0) out.push(withheldSay(module.name, writes.withheld, who))
    const carried = writes.add.on ? writes.add.blocked : undefined
    for (const stance of [writes.edit, writes.delete]) {
      if (
        stance.blocked !== undefined &&
        stance.blocked !== carried &&
        !out.includes(stance.blocked)
      ) {
        out.push(stance.blocked)
      }
    }
    return out
  }, [writes, module.name, who])

  /* A NEW ONE, IN THE MASTER TABLE — MODULE_SYSTEM §5's own words for
     what this switch does. The row is blank, it is undoable, and the
     app goes to it when opening is on: a blank row carries no banner
     value and sorts to the end of its table, so it is in neither the
     drawer that was open nor the search that was typed, and a button
     that appeared to do nothing would be the worse bug. */
  /* EVERY ONE OF THE THREE HANDLERS RE-ASKS `on`, and none of them
     leans on the control not being drawn. That is not belt and braces
     — the Add button is `aria-disabled` rather than `disabled`, so it
     is deliberately still pressable and this IS its guard; and a
     write gated only by a render is a write one conditional away from
     being ungated. The store is the last line and it has no idea what
     a capability is. */
  const startOne = useCallback(() => {
    const into = writes.into
    if (into === undefined || writes.add.on !== true || writes.add.blocked !== undefined) return
    const row = addRow(into.id)
    if (row === null) return
    sayUndoable(addedSay(into, canOpen))
    if (canOpen) onOpen(into.id, row.id)
  }, [writes, addRow, canOpen, onOpen])

  /* TAKEN OUT, THEN SAID — never asked first. Rule 9: an undoable act
     gets a toast with UNDO, not a dialog. MODULE_SYSTEM §5 wrote
     "with the same confirm the sheet uses", and the sheet no longer
     uses one: `@/store/notes` records that `window.confirm` is "the
     wrong instrument twice over" for an act the store can already put
     back. The toast names the row and pins the step. */
  const takeOut = useCallback(
    (tableId: string, rowId: string, label: string) => {
      const from = listed.find((t) => t.id === tableId)
      if (from === undefined || writes.delete.on !== true || writes.delete.blocked !== undefined) {
        return
      }
      deleteRow(tableId, rowId)
      sayUndoable(removedSay(label, from))
    },
    [listed, deleteRow, writes],
  )

  /* THE ONE FACT A CATALOGUE FACE OWNS is the item's own name, so
     that is what `edit` types into here. Every other column is the
     sheet's, which has the right editor for a figure, a date and a
     list — see `renameFieldOf` for why writing a free string into one
     of those is corruption rather than an edit. */
  const rename = useCallback(
    (tableId: string, rowId: string, from: string, to: string) => {
      setRenaming(null)
      const field = writes.renames.get(tableId)
      if (field === undefined || writes.edit.on !== true || writes.edit.blocked !== undefined) {
        return
      }
      const next = to.trim()
      if (next === from) return
      /* AN EMPTY NAME IS REFUSED WHERE IT IS REFUSED, and the old one
         is still on screen behind the note — rather than a row
         quietly becoming "(untitled highfield inflatables)" because
         somebody selected all and pressed Enter. */
      if (next === '') {
        say({ text: `A name cannot be empty, so ${from} is unchanged.`, tone: 'warn' })
        return
      }
      updateCell(tableId, rowId, field.id, next)
      sayUndoable(renamedSay(from, next))
    },
    [writes, updateCell],
  )

  /* WHAT EVERY FACE IS HANDED, or nothing at all. Absent = this
     catalogue writes nothing, and no face grows a control. */
  const acts: FaceActs | undefined = useMemo(() => {
    const canRename = writes.edit.on && writes.edit.blocked === undefined && writes.renames.size > 0
    const canRemove = writes.delete.on && writes.delete.blocked === undefined
    if (!canRename && !canRemove) return undefined
    return {
      renames: canRename ? writes.renames : new Map<string, FieldDef>(),
      removing: canRemove,
      renaming,
      onRename: setRenaming,
      onRenamed: rename,
      onTakeOut: takeOut,
    }
  }, [writes, renaming, rename, takeOut])

  /* THE DRAWERS — the headings this register is banner'd under, built
     off the entries this page already made rather than off the rows a
     second time. Empty for a table that banners nothing. */
  const drawers = useMemo(() => categoryDrawers(entries, listed), [entries, listed])

  /* How many items each member table brings, counted off the WHOLE
     list and not off what the search left — a head whose number
     changed as you typed would be a second, quieter search result. */
  const memberCounts = useMemo(() => {
    const out = new Map<string, number>()
    for (const e of entries) out.set(e.tableId, (out.get(e.tableId) ?? 0) + 1)
    return out
  }, [entries])

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
    /* AND NEITHER IS A HALF-TYPED NAME. A rename key points at a row
       on the table we have just left; carrying it across would open a
       box over whichever row happens to share the position. */
    setRenaming(null)
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






  const style = { '--md-accent': accentVar(module.accent) } as CSSProperties

  return (
    <section className="md-index" style={style} aria-label={module.name}>
      {/* THE BAR OF THE STOCK TAB — the find box, the density switch,
          and the one act that is about the WHOLE list rather than
          about an item on it.

          "AND NOTHING ELSE" IS WHAT THIS SAID, and it was true until
          `add` became a real switch. A new one belongs here for the
          same reason the density switch does: it is a decision about
          the list, not about a boat. Everything a person does to ONE
          item — open it, rename it, take it out, quote it — is on that
          item's own face, and the two never mix.

          WHAT LEFT THIS HEADER, AND WHERE IT WENT. The module's name,
          its description and its census stood here; they are now the
          workspace's own header, one level up, where they are true of
          every tab rather than of this one. The overview band that
          followed — INSIDE, WHAT GOES WITH THESE, WHAT YOU CAN DO
          HERE, WHO MAY WORK HERE, WHAT HAS HAPPENED LATELY, WHERE TO
          START — is the Dashboard tab, which is what those six strips
          always were: a module's own overview drawn above its stock
          because there was nowhere else to put it. Nothing was
          deleted; every one of them is still read by the same reader
          in `read.ts`. And the gear is gone because Settings is a tab
          now, beside this one. */}
      <header className="md-idx-head">
        {/* THE FIND BOX IS `<Field>`, WHICH DRAWS A REAL LABEL. It
            used to be a placeholder standing in for one, which is
            the fault field.css names: a placeholder disappears the
            moment a person types. */}
        {canSearch ? (
          <div className="md-idx-find">
            <Field
              type="search"
              label={`Find one in ${module.name} by name`}
              value={query}
              onChange={setQuery}
              placeholder="Type a name"
              inputMode="search"
            />
          </div>
        ) : null}

        {/* THE CATALOGUE AND THE REGISTER ARE ONE PAGE AT TWO
            DENSITIES. The register is the spreadsheet earning its
            place as a VIEW rather than as the front door: same rows,
            same order, same prices, one line each. `moduleFace`
            already decides which a place is BORN as; this is the
            person overruling it for as long as they are standing
            here, which is why it is not stored. */}
        <div className="md-idx-tools">
          <div className="md-density" role="group" aria-label="How much of each item to show">
            <button
              type="button"
              className="md-density-one"
              aria-pressed={dense === 'tiles'}
              onClick={() => setDense('tiles')}
            >
              <SquaresFour size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              Gallery
            </button>
            <button
              type="button"
              className="md-density-one"
              aria-pressed={dense === 'rows'}
              onClick={() => setDense('rows')}
            >
              <ListBullets size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              List
            </button>
          </div>

          {/* THE NEW BUTTON — MODULE_SYSTEM §5's own consequence for
              switching `add` on, and the first thing on this page ever
              to consume a write verb. Switched off it is not here at
              all; granted with nowhere to put a row it is here,
              refused, and the sentence saying why is under the control
              where the act was refused.

              `refusedBecause`, WHICH IS `aria-disabled` AND NOT
              `disabled`, AND THE DIFFERENCE IS THE WHOLE OF RULE 10.
              A `disabled` button leaves the tab order: a person moving
              by keyboard never lands on it, so they never meet the
              control that was refused and never reach the sentence
              explaining it. `<Button>` keeps the control where it is,
              blocks the press, and ties the reason on with
              `aria-describedby`, so the explanation arrives with the
              refusal instead of near it. The guard against the press
              is still `startOne`, which returns before writing
              anything — never the attribute. */}
          {writes.add.on ? (
            <Button
              tone="neutral"
              glyph={<Plus size={ICON_SIZE.tiny} weight="bold" />}
              refusedBecause={writes.add.blocked}
              {...(writes.into ? { title: addSays(writes.into) } : {})}
              onClick={startOne}
            >
              {writes.into ? addLabel(writes.into, listed.length > 1) : 'Add one'}
            </Button>
          ) : null}
        </div>
      </header>


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

      {/* A WRITE VERB THAT CANNOT BE USED SAYS SO, HERE.
          Nothing is said for a verb the module does not OFFER:
          browse/search/open is the contract's own default, so every
          module ever made writes nothing, and three apologies at the
          top of every catalogue would be noise over a price list.

          Two cases DO need saying, and they are the two this list
          holds. The verb is offered and kept from the job standing
          here — a decision an administrator made, which is not the
          normal state of anything. Or it is granted and the affordance
          cannot work, which without a sentence reads as the app being
          broken.

          THE ADD SENTENCE CARRIES AN ID because a control survives its
          own refusal — see the button. Nothing else here needs one:
          the other refusals explain affordances that are absent, and
          an absent control has nothing to describe. */}
      {refusals.map((why) => (
        <p className="md-idx-note" key={why}>
          {why}
        </p>
      ))}

      {/* AND THE HALF-CASE: some tables here can be renamed and some
          cannot, so the faces differ and the reason is a column rather
          than a setting. Drawn only when both kinds are present —
          with none renameable the refusal above is already the
          sentence. */}
      {writes.edit.on && writes.unnameable.length > 0 ? (
        <p className="md-idx-note">
          {writes.unnameable.join(', ')}{' '}
          {writes.unnameable.length === 1 ? 'is' : 'are'} not renamed here:{' '}
          {writes.unnameable.length === 1 ? 'its name' : 'their names'} sit in a formula, a
          figure or a picked-from-a-list column, and the sheet has the right editor for
          those.
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
          {/* THE APOLOGY CAME OFF THE END. It closed "so nothing has
              been lost and nothing has been substituted — the day
              those pictures can be fetched, the same tiles paint
              them": forty words of the app defending itself after a
              nineteen-word fact. The clause that survives is the one
              a person can check. */}
          . The addresses travel with every export.
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
                <TableHead
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
            {...(onQuote ? { onQuote } : {})}
            {...(acts ? { acts } : {})}
            key={section.tableId}
            /* the anchor a member chip scrolls to. Keyed on the MODULE
               too: two modules sharing a table would otherwise write
               the same id, and only one of them could be reached. */
            domId={`md-sec-${module.id}-${section.tableId}`}
            section={section}
            showHead={multiTable}
            mode={dense}
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
  /** raise a quote for one item, handed down to every face. */
  onQuote?: ((tableId: string, rowId: string) => void) | undefined
  /** what may be WRITTEN to one item, handed down to every face.
   *  Absent = neither `edit` nor `delete` is in force here, and no
   *  face grows a control. */
  acts?: FaceActs | undefined
}

function Section({
  domId,
  section,
  showHead,
  mode,
  canOpen,
  onOpen,
  onQuote,
  acts,
}: SectionProps): ReactElement {
  return (
    <section className="md-sec" id={domId} aria-label={section.name}>
      {showHead ? (
        <TableHead name={section.name} kind={section.kind} count={section.count} />
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
                  {...(onQuote ? { onQuote } : {})}
                  {...(acts ? { acts } : {})}
                  onOpen={onOpen}
                />
              ))}
            </ul>
          ) : (
            <ul className="md-rows">
              {group.entries.map((e) => (
                <Line
                  key={e.rowId}
                  entry={e}
                  canOpen={canOpen}
                  onOpen={onOpen}
                  {...(onQuote ? { onQuote } : {})}
                  {...(acts ? { acts } : {})}
                />
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
 *  NOT `<SectionHead>` FROM src/ui, AND THAT IS RULE 3. The
 *  primitive's one style is the uppercase label, and this head is a
 *  TABLE'S NAME — `PVC` uppercased cannot be told from a value the
 *  dealer typed as `Pvc`. A section head whose caption is a name is
 *  a shape the layer does not have yet; it is reported as missing
 *  rather than forced through the caption step.
 *
 *  IT CARRIES NO HANDLES ANY MORE. Moving a table up the module's
 *  list and taking one out are the designer's "What this place lists",
 *  on the settings page — one owner for `tableIds` rather than two
 *  surfaces writing it. See ModuleSettings.tsx. */
function TableHead({
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
  /* THE DRAWER IS `<Card onActivate>` — the same primitive the tile
     takes, at the same press (0.994 and a lost lift), because it IS
     the repeated object of DESIGN_CONTRACT §5 at register density. */
  return (
    <li className="md-drawer-slot">
      <Card
        tone="raised"
        pad="sm"
        label={
          range === ''
            ? `${name}, ${drawer.count} of ${drawer.count === 1 ? 'one' : 'them'}`
            : `${name}, ${drawer.count}, ${range}`
        }
        onActivate={onOpen}
      >
        <span className="md-tile-in">
          <span className="md-drawer-top">
            <span className="md-drawer-mark">
              <TableKindSymbol kind={drawer.kind} size={ICON_SIZE.tiny} />
            </span>
            <span className="md-drawer-n mono-label">{drawer.count.toLocaleString('en-AU')}</span>
          </span>
          <span className="md-drawer-name">{name}</span>
          {range === '' ? null : <span className="md-drawer-range">{range}</span>}
        </span>
      </Card>
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
  /* ============================================================
     QUOTE THIS ONE, FROM WHERE YOU ARE STANDING.

     WHAT IT COST NOT TO HAVE. A salesperson in Highfield's
     catalogue, looking at the boat they intend to sell, could do
     exactly one thing with it: open the row. To quote it they left
     the catalogue, pressed New quote, chose Highfield again out of
     twenty-five places, and found the same boat a second time in a
     list of 588. Three screens and two searches to get back to the
     thing already under the cursor.

     THE CATALOGUE IS WHERE THE CHOOSING HAPPENS, so it is where the
     act belongs. Absent = the host cannot open a quote, and then no
     button is drawn rather than one that goes nowhere. */
  onQuote?: ((tableId: string, rowId: string) => void) | undefined
  /** what may be WRITTEN to this one. Absent = nothing. */
  acts?: FaceActs | undefined
}

/* ============================================================
   WHAT A FACE MAY DO TO ITS OWN ROW.

   ONE OBJECT RATHER THAN SIX PROPS, and not for tidiness: the
   presence of the object is itself the answer. A catalogue where
   neither `edit` nor `delete` is in force hands down nothing, so
   every face below is the same markup it has always been and a
   read-only catalogue cannot accidentally grow a control.

   `renames` IS THE PER-TABLE ANSWER, not a boolean. Boats and Rate
   Card can sit in one catalogue, and one of them names its rows in a
   column a person may type into while the other names them with a
   figure. A face asks the map about ITS OWN table; the tables that
   answered no are named once, in a sentence under the header, rather
   than silently drawing two kinds of face. See `writeCaps.ts`.
   ============================================================ */
interface FaceActs {
  /** the column a rename types into, per table id. A face whose table
   *  is absent from this map carries no rename. */
  renames: Map<string, FieldDef>
  /** `delete` is in force and can be performed */
  removing: boolean
  /** which face is open for renaming — `${tableId}:${rowId}` */
  renaming: string | null
  onRename: (key: string | null) => void
  onRenamed: (tableId: string, rowId: string, from: string, to: string) => void
  onTakeOut: (tableId: string, rowId: string, label: string) => void
}

/** The one key a face is known by on this page. */
const faceKey = (entry: IndexEntry): string => `${entry.tableId}:${entry.rowId}`

/* ============================================================
   THE ACTS ON ONE FACE — one right-anchored cluster, revealed on
   approach.

   WHY QUOTE IT MOVED INSIDE. It was a lone absolutely-positioned
   button in the corner, which was right while it was the only act a
   face had. With a rename and a take-out beside it, three siblings
   each doing their own positioning arithmetic is three chances to
   overlap — and on the 40px dense line there is exactly one free
   strip and all three want it. So the CLUSTER is positioned and
   revealed, and the buttons inside it are ordinary buttons in a row.
   Quote it keeps its paint, its place at the outer edge and its
   press; nothing about it changed except who owns its coordinates.

   THE DESTRUCTIVE ONE IS NOT THE PRIMARY ONE, and they do not look
   alike: Quote it is the filled accent, the two writes are quiet
   outlines, and there is a full gap between the pair and the sale.
   ============================================================ */
function FaceActs({
  entry,
  inline,
  acts,
  onQuote,
}: {
  entry: IndexEntry
  /** the dense line, which reveals at the end of the row rather than
   *  over the top of a 40px strip */
  inline: boolean
  acts?: FaceActs | undefined
  onQuote?: ((tableId: string, rowId: string) => void) | undefined
}): ReactElement | null {
  const canRename = acts !== undefined && acts.renames.has(entry.tableId)
  const canRemove = acts?.removing === true
  if (!canRename && !canRemove && onQuote === undefined) return null
  /* THREE `<Button>`s IN THREE TONES: the sale is the accent, the
     rename is neutral, and the take-out is the danger outline —
     which button.css draws as an outline and not a red fill, because
     the act is undoable and gets a toast, not a shout. */
  return (
    <div className={inline ? 'md-face-acts is-inline' : 'md-face-acts'}>
      {canRename && acts ? (
        <Button
          tone="neutral"
          size="sm"
          aria-label={`Rename ${entry.label}`}
          onClick={() => acts.onRename(faceKey(entry))}
        >
          Rename
        </Button>
      ) : null}
      {canRemove && acts ? (
        <Button
          tone="danger"
          size="sm"
          aria-label={`Take ${entry.label} out of the catalogue`}
          onClick={() => acts.onTakeOut(entry.tableId, entry.rowId, entry.label)}
        >
          Take out
        </Button>
      ) : null}
      {onQuote ? (
        <Button tone="primary" size="sm" onClick={() => onQuote(entry.tableId, entry.rowId)}>
          Quote it
        </Button>
      ) : null}
    </div>
  )
}

/* ============================================================
   THE NAME, OPEN FOR TYPING.

   THE FACE STOPS BEING A BUTTON WHILE THIS IS ON SCREEN. An input
   inside a button is not a control — it is markup a browser is
   entitled to reject, which is the same reason Quote it has always
   been a sibling rather than a child. So the tile and the row render
   their flat variant for as long as one of them is being renamed, and
   the door comes back the moment it closes.

   NOTHING HERE ANIMATES. This is reached by a press and left by a
   keystroke, both of them repeated, and the motion budget bars a
   transition on either.

   THE FOCUS CALLBACK IS STABLE ON PURPOSE. An inline `ref={(el) =>
   el?.select()}` is a new function every render, so React detaches
   and re-attaches it on every keystroke and re-selects the whole
   value under the cursor. One `useCallback` with no dependencies
   runs it once, at mount, which is when a person wants their old
   name selected and ready to be typed over.
   ============================================================ */
function RenameBox({
  value,
  className = '',
  onDone,
  onCancel,
}: {
  value: string
  /** the face's own name class, so the box inherits the face's step
   *  and the tile does not change height when a span becomes an
   *  input. The dense line's name step is `<Row>`'s and needs none. */
  className?: string
  onDone: (next: string) => void
  onCancel: () => void
}): ReactElement {
  const [text, setText] = useState(value)
  const settled = useRef(false)
  const focusOnce = useCallback((el: HTMLInputElement | null) => {
    if (el) {
      el.focus()
      el.select()
    }
  }, [])
  /* ONE COMMIT, NOT TWO. Enter writes and closes the box; a blur that
     arrived after it would write the same value a second time and
     raise a second toast offering to undo an act that already has
     one. */
  const settle = (next: string | null): void => {
    if (settled.current) return
    settled.current = true
    if (next === null) onCancel()
    else onDone(next)
  }
  return (
    <input
      ref={focusOnce}
      className={`field-input md-rename ${className}`}
      type="text"
      value={text}
      spellCheck={false}
      aria-label={`Rename ${value}`}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        /* the catalogue's own find box and the workspace's tabs both
           listen above this; a name being typed is not a shortcut */
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          settle(text)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          settle(null)
        }
      }}
      onBlur={() => settle(text)}
    />
  )
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
  onQuote,
  acts,
}: FaceProps & { kind: TableKind; tableName: string }): ReactElement {
  const facts = entry.facts ?? []
  const naming = acts !== undefined && acts.renaming === faceKey(entry)
  const body = (
    <span className="md-tile-in">
      <span className="md-tile-pic">
        <TilePicture
          img={entry.img}
          alt={entry.label}
          kind={kind}
          says={entry.branch === '' ? tableName : entry.branch}
        />
      </span>
      {naming && acts ? (
        <RenameBox
          value={entry.label}
          className="md-tile-name"
          onDone={(next) => acts.onRenamed(entry.tableId, entry.rowId, entry.label, next)}
          onCancel={() => acts.onRename(null)}
        />
      ) : (
        <span className="md-tile-name">{entry.label}</span>
      )}
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
    </span>
  )
  /* ONE SENTENCE FOR A READER, in the order the tile draws it. The
     face is now up to six spans and a picture; announced run together
     they are not a name. */
  const said = [entry.label, entry.price, ...facts.map((f) => `${f.label} ${f.value}`)]
    .filter((w) => w !== '')
    .join(', ')
  return (
    <li className="md-tile-slot">
      {/* THE TILE IS `<Card>`. With `onActivate` it is a real button
          with the card's own press and focus ring; without, a still
          card. THE DOOR STANDS DOWN WHILE THE NAME IS BEING TYPED — an
          input inside a button is markup a browser may reject, and
          pressing a tile you are renaming should not navigate away
          from the half-typed word. */}
      {canOpen && !naming ? (
        <Card
          tone="raised"
          pad="sm"
          label={said}
          onActivate={() => onOpen(entry.tableId, entry.rowId)}
        >
          {body}
        </Card>
      ) : (
        <Card tone="raised" pad="sm">
          {body}
        </Card>
      )}
      {/* SIBLINGS, NOT CHILDREN, for the same reason: the tile is
          itself a button. The cluster is laid over the tile's corner
          and appears on approach. */}
      {naming ? null : (
        <FaceActs
          entry={entry}
          inline={false}
          {...(acts ? { acts } : {})}
          {...(onQuote ? { onQuote } : {})}
        />
      )}
    </li>
  )
}

/** The dense line. IT DOES NOT REPEAT ITS OWN TRAIL: the group
 *  heading above it already says "EPROPULSION - ELECTRIC OUTBOARDS",
 *  and printing that again on all fourteen rows underneath is a
 *  column of noise where the eye is trying to compare names and
 *  numbers. Drawn and seen; the trail is on the heading, once. */
function Line({ entry, canOpen, onOpen, onQuote, acts }: FaceProps): ReactElement {
  const naming = acts !== undefined && acts.renaming === faceKey(entry)
  /* THE DENSE LINE IS `<Row dense>`. Its name slot holds the label,
     or the rename box while one is open; the price sits in `meta` in
     mono and in FULL ink, because a price is what the customer reads
     over a shoulder and is not metadata — the layer has no trailing
     figure slot on an activating row yet, and that is reported. */
  const name =
    naming && acts ? (
      <RenameBox
        value={entry.label}
        onDone={(next) => acts.onRenamed(entry.tableId, entry.rowId, entry.label, next)}
        onCancel={() => acts.onRename(null)}
      />
    ) : (
      entry.label
    )
  const meta = entry.price === '' ? undefined : <span className="md-figure">{entry.price}</span>
  return (
    <li className="md-row-slot">
      {canOpen && !naming ? (
        <Row
          dense
          name={name}
          meta={meta}
          label={entry.price === '' ? entry.label : `${entry.label}, ${entry.price}`}
          onActivate={() => onOpen(entry.tableId, entry.rowId)}
        />
      ) : (
        <Row dense name={name} meta={meta} />
      )}
      {naming ? null : (
        <FaceActs
          entry={entry}
          inline
          {...(acts ? { acts } : {})}
          {...(onQuote ? { onQuote } : {})}
        />
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
