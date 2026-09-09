/* ============================================================
   THE SIX CARDS, AND ONE OF THEM USED TO BE THREE.

   EVERY FIGURE ON THIS PAGE IS COUNTED HERE AND NOW. The
   arithmetic is in `cards.ts` so it can be tested; this file is
   the drawing of it, and it holds no numbers of its own.

   THREE RULES THIS FILE KEEPS, ALL OF THEM CHECKABLE BY READING
   IT TOP TO BOTTOM:

     1. NOTHING IS INVENTED. There is no placeholder figure, no
        sample row, no percentage of a target nobody set, and no
        chart over data this app is not keeping. Where a trend
        would be the obvious thing to draw, it is absent, because
        the app records no history to draw one from.

     2. A CARD WITH NOTHING IN IT SAYS SO IN A SENTENCE AND
        OFFERS THE ACT THAT WOULD GIVE IT SOMETHING. Never a
        blank rectangle and never a spinner over an answer that
        is already known to be zero.

     3. EVERY FIGURE IS MONO AND TABULAR. `.ds-mono` and
        `.ds-mono-sm` for figures inside a row; `.dsh-fig-n` for
        the large counted ones, which is a whole type step — size,
        weight, leading and tracking together (§2 rule 6) —
        declared in dashboard.css because the system has no mono
        step above 15px. DESIGN_PRINCIPLES §2: a number in a
        column is what mono is for, and money lines up on the
        decimal because of it.

   ONE ACCENT, AND IT IS NOT SPENT HERE. §1 asks for roughly four
   appearances a screen, and a page of cards each with an accent
   figure on it is that budget spent before anything else is
   counted.
   So the cards are ink and surface only: the large figure leads
   by SIZE, not by colour. The accent on this screen is the one
   primary fast action, the focus ring, and hover.

   THE KIND HUES ARE A SEPARATE VOCABULARY AND THEY DO APPEAR —
   in one form, on the three cards that list things which HAVE a
   kind. `Row` takes an optional `kind` and draws the kind's own
   mark in the kind's own hue: a glyph, which is exactly what §1
   allows a second hue to be, beside a rail and a dot. It is
   never a tint behind a name, and never on a card's chrome — a
   dashboard of differently-tinted cards is still the theme
   §1 forbids, and that is not what this is. What it is, is the
   same fact the rail and the sheet already draw, drawn the same
   way: `EntityDef.kind` is what the dealer said the table holds.

   AND THE HUE IS NEVER THE ONLY CARRIER. Each kind's mark is a
   different SHAPE as well as a different colour, so the row reads
   the same to somebody who cannot separate indigo from amber.
   Measured on the real set, the marks clear 4.09:1 at worst
   against every ground a row wears — rest, hover and press, in
   both themes — against a 3:1 floor for a graphical object.
   ============================================================ */

