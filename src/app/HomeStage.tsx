/* ============================================================
   HOME — the Finder window, and the app's front door.

   THE ARGUMENT AGAINST THE SHEET AS A LANDING SURFACE.

   The blueprint is a good drawing and a bad home. Landing on it,
   a person meets fifty-two rectangles scattered across an
   infinite plane at whatever zoom the camera happened to pick.
   Nothing is grouped, nothing is sorted, most of it is off
   screen, and the only way to look for something is to pan. It
   answers "how do these tables relate" - which is a real question
   somebody asks perhaps once a week - and it answers "where is
   Stacer" not at all, which is the question they ask forty times
   a day.

   So the sheet stops being the front door and becomes a VIEW, one
   click away on the dock, for the job it is actually good at.

   WHAT REPLACES IT is the thing every Mac user already knows: a
   Finder window in gallery view. Your tables, grouped by what
   they hold, sorted, every one of them on screen at once, each a
   card you can read from across the room. Nothing to pan, nothing
   to zoom, nothing off the edge.

   ============================================================
   THE THREE FAULTS THE BOARD FIXES, MEASURED AT 1920x1200.

   1 · THE GRID WAS RAGGED. Every group was a full-width band with
   its own `auto-fill` grid, so a group's cards filled the first
   row and left the rest of it empty. Boats filled a row of seven;
   Motors drew two cards and left 72% of a 1629px row as a hole,
   and Accessories, Packages and Custom table did the same. Five
   of seven groups were mostly hole. A band that is mostly empty
   does not read as spacious, it reads as broken.

   THE FIX IS THAT A GROUP IS NO LONGER A BAND. It is a SHELF,
   and a shelf is TWO CARDS TALL AND AS WIDE AS IT NEEDS TO BE.
   `shelfFor` below does the arithmetic: a group of n tables takes
   `n + (n odd ? 1 : 0)` cells — the extra cell is the lead card
   spanning two columns — and that count is always even, so it
   divides into exactly two rows. Boats (7) is 8 cells, 4 wide.
   Motors (2) is 2 cells, 1 wide. Packages (3) is 4 cells, 2 wide.
   Every shelf on the page is the same height, and its width says
   how much is in it. The board then packs them with
   `grid-auto-flow: dense`, so at 1920 Boats+Motors+Accessories
   fill one row of five units exactly and Trailers+Packages fill
   the next. There is no hole anywhere except at the very end of
   the last row, which is where a page is allowed to stop.

   2 · RELATIONSHIPS WAS 27 OF THE 51 CARDS and took more vertical
   space than every product group combined. A join table is
   derived plumbing: it is the least important thing on this page
   and it was the biggest. It is now ONE collapsed shelf at the
   foot of the board that states its own count, and opening it
   lists every one of the 27 UNDER THE TABLE IT JOINS — which is
   the answer the owner asked for. `ownerOf` derives that from the
   join's own first reference field, so nothing is written by hand
   and a join whose owner cannot be resolved still gets a home
   (see `orphans`). Nothing is unreachable and no count is hidden.

   3 · CARD TITLES WRAPPED TO TWO LINES ON SOME CARDS AND ONE ON
   OTHERS, so row heights were uneven and the grid looked broken.
   The name box now RESERVES both of its lines whether or not the
   second one is used, and takes `text-wrap: balance`, so a
   one-line card is exactly as tall as a two-line one.

   4 · AND THERE ARE PHOTOGRAPHS NOW, WHICH IS THE PART THAT HAD
   TO BE EARNED RATHER THAN DECORATED. See `shotFor`.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { CaretRight } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  TABLE_KINDS,
  accentVar,
  isRetired,
  primaryImage,
  type EntityDef,
  type RowData,
  type TableKind,
} from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { countLabel, kindNoun, leafNoun } from '@/features/table/grouping'
import { ImportExportMenu } from '@/features/io'
import { ICON_SIZE, StructureIcon } from '@/lib/icons'
import {
  noteImageFailed,
  noteImageLoaded,
  seededCopy,
  useImageDisplay,
} from '@/lib/imageSources'
import { realDemoSet, startingPointWords } from './demoLoad'
import { useDemoLoad } from './useDemoLoad'
import { useClipTitles } from './useClipTitles'

const KIND_ORDER: TableKind[] = [
  'boat',
  'motor',
  'trailer',
  'accessory',
  'package',
  'dealer',
  'custom',
]

/* How far into a table we are willing to walk looking for a
   photograph we are allowed to draw. Every table in the prepared
   set answers inside 66 rows; the bound is here so a 2,937-row
   parts list with no pictures in it costs nothing. */
