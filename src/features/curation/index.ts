/* ============================================================
   CURATION — the mechanism, not a widget.

   `docs/plan/hl-journeys.md` §4: "A filter that can explain itself,
   be searched past, and be switched off is the shape every 'curated
   by rule' surface in our modules should take."

   It is exported the way `@/lib/actions` is exported — one door,
   one vocabulary, used by four features that cannot see each other.
   A surface that narrows and does not import this is a surface that
   narrows silently, and that is now a one-line thing to spot.
   ============================================================ */

export {
  curationChip,
  curationNote,
  measuredRate,
  reachNote,
  readCuration,
  toggleWords,
  type CurationCounts,
  type CurationInput,
  type CurationReading,
  type Narrowing,
} from './curation'

export { CurationNote, type CurationNoteProps, type CurationSearch } from './CurationNote'

export { searchReach, type SearchReach } from './reach'
