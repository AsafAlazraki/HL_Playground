/* ============================================================
   NO SURFACE MAY NAME A FILE THE USER DID NOT IMPORT — UX_PASS
   §4.3, and this screen was the one breaking it hardest.

   MEASURED IN THE RUNNING APP before the gate existed, on a blank
   sheet holding one table the person had made themselves: the rules
   screen named SIX workbooks on its first tab — Boat Module (5).xlsx,
   Trailer Module.xlsx, Motor Module (1).xlsx, Parts Module (3).xlsx,
   Rigging Module.xlsx, Registration Module.xlsx — six more on its
   third, and "Master Price File" three times. All of them belong to
   Northside Marine's prepared set. None of them had been imported by
   the person reading the screen.

   THE TAB NAMES WERE PART OF IT. "From your price file" claims a file
   before a single card is drawn, so gating the cards and leaving the
   segment would have been half a fix.

   WHY A RENDERING TEST. The decision is which VIEWS the screen
   offers, and that is only visible from the screen. `exampleData`'s
   own suite proves the reading; this proves the screen asks it.

   THE READING IS `exampleOnSheet`, the same one the control that
   REMOVES the prepared set uses (§4.2), so the screen that offers to
   take it away and the screens that speak for it cannot come to
   different conclusions about whether it is here.
   ============================================================ */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EntityDef, RowData } from '@/types/model'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: { load: async () => null, saveAll: async () => {}, wipe: async () => {} },
}))

const { useProjectStore } = await import('@/store/useProjectStore')
const { RulesPane } = await import('./RulesPane')
const { writeSeedStamp, forgetSeedStamp } = await import('@/demos/seedStamp')
/* the fingerprint the stamp records — computed from the seed's own
   table list, so it changes by itself when the seed does */
const { northsideSeedFingerprint } = await import('@/demos/northside')

const ISO = '2026-01-01T00:00:00.000Z'

/** A table with the columns a rule can be written against, so the
 *  pane is never in its "no columns yet" state — that has its own
 *  empty screen and would hide the segments for a different reason. */
const table = (id: string, name: string): EntityDef => ({
  id,
  name,
  accent: 'blue',
  kind: 'boat',
  fields: [
    { id: `${id}-name`, name: 'Model', type: 'text' },
    { id: `${id}-len`, name: 'Hull Length (mtr)', type: 'number' },
  ],
  displayFieldId: `${id}-name`,
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
})

const row = (entityId: string, i: number): RowData => ({
  id: `${entityId}-r${i}`,
  entityId,
  values: { [`${entityId}-name`]: `Model ${i}`, [`${entityId}-len`]: 4 + i },
  createdAt: ISO,
  updatedAt: ISO,
})

function seed(tables: EntityDef[]): void {
  const rowsByEntity: Record<string, RowData[]> = {}
  for (const t of tables) rowsByEntity[t.id] = [row(t.id, 1), row(t.id, 2)]
  useProjectStore.setState({
    entities: Object.fromEntries(tables.map((t) => [t.id, t])),
    rowsByEntity,
  })
}

const tabs = (): string[] =>
  screen.getAllByRole('tab').map((t) => (t.textContent ?? '').replace(/\s+/g, ' ').trim())

beforeEach(() => {
  forgetSeedStamp()
  useProjectStore.setState({ entities: {}, rowsByEntity: {}, modules: {}, views: {} })
})

afterEach(() => {
  forgetSeedStamp()
})

/* ---------------------------------------------------------- */

describe('a sheet the prepared set was never loaded onto', () => {
  beforeEach(() => {
    seed([table('t1', 'My Own Boats')])
  })

  it('OFFERS ONLY THE VIEW THAT IS ABOUT THIS PERSON’S OWN RULES', () => {
    render(<RulesPane />)
    expect(tabs().some((t) => t.startsWith('Rules you write'))).toBe(true)
    expect(tabs().some((t) => t.startsWith('From your price file'))).toBe(false)
    expect(tabs().some((t) => t.startsWith('What is checked'))).toBe(false)
  })

  it('NAMES NO WORKBOOK ANYWHERE ON THE SCREEN', () => {
    /* The assertion the measurement made: any `.xlsx` at all is a
       file this person does not have. */
    const { container } = render(<RulesPane />)
    expect(container.textContent ?? '').not.toMatch(/\.xlsx/)
  })

  it('does not say "your price file" about a file that is not theirs', () => {
    const { container } = render(<RulesPane />)
    expect(container.textContent ?? '').not.toMatch(/Master Price File/)
  })
})

describe('a sheet the prepared set IS on', () => {
  beforeEach(() => {
    /* TWO SIGNALS, BOTH REQUIRED, and the fixture has to carry both
       or it is testing the wrong branch. `exampleTableIds` asks (1)
       did this browser record a seeding — the stamp — and (2) is
       there a COHORT of tables sharing one `createdAt` instant, big
       enough that a person could not have made them one at a time.
       `DRIFT_GATE` is that floor and it is EIGHT, pinned against the
       seed's own behaviour by `seedChunk.test.ts` — read rather than
       guessed, because a fixture that happened to sit under it would
       be testing the "no prepared set" branch twice. */
    writeSeedStamp(northsideSeedFingerprint())
    seed([
      table('t1', 'Highfield Inflatables'),
      table('t2', 'Stabicraft'),
      table('t3', 'Stacer'),
      table('t4', 'Formosa'),
      table('t5', 'Yamaha Outboards'),
      table('t6', 'Dunbier Trailers'),
      table('t7', 'REDCO Trailers'),
      table('t8', 'Parts & Accessories'),
    ])
  })

  it('OFFERS ALL THREE VIEWS AGAIN — the gate is about provenance, not about hiding', () => {
    render(<RulesPane />)
    expect(tabs().some((t) => t.startsWith('From your price file'))).toBe(true)
    expect(tabs().some((t) => t.startsWith('Rules you write'))).toBe(true)
    expect(tabs().some((t) => t.startsWith('What is checked'))).toBe(true)
  })
})
