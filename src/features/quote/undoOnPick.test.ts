/* ============================================================
   THE UNDO ON A PICK, PRESSED.

   `DECISIONS.md` §1 settled that a pick with no surviving
   alternative gets a toast with UNDO, and that the toast is raised
   after Accept as well. The dangerous half of that decision is not
   the sentence — it is the button. **A toast with an UNDO that does
   not undo is worse than no toast**, because it is a promise made at
   the one moment a person has stopped watching the total.

   So this suite does not assert that a note was raised. It PRESSES
   THE BUTTON and reads the document afterwards.

   WHY THAT NEEDED SAYING TWICE. `sayUndoable` — the helper every
   other feature in this app uses for rule 9 — pins a `HistoryEntry`
   off `useProjectStore().past`, and a quote is not in that stack.
   Wired here it would have offered to undo a pick and undone the
   last unrelated project step instead, or drawn no button at all.
   Nothing in `quotes.ts` calls it, and the three cases below are
   what standing on the act's own inverse buys instead.

   HOW A TOAST IS HEARD WITHOUT A SCREEN. `say` is a bus, not a
   store: `onSaid` is what the host at the app root subscribes with,
   and it is all a test needs. No React, no DOM, node project.
   ============================================================ */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { onSaid, type Note } from '@/store/notes'
import {
  addLine,
  forgetQuotes,
  getQuote,
  registerQuote,
  removeLine,
  setLevel,
  setLineLevel,
} from './quotes'
import { money } from './pricing'
import type { FrozenLevel, QuoteDef, QuoteLine } from './types'

/* ---------------------------------------------------------- */
/* Listening                                                   */
/* ---------------------------------------------------------- */

let heard: Note[] = []
let stop: (() => void) | undefined

beforeEach(() => {
  heard = []
  stop = onSaid((n) => heard.push(n))
})

afterEach(() => {
  stop?.()
  forgetQuotes()
})

/** The last note that carried a button — the offer a person would
 *  actually be able to press. */
const offer = (): Note => {
  const withAct = heard.filter((n) => n.act !== undefined)
  expect(withAct.length).toBeGreaterThan(0)
  return withAct[withAct.length - 1]
}

const said = (): string[] => heard.map((n) => n.text)

/* ---------------------------------------------------------- */
/* A quote                                                     */
/* ---------------------------------------------------------- */

const rung = (
  key: string,
  label: string,
  value: number | null,
  scope: 'quote' | 'line' = 'quote',
): FrozenLevel => ({ key, label, fieldId: `fld_${key}`, value, scope })

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

const hull = (): QuoteLine =>
  ln('l-hull', 'Highfield SP 560', [rung('cash', 'Cash', 62_000), rung('trade', 'Trade', 58_000)], 'cash')

/** A motor whose table carries no trade column — the line a level
 *  change cannot reach, and the one an undo must put back on the
 *  column it really used. */
const motor = (): QuoteLine =>
  ln('l-motor', 'Yamaha F150XC', [rung('cash', 'Cash', 29_000)], 'cash')

function seed(state: QuoteDef['state'] = 'draft'): QuoteDef {
  const q: QuoteDef = {
    id: 'q1',
    reference: '20260909-01',
    state,
    viewId: 'view_1',
    rootTableId: 'tbl_boats',
    rootRowId: 'row_1',
    subjectLabel: 'Highfield SP 560',
    subjectSpecs: [],
    sections: [
      { blockId: '__subject', tableId: 'tbl_boats', title: 'Boats', lineIds: ['l-hull'] },
      { blockId: 'blk_motor', tableId: 'tbl_motors', title: 'Motors', lineIds: [] },
    ],
    lines: [hull()],
    adjustments: [],
    levelKey: 'cash',
    customer: { name: '' },
    createdAt: new Date(2026, 8, 9).toISOString(),
    updatedAt: new Date(2026, 8, 9).toISOString(),
  }
  registerQuote(q)
  heard = []
  return q
}

/* ---------------------------------------------------------- */
/* PUTTING ONE ON — the defect DECISIONS.md §1 named             */
/* ---------------------------------------------------------- */

