/* ============================================================
   SEARCH — one field, in the masthead, over everything.

   The public surface is one component. Everything else in here is
   the matcher it stands on, exported for its own tests and for any
   future surface that needs to find a row by name without also
   drawing a popover.
   ============================================================ */

export { SearchField } from './SearchField'
export type { SearchFieldProps } from './SearchField'

/* the surface the field stands on now the masthead is gone — see
   Finder.tsx. The dock's "Find anything" opens this. */
export { Finder } from './Finder'
export type { FinderProps } from './Finder'

export {
  DEFAULT_LIMITS,
  EMPTY_INDEX,
  MIN_QUERY,
  NO_RESULT,
  RANK,
  buildSearchIndex,
  normalizeQuery,
  optionsOf,
  search,
} from './rowSearch'
export type {
  Option,
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
