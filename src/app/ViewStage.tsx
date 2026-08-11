/* ============================================================
   THE VIEW STAGE — the shell's box around `@/features/views`.

   The view page answers one question — "for THIS thing, what else
   goes with it?" — so it needs a thing. It takes a table id and a
   ROW id, and until this file existed nothing in the app ever
   handed it either: the whole feature was finished and unreachable.

   WHAT THIS FILE IS, AND ALL IT IS:
     1. a way in     — a rail of the table's rows, click one;
     2. a way back   — one control, top left, always there;
     3. a box        — `<ViewPage>` fills it and scrolls itself.

   It adds no view logic. `createViewFor` is idempotent, so the page
   for a table is made the first time it is looked at and found
   again every time after.

   WHY A ROW RAIL AND NOT A PICKER SCREEN. The page is per row —
   this hull, not this brand — so a salesperson comparing two hulls
   would otherwise walk back out to a list and in again for every
   comparison. The rail keeps every sibling one click away, and it
   is the ROW CLICK the spec asks for: clicking a row opens that
   row's page.

   THE RAIL IS CAPPED AND SEARCHABLE. One real brand table in the
   Master Price File carries several hundred variant rows; drawing
   them all is slow and reading them all is worse. It shows the
   first `RAIL_CAP` matches and says how many it is not showing, and
   the search narrows on the row's own name and its grouping trail
   ("Sport Series ▸ SPORT 560").

   The stage sits OVER the sheet rather than replacing it, so the
   canvas keeps its scroll, zoom and node state while a page is
   open, and closing is instant.
   ============================================================ */

