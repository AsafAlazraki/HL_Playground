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

/* ============================================================
   WHAT THE CONFIRM SHEETS NOW PROMISE, IN WRITING.

   Two destructive confirms in the register said "There is no undo."
   Both were false, so the row strike became a toast with UNDO and the
   column sheet's sentence became "Ctrl+Z brings the column back, with
   every value in it." A sentence in front of somebody deciding whether
   to risk their price file has to be exactly true, and "it comes back"
   is not the same claim as "it comes back WHERE IT WAS" — a row that
   returned to the foot of a 3,566-row table, or a column that returned
   to the far right of a banded sheet, would make both sentences lies of
   a quieter kind. The tests above prove the values survive; these prove
   the POSITION does, which is the half the wording now rests on.
   ============================================================ */
describe('undo — and the place the thing comes back to', () => {
  it('puts a struck row back at its own index, not at the end', async () => {
    store().replaceProject({
      name: 'Test Sheet',
      entities: [boats()],
      groups: [],
      rules: [],
      rowsByEntity: {
        'e-boats': [
          row('r1', 'Surtees 540', 52000),
          row('r2', 'Highfield 460', 31000),
          row('r3', 'Stacer 429', 18000),
        ],
      },
    })

    store().deleteRow('e-boats', 'r2')
    await turn()
    expect(rows().map((r) => r.id)).toEqual(['r1', 'r3'])

    expect(store().undo()).toBe('Row deleted · Boats')
    expect(rows().map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
    expect(cell('r2', 'f-model')).toBe('Highfield 460')
    expect(cell('r2', 'f-price')).toBe(31000)
  })

  it('takes a whole strike of three rows back in one press, in order', async () => {
    store().replaceProject({
      name: 'Test Sheet',
      entities: [boats()],
      groups: [],
      rules: [],
      rowsByEntity: {
        'e-boats': [
          row('r1', 'Surtees 540', 52000),
          row('r2', 'Highfield 460', 31000),
          row('r3', 'Stacer 429', 18000),
          row('r4', 'Formosa 480', 27000),
        ],
      },
    })

    /* what the toolbar's Delete button does: one synchronous loop */
    for (const id of ['r1', 'r2', 'r4']) store().deleteRow('e-boats', id)
    await turn()
    expect(rows().map((r) => r.id)).toEqual(['r3'])
    expect(store().past).toHaveLength(1)

    expect(store().undo()).toBe('3 rows deleted · Boats')
    expect(rows().map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4'])
  })

  it('puts a removed column back at its own index, in its own band', () => {
    const banded: EntityDef = {
      ...boats(),
      sections: [{ id: 's-id', name: 'Identity' }],
      fields: [
        { id: 'f-model', name: 'Model', type: 'text', sectionId: 's-id' },
        { id: 'f-matrix', name: 'Matrix', type: 'text', sectionId: 's-id' },
        { id: 'f-price', name: 'Price', type: 'number' },
      ],
    }
    store().replaceProject({
      name: 'Test Sheet',
      entities: [banded],
      groups: [],
      rules: [],
      rowsByEntity: {
        'e-boats': [
          { ...row('r1', 'Surtees 540', 52000), values: { 'f-model': 'Surtees 540', 'f-matrix': 'Surtees', 'f-price': 52000 } },
          { ...row('r2', 'Highfield 460', 31000), values: { 'f-model': 'Highfield 460', 'f-matrix': 'Highfield', 'f-price': 31000 } },
        ],
      },
    })

    store().removeField('e-boats', 'f-matrix')
    expect(store().entities['e-boats'].fields.map((f) => f.id)).toEqual([
      'f-model',
      'f-price',
    ])
    expect(cell('r1', 'f-matrix')).toBeUndefined()

    expect(store().undo()).toBe('Column deleted · Boats')
    /* the middle column, in the middle again — a column that came back
       at the far right would be inside no band, and the sheet would draw
       "Identity" twice with Price between the two halves */
    const back = store().entities['e-boats'].fields
    expect(back.map((f) => f.id)).toEqual(['f-model', 'f-matrix', 'f-price'])
    expect(back[1].sectionId).toBe('s-id')
    expect(cell('r1', 'f-matrix')).toBe('Surtees')
    expect(cell('r2', 'f-matrix')).toBe('Highfield')
  })

  it('gives back the name column the table was displaying by', () => {
    store().removeField('e-boats', 'f-model')
    expect(store().entities['e-boats'].displayFieldId).toBeUndefined()

    store().undo()
    expect(store().entities['e-boats'].displayFieldId).toBe('f-model')
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

/* ============================================================
   THE RING THE CONFIRMS BROUGHT IN.

   Four `window.confirm` calls were replaced by notes with UNDO on
   them, and each of those notes is a promise this file has to keep:
   delete a rule, delete a step, delete a wire, delete a zone. If any
   one of them stops recording, the app goes on offering UNDO for an
   act it can no longer take back — which is worse than the native
   dialog it replaced, because the dialog at least did not lie.

   The line is still DESTRUCTION ONLY, so the tests below the next
   heading pin the other half: naming a rule, switching one off,
   configuring a step and dragging a plate are all still not steps.
   ============================================================ */
describe('undo — the destructive acts on rules and zones', () => {
  it('brings a deleted rule back whole, with every step and line on it', async () => {
    const rule = store().createRule('e-boats', 'Trailer fitment — Highfield')
    const start = rule.nodes[0]
    const match = store().addRuleNode(rule.id, 'match', { x: 300, y: 60 })
    expect(match).not.toBeNull()
    store().connectRuleNodes(rule.id, { source: start.id, target: match!.id })
    await turn()

    const before = store().rules[rule.id]
    expect(before.nodes).toHaveLength(2)
    expect(before.edges).toHaveLength(1)

    store().deleteRule(rule.id)
    await turn()
    expect(store().rules[rule.id]).toBeUndefined()

    expect(store().undo()).toBe('Rule deleted · Trailer fitment — Highfield')
    const after = store().rules[rule.id]
    expect(after.nodes).toHaveLength(2)
    expect(after.edges).toHaveLength(1)
  })

  it('brings a deleted step back, and the lines that went with it', async () => {
    const rule = store().createRule('e-boats')
    const start = rule.nodes[0]
    const match = store().addRuleNode(rule.id, 'match', { x: 300, y: 60 })
    store().connectRuleNodes(rule.id, { source: start.id, target: match!.id })
    await turn()

    store().deleteRuleNode(rule.id, match!.id)
    await turn()
    expect(store().rules[rule.id].nodes).toHaveLength(1)
    expect(store().rules[rule.id].edges).toHaveLength(0)

    expect(store().undo()).toBe(`Step deleted · ${rule.name}`)
    expect(store().rules[rule.id].nodes).toHaveLength(2)
    expect(store().rules[rule.id].edges).toHaveLength(1)
  })

  it('folds a step and its wires into ONE entry, not one per removal', async () => {
    const rule = store().createRule('e-boats')
    const start = rule.nodes[0]
    const match = store().addRuleNode(rule.id, 'match', { x: 300, y: 60 })
    store().connectRuleNodes(rule.id, { source: start.id, target: match!.id })
    await turn()
    const depth = store().past.length

    /* what React Flow does in one gesture: the node, then its edges */
    const edgeId = store().rules[rule.id].edges[0].id
    store().deleteRuleNode(rule.id, match!.id)
    store().deleteRuleEdge(rule.id, edgeId)
    await turn()

    expect(store().past).toHaveLength(depth + 1)
    /* and the plate outranks the wire in the words, so a person who
       deleted a step is not told about lines they never aimed at */
    expect(store().past[store().past.length - 1].label).toBe(`Step deleted · ${rule.name}`)
  })

  it('brings a cut line back on its own', async () => {
    const rule = store().createRule('e-boats')
    const start = rule.nodes[0]
    const match = store().addRuleNode(rule.id, 'match', { x: 300, y: 60 })
    store().connectRuleNodes(rule.id, { source: start.id, target: match!.id })
    await turn()

    const edgeId = store().rules[rule.id].edges[0].id
    store().deleteRuleEdge(rule.id, edgeId)
    await turn()
    expect(store().rules[rule.id].edges).toHaveLength(0)

    expect(store().undo()).toBe(`Line deleted · ${rule.name}`)
    expect(store().rules[rule.id].edges).toHaveLength(1)
  })

  it('brings a deleted zone back with its tables still in it', async () => {
    const zone = store().createGroup({ name: 'Trailers' })
    store().assignEntityToGroup('e-boats', zone.id)
    await turn()
    expect(store().entities['e-boats'].groupId).toBe(zone.id)

    store().deleteGroup(zone.id)
    await turn()
    expect(store().groups[zone.id]).toBeUndefined()
    /* the frame going is visible; the table losing its groupId is not */
    expect(store().entities['e-boats'].groupId).toBeUndefined()

    expect(store().undo()).toBe('Zone deleted · Trailers')
    expect(store().groups[zone.id]).toBeDefined()
    expect(store().entities['e-boats'].groupId).toBe(zone.id)
  })

  it('records nothing when the subject was already gone', async () => {
    const depth = store().past.length
    store().deleteRule('no-such-rule')
    store().deleteRuleNode('no-such-rule', 'no-such-node')
    store().deleteRuleEdge('no-such-rule', 'no-such-edge')
    store().deleteGroup('no-such-zone')
    await turn()
    expect(store().past).toHaveLength(depth)
  })
})

describe('what history deliberately ignores', () => {
  it('does not record a rule being renamed or switched off', async () => {
    const rule = store().createRule('e-boats')
    await turn()
    const depth = store().past.length
    store().updateRule(rule.id, { name: 'Renamed' })
    store().updateRule(rule.id, { enabled: false })
    await turn()
    expect(store().past).toHaveLength(depth)
  })

  it('does not record where a step or a zone sits', async () => {
    const rule = store().createRule('e-boats')
    const zone = store().createGroup()
    await turn()
    const depth = store().past.length
    store().moveRuleNode(rule.id, rule.nodes[0].id, { x: 500, y: 500 })
    store().updateGroup(zone.id, { position: { x: 700, y: 700 } })
    await turn()
    expect(store().past).toHaveLength(depth)
  })

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
