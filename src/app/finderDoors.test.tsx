/* ============================================================
   ⌘K OVER EVERYTHING — five kinds, and the two that had no door.

   THE DEFECT THIS PINS, and it is a wiring defect rather than a
   missing feature, which is exactly why it survived a suite of 474
   lines. `rowSearch.ts` indexes MODULES · ROWS · QUOTES · TABLES ·
   COLUMNS; `SearchField.tsx` draws all five; `fiveKinds.test.ts`
   proves all five on fixtures; `palette.test.tsx` proves the field
   offers a module the moment its host hands over a door — and
   `Shell.tsx`, the ONLY host of the only ⌘K in the app, handed over
   neither. `Finder.tsx` has said in its own header since it was
   written that an unset door does not grey a kind out, it takes the
   kind out of the index entirely, because §2's fourth rule is that a
   result a person cannot open does not appear.

   So two of the five kinds were matched everywhere and reachable
   nowhere. Measured in the running app before the fix, on the
   search's own worked example: ⌘K, "boats" — the name of a MODULE
   holding seven brand tables — answered with ten rows out of two
   registers that merely carry the word in a part name, and offered
   no way to reach the place at all.

   WHY THIS MOUNTS THE WHOLE SHELL. Every component beneath it was
   already green while the app was wrong. The only thing that can
   fail here is the thing that actually failed: whether the host
   passes the doors, and whether pressing a result lands on the page
   that door opens.
   ============================================================ */

import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Shell } from './Shell'
import { useProjectStore } from '@/store/useProjectStore'
/* `forgetQuotes` is not on the feature barrel — it is a reset with no
   caller in production — so it is taken from the file that owns it,
   exactly as `palette.test.tsx` next door does. */
import { registerQuote } from '@/features/quote'
import { forgetQuotes } from '@/features/quote/quotes'
import type { AppUser } from '@/features/auth'
import type { EntityDef, ModuleDef, QuoteDef, RowData } from '@/types/model'

const ISO = '2026-01-01T00:00:00.000Z'

const user: AppUser = {
  id: 'u1',
  name: 'Ada',
  email: 'ada@northside.example',
  title: 'Sales',
  orgSlug: 'northside',
  orgName: 'Northside',
  role: 'super-admin',
}

/* SYNTHETIC NAMES THROUGHOUT, and no word of the seed in any of
   them: nothing here may be mistaken for the prepared file. */
const TABLE: EntityDef = {
  id: 'e-zeta',
  name: 'Zeta Hulls',
  accent: 'blue',
  fields: [
    { id: 'e-zeta.name', name: 'Model', type: 'text' },
    { id: 'e-zeta.len', name: 'Zetalength', type: 'number' },
  ],
  displayFieldId: 'e-zeta.name',
  position: { x: 0, y: 0 },
  createdAt: ISO,
  updatedAt: ISO,
}

const ROWS: RowData[] = [
  {
    id: 'r-1',
    entityId: 'e-zeta',
    values: { 'e-zeta.name': 'Zeta 400', 'e-zeta.len': 4 },
    createdAt: ISO,
    updatedAt: ISO,
  },
]

/** The place. Its NAME is the thing no table is called — which is
 *  the whole reason §2 lists modules as a kind of their own. */
const PLACE: ModuleDef = {
  id: 'm-zeta',
  name: 'Zetaworks',
  description: 'Where the Zeta hulls live',
  tableIds: ['e-zeta'],
  capabilities: ['browse', 'search', 'open', 'quote'],
  index: 'tiles',
  accent: 'blue',
  order: 0,
  createdAt: ISO,
  updatedAt: ISO,
}