import { useCallback, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import {
  ClockCounterClockwise,
  DotsSixVertical,
  FileText,
  Pulse,
  Scales,
  SealWarning,
  SquaresFour,
  Storefront,
  Table,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { useQuotes, quoteTotals } from '@/features/quote'
import type { QuoteDef } from '@/features/quote'
import { useLintFindings } from '@/features/review'
/* BY DIRECT PATH, and for the reason the store's own imports
   give: `@/features/constraints` is the feature's barrel and
   pulls its whole React surface — the ledger, the discovery
   panel, the sentence editor — back in behind one count.
   `constraintDefs.ts` imports react, the model, the store and
   one lib helper, and nothing else. */
import { useConstraints } from '@/features/constraints/constraintDefs'
/* THE SAME BOAT EVERYWHERE. `tablekit` is the app's one source
   of a kind's mark — the rail, the dialog, the table card and the
   sheet all ask it for the same glyph, so a dashboard that drew
   its own would be the eighth drawing of a boat in this build. */
import { TableKindSymbol, kindOf } from '@/features/tablekit'
/* THE SAME VERDICT EVERY OTHER PICTURE TAKES. Whether to paint,
   where to paint it from, and which one carries the host's probe
   is decided in one place — so a photograph that is a plate in the
   catalogue is never a broken glyph on the front door. */
import { noteImageFailed, noteImageLoaded, useImageDisplay } from '@/lib/imageSources'
import { TABLE_KINDS } from '@/types/model'
import type { ImageRef, TableKind } from '@/types/model'
import { money } from '@/lib/money'
import { ICON_SIZE, weightFor } from '@/lib/icons'
import type { CardId } from './arrangement'
import {
  CARDS,
  LENS_NAME,
  LENS_NONE,
  QUOTE_LENSES,
  biggestTables,
  byCustomer,
  countLenses,
  emptyCount,
  fileTally,
  plural,
  quotesUnder,
  resolveRecent,
  rollFindings,
  rollRules,
  quotesPerPlace,
} from './cards'
import type { QuoteLens } from './cards'
import { doorsOf, type Door } from './doors'
import type { DashboardActs } from './acts'
import { useRecentPicks } from './useRecentPicks'
import { usePlaces } from './usePlaces'
import { proposeModules, seedFor } from './proposals'
import type { ModuleProposal, ProposalReading } from './proposals'
import { useReorder } from './reorder'
import { applyOrder, useTileOrder, type TileWho } from './tileOrder'
/* THE PANEL THAT MAKES A MODULE, MOUNTED FROM WHERE THE PROPOSAL
   IS PRESSED. It portals itself to the body, so it can be raised
   from a dashboard card as readily as from the modules screen —
   which is what lets a proposal open the real create panel instead
   of growing a second one. */
import { NewModuleDialog, PlaceMark, placeFilters, rememberPlace } from '@/features/modules'
import { ActivityList, useActivity } from '@/features/activity'

const MARK = ICON_SIZE.small
const MARK_WEIGHT = weightFor(MARK)

/** The mark on each card's header. One size, one weight, so all
 *  of them read as one set — the rail's own discipline. */
export const CARD_ICON: Record<CardId, Icon> = {
  'my-quotes': FileText,
  'my-modules': SquaresFour,
  /* THE STOREROOM, NOT A BOAT. The card holds every kind at once,
     so a boat on its header would be the boat door's own glyph
     promoted to stand for the trailers and the parts as well —
     and the kind symbols inside the card are the vocabulary this
     header must not pre-empt. */
  'what-we-sell': Storefront,
  activity: Pulse,
  'the-price-file': Table,
  'recently-opened': ClockCounterClockwise,
  'data-quality': SealWarning,
  'rules-warning': Scales,
}

export function CardMark({ id }: { id: CardId }): JSX.Element {
  const Glyph = CARD_ICON[id]
  return <Glyph size={MARK} weight={MARK_WEIGHT} />
}

/* ---------------------------------------------------------- */
/* The shared pieces                                          */
/* ---------------------------------------------------------- */

/** WHAT A CARD SAYS WHEN IT HAS NOTHING TO SAY, AND IT IS FOUR
 *  THINGS RATHER THAN TWO.
 *
 *  DESIGN_CONTRACT §6 fixes the shape and §11 checklists it:
 *  **eyebrow, what-it-is, what-you-already-have, one action.**
 *  This drew the sentence and the button — parts two and four —
 *  and the two it dropped are the two the contract calls
 *  load-bearing: *"Read the real count from the store. Never write
 *  a blank screen at a person who has data."*
 *
 *  MEASURED, WHICH IS WHY IT MATTERS HERE RATHER THAN IN A
 *  CHECKLIST. On the real seed at 1280x800 the quotes card's body
 *  is 261.8px, 111.5px of it empty — 42.6% — and at 1920x1080 it
 *  is 174.7px of 389.1px, 44.9%. That air is what a person sees
 *  one second after loading 15,691 rows across 53 tables into 25
 *  places, over the words "No quotes have been raised here yet."
 *
 *  THE COUNT IS READ HERE AND NOWHERE ELSE. `emptyCount` is pure
 *  and takes figures; this is the one place that fetches them, so
 *  seven cards cannot drift into seven readings of the store. It
 *  is a component and not a hook at the card level because the
 *  figures are only wanted when a card is empty, which on a
 *  working project is never.
 *
 *  ONE CARD HAS TWO ABSENCES AND THEY ARE DIFFERENT FACTS, which
 *  is what `state` and `say` override: "Rules that warn" is empty
 *  when no rule is switched on at all, and empty again when rules
 *  are on and none of them warns. `CardMeta` carries the second,
 *  because that is the card's own subject; the first is a
 *  different sentence and says so where it is drawn. The COUNT
 *  needs no override — `emptyCount` returns null at zero rules on
 *  its own, so the two states cannot disagree about the figure.
 *
 *  STILL NEVER TWO ACTS — a card is a glance, and a glance holds
 *  one decision. */
function Nothing({
  id,
  state,
  say,
  act,
  onAct,
  more,
}: {
  id: CardId
  state?: string
  say?: string
  act?: string
  onAct?: () => void
  /** WHAT THE CARD KNOWS THAT THE SENTENCE CANNOT SAY. One card
   *  fills it — the modules card, with the modules its own tables
   *  imply — and it sits under the count because it is a reading of
   *  that count and not a fifth part of the paragraph. Everything
   *  else leaves it empty and draws the four parts §6 asks for. */
  more?: ReactNode
}): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const constraints = useConstraints()
  const places = usePlaces()
  const meta = CARDS[id]

  const have = useMemo(
    () =>
      emptyCount(id, {
        places: places.length,
        tables: fileTally(entities, rowsByEntity).tables,
        rules: rollRules(constraints).enabled,
      }),
    [id, places, entities, rowsByEntity, constraints],
  )

  return (
    <div className="dsh-empty">
      <p className="dsh-empty-state ds-label">{state ?? meta.state}</p>
      <p className="dsh-empty-say ds-small">{say ?? meta.empty}</p>
      {/* THE FIGURE IS MONO AND THE WORDS AROUND IT ARE NOT — the
          same rule every other number on this page keeps (§2), and
          the reason a count reads as a fact rather than as more
          prose. `<strong>` because the contract's model sets it
          that way and because the figure is the point of the
          line. */}
      {have ? <p className="dsh-empty-have ds-small">{splitCount(have)}</p> : null}
      {more}
      {act && onAct ? (
        <button type="button" className="dsh-act" onClick={onAct}>
          {act}
        </button>
      ) : null}
    </div>
  )
}

/** SET THE FIGURE IN MONO WITHOUT WRITING THE SENTENCE TWICE.
 *
 *  `emptyCount` returns one string because a sentence is one
 *  thing to read and one thing to test; the drawing of it needs
 *  the number in `--font-mono` and the words in Inter. So the
 *  string is cut on its first run of digits — the only run any of
 *  those sentences has — rather than being handed over as three
 *  fields a caller could reassemble in the wrong order.
 *
 *  A sentence with no digits in it comes back whole, which is
 *  what makes this safe for a line nobody has written yet. */
function splitCount(say: string): ReactNode {
  const at = say.search(/\d/)
  if (at < 0) return say
  /* A GROUPING COMMA OR A DECIMAL POINT IS PART OF THE FIGURE; A
     FULL STOP IS NOT. "15,691 rows." must not end with the stop
     inside the mono span, so a separator only continues the run
     when a digit follows it. */
  let end = at
  while (
    end < say.length &&
    (/\d/.test(say[end] ?? '') || (/[,.]/.test(say[end] ?? '') && /\d/.test(say[end + 1] ?? '')))
  ) {
    end += 1
  }
  return (
    <>
      {say.slice(0, at)}
      <strong className="dsh-empty-n ds-mono">{say.slice(at, end)}</strong>
      {say.slice(end)}
    </>
  )
}

/** One large counted figure with the words that qualify it. The
 *  figure is mono because it is a figure; the words are not. */
function Figure({
  n,
  say,
  onPick,
  lead,
}: {
  n: number
  say: string
  onPick?: () => void
  /** the one figure on this card a person reads first */
  lead?: boolean
}): JSX.Element {
  const body = (
    <>
      <span className={`dsh-fig-n${lead ? ' is-lead' : ''}`}>
        {n.toLocaleString()}
      </span>
      <span className="dsh-fig-say ds-caption">{say}</span>
    </>
  )
  if (!onPick) return <div className="dsh-fig">{body}</div>
  return (
    <button type="button" className="dsh-fig dsh-fig-btn" onClick={onPick}>
      {body}
    </button>
  )
}

/** A row in a card's list. It DARKENS on press rather than
 *  scaling (§4) so its neighbours do not look like they moved.
 *
 *  AND WHEN IT HAS A KIND, THE KIND CARRIES A SURFACE. `data-kind`
 *  is set on the ROW, not on the mark, which is what lets `--kind`
 *  resolve for both the full-height rail (`.k-rail`, ds.css) and
 *  the glyph inside it. That is the amendment §1 now carries: a
 *  hue may carry a rail, and it only ever appears on something
 *  that HAS that kind. Two things of one kind are one colour
 *  everywhere in the app.
 *
 *  THE FIGURE IN THE TAIL IS NEVER THE HUE. A price is not
 *  decorative, so `tail` stays ink and mono however loud the rail
 *  beside it is.
 *
 *  THE HUE IS NEVER THE ONLY CARRIER either: the glyph is a
 *  different SHAPE per kind, so the row reads the same to
 *  somebody who cannot separate indigo from amber. */
function Row({
  title,
  under,
  tail,
  kind,
  label,
  onPick,
}: {
  title: string
  under?: ReactNode
  tail?: ReactNode
  /** WHAT THIS ROW IS. `EntityDef.kind` is a fact the dealer set,
   *  and it is why "Rigging Kits" and "Highfield Inflatables" stop
   *  reading as two lines of the same thing. */
  kind?: TableKind
  label: string
  onPick: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      className={`dsh-row${kind ? ' k-rail' : ''}`}
      data-kind={kind}
      onClick={onPick}
      aria-label={label}
    >
      {kind ? (
        <span className="dsh-row-mark" aria-hidden="true">
          <TableKindSymbol kind={kind} size={ICON_SIZE.small} />
        </span>
      ) : null}
      <span className="dsh-row-main">
        <span className="dsh-row-title ds-small">{title}</span>
        {under ? <span className="dsh-row-under ds-caption">{under}</span> : null}
      </span>
      {tail ? <span className="dsh-row-tail">{tail}</span> : null}
    </button>
  )
}

/** The last line of a card: where the whole list lives. */
function More({ say, onPick }: { say: string; onPick: () => void }): JSX.Element {
  return (
    <button type="button" className="dsh-more" onClick={onPick}>
      {say}
    </button>
  )
}

/* ---------------------------------------------------------- */
/* Quotes — ONE card, with the states as filters inside it    */
/* ---------------------------------------------------------- */

/* WHY THIS IS ONE CARD AND WAS THREE.

   "My quotes", "Quotes by state" and "Where I have been" were
   three boxes across the top of the front door. Two of them were
   a heading over a number, and the number was a count of the
   list the third one drew — so the screen asked one question
   three times and answered it best in the box with the least
   room.

   The states are FILTERS now, inside the card that lists them,
   which means the chip and the rows under it are computed from
   one array by one predicate (`lensHolds`, cards.ts) and cannot
   disagree. It opens on DRAFTS, because a resumable draft is the
   most valuable thing on this screen and it was four levels down.

   NOTHING IS INVENTED HERE EITHER. Every chip's figure is a
   count of quotes that exist; "By customer" gathers the same
   rows under the name FROZEN on each document and resolves
   nothing through the register. */

const QUOTE_ROWS = 8

function Quotes({ me, acts }: { me: string; acts: DashboardActs }): JSX.Element {
  const quotes = useQuotes()
  const entities = useProjectStore((s) => s.entities)
  /* NULL UNTIL THE PERSON PICKS ONE, so the card can open on
     drafts and still fall back to All the day there are none —
     without overwriting a choice they made. A `useState('drafts')`
     would strand somebody on an empty filter the moment their
     last draft was issued. */
  const [picked, setPicked] = useState<QuoteLens | null>(null)
  const [grouped, setGrouped] = useState(false)

  const counts = useMemo(() => countLenses(quotes, me), [quotes, me])
  const lens: QuoteLens = picked ?? (counts.drafts > 0 ? 'drafts' : 'all')
  const list = useMemo(() => quotesUnder(quotes, lens, me), [quotes, lens, me])
  const bands = useMemo(
    () => (grouped ? byCustomer(list.slice(0, QUOTE_ROWS)) : []),
    [grouped, list],
  )

  if (quotes.length === 0) {
    return <Nothing id="my-quotes" act="New quote" onAct={acts.onNewQuote} />
  }

  /* THE SUBJECT'S OWN KIND. A quote is raised FROM a row on a
     table, and that table's kind is what the rig is — so the same
     hue marks the same boat here, in the modules card and on the
     sheet. A quote whose root table has since been struck gets no
     mark rather than a grey one: an absent fact is drawn absent. */
  const kindFor = (q: QuoteDef): TableKind | undefined => {
    const entity = entities[q.rootTableId]
    return entity ? kindOf(entity.kind) : undefined
  }

  const line = (q: QuoteDef): JSX.Element => {
    const totals = quoteTotals(q)
    const customer = q.customer.name.trim()
    return (
      <Row
        key={q.id}
        kind={kindFor(q)}
        /* THE CUSTOMER IS THE HEADING, and the subject was. A deal
           is a person waiting on an answer; the boat is what they
           are waiting on. The board's cards were already drawn this
           way and this one was not, so the same three quotes read
           as two different things on two screens.

           A quote addressed to nobody says so rather than drawing
           an empty line — it is a real state and the most common
           one on a fresh sheet. */
        title={customer || 'No customer yet'}
        under={
          <>
            <span className="dsh-subject">{q.subjectLabel}</span>
            <span className={`dsh-state${q.state === 'issued' ? ' is-issued' : ' is-draft'}`}>
              {q.state === 'issued' ? 'Issued' : 'Draft'}
            </span>
          </>
        }
        tail={
          /* A QUOTE WITH AN UNPRICED LINE DOES NOT PRINT A
             CONFIDENT TOTAL. The document itself says so out loud;
             a dashboard that rounded it into one number would be
             the quieter version of the same fault. */
          totals.unpricedCount > 0 ? (
            <span className="dsh-sum is-partial ds-mono">
              {money(totals.total)}
              <span className="dsh-sum-note ds-caption">
                {plural(totals.unpricedCount, 'line unpriced', 'lines unpriced')}
              </span>
            </span>
          ) : (
            <span className="dsh-sum ds-mono">{money(totals.total)}</span>
          )
        }
        label={`Open quote ${q.reference} \u2014 ${q.subjectLabel}`}
        onPick={() => acts.onOpenQuote(q.id)}
      />
    )
  }

  /* WHAT IS IN THE PIPELINE UNDER THIS FILTER. The card listed
     three quotes and never said what they came to — the one figure
     a person opens a quotes card to see, and the only one that
     answers "how is the month going".

     IT IS COMPUTED FROM THE FILTERED LIST, not from every quote,
     so the figure and the rows beneath it can never disagree.
     Lines with no price are counted separately and said, for the
     same reason a single quote says it: a total that silently
     absorbed them would be a confident number about an incomplete
     one. */
  const worth = list.reduce((n, q) => n + quoteTotals(q).total, 0)
  const partial = list.filter((q) => quoteTotals(q).unpricedCount > 0).length

  return (
    <>
      <div className="dsh-lenses" role="group" aria-label="Which quotes">
        {QUOTE_LENSES.map((l) => (
          <button
            key={l}
            type="button"
            className="dsh-lens"
            aria-pressed={l === lens}
            onClick={() => setPicked(l)}
          >
            {LENS_NAME[l]}
            <span className="dsh-lens-n ds-mono-sm">{counts[l].toLocaleString()}</span>
          </button>
        ))}
        <button
          type="button"
          className="dsh-lens dsh-lens-by"
          aria-pressed={grouped}
          onClick={() => setGrouped((v) => !v)}
        >
          By customer
        </button>
      </div>

      {list.length > 0 ? (
        <p className="dsh-worth">
          {/* NO `.ds-mono`, AND THAT IS DELIBERATE. This is the one
              figure on the dashboard set at the display step, and
              ds.css measured what a fixed-pitch family costs there:
              the thousands comma takes a full digit cell and
              "$8,557" reads "$8 , 557". `.dsh-worth-n` takes
              `--t-figure-xl-*` whole — Archivo, tabular — so the
              total still cannot jitter as it changes. The argument
              in full is beside the rule in dashboard.css. */}
          <b className="dsh-worth-n">{money(worth)}</b>
          <span className="dsh-worth-say">
            across {plural(list.length, 'quote', 'quotes')}
          </span>
          {partial > 0 ? (
            <span className="dsh-worth-note">
              {partial === list.length && list.length === 1
                ? 'one has a line with no price'
                : `${partial} with a line not priced`}
            </span>
          ) : null}
        </p>
      ) : null}

      {list.length === 0 ? (
        /* A FILTER THAT HOLDS NOTHING SAYS SO WHERE IT IS
           REFUSED (rule 10), and it is a fact rather than an
           apology: there ARE quotes here, just none under this
           chip. */
        <p className="dsh-none ds-small">{LENS_NONE[lens]}</p>
      ) : grouped ? (
        <div className="dsh-list">
          {bands.map((band) => (
            <div className="dsh-band" key={band.name || '—'}>
              <p className="dsh-band-name">{band.name || 'Not addressed'}</p>
              {band.quotes.map(line)}
            </div>
          ))}
        </div>
      ) : (
        <div className="dsh-list">{list.slice(0, QUOTE_ROWS).map(line)}</div>
      )}

      {/* NO "All quotes" AT THE FOOT. The card's header already
          carries Open, in the same place on every card — this was a
          second door to one place, and the one at the bottom moved
          as the list changed length. The same duplication was
          removed from the modules card. */}
    </>
  )
}

/* ---------------------------------------------------------- */
/* Where I have been                                          */
/* ---------------------------------------------------------- */

function RecentlyOpened({ acts }: { acts: DashboardActs }): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const picks = useRecentPicks()
  const rows = useMemo(
    () => resolveRecent(picks, entities, rowsByEntity),
    [picks, entities, rowsByEntity],
  )

  if (rows.length === 0) {
    return <Nothing id="recently-opened" act="Find anything" onAct={acts.onFind} />
  }

  return (
    <div className="dsh-list">
      {rows.map((r) => (
        <Row
          key={r.key}
          title={r.title}
          /* THE TABLE'S OWN KIND, resolved here rather than
             remembered: `resolveRecent` already dropped any pick
             whose subject is gone, so an entity that survives that
             is present and its kind is a fact. */
          kind={entities[r.entityId] ? kindOf(entities[r.entityId].kind) : undefined}
          under={r.under ? <span className="dsh-when">{r.under}</span> : undefined}
          label={`Open ${r.under || r.title}`}
          onPick={() => acts.onOpenTable(r.entityId)}
        />
      ))}
    </div>
  )
}

