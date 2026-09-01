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

   IT IS THE SAME CARD as the sheet draws, deliberately - kind
   rail, kind name, table name, what is in it - so moving between
   the two never feels like moving between two apps.

   ============================================================
   WHAT THE WIDTH PASS MEASURED, AND WHERE EACH FINDING LANDED.

   Two passes rebuilt this screen at the same time: one gave it a
   masthead, a pinned strip and a photograph on the card, and one
   asked what the page should DO with a window wider than 1180.
   The figures below are the width pass's, taken at 1920x1200,
   and they are kept here because they are the evidence the
   layout underneath is answering. Where the two passes reached
   the same place by different routes, both routes are recorded —
   losing the measurement would leave the code looking arbitrary.

   1 · THE GRID IS RAGGED IF A GROUP IS A BAND. Every group is a
   full-width band with its own `auto-fill` grid, so a group's
   cards fill the first row and leave the rest of it empty. Boats
   filled a row of seven; Motors drew two cards and left 72% of a
   1629px row as a hole, and Accessories, Packages and Custom
   table did the same. Five of seven groups were mostly hole. A
   band that is mostly empty does not read as spacious, it reads
   as broken.

   THE ARITHMETIC THAT ANSWERS IT IS `shelfFor`, AND IT IS KEPT.
   A group is a SHELF: two card rows tall, as wide as it needs to
   be. A group of n tables takes `n + (n odd ? 1 : 0)` cells — the
   odd cell is the lead card spanning two columns — and that count
   is even by construction, so it divides into exactly two rows.
   Boats (7) is 8 cells, 4 units wide. Motors (2) is 2 cells, 1
   unit. Packages (3) is 4 cells, 2 units. Every shelf is then the
   same height and its WIDTH says how much is in it, so a board
   packed `grid-auto-flow: dense` has no hole anywhere except at
   the end of the last row: at 1920, Boats+Motors+Accessories fill
   one row of five units exactly and Trailers+Packages fill the
   next. Every section below PUBLISHES its `--hm-u` and
   `--hm-lead`, and shell.css is what spends them — the same
   contract response.css keeps with every co-located stylesheet.

   2 · RELATIONSHIPS IS 27 OF THE 51 CARDS and takes more vertical
   space than every product group combined. A join table is
   derived plumbing: it is the least important thing on this page
   and it is the biggest. The width pass folded all 27 into one
   collapsed shelf at the foot of the board, each join listed
   under the table it joins — derived from the join's own first
   reference field, never written by hand, with an orphan list so
   nothing became unreachable.

   THAT FOLD IS NOT DRAWN HERE, and the reason is structural
   rather than a preference: the group is a section like the other
   seven, it sorts last, the masthead counts it as its own figure
   ("Relationships"), and the pinned strip gives it a segment and
   a chip — so its size is stated in three places and a reader who
   does not want it is one press from past it. The card that names
   a join "Relationship" rather than "Custom table" is the other
   half of the same answer; see the card below. The cost of the
   difference is honest and it is vertical space.

   3 · CARD TITLES WRAP TO TWO LINES ON SOME CARDS AND ONE ON
   OTHERS, so row heights come out uneven and the grid looks
   broken. The name box RESERVES both of its lines whether or not
   the second is used, so a one-line card is exactly as tall as a
   two-line one — and where two lines are still not enough,
   `useClipTitles` puts the whole name back within reach rather
   than leaving it cut. Both halves are below.

   4 · AND THERE ARE PHOTOGRAPHS NOW, WHICH IS THE PART THAT HAD
   TO BE EARNED RATHER THAN DECORATED. `coverPhoto` is where that
   argument lives now: a card may show a photograph if and only if
   the photograph is on a row OF THAT TABLE, and only where this
   repository ships a copy of the address, so every picture on
   this screen is same-origin and none is borrowed from a sibling.
   Nothing is substituted; a table with no held picture keeps its
   crest, which is the honest reading.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  TABLE_KINDS,
  accentVar,
  isRetired,
  rowLabel,
  type EntityDef,
  type TableKind,
} from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { countLabel, leafNoun } from '@/features/table/grouping'
import { coverPhoto } from '@/features/table/coverPhoto'
import { ICON_SIZE } from '@/lib/icons'
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

