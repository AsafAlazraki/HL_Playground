/* ============================================================
   THE LANDING RULE, GUARDED — because the version before this one
   went silently dead and nothing turned red.

   The rule it replaced was "open on the FIRST row that answers EVERY
   block". It was correct, it was tested by hand on a 40-row table with
   five blocks, and the day the whole price file arrived — 588 Highfield
   variants, six blocks, two of them rival trailer BRANDS that no boat
   can both be fitted to — it began returning `undefined` for every
   single row and the page fell back to `rows[0]`, which is the case it
   existed to prevent. tsc was green, every guard was green, and the demo
   opened on a page with four of six headings reading "0 picked".

   So the assertions below are aimed at that class of failure rather than
   at the happy path: a table where NO row is perfect must still be given
   a best row, and the answer must be the earliest of the equally good
   ones so it cannot drift.
   ============================================================ */
import { beforeEach, describe, expect, it } from 'vitest'
import type { EntityDef, RowData } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'
import { bestAnsweredRow, LANDING_SCAN } from './landing'
import { createViewFor } from './viewDefs'

/* ---------------------------------------------------------- *
   A minimum sheet: BOATS, two things that go with a boat, and a
   join table for each. Everything is built by hand so the numbers
   in the assertions are the numbers in the fixture and nothing is
   read out of the demo set.
 * ---------------------------------------------------------- */

const text = (id: string, name: string) =>
  ({ id, name, type: 'text' }) as EntityDef['fields'][number]

const ref = (id: string, name: string, refEntityId: string) =>
  ({ id, name, type: 'reference', refEntityId }) as EntityDef['fields'][number]

const table = (id: string, name: string, fields: EntityDef['fields']): EntityDef =>
  ({
    id,
    name,
    kind: 'custom',
    fields,
    position: { x: 0, y: 0 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as EntityDef

const row = (id: string, entityId: string, values: Record<string, unknown>): RowData =>
  ({
    id,
    entityId,
    values,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as RowData

const BOAT = 'boats'
const TRAILER = 'trailers'
const MOTOR = 'motors'
const JOIN_T = 'join-bt'
const JOIN_M = 'join-bm'

function sheet(): {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
} {
  const boats = table(BOAT, 'Boats', [text('b-name', 'Name')])
  const trailers = table(TRAILER, 'Trailers', [text('t-name', 'Name')])
  const motors = table(MOTOR, 'Motors', [text('m-name', 'Name')])
  const joinT = table(JOIN_T, 'Boats · Trailers', [
    ref('jt-b', 'Boat', BOAT),
    ref('jt-t', 'Trailer', TRAILER),
  ])
  const joinM = table(JOIN_M, 'Boats · Motors', [
    ref('jm-b', 'Boat', BOAT),
    ref('jm-m', 'Motor', MOTOR),
  ])
  joinT.role = 'join'
  joinM.role = 'join'

  const entities: Record<string, EntityDef> = {
    [BOAT]: boats,
    [TRAILER]: trailers,
    [MOTOR]: motors,
    [JOIN_T]: joinT,
    [JOIN_M]: joinM,
  }

  /* four boats, in the dealer's own order */
  const boatRows = ['b1', 'b2', 'b3', 'b4'].map((id, i) =>
    row(id, BOAT, { 'b-name': `Boat ${i + 1}` }),
  )

  const rowsByEntity: Record<string, RowData[]> = {
    [BOAT]: boatRows,
    [TRAILER]: [row('t1', TRAILER, { 't-name': 'Trailer 1' })],
    [MOTOR]: [row('m1', MOTOR, { 'm-name': 'Motor 1' })],
    /* b1 answers NOTHING. b2 and b3 each answer the motor block only —
       equally good, and b2 is earlier. b4 answers both. */
    [JOIN_T]: [row('q1', JOIN_T, { 'jt-b': 'b4', 'jt-t': 't1' })],
    [JOIN_M]: [
      row('p1', JOIN_M, { 'jm-b': 'b2', 'jm-m': 'm1' }),
      row('p2', JOIN_M, { 'jm-b': 'b3', 'jm-m': 'm1' }),
      row('p3', JOIN_M, { 'jm-b': 'b4', 'jm-m': 'm1' }),
    ],
  }
  return { entities, rowsByEntity }
}

function ask(
  s: { entities: Record<string, EntityDef>; rowsByEntity: Record<string, RowData[]> },
  limit?: number,
) {
  /* the view registry reads the store, so the sheet has to be in it */
  useProjectStore.setState({ entities: s.entities, rowsByEntity: s.rowsByEntity })
  const view = createViewFor(BOAT)
  return bestAnsweredRow({
    entities: s.entities,
    rowsByEntity: s.rowsByEntity,
    entity: s.entities[BOAT],
    rows: s.rowsByEntity[BOAT],
    viewId: view.id,
    ...(limit === undefined ? {} : { limit }),
  })
}

describe('which row a page opens on', () => {
  beforeEach(() => {
    useProjectStore.setState({ entities: {}, rowsByEntity: {} })
  })

  it('opens on the row that answers every block when there is one', () => {
    const s = sheet()
    const best = ask(s)
    expect(best?.row.id).toBe('b4')
    expect(best?.answered).toBe(2)
    expect(best?.of).toBe(2)
  })

  /* THE REGRESSION THAT PROMPTED THE REWRITE. Take the perfect row away
     and the old all-or-nothing rule answered `undefined`, which put the
     page back on `rows[0]` — the emptiest row in the fixture. */
  it('still answers when NO row answers every block', () => {
    const s = sheet()
    /* take b4's motor away and nothing is perfect any more: b4 answers
       the trailer block, b2 and b3 the motor block, b1 neither */
    s.rowsByEntity[JOIN_M] = s.rowsByEntity[JOIN_M].filter((r) => r.values['jm-b'] !== 'b4')
    const best = ask(s)
    expect(best).toBeDefined()
    expect(best?.row.id).not.toBe('b1')
    expect(best?.answered).toBe(1)
    expect(best?.of).toBe(2)
  })

  it('breaks a tie on the dealer’s own order, not on anything else', () => {
    const s = sheet()
    s.rowsByEntity[JOIN_M] = s.rowsByEntity[JOIN_M].filter((r) => r.values['jm-b'] !== 'b4')
    /* b2, b3 and b4 now all answer exactly one block; b2 is earliest */
    expect(ask(s)?.row.id).toBe('b2')
  })

  it('never chooses a row that is no longer sold', () => {
    const s = sheet()
    const b4 = s.rowsByEntity[BOAT].find((r) => r.id === 'b4')
    if (b4) b4.values['__discontinued'] = true
    const best = ask(s)
    expect(best?.row.id).toBe('b2')
    /* and the row itself is untouched and still on the sheet */
    expect(s.rowsByEntity[BOAT].map((r) => r.id)).toEqual(['b1', 'b2', 'b3', 'b4'])
  })

  it('says nothing at all when no row answers a single block', () => {
    const s = sheet()
    s.rowsByEntity[JOIN_M] = []
    s.rowsByEntity[JOIN_T] = []
    expect(ask(s)).toBeUndefined()
  })

  it('never looks further than it was asked to', () => {
    const s = sheet()
    /* b4 is the perfect one and it is out of range, so the answer is the
       best of the two that are in it */
    const best = ask(s, 2)
    expect(best?.row.id).toBe('b2')
    expect(best?.answered).toBe(1)
    expect(best?.scanned).toBe(2)
  })

  it('keeps one scan depth so two doors cannot name two rows', () => {
    expect(LANDING_SCAN).toBe(120)
  })
})
