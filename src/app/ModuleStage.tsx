/* ============================================================
   THE MODULE STAGE — the shell's box around `@/features/modules`.

   Sixth time the same job, and deliberately the sixth of the SAME
   kind rather than a new kind: `@/features/modules` ships a
   dashboard, a create panel and an index renderer, and imports
   nothing from the app. What it cannot know is where the way back
   lives, that only one thing may cover the sheet at a time, and
   which row a person just pointed at. Only the shell knows those.

   WHAT THIS FILE IS, AND ALL IT IS:
     1. a way back   — one control, top left, always there;
     2. a crumb      — what is on screen, in the bar's own voice;
     3. a box        — `<Dashboard>` or `<ModuleIndex>` fills it and
                       scrolls itself;
     4. one link     — "All modules", from an index back to the
                       dashboard, because the door in the panel is
                       behind the stage a person is standing on.

   THREE LEVELS, AND YOU CAN ALWAYS GET OUT OF ALL THREE.
     item  → the module   (the view stage's own back, relabelled)
     index → the dashboard ("All modules", top right)
     dash  → the sheet     ("Back to the sheet", top left)
   Nobody is ever trapped: every level draws its own way back before
   it draws anything else, and the sheet is at most three presses
   away from the deepest screen in the system.

   THE DETAIL SURFACE IS `ViewStage`, NOT A SECOND PAGE. The plan is
   explicit (§4, the Detail and Related rows of the block table):
   a module's detail surface IS a view page, and `ViewStage` is
   already the shell's box around one — row rail, search, the way
   back, and "Quote this one". Building a second one here would be
   the fifth-editor mistake committed by us, one floor up. It is
   rendered as a SIBLING of this stage's own box rather than inside
   it, because `.shell-viewstage` is `position: absolute; inset: 0`
   and nesting one in another would inset the inner box inside a box
   that is already the whole stage.

   WHY THE CLICKED ROW'S TABLE, NOT `module.viewId`. A module made
   from Highfield with its six siblings ticked lists 174 boats from
   SEVEN tables. `module.viewId` is the view of the PRIMARY table
   only, so opening a Stacer through it would draw a Stacer row
   against Highfield's page — the related blocks, the columns and
   the hierarchy would all be the wrong table's. `ModuleIndex.onOpen`
   hands out the table the row actually came from, and `ViewStage`
   resolves that table's own page through `createViewFor`, which is
   idempotent and is the same call the panel's door makes.

   THE DETAIL IS THIS STAGE'S STATE, NOT THE SHELL'S. The `Stage`
   union carries an optional module id and nothing else, so the shell
   holds one fact — which module — exactly as it holds one fact for a
   quote. Which ROW is being read is a position inside a module, the
   way the view stage's own `wanted` row is a position inside a
   table; putting it in the union would make "back to the index"
   close a stage and open another, which unmounts the box and re-runs
   the fade every time somebody compares two boats.

   IT REMEMBERS WHICH MODULE THE ROW BELONGED TO. Without that field
   the id survives a switch to another module and the wrong boat is
   already open when you arrive.

   A STAGE MUST NEVER OUTLIVE ITS SUBJECT. A module deleted while its
   index is open falls back to the DASHBOARD rather than to the
   sheet: the person was in the middle of looking at their modules,
   and the dashboard is where the rest of them still are.
   ============================================================ */

import { useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { ArrowLeft, CaretLeft } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { Dashboard, ModuleIndex, NewModuleDialog } from '@/features/modules'
import { ICON_SIZE } from '@/lib/icons'
import { ViewStage } from './ViewStage'

/** Which item is open, and which module it was opened from. */
interface DetailAt {
  moduleId: string
  tableId: string
  rowId: string
}

export interface ModuleStageProps {
  /** the module being looked at, or null for the dashboard of them */
  moduleId: string | null
  /** The shell holds which one is open, so the door in the panel and
   *  the stage can never disagree about what is on screen. Passing
   *  null goes back to the dashboard without closing the stage. */
  onOpen: (moduleId: string | null) => void
  /** Mint a quote from the item on screen and open it. Absent = the
   *  control is not drawn, so this stage still works on its own. */
  onQuote?: (quoteId: string) => void
  onClose: () => void
}

export function ModuleStage({
  moduleId,
  onOpen,
  onQuote,
  onClose,
}: ModuleStageProps): ReactElement {
  const modules = useProjectStore((s) => s.modules)
  const entities = useProjectStore((s) => s.entities)

  const [detail, setDetail] = useState<DetailAt | null>(null)
  const [creating, setCreating] = useState(false)

  /* The id counts as open only when the module is really there — a
     module deleted from under this stage lands on the dashboard. */
  const open = moduleId ? modules[moduleId] : undefined

  /* An item is open only while we are still in the module it was
     opened from, and only while its table is still on the sheet. */
  const item =
    detail && open && detail.moduleId === open.id && entities[detail.tableId] ? detail : null

  /* THE DETAIL, AND NOTHING OF OURS AROUND IT. Keyed on the row so a
     different item is a different page rather than the same page
     re-pointed: the rail's find box and the row it is showing both
     belong to the item that was clicked. */
  /* `open` is re-tested only so the compiler can see what the line
     that built `item` already guaranteed — an item exists exactly
     when the module it belongs to does. */
  if (item && open) {
    return (
      <ViewStage
        key={`${item.tableId}:${item.rowId}`}
        entityId={item.tableId}
        initialRowId={item.rowId}
        /* the way back goes to the list you came from, not to the
           sheet — the sheet is two more presses out, and every one
           of them is drawn */
        backLabel={`Back to ${open.name}`}
        onQuote={onQuote}
        onClose={() => setDetail(null)}
      />
    )
  }

  /* The primary table's kind mark, so the bar says what sort of place
     this is at a glance. Guarded: a module whose primary table has
     been struck from the sheet still draws, without a mark. */
  const primary = open ? entities[open.tableIds[0] ?? ''] : undefined

  const style = open
    ? ({ '--view-accent': accentVar(open.accent) } as CSSProperties)
    : undefined

  return (
    <div
      className="shell-viewstage"
      role="region"
      aria-label={open ? open.name : 'Dashboard'}
      style={style}
      /* KEYSTROKES STOP AT THIS ROOT, the same line every other stage
         carries. The whiteboard is still mounted underneath and still
         holds a window-level keydown handler: Delete or Backspace with
         a table selected offers to delete that whole table, and it
         only skips INPUT/TEXTAREA/SELECT. The index is a search box
         over 651 rows, and a Backspace clearing the last letter of a
         search must never offer to strike a price file off the sheet. */
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="shell-view-bar">
        <button type="button" className="btn shell-view-back" onClick={onClose}>
          <ArrowLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
          Back to the sheet
        </button>

        <p className="shell-view-what">
          {open && primary ? (
            <span className="shell-view-what-mark">
              <TableKindSymbol kind={kindOf(primary.kind)} size={ICON_SIZE.small} />
            </span>
          ) : null}
          <span className="shell-view-what-name">{open ? open.name : 'Dashboard'}</span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          {/* THE ASIDE SAYS WHAT KIND OF PLACE THIS IS, NOT WHAT IS IN
              IT. It carried `module.description` for one screenshot,
              which is how this was caught: a module made from Highfield
              inherits that table's description, and Highfield's is a
              202-character note about which row of which spreadsheet
              its columns were read from. Set in a 10px uppercase mono
              bar with `white-space: nowrap`, it ran the full width of
              the window, ellipsised mid-sentence and left the crumb
              unreadable — while the index printed the SAME paragraph
              in full, in prose, two lines below it.

              So the bar says the durable thing and the page says the
              admin's thing. This is also the shape the other four
              stages' asides already have: a phrase about the SORT of
              screen you are on, not a summary of its contents. */}
          <span className="shell-view-what-say">
            {open ? 'a place in your business' : 'the places in your business'}
          </span>
        </p>

        {/* THE WAY BACK TO THE DASHBOARD. The panel's own door is
            behind this stage, so without this the only route from a
            module to the list of them is out to the sheet and in
            again. Drawn only inside a module, because on the dashboard
            it would point at itself. */}
        {open ? (
          <div className="shell-quote-acts">
            <button
              type="button"
              className="btn shell-quote-act"
              aria-label="Back to all modules"
              onClick={() => onOpen(null)}
            >
              <CaretLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
              All modules
            </button>
          </div>
        ) : null}
      </div>

      {/* THE WELL DOES NOT SCROLL, the page inside it does. Both
          `.md-dash` and `.md-index` are `height: 100%; overflow: auto`
          in the feature's own stylesheet; a second scroller here would
          nest a scrollbar inside a scrollbar and strand the sticky
          section heads of a seven-brand index. */}
      <div className="shell-module-well">
        {open ? (
          /* KEYED ON THE MODULE, because everything the index holds is
             a position INSIDE one: what has been typed in the find box,
             and whether the gear is on. Switching modules through the
             panel's door without this arrives at a different place
             already filtered by the last module's search, or already in
             design mode over somebody else's page. */
          <ModuleIndex
            key={open.id}
            module={open}
            onOpen={(tableId, rowId) => setDetail({ moduleId: open.id, tableId, rowId })}
          />
        ) : (
          <Dashboard onOpen={(id) => onOpen(id)} onNew={() => setCreating(true)} />
        )}
      </div>

      {/* The create panel portals itself to the body, so it is mounted
          from wherever the button that asks for it lives. Opening the
          new module straight away is the third of the three clicks —
          a module you then have to find on the dashboard is four. */}
      {creating ? (
        <NewModuleDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            onOpen(id)
          }}
        />
      ) : null}
    </div>
  )
}
