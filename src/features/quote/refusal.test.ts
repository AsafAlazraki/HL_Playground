/* ============================================================
   WHY A ROW IS OFF THE SHORTLIST — asserted against the real seed.

   THE CLAIM THIS FILE GUARDS. `QuoteBuild` reaches past every step's
   narrowing — that is what the search and the show-everything switch
   are for — and hl-journeys.md §3.2 Q7/Q8 is the reason it has to:
   production's trailer step has no catalogue browse at all, so a
   trailer the model never named costs a salesperson the whole build.

   Reaching the row is half. The other half is DESIGN_PRINCIPLES rule
   10 — "anything that cannot be done says why, where it is" — and it
   is the single biggest reason to build this screen rather than copy
   the one it answers. A row sitting under a chip reading "not on the
   shortlist" with no reason is a refusal with no reason in a nicer
   typeface.

   So `Candidate.outsideWhy` carries the sentence, and the three ways
   it could go quietly wrong are each asserted below:

     1 · IT IS PRESENT AT ALL. A row marked `outside` that says
         nothing is the old failure wearing the new class name.
     2 · IT NAMES REAL THINGS. Every figure it prints in brackets is
         a cell the two rows actually hold, and every name it prints
         is a column that exists — so a sentence cannot drift into
         plausible-sounding fiction the way an unmeasured tooltip can.
     3 · A ROW ON THE SHORTLIST SAYS NOTHING. The field is for rows
         the narrowing left OUT. A reason attached to a row that was
         offered would be a refusal printed on an acceptance.

   The seed is `src/demos/northside.ts` — 810 live boats, 434 live
   trailers, 241 motors — and the case is FOUND rather than
   hard-coded: a row id typed into a test is a test that goes green
   on the wrong boat the first time the seed is regenerated.
   ============================================================ */

import { describe, expect, it, vi } from 'vitest'
import type { EntityDef, FieldDef, RowData, ViewBlock } from '@/types/model'

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
const { useProjectStore } = await import('@/store/useProjectStore')
const { createViewFor } = await import('@/features/views')
/* DEEP, for the same reason `freeze.ts` reaches for it: `describe` is
   the pure half of the view feature and the barrel does not export the
   word-benders. `thisOne` composes "this Stabicraft" out of this, so
   asserting against `singular` asserts the same derivation the
   sentence used rather than a second copy of it. */
const { singular } = await import('@/features/views/describe')
const { mintQuoteFromView, stepOffer } = await import('./freeze')
const { SUBJECT_STEP } = await import('./steps')
import type { Candidate } from './freeze'
import type { QuoteDef, QuoteSection } from './types'

const project = buildNorthsideProject()
const entities: Record<string, EntityDef> = Object.fromEntries(
  project.entities.map((e) => [e.id, e]),
)
useProjectStore.setState({ entities, rowsByEntity: project.rowsByEntity })

const boats = project.entities.filter((e) => e.kind === 'boat' && e.role !== 'join')

interface Case {
  quote: QuoteDef
  section: QuoteSection
  outside: Candidate[]
  inside: Candidate[]
}

/** The first hull-and-section pair where switching the narrowing off
 *  actually reaches something it was standing in front of. Searched,
 *  not typed: see the header. */
function findReachPastCase(): Case | null {
  for (const boat of boats) {
    const view = createViewFor(boat.id)
    for (const row of (project.rowsByEntity[boat.id] ?? []).slice(0, 8)) {
      const quote = mintQuoteFromView({ viewId: view.id, rowId: row.id, reference: 'T-1' })
      if (!quote) continue
      for (const section of quote.sections) {
        if (section.blockId === SUBJECT_STEP) continue
        const offer = stepOffer(quote, section, { all: true })
        const outside = offer.candidates.filter((c) => c.outside)
        const inside = offer.candidates.filter((c) => !c.outside)
        if (outside.length > 0) return { quote, section, outside, inside }
      }
    }
  }
  return null
}

const reach = findReachPastCase()

/** Every string a row of this table could honestly print — the cells
 *  themselves, so a figure quoted in a sentence can be checked
 *  against the sheet rather than against another derivation of it. */
function cellStrings(entity: EntityDef | undefined, row: RowData | undefined): Set<string> {
  const out = new Set<string>()
  if (!entity || !row) return out
  for (const field of entity.fields) {
    const v = row.values[field.id]
    if (v === null || v === undefined) continue
    out.add(String(v))
  }
  return out
}

