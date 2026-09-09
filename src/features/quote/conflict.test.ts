/* ============================================================
   THE TWO SHEET BUILDERS, WHICH HAD NEVER BEEN RUN BY A TEST.

   `conflict.ts` has shipped since it was written with no suite of
   its own. `levelConflict` is live — the rung control on the price
   bar and on the editor both go through it, and `QuoteBuild`'s
   Accept commits what it previewed. `optionConflict` is the channel
   that fires the day a dealer writes a runnable rule.

   WHAT THIS SUITE IS ACTUALLY FOR is the sentence in that file's own
   header: *"a preview computed by a second copy of that arithmetic
   is a preview that can disagree with the act it is previewing. One
   function, called by both."* That is a claim about two pieces of
   code agreeing, and it is exactly the kind of claim that is true on
   the day it is written and quietly false a month later. So the
   third test below does not check `to` against a number somebody
   typed here — it applies `repricedAt` the way `setLevel` does and
   totals the result the way the price bar does, and requires the
   sheet's proposed figure to be that. Change either side alone and
   this fails.

   The rest are the three reasons a line HOLDS, which are the
   sentences a person reads and the only place the app explains why a
   rung did not reach a line, and the arithmetic of a removal.

   Pure functions, no store, no React — the same purity the file
   under test keeps.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { deltaSay, levelConflict, optionConflict, type Fix, type LineValues } from './conflict'
import { money, repricedAt } from './pricing'
import { quoteTotals } from './totals'
import type { FrozenLevel, QuoteAdjustment, QuoteDef, QuoteLine } from './types'

/* ---------------------------------------------------------- */
/* A quote, by value — the only kind there is                  */
/* ---------------------------------------------------------- */

const rung = (
  key: string,
  label: string,
  value: number | null,
  scope: 'quote' | 'line' = 'quote',
): FrozenLevel => ({ key, label, fieldId: `fld_${key}`, value, scope })

/** A line priced at `at`, carrying every rung its table has. The
 *  frozen fields are set from the rung the line is on, exactly as
 *  `priceAtLevel` would have set them at pick time. */
function ln(id: string, label: string, levels: FrozenLevel[], at: string): QuoteLine {
  const on = levels.find((l) => l.key === at)
  return {
    id,
    entityId: 'tbl_x',
    rowId: `row_${id}`,
    label,
    qty: 1,
    unitPrice: on ? on.value : null,
    priceFieldId: on ? on.fieldId : null,
    priceColumnName: on ? on.label : null,
    levelKey: at,
    levelResolved: on ? on.key : at,
    levels,
  }
}

function quote(lines: QuoteLine[], adjustments: QuoteAdjustment[] = []): QuoteDef {
  return {
    id: 'q1',
    reference: '20260909-01',
    state: 'draft',
    viewId: 'view_1',
    rootTableId: 'tbl_boats',
    rootRowId: 'row_1',
    subjectLabel: 'Highfield SP 560',
    subjectSpecs: [],
    sections: [{ blockId: '__subject', tableId: 'tbl_boats', title: 'Boats', lineIds: [] }],
    lines,
    adjustments,
    levelKey: 'cash',
    customer: { name: '' },
    createdAt: new Date(2026, 8, 9).toISOString(),
    updatedAt: new Date(2026, 8, 9).toISOString(),
  }
}

/** A hull that carries both rungs — the ordinary line, the one that
 *  simply re-prices. */
const hull = (): QuoteLine =>
  ln('l-hull', 'Highfield SP 560', [rung('cash', 'Cash', 62_000), rung('trade', 'Trade', 58_000)], 'cash')

/** A motor whose table has a cash column and no trade one. */
const motor = (): QuoteLine =>
  ln('l-motor', 'Yamaha F150XC', [rung('cash', 'Cash', 29_000)], 'cash')

/** A part somebody switched to its own rung by hand. */
const fitted = (): QuoteLine =>
  ln(
    'l-part',
    'Rigging kit',
    [rung('cash', 'Cash', 400), rung('trade', 'Trade', 380), rung('fitted', 'Fitted', 600, 'line')],
    'fitted',
  )

/** A line off a table with no price column at all. */
const unpriced = (): QuoteLine => ln('l-free', 'Delivery to Cairns', [], 'cash')

/* ---------------------------------------------------------- */
/* THE LEVEL                                                   */
/* ---------------------------------------------------------- */