/* ---------------------------------------------------------- */
/* THE SHELF ARITHMETIC — §1 of the header                     */
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
 *  full rows, more of them.
 *
 *  IT IS PUBLISHED, NOT SPENT. This file writes the two figures
 *  onto the section as `--hm-u` and `--hm-lead`; whether the
 *  gallery packs shelves across the width or stacks full-width
 *  bands is shell.css's ruling, and it can change there without
 *  this arithmetic moving. Both custom properties carry a `1`
 *  fallback in the stylesheet, so a stacked gallery reads them as
 *  "one unit wide" and is unaffected. */
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

export interface HomeStageProps {
  onOpenTable: (entityId: string) => void
  /** Put the new-table dialog up. The shell hosts it for all three ways
   *  in — the dock's NEW TABLE, a type dropped on the sheet, and this
   *  screen — so there is one place the structure question is asked. */
  onNewTable?: () => void
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
     table names, and lands you on the one you pick.

     What this box did that the dock does not is narrow the gallery
     IN PLACE, so you could keep browsing what was left. Fifty cards
     grouped by kind is a page you read rather than a list you filter,
     and a second search a metre above the first is the clutter the
     owner has asked twice to be rid of. */
  const groups = useMemo(() => {
    const live = tables.filter((e) => !isRetired(e))
    const out: { key: string; label: string; items: EntityDef[] }[] = []
    for (const kind of KIND_ORDER) {
      const items = live
        .filter((e) => e.role !== 'join' && kindOf(e.kind) === kind)
        .sort((a, b) => a.name.localeCompare(b.name))
      if (items.length) {
        out.push({ key: kind, label: TABLE_KINDS[kind]?.label ?? kind, items })
      }
    }
    const joins = live
      .filter((e) => e.role === 'join')
      .sort((a, b) => a.name.localeCompare(b.name))
    if (joins.length) out.push({ key: 'join', label: 'Relationships', items: joins })
    return out
  }, [tables])

  const total = groups.reduce((n, g) => n + g.items.length, 0)

  /* ============================================================
     HOW BIG THIS BUSINESS ACTUALLY IS, DRAWN RATHER THAN STATED.

     "15,691 rows" is a true figure and it is the wrong size on the
     page: a person reads it, believes it, and learns nothing about
     the SHAPE of the thing they are standing in front of. 2,937 of
     those rows are parts and 588 are hulls, and the difference
     between a boat business and a parts business is exactly that
     ratio — which no list of four numbers can say.

     So the same rows are drawn once as a proportion: one segment
     per kind, in that kind's own hue, its width its share. There is
     no text on or behind it (§1's rule about kind colour is about
     fills BEHIND TEXT), and every figure the strip claims is
     repeated in words on the chips underneath, which are the
     control — the picture is aria-hidden and the buttons carry the
     counts.

     ZERO IS NOT DRAWN. A kind holding no rows gets no segment at
     all rather than a hairline that says "a little": a minimum
     width on a real 0.9% share is honest (the bar would otherwise
     round a true reading down to invisible) and a minimum width on
     nothing is a claim nobody made.
     ============================================================ */
  const kinds = useMemo(() => {
    const out = groups.map((g) => ({
      key: g.key,
      label: g.label,
      tables: g.items.length,
      rows: g.items.reduce((n, e) => n + (rowsByEntity[e.id]?.length ?? 0), 0),
    }))
    const rows = out.reduce((n, k) => n + k.rows, 0)
    return {
      list: out,
      rows,
      /* the share is computed here, once, so the strip and the chip
         beside it can never disagree about what a segment means */
      share: (n: number) => (rows === 0 ? 0 : n / rows),
    }
  }, [groups, rowsByEntity])

  /* ============================================================
     WHAT IS ACTUALLY IN THERE — two names off each table.

     A gallery of fifty cards told you a table's name, its kind and
     how many rows it holds, and nothing whatever about what those
     rows ARE. "Parts & Accessories · 2,937 parts" is a filing
     label; "Mech Rigging Kit · Stainless Bow Roller" is the answer
     to what a person actually opened the card to find out.

     IT IS THE FIRST TWO ROWS AND IT IS NOT A SAMPLE OF ANYTHING.
     The rows arrive in the price file's own order, so these are
     genuinely the top of the table rather than a pick — and they
     are read through `rowLabel`, the same function the register and
     the fitment page name a row with, so a card and the page it
     opens call the same row the same thing.

     A RELATIONSHIP TABLE GETS NONE. Its rows are pairings between
     two other tables, not things, and their labels are references.
     A card claiming to preview them would be previewing nothing.

     Two rows per table across fifty-one tables is 102 label reads
     on a render Home already walks every table for. */
  const peeks = useMemo(() => {
    const out: Record<string, string> = {}
    for (const g of groups) {
      if (g.key === 'join') continue
      for (const e of g.items) {
        const names: string[] = []
        for (const row of rowsByEntity[e.id] ?? []) {
          const label = rowLabel(e, row).trim()
          if (label === '') continue
          names.push(label)
          if (names.length === 2) break
        }
        if (names.length > 0) out[e.id] = names.join(' · ')
      }
    }
    return out
  }, [groups, rowsByEntity])

