/* ============================================================
   THE DASHBOARD — the organisation, and the places in it.

   A module is a place in your business, so this is the list of
   places: one card each, in `order`. The card carries the four
   facts a person needs before clicking — what it is called, what
   is in it, how much of it there is, and what may be DONE in there.

   ── WHAT THIS PASS CHANGED, AND WHY ──────────────────────────

   THE PAGE HAD NO FIGURE OF ITS OWN. Nine cards each said what
   they held and nothing said what the business held, so the one
   question the LIST answers — how much of this place is set up,
   and what is not in a place yet — was not on the screen. The
   masthead is four counted figures over the UNION of the modules'
   tables, so two modules sharing a table are one table and one set
   of rows, never two.

   EVERY CARD NOW HAS A PLATE, and where the module's own table
   holds a photograph, the photograph IS the plate. 220 real
   photographs ship with this app and the largest any of them was
   ever drawn on this screen was nothing at all. `coverPhoto`
   refuses every address we do not hold a local copy of, so a plate
   is a photograph or it is the module's own mark on its own kind
   tint — never a substitute, never a broken box. Both forms are
   the same height, so a row of mixed cards is still a row.

   THE VERBS STOPPED BEING TEN BORDERED PILLS. They are the same
   words, off the same `capabilityWords`, set as one quiet line.
   Nine cards were carrying up to ninety outlined boxes, which is
   the clutter the rest of this pass exists to remove.

   TWO CONTROL ZONES BECAME ONE. "New module" sat in the header and
   "Reorder cards" sat in a bordered band under the grid with a
   sentence that was on screen whether or not anybody was
   arranging. Both controls now stand together above the grid, and
   the sentence is drawn only when it says something: while you are
   arranging, or when there is only one card and the control has to
   refuse.

   THE CARD WEARS THE DEALER'S OWN MARK WHERE THERE IS ONE.
   `ModuleDef.logo` is an `ImageRef` like every other picture in this
   app, so it goes through `useImageDisplay` like every other picture
   in this app: one host verdict, one copy resolver, one answer about
   whether a thing may be painted. A logo that cannot be drawn — no
   logo, an unreachable host, a refused scheme — falls back to the
   kind symbol in the module's accent, which is what every module
   looks like today and must keep looking like.

   AND IT IS HONEST ABOUT A RESTRICTED PLACE. `ModuleDef.access`
   absent means unrestricted, so a card whose module nobody has
   restricted says nothing at all about access: nine cards stamped
   "open to everyone" would be nine decisions nobody made. Where a
   dealer HAS turned access on, the fact belongs beside the verbs,
   because it is the same sentence — what may be done here, and by
   how many of the jobs you have named. It is one chip. The dashboard
   is a list of places, not an admin console; the roles themselves
   are set on the module's own settings surface.

   THE DOOR TO THAT SURFACE IS ON THE CARD, and it is a SIBLING of
   the card, never a child: a card IS a button, and a button inside a
   button is not a thing a browser will draw. The slot around them is
   what positions it.

   THE EMPTY STATE COUNTS THE TABLES THAT ALREADY EXIST. An admin
   arriving here has drawn 21 tables and loaded 651 rows; a blank
   screen saying "nothing here" would read as though the app had
   lost them. It says how many there are and offers the one button.
   ============================================================ */

import type { CSSProperties, ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { CaretLeft, CaretRight, Gear, Lock, Plus } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  accentVar,
  canBeModuleMaster,
  isRetired,
  type EntityDef,
  type ImageRef,
  type ModuleDef,
} from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
/* THE ONE ANSWER ABOUT WHETHER A PICTURE MAY BE PAINTED. A module's
   logo is an address like every other picture in the app, and this is
   the module that decides — per host, once — whether an address may
   be requested at all. A second uploader or a second verdict here
   would be a second chance to print a broken glyph. */
import { noteImageFailed, noteImageLoaded, useImageDisplay } from '@/lib/imageSources'
/* THE SAME PICTURE RESOLVER THE FRONT DOOR USES. It answers only for
   addresses this repository ships a copy of, and returns null rather
   than substituting anything — so a plate is a real photograph of the
   dealer's own stock or it is not a photograph at all. */
import { coverPhoto, type CoverPhoto } from '@/features/table/coverPhoto'
import { ICON_SIZE } from '@/lib/icons'
import {
  accessReading,
  buildEntries,
  censusLine,
  censusQualifier,
  listedTables,
  moduleCensus,
  moduleTables,
  type AccessReading,
  type ModuleCensus,
} from './read'
import { capabilityWords, reorderPlan } from './designer'
import { useModuleConfiguresRules } from './ruleCapability'
import './modules.css'

