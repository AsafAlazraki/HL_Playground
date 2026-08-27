/* ============================================================
   STARTING A QUOTE — asserted against the real seed, not a fixture.

   `QuoteStart` makes four claims that a screenshot cannot check and
   that would each go on LOOKING right long after they stopped being
   true. Each block below is one of them.

     1 · EVERY PLACE IS DRAWN, AND A SHUT ONE SAYS WHY. Five of the
         nine modules on this sheet cannot raise a price. A picker
         that silently listed four would teach a dealer that their own
         modules are not the shape of this app; a picker that drew
         five dead rows with no explanation is the disabled control
         §6 forbids. So: nine doors, four open, and every refusal is a
         sentence that names the module and the control that clears
         it.

     2 · THE CATALOGUE NEVER OFFERS WHAT IS NOT FOR SALE. A retired
         table and a discontinued row both stay on the sheet so old
         quotes still open, and neither may reach a screen a customer
         reads over a shoulder. Asserted against the seed's own
         `OBSOLETE Trailers`, which is exactly that case.

     3 · THE PREVIEWED WALK IS THE WALK. This is the load-bearing one.
         The footer draws the stops a subject would open BEFORE a
         document exists, off the same relationships `mintQuoteFromView`
         will use. If those two ever disagree the preview becomes
         decoration — a promise about a flow, made by a different
         code path from the one that builds it. So the test mints the
         quote and asserts `buildSteps` walks exactly what the preview
         drew, on a boat AND on a motor, which is also the whole proof
         that the flow adapts to its subject with no flag anywhere.

     4 · THE SOLVER IS REALLY WIRED. `src/lib/configure` had no caller
         until this feature; a panel that silently returned an empty
         verdict would look identical to one that was never called.
         The seed emits no ConstraintDef at all — all sixteen workbook
         rules are blocked, `seededRules.test.ts` asserts it — so this
         asserts BOTH halves: the honest sentence when nothing can run,
         and a real narrowing with the rule's own `because` when a rule
         is put in force.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import type { ConstraintDef, EntityDef, RowData } from '@/types/model'

/* Persistence is mocked: the subject is what the reading derives,
   not what Dexie writes. Same door the other seed suites use. */
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

const { useProjectStore } = await import('@/store/useProjectStore')
const { loadNorthsideProject } = await import('@/demos/northside')
const { createViewFor } = await import('@/features/views')
const { existingRelations } = await import('@/features/views/relations')
const { mintQuoteFromView } = await import('./freeze')
const { buildSteps, HANDOVER_STEP, SUBJECT_STEP } = await import('./steps')
const {
  SUBJECT_CAP,
  andList,
  catalogueOf,
  flowPreview,
  matchSubjects,
  quoteDoors,
  subjectsIn,
  verbsOf,
} = await import('./start')
const { placeRules, subjectVerdict } = await import('./subjectRules')

/* ---------------------------------------------------------- */
/* The real sheet, with its real places on it                  */
/* ---------------------------------------------------------- */

loadNorthsideProject()

/** One instant for every rule this file writes. The rules below are
 *  fixtures for the solver and nothing here reads a timestamp — but
 *  `ConstraintDef` carries them, and a test that invents `new Date()`
 *  per rule is a test with a clock in it. */
const STAMP = '2026-01-01T00:00:00.000Z'

const sheet = () => {
  const s = useProjectStore.getState()
  return { entities: s.entities, rowsByEntity: s.rowsByEntity, modules: s.modules }
}

const doors = () => {
  const { modules, entities, rowsByEntity } = sheet()
  return quoteDoors(modules, entities, rowsByEntity)
}

const door = (name: string) => {
  const hit = doors().find((d) => d.name === name)
  if (!hit) throw new Error(`no place called ${name}`)
  return hit
}

/* ============================================================
   1 · EVERY PLACE IS DRAWN, AND A SHUT ONE SAYS WHY
   ============================================================ */

