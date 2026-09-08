/* ============================================================
   THE RESULTS TABLE IS A WINDOW, AND SAYS SO.

   WHAT WAS MEASURED, and what this file exists to stop coming
   back. `RuleResultsRail` rendered `rows.map(...)` over every row
   the engine returned. On the seeded rule "Motor fitment —
   Highfield" that is 32,000 rows x 7 columns (the same 32,000
   that lib/rules/measure.test.ts:12 pins), nine elements to a row
   once the gutter is counted — 288,041 elements. Rendering it
   through this component in this suite exhausted a 4 GB heap in
   58s and killed the worker. On the way up, same component, same
   machine: 500 rows 113ms, 2,000 rows 305ms, 8,000 rows 1,352ms.

   THE FIXTURE IS SYNTHETIC AND SIZED FOR THE BOUNDARY, not for
   the seed. What this component owns is the CONTRACT — draw at
   most VIEW_ROW_CAP, and say the true total either way — and 1,200
   synthetic rows prove that contract in milliseconds. The real
   32,000 belongs to the engine's suite, which already asserts it.
   Importing the 23,000-line seed here would buy a slower run and
   the same three assertions.

   WHY THE COUNT IS ASSERTED AS TEXT A PERSON READS. A cap that
   the screen does not admit to is a lie about the business —
   "these are the motors that fit" over a fortieth of them. So the
   assertions below are: how many rows are DRAWN, and whether the
   number of rows that EXIST is on the screen.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useProjectStore } from '@/store/useProjectStore'
import type { CellValue, EntityDef, RuleDef } from '@/types/model'
import type { RuleRunResult, ViewResultRow } from './engine'
import { RuleResultsRail } from './RuleResultsRail'
import { resetRunState, setRunState } from './runStore'

/* the store reaches Dexie through the repository; mocked exactly as
   the other suites mock it (store/undo.test.ts:14). Nothing here
   persists — the subject is what the rail DRAWS. */
vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async () => {},
    wipe: async () => {},
  },
}))

const STAMP = '2026-01-01T00:00:00.000Z'

const ENTITY: EntityDef = {
  id: 'e1',
  name: 'Hulls',
  kind: 'boat',
  accent: 'blue',
  fields: [
    { id: 'f1', name: 'Model', type: 'text' },
    { id: 'f2', name: 'Max HP', type: 'number' },
    { id: 'f3', name: 'Series', type: 'text' },
  ],
  position: { x: 0, y: 0 },
  createdAt: STAMP,
  updatedAt: STAMP,
}

const RULE: RuleDef = {
  id: 'r1',
  name: 'Fitment',
  rootEntityId: 'e1',
  enabled: true,
  nodes: [],
  edges: [],
  createdAt: STAMP,
  updatedAt: STAMP,
}

const COLUMNS = ENTITY.fields.map((f) => ({ scope: 'source' as const, fieldId: f.id }))

function resultWith(rowCount: number): RuleRunResult {
  const rows: ViewResultRow[] = []
  for (let i = 0; i < rowCount; i++) {
    const cells: Record<string, CellValue> = {}
    for (const c of COLUMNS) cells[`source:${c.fieldId}`] = `${c.fieldId}-${i}`
    rows.push({ sourceRowId: `row${i}`, cells })
  }
  return {
    ok: true,
    views: { 'Motors that fit': { columns: COLUMNS, rows } },
    traces: [],
    nodeHits: {},
    edgeHits: {},
    effects: [],
    warnings: [],
    warningsByNode: {},
  } as unknown as RuleRunResult
}

function show(rowCount: number) {
  useProjectStore.getState().replaceProject({
    name: 'Test',
    entities: [ENTITY],
    groups: [],
    rules: [RULE],
    rowsByEntity: { e1: [] },
  })
  setRunState({
    ruleId: RULE.id,
    result: resultWith(rowCount),
    running: false,
    error: null,
    applied: false,
    appliedCount: 0,
  })
  const view = render(<RuleResultsRail ruleId={RULE.id} onClose={() => {}} />)
  const table = view.container.querySelector('table')
  const describedBy = table?.getAttribute('aria-describedby') ?? ''
  return {
    ...view,
    table,
    /* the header row is in <thead>; only the body rows are the answer */
    bodyRows: view.container.querySelectorAll('tbody tr').length,
    /* THE SENTENCE IS READ THROUGH THE TABLE'S OWN ACCESSIBLE
       DESCRIPTION, not through a class name and not through
       `getByText` — the count sits in a <b> inside the sentence, so
       no single text node carries the whole of it, and the thing
       worth asserting is that a screen reader on the table gets the
       figure at all. */
    said: describedBy
      ? (view.container.querySelector(`#${CSS.escape(describedBy)}`)?.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim()
      : '',
  }
}

describe('the results table draws a bounded window', () => {
  it('draws 500 of 1,200 rows rather than all 1,200', () => {
    const { bodyRows, unmount } = show(1200)
    expect(bodyRows).toBe(500)
    unmount()
    resetRunState()
  })

  it('says the number it drew AND the number that exist', () => {
    const { said, unmount } = show(1200)
    expect(said).toContain('Showing 500 of 1,200 rows.')
    /* and the size of what was skipped is given as the reason rather
       than hidden — 1,200 rows over 3 columns */
    expect(said).toContain('All 1,200 would be 3,600 cells')
    unmount()
    resetRunState()
  })

  it('draws every row and claims no cap when the result fits', () => {
    const { bodyRows, said, container, unmount } = show(12)
    expect(bodyRows).toBe(12)
    expect(container.textContent).not.toContain('Showing')
    expect(said).toBe('12 rows.')
    unmount()
    resetRunState()
  })

  it('counts one row in the singular', () => {
    const { bodyRows, said, unmount } = show(1)
    expect(bodyRows).toBe(1)
    expect(said).toBe('1 row.')
    unmount()
    resetRunState()
  })

  it('draws the boundary exactly, and calls 500 uncapped', () => {
    /* the off-by-one at the cap itself: 500 rows is not "500 of 500" */
    const first = show(500)
    expect(first.bodyRows).toBe(500)
    expect(first.said).toBe('500 rows.')
    first.unmount()
    resetRunState()

    const next = show(501)
    expect(next.bodyRows).toBe(500)
    expect(next.said).toContain('Showing 500 of 501 rows.')
    next.unmount()
    resetRunState()
  })

  it('hangs the sentence off the table, so a screen reader gets it too', () => {
    /* without this the count is a visual footnote: sighted readers
       see the window is a window and nobody else does */
    const { table, said, unmount } = show(1200)
    expect(table?.getAttribute('aria-describedby')).toBeTruthy()
    expect(said).toContain('Showing 500 of 1,200 rows.')
    unmount()
    resetRunState()
  })
})
