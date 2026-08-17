/* ============================================================
   UNDO — the store's history, tested where it actually lives.

   Pure store logic, no DOM: every assertion here is about what
   `past` / `future` hold and what the data looks like after a
   step. Persistence is mocked, because the subject is the stack,
   not Dexie — except in one test, which exists precisely to prove
   an undo is written through and cannot come back on reload.
   ============================================================ */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntityDef, RowData } from '@/types/model'

const mockSaveAll = vi.fn(async (_snapshot: { rows: RowData[] }) => {})

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: mockSaveAll,
    wipe: async () => {},
  },
}))

const { useProjectStore, HISTORY_DEPTH } = await import('./useProjectStore')

/** one turn of the event loop — a burst closes on the next microtask,
 *  so this is what separates two acts into two undo steps */
const turn = () => Promise.resolve()

const ISO = '2026-01-01T00:00:00.000Z'

function boats(): EntityDef {
  return {
    id: 'e-boats',
    name: 'Boats',
    accent: 'blue',
    fields: [
      { id: 'f-model', name: 'Model', type: 'text' },
      { id: 'f-price', name: 'Price', type: 'number' },
    ],
    displayFieldId: 'f-model',
    position: { x: 0, y: 0 },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

function row(id: string, model: string, price: number): RowData {
  return {
    id,
    entityId: 'e-boats',
    values: { 'f-model': model, 'f-price': price },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

const store = () => useProjectStore.getState()
const rows = () => store().rowsByEntity['e-boats'] ?? []
const cell = (rowId: string, fieldId: string) =>
  rows().find((r) => r.id === rowId)?.values[fieldId]

beforeEach(() => {
  mockSaveAll.mockClear()
  /* replaceProject installs a project AND clears history — the same
     door the demo sets and the importer come through */
  store().replaceProject({
    name: 'Test Sheet',
    entities: [boats()],
    groups: [],
    rules: [],
    rowsByEntity: {
      'e-boats': [row('r1', 'Surtees 540', 52000), row('r2', 'Highfield 460', 31000)],
    },
  })
})

describe('undo — a cell edit', () => {
  it('puts the old value back and says what it did', () => {
    store().updateCell('e-boats', 'r1', 'f-price', 61000)
    expect(cell('r1', 'f-price')).toBe(61000)

    const label = store().undo()
    expect(label).toBe('Cell edit · Boats')
    expect(cell('r1', 'f-price')).toBe(52000)
  })

  it('does not record a commit that changed nothing', async () => {
    store().updateCell('e-boats', 'r1', 'f-price', 61000)
    await turn()
    /* the editor closed on an untouched cell — the write still goes
       through, but it must not spend a step */
    store().updateCell('e-boats', 'r1', 'f-price', 61000)
    await turn()

    expect(store().past).toHaveLength(1)
    store().undo()
    expect(cell('r1', 'f-price')).toBe(52000)
  })

  it('is nothing to undo on a fresh project', () => {
    expect(store().undo()).toBeNull()
    expect(store().past).toHaveLength(0)
  })
})

describe('undo — a row delete', () => {
  it('brings the whole row back, values and all', () => {
    store().deleteRow('e-boats', 'r2')
    expect(rows()).toHaveLength(1)

    expect(store().undo()).toBe('Row deleted · Boats')
    expect(rows()).toHaveLength(2)
    expect(cell('r2', 'f-model')).toBe('Highfield 460')
  })

  it('takes a whole multi-row strike back in one step', async () => {
    /* the sheet deletes a selection with a synchronous loop of
       deleteRow calls — one act, so one step */
    for (const id of ['r1', 'r2']) store().deleteRow('e-boats', id)
    await turn()

    expect(store().past).toHaveLength(1)
    expect(store().undo()).toBe('2 rows deleted · Boats')
    expect(rows()).toHaveLength(2)
  })
})

describe('undo — a paste', () => {
  it('is one step however many cells it wrote', async () => {
    /* what `useSheetCommands.doPaste` does: create the rows it needs,
       then write every cell, all in one synchronous handler */
    const made = store().addRow('e-boats')
    expect(made).not.toBeNull()
    store().updateCell('e-boats', 'r1', 'f-model', 'Surtees 610')
    store().updateCell('e-boats', 'r1', 'f-price', 71000)
    store().updateCell('e-boats', 'r2', 'f-model', 'Highfield 500')
    await turn()

    expect(store().past).toHaveLength(1)
    /* mixed ops, one table — counted, not guessed at */
    expect(store().undo()).toBe('4 changes · Boats')
    expect(rows()).toHaveLength(2)
    expect(cell('r1', 'f-model')).toBe('Surtees 540')
    expect(cell('r2', 'f-model')).toBe('Highfield 460')
  })
})

describe('undo — columns and tables', () => {
  it('takes back a retype, and the values it dropped', () => {
    store().updateField('e-boats', 'f-price', { type: 'text' })
    expect(cell('r1', 'f-price')).toBeUndefined()

    expect(store().undo()).toBe('Column retyped · Boats')
    expect(store().entities['e-boats'].fields[1].type).toBe('number')
    expect(cell('r1', 'f-price')).toBe(52000)
  })

  it('takes back a deleted column', () => {
    store().removeField('e-boats', 'f-price')
    expect(store().entities['e-boats'].fields).toHaveLength(1)

    expect(store().undo()).toBe('Column deleted · Boats')
    expect(store().entities['e-boats'].fields).toHaveLength(2)
    expect(cell('r1', 'f-price')).toBe(52000)
  })

  it('takes back a deleted table, with every row on it', () => {
    store().deleteEntity('e-boats')
    expect(store().entities['e-boats']).toBeUndefined()

    expect(store().undo()).toBe('Table deleted · Boats')
    expect(store().entities['e-boats'].name).toBe('Boats')
    expect(rows()).toHaveLength(2)
  })

  it('folds a name typed letter by letter into one step', async () => {
    for (const name of ['B', 'Bo', 'Boa', 'Boat', 'Boats!']) {
      store().updateEntity('e-boats', { name })
      await turn()
    }
    expect(store().past).toHaveLength(1)
    expect(store().undo()).toBe('Table renamed · Boats')
    expect(store().entities['e-boats'].name).toBe('Boats')
  })
})

describe('what history deliberately ignores', () => {
  it('does not record where a table sits on the drawing', async () => {
    store().moveEntity('e-boats', { x: 900, y: 400 })
    await turn()
    expect(store().past).toHaveLength(0)
    expect(store().undo()).toBeNull()
  })

  it('does not record selection', async () => {
    store().select({ kind: 'entity', id: 'e-boats' })
    await turn()
    expect(store().past).toHaveLength(0)
  })

  it('forgets everything on a project swap', async () => {
    store().updateCell('e-boats', 'r1', 'f-price', 61000)
    await turn()
    expect(store().past).toHaveLength(1)

    store().replaceProject({ name: 'Other', entities: [], groups: [], rules: [] })
    expect(store().past).toHaveLength(0)
    expect(store().future).toHaveLength(0)
    expect(store().undo()).toBeNull()
  })
})

describe('the bound', () => {
  it('keeps the newest HISTORY_DEPTH steps and drops the oldest', async () => {
    const over = HISTORY_DEPTH + 10
    for (let i = 1; i <= over; i += 1) {
      store().updateCell('e-boats', 'r1', 'f-price', i)
      await turn()
    }
    expect(store().past).toHaveLength(HISTORY_DEPTH)

    /* every step back, and then one more than there are */
    for (let i = 0; i < HISTORY_DEPTH; i += 1) {
      expect(store().undo()).toBe('Cell edit · Boats')
    }
    expect(store().undo()).toBeNull()

    /* the oldest steps fell off the bottom, so the price does NOT go
       all the way home — it stops at the value the surviving window
       began from. That is what a bounded stack means. */
    expect(cell('r1', 'f-price')).toBe(over - HISTORY_DEPTH)
    expect(store().past).toHaveLength(0)
  })
})

describe('redo', () => {
  it('puts back what undo took, and says so', async () => {
    store().updateCell('e-boats', 'r1', 'f-price', 61000)
    await turn()

    store().undo()
    expect(cell('r1', 'f-price')).toBe(52000)
    expect(store().future).toHaveLength(1)

    expect(store().redo()).toBe('Cell edit · Boats')
    expect(cell('r1', 'f-price')).toBe(61000)
    expect(store().future).toHaveLength(0)
    expect(store().past).toHaveLength(1)
  })

  it('walks a run of steps back and forward again', async () => {
    for (const v of [1, 2, 3]) {
      store().updateCell('e-boats', 'r1', 'f-price', v)
      await turn()
    }
    store().undo()
    store().undo()
    expect(cell('r1', 'f-price')).toBe(1)
    store().redo()
    store().redo()
    expect(cell('r1', 'f-price')).toBe(3)
    expect(store().redo()).toBeNull()
  })

  it('is cleared by a new change — nobody expects otherwise', async () => {
    store().updateCell('e-boats', 'r1', 'f-price', 61000)
    await turn()
    store().undo()
    expect(store().future).toHaveLength(1)

    store().updateCell('e-boats', 'r2', 'f-price', 33000)
    await turn()

    expect(store().future).toHaveLength(0)
    expect(store().redo()).toBeNull()
    /* and the branch it was on is gone for good, not half-applied */
    expect(cell('r1', 'f-price')).toBe(52000)
    expect(cell('r2', 'f-price')).toBe(33000)
  })
})

describe('an undo is written through', () => {
  it('reaches persistence, so it cannot come back on reload', async () => {
    store().updateCell('e-boats', 'r1', 'f-price', 61000)
    await turn()
    mockSaveAll.mockClear()

    store().undo()
    /* the store writes behind by 400ms — wait for the real timer
       rather than pretending, since the debounce IS the behaviour */
    await new Promise((r) => setTimeout(r, 500))

    expect(mockSaveAll).toHaveBeenCalled()
    const snap = mockSaveAll.mock.calls.at(-1)?.[0]
    expect(snap?.rows.find((r) => r.id === 'r1')?.values['f-price']).toBe(52000)
  })
})