describe('the places a quote can start from', () => {
  it('draws every module, in the dashboard’s own order', () => {
    const list = doors()
    expect(list.length).toBe(Object.keys(sheet().modules).length)
    expect(list.length).toBeGreaterThan(1)
    /* the dashboard's order and not a ranking of what works — a
       person who learned the dashboard must not learn a second list */
    const orders = list.map((d) => d.module.order)
    expect([...orders].sort((a, b) => a - b)).toEqual(orders)
  })

  it('opens exactly the places whose own settings declare Quote', () => {
    const open = doors().filter((d) => d.refusal === '')
    expect(open.map((d) => d.name).sort()).toEqual(
      ['Boats', 'Factory Packages', 'Motors', 'Trailers'].sort(),
    )
    for (const d of open) expect(d.module.capabilities).toContain('quote')
  })

  it('refuses every other place in a sentence that names it and the switch', () => {
    const shut = doors().filter((d) => d.refusal !== '')
    expect(shut.length).toBeGreaterThan(0)
    for (const d of shut) {
      /* a refusal is a SENTENCE with a reason, in the place where the
         thing is refused — never a greyed row and never a tooltip */
      expect(d.refusal).toContain(d.name)
      expect(d.refusal.trim().endsWith('.')).toBe(true)
      expect(d.refusal.length).toBeGreaterThan(40)
      if (!d.module.capabilities.includes('quote')) {
        /* and it names the control that would clear it, in the word
           the switch actually carries */
        expect(d.refusal).toContain('Quote')
      }
    }
  })

  it('says what a shut place IS for, in the admin’s own verbs', () => {
    const rates = door('Labour Rates')
    expect(rates.module.capabilities).not.toContain('quote')
    /* MODULE_CAPABILITIES' own labels, never a word typed here */
    expect(verbsOf(rates.module)).toEqual(['Browse', 'Search'])
    expect(rates.refusal.toLowerCase()).toContain('browse and search')
  })

  it('lists verbs as English and not as a comma run', () => {
    expect(andList([])).toBe('')
    expect(andList(['Browse'])).toBe('Browse')
    expect(andList(['Browse', 'Search'])).toBe('Browse and Search')
    expect(andList(['Browse', 'Search', 'Open one'])).toBe('Browse, Search and Open one')
  })

  it('prints the same census the dashboard card prints', () => {
    const boats = door('Boats')
    expect(boats.say).toContain(String(boats.census.items))
    expect(boats.census.items).toBeGreaterThan(0)
  })
})

/* ============================================================
   2 · THE CATALOGUE NEVER OFFERS WHAT IS NOT FOR SALE
   ============================================================ */

describe('what a place holds', () => {
  it('never lists a discontinued row or a retired table', () => {
    const { entities, rowsByEntity } = sheet()
    const trailers = door('Trailers')

    /* the seed really does carry both cases, so this is a test of the
       data as well as of the reading */
    const retired = trailers.tables.length
    const all = trailers.module.tableIds.length
    expect(all).toBeGreaterThan(retired)

    const listed = new Set(trailers.tables.map((t) => t.id))
    const rows = catalogueOf(trailers, rowsByEntity)
    expect(rows.length).toBeGreaterThan(0)
    for (const e of rows) {
      expect(listed.has(e.tableId)).toBe(true)
      const row = (rowsByEntity[e.tableId] ?? []).find((r) => r.id === e.rowId)
      expect(row).toBeDefined()
      expect(row?.values['__discontinued']).not.toBe(true)
      expect(entities[e.tableId]).toBeDefined()
    }
    /* and the count held back is SAID rather than left as the
       difference between two numbers */
    expect(trailers.census.held).toBeGreaterThan(0)
    expect(trailers.say).toContain(String(trailers.census.held))
  })

  it('searches word by word, over the heading as well as the name', () => {
    const { rowsByEntity } = sheet()
    const boats = door('Boats')
    const all = catalogueOf(boats, rowsByEntity)

    const withTrail = all.find((e) => e.trail !== '')
    expect(withTrail).toBeDefined()
    const banner = withTrail!.trail.split(' ▸ ')[0]

    /* THE WHOLE-STRING TEST THIS REPLACES answered "nothing matches"
       for a row two screens down: the haystack carries the trail's
       ' ▸ ' and the row's own punctuation, so a name the boat is
       really sold under is never a literal substring of it. */
    const byBanner = matchSubjects(all, banner)
    expect(byBanner.length).toBeGreaterThan(0)
    for (const e of byBanner) {
      expect(`${e.trail} ${e.label}`.toLowerCase()).toContain(banner.toLowerCase())
    }

    /* two words in any order, and the order is the user's business */
    const words = withTrail!.label.split(/\s+/).filter((w) => w.length > 2)
    if (words.length >= 2) {
      const forward = matchSubjects(all, `${words[0]} ${words[1]}`)
      const backward = matchSubjects(all, `${words[1]} ${words[0]}`)
      expect(forward.map((e) => e.rowId)).toEqual(backward.map((e) => e.rowId))
      expect(forward.length).toBeGreaterThan(0)
    }
  })

  it('caps what is drawn and says exactly how many it kept back', () => {
    const { rowsByEntity } = sheet()
    const boats = door('Boats')
    const all = catalogueOf(boats, rowsByEntity)
    expect(all.length).toBeGreaterThan(SUBJECT_CAP)

    const list = subjectsIn(boats, all, '')
    expect(list.shown.length).toBe(SUBJECT_CAP)
    expect(list.hidden).toBe(list.matched.length - list.shown.length)
    expect(list.hidden).toBeGreaterThan(0)
    /* the sections are cut from what is DRAWN, so the headings and
       the rows under them can never disagree about the count */
    const inSections = list.sections.flatMap((s) => s.groups.flatMap((g) => g.entries))
    expect(inSections.length).toBe(list.shown.length)
  })

  it('asks for a second letter only on a list too long to draw', () => {
    const { rowsByEntity } = sheet()
    const boats = door('Boats')
    const all = catalogueOf(boats, rowsByEntity)
    expect(subjectsIn(boats, all, 'y').waiting).toBe(true)
    expect(subjectsIn(boats, all, 'ya').waiting).toBe(false)
    expect(subjectsIn(boats, all, '').waiting).toBe(false)

    /* a short place filters on the first keystroke — there is nothing
       to protect and a floor there would only be in the way */
    const short = doors().find((d) => d.refusal === '' && d.census.items <= SUBJECT_CAP)
    if (short) {
      expect(subjectsIn(short, catalogueOf(short, rowsByEntity), 'y').waiting).toBe(false)
    }
  })
})

