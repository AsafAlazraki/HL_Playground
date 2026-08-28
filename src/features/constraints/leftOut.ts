/* ============================================================
   WHAT THE PRICE FILE HAS THAT THIS APP DOES NOT — and why each
   one was a decision rather than an oversight.

   WHY THIS FILE EXISTS. A person who knows the workbooks will look
   for the service schedule, find nothing, and draw one of two
   conclusions: the import is unfinished, or the app lost it. Both are
   wrong and both are corrosive — the first makes them wait for
   something that is never coming, the second makes them stop trusting
   what IS here. The decision was made, it was measured, and it was
   written up in `docs/specs/SERVICE_AND_THEMES.md` §4 and
   `docs/specs/FOUR_MODULES.md` §2. A decision nobody can find reads
   exactly like an omission.

   It is the same argument `RulesLedger.tsx` makes about rules —
   "what the system does NOT check is a fact a person needs, because
   otherwise they assume it does" — applied one level down, to data.

   THE STANDARD EVERY ENTRY MEETS. Each carries the number that
   settled it. Not an opinion about spreadsheets: a count, a rate, or
   a dollar figure, from an adjudicated document, with the sheet it
   was measured on. Nothing here is a shrug.

   NOT A ROADMAP. `later` means the decision was to wait and the
   entry says what it is waiting for. `out` means the decision was
   no. Neither is a promise, and one entry (the Retail Sliding Scale)
   says out loud that one word from the owner reverses it.

   TWO KINDS OF `later`, AND THEY READ THE SAME TO A DEALER. Some
   things are waiting on a decision nobody has made — the job
   catalogue waits for a work order to exist. Four are waiting on a
   PLACE: `FOUR_MODULES.md` §2 ruled the exchange rates, the brand
   margins, the container freight rate and the finance card SETTINGS,
   which is a verdict this app has no surface for yet. They are in
   here because a person looking for the exchange rates and finding
   nothing cannot tell "placed, and waiting on one page" from "never
   read", and the two are worth very different amounts of patience.
   ============================================================ */

export type LeftOutVerdict = 'out' | 'later'

export interface LeftOutRecord {
  /** the thing, named the way a person who knows the workbook would
   *  name it — not the sheet's tab name alone */
  what: string
  /** how big it is, in the unit that makes the size mean something */
  size: string
  verdict: LeftOutVerdict
  /** the decision, in plain words. This is what a person reads. */
  why: string
  /** the number that settles it. Printed beside the reason, because a
   *  judgement with no measurement is a preference. */
  measured: string
  /** workbook · sheet, so it can be re-checked */
  source: string
  /** what would change the decision, where anything would */
  reopensWhen?: string
  /** an Excel artefact rather than something a person would look for
   *  — a hidden mirror, an emptied clone, a form over a table we have.
   *  Complete in the record, summarised on screen. */
  artefact?: boolean
}

/**
 * Ordered by how likely somebody is to go looking for the thing, not
 * by workbook. The service schedule is first because it is the one
 * the owner asked about by name.
 */