/** The document, findable by the reference a person reads off paper. */
const DOC: QuoteDef = {
  id: 'q-1',
  reference: 'ZETAREF-77',
  state: 'draft',
  viewId: 'v-1',
  rootTableId: 'e-zeta',
  rootRowId: 'r-1',
  subjectLabel: 'Zeta 400',
  subjectSpecs: [],
  sections: [],
  lines: [],
  adjustments: [],
  levelKey: 'retail',
  customer: { name: 'Zeta Holdings' },
  createdAt: ISO,
  updatedAt: ISO,
}

function open(): void {
  useProjectStore.getState().setOrganisation('Northside', 'marine')
  useProjectStore.setState({
    entities: { 'e-zeta': TABLE },
    rowsByEntity: { 'e-zeta': ROWS },
    modules: { 'm-zeta': PLACE },
  })
  registerQuote(DOC)
  render(<Shell user={user} onSignOut={() => {}} />)
}

/** ⌘K, TAKEN AT THE WINDOW IN THE CAPTURE PHASE, which is where the
 *  shell listens and why — a table node stops keydown at its own
 *  root while a cell is being edited. Dispatching anywhere else
 *  would be testing a listener nothing registered. */
function summon(): HTMLElement {
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
  return screen.getByRole('dialog', { name: 'Find anything' })
}

async function ask(query: string): Promise<void> {
  summon()
  const field = screen.getByRole('combobox')
  fireEvent.change(field, { target: { value: query } })
  await waitFor(() => expect(screen.queryAllByRole('option').length).toBeGreaterThan(0))
}

beforeEach(() => {
  forgetQuotes()
  useProjectStore.setState({ entities: {}, rowsByEntity: {}, modules: {}, views: {} })
})

describe('the one key the shell binds', () => {
  it('opens the finder from the page, with no field focused first', () => {
    open()
    expect(summon()).toBeInTheDocument()
  })
})

describe('all five kinds are reachable from the app, not only from the index', () => {
  it('offers the PLACE, which is the kind no table is called', async () => {
    open()
    await ask('zetaworks')
    expect(
      screen.getByRole('option', { name: /^Zetaworks — a place/ }),
    ).toBeInTheDocument()
  })

  it('offers the DOCUMENT, by the reference read off the printed page', async () => {
    open()
    await ask('ZETAREF-77')
    expect(screen.getByRole('option', { name: /ZETAREF-77/ })).toBeInTheDocument()
  })

  it('offers the TABLE, the ROW in it and the COLUMN it declares', async () => {
    open()
    await ask('zeta')
    const named = screen.getAllByRole('option').map((o) => o.getAttribute('aria-label') ?? '')
    expect(named.some((n) => /Zeta Hulls/.test(n))).toBe(true)
    expect(named.some((n) => /Zeta 400/.test(n))).toBe(true)
    expect(named.some((n) => /Zetalength/.test(n))).toBe(true)
  })
})

describe('choosing one opens the thing, and puts the finder away', () => {
  /* §2 rule 3 — "Enter opens the thing, it does not filter a list
     behind a dialog". The assertion is the PAGE that arrives, because
     a door wired to the wrong stage would still close the panel. */

  it('lands on the place, named', async () => {
    open()
    await ask('zetaworks')
    fireEvent.click(screen.getByRole('option', { name: /^Zetaworks — a place/ }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Find anything' })).not.toBeInTheDocument(),
    )
    /* ALL of them, not one: the workspace names its own panels after
       the place as well, so the stage is not the only region carrying
       the word. What is asserted is that the place arrived AND that
       it says which place it is — a door wired to `moduleId: null`
       would land on "Modules" and match nothing here. */
    expect((await screen.findAllByRole('region', { name: /Zetaworks/ })).length).toBeGreaterThan(0)
  })

  it('lands on the document, named', async () => {
    open()
    await ask('ZETAREF-77')
    fireEvent.click(screen.getByRole('option', { name: /ZETAREF-77/ }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Find anything' })).not.toBeInTheDocument(),
    )
    expect(await screen.findByRole('region', { name: /ZETAREF-77|Quote/ })).toBeInTheDocument()
  })
})