import { useMemo, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { ArrowLeft, MagnifyingGlass, Receipt } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { accentVar, readCell, rowLabel, type EntityDef, type RowData } from '@/types/model'
import { TableKindSymbol, kindOf } from '@/features/tablekit'
import { ViewPage, createViewFor } from '@/features/views'
import { createQuoteFromView } from '@/features/quote'
import { ICON_SIZE } from '@/lib/icons'

/** How many rows the rail draws before it asks you to narrow. */
const RAIL_CAP = 120

const NO_ROWS: RowData[] = []

export interface ViewStageProps {
  entityId: string
  /** Mint a quote from the row on screen and open it. Absent = the
   *  control is not drawn, so this stage still works on its own. */
  onQuote?: (quoteId: string) => void
  onClose: () => void
}

export function ViewStage({ entityId, onQuote, onClose }: ViewStageProps): ReactElement {
  const entity = useProjectStore((s) => s.entities[entityId])
  const rows = useProjectStore((s) => s.rowsByEntity[entityId]) ?? NO_ROWS

  const [wanted, setWanted] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  /* The page for this table. Idempotent by contract, so this is safe
     to ask for on every render and needs no effect. */
  const view = useMemo(() => (entity ? createViewFor(entityId) : undefined), [entity, entityId])

  /* Never trust the remembered row: a swap, an import or a deleted
     row would leave the page pointing at nothing. Fall back to the
     first row so the stage always opens on something real. */
  const openRow: RowData | undefined =
    (wanted ? rows.find((r) => r.id === wanted) : undefined) ?? rows[0]

  const entries = useMemo<RailEntry[]>(() => {
    if (!entity) return []
    return rows.map((row) => {
      const trail = trailOf(entity, row)
      const name = rowLabel(entity, row)
      return { id: row.id, name, trail, hay: `${trail} ${name}`.toLowerCase() }
    })
  }, [entity, rows])

  /* WORD BY WORD, NOT ONE LONG STRING. The haystack carries the
     grouping trail's ' ▸ ' and whatever punctuation the row's own
     name has, so "Sport 560" — the name the boat is actually sold
     under — is never a literal substring of
     "sport ▸ sp560 highfield - sp560 (pvc) …" and a whole-string
     test answers "nothing matches" for a row two screens down.
     Every typed word must appear somewhere; order and spacing are
     the user's business, not ours. */
  const needles = query.trim().toLowerCase().split(/\s+/).filter((w) => w !== '')
  const matches =
    needles.length === 0 ? entries : entries.filter((e) => needles.every((n) => e.hay.includes(n)))
  const shown = matches.slice(0, RAIL_CAP)
  const hidden = matches.length - shown.length

  const back = (
    <button type="button" className="btn shell-view-back" onClick={onClose}>
      <ArrowLeft size={ICON_SIZE.tiny} weight="bold" aria-hidden="true" />
      Back to the sheet
    </button>
  )

  if (!entity) {
    return (
      <div className="shell-viewstage">
        <div className="shell-view-bar">{back}</div>
        <p className="shell-view-void">That table is no longer on the sheet.</p>
      </div>
    )
  }

  return (
    <div
      className="shell-viewstage"
      style={{ '--view-accent': accentVar(entity.accent) } as CSSProperties}
      /* KEYSTROKES STOP AT THIS ROOT, the same line the design and flow
         stages carry. The whiteboard is still mounted underneath and
         still holds a window-level keydown handler: Delete or Backspace
         with a table selected offers to delete that whole table, and it
         only skips INPUT/TEXTAREA/SELECT — a stage made of buttons is
         not exempt. The door that opens this stage sits under the
         selected table, so without this a Backspace aimed at a row
         offers to delete the table being looked at. */
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="shell-view-bar">
        {back}
        <p className="shell-view-what">
          <span className="shell-view-what-mark">
            <TableKindSymbol kind={kindOf(entity.kind)} size={ICON_SIZE.small} />
          </span>
          <span className="shell-view-what-name">{entity.name}</span>
          <span className="shell-view-what-sep" aria-hidden="true">
            ·
          </span>
          <span className="shell-view-what-say">what goes with each one</span>
        </p>

        {/* QUOTE THIS ONE — the one way a rig becomes a document.
            The page in front of the salesperson IS the configured rig:
            the star, the order, the rigging kit and prop sitting on the
            join row. Carrying that straight onto a quote is what stops
            them configuring the same boat twice, which is the cost the
            spec exists to remove.

            A SENTENCE, NOT A GLYPH, like every other door in this app —
            nobody guesses an icon. It carries `aria-label` because the
            words alone do not say WHICH one, and it carries NO
            `aria-pressed`: this is not a toggle. It makes a new
            document every time it is pressed, and telling a screen
            reader it is "pressed" would promise a state it does not
            have.

            It is drawn only when there is a row on screen, because
            "this one" has to mean something. */}
        {onQuote && view && openRow ? (
          <button
            type="button"
            className="btn shell-quote-act shell-view-quote"
            aria-label={`Quote ${rowLabel(entity, openRow)}`}
            onClick={() => {
              const made = createQuoteFromView(view.id, openRow.id)
              if (made) onQuote(made.id)
            }}
          >
            <Receipt size={ICON_SIZE.tiny} weight="light" aria-hidden="true" />
            Quote this one
          </button>
        ) : null}
      </div>

      <div className="shell-view-split">
        <aside className="shell-view-rail" aria-label={`${entity.name} rows`}>
          <div className="shell-view-find">
            <MagnifyingGlass
              size={ICON_SIZE.tiny}
              weight="light"
              aria-hidden="true"
              className="shell-view-find-mark"
            />
            <input
              className="field-input shell-view-find-input"
              type="search"
              value={query}
              spellCheck={false}
              placeholder="Find one"
              aria-label={`Find a row of ${entity.name}`}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {entries.length === 0 ? (
            <p className="shell-view-rail-none">
              This table has no rows yet. Add one on the sheet and it will appear here.
            </p>
          ) : matches.length === 0 ? (
            <p className="shell-view-rail-none">Nothing here matches “{query.trim()}”.</p>
          ) : (
            <ul className="shell-view-rows">
              {shown.map((e) => {
                const isOpen = openRow?.id === e.id
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={`shell-view-row${isOpen ? ' is-open' : ''}`}
                      aria-current={isOpen || undefined}
                      onClick={() => setWanted(e.id)}
                    >
                      {e.trail === '' ? null : (
                        <span className="shell-view-row-trail mono-label">{e.trail}</span>
                      )}
                      <span className="shell-view-row-name">{e.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {hidden > 0 ? (
            <p className="shell-view-rail-more mono-label">
              {hidden} more — type above to narrow
            </p>
          ) : null}
        </aside>

        <div className="shell-view-page">
          {view && openRow ? (
            <ViewPage viewId={view.id} rowId={openRow.id} />
          ) : (
            <p className="shell-view-void">
              Pick a {entity.name} on the left to see what goes with it.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- */

interface RailEntry {
  id: string
  name: string
  /** the row's grouping values above its own — "Sport Series ▸ SPORT 560" */
  trail: string
  hay: string
}

/** The same trail the page's own header draws, so the rail and the
 *  page never disagree about where a row sits. The row's OWN level is
 *  dropped: that is what `rowLabel` already says. */
function trailOf(entity: EntityDef, row: RowData): string {
  const levels = entity.hierarchy ?? []
  if (levels.length < 2) return ''
  return levels
    .slice(0, -1)
    .map((fieldId) => {
      const v = readCell(row, fieldId)
      return v === null || v === undefined ? '' : String(v).trim()
    })
    .filter((v) => v !== '')
    .join(' ▸ ')
}
