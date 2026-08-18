/* ============================================================
   THE CUSTOMER REGISTER — and why it is a TABLE and not a system.

   This app's whole thesis is that everything is a table. A customer
   is not an exception to that: it is a row, in a base table, with
   the dealer's own columns on it, editable in the sheet like any
   other row, exported with the rest of the project, searchable by
   the finder, and reachable from the Tables menu. Nothing here
   invents a parallel store, a second id space or a private file
   format — a CRM that did any of those would be a second app
   wearing this one's chrome.

   WHAT IS WELL-KNOWN, AND WHY EACH ONE IS.

     CUSTOMER_TABLE_ID   ONE table in a project is the register, and
                         something has to be able to say which. The
                         id is the only thing about a table a person
                         cannot accidentally change: they may rename
                         it to "Clients", re-order its columns, add
                         six of their own and delete four of ours,
                         and it is still the register. Precedented
                         twice in this repo — `createView` and
                         `createModule` both already accept a
                         `keepId` for exactly this reason — and by
                         `UID_FIELD_ID` / `DISCONTINUED_FIELD_ID`,
                         which are the same idea one level down.

     THE THREE CONTACT   `phone` / `email` / `address` carry
     COLUMNS             well-known ids because a QUOTE FREEZES THEM
                         ONTO ITSELF, and freezing needs to know
                         which columns are safe to print on a
                         document the customer is handed.

     THE NOTE COLUMN     well-known so it can be deliberately LEFT
                         OFF that document.

   WHY NOT "FREEZE EVERY FILLED COLUMN". Because a dealer's own
   columns are the dealer's own business. A register grows "Credit
   limit", "Do not deliver after 4pm", "Chased twice about the 2023
   invoice" within a month of real use, and a rule that printed
   every filled cell would put one of those on the customer's copy
   of their own quote. So the printed lines are exactly the three
   columns this app created and labelled as contact details, and a
   column somebody added later is theirs until they say otherwise.
   That is a smaller promise than "we print everything", and it is
   one we can keep.

   NOTHING IN THIS FILE KNOWS WHAT IS SOLD. A customer is a customer
   whether the yard sells boats, tractors or bandsaws; there is not
   a marine word in it and there must never be one.

   NOTHING HERE READS THE STORE. It takes what it is given, so the
   quote feature may import it without breaking its own one-file
   rule about live data (see `@/features/quote/index.ts`), and so
   every function below is testable without a browser.
   ============================================================ */

import {
  displayFieldOf,
  isRetired,
  isSystemFieldId,
  type CellValue,
  type EntityDef,
  type FieldDef,
  type RowData,
} from '@/types/model'

/* ---------------------------------------------------------- */
/* The well-known ids                                         */
/* ---------------------------------------------------------- */

/** The one table in a project that is the customer register. */
export const CUSTOMER_TABLE_ID = '__customers'

export const CUSTOMER_PHONE_FIELD = '__cst_phone'
export const CUSTOMER_EMAIL_FIELD = '__cst_email'
export const CUSTOMER_ADDRESS_FIELD = '__cst_address'
export const CUSTOMER_NOTE_FIELD = '__cst_note'

/** The columns a quote may print on a customer's own document, in
 *  the order they print. See the header for why this is a list and
 *  not "whatever is filled in". */
export const CUSTOMER_CONTACT_FIELDS: readonly string[] = [
  CUSTOMER_PHONE_FIELD,
  CUSTOMER_EMAIL_FIELD,
  CUSTOMER_ADDRESS_FIELD,
]

/** The columns this app creates the register with. A dealer may
 *  delete any of them; nothing below assumes one is present. */
export const CUSTOMER_COLUMNS: ReadonlyArray<{
  id: string
  name: string
  description: string
}> = [
  {
    id: CUSTOMER_PHONE_FIELD,
    name: 'Phone',
    description:
      'Printed on a quote addressed to this customer, as it is written here.',
  },
  {
    id: CUSTOMER_EMAIL_FIELD,
    name: 'Email',
    description:
      'Printed on a quote addressed to this customer, as it is written here.',
  },
  {
    id: CUSTOMER_ADDRESS_FIELD,
    name: 'Address',
    description:
      'Printed on a quote addressed to this customer, as it is written here.',
  },
  {
    id: CUSTOMER_NOTE_FIELD,
    name: 'Notes',
    description:
      'For the yard, not for the customer. Never printed on a quote and never frozen onto one.',
  },
]

/* ---------------------------------------------------------- */
/* Finding the register                                       */
/* ---------------------------------------------------------- */

export const isCustomerRegister = (e: EntityDef): boolean => e.id === CUSTOMER_TABLE_ID

/** The register, or undefined when this project has none yet.
 *  Undefined is a NORMAL state, not an error: a dealer who has
 *  never raised a quote has no customers, and the screen that says
 *  so offers to make the table rather than pretending it is there. */
export function customerRegister(
  entities: Record<string, EntityDef>,
): EntityDef | undefined {
  return entities[CUSTOMER_TABLE_ID]
}