export const LEFT_OUT: LeftOutRecord[] = [
  {
    what: 'The service schedule — every Yamaha outboard and what each service costs',
    size: '157 models × 11 intervals · 1,727 priced cells',
    verdict: 'out',
    why: 'It is one rule written out 1,727 times, not a list. The 157 models resolve to eight distinct sets of labour hours, and the workbook publishes six of them on a separate sheet — so importing the grid would store as data something that is actually a calculation, and hide the two places it diverges from its own policy. It also carries an arithmetic fault we would be importing as fact: the 1,000-hour cost is built from the SELL columns and counts spark plugs twice, on every one of the 157 models.',
    measured:
      'the 1,000-hour cost overstates by $427.82 (19.5 %) on one row and $405.56 (20.6 %) on another, on all 157 models · the sheet is 236 MB of XML, 98 % of a 30.7 MB file, and its last real value sits at row 280',
    source: 'Service Module (1).xlsx · Std Service Schedules · SERVICE_AND_THEMES.md §1.3, §4',
    reopensWhen:
      'a service price is worked out from its hours and a rate that are both on screen — which is the rule the grid is 1,727 copies of',
  },
  {
    what: 'The job catalogue — every billable operation and what it is charged at',
    size: '366 coded jobs',
    verdict: 'later',
    why: 'Real, and the largest single join in the price file — four modules point at it. It is waiting rather than refused: 366 rows unblock a work order, which nothing here has yet, while the two rate tables that DID come in were 45 rows and closed a gap in a shipped spec. Order before ambition.',
    measured:
      "366 of 439 populated rows carry a code, and the code is NOT a key — 12 codes appear on more than one row and `DFO_` alone is the code on 34",
    source: 'Service Module (1).xlsx · Operation Codes · SERVICE_AND_THEMES.md §1.3, §3.2 theme 3',
    reopensWhen: 'a work order exists — a job card with hours, a technician and a customer',
  },
  {
    what: 'The stock list — the actual hulls on the floor, with a stock number and an asking price',
    size: '197 stock rows across seven brand sheets',
    verdict: 'later',
    why: 'This is the one gap worth knowing about, because it is the thing a salesperson actually sells. What is in here is the CATALOGUE — every model the dealer can order. A brand sheet in the Master Price File is a different thing: one row per hull that physically exists, pointing at that hull’s own deal workbook. There is no table for it yet, and it is named here so nobody rediscovers it as a surprise.',
    measured:
      '197 stock rows against 810 catalogue rows; 181 match the catalogue by name and nothing enforces the match — the eleven-sheet workbook holds exactly one data validation and it is not on a model column',
    source:
      'Master Price File · the per-brand sheets · SERVICE_AND_THEMES.md §3.2 theme 14, §4',
    reopensWhen:
      'a stock unit is modelled — a hull with a stock number, a location, an age and an asking price',
  },
  {
    what: 'The bank account on the payment footer',
    size: 'account name, BSB, account number, payment reference',
    verdict: 'out',
    why: 'The app never models these, and that is a design position rather than caution. This app is local-first, so the values would sit in a browser database on every salesperson’s laptop; every field added to the organisation record rides along in every export by construction, with no way to hold one back; and a BSB is Australian — a US dealer has a routing number and an NZ dealer has neither. What the business actually needs is that the printed document ends with a paragraph telling the customer how to pay, and that is a text block an admin writes once.',
    measured:
      'a flat card of 6 fields, 0 formulas and 0 validations, one organisation and one account with no per-brand or per-branch notion anywhere · the 2 card surcharges printed beside it are read by 0 formulas in the quote sheet, so they are a sentence and not a rate',
    source: 'Administration Module.xlsx · Bank Details · FOUR_MODULES.md §6.1',
  },
  {
    what: 'The retail sliding scale — the markup band ladder for small parts',
    size: '8 bands, 100 % on a $10 part down to 30 % on a $2,000 one',
    verdict: 'out',
    why: 'A stated policy with no evidenced consumer. Everything the price file actually looks up is keyed on BRAND; nothing anywhere reads a band label. Carrying it would mean either building a reader for a policy nobody has confirmed is live, or storing eight rows that nothing reads — and a governance value nothing reads is its own failure. It also has no band above $2,500, so a $3,000 part falls off the end.',
    measured:
      '8 bands over rows 61–69, and 0 consumers found anywhere in the Master Price File audit — every ordinal the file actually looks up is keyed on brand, and nothing reads a band label · no band above $2,500',
    source: 'Price Matrix.xlsx · Price Matrix rows 61–69 · FOUR_MODULES.md §4.5, Q7',
    reopensWhen:
      'the owner says it is live — then it is an eight-band ladder with an explicit top band, and about half a day’s work',
  },
  {
    what: 'The freight distribution calculator — this container, reconciled',
    size: '6 units in one shipment',
    verdict: 'out',
    why: 'Workings, not data, and the direction of flow proves it: nothing it computes ever reaches a boat row, while half its inputs came from one. It is measuring a badly packed container, once, for a finance review, on paper — its only named range is a print area and it was printed twelve minutes before the workbook was last saved. If a dealer ever wants this it wants a received-shipment record, which is a different thing.',
    measured:
      "0 of 6 of its computed outputs match the boat row; 3 of 6 of its hand-typed “actuals” are the standing rate copied back in · its own per-metre figure for that container was $499.60 against a standing $128.47, because the box went out with 25.2 metres in it instead of 70.5",
    source: 'Freight Module.xlsx · Freight Distribution Calculator · FOUR_MODULES.md §5.3',
  },
  {
    what: 'The exchange rate calculator — what one invoice actually landed at',
    size: '40 line slots, one invoice at a time',
    verdict: 'out',
    why: 'Single-use workings with nothing to tie them to: no shipment number, no invoice number, no supplier, no date, no currency label, and no link to any boat row. The next invoice overwrites it. What it TEACHES survives — the standing rate and the achieved rate differ, and nothing writes the difference back — and that becomes a review date on the rate and a frozen rate on a quote line, not a screen.',
    measured:
      'standing rate 1.2000 against an achieved 1.2533 on the sample invoice — an AUD 2,938.69 overstatement on one hull, which nothing in the workbook writes back',
    source: 'Price Matrix.xlsx · Exchange Rate Calculator · FOUR_MODULES.md §4.5',
  },
  {
    what: 'The rigging picker list',
    size: '818 cells, every one a formula',
    verdict: 'out',
    why: 'It is a saved view, written by hand. Every cell points at the rigging kit sheet, covering exactly the live range and not one row past it — which is to say the business built, in formulas, the filter this app produces for free. Importing it would create a second table that is a filtered copy of the first. The filter came in; the sheet did not.',
    measured:
      'all 818 cells target the live range · and nothing reads it: Excel caches only sheets a formula references, and the cache carries 3,039 rows for the kit sheet and 0 for this one',
    source: 'Rigging Module (1).xlsx · Rigging Spec Enquiry · FOUR_MODULES.md §3.8',
  },
  /* -- decided, and waiting on a place to keep them ------------
     FOUR_MODULES.md §2 reaches twelve verdicts in four vocabularies:
     TABLE, EMBEDDED, SETTING and LEAVE. The LEAVEs are above. The
     TABLEs and the EMBEDDEDs are built — the rigging kits are a table
     and the rigging column on every boat × motor pairing points into
     it. The four below were ruled SETTING: real, kept, admin-owned,
     and homeless, because this app has no organisation settings page
     and no record to put one on.

     THEY ARE HERE FOR THE SAME REASON THE SERVICE SCHEDULE IS. A
     person who knows the price file looks for the exchange rates,
     finds nothing, and concludes the import stopped halfway. It did
     not: every one of these was read, measured and placed, and what
     is missing is one surface rather than four decisions.

     AND EACH ONE CARRIES THE REASON IT IS NOT A TABLE, because that
     is the judgement the owner asked for in his own words — "they
     might not need to be their own tables". Four exchange rates, six
     finance rows, two container rates and 47 brand margins would be
     four more places on the dashboard holding 963 rows between them,
     of which about 900 are scalars, mirrors and one-off workings. */
  {
    what: 'The exchange rates the landed cost of every imported hull passes through',
    size: '4 rates — AUD, NZ, USD, EURO',
    verdict: 'later',
    why: 'Four rows that change a few times a year, in a sheet with nothing editable in it, are not a table anybody browses — they are a setting an admin owns. They cannot be a constant in our code either: a single-currency dealer has one and an importer from three origins has three, so this is data or it is wrong. What the app must add that the workbook has not got is staleness: there is one row per currency for ever, with no effective-from and no previous value, and the review date beside each one is read by nothing.',
    measured:
      'the three live rates were 249, 401 and 463 days old when the file was last saved, and the notes beside them are dated AFTER every review date · one rate cell feeds 1,434 boat rows, another sets the trade price of all 485 motors, and 84 more cells in the rigging module read them',
    source: 'Price Matrix.xlsx · Exchange Rates · FOUR_MODULES.md §4.4',
    reopensWhen:
      'there is somewhere in the app for an admin to keep a rate — and the thing that reads it ships in the same change, because a setting with no reader is worse than a constant',
  },
  {
    what: 'The margin ladder — what each brand is marked up by',
    size: '47 brands × 7 percentages',
    verdict: 'later',
    why: 'One table per brand means a brand’s margins are the same on every row of that brand’s table, so they are a property of the TABLE — not a column copied onto 588 identical rows, and not a row anybody browses. The rungs themselves have to be data as well: CTD, Sub Dealer, Trade, Sell, Factory Options, Dealer Fit, Warranty Allowance and Admin Load is a marine dealer’s ladder, and a caravan dealer has different ones. And a rung needs a MODE, not a nullable number, because half of these do not hold a number at all.',
    measured:
      'both rate sheets are protected with 0 editable cells, and a cell-by-cell scan found no filter and no validation — the file itself saying nobody browses this · of 47 rows, 22 hold a number, 17 hold the word RRP and 8 hold a non-breaking space, so 53 % of a numeric lookup returns text · 15 rows carry a review date and every boat brand’s was 499 days before the file was last saved',
    source: 'Price Matrix.xlsx · Price Matrix · FOUR_MODULES.md §4.1, §4.2',
    reopensWhen:
      'a table can carry values of its own beside its kind and its sections — which is where a per-brand number belongs, being neither a row nor a column',
  },
  {
    what: 'The container freight rate — dollars per metre of boat',
    size: '2 forwarders, 1 number each',
    verdict: 'later',
    why: 'It is a packing-density rate, not a freight rate, and it is meaningless away from the brand it was measured on: inflatables deflate and stack, welded alloy hardtops do not. So it belongs on the brand’s own table rather than in an app-wide bag — and only two of the seven boat brands have one at all, because every other brand is priced by hand per model and should keep being. A twenty-second table for one number that has not moved in six months is exactly the tax this app is meant not to charge.',
    measured:
      'one cell, 128.47 dollars per hull metre, identical across four snapshots of the boat file spanning February to August · 70.5 metres of Highfield fit a container against 10.7 metres of Surtees, a 3.4× gap · the Surtees rate is 2 years 4 months older than the Highfield one and nothing anywhere says so',
    source:
      'Freight Module.xlsx · FCL Import - Highfield, Quadrant Pacific - Surtees · FOUR_MODULES.md §5.1',
    reopensWhen:
      'a table can carry a dated, attributed rate of its own — at which point one brand’s road freight stops being 1,146 copies of the same sum',
  },
  {
    what: 'The finance rate card, and the list of what a document is called',
    size: '1 lender, 6 rate/term rows, 9 document types',
    verdict: 'later',
    why: 'Finance is not a property of a product — no boat, motor or trailer has an interest rate — so it is neither a table nor a band of columns on one; it attaches to the deal, after everything has been chosen. Six rows and one lender is a rate card somebody edits in one sitting and never browses. The document list is the same shape and matters more than it looks: our predecessor hardcoded it as a closed set of three, and this dealer has nine of its own. A furniture dealer has Estimate and Proforma. That vocabulary is rows an admin edits or it is wrong.',
    measured:
      'the 5-year term quotes at 0 % interest today, because its rate lookup points one column past the rate · a flat $5 is added to every monthly repayment ever quoted and is named nowhere in either workbook · the establishment fee is typed twice rather than linked, so changing it leaves the quote charging the old one · 8 of the 9 document rows lost their flag where the quote file mirrors them',
    source: 'Administration Module.xlsx · Finance Module, Dropdowns · FOUR_MODULES.md §6.2, §6.3',
    reopensWhen:
      'the owner says what the $5 is — no unnamed constant goes into a figure a customer is handed — and there is a settings surface for the rate card to live on',
  },

  {
    what: 'The labour-hours matrix and its two worked checklists',
    size: '483 non-blank cells, no formulas',
    verdict: 'out',
    why: 'A published document rather than a calculation — the policy a person reads, not a table a row joins to. It comes back if and when service schedules do.',
    measured: 'zero formulas in 483 populated cells',
    source: 'Service Module (1).xlsx · Schedule Notes · SERVICE_AND_THEMES.md §1.2, §4',
  },

  /* -- the four artefacts, complete in the record ------------- */
  {
    what: 'The service module’s hidden Dropdowns sheet',
    size: '1,198 formulas over 277 real rows',
    verdict: 'out',
    why: 'A mirror of another sheet’s key column, kept alive to feed an Excel validation list. Its tail renders 900-odd literal zeros.',
    measured: '1,198 formulas, 0 values of its own',
    source: 'Service Module (1).xlsx · Dropdowns · SERVICE_AND_THEMES.md §1.2',
    artefact: true,
  },
  {
    what: 'The rigging module’s hidden Dropdowns sheet',
    size: '4 populated cells',
    verdict: 'out',
    why: 'Type a part number, see two prices. It is a search box with two result columns, and this app has a search box. What it teaches — which two of a kit’s 46 numbers a person actually wants — went into the table’s default columns.',
    measured: '4 populated cells, C7:D10',
    source: 'Rigging Module (1).xlsx · Dropdowns · FOUR_MODULES.md §3.8',
    artefact: true,
  },
  {
    what: 'The boat show sheet',
    size: '0 data rows',
    verdict: 'out',
    why: 'An emptied clone of a brand sheet. Ours would be a saved view over the tables that are already here, not a table.',
    measured: '0 data rows',
    source: 'Master Price File · Boat Show · SERVICE_AND_THEMES.md §4',
    artefact: true,
  },
  {
    what: 'The dealer-fit job costing form',
    size: '1 row',
    verdict: 'out',
    why: 'A form over a table that is already here. What it encodes — hours times a rate, and a sundry markup — belongs in a rate table, which is where it went.',
    measured: '1 populated row',
    source: 'Master Price File · Dealer Fit Options · SERVICE_AND_THEMES.md §4',
    artefact: true,
  },
]

