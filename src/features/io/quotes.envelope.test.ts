/* ============================================================
   A QUOTE LEAVES THE BROWSER AND COMES BACK SAYING THE SAME NUMBER.

   "Save a copy → Everything" wrote an envelope with keys kind,
   version, exportedAt, project, entities, groups, rules, rows, org,
   views, modules, constraints — and no quotes. The card's title said
   Everything and its subtitle listed four things; nothing on the panel
   named the absence. So the documented way to restore a backup —
   export, Clear Sheet, import — silently destroyed every quote a
   dealer had raised. Two of the three parts of that trip were already
   tested. The one that was not is the one that lost the money.

   WHY A QUOTE MAY TRAVEL AT ALL. Every field on a line is a VALUE: the
   number, the column it was read from, the level, the join's own facts
   and the photograph. So a round trip cannot re-price it — which is
   what these tests measure, by summing the same quote on both sides of
   the file with the SAME function the document prints from. A quote
   that travelled as ids and landed in a project with different price
   data would silently re-price a signed deal, and nothing on the page
   would say so.

   AND AN IMPORTED FILE IS UNTRUSTED. A quote carries photographs whose
   `src` goes straight into an `<img>` on a document, a state that
   decides whether the thing is editable, and figures that decide a
   total. Each of those is a test below, because each is a way a
   hand-edited or damaged file could either break a page or quietly
   change what a customer was told.
   ============================================================ */
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { RowData } from '@/types/model'

/* the subject is what crosses the file boundary, not what Dexie
   writes — the same door the other io tests use */
vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async (_snapshot: { rows: RowData[] }) => {},
    wipe: async () => {},
  },
}))

const { buildExportPayload } = await import('./exportPayload')
const { validateEnvelope } = await import('./envelope')
const { applyReplace } = await import('./apply')
const { summariseEnvelope } = await import('./readEnvelope')
const { sheetNow, quotesSurviveSentence } = await import('./sheetNow')
const { allQuotes, getQuote, registerQuote, quoteTotals } = await import('@/features/quote')

import type { QuoteDef, QuoteLine } from '@/features/quote'

/* ---------------------------------------------------------- */
/* two documents: one draft, one given to a customer           */
/* ---------------------------------------------------------- */

const PHOTO = {
  id: 'img_hull',
  src: 'https://northsidemarine.com.au/hull.jpg',
  alt: 'Highfield SP 560',
  w: 800,
  h: 600,
}

function line(over: Partial<QuoteLine> & Pick<QuoteLine, 'id' | 'label'>): QuoteLine {
  return {
    entityId: 'tbl_boats',
    rowId: 'row_hull',
    qty: 1,
    unitPrice: 0,
    priceFieldId: 'fld_cash',
    priceColumnName: 'Cash',
    levelKey: 'cash',
    levelResolved: 'cash',
    levels: [],
    ...over,
  }
}

const hull = line({
  id: 'ln_hull',
  label: 'Highfield SP 560',
  unitPrice: 62000,
  levels: [
    { key: 'cash', label: 'Cash', fieldId: 'fld_cash', value: 62000, scope: 'quote' },
    { key: 'trade', label: 'Trade', fieldId: 'fld_trade', value: 58000, scope: 'quote' },
  ],
  image: PHOTO,
  sourceNote: 'Boat Module!R282 KZ..LD',
})

const motor = line({
  id: 'ln_motor',
  label: 'Yamaha F150XC',
  entityId: 'tbl_motors',
  rowId: 'row_motor',
  pairRowId: 'row_pair',
  unitPrice: 29000,
  overridePrice: 24000,
  overrideReason: 'matched a written quote from another dealer',
  recommended: true,
  /* the five-way association, which is the thing production loses */
  pairFacts: [
    { label: 'Rigging kit', value: 'RK-150-A' },
    { label: 'Prop', value: '6E5-45947-00-EL' },
    { label: 'Slot', value: '1' },
  ],
})

