/* ============================================================
   THE FOUR SENTENCES THE COLUMN SETUP SAYS BEFORE IT DESTROYS
   SOMETHING — pinned to what the store actually does.

   Every confirm sheet on this surface used to end with "This app has
   no undo." All four were false, and a false sentence in a destructive
   dialog is the one kind of wrong wording that changes what a person
   does: it stops them doing something they could safely try. Each was
   pressed in the running app and taken back with Ctrl+Z before it was
   rewritten; this file is so the sentences cannot quietly become false
   again.

   WHAT IS TESTED HERE AND NOT IN `store/undo.test.ts`. That file
   already pins a bare retype, a bare column delete and a bare table
   delete. Two things it does not: the shapes the DESIGNER actually
   calls, which are multi-call sequences that must fold into ONE step —

     RetypeSheet, "keep what converts"   updateField(type) then one
                                         updateCell per carried value
     the link retarget                   updateField(refEntityId) then
                                         one updateCell(null) per link

   — and the CASCADE behind a table delete, which is the half the
   sheet's own sentence promises: the link columns on other tables and
   the rules rooted on this one come back with it.

   The store is exercised directly. The sheets are three lines of JSX
   over these calls, the runner has no DOM, and a test that rendered
   the dialog would prove less: the claim is about the history stack.
   ============================================================ */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntityDef, RowData, RuleDef } from '@/types/model'

/* the five files whose prose is guarded at the foot of this file */
import fieldRowSrc from './FieldRow.tsx?raw'
import fieldTypeEditorsSrc from './FieldTypeEditors.tsx?raw'
import entityDesignerSrc from './EntityDesigner.tsx?raw'
import confirmSheetSrc from './ConfirmSheet.tsx?raw'
import columnFactsSrc from './columnFacts.ts?raw'

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: new Date().toISOString(),
  }),
  repository: {
    load: async () => null,
    saveAll: async () => {},
    wipe: async () => {},
  },
}))

const { useProjectStore } = await import('@/store/useProjectStore')

/** one turn of the event loop — a burst closes on the next microtask,
 *  which is exactly what makes a designer sequence one undo step */
const turn = () => Promise.resolve()

const ISO = '2026-01-01T00:00:00.000Z'
const store = () => useProjectStore.getState()

/* ---------------------------------------------------------- */
/* two tables and a rule, in the shape the seed uses: a brand   */
/* price file, and a join table with a link column pointed at   */
/* it. Nothing here is a business fact — they are the smallest  */
/* structures that carry the four acts.                         */
/* ---------------------------------------------------------- */