describe('levelConflict — nothing to decide', () => {
  it('says nothing when the rung asked for is the rung it is on', () => {
    expect(levelConflict(quote([hull()]), 'cash', 'Cash')).toBeNull()
  })

  it('says nothing on a quote with no lines', () => {
    expect(levelConflict(quote([]), 'trade', 'Trade')).toBeNull()
  })

  /* A SHEET THAT OPENS TO SAY "NOTHING HAPPENS" IS A FULL STOP IN
     THE MIDDLE OF SOMEBODY'S WORK — the file's own words. Both rungs
     price this line at the same figure, so it moves into neither
     list and there is no sheet. */
  it('says nothing when every line carries the rung and no figure moves', () => {
    const flat = ln('l-flat', 'Bilge pump', [rung('cash', 'Cash', 500), rung('trade', 'Trade', 500)], 'cash')
    expect(levelConflict(quote([flat]), 'trade', 'Trade')).toBeNull()
  })
})

describe('levelConflict — what moves and what holds', () => {
  const sheet = () => levelConflict(quote([hull(), motor(), fitted(), unpriced()]), 'trade', 'Trade')

  it('puts the line that re-prices in `changed`, with both columns named', () => {
    const c = sheet()
    expect(c?.changed.map((r) => r.lineId)).toEqual(['l-hull'])
    const row = c?.changed[0]
    expect(row?.fromColumn).toBe('Cash')
    expect(row?.from).toBe(62_000)
    expect(row?.toColumn).toBe('Trade')
    expect(row?.to).toBe(58_000)
    /* a line that simply re-prices writes no sentence */
    expect(row?.why).toBe('')
  })

  /* THE THREE REASONS A LINE HOLDS. Each is a sentence a person
     reads on the sheet, and this is the only place the app explains
     why a rung did not reach a line. */
  it('holds the hand-priced line and names the column the person chose', () => {
    const held = sheet()?.held.find((r) => r.lineId === 'l-part')
    expect(held?.why).toBe('priced by hand at Fitted')
    /* and it does not move: `repricedAt` returns a pinned line untouched */
    expect(held?.from).toBe(600)
    expect(held?.to).toBe(600)
  })

  it('holds the line whose table has no such column, naming the one it keeps', () => {
    const held = sheet()?.held.find((r) => r.lineId === 'l-motor')
    expect(held?.why).toBe('no Trade column — stays at Cash')
    expect(held?.to).toBe(29_000)
  })

  it('holds the line with no price column at all, and says that instead', () => {
    const held = sheet()?.held.find((r) => r.lineId === 'l-free')
    expect(held?.why).toBe('no price column on this table')
    expect(held?.toColumn).toBe('')
    /* null is a real state and is never rendered as 0 */
    expect(held?.to).toBeNull()
  })

  it('names the rung in the title and in what Accept does', () => {
    const c = sheet()
    expect(c?.title).toBe('Pricing at Trade changes one line.')
    expect(c?.accept).toBe('Price it at Trade')
    expect(c?.id).toBe('level:trade')
  })

  it('counts the lines rather than saying "one" for all of them', () => {
    const second = ln('l-two', 'NSM 4.8m', [rung('cash', 'Cash', 4_240), rung('trade', 'Trade', 4_000)], 'cash')
    const c = levelConflict(quote([hull(), second]), 'trade', 'Trade')
    expect(c?.title).toBe('Pricing at Trade changes 2 lines.')
  })
})

