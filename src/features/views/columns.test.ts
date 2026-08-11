/* ============================================================
   Reading a column name the way its author wrote it.

   Two pieces of this file are load-bearing and both fail SILENTLY.

   splitUnit peels a unit off the end of a name. Its trap is that
   most unit symbols are also the last letters of ordinary words:
   the module's own comment names "Beam" → "Bea" + "m" as the thing
   it must never do. A regression here does not throw, it just
   renames a column on a spec plate.

   rangePairs is what makes an envelope an envelope — a Min/Max
   column pair recognised as ONE fact with two ends. If it stops
   pairing, fitment stops offering the between-rule and nothing
   anywhere reports an error.

   The column names below are the ones this module and
   src/types/model.ts already document ("Beam", "OA Length m",
   "Min HP"/"Max HP"); the rest are obviously synthetic.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, FieldDef, FieldType, ImageRef } from '@/types/model'
import {
  defaultColumns,
  formatCell,
  formatNumber,
  formatRange,
  normColumn,
  rangePairs,
  splitUnit,
} from './columns'

const field = (id: string, name: string, type: FieldType): FieldDef => ({ id, name, type })

const table = (fields: FieldDef[]): EntityDef => ({
  id: 'table-a',
  name: 'Table A',
  accent: 'blue',
  fields,
  position: { x: 0, y: 0 },
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
})

describe('splitUnit', () => {
  it('never eats the last letter of a word — "Beam" is not "Bea" + m', () => {
    expect(splitUnit('Beam')).toEqual({ base: 'Beam' })
    expect(splitUnit('Trim')).toEqual({ base: 'Trim' })
    expect(splitUnit('Hull')).toEqual({ base: 'Hull' }) // not "Hul" + l
    expect(splitUnit('Draft')).toEqual({ base: 'Draft' }) // not "Dra" + ft
  })

  it('peels a unit that stands as its own word', () => {
    expect(splitUnit('OA Length m')).toEqual({ base: 'OA Length', unit: 'm' })
    expect(splitUnit('Boat Weight kg')).toEqual({ base: 'Boat Weight', unit: 'kg' })
    expect(splitUnit('Column 1 - mm')).toEqual({ base: 'Column 1', unit: 'mm' })
  })

  it('prefers the longer unit, so "cm" never reads as "m"', () => {
    expect(splitUnit('Column 1 cm')).toEqual({ base: 'Column 1', unit: 'cm' })
    expect(splitUnit('Column 1 km')).toEqual({ base: 'Column 1', unit: 'km' })
  })

  it('lets a symbol unit sit tight against the word, as people write it', () => {
    expect(splitUnit('Discount %')).toEqual({ base: 'Discount', unit: '%' })
    expect(splitUnit('Rake°')).toEqual({ base: 'Rake', unit: '°' })
  })

  it("keeps the author's own casing, because the business writes HP not hp", () => {
    expect(splitUnit('Column 1 HP').unit).toBe('HP')
    expect(splitUnit('Column 1 Kg').unit).toBe('Kg')
    expect(splitUnit('Column 1 l').unit).toBe('L') // the one exception: a lone l reads as L
  })

  it('never splits a name that is only a unit', () => {
    expect(splitUnit('HP')).toEqual({ base: 'HP' })
    expect(splitUnit('kg')).toEqual({ base: 'kg' })
  })
})

describe('normColumn', () => {
  it('makes a column identity that survives casing, punctuation and the unit', () => {
    expect(normColumn('OA Length m')).toBe(normColumn('OA_Length'))
    expect(normColumn('  Boat Weight kg ')).toBe('boat weight')
    expect(normColumn('Column-1')).toBe('column 1')
  })
})

describe('rangePairs', () => {
  it('pairs Min X with Max X into one envelope', () => {
    const pairs = rangePairs(
      table([
        field('f1', 'Min HP', 'number'),
        field('f2', 'Max HP', 'number'),
        field('f3', 'Column 1', 'text'),
      ]),
    )
    expect(pairs).toHaveLength(1)
    expect(pairs[0].key).toBe('hp')
    expect(pairs[0].label).toBe('HP')
    expect(pairs[0].min.id).toBe('f1')
    expect(pairs[0].max.id).toBe('f2')
  })

  it('pairs the trailing form too — "Column 1 Min" / "Column 1 Max"', () => {
    const pairs = rangePairs(
      table([field('f1', 'Column 1 Max', 'number'), field('f2', 'Column 1 Min', 'number')]),
    )
    expect(pairs).toHaveLength(1)
    expect(pairs[0].min.id).toBe('f2')
    expect(pairs[0].max.id).toBe('f1')
  })

  it('pairs across the unit and the wording, since both ends mean one column', () => {
    const pairs = rangePairs(
      table([
        field('f1', 'Minimum Column 1 kg', 'number'),
        field('f2', 'Maximum Column 1 kg', 'number'),
      ]),
    )
    expect(pairs).toHaveLength(1)
    expect(pairs[0].key).toBe('column 1')
  })

  it('refuses a half-open envelope — one end alone is not a range', () => {
    expect(rangePairs(table([field('f1', 'Min HP', 'number')]))).toEqual([])
    expect(
      rangePairs(table([field('f1', 'Min HP', 'number'), field('f2', 'Max Column 1', 'number')])),
    ).toEqual([])
  })

  it('never reads a word that merely starts with min/max as a bound', () => {
    expect(
      rangePairs(table([field('f1', 'Minor Column', 'number'), field('f2', 'Maximal Column', 'number')])),
    ).toEqual([])
    // 'Min' and 'Max' with nothing after them name no column at all
    expect(rangePairs(table([field('f1', 'Min', 'number'), field('f2', 'Max', 'number')]))).toEqual(
      [],
    )
  })

  it('only pairs columns that hold numbers', () => {
    expect(
      rangePairs(table([field('f1', 'Min HP', 'text'), field('f2', 'Max HP', 'text')])),
    ).toEqual([])
    // a calculated column is still a number, so it still pairs
    expect(
      rangePairs(table([field('f1', 'Min HP', 'formula'), field('f2', 'Max HP', 'number')])),
    ).toHaveLength(1)
  })
})

describe('formatting a cell', () => {
  it('prints a picture as nothing — never as the numeral 1', () => {
    const pictures: ImageRef[] = [{ id: 'i1', src: 'https://plates.invalid/x.jpg' }]
    expect(formatCell(field('f1', 'Column 1', 'image'), pictures)).toBe('')
    expect(formatCell(field('f1', 'Column 1', 'image'), [])).toBe('')
  })

  it('prints an empty cell as nothing, and yes/no as words', () => {
    expect(formatCell(field('f1', 'Column 1', 'text'), null)).toBe('')
    expect(formatCell(field('f1', 'Column 1', 'boolean'), true)).toBe('Yes')
    expect(formatCell(field('f1', 'Column 1', 'boolean'), false)).toBe('No')
  })

  it('marks a money column with a currency sign and leaves other numbers plain', () => {
    // grouping separators are the reader's locale, so only the sign is asserted
    expect(formatNumber(1234, 'RRP Price').startsWith('$')).toBe(true)
    expect(formatNumber(1234, 'Column 1').startsWith('$')).toBe(false)
    expect(formatNumber(Number.NaN, 'Column 1')).toBe('')
    expect(formatNumber(Number.POSITIVE_INFINITY, 'Column 1')).toBe('')
  })

  it('prints an envelope as one span, and a collapsed one as a single value', () => {
    expect(formatRange(90, 115)).toBe('90–115')
    expect(formatRange(90, 90)).toBe('90')
    expect(formatRange(null, 115)).toBe('115')
    expect(formatRange(null, null)).toBe('')
  })
})

describe('defaultColumns', () => {
  it('never repeats the name column, and puts the most telling columns first', () => {
    const entity = table([
      field('f1', 'Column 1', 'text'), // the display column by default
      field('f2', 'Column 2', 'date'),
      field('f3', 'Column 3', 'number'),
      field('f4', 'Column 4', 'select'),
    ])
    expect(defaultColumns(entity)).toEqual(['f3', 'f4', 'f2'])
    expect(defaultColumns(entity, 1)).toEqual(['f3'])
  })
})