function quoteFrom(id: string, state: 'draft' | 'issued', lines: QuoteLine[]): QuoteDef {
  return {
    id,
    reference: `Q-${id}`,
    state,
    viewId: 'view_boats',
    rootTableId: 'tbl_boats',
    rootRowId: 'row_hull',
    subjectLabel: 'Highfield SP 560',
    subjectSpecs: [{ label: 'Length', value: '5.6 m' }],
    subjectImage: PHOTO,
    sections: [
      {
        blockId: '__subject',
        tableId: 'tbl_boats',
        title: 'Boats',
        lineIds: lines.filter((l) => l.entityId === 'tbl_boats').map((l) => l.id),
      },
      {
        blockId: 'blk_motor',
        tableId: 'tbl_motors',
        title: 'Yamaha Outboards',
        lineIds: lines.filter((l) => l.entityId === 'tbl_motors').map((l) => l.id),
        pickedCount: 4,
        heldCount: 1,
      },
    ],
    lines,
    adjustments: [
      { id: 'adj_disc', kind: 'discount', label: 'Boat show', amount: -3000 },
      { id: 'adj_rego', kind: 'line', label: 'Registration', amount: 480 },
    ],
    levelKey: 'cash',
    taxRate: 10,
    customer: { name: 'R. Kelleher', contact: ['0400 000 000', 'Sandgate'] },
    preparedBy: 'A. Salesperson',
    note: 'Valid for 30 days.',
    ...(state === 'issued' ? { issuedAt: '2026-02-02T01:00:00.000Z' } : {}),
    createdAt: '2026-02-01T01:00:00.000Z',
    updatedAt: '2026-02-02T01:00:00.000Z',
  }
}

const DRAFT = quoteFrom('qt_draft', 'draft', [hull, motor])
const ISSUED = quoteFrom('qt_issued', 'issued', [hull, motor])

beforeAll(() => {
  registerQuote(DRAFT)
  registerQuote(ISSUED)
})

/* ---------------------------------------------------------- */