describe('a row the narrowing left out says why, on itself', () => {
  it('finds a step where the switch reaches past the narrowing at all', () => {
    /* If this fails the rest of the file is vacuous, so it is asserted
       first and on its own — a suite that silently tests nothing is
       worse than a suite that is red. */
    expect(reach).toBeTruthy()
    expect(reach?.outside.length ?? 0).toBeGreaterThan(0)
  })

  it('gives every reached-past row a reason, and it is a sentence', () => {
    if (!reach) return
    for (const c of reach.outside) {
      expect(c.outsideWhy, `${c.line.label} was reached past and said nothing`).toBeTruthy()
      const why = c.outsideWhy ?? ''
      /* A SENTENCE, not a clause fragment and not a stub: it ends on a
         full stop and it is long enough to have said something. A
         one-word "no" would satisfy `toBeTruthy` and would be exactly
         the shrug rule 10 exists to prevent. */
      expect(why.length).toBeGreaterThan(20)
      expect(why.endsWith('.')).toBe(true)
      /* uppercase is a LABEL style — never a sentence (§2) */
      expect(why).not.toBe(why.toUpperCase())
    }
  })

  it('never puts a refusal on a row that WAS offered', () => {
    if (!reach) return
    for (const c of reach.inside) {
      expect(c.outside, `${c.line.label} is on the shortlist`).toBeUndefined()
      expect(c.outsideWhy, `${c.line.label} is offered and still says why not`).toBeUndefined()
    }
  })

  it('names the list that records the pairing, when that is the reason', () => {
    if (!reach) return
    /* THE CURATED CASE IS THE COMMON ONE ON THIS SHEET. The join rows
       ARE the menu, so the honest reason is not a measurement: it is
       that the price file never wrote this pairing down. The sentence
       has to name the list that WOULD have recorded it, because that
       is what makes the claim checkable — and it has to say that
       nothing is wrong with the row, because a salesperson is about
       to pick it anyway and needs to know that is allowed. */
    const curated = reach.outside.filter((c) => (c.outsideWhy ?? '').includes('never recorded'))
    if (curated.length === 0) return
    const joins = project.entities.filter((e) => e.role === 'join').map((e) => e.name)
    for (const c of curated) {
      const why = c.outsideWhy ?? ''
      expect(joins.some((n) => why.startsWith(n))).toBe(true)
      expect(why).toContain('Nothing is wrong with it')
    }
  })
})

