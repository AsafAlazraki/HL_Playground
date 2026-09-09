/* ============================================================
   DOES THE FIT SENTENCE ACTUALLY DRAW, AND ARE THE DROPDOWNS
   BUILT FROM THE SHEET?

   `fit.test.ts` proves the sentence and the graph are the same
   rule. It cannot prove a single word reaches a screen. This file
   renders the component, because §11's claim is not "a fit can be
   modelled as a sentence" — it is "every underlined word is a
   dropdown built from the columns actually on the sheet", and
   that is a claim about markup.

   EVERY QUERY IS BY ROLE OR BY TEXT. A test that asserts on a
   class name fails when the class is renamed and passes when the
   screen is broken (CLAUDE.md, and `tiles.test.tsx` says the same
   thing at more length). The one contract selected on directly is
   `aria-label`, which is what a person using a screen reader
   actually hears — it is not decoration, and breaking it breaks
   the surface.

   THE FIXTURE IS SYNTHETIC AND TINY. `fit.test.ts` pays 9s at
   import for the real 23,000-line seed because it is measuring
   rules against a real price file. Nothing here needs 588 boats
   to prove a `<select>` was built out of two columns.

   AND IT COVERS `FitResult` TOO, from the same fixture rather
   than a second copy of it. The answer is not a separate screen —
   §11's second fix is that it is ON the sentence, updating as the
   words change — so a fixture that proves the sentence draws is
   the same fixture that proves the answer beside it does.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EntityDef, RowData } from '@/types/model'
import { makeCtx } from './describe'
import { FitResult } from './FitResult'
import { FitSentence } from './FitSentence'
import { blankFit, readFit, type FitDraft } from './fit'
import type { RuleDef } from '@/types/model'

/* ---------------------------------------------------------- */
/* The fixture — two tables that name a real relationship      */
/* ---------------------------------------------------------- */

const ISO = '2026-01-01T00:00:00.000Z'

const boats: EntityDef = {
  id: 'e-boat',
  name: 'Highfield Inflatables',
  accent: 'blue',
  kind: 'boat',
  fields: [
    { id: 'b-code', name: 'Code', type: 'text' },
    { id: 'b-model', name: 'Model', type: 'text' },
    { id: 'b-min', name: 'Min HP', type: 'number' },
    { id: 'b-max', name: 'Max HP', type: 'number' },
  ],
  displayFieldId: 'b-model',
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
}

const motors: EntityDef = {
  id: 'e-motor',
  name: 'Yamaha Outboards',
  accent: 'ochre',
  kind: 'motor',
  fields: [
    { id: 'm-sku', name: 'SKU', type: 'text' },
    { id: 'm-motor', name: 'Motor', type: 'text' },
    { id: 'm-hp', name: 'HP Rating', type: 'number' },
  ],
  displayFieldId: 'm-motor',
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
}

const entities: Record<string, EntityDef> = { [boats.id]: boats, [motors.id]: motors }

const row = (entityId: string, id: string, values: RowData['values']): RowData => ({
  id,
  entityId,
  values,
  createdAt: ISO,
  updatedAt: ISO,
})

const rowsByEntity: Record<string, RowData[]> = {
  [boats.id]: [
    row(boats.id, 'b1', { 'b-code': 'SP560', 'b-model': 'Sport 560', 'b-min': 60, 'b-max': 115 }),
    row(boats.id, 'b2', { 'b-code': 'SP600', 'b-model': 'Sport 600', 'b-min': 90, 'b-max': 150 }),
  ],
  [motors.id]: [
    row(motors.id, 'm1', { 'm-sku': 'F90', 'm-motor': 'Yamaha F90', 'm-hp': 90 }),
    row(motors.id, 'm2', { 'm-sku': 'F150', 'm-motor': 'Yamaha F150', 'm-hp': 150 }),
  ],
}

const ctx = (): ReturnType<typeof makeCtx> => makeCtx(entities, rowsByEntity)

/** The seeded shape: for every boat, the motors whose HP is at most
 *  the boat's Max HP. Written as a `RuleDef` and read back, so this
 *  file exercises the same door the app does. */
