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
   ============================================================ */

import { useMemo } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  TABLE_KINDS,
  accentVar,
  isRetired,
  type EntityDef,
  type TableKind,
} from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { countLabel, leafNoun } from '@/features/table/grouping'
import { ImportExportMenu } from '@/features/io'
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
     measured, so the forty-nine cards that fit stay silent. */
  const cardNames = useClipTitles<HTMLDivElement>(
    '.hm-card-name',
    useMemo(() => groups.flatMap((g) => g.items.map((e) => e.name)).join('|'), [groups]),
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

      <div className="shell-view-bar">
        {/* TRACK 1, WHICH WAS AN EMPTY SPACER. Taking a copy of the
            project out and bringing one back had no home anywhere in
            the app — `features/io` was left imported by nothing when
            the masthead went, which is half of what the reachability
            guard has been red about. The front door is where a
            document's own controls belong, and this is the only
            place in the app that is about the project rather than
            about one thing inside it. */}
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
            keeps the middle of the window — which is the whole reason
            commit 0d3b1e7 put the cap on the track rather than on the
            title. Every child here names its own column, so nothing
            auto-places into the gap this leaves. */}
      </div>

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
                <p className="hm-mast-note">
                  Every table you have, grouped by what it holds. Press one to open its
                  register.
                </p>
              </div>

              <dl className="hm-tally">
                <div className="hm-tally-cell">
                  <dt>Rows of stock</dt>
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

            {groups.map((g, gi) => (
            <section className="hm-sec" key={g.key}>
              <header className="hm-sec-head">
                <span className="hm-sec-dot" aria-hidden="true" data-kind={g.key} />
                <h2 className="hm-sec-name">{g.label}</h2>
                <span className="hm-sec-count">{g.items.length}</span>
                <span className="hm-sec-rule" aria-hidden="true" />
              </header>

              <div className="hm-grid">
                {g.items.map((e, i) => {
                  const rows = rowsByEntity[e.id]?.length ?? 0
                  const noun = leafNoun(e)
                  return (
                    <button
                      type="button"
                      key={e.id}
                      className="hm-card ds-sheen ds-rise"
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
            ))}
          </>
        )}
      </div>
    </div>
  )
}