/** The entries a person would actually go looking for. */
export const leftOutSubstantive = (): LeftOutRecord[] => LEFT_OUT.filter((r) => !r.artefact)

/** The Excel artefacts, summarised on screen rather than listed. */
export const leftOutArtefacts = (): LeftOutRecord[] => LEFT_OUT.filter((r) => r.artefact === true)

/* ============================================================
   WHAT DID COME IN, so the ratio is visible.

   `Service Module (1).xlsx` is 30,739,155 bytes and what came out of
   it is 45 rows — 18 labour rates and 27 consumables. (SERVICE_AND_
   THEMES.md §4 says 48, counting the consumables as 30; the sheet
   holds 27 and the two blank rows inside its first block are the
   difference. The seed records the same correction on the table's own
   description, and this file follows the sheet.)

   That ratio IS the finding, and it is the sentence the
   owner would use: we took the price of an hour, the price of a litre
   and the price of a rego sticker, and we left the service book —
   because the service book is a way of working things out, not a list
   of things, and if we copy it in as a list, the day somebody changes
   how long a 100-hour service takes we will have three hundred wrong
   prices and no way to find them.

   (SERVICE_AND_THEMES.md §4, closing paragraph, paraphrased there by
   its own author for exactly this purpose.)
   ============================================================ */

