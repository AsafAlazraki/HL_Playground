/* ============================================================
   THE ROUND TRIP, ON A MODULE'S CATALOGUE — MODULE_SYSTEM §10
   Phase 4, "`export`/`import` as real module capabilities".

   IT PERFORMS NOTHING ITSELF, AND THAT IS THE WHOLE DESIGN.
   `io/TableRoundTrip.tsx` already owns the act: a file of what the
   register is showing, a preflight that reads a file back and writes
   NOTHING until a person presses, every refusal as its own sentence,
   and one undo step for a merge of four hundred cells. Re-implementing
   any of that here would be a second set of rules about what may
   leave a dealership and what may be written over — the exact fault
   `proposals.ts` avoids on the create path, one floor down.

   So this component is a GATE and a MOUNT. It asks `travelCaps.ts`
   which of the two verbs this module offers and this job holds, takes
   the round trip's own controls, publishes only the ones that are
   allowed, and renders the surface they need.

   ── WHY THE CONTROLS GO ON THE APPLICATION'S BAR ─────────────

   Because that is where the same three controls are on the register.
   A dealer who has learned Export on the sheet must not have to learn
   a second Export somewhere else on the catalogue; `useActionBar` is
   the seam the register itself publishes through, and the bar belongs
   to the page rather than to the navigation (`Shell.tsx`). Rank 40 is
   the round trip's own rank there — "take it away and bring it back",
   between seeing all of it and the doors.

   ── WHAT THE TWO SWITCHES SEPARATE ───────────────────────────

   `export` publishes Export. `import` publishes Re-upload AND Paste
   rows, because both are one act — rows arriving at this register
   from a spreadsheet — and an administrator who has withheld the file
   door has not agreed to the clipboard one. They are separate
   switches from each other because they are opposite risks: one
   leaks a cost column, the other overwrites six hundred rows.

   ── THE HOOK ORDER, AND WHY THIS IS A COMPONENT ──────────────

   `useTableData` and `useTableRoundTrip` are hooks about ONE table.
   A catalogue standing at a place has exactly one, and a catalogue
   standing on a module nobody split has several — which `readTravel`
   refuses in words rather than exporting one of seven silently. So
   the host renders this component only where there is a table to
   name, and the hooks below run unconditionally inside it.
   ============================================================ */

import { useMemo } from 'react'
import type { JSX } from 'react'
import type { ActionGroup, ActionItem } from '@/lib/actions'
import { useActionBar } from '@/lib/actions'
import { useTableData } from '@/features/table/useTableData'
import { useTableRoundTrip } from '@/features/io/TableRoundTrip'
import { say } from '@/store/notes'
import type { PushNote } from '@/store/notes'

/** The bus, as a `PushNote`. The catalogue has no toast strip of its
 *  own, so its notes go the way its add and its take-out already go. */
const push: PushNote = (text, tone, act) => {
  say({ text, tone, ...(act ? { act } : {}) })
}

/** The round trip publishes three controls under stable ids. Export
 *  is the copy going out; the other two are rows coming in. */
const OUT = new Set(['tb-export'])
const BACK = new Set(['tb-reupload', 'tb-paste'])

export interface CatalogTravelProps {
  /** the register the file is of, and the one a file lands in */
  tableId: string
  /** the module offers export AND this job holds it, unblocked */
  canExport: boolean
  /** the same, for rows coming in */
  canImport: boolean
}

export function CatalogTravel({
  tableId,
  canExport,
  canImport,
}: CatalogTravelProps): JSX.Element | null {
  /* THE CATALOGUE'S OWN NARROWING IS NOT THE REGISTER'S. A person
     searching the catalogue has narrowed what is drawn on a page,
     not what the table holds — and `buildTableCsv` writes "the rows
     showing". Passing the catalogue's search in here would mean a
     file that quietly held twelve of five hundred rows because
     somebody had typed in a box on a different surface. So the view
     is empty: the file is the register, whole, every time, and the
     note that follows the export says the count out loud. */
  const data = useTableData(tableId, { sort: null, filters: [], search: '' })

  const rows = data.rows
  const shown = useMemo(() => {
    const out = []
    for (const vr of data.viewRows) {
      const r = data.rowById.get(vr.rowId)
      if (r) out.push(r)
    }
    return out
  }, [data.viewRows, data.rowById])

  const trip = useTableRoundTrip({
    entityId: tableId,
    allRows: rows,
    shownRows: shown,
    computedFor: data.computedFor,
    refLabelOf: data.refLabelOf,
    refMapOf: data.refMapOf,
    /* nothing is narrowing it — see above */
    viewActive: false,
    pushToast: push,
  })

  const groups = useMemo<ActionGroup[] | null>(() => {
    const items: ActionItem[] = trip.items.filter(
      (i) => (canExport && OUT.has(i.id)) || (canImport && BACK.has(i.id)),
    )
    if (items.length === 0) return null
    return [{ id: 'module-travel', rank: 40, items }]
  }, [trip.items, canExport, canImport])

  useActionBar('module-catalogue-travel', groups)

  /* THE SURFACE IS THE FILE INPUT AND THE PREFLIGHT. Neither is drawn
     until a control is pressed, and no control is published unless a
     verb is on — but the surface is only mounted when one is, so a
     module offering neither carries none of it. */
  return groups === null ? null : <>{trip.surface}</>
}