const SHOT_SCAN = 240

export interface HomeStageProps {
  onOpenTable: (entityId: string) => void
  /** Put the new-table dialog up. The shell hosts it for all three ways
   *  in — the dock's NEW TABLE, a type dropped on the sheet, and this
   *  screen — so there is one place the structure question is asked. */
  onNewTable?: () => void
}

/* ---------------------------------------------------------- */
/* THE PHOTOGRAPH, AND WHY EACH ONE IS ALLOWED TO BE THERE     */
/* ---------------------------------------------------------- */

/** One picture, and the row it came off.
 *
 *  THE CHAIN, STATED, BECAUSE THE WHOLE VALUE OF THIS IS THAT IT
 *  IS NOT DECORATION. A card may show a photograph if and only if
 *  the photograph is on a row OF THAT TABLE. Nothing is matched by
 *  resemblance, nothing is borrowed from a sibling, and no card
 *  gets a stock picture: `shotFor` walks THIS table's own rows in
 *  their own order and takes the first primary image on any of
 *  its own image columns. A table with no image column, or no row
 *  carrying one, gets no photograph — it gets the kind's mark on a
 *  plate, which is what every module card without a logo already
 *  draws. Putting one brand's boat on another brand's card would
 *  be inventing business content, which is worse than a plate.
 *
 *  WHY `seededCopy` DECIDES WHICH ROW, AND NOT SIMPLY THE FIRST.
 *  The catalogue holds ADDRESSES, not pixels, and two of the
 *  eleven hosts in it can never answer a browser (imageSources.ts
 *  names both, measured). The repository ships its own copy of 220
 *  of those addresses under `public/seed-images`; `seededCopy` is
 *  the pure, non-hook question "do we hold this one". Skipping to
 *  the first address we HOLD keeps every picture on this screen
 *  same-origin — no network, no wait, no cross-origin console line
 *  behind a stakeholder's dev tools — while staying inside the one
 *  table the card is about. Three tables in the set (Mackay,
 *  Dunbier/Haines BMT, and the retired one) hold nothing drawable
 *  and are drawn as plates. That is the honest answer for them. */
interface Shot {
  /** the address as the RECORD holds it — never rewritten here */
  src: string
  alt: string
}

function shotFor(entity: EntityDef, rows: RowData[] | undefined): Shot | null {
  if (rows === undefined || rows.length === 0) return null
  const columns = entity.fields.filter((f) => f.type === 'image')
  if (columns.length === 0) return null
  let seen = 0
  for (const row of rows) {
    for (const column of columns) {
      const pic = primaryImage(row.values[column.id] ?? null)
      if (pic === undefined) continue
      seen += 1
      if (seededCopy(pic.src) !== null) {
        const alt = pic.alt?.trim() ?? ''
        return { src: pic.src, alt }
      }
      break
    }
    if (seen >= SHOT_SCAN) break
  }
  return null
}

/* ---------------------------------------------------------- */
/* THE SHELF ARITHMETIC — fault 1                             */
/* ---------------------------------------------------------- */

