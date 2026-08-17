/* ============================================================
   REGISTRATION — ONE CONCEPT, MODELLED ONCE.

   THE ADJUDICATION THIS IMPLEMENTS, verbatim from
   `docs/specs/SERVICE_AND_THEMES.md` §3.1:

     "ONE concept. Registration is a third-party statutory charge,
      looked up by band from one shared table, never marked up, and
      accompanied by a physical artefact that is fitted for labour.
      That sentence is true of a boat and true of a trailer with no
      edits."

   The business itself says so, and the receipt is in the fee sheet:
   `Boat Transfer Fee` and `Trailer Transfer Fee` are two rows at the
   SAME $32.55 with two revenue codes. It duplicated the ROW, not the
   TABLE. `VIN Plate` and `PPSR Fee` are trailer artefacts sitting in
   a shared `Other Fees` block with no subject column at all.

   WHY THE MODEL IS A FILE AND NOT SEVEN COPIES OF A SENTENCE.
   `columns.ts` keys a ColumnConcept as `kind + normalised name`, and
   its header states why — one table per brand means one column name
   is seven columns. That is right for a RULE and exactly wrong for a
   THEME: registration is `boat + trailer`, which is precisely the
   shape our concept key cannot express (§3.3). So the theme resolves
   one layer up — a table, a shared section id, and a policy — and
   this file is that layer, written once so nobody writes it twice.

   WHAT THIS FILE MAY AND MAY NOT DO
   ─────────────────────────────────────────────────────────────
   MAY   read the fee table, name the two key columns, hand a caller
         a fee WITH the cell it came from, and SHOW where a row
         contradicts its own band.
   MAY NOT  derive a band, mark a fee up, add one twice, or default
         the concession. Those are §3.1's four hard requirements and
         each one is a live defect in the workbook it came from —
         they are stated as data in REGISTRATION_POLICY below so a
         surface can print the reason rather than a developer
         remembering it.

   PURE: no React, no store reads. Everything takes the tables and
   rows it is asked about, the way `columns.ts` does.
   ============================================================ */

import { isDiscontinued, isRetired, readCell } from '@/types/model'
import type { EntityDef, FieldDef, RowData } from '@/types/model'

/* ---------------------------------------------------------- */
/* Where the concept lives                                     */
/* ---------------------------------------------------------- */

/** The shared section id. It was already on all seven trailer tables
 *  before the boat half existed, spelled exactly this way, and the
 *  boat tables now carry it too — which is the whole of "model it
 *  once" expressed in the seed. */
export const REGISTRATION_SECTION_ID = 'registration'

/** The fee register, by the name the workbook's own sheet carries. */
export const REGISTRATION_TABLE_NAME = 'Registration Costs'

/** `Registration Module.xlsx · Registration Costs!C6`, which types its
 *  own validity into a label where nothing can read it. Carried here so
 *  a fee printed on a document can say WHICH schedule it came from —
 *  the one thing a cell reference cannot express (§2.6 commitment 3,
 *  §3.2 theme 9). A `validFrom` on the table itself would retire this
 *  constant; that field does not exist yet (see NEEDS at the foot). */
export const REGISTRATION_AS_AT = 'AS at 1/7/25'

/** The workbook's own word for what a registration line IS. Printed
 *  rather than paraphrased: `Managers View!C34`. */
export const THIRD_PARTY_RECOVERY = '3rd Party Recovery'

/** The key column on a boat row — `Boat Module!KM`. */
export const BOAT_KEY_COLUMN = 'Boat Registration'
/** The key column on a trailer row — `Trailer Module!BY`. */
export const TRAILER_KEY_COLUMN = 'Rego Type'

/* ---------------------------------------------------------- */
/* The policy — four requirements, each with its reason        */
/* ---------------------------------------------------------- */

export interface RegistrationRequirement {
  /** the requirement, in the adjudicator's words */
  rule: string
  /** reads after "because" — why, in words a salesperson would use */
  because: string
  /** the cells or counts that make it a requirement rather than an
   *  opinion. Printed, because a policy with no receipt is a habit. */
  source: string
}

