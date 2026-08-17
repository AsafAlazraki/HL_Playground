/* ============================================================
   io/exportPayload — the envelope "Save a copy" writes.

   THIS LIVES ON ITS OWN SO THE ROUND TRIP CAN BE TESTED.

   It used to be a private function inside the popover component,
   which meant the only way to reach it was to render React and
   click a card — so nothing ever ran the real exporter into the
   real importer, and TWICE a build shipped an export the importer
   refused outright:

     "DUPLICATE ID __origin"        — any project with two curated
                                      joins, found once
     "DUPLICATE ID __discontinued"  — the whole demo seed, found
                                      when the menu was re-hung on
                                      Home and the trip was walked
                                      end to end for the first time

   Both were invisible to every unit test in this directory,
   because envelope.ts was always fed a hand-written fixture that
   happened to avoid the shape the real exporter produces. A
   fixture cannot catch a disagreement between two halves of the
   app; only running one into the other can. `envelope.roundtrip.test.ts`
   now does exactly that, against the real seed, and it needs this
   function to be reachable without a DOM.

   The component keeps the download — bumping the rev, naming the
   file, poking the anchor — because that is chrome, not content.
   ============================================================ */

import { EXPORT_KIND, EXPORT_VERSION, type ProjectExport } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { getConstraints } from '@/features/constraints'

/* Deterministic serialisation order: store records are keyed objects whose
   Object.values order depends on how IndexedDB rehydrated them — sort by
   createdAt (name as tiebreak) so the same project always exports the same
   file, and revision diffs stay readable. Groups have no createdAt. */
const byCreatedAt = <T extends { createdAt: string; name: string }>(a: T, b: T): number =>
  a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name)

/* ============================================================
   WHAT "EVERYTHING" MEANS.

   Until version 2 it meant the SEED: tables, zones, flow rules and
   rows — every one of which a demo loader can produce — and none of
   the work a person actually did. The modules they built, the pages
   they curated, the business rules they wrote and the name of their
   own business all stayed in the browser they were made in, silently,
   under a button labelled Everything.

   The four that travel now, and where each is read from:

     org          `meta.org`, so an imported set knows whose it is
     views        the store's `views` slice — the shell mirrors the
                  view feature's registry into it on every change
                  (`app/viewPersistence.ts`), so this is the current
                  page layout and not a stale copy
     modules      the store's `modules` slice, in dashboard order
     constraints  `getConstraints()` — the constraint registry's own
                  non-hook reader, scoped to the current organisation

   STILL NOT CARRIED, and deliberately not smuggled: QUOTES. There is
   no `quotes` key on `ProjectExport` and no non-hook list reader on
   the quote registry (`useQuotes` is a hook; `getQuote` needs an id
   you would have to already have). Both are named in
   `features/quote/index.ts` §3 as store work. Reaching into that
   module's private `list` to make an export look complete is exactly
   how a frozen document gets re-priced by an import, so it waits.
   ============================================================ */

/** The envelope for the sheet as it stands, at the given revision.
 *  `includeData` false is "Structure only" — it drops rows and
 *  nothing else, because modules and pages say how the business is
 *  arranged and only the rows are its contents. */
export function buildExportPayload(rev: number, includeData: boolean): ProjectExport {
  const s = useProjectStore.getState()
  const views = Object.values(s.views).sort(byCreatedAt)
  /* dashboard order, then name — the same comparison the Dashboard
     itself sorts by, so the file lists them as the person sees them */
  const modules = Object.values(s.modules).sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  )
  const constraints = [...getConstraints()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return {
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    project: { name: s.meta.name, rev },
    entities: Object.values(s.entities).sort(byCreatedAt),
    groups: Object.values(s.groups).sort((a, b) => a.name.localeCompare(b.name)),
    /* rules carry their whole graph — nodes, edges and every typed
       config — so a full set re-imports and runs identically */
    rules: Object.values(s.rules).sort(byCreatedAt),
    ...(includeData ? { rows: { ...s.rowsByEntity } } : {}),
    ...(s.meta.org ? { org: s.meta.org } : {}),
    ...(views.length ? { views } : {}),
    ...(modules.length ? { modules } : {}),
    ...(constraints.length ? { constraints } : {}),
  }
}
