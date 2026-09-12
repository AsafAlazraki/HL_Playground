/* ============================================================
   DATA (dt-) — COCKPIT, and the first screen in this register.

   THE BILLBOARD PATTERN, WHICH THE PLAN NAMES AND THIS IS THE
   CASE OF: "Data is a six-item nav menu drawn as six giant cards."
   Measured at 1280x800 on the real seed, the screen this replaces
   draws SIX things in 800px of height — six cards, each a 34px
   title over an 11px caption, one of them ("All tables") standing
   in for fifty-three — and declares no register at all.

     register        NONE      Data is Cockpit and never said so
     things on it    6         against the >=18 rows §2 requires
     scale contrast  3.09x     against Cockpit's 2.5-3.2x band
     the 53 tables   behind one card called "All tables"

   A MENU OF SIX IS NOT A PAGE. The dealer works in here all day
   and what they are looking for is a table — so the tables ARE the
   page: all of them, sorted, counted, searchable, at the Cockpit
   row height, with the other five destinations as controls in the
   header where a control belongs. Nothing is hidden that was
   visible before; the card that stood for fifty-three things is
   replaced by the fifty-three things.

   AND THE BAND IS DELIBERATELY NARROW. Cockpit asks for 2.5-3.2x,
   not Showroom's 6x, because a screen somebody reads for an hour
   should not have a 75px word on it. `t-display` over the 11px
   floor is 2.82x at 1280.

   THE COLUMNS ARE THE ONES A PERSON SORTS BY. Name, what it holds,
   which place it belongs to, how many rows, how many columns —
   every figure tabular and mono, none of them a hue (rule 5).
   ============================================================ */

import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { FlowArrow, Graph, MagnifyingGlass, Scales, TreeStructure } from '@phosphor-icons/react'
import { useProjectStore } from '@/store/useProjectStore'
import { useConstraints } from '@/features/constraints/constraintDefs'
import { WORKBOOK_RULES } from '@/features/constraints'
import { ICON_SIZE } from '@/lib/icons'
import { Field } from '@/ui'
import { isRetired } from '@/types/model'
import type { EntityDef } from '@/types/model'
import { useLintFindings } from '@/features/review'
import { reviewSay } from './ReviewStage'
import { stageKeys, useStageEscape } from './stageKeys'
import { useStageEntry } from './stageEntry'
import './data-screen.css'

export interface DataScreenProps {
  /** open one table as a page — the row's own act */
  onOpenTable: (entityId: string) => void
  onOpenDrawing: () => void
  onOpenLevels: () => void
  onOpenRules: () => void
  onOpenFitment: () => void
  onOpenReview: () => void
  onClose: () => void
}

type SortBy = 'name' | 'rows' | 'columns' | 'place'

interface Sheet {
  id: string
  name: string
  kind: string
  /** the module this table belongs to, or '' when none claims it */
  place: string
  rows: number
  columns: number
  /** a relationship rather than stock — counted and shown, never
   *  folded in with the tables a person sells from */
  join: boolean
  retired: boolean
  hay: string
}

