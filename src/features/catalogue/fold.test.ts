import { describe, expect, it } from 'vitest'
import type { IndexEntry } from '@/features/modules/read'
import { finishLevels, foldModels, materialOf, modelOf, priceOf } from './fold'

/* Every label, trail and code below is a real one off the Northside
   sheet. A fold tested on invented input proves nothing about the
   file it has to read. */

const entry = (over: Partial<IndexEntry> & { rowId: string }): IndexEntry => ({
  tableId: 'highfield',
  label: '',
  trail: '',
  branch: '',
  price: '',
  hay: '',
  ...over,
})

const ADV7 = ['B-G-B', 'B-G-LB', 'B-G-WB', 'B-W-WG', 'LG-G-MB', 'LG-W-LB', 'LG-W-WB']

const adv7 = ADV7.map((code, i) =>
  entry({
    rowId: `adv7-${i}`,
    label: `Highfield - ADV7 (HYP) ${code}`,
    trail: 'Adventure ▸ ADV7',
    branch: 'Adventure',
    price: '$105,930',
    amount: 105930,
    hay: `highfield - adv7 (hyp) ${code.toLowerCase()}`,
  }),
)
const adv7Leaves = new Map(ADV7.map((code, i) => [`highfield:adv7-${i}`, `HYP ${code}`]))

describe('modelOf', () => {
  it('takes the last level off a trail', () => {
    expect(modelOf('Adventure ▸ ADV7')).toBe('ADV7')
    expect(modelOf('Sport ▸ SP560')).toBe('SP560')
  })

  it('is the whole trail when there is only one level', () => {
    expect(modelOf('Anodes')).toBe('Anodes')
  })
})

describe('materialOf', () => {
  it('takes the brackets off but leaves the code alone', () => {
    expect(materialOf('HYP B-G-B')).toBe('HYP')
    expect(materialOf('(PVC) WH')).toBe('PVC')
    expect(materialOf('540 open (PVC) LG-W-DG')).toBe('540 open PVC')
  })
})

describe('finishLevels', () => {
  const table = { id: 'highfield', hierarchy: ['a', 'b', 'c'] } as never

  it('takes a level where most of its rows put a colourway', () => {
    expect(finishLevels([table], adv7Leaves).has('highfield')).toBe(true)
  })

  /* A MOTOR'S THIRD LEVEL IS A SHAFT AND A TRAILER'S IS A PLUG.
     Folding either into a card as though it were a colour is the
     thing this exists to prevent. */
  it('refuses a level that holds something else entirely', () => {
    const motors = new Map([
      ['highfield:1', 'F25SMHC'],
      ['highfield:2', 'T9.9XPB'],
      ['highfield:3', 'LF200XA'],
    ])
    expect(finishLevels([table], motors).has('highfield')).toBe(false)
  })

  /* The 121 Highfield rows whose code is I, O, R or WH read as
     nothing, and they are still finishes of the model they belong
     to — which is why the question is asked once per TABLE. */
  it('takes a level where a fifth of the codes are unreadable', () => {
    const mixed = new Map(adv7Leaves)
    mixed.set('highfield:x', 'HYP I-B-C')
    mixed.set('highfield:y', 'HYP O-G-DG')
    expect(finishLevels([table], mixed).has('highfield')).toBe(true)
  })
})

describe('foldModels', () => {
  const finishes = new Set(['highfield'])

  it('folds seven finishes of one boat into one model', () => {
    const models = foldModels(adv7, adv7Leaves, finishes)
    expect(models).toHaveLength(1)
    expect(models[0]?.name).toBe('ADV7')
    expect(models[0]?.series).toBe('Adventure')
    expect(models[0]?.offers).toHaveLength(7)
  })

  /* WITHOUT THE TABLE ON THE FINISH LIST, nothing folds — which is
     what keeps 209 motors a list of 209 motors. */
  it('leaves every row its own model where the level is not a finish', () => {
    expect(foldModels(adv7, adv7Leaves, new Set())).toHaveLength(7)
  })

  it('keeps the distinct materials, and only the distinct ones', () => {
    const both = [
      entry({ rowId: 'a', label: 'Highfield - RU230KAM (PVC) WH', trail: 'Roll-Up ▸ RU230KAM' }),
      entry({ rowId: 'b', label: 'Highfield - RU230KAM (HYP) WH', trail: 'Roll-Up ▸ RU230KAM' }),
      entry({ rowId: 'c', label: 'Highfield - RU230KAM (PVC) LG', trail: 'Roll-Up ▸ RU230KAM' }),
    ]
    const leaves = new Map([
      ['highfield:a', '(PVC) WH'],
      ['highfield:b', '(HYP) WH'],
      ['highfield:c', '(PVC) LG'],
    ])
    expect(foldModels(both, leaves, finishes)[0]?.materials).toEqual(['PVC', 'HYP'])
  })

  it('takes the first picture any of the finishes carries', () => {
    const shot = { id: 'img-adv7', src: 'https://example.test/adv7.jpg' }
    const withPic = adv7.map((e, i) => (i === 3 ? { ...e, img: shot } : e))
    expect(foldModels(withPic, adv7Leaves, finishes)[0]?.img).toBe(shot)
  })
})

describe('priceOf', () => {
  const finishes = new Set(['highfield'])

  /* ALL SEVEN ADV7 FINISHES ARE $105,930, so the card prints one
     figure and not a range of one number to itself. */
  it('is one figure when every finish costs the same', () => {
    const model = foldModels(adv7, adv7Leaves, finishes)[0]
    expect(model && priceOf(model)).toEqual({ say: '$105,930', spread: false })
  })

  it('is the cheapest, marked as a range, when they differ', () => {
    const spread = [
      entry({ rowId: 'a', trail: 'Roll-Up ▸ RU230KAM', price: '$5,320', amount: 5320 }),
      entry({ rowId: 'b', trail: 'Roll-Up ▸ RU230KAM', price: '$2,770', amount: 2770 }),
    ]
    const leaves = new Map([
      ['highfield:a', '(HYP) WH'],
      ['highfield:b', '(PVC) WH'],
    ])
    const model = foldModels(spread, leaves, finishes)[0]
    expect(model && priceOf(model)).toEqual({ say: '$2,770', spread: true })
  })

  it('says nothing when the table prices nothing', () => {
    const free = [entry({ rowId: 'a', label: 'Anodes', trail: '' })]
    const model = foldModels(free, new Map(), new Set())[0]
    expect(model && priceOf(model)).toEqual({ say: '', spread: false })
  })
})