/** How many tables this project has, COUNTED THE WAY HOME COUNTS
 *  THEM — which is the only reason this function exists rather than
 *  a `length`.
 *
 *  Home's header builds its groups from live tables and drops a
 *  RETIRED one before it counts, so `Object.keys(entities).length`
 *  said 53 on the real price file while the screen a person had just
 *  come from said 51. A count is a CLAIM about somebody's project;
 *  two screens making different claims about one project is the
 *  fault the "dialogs stop lying" pass went after, and an empty
 *  state that miscounts is teaching a dealer something false on the
 *  first screen they meet.
 *
 *  Joins stay IN, because Home counts them too — it lists them as
 *  "Relationships". The only thing dropped is what Home drops. */
export function liveTableCount(entities: Record<string, EntityDef>): number {
  return Object.values(entities).filter((e) => !isRetired(e)).length
}

/* ---------------------------------------------------------- */
/* Reading one                                                */
/* ---------------------------------------------------------- */

/** One customer, read out of the register's own columns.
 *
 *  `name` is read through `displayFieldOf`, which is the app's
 *  existing answer to "what labels a row" — so a dealer who points
 *  the register's display column at `Company` gets company names
 *  here, in the picker, on the list and on the document, with
 *  nothing in this file changed. */
export interface CustomerRead {
  rowId: string
  /** '' is a real state: a row exists and nobody has named it yet.
   *  Never substituted with a placeholder that could be mistaken
   *  for a name. */
  name: string
  /** the lines a quote may print, in printing order, blanks dropped */
  contact: string[]
  /** the yard's own note. NEVER frozen onto a document. */
  note: string
}

const text = (v: CellValue): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  /* an image cell has no text a document should carry */
  return ''
}

export function readCustomer(entity: EntityDef, row: RowData): CustomerRead {
  const nameField = displayFieldOf(entity)
  const contact: string[] = []
  for (const id of CUSTOMER_CONTACT_FIELDS) {
    const line = text(row.values[id] ?? null)
    if (line !== '') contact.push(line)
  }
  return {
    rowId: row.id,
    name: nameField ? text(row.values[nameField.id] ?? null) : '',
    contact,
    note: text(row.values[CUSTOMER_NOTE_FIELD] ?? null),
  }
}

/** Every customer in the register, read once, in the register's own
 *  row order. Rows are never re-sorted here: the sheet's order is
 *  the dealer's order, and a list that silently alphabetises is a
 *  list that disagrees with the table it came from. */
export function readCustomers(
  entity: EntityDef,
  rows: readonly RowData[],
): CustomerRead[] {
  return rows.map((r) => readCustomer(entity, r))
}

/* ---------------------------------------------------------- */
/* Searching                                                  */
/* ---------------------------------------------------------- */

/** Everything about a customer that a search may match: the name
 *  and the contact lines. The note is searched too — a person
 *  looking for "the one with the blue Hilux" typed that into the
 *  note themselves and expects to find it — which is exactly why
 *  the note is searchable and still never printed. */
const haystack = (c: CustomerRead): string =>
  `${c.name}\n${c.contact.join('\n')}\n${c.note}`.toLowerCase()

/**
 * Customers matching what has been typed, best first.
 *
 * "Best first" is only two rungs and they are both defensible: a
 * name that STARTS with the query outranks one that merely contains
 * it, and everything else keeps the register's own order. A cleverer
 * ranking would be a guess, and DESIGN_CONTRACT §7 is explicit that
 * a suggestion which is confidently wrong is worse than none.
 *
 * An empty query returns the head of the list rather than nothing:
 * the picker under an empty field is "who have I sold to before",
 * which is the question a salesperson opens it with.
 */
export function matchCustomers(
  list: readonly CustomerRead[],
  query: string,
  cap = 8,
): CustomerRead[] {
  const q = query.trim().toLowerCase()
  if (q === '') return list.slice(0, cap)
  const starts: CustomerRead[] = []
  const holds: CustomerRead[] = []
  for (const c of list) {
    const name = c.name.toLowerCase()
    if (name.startsWith(q)) starts.push(c)
    else if (haystack(c).includes(q)) holds.push(c)
  }
  return [...starts, ...holds].slice(0, cap)
}

/** The customer whose name is EXACTLY what was typed, if there is
 *  one. It is what stops "Save this name to Customers" being
 *  offered for somebody who is already in the book. */
export function exactCustomer(
  list: readonly CustomerRead[],
  name: string,
): CustomerRead | undefined {
  const n = name.trim().toLowerCase()
  if (n === '') return undefined
  return list.find((c) => c.name.trim().toLowerCase() === n)
}

/* ---------------------------------------------------------- */
/* The columns a person edits                                 */
/* ---------------------------------------------------------- */

/** The register's columns as an editable form, in the table's own
 *  order, with the system column and anything computed left out.
 *
 *  IT IS DERIVED, NOT DECLARED. A dealer who adds "ABN" to the
 *  register gets an ABN field on the customer page and in the CSV,
 *  with nothing in this feature changed — which is the whole reason
 *  a customer is a table. */
export function customerFormFields(entity: EntityDef): FieldDef[] {
  return entity.fields.filter((f) => f.type !== 'formula' && !isSystemFieldId(f.id))
}
