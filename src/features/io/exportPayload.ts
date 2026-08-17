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

import { EXPORT_KIND, EXPORT_VERSION } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { getConstraints } from '@/features/constraints'
import { allQuotes } from '@/features/quote'
import type { ProjectFile } from './envelope'

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

   AND THE FIFTH, WHICH THIS NOTE USED TO SAY WAS WAITING: QUOTES.

     quotes       `allQuotes()` — the quote registry's own non-hook
                  reader, newest first

   What it said was that there was no `quotes` key on `ProjectExport`
   and no list reader that is not a hook, and that reaching into the
   registry's private `list` to make an export look complete was how a
   frozen document gets re-priced by an import. The first half is still
   true — `ProjectExport` is orchestrator-owned — so the key is
   declared beside the validator as `ProjectFile`, and the reader is a
   real exported reader rather than a reach-in. The second half was
   never a reason to leave them out, only a reason to do it properly:
   every field on a quote line is a VALUE, so a quote is the one thing
   in this file that a round trip cannot change.

   What it cost to leave them out, meanwhile, was the whole point: a
   dealer who pressed Everything, cleared the sheet and re-imported —
   the documented way to restore a backup — lost every quote they had
   raised, in silence, under a button labelled Everything.
   ============================================================ */

/* ============================================================
   WHAT "STRUCTURE ONLY" MEANS — decided, and made true.

   It used to carry the quotes. The panel said "Structure only /
   Tables and pages, no rows" and the file held two documents, each
   naming a customer, their phone number and suburb, the prices they
   were offered and the discount they were given. The note that put
   them there argued that a quote is neither structure nor a row and
   that leaving it out would make this card the silent-loss card
   again — and the first half is right while the second is answered
   by the other card. Everything is the backup. This is not.

   THIS IS A PRIVACY DECISION, NOT A COPY ONE. Structure only is the
   option a person picks precisely because it sounds safe to hand to
   somebody else: a supplier, a consultant, another dealer. What they
   are handing over is a description of how their business is
   arranged, and a customer's name is not part of that description.
   Rewording the card so it admitted to carrying two customers'
   quotes would have made the sentence true and the file still wrong.

   SO STRUCTURE IS: tables, columns, zones, pages, modules, business
   rules, and the dealer's own organisation name — which is theirs and
   is the thing that makes an imported set knowably somebody's. NOT
   rows, and NOT documents naming customers.

   And the card says so out loud, both ways: Everything names the
   quotes AND says they carry customer names, Structure only says it
   leaves them out and counts what it left. See ImportExportMenu.
   ============================================================ */

/** The envelope for the sheet as it stands, at the given revision.
 *  `includeData` false is "Structure only": it drops the rows and the
 *  quotes, and keeps everything that describes how the business is
 *  arranged. Modules and pages ARE structure — they say how the
 *  business is laid out, not what stock is in it. */
export function buildExportPayload(rev: number, includeData: boolean): ProjectFile {
  const s = useProjectStore.getState()
  const views = Object.values(s.views).sort(byCreatedAt)
  /* dashboard order, then name — the same comparison the Dashboard
     itself sorts by, so the file lists them as the person sees them */
  const modules = Object.values(s.modules).sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  )
  const constraints = [...getConstraints()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  /* oldest first in the file, newest first on screen: the list is a
     diary and reads best newest-first, while a file reads best in the
     order things happened and diffs between two revisions stay short */
  /* ONLY IN THE FULL COPY. A quote holds a customer's name, their
     contact lines, the prices they were offered and any discount
     given, so it travels with the data and never in a structure-only
     copy — see the block above. Read at all only when it will be
     written, so nothing about a structure-only save touches the quote
     registry. */
  const quotes = includeData
    ? [...allQuotes()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : []
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
    ...(quotes.length ? { quotes } : {}),
  }
}