/**
 * §3.1's four hard requirements, "each with its reason".
 *
 * NOT DECORATION. Every one of the four is a defect the workbook is
 * living with today, so each is a thing this app must decline to do
 * rather than a preference. They are data so that a refusal can print
 * the reason at the place it refuses, which is DESIGN_PRINCIPLES rule
 * 10 and §6's "a refusal is a sentence with a reason".
 */
export const REGISTRATION_POLICY: RegistrationRequirement[] = [
  {
    rule: 'Never derive the band.',
    because:
      'both key columns are typed by a person, and nine live trailer rows are registered in a band their own weight contradicts — deriving would silently change nine prices the business is charging today',
    source:
      'SERVICE_AND_THEMES.md §3.1 · Boat Module!KM and Trailer Module!BY are hand-keyed on every row · the nine are Trailer Module rows 60, 61, 224–227, 398, 401 and 403, seven of them undercharging by $117 each (MPF_GROUND_TRUTH §14)',
  },
  {
    rule: 'Never mark it up.',
    because: `it is money collected for someone else — the quote sheet's own words for it are “${THIRD_PARTY_RECOVERY}”`,
    source:
      "SERVICE_AND_THEMES.md §3.1 · Managers View!C34 = '3rd Party Recovery' · the trailer side agrees by formula: CA = ROUNDUP(BW+BZ,), the fee added at face value",
  },
  {
    rule: 'Never add it twice.',
    because:
      "a trailer's fee is already inside its Sell inc Rego, and a boat's sits outside Cash — so the same document can charge one fee twice if a surface trusts the word “Sell”",
    source:
      'SERVICE_AND_THEMES.md §3.1 and §3.2 theme 5 · Trailer Module!CA “Sell inc Rego” contains it; Boat Module!QR “Cash” does not. It becomes mechanical the day PriceLevel carries includesRegistration (§3.2 theme 5)',
  },
  {
    rule: 'Never default the concession.',
    because:
      'four pensioner rows exist and nothing in any workbook says when they apply, so a person chooses that row or nobody does',
    source:
      'SERVICE_AND_THEMES.md §2.5 and §3.1 · Registration Costs!C29:K33, four rows under “Boat Registration - Pensioner / Concession Card Holder”, with no rule anywhere that selects them',
  },
]

/* ---------------------------------------------------------- */
/* The mass bands — read out of the labels, never guessed      */
/* ---------------------------------------------------------- */

/**
 * A trailer registration band and the bound its OWN LABEL states.
 *
 * THIS IS READING, NOT DERIVING, and the distinction is the whole
 * reason the check below is allowed to exist. `Small Trailers - Up to
 * 1.02t` states a ceiling in its own text; `Large Trailers - Over
 * 1.021t` states a floor. Converting a tonne to a kilogram is
 * arithmetic — `Trailer Module!K` is headed `ATM (KG)`.
 *
 * WHAT IS DELIBERATELY ABSENT: a `bandForAtm(kg)` that answers "which
 * band SHOULD this trailer be in". Nothing in the workbook states a
 * ceiling for `Large` or for `Heavy`, so a trailer at 5,000 kg clears
 * both floors and no label decides between them. Writing that function
 * would be inventing the missing half of a table, and it is the exact
 * step §3.1 forbids: "Never derive the band."
 */
export interface MassBand {
  /** the band label, verbatim from `Registration Costs!C` */
  band: string
  /** kilograms the label states, or undefined where it states none */
  atLeastKg?: number
  atMostKg?: number
  /** the words the number was read out of, so it can be checked */
  readFrom: string
}

/**
 * The three trailer mass bands, plus the catalogued decline.
 *
 * The decline carries no bound ON PURPOSE. `Registration - NOT
 * REQUIRED` is theme 7's "not required is a value, not a row" — the
 * business catalogues its NO as a row priced at $0 — so a trailer
 * carrying it is not evaluable rather than failing, and this list says
 * that by having nothing to test.
 */