function fitDraft(): FitDraft {
  const rule: RuleDef = {
    id: 'r1',
    name: 'Motors that fit',
    rootEntityId: boats.id,
    enabled: true,
    nodes: [
      { id: 'n-start', kind: 'start', position: { x: 0, y: 0 }, config: {} },
      {
        id: 'n-match',
        kind: 'match',
        position: { x: 200, y: 0 },
        config: {
          targetEntityId: motors.id,
          group: {
            combinator: 'AND',
            clauses: [
              {
                id: 'c1',
                left: { fieldId: 'm-hp' },
                op: 'lte',
                right: { kind: 'field', path: { fieldId: 'b-max' } },
              },
            ],
          },
          emptyBehavior: 'skip',
        },
      },
      {
        id: 'n-out',
        kind: 'output',
        position: { x: 400, y: 0 },
        config: {
          label: 'Motors that fit',
          columns: [
            { scope: 'source', fieldId: 'b-model', label: 'Boat' },
            { scope: 'match', fieldId: 'm-motor', label: 'Motor' },
          ],
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'n-start', target: 'n-match', sourceHandle: 'out' },
      { id: 'e2', source: 'n-match', target: 'n-out', sourceHandle: 'out' },
    ],
    createdAt: ISO,
    updatedAt: ISO,
  }
  const draft = readFit(rule)
  if (!draft) throw new Error('the fixture rule should read as a sentence')
  return draft
}

/* ---------------------------------------------------------- */
/* Read-only prose                                             */
/* ---------------------------------------------------------- */

describe('the collapsed sentence', () => {
  it('says the rule in words, with no controls in it', () => {
    render(<FitSentence draft={fitDraft()} ctx={ctx()} />)

    expect(screen.getByText('Highfield Inflatables')).toBeTruthy()
    expect(screen.getByText('Yamaha Outboards')).toBeTruthy()
    expect(screen.getByText('HP Rating')).toBeTruthy()
    expect(screen.getByText('is at most')).toBeTruthy()
    expect(screen.getByText('Max HP')).toBeTruthy()

    /* collapsed is PROSE. Not one dropdown, and not one remove
       button — a card a person has not opened must not be a form. */
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  /* §11's fourth fix, kept in ENGLISH rather than in colour: a
     collapsed sentence has no underline to tint, so it says which
     side the far column is on. */
  it('names the side the far column belongs to', () => {
    render(<FitSentence draft={fitDraft()} ctx={ctx()} />)
    expect(screen.getByText("the boat's")).toBeTruthy()
  })

  it('draws the answer’s columns, with the tables’ nouns beside them', () => {
    render(<FitSentence draft={fitDraft()} ctx={ctx()} />)
    expect(screen.getByText('Show')).toBeTruthy()
    expect(screen.getByText('Boat')).toBeTruthy()
    expect(screen.getByText('Motor')).toBeTruthy()
  })
})

/* ---------------------------------------------------------- */
/* Live                                                        */
/* ---------------------------------------------------------- */

describe('the live sentence', () => {
  it('builds every picker out of the tables and columns on the sheet', () => {
    render(<FitSentence draft={fitDraft()} ctx={ctx()} editable onChange={vi.fn()} />)

    const searched = screen.getByRole('combobox', { name: 'The table this rule searches' })
    const names = within(searched)
      .getAllByRole('option')
      .map((o) => o.textContent ?? '')
    /* the row counts come off the fixture, so the list cannot have
       been written by hand */
    expect(names).toContain('Highfield Inflatables · 2')
    expect(names).toContain('Yamaha Outboards · 2')
    expect(names).toHaveLength(2)

    const column = screen.getByRole('combobox', {
      name: 'The column this comparison is about',
    })
    const columns = within(column)
      .getAllByRole('option')
      .map((o) => o.textContent ?? '')
    /* every SAYABLE column of the searched table, and nothing else */
    expect(columns).toEqual(['SKU', 'Motor', 'HP Rating'])
  })

  it('offers only the comparisons a number can honestly take', () => {
    render(<FitSentence draft={fitDraft()} ctx={ctx()} editable onChange={vi.fn()} />)
    const verb = screen.getByRole('combobox', { name: 'How the two are compared' })
    const words = within(verb)
      .getAllByRole('option')
      .map((o) => o.textContent ?? '')
    expect(words).toContain('is at most')
    expect(words).toContain('is at least')
    /* `is one of` needs a nested OR group and `ClauseGroup` does not
       nest, so the word must never appear */
    expect(words).not.toContain('is one of')
    expect(words).not.toContain('must be at most')
  })

  it('hands back a new draft when a word is changed', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<FitSentence draft={fitDraft()} ctx={ctx()} editable onChange={onChange} />)

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'How the two are compared' }),
      'gte',
    )
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as FitDraft
    expect(next.clauses[0].op).toBe('gte')
    /* the draft is REPLACED, never mutated — the composer owns it */
    expect(next).not.toBe(fitDraft())
  })

  it('lets a comparison be added and the new one be removed', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<FitSentence draft={fitDraft()} ctx={ctx()} editable onChange={onChange} />)

    /* one comparison, so there is nothing to remove it TO and no
       cross is drawn — a control that cannot act is a lie */
    expect(screen.queryAllByRole('button', { name: 'Remove this comparison' })).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Add a comparison' }))
    const grown = onChange.mock.calls[0][0] as FitDraft
    expect(grown.clauses).toHaveLength(2)
  })

  it('offers the columns of BOTH tables when adding one to the answer', () => {
    render(<FitSentence draft={fitDraft()} ctx={ctx()} editable onChange={vi.fn()} />)
    const adder = screen.getByRole('combobox', { name: 'Show another column' })
    const groups = within(adder)
      .getAllByRole('group')
      .map((g) => g.getAttribute('label'))
    expect(groups).toEqual(['Highfield Inflatables', 'Yamaha Outboards'])
    /* the two already shown are not offered twice */
    const offered = within(adder)
      .getAllByRole('option')
      .map((o) => o.textContent ?? '')
    expect(offered).not.toContain('Model')
    expect(offered).toContain('Max HP')
  })

  it('says what happens when nothing fits, in the dealer’s words', () => {
    render(<FitSentence draft={fitDraft()} ctx={ctx()} editable onChange={vi.fn()} />)
    const foot = screen.getByRole('combobox', { name: 'What happens when nothing fits' })
    const words = within(foot)
      .getAllByRole('option')
      .map((o) => o.textContent ?? '')
    expect(words).toEqual(['leave it out', 'keep it with nothing attached'])
  })
})

