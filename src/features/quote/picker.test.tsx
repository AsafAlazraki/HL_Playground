/* ============================================================
   THE QUOTE PICKER'S FIRST SCREEN — the grid of places, and the
   band of places that cannot sell anything yet.

   WHY HERE. This is the first question of the most important flow
   in the application, and it was rebuilt twice in short order:
   `quoteDoors` (start.ts:195) stopped offering four CATEGORIES and
   started offering one door per PLACE, and picker.css:1067 "THE
   CARD WITHOUT A MARK" took the kind hue off a 92px plate behind
   the card's own heading. Measured there: 18 cards on this screen
   and zero images among them. Neither change has had anything
   under it until now.

   WHAT IS ASSERTED. Role and text only — never a class. A card is
   found by its accessible name, the grid and the shut band by
   their labels, the band's state by `aria-expanded`. Every one of
   those is a thing a person (or a screen reader) can perceive; a
   class name is not, and a test that asserted on `.qs-card` would
   pass on a screen with no names on it.

   NO STORE IS SET UP, AND THAT IS THE COMPONENT'S OWN DOING.
   `QuoteStartProps` takes `modules`, `entities` and `rowsByEntity`
   as props — "the sheet, handed over rather than read"
   (QuoteStart.tsx:180). So the fixture is three arguments, and the
   only reason `@/db/repository` is mocked below is that
   `useConstraints` reaches the project store for the org key
   (constraintDefs.ts:152) and the store pulls Dexie in behind it.

   THE FIXTURE IS SYNTHETIC AND TINY. The logic suites assert
   against the real seed and pay about 7s at import for it
   (vitest.config.ts). Proving that a card says its count does not
   need 23,000 lines of real catalogue.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EntityDef, ModuleDef, RowData } from '@/types/model'

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

const { QuoteStart } = await import('./QuoteStart')

/* ---------------------------------------------------------- */
/* The fixture                                                */
/* ---------------------------------------------------------- */

const ISO = '2026-01-01T00:00:00.000Z'

