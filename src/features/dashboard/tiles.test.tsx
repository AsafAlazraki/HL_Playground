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
const { forgetPlacesHeld } = await import('./usePlaces')
/* WHICH DOOR SOMEBODY CAME THROUGH. A module-level map with no
   reset between mounts (openPlace.ts:36), so it is cleared like
   the tile order is — and read, because "the door stood at no one
   brand" is the fact that separates a door from a tile. */
const { forgetPlaces, placeFor } = await import('@/features/modules/openPlace')
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
function install(opts: { empty?: boolean; noModules?: boolean } = {}): void {
  const tables = {
    entities: { 'e-a': A, 'e-b': B, 'e-t': T },
    rowsByEntity: {
      'e-a': rows('e-a', 3),
      'e-b': rows('e-b', 12),
      'e-t': rows('e-t', 7),
    },
  }
  /* THREE STATES, NOT TWO, AND THE THIRD IS THE COMMON ONE.
     `empty` is a project with nothing in it at all; `noModules` is
     a person who has just loaded a price file and not yet made a
     place out of it — which is the state DESIGN_CONTRACT §6 is
     written about ("You have 21 tables and no modules") and the
     one the empty state's counted line only exists for. */
  useProjectStore.setState(
    opts.empty
      ? { modules: {}, entities: {}, rowsByEntity: {} }
      : opts.noModules
      ? { modules: {}, ...tables }
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
  forgetPlaces()
  /* the places are held beside the arguments that produced them
     (usePlaces.ts), and `install()` hands the store new objects
     each time — so this is belt and braces rather than a fix for a
     failure, and it costs one line */
  forgetPlacesHeld()
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

  /* AND ON A PROJECT THAT HAS DATA, IT SAYS WHAT THE DATA IS.
     DESIGN_CONTRACT §6 gives the reason out loud: "An admin
     arriving here has drawn 21 tables and loaded 651 rows; a blank
     screen saying 'nothing here' would read as though the app had
     lost them." §11 checklists it. This dashboard drew two of the
     four parts, and this is the guard on the two that were added —
     asserted by TEXT, so it survives every rename of the classes
     that draw it and fails the day the count goes back to being
     absent. */
  it('draws all four parts, and the count is the real one', () => {
    install({ noModules: true })
    draw()

    /* one — the state, as its own line */
    expect(screen.getByText('No modules yet')).toBeVisible()
    /* two — what a module IS, and it does not restate the state */
    expect(screen.getByText(/A module is a place in the business/)).toBeVisible()
    /* three — what this person already has, counted from the store
       and not from the fixture: three tables are installed above */
    expect(screen.getByText(/You have/)).toHaveTextContent(
      'You have 3 tables and no modules.',
    )
    /* FOUR — AND THE ACTION IS NAMED NOW.

       It was one button called "Modules". On a sheet whose tables
       already say what they hold, the fourth part is the modules
       those tables imply, and each one is the same act with the
       answer written on it — so the generic door goes rather than
       standing beside five named ones saying the same word. It is
       still ONE action (§6); it is the door out of the card, in the
       card head, that a person takes to reach the modules screen
       whole. The empty-project case above still draws the generic
       button, because there is nothing to propose. */
    expect(screen.queryByRole('button', { name: 'Modules' })).toBeNull()
    expect(screen.getByRole('button', { name: /^Make Boats/ })).toBeVisible()
  })

  /* AND IT NEVER PRINTS A FIGURE TO FILL A HOLE. A project with no
     tables has nothing to count, so the card draws three parts and
     says so — "You have 0 tables and no modules" would be the
     dashboard inventing a fact about an empty project. */
  it('draws no count on a project that has nothing to count', () => {
    install({ empty: true })
    draw()
    expect(screen.queryByText(/You have/)).toBeNull()
  })
})