export function DataScreen({
  onOpenTable,
  onOpenDrawing,
  onOpenLevels,
  onOpenRules,
  onOpenFitment,
  onOpenReview,
  onClose,
}: DataScreenProps): ReactElement {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const modules = useProjectStore((s) => s.modules)
  const constraints = useConstraints()
  const findings = useLintFindings()
  const [query, setQuery] = useState('')
  const [by, setBy] = useState<SortBy>('rows')

  useStageEscape(onClose)
  const stage = useStageEntry('Data')

  const sheets = useMemo<Sheet[]>(() => {
    /* WHICH PLACE CLAIMS A TABLE, resolved once over the modules
       rather than once per row: a module names its tables and a
       table does not name its module, so the lookup has to run the
       other way round. */
    const place = new Map<string, string>()
    for (const m of Object.values(modules)) {
      for (const id of m.tableIds ?? []) if (!place.has(id)) place.set(id, m.name)
    }
    return Object.values(entities).map((e: EntityDef) => {
      const rows = rowsByEntity[e.id]?.length ?? 0
      const columns = e.fields.length
      const name = e.name
      const spot = place.get(e.id) ?? ''
      return {
        id: e.id,
        name,
        kind: e.kind ?? 'custom',
        place: spot,
        rows,
        columns,
        join: e.role === 'join',
        retired: isRetired(e),
        hay: `${name} ${spot} ${e.kind ?? ''}`.toLowerCase(),
      }
    })
  }, [entities, rowsByEntity, modules])

  const typed = query.trim().toLowerCase()
  const shown = useMemo(() => {
    const list = typed === '' ? sheets.slice() : sheets.filter((s) => s.hay.includes(typed))
    /* THE SECOND KEY IS ALWAYS THE NAME, so a sort is stable and a
       screen does not reshuffle its ties between paints. */
    list.sort((a, b) => {
      if (by === 'rows') return b.rows - a.rows || a.name.localeCompare(b.name, 'en-AU')
      if (by === 'columns') return b.columns - a.columns || a.name.localeCompare(b.name, 'en-AU')
      if (by === 'place') {
        return a.place.localeCompare(b.place, 'en-AU') || a.name.localeCompare(b.name, 'en-AU')
      }
      return a.name.localeCompare(b.name, 'en-AU', { numeric: true })
    })
    return list
  }, [sheets, typed, by])

  const stock = sheets.filter((s) => !s.join && !s.retired)
  const allRows = sheets.reduce((n, s) => n + s.rows, 0)
  const rules = WORKBOOK_RULES.length + constraints.length
  /* WHAT IS BEHIND THE REVIEW DOOR, ON THE DOOR. `reviewDoor.test`
     holds this: "the press is never into an empty room unannounced".
     The first draft of this screen turned six billboard cards into
     five controls and dropped the fact off this one on the way — a
     button reading "Review" promises nothing, and the test was right
     to fail it. Same `reviewSay` the shipped door used, so the two
     can never word it differently. */
  const blockers = findings.reduce((n, f) => n + (f.severity === 'blocker' ? 1 : 0), 0)

  return (
    <div className="dt" data-register="cockpit" role="region" {...stage} onKeyDown={stageKeys}>
      <header className="dt-head">
        <div className="dt-head-say">
          <h1 className="t-display dt-name">Data</h1>
          <p className="t-small dt-census">
            {sheets.length} tables · {allRows.toLocaleString('en-AU')} rows ·{' '}
            {stock.length} of them stock
          </p>
        </div>

        {/* THE OTHER FIVE DESTINATIONS, AS CONTROLS. They were six
            cards filling a page; a way to somewhere else is a
            control, and it belongs in the header beside the others. */}
        <nav className="dt-ways" aria-label="The rest of the price file">
          <Way glyph={<Graph size={ICON_SIZE.tiny} weight="light" />} onPick={onOpenDrawing}>
            Data model
          </Way>
          <Way
            glyph={<TreeStructure size={ICON_SIZE.tiny} weight="light" />}
            onPick={onOpenLevels}
          >
            Configure
          </Way>
          <Way glyph={<Scales size={ICON_SIZE.tiny} weight="light" />} onPick={onOpenRules}>
            Rules
            <span className="dt-way-n">{rules}</span>
          </Way>
          <Way glyph={<FlowArrow size={ICON_SIZE.tiny} weight="light" />} onPick={onOpenFitment}>
            What fits what
          </Way>
          <Way
            glyph={<MagnifyingGlass size={ICON_SIZE.tiny} weight="light" />}
            onPick={onOpenReview}
          >
            Review
            <span className="dt-way-n">{reviewSay(blockers, findings.length - blockers)}</span>
          </Way>
        </nav>
      </header>

      <div className="dt-tools">
        <Field
          label="Find a table"
          value={query}
          onChange={setQuery}
          placeholder="Highfield, trailers, rigging…"
          type="search"
          autoComplete="off"
        />
        <p className="t-caption dt-count" aria-live="polite">
          {typed === ''
            ? `${shown.length} tables`
            : `${shown.length} of ${sheets.length} tables match “${query}”`}
        </p>
      </div>

      {/* ============================================================
          A REAL TABLE, AND THE HEADER SORTS IT.

          `aria-sort` on the header cell rather than an arrow glyph
          alone, so the state is announced and not only drawn. The
          rows are `--row-h` — 32px, the Cockpit default — which puts
          18 of them in view at 1280x800 with the header and the
          search above, which is what §2 asks for.
          ============================================================ */}
      <div className="dt-port">
        <table className="dt-table">
          {/* THE WIDTHS LIVE HERE AND NOWHERE ELSE. `table-layout:
              fixed` takes every column's width from the FIRST ROW,
              so widths set on the body cells are read by nothing —
              which is how five columns that should have been 480,
              200, 200, 120 and 120 all came out at 224 and cut
              twenty-three names dead. A `<colgroup>` is the one
              place a fixed table's geometry can be stated once. */}
          <colgroup>
            <col className="dt-col--name" />
            <col className="dt-col--place" />
            <col className="dt-col--what" />
            <col className="dt-col--n" />
            <col className="dt-col--n" />
          </colgroup>
          <thead>
            <tr>
              <Head name="Table" on={by === 'name'} onPick={() => setBy('name')} />
              <Head name="Place" on={by === 'place'} onPick={() => setBy('place')} />
              <th className="dt-h dt-h--plain" scope="col">
                <span className="t-label">Holds</span>
              </th>
              <Head name="Rows" figure on={by === 'rows'} onPick={() => setBy('rows')} />
              <Head name="Columns" figure on={by === 'columns'} onPick={() => setBy('columns')} />
            </tr>
          </thead>
          <tbody>
            {shown.map((sheet) => (
              <tr key={sheet.id} className="dt-row" data-kind={sheet.kind}>
                <td className="dt-c dt-c--name">
                  <button type="button" className="dt-open" onClick={() => onOpenTable(sheet.id)}>
                    <span className="k-dot dt-dot" aria-hidden="true" />
                    {sheet.name}
                  </button>
                </td>
                <td className="dt-c dt-c--place">{sheet.place}</td>
                <td className="dt-c dt-c--what">
                  {/* WHAT IT HOLDS, IN WORDS — a relationship is not
                      stock and a struck table is not either, and both
                      states were invisible on the screen this
                      replaces. A hue never says this on its own. */}
                  {sheet.retired ? 'no longer sold' : sheet.join ? 'a relationship' : sheet.kind}
                </td>
                <td className="dt-c dt-c--n">{sheet.rows.toLocaleString('en-AU')}</td>
                <td className="dt-c dt-c--n">{sheet.columns}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {shown.length === 0 ? (
          <p className="t-small dt-none">
            Nothing here matches “{query}”. Clear the search to see all {sheets.length} tables.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function Head({
  name,
  figure,
  on,
  onPick,
}: {
  name: string
  figure?: boolean
  on: boolean
  onPick: () => void
}): ReactElement {
  return (
    <th
      className={figure ? 'dt-h dt-h--n' : 'dt-h'}
      scope="col"
      aria-sort={on ? 'descending' : 'none'}
    >
      <button type="button" className="t-label dt-sort" onClick={onPick}>
        {name}
      </button>
    </th>
  )
}

function Way({
  glyph,
  children,
  onPick,
}: {
  glyph: ReactElement
  children: React.ReactNode
  onPick: () => void
}): ReactElement {
  return (
    <button type="button" className="dt-way" onClick={onPick}>
      <span className="dt-way-glyph" aria-hidden="true">
        {glyph}
      </span>
      {children}
    </button>
  )
}