/* ---------------------------------------------------------- */
/* A sentence nobody has finished                              */
/* ---------------------------------------------------------- */

describe('a blank sentence', () => {
  it('draws slots rather than a rule nobody wrote', () => {
    render(
      <FitSentence draft={blankFit(undefined, undefined)} ctx={ctx()} editable onChange={vi.fn()} />,
    )
    /* BOTH TABLES ARE UNANSWERED, AND THEY READ AS QUESTIONS. Each
       one keeps its own face at the top of its list and cannot be
       chosen — "a table" is the absence of a choice, not one of the
       choices — so the word appears twice per picker, once as the
       painted face and once as the option holding the slot open. */
    for (const label of ['The table this rule walks', 'The table this rule searches']) {
      const picker = screen.getByRole('combobox', { name: label })
      const slot = within(picker).getByRole('option', { name: 'a table' })
      expect(slot.hasAttribute('disabled')).toBe(true)
    }
    expect(screen.getAllByText('a table')).toHaveLength(4)
    /* and the verb waits for the column: with nothing picked there is
       nothing true to offer, so it is a word and not a control */
    expect(
      screen.queryAllByRole('combobox', { name: 'How the two are compared' }),
    ).toHaveLength(0)
  })
})

/* ---------------------------------------------------------- */
/* The answer, beside the sentence — §11's second fix           */
/* ---------------------------------------------------------- */

describe('the live answer', () => {
  it('runs the real rule and counts what it found', () => {
    render(<FitResult draft={fitDraft()} ctx={ctx()} />)

    /* Sport 560 (max 115) takes the F90; Sport 600 (max 150) takes
       both. Three pairs, and they are computed here rather than
       written down. */
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText(/from all 2 Highfield Inflatables/)).toBeTruthy()
    expect(screen.getByText('live')).toBeTruthy()

    const table = screen.getByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent ?? '')
    expect(headers).toEqual(['Boat', 'Motor'])
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getByText('Yamaha F150')).toBeTruthy()
  })

  it('says what is still missing instead of running half a rule', () => {
    render(<FitResult draft={blankFit(undefined, undefined)} ctx={ctx()} />)
    expect(screen.getByText('The answer appears here as you write.')).toBeTruthy()
    expect(
      screen.getByText('Pick the table this rule walks — the thing being fitted.'),
    ).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  /* THE 193 ROWS HEADED `Series` / `Series`. Audit finding 18, and
     the reason the answer is on screen at all. */
  it('names an answer that names neither side, and repairs it', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const clashing: FitDraft = {
      ...fitDraft(),
      columns: [
        { scope: 'source', fieldId: 'b-code', label: 'Series' },
        { scope: 'match', fieldId: 'm-sku', label: 'Series' },
      ],
    }
    render(<FitResult draft={clashing} ctx={ctx()} onChange={onChange} />)

    expect(screen.getByText(/Two columns are called Series/)).toBeTruthy()

    const repair = screen.getByRole('button', { name: 'Use Model and Motor instead' })
    await user.click(repair)

    const fixed = onChange.mock.calls[0][0] as FitDraft
    expect(fixed.columns.map((c) => c.label)).toEqual(['Model', 'Motor'])
  })

  it('says why nothing fits rather than showing an empty table', () => {
    const impossible: FitDraft = {
      ...fitDraft(),
      clauses: [
        {
          id: 'c1',
          matchFieldId: 'm-hp',
          op: 'gt',
          right: { k: 'word', value: 9999 },
        },
      ],
    }
    render(<FitResult draft={impossible} ctx={ctx()} />)
    expect(screen.getByText(/Nothing fits/)).toBeTruthy()
    expect(screen.getByText(/No Yamaha Outboards passes every comparison/)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