/* ============================================================
   THE MODULES THE DATA IMPLIES.

   The first-run moment: a dealer has loaded a price file and the
   front door does not yet know what they sell. It does — every
   table declares its kind — so the empty card proposes, and the
   whole of what is asserted here is the line between a proposal
   and a guess:

     · the tables it would hold are NAMED, and named in the
       accessible label as well as on screen, or a person cannot
       check the proposal before pressing it
     · pressing one opens the panel that ALREADY makes modules,
       standing on the proposal — not a second create path
     · a table already in a module is not proposed again, so the
       block empties itself as a person builds
   ============================================================ */

describe('the modules a sheet implies', () => {
  it('names them, counts them, and lists what each one would hold', () => {
    install({ noModules: true })
    draw()

    expect(screen.getByText('What your tables suggest')).toBeVisible()

    const offers = screen.getAllByRole('button', { name: /^Make / })
    expect(offers).toHaveLength(2)

    /* THE WHOLE PROPOSAL IS IN THE ACCESSIBLE NAME. The second line
       of the row is the evidence, and a person who cannot see it
       has to be able to check the same fact — so the label carries
       the count AND the table names rather than "Make Boats".
       Biggest first: e-b has 12 rows and e-a has 3. */
    expect(offers[0]).toHaveAccessibleName('Make Boats from 2 tables — 15 rows: Boats, Table A')
    /* AND A PROPOSAL OVER ONE TABLE TAKES THAT TABLE'S OWN NAME
       rather than the category — 'Trailer Stock', not 'Trailers'. */
    expect(offers[1]).toHaveAccessibleName(
      'Make Trailer Stock from 1 table — 7 rows: Trailer Stock',
    )

    /* and the same two facts are on the screen, not only in the
       label: the count, and the tables by name */
    expect(offers[0]).toHaveTextContent('2 tables · 15 rows')
    expect(offers[0]).toHaveTextContent('Boats · Table A')
  })

  it('opens the panel that makes modules, standing on the proposal', async () => {
    install({ noModules: true })
    draw()

    await userEvent.click(screen.getByRole('button', { name: /^Make Boats/ }))

    /* THE REAL PANEL, not a second one. It is the only thing in
       this application that calls `createModule`, and it arrives
       with the two clicks a person would have made already made —
       visible, and still theirs to change. */
    const panel = screen.getByRole('dialog', { name: 'What is this module about?' })
    expect(
      within(panel).getByRole('button', { name: 'Make a module about Boats', pressed: true }),
    ).toBeVisible()
    expect(within(panel).getByRole('checkbox', { name: 'Include Table A' })).toBeChecked()
    expect(within(panel).getByRole('textbox', { name: 'Module name' })).toHaveValue('Boats')
  })

  it('proposes nothing when every table already has a home', () => {
    install()
    draw()
    expect(screen.queryByText('What your tables suggest')).toBeNull()
    expect(screen.queryByText('Not in a module yet')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Make / })).toBeNull()
  })

  /* THE NEAR-EMPTY CARD, which is the same moment a day later: one
     module made, the rest of the sheet still standing outside it.
     The proposal moves under the tiles and keeps its press. */
  it('keeps proposing under the tiles while tables are still outside a module', () => {
    install({ noModules: true })
    useProjectStore.setState({ modules: { 'm-road': place('m-road', 'Road Gear', ['e-t'], 0) } })
    forgetPlacesHeld()
    draw()

    expect(screen.getByRole('button', { name: 'Road Gear' })).toBeVisible()
    expect(screen.getByText('Not in a module yet')).toBeVisible()
    expect(screen.getByRole('button', { name: /^Make Boats/ })).toBeVisible()
    /* the trailer table is inside Road Gear now, so nothing
       proposes it a second time */
    expect(screen.queryByRole('button', { name: /^Make Trailer Stock/ })).toBeNull()
  })

  /* DESIGN_CONTRACT §5 — "a count must say what it left out". The
     line above says four tables; the proposals hold three; the
     fourth is refused, in place, with the reason and the fix. */
  it('accounts for the table it cannot propose, where the count is', () => {
    install({ noModules: true })
    const loose: EntityDef = { ...table('e-x', 'Labour Rates', 'boat') }
    delete loose.kind
    useProjectStore.setState({ entities: { 'e-a': A, 'e-b': B, 'e-t': T, 'e-x': loose } })
    forgetPlacesHeld()
    draw()

    expect(screen.getByText(/You have/)).toHaveTextContent('You have 4 tables and no modules.')
    expect(screen.getAllByRole('button', { name: /^Make / })).toHaveLength(2)
    expect(screen.getByText(/1 table declares no kind/)).toBeVisible()
    expect(screen.getByText(/a kind on the sheet/)).toBeVisible()
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


/* ============================================================
   THE DOORS — the catalogue, entered by kind.

   THE SAME FIXTURE, READ ONE LEVEL UP. `install()` builds two
   modules over three tables: 'Hull Range' holds two BOAT tables
   (3 + 12 rows) and 'Road Gear' holds one TRAILER table (7). The
   modules card above draws three tiles out of that, one per
   brand; this card draws two doors out of it, one per kind — and
   that is the whole difference the doors exist for. Every route
   from this dashboard into the catalogue went through a brand.

   ASSERTED BY ROLE AND BY TEXT, like everything else in this
   file. The one thing that is queried structurally is the `img`,
   because "there is no photograph here" is a fact about the
   markup and there is no role for its absence.
   ============================================================ */

function drawDoors(a = acts()) {
  render(
    <CardBody id="what-we-sell" me="Tester" userId={WHO.userId} orgSlug={WHO.orgSlug} acts={a} />,
  )
  return a
}

describe('the doors — one per kind, not one per brand', () => {
  it('draws a door for each kind that sits behind one module', () => {
    drawDoors()

    /* Two modules, three places, TWO doors: the two boat brands are
       one kind and the trailer brand is the other. */
    expect(screen.getByRole('button', { name: /^Boats/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /^Trailers/ })).toBeVisible()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  /* THE COUNT IS THE KIND'S, SUMMED. 3 + 12 across the two boat
     brands, and the noun is the dealer's own word for a row —
     which on this fixture falls back to the kind's, for the reason
     `table()` above states. */
  it('says what is behind it, counted across every brand of that kind', () => {
    drawDoors()

    expect(screen.getByRole('button', { name: /^Boats/ })).toHaveAccessibleName(
      'Boats 15 boats',
    )
    expect(screen.getByRole('button', { name: /^Trailers/ })).toHaveAccessibleName(
      'Trailers 7 trailers',
    )
  })

  /* WHAT A DOOR OPENS, AND THE ONE FACT THAT SEPARATES IT FROM A
     TILE. A tile records the table it was pressed at and the
     workspace stands at that brand; a door clears it, so the
     workspace opens on every brand of the kind at once. */
  it('opens the module that holds the kind, standing at no one brand', async () => {
    const a = drawDoors()

    await userEvent.click(screen.getByRole('button', { name: /^Boats/ }))
    expect(a.onOpenModule).toHaveBeenCalledTimes(1)
    expect(a.onOpenModule).toHaveBeenCalledWith('m-hulls')
    expect(placeFor('m-hulls')).toBeUndefined()
  })

  /* NOTHING IS SUBSTITUTED. No row in this fixture carries a
     photograph, so no door draws one — never a stock image, never
     another kind's boat. The kind's own symbol stands in, which is
     `PlaceMark`'s rule for a place with no logo. */
  it('draws no photograph where no row of that kind has one', () => {
    const { container } = render(
      <CardBody id="what-we-sell" me="Tester" userId={WHO.userId} orgSlug={WHO.orgSlug} acts={acts()} />,
    )
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  /* THE EMPTY STATE COUNTS WHAT THE PERSON ACTUALLY HAS. A price
     file with no places made out of it yet is the state
     DESIGN_CONTRACT §6 is written about, and the doors card owes
     the same four parts every other card owes. */
  it('counts the tables a person has when no place has been made yet', () => {
    install({ noModules: true })
    drawDoors()

    expect(screen.getByText(/You have/)).toHaveTextContent('You have 3 tables and no places yet.')
    expect(screen.getByRole('button', { name: 'Modules' })).toBeVisible()
  })
})