/* ---------------------------------------------------------- */
/* What your tables suggest — the first-run moment            */
/* ---------------------------------------------------------- */

/* THE SCREEN THIS ANSWERS. A dealer imports their price file and
   lands on a front door that does not know what they sell: 53
   tables and 15,691 rows behind a card reading "No modules yet"
   over one button called Modules. The app is not short of the
   answer — `EntityDef.kind` records what each table holds and
   `TABLE_KINDS` names it — it simply was not saying it.

   THE PROPOSAL IS A READING, NEVER A VERDICT, which is the same
   line `split.ts` draws for itself: it names the tables it would
   hold and the rows under them, and a person presses it or does
   not. `proposals.ts` holds the arithmetic and the argument for
   every predicate in it.

   AND PRESSING ONE OPENS THE PANEL THAT ALREADY EXISTS. There is
   one create path in this application. `NewModuleDialog` is a
   three-click create — pick a table, tick its siblings, Create —
   and a proposal a person has read has already answered the first
   two, so it hands them over as a seed and the panel opens on
   them, editable and abandonable. Nothing here calls
   `createModule`; a second create path would be a second set of
   rules about what a module may be built from. */

function useProposals(): ProposalReading {
  const modules = useProjectStore((s) => s.modules)
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  return useMemo(
    () => proposeModules(modules, entities, rowsByEntity),
    [modules, entities, rowsByEntity],
  )
}

