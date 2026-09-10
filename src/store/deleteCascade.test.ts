/* ============================================================
   Deleting a table takes things with it, and each of those is a
   DECISION rather than a consequence. These assert the decisions,
   not the implementation — MODULE_SYSTEM §2 defect 2.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import type { ModuleDef, ViewBlock, ViewDef } from '@/types/model'
import { cascadeOfDelete, cascadeSay } from './deleteCascade'

const view = (over: Partial<ViewDef> & { id: string; rootTableId: string }): ViewDef => ({
  name: over.id,
  blocks: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

const mod = (over: Partial<ModuleDef> & { id: string; tableIds: string[] }): ModuleDef => ({
  name: over.id,
  description: '',
  capabilities: [],
  index: 'grid' as ModuleDef['index'],
  accent: 'indigo' as ModuleDef['accent'],
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

const block = (tableId: string, extra: Partial<ViewBlock> = {}): ViewBlock => ({
  id: `b-${tableId}`,
  tableId,
  ...extra,
})

const recs = <T extends { id: string }>(xs: T[]): Record<string, T> =>
  Object.fromEntries(xs.map((x) => [x.id, x]))

/* ---------------------------------------------------------- */

describe('a page whose root is gone', () => {
  it('is deleted, because a page of nothing has no honest state', () => {
    const out = cascadeOfDelete('boats', recs([view({ id: 'v1', rootTableId: 'boats' })]), {})
    expect(Object.keys(out.views)).toEqual([])
    expect(out.deletedViews).toEqual(['v1'])
  })

  it('leaves a page rooted elsewhere entirely alone, object identity included', () => {
    /* Returning a fresh object for an untouched page hands React a
       new reference to diff on every unrelated delete. */
    const v = view({ id: 'v1', rootTableId: 'motors', blocks: [block('rigs')] })
    const out = cascadeOfDelete('boats', recs([v]), {})
    expect(out.views.v1).toBe(v)
  })
})

describe('a block whose table is gone', () => {
  it('is dropped, and the page survives with its subject intact', () => {
    const v = view({ id: 'v1', rootTableId: 'boats', blocks: [block('motors'), block('rigs')] })
    const out = cascadeOfDelete('motors', recs([v]), {})
    expect(out.views.v1.blocks.map((b) => b.tableId)).toEqual(['rigs'])
    expect(out.droppedBlocks).toBe(1)
    expect(out.deletedViews).toEqual([])
  })

  it('is dropped at depth, because blocks nest three deep', () => {
    const v = view({
      id: 'v1',
      rootTableId: 'boats',
      blocks: [block('motors', { children: [block('accessories'), block('props')] })],
    })
    const out = cascadeOfDelete('props', recs([v]), {})
    expect(out.views.v1.blocks[0].children?.map((b) => b.tableId)).toEqual(['accessories'])
    expect(out.droppedBlocks).toBe(1)
  })

  it('counts every block it drops, at every depth', () => {
    const v = view({
      id: 'v1',
      rootTableId: 'boats',
      blocks: [block('props'), block('motors', { children: [block('props')] })],
    })
    expect(cascadeOfDelete('props', recs([v]), {}).droppedBlocks).toBe(2)
  })

  it('keeps a block that merely loses its join, and un-curates it', () => {
    /* A join is how the pairs were curated, not what the block is
       about. Without it the block shows everything in its table,
       which the contract already allows. */
    const v = view({
      id: 'v1',
      rootTableId: 'boats',
      blocks: [block('motors', { joinTableId: 'boat_motor' })],
    })
    const out = cascadeOfDelete('boat_motor', recs([v]), {})
    expect(out.views.v1.blocks).toHaveLength(1)
    expect(out.views.v1.blocks[0].joinTableId).toBeUndefined()
    expect(out.droppedBlocks).toBe(0)
  })
})

describe('a module that loses a table', () => {
  it('survives on the tables it has left', () => {
    const m = mod({ id: 'm1', tableIds: ['boats', 'motors'] })
    const out = cascadeOfDelete('motors', {}, recs([m]))
    expect(out.modules.m1.tableIds).toEqual(['boats'])
    expect(out.narrowedModules).toEqual(['m1'])
    expect(out.deletedModules).toEqual([])
  })

  it('survives losing its PRIMARY, and the next table becomes primary', () => {
    /* tableIds[0] is the primary. A module about fewer things is a
       smaller module, not a broken one. */
    const m = mod({ id: 'm1', tableIds: ['boats', 'motors'] })
    const out = cascadeOfDelete('boats', {}, recs([m]))
    expect(out.modules.m1.tableIds).toEqual(['motors'])
  })

  it('is deleted when it has no tables left, because it has no place to stand', () => {
    const out = cascadeOfDelete('boats', {}, recs([mod({ id: 'm1', tableIds: ['boats'] })]))
    expect(out.modules).toEqual({})
    expect(out.deletedModules).toEqual(['m1'])
  })

  it('is untouched, identity included, when the delete does not reach it', () => {
    const m = mod({ id: 'm1', tableIds: ['motors'] })
    expect(cascadeOfDelete('boats', {}, recs([m])).modules.m1).toBe(m)
  })
})

describe('a module whose page is gone', () => {
  it('keeps its place and stops opening, which the contract calls legitimate', () => {
    const out = cascadeOfDelete(
      'boats',
      recs([view({ id: 'v1', rootTableId: 'boats' })]),
      recs([mod({ id: 'm1', tableIds: ['motors'], viewId: 'v1' })]),
    )
    expect(out.modules.m1).toBeDefined()
    expect(out.modules.m1.viewId).toBeUndefined()
    expect(out.modules.m1.tableIds).toEqual(['motors'])
    expect(out.closedModules).toEqual(['m1'])
    expect(out.deletedModules).toEqual([])
  })

  it('keeps a viewId that still resolves', () => {
    const out = cascadeOfDelete(
      'boats',
      recs([view({ id: 'v1', rootTableId: 'motors' })]),
      recs([mod({ id: 'm1', tableIds: ['motors'], viewId: 'v1' })]),
    )
    expect(out.modules.m1.viewId).toBe('v1')
    expect(out.closedModules).toEqual([])
  })
})

describe('the blast radius, as a sentence — §7', () => {
  it('says nothing when nothing beyond the table is touched', () => {
    expect(cascadeSay(cascadeOfDelete('boats', {}, {}))).toBe('')
  })

  it('names one page rather than counting it', () => {
    const out = cascadeOfDelete('boats', recs([view({ id: 'Boats', rootTableId: 'boats' })]), {})
    expect(cascadeSay(out)).toBe('This also removes the page Boats.')
  })

  it('counts rather than lists once there is more than one', () => {
    /* A confirm that lists eleven page titles is a confirm nobody
       reads. */
    const out = cascadeOfDelete(
      'boats',
      recs([view({ id: 'A', rootTableId: 'boats' }), view({ id: 'B', rootTableId: 'boats' })]),
      {},
    )
    expect(cascadeSay(out)).toBe('This also removes 2 pages.')
  })

  it('joins several consequences into one readable sentence', () => {
    const out = cascadeOfDelete(
      'boats',
      recs([
        view({ id: 'Boats', rootTableId: 'boats' }),
        view({ id: 'Rigs', rootTableId: 'rigs', blocks: [block('boats')] }),
      ]),
      recs([mod({ id: 'Sales', tableIds: ['boats', 'motors'] })]),
    )
    expect(cascadeSay(out)).toBe(
      'This also removes the page Boats, a table from Sales and one section of a page.',
    )
  })
})
