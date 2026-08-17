/* ============================================================
   THE SELECTOR — F8, running.

   WHAT THIS IS. `workbookRules.ts` carries eleven rules read out of
   the Master Price File, and F8 is the only one that both holds at
   100 % AND actually rejects something:

     "A boat may only be offered a trailer from a series built for
      that boat's brand."

     ASSERTED · Trailer Module!A carries 47 series banners, eleven of
     which name a boat brand (A87, A95, A105, A113, A127, A133, A140,
     A152, A197, A212, A626).
     VERIFIED · 581 of 581 testable live pairings, 0 counter-examples,
     with per-brand 100 % for Highfield (197/197), Stacer (142/142),
     Stabicraft (121/121), Formosa (92/92) and Surtees (29/29).
     DISCRIMINATION · it leaves 0.92 %–7.83 % of the 434 live trailers
     standing — Highfield 12 of 434 = 2.76 %.
     (docs/specs/FITMENT_RULES.md §1.2, R11, F8.)

   Until this file, none of that was in the app. F8's card read
   "Not checked yet", and the only trailer test the project ran was
   the ATM floor, which passes a mean 97.70 % of the catalogue —
   "a gate that leaves 97.7 % of the catalogue has not chosen a
   trailer. A gate that leaves 3 % has."

   ── THE THREE THINGS THIS FILE IS ACCOUNTABLE FOR ─────────────

   1 · THE SERIES BANNER SELECTS. `selectPartners` admits exactly the
       partner rows whose series banner names the subject's own
       marque. Everything else is either rejected (the banner names
       ANOTHER marque) or set aside as unnamed (the banner names
       none). `trailerFitment.test.ts` measures it on the real seed.

   2 · THE ATM FLOOR WARNS AND NEVER FILTERS. `selected` is computed
       from the banner alone; the floor only annotates a candidate
       that is already in or already out. Seeding it as a filter is
       the A2 failure this specification records once and refuses to
       repeat — and the test proves it by running the whole selection
       twice, with the floor and without, and requiring the same
       list both times.

   3 · THERE IS NO LENGTH RULE, ANYWHERE. `Trailer Module!H 'Boat
       Size (Mtr)'` is not a length (277 point sizes, 142 model
       designators, 36 ranges over 456 cells), `N Trailer Length` is
       populated on 75 of 476 rows and `M Between Guards` on 74, and
       the candidate rules over them measure 9.4 %, 50.0 % and 0.0 %
       (FITMENT_RULES.md F10, F11). Nothing here reads any of those
       three columns, and the test asserts that by reading this
       file's own source.

   ── WHY IT IS GENERIC ─────────────────────────────────────────

   The engine never mentions a brand, a marque or a trailer maker.
   It reads a SUBJECT kind and a PARTNER kind, and both vocabularies
   come out of the project's own data:

     · a partner's SERIES BANNER is its table's outermost hierarchy
       level — `EntityDef.hierarchy[0]`. Every trailer table in the
       Northside seed declares `levels: ["series", "c"]`, which is
       the banner and then the trailer.
     · a subject's MARQUE is a word its own table's NAME carries, or
       a multi-word value of its outermost level — kept only if some
       partner banner actually names it.

   Run over the Northside seed that derivation returns exactly the
   eight marques FITMENT_RULES.md §1.2 lists, and nothing else. That
   is the check that it is reading the workbook rather than being
   told the answer.

   ── WHAT IT DOES NOT DO ───────────────────────────────────────

   It does not become a `ConstraintDef`. F8 stays `blocked` on the
   sentence surface for the reason already recorded: the boat brand
   is the table IDENTITY and the trailer's series brand is buried in
   a banner string, so `buildConcepts` produces neither column and no
   clause can name either (FITMENT_RULES.md §6.4 asks for `Brand` and
   `Series Brand` to be written at import). Parsing the banner here
   is the interim the specification itself names — "today it is
   recoverable only by parsing a banner string" — and it is marked as
   interim on F8's card rather than passed off as the seeded column.
   ============================================================ */

import { isDiscontinued, isRetired, readCell, rowLabel } from '@/types/model'
import type { EntityDef, FieldDef, RowData, TableKind } from '@/types/model'