describe('addLine says what it did and offers the way back', () => {
  it('names the item and the amount, as the playbook asks', () => {
    seed()
    addLine('q1', 'blk_motor', motor())
    expect(said()).toEqual([`Yamaha F150XC put on the quote · ${money(29_000)}`])
  })

  it('says the line has no price rather than printing a zero', () => {
    seed()
    addLine('q1', 'blk_motor', ln('l-free', 'Delivery to Cairns', [], 'cash'))
    expect(said()[0]).toBe('Delivery to Cairns put on the quote · no price on it')
  })

  /* THE WHOLE POINT. The button is pressed, and the document is
     read afterwards — the line off the quote AND off its section,
     which are two writes and were two chances to leave a dangling
     id behind. */
  it('takes the line back off when UNDO is pressed', () => {
    seed()
    addLine('q1', 'blk_motor', motor())
    expect(getQuote('q1')?.lines.map((l) => l.id)).toEqual(['l-hull', 'l-motor'])

    offer().act?.onPick()

    const back = getQuote('q1')
    expect(back?.lines.map((l) => l.id)).toEqual(['l-hull'])
    expect(back?.sections[1].lineIds).toEqual([])
    expect(said()).toContain('Yamaha F150XC is off the quote again')
  })

  /* THE UNDO IS THE RAW WRITE AND NOT `removeLine`, which would
     raise its own toast offering to undo the undo. One press, one
     confirmation, and no second button. */
  it('does not chain a second offer off the undo', () => {
    seed()
    addLine('q1', 'blk_motor', motor())
    offer().act?.onPick()
    expect(heard.filter((n) => n.act !== undefined)).toHaveLength(1)
    expect(said()).not.toContain('Yamaha F150XC taken off the quote')
  })

  it('is harmless when the line has already been taken off by hand', () => {
    seed()
    addLine('q1', 'blk_motor', motor())
    const note = offer()
    removeLine('q1', 'l-motor')
    heard = []

    note.act?.onPick()
    expect(getQuote('q1')?.lines.map((l) => l.id)).toEqual(['l-hull'])
    expect(said()).toEqual([])
  })

  /* A NOTE REPORTS A WRITE THAT HAPPENED. `mutate` refuses an issued
     quote, so a toast here would announce a line that is not on the
     document — the exact failure `quotes.ts`'s header records
     production shipping ("refuses the edit, toasts Saved"). */
  it('says nothing at all when the quote has been issued', () => {
    seed('issued')
    addLine('q1', 'blk_motor', motor())
    expect(said()).toEqual([])
    expect(getQuote('q1')?.lines).toHaveLength(1)
  })
})

/* ---------------------------------------------------------- */
/* TAKING ONE OFF — unchanged, except that it names the amount */
/* ---------------------------------------------------------- */

describe('removeLine still puts the line back, by value', () => {
  it('names the amount now, the same shape as putting one on', () => {
    seed()
    removeLine('q1', 'l-hull')
    expect(said()[0]).toBe(`Highfield SP 560 taken off the quote · ${money(62_000)}`)
  })

  it('restores the frozen line to the position it held', () => {
    seed()
    addLine('q1', 'blk_motor', motor())
    heard = []
    removeLine('q1', 'l-hull')
    offer().act?.onPick()

    const back = getQuote('q1')
    expect(back?.lines.map((l) => l.id)).toEqual(['l-hull', 'l-motor'])
    expect(back?.sections[0].lineIds).toEqual(['l-hull'])
    expect(back?.lines[0].unitPrice).toBe(62_000)
  })
})

/* ---------------------------------------------------------- */
/* ACCEPT — DECISIONS.md §1's third clause                     */
/* ---------------------------------------------------------- */

describe('setLevel raises the toast the sheet’s Accept needs', () => {
  it('names the rung in the business’s own word, not the key', () => {
    seed()
    setLevel('q1', 'trade')
    expect(said()).toEqual(['Priced at Trade'])
  })

  it('says nothing when the quote is already on that rung', () => {
    seed()
    setLevel('q1', 'cash')
    expect(said()).toEqual([])
  })

  /* THE FIGURES GO BACK TO THE FROZEN ONES, not to a recomputed
     guess — including the motor, whose table has no trade column and
     which must land back on the column it really used. */
  it('puts every line back on the figure it carried', () => {
    seed()
    addLine('q1', 'blk_motor', motor())
    heard = []

    setLevel('q1', 'trade')
    expect(getQuote('q1')?.lines[0].unitPrice).toBe(58_000)
    expect(getQuote('q1')?.lines[0].levelKey).toBe('trade')

    offer().act?.onPick()

    const back = getQuote('q1')
    expect(back?.levelKey).toBe('cash')
    expect(back?.lines[0].unitPrice).toBe(62_000)
    expect(back?.lines[0].priceColumnName).toBe('Cash')
    expect(back?.lines[0].levelKey).toBe('cash')
    expect(back?.lines[1].unitPrice).toBe(29_000)
    expect(back?.lines[1].levelResolved).toBe('cash')
    expect(said()).toContain('Priced at Cash again')
  })

  /* AN UNDO MUST NOT THROW AWAY WORK DONE AFTER THE ACT IT UNDOES —
     the lie `notes.ts` was written to prevent. The motor was picked
     while the note stood: it stays, and it is priced at the rung the
     quote goes back to rather than left behind at the other one. */
  it('keeps a line added while the note was standing', () => {
    seed()
    setLevel('q1', 'trade')
    addLine('q1', 'blk_motor', motor())
    const levelNote = heard.filter((n) => n.act !== undefined)[0]

    levelNote.act?.onPick()

    const back = getQuote('q1')
    expect(back?.lines.map((l) => l.id)).toEqual(['l-hull', 'l-motor'])
    expect(back?.levelKey).toBe('cash')
    expect(back?.lines[1].levelKey).toBe('cash')
  })

  it('does nothing when the rung has moved on since', () => {
    seed()
    setLevel('q1', 'trade')
    const note = offer()
    setLevel('q1', 'cash')
    heard = []

    note.act?.onPick()
    expect(said()).toEqual([])
  })
})