describe('levelConflict — the arithmetic, and the act it previews', () => {
  it('shows the committed total as `from` and never moves it', () => {
    const q = quote([hull(), motor(), fitted(), unpriced()])
    expect(levelConflict(q, 'trade', 'Trade')?.from).toBe(quoteTotals(q).total)
  })

  /* THE CLAIM IN THE FILE'S HEADER, CHECKED. `to` is not compared
     against a figure typed in this test: it is compared against what
     `setLevel` would actually leave on the document, computed the
     way the price bar computes it. One function called by both is a
     property, and this is the property. */
  it('proposes exactly the total the act would produce', () => {
    const q = quote([hull(), motor(), fitted(), unpriced()], [
      { id: 'a1', kind: 'discount', label: 'Boat show', amount: -1_500 },
    ])
    const previewed = levelConflict(q, 'trade', 'Trade')

    const committed: QuoteDef = { ...q, levelKey: 'trade', lines: q.lines.map((l) => repricedAt(l, 'trade')) }

    expect(previewed?.to).toBe(quoteTotals(committed).total)
    expect(previewed?.delta).toBe(quoteTotals(committed).total - quoteTotals(q).total)
    /* the hull is the only line that moves, so the delta is its move
       and the discount cancels out of both sides */
    expect(previewed?.delta).toBe(-4_000)
  })

  it('carries the adjustments into the proposed total rather than dropping them', () => {
    const withDiscount = quote([hull()], [
      { id: 'a1', kind: 'discount', label: 'Boat show', amount: -1_500 },
    ])
    expect(levelConflict(withDiscount, 'trade', 'Trade')?.to).toBe(58_000 - 1_500)
  })

  /* An adjustment somebody left mid-edit is not a number. `NaN`
     added to a total is a total that reads NaN on a customer's
     screen, and both sides of the sheet skip it. */
  it('skips an adjustment that is not a finite number', () => {
    const broken = quote([hull()], [
      { id: 'a1', kind: 'line', label: '', amount: Number.NaN },
    ])
    expect(levelConflict(broken, 'trade', 'Trade')?.to).toBe(58_000)
  })
})

/* ---------------------------------------------------------- */
/* THE OPTION                                                  */
/* ---------------------------------------------------------- */

/** What the surface hands in: the values one line already on the
 *  quote holds, on the columns the rules in force reach. */
const holding = (line: QuoteLine, cells: LineValues['cells']): LineValues => ({ line, cells })

const nothingBlocked = () => undefined

describe('optionConflict — when it finds nothing', () => {
  it('returns no removals and no sheet when no held value is blocked', () => {
    const q = quote([hull()])
    const out = optionConflict(
      q,
      { label: 'tandem axle', amount: 6_480 },
      [holding(hull(), [{ fieldId: 'f_series', where: 'Series', value: 'Highfield' }])],
      nothingBlocked,
      [],
    )
    expect(out.removals).toEqual([])
    expect(out.conflict).toBeNull()
  })

  it('finds nothing when the quote holds no values the rules reach', () => {
    const out = optionConflict(
      quote([hull()]),
      { label: 'tandem axle', amount: 6_480 },
      [holding(hull(), [])],
      () => ({ because: 'never asked' }),
      [],
    )
    expect(out.removals).toEqual([])
    expect(out.conflict).toBeNull()
  })
})

describe('optionConflict — what the pick would remove', () => {
  const because = "this trailer's series is built for Stacer"

  it("reads the rule's own sentence rather than writing one", () => {
    const out = optionConflict(
      quote([hull()]),
      { label: 'NSM tandem', amount: 6_480 },
      [holding(hull(), [{ fieldId: 'f_series', where: 'Series', value: 'Highfield' }])],
      (fieldId) => (fieldId === 'f_series' ? { because } : undefined),
      [],
    )
    expect(out.removals).toHaveLength(1)
    expect(out.removals[0]).toMatchObject({
      lineId: 'l-hull',
      label: 'Highfield SP 560',
      amount: 62_000,
      where: 'Series',
      value: 'Highfield',
      because,
    })
  })

  it('formats the removed value the way the register prints it', () => {
    const out = optionConflict(
      quote([hull()]),
      { label: 'tandem axle', amount: 0 },
      [holding(hull(), [{ fieldId: 'f_len', where: 'Length', value: 5.6 }])],
      () => ({ because }),
      [],
    )
    expect(out.removals[0].value).toBe('5.6')
  })

  /* ONE REMOVAL PER LINE, NOT ONE PER BLOCKED CELL. A hull blocked
     on both its series and its length is one thing coming off the
     quote, and a sheet that listed it twice would price it twice —
     `lost` sums the removals. This is the `break` in the loop, and
     nothing has ever checked it. */
  it('reports a line once however many of its values are blocked', () => {
    const out = optionConflict(
      quote([hull()]),
      { label: 'tandem axle', amount: 0 },
      [
        holding(hull(), [
          { fieldId: 'f_series', where: 'Series', value: 'Highfield' },
          { fieldId: 'f_len', where: 'Length', value: 5.6 },
        ]),
      ],
      () => ({ because }),
      [],
    )
    expect(out.removals).toHaveLength(1)
    expect(out.removals[0].where).toBe('Series')
  })

  it('counts the lines in the sentence and names the pick in Accept', () => {
    const one = optionConflict(
      quote([hull(), motor()]),
      { label: 'NSM tandem', amount: 6_480 },
      [holding(hull(), [{ fieldId: 'f', where: 'Series', value: 'Highfield' }])],
      () => ({ because }),
      [],
    )
    expect(one.conflict?.title).toBe('Adding NSM tandem takes a line off this quote.')
    expect(one.conflict?.accept).toBe('Add NSM tandem')
    expect(one.conflict?.id).toBe('option:NSM tandem')

    const two = optionConflict(
      quote([hull(), motor()]),
      { label: 'NSM tandem', amount: 6_480 },
      [
        holding(hull(), [{ fieldId: 'f', where: 'Series', value: 'Highfield' }]),
        holding(motor(), [{ fieldId: 'f', where: 'Shaft', value: 'Long' }]),
      ],
      () => ({ because }),
      [],
    )
    expect(two.conflict?.title).toBe('Adding NSM tandem takes 2 lines off this quote.')
  })
})