function boats(): EntityDef {
  return {
    id: 'e-boats',
    name: 'Boats',
    accent: 'blue',
    sections: [
      { id: 's-id', name: 'Identity' },
      { id: 's-price', name: 'Pricing' },
    ],
    fields: [
      { id: 'f-model', name: 'Model', type: 'text', sectionId: 's-id' },
      { id: 'f-code', name: 'Model Code', type: 'text', sectionId: 's-id' },
      { id: 'f-cash', name: 'Cash', type: 'number', sectionId: 's-price' },
    ],
    displayFieldId: 'f-model',
    position: { x: 0, y: 0 },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

function trailers(): EntityDef {
  return {
    id: 'e-trailers',
    name: 'Trailers',
    accent: 'ochre',
    fields: [{ id: 'f-tname', name: 'Model', type: 'text' }],
    displayFieldId: 'f-tname',
    position: { x: 400, y: 0 },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

/** the join table — a link column aimed at Boats, which is what makes
 *  the table delete a cascade and the re-point possible */
function fitment(): EntityDef {
  return {
    id: 'e-fit',
    name: 'Boats × Trailers — Trailer Fitment',
    accent: 'violet',
    fields: [
      { id: 'f-label', name: 'Label', type: 'text' },
      { id: 'f-boat', name: 'Boat', type: 'reference', refEntityId: 'e-boats' },
    ],
    displayFieldId: 'f-label',
    position: { x: 200, y: 200 },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

/** a rule ROOTED on Boats — `deleteEntity` drops these outright */
function rootedRule(): RuleDef {
  return {
    id: 'r-fit',
    name: 'Trailer fitment',
    rootEntityId: 'e-boats',
    enabled: true,
    nodes: [],
    edges: [],
    createdAt: ISO,
    updatedAt: ISO,
  }
}

function boatRow(id: string, model: string, code: string, cash: number): RowData {
  return {
    id,
    entityId: 'e-boats',
    values: { 'f-model': model, 'f-code': code, 'f-cash': cash },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

function fitRow(id: string, label: string, boatRowId: string): RowData {
  return {
    id,
    entityId: 'e-fit',
    values: { 'f-label': label, 'f-boat': boatRowId },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

const boatFields = () => store().entities['e-boats'].fields
const fitFields = () => store().entities['e-fit'].fields
const boatRows = () => store().rowsByEntity['e-boats'] ?? []
const fitRows = () => store().rowsByEntity['e-fit'] ?? []
const boatCell = (rowId: string, fieldId: string) =>
  boatRows().find((r) => r.id === rowId)?.values[fieldId]

beforeEach(() => {
  store().replaceProject({
    name: 'Test Sheet',
    entities: [boats(), trailers(), fitment()],
    groups: [],
    rules: [rootedRule()],
    rowsByEntity: {
      'e-boats': [
        boatRow('b1', '540 Pro Fisher', '540-PF', 52000),
        boatRow('b2', '610 Pro Fisher', '610-PF', 61000),
      ],
      'e-trailers': [
        { id: 't1', entityId: 'e-trailers', values: { 'f-tname': 'SRW5.7M-13TB' }, createdAt: ISO, updatedAt: ISO },
      ],
      'e-fit': [fitRow('x1', '540 · SRW5.7M', 'b1'), fitRow('x2', '610 · SRW5.7M', 'b2')],
    },
  })
})

/* ---------------------------------------------------------- */

describe('“Ctrl+Z takes the whole change back” — the retype sheet', () => {
  it('folds the type change and every carried value into ONE step', async () => {
    /* what RetypeSheet's "Keep the N that convert" does: change the
       type, which clears the column, then write the survivors back —
       all inside one React event handler */
    store().updateField('e-boats', 'f-cash', { type: 'text' })
    store().updateCell('e-boats', 'b1', 'f-cash', '52000')
    store().updateCell('e-boats', 'b2', 'f-cash', '61000')
    await turn()

    expect(store().past).toHaveLength(1)
    expect(boatCell('b1', 'f-cash')).toBe('52000')

    store().undo()
    expect(boatFields()[2].type).toBe('number')
    expect(boatCell('b1', 'f-cash')).toBe(52000)
    expect(boatCell('b2', 'f-cash')).toBe(61000)
    /* one press, not three — a person who has to guess how many times
       to press Ctrl+Z has no undo worth the name */
    expect(store().past).toHaveLength(0)
  })

  it('takes back the clear-everything branch with the values it dropped', async () => {
    store().updateField('e-boats', 'f-code', { type: 'number' })
    await turn()
    expect(boatCell('b1', 'f-code')).toBeUndefined()

    expect(store().undo()).toBe('Column retyped · Boats')
    expect(boatFields()[1].type).toBe('text')
    expect(boatCell('b1', 'f-code')).toBe('540-PF')
    expect(boatCell('b2', 'f-code')).toBe('610-PF')
  })
})

describe('“at its own place in this list and in its own band” — the delete sheet', () => {
  it('puts the middle column back in the middle, banded, with its values', async () => {
    store().removeField('e-boats', 'f-code')
    await turn()
    expect(boatFields().map((f) => f.id)).toEqual(['f-model', 'f-cash'])

    expect(store().undo()).toBe('Column deleted · Boats')
    const back = boatFields()
    expect(back.map((f) => f.id)).toEqual(['f-model', 'f-code', 'f-cash'])
    expect(back[1].sectionId).toBe('s-id')
    expect(boatCell('b1', 'f-code')).toBe('540-PF')
  })
})

describe('“the table it pointed at, and every link emptied here” — the re-point sheet', () => {
  it('is ONE step, and gives back both the target and every link', async () => {
    /* `commitRetarget`: re-aim the column, then null every filled cell,
       because a row id of the old target means nothing in the new one */
    store().updateField('e-fit', 'f-boat', {
      refEntityId: 'e-trailers',
      defaultValue: undefined,
    })
    store().updateCell('e-fit', 'x1', 'f-boat', null)
    store().updateCell('e-fit', 'x2', 'f-boat', null)
    await turn()

    expect(store().past).toHaveLength(1)
    expect(fitFields()[1].refEntityId).toBe('e-trailers')
    expect(fitRows()[0].values['f-boat']).toBeNull()

    store().undo()
    expect(fitFields()[1].refEntityId).toBe('e-boats')
    expect(fitRows()[0].values['f-boat']).toBe('b1')
    expect(fitRows()[1].values['f-boat']).toBe('b2')
    expect(store().past).toHaveLength(0)
  })
})

describe('“every row on it and every link column and rule that went with it”', () => {
  it('brings the table, its rows, the cascaded link column and the rooted rule back', async () => {
    expect(fitFields().some((f) => f.id === 'f-boat')).toBe(true)
    expect(store().rules['r-fit']).toBeDefined()

    store().deleteEntity('e-boats')
    await turn()

    /* the three things the sheet names, all gone */
    expect(store().entities['e-boats']).toBeUndefined()
    expect(store().rowsByEntity['e-boats']).toBeUndefined()
    expect(fitFields().map((f) => f.id)).toEqual(['f-label'])
    expect(store().rules['r-fit']).toBeUndefined()

    expect(store().undo()).toBe('Table deleted · Boats')

    expect(store().entities['e-boats'].name).toBe('Boats')
    expect(boatRows()).toHaveLength(2)
    expect(boatCell('b2', 'f-cash')).toBe(61000)
    /* the cascade, which is the half a person cannot see going */
    const boat = fitFields().find((f) => f.id === 'f-boat')
    expect(boat?.refEntityId).toBe('e-boats')
    expect(fitRows()[0].values['f-boat']).toBe('b1')
    expect(store().rules['r-fit']?.name).toBe('Trailer fitment')
  })
})

describe('the sentences themselves', () => {
  it('nothing in the column setup still claims this app has no undo', () => {
    /* the four sheets said it, and two file headers argued from it. A
       text guard is the honest one: the claim is prose, and prose is
       exactly what drifts back. `?raw` reads the sources through the
       same resolver the app is built with — no fs, no node types. */
    const sources: Record<string, string> = {
      'FieldRow.tsx': fieldRowSrc,
      'FieldTypeEditors.tsx': fieldTypeEditorsSrc,
      'EntityDesigner.tsx': entityDesignerSrc,
      'ConfirmSheet.tsx': confirmSheetSrc,
      'columnFacts.ts': columnFactsSrc,
    }
    /* the phrase may appear as a QUOTATION of the old wording — every
       correction above quotes what it replaced — so the guard is on the
       assertion, not the string: no occurrence may stand without the
       words that mark it as struck. Prose wraps, so the marker is
       looked for in the lines around it rather than on its own. */
    const STRUCK = /used to|struck|was false|were false|the clause|the sentence/i
    for (const [name, src] of Object.entries(sources)) {
      const lines = src.split('\n')
      lines.forEach((line, i) => {
        if (!/no undo|cannot be undone/i.test(line)) return
        const near = lines.slice(Math.max(0, i - 2), i + 3).join(' ')
        expect(STRUCK.test(near), `${name}:${i + 1} — "${line.trim()}"`).toBe(true)
      })
    }
  })
})
