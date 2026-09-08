/* ============================================================
   THE MODULE TILES — the first test in this repo that renders.

   WHY THIS FILE EXISTS. Measured at the time it was written: 158
   components, 67,459 lines of TSX and 68,713 lines of CSS, and
   not one automated check that any of it draws. The tile grid was
   just rebuilt — dashboard.css:2339 "THE TILE WITHOUT A MARK"
   moved the kind hue off a 112px plate onto a 3px rail, and
   CardBody.tsx:578 replaced twenty-five repeated glyphs with one
   colour key above the grid. Both changes are correct and both
   are one careless edit away from silently undoing themselves.

   WHAT IS ASSERTED, AND WHAT DELIBERATELY IS NOT. Every query
   below is by ROLE or by TEXT. Nothing here reads a class name:
   `.dsh-tile-name` can be renamed in an afternoon and the screen
   is still right, while a tile that has LOST its name is broken
   and every class in the file still matches. So the assertions
   are the four facts a person actually gets off this card — the
   name, the kind, the count, and a door that opens.

   THE ONE ATTRIBUTE THIS FILE DOES SELECT ON is `data-dsh-tile`,
   and it is not decoration. CardBody.tsx:549 hands that exact
   string to `useReorder` as `slotAttr` and reorder.ts:164
   measures every slot with `[${slotAttr}]`; rename it and drag-to
   -reorder stops working. It is also the only per-tile boundary
   in the markup — the tile is a `div` with no role and no label,
   so there is no accessible container to scope to — and binding
   to a contract the component must keep anyway is the least bad
   answer available. If the tile ever grows a role, scope to that
   instead and delete `tileFor`.

   THE FIXTURE IS SYNTHETIC AND TINY, on purpose. The logic suites
   assert against `src/demos/northside.ts` and pay about 7s at
   import for it (vitest.config.ts says so, and says why). Nothing
   below needs 23,000 lines to prove a name is drawn.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EntityDef, ModuleDef, RowData } from '@/types/model'
import type { QuoteDef } from '@/features/quote'

/* The store reaches Dexie through the repository. Mocked exactly as
   the logic suites mock it (store/undo.test.ts:14) — the subject here
   is what the card DRAWS, not what it persists, and nothing in this
   file goes through the store's `mutate`. */
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

const { useProjectStore } = await import('@/store/useProjectStore')
const { forgetTileOrder } = await import('./tileOrder')
const { CardBody } = await import('./CardBody')
const { TABLE_KINDS } = await import('@/types/model')
const { registerQuote } = await import('@/features/quote')

/* ---------------------------------------------------------- */
/* The fixture                                                */
/* ---------------------------------------------------------- */

const ISO = '2026-01-01T00:00:00.000Z'

