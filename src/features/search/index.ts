/* ============================================================
   SEARCH — one field, in the masthead, over everything.

   The public surface is one component. Everything else in here is
   the matcher it stands on, exported for its own tests and for any
   future surface that needs to find a row by name without also
   drawing a popover.
   ============================================================ */

export { SearchField, SHORTCUT_HINT } from './SearchField'
export type { SearchFieldProps } from './SearchField'

/* the surface the field stands on now the masthead is gone — see
   Finder.tsx. Two things open it: Ctrl+K / Cmd+K from anywhere, and
   "Find anything" in the navy rail, which advertises that shortcut
   beside itself — and now advertises the RIGHT one, because
   `SHORTCUT_HINT` is exported above rather than spelled a second
   time in the rail as the literal string "Ctrl K". */
export { Finder } from './Finder'
export type { FinderProps } from './Finder'

/* what the palette remembers between openings, and the pure part of
   it that can be reasoned about without a browser */
export { RECENT_LIMIT, clearRecent, readRecent, rememberPick, withPick } from './recent'
export type { RecentPick } from './recent'

export {
  BROWSE_LIMIT,
  DEFAULT_LIMITS,
  EMPTY_INDEX,
  MIN_QUERY,
  NO_RESULT,
  RANK,
  browse,
  buildSearchIndex,
  normalizeQuery,
  optionsOf,
  search,
  /* §2 rule 4. Exported because it is the whole per-person half of
     the rule in one function, and because a surface that wants to
     know what a job can reach should ask THIS rather than grow a
     second answer beside it. */
  withinReach,
} from './rowSearch'
export type {
  ColumnEntry,
  ColumnHit,
  ModuleFacts,
  ModuleHit,
  Option,
  ProjectExtras,
  QuoteFacts,
  QuoteHit,
  QuoteMatch,
  Rank,
  RowEntry,
  RowGroup,
  RowHit,
  SearchIndex,
  SearchLimits,
  SearchResult,
  TableEntry,
  TableFacts,
  TableHit,
} from './rowSearch'
