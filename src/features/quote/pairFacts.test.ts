/* ============================================================
   THE FIVE-WAY ASSOCIATION — rigging kit, prop part number, prop
   description, engine hole and slot — travels with the pairing
   onto a quote line BY VALUE, at pick time.

   THIS IS THE ONE PRODUCTION LOSES. There the association is a
   fuzzy name match that FAILS OPEN, so the rigging kit that
   belongs to a pairing quietly stops travelling with it and the
   quote prints a motor with somebody else's rig — or none.

   Four properties, and each is a way it could break while
   everything else stayed green:

     1. ALL FIVE ARRIVE. Four of them are columns on the join row;
        the fifth is the slot, which is the PAIR'S IDENTITY —
        (boat, motor) is not unique and neither is (boat, motor,
        kit), so two lines for the same motor differ by the kit and
        the slot and by nothing else (FITMENT_RULES.md §1.4).
        The slot went missing once already: the seed used to
        declare its own `Slot` column, was corrected to emit the
        model's `__order`, and a blanket pair-field skip in
        `pairFactsOf` dropped it. Hence a test.
     2. THEY ARE VALUES, NOT LOOKUPS. A reference is resolved to
        the kit's DISPLAY NAME at pick time — the same key the
        workbook itself joins on — so the line still prints the
        right kit after the price file is reimported and the row
        it came from has changed or gone.
     3. THEY BELONG TO THE PAIRING. The same motor on the same
        hull in two slots carries two different kits, and the two
        lines say so.
     4. THEY REACH THE PAGE. `QuoteDocument.tsx` renders
        `line.pairFacts` under the line name (qt-doc-fact) and
        `QuoteEditor.tsx` renders the first two on a candidate —
        so a fact with an empty label or an empty value would draw
        as a gap. Both are asserted to be printable strings.

   Read against the REAL seed, because a fixture would prove only
   that the function does what it was written to do.
   ============================================================ */
import { describe, expect, it, vi } from 'vitest'
import type { EntityDef, RowData } from '@/types/model'
/* type-only, so the mock below is in place before the module runs */
import type { Ctx } from '@/features/views'

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
const { readCell, PAIR_ORDER_FIELD } = await import('@/types/model')
const { joinRefFor, makeEngine } = await import('@/features/views')
const { mintLine } = await import('./freeze')
const { defaultLevelKey } = await import('./pricing')

/* ---------------------------------------------------------- */
/* One boat × motor pairing out of the real seed              */
/* ---------------------------------------------------------- */

const project = buildNorthsideProject()
const entities: Record<string, EntityDef> = Object.fromEntries(
  project.entities.map((e) => [e.id, e]),
)
const ctx: Ctx = { entities, rowsByEntity: project.rowsByEntity }
const engine = makeEngine(ctx)
const byId = new Map(project.entities.map((e) => [e.id, e]))
const rowsOf = (id: string): RowData[] => project.rowsByEntity[id] ?? []
const text = (row: RowData, fieldId: string): string => String(readCell(row, fieldId) ?? '')

/** The first boat × motor join in the seed, with its two links. */
const joinEntity = project.entities.find((e) => {
  if (e.role !== 'join') return false
  const refs = e.fields.filter((f) => f.type === 'reference')
  return (
    refs.some((f) => byId.get(f.refEntityId ?? '')?.kind === 'boat') &&
    refs.some((f) => byId.get(f.refEntityId ?? '')?.kind === 'motor')
  )
})!

const boatField = joinEntity.fields.find(
  (f) => f.type === 'reference' && byId.get(f.refEntityId ?? '')?.kind === 'boat',
)!
const motorField = joinEntity.fields.find(
  (f) => f.type === 'reference' && byId.get(f.refEntityId ?? '')?.kind === 'motor',
)!
const rigField = joinEntity.fields.find(
  (f) => f.type === 'reference' && f !== boatField && f !== motorField,
)!

