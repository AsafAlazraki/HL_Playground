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
import { ViewPage, createViewFor, bestAnsweredRow, LANDING_SCAN } from '@/features/views'
import { createQuoteFromView } from '@/features/quote'
import { useActionBar } from '@/lib/actions'
import type { ActionGroup } from '@/lib/actions'
import { ICON_SIZE } from '@/lib/icons'
import { stageKeys, useStageEscape } from './stageKeys'

/** How many rows the rail draws before it asks you to narrow. */
const RAIL_CAP = 120

const NO_ROWS: RowData[] = []

export interface ViewStageProps {
  entityId: string
  /** Which row to open on. Absent = the first one, which is what the
   *  panel's own door wants: it names a TABLE and nothing more.
   *  A caller that already knows the row — the module index, where a
   *  person clicked a specific boat — passes it here rather than
   *  landing them on someone else's boat. Read once, as the initial
   *  value: after that the rail owns which row is open, so `key` the
   *  stage on the row if a new one must replace the old page. */
  initialRowId?: string
  /** What the one way back says. It defaults to the sheet because for
   *  four years that is the only place this stage was opened from; a
   *  host that opens it from somewhere ELSE — the module stage, where
   *  the sheet is two more presses out — must not have its back
   *  button lie about where it goes. */
  backLabel?: string
  /** Mint a quote from the row on screen and open it. Absent = the
   *  control is not drawn, so this stage still works on its own. */
  onQuote?: (quoteId: string) => void
  onClose: () => void
}