describe('optionConflict — the arithmetic', () => {
  const blocked = () => ({ because: 'built for Stacer' })
  const onQuote = () => [holding(hull(), [{ fieldId: 'f', where: 'Series', value: 'Highfield' }])]

  /* LEAVING THE THING OFF IS A REAL ANSWER and the arithmetic says
     so: what comes off, what goes on, and no fix. */
  it('takes the removal off and puts the pick on when no alternative survives', () => {
    const q = quote([hull(), motor()])
    const out = optionConflict(q, { label: 'NSM tandem', amount: 6_480 }, onQuote(), blocked, [])
    expect(out.conflict?.from).toBe(91_000)
    expect(out.conflict?.to).toBe(91_000 - 62_000 + 6_480)
    expect(out.conflict?.delta).toBe(6_480 - 62_000)
  })

  /* THE CHEAPEST SURVIVING ALTERNATIVE SETS THE PROPOSED TOTAL,
     which is what lets the sheet pre-select it the way Porsche
     does. */
  it('prices the cheapest surviving alternative into the total', () => {
    const fixes: Fix[] = [
      { label: 'Stacer 449 Outlaw', amount: 41_000 },
      { label: 'Stacer 429 Proline', amount: 38_500 },
    ]
    const out = optionConflict(
      quote([hull(), motor()]),
      { label: 'NSM tandem', amount: 6_480 },
      onQuote(),
      blocked,
      fixes,
    )
    expect(out.conflict?.to).toBe(91_000 - 62_000 + 6_480 + 38_500)
  })

  it('ignores an alternative with no price when choosing the cheapest', () => {
    const fixes: Fix[] = [
      { label: 'Ring the supplier', amount: null },
      { label: 'Stacer 449 Outlaw', amount: 41_000 },
    ]
    const out = optionConflict(
      quote([hull(), motor()]),
      { label: 'NSM tandem', amount: 6_480 },
      onQuote(),
      blocked,
      fixes,
    )
    expect(out.conflict?.to).toBe(91_000 - 62_000 + 6_480 + 41_000)
  })

  it('treats an unpriced pick as no money rather than as zero dollars asserted', () => {
    const out = optionConflict(
      quote([hull(), motor()]),
      { label: 'Hitch kit', amount: null },
      onQuote(),
      blocked,
      [],
    )
    expect(out.conflict?.to).toBe(91_000 - 62_000)
  })

  it('loses nothing for a removal that had no price', () => {
    const q = quote([hull(), unpriced()])
    const out = optionConflict(
      q,
      { label: 'Hitch kit', amount: 610 },
      [holding(unpriced(), [{ fieldId: 'f', where: 'Series', value: 'Highfield' }])],
      blocked,
      [],
    )
    expect(out.removals[0].amount).toBeNull()
    expect(out.conflict?.to).toBe(62_000 + 610)
  })
})

/* ---------------------------------------------------------- */
/* THE SIGN                                                    */
/* ---------------------------------------------------------- */

describe('deltaSay', () => {
  /* Compared against `money` rather than against a typed string:
     grouping and the minus glyph belong to `@/lib/money`, and a test
     that re-types them here would pin this file to a locale. */
  it('always shows the plus on a figure that goes up', () => {
    expect(deltaSay(2_690)).toBe(`+${money(2_690)}`)
  })

  it('leaves a figure that goes down to money’s own minus', () => {
    expect(deltaSay(-4_120)).toBe(money(-4_120))
  })

  it('signs nothing at all when nothing moves', () => {
    expect(deltaSay(0)).toBe(money(0))
  })
})
