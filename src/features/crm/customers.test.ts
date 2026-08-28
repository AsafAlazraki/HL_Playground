/* ============================================================
   THE REGISTER, READ — the pure half, tested without a store.

   Everything in `customers.ts` takes what it is handed, so all of
   this is arithmetic over two plain objects: no browser, no
   project, no mock. That is the property being pinned as much as
   any single assertion — the moment one of these functions needs a
   store to answer, the quote feature can no longer import it and
   the whole arrangement in freeze.ts collapses.

   THE ONE RULE WITH TEETH: the note column is searchable and is
   never a contact line. A yard writes "chased twice about the 2023
   invoice" in there, and a quote that printed it on the customer's
   own copy would be the worst kind of leak — the kind nobody
   notices until it is in somebody's hand.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import type { EntityDef, FieldDef, RowData } from '@/types/model'
import { dayWorthSaying, groupByDescription } from './form'

const {
  CUSTOMER_ADDRESS_FIELD,
  CUSTOMER_COLUMNS,
  CUSTOMER_EMAIL_FIELD,
  CUSTOMER_NOTE_FIELD,
  CUSTOMER_PHONE_FIELD,
  CUSTOMER_TABLE_ID,
  customerFormFields,
  customerRegister,
  exactCustomer,
  isCustomerRegister,
  liveTableCount,
  matchCustomers,
  readCustomer,
  readCustomers,
} = await import('./customers')

const ISO = '2026-01-01T00:00:00.000Z'

/* The register as `ensureCustomerRegister` builds it: a plain `Name`
   with an ordinary generated id (which is the point — the label
   column is the app's own, not a private constant of this feature),
   then the four well-known columns. */
function register(extra: EntityDef['fields'] = []): EntityDef {
  return {
    id: CUSTOMER_TABLE_ID,
    name: 'Customers',
    accent: 'teal',
    kind: 'custom',
    role: 'base',
    fields: [
      { id: 'f-name', name: 'Name', type: 'text', required: true },
      { id: CUSTOMER_PHONE_FIELD, name: 'Phone', type: 'text' },
      { id: CUSTOMER_EMAIL_FIELD, name: 'Email', type: 'text' },
      { id: CUSTOMER_ADDRESS_FIELD, name: 'Address', type: 'text' },
      { id: CUSTOMER_NOTE_FIELD, name: 'Notes', type: 'text' },
      ...extra,
    ],
    position: { x: 0, y: 0 },
    createdAt: ISO,
    updatedAt: ISO,
  }
}

function person(id: string, values: Record<string, string>): RowData {
  return { id, entityId: CUSTOMER_TABLE_ID, values, createdAt: ISO, updatedAt: ISO }
}

/* ---------------------------------------------------------- */

describe('finding the register', () => {
  it('is the table with the well-known id, whatever it has been renamed to', () => {
    const renamed = { ...register(), name: 'Clients' }
    expect(customerRegister({ [renamed.id]: renamed })).toBe(renamed)
    expect(isCustomerRegister(renamed)).toBe(true)
  })

  it('is undefined — not an error — when a project has none', () => {
    expect(customerRegister({})).toBeUndefined()
  })

  it('is not some other table that happens to be called Customers', () => {
    const impostor: EntityDef = { ...register(), id: 'abc123' }
    expect(customerRegister({ [impostor.id]: impostor })).toBeUndefined()
    expect(isCustomerRegister(impostor)).toBe(false)
  })
})

describe('reading one customer', () => {
  const table = register()

  it('takes the name from the display column, through the app’s own election', () => {
    const row = person('r1', { 'f-name': 'R. Kelleher' })
    expect(readCustomer(table, row).name).toBe('R. Kelleher')
  })

  it('follows a display column the dealer has re-pointed', () => {
    const byCompany: EntityDef = {
      ...register([{ id: 'f-co', name: 'Company', type: 'text' }]),
      displayFieldId: 'f-co',
    }
    const row = person('r1', { 'f-name': 'R. Kelleher', 'f-co': 'Kelleher Marine' })
    expect(readCustomer(byCompany, row).name).toBe('Kelleher Marine')
  })

  it('is an EMPTY name, never a placeholder, when nobody has typed one', () => {
    expect(readCustomer(table, person('r1', {})).name).toBe('')
  })

  it('prints phone, email and address in that order and drops the blanks', () => {
    const row = person('r1', {
      'f-name': 'R. Kelleher',
      [CUSTOMER_EMAIL_FIELD]: 'rk@example.test',
      [CUSTOMER_ADDRESS_FIELD]: '  ',
      [CUSTOMER_PHONE_FIELD]: '0400 000 000',
    })
    expect(readCustomer(table, row).contact).toEqual(['0400 000 000', 'rk@example.test'])
  })

  it('NEVER puts the note in the contact lines', () => {
    const row = person('r1', {
      'f-name': 'R. Kelleher',
      [CUSTOMER_NOTE_FIELD]: 'chased twice about the 2023 invoice',
    })
    const read = readCustomer(table, row)
    expect(read.contact).toEqual([])
    expect(read.note).toBe('chased twice about the 2023 invoice')
  })

  it('leaves a column the dealer added out of the printed lines', () => {
    const withOwn = register([{ id: 'f-limit', name: 'Credit limit', type: 'text' }])
    const row = person('r1', { 'f-name': 'R. Kelleher', 'f-limit': '$5,000' })
    expect(readCustomer(withOwn, row).contact).toEqual([])
  })

  it('keeps the register’s own row order', () => {
    const rows = [person('r1', { 'f-name': 'Zeta' }), person('r2', { 'f-name': 'Alpha' })]
    expect(readCustomers(table, rows).map((c) => c.name)).toEqual(['Zeta', 'Alpha'])
  })
})