/** How wide a group of `n` tables stands, and whether its lead card
 *  takes two columns.
 *
 *  A shelf is TWO CARD ROWS TALL, always, so every shelf on the
 *  board is the same height and a row of shelves cannot come out
 *  ragged. Its WIDTH is what varies, and it varies with how much
 *  the group holds — which is the honest signal to give a reader
 *  looking at a page of groups.
 *
 *  The cells: n cards, plus one more when n is odd because the
 *  lead card then spans two columns. That total is even by
 *  construction, so `cells / 2` columns fills exactly two rows
 *  with nothing left over. Seven boats is eight cells in four
 *  columns; two motors is two cells in one column; three packages
 *  is four cells in two columns.
 *
 *  THE CAP EXISTS SO ONE HUGE GROUP CANNOT BE THE WHOLE BOARD, and
 *  when it bites it takes the largest DIVISOR of the cell count
 *  rather than the cap itself — a shelf that does not divide
 *  evenly is the ragged row this function was written to remove.
 *  Such a shelf is taller than two rows, which is the right trade:
 *  full rows, more of them. */
const SHELF_CAP = 5

function shelfFor(n: number): { units: number; lead: number } {
  if (n <= 1) return { units: 1, lead: 1 }
  const cells = n + (n % 2)
  let units = cells / 2
  if (units > SHELF_CAP) {
    let widest = 1
    for (let d = SHELF_CAP; d >= 1; d -= 1) {
      if (cells % d === 0) {
        widest = d
        break
      }
    }
    units = widest
  }
  return { units, lead: n % 2 === 1 ? Math.min(2, units) : 1 }
}

/* ---------------------------------------------------------- */
/* THE JOIN'S OWNER — fault 2                                 */
/* ---------------------------------------------------------- */

/** The table a join belongs UNDER, derived rather than declared.
 *
 *  A join exists to pair two subjects, and its own first reference
 *  column names the one it is a join OF — every one of the 27 in
 *  the prepared set reads `Boat → …` first, whether it goes on to
 *  a motor, a trailer, a part or a dealer-fit package. So the
 *  owner is the first reference that resolves to a live table
 *  which is not itself a join.
 *
 *  It can fail, and failing is not allowed to lose anything: a
 *  join with no resolvable owner is an orphan, and orphans get
 *  their own list at the end of the same shelf. Nothing on this
 *  screen may become unreachable. */
function ownerOf(join: EntityDef, live: Map<string, EntityDef>): EntityDef | undefined {
  for (const field of join.fields) {
    if (field.type !== 'reference') continue
    const target = field.refEntityId === undefined ? undefined : live.get(field.refEntityId)
    if (target !== undefined && target.role !== 'join') return target
  }
  return undefined
}

/** The join's name with the owner's own name taken off the front.
 *
 *  "Highfield × Yamaha — Motor Fitment" sitting under a heading
 *  that reads "Highfield Inflatables" says Highfield twice. The
 *  prefix is only removed when it really is the owner's name —
 *  `startsWith`, so a table called something else keeps every word
 *  — and the whole name is still on the control's `title` and its
 *  accessible name, so nothing is lost to the eye or the reader. */
function joinShortName(join: EntityDef, owner: EntityDef | undefined): string {
  if (owner === undefined) return join.name
  const cut = join.name.indexOf(' × ')
  if (cut <= 0) return join.name
  const head = join.name.slice(0, cut)
  if (!owner.name.startsWith(head)) return join.name
  return join.name.slice(cut + 3)
}

/* ---------------------------------------------------------- */
/* what the screen is drawn from                              */
/* ---------------------------------------------------------- */

interface Card {
  entity: EntityDef
  rows: number
  shot: Shot | null
}

interface Shelf {
  key: string
  label: string
  kind: TableKind
  cards: Card[]
  /** rows across the whole group, in the kind's own word. The figure
   *  and the word are kept apart because only the figure is mono —
   *  "810" is a number and "boats" is not. */
  held: { n: number; word: string } | null
  units: number
  lead: number
}

