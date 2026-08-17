/* ============================================================
   THE MOTOR AND THE RIGGING KIT — the four things that must stay
   true of the REAL seed, not of a fixture.

   Every rule in `workbookRules.ts` about motors and rigging rests
   on four findings, and each of the four is a shape the app could
   quietly break while every other test stayed green. So each is
   asserted here against `buildNorthsideProject()` — the same 52
   tables a salesperson at Northside Marine opens.

     1. (BOAT, MOTOR) IS NOT UNIQUE, and neither is (boat, motor,
        rigging kit). Anything that dedupes on either deletes
        offerings the dealer makes on purpose.
     2. THE RIGGING KIT BELONGS TO THE PAIRING. It is a column on
        the boat × motor join, no motor table carries a rigging
        menu, and the same motor genuinely takes different kits.
     3. THE JOIN KEY IS THE DISPLAY NAME. The code is carried as a
        secondary reconciliation key and is a WORSE key in every
        library that has one.
     4. THE DERIVED-VS-TYPED DISTINCTION SURVIVES. `__origin` is
        'rule' where the workbook POINTED at the library row and
        'added' where a person typed it, and the overwhelming
        majority is typed — which IS the finding.

   WHY MEASURE RATHER THAN ASSERT A CONSTANT. The seed is
   regenerated from the workbooks by `tools/seed/gen_all.py`, so a
   test pinned to "exactly 25 duplicate pairs" would fail on a
   perfectly good re-import. These assert the SHAPE, and quote the
   figures measured on the seed as it stands so a reader can see
   the size of what is being protected.
   ============================================================ */
import { describe, expect, it, vi } from 'vitest'
import type { EntityDef, RowData } from '@/types/model'

/* Persistence is mocked: the subject is what the seed derives, not
   what Dexie writes. Same door `northsideModules.test.ts` uses. */
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

const { buildNorthsideProject } = await import('@/demos/northside')
const { readCell, PAIR_ORDER_FIELD, PAIR_ORIGIN_FIELD } = await import('@/types/model')
const { WORKBOOK_RULES, WORKBOOK_RULES_REFUTED } = await import('./workbookRules')

const project = buildNorthsideProject()
const byId = new Map<string, EntityDef>(project.entities.map((e) => [e.id, e]))
const rowsOf = (entityId: string): RowData[] => project.rowsByEntity[entityId] ?? []
const text = (row: RowData, fieldId: string): string => String(readCell(row, fieldId) ?? '')

/** A boat × motor join, read the way the app reads one: two link
 *  columns found by the KIND of table they point at, never by name. */
interface MotorJoin {
  entity: EntityDef
  boatFieldId: string
  motorFieldId: string
  /** the rigging kit reference — a fact about the pairing, not a side */
  rigFieldId?: string
  rows: RowData[]
}

const motorJoins: MotorJoin[] = project.entities
  .filter((e) => e.role === 'join')
  .map((entity) => {
    const refs = entity.fields.filter((f) => f.type === 'reference')
    const boat = refs.find((f) => byId.get(f.refEntityId ?? '')?.kind === 'boat')
    const motor = refs.find((f) => byId.get(f.refEntityId ?? '')?.kind === 'motor')
    const rig = refs.find((f) => f !== boat && f !== motor)
    return { entity, boat, motor, rig }
  })
  .filter((j) => j.boat !== undefined && j.motor !== undefined)
  .map((j) => ({
    entity: j.entity,
    boatFieldId: j.boat!.id,
    motorFieldId: j.motor!.id,
    ...(j.rig ? { rigFieldId: j.rig.id } : {}),
    rows: rowsOf(j.entity.id),
  }))