const boatEntity = byId.get(boatField.refEntityId!)!
const motorEntity = byId.get(motorField.refEntityId!)!
const kitEntity = byId.get(rigField.refEntityId!)!
/** The kit library's own key column — the display NAME, which is what
 *  every library in the Master Price File is joined on (§1.3). */
const kitNameFieldId: string = kitEntity.displayFieldId ?? ''
const join = joinRefFor(entities, joinEntity.id, boatEntity.id, motorEntity.id)!
const levelKey = defaultLevelKey(motorEntity)

const joinRows = rowsOf(joinEntity.id)
const motorRow = (joinRow: RowData): RowData =>
  rowsOf(motorEntity.id).find((r) => r.id === text(joinRow, motorField.id))!

const mintFrom = (joinRow: RowData) =>
  mintLine({
    ctx,
    engine,
    entity: motorEntity,
    row: motorRow(joinRow),
    levelKey,
    join,
    joinRow,
    recommended: readCell(joinRow, '__recommended') === true,
  })

/** A pairing that carries a kit — 118 of the 134 Highfield ones do. */
const withKit = joinRows.find((r) => text(r, rigField.id) !== '')!

const labelsOf = (facts: Array<{ label: string; value: string }> | undefined): string[] =>
  (facts ?? []).map((f) => f.label)