describe('the envelope carries the quotes', () => {
  it('WRITES THEM AT ALL — the bug this file exists for', () => {
    const file = buildExportPayload(1, true)
    expect(file.quotes?.map((q) => q.id).sort()).toEqual(['qt_draft', 'qt_issued'])
  })

  /* ============================================================
     AND "STRUCTURE ONLY" CARRIES NONE OF THEM.

     It used to carry both, under a panel reading "Structure only /
     Tables and pages, no rows" and a fact line reading "52 tables · 25
     pages · 2 quotes · no rows". A quote holds a customer's NAME, their
     contact lines, the prices they were offered and any discount given
     — and this is the card a person picks precisely because it sounds
     safe to hand to a supplier, a consultant or another dealer.

     A privacy problem, not a copy problem: rewording the card to admit
     it carried two customers' quotes would have made the sentence true
     and the file still wrong. Structure is tables, columns, pages,
     modules and rules. Not documents naming customers.

     The assertion below is on the SERIALISED file rather than on the
     `quotes` key, because the key is not the only way a name could
     reach the envelope and a test that only checked the key would not
     notice the next one.
     ============================================================ */
  it('CARRIES NO CUSTOMER NAME IN A STRUCTURE-ONLY COPY — the privacy hole', () => {
    const file = buildExportPayload(1, false)
    expect(file.rows).toBeUndefined()
    expect(file.quotes).toBeUndefined()

    /* the whole envelope as it would be written to disk. R. Kelleher is
       on both fixtures, with a phone number and a suburb. */
    const onDisk = JSON.stringify(file)
    expect(onDisk).not.toContain('R. Kelleher')
    expect(onDisk).not.toContain('0400 000 000')
    expect(onDisk).not.toContain('Sandgate')
    /* and nothing else the documents alone hold: the discount given, the
       consultant who raised it, the reference printed on the paper */
    expect(onDisk).not.toContain('Boat show')
    expect(onDisk).not.toContain('A. Salesperson')
    expect(onDisk).not.toContain('Q-qt_draft')

    /* the two documents are still on the sheet — this card leaves them
       out of the FILE, it does not delete them */
    expect(allQuotes()).toHaveLength(2)
  })

  it('still carries them in the full copy, which is the backup', () => {
    const file = buildExportPayload(1, true)
    expect(file.quotes).toHaveLength(2)
    expect(JSON.stringify(file)).toContain('R. Kelleher')
  })

  it('accepts its own file and brings both documents back', () => {
    const result = validateEnvelope(buildExportPayload(1, true))
    expect(result.ok ? null : result.error).toBeNull()
    if (!result.ok) return
    expect(result.data.quotes).toHaveLength(2)
  })

  it('SAYS THE SAME NUMBER ON THE OTHER SIDE, summed by the document’s own function', () => {
    const result = validateEnvelope(buildExportPayload(1, true))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    for (const before of [DRAFT, ISSUED]) {
      const after = result.data.quotes?.find((q) => q.id === before.id) as QuoteDef
      expect(quoteTotals(after)).toEqual(quoteTotals(before))
    }
    /* and the figure is a real one, not two zeroes agreeing:
       62,000 + 24,000 (the override, not the frozen 29,000) − 3,000 + 480 */
    expect(quoteTotals(DRAFT).total).toBe(83480)
  })

  it('keeps the override AND its reason, which is the audit trail', () => {
    const result = validateEnvelope(buildExportPayload(1, true))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.data.quotes?.find((q) => q.id === 'qt_draft') as QuoteDef
    const ln = after.lines.find((l) => l.id === 'ln_motor') as QuoteLine
    expect(ln.overridePrice).toBe(24000)
    expect(ln.overrideReason).toBe('matched a written quote from another dealer')
    /* the frozen original is still beside it — the document prints
       both, and an auditor computes the delta from them */
    expect(ln.unitPrice).toBe(29000)
  })

  it('keeps the five-way association, the frozen rungs and the source cell', () => {
    const result = validateEnvelope(buildExportPayload(1, true))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.data.quotes?.find((q) => q.id === 'qt_draft') as QuoteDef
    const ln = after.lines.find((l) => l.id === 'ln_motor') as QuoteLine
    expect(ln.pairFacts).toEqual(motor.pairFacts)
    expect(ln.recommended).toBe(true)
    const h = after.lines.find((l) => l.id === 'ln_hull') as QuoteLine
    expect(h.levels).toEqual(hull.levels)
    expect(h.sourceNote).toBe('Boat Module!R282 KZ..LD')
  })

  it('keeps a given quote GIVEN, so an import cannot reopen it for editing', () => {
    const result = validateEnvelope(buildExportPayload(1, true))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.data.quotes?.find((q) => q.id === 'qt_issued') as QuoteDef
    expect(after.state).toBe('issued')
    expect(after.issuedAt).toBe('2026-02-02T01:00:00.000Z')
  })

  it('keeps the customer, the sections and the counts the sections explain themselves with', () => {
    const result = validateEnvelope(buildExportPayload(1, true))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.data.quotes?.find((q) => q.id === 'qt_draft') as QuoteDef
    expect(after.customer).toEqual({ name: 'R. Kelleher', contact: ['0400 000 000', 'Sandgate'] })
    expect(after.sections.map((s) => s.blockId)).toEqual(['__subject', 'blk_motor'])
    expect(after.sections[1].pickedCount).toBe(4)
    expect(after.sections[1].heldCount).toBe(1)
    expect(after.taxRate).toBe(10)
    expect(after.note).toBe('Valid for 30 days.')
  })

  it('counts them on the import preview, so a person sees documents coming', () => {
    expect(summariseEnvelope(buildExportPayload(1, true)).quotes).toBe(2)
  })
})

/* ---------------------------------------------------------- */
/* an untrusted file                                           */
/* ---------------------------------------------------------- */

/** A minimal valid envelope with whatever quotes block is being
 *  tested. One table, because a file with none is refused earlier. */
function fileWith(quotes: unknown): unknown {
  const base = buildExportPayload(1, false) as unknown as Record<string, unknown>
  return { ...base, quotes }
}

