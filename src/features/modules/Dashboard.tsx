/* ============================================================
   THE DASHBOARD — the organisation, and the places in it.

   A module is a place in your business, so this is the list of
   places: one card each, in `order`. The card carries the four
   facts a person needs before clicking — what it is called, what
   is in it, how much of it there is, and what may be DONE in there.

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
import { useMemo } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import {
  accentVar,
  MODULE_CAPABILITIES,
  type EntityDef,
  type ModuleDef,
} from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ICON_SIZE } from '@/lib/icons'
import { moduleHeldCount, moduleRowCount, moduleTables } from './read'
import './modules.css'

export interface DashboardProps {
  /** open a module */
  onOpen: (moduleId: string) => void
  /** put the create panel up */
  onNew: () => void
}

export function Dashboard({ onOpen, onNew }: DashboardProps): ReactElement {
  const org = useProjectStore((s) => s.meta.org)
  const projectName = useProjectStore((s) => s.meta.name)
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const modules = useProjectStore((s) => s.modules)

  const name = org?.name || projectName
  const tableCount = Object.keys(entities).length

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
      <header className="md-dash-head">
        <div className="md-dash-id">
          <span className="mono-label md-dash-eyebrow">Organisation</span>
          <h1 className="md-dash-org">{name}</h1>
        </div>
        {cards.length > 0 ? newButton : null}
      </header>

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
        <>
          <ul className="md-cards">
            {cards.map((m) => (
              <Card
                key={m.id}
                module={m}
                /* THE CARD COUNTS WHAT THE PAGE WILL DRAW. Discontinued
                   rows and retired tables are held back by the index, so
                   they are held back here too — a card reading 40 over a
                   page drawing 39 is exactly the disagreement `read.ts`
                   exists to prevent. */
                rowCount={moduleRowCount(m, entities, rowsByEntity)}
                heldCount={moduleHeldCount(m, entities, rowsByEntity)}
                master={moduleTables(m, entities)[0]}
                tableCount={m.tableIds.length}
                onOpen={onOpen}
              />
            ))}
          </ul>

          {/* A VISIBLE STUB, NOT A SILENT GAP. Dragging cards into your
              own order is part of the dashboard and is not built; a
              disabled control saying so is honest, and an enabled one
              that did nothing would not be. */}
          <div className="md-stub md-dash-stub">
            <button type="button" className="btn" disabled>
              Reorder cards
            </button>
            <p className="md-stub-say">
              Cards sit in the order they were made. Dragging them into your own order
              arrives with the module designer.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- */

interface CardProps {
  module: ModuleDef
  rowCount: number
  /** rows this module holds back because they are no longer sold.
   *  Stated on the card rather than subtracted in silence — the
   *  count on its own is what makes somebody think rows were lost. */
  heldCount: number
  /** the primary table — `tableIds[0]`, and the one whose kind mark
   *  the card wears. Undefined when it has been deleted from under
   *  the module, which the card states rather than hiding. */
  master: EntityDef | undefined
  tableCount: number
  onOpen: (moduleId: string) => void
}

function Card({
  module,
  rowCount,
  heldCount,
  master,
  tableCount,
  onOpen,
}: CardProps): ReactElement {
  const style = { '--md-accent': accentVar(module.accent) } as CSSProperties
  return (
    <li>
      <button
        type="button"
        className="md-card"
        style={style}
        /* NAMED EXPLICITLY. The card is six spans — a mark, a count, a
           name, a sentence, a provenance line and a row of verbs — and
           a reader announcing them run together is not a name. */
        aria-label={
          heldCount > 0
            ? `Open ${module.name}, ${rowCount} for sale, ${heldCount} no longer sold`
            : `Open ${module.name}`
        }
        onClick={() => onOpen(module.id)}
      >
        <span className="md-card-top">
          <span className="md-card-mark">
            {/* THE ONE PLACE KIND MARKS ARE DRAWN is tablekit, here as
                everywhere else — the same boat, whatever screen it is on. */}
            <TableKindSymbol kind={kindOf(master?.kind)} size={ICON_SIZE.medium} />
          </span>
          {/* THE COUNT SAYS WHAT IT LEFT OUT. Six fewer than the sheet
              holds is a question a person asks once and then stops
              trusting the number; "645 items · 6 not sold" is an
              answer they can act on. */}
          <span className="md-card-count mono-label">
            {rowCount} {rowCount === 1 ? 'item' : 'items'}
            {heldCount > 0 ? ` · ${heldCount} not sold` : ''}
          </span>
        </span>

        <span className="md-card-name">{module.name}</span>

        {module.description === '' ? null : (
          <span className="md-card-desc">{module.description}</span>
        )}

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

        {/* THE VERBS, AS WORDS. Read from the model's own labels, so a
            capability added there appears here without this file
            changing — and so nothing has to invent a name for one. */}
        <span className="md-card-verbs">
          {module.capabilities.map((c) => (
            <span className="md-verb mono-label" key={c}>
              {MODULE_CAPABILITIES[c].label}
            </span>
          ))}
        </span>
      </button>
    </li>
  )
}
