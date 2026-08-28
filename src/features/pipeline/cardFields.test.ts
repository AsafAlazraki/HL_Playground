/* ============================================================
   WHAT A CARD SHOWS — the arithmetic of the choice.

   Every function under test is pure and takes its inputs as
   arguments, so none of this needs a browser, a session or a
   store. What is checked is the handful of rules the picker would
   be quietly wrong about: that nothing stored means the DEFAULT
   rather than nothing at all, that the cap refuses in a sentence
   rather than swapping, that a refused press changes nothing, and
   that the last fact cannot be turned off.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import {
  CARD_CAP,
  CARD_FIELDS,
  DEFAULT_CARD_FIELDS,
  fieldsOf,
  parseFields,
  toggleField,
  whyNotField,
  type CardFieldId,
} from './cardFields'

describe('what a stored choice has to survive', () => {
  it('reads a good list back whole', () => {
    expect(parseFields(['reference', 'subject'])).toEqual(['reference', 'subject'])
  })

  it('drops an id this build no longer offers, and keeps the rest', () => {
    expect(parseFields(['reference', 'moonPhase', 'subject'])).toEqual([
      'reference',
      'subject',
    ])
  })

  it('drops a repeat rather than drawing the same fact twice', () => {
    expect(parseFields(['reference', 'reference'])).toEqual(['reference'])
  })

  it('gives up on anything that is not a list', () => {
    for (const junk of [null, undefined, 42, 'reference', { reference: true }]) {
      expect(parseFields(junk)).toEqual([])
    }
  })
})

describe('what the card actually draws', () => {
  /* THE DEFAULT IS THE CARD THIS BUILD ALREADY DREW. A narrower
     one would have deleted two facts from every existing board on
     the way to offering a choice. */
  it('is the default when nobody has chosen', () => {
    expect(fieldsOf([])).toEqual([...DEFAULT_CARD_FIELDS])
  })

  it('is in CARD_FIELDS order, not in the order they were pressed', () => {
    const order = CARD_FIELDS.map((f) => f.id)
    const picked: CardFieldId[] = ['by', 'reference']
    expect(fieldsOf(picked)).toEqual(
      order.filter((id) => picked.includes(id)),
    )
  })
})

describe('the cap says so rather than swapping', () => {
  const four = [...DEFAULT_CARD_FIELDS] as CardFieldId[]

  it('refuses a fifth with a sentence naming the cap and the fact', () => {
    const why = whyNotField(four, 'waiting')
    expect(why).toContain(String(CARD_CAP))
    expect(why).toContain('how long it has been here')
  })

  it('never refuses something already chosen', () => {
    expect(whyNotField(four, 'reference')).toBeNull()
  })

  it('never refuses while there is room', () => {
    expect(whyNotField(['reference'], 'waiting')).toBeNull()
  })

  /* A REFUSED PRESS CHANGES NOTHING. An app that quietly dropped
     one of somebody's four to make room has thrown away the choice
     the picker exists to offer. */
  it('leaves the choice untouched when it refuses', () => {
    expect(toggleField(four, 'waiting')).toEqual(four)
  })
})

describe('turning one on and off', () => {
  it('adds one when there is room, in CARD_FIELDS order', () => {
    expect(toggleField(['subject'], 'reference')).toEqual(['reference', 'subject'])
  })

  it('removes one that is on', () => {
    expect(toggleField(['reference', 'subject'], 'reference')).toEqual(['subject'])
  })

  /* A CARD SHOWING ONLY ITS CUSTOMER AND ITS MONEY is not a
     preference anybody meant to express; it is what you get by
     pressing the last control twice and wondering what broke. */
  it('will not remove the last one', () => {
    expect(toggleField(['reference'], 'reference')).toEqual(['reference'])
  })
})
