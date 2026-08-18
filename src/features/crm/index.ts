/* ============================================================
   CUSTOMERS — the C, and it is a table like everything else.

   MOUNTING IT (the whole job):

     import { CustomerList, CustomerPage } from '@/features/crm'

     <CustomerList onOpen={open} openId={id} />
     <CustomerPage rowId={id} onOpenQuote={openQuote} onRemoved={back} />

   Both fill whatever box they are put in, scroll themselves and
   bring their own stylesheet. Neither takes any other prop, and
   neither knows what the yard sells.

   ---------------------------------------------------------------
   WHAT THIS FEATURE IS

   A customer register is a BASE TABLE with a well-known id, holding
   whatever columns the dealer wants, editable in the sheet, carried
   by every export, found by the finder and put back by Ctrl+Z. Two
   screens draw it: the register, and one person with the history of
   what has been quoted to them.

   There is no customer object, no customer store, no customer
   endpoint and no second id space. Everything a CRM does here falls
   out of machinery this app already had — a table, its rows, its
   columns, the quote registry — which is why this feature is under
   700 lines rather than a subsystem.

   ---------------------------------------------------------------
   THE ONE INVARIANT, so a reviewer can check it in one grep

     A QUOTE PRINTS FROM FROZEN VALUES AND NEVER FROM THIS FEATURE.

   `QuoteDef.customer` holds the name and contact lines, copied at
   the moment a customer was picked. `QuoteDef.customerRef` holds the
   row id and is read by exactly one thing — "what else have we
   quoted them?". Delete the register, import the quote into another
   project, and every document still prints the same words and the
   same numbers. If a renderer ever resolves `customerRef` into a
   name, the freeze is broken and Monday's quote can move by Friday.

   ---------------------------------------------------------------
   WHAT THIS FEATURE NEEDS FROM THE ORCHESTRATOR

   1. `TableKind` in '@/types/model' has no `customer` member, so the
      register is created as `kind: 'custom'` with the teal accent
      this app already gives to tables of people and places. A
      `customer` kind — label "Customers", accent teal, a flat
      structure, detail columns Name / Phone / Email / Address /
      Notes — would let the register be made from the New table
      dialog like every other kind, and would give it its own glyph
      in the dock's Tables menu instead of landing under "Custom
      table". Nothing here breaks without it.

   2. `CUSTOMER_TABLE_ID` and the four column ids in `customers.ts`
      are the same class of constant as `UID_FIELD_ID` and
      `DISCONTINUED_FIELD_ID` and belong beside them in model.ts.
      They are here only because that file is not this workflow's to
      edit; moving them costs one import path.

   3. `QuoteDef.customerRef` is in `@/features/quote/types.ts`, which
      is itself waiting to move to model.ts. It travels with the rest
      of that file.

   ---------------------------------------------------------------
   WHAT IS DELIBERATELY NOT BUILT, so nobody reads an absence as an
   oversight: no pipeline or deal stages · no tasks, reminders or
   follow-up dates · no email or messaging · no merge-duplicates ·
   no import from a contacts file · no per-customer pricing. Every
   one of those needs either a runtime this app does not have or a
   business rule nobody has stated, and inventing one is the failure
   this project is most careful about.
   ============================================================ */

/* -- the screens -------------------------------------------- */
export { CustomerList } from './CustomerList'
export type { CustomerListProps } from './CustomerList'
export { CustomerPage } from './CustomerPage'
export type { CustomerPageProps } from './CustomerPage'

/* -- the register, as data ----------------------------------- */
export {
  CUSTOMER_TABLE_ID,
  CUSTOMER_PHONE_FIELD,
  CUSTOMER_EMAIL_FIELD,
  CUSTOMER_ADDRESS_FIELD,
  CUSTOMER_NOTE_FIELD,
  CUSTOMER_CONTACT_FIELDS,
  CUSTOMER_COLUMNS,
  customerRegister,
  isCustomerRegister,
  readCustomer,
  readCustomers,
  matchCustomers,
  exactCustomer,
  customerFormFields,
} from './customers'
export type { CustomerRead } from './customers'

/* -- the only file that writes -------------------------------- */
export {
  ensureCustomerRegister,
  addCustomer,
  setCustomerCell,
  removeCustomer,
} from './register'