function table(id: string, name: string, kind: 'boat' | 'trailer'): EntityDef {
  return {
    id,
    name,
    accent: 'blue',
    kind,
    /* THE NAMING COLUMN IS HEADED "Name" ON PURPOSE. `leafColumnName`
       (table/grouping.ts:395) refuses a header that is in NOT_A_KIND
       — 'name' is the first entry — so the census noun falls back to
       the KIND's own word, 'boats' / 'trailers'. That is what makes
       the picker's count sentence predictable rather than an accident
       of what a column happened to be called. */
    fields: [
      { id: `${id}-name`, name: 'Name', type: 'text' },
      { id: `${id}-price`, name: 'Price', type: 'number' },
    ],
    displayFieldId: `${id}-name`,
    position: { x: 0, y: 0 },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

function rows(entityId: string, n: number): RowData[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${entityId}-r${i}`,
    entityId,
    values: { [`${entityId}-name`]: `Row ${i}`, [`${entityId}-price`]: 1000 + i },
    createdAt: ISO,
    updatedAt: ISO,
  }))
}

function place(id: string, name: string, tableIds: string[], order: number): ModuleDef {
  return {
    id,
    name,
    description: `${name}, for the test`,
    tableIds,
    capabilities: ['browse', 'search', 'open', 'quote'],
    index: 'tiles',
    accent: 'blue',
    order,
    createdAt: ISO,
    updatedAt: ISO,
  }
}

/* THREE PLACES OUT OF TWO MODULES, which is the shape this card was
   rewritten for (CardBody.tsx:493 — "it listed the nine MODULES …
   those are categories"). `placesOf` splits a module holding more
   than one live table into one place per table, and leaves a
   single-table module as one place under the MODULE's name:

     Hull Range  ->  'Table A' (3 rows) and 'Boats' (12 rows)
     Road Gear   ->  'Road Gear' (7 rows)

   Three distinct counts, so no assertion below can pass against the
   wrong tile. None of these names carries a bundled brand mark —
   brandLogos.ts:50 matches whole words only, and its eight are
   highfield, stabicraft, stacer, jeanneau, haines, surtees, yamaha,
   nsm — so every tile here is the no-mark tile dashboard.css:2339
   is about, and each door's accessible name is its place name and
   nothing else. */
const A = table('e-a', 'Table A', 'boat')
const B = table('e-b', 'Boats', 'boat')
const T = table('e-t', 'Trailer Stock', 'trailer')

/** The smallest thing `isQuoteish` (quotes.ts:196) will let into the
 *  registry, pointed at one table. The tile only ever reads
 *  `rootTableId` — `quotesPerPlace` (cards.ts:460) counts by table and
 *  nothing else — so every other field is here to satisfy the type
 *  rather than to be asserted on. */
function quoteAgainst(tableId: string): QuoteDef {
  return {
    id: `q-${tableId}`,
    reference: 'Q-0001',
    state: 'draft',
    viewId: 'v-test',
    rootTableId: tableId,
    rootRowId: `${tableId}-r0`,
    subjectLabel: 'Row 0',
    subjectSpecs: [],
    sections: [],
    lines: [],
    adjustments: [],
    levelKey: 'retail',
    customer: { name: 'A walk-in' },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

const WHO = { userId: 'u-test', orgSlug: 'test-org' }

function acts() {
  return {
    onOpenTable: vi.fn(),
    onOpenModule: vi.fn(),
    onOpenModules: vi.fn(),
    onOpenQuote: vi.fn(),
    onOpenQuotes: vi.fn(),
    onOpenCustomers: vi.fn(),
    onOpenRules: vi.fn(),
    onOpenDataModel: vi.fn(),
    onNewQuote: vi.fn(),
    onFind: vi.fn(),
  }
}

/* REAL STORE STATE, NOT A MOCKED MODULE. `MyModules` reads three
   slices through three separate `useProjectStore` selectors
   (CardBody.tsx:525) and then runs `placesOf` over them; mocking the
   hook would test the fixture instead of the selectors, and the
   split-vs-single-table rule above is exactly the part worth
   exercising. `setState` is zustand's own door and merges, so the
   rest of the store keeps its defaults. */
function install(opts: { empty?: boolean } = {}): void {
  useProjectStore.setState(
    opts.empty
      ? { modules: {}, entities: {}, rowsByEntity: {} }
      : {
          modules: {
            'm-hulls': place('m-hulls', 'Hull Range', ['e-a', 'e-b'], 0),
            'm-road': place('m-road', 'Road Gear', ['e-t'], 1),
          },
          entities: { 'e-a': A, 'e-b': B, 'e-t': T },
          rowsByEntity: {
            'e-a': rows('e-a', 3),
            'e-b': rows('e-b', 12),
            'e-t': rows('e-t', 7),
          },
        },
  )
}

function draw(a = acts()) {
  render(
    <CardBody id="my-modules" me="Tester" userId={WHO.userId} orgSlug={WHO.orgSlug} acts={a} />,
  )
  return a
}

/** The tile a door belongs to — see the header for why this single
 *  attribute is allowed here and no class name is. */
function tileFor(name: string): HTMLElement {
  const door = screen.getByRole('button', { name })
  const tile = door.closest('[data-dsh-tile]')
  if (!(tile instanceof HTMLElement)) throw new Error(`no tile around the door "${name}"`)
  return tile
}

beforeEach(() => {
  /* The person's own tile order is a localStorage fact behind a
     module-level cache (tileOrder.ts:35). Both have to go, or one
     test inherits another's drag. */
  localStorage.clear()
  forgetTileOrder()
  install()
})

/* ---------------------------------------------------------- */

describe('the module tiles — every place gets a door', () => {
  it('draws one tile per place, not one per module', () => {
    draw()

    /* Counted by the grip, which is exactly one per tile
       (CardBody.tsx:744), so this fails both when a tile goes
       missing and when a spare one appears. Two modules, three
       places, three tiles. */
    expect(screen.getAllByRole('button', { name: /^Move / })).toHaveLength(3)

    for (const name of ['Table A', 'Boats', 'Road Gear']) {
      expect(screen.getByRole('button', { name })).toBeVisible()
    }
  })

  it('gives every door an accessible name, and it is the place', () => {
    draw()

    /* The face carries no aria-label: its name is computed from the
       text inside it, and `PlaceMark` draws nothing on these tiles
       (fallback 'none', PlaceMark.tsx:110). So an empty name here
       means the name span was lost — which is exactly what the
       `:has(img)` rules in dashboard.css:2360 would hide, and what
       CardBody.tsx:620 explains it is guarding against. */
    expect(screen.getByRole('button', { name: 'Table A' })).toHaveAccessibleName('Table A')
    expect(screen.getByRole('button', { name: 'Road Gear' })).toHaveAccessibleName('Road Gear')
  })

  it('opens the module the tile stands for', async () => {
    const a = draw()

    /* 'Boats' is a TABLE inside the 'Hull Range' module, so the act
       must carry the module's id and not the table's. This is the
       fault CardBody.tsx:604 exists to prevent, stated from the
       other end. */
    await userEvent.click(screen.getByRole('button', { name: 'Boats' }))
    expect(a.onOpenModule).toHaveBeenCalledTimes(1)
    expect(a.onOpenModule).toHaveBeenCalledWith('m-hulls')
  })
})

describe('the module tiles — what each one says', () => {
  it('says its own row count', () => {
    draw()

    expect(within(tileFor('Table A')).getByText('3')).toBeVisible()
    expect(within(tileFor('Boats')).getByText('12')).toBeVisible()
    expect(within(tileFor('Road Gear')).getByText('7')).toBeVisible()
  })

  it('names the module on a tile named after a table, and the kind on one named after its module', () => {
    draw()

    /* CardBody.tsx:665: the pill prints the MODULE, except where the
       place's name already IS the module's — there it prints the
       KIND, because printing "Road Gear" sixty pixels under "Road
       Gear" tells a person nothing. Both halves are asserted: a
       regression that dropped the exception would still look right
       on the two tiles that take the first branch. */
    expect(within(tileFor('Table A')).getByText('Hull Range')).toBeVisible()
    expect(within(tileFor('Boats')).getByText('Hull Range')).toBeVisible()
    expect(within(tileFor('Road Gear')).getByText(TABLE_KINDS.trailer.label)).toBeVisible()
    expect(within(tileFor('Road Gear')).queryAllByText('Road Gear')).toHaveLength(1)
  })

})
describe('the colour key above the grid', () => {
  it('lists the kinds that are present, in order, and no others', () => {
    draw()

    const key = screen.getByRole('list', { name: 'What the colours mean' })
    const said = within(key)
      .getAllByRole('listitem')
      .map((li) => li.textContent?.trim())

    /* Two boat tables and one trailer table, so two swatches, in
       TABLE_KINDS' own order — which is what places.ts:196 promises.
       The "All" chip `placeFilters` puts first is a filter and not a
       colour, and CardBody.tsx:577 drops it; back in the list it
       would be a swatch with no hue, so the WHOLE list is asserted
       rather than its members one at a time. */
    expect(said).toEqual([TABLE_KINDS.boat.label, TABLE_KINDS.trailer.label])
  })

  it('draws no swatch for a kind nobody has a table of', () => {
    draw()

    /* The point of the key: a legend explaining colours the screen
       never uses teaches a person not to read it. */
    const key = screen.getByRole('list', { name: 'What the colours mean' })
    expect(within(key).queryByText(TABLE_KINDS.motor.label)).toBeNull()
    expect(within(key).queryByText(TABLE_KINDS.package.label)).toBeNull()
  })
})

describe('the module tiles — nothing to draw', () => {
  it('says so in a sentence and offers the one act that would fix it', async () => {
    install({ empty: true })
    const a = draw()

    /* Never a blank rectangle and never a spinner over an answer
       already known to be zero — CardBody.tsx:20, rule 2. */
    expect(screen.getByText(/No modules yet/)).toBeVisible()
    expect(screen.queryByRole('list', { name: 'What the colours mean' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Modules' }))
    expect(a.onOpenModules).toHaveBeenCalledTimes(1)
  })
})

/* THIS BLOCK IS LAST IN THE FILE ON PURPOSE. The quote registry is a
   module-level Map behind a one-shot `loaded` latch (quotes.ts:169)
   and there is no reset seam, so a quote put in here is in for the
   rest of the file. Anything asserting "no quotes" must therefore run
   above it — which is why the empty half of the claim is asserted in
   the same test rather than in one of its own. */
describe('the quote count on a tile', () => {
  it('is absent at zero and present at one, on the tile it belongs to', async () => {
    draw()

    /* CardBody.tsx:690 — "a column of 0 down a grid of twenty-five
       tiles is noise that reads as a fault". */
    expect(within(tileFor('Table A')).queryByTitle(/quotes$/)).toBeNull()
    expect(within(tileFor('Boats')).queryByTitle(/quotes$/)).toBeNull()

    /* `registerQuote` is the file's own documented test seam
       (quotes.ts:873). One quote, against table 'e-a', which is the
       'Table A' place — cards.ts:451: "a quote points at a TABLE, not
       at a module", so Highfield's count is Highfield's and not
       Boats'. The tile next door must stay silent. */
    await act(async () => {
      registerQuote(quoteAgainst('e-a'))
    })

    expect(within(tileFor('Table A')).getByTitle('1 quotes')).toBeVisible()
    expect(within(tileFor('Boats')).queryByTitle(/quotes$/)).toBeNull()
    expect(within(tileFor('Road Gear')).queryByTitle(/quotes$/)).toBeNull()
  })
})