describe('the five-way association on a quote line', () => {
  it('finds a real pairing to test, carrying a rigging kit', () => {
    expect(joinEntity.role).toBe('join')
    expect(kitEntity.kind).toBe('accessory')
    expect(withKit).toBeTruthy()
  })

  it('brings all five across — kit, prop part no., prop description, engine hole and slot', () => {
    const line = mintFrom(withKit)
    const labels = labelsOf(line.pairFacts)
    for (const wanted of [
      'Rigging Kit Option',
      'Prop Part No.',
      'Prop Description',
      'Engine Hole',
      'Slot',
    ]) {
      expect(labels, `${wanted} did not travel onto the line`).toContain(wanted)
    }
  })

  it('carries the slot as the number on the join row, because the slot IS the pair', () => {
    for (const joinRow of joinRows.slice(0, 40)) {
      const line = mintFrom(joinRow)
      const slot = line.pairFacts?.find((f) => f.label === 'Slot')
      expect(slot, 'a pairing reached a line with no slot on it').toBeTruthy()
      expect(slot?.value).toBe(String(joinRow.values[PAIR_ORDER_FIELD]))
    }
  })

  it('freezes the kit by its DISPLAY NAME, never as a row id', () => {
    /* the display name is the key every library in the Master Price
       File is joined on (FITMENT_RULES.md §1.3), so it is also the
       right thing to print and the right thing to freeze */
    const line = mintFrom(withKit)
    const kitFact = line.pairFacts?.find((f) => f.label === 'Rigging Kit Option')!
    const kitRowId = text(withKit, rigField.id)
    const kitRow = rowsOf(kitEntity.id).find((r) => r.id === kitRowId)!
    expect(kitNameFieldId).not.toBe('')
    expect(kitFact.value).toBe(text(kitRow, kitNameFieldId))
    expect(kitFact.value).not.toBe(kitRowId)
    expect(kitFact.value.length).toBeGreaterThan(0)
  })

  it('says nothing about how the pairing got here, and nothing about the star', () => {
    /* `__origin` is provenance about the CATALOGUE — 'rule' where
       the sheet pointed at the row, 'added' where a person typed
       it — and belongs on the join row, not under a customer's
       line. `__recommended` is on the line as `recommended` and is
       drawn as a star; "Recommended No" would be noise. */
    const line = mintFrom(withKit)
    const labels = labelsOf(line.pairFacts)
    expect(labels).not.toContain('Origin')
    expect(labels).not.toContain('Recommended')
  })

  it('never prints an empty label or an empty value', () => {
    /* both are rendered straight into the document and the picker,
       so either one empty draws as a gap nobody can explain */
    for (const joinRow of joinRows.slice(0, 60)) {
      for (const fact of mintFrom(joinRow).pairFacts ?? []) {
        expect(fact.label.trim().length, 'a fact reached the page with no label').toBeGreaterThan(0)
        expect(fact.value.trim().length, `${fact.label} reached the page empty`).toBeGreaterThan(0)
      }
    }
  })

  it('keeps the join row’s Source cell out of the facts and folds it into the line’s note', () => {
    /* a customer document should not carry a spreadsheet address,
       and the business should not lose it — the note is where the
       slot's own columns are written, e.g. "Boat Module!R554 LF..LJ" */
    const line = mintFrom(withKit)
    expect(labelsOf(line.pairFacts)).not.toContain('Source')
    const sourceField = joinEntity.fields.find((f) => f.name === 'Source')
    if (sourceField && text(withKit, sourceField.id) !== '') {
      expect(line.sourceNote ?? '').toContain(text(withKit, sourceField.id))
    }
  })

  /* ----------------------------------------------------------
     IT BELONGS TO THE PAIRING, NOT TO THE MOTOR
     ---------------------------------------------------------- */

  it('gives two slots of the same motor two different rigging kits', () => {
    /* THE WHOLE POINT. A hull names the same motor in two slots
       with two different kits — Highfield ADV7 runs six of them —
       and if the kit were fetched from the motor both lines would
       read the same. MEASURED on the seed: 7 of the 11 Highfield
       motors take more than one kit. */
    const seen = new Map<string, RowData[]>()
    for (const row of joinRows) {
      const key = `${text(row, boatField.id)}|${text(row, motorField.id)}`
      seen.set(key, [...(seen.get(key) ?? []), row])
    }
    const repeated = [...seen.values()].filter(
      (rows) => rows.length > 1 && new Set(rows.map((r) => text(r, rigField.id))).size > 1,
    )
    expect(
      repeated.length,
      'the seed no longer carries one motor with two kits on one hull — re-check §1.4 before deleting this test',
    ).toBeGreaterThan(0)

    const [first, second] = repeated[0]!
    const a = mintFrom(first)
    const b = mintFrom(second)
    expect(a.label).toBe(b.label) /* the same motor */
    const kitOf = (l: typeof a): string =>
      l.pairFacts?.find((f) => f.label === 'Rigging Kit Option')?.value ?? ''
    expect(kitOf(a)).not.toBe(kitOf(b))
    /* and they are still two distinct lines, told apart by the slot */
    expect(a.pairRowId).not.toBe(b.pairRowId)
    expect(a.pairFacts?.find((f) => f.label === 'Slot')?.value).not.toBe(
      b.pairFacts?.find((f) => f.label === 'Slot')?.value,
    )
  })

  /* ----------------------------------------------------------
     BY VALUE — the reason the freeze exists
     ---------------------------------------------------------- */

  it('does not change when the price file changes underneath it', () => {
    /* A quote given to a customer on Monday says the same thing on
       Friday, and the price file may be reimported twice in
       between. So the line holds the kit's NAME, not a pointer to
       a row that may be renamed, re-rigged or deleted. */
    const line = mintFrom(withKit)
    const before = JSON.stringify(line.pairFacts)

    const kitRowId = text(withKit, rigField.id)
    const kitRow = rowsOf(kitEntity.id).find((r) => r.id === kitRowId)!
    kitRow.values[kitNameFieldId] = 'RENAMED IN A REIMPORT'
    withKit.values[PAIR_ORDER_FIELD] = 99
    const propField = joinEntity.fields.find((f) => f.name === 'Prop Description')!
    withKit.values[propField.id] = 'A DIFFERENT PROP'

    expect(JSON.stringify(line.pairFacts)).toBe(before)

    /* and a line minted AFTER the change reads the new data — which
       is what proves the first assertion was a freeze and not a
       cache */
    const after = mintFrom(withKit)
    expect(after.pairFacts?.find((f) => f.label === 'Slot')?.value).toBe('99')
    expect(after.pairFacts?.find((f) => f.label === 'Prop Description')?.value).toBe(
      'A DIFFERENT PROP',
    )
  })
})
