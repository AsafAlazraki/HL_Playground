/* ============================================================
   THE ONE PROMISE THE BUILD SCREEN MAKES, MEASURED.

   `QuoteBuild` prints a sentence in its rig plate — "Every pick is
   written as you make it. Close this and come back to it — nothing
   here is held on the screen" — and that sentence is the whole
   reason the screen exists. The app it replaces holds seven wizard
   steps in React state with no draft, no autosave and no unload
   guard, so a refresh at step 6 destroys the build
   (docs/plan/hl-journeys.md §3.4, "the single most damaging
   friction"). A claim like that may not be taken on faith, and it
   may not be checked by squinting at the code: it is checked by
   THROWING THE PAGE AWAY AND COMING BACK.

   HOW A CLOSED TAB IS SIMULATED HERE. `vi.resetModules()` plus a
   fresh `import` gives a brand-new copy of `quotes.ts` — empty
   registry, `loaded` false, nothing carried over — reading a
   `localStorage` stub that outlives it. That is exactly the seam a
   reload crosses: module state dies, storage does not. Nothing else
   is stubbed, and the real `addLine`, `setQty` and `loadQuotes` run.

   WHAT THIS SUITE FOUND. Write-behind at 400 ms made the promise
   almost true and false at the only moment that matters: a person
   who makes their last pick and closes the tab is inside that
   window by definition. The middle case below is that gap, kept as
   a test rather than deleted, so the fix cannot silently rot back
   into an average. `flushQuotes` on `pagehide` is what closes it.
   ============================================================ */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QuoteDef, QuoteLine } from './types'

/* ---------------------------------------------------------- */
/* A tab: a storage that outlives a reload, and two event      */
/* targets that do not.                                        */
/* ---------------------------------------------------------- */

/** The disk. Survives every `resetModules` below, exactly as a real
 *  browser's localStorage survives a reload. */
const disk = new Map<string, string>()

const fakeStorage = {
  getItem: (k: string): string | null => (disk.has(k) ? (disk.get(k) as string) : null),
  setItem: (k: string, v: string): void => {
    disk.set(k, v)
  },
  removeItem: (k: string): void => {
    disk.delete(k)
  },
  clear: (): void => {
    disk.clear()
  },
  key: (): string | null => null,
  get length(): number {
    return disk.size
  },
}

type Handler = () => void

function makeBus(): {
  addEventListener: (t: string, fn: Handler) => void
  removeEventListener: (t: string, fn: Handler) => void
  fire: (t: string) => void
} {
  const map = new Map<string, Set<Handler>>()
  return {
    addEventListener(t, fn) {
      const set = map.get(t) ?? new Set<Handler>()
      set.add(fn)
      map.set(t, set)
    },
    removeEventListener(t, fn) {
      map.get(t)?.delete(fn)
    },
    fire(t) {
      for (const fn of [...(map.get(t) ?? [])]) fn()
    },
  }
}

let windowBus = makeBus()
let documentBus = makeBus()

beforeEach(() => {
  /* FAKE TIMERS SO THE WRITE-BEHIND IS DECIDED RATHER THAN RACED.
     Half of what is being measured here is a 400 ms window; a case
     that waited on the wall clock would leave a live timer owing a
     write into the NEXT case, and a suite that fails on machine load
     rather than on truth teaches people to re-run it. */
  vi.useFakeTimers()
  disk.clear()
  windowBus = makeBus()
  documentBus = makeBus()
  vi.stubGlobal('localStorage', fakeStorage)
  vi.stubGlobal('window', windowBus)
  vi.stubGlobal('document', { ...documentBus, visibilityState: 'visible' })
})

afterEach(() => {
  /* No case may start owing a write from the last one — the failure
     mode a sibling guard in this repo already paid for. */
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.resetModules()
})

/* ---------------------------------------------------------- */
/* The smallest honest build — a hull, and a motor picked onto */
/* it one step later.                                          */
/* ---------------------------------------------------------- */

function line(id: string, label: string, unitPrice: number): QuoteLine {
  return {
    id,
    entityId: 'tbl_boats',
    rowId: `row_${id}`,
    label,
    qty: 1,
    unitPrice,
    priceFieldId: 'fld_cash',
    priceColumnName: 'Cash',
    levelKey: 'cash',
    levelResolved: 'cash',
    levels: [
      { key: 'cash', label: 'Cash', fieldId: 'fld_cash', value: unitPrice, scope: 'quote' },
    ],
  }
}

