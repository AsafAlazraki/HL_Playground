/* ============================================================
   THE DASHBOARD — the organisation, and the places in it.

   A module is a place in your business, so this is the list of
   places: one card each, in `order`. The card carries the four
   facts a person needs before clicking — what it is called, what
   is in it, how much of it there is, and what may be DONE in there.

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
   restricted says nothing at all about access: five cards stamped
   "open to everyone" would be five decisions nobody made. Where a
   dealer HAS turned access on, the fact belongs beside the verbs,
   because it is the same sentence — what may be done here, and by
   how many of the jobs you have named. It is one chip. The dashboard
   is a list of places, not an admin console; the roles themselves
   are set on the module's own settings surface.

   THE DOOR TO THAT SURFACE IS ON THE CARD, and it is a SIBLING of
   the card, never a child: a card IS a button, and a button inside a
   button is not a thing a browser will draw. The slot around them is
   what positions it.

   CAPABILITIES ARE DRAWN AS WORDS, NOT ICONS, and read straight
   out of MODULE_CAPABILITIES. Nobody guesses a glyph, and a verb
   is the one thing on this card that is not obvious from the name:
   "Boats · browse · search · open one" is a place you may look at,
   and the day somebody switches editing on, the card says so
   without anything here changing.

   THE EMPTY STATE COUNTS THE TABLES THAT ALREADY EXIST. An admin
   arriving here has drawn 21 tables and loaded 651 rows; a blank
   screen saying "nothing here" would read as though the app had
   lost them. It says how many there are and offers the one button.
   ============================================================ */

import type { CSSProperties, ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { CaretLeft, CaretRight, Gear, Lock, Plus } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar, type EntityDef, type ImageRef, type ModuleDef } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
/* THE ONE ANSWER ABOUT WHETHER A PICTURE MAY BE PAINTED. A module's
   logo is an address like every other picture in the app, and this is
   the module that decides — per host, once — whether an address may
   be requested at all. A second uploader or a second verdict here
   would be a second chance to print a broken glyph. */
