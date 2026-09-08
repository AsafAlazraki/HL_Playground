/* ============================================================
   THE REGISTER'S KEYBOARD — the fifth rendering suite in this repo.

   WHY IT EXISTS. Measured on this screen before the keyboard was
   built, at 1280x800 against a register of twelve: ArrowDown moved
   focus nowhere, `J` moved focus nowhere, `X` marked nothing, the
   list held TWELVE tab stops, and there were zero checkboxes and
   zero `aria-selected` nodes in it. All of that is behaviour now,
   and behaviour with no test under it is behaviour that goes back
   to nothing the next time somebody refactors the map.

   THE ONE PART HERE THAT IS NOT A CONVENIENCE is the last describe
   block. WCAG 2.1.4 is a Level A success criterion and `J`/`K`/`X`
   are single-character shortcuts; the two claims that make them
   legal — that a letter means nothing unless the list holds the
   focus, and that turning the letters off costs the keyboard no
   function at all — are exactly the kind of claim that is true on
   the day it is written and quietly false a month later.

   QUERIES ARE BY ROLE AND BY TEXT. `tiles.test.tsx` says why and
   the reason has not changed: a test that asserts on a class name
   fails when the class is renamed and passes when the screen is
   broken. The one exception is `document.activeElement`, which is
   the subject here rather than a selector.
   ============================================================ */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { EntityDef, RowData } from '@/types/model'

/* Mocked exactly as the other suites mock it — the subject is what
   the register DRAWS and what the keyboard DOES, never what either
   persists. */
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
const { CustomerList } = await import('./CustomerList')
const { CUSTOMER_TABLE_ID, CUSTOMER_PHONE_FIELD } = await import('./customers')

const ISO = '2026-01-01T00:00:00.000Z'
const NAME = `${CUSTOMER_TABLE_ID}-name`

/* FIVE PEOPLE, NO TWO SHARING A FIRST LETTER — a keyboard test that
   cannot tell the third row from the fourth proves nothing about
   whether the cursor moved one or two. Nothing marine and nothing
   out of the price file: this feature is the one place in the app
   that deliberately knows nothing about what is sold. */
const PEOPLE: ReadonlyArray<readonly [string, string]> = [
  ['Alderney Marine Services', '021 448 9910'],
  ['Brookvale Boat Yard', '027 330 1188'],
  ['Cavill Trailers', '09 486 2200'],
  ['Dunmore Charters', '021 776 4301'],
  ['Eastbrook Fisheries', '03 578 9012'],
]

const who = (i: number): string => PEOPLE[i]?.[0] ?? ''

const REGISTER: EntityDef = {
  id: CUSTOMER_TABLE_ID,
  name: 'Customers',
  accent: 'teal',
  kind: 'custom',
  role: 'base',
  fields: [
    { id: NAME, name: 'Name', type: 'text' },
    { id: CUSTOMER_PHONE_FIELD, name: 'Phone', type: 'text' },
  ],
  displayFieldId: NAME,
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
}

const ROWS: RowData[] = PEOPLE.map(([name, phone], i) => ({
  id: `cst-${i}`,
  entityId: CUSTOMER_TABLE_ID,
  values: { [NAME]: name, [CUSTOMER_PHONE_FIELD]: phone },
  createdAt: ISO,
  updatedAt: ISO,
}))

/** Who the browser says has the focus, by the accessible name the
 *  screen gives them. */
const focused = (): string =>
  document.activeElement?.getAttribute('aria-label') ?? '(nothing)'

/** Everybody marked, in the order the register draws them. */
const marked = (): string[] =>
  screen
    .getAllByRole('checkbox')
    .filter((box) => (box as HTMLInputElement).checked)
    .map((box) => (box.getAttribute('aria-label') ?? '').replace(/^Select /, ''))

/** Put the cursor on somebody, the way a pointer would. */
const land = (i: number): void => {
  screen.getByRole('button', { name: who(i) }).focus()
}

function draw(): {
  user: ReturnType<typeof userEvent.setup>
  onOpen: ReturnType<typeof vi.fn>
} {
  const onOpen = vi.fn()
  const user = userEvent.setup()
  render(<CustomerList onOpen={onOpen} />)
  return { user, onOpen }
}

beforeEach(() => {
  useProjectStore.setState({
    entities: { [CUSTOMER_TABLE_ID]: REGISTER },
    rowsByEntity: { [CUSTOMER_TABLE_ID]: ROWS },
  })
  /* The letter-key preference outlives a render on purpose — it is
     the device's, not the page's — so each test starts from the
     shipped default rather than from what the last one chose. */
  localStorage.clear()
})