export const TRAILER_MASS_BANDS: MassBand[] = [
  {
    band: 'Small Trailers - Up to 1.02t',
    atMostKg: 1020,
    readFrom: '“Up to 1.02t” · Registration Costs!C16',
  },
  {
    band: 'Large Trailers - Over 1.021t',
    atLeastKg: 1021,
    readFrom: '“Over 1.021t” · Registration Costs!C17',
  },
  {
    band: 'Heavy Trailers - Over 4.55t',
    atLeastKg: 4550,
    readFrom: '“Over 4.55t” · Registration Costs!C18',
  },
  {
    band: 'Registration - NOT REQUIRED',
    readFrom: 'a catalogued decline · Registration Costs!C19 · states no mass',
  },
]

/** The band's own stated bound, or undefined when it states none. */
export function massBandFor(band: string): MassBand | undefined {
  const wanted = band.trim().toLowerCase()
  return TRAILER_MASS_BANDS.find((b) => b.band.toLowerCase() === wanted)
}

/* ---------------------------------------------------------- */
/* Finding the concept in a live project                       */
/* ---------------------------------------------------------- */

const named = (table: EntityDef, name: string): FieldDef | undefined => {
  const wanted = name.trim().toLowerCase()
  return table.fields.find((f) => f.name.trim().toLowerCase() === wanted)
}

/** The fee register as this project actually holds it. */
export interface FeeRegister {
  table: EntityDef
  band: FieldDef
  subject: FieldDef | undefined
  /** `Registration Costs!J`, the cost rung */
  ctd: FieldDef | undefined
  /** `Registration Costs!K`, the cost rounded up to the dollar */
  sell: FieldDef | undefined
  rows: RowData[]
}

/**
 * The fee table in this project, or undefined.
 *
 * FOUND BY COLUMN SHAPE, NOT BY TABLE NAME ALONE. A dealer renames
 * things, and `MODULE_SYSTEM.md` §4 rule 2 is "never hand-write the
 * binding list". A table is the fee register when it carries a `Band`
 * column; the name is only the tie-breaker when more than one does.
 */
export function findFeeRegister(
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): FeeRegister | undefined {
  const candidates = Object.values(entities).filter((e) => named(e, 'Band'))
  if (candidates.length === 0) return undefined
  const table =
    candidates.find(
      (e) => e.name.trim().toLowerCase() === REGISTRATION_TABLE_NAME.toLowerCase(),
    ) ?? candidates[0]
  const band = named(table, 'Band')
  if (!band) return undefined
  return {
    table,
    band,
    subject: named(table, 'Subject'),
    ctd: named(table, 'CTD'),
    sell: named(table, 'SELL'),
    rows: rowsByEntity[table.id] ?? [],
  }
}

/** One table that carries a registration key column. */
export interface RegistrationKey {
  table: EntityDef
  field: FieldDef
  /** which side of the theme this is — the join differs, the concept
   *  does not */
  subject: 'boat' | 'trailer'
}

/**
 * Every table in this project that names a registration band.
 *
 * This is the "model it once" claim made checkable: if the boat tables
 * and the trailer tables both appear here, the two halves of the theme
 * are keyed the same way and one table answers both.
 */
export function registrationKeys(entities: Record<string, EntityDef>): RegistrationKey[] {
  const out: RegistrationKey[] = []
  for (const table of Object.values(entities)) {
    const boat = named(table, BOAT_KEY_COLUMN)
    if (boat) out.push({ table, field: boat, subject: 'boat' })
    const trailer = named(table, TRAILER_KEY_COLUMN)
    if (trailer) out.push({ table, field: trailer, subject: 'trailer' })
  }
  return out.sort((a, b) => a.table.name.localeCompare(b.table.name))
}

/* ---------------------------------------------------------- */
/* Reading a fee — with the cell it came from                  */
/* ---------------------------------------------------------- */

/** Which rung of the fee a caller wants. BOTH ARE OFFERED AND NEITHER
 *  IS DEFAULTED, because the two live consumers disagree by 81 cents
 *  on every trailer and only the owner can say which is the policy
 *  (SERVICE_AND_THEMES.md §6.2 Q1). A caller states the rung; this
 *  file does not choose for them. */
export type FeeRung = 'ctd' | 'sell'

export interface RegistrationFee {
  band: string
  rung: FeeRung
  amount: number
  /** what a frozen quote line records — the cell, not the number */
  sourceNote: string
  /** the schedule the fee was struck under */
  asAt: string
  /** the workbook's own word for the line */
  label: string
}