export interface CameInRecord {
  what: string
  /** the table it landed in, so the count on screen is read from the
   *  live project rather than typed here and left to go stale */
  tableName: string
  /** what one row IS */
  rowNoun: string
  source: string
}

export const CAME_IN: CameInRecord[] = [
  {
    what: 'The price of an hour',
    tableName: 'Labour Rates',
    rowNoun: 'charge-out rates for an hour of workshop time',
    source: 'Service Module (1).xlsx · Labour Rates!C8:H29',
  },
  {
    what: 'The price of a litre',
    tableName: 'Oils & Consumables',
    rowNoun: 'oils, fuels and consumables, each with the unit its price is per',
    source: 'Service Module (1).xlsx · Oils and Lubes!C8:K39',
  },
  {
    what: 'The price of a registration',
    tableName: 'Registration Costs',
    rowNoun: 'statutory fees, for the boat and the trailer alike',
    source: 'Registration Module.xlsx · Registration Costs!C3:K34',
  },
]

/**
 * THE COMMITMENT THAT MADE ALL THREE TABLES RATHER THAN CONSTANTS,
 * and the receipt that proves it was not caution.
 *
 * SERVICE_AND_THEMES.md §2.6, first of five: "A rate is a row in a
 * table, never a constant in code and never a default inside a
 * formula." The business has already made the other choice, in one
 * column, and both halves are visible in the same file — which is why
 * this is quoted on screen rather than filed in a spec.
 */
export const RATE_COMMITMENT = {
  says: 'A rate is a row in a table — never a number typed into this app.',
  because:
    'changing what an hour costs has to be editing one cell of one row, with every price that reads it following',
  measured:
    "the price file has already made the other choice: Boat Module!JO 'Labour Rate ($)' is a live link to the rate on 1,434 boats and a pasted 130.09090909090907 on 571. Change the rate tomorrow and 1,434 boats re-price while 571 do not — and nothing on the column says which is which",
  source: 'SERVICE_AND_THEMES.md §2.6 · Boat Module (5).xlsx · Boat Module!JO',
}
