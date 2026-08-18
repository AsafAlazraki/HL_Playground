/* ============================================================
   WHAT A TAB THAT IS NOT SAVING MAY DO TO THE SHEET: nothing.

   `writeLock.test.ts` proves the two tabs agree which of them owns
   the sheet. This proves the agreement has teeth — that the store
   itself declines, at the one seam every change passes through, and
   that the disk is never touched while it is declining.

   THE TEST THAT MATTERS MOST IS THE LAST ONE. A guard that refuses
   for ever is a tab a person cannot use, so the hold has to lift
   cleanly and leave the store exactly as capable as it was. That is
   the difference between a guard and a bug.

   Persistence is mocked, the same way `undo.test.ts` mocks it: the
   subject is what reaches the repository, and mocking it is what
   lets us count.
   ============================================================ */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntityDef } from '@/types/model'

const mockSaveAll = vi.fn(async () => {})
const mockWipe = vi.fn(async () => {})

vi.mock('@/db/repository', () => ({
  defaultMeta: () => ({
    id: 'default',
    name: 'Test Sheet',
    exportCount: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }),
  repository: {
    load: async () => null,
    saveAll: mockSaveAll,
    wipe: mockWipe,
  },
}))

const { useProjectStore } = await import('./useProjectStore')
const { allowWrites, holdWrites, readWriteGate, resetWriteGate, writesHeld } =
  await import('@/lib/writeGate')

const ISO = '2026-01-01T00:00:00.000Z'

const boats = (): EntityDef => ({
  id: 'e-boats',
  name: 'Boats',
  accent: 'blue',
  fields: [{ id: 'f-model', name: 'Model', type: 'text' }],
  displayFieldId: 'f-model',
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
})

/** a project with one table on it, written straight in so the
 *  fixture itself is not subject to the thing under test */
function given(): void {
  resetWriteGate()
  useProjectStore.setState({
    loaded: true,
    /* the whole store is module state and every test in this file
       shares it, so the fixture puts back everything a test can
       move — including the name, which is what one of them asserts */
    meta: {
      id: 'default',
      name: 'Test Sheet',
      exportCount: 0,
      updatedAt: ISO,
    },
    entities: { 'e-boats': boats() },
    groups: {},
    rules: {},
    rowsByEntity: { 'e-boats': [] },
    views: {},
    modules: {},
    past: [],
    future: [],
    selection: null,
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  mockSaveAll.mockClear()
  mockWipe.mockClear()
  given()
})

afterEach(() => {
  vi.useRealTimers()
  resetWriteGate()
})

/** run out the persist debounce, so anything owed to the disk lands */
const flush = () => vi.advanceTimersByTime(3000)

describe('while another tab holds the sheet', () => {
  it('declines a change instead of accepting one it will not keep', () => {
    holdWrites()
    useProjectStore.getState().setProjectName('Renamed')
    expect(useProjectStore.getState().meta.name).toBe('Test Sheet')
  })

  it('writes nothing to the disk, because it never got as far as trying', () => {
    holdWrites()
    useProjectStore.getState().createEntity({ name: 'Trailers' })
    useProjectStore.getState().setProjectName('Renamed')
    flush()
    expect(mockSaveAll).not.toHaveBeenCalled()
  })

  it('counts what it declined, so the notice can say what happened', () => {
    holdWrites()
    expect(readWriteGate().refused).toBe(0)
    useProjectStore.getState().setProjectName('One')
    useProjectStore.getState().setProjectName('Two')
    expect(readWriteGate().refused).toBe(2)
  })

  it('refuses undo too — an undo is a write, and it is written through', () => {
    /* a real step first, while this tab still owns the sheet */
    useProjectStore.getState().setProjectName('Before the hold')
    vi.advanceTimersByTime(0)
    holdWrites()
    expect(useProjectStore.getState().undo()).toBeNull()
    expect(useProjectStore.getState().meta.name).toBe('Before the hold')
    expect(readWriteGate().refused).toBe(1)
  })

  it('never empties the shared database out from under the tab that IS saving', async () => {
    holdWrites()
    await useProjectStore.getState().resetProject()
    expect(mockWipe).not.toHaveBeenCalled()
    expect(useProjectStore.getState().entities['e-boats']).toBeDefined()
  })
})

describe('when the hold lifts', () => {
  it('the tab is exactly as capable as it was before', () => {
    holdWrites()
    useProjectStore.getState().setProjectName('Refused')
    expect(useProjectStore.getState().meta.name).toBe('Test Sheet')

    allowWrites()
    expect(writesHeld()).toBe(false)
    /* the count went with the condition — it described a live state,
       not a history */
    expect(readWriteGate().refused).toBe(0)

    useProjectStore.getState().setProjectName('Accepted')
    expect(useProjectStore.getState().meta.name).toBe('Accepted')
    flush()
    expect(mockSaveAll).toHaveBeenCalled()
  })
})

describe('a tab on its own', () => {
  it('is never held, so this guard costs the common case nothing', () => {
    expect(writesHeld()).toBe(false)
    useProjectStore.getState().setProjectName('Northside Marine')
    expect(useProjectStore.getState().meta.name).toBe('Northside Marine')
  })
})
