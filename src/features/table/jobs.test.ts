/* ============================================================
   A TABLE OPENS ON WHAT YOU CAN DO WITH IT — UX_PASS §12.

   The property worth guarding is §12's first one: EVERY JOB IS
   DERIVED, NEVER HARDCODED. A hardcoded list passes every test about
   how it looks and is wrong about every table that is not the one
   somebody had in mind — a table with no prices offering to change
   prices is the app inventing a capability.

   And the second: a job that CANNOT run says why rather than
   vanishing. The difference between "left out" and "refused" is the
   difference between a fact about the table and a thing a person can
   go and fix, so both directions are asserted.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { DISCONTINUED_FIELD_ID } from '@/types/model'
import type { EntityDef, RowData } from '@/types/model'
import { gapsIn, jobsFor, tableSay } from './jobs'

const ISO = '2026-01-01T00:00:00.000Z'
const NOUN = { one: 'boat', many: 'boats' }

function table(fields: EntityDef['fields'], over: Partial<EntityDef> = {}): EntityDef {
  return {
    id: 'e1',
    name: 'Zeta Hulls',
    accent: 'blue',
    fields,
    displayFieldId: fields[0]?.id ?? '',
    position: { x: 0, y: 0 },
    createdAt: ISO,
    updatedAt: ISO,
    ...over,
  }
}

const row = (id: string, values: RowData['values']): RowData => ({
  id,
  entityId: 'e1',
  values,
  createdAt: ISO,
  updatedAt: ISO,
})

const NAME = { id: 'f-name', name: 'Model', type: 'text' as const }
const CASH = { id: 'f-cash', name: 'Cash', type: 'number' as const }
const PIC = { id: 'f-pic', name: 'Photo', type: 'image' as const }

const idsOf = (e: EntityDef, rows: RowData[], extra = {}): string[] =>
  jobsFor({ entity: e, rows, noun: NOUN, ...extra }).map((j) => j.id)

describe('every job is derived, never hardcoded', () => {
  it('OFFERS NO PRICE JOB ON A TABLE WITH NO PRICES', () => {
    const bare = table([NAME])
    expect(idsOf(bare, [row('r1', { 'f-name': 'A' })])).not.toContain('prices')
  })

  it('offers one the moment a price column resolves, naming that column', () => {
    const priced = table([NAME, CASH])
    const jobs = jobsFor({ entity: priced, rows: [row('r1', { 'f-name': 'A' })], noun: NOUN })
    expect(jobs.find((j) => j.id === 'prices')?.say).toBe('Cash')
  })

  it('says nothing at all about relationships without the sheet, rather than guessing', () => {
    /* the same correction `capabilityStates` needed: a claim made from
       a map that cannot answer is worse than no claim */
    expect(idsOf(table([NAME]), [])).not.toContain('related')
  })

  it('names what this table is related to when the sheet is handed over', () => {
    /* A RELATIONSHIP IS A JOIN TABLE, not a reference column — which
       is what `existingRelations` means by one and what §12 means by
       "joins reference it". The fixture is built the way the seed
       builds one: a third table with a role of 'join' pointing at
       both sides. */
    const boats = table([NAME])
    const motors: EntityDef = { ...table([NAME]), id: 'e2', name: 'Zeta Motors' }
    const join: EntityDef = {
      ...table([
        { id: 'j-b', name: 'Boat', type: 'reference', refEntityId: 'e1' },
        { id: 'j-m', name: 'Motor', type: 'reference', refEntityId: 'e2' },
      ]),
      id: 'e3',
      name: 'Zeta Hulls × Zeta Motors',
      role: 'join',
    }
    const jobs = jobsFor({
      entity: boats,
      rows: [],
      noun: NOUN,
      sheet: { e1: boats, e2: motors, e3: join },
    })
    const rel = jobs.find((j) => j.id === 'related')
    expect(rel?.say).toContain('Zeta Motors')
    expect(rel?.refusal).toBeUndefined()
  })
})