describe('searching', () => {
  const table = register()
  const list = readCustomers(table, [
    person('r1', { 'f-name': 'Marina Holdings' }),
    person('r2', {
      'f-name': 'R. Kelleher',
      [CUSTOMER_EMAIL_FIELD]: 'rk@example.test',
      [CUSTOMER_NOTE_FIELD]: 'blue ute',
    }),
    person('r3', { 'f-name': 'Marine Services' }),
  ])

  it('ranks a name that STARTS with what was typed above one that merely contains it', () => {
    expect(matchCustomers(list, 'mar').map((c) => c.rowId)).toEqual(['r1', 'r3'])
  })

  it('finds somebody by a contact line', () => {
    expect(matchCustomers(list, 'rk@example').map((c) => c.rowId)).toEqual(['r2'])
  })

  it('finds somebody by the note the yard wrote — which is still never printed', () => {
    const hit = matchCustomers(list, 'blue ute')
    expect(hit.map((c) => c.rowId)).toEqual(['r2'])
    expect(hit[0].contact).toEqual(['rk@example.test'])
  })

  it('answers an empty query with the head of the book, not with nothing', () => {
    expect(matchCustomers(list, '   ').map((c) => c.rowId)).toEqual(['r1', 'r2', 'r3'])
  })

  it('caps what it offers', () => {
    expect(matchCustomers(list, '', 2)).toHaveLength(2)
  })

  it('matches an exact name so a duplicate is never offered', () => {
    expect(exactCustomer(list, '  r. kelleher ')?.rowId).toBe('r2')
    expect(exactCustomer(list, 'R. Kellehe')).toBeUndefined()
    expect(exactCustomer(list, '')).toBeUndefined()
  })
})

describe('the form is the table’s own columns', () => {
  it('is every column in the table’s order, including ones the dealer added', () => {
    const table = register([{ id: 'f-abn', name: 'ABN', type: 'text' }])
    expect(customerFormFields(table).map((f) => f.name)).toEqual([
      'Name',
      'Phone',
      'Email',
      'Address',
      'Notes',
      'ABN',
    ])
  })

  it('leaves out a calculated column, which is not something to type into', () => {
    const table = register([{ id: 'f-calc', name: 'Age', type: 'formula', formula: '1' }])
    expect(customerFormFields(table).some((f) => f.type === 'formula')).toBe(false)
  })
})

/* ---------------------------------------------------------- */

/* THE EMPTY STATE'S ONE FIGURE. It is tested because it was WRONG:
   the screen said "You have 53 tables and no customer register"
   while Home, one press earlier, said 51 — the two retired tables in
   the real price file. A first-run screen that miscounts a dealer's
   own project is teaching them something false about it. */
describe('counting a project’s tables the way Home counts them', () => {
  const table = (id: string, extra: Partial<EntityDef> = {}): EntityDef => ({
    ...register(),
    id,
    name: id,
    ...extra,
  })

  it('counts the ordinary tables', () => {
    const es = { a: table('a'), b: table('b'), c: table('c') }
    expect(liveTableCount(es)).toBe(3)
  })

  it('DROPS A RETIRED TABLE, because Home drops it before it counts', () => {
    const es = { a: table('a'), b: table('b', { retired: true }) }
    expect(liveTableCount(es)).toBe(1)
  })

  it('KEEPS A JOIN TABLE, because Home counts those as Relationships', () => {
    const es = { a: table('a'), j: table('j', { role: 'join' }) }
    expect(liveTableCount(es)).toBe(2)
  })

  it('counts the register itself — it is an ordinary table', () => {
    expect(liveTableCount({ [CUSTOMER_TABLE_ID]: register() })).toBe(1)
  })

  it('is zero for an empty project rather than throwing', () => {
    expect(liveTableCount({})).toBe(0)
  })
})

/* ============================================================
   THE FORM'S CAPTIONS — one per run, not one per box.

   `form.ts` exists because the register ships three columns whose
   descriptions are the same sentence word for word, and drawing it
   under each of them put 207 characters of identical prose (69 x 3,
   the figure form.ts opens with) under three boxes standing side by
   side. The tests that matter are the
   ones about a DEALER'S table rather than ours: this only earns its
   place if it does the right thing for columns nobody here has
   seen.
   ============================================================ */