function table(id: string, name: string, kind: 'boat' | 'trailer' | 'accessory'): EntityDef {
  return {
    id,
    name,
    accent: 'blue',
    kind,
    /* "Name" is in NOT_A_KIND (table/grouping.ts:316), so `leafNoun`
       falls through to the KIND's own word and the census noun is
       'boats' / 'trailers' rather than whatever a column happened to
       be headed. That is what makes the count sentences below exact
       strings instead of patterns. */
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

function place(
  id: string,
  name: string,
  tableIds: string[],
  order: number,
  canQuote: boolean,
): ModuleDef {
  return {
    id,
    name,
    description: `${name}, for the test`,
    tableIds,
    /* DEFAULT_CAPABILITIES plus, or minus, the one verb this whole
       screen turns on: `refusalFor` (start.ts:160) shuts a door that
       does not declare `quote` and says which switch clears it. */
    capabilities: canQuote ? ['browse', 'search', 'open', 'quote'] : ['browse', 'search', 'open'],
    index: 'tiles',
    accent: 'blue',
    order,
    createdAt: ISO,
    updatedAt: ISO,
  }
}

/* FIVE PLACES: THREE THAT CAN SELL AND TWO THAT CANNOT, which is
   the split this screen is built around — a grid of cards and a
   collapsed band beneath it, never one list with half of it greyed
   (QuoteStart.tsx:481).

     Hull Range   two live tables -> two doors, 'Table A' and 'Boats'
     Road Gear    one live table  -> one door under the MODULE's name
     Reference Shelf              -> shut: it does not declare Quote
     Empty Bay                    -> shut: its table has no rows

   Three distinct counts (3, 12, 7) so no assertion can pass against
   the wrong card, and no name here matches one of brandLogos.ts's
   eight whole-word brands, so every card is the no-mark card
   picker.css:1067 is about. */
const entities: Record<string, EntityDef> = {
  'e-a': table('e-a', 'Table A', 'boat'),
  'e-b': table('e-b', 'Boats', 'boat'),
  'e-t': table('e-t', 'Trailer Stock', 'trailer'),
  'e-ref': table('e-ref', 'Reference Rows', 'accessory'),
  'e-empty': table('e-empty', 'Empty Table', 'accessory'),
}

const modules: Record<string, ModuleDef> = {
  'm-hulls': place('m-hulls', 'Hull Range', ['e-a', 'e-b'], 0, true),
  'm-road': place('m-road', 'Road Gear', ['e-t'], 1, true),
  'm-ref': place('m-ref', 'Reference Shelf', ['e-ref'], 2, false),
  'm-empty': place('m-empty', 'Empty Bay', ['e-empty'], 3, true),
}

const rowsByEntity: Record<string, RowData[]> = {
  'e-a': rows('e-a', 3),
  'e-b': rows('e-b', 12),
  'e-t': rows('e-t', 7),
  'e-ref': rows('e-ref', 5),
  'e-empty': [],
}

function draw() {
  const on = {
    onStarted: vi.fn(),
    onOpenPlace: vi.fn(),
    onClose: vi.fn(),
  }
  render(
    <QuoteStart
      modules={modules}
      entities={entities}
      rowsByEntity={rowsByEntity}
      onStarted={on.onStarted}
      onOpenPlace={on.onOpenPlace}
      onClose={on.onClose}
    />,
  )
  return on
}

const grid = (): HTMLElement =>
  screen.getByRole('list', { name: 'The places you can quote from' })

const band = (): HTMLElement =>
  screen.getByRole('button', { name: /No quoting here yet/ })

beforeEach(() => {
  /* `unaddressedDraftFor` and the quote registry both read
     localStorage (quotes.ts). Nothing here writes a quote, but a
     leftover from another suite would change what layer two offers. */
  localStorage.clear()
})

/* ---------------------------------------------------------- */

describe('the picker grid — one card per place that can sell', () => {
  it('draws a card for every open place, in the dealer’s own order', () => {
    draw()

    const cards = within(grid()).getAllByRole('listitem')
    expect(cards).toHaveLength(3)

    /* THE ORDER IS ASSERTED, not just the membership. start.ts:186:
       "the order is the dashboard's and not a ranking" — sorting the
       doors that work to the top would be a second opinion about
       where a dealer's own places live, and a person who has learned
       the dashboard once should not have to learn a different list
       here. So: module order, then table order within a module. */
    const expected = ['Table A, 3 boats', 'Boats, 12 boats', 'Road Gear, 7 trailers']
    cards.forEach((cell, i) => {
      expect(within(cell).getByRole('button')).toHaveAccessibleName(expected[i])
    })

    /* The two shut places are not cards. QuoteStart.tsx:481: "a shut
       door is a band and not a card" — a door that opens onto an
       empty shelf is the thing this screen refuses to draw. */
    expect(within(grid()).queryByText('Reference Shelf')).toBeNull()
    expect(within(grid()).queryByText('Empty Bay')).toBeNull()
  })

  it('gives each card an accessible name of the place and its count', () => {
    draw()

    /* ModuleCard sets this label itself (QuoteStart.tsx:745) because
       the mark, when there is one, is an image whose alt is
       suppressed — so without the label a screen reader would reach
       a button called nothing at all. The count is the dealer's own
       plural, from the census, not a row noun. */
    expect(screen.getByRole('button', { name: 'Table A, 3 boats' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Boats, 12 boats' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Road Gear, 7 trailers' })).toBeVisible()
  })

  it('prints the name and the count on the card as well as in its label', () => {
    draw()

    /* The label is what a screen reader gets; these are what a person
       reading the screen gets, and they are drawn by two different
       expressions. Asserting only the label would let the visible
       count go stale in silence. */
    const card = screen.getByRole('button', { name: 'Boats, 12 boats' })
    expect(within(card).getByText('Boats')).toBeVisible()
    expect(within(card).getByText('12 boats')).toBeVisible()
    /* the eyebrow: the category above the name, never the heading */
    expect(within(card).getByText('Hull Range')).toBeVisible()

    /* THE 'Boats' CARD IS USED HERE RATHER THAN 'Road Gear' BECAUSE
       'Road Gear' PRINTS ITS OWN NAME TWICE, and that is a real fault
       rather than a quirk of this fixture. `qs-card-cat` is
       `door.moduleName` (QuoteStart.tsx:773), and for a single-table
       module the place IS the module, so the eyebrow repeats the
       heading — measured on this fixture, "Road Gear" appears twice
       inside one card. The dashboard tile has the exception for
       exactly this case and says why (CardBody.tsx:665: "so the pill
       printed the tile's own name a second time, sixty pixels under
       the first"); this card has no equivalent. Recorded, not
       asserted: fixing it means editing QuoteStart.tsx, which this
       file does not own. Not verified against the real seed. */
  })
})

describe('the picker grid — picking a place', () => {
  it('opens that place, and only that place', async () => {
    draw()

    await userEvent.click(screen.getByRole('button', { name: 'Table A, 3 boats' }))

    /* The place's own name becomes the heading and its count stands
       beside it (QuoteStart.tsx:431). The grid is gone: this is one
       screen walking to the next, not a selection highlight — which
       is the change QuoteStart.tsx:169 records. */
    expect(screen.getByRole('heading', { name: 'Table A' })).toBeVisible()
    expect(screen.getByText('3 boats')).toBeVisible()
    expect(screen.queryByRole('list', { name: 'The places you can quote from' })).toBeNull()

    /* and there is a way back, named */
    expect(screen.getByRole('button', { name: 'Back to the modules' })).toBeVisible()
  })

  it('walks back to the grid with every card still there', async () => {
    draw()

    await userEvent.click(screen.getByRole('button', { name: 'Road Gear, 7 trailers' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back to the modules' }))

    expect(within(grid()).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('heading', { name: 'What are you quoting?' })).toBeVisible()
  })
})

describe('the shut band — the places with nothing to quote', () => {
  it('states its count and is collapsed', () => {
    draw()

    /* Two shut doors, said as a number and not as two paragraphs.
       QuoteStart.tsx:474 measured the alternative: five shut doors on
       the real sheet is 110 words permanently in front of the nine
       cards that work. */
    expect(within(band()).getByText('2')).toBeVisible()
    expect(band()).toHaveAttribute('aria-expanded', 'false')

    /* collapsed means ABSENT, not hidden: nothing renders the rows */
    expect(screen.queryByText(/Turn Quote on in its settings/)).toBeNull()
    expect(screen.queryByText(/There is nothing in Empty Bay yet/)).toBeNull()
  })

  it('gives every refusal in full when it is opened', async () => {
    draw()

    await userEvent.click(band())
    expect(band()).toHaveAttribute('aria-expanded', 'true')

    /* One sentence per shut place, each naming the place it is about
       and the switch that would clear it — rule 10, "a reason in the
       place where the thing is refused". */
    expect(screen.getByText(/Reference Shelf is for browse, search and open one\./)).toBeVisible()
    expect(screen.getByText(/Turn Quote on in its settings/)).toBeVisible()
    expect(screen.getByText(/There is nothing in Empty Bay yet/)).toBeVisible()
  })

  it('offers the door to each shut place, and it goes to that module', async () => {
    const on = draw()

    await userEvent.click(band())
    await userEvent.click(screen.getByRole('button', { name: 'Open Reference Shelf' }))

    expect(on.onOpenPlace).toHaveBeenCalledTimes(1)
    expect(on.onOpenPlace).toHaveBeenCalledWith('m-ref')
    /* the refusal is a door, not a dead end — and it does not start
       a quote on the way */
    expect(on.onStarted).not.toHaveBeenCalled()
  })

  it('shuts again when it is pressed a second time', async () => {
    draw()

    await userEvent.click(band())
    await userEvent.click(band())

    expect(band()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Open Reference Shelf' })).toBeNull()
  })
})

describe('the picker with no places at all', () => {
  it('says what a module is instead of drawing an empty grid', () => {
    render(
      <QuoteStart
        modules={{}}
        entities={{}}
        rowsByEntity={{}}
        onStarted={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText(/There are no places in this business yet/)).toBeVisible()
    expect(screen.queryByRole('list', { name: 'The places you can quote from' })).toBeNull()
    expect(screen.queryByRole('button', { name: /No quoting here yet/ })).toBeNull()
  })
})