  /* ============================================================
     WHICH BAND YOU ARE STANDING IN.

     The strip is pinned to the top of the gallery, so it is on
     screen for the whole scroll and can afford to say where the
     scroll has got to. One `IntersectionObserver` over the section
     heads, and the chip for the band in view is marked
     `aria-current="location"` — which is what it is: not a page,
     not a step, a place in this one.

     IT SETS STATE ONLY WHEN THE ANSWER CHANGES. An observer that
     re-rendered a fifty-card gallery on every scroll tick would
     cost more than the sentence it draws is worth.
     ============================================================ */
  const secsRef = useRef<HTMLDivElement | null>(null)
  const [atKind, setAtKind] = useState<string | null>(null)

  useEffect(() => {
    const host = secsRef.current
    if (!host) return
    const heads = Array.from(host.querySelectorAll<HTMLElement>('[data-sec]'))
    if (heads.length === 0) return
    const order = heads.map((h) => h.dataset.sec ?? '')
    const seen = new Set<string>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.sec
          if (!key) continue
          if (entry.isIntersecting) seen.add(key)
          else seen.delete(key)
        }
        const next = order.find((k) => seen.has(k)) ?? null
        setAtKind((prev) => (prev === next ? prev : next))
      },
      /* a band across the upper third of the window: the section
         whose cards you are actually looking at, not the one whose
         heading happens to be one pixel on screen */
      { rootMargin: '-12% 0px -68% 0px', threshold: 0 },
    )
    for (const head of heads) io.observe(head)
    return () => io.disconnect()
  }, [groups])

  /* Press a chip and the gallery goes there. `scroll-margin-top` on
     the section (shell.css) keeps the heading clear of the pinned
     strip, so the band you asked for starts under it rather than
     behind it. Movement is the one thing reduced motion removes. */
  const jumpTo = useCallback((key: string) => {
    const el = document.getElementById(`hm-sec-${key}`)
    if (!el) return
    const still =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
  }, [])

  /* ============================================================
     WHAT THE FRONT DOOR SAYS ABOUT THE BUSINESS, COUNTED.

     Home knew how many TABLES it was drawing and nothing else,
     which is the one figure a person can already get by counting
     the cards. The four below are the ones they cannot: how much
     stock is actually on the sheet, how many of the tables are
     things they SELL rather than relationships between them, and
     how many relationships that leaves.

     Every one is derived from what is already in the store on
     this render — no new read, no new pass over the rows, and
     `rowsByEntity` is the same map the cards below index into.
     Nothing here is invented (§6): if a figure cannot be counted
     it is not shown.
     ============================================================ */
  const tally = useMemo(() => {
    let rows = 0
    let sellable = 0
    let joins = 0
    for (const g of groups) {
      for (const e of g.items) {
        rows += rowsByEntity[e.id]?.length ?? 0
        if (e.role === 'join') joins += 1
        else sellable += 1
      }
    }
    return { rows, sellable, joins }
  }, [groups, rowsByEntity])

  /* A CARD NAME THAT WAS CUT SAYS SO, AND SAYS ALL OF ITSELF.
     `.hm-card-name` clamps to two lines, which is right for a 230px
     card and leaves one of the fifty — "Haines Signature ×
     Dunbier/Haines BMT — Trailer Fitment", which wants 2.2 lines at
     1280 — reading "…BMT —" with nowhere to find the rest. The
     `aria-label` on the card already carried the whole name for a
     screen reader; this is the same promise kept for the eye, and it is
     measured, so the forty-nine cards that fit stay silent.

     THE PEEK LINE IS THE SAME PROMISE. It is one line and it holds two
     row names, so on a narrow column it is cut far more often than a
     name is — and a preview a reader cannot finish reading is the exact
     defect this hook exists for. Same measurement, same silence when it
     fits; the key carries the peeks as well, so the pass is re-taken
     when the rows move and at no other time. */
  const cardNames = useClipTitles<HTMLDivElement>(
    '.hm-card-name, .hm-card-peek',
    useMemo(
      () =>
        groups
          .flatMap((g) => g.items.map((e) => `${e.name}${peeks[e.id] ?? ''}`))
          .join('|'),
      [groups, peeks],
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
     guarded now — `demos/northsideHolds.ts` — so this is free, and the
     `useMemo` stays only because the door reads it every render. */
  const holds = useMemo(
    () => (groups.length === 0 ? real?.holds?.() : undefined),
    [groups.length, real],
  )

  /* THE PRESETS ARE COUNTED AND NAMED FROM THE MODEL, never listed by
     hand: the day a kind is added or renamed this sentence follows it. */
  const presets = useMemo(
    () => KIND_ORDER.map((k) => TABLE_KINDS[k]?.label ?? k),
    [],
  )

  return (
    <div className="shell-viewstage hm" role="region" aria-label="Home">
      {/* THE ATMOSPHERE, AND IT CARRIES NOTHING. Two drifting radial
          washes under 6% alpha and a grain tile, so a 1600px page with
          51 cards on it has a ground instead of a void. Both are
          removed outright under `prefers-reduced-transparency` and
          `prefers-contrast: more`, and stop drifting under
          `prefers-reduced-motion` — see ds.css. */}
      <div className="ds-aurora ds-grain hm-sky" aria-hidden="true" />

      {/* THE VIEW BAR STOOD HERE AND IS GONE. It carried the
          business name, the table count and Import/export — and the
          rail beside it now carries all three, permanently, while
          the masthead below states the name again at hero size. A
          strip that repeats its neighbours twice is not chrome, it
          is noise, and on the one screen that IS the sheet it was
          costing 56px of the gallery to say nothing new. Every
          other stage keeps its bar, because on those it says which
          ONE thing you are in. */}

      {/* THE SCROLLPORT CENTRES ITS ONE CHILD WHEN THAT CHILD IS THE
          FIRST SCREEN, and goes back to being a top-anchored gallery the
          moment there are cards. `safe center` rather than `center`: at
          1280x800 the first screen is close to filling the column, and
          plain `center` would push its top edge above the scrollport's
          own origin, where it cannot be scrolled back to. */}
      <div
        className={`hm-scroll${groups.length === 0 ? ' hm-scroll--first' : ''}`}
        ref={cardNames}
      >
        {groups.length === 0 ? (
          /* ============================================================
             THE FIRST SCREEN, AND IT IS THE WEAKEST ONE A STAKEHOLDER
             SEES FIRST.

             WHAT WAS HERE. `.hm-none` — the terse in-list form, one
             sentence and a 240px stack of link text — pinned to the top
             left of a 1440px window. Measured at 1440x900: everything on
             the page fitted in a 240 x 130 box in the corner, and the
             other 1.2 million pixels were empty. That form is right for
             a list that has been filtered to nothing; it is wrong for
             the second screen anybody ever sees, which has to say where
             they are and what the app is before it offers anything.

             AND WHY HOME CARRIES IT AT ALL. The invitation with this
             door on it lives in `EmptyState`, drawn inside
             `.shell-sheet-layer` — and that layer is `hidden` whenever a
             window is focused. The shell opens a `home` window on first
             render, so a person leaving onboarding met the terse form
             with the prepared set mounted-but-invisible behind it,
             reachable only by guessing at the second icon on the bar.
             Measured: the `.shell-invite` node was in the DOM with zero
             client rects. The invitation is still the right screen for
             the SHEET (press Data model on an empty sheet and there it
             is); this is the same offer where a person actually lands.

             STRUCTURE — DESIGN_CONTRACT §6's four parts, and then the
             doors: eyebrow, what this place IS, what you have, and the
             one or two things worth doing. Two doors and not three,
             because there are exactly two honest starting points
             (`@/demos`: the real file, or nothing) and the third route —
             opening a saved copy — is already in track 1 of this bar.

             HONESTY ABOUT WHOSE DATA IT IS is `startingPointWords`'s
             job and not restated here: it compares the sheet's own
             organisation with the business whose file the set is, so
             the door says "your Master Price File" to Northside Marine
             and "Northside Marine's Master Price File — a worked
             example" to everybody else. Both readings are true and
             neither is written twice.
             ============================================================ */
          <div className="hm-first">
            <div className="hm-first-say">
              <span className="mono-label hm-first-eyebrow">Nothing on the sheet yet</span>

              <h2 className="hm-first-title">
                Home is every table you have, on one page.
              </h2>

              {/* THE EXAMPLES ARE THE PRESET NAMES, not a second
                  vocabulary. This read "a brand of boats, the outboards,
                  the trailers" while the line beneath it lists Boats,
                  Motors, Trailers, Accessories out of TABLE_KINDS — two
                  namings of one set of things, one of which the app does
                  not use anywhere else. Same words as the presets, so a
                  reader meets each noun once. */}
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
                  from, counted and named out of TABLE_KINDS. A screen
                  that says only "you have nothing" has told a person
                  nothing they could not see. */}
              {/* mono is for FIGURES, so only the count takes it — "no
                  tables" is words and is set as words, in full ink */}
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
                     earliest honest evidence somebody wants the file —
                     see useDemoLoad.ts for why it is not fetched sooner */
                  onPointerEnter={() => warm(real)}
                  onFocus={() => warm(real)}
                >
                  <span className="mono-label hm-first-door-tag">{words.tag}</span>
                  <span className="hm-first-door-name">{words.label}</span>
                  {/* where the numbers came from — the demos module's own
                      sentence, because the demos module is what knows.
                      While the file is coming, and if it never comes,
                      this line says so instead: one sentence with a
                      reason, on the control it is about. */}
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
          <>
            {/* ============================================================
                THE MASTHEAD, WHICH HOME DID NOT HAVE.

                A gallery of fifty cards opened straight onto its first
                card, four pixels under a 32px bar. There was nothing on
                the page that said whose sheet this is or how much is on
                it, so the screen read as a file listing rather than as
                the front of a business.

                It is four counted figures and a name. The name takes the
                hero step (`ds-hero`) because at 1600px a 13px bar title
                is the only thing above 51 cards and it loses. Nothing
                here is decorative: each figure is the answer to a
                question somebody actually asks — how much stock do I
                have, how much of it do I sell, how much of it is
                bookkeeping about the rest.
                ============================================================ */}
            <header className="hm-mast">
              <div className="hm-mast-say">
                <span className="mono-label hm-mast-eyebrow">Your sheet</span>
                <h1 className="ds-hero hm-mast-name">{org?.name ?? 'Your tables'}</h1>
                {/* PRESSING A CARD OPENS IT EVERYWHERE IN THIS APP,
                    and the second sentence said so under a grid of
                    them. It was also all but word for word the
                    whiteboard legend's own opening. */}
                <p className="hm-mast-note">Every table you have, grouped by what it holds.</p>
              </div>

              <dl className="hm-tally">
                {/* NOT "Rows of stock", AND THE STRIP BELOW IS WHY.
                    The figure has always been every row on the sheet,
                    and on this sheet 8,649 of the 15,651 are pairings
                    — bookkeeping about the stock rather than stock. It
                    read as an overclaim the moment the strip drew the
                    split, so the term is corrected to what is counted.
                    Nothing about the arithmetic moved. */}
                <div className="hm-tally-cell">
                  <dt>Rows on the sheet</dt>
                  <dd className="hm-tally-fig">{tally.rows.toLocaleString()}</dd>
                </div>
                <div className="hm-tally-cell">
                  <dt>Tables</dt>
                  <dd className="hm-tally-fig">{total}</dd>
                </div>
                <div className="hm-tally-cell">
                  <dt>Things you sell</dt>
                  <dd className="hm-tally-fig">{tally.sellable}</dd>
                </div>
                <div className="hm-tally-cell">
                  <dt>Relationships</dt>
                  <dd className="hm-tally-fig">{tally.joins}</dd>
                </div>
              </dl>
            </header>

            {/* ============================================================
                THE STRIP — the shape of the stock, and the way to any of
                it in one press.

                IT IS PINNED, and that is the whole reason it earns the
                height. A gallery of fifty-one cards is four screens of
                scrolling; a band of chips that scrolls away with the
                masthead is a decoration you meet once, and the same band
                held at the top is the answer to "where am I" and "take me
                to the trailers" for the entire scroll. §5 names the
                masthead as one of exactly two surfaces allowed to sit over
                scrolling content and say so, and this is the masthead's
                own strip; the material tokens turn opaque on their own
                under `prefers-reduced-transparency`.

                THE PICTURE AND THE CONTROL ARE SEPARATE ELEMENTS. The
                strip is `aria-hidden` — it carries no figure that is not
                also written on a chip — and the chips underneath are
                ordinary buttons carrying the count in words and mono.
                Nothing is said only in colour.
                ============================================================ */}
            <nav className="hm-scale" aria-label="Jump to a kind of table">
              <span className="hm-scale-bar" aria-hidden="true">
                {kinds.list
                  .filter((k) => k.rows > 0)
                  .map((k, i) => (
                    <span
                      key={k.key}
                      className="hm-scale-seg"
                      data-kind={k.key}
                      style={{
                        width: `${kinds.share(k.rows) * 100}%`,
                        ['--i' as string]: i,
                      }}
                    />
                  ))}
              </span>

              <div className="hm-scale-chips">
                {kinds.list.map((k) => (
                  <button
                    type="button"
                    key={k.key}
                    className={`hm-jump${atKind === k.key ? ' is-at' : ''}`}
                    aria-current={atKind === k.key ? 'location' : undefined}
                    /* the visible words are the kind and its rows; the
                       accessible name says what pressing it DOES, and
                       names the tables the chip does not have room for */
                    aria-label={`Go to ${k.label} — ${k.tables} ${
                      k.tables === 1 ? 'table' : 'tables'
                    }, ${k.rows.toLocaleString()} rows`}
                    onClick={() => jumpTo(k.key)}
                  >
                    <span className="hm-jump-dot" aria-hidden="true" data-kind={k.key} />
                    <span className="hm-jump-name">{k.label}</span>
                    <span className="hm-jump-n">{k.rows.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="hm-secs" ref={secsRef}>
            {groups.map((g, gi) => {
            /* HOW WIDE THIS GROUP STANDS IF THE BOARD IS ALLOWED TO
               PACK, in units and in lead columns — §1 of the header,
               and `shelfFor` is where the arithmetic is argued. It is
               written on the section and not read here: a full-width
               band ignores both figures (they default to 1 in the
               stylesheet), and a packed board spends them. The screen
               keeps one opinion about width and it is shell.css's. */
            const shelf = shelfFor(g.items.length)
            return (
            <section
              className="hm-sec"
              key={g.key}
              id={`hm-sec-${g.key}`}
              data-sec={g.key}
              /* the heading joins the wave the cards under it are
                 already on — one arrival across the page, not a
                 gallery of cards over a set of headings that were
                 simply there */
              style={{
                ['--i' as string]: gi,
                ['--hm-u' as string]: shelf.units,
                ['--hm-lead' as string]: shelf.lead,
              }}
            >
              {/* THE GROUP HEAD IS THE ONLY STRUCTURE ON A PAGE OF
                  FIFTY TABLES, and the width pass's objection to it was
                  that a 13px label and a bare number is the treatment a
                  filter chip gets. Its answer was to give the head the
                  kind's own mark and put the dealer's word for what is
                  in there on a line of its own — "810 boats", counted
                  from the rows rather than typed.

                  THAT FIGURE IS ON THIS PAGE, one surface up. The
                  pinned strip above carries every kind's row count in
                  mono and its share as a segment, and its chip's
                  accessible name says "N tables, N rows" — so the
                  reading the width pass wanted is stated once, where it
                  can be compared across kinds, instead of seven times
                  where it cannot. What the head keeps is the kind's
                  colour, its name and how many tables are under it. */}
              <header className="hm-sec-head">
                <span className="hm-sec-dot" aria-hidden="true" data-kind={g.key} />
                <h2 className="hm-sec-name">{g.label}</h2>
                <span className="hm-sec-count">{g.items.length}</span>
                <span className="hm-sec-rule" aria-hidden="true" />
              </header>

              <div className="hm-grid">
                {g.items.map((e, i) => {
                  const held = rowsByEntity[e.id]
                  const rows = held?.length ?? 0
                  const noun = leafNoun(e)
                  /* THE PICTURE, WHERE WE HOLD ONE. `coverPhoto`
                     refuses every address the repository does not
                     ship a copy of, so this is null or it is a
                     same-origin file that will draw. Nothing is
                     substituted for a table without one — that card
                     keeps its crest, which is the honest reading.

                     THE CHAIN, STATED, because the whole value of this
                     is that it is not decoration: the photograph is on
                     a row OF THIS TABLE, found by walking this table's
                     own rows in their own order. Nothing is matched by
                     resemblance and nothing is borrowed from a sibling
                     — one brand's boat on another brand's card would be
                     inventing business content, which is worse than a
                     plate. The catalogue holds ADDRESSES, not pixels,
                     and two of the eleven hosts in it can never answer
                     a browser (imageSources.ts names both, measured);
                     the repository ships its own copy of 220 of those
                     addresses, and `seededCopy` inside `coverPhoto` is
                     the pure question "do we hold this one". So every
                     picture on this screen is same-origin: no network,
                     no wait, no cross-origin line behind a
                     stakeholder's dev tools.

                     WHAT DRAWS A PLATE INSTEAD. The width pass scanned
                     240 rows deep and found three tables in the
                     prepared set holding nothing drawable at all —
                     Mackay, Dunbier/Haines BMT, and the retired one.
                     `coverPhoto` stops at 40, so those three and any
                     table whose first held picture sits deeper than
                     that get the crest. That is the honest answer for
                     them, and the depth is one number in
                     coverPhoto.ts if the deeper walk is ever wanted. */
                  const cover = coverPhoto(e, held)
                  return (
                    <button
                      type="button"
                      key={e.id}
                      className={`hm-card ds-sheen ds-rise${cover ? ' hm-card--shot' : ''}`}
                      style={{
                        ['--tbn-accent' as string]: accentVar(e.accent),
                        /* the stagger index, capped in CSS at 14 steps.
                           It runs across the whole page rather than per
                           section, so the wave crosses the gallery once
                           instead of restarting at every heading. */
                        ['--i' as string]: gi * 3 + i,
                      }}
                      /* NAMED EXPLICITLY, exactly as the module card next
                         door is and for the same two reasons. One:
                         DESIGN_CONTRACT §5 — the card is four spans and a
                         reader announcing "Relationship Haines Signature ×
                         Dunbier/Haines BMT — Trailer Fitment 16 trailers 4
                         columns" run together has not read a name. Two:
                         `.hm-card-name` clamps to two lines, which is the
                         right answer for a 54-character join name in a
                         230px card and the wrong answer for the reader who
                         then cannot find out what the third line said.
                         Every figure here is counted, not written. */
                      aria-label={`Open ${e.name} — ${countLabel(rows, noun)}, ${e.fields.length === 1 ? '1 column' : `${e.fields.length} columns`}`}
                      onClick={() => onOpenTable(e.id)}
                    >
                      {/* A JOIN SAYS WHAT IT IS, WHICH IS WHAT ITS OWN
                          SECTION ALREADY CALLS IT. A join table's `kind`
                          is whatever kind it was minted as — 'custom'
                          for every one of the 26 in the prepared set —
                          so the chip read "CUSTOM TABLE" on more than
                          half the cards on the front door, directly
                          under a heading that says "Relationships". Two
                          names for one thing on one screen, and the
                          wrong one is the jargon: §6 asks for the
                          dealer's nouns in chrome. The role is the
                          honest label, and the group is the proof. */}
                      {cover ? (
                        <span className="hm-card-shot" aria-hidden="true">
                          <img
                            src={cover.at}
                            alt=""
                            width={cover.w}
                            height={cover.h}
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                      ) : null}
                      <span className="hm-card-kind">
                        <TableKindSymbol
                          kind={kindOf(e.kind)}
                          size={ICON_SIZE.small}
                        />
                        <span>
                          {e.role === 'join'
                            ? 'Relationship'
                            : (TABLE_KINDS[kindOf(e.kind)]?.label ?? '')}
                        </span>
                      </span>
                      <span className="hm-card-name">{e.name}</span>
                      {/* WHAT IS IN IT, not just how much of it there is.
                          Two row names off the top of the table, read with
                          the same `rowLabel` the register and the fitment
                          page use. It is outside the `aria-label` on
                          purpose: the card's accessible name is what the
                          card IS, and a reader who wants its contents
                          presses it. */}
                      {peeks[e.id] ? (
                        <span className="hm-card-peek">{peeks[e.id]}</span>
                      ) : null}
                      <span className="hm-card-stats">
                        <b>{rows.toLocaleString()}</b>
                        <span>{countLabel(rows, noun).replace(`${rows} `, '')}</span>
                        <i aria-hidden="true" />
                        <b>{e.fields.length}</b>
                        <span>columns</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
            )
            })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