describe('a job that cannot run says why, where it is', () => {
  it('KEEPS "Add pictures" AND EXPLAINS ITSELF when no column holds one', () => {
    const jobs = jobsFor({ entity: table([NAME]), rows: [row('r1', {})], noun: NOUN })
    const pic = jobs.find((j) => j.id === 'pictures')
    expect(pic).toBeDefined()
    expect(pic?.refusal).toMatch(/No column on this table holds a picture/)
  })

  it('refuses adding when the caller says this person may not', () => {
    const jobs = jobsFor({ entity: table([NAME]), rows: [], noun: NOUN, mayAdd: false })
    expect(jobs.find((j) => j.id === 'add')?.refusal).toMatch(/switched off/)
  })

  it('says nothing is related yet rather than hiding the job', () => {
    const lonely = table([NAME])
    const jobs = jobsFor({ entity: lonely, rows: [], noun: NOUN, sheet: { e1: lonely } })
    expect(jobs.find((j) => j.id === 'related')?.refusal).toMatch(/Draw a relationship/)
  })
})

describe('what is missing, counted over live rows only', () => {
  const required = table([{ ...NAME, required: true }, CASH, PIC])

  it('counts a row short of a required cell, and names the column', () => {
    const gaps = gapsIn(required, [row('r1', { 'f-name': 'A' }), row('r2', { 'f-cash': 1 })])
    expect(gaps.rows).toBe(1)
    expect(gaps.columns).toEqual(['Model'])
  })

  it('DOES NOT COUNT A DISCONTINUED ROW, because a withdrawn thing is not a gap', () => {
    /* the model's own key, not a word that looks like it */
    const gone = row('r2', { [DISCONTINUED_FIELD_ID]: true })
    expect(gapsIn(required, [row('r1', { 'f-name': 'A' }), gone]).rows).toBe(0)
  })

  it('counts rows with no picture only where there is a picture column', () => {
    expect(gapsIn(required, [row('r1', { 'f-name': 'A' })]).pictureless).toBe(1)
    expect(gapsIn(table([NAME]), [row('r1', {})]).pictureless).toBe(0)
  })

  it('offers the fixing job only when a REQUIRED cell is empty', () => {
    /* a row with no picture is not "missing" — that is the pictures
       job, and conflating the two is how one count starts standing
       for two different problems */
    expect(idsOf(required, [row('r2', { 'f-cash': 1 })])).toContain('missing')
    expect(idsOf(required, [row('r1', { 'f-name': 'A' })])).not.toContain('missing')
  })
})

describe('the order, and the sheet last', () => {
  it('puts the spreadsheet at the end, because it is a destination and not a punishment', () => {
    const ids = idsOf(table([NAME, CASH, PIC]), [row('r1', { 'f-name': 'A' })])
    expect(ids.at(-1)).toBe('sheet')
  })

  it('says what the sheet is, plainly', () => {
    const jobs = jobsFor({ entity: table([NAME]), rows: [], noun: NOUN })
    expect(jobs.at(-1)?.say).toMatch(/nothing is hidden from you/i)
  })
})

describe('the nouns are the dealership own words', () => {
  it('counts in the table own word, so a motorcycle shop reads bikes', () => {
    const bikes = { one: 'bike', many: 'bikes' }
    const jobs = jobsFor({
      entity: table([NAME, PIC]),
      rows: [row('r1', { 'f-name': 'A' })],
      noun: bikes,
    })
    expect(jobs.find((j) => j.id === 'add')?.name).toBe('Add a bike')
    expect(jobs.find((j) => j.id === 'pictures')?.say).toBe('1 bike with no picture')
  })

  it('writes the line under the name out of what is true of this table', () => {
    const priced = table([NAME, CASH, PIC])
    const said = tableSay({
      entity: priced,
      rows: [row('r1', { 'f-name': 'A', 'f-pic': 'p.jpg' }), row('r2', { 'f-name': 'B' })],
      noun: NOUN,
      seriesCount: 3,
    })
    expect(said).toBe('2 boats in 3 series. Pictures on 1 of them, prices are set.')
  })

  it('SAYS NOTHING ABOUT PICTURES WHERE THERE IS NO PICTURE COLUMN, because a sentence that lists what is absent is a complaint', () => {
    const said = tableSay({
      entity: table([NAME]),
      rows: [row('r1', { 'f-name': 'A' })],
      noun: NOUN,
    })
    expect(said).toBe('1 boat.')
  })
})