interface JoinRow {
  join: EntityDef
  rows: number
  short: string
}

interface JoinFamily {
  owner: EntityDef | null
  rows: JoinRow[]
}

export function HomeStage({ onOpenTable, onNewTable }: HomeStageProps) {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const org = useProjectStore((s) => s.meta.org)

  const tables = useMemo(() => Object.values(entities), [entities])

  /* the prepared set, for the empty state's door. Resolved from the
     demos register rather than named here, so the offer disappears
     with the set instead of dangling. */
  const real = realDemoSet()
  /* AND IT CALLS THE SET WHAT IT IS. This door read "Load a worked
     example — another dealer's price file" directly above a provenance
     line naming Northside Marine's own Master Price File — the app's
     first screen, telling its first real customer that their catalogue
     belongs to a stranger. `startingPointWords` holds the whole
     argument; both doors read the same three lines off it, so they
     cannot drift apart again. */
  /* THE SET IS ITS OWN CHUNK NOW, so the door has a phase and the
     words are written from it — see useDemoLoad.ts. */
  const { phase, press, warm } = useDemoLoad()
  const words = real ? startingPointWords(real, org?.name, phase) : undefined

  /* NO FIND BOX HERE ANY MORE, and that is a ruling rather than a
     tidy-up: "i don't want search in top bar I want it in the bottom
     floating one". There is exactly ONE search in this app and it is
     the dock's "Find anything" — which answers the bigger question
     anyway, because it walks every ROW of every table as well as the
     table names, and lands you on the one you pick. */
  const { shelves, families, joinCount, total } = useMemo(() => {
    const live = tables.filter((e) => !isRetired(e))
    const byId = new Map(live.map((e) => [e.id, e]))
    const rowsOf = (e: EntityDef) => rowsByEntity[e.id]?.length ?? 0

    const out: Shelf[] = []
    for (const kind of KIND_ORDER) {
      const items = live
        .filter((e) => e.role !== 'join' && kindOf(e.kind) === kind)
        .sort((a, b) => a.name.localeCompare(b.name))
      if (items.length === 0) continue

      const cards: Card[] = items.map((entity) => ({
        entity,
        rows: rowsOf(entity),
        shot: shotFor(entity, rowsByEntity[entity.id]),
      }))

      /* WHICH CARD LEADS, AND IT IS NOT "THE FIRST ONE
         ALPHABETICALLY". The lead is twice as wide as its
         neighbours, so it is the group's headline and it should be
         the group's biggest table — Highfield's 588 hulls, not
         whichever brand starts with the earliest letter. Among
         tables of the same size, and where the biggest has no
         photograph we may draw, the biggest one that DOES leads:
         the wide slot is the only one on the page big enough for a
         picture to be worth anything, and a wide plate is a wide
         nothing. Both tests are counted, never typed. */
      let lead = 0
      const better = (a: Card, b: Card) => {
        if ((a.shot !== null) !== (b.shot !== null)) return a.shot !== null
        return a.rows > b.rows
      }
      for (let i = 1; i < cards.length; i += 1) {
        if (better(cards[i], cards[lead])) lead = i
      }
      const ordered = [cards[lead], ...cards.filter((_, i) => i !== lead)]

      const noun = kindNoun(kind)
      const rowTotal = cards.reduce((n, c) => n + c.rows, 0)
      const held =
        noun === null ? null : { n: rowTotal, word: rowTotal === 1 ? noun.one : noun.many }
      const shelf = shelfFor(ordered.length)
      out.push({
        key: kind,
        label: TABLE_KINDS[kind]?.label ?? kind,
        kind,
        cards: ordered,
        held,
        units: shelf.units,
        lead: shelf.lead,
      })
    }

    /* THE 27, FOLDED UNDER WHAT THEY JOIN. Owner order follows the
       shelves above, so the disclosure reads in the same order the
       page does rather than in whatever order the store happens to
       hold. */
    const joins = live
      .filter((e) => e.role === 'join')
      .sort((a, b) => a.name.localeCompare(b.name))
    const byOwner = new Map<string, JoinRow[]>()
    const orphans: JoinRow[] = []
    for (const join of joins) {
      const owner = ownerOf(join, byId)
      const row: JoinRow = {
        join,
        rows: rowsOf(join),
        short: joinShortName(join, owner),
      }
      if (owner === undefined) {
        orphans.push(row)
        continue
      }
      const held = byOwner.get(owner.id)
      if (held === undefined) byOwner.set(owner.id, [row])
      else held.push(row)
    }
    const fams: JoinFamily[] = []
    for (const shelf of out) {
      for (const card of shelf.cards) {
        const rows = byOwner.get(card.entity.id)
        if (rows !== undefined) fams.push({ owner: card.entity, rows })
      }
    }
    if (orphans.length > 0) fams.push({ owner: null, rows: orphans })

    return {
      shelves: out,
      families: fams,
      joinCount: joins.length,
      total: out.reduce((n, g) => n + g.cards.length, 0) + joins.length,
    }
  }, [tables, rowsByEntity])

  /* A CARD NAME THAT WAS CUT SAYS SO, AND SAYS ALL OF ITSELF. The name
     box reserves two lines and clamps at two, which is right for a
     ~250px card; the `aria-label` on the card already carried the whole
     name for a screen reader, and this is the same promise kept for the
     eye. It is MEASURED, so the cards that fit stay silent. */
  const cardNames = useClipTitles<HTMLDivElement>(
    '.hm-card-name',
    useMemo(
      () => shelves.flatMap((g) => g.cards.map((c) => c.entity.name)).join('|'),
      [shelves],
    ),
  )

  /* HOW MUCH THE PREPARED SET PUTS ON THE SHEET. A door that replaces
     somebody's whole sheet has to say what arrives — and it says it
     BEFORE the file is here, which is the point: the figures are what
     make the wait after the press mean something.

     IT USED TO BUILD THE SET TO COUNT IT, and this screen is exactly
     where that was worst: it is drawn only on an EMPTY sheet, so
     counting the price file downloaded the price file for the one
     visitor who had not asked for it. The figures are pinned and
     guarded now — `demos/northsideHolds.ts` — so this is free. */
  const holds = useMemo(
    () => (shelves.length === 0 ? real?.holds?.() : undefined),
    [shelves.length, real],
  )

  /* THE PRESETS ARE COUNTED AND NAMED FROM THE MODEL, never listed by
     hand: the day a kind is added or renamed this sentence follows it. */
  const presets = useMemo(() => KIND_ORDER.map((k) => TABLE_KINDS[k]?.label ?? k), [])

  const empty = shelves.length === 0 && joinCount === 0

  return (
    <div className="shell-viewstage hm" role="region" aria-label="Home">
      <div className="shell-view-bar">
        {/* TRACK 1, WHICH WAS AN EMPTY SPACER. Taking a copy of the
            project out and bringing one back had no home anywhere in
            the app. The front door is where a document's own controls
            belong, and this is the only place in the app that is about
            the project rather than about one thing inside it. */}
        <span className="hm-bar-left">
          <ImportExportMenu align="left" />
        </span>
        <p className="shell-view-what">
          <span className="shell-view-what-name">{org?.name ?? 'Your tables'}</span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          <span className="shell-view-what-say">{total} tables</span>
        </p>
        {/* TRACK 3 IS EMPTY AND STAYS DECLARED. Both outer tracks are
            `minmax(0, 1fr)` on `.shell-view-bar`, so they hold equal
            width whether or not anything stands in them and the title
            keeps the middle of the window. */}
      </div>

      {/* THE SCROLLPORT CENTRES ITS ONE CHILD WHEN THAT CHILD IS THE
          FIRST SCREEN, and goes back to being a top-anchored gallery the
          moment there are cards. `safe center` rather than `center`: at
          1280x800 the first screen is close to filling the column, and
          plain `center` would push its top edge above the scrollport's
          own origin, where it cannot be scrolled back to. */}
      <div className={`hm-scroll${empty ? ' hm-scroll--first' : ''}`} ref={cardNames}>
        {empty ? (
          /* ============================================================
             THE FIRST SCREEN — Home with nothing on the sheet.

             STRUCTURE — DESIGN_CONTRACT §6's four parts, and then the
             doors: eyebrow, what this place IS, what you have, and the
             one or two things worth doing. Two doors and not three,
             because there are exactly two honest starting points
             (`@/demos`: the real file, or nothing) and the third route —
             opening a saved copy — is already in track 1 of this bar.

             HONESTY ABOUT WHOSE DATA IT IS is `startingPointWords`'s
             job and not restated here.
             ============================================================ */
          <div className="hm-first">
            <div className="hm-first-say">
              <span className="mono-label hm-first-eyebrow">Nothing on the sheet yet</span>

              <h2 className="hm-first-title">Home is every table you have, on one page.</h2>

              {/* THE EXAMPLES ARE THE PRESET NAMES, not a second
                  vocabulary — same words as the presets, so a reader
                  meets each noun once. */}
              <p className="hm-first-prose">
                A table holds one kind of thing you sell — one brand&rsquo;s models, the
                motors, the trailers, the accessories that go with them. Its columns are
                what you record about them; its rows are the stock itself. Everything
                else in {org?.name ?? 'this app'} is built on those tables: what fits
                what, the rules that price a rig, the quotes you hand a customer. So a
                table is the first thing to put here, and it stays on this computer.
              </p>

              {/* WHAT YOU ALREADY HAVE, COUNTED. Zero is the honest
                  figure for the tables, so the line goes on to the thing
                  that is not zero — the presets a table can be drawn
                  from, counted and named out of TABLE_KINDS. */}
              <p className="hm-first-count">
                You have <b>no tables</b> yet. <strong>{presets.length}</strong> presets
                are ready to draw one from — {presets.slice(0, -1).join(', ')} and{' '}
                {presets[presets.length - 1]}.
              </p>
            </div>

            <div className="hm-first-doors">
              {/* THE PREPARED SET. Drawn only when one ships — the
                  register answers that (`realDemoSet`), so the screen
                  can never offer a button that loads nothing. */}
              {real && words ? (
                <button
                  type="button"
                  className={`hm-first-door hm-first-door--data${
                    phase === 'failed' ? ' hm-first-door--failed' : ''
                  }`}
                  /* the fetch is announced, so the wait is heard as well
                     as seen */
                  aria-busy={phase === 'loading'}
                  onClick={() => press(real)}
                  /* a pointer or a focus ring on THIS control is the
                     earliest honest evidence somebody wants the file */
                  onPointerEnter={() => warm(real)}
                  onFocus={() => warm(real)}
                >
                  <span className="mono-label hm-first-door-tag">{words.tag}</span>
                  <span className="hm-first-door-name">{words.label}</span>
                  {/* where the numbers came from — the demos module's own
                      sentence, because the demos module is what knows. */}
                  <span className="hm-first-door-note">{words.note}</span>
                  {holds ? (
                    <span className="hm-first-door-foot">
                      <b>{holds.tables}</b>
                      <span>tables</span>
                      <i aria-hidden="true" />
                      <b>{holds.rows.toLocaleString()}</b>
                      <span>rows</span>
                    </span>
                  ) : null}
                </button>
              ) : null}

              {/* AND THE OTHER HONEST STARTING POINT. Drawn only when the
                  shell handed down the way to open the dialog, so this
                  never becomes an enabled control that does nothing. */}
              {onNewTable ? (
                <button
                  type="button"
                  className="hm-first-door hm-first-door--blank"
                  onClick={onNewTable}
                >
                  <span className="mono-label hm-first-door-tag">Blank sheet</span>
                  <span className="hm-first-door-name">Start a table</span>
                  <span className="hm-first-door-note">
                    Pick what it holds and give it a name. Its columns arrive already
                    drawn for that kind, and you can change any of them afterwards.
                  </span>
                  <span className="hm-first-door-foot">
                    <b>{presets.length}</b>
                    <span>presets</span>
                    <i aria-hidden="true" />
                    <b>0</b>
                    <span>rows loaded</span>
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="hm-board">
            {shelves.map((shelf) => (
              <section
                className="hm-sec"
                key={shelf.key}
                style={
                  {
                    '--hm-u': String(shelf.units),
                    '--hm-lead': String(shelf.lead),
                    '--tbn-accent': accentVar(TABLE_KINDS[shelf.kind]?.accent ?? 'graphite'),
                  } as CSSProperties
                }
              >
                {/* THE GROUP HEAD WAS A 13px LABEL AND A NUMBER, which
                    is the treatment a filter chip gets. It is the only
                    structure on a page of fifty tables, so it takes the
                    kind's own mark, the title step, and its figures on
                    a line of their own under it — the dealer's word for
                    what is in there ("810 boats"), counted from the
                    rows rather than typed. */}
                <header className="hm-sec-head">
                  <span className="hm-sec-mark" aria-hidden="true">
                    <TableKindSymbol kind={shelf.kind} size={ICON_SIZE.medium} />
                  </span>
                  <h2 className="hm-sec-name">{shelf.label}</h2>
                  <p className="hm-sec-figures">
                    <b>{shelf.cards.length}</b>
                    <span>{shelf.cards.length === 1 ? 'table' : 'tables'}</span>
                    {shelf.held === null ? null : (
                      <>
                        <i aria-hidden="true" />
                        <b>{shelf.held.n.toLocaleString()}</b>
                        <span>{shelf.held.word}</span>
                      </>
                    )}
                  </p>
                </header>

                <ul className="hm-cells">
                  {shelf.cards.map((card, i) => (
                    <li
                      className={`hm-cell${i === 0 ? ' hm-cell--lead' : ''}`}
                      key={card.entity.id}
                    >
                      <TableCard card={card} lead={i === 0} onOpen={onOpenTable} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {joinCount > 0 ? (
              <RelationshipShelf
                families={families}
                count={joinCount}
                onOpenTable={onOpenTable}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- */
/* one table                                                  */
/* ---------------------------------------------------------- */

interface TableCardProps {
  card: Card
  lead: boolean
  onOpen: (entityId: string) => void
}

function TableCard({ card, lead, onOpen }: TableCardProps): ReactElement {
  const { entity, rows, shot } = card
  const noun = leafNoun(entity)
  /* the hook runs on every render — a table with no photograph asks
     about the empty address and is told, cheaply, no. `at` is where
     the pixels come from and `entity`'s own record keeps its address. */
  const { paint, probe, at } = useImageDisplay(shot?.src ?? '')
  const drawn = shot !== null && paint

  return (
    <button
      type="button"
      className={`hm-card${lead ? ' hm-card--lead' : ''}`}
      style={{ ['--tbn-accent' as string]: accentVar(entity.accent) }}
      /* NAMED EXPLICITLY, exactly as the module card next door is.
         DESIGN_CONTRACT §5 — the card is a picture and three spans, and
         a reader announcing them run together has not read a name.
         Every figure here is counted, not written. */
      aria-label={`Open ${entity.name} — ${countLabel(rows, noun)}, ${
        entity.fields.length === 1 ? '1 column' : `${entity.fields.length} columns`
      }`}
      onClick={() => onOpen(entity.id)}
    >
      {drawn ? (
        <img
          className="hm-card-shot"
          src={at}
          /* THE ALT IS EMPTY ON PURPOSE. The table's name is the next
             line of the same card and the card carries its own
             accessible name; the picture announced between them is the
             name said twice. Where the dealer typed their own alt text
             and it says something else, that is theirs and it is used. */
          alt={shot.alt === entity.name ? '' : shot.alt}
          loading={probe ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onLoad={() => noteImageLoaded(shot.src)}
          onError={() => noteImageFailed(shot.src)}
        />
      ) : (
        /* NO PHOTOGRAPH ON THIS TABLE'S OWN ROWS THAT WE MAY DRAW, so
           the card draws the kind's mark instead of borrowing somebody
           else's boat. The plate is the same size as the picture, so a
           table with one and a table without are the same card. */
        <span className="hm-card-plate" aria-hidden="true">
          <TableKindSymbol kind={kindOf(entity.kind)} size={ICON_SIZE.large} />
        </span>
      )}

      <span className="hm-card-body">
        <span className="hm-card-kind">
          <TableKindSymbol kind={kindOf(entity.kind)} size={ICON_SIZE.tiny} />
          <span>{TABLE_KINDS[kindOf(entity.kind)]?.label ?? ''}</span>
        </span>
        <span className="hm-card-name">{entity.name}</span>
        <span className="hm-card-stats">
          <b>{rows.toLocaleString()}</b>
          <span>{rows === 1 ? noun.one : noun.many}</span>
          <i aria-hidden="true" />
          <b>{entity.fields.length}</b>
          <span>columns</span>
        </span>
      </span>
    </button>
  )
}

/* ---------------------------------------------------------- */
/* the plumbing, folded                                       */
/* ---------------------------------------------------------- */

interface RelationshipShelfProps {
  families: JoinFamily[]
  count: number
  onOpenTable: (entityId: string) => void
}

/** THE 27 CARDS THAT WERE HALF THE PAGE, NOW ONE LINE OF IT.
 *
 *  It states its own count shut, which is the requirement: a person
 *  who never opens it still knows what is in there and that it is
 *  theirs. Open, every join is listed under the table it joins —
 *  each one still a control that opens that table, so nothing that
 *  was reachable before is unreachable now. */
function RelationshipShelf({
  families,
  count,
  onOpenTable,
}: RelationshipShelfProps): ReactElement {
  const [open, setOpen] = useState(false)
  return (
    <section className="hm-sec hm-sec--rel">
      <h2 className="hm-rel-h">
        <button
          type="button"
          className="hm-rel-head"
          aria-expanded={open}
          aria-controls="hm-rel-body"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="hm-rel-mark" aria-hidden="true">
            <StructureIcon size={ICON_SIZE.small} weight="light" />
          </span>
          <span className="hm-rel-name">Relationships</span>
          <span className="hm-rel-say">
            <b>{count}</b>
            <span>
              {count === 1 ? 'table that says' : 'tables that say'} what goes with what
            </span>
          </span>
          <CaretRight className="hm-rel-caret" size={ICON_SIZE.small} aria-hidden="true" />
        </button>
      </h2>

      {open ? (
        <div className="hm-rel-body" id="hm-rel-body">
          {families.map((family) => (
            <div className="hm-rel-fam" key={family.owner?.id ?? 'unowned'}>
              <h3 className="hm-rel-owner">
                {family.owner === null ? 'On their own' : family.owner.name}
                <span className="hm-rel-owner-n">{family.rows.length}</span>
              </h3>
              <ul className="hm-rel-list">
                {family.rows.map((row) => (
                  <li key={row.join.id}>
                    <button
                      type="button"
                      className="hm-rel-item"
                      title={row.join.name}
                      aria-label={`Open ${row.join.name} — ${countLabel(row.rows, leafNoun(row.join))}`}
                      onClick={() => onOpenTable(row.join.id)}
                    >
                      <span className="hm-rel-item-name">{row.short}</span>
                      <span className="hm-rel-item-n">{row.rows.toLocaleString()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