/* ============================================================
   3 · THE PREVIEWED WALK IS THE WALK
   ============================================================ */

/** The first live row of a place, as the picker would offer it. */
function firstSubject(name: string) {
  const { entities, rowsByEntity } = sheet()
  const d = door(name)
  const entry = catalogueOf(d, rowsByEntity)[0]
  expect(entry).toBeDefined()
  const entity = entities[entry.tableId]
  expect(entity).toBeDefined()
  return { door: d, entry, entity: entity as EntityDef }
}

describe('the walk a subject opens is drawn before it is taken', () => {
  it('starts on the subject and ends on the customer, with the sequence’s own ids', () => {
    const { entities } = sheet()
    const boat = firstSubject('Boats')
    const views = Object.values(useProjectStore.getState().views ?? {})
    const preview = flowPreview(boat.entity, entities, views)

    expect(preview.stops[0].id).toBe(SUBJECT_STEP)
    expect(preview.stops[0].subject).toBe(true)
    expect(preview.stops[0].title).toBe(boat.entity.name)

    const last = preview.stops[preview.stops.length - 1]
    expect(last.id).toBe(HANDOVER_STEP)
    expect(last.handover).toBe(true)
  })

  it('walks exactly what the quote it mints walks — on a boat', () => {
    expectPreviewMatchesQuote('Boats')
  })

  it('walks exactly what the quote it mints walks — on a motor', () => {
    expectPreviewMatchesQuote('Motors')
  })

  it('gives a motor a different walk from a boat, off the joins and not off a flag', () => {
    const { entities } = sheet()
    const views = () => Object.values(useProjectStore.getState().views ?? {})
    const boatOf = firstSubject('Boats')
    const motorOf = firstSubject('Motors')
    const boat = flowPreview(boatOf.entity, entities, views())
    const motor = flowPreview(motorOf.entity, entities, views())

    /* THE REFERENCE HIDES FOUR OF SEVEN HARD-CODED STEPS BEHIND A
       `motorOnly` PROP. Here each walk is derived, so each opens on
       its own subject and stops at the tables that subject is really
       joined to — and neither list is written down anywhere. */
    expect(boat.stops[0].title).toBe(boatOf.entity.name)
    expect(motor.stops[0].title).toBe(motorOf.entity.name)
    expect(boat.stops.map((s) => s.title)).not.toEqual(motor.stops.map((s) => s.title))

    /* AND THE MOTOR'S WALK IS LONGER, WHICH IS WORTH RECORDING AS A
       FACT ABOUT THIS SHEET RATHER THAN ASSUMING THE OPPOSITE.

       Measured: a Highfield hull opens 8 stops and a Yamaha opens 9.
       `existingRelations` is symmetric — a boat × motor join carries a
       reference column to BOTH sides — so the seven brand joins that
       give a hull one motor stop give a motor seven brand stops back.
       That is honest about the data and is not what a repower quote
       wants, and the answer is the module system's rather than this
       preview's: the blocks on a table's own page are curated, and
       whatever a dealer leaves there is what a quote walks. The
       preview's job is to SAY so before the document is minted, which
       is exactly what the assertion above pins down. */
    expect(motor.stops.length).toBeGreaterThanOrEqual(2)
    expect(boat.stops.length).toBeGreaterThanOrEqual(2)
  })

  it('names only tables the subject is really joined to', () => {
    const { entities } = sheet()
    const views = Object.values(useProjectStore.getState().views ?? {})
    for (const place of ['Boats', 'Motors', 'Trailers']) {
      const subject = firstSubject(place)
      const preview = flowPreview(subject.entity, entities, views)
      const related = new Set(
        existingRelations(entities, subject.entity.id).map((r) => entities[r.otherId]?.name),
      )
      for (const stop of preview.stops) {
        if (stop.subject || stop.handover) continue
        expect(related.has(stop.title)).toBe(true)
      }
    }
  })

  it('says so when a subject is related to nothing, rather than drawing two stops in silence', () => {
    const { entities } = sheet()
    const lonely = Object.values(entities).find(
      (e) =>
        e.role !== 'join' &&
        flowPreview(e, entities, []).stops.length === 2,
    )
    if (!lonely) return
    const preview = flowPreview(lonely, entities, [])
    expect(preview.note).not.toBe('')
    expect(preview.note).toContain(lonely.name)
  })
})