describe('the register moves under the keyboard', () => {
  it('is ONE tab stop, not one per person', async () => {
    const { user } = draw()

    /* Tab has to cross the find box, the sort and New customer
       first; when it reaches the list it lands on the FIRST
       customer, and the next Tab leaves the list rather than
       walking to the second. */
    for (let i = 0; i < 8 && focused() !== who(0); i++) await user.tab()
    expect(focused()).toBe(who(0))

    await user.tab()
    expect(focused()).not.toBe(who(1))
  })

  it('walks down and back with the arrows', async () => {
    const { user } = draw()
    land(0)

    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(focused()).toBe(who(2))

    await user.keyboard('{ArrowUp}')
    expect(focused()).toBe(who(1))
  })

  it('walks with J and K, which is what Linear binds', async () => {
    const { user } = draw()
    land(0)

    await user.keyboard('jj')
    expect(focused()).toBe(who(2))

    await user.keyboard('k')
    expect(focused()).toBe(who(1))
  })

  it('stops at both ends rather than wrapping, and Home and End jump there', async () => {
    const { user } = draw()
    land(0)

    await user.keyboard('{ArrowUp}')
    expect(focused()).toBe(who(0))

    await user.keyboard('{End}')
    expect(focused()).toBe(who(4))

    await user.keyboard('{ArrowDown}')
    expect(focused()).toBe(who(4))

    await user.keyboard('{Home}')
    expect(focused()).toBe(who(0))
  })

  it('opens the person under the cursor on Enter', async () => {
    const { user, onOpen } = draw()
    land(0)

    await user.keyboard('{ArrowDown}{Enter}')
    expect(onOpen).toHaveBeenCalledWith('cst-1')
  })
})

describe('marking people', () => {
  it('marks one with X and unmarks it with X', async () => {
    const { user } = draw()
    land(0)

    await user.keyboard('{ArrowDown}x')
    expect(marked()).toEqual([who(1)])

    await user.keyboard('x')
    expect(marked()).toEqual([])
  })

  it('extends a run with Shift on the same key that moves', async () => {
    const { user } = draw()
    land(0)

    await user.keyboard('{ArrowDown}{Shift>}{ArrowDown}{ArrowDown}{/Shift}')
    expect(marked()).toEqual([who(1), who(2), who(3)])
    expect(focused()).toBe(who(3))
  })

  it('takes all of them with Ctrl+A and drops them with Escape', async () => {
    const { user } = draw()
    land(0)

    await user.keyboard('{Control>}a{/Control}')
    expect(marked()).toHaveLength(PEOPLE.length)

    await user.keyboard('{Escape}')
    expect(marked()).toEqual([])
  })

  it('counts the set rather than printing a figure it does not have', async () => {
    const { user } = draw()
    land(0)

    await user.keyboard('x{ArrowDown}x')
    /* Nobody in this fixture has been quoted, so there is no money
       to sum — and "0 quotes, $0 between them" would be a figure
       printed where the file holds none. */
    expect(screen.getByText(/marked/)).toBeTruthy()
    expect(screen.getByText(/none of them quoted yet/)).toBeTruthy()
    expect(screen.queryByText(/\$0/)).toBeNull()
  })
})

/* ============================================================
   WCAG 2.1.4 CHARACTER KEY SHORTCUTS — Level A.
   ============================================================ */

describe('the single-character shortcuts are legal', () => {
  it('is inert unless the register itself holds the focus', async () => {
    const { user } = draw()

    const find = screen.getByRole('searchbox')
    await user.click(find)
    await user.keyboard('jkx')

    /* A letter typed at the find box is a letter, not a command.
       This is the scoping half of 2.1.4, and it is the only half
       any product in the study offers at all. */
    expect((find as HTMLInputElement).value).toBe('jkx')
    expect(focused()).not.toBe(who(0))
  })

  it('can be turned off, and says which way it is set', async () => {
    const { user } = draw()

    await user.click(screen.getByRole('button', { name: 'Letter keys on' }))
    expect(screen.getByRole('button', { name: 'Letter keys off' })).toBeTruthy()

    land(0)
    await user.keyboard('jjx')
    expect(focused()).toBe(who(0))
    expect(marked()).toEqual([])
  })

  it('costs the keyboard NOTHING when it is off', async () => {
    const { user } = draw()
    await user.click(screen.getByRole('button', { name: 'Letter keys on' }))
    land(0)

    /* Every function the letters carried is still on a key 2.1.4
       exempts — an arrow, or a letter held with a modifier. */
    await user.keyboard('{ArrowDown}')
    expect(focused()).toBe(who(1))

    await user.keyboard('{Shift>}{ArrowDown}{/Shift}')
    expect(marked()).toEqual([who(1), who(2)])

    await user.keyboard('{Control>}a{/Control}')
    expect(marked()).toHaveLength(PEOPLE.length)

    await user.keyboard('{Escape}')
    expect(marked()).toEqual([])
  })

  it('remembers the choice, because it belongs to the device', async () => {
    const { user } = draw()

    await user.click(screen.getByRole('button', { name: 'Letter keys on' }))
    expect(localStorage.getItem('hl.crm.letters.v1')).toBe('off')

    await user.click(screen.getByRole('button', { name: 'Letter keys off' }))
    expect(localStorage.getItem('hl.crm.letters.v1')).toBe('on')
  })
})