describe('nothing in the sentence is invented', () => {
  it('quotes only figures the two rows actually hold', () => {
    if (!reach) return
    const target = entities[reach.section.tableId]
    const root = entities[reach.quote.rootTableId]
    const rootRow = (project.rowsByEntity[reach.quote.rootTableId] ?? []).find(
      (r) => r.id === reach.quote.rootRowId,
    )
    const rootCells = cellStrings(root, rootRow)

    for (const c of reach.outside) {
      const why = c.outsideWhy ?? ''
      /* Every bracketed figure the sentence prints must be readable
         off one of the two rows, or be the one word the formatter
         uses for an empty cell. `formatCell` may group thousands and
         append a unit, so the raw cell is checked as a SUBSTRING of
         the bracket or the bracket of the raw — never by equality,
         which would be asserting the formatter rather than the
         provenance. */
      const row = (project.rowsByEntity[reach.section.tableId] ?? []).find(
        (r) => r.id === c.line.rowId,
      )
      const cells = new Set([...cellStrings(target, row), ...rootCells])
      for (const m of why.matchAll(/\(([^()]+)\)/g)) {
        const shown = m[1]
        if (shown === 'blank') continue
        const bare = shown.replace(/,/g, '')
        const ok = [...cells].some(
          (v) => v === shown || v === bare || shown.includes(v) || bare.includes(v),
        )
        expect(ok, `${c.line.label}: "${shown}" is on neither row`).toBe(true)
      }
    }
  })

  it('quotes BOTH sides of a measurement when the narrowing is a rule', () => {
    /* ── WHY THIS CASE IS BUILT RATHER THAN FOUND ──────────────────
       Every default block on this seed is CURATED — the join rows are
       the menu — which `stepReason` says out loud and the case above
       asserts. The rule branch is reachable the moment a dealer
       authors one on a block, and it is the branch the whole feature
       is advertised on: "its Max boat length (5.20 m) is less than
       this boat's Length (5.60 m)". A claim in a header comment that
       no test can reach is a claim nobody is keeping.

       So one is authored here, and it is the real-world fitment rule
       rather than a toy: a trailer is offered when its own length
       clears the hull's. The refusal then has to name BOTH columns
       and quote BOTH figures, because a person deciding whether to
       override it needs the two numbers, not the verdict. */
    /* SEARCHED, NOT TYPED, like every other case in this file: the
       pair wanted is a hull that records its own length and a trailer
       block on its page that records the trailer's. Which boat that
       is, is the seed's business. */
    let found: { boat: EntityDef; block: ViewBlock; hull: FieldDef; trail: FieldDef } | null = null
    for (const b of boats) {
      const hull = b.fields.find((f) => f.name === 'Hull Length (Mtr)')
      if (!hull) continue
      for (const block of createViewFor(b.id).blocks) {
        const t = entities[block.tableId]
        const trail = t?.fields.find((f) => f.name === 'Trailer Length (Mtr)')
        if (!trail || t?.kind !== 'trailer') continue
        found = { boat: b, block, hull, trail }
        break
      }
      if (found) break
    }
    expect(found, 'no hull with a trailer block that measures length').toBeTruthy()
    if (!found) return
    const { boat, hull: hullLen, trail: trailerLen } = found
    /* the stored view is handed back by reference, so this IS the
       block `stepOffer` will read */
    const block = found.block
    const view = createViewFor(boat.id)

    block.rule = {
      combinator: 'AND',
      clauses: [
        {
          id: 'fit',
          left: { fieldId: trailerLen.id },
          op: 'gte',
          right: { kind: 'field', path: { fieldId: hullLen.id } },
        },
      ],
    }

    const row = (project.rowsByEntity[boat.id] ?? []).find(
      (r) => typeof r.values[hullLen.id] === 'number',
    )
    expect(row).toBeTruthy()
    if (!row) return
    const quote = mintQuoteFromView({ viewId: view.id, rowId: row.id, reference: 'T-2' })
    expect(quote).toBeTruthy()
    if (!quote) return
    const section = quote.sections.find((s) => s.blockId === block.id)
    expect(section).toBeTruthy()
    if (!section) return

    const offer = stepOffer(quote, section, { all: true })
    const outside = offer.candidates.filter((c) => c.outside)
    expect(outside.length).toBeGreaterThan(0)

    /* PREFER A ROW THAT ACTUALLY RECORDS ITS LENGTH, so the assertion
       exercises the figure-on-both-sides case rather than the
       honest-blank one. Both are correct; only one is the claim. */
    const rowsOf = project.rowsByEntity[block.tableId] ?? []
    const measured = outside.find((c) => {
      const r = rowsOf.find((x) => x.id === c.line.rowId)
      return typeof r?.values[trailerLen.id] === 'number'
    })
    const said = measured ?? outside.find((c) => (c.outsideWhy ?? '').includes(trailerLen.name))
    expect(said, 'no reached-past trailer named the column the rule measures').toBeTruthy()
    const why = said?.outsideWhy ?? ''
    /* both columns named … */
    expect(why).toContain(trailerLen.name)
    expect(why).toContain(hullLen.name)
    /* … the comparison stated in the NEGATIVE, because the row FAILED
       it — "is less than", never "is at least", which would read as
       the rule it passed … */
    expect(why).toContain('is less than')
    /* … the hull named with the DEALER'S OWN NOUN for that table.
       `thisOne` says "this Stabicraft", not "this boat" and not "this
       row": the row noun comes from the table, which is why a
       motorcycle shop reads its own word here for free (§6). */
    expect(why).toContain(`this ${singular(boat.name)}`)
    /* … and the hull's own figure quoted, off the row it belongs to */
    expect(why).toContain(String(row.values[hullLen.id]))
    /* … and the trailer's, when the trailer records one */
    if (measured) {
      const r = rowsOf.find((x) => x.id === measured.line.rowId)
      expect(why).toContain(String(r?.values[trailerLen.id]))
    }

    /* leave the seed as it was found: a rule left on a shared view
       would make every test after this one run against a different
       app */
    delete block.rule
  })

  it('names only columns the two tables actually have', () => {
    if (!reach) return
    const target = entities[reach.section.tableId]
    const root = entities[reach.quote.rootTableId]
    for (const c of reach.outside) {
      const why = c.outsideWhy ?? ''
      /* `columnName` falls back to this phrase when a rule points at a
         column somebody deleted. It is the honest answer and it must
         never reach a salesperson on this seed, where no such rule
         exists. */
      expect(why).not.toContain('a column that is gone')
      /* and the clause form, where there is one, has to name a real
         column of the table being offered */
      const named = why.match(/its ([^(]+?) (?:is|does)/)
      if (!named) continue
      const col = named[1].trim()
      const known = [...(target?.fields ?? []), ...(root?.fields ?? [])].map((f) => f.name)
      expect(known, `${c.line.label} named "${col}"`).toContain(col)
    }
  })
})