/** THE ASSERTION THE WHOLE PREVIEW RESTS ON. Mint the quote the
 *  picker would mint and walk it with `buildSteps`; every stop the
 *  footer drew, except the handover, must be a step of the real
 *  document, in the same order and under the same name. */
function expectPreviewMatchesQuote(place: string): void {
  const { entities } = sheet()
  const subject = firstSubject(place)

  /* the same two calls `QuoteStart.start()` makes, in the same order */
  const view = createViewFor(subject.entry.tableId)
  const views = Object.values(useProjectStore.getState().views ?? {})
  const preview = flowPreview(subject.entity, entities, views)

  const quote = mintQuoteFromView({
    viewId: view.id,
    rowId: subject.entry.rowId,
    reference: 'TEST-0001',
  })
  expect(quote).not.toBeNull()

  const steps = buildSteps(quote!)
  const walked = steps.map((s) => s.title)
  const promised = preview.stops.filter((s) => !s.handover).map((s) => s.title)
  expect(walked).toEqual(promised)
}

/* ============================================================
   4 · THE SOLVER IS REALLY WIRED
   ============================================================ */

describe('what the rules already decide about one row', () => {
  it('says the true thing when this business has no runnable rule', () => {
    const { entities } = sheet()
    const boat = firstSubject('Boats')
    const row = (sheet().rowsByEntity[boat.entry.tableId] ?? []).find(
      (r) => r.id === boat.entry.rowId,
    )
    expect(row).toBeDefined()

    const place = placeRules(boat.door.module, entities, [])
    const verdict = subjectVerdict(place, boat.entity, row as RowData)

    /* the seed emits no ConstraintDef — all sixteen workbook rules
       are blocked — so nothing narrows, and the panel must not fall
       silent about it */
    expect(verdict.governing).toBe(0)
    expect(verdict.removed).toBe(0)
    expect(verdict.say).not.toBe('')
    /* and it counts what the workbook DOES record, through the same
       reader the module's own rules panel uses */
    expect(verdict.recorded).toBeGreaterThan(0)
    expect(verdict.say).toContain(String(verdict.recorded))
  })

  it('narrows another column and carries the rule’s own reason, verbatim', () => {
    const { entities } = sheet()
    const boat = firstSubject('Boats')
    const rows = sheet().rowsByEntity[boat.entry.tableId] ?? []
    const row = rows.find((r) => r.id === boat.entry.rowId) as RowData

    /* A REAL COLUMN OF THIS SHEET, chosen by asking which of the
       subject's own columns actually carries a value — a rule written
       against a field id typed into a test is a test that goes green
       on the wrong boat the first time the seed is regenerated. */
    const known = boat.entity.fields.find(
      (f) => f.type !== 'image' && f.type !== 'formula' && row.values[f.id] != null,
    )
    expect(known).toBeDefined()

    /* and a Choice column somewhere in the same place for it to prune */
    const target = boat.door.tables
      .flatMap((t) => t.fields.map((f) => ({ table: t, field: f })))
      .find((x) => x.field.type === 'select' && (x.field.options?.length ?? 0) >= 2)
    if (!target) return

    const gone = target.field.options![0]
    const because = 'the workbook does not build that one in this material'
    const rule: ConstraintDef = {
      id: 'test-narrowing',
      kind: 'excludes',
      if: {
        combinator: 'AND',
        clauses: [
          {
            id: 'c1',
            left: { fieldId: known!.id },
            op: 'eq',
            right: { kind: 'literal', value: row.values[known!.id] ?? null },
          },
        ],
      },
      then: {
        combinator: 'AND',
        clauses: [
          {
            id: 'c2',
            left: { fieldId: target.field.id },
            op: 'eq',
            right: { kind: 'literal', value: gone },
          },
        ],
      },
      because,
      enabled: true,
      createdAt: STAMP,
      updatedAt: STAMP,
    }

    const place = placeRules(boat.door.module, entities, [rule])
    expect(place.governing).toHaveLength(1)

    const verdict = subjectVerdict(place, boat.entity, row)
    expect(verdict.removed).toBeGreaterThan(0)
    expect(verdict.narrowings.length).toBeGreaterThan(0)

    const first = verdict.narrowings[0]
    /* THE REASON IS THE RULE'S OWN, RECORDED AT THE MOMENT OF
       REMOVAL — never reconstructed afterwards, which is what makes
       "ask why" honest and what the reference cannot do at all. */
    expect(first.because).toBe(because)
    /* and the column is named so a dealer can find it: one concept
       lives on many tables, and "Material" alone does not say whose */
    expect(first.where).toContain(target.table.name)
    expect(first.where).toContain(target.field.name)
    expect(verdict.say).toContain('rules out')
  })

  it('lets a warning flag and never lets it empty a list', () => {
    const { entities } = sheet()
    const boat = firstSubject('Boats')
    const rows = sheet().rowsByEntity[boat.entry.tableId] ?? []
    const row = rows.find((r) => r.id === boat.entry.rowId) as RowData

    const known = boat.entity.fields.find(
      (f) => f.type !== 'image' && f.type !== 'formula' && row.values[f.id] != null,
    )
    expect(known).toBeDefined()

    const because = 'nothing in the file has been sold in that combination'
    const warn: ConstraintDef = {
      id: 'test-warning',
      kind: 'excludes',
      if: {
        combinator: 'AND',
        clauses: [
          {
            id: 'w1',
            left: { fieldId: known!.id },
            op: 'eq',
            right: { kind: 'literal', value: row.values[known!.id] ?? null },
          },
        ],
      },
      then: {
        combinator: 'AND',
        clauses: [
          {
            id: 'w2',
            left: { fieldId: known!.id },
            op: 'eq',
            right: { kind: 'literal', value: row.values[known!.id] ?? null },
          },
        ],
      },
      because,
      severity: 'warn',
      enabled: true,
      createdAt: STAMP,
      updatedAt: STAMP,
    }

    const place = placeRules(boat.door.module, entities, [warn])
    const verdict = subjectVerdict(place, boat.entity, row)

    /* A MEASURED PATTERN IS NOT A STATED RULE. Whatever it says, a
       'warn' rule may never remove a value and may never raise a
       contradiction — pruning on a coincidence deletes real business. */
    expect(verdict.removed).toBe(0)
    expect(verdict.problems).toHaveLength(0)
  })

  it('never throws, whatever it is handed', () => {
    const { entities } = sheet()
    const boat = firstSubject('Boats')
    const rows = sheet().rowsByEntity[boat.entry.tableId] ?? []
    const row = rows.find((r) => r.id === boat.entry.rowId) as RowData

    const broken: ConstraintDef = {
      id: 'points-at-nothing',
      kind: 'excludes',
      if: {
        combinator: 'AND',
        clauses: [
          { id: 'x', left: { fieldId: 'no-such-column' }, op: 'isEmpty' },
        ],
      },
      because: 'a column somebody struck off the sheet',
      enabled: true,
      createdAt: STAMP,
      updatedAt: STAMP,
    }
    const place = placeRules(boat.door.module, entities, [broken])
    expect(() => subjectVerdict(place, boat.entity, row)).not.toThrow()
  })
})
