/* ============================================================
   demos — the starting points offered in the empty state and the
   I/O menu. Each one loads atomically in a single replaceProject
   call and leaves the sheet at REV 00.

   CONFIGURATOR_SPEC.md §6b — "Starting data — REAL, or none at all":
   invented sample data is banned. The `fitment` set (made-up
   Highfield / Yamaha / Redco figures) has been DELETED, and the
   `dealership` set (invented boats, customers, deals and margins
   carried under the real dealership's name) is offered nowhere —
   it survives only as `loadSampleProject` in `@/features/io/sample`,
   which no surface calls.

   Exactly two starting points, and no third:
     1. "Northside Marine" — the real Master Price File, every value
        traceable to a source cell (`./northside`);
     2. an empty sheet.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { loadNorthsideProject } from './northside'

export interface DemoSet {
  id: string
  name: string
  /** one plain sentence describing what lands on the sheet */
  blurb: string
  load(): void
}

/** A clean sheet — nothing on the canvas, nothing in the data. */
export function loadBlankProject(): void {
  useProjectStore.getState().replaceProject({
    name: 'Untitled Sheet',
    entities: [],
    groups: [],
    rules: [],
    rowsByEntity: {},
  })
}

export const DEMOS: DemoSet[] = [
  {
    id: 'northside',
    name: 'Northside Marine',
    blurb: 'Real data extracted from Northside Marine’s Master Price File.',
    load: loadNorthsideProject,
  },
  {
    id: 'blank',
    name: 'Blank sheet',
    blurb: 'An empty sheet with nothing on it, ready for your first table.',
    load: loadBlankProject,
  },
]

export { buildNorthsideProject, loadNorthsideProject } from './northside'
export type { NorthsideProject } from './northside'