/** A quote as `QuoteBuild` finds it: the subject decided on the view
 *  page, and one empty step waiting for a pick. */
function started(): QuoteDef {
  const hull = line('l-hull', 'Highfield SP 560', 62000)
  return {
    id: 'q-build',
    reference: 'Q-BUILD',
    state: 'draft',
    viewId: 'view_1',
    rootTableId: 'tbl_boats',
    rootRowId: 'row_1',
    subjectLabel: 'Highfield SP 560',
    subjectSpecs: [],
    sections: [
      { blockId: '__subject', tableId: 'tbl_boats', title: 'Boats', lineIds: [hull.id] },
      { blockId: 'blk_motor', tableId: 'tbl_motors', title: 'Motors', lineIds: [] },
    ],
    lines: [hull],
    adjustments: [],
    levelKey: 'cash',
    customer: { name: '' },
    createdAt: new Date(2026, 7, 27).toISOString(),
    updatedAt: new Date(2026, 7, 27).toISOString(),
  }
}

type QuotesModule = typeof import('./quotes')

/** Three steps of a build, through the real writers the screen calls.
 *  Returns the module the person was working in. */
async function buildThreeSteps(): Promise<QuotesModule> {
  const mod: QuotesModule = await import('./quotes')
  mod.registerQuote(started())
  mod.addLine('q-build', 'blk_motor', line('l-motor', 'Yamaha F150XC', 29000))
  mod.setQty('q-build', 'l-motor', 2)
  return mod
}

/** The tab is gone. A new one opens, reads what is on disk, and this
 *  is what it finds. */
async function reopen(): Promise<QuoteDef | undefined> {
  vi.resetModules()
  const fresh: QuotesModule = await import('./quotes')
  fresh.loadQuotes()
  return fresh.getQuote('q-build')
}

/* ---------------------------------------------------------- */

describe('a build survives the page being closed', () => {
  it('keeps every pick when the write-behind has run', async () => {
    await buildThreeSteps()
    await vi.advanceTimersByTimeAsync(500)

    const back = await reopen()
    expect(back).toBeDefined()
    /* the hull the quote was raised on, and the motor picked after */
    expect(back?.lines.map((l) => l.label)).toEqual(['Highfield SP 560', 'Yamaha F150XC'])
    /* the quantity typed on the step, not the default */
    expect(back?.lines[1].qty).toBe(2)
    /* and the step still knows which of its lines is on it */
    expect(back?.sections[1].lineIds).toEqual(['l-motor'])
    /* frozen figures, unchanged by the round trip */
    expect(back?.lines[1].unitPrice).toBe(29000)
  })

  /* THE GAP THIS SUITE WAS WRITTEN TO FIND, kept so it cannot come
     back. Without a flush, closing inside the 400 ms costs the build
     — and closing right after the last pick is not an edge case, it
     is what finishing looks like. */
  it('would lose the whole build if the tab closed inside the write-behind window', async () => {
    await buildThreeSteps()
    /* no wait, no pagehide: the tab simply goes */
    const back = await reopen()
    expect(back).toBeUndefined()
  })

  it('keeps every pick when the tab closes immediately, because pagehide flushes', async () => {
    await buildThreeSteps()
    windowBus.fire('pagehide')

    const back = await reopen()
    expect(back).toBeDefined()
    expect(back?.lines.map((l) => l.label)).toEqual(['Highfield SP 560', 'Yamaha F150XC'])
    expect(back?.lines[1].qty).toBe(2)
  })

  it('keeps every pick when the tab is only hidden and then killed', async () => {
    await buildThreeSteps()
    vi.stubGlobal('document', { ...documentBus, visibilityState: 'hidden' })
    documentBus.fire('visibilitychange')

    const back = await reopen()
    expect(back?.lines).toHaveLength(2)
  })

  it('does nothing at all when nothing is owed', async () => {
    const mod = await buildThreeSteps()
    windowBus.fire('pagehide')
    const written = disk.get('helmlogic.quotes.v1')
    /* a second close writes nothing new and cannot corrupt what is
       there — the flush is idempotent */
    windowBus.fire('pagehide')
    mod.flushQuotes()
    expect(disk.get('helmlogic.quotes.v1')).toBe(written)
  })
})
