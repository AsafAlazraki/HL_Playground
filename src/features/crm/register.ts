/* ============================================================
   MAKING THE REGISTER, AND PUTTING A PERSON IN IT.

   THE ONE FILE HERE THAT WRITES. Everything else in this feature
   either reads what it is handed (`customers.ts`) or draws it, so
   there is exactly one place to look for "what did the CRM change
   about my project?" — the same discipline `freeze.ts` keeps for
   the quote feature, and for the same reason.

   STRUCTURE IS NEVER A SIDE EFFECT. DESIGN_CONTRACT §7: a new
   table is never created by a browse or a pick — it is OFFERED, in
   a sentence that names it, and it is undoable. So nothing here
   runs on mount, nothing runs because somebody typed a name into a
   quote, and the only caller is a button whose label says the
   words "Customers table".

   IT IS ONE UNDO STEP. The store folds every `record()` in one turn
   of the event loop into a single history entry (see the header of
   useProjectStore.ts), so the seven calls below are one Ctrl+Z —
   which is what "it is undoable" has to mean for a person. Nothing
   here defers, awaits or schedules; the moment one of these calls
   goes async this becomes seven steps and the promise breaks.

   IT IS IDEMPOTENT. Asking twice returns the table that is already
   there — `createEntity` ignores a `keepId` already in use, and
   every column is checked before it is added — so a second press,
   a re-render or two windows open at once cannot make two
   registers or a duplicate column.

   NOTHING MARINE, NOTHING INVENTED. Five columns, all of them
   generic to selling anything to anybody, and NOT ONE ROW. The
   workbooks this project was built from are a PRICE FILE; they
   carry no customer list, so there is no honest customer data to
   seed and none is fabricated here. The register arrives empty and
   the empty state says what it is for.
   ============================================================ */

import { useProjectStore } from '@/store/useProjectStore'
import { sayUndoable } from '@/store/notes'
import type { CellValue, EntityDef, RowData } from '@/types/model'
import {
  CUSTOMER_COLUMNS,
  CUSTOMER_TABLE_ID,
  customerRegister,
} from './customers'

/** The table's own description. It is shown on the sheet, in the
 *  Tables menu and at the head of the register, so it says what the
 *  table is FOR rather than restating its name. */
const REGISTER_DESCRIPTION =
  'The people and businesses you sell to. A quote addressed to one of them freezes their name and contact details onto the document, and keeps a link back here so their history is in one place.'

/** Where a new table lands: clear to the right of everything already
 *  drawn, rather than on top of it. `createEntity`'s own default
 *  cascades from the table COUNT, which on a loaded price file puts
 *  a new table underneath four others. */
function clearSpot(entities: Record<string, EntityDef>): { x: number; y: number } {
  const all = Object.values(entities)
  if (all.length === 0) return { x: 120, y: 120 }
  const right = Math.max(...all.map((e) => e.position.x))
  const top = Math.min(...all.map((e) => e.position.y))
  return { x: right + 560, y: top }
}

/**
 * The register, made if it is not there yet.
 *
 * Returns the table either way, so a caller may open it without
 * asking a second question about whether the act worked.
 */
export function ensureCustomerRegister(): EntityDef {
  const store = useProjectStore.getState()
  const existing = customerRegister(store.entities)
  if (existing) return existing

  /* the name column arrives with the table — `createEntity` opens
     every table with a required `Name`, and `displayFieldOf` elects
     it, which is how the register's LABEL column stays the app's
     ordinary one instead of a private concept of this feature's */
  const made = store.createEntity({
    keepId: CUSTOMER_TABLE_ID,
    name: 'Customers',
    /* teal is the hue this app already gives to tables of PEOPLE and
       places (`TABLE_KINDS.dealer`). `TableKind` has no `customer`
       member — that is the one model change this feature wants, and
       it is reported rather than forged here. */
    accent: 'teal',
    position: clearSpot(store.entities),
  })

  for (const col of CUSTOMER_COLUMNS) {
    store.addField(made.id, {
      id: col.id,
      name: col.name,
      type: 'text',
      description: col.description,
    })
  }

  store.updateEntity(made.id, {
    role: 'base',
    kind: 'custom',
    description: REGISTER_DESCRIPTION,
  })

  /* AND IT SAYS SO, WITH UNDO ON IT. DESIGN_PRINCIPLES rule 9: an
     undoable act gets a note, never a dialog asking first. Raised in
     the same turn as the writes, which is what lets `sayUndoable`
     pin the one history step they collapsed into. */
  sayUndoable('Customers table added')

  /* read it back: `made` is the entity as it was BEFORE the columns
     and the description, and handing a caller a stale copy of a
     table is how a page draws one column and a form draws five */
  return useProjectStore.getState().entities[made.id] ?? made
}

/**
 * A new customer.
 *
 * The register is made first when it has to be, so this is one
 * press from anywhere — but the CALLER is still the one that named
 * the act, and the two screens that call it both say "customer"
 * on the button.
 */
export function addCustomer(values?: Record<string, CellValue>): RowData | null {
  const table = ensureCustomerRegister()
  return useProjectStore.getState().addRow(table.id, values)
}

/** Write one cell of one customer. A thin pass-through, so every
 *  write this feature makes is in this file and the customer page
 *  never reaches into the store itself. */
export function setCustomerCell(
  rowId: string,
  fieldId: string,
  value: CellValue,
): void {
  useProjectStore.getState().updateCell(CUSTOMER_TABLE_ID, rowId, fieldId, value)
}

/** Take a customer out of the register.
 *
 *  THE QUOTES THEY WERE GIVEN ARE NOT TOUCHED, and that is the
 *  whole reason a quote freezes a customer's details rather than
 *  pointing at them: every document already written still prints
 *  the name and the contact lines it was given, because it kept its
 *  own copy. What is lost is the LINK — "their other quotes" — and
 *  the screen that offers this says so before it is pressed. */
export function removeCustomer(rowId: string): void {
  useProjectStore.getState().deleteRow(CUSTOMER_TABLE_ID, rowId)
  sayUndoable('Customer removed · Customers')
}