import { noteImageFailed, noteImageLoaded, useImageDisplay } from '@/lib/imageSources'
import { ICON_SIZE } from '@/lib/icons'
import {
  accessReading,
  censusLine,
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

export function Dashboard({ onOpen, onNew, onSettings }: DashboardProps): ReactElement {
  const org = useProjectStore((s) => s.meta.org)
  const projectName = useProjectStore((s) => s.meta.name)
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const modules = useProjectStore((s) => s.modules)

  const updateModule = useProjectStore((s) => s.updateModule)

  const name = org?.name || projectName
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

  const newButton = (
    <button
      type="button"
      className="btn btn-primary md-new"
      onClick={onNew}
      disabled={!canMakeModule}
      /* the sentence beneath carries the reason for everyone; this
         carries it for a reader who lands on the control itself */
      aria-describedby={canMakeModule ? undefined : 'md-empty-why'}
    >
      <Plus size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
      New module
    </button>
  )

  return (
    <div className="md-dash">
      {/* THE PAGE IS TWO COLUMNS WHERE THERE IS ROOM FOR TWO, and one
          where there is not — see `.md-dash-page` in modules.css.

          WHY THE HEADER MOVED INTO A RAIL. The organisation's name, the
          count beneath it and the two things you may do to this page —
          make a module, put the cards in an order — were a full-width
          banner over a 1080px column of cards, which on a 2560px window
          left half the screen empty and still gave the cards three
          columns. They are one narrow group of related facts, so they
          take a narrow column suited to their content and the cards
          take the rest. Nothing here is stretched to fill: the rail
          stops at 340px however wide the window gets. */}
      <div className="md-dash-page">
        <div className="md-dash-rail">
          <header className="md-dash-head">
            <div className="md-dash-id">
              <span className="mono-label md-dash-eyebrow">Organisation</span>
              <h1 className="md-dash-org">{name}</h1>
              {/* WHAT THIS PAGE IS A LIST OF, counted off the store. The
                  banner said the organisation's name and nothing else;
                  in a column the size of this one there is room for the
                  one fact that tells an admin the sheet is all still
                  here, and it is the same figure the empty state prints
                  when there are no modules at all. */}
              {cards.length > 0 ? (
                <p className="md-dash-line mono-label">
                  {cards.length} {cards.length === 1 ? 'module' : 'modules'} · {tableCount}{' '}
                  {tableCount === 1 ? 'table' : 'tables'}
                </p>
              ) : null}
            </div>
          </header>
          {cards.length > 0 ? newButton : null}

          {/* ARRANGING THEM, AND WHY IT IS A ROW AND NOT A DASHED BOX.
              This was a disabled stub reading "Dragging them into your
              own order arrives with the module designer" — a promise
              made to a surface that has since become the settings
              page, which does not order the dashboard either. The
              order is one integer per module and the dashboard already
              reads it, so the honest answer was to build the two
              arrows rather than to re-word the excuse.

              IT SITS WITH THE OTHER THING YOU MAY DO TO THIS PAGE. It
              was a rule and a sentence stranded under the last row of
              cards, which on a nine-card grid is a long way from the
              control that puts you in the mode. */}
          {cards.length > 0 ? (
            <div className="md-dash-order">
              <button
                type="button"
                className={`btn${ordering ? ' is-on' : ''}`}
                aria-pressed={ordering}
                /* ONE MODULE CANNOT BE ARRANGED, and the sentence beside
                   this says so rather than leaving a dead control. */
                aria-disabled={cards.length < 2 ? true : undefined}
                onClick={() => {
                  if (cards.length < 2) return
                  setOrdering((v) => !v)
                }}
              >
                {ordering ? 'Done' : 'Reorder cards'}
              </button>
              <p className="md-stub-say">
                {cards.length < 2
                  ? 'There is one module, so there is no order to put it in yet.'
                  : ordering
                    ? 'Move a card earlier or later. The order is part of this sheet, so everybody who opens it sees the same one.'
                    : 'Cards sit in the order you put them in. This is where you change it.'}
              </p>
            </div>
          ) : null}
        </div>

        <div className="md-dash-main">
      {cards.length === 0 ? (
        <div className="md-empty">
          <span className="mono-label md-empty-eyebrow">Nothing here yet</span>
          <p className="md-empty-say">
            A module is a place in your business — the boats you sell, the trailers, the
            quotes you have raised. You pick the table it is about and give it a name.
          </p>
          {/* THE COUNT IS READ FROM THE STORE. It is the sentence that
              tells an admin the app still has everything they loaded. */}
          <p className="md-empty-count">
            You have{' '}
            <strong>
              {tableCount} {tableCount === 1 ? 'table' : 'tables'}
            </strong>{' '}
            and no modules.
          </p>
          {newButton}
          {/* THE REFUSAL, WHERE THE THING IS REFUSED, and it names the
              step that does work from here. Zero tables is the only
              state in which this page cannot be got out of on its own. */}
          {canMakeModule ? null : (
            <p className="md-empty-why" id="md-empty-why">
              A module is about a table, and there are none yet. Start one from{' '}
              <em>New table</em> on the bar, or load your price file from <em>Home</em>.
            </p>
          )}
        </div>
      ) : (
          <ul className="md-cards">
            {cards.map((m, i) => (
              <Card
                key={m.id}
                module={m}
                /* THE CARD COUNTS WHAT THE PAGE WILL DRAW. Discontinued
                   rows and retired tables are held back by the index, so
                   they are held back here too — a card reading 40 over a
                   page drawing 39 is exactly the disagreement `read.ts`
                   exists to prevent.

                   AND IT COUNTS MORE THAN ROWS NOW. "2,937 products" is
                   a fact; "2,238 products across 179 categories · 699 no
                   longer sold" is a picture of the place, and every
                   figure in it was already on the sheet. One reader, so
                   a card and the page it opens cannot disagree. */
                census={moduleCensus(m, entities, rowsByEntity)}
                master={moduleTables(m, entities)[0]}
                tableCount={m.tableIds.length}
                onOpen={onOpen}
                onSettings={onSettings}
                /* ARRANGING IS A MODE, NOT A THIRD CONTROL ON EVERY
                   CARD. A gear, an earlier and a later on all fifteen
                   is three controls a person has to read past to find
                   the one they came for; the arrows are drawn only
                   while somebody is arranging. */
                ordering={ordering}
                first={i === 0}
                last={i === cards.length - 1}
                onMove={move}
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
}

const grouped = (n: number): string => n.toLocaleString('en-AU')

function Card({
  module,
  census,
  master,
  tableCount,
  onOpen,
  onSettings,
  ordering,
  first,
  last,
  onMove,
}: CardProps): ReactElement {
  const line = censusLine(census)
  /* The tenth verb, which does not live on `ModuleDef` yet. Read here
     rather than passed in, so the dashboard's own list stays four
     facts about a module and does not grow a fifth prop that
     disappears the day the contract carries it. */
  const configures = useModuleConfiguresRules(module.id)
  /* Absent access reads as unrestricted and this is all zeroes and
     empty strings, which is what every module in the project is
     today: the card then says nothing whatever about access. */
  const access: AccessReading = accessReading(module)
  const style = { '--md-accent': accentVar(module.accent) } as CSSProperties

  /* THE ACCESSIBLE NAME CARRIES THE RESTRICTION, because the chip
     that carries it visually is two words inside a row of nine other
     words, and a reader arriving on the card itself would otherwise
     hear the verbs without the qualification on them. */
  const label = access.restricted
    ? `Open ${module.name} — ${line}. ${access.hint}`
    : `Open ${module.name} — ${line}`

  return (
    /* THE SLOT, not the card. Two controls stand here — the card
       itself and the door to its settings — and a button inside a
       button is invalid HTML that a browser resolves by dropping one
       of them. The slot is what positions the second. */
    <li className="md-card-slot">
      <button
        type="button"
        className="md-card"
        style={style}
        /* NAMED EXPLICITLY. The card is a mark, a name, a sentence, a
           count, a provenance line, two figures and a row of verbs —
           and a reader announcing them run together is not a name. */
        aria-label={label}
        onClick={() => onOpen(module.id)}
      >
        {/* THE MARK AND THE NAME ARE ONE ROW, NOT TWO.

            They were stacked: a 22px glyph alone on a line, then the
            name on the next. A row whose only occupant is a glyph is
            28px of card height carrying one fact, and it left the
            module's name — the thing a person is actually scanning
            for — starting a third of the way down. They are the same
            fact about the place and they read as one thing beside
            each other. The plate is a well rather than a bare glyph
            so a dealer's own logo and a kind symbol occupy the same
            square, and a card with a mark is the same height as a
            card without. */}
        <span className="md-card-head">
          <span className="md-card-plate">
            <span className="md-card-mark">
              <CardMark logo={module.logo} name={module.name} master={master} />
            </span>
          </span>
          <span className="md-card-name">{module.name}</span>
        </span>

        {module.description === '' ? null : (
          <span className="md-card-desc">{module.description}</span>
        )}

        {/* THE COUNT SAYS WHAT IT LEFT OUT, AND WHAT IT IS MADE OF.
            Six fewer than the sheet holds is a question a person asks
            once and then stops trusting the number. A bare total is
            the other half of the same problem: "2,937 products" is
            true and tells nobody whether that is a library they could
            ever navigate. `censusLine` says the shape — how many, in
            the dealer's own noun, under how many of their own
            headings, and what is held back — and every clause is
            present exactly when it is true.

            IT SITS UNDER THE NAME NOW, where the module's own page
            puts it. It shared the top line with the mark until this
            pass, in half a 260px card, where "2,238 products across
            179 categories · 699 no longer sold" is four wrapped lines
            beside a 22px glyph — and the top-right corner it was
            crowding is where the door to this module's settings had
            to go. */}
        <span className="md-card-count mono-label">{line}</span>

        {/* WHERE IT COMES FROM, but only when that says something the
            name does not. A module made from one table and left with
            the table's own name would otherwise print that name twice,
            a line apart, which reads as a rendering fault. */}
        {!master ? (
          <span className="md-card-from mono-label">
            its table is no longer on the sheet
          </span>
        ) : tableCount > 1 ? (
          <span className="md-card-from mono-label">
            {master.name} + {tableCount - 1} more
          </span>
        ) : master.name === module.name ? null : (
          <span className="md-card-from mono-label">{master.name}</span>
        )}

        {/* WHAT THE PLACE IS READY FOR — two figures off the same
            census the count line came from, and neither is printed
            unless it is true of at least one row. A catalogue where
            723 of 810 carry a photograph is a catalogue somebody can
            shop; the same 810 with none is a spreadsheet, and that is
            a different day's work. Price is the same question asked
            on behalf of a quote.

            A module holding neither draws neither, which is the whole
            rule: a figure that would be a zero is a row of chrome
            saying nothing. */}
        {census.pictured > 0 || census.priced > 0 ? (
          <span className="md-card-stats">
            {census.pictured > 0 ? (
              <span className="md-card-stat">
                <b>{grouped(census.pictured)}</b> with a photo
              </span>
            ) : null}
            {census.priced > 0 ? (
              <span className="md-card-stat">
                <b>{grouped(census.priced)}</b> priced
              </span>
            ) : null}
          </span>
        ) : null}

        {/* THE VERBS, AS WORDS. Read through `capabilityWords`, which
            iterates the contract's own labels — so a capability added
            there appears here without this file changing, nothing has
            to invent a name for one, and the card says the same list
            the module's index says. That last part is why this is not
            `module.capabilities.map` any more: one verb is held
            outside the type until the contract carries it, and a card
            that quietly omitted it would promise less than the place
            it opens onto.

            AND WHO MAY USE THEM, where a dealer has said. The chip is
            last in the row because it qualifies everything before it,
            and it is drawn only where `access` is present: absent is
            unrestricted, and unrestricted is not a fact worth a chip
            on every card in the list. */}
        <span className="md-card-verbs">
          {capabilityWords(module, configures).map((word) => (
            <span className="md-verb mono-label" key={word}>
              {word}
            </span>
          ))}
          {access.restricted ? (
            <span className="md-verb md-verb-shut" title={access.hint}>
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
          fifteen times down a list. */}
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
function CardMark({ logo, name, master }: CardMarkProps): ReactElement {
  /* the hook runs on every render — a module with no logo asks about
     the empty address and is told, cheaply, no */
  const { paint, probe, at } = useImageDisplay(logo?.src ?? '')
  if (logo && paint) {
    const alt = logo.alt?.trim() ?? ''
    return (
      <img
        className="md-card-logo"
        /* the address on the record stays the record's; `at` is only
           where the pixels are fetched from */
        src={at}
        alt={alt === name ? '' : alt}
        /* THE BOX IS THE STYLESHEET'S — `.md-card-logo` is a fixed
           24px square with `object-fit: contain`, so a tall mark and a
           wide one occupy the same space and a card with a logo is the
           same height as a card without. These declare the same square
           so the space is reserved before the bytes land: a logo
           arriving late must never move the name under it. */
        width={24}
        height={24}
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
  return <TableKindSymbol kind={kindOf(master?.kind)} size={ICON_SIZE.medium} />
}