export function ViewStage({
  entityId,
  initialRowId,
  /* "Back", one word, is the calibration — commit 10fd799 chose it
     deliberately because this control returns to wherever you came
     from. The PROP stays, because a host that opens this stage from a
     module needs to be able to say so ("Back to Boats"); only the
     default came into line. */
  backLabel = 'Back',
  onQuote,
  onClose,
}: ViewStageProps): ReactElement {
  const entity = useProjectStore((s) => s.entities[entityId])
  const rows = useProjectStore((s) => s.rowsByEntity[entityId]) ?? NO_ROWS

  const [wanted, setWanted] = useState<string | null>(initialRowId ?? null)
  const [query, setQuery] = useState('')

  /* The page for this table. Idempotent by contract, so this is safe
     to ask for on every render and needs no effect. */
  const view = useMemo(() => (entity ? createViewFor(entityId) : undefined), [entity, entityId])

  /* WHAT THIS OPENS ON WHEN THE DOOR NAMED ONLY A TABLE.
     `rows[0]` is the sheet's own first row, and on the real Northside
     sheet that is the worst page in the catalogue: on the full price
     file the first 120 Highfield Inflatables variants answer 2, 3 or 4
     of the page's six blocks and rows 1–4 answer two, while a 4-of-6
     variant sits 105 rows down the same order. So a demo opening the
     first brand of the first module landed on the emptiest boat.
     The row that answers the MOST blocks is offered instead — earliest
     one on a tie, so it is still the dealer's own order deciding, with
     no ranking of their stock and no favourite. `bestAnsweredRow`
     carries the whole rule and the measurement, including why the
     previous all-or-nothing version went silently dead the day the
     whole price file arrived; it answers `undefined` when there is
     nothing to prefer, and then `rows[0]` is still what happens.

     DECIDED ONCE PER TABLE, AND READ IMPERATIVELY ON PURPOSE. The scan
     needs the whole sheet — the blocks read other tables and the joins
     between them — but this stage must not SUBSCRIBE to the whole
     sheet: `rowsByEntity` is a new object after every cell edit
     anywhere in the app, so a subscription would re-render the page on
     every keystroke somebody types in an unrelated register AND would
     re-run the landing rule, which could move the open page out from
     under whoever is reading it. `getState()` inside the memo keeps the
     deps honest and the answer stable: it is settled when the table
     opens and never again. */
  const landing = useMemo(() => {
    if (!entity || !view) return undefined
    const { entities, rowsByEntity } = useProjectStore.getState()
    /* LANDING_SCAN, not RAIL_CAP — they are the same number today and
       they are not the same fact. The rail's cap is about how much this
       stage draws; the scan depth belongs to the rule, so the module
       index asking the same question about the same table gets the same
       boat back. See landing.ts. */
    return bestAnsweredRow({
      entities,
      rowsByEntity,
      entity,
      rows: rowsByEntity[entity.id] ?? NO_ROWS,
      viewId: view.id,
      limit: LANDING_SCAN,
    })?.row
  }, [entity, view])

  /* Never trust the remembered row: a swap, an import or a deleted
     row would leave the page pointing at nothing. Fall back to the
     landing row, then to the first row, so the stage always opens on
     something real. */
  const openRow: RowData | undefined =
    (wanted ? rows.find((r) => r.id === wanted) : undefined) ?? landing ?? rows[0]

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

  /* Escape is this same control on the keyboard, whatever it is called
     here: opened from Tables it leaves the page, opened from a module it
     goes back to that module's list, because both are `onClose`. */
  useStageEscape(onClose)

  /* ============================================================
     THE SECOND STAGE ON THE ACTION BAR, and it is here to prove the
     mechanism is not a table-only hack.

     "Quote this one" was the whole of track 3 on this bar. It is the
     most consequential press on the page — it turns the configured rig
     in front of a salesperson into a document — and it was drawn as
     one small pill in the top right corner, as far from the rig as the
     window allows. On the action bar it is the PRIMARY, in the same
     place the register's own primary stands, a thumb's travel from the
     dock the salesperson's hand is already near.

     Nothing about the page's own logic moved: the same guard (a row
     has to be open for "this one" to mean anything), the same
     `aria-label` naming WHICH one, and still no `aria-pressed` —
     it makes a new document every time it is pressed and is not a
     toggle.
     ============================================================ */
  const quoting = onQuote && view && openRow ? { view, openRow } : null
  const bar = useMemo<ActionGroup[] | null>(() => {
    if (!quoting || !entity || !onQuote) return null
    return [
      {
        id: 'vw-acts',
        rank: 90,
        items: [
          {
            kind: 'button',
            id: 'vw-quote',
            label: 'Quote this one',
            /* the words alone do not say WHICH one, and a reader who
               cannot see the page needs the rig's own name */
            say: `Quote ${rowLabel(entity, quoting.openRow)}`,
            icon: Receipt,
            tone: 'primary',
            onPick: () => {
              const made = createQuoteFromView(quoting.view.id, quoting.openRow.id)
              if (made) onQuote(made.id)
            },
          },
        ],
      },
    ]
  }, [quoting, entity, onQuote])
  useActionBar('view-stage', bar)

  /* NO `btn` — see DesignStage. `.btn`'s 11px uppercase mono stamp
     turned this into "BACK TO BOATS" when a module passed the name of
     the place it came from, which is uppercase on a NAME as well as on
     a button. `.shell-view-back` carries the whole control. */
  const back = (
    <button
      type="button"
      className="shell-view-back"
      onClick={onClose}
      aria-label={backLabel}
    >
      <ArrowLeft size={ICON_SIZE.small} aria-hidden="true" />
      <span>{backLabel}</span>
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
      /* DELETE AND BACKSPACE STOP AT THIS ROOT, the same line the design
         and flow stages carry. The sheet's window-level handler offers to
         delete the whole SELECTED TABLE on either one, and it only skips
         INPUT/TEXTAREA/SELECT — a stage made of buttons is not exempt.
         The door that opens this stage sits under the selected table, so
         without this a Backspace aimed at a row offers to delete the
         table being looked at.

         Escape travels, so the shell can close this page with it; see
         stageKeys.ts for the whole order. */
      onKeyDown={stageKeys}
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
          {/* NOT "what goes with each one". That is the exact phrase
              the owner named as confusing, and the rule behind the
              complaint is DESIGN_CONTRACT §9: a place is named with a
              NOUN that says what is on the screen. The door that
              opened this page was renamed to Fitment for the same
              reason; the aside beside the subject's name was left
              behind, so the door and the page it opened disagreed
              about what this place is called. The aside's own job is
              to say what SORT of place this is, and this is the
              fitment of one rig. */}
          <span className="shell-view-what-say">fitment for this one</span>
        </p>

        {/* TRACK 3 IS EMPTY AND STAYS DECLARED — the same arrangement
            Home and the table stage use. "Quote this one" stood here
            and is on the action bar now; see the block above `back`.
            Both outer tracks are `minmax(0, 1fr)`, so the title keeps
            the middle of the window whether or not anything stands in
            them. */}
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
                      /* THE WHOLE OF IT, WHEREVER IT IS CUT. The name
                         wraps to two lines and the trail keeps one, so
                         a long enough row is still clamped — and this
                         list exists to tell two variants apart, which
                         is a promise that cannot rest on the visible
                         part alone. */
                      title={e.trail === '' ? e.name : `${e.trail} ▸ ${e.name}`}
                      onClick={() => setWanted(e.id)}
                    >
                      {/* NOT `mono-label` on the trail. It is the dealer's
                          own group path, read off their sheet — a value —
                          and `.mono-label` uppercases what it is stamped
                          on. Its type lives on the class itself now. */}
                      {e.trail === '' ? null : (
                        <span className="shell-view-row-trail">{e.trail}</span>
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