describe('groupByDescription', () => {
  const col = (id: string, description?: string): FieldDef =>
    description === undefined
      ? { id, name: id, type: 'text' }
      : { id, name: id, type: 'text', description }

  /* THE REGISTER AS THE APP ACTUALLY MAKES IT. `register()` above
     builds the columns without their descriptions, because nothing
     else in this suite reads one; this is the shape
     `ensureCustomerRegister` writes, descriptions and all, so the
     figures below are a claim about the real screen. */
  const shipped = (): EntityDef => ({
    ...register(),
    fields: [
      { id: 'f-name', name: 'Name', type: 'text', required: true },
      ...CUSTOMER_COLUMNS.map(
        (c): FieldDef => ({
          id: c.id,
          name: c.name,
          type: 'text',
          description: c.description,
        }),
      ),
    ],
  })

  it('collapses the register\u2019s three contact columns into ONE caption', () => {
    const groups = groupByDescription(customerFormFields(shipped()))
    /* Name has no description, Phone/Email/Address share one, Notes
       has its own — three groups, four columns' worth of caption
       reduced to two sentences */
    expect(groups.map((g) => g.fields.map((f) => f.id))).toEqual([
      ['f-name'],
      [CUSTOMER_PHONE_FIELD, CUSTOMER_EMAIL_FIELD, CUSTOMER_ADDRESS_FIELD],
      [CUSTOMER_NOTE_FIELD],
    ])
    expect(groups.filter((g) => g.say !== '')).toHaveLength(2)
    expect(groups[1]?.say).toBe(
      'Printed on a quote addressed to this customer, as it is written here.',
    )
    /* THE MEASURED REDUCTION, pinned so it cannot quietly come back:
       294 characters of caption drawn per column, 156 drawn per
       group, and not one fact lost — both sentences survive. */
    const perColumn = CUSTOMER_COLUMNS.reduce((n, c) => n + c.description.length, 0)
    const perGroup = groups.reduce((n, g) => n + g.say.length, 0)
    expect(perColumn).toBe(294)
    expect(perGroup).toBe(156)
  })

  it('ONLY JOINS NEIGHBOURS \u2014 the caption is drawn under a group, so a group has to be contiguous', () => {
    const groups = groupByDescription([
      col('a', 'same'),
      col('b', 'other'),
      col('c', 'same'),
    ])
    expect(groups.map((g) => g.say)).toEqual(['same', 'other', 'same'])
    expect(groups).toHaveLength(3)
  })

  it('groups the undescribed columns too, and they draw no caption', () => {
    const groups = groupByDescription([col('a'), col('b'), col('c', 'why')])
    expect(groups).toHaveLength(2)
    expect(groups[0]?.say).toBe('')
    expect(groups[0]?.fields.map((f) => f.id)).toEqual(['a', 'b'])
  })

  it('reads a description that differs only in whitespace as the same sentence', () => {
    const groups = groupByDescription([col('a', 'why  '), col('b', ' why')])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.say).toBe('why')
  })

  it('KEEPS EVERY COLUMN EXACTLY ONCE, in the table\u2019s own order', () => {
    const cols = [col('a'), col('b', 'x'), col('c', 'x'), col('d'), col('e', 'y')]
    const groups = groupByDescription(cols)
    expect(groups.flatMap((g) => g.fields).map((f) => f.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ])
  })

  it('is empty for a table with no editable columns rather than throwing', () => {
    expect(groupByDescription([])).toEqual([])
  })
})

/* ============================================================
   THE DAY BESIDE THE REFERENCE — said once, or not at all.

   `referenceFor` stamps `YYYYMMDD-NN` from the same three local
   fields `localDay` formats as `YYYY-MM-DD`, deliberately, so one
   moment can never be printed as two calendar days. The side
   effect on a history row is that both sat there saying the same
   eight digits an inch apart.
   ============================================================ */
describe('dayWorthSaying', () => {
  it('says NOTHING when the reference already opens with the day', () => {
    expect(dayWorthSaying('20260828-05', '2026-08-28')).toBe('')
    expect(dayWorthSaying('20260828-01', '2026-08-28')).toBe('')
  })

  it('says the day for a reference that does not carry one — an imported quote', () => {
    expect(dayWorthSaying('Q-7', '2026-08-28')).toBe('2026-08-28')
    expect(dayWorthSaying('seed-3', '2026-08-28')).toBe('2026-08-28')
    expect(dayWorthSaying('', '2026-08-28')).toBe('2026-08-28')
  })

  it('says the day when the reference carries a DIFFERENT one', () => {
    expect(dayWorthSaying('20260817-02', '2026-08-28')).toBe('2026-08-28')
  })

  it('is not fooled by a reference that merely contains the stamp', () => {
    expect(dayWorthSaying('INV/20260828', '2026-08-28')).toBe('2026-08-28')
  })

  it('says the day rather than guessing when the day is not a day', () => {
    /* `localDay` falls back to the first ten characters of an
       unparseable stored value, so this is reachable */
    expect(dayWorthSaying('20260828-01', 'not-a-day')).toBe('not-a-day')
    expect(dayWorthSaying('20260828-01', '')).toBe('')
  })
})