function Proposals({
  reading,
  lead,
  why,
  acts,
}: {
  reading: ProposalReading
  /** the label over the list. Two callers, two different facts:
   *  an empty card is being told what its tables suggest, and a
   *  card with places on it is being told what is left over */
  lead: string
  /** draw the refusal. Only where the count line it qualifies is
   *  directly above it — under a grid of tiles it would be a
   *  sentence about a number that is not on screen */
  why: boolean
  acts: DashboardActs
}): JSX.Element | null {
  /* WHICH PROPOSAL THE PANEL IS STANDING ON, and it is the panel's
     `key` as well as its seed: a different answer is a different
     panel, which is what stops a half-typed name surviving into a
     proposal somebody pressed afterwards. */
  const [asked, setAsked] = useState<ModuleProposal | null>(null)
  if (reading.proposals.length === 0) return null

  return (
    <div className="dsh-propose">
      <p className="dsh-propose-lead ds-label">{lead}</p>
      <ul className="dsh-propose-list">
        {reading.proposals.map((p) => {
          const tables = plural(p.tables.length, 'table', 'tables')
          const rows = plural(p.rows, 'row', 'rows')
          const held = p.tables.map((t) => t.name)
          return (
            /* THE KIND CARRIES THE ROW, as it carries a tile and a
               chip — `data-kind` sets `--kind` (ds.css) and this is
               a thing that HAS that kind, which is the whole of the
               rule in §1. */
            <li key={p.kind} data-kind={p.kind}>
              {/* EVERYTHING IT WOULD DO IS IN THE LABEL, because a
                  proposal a person cannot check before pressing is
                  a guess with a button on it — and a reader who
                  cannot see the second line has to be able to check
                  it too. */}
              <button
                type="button"
                className="dsh-propose-row"
                onClick={() => setAsked(p)}
                aria-label={`Make ${p.name} from ${tables} — ${rows}: ${held.join(', ')}`}
              >
                <span className="dsh-propose-top">
                  <span className="dsh-propose-mark" aria-hidden="true">
                    <TableKindSymbol kind={p.kind} size={12} />
                  </span>
                  <span className="dsh-propose-name">{p.name}</span>
                  {/* THE FIGURES ARE MONO AND THE NOUNS ARE NOT —
                      the rule every other count on this page keeps */}
                  <span className="dsh-propose-n" aria-hidden="true">
                    <b className="dsh-propose-fig ds-mono">{p.tables.length}</b>{' '}
                    {p.tables.length === 1 ? 'table' : 'tables'}
                    {' · '}
                    <b className="dsh-propose-fig ds-mono">{p.rows.toLocaleString()}</b>{' '}
                    {p.rows === 1 ? 'row' : 'rows'}
                  </span>
                </span>
                {/* THE TABLES IT WOULD HOLD, BY NAME. This line is
                    the reason the proposal is allowed to exist:
                    nothing is invented, and a person can read what
                    they are about to agree to before they agree to
                    it. It wraps rather than truncating — a list cut
                    short with an ellipsis is the reduced count
                    DESIGN_CONTRACT §5 refuses. */}
                <span className="dsh-propose-holds" aria-hidden="true">
                  {held.join(' · ')}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* RULE 10, WHERE THE THING IS REFUSED. The tables that
          declare no kind are inside the count above and outside
          every proposal below it, and a person who cannot see why
          has been handed a number that does not add up. */}
      {why && reading.why ? <p className="dsh-propose-why ds-small">{reading.why}</p> : null}

      {asked ? (
        <NewModuleDialog
          key={asked.kind}
          seed={seedFor(asked)}
          onClose={() => setAsked(null)}
          /* THE THIRD CLICK LANDS IN THE MODULE. A place you then
             have to go and find is a fourth — the same reasoning
             `ModuleStage` states where it mounts this panel. */
          onCreated={(id) => acts.onOpenModule(id)}
        />
      ) : null}
    </div>
  )
}

/* ---------------------------------------------------------- */
/* My modules                                                 */
/* ---------------------------------------------------------- */

/* THE MODULES CARD DRAWS PLACES, AND IT USED TO DRAW CATEGORIES.
   That is the whole of this rewrite and it is worth being exact
   about, because the card looked finished while it was wrong.

   It listed the nine MODULES — Boats, Motors, Factory Packages,
   Trailers, Parts & Accessories, Dealer Fit Packages, Labour
   Rates, Oils & Consumables, Registration Costs. Those are
   categories. What a dealer opens is Highfield, Yamaha, Stacer,
   Stabicraft, Surtees, Dunbier, REDCO, Mackay, GFAB, ePropulsion,
   Jeanneau, Formosa, Haines and NSM Custom — and every one of them
   was hidden inside a grouping, behind a card that named a sibling
   and counted the rest. The modules SCREEN was fixed for exactly
   this reason (`places.ts`); the front door was still drawing the
   old shape, so the two disagreed about what a module even is.

   `placesOf` is that screen's own reader, so the card and the page
   it opens now list the same things in the same order and cannot
   drift apart.

   A TILE, NOT A ROW, because a brand is recognised by its mark
   before its name is read, and a row of text with a colour rail
   beside it throws that away. `PlaceMark` draws the dealer's own
   logo where one has been given and the kind's symbol where none
   has — the same mark this place draws on the modules screen.

   IT SCROLLS RATHER THAN TRUNCATES. Eight rows and an "All 14
   modules" link was the front door of a business admitting it
   could not show you the business.
   ---------------------------------------------------------- */

function MyModules({ acts, who }: { acts: DashboardActs; who: TileWho }): JSX.Element {
  const modules = useProjectStore((s) => s.modules)
  const entities = useProjectStore((s) => s.entities)
  const { order, set } = useTileOrder(who)
  const everyPlace = usePlaces()
  /* THE READING IS TAKEN WHETHER OR NOT THERE ARE PLACES, because
     the answer matters in both states — it IS the empty card, and
     it is what is left over on a card that has a place or two on
     it. It walks the entity map once and is memoised on the three
     objects the store swaps, so a card with everything placed pays
     one pass over 53 tables to be told there is nothing to say. */
  const proposals = useProposals()

  const places = useMemo(
    () => applyOrder(everyPlace, (p) => p.key, order),
    [everyPlace, order],
  )

  /* THE PERSON'S OWN ORDER, NOT THE BUSINESS'S. Dragging a tile
     writes a key list for this person on this dashboard; it does
     not touch `ModuleDef.order`, because that would rearrange the
     modules screen for everybody who signs in. See tileOrder.ts. */
  const move = useCallback(
    (from: number, to: number): void => {
      const keys = places.map((p) => p.key)
      const [held] = keys.splice(from, 1)
      if (held === undefined) return
      keys.splice(to, 0, held)
      set(keys)
    },
    [places, set],
  )

  const reorder = useReorder({ count: places.length, onMove: move, slotAttr: 'data-dsh-tile' })

  /* ONE PASS OVER THE QUOTES FOR THE WHOLE CARD, not one per tile.
     See `quotesPerPlace`. */
  const quotes = useQuotes()
  const quotesAt = useMemo(
    () => quotesPerPlace(places, modules, quotes),
    [places, modules, quotes],
  )

  if (places.length === 0) {
    /* THE ACT IS NAMED OR IT IS NOT NAMED, AND NEVER BOTH.
       §6 asks for ONE action, and where there are proposals the
       proposals ARE it — five buttons plus a sixth called
       "Modules" would be the same door twice, once with the answer
       on it and once without. The card head already carries Open
       for anybody who wants the modules screen whole (`openFor`),
       so nothing is lost by dropping the generic one; where there
       is nothing to propose it is the only door and stays. */
    return (
      <Nothing
        id="my-modules"
        {...(proposals.proposals.length > 0
          ? {}
          : { act: 'Modules', onAct: acts.onOpenModules })}
        more={
          <Proposals
            reading={proposals}
            lead="What your tables suggest"
            why
            acts={acts}
          />
        }
      />
    )
  }

  /* THE KEY, WHICH IS WHAT PAID FOR TAKING THE SYMBOLS OFF.
     Every tile used to carry a boat, a motor or a trailer, which
     meant the same four glyphs repeated 25 times to say a thing
     the tile's own colour was already saying. Said ONCE, above the
     grid, it is four words instead of 25 pictures — and it is the
     only place in this application where the kind colours are
     explained rather than merely used.

     Counted from the places on screen, so a business with no
     trailers has no trailer swatch. `placeFilters` is the modules
     screen's own reader and its first chip is "All", which is a
     filter rather than a colour and is dropped here. */
  const key = placeFilters(places).filter((f) => f.kind !== undefined)

  return (
    <>
      <ul className="dsh-key" aria-label="What the colours mean">
        {key.map((f) => (
          <li className="dsh-key-item" key={f.key} data-kind={kindOf(f.kind)}>
            <span className="dsh-key-dot" aria-hidden="true" />
            {f.label}
          </li>
        ))}
      </ul>

    <div className="dsh-tiles" ref={reorder.containerRef}>
      {reorder.order.map((original, slot) => {
        const p = places[original]
        if (!p) return null
        const master = p.tableId !== undefined ? entities[p.tableId] : undefined
        return (
          <div
            key={p.key}
            data-dsh-tile=""
            /* THE KIND CARRIES THE TILE. `data-kind` sets `--kind`
               (ds.css); the tile draws its mark plate from it, so
               the same brand is the same colour here, in the rail
               and on its own page. */
            data-kind={kindOf(p.kind)}
            className={`dsh-tile${reorder.held === slot ? ' is-held' : ''}${
              p.retired ? ' is-held-back' : ''
            }`}
          >
            <button
              type="button"
              className="dsh-tile-face"
              /* THE DOOR REMEMBERS WHICH BRAND WAS PRESSED.
                 A module workspace opened at "Boats" above a card
                 that said "Highfield" is the fault `openPlace.ts`
                 exists to prevent: the grid records the table, the
                 workspace stands there. The dashboard is a second
                 grid onto the same places and owes the same fact. */
              onClick={() => {
                rememberPlace(p.moduleId, p.tableId)
                acts.onOpenModule(p.moduleId)
              }}
            >
              {/* THE MARK IS THE HEADING WHERE THERE IS ONE.
                  A brand's wordmark IS its name, set better than
                  this application will ever set it, so drawing
                  both is saying the same word twice — once in
                  Highfield's own type and once in ours. The name
                  is still here, underneath, and CSS hides it when
                  a mark was actually painted.

                  WHY CSS AND NOT A TERNARY. Whether a mark is
                  drawn is decided inside `PlaceMark`: it needs a
                  logo AND the app's permission to paint that
                  address. A ternary here would be a second copy of
                  that decision, and the day it disagreed the tile
                  would be blank — no mark, and no name either.
                  `:has(img)` cannot disagree, because it is asking
                  the question of the thing that answered it. */}
              <span className="dsh-tile-panel">
                <PlaceMark
                  logo={modules[p.moduleId]?.logo}
                  name={p.name}
                  master={master}
                  size={ICON_SIZE.small}
                  fallback="none"
                />
                <span className="dsh-tile-name">{p.name}</span>
              </span>
            </button>

            {/* THE FOOT IS THE COUNT, AND UNDER THE CURSOR IT IS THE
                TWO THINGS YOU CAME TO DO.

                They occupy the SAME cell and cross-fade, so nothing
                moves: a row of actions that appears by growing the
                tile would shove every tile below it down the moment
                the pointer crossed one, which is the reason most
                hover-action grids feel broken. The count is what
                you read; the actions are what you press; you are
                never doing both in the same instant.

                They are real buttons and not links-in-a-button:
                nesting them inside the face would be invalid and
                would make the whole tile ambiguous to a keyboard.
                Reached by tabbing, and `:focus-within` on the tile
                keeps them up while they are. */}
            {/* THE FOOT IS A FIFTH OF THE TILE, and the mark is the
                other four. It was closer to half and half, which
                made the strip of small grey text compete with the
                thing the tile exists to show.

                THE HOVER BUTTONS ARE GONE. Quote and Catalog were
                real, they worked, and they were the wrong answer:
                two grey pills that appeared under the pointer, on a
                card whose job is to get you INTO a module — where
                both acts live anyway, with more room and more
                context. The right fix is a fast module page, not a
                shortcut past it.

                WHAT THE ROOM BOUGHT INSTEAD IS THE QUOTE COUNT. How
                many quotes are out on this brand is the one fact a
                salesperson wants off a dashboard that a row count
                cannot give them — 588 Highfield variants is the
                catalogue's size and says nothing about the day. */}
            <div className="dsh-tile-foot">
              {/* THE KIND, AS A PILL WITH ITS OWN MARK.
                  The category was a bare word here and the kind's
                  symbol was nowhere on the tile at all — it came off
                  when the brand wordmark became the face, on the
                  reasoning that four glyphs repeated twenty-five
                  times is wallpaper rather than identity.

                  That reasoning holds for a glyph drawn LARGE in
                  place of a mark. It does not hold for one at 12px
                  beside the word it belongs to: there it is not
                  competing with the wordmark above, it is telling
                  you what sort of thing this brand sells, which the
                  wordmark cannot. The colour key above the grid maps
                  the hue; this names it on the tile. */}
              {/* AND IT SAYS THE MODULE ONLY WHEN THAT IS NOT THE
                  NAME ABOVE IT. Five of the twenty-five places are
                  their own module — Yamaha Outboards, Parts &
                  Accessories — so the pill printed the tile's own
                  name a second time, sixty pixels under the first.
                  Where they agree it says the KIND instead, which
                  is the one thing the wordmark above cannot tell
                  you and the thing the colour key teaches. */}
              <span className="dsh-tile-kind" data-kind={kindOf(p.kind)}>
                <TableKindSymbol kind={kindOf(p.kind)} size={12} />
                {p.moduleName === p.name
                  ? TABLE_KINDS[kindOf(p.kind)].label
                  : p.moduleName}
              </span>
              <span className="dsh-tile-figs">
                <span className="dsh-tile-sum ds-mono">
                  {p.retired ? 'held' : p.census.items.toLocaleString()}
                </span>
                {/* DRAWN ONLY WHERE THERE ARE ANY. A column of "0"
                    down a grid of twenty-five tiles is noise that
                    reads as a fault; the tiles with quotes on them
                    are the ones worth spotting, and they are the
                    only ones that light up. */}
                {quotesAt[p.key] ? (
                  <span className="dsh-tile-q" title={`${quotesAt[p.key]} quotes`}>
                    <FileText size={12} weight={MARK_WEIGHT} aria-hidden="true" />
                    <span className="ds-mono">{quotesAt[p.key]}</span>
                  </span>
                ) : null}
              </span>
            </div>

            {/* THE GRIP IS ITS OWN CONTROL, NOT THE TILE. Dragging
                the face would mean a press that travels three pixels
                opens a brand instead of moving it, which is the
                fault every draggable list has. Keyboard-operable
                for the same reason the card grips are. */}
            <button
              type="button"
              className="dsh-tile-grip"
              aria-label={`Move ${p.name}. Arrow keys move it.`}
              {...reorder.handleProps(original)}
            >
              <DotsSixVertical size={ICON_SIZE.tiny} weight={MARK_WEIGHT} />
            </button>
          </div>
        )
      })}
    </div>

      {/* AND THE NEAR-EMPTY CASE, WHICH IS THE SAME MOMENT A DAY
          LATER. A dealer makes one module, comes back, and forty
          tables are still standing outside it — the proposal is as
          true then as it was on the blank card, so the same list
          sits under the tiles rather than waiting for a screen
          nobody will return to. It goes silent on its own: the
          reading is over tables no module holds, so a sheet where
          everything has a home draws nothing here.

          THE REFUSAL DOES NOT COME WITH IT. It qualifies the count
          in the empty state's third line, and that line is not on
          this card — a sentence about a number a person cannot see
          is worse than no sentence. */}
      <Proposals reading={proposals} lead="Not in a module yet" why={false} acts={acts} />
    </>
  )
}

/* ---------------------------------------------------------- */
/* What we sell — the catalogue, entered by kind              */
/* ---------------------------------------------------------- */

/* THE FOUR DOORS PHASE_TWO §2.1 ASKS FOR, AND WHAT THEY ARE FOR.

   Every route from this dashboard into the catalogue went through
   a BRAND: a tile on the modules card opens Highfield, or Yamaha,
   or Stacer. There was no way to say "show me the boats" — the
   one thing a person standing at a counter says most.

   A DOOR IS A KIND, AND IT OPENS THE MODULE THAT HOLDS IT WHOLE.
   `rememberPlace(moduleId, undefined)` is the difference between
   this and a tile: the tile records the table it was pressed at
   and the workspace stands there, and this one clears it, so the
   workspace opens on every brand of that kind at once. Which kind
   earns a door, and why a kind behind two modules earns none, is
   argued in `doors.ts`.

   THE PHOTOGRAPH IS A REAL ROW OF THAT KIND — the seed ships 220
   of them under `public/seed-images` — and a kind whose rows carry
   none draws its own symbol on its own tint instead. Nothing is
   substituted, which is the rule `northsideImages.ts` states for
   itself and the reason there is no stock photography anywhere in
   this application. */

function WhatWeSell({ acts }: { acts: DashboardActs }): JSX.Element {
  const modules = useProjectStore((s) => s.modules)
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const places = usePlaces()

  const doors = useMemo(
    () => doorsOf(places, modules, entities, rowsByEntity),
    [places, modules, entities, rowsByEntity],
  )

  /* THE ACT THE EMPTY STATE OFFERS IS THE ONE THAT WOULD MAKE A
     DOOR: a door is a kind behind a module, so the thing to go and
     do is make a module. */
  if (doors.length === 0) {
    return <Nothing id="what-we-sell" act="Modules" onAct={acts.onOpenModules} />
  }

  return (
    <div className="dsh-doors">
      {doors.map((door) => (
        <DoorPlate
          key={door.kind}
          door={door}
          onOpen={() => {
            rememberPlace(door.moduleId, door.tableId)
            acts.onOpenModule(door.moduleId)
          }}
        />
      ))}
    </div>
  )
}

/** ONE DOOR. The photograph, the kind's name, and what is behind
 *  it, counted.
 *
 *  THE CAPTION IS NOT OVER THE PICTURE. Rule 4 asks every
 *  text/background pair to clear 4.5:1 MEASURED, and a photograph
 *  has no ground that can be measured — a white hull and a sunset
 *  are two different backgrounds under one line of type. So the
 *  words sit on the card's own surface underneath, where the ratio
 *  is the one the ink ramp was measured at.
 *
 *  AND THE FIGURE IS NOT THE HUE. §1: a price is not decorative,
 *  and neither is a count. The kind's colour is the plate behind
 *  the picture and the tint of the door; the number is ink. */
function DoorPlate({ door, onOpen }: { door: Door; onOpen: () => void }): JSX.Element {
  return (
    <button type="button" className="dsh-door" data-kind={door.kind} onClick={onOpen}>
      {/* THE MARK IS DRAWN AND CSS HIDES IT WHERE A PHOTOGRAPH
          LANDED, which is the arrangement the module tiles already
          keep and for the same reason: whether a picture paints is
          decided inside `Shot` — it needs an address the app is
          allowed to request — and a ternary here would be a second
          copy of that decision that could disagree with it. */}
      <span className="dsh-door-plate">
        {door.picture ? <Shot img={door.picture} /> : null}
        {/* `large`, WHICH `icons.tsx` NAMES "the industry choice,
            empty states" — because that is what this is. A plate
            with no photograph in it is an empty state, and a 22px
            glyph in a 264x140 plate is a mark somebody mislaid
            rather than a mark standing in for a picture. */}
        <span className="dsh-door-mark" aria-hidden="true">
          <TableKindSymbol kind={door.kind} size={ICON_SIZE.large} />
        </span>
      </span>
      <span className="dsh-door-say">
        {/* NO `.ds-heading`, AND IT USED TO CARRY ONE. A door's name
            is the display step now — `--t-display-xl` through
            `.dsh-door-name`, which is the feature rule that owns
            this element. Two classes both at (0,1,0) with this
            feature's sheet loaded after ds.css is a cascade nobody
            can see; the argument is beside the rule, along with the
            two rungs the name steps down to when the cell it is in
            cannot hold that step. */}
        <span className="dsh-door-name">{door.label}</span>
        {/* THE COUNT IS THE DEALER'S OWN NOUN — "810 variants",
            "2,860 parts" — and the figure inside it is mono, which
            is the rule every other number on this page keeps. */}
        <span className="dsh-door-n ds-caption">
          {splitCount(`${door.items.toLocaleString()} ${door.noun}`)}
        </span>
      </span>
    </button>
  )
}

/** The picture on a door, or nothing at all.
 *
 *  `alt` IS EMPTY ON PURPOSE, and this is the one place in the app
 *  where that is right. In the catalogue the photograph IS the row
 *  and carries the row's name; here it illustrates a kind, and the
 *  row it came from is not where the door leads. Giving it the
 *  row's label would make the button announce itself as "Stacer
 *  4.29 Proline — Boats — 810 variants", which names a boat this
 *  door does not open. The button's own words are its name. */
function Shot({ img }: { img: ImageRef }): JSX.Element | null {
  const { paint, probe, at } = useImageDisplay(img.src)
  if (!paint) return null
  return (
    <img
      className="dsh-door-img"
      /* `at`, not `img.src` — the repository ships a copy of most
         of these and paints it from our own origin. The RECORD
         still holds the manufacturer's address. */
      src={at}
      alt=""
      /* the box is reserved before the bytes arrive, so a picture
         landing late never reflows the card under a reader */
      width={240}
      height={120}
      loading={probe ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => noteImageLoaded(img.src)}
      onError={() => noteImageFailed(img.src)}
    />
  )
}

/* ---------------------------------------------------------- */
/* Activity                                                   */
/* ---------------------------------------------------------- */

/** WHAT CHANGED, ANYWHERE, AND WHO CHANGED IT.
 *
 *  The rows come from `features/activity`, which listens to the
 *  note bus rather than being called by the acts it records — so
 *  this card cannot miss a change that raised a toast and cannot
 *  invent one that did not. See `activity.ts`.
 *
 *  IT IS NOT SCOPED TO THIS PERSON. "Who did it" is the whole
 *  reason a shared dealership machine wants a log, and a log
 *  filtered to me answers a question I already know the answer
 *  to. The name is on every row.
 *
 *  ITS EMPTY STATE OFFERS NOTHING, deliberately, and it is the
 *  only card on this dashboard that does. There is no act that
 *  makes activity happen: it fills as the business is used, and a
 *  button here would have to point at something unrelated. */
function Activity({ orgSlug }: { orgSlug: string }): JSX.Element {
  const rows = useActivity(orgSlug)
  if (rows.length === 0) return <Nothing id="activity" />

  /* NO LIMIT AND NO "SEE ALL" LINK. The store keeps a fortnight of
     heavy use and hands back the lot; the card scrolls. A link
     under a truncated log would have to point at a page that does
     not exist, and inventing one to justify the link is how a
     dashboard grows a screen nobody asked for. */
  return <ActivityList orgSlug={orgSlug} />
}

/* ---------------------------------------------------------- */
/* The price file                                             */
/* ---------------------------------------------------------- */

const BIG_ROWS = 8

function ThePriceFile({ acts }: { acts: DashboardActs }): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const tally = useMemo(() => fileTally(entities, rowsByEntity), [entities, rowsByEntity])
  const big = useMemo(
    () => biggestTables(entities, rowsByEntity, BIG_ROWS),
    [entities, rowsByEntity],
  )

  if (tally.tables === 0) {
    return (
      <Nothing id="the-price-file" act="Data model" onAct={acts.onOpenDataModel} />
    )
  }

  /* ONE FIGURE, AND IT USED TO BE THREE. "24 tables" and "27
     relationships" beside it were the counted strip PHASE_TWO §1
     names and kills: nobody selling a boat needs to know how many
     tables are in use, and three big figures in the strongest
     position on a card say the app is proud of its schema. The
     count that survives is the one a salesperson reads — how much
     stock there is to sell from — and the tables are still
     counted, one per row, on the thing each count belongs to. */
  return (
    <>
      <div className="dsh-figures">
        <Figure n={tally.rows} say="rows you sell from" lead />
      </div>
      <div className="dsh-list">
        {big.map((t) => (
          <Row
            key={t.entity.id}
            title={t.entity.name}
            kind={kindOf(t.entity.kind)}
            tail={<span className="dsh-sum ds-mono">{t.rows.toLocaleString()}</span>}
            label={`Open ${t.entity.name}`}
            onPick={() => acts.onOpenTable(t.entity.id)}
          />
        ))}
      </div>
      <More say="The drawing" onPick={acts.onOpenDataModel} />
    </>
  )
}

/* ---------------------------------------------------------- */
/* Worth fixing                                               */
/* ---------------------------------------------------------- */

const FINDING_ROWS = 3

function WorthFixing({ acts }: { acts: DashboardActs }): JSX.Element {
  const entities = useProjectStore((s) => s.entities)
  const findings = useLintFindings()
  const roll = useMemo(() => rollFindings(findings, FINDING_ROWS), [findings])

  if (findings.length === 0) {
    return <Nothing id="data-quality" />
  }

  return (
    <>
      <div className="dsh-figures">
        {roll.blockers > 0 ? (
          <Figure n={roll.blockers} say={roll.blockers === 1 ? 'blocker' : 'blockers'} lead />
        ) : null}
        <Figure
          n={roll.advisories}
          say={roll.advisories === 1 ? 'advisory' : 'advisories'}
          lead={roll.blockers === 0}
        />
      </div>
      {/* THE TABLE IS THE TITLE AND THE FINDING IS THE LABEL, in
          that order, for two reasons. It is the order a person
          acts in — you go to a table and fix a thing in it, not
          the other way round. And `LintFinding.title` arrives from
          the engine already upper-case ('DUPLICATE FIELD NAME');
          §2 rule 3 allows uppercase as a LABEL and never as a
          name, so it belongs on the metadata line beside what it
          describes, not standing in for the row's name. Neither
          string is re-cased here — re-casing somebody's data is
          the lossy act the rule is about. */}
      <div className="dsh-list">
        {roll.head.map((f) => (
          <Row
            key={f.id}
            title={entities[f.entityId]?.name ?? 'A table since removed'}
            under={
              <>
                <span
                  className={`dsh-dot${f.severity === 'blocker' ? ' is-blocker' : ' is-advisory'}`}
                  aria-hidden="true"
                />
                <span className="dsh-when">{f.title}</span>
              </>
            }
            label={`Open ${entities[f.entityId]?.name ?? 'the table'} — ${f.title}`}
            onPick={() => acts.onOpenTable(f.entityId)}
          />
        ))}
      </div>
    </>
  )
}

/* ---------------------------------------------------------- */
/* Rules that warn                                            */
/* ---------------------------------------------------------- */

const RULE_ROWS = 3

function RulesThatWarn({ acts }: { acts: DashboardActs }): JSX.Element {
  const constraints = useConstraints()
  const roll = useMemo(() => rollRules(constraints), [constraints])

  if (roll.enabled === 0) {
    return (
      <Nothing
        id="rules-warning"
        state="No rules yet"
        say="A rule is a sentence about what must always be true."
        act="Business rules"
        onAct={acts.onOpenRules}
      />
    )
  }

  if (roll.warning.length === 0) {
    return <Nothing id="rules-warning" act="Business rules" onAct={acts.onOpenRules} />
  }

  return (
    <>
      <div className="dsh-figures">
        <Figure n={roll.warning.length} say="warn rather than remove" lead />
        <Figure n={roll.enabled} say="rules switched on" />
      </div>
      <div className="dsh-list">
        {roll.warning.slice(0, RULE_ROWS).map((c) => (
          <Row
            key={c.id}
            title={c.because}
            under={<span className="dsh-when">Annotates the row; removes nothing</span>}
            label={`Open business rules — ${c.because}`}
            onPick={acts.onOpenRules}
          />
        ))}
      </div>
      <More say="All business rules" onPick={acts.onOpenRules} />
    </>
  )
}

/* ---------------------------------------------------------- */
/* The switch                                                 */
/* ---------------------------------------------------------- */

export interface CardBodyProps {
  id: CardId
  /** the signed-in person's name, as it is frozen onto a quote */
  me: string
  /** who is looking. The tile order on the modules card is this
   *  person's own preference rather than the business's, so the
   *  card needs the same pair the arrangement is keyed by. */
  userId: string
  /** whose business this is. The activity log is kept per
   *  organisation, so a card that reads it needs to be told which
   *  one rather than reaching for the session itself — the same
   *  reason every other derivation in this feature takes its
   *  inputs as arguments. */
  orgSlug: string
  acts: DashboardActs
}

export function CardBody({ id, me, userId, orgSlug, acts }: CardBodyProps): JSX.Element {
  switch (id) {
    case 'my-quotes':
      return <Quotes me={me} acts={acts} />
    case 'recently-opened':
      return <RecentlyOpened acts={acts} />
    case 'my-modules':
      return <MyModules acts={acts} who={{ userId, orgSlug }} />
    case 'what-we-sell':
      return <WhatWeSell acts={acts} />
    case 'activity':
      return <Activity orgSlug={orgSlug} />
    case 'the-price-file':
      return <ThePriceFile acts={acts} />
    case 'data-quality':
      return <WorthFixing acts={acts} />
    case 'rules-warning':
      return <RulesThatWarn acts={acts} />
  }
}