export interface DashboardProps {
  /** open a module */
  onOpen: (moduleId: string) => void
  /** put the create panel up */
  onNew: () => void
  /**
   * Open this module's settings — who may do what here, its logo, and
   * what else is linked to it.
   *
   * ABSENT MEANS THE DOOR IS NOT DRAWN, which is the arrangement
   * `ModuleIndex.onOpenQuote` and `ViewStage.onQuote` already use: a
   * surface only the shell can route to is offered only where the
   * shell offered a route. A gear that goes nowhere is worse than no
   * gear, because it is the one control on the card that has to be
   * believed.
   */
  onSettings?: (moduleId: string) => void
}

const grouped = (n: number): string => n.toLocaleString('en-AU')

/** One counted figure in the masthead. A cell exists only where the
 *  figure is true of something: a zero is a slot of chrome saying
 *  nothing, and this page has nine cards' worth of facts already. */
interface TallyCell {
  term: string
  figure: number
}

export function Dashboard({ onOpen, onNew, onSettings }: DashboardProps): ReactElement {
  const org = useProjectStore((s) => s.meta.org)
  const projectName = useProjectStore((s) => s.meta.name)
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const modules = useProjectStore((s) => s.modules)

  const updateModule = useProjectStore((s) => s.updateModule)

  /* THE BUSINESS'S NAME WHERE WE HAVE IT, AND THE SHEET'S OTHERWISE —
     and the eyebrow says which. `meta.org` is written at onboarding
     and is absent on a sheet that arrived some other way, where the
     only name we hold is the document's. Calling a document "your
     business" at the hero step is a small lie told in the largest
     type on the page, so the caption changes with the fact. */
  const business = org?.name?.trim() ?? ''
  const name = business === '' ? projectName : business
  const tableCount = Object.keys(entities).length

  /* ARE WE ARRANGING? A position on this page and nothing else — which
     card sits where IS a fact about the business and is stored, but
     whether somebody is currently moving them is not. */
  const [ordering, setOrdering] = useState(false)

  /* `order` is the field, ascending; two modules made in the same
     millisecond fall back to their name so the list never shuffles
     between renders. */
  const cards = useMemo(
    () =>
      Object.values(modules).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [modules],
  )

  /* ONE READ PER CARD, ONCE. The census and the photograph were both
     resolved inline in the render, so every keystroke anywhere in the
     shell re-counted 15,691 rows nine times over. The census reader is
     the same one the module's own page uses, so a card and the page it
     opens can never disagree. */
  const deck = useMemo(
    () =>
      cards.map((module) => {
        const master = moduleTables(module, entities)[0]
        return {
          module,
          master,
          census: moduleCensus(module, entities, rowsByEntity),
          /* THE PLATE. A photograph of this place's own stock where we
             hold one, resolved off the primary table exactly as the
             front door resolves a table's — and null, never a
             substitute, where we do not. */
          cover: master ? coverPhoto(master, rowsByEntity[master.id]) : null,
        }
      }),
    [cards, entities, rowsByEntity],
  )

  /* ============================================================
     WHAT THE PLACES ADD UP TO, COUNTED OVER THE UNION.

     NOT THE SUM OF THE CARDS. Two modules may list the same table —
     a Boats module and a Factory Packages module both reach for the
     hulls — and adding their counts would report stock this business
     does not have. The union of the LISTED tables is built first and
     counted once, by the same `buildEntries` the cards count through.

     AND IT SAYS WHAT IS NOT IN A PLACE YET, which is the one fact on
     this page a person cannot get by reading the cards. The
     denominator is the tables that COULD be a module's — a join is a
     relationship, never a place to stand (`canBeModuleMaster`), and a
     retired table is history rather than stock — so the figure is
     never inflated by things that were never eligible.
     ============================================================ */
  const tally = useMemo((): TallyCell[] => {
    const covered = new Map<string, EntityDef>()
    for (const m of cards) for (const e of listedTables(m, entities)) covered.set(e.id, e)
    const items = buildEntries([...covered.values()], rowsByEntity, { facts: false }).length
    const placeable = Object.values(entities).filter(
      (e) => canBeModuleMaster(e) && !isRetired(e),
    ).length
    const spare = Math.max(0, placeable - covered.size)

    const cells: TallyCell[] = [
      { term: cards.length === 1 ? 'Place' : 'Places', figure: cards.length },
    ]
    if (items > 0) cells.push({ term: 'Things in them', figure: items })
    if (covered.size > 0) cells.push({ term: 'Tables in use', figure: covered.size })
    if (spare > 0) cells.push({ term: 'Not in a place yet', figure: spare })
    return cells
  }, [cards, entities, rowsByEntity])

  /* ============================================================
     THE ONE ACTION HAD TO BE POSSIBLE BEFORE IT WAS OFFERED.

     On a cleared install this page read "You have 0 tables and no
     modules" and then offered NEW MODULE — and the panel behind that
     button answers "There are no tables to make a module from yet"
     (NewModuleDialog.tsx). So the empty state's single action opened a
     second empty state, which is the fault an empty state exists to
     prevent: a next step that cannot be taken from where the person is
     standing.

     A module is ABOUT a table; with no tables there is nothing for it
     to be about. So the control is disabled and says why, in the place
     where it is refused — DESIGN_CONTRACT §6 rule 5 and §5's stub
     pattern, rather than a tooltip or a dialog that says no.
     ============================================================ */
  const canMakeModule = tableCount > 0

  /* ONE CARD, ONE PLACE. `reorderPlan` works out which of the stored
     `order` numbers have to change and writes only those, so moving
     one card past its neighbour is two records touched rather than
     fifteen — and a move that would fall off either end is an empty
     plan and no write at all. */
  const move = (id: string, dir: -1 | 1): void => {
    for (const at of reorderPlan(cards, id, dir)) updateModule(at.id, { order: at.order })
  }

  /* ONE SENTENCE SLOT, DIRECTLY UNDER THE TWO CONTROLS, AND IT IS
     EMPTY UNLESS THERE IS SOMETHING TO SAY.

     There were two of these and both were in the wrong place. The
     arranging line was on screen permanently, in a bordered band at
     the foot of the page, explaining a control nobody had pressed. The
     refusal — why "New module" is off — was inside the empty card,
     which is where the button used to be and is not where it is now; a
     reason that has drifted away from the control it is about is a
     reason nobody reads. Both live here, under the controls, and only
     while they are true. */
  const hint = !canMakeModule ? (
    <>
      A module is about a table, and there are none yet. Start one from <em>New table</em>{' '}
      on the bar, or load your price file from <em>Home</em>.
    </>
  ) : cards.length === 1 ? (
    'There is one module, so there is no order to put it in yet.'
  ) : ordering ? (
    'Move a card earlier or later. The order is part of this sheet, so everybody who opens it sees the same one.'
  ) : null

  return (
    <div className="md-dash">
      {/* THE ATMOSPHERE, AND IT CARRIES NOTHING. Two drifting washes
          under 6% alpha and a grain tile, so a page of nine cards has a
          ground rather than a void. Removed outright under
          `prefers-reduced-transparency` and `prefers-contrast: more`,
          and stilled under `prefers-reduced-motion` — see ds.css. */}
      <div className="ds-aurora ds-grain md-dash-sky" aria-hidden="true" />

      <div className="md-dash-scroll">
        <div className="md-dash-page">
          <header className="md-dash-mast">
            <div className="md-dash-say">
              <span className="mono-label md-dash-eyebrow">
                {business === '' ? 'This sheet' : 'Your business'}
              </span>
              <h1 className="ds-hero md-dash-org">{name}</h1>
              <p className="md-dash-note">
                Every place you have set up — what it holds, and what may be done in
                there. Press one to open it.
              </p>
            </div>

            <div className="md-dash-aside">
              {cards.length > 0 ? (
                <dl className="md-dash-tally">
                  {tally.map((cell) => (
                    <div className="md-dash-cell" key={cell.term}>
                      <dt>{cell.term}</dt>
                      <dd className="md-dash-fig">{grouped(cell.figure)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {/* BOTH CONTROLS, IN ONE PLACE. Arranging is a mode, so
                  its switch stands beside the action rather than in a
                  band of its own at the foot of the page. */}
              <div className="md-dash-acts">
                {cards.length > 0 ? (
                  <button
                    type="button"
                    className={`btn md-order${ordering ? ' is-on' : ''}`}
                    aria-pressed={ordering}
                    /* ONE MODULE CANNOT BE ARRANGED, and the sentence
                       beneath says so rather than leaving a dead
                       control. `aria-disabled` and a live guard, not
                       `disabled`, so it keeps its place in the tab
                       order and its name. */
                    aria-disabled={cards.length < 2 ? true : undefined}
                    onClick={() => {
                      if (cards.length < 2) return
                      setOrdering((v) => !v)
                    }}
                  >
                    {ordering ? 'Done' : 'Reorder'}
                  </button>
                ) : null}

                <button
                  type="button"
                  className="btn btn-primary md-new"
                  onClick={onNew}
                  disabled={!canMakeModule}
                  /* the sentence beneath carries the reason for
                     everyone; this carries it for a reader who lands on
                     the control itself */
                  aria-describedby={canMakeModule ? undefined : 'md-dash-why'}
                >
                  <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
                  New module
                </button>
              </div>
            </div>
          </header>

          {hint === null ? null : (
            <p className="md-dash-hint" id="md-dash-why">
              {hint}
            </p>
          )}

          {cards.length === 0 ? (
            <div className="md-empty">
              <span className="mono-label md-empty-eyebrow">Nothing here yet</span>
              <p className="md-empty-say">
                A module is a place in your business — the boats you sell, the trailers,
                the quotes you have raised. You pick the table it is about and give it a
                name.
              </p>
              {/* THE COUNT IS READ FROM THE STORE. It is the sentence
                  that tells an admin the app still has everything they
                  loaded. */}
              <p className="md-empty-count">
                You have{' '}
                <strong>
                  {tableCount} {tableCount === 1 ? 'table' : 'tables'}
                </strong>{' '}
                and no modules.
              </p>
            </div>
          ) : (
            <ul className="md-cards">
              {deck.map((seat, i) => (
                <Card
                  key={seat.module.id}
                  module={seat.module}
                  /* THE CARD COUNTS WHAT THE PAGE WILL DRAW.
                     Discontinued rows and retired tables are held back
                     by the index, so they are held back here too — a
                     card reading 40 over a page drawing 39 is exactly
                     the disagreement `read.ts` exists to prevent. */
                  census={seat.census}
                  master={seat.master}
                  cover={seat.cover}
                  tableCount={seat.module.tableIds.length}
                  onOpen={onOpen}
                  onSettings={onSettings}
                  /* ARRANGING IS A MODE, NOT A THIRD CONTROL ON EVERY
                     CARD. A gear, an earlier and a later on all nine is
                     three controls a person has to read past to find the
                     one they came for; the arrows are drawn only while
                     somebody is arranging. */
                  ordering={ordering}
                  first={i === 0}
                  last={i === deck.length - 1}
                  onMove={move}
                  index={i}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- */

interface CardProps {
  module: ModuleDef
  /** what is in this place, counted: how many, the dealer's own word
   *  for one of them, how many of their own headings they fall under,
   *  and how many are held back because they are no longer sold.
   *  Stated on the card rather than subtracted in silence — the
   *  count on its own is what makes somebody think rows were lost. */
  census: ModuleCensus
  /** the primary table — `tableIds[0]`, and the one whose kind mark
   *  the card wears when the module has no logo of its own.
   *  Undefined when it has been deleted from under the module, which
   *  the card states rather than hiding. */
  master: EntityDef | undefined
  /** a photograph of this place's own stock, or null. Never a stand-in. */
  cover: CoverPhoto | null
  tableCount: number
  onOpen: (moduleId: string) => void
  onSettings?: (moduleId: string) => void
  /** somebody is arranging the dashboard, so this card draws the two
   *  arrows that move it. Off, it draws neither. */
  ordering: boolean
  /** first and last in the drawn order — the ends of the list, where
   *  one of the two moves is refused. */
  first: boolean
  last: boolean
  onMove: (moduleId: string, dir: -1 | 1) => void
  /** position in the grid, so the entrance arrives as a wave rather
   *  than all at once. Capped in ds.css at fourteen steps. */
  index: number
}

function Card({
  module,
  census,
  master,
  cover,
  tableCount,
  onOpen,
  onSettings,
  ordering,
  first,
  last,
  onMove,
  index,
}: CardProps): ReactElement {
  const line = censusLine(census)
  const qualifier = censusQualifier(census)
  /* The tenth verb, which does not live on `ModuleDef` yet. Read here
     rather than passed in, so the dashboard's own list stays four
     facts about a module and does not grow a fifth prop that
     disappears the day the contract carries it. */
  const configures = useModuleConfiguresRules(module.id)
  /* Absent access reads as unrestricted and this is all zeroes and
     empty strings, which is what every module in the project is
     today: the card then says nothing whatever about access. */
  const access: AccessReading = accessReading(module)
  const style = {
    '--md-accent': accentVar(module.accent),
    '--i': index,
  } as CSSProperties

  /* THE ACCESSIBLE NAME CARRIES THE RESTRICTION, because the chip
     that carries it visually is two words inside a row of nine other
     words, and a reader arriving on the card itself would otherwise
     hear the verbs without the qualification on them. */
  const label = access.restricted
    ? `Open ${module.name} — ${line}. ${access.hint}`
    : `Open ${module.name} — ${line}`

  /* WHERE IT COMES FROM, but only when that says something the name
     does not. A module made from one table and left with the table's
     own name would otherwise print that name twice, a line apart,
     which reads as a rendering fault. */
  const from = !master
    ? 'its table is no longer on the sheet'
    : tableCount > 1
      ? `${master.name} + ${tableCount - 1} more`
      : master.name === module.name
        ? ''
        : master.name

  return (
    /* THE SLOT, not the card. Two controls stand here — the card
       itself and the door to its settings — and a button inside a
       button is invalid HTML that a browser resolves by dropping one
       of them. The slot is what positions the second. */
    <li className="md-card-slot">
      <button
        type="button"
        className={`md-card ds-sheen ds-rise${cover ? ' md-card--shot' : ''}`}
        style={style}
        /* NAMED EXPLICITLY. The card is a plate, a name, a sentence, a
           figure and a line of verbs — and a reader announcing them run
           together is not a name. */
        aria-label={label}
        onClick={() => onOpen(module.id)}
      >
        {/* THE PLATE — the photograph where we hold one, and the
            module's own mark on its own kind tint where we do not.
            Both are the same height, so a row of mixed cards is still a
            row, and nothing is ever substituted for the picture a table
            does not have. */}
        <span className="md-card-plate">
          {cover ? (
            <img
              className="md-card-shot"
              src={cover.at}
              alt=""
              width={cover.w}
              height={cover.h}
              /* THE FIRST ROW IS NOT LAZY. This is a landing surface
                 and four plates are above the fold at every width the
                 grid resolves to; deferring those is a page that
                 assembles itself while somebody watches. The rest wait
                 until they are scrolled to. */
              loading={index < 4 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
            />
          ) : null}
          <span className="md-card-mark">
            <CardMark
              logo={module.logo}
              name={module.name}
              master={master}
              big={cover === null}
            />
          </span>
        </span>

        <span className="md-card-head">
          <span className="md-card-name">{module.name}</span>
          {from === '' ? null : <span className="md-card-from">{from}</span>}
        </span>

        {module.description === '' ? null : (
          <span className="md-card-desc">{module.description}</span>
        )}

        {/* THE FIGURE, AND THEN WHAT THE FIGURE LEFT OUT. Six fewer
            than the sheet holds is a question a person asks once and
            then stops trusting the number; a bare total is the other
            half of the same problem, because "2,860 accessories" is
            true and tells nobody whether that is a library anyone could
            navigate. The count leads because it is what the card is
            scanned for, and the clauses that qualify it sit a step
            below — each one present exactly when it is true. */}
        <span className="md-card-count">
          <b>{grouped(census.items)}</b>
          <span>{census.noun}</span>
        </span>
        {qualifier === '' ? null : (
          <span className="md-card-qual">{qualifier}</span>
        )}

        {/* THE VERBS, AS WORDS AND AS ONE LINE. Read through
            `capabilityWords`, which iterates the contract's own labels —
            so a capability added there appears here without this file
            changing, nothing has to invent a name for one, and the card
            says the same list the module's index says. That last part
            is why this is not `module.capabilities.map`: one verb is
            held outside the type until the contract carries it, and a
            card that quietly omitted it would promise less than the
            place it opens onto.

            THEY WERE TEN BORDERED PILLS. Same words, same source, one
            line — because a row of outlined boxes across nine cards is
            ninety boxes, and none of them was ever pressable.

            AND WHO MAY USE THEM, where a dealer has said. The chip is
            last because it qualifies everything before it, and it is
            drawn only where `access` is present: absent is
            unrestricted, and unrestricted is not a fact worth a chip on
            every card in the list. */}
        <span className="md-card-verbs">
          <span className="md-card-can">
            {capabilityWords(module, configures).join(' · ')}
          </span>
          {access.restricted ? (
            <span className="md-verb-shut" title={access.hint}>
              <Lock size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
              {access.say}
            </span>
          ) : null}
        </span>
      </button>

      {/* THE DOOR TO THIS MODULE'S SETTINGS. Always drawn where the
          host gave it somewhere to go — never revealed on hover,
          because a control that appears only once the pointer is
          already on top of it cannot be found by somebody looking for
          it, and cannot be found at all on a touch screen. Quiet at
          rest, and it names the module rather than saying "Settings"
          nine times down a list. */}
      {ordering ? (
        /* THE TWO MOVES, IN THE CORNER THE GEAR WAS IN — one control
           in one place, because a card that grew a third would be
           three things to read past to reach the one you came for.
           "Earlier" and "later" rather than left and right: the cards
           reflow from three columns to four with the window, so a
           left arrow that moved a card UP a row on a narrow screen
           would be naming the wrong thing.

           THE END OF THE LIST REFUSES ITS OWN MOVE. `aria-disabled`
           and a live guard, not `disabled`, so the control keeps its
           place in the tab order and its name — the same shape the
           bar's refusals take. */
        <span className="md-card-order">
          <button
            type="button"
            className="md-card-move"
            aria-label={`Move ${module.name} earlier`}
            title={first ? `${module.name} is already first` : `Move ${module.name} earlier`}
            aria-disabled={first || undefined}
            onClick={() => {
              if (!first) onMove(module.id, -1)
            }}
          >
            <CaretLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="md-card-move"
            aria-label={`Move ${module.name} later`}
            title={last ? `${module.name} is already last` : `Move ${module.name} later`}
            aria-disabled={last || undefined}
            onClick={() => {
              if (!last) onMove(module.id, 1)
            }}
          >
            <CaretRight size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          </button>
        </span>
      ) : onSettings ? (
        <button
          type="button"
          className="md-card-door"
          aria-label={`Settings for ${module.name}`}
          title={`Settings for ${module.name}`}
          onClick={() => onSettings(module.id)}
        >
          <Gear size={ICON_SIZE.small} weight="light" aria-hidden="true" />
        </button>
      ) : null}
    </li>
  )
}

/* ---------------------------------------------------------- */

interface CardMarkProps {
  logo: ImageRef | undefined
  name: string
  master: EntityDef | undefined
  /** the plate is the mark's own, rather than a photograph's corner,
   *  so it is drawn at the size an empty plate deserves */
  big: boolean
}

/** THE DEALER'S OWN MARK, OR THE KIND'S.
 *
 *  `useImageDisplay` is the app's one answer to "may this address be
 *  painted here" — it holds the per-host verdict, resolves an address
 *  we ship a copy of to that copy, and returns `paint: false` for
 *  everything it will not request. A logo that cannot be drawn is
 *  therefore not a broken glyph and not an empty box: the card falls
 *  back to the kind symbol in the module's accent, which is exactly
 *  what every module without a logo draws.
 *
 *  THE ALT IS EMPTY ON PURPOSE. The module's name is the next line of
 *  the same card and the card carries its own accessible name; a logo
 *  announced as "Boats" between them is the name said three times.
 *  Where the dealer typed their own alt text and it says something
 *  else, that is theirs and it is used. */
function CardMark({ logo, name, master, big }: CardMarkProps): ReactElement {
  /* the hook runs on every render — a module with no logo asks about
     the empty address and is told, cheaply, no */
  const { paint, probe, at } = useImageDisplay(logo?.src ?? '')
  const box = big ? ICON_SIZE.large : ICON_SIZE.medium
  if (logo && paint) {
    const alt = logo.alt?.trim() ?? ''
    return (
      <img
        className="md-card-logo"
        /* the address on the record stays the record's; `at` is only
           where the pixels are fetched from */
        src={at}
        alt={alt === name ? '' : alt}
        /* THE BOX IS DECLARED IN BOTH PLACES — the stylesheet sizes
           `.md-card-logo` and these reserve the same square before the
           bytes land, so a logo arriving late never moves the name
           under it. `object-fit: contain`, so a tall mark and a wide
           one occupy the same space. */
        width={box}
        height={box}
        loading={probe ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={() => noteImageLoaded(logo.src)}
        onError={() => noteImageFailed(logo.src)}
      />
    )
  }
  /* THE ONE PLACE KIND MARKS ARE DRAWN is tablekit, here as
     everywhere else — the same boat, whatever screen it is on. */
  return <TableKindSymbol kind={kindOf(master?.kind)} size={box} />
}