/* ---------------------------------------------------------- */
/* THE REFUSAL, SAID WHERE IT HAPPENS                          */
/* ---------------------------------------------------------- */

describe('an UNDO pressed on a quote that has since been issued', () => {
  it('says why rather than silently doing nothing', () => {
    seed()
    addLine('q1', 'blk_motor', motor())
    const note = offer()

    /* the only way to reach this: the quote goes to the customer
       with the note still up */
    const now = getQuote('q1') as QuoteDef
    registerQuote({ ...now, state: 'issued' })
    heard = []

    note.act?.onPick()
    expect(said()).toEqual([
      'This quote has been given to the customer, so nothing can go back on it. Make a new version to change it.',
    ])
    expect(heard[0].tone).toBe('warn')
    expect(getQuote('q1')?.lines).toHaveLength(2)
  })

  it('says so when the quote is gone entirely', () => {
    seed()
    addLine('q1', 'blk_motor', motor())
    const note = offer()
    forgetQuotes()
    heard = []

    note.act?.onPick()
    expect(said()).toEqual(['That quote is no longer here.'])
  })
})

/* ---------------------------------------------------------- */
/* ONE LINE, RE-PRICED — the pick that was still silent          */
/* ---------------------------------------------------------- */

describe('setLineLevel says what it did, like setLevel one level up', () => {
  /* CONFIGURATOR §C: every pick is a toast with UNDO, never a
     confirmation. `setLevel` re-prices the whole quote and has
     toasted since it was written; this re-prices ONE line and said
     nothing at all — so moving a hull from Cash to Trade changed a
     figure a customer is about to be handed, silently, with no way
     back but remembering which rung it had been on. */

  it('NAMES THE LINE AND THE RUNG, in the business’s own word', () => {
    seed()
    setLineLevel('q1', 'l-hull', 'trade')
    expect(offer().text).toBe('Highfield SP 560 priced at Trade')
    expect(getQuote('q1')?.lines[0].unitPrice).toBe(58_000)
  })

  it('PUTS THE LINE BACK ON THE FIGURE IT CARRIED when UNDO is pressed', () => {
    seed()
    setLineLevel('q1', 'l-hull', 'trade')
    offer().act?.onPick()

    const line = getQuote('q1')?.lines[0]
    expect(line?.levelResolved).toBe('cash')
    expect(line?.unitPrice).toBe(62_000)
    expect(said().at(-1)).toBe('Highfield SP 560 is priced at Cash again')
  })

  it('says nothing when the line is already on that rung', () => {
    seed()
    setLineLevel('q1', 'l-hull', 'cash')
    expect(said()).toEqual([])
  })

  it('does not chain a second offer off the undo', () => {
    /* The way back is an answer, not a new act to reverse — the same
       rule the three acts above keep. */
    seed()
    setLineLevel('q1', 'l-hull', 'trade')
    const first = offer()
    first.act?.onPick()
    expect(heard.filter((n) => n.act !== undefined)).toHaveLength(1)
  })

  it('is harmless when the line has gone since the note was raised', () => {
    /* Putting a price back on a line that is off the quote would be
       writing to nothing. */
    seed()
    setLineLevel('q1', 'l-hull', 'trade')
    const note = offer()
    removeLine('q1', 'l-hull')
    note.act?.onPick()
    expect(getQuote('q1')?.lines).toHaveLength(0)
  })

  it('says nothing at all on a quote that has been issued', () => {
    seed('issued')
    setLineLevel('q1', 'l-hull', 'trade')
    expect(said()).toEqual([])
    expect(getQuote('q1')?.lines[0].unitPrice).toBe(62_000)
  })
})
