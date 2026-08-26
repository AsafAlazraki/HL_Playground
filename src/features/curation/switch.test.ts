/* ============================================================
   SHOW EVERYTHING IS NOT A HOLE IN THE DISCONTINUED CONTRACT.

   The mechanism's third property — "it can be switched off" — is
   the one that can do damage if it is implemented carelessly, and
   the careless implementation is obvious: keep a second, unfiltered
   list and swap to it. That list would carry retired stock, and
   `sellable.ts`'s whole promise is that no customer-facing surface
   ever offers a row the business stopped selling. Eight live
   pairings on this seed put a discontinued trailer in a boat's
   STANDARD slot; a salesperson would have quoted one.

   So the surfaces implement the switch by passing NO RULE to
   `relatedRows`, which is the same call, through the same gate. The
   contract is applied on the way through either way, and there is
   no second list to get wrong. This asserts exactly that, and it
   asserts the arithmetic the note prints on top of it — because the
   note is what a person trusts when the list is short.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import {
  DISCONTINUED_FIELD_ID,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'
import { curatedOnly } from '@/features/views/describe'
import { makeEngine, relatedRows, type Ctx, type JoinRef } from '@/features/views/pairs'
import { readCuration } from './curation'

const STAMP = '2026-01-01T00:00:00.000Z'

const field = (id: string, name: string, type: FieldDef['type']): FieldDef => ({ id, name, type })

const table = (
  id: string,
  name: string,
  fields: FieldDef[],
  extra: Partial<EntityDef> = {},
): EntityDef => ({
  id,
  name,
  accent: 'blue',
  fields,
  position: { x: 0, y: 0 },
  createdAt: STAMP,
  updatedAt: STAMP,
  ...extra,
})

const row = (id: string, entityId: string, values: RowData['values']): RowData => ({
  id,
  entityId,
  values,
  createdAt: STAMP,
  updatedAt: STAMP,
})

const BOATS = table('boats', 'Highfield Inflatables', [field('bname', 'Model', 'text')])
const BOAT_ROW = row('boat-1', 'boats', { bname: 'SP460' })

const JOIN_REF: JoinRef = { entityId: 'join', sourceFieldId: 'jboat', targetFieldId: 'jtrailer' }

/** Four trailers, one of them no longer sold. Exactly ONE is picked
 *  for this boat, so the curated menu is 1 of 4 and the switch has
 *  something real to reach. */
const sheet = (trailerExtra: Partial<EntityDef> = {}): Ctx => ({
  entities: {
    boats: BOATS,
    trailers: table('trailers', 'NSM Custom Trailers', [field('tname', 'Model', 'text')], trailerExtra),
    join: table(
      'join',
      'Highfield x NSM Custom Trailers',
      [field('jboat', 'Boat', 'reference'), field('jtrailer', 'Trailer', 'reference')],
      { role: 'join' },
    ),
  },
  rowsByEntity: {
    boats: [BOAT_ROW],
    trailers: [
      row('t-1', 'trailers', { tname: 'NSM 4.6' }),
      row('t-2', 'trailers', { tname: 'NSM 5.0' }),
      row('t-3', 'trailers', { tname: 'NSM 5.4' }),
      row('t-gone', 'trailers', { tname: 'NSM 4.2 (old)', [DISCONTINUED_FIELD_ID]: true }),
    ],
    join: [row('p-1', 'join', { jboat: 'boat-1', jtrailer: 't-1' })],
  },
})

/** What a surface draws — `showAll` is the whole of the switch. */
const draw = (ctx: Ctx, showAll: boolean) =>
  relatedRows({
    ctx,
    engine: makeEngine(ctx),
    sourceEntity: BOATS,
    sourceRow: BOAT_ROW,
    targetEntityId: 'trailers',
    /* THE SWITCH, EXACTLY AS EVERY SURFACE IMPLEMENTS IT */
    rule: showAll ? undefined : curatedOnly(),
    join: JOIN_REF,
  })

describe('the show-everything switch', () => {
  it('narrows to the curated menu when it is off', () => {
    const r = draw(sheet(), false)
    expect(r.rows.map((x) => x.row.id)).toEqual(['t-1'])
  })

  it('reaches every live row when it is on', () => {
    const r = draw(sheet(), true)
    expect(r.rows.map((x) => x.row.id)).toEqual(['t-1', 't-2', 't-3'])
  })

  it('still withholds the row that is no longer sold', () => {
    const r = draw(sheet(), true)
    expect(r.rows.map((x) => x.row.id)).not.toContain('t-gone')
    expect(r.heldCount).toBe(1)
  })

  it('offers nothing at all from a table that is history', () => {
    const r = draw(sheet({ retired: true }), true)
    expect(r.rows).toHaveLength(0)
    expect(r.historic).toBe('table')
  })
})

describe('the note over that list', () => {
  const reading = (showAll: boolean) => {
    const r = draw(sheet(), showAll)
    return readCuration({
      name: 'NSM Custom Trailers',
      counts: {
        pool: sheet().rowsByEntity.trailers.length,
        matched: r.rows.length + r.heldCount,
        offered: r.rows.length,
      },
      narrowings: showAll ? [] : [{ id: 'rule', what: 'only what somebody picked for this one shows here' }],
      showingAll: showAll,
    })
  }

  it('states the hidden count rather than leaving a subtraction', () => {
    const r = reading(false)
    expect(r.chip).toBe(
      '1 of 4 NSM Custom Trailers · only what somebody picked for this one shows here',
    )
    expect(r.note).toContain('3 NSM Custom Trailers are not offered here')
    expect(r.narrowedOut).toBe(3)
  })

  it('keeps the discontinued sentence when the narrowing is switched off', () => {
    const r = reading(true)
    expect(r.chip).toBe('all 4 NSM Custom Trailers')
    expect(r.narrowedOut).toBe(0)
    expect(r.withheld).toBe(1)
    expect(r.note).toContain('1 NSM Custom Trailer is no longer sold')
    expect(r.note).toContain('still opens, still totals and still prints')
  })

  it('adds up to the pool in both states', () => {
    for (const showAll of [false, true]) {
      const r = reading(showAll)
      expect(r.offered + r.narrowedOut + r.withheld).toBe(r.pool)
    }
  })
})