/* ---------------------------------------------------------- */
/* What the engine is pointed at                              */
/* ---------------------------------------------------------- */

export interface FitmentProject {
  entities: Record<string, EntityDef>
  rowsByEntity: Record<string, RowData[]>
}

/** Which two kinds this selection runs between. The engine is written
 *  once; the pairing is a parameter. */
export interface FitmentScope {
  subjectKind: TableKind
  partnerKind: TableKind
}

/** F8's pairing. The only place in this file that names either kind. */
export const TRAILER_FITMENT: FitmentScope = { subjectKind: 'boat', partnerKind: 'trailer' }

/* ---------------------------------------------------------- */
/* Text                                                        */
/* ---------------------------------------------------------- */

/** Fold to a space-delimited lower-case form so a phrase can be
 *  matched on word boundaries without a regular expression built from
 *  user data. `"REDCO - Stabicraft Alloy Trailers"` becomes
 *  `" redco stabicraft alloy trailers "`. */
function fold(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim()} `
}

/** Does `haystack` name `needle` as a whole word or whole phrase?
 *
 *  WHOLE-WORD IS LOAD-BEARING, not tidiness. `Dunbier`'s
 *  `SPORT CENTRELINE WIDE SERIES` contains the letters of Highfield's
 *  `Sport` series; a substring test would call a Dunbier trailer a
 *  Highfield one. The same test is why `Fishing Series` does not
 *  match `Fisher Series`. */
function names(haystack: string, needle: string): boolean {
  const n = fold(needle).trim()
  if (n === '') return false
  return fold(haystack).includes(` ${n} `)
}

/** The tokens of a table's own name that could be a marque, KEPT IN
 *  THE CASE THE BUSINESS WROTE THEM — a marque is a name, and rule 3
 *  of DESIGN_PRINCIPLES.md is that a name keeps its own case. Four
 *  characters and up, because a two-letter word matches everything. */
function nameTokens(text: string): string[] {
  return text
    .split(/[^A-Za-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && /[A-Za-z]/.test(t))
}

/* ---------------------------------------------------------- */
/* The banner                                                  */
/* ---------------------------------------------------------- */

/** A partner table's series banner: its outermost hierarchy level.
 *  A table with no levels has no banner and can carry no F8. */
export function bannerField(entity: EntityDef): FieldDef | undefined {
  const id = entity.hierarchy?.[0]
  if (!id) return undefined
  const field = entity.fields.find((f) => f.id === id)
  return field && field.type === 'text' ? field : undefined
}

export function bannerOf(entity: EntityDef, row: RowData): string {
  const field = bannerField(entity)
  if (!field) return ''
  const v = readCell(row, field.id)
  return typeof v === 'string' ? v : ''
}

/* ---------------------------------------------------------- */
/* The marque vocabulary — read out of the project             */
/* ---------------------------------------------------------- */

/** One identity a partner's banner can name. */
export interface Marque {
  /** spelled as the subject's own data spells it */
  name: string
  /** `table` — a word in the subject table's name; `level` — a value
   *  of its outermost hierarchy level, for a table that holds more
   *  than one marque (the Northside seed's Jeanneau table holds
   *  Merry Fisher and Cap Camarat as ranges). */
  from: 'table' | 'level'
  subjectTableId: string
  /** the banners that name it, verbatim, so the derivation can be
   *  checked against `Trailer Module!A` by eye */
  banners: string[]
}

interface Candidate {
  name: string
  from: 'table' | 'level'
  tableIds: Set<string>
}

/** Every marque this project's own data supports, with the banners
 *  that name each one.
 *
 *  A candidate has to clear three tests, and each one is here because
 *  dropping it produces a wrong answer on the real seed:
 *
 *    1. it comes from the subject table's NAME, or from a multi-word
 *       value of its outermost level. Single-word level values are
 *       excluded: Highfield's `Sport` series would otherwise claim
 *       Dunbier's `SPORT CENTRELINE WIDE SERIES`.
 *    2. it belongs to exactly one subject table. A word two brands
 *       share cannot select between them.
 *    3. some partner banner actually names it. This is what keeps the
 *       list to what the workbook wrote: `Inflatables` and
 *       `Signature` are unique table words and no banner names either,
 *       so neither becomes a marque. */
export function marqueVocabulary(project: FitmentProject, scope: FitmentScope): Marque[] {
  const tables = Object.values(project.entities)
  const subjects = tables.filter((e) => e.kind === scope.subjectKind)
  const partners = tables.filter((e) => e.kind === scope.partnerKind)

  const candidates = new Map<string, Candidate>()
  const add = (name: string, from: 'table' | 'level', tableId: string): void => {
    const key = `${from}:${fold(name).trim()}`
    const existing = candidates.get(key)
    if (existing) {
      existing.tableIds.add(tableId)
      return
    }
    candidates.set(key, { name: name.trim(), from, tableIds: new Set([tableId]) })
  }

  for (const subject of subjects) {
    for (const token of nameTokens(subject.name)) add(token, 'table', subject.id)

    const levelId = subject.hierarchy?.[0]
    if (!levelId) continue
    for (const row of project.rowsByEntity[subject.id] ?? []) {
      const v = readCell(row, levelId)
      if (typeof v !== 'string') continue
      const value = v.trim()
      /* multi-word only — see test 1 above */
      if (value.length < 4 || !value.includes(' ')) continue
      add(value, 'level', subject.id)
    }
  }

  const out: Marque[] = []
  for (const candidate of candidates.values()) {
    if (candidate.tableIds.size !== 1) continue
    const banners: string[] = []
    for (const partner of partners) {
      /* STOCK ONLY. A marque admitted by a retired table's heading
         alone would be a marque whose every trailer is held back — it
         would appear on the panel with nothing under it. The retired
         rows are still counted and still named, on `heldBack`. */
      if (isRetired(partner) || !bannerField(partner)) continue
      for (const row of project.rowsByEntity[partner.id] ?? []) {
        if (isDiscontinued(row)) continue
        const banner = bannerOf(partner, row)
        if (banner && names(banner, candidate.name) && !banners.includes(banner)) {
          banners.push(banner)
        }
      }
    }
    if (banners.length === 0) continue
    out.push({
      name: candidate.name,
      from: candidate.from,
      subjectTableId: [...candidate.tableIds][0],
      banners: banners.sort(),
    })
  }

  /* longest first, so a nested pair resolves to the more specific one
     — `Merry Fisher` before any bare word it happens to contain */
  return out.sort((a, b) => b.name.length - a.name.length || a.name.localeCompare(b.name))
}

/** The marque of one subject row: its own level value where that names
 *  a marque, otherwise its table's.
 *
 *  A subject with neither is a real answer, not a gap — the Northside
 *  seed's Jeanneau-badged hulls sit in a table no trailer banner names,
 *  and "no series in this catalogue is built for it" is what the
 *  workbook says about them. */
export function marqueOfSubject(
  entity: EntityDef,
  row: RowData,
  marques: readonly Marque[],
): Marque | null {
  const levelId = entity.hierarchy?.[0]
  if (levelId) {
    const v = readCell(row, levelId)
    if (typeof v === 'string' && v.trim() !== '') {
      const hit = marques.find(
        (m) =>
          m.from === 'level' &&
          m.subjectTableId === entity.id &&
          fold(m.name).trim() === fold(v).trim(),
      )
      if (hit) return hit
    }
  }
  /* `marques` arrives longest-first, so a table whose name yields two
     words a banner names resolves to the more specific one. */
  return marques.find((m) => m.from === 'table' && m.subjectTableId === entity.id) ?? null
}

/** The marque a partner's banner names, or null where it names none. */
export function marqueOfBanner(banner: string, marques: readonly Marque[]): Marque | null {
  if (!banner) return null
  return marques.find((m) => names(banner, m.name)) ?? null
}

/* ---------------------------------------------------------- */
/* The floor — a warning, and never anything else              */
/* ---------------------------------------------------------- */

/**
 * F9. The columns the floor compares, by name.
 *
 * It is passed in rather than assumed because the subject-side column
 * is a different column in every band, and comparing a FIXED COLUMN
 * LETTER also scores 100 % — only because in the Highfield band `Q` is
 * `Max People` and in Merry Fisher `P` is `Water Capacity`
 * (FITMENT_RULES.md F9). `mass` is an ordered preference list, and the
 * order matters: Stacer carries both `Hull Weight (Dry)` and
 * `BMT Weight (Dry)` and the workbook's rule is written against the
 * second.
 */
export interface FloorSpec {
  /** the partner's rated capacity column */
  capacity: string
  /** subject load columns, most correct first */
  mass: string[]
  /** where these column names came from — printed beside the result */
  source: string
}

/**
 * THE NORTHSIDE BINDING, quoted from FITMENT_RULES.md F9's own table.
 *
 * Five headers, one per band, and four bands that have none. `Max Load`
 * is deliberately absent: it is an AFLOAT PAYLOAD, not towed mass, and
 * the rule built on it — `ATM ≥ boat weight + Max Load` — rejects the
 * dealer's own standard cradle for the PA660EW across 51 rows
 * (73/139 = 52.5 %, WORKBOOK_RULES_REFUTED F10).
 *
 * THE LIVE SEED USED TO COMPARE AGAINST MAX LOAD AND NO LONGER DOES. Until
 * this note was rewritten, `Trailer fitment — Highfield` in
 * src/demos/northside.ts matched on `Trailer Module!K ATM ≥ Boat Module!P
 * Max Load`, and on the running app it reported 1,758 rows: all 53 rows of
 * NSM Custom Trailers against all 40 Highfield hulls, so a Highfield UL240
 * was offered 'REDCO 575 Surtees Alum', 'REDCO Stabicraft Alloy' and a
 * Formosa cradle. It now matches on the series banner and returns 80 — the
 * same 2 trailers per hull `selectPartners` returns, asserted hull by hull
 * in src/demos/seededRules.test.ts so that flow rule can never grow a
 * second implementation of F8. This list is what the floor compares when it
 * WARNS, and warning is still all it does.
 */
export const TRAILER_ATM_FLOOR: FloorSpec = {
  capacity: 'ATM (KG)',
  mass: [
    'BMT Weight (Dry) kg' /* Stacer · Boat Module!Q */,
    'Tow Weight @ (Dry) kg' /* Stabicraft · Boat Module!Q */,
    'App. Tow Weight kg' /* Surtees · Boat Module!M */,
    'Boat Weight kg' /* Highfield · Boat Module!S */,
    'Hull Weight (Dry) kg' /* Formosa · Boat Module!P */,
  ],
  source:
    "Trailer Module.xlsx · Trailer Module!K 'ATM (KG)' against the boat band's own weight column — " +
    "Stacer Q 'BMT Weight (Dry)', Stabicraft Q 'Tow Weight @ (Dry)', Surtees M 'App. Tow Weight', " +
    "Highfield S 'Boat Weight', Formosa P 'Hull Weight (Dry)'. Jeanneau, Merry Fisher, Cap Camarat " +
    'and Haines Signature have no weight-headed column in the band at all, so the floor cannot run ' +
    'for them and says so. FITMENT_RULES.md F9.',
}

export type FloorVerdict =
  | { kind: 'clears'; capacity: number; load: number }
  | { kind: 'under'; capacity: number; load: number }
  | { kind: 'not-evaluable'; why: string }

const fieldNamed = (entity: EntityDef, name: string): FieldDef | undefined =>
  entity.fields.find((f) => f.name.trim().toLowerCase() === name.trim().toLowerCase())

/** The subject-side load column for one table, or null with the reason.
 *  Exported because "this brand cannot be checked" is a thing a screen
 *  has to be able to say, rather than pass silently. */
export function loadFieldFor(entity: EntityDef, spec: FloorSpec): FieldDef | null {
  for (const name of spec.mass) {
    const field = fieldNamed(entity, name)
    if (field && field.type === 'number') return field
  }
  return null
}

/* ---------------------------------------------------------- */
/* The regimes — three, and not flattened into one             */
/* ---------------------------------------------------------- */

/**
 * R11: THREE mechanisms put a partner under a subject, and they must
 * not be flattened into one.
 *
 *   model-locked   a bespoke cradle built for the hull; the trailer's
 *                  own text names the boat model. ASSERTED for
 *                  Highfield, Formosa, Stabicraft, Haines, Merry
 *                  Fisher and Cap Camarat.
 *   size-selected  generic stock picked against ATM and a size band.
 *                  OBSERVED for Stacer: 0 of 148 Stacer trailer names
 *                  mention Stacer.
 *   package-only   ASSERTED for Haines Signature: `Trailer Module!D
 *                  Supplier` reads `Haines / Dunbier BMT Packages Only`
 *                  on 18 of 18.
 *
 * WHAT THIS TYPE DOES AND DOES NOT DO. It carries the two things that
 * can be MEASURED off the loaded data, each with its numerator and its
 * denominator — and it does NOT return a regime label, because a label
 * is a claim and only one of the two measurements is decisive in both
 * directions.
 *
 *   modelNamed   admitted partners that name this subject row's own
 *                model designator, anywhere in their text. A non-zero
 *                reading corroborates model-locked. A ZERO reading
 *                does NOT establish size-selected: it can also mean the
 *                designator is too short to be read out of free text.
 *                Measured on the Northside seed: Stabicraft 30/30
 *                hulls, Formosa 26/26, Haines 9/9, Surtees 17/19,
 *                Highfield 18/40, Merry Fisher 5/10 — and Stacer 0/26,
 *                which is R11's size-selected finding reproduced.
 *                CAP CAMARAT ALSO READS 0/10 AND THAT IS A LIMIT OF
 *                THIS READING, NOT A DISAGREEMENT WITH R11: its models
 *                are `5.5`, `6.5`, `7.5` and its trailers are `CC5.5`,
 *                `CC6.5`, so the designator is two characters and sits
 *                inside another token. Lowering the token floor until
 *                it passes would be fitting the rule to the answer, so
 *                the reading stays 0 and says so.
 *   channel      a column CONSTANT across a whole partner table whose
 *                value names the marque — a table that exists only as
 *                that marque's route to market. Exactly one of the
 *                eight seeded trailer tables qualifies, and it is
 *                Dunbier / Haines BMT, whose Supplier column is R11's
 *                own package-only evidence.
 */
export interface RegimeReading {
  modelNamed: { hit: number; of: number }
  channel: { column: string; value: string } | null
}

/** Words that identify one model within a marque, taken from the
 *  subject's own hierarchy levels and its display label. The marque
 *  itself is removed — `Surtees` on a Surtees trailer says nothing
 *  about WHICH Surtees. */
function designators(
  entity: EntityDef,
  row: RowData,
  marque: Marque | null,
): string[] {
  const parts: string[] = [rowLabel(entity, row)]
  for (const id of entity.hierarchy ?? []) {
    const v = readCell(row, id)
    if (typeof v === 'string') parts.push(v)
  }
  const banned = new Set(marque ? fold(marque.name).trim().split(' ') : [])
  const out = new Set<string>()
  for (const part of parts) {
    for (const token of fold(part).trim().split(' ')) {
      if (token.length < 3 || banned.has(token)) continue
      out.add(token)
    }
  }
  return [...out]
}

/** Every text cell of a partner row, folded once — the model
 *  designator sits in a different column on every supplier's rows (the
 *  name on GFAB, the code on REDCO, the size column on Dunbier/Haines
 *  BMT), so there is no one column to read and no reason to prefer
 *  one. Folded here rather than at each comparison because this runs
 *  over the whole catalogue for every hull. */
function foldedPartnerText(entity: EntityDef, row: RowData): string {
  const parts: string[] = []
  for (const field of entity.fields) {
    if (field.type !== 'text') continue
    const v = readCell(row, field.id)
    if (typeof v === 'string' && v !== '') parts.push(v)
  }
  return fold(parts.join(' '))
}

/** A column constant across a whole partner table whose value names
 *  the marque — the table IS that marque's channel. */
function channelOf(
  entity: EntityDef,
  rows: readonly RowData[],
  marque: Marque,
  bannerId: string | undefined,
): { column: string; value: string } | null {
  if (rows.length === 0) return null
  for (const field of entity.fields) {
    if (field.type !== 'text' || field.id === bannerId) continue
    const first = readCell(rows[0], field.id)
    if (typeof first !== 'string' || first.trim() === '') continue
    let constant = true
    for (const row of rows) {
      if (readCell(row, field.id) !== first) {
        constant = false
        break
      }
    }
    if (constant && names(first, marque.name)) return { column: field.name, value: first }
  }
  return null
}

/* ---------------------------------------------------------- */
/* The result                                                  */
/* ---------------------------------------------------------- */

/** Why a candidate is in or out. `unnamed` is the third state and it
 *  is not a rejection: on the Northside seed the business itself puts
 *  ten live Stabicraft offerings on a GFAB series whose banner names
 *  no brand, and rejecting them would be exactly the failure F8 exists
 *  to avoid. */
export type SeriesVerdict = 'built-for-this' | 'built-for-another' | 'unnamed'

export interface PartnerVerdict {
  partnerTableId: string
  partnerTableName: string
  rowId: string
  label: string
  banner: string
  series: SeriesVerdict
  /** the marque the banner names, where it names one */
  bannerMarque: string | null
  /** the partner's text names this subject's own model designator.
   *  Read on ADMITTED candidates only — it feeds the regime reading
   *  (R11) and nothing else, and it is `false` rather than unknown on
   *  a candidate the banner already ruled in or out. */
  namesModel: boolean
  floor: FloorVerdict
}

export interface HeldBack {
  /** rows on a table that is history rather than stock */
  retiredRows: number
  retiredTables: string[]
  /** rows on a live table that are no longer sold */
  discontinued: number
}

export interface FitmentResult {
  subjectTableId: string
  subjectRowId: string
  subjectLabel: string
  marque: Marque | null
  /** live partner rows this selection ran over */
  catalogue: number
  selected: PartnerVerdict[]
  unnamed: PartnerVerdict[]
  rejected: PartnerVerdict[]
  heldBack: HeldBack
  regime: RegimeReading
  /** selected candidates whose capacity is under the subject's load.
   *  A WARNING. Nothing here has been removed from `selected`. */
  floorWarnings: PartnerVerdict[]
  /** set when the floor could not run at all on this subject */
  floorNotEvaluable: string | null
}

export interface SelectOptions {
  /** the marque vocabulary, if it has already been built */
  marques?: readonly Marque[]
  /** F9. Omit and every floor verdict is `not-evaluable`, which is the
   *  honest answer for a project whose load column has never been
   *  identified. */
  floor?: FloorSpec
}

/**
 * The partners one subject row may be offered, and why each of the
 * others may not.
 *
 * THE DISCONTINUED CONTRACT IS APPLIED FIRST and separately: a retired
 * partner table and a discontinued partner row never reach any of the
 * three buckets, and the count of what was held back comes back on
 * `heldBack` so the surface can say it. On the Northside seed that is
 * the whole `Surtees × OBSOLETE Trailers` join — 30 live pairings, 8 of
 * them in the standard-trailer slot, the single worst defect in the
 * trailer fan-out (FITMENT_RULES.md §5.2). Hidden, and said out loud.
 */
export function selectPartners(
  project: FitmentProject,
  scope: FitmentScope,
  subjectTableId: string,
  subjectRowId: string,
  options: SelectOptions = {},
): FitmentResult | null {
  const subject = project.entities[subjectTableId]
  if (!subject || subject.kind !== scope.subjectKind) return null
  const subjectRow = (project.rowsByEntity[subjectTableId] ?? []).find((r) => r.id === subjectRowId)
  if (!subjectRow) return null

  const marques = options.marques ?? marqueVocabulary(project, scope)
  const marque = marqueOfSubject(subject, subjectRow, marques)

  const loadField = options.floor ? loadFieldFor(subject, options.floor) : null
  const load = loadField ? readCell(subjectRow, loadField.id) : null
  const floorNotEvaluable = !options.floor
    ? 'No load column has been named for this project, so the capacity floor cannot run.'
    : !loadField
      ? `${subject.name} has no weight column — the band does not carry one — so the capacity floor cannot be checked here.`
      : typeof load !== 'number'
        ? `This row leaves ${loadField.name} empty, so the capacity floor cannot be checked on it.`
        : null

  /* pre-folded and pre-padded, so the whole-word test over the
     catalogue is a substring check rather than a regex per pair */
  const wanted = designators(subject, subjectRow, marque).map((t) => ` ${t} `)

  const selected: PartnerVerdict[] = []
  const unnamed: PartnerVerdict[] = []
  const rejected: PartnerVerdict[] = []
  const heldBack: HeldBack = { retiredRows: 0, retiredTables: [], discontinued: 0 }
  let catalogue = 0

  for (const partner of Object.values(project.entities)) {
    if (partner.kind !== scope.partnerKind) continue
    const rows = project.rowsByEntity[partner.id] ?? []

    if (isRetired(partner)) {
      heldBack.retiredRows += rows.length
      if (rows.length > 0) heldBack.retiredTables.push(partner.name)
      continue
    }

    const capacityField = options.floor ? fieldNamed(partner, options.floor.capacity) : undefined

    for (const row of rows) {
      if (isDiscontinued(row)) {
        heldBack.discontinued += 1
        continue
      }
      catalogue += 1

      const banner = bannerOf(partner, row)
      const bannerMarque = marqueOfBanner(banner, marques)
      const series: SeriesVerdict =
        bannerMarque === null
          ? 'unnamed'
          : marque !== null && bannerMarque.name === marque.name
            ? 'built-for-this'
            : 'built-for-another'

      let floor: FloorVerdict
      if (floorNotEvaluable !== null) {
        floor = { kind: 'not-evaluable', why: floorNotEvaluable }
      } else {
        const capacity = capacityField ? readCell(row, capacityField.id) : null
        if (typeof capacity !== 'number') {
          floor = {
            kind: 'not-evaluable',
            why: `${partner.name} leaves ${options.floor?.capacity ?? 'the capacity column'} empty on this row.`,
          }
        } else {
          const value = load as number
          floor =
            capacity >= value
              ? { kind: 'clears', capacity, load: value }
              : { kind: 'under', capacity, load: value }
        }
      }

      /* only the ADMITTED candidates are read for a model designator:
         it feeds the regime reading and nothing else, and reading it
         off a trailer built for another brand would answer a question
         nobody asked at 145× the cost */
      const namesModel =
        series === 'built-for-this' &&
        (() => {
          const hay = foldedPartnerText(partner, row)
          return wanted.some((token) => hay.includes(token))
        })()

      const verdict: PartnerVerdict = {
        partnerTableId: partner.id,
        partnerTableName: partner.name,
        rowId: row.id,
        label: rowLabel(partner, row),
        banner,
        series,
        bannerMarque: bannerMarque?.name ?? null,
        namesModel,
        floor,
      }

      if (series === 'built-for-this') selected.push(verdict)
      else if (series === 'unnamed') unnamed.push(verdict)
      else rejected.push(verdict)
    }
  }

  const modelHit = selected.filter((v) => v.namesModel).length
  const channel =
    marque === null
      ? null
      : (() => {
          for (const partner of Object.values(project.entities)) {
            if (partner.kind !== scope.partnerKind || isRetired(partner)) continue
            const rows = project.rowsByEntity[partner.id] ?? []
            if (!selected.some((v) => v.partnerTableId === partner.id)) continue
            const found = channelOf(partner, rows, marque, bannerField(partner)?.id)
            if (found) return found
          }
          return null
        })()

  return {
    subjectTableId,
    subjectRowId,
    subjectLabel: rowLabel(subject, subjectRow),
    marque,
    catalogue,
    selected,
    unnamed,
    rejected,
    heldBack,
    regime: { modelNamed: { hit: modelHit, of: selected.length }, channel },
    floorWarnings: selected.filter((v) => v.floor.kind === 'under'),
    floorNotEvaluable,
  }
}

/* ---------------------------------------------------------- */
/* One line per marque — what a screen draws                   */
/* ---------------------------------------------------------- */

/** The selector's own report card: for each marque the project names,
 *  how much of the catalogue its banner leaves standing. This is the
 *  measurement F8 is admitted on, computed on whatever data is loaded
 *  rather than quoted from the specification.
 *
 *  Every count here is aggregated over EVERY subject row carrying the
 *  marque, not sampled from one. A reading taken off one hull reports
 *  that hull, and the first Highfield row in the seed happens to be a
 *  CL260 against a catalogue of SP560 and ADV7 cradles — which would
 *  have said "Highfield names no model" about the brand whose bespoke
 *  cradles are the whole reason F8 was asked for. */
export interface MarqueReading {
  marque: Marque
  /** the subject table the marque belongs to */
  subjectTableName: string
  /** live partner rows whose banner names it */
  selected: number
  /** live partner rows in total */
  catalogue: number
  /** selected ÷ catalogue — F8's discrimination, measured */
  share: number
  /** subject rows carrying this marque that are offered anything */
  hulls: number
  /** of those, how many are offered a partner naming their own model */
  hullsNamingModel: number
  /** R11's package-only evidence, where the data carries it */
  channel: { column: string; value: string } | null
  /** the subject-side load column, where the band carries one */
  loadColumn: string | null
  /** hulls the capacity floor could not be run on at all */
  floorNotEvaluable: number
  /** hulls with at least one admitted partner under the floor */
  floorWarned: number
}

/** The catalogue the selector runs over, counted once — the
 *  denominator every share on screen is a fraction of, plus the two
 *  things a surface has to be able to say out loud: how many rows the
 *  banner speaks for, and how many were held back before selection
 *  even began. */
export interface CatalogueReading {
  /** partner tables that are stock rather than history */
  tables: number
  /** live rows on them */
  live: number
  /** of those, rows whose banner names a marque */
  named: number
  /** rows whose banner names no marque — never rejected, only set
   *  aside, because the business puts real offerings there */
  unnamed: number
  /** rows on a retired table, and the tables */
  retiredRows: number
  retiredTables: string[]
  /** rows on a live table that are no longer sold */
  discontinued: number
}

export function readCatalogue(
  project: FitmentProject,
  scope: FitmentScope,
  marques?: readonly Marque[],
): CatalogueReading {
  const vocabulary = marques ?? marqueVocabulary(project, scope)
  const out: CatalogueReading = {
    tables: 0,
    live: 0,
    named: 0,
    unnamed: 0,
    retiredRows: 0,
    retiredTables: [],
    discontinued: 0,
  }

  for (const partner of Object.values(project.entities)) {
    if (partner.kind !== scope.partnerKind) continue
    const rows = project.rowsByEntity[partner.id] ?? []
    if (isRetired(partner)) {
      out.retiredRows += rows.length
      if (rows.length > 0) out.retiredTables.push(partner.name)
      continue
    }
    out.tables += 1
    for (const row of rows) {
      if (isDiscontinued(row)) {
        out.discontinued += 1
        continue
      }
      out.live += 1
      if (marqueOfBanner(bannerOf(partner, row), vocabulary)) out.named += 1
      else out.unnamed += 1
    }
  }

  return out
}

export function readMarques(
  project: FitmentProject,
  scope: FitmentScope,
  options: SelectOptions = {},
): MarqueReading[] {
  const marques = options.marques ?? marqueVocabulary(project, scope)
  const out: MarqueReading[] = []

  for (const marque of marques) {
    const subject = project.entities[marque.subjectTableId]
    if (!subject) continue

    let selected = 0
    let catalogue = 0
    let hulls = 0
    let hullsNamingModel = 0
    let floorNotEvaluable = 0
    let floorWarned = 0
    let channel: { column: string; value: string } | null = null

    for (const row of project.rowsByEntity[subject.id] ?? []) {
      if (marqueOfSubject(subject, row, marques)?.name !== marque.name) continue
      const result = selectPartners(project, scope, subject.id, row.id, { ...options, marques })
      if (!result) continue
      selected = result.selected.length
      catalogue = result.catalogue
      if (result.selected.length === 0) continue
      hulls += 1
      if (result.regime.modelNamed.hit > 0) hullsNamingModel += 1
      if (result.regime.channel) channel = result.regime.channel
      if (result.floorNotEvaluable) floorNotEvaluable += 1
      if (result.floorWarnings.length > 0) floorWarned += 1
    }

    out.push({
      marque,
      subjectTableName: subject.name,
      selected,
      catalogue,
      share: catalogue === 0 ? 0 : selected / catalogue,
      hulls,
      hullsNamingModel,
      channel,
      loadColumn: options.floor ? (loadFieldFor(subject, options.floor)?.name ?? null) : null,
      floorNotEvaluable,
      floorWarned,
    })
  }

  return out.sort((a, b) => a.marque.name.localeCompare(b.marque.name))
}