/**
 * The fee for a band, at the rung the caller names, with its provenance.
 *
 * Returns undefined rather than zero when the band is not in the table.
 * A missing fee is a missing fee; a zero is a silent-zero line on a
 * customer's quote, which `QUOTE_FINDINGS §2.6` already names as a
 * failure. The catalogued declines are real rows and DO return a fee
 * of 0 — that is theme 7's distinction between "chosen to be nothing"
 * and "not priced here", and it survives here.
 */
export function feeForBand(
  register: FeeRegister,
  band: string,
  rung: FeeRung,
): RegistrationFee | undefined {
  const field = rung === 'ctd' ? register.ctd : register.sell
  if (!field) return undefined
  const wanted = band.trim().toLowerCase()
  for (const row of register.rows) {
    const value = readCell(row, register.band.id)
    if (typeof value !== 'string' || value.trim().toLowerCase() !== wanted) continue
    const amount = readCell(row, field.id)
    if (typeof amount !== 'number') return undefined
    const src = readCell(row, sourceFieldId(register.table))
    return {
      band: value,
      rung,
      amount,
      sourceNote: typeof src === 'string' && src !== '' ? src : `${register.table.name} · ${value}`,
      asAt: REGISTRATION_AS_AT,
      label: THIRD_PARTY_RECOVERY,
    }
  }
  return undefined
}

const sourceFieldId = (table: EntityDef): string =>
  named(table, 'Source')?.id ?? '__no_source_column__'

/* ---------------------------------------------------------- */
/* THE CHECK — shows, and never resolves                       */
/* ---------------------------------------------------------- */

/**
 * A trailer whose registration band contradicts its own rated ATM.
 *
 * §3.1: "Offer it as a check that shows the nine and changes none —
 * which is exactly the shape workbookRules.ts exists for." This is
 * that check. It changes nothing, it writes nothing, and it names the
 * label whose words it tested, so a person can disagree with it by
 * reading one cell.
 */
export interface BandDisagreement {
  tableName: string
  /** the trailer, by whatever column that table displays rows with */
  rowLabel: string
  band: string
  atmKg: number
  /** what the band's own label says, e.g. "at least 1,021 kg" */
  says: string
  /** the words that bound was read out of */
  readFrom: string
  /** where the row came from, so it can be opened in the sheet */
  source: string
  /** true when this row is already held back from customer-facing
   *  surfaces. It is still SHOWN here on purpose: this is the surface
   *  for the person whose job is fixing the data, and `sellable.ts`'s
   *  header is explicit that the sheet does not filter. */
  heldBack: boolean
}

/** What the whole check found, including what it could not test. */
export interface BandCheck {
  /** rows tested — a trailer with both an ATM and a bounded band */
  tested: number
  disagreements: BandDisagreement[]
  /** rows skipped because their band states no mass (the catalogued
   *  decline), counted rather than passed */
  statesNoMass: number
  /** band labels found on rows that this file does not recognise, by
   *  name. NEVER silently passed: an unrecognised band is a band whose
   *  bound nobody has read. */
  unrecognisedBands: string[]
  /** trailer tables carrying a band column but no ATM column, by name */
  untestableTables: string[]
}

const EMPTY_CHECK: BandCheck = {
  tested: 0,
  disagreements: [],
  statesNoMass: 0,
  unrecognisedBands: [],
  untestableTables: [],
}

/** How a bound reads on screen. Mono digits with a thousands separator,
 *  because it is a mass and it sits beside another mass. */
const kg = (n: number): string => `${n.toLocaleString('en-AU')} kg`

/**
 * Every trailer in this project whose band contradicts its own ATM.
 *
 * ONLY THE BOUND EACH LABEL STATES IS TESTED. `Small Trailers - Up to
 * 1.02t` is a ceiling and nothing else; `Large Trailers - Over 1.021t`
 * is a floor and nothing else. A `Large` trailer at 5,000 kg clears its
 * floor and is NOT reported, because no label gives `Large` a ceiling
 * and inventing one would be deriving the band.
 */