describe('the motor and rigging relationships, against the real seed', () => {
  it('carries a boat × motor join for more than one brand', () => {
    /* six of them today — Highfield, Stacer, Formosa, Stabicraft,
       Surtees and Jeanneau against Yamaha, which FITMENT_RULES.md
       §5.1 measures as 92.2 % of the whole relationship. A rule
       written for one brand and not the others is the failure this
       guards: the brands do NOT behave alike. */
    expect(motorJoins.length).toBeGreaterThanOrEqual(2)
    for (const j of motorJoins) expect(j.rows.length).toBeGreaterThan(0)
  })

  /* ----------------------------------------------------------
     1 · (BOAT, MOTOR) IS NOT UNIQUE
     ---------------------------------------------------------- */

  it('offers the same motor against the same hull more than once, and does not dedupe it', () => {
    /* MEASURED on the seed as it stands: 833 motor pairings, of
       which a UNIQUE constraint on (boat, motor) would delete 72
       (8.64 %) — Highfield 25, Surtees 28, Jeanneau 15, Stabicraft
       3, Stacer 1. On the full live catalogue the same constraint
       deletes 641 of 4,018 = 15.95 % (FITMENT_RULES.md §1.4).

       If this ever reads zero, the seed sample has stopped
       carrying a repeated pair — it does NOT mean the finding
       changed. Check against the workbook extract before touching
       anything downstream of it. */
    let rows = 0
    let distinct = 0
    for (const j of motorJoins) {
      rows += j.rows.length
      distinct += new Set(
        j.rows.map((r) => `${text(r, j.boatFieldId)}|${text(r, j.motorFieldId)}`),
      ).size
    }
    expect(rows).toBeGreaterThan(0)
    expect(rows - distinct).toBeGreaterThan(0)
  })

  it('is not saved by adding the rigging kit to the key', () => {
    /* MEASURED: adding the kit recovers 38 of the 72 and still
       deletes 34 (4.08 %) — Surtees 22, Jeanneau 7, Highfield 4,
       Stacer 1. On the full catalogue: 392 of 4,018 = 9.76 %.
       THERE IS NO NATURAL KEY; the pair's identity is its slot. */
    let rows = 0
    let distinct = 0
    for (const j of motorJoins) {
      rows += j.rows.length
      distinct += new Set(
        j.rows.map(
          (r) =>
            `${text(r, j.boatFieldId)}|${text(r, j.motorFieldId)}|` +
            `${j.rigFieldId ? text(r, j.rigFieldId) : ''}`,
        ),
      ).size
    }
    expect(rows - distinct).toBeGreaterThan(0)
  })

  it('tells those repeats apart by slot, which is the only thing that does', () => {
    /* §1.4: "The pair's identity IS its slot index." So every join
       row carries `__order`, and two rows naming the same boat and
       motor never carry the same one. */
    for (const j of motorJoins) {
      const seen = new Set<string>()
      for (const row of j.rows) {
        const slot = row.values[PAIR_ORDER_FIELD]
        expect(
          typeof slot === 'number' && Number.isFinite(slot),
          `${j.entity.name} has a pairing with no slot`,
        ).toBe(true)
        const key = `${text(row, j.boatFieldId)}|${text(row, j.motorFieldId)}|${String(slot)}`
        expect(seen.has(key), `${j.entity.name} repeats (boat, motor, slot) ${key}`).toBe(false)
        seen.add(key)
      }
    }
  })

  /* ----------------------------------------------------------
     2 · THE RIGGING KIT BELONGS TO THE PAIRING
     ---------------------------------------------------------- */

  it('puts the rigging kit on the pair and nowhere else', () => {
    for (const j of motorJoins) {
      expect(j.rigFieldId, `${j.entity.name} carries no rigging kit column`).toBeTruthy()
      const field = j.entity.fields.find((f) => f.id === j.rigFieldId)
      /* a reference into the kit library, not free text: the name a
         person typed resolves to a row at import or the cell is left
         empty (FOUR_MODULES.md §3.7) */
      expect(field?.type).toBe('reference')
      const target = byId.get(field?.refEntityId ?? '')
      expect(target?.kind).toBe('accessory')
    }
  })

  it('never imports the Motor Library rigging menu as a domain on the motor', () => {
    /* R8, REFUTED: the motor predicts the kit on 53.34 % of real
       pairs. The 79.4 % that made it look like a domain was
       NR - ENGINE NOT REQUIRED matching NR - RIGGING KIT NOT
       REQUIRED, 16,267 of 20,640 "matches". So no motor table may
       grow a `Rigging Option` column, and none has one. */
    for (const entity of project.entities) {
      if (entity.kind !== 'motor') continue
      const rigging = entity.fields.filter((f) => /rigging/i.test(f.name)).map((f) => f.name)
      expect(rigging, `${entity.name} has grown a rigging menu`).toEqual([])
    }
  })

  it('shows the kit belonging to neither side alone — one motor, several kits', () => {
    /* MEASURED on Highfield × Yamaha: 11 motors are paired with a
       kit, and 7 of them (63.6 %) take MORE THAN ONE kit across
       their pairings; 4 of the 17 kits serve more than one motor.
       That is R5 in the data: the kit is a fact about the pairing.
       If a motor determined its kit this would read zero. */
    let motorsWithSeveralKits = 0
    for (const j of motorJoins) {
      if (!j.rigFieldId) continue
      const kitsPerMotor = new Map<string, Set<string>>()
      for (const row of j.rows) {
        const motor = text(row, j.motorFieldId)
        const kit = text(row, j.rigFieldId)
        if (motor === '' || kit === '') continue
        const set = kitsPerMotor.get(motor) ?? new Set<string>()
        set.add(kit)
        kitsPerMotor.set(motor, set)
      }
      motorsWithSeveralKits += [...kitsPerMotor.values()].filter((s) => s.size > 1).length
    }
    expect(motorsWithSeveralKits).toBeGreaterThan(0)
  })

  /* ----------------------------------------------------------
     3 · THE JOIN KEY IS THE DISPLAY NAME
     ---------------------------------------------------------- */

  it('stores a resolved row id on every link, never the name it was matched on', () => {
    /* §6.3: "Store the resolved row id, not the string." A reference
       cell still holding a name is the dangling free-text join the
       join table exists to replace. */
    for (const j of motorJoins) {
      const links = j.entity.fields.filter((f) => f.type === 'reference')
      for (const link of links) {
        const target = link.refEntityId ? new Set(rowsOf(link.refEntityId).map((r) => r.id)) : null
        if (!target) continue
        for (const row of j.rows) {
          const value = text(row, link.id)
          if (value === '') continue /* a soft link may be empty; it may not be a name */
          expect(
            target.has(value),
            `${j.entity.name}.${link.name} holds "${value}", which is not a row of ${byId.get(link.refEntityId ?? '')?.name}`,
          ).toBe(true)
        }
      }
    }
  })

  it('keys every library on its display name, and carries the code as a worse, secondary key', () => {
    /* §1.3, measured again here on the seeded rows:
         Yamaha Outboards   83 rows · Motor 83 distinct (100.00 %)
                                    · Model Code 77 distinct
         Rigging Kits      640 rows · Rigging Kit 638 (99.69 %)
                                    · Part Number 609, and 8 blank
         Parts & Accessories 68 rows · Product 67 · Code 65
       The code loses in every library that has one, which is why it
       reconciles and never joins. */
    const CODE_NAMES = ['Model Code', 'Part Number', 'Code']
    const libraries = new Set<string>()
    for (const j of motorJoins) {
      for (const link of j.entity.fields) {
        if (link.type === 'reference' && link.refEntityId) libraries.add(link.refEntityId)
      }
    }
    expect(libraries.size).toBeGreaterThan(0)

    for (const entityId of libraries) {
      const entity = byId.get(entityId)
      if (!entity) continue
      const rows = rowsOf(entityId)
      if (rows.length === 0) continue
      const displayId = entity.displayFieldId
      /* a library with no display column cannot be joined on a name at
         all, which is the failure this whole test is about */
      if (displayId === undefined) {
        expect.fail(`${entity.name} has no display column to join on`)
      }

      /* the far side of a join must be >= 99 % unique on its key */
      const names = new Set(rows.map((r) => text(r, displayId)))
      expect(
        names.size / rows.length,
        `${entity.name} display name is only ${names.size}/${rows.length} unique`,
      ).toBeGreaterThanOrEqual(0.99)

      const code = entity.fields.find((f) => CODE_NAMES.includes(f.name))
      if (!code) continue
      expect(code.id, `${entity.name} joins on its CODE`).not.toBe(displayId)
      const codes = new Set(rows.map((r) => text(r, code.id)))
      expect(
        codes.size,
        `${entity.name}: ${code.name} is not a worse key than the display name, so re-check §1.3 before promoting it`,
      ).toBeLessThanOrEqual(names.size)
    }
  })

  /* ----------------------------------------------------------
     4 · DERIVED VS TYPED
     ---------------------------------------------------------- */

  it('keeps the derived-vs-typed distinction, and keeps typed as the majority', () => {
    /* 352 of 61,854 live fan-out cells are formulas; the other
       99.4 % are hand-typed, AND THAT IS THE FINDING — a pairing is
       a human decision, not a derivation. MEASURED on the seed: 177
       'rule' rows against 2,053 'added' across all joins, and 4 of
       833 on the motor joins (all Formosa, whose 507 VLOOKUP cells
       are the only rigging formulas in the workbook).

       Both values must be present. If 'rule' ever reaches zero the
       importer has stopped reading formulas; if 'added' does, it
       has started inventing derivations. */
    const counts = new Map<string, number>()
    for (const entity of project.entities) {
      if (entity.role !== 'join') continue
      for (const row of rowsOf(entity.id)) {
        const origin = String(row.values[PAIR_ORIGIN_FIELD] ?? '')
        counts.set(origin, (counts.get(origin) ?? 0) + 1)
      }
    }
    const rule = counts.get('rule') ?? 0
    const added = counts.get('added') ?? 0
    expect(rule, "no pairing is marked 'rule' — the importer has stopped reading formulas").toBeGreaterThan(0)
    expect(added, "no pairing is marked 'added'").toBeGreaterThan(0)
    expect(added, 'typed pairings must outnumber derived ones — 99.4 % of them are typed').toBeGreaterThan(rule)
    /* and nothing else: 'removed' is a person's decision, made in
       the app, and the importer writes only these two */
    for (const key of counts.keys()) {
      expect(['rule', 'added', 'removed'], `unknown pair origin "${key}"`).toContain(key)
    }
  })

  /* ----------------------------------------------------------
     AND THE RULES THEMSELVES
     ---------------------------------------------------------- */

  it('records the motor and rigging rules with their measured rates, and seeds none of them yet', () => {
    const refs = new Set(WORKBOOK_RULES.map((r) => r.ref))
    /* R9 the engine labour · F15 the rigging section · F16 Helm Master */
    for (const ref of ['R9', 'F15', 'F16']) {
      expect(refs.has(ref as never), `${ref} is not recorded`).toBe(true)
    }
    for (const seed of WORKBOOK_RULES) {
      if (!['R9', 'F15', 'F16'].includes(seed.ref)) continue
      /* a rule with no number on it is an assertion, not a finding */
      expect(seed.source, `${seed.ref} cites no measurement`).toMatch(/\d/)
      expect(seed.blocked?.trim(), `${seed.ref} claims to be expressible`).toBeTruthy()
      expect(seed.plainly?.trim(), `${seed.ref} has no plain-English reason`).toBeTruthy()
    }
  })

  it('keeps the two refutations a reader is most likely to re-derive', () => {
    /* Both of these are rules somebody would write from the column
       headings alone, and both would do real damage. */
    const byRef = new Map(WORKBOOK_RULES_REFUTED.map((r) => [r.ref, r]))
    const motorNamesKit = byRef.get('R8')
    expect(motorNamesKit, 'R8 — the motor names the kit — is no longer refuted').toBeTruthy()
    expect(motorNamesKit?.measured).toMatch(/53\.34 %/)

    const pairIsUnique = byRef.get('FITMENT §1.4')
    expect(pairIsUnique, 'the (boat, motor) uniqueness refutation is gone').toBeTruthy()
    expect(pairIsUnique?.measured).toMatch(/641 of 4,018/)

    /* no refuted candidate may reappear as a seed */
    const statements = new Set(WORKBOOK_RULES.map((r) => r.statement))
    for (const refuted of WORKBOOK_RULES_REFUTED) {
      expect(statements.has(refuted.candidate)).toBe(false)
    }
  })
})