describe('a quotes block from outside is narrowed at the door', () => {
  it('reads a file with no quotes key as a project with no quotes, not as damaged', () => {
    const base = buildExportPayload(1, false) as unknown as Record<string, unknown>
    delete base.quotes
    const result = validateEnvelope(base)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.quotes).toBeUndefined()
  })

  it('refuses a quotes block that is not a list, and says which block', () => {
    const result = validateEnvelope(fileWith({ nope: true }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe(
      'That copy is damaged: the customer quotes block cannot be read.',
    )
  })

  it('REFUSES A PICTURE ADDRESS THAT COULD RUN, and keeps the document', () => {
    const bad = {
      ...quoteFrom('qt_evil', 'issued', [
        line({ id: 'ln_evil', label: 'Hull', unitPrice: 1000, image: { id: 'i', src: 'javascript:alert(1)' } }),
      ]),
      subjectImage: { id: 'i2', src: 'data:text/html,<script>' },
    }
    const result = validateEnvelope(fileWith([bad]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.data.quotes?.[0] as QuoteDef
    expect(after.subjectImage).toBeUndefined()
    expect(after.lines[0].image).toBeUndefined()
    /* one bad address costs one photograph — never the document, and
       never the figure on it */
    expect(quoteTotals(after).packageTotal).toBe(1000)
    expect(after.lines[0].label).toBe('Hull')
  })

  it('treats an unreadable state as GIVEN, never as an editable draft', () => {
    const odd = { ...quoteFrom('qt_odd', 'issued', [hull]), state: 'whatever' }
    const result = validateEnvelope(fileWith([odd]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.quotes?.[0].state).toBe('issued')
  })

  it('keeps an adjustment whose kind it cannot read, with its sign and its total', () => {
    const odd = {
      ...quoteFrom('qt_kind', 'draft', [hull]),
      adjustments: [{ id: 'adj_x', kind: 'mystery', label: 'Something', amount: -1500 }],
    }
    const result = validateEnvelope(fileWith([odd]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const after = result.data.quotes?.[0] as QuoteDef
    /* 'line' is the neutral kind: it prints no qualifier of its own.
       The AMOUNT is carried exactly as the file holds it — re-deriving
       the sign from the kind would move a total on import. */
    expect(after.adjustments[0].kind).toBe('line')
    expect(after.adjustments[0].amount).toBe(-1500)
    expect(quoteTotals(after).total).toBe(60500)
  })

  it('drops a repeated quote id rather than letting one document replace another', () => {
    const a = quoteFrom('qt_same', 'issued', [hull])
    const b = { ...quoteFrom('qt_same', 'draft', [motor]), reference: 'Q-second' }
    const result = validateEnvelope(fileWith([a, b]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const same = result.data.quotes?.filter((q) => q.id === 'qt_same') ?? []
    expect(same).toHaveLength(1)
    expect(same[0].reference).toBe('Q-qt_same')
  })

  it('keeps a line whose quantity is nonsense at one, rather than at nought', () => {
    const odd = {
      ...quoteFrom('qt_qty', 'draft', [hull]),
      lines: [{ ...hull, qty: 0 }],
    }
    const result = validateEnvelope(fileWith([odd]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.quotes?.[0].lines[0].qty).toBe(1)
    expect(quoteTotals(result.data.quotes?.[0] as QuoteDef).total).toBe(59480)
  })

  it('drops a line with no usable id, because sections address lines by id', () => {
    const odd = {
      ...quoteFrom('qt_noid', 'draft', [hull]),
      lines: [{ ...hull, id: '__proto__' }, hull],
    }
    const result = validateEnvelope(fileWith([odd]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.quotes?.[0].lines.map((l) => l.id)).toEqual(['ln_hull'])
  })
})

/* ---------------------------------------------------------- */
/* the trip a person actually takes                            */
/* ---------------------------------------------------------- */

describe('export, replace, import — the documents survive and do not double', () => {
  it('a REPLACE leaves the quotes alone and puts the file’s own back by id', () => {
    const file = buildExportPayload(2, true)
    const before = allQuotes().length
    expect(before).toBe(2)

    const result = validateEnvelope(file)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    /* the sheet is thrown away — this is the act that used to take the
       quotes with it silently */
    applyReplace(result.data)
    expect(allQuotes()).toHaveLength(before)
    expect(getQuote('qt_issued')?.state).toBe('issued')
    expect(quoteTotals(getQuote('qt_draft') as QuoteDef).total).toBe(83480)

    /* and again, because re-importing your own backup twice is a thing
       people do: by id, so it cannot file a second copy of each */
    applyReplace(result.data)
    expect(allQuotes()).toHaveLength(before)
  })

  it('the confirm sheet can say what happens to them, with the real count', () => {
    const now = sheetNow()
    expect(now.quotes).toBe(2)
    const say = quotesSurviveSentence(now)
    expect(say).toContain('2 quotes stay')
    /* and nothing is said when there is nothing to say */
    expect(quotesSurviveSentence({ ...now, quotes: 0 })).toBe('')
  })
})