export function atmBandDisagreements(
  entities: Record<string, EntityDef>,
  rowsByEntity: Record<string, RowData[]>,
): BandCheck {
  const keys = registrationKeys(entities).filter((k) => k.subject === 'trailer')
  if (keys.length === 0) return EMPTY_CHECK

  const disagreements: BandDisagreement[] = []
  const unrecognised = new Set<string>()
  const untestable: string[] = []
  let tested = 0
  let statesNoMass = 0

  for (const key of keys) {
    const atm = named(key.table, 'ATM (KG)')
    if (!atm) {
      untestable.push(key.table.name)
      continue
    }
    const display = key.table.displayFieldId
      ? key.table.fields.find((f) => f.id === key.table.displayFieldId)
      : undefined
    const label = display ?? key.table.fields[0]
    const src = named(key.table, 'Source')

    for (const row of rowsByEntity[key.table.id] ?? []) {
      const bandValue = readCell(row, key.field.id)
      const atmValue = readCell(row, atm.id)
      if (typeof bandValue !== 'string' || bandValue.trim() === '') continue
      if (typeof atmValue !== 'number') continue

      const bound = massBandFor(bandValue)
      if (!bound) {
        unrecognised.add(bandValue.trim())
        continue
      }
      if (bound.atLeastKg === undefined && bound.atMostKg === undefined) {
        statesNoMass += 1
        continue
      }

      tested += 1
      const under = bound.atLeastKg !== undefined && atmValue < bound.atLeastKg
      const over = bound.atMostKg !== undefined && atmValue > bound.atMostKg
      if (!under && !over) continue

      const rowSource = src ? readCell(row, src.id) : null
      disagreements.push({
        tableName: key.table.name,
        rowLabel: labelOf(row, label),
        band: bound.band,
        atmKg: atmValue,
        says: under
          ? `at least ${kg(bound.atLeastKg as number)}`
          : `at most ${kg(bound.atMostKg as number)}`,
        readFrom: bound.readFrom,
        source: typeof rowSource === 'string' ? rowSource : key.table.name,
        heldBack: isRetired(key.table) || isDiscontinued(row),
      })
    }
  }

  return {
    tested,
    disagreements,
    statesNoMass,
    unrecognisedBands: [...unrecognised].sort(),
    untestableTables: untestable.sort(),
  }
}

function labelOf(row: RowData, field: FieldDef | undefined): string {
  if (!field) return row.id
  const v = readCell(row, field.id)
  return typeof v === 'string' && v.trim() !== '' ? v : row.id
}

/* ============================================================
   NEEDS — what this theme is still waiting on, and from whom.

   Written here rather than in a document because the next person to
   open this file is the one who can clear them.

   1 · `EntityDef.validFrom` (src/types/model.ts, orchestrator-owned).
       REGISTRATION_AS_AT is a constant in this file because the table
       cannot carry its own vintage. `Registration Costs!C6` types
       "AS at 1/7/25" into a LABEL, where nothing can read it, and six
       rate tables in the estate do the same thing (§3.2 theme 9). A
       frozen quote line records the CELL today and cannot record the
       SCHEDULE — which is the one thing `sourceNote` cannot express.

   2 · `PriceLevel.includesRegistration` (src/features/quote/types.ts).
       "Never add it twice" is prose here and must become mechanical:
       `Sell inc Rego` contains the fee and `Cash` does not
       (§3.2 theme 5). Until it lands, any surface adding a
       registration line to a trailer priced at `Sell inc Rego`
       double-charges, and nothing stops it but a developer's memory.

   3 · The two curated joins (tools/seed → src/demos/northside.ts).
       §3.1 asks for `boat.<Boat Registration> → registration.Band` on
       the seven boat tables and `trailer.<Rego Type> → registration.Band`
       on the seven trailer tables. Both key columns are seeded and the
       fee table is seeded; the joins are not. Until then this file
       resolves the band by STRING against the fee table's own `Band`
       column, which is what `feeForBand` does — correct, and one hop
       short of what the model can express.

   4 · Q1, from the owner. `Trailer Module!BZ` reads `K SELL` (283.00);
       `Managers View!G23` reads `J CTD` (282.19) for the same trailer
       on the same deal. `FeeRung` offers both and defaults to neither
       for exactly that reason. One of them is the policy and the other
       is a counting error, and 81 cents rides on every trailer.
   ============================================================ */
