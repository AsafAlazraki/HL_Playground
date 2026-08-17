/* ============================================================
   THE SEEDED RULES ARE THE ONLY RULES THAT RUN, so they are the
   only place the app can teach a stakeholder something false
   about their own business — and it did.

   WHAT WAS MEASURED ON THE RUNNING APP, and is what this file
   exists to stop coming back:

     'Trailer fitment — Highfield' reported 1,758 rows and paired
     'Highfield - UL240 (PVC) W-W' with 'REDCO 575 Surtees Alum',
     'REDCO Stabicraft Alloy' and a Formosa cradle. It matched on
     Trailer Module!K ATM >= Boat Module!P Max Load, which
     docs/specs/FITMENT_RULES.md F9 settles as a FLOOR — held by
     530 of 530 live pairings and also by a mean 97.70 % of the
     catalogue, so it selects nothing — over a column (Max Load)
     that is an afloat PAYLOAD and whose rule F10 refutes at
     52.5 %. The selector is F8, the series banner naming the
     boat's brand: 581 of 581, zero counter-examples.

     'Motor fitment — Highfield' ANDed HP >= Min HP with
     HP <= Max HP. A2/F2 admits Min HP as a warning ONLY, in its
     own words "so nobody later 'fixes' it by promoting it", and
     the promotion deleted 16 of the 134 Highfield × Yamaha
     pairings the workbook itself writes.

   WHY THESE ASSERTIONS AND NOT A ROW COUNT. A count pinned here
   would fail the next honest re-import from the workbooks. Each
   test below asserts a PROPERTY the adjudication settled, and
   quotes the figure measured on the seed as it stands so a reader
   can see the size of what is being protected:

     1. the trailer rule returns EXACTLY what the banner selector
        in src/features/constraints/trailerFitment.ts returns, for
        every Highfield hull. There is one selector, and this is
        the test that the flow rule has not grown a second one.
     2. it never names a trailer built for another brand — the
        defect, stated as the thing it is.
     3. it discriminates: the seed's 145 live trailers come down
        to 2, well inside F8's 0.92–7.83 % band.
     4. NO seeded rule GATES on ATM, Max Load, or any of the three
        length columns F10/F11 refuted. Read off the rule graph,
        so a clause added later fails here rather than on screen.
     5. the motor rule offers every pairing the workbook makes —
        which is A2's admission condition, enforced.
   ============================================================ */
import { describe, expect, it } from 'vitest'
import { buildNorthsideProject } from './northside'
import { runRule } from '@/lib/rules'
import { readCell } from '@/types/model'
import type { Clause, EntityDef, RowData, RuleDef } from '@/types/model'
import {
  TRAILER_ATM_FLOOR,
  TRAILER_FITMENT,
  marqueVocabulary,
  selectPartners,
} from '@/features/constraints/trailerFitment'
import { WORKBOOK_RULES, WORKBOOK_RULES_BLOCKED } from '@/features/constraints/workbookRules'

const seed = buildNorthsideProject()
const entities: Record<string, EntityDef> = Object.fromEntries(
  seed.entities.map((e) => [e.id, e]),
)
const ctx = { entities, rowsByEntity: seed.rowsByEntity }
const project = { entities, rowsByEntity: seed.rowsByEntity }

const rule = (name: string): RuleDef => {
  const found = seed.rules.find((r) => r.name === name)
  if (!found) throw new Error(`no seeded rule named ${name}`)
  return found
}
const table = (key: string): EntityDef => entities[seed.idByKey[key]]
const rows = (key: string): RowData[] => seed.rowsByEntity[seed.idByKey[key]] ?? []
const field = (key: string, name: string): string => {
  const f = table(key).fields.find((x) => x.name === name)
  if (!f) throw new Error(`${table(key).name} has no column named ${name}`)
  return f.id
}

/** Every clause of every match/filter/condition node on a rule — the
 *  places a rule can GATE. An output column is not a gate. */
const gatingClauses = (def: RuleDef): Clause[] => {
  const out: Clause[] = []
  for (const node of def.nodes) {
    if (node.kind === 'match' || node.kind === 'filter') {
      out.push(...(node.config.group?.clauses ?? []))
    } else if (node.kind === 'condition') {
      for (const branch of node.config.branches ?? []) out.push(...(branch.group?.clauses ?? []))
    }
  }
  return out
}

/** Every field id a clause reads, either side. */
const clauseFields = (c: Clause): string[] => {
  const ids = [c.left.fieldId]
  if (c.right && c.right.kind === 'field') ids.push(c.right.path.fieldId)
  return ids
}

const TRAILER = 'Trailer fitment — Highfield'
const MOTOR = 'Motor fitment — Highfield'

/* ============================================================
   1 · THE TRAILER RULE IS THE BANNER SELECTOR, AND NOTHING ELSE
   ============================================================ */

describe('the seeded trailer rule agrees with the adjudicated selector', () => {
  const marques = marqueVocabulary(project, TRAILER_FITMENT)
  const highfield = table('boat_highfield')

  it('returns exactly the selector’s list, hull by hull', () => {
    /* THE POINT OF THE FILE. `selectPartners` is the one
       implementation of F8 — whole-word banner matching over a
       marque vocabulary derived from the project's own data. A match
       node can only say `contains`, so the two could drift; this is
       what says they have not. Measured on the seed: 40 hulls × 2
       trailers = 80 pairings, every one from 'REDCO - Highfield'. */
    const result = runRule(rule(TRAILER), ctx)
    expect(result.ok).toBe(true)

    const view = result.views['Trailers built for Highfield']
    expect(view, 'the trailer rule emits no view').toBeDefined()

    const byHull = new Map<string, Set<string>>()
    for (const r of view.rows) {
      if (!r.matchRowId) continue
      const set = byHull.get(r.sourceRowId) ?? new Set<string>()
      set.add(r.matchRowId)
      byHull.set(r.sourceRowId, set)
    }

    let pairings = 0
    for (const hull of seed.rowsByEntity[highfield.id] ?? []) {
      const selection = selectPartners(project, TRAILER_FITMENT, highfield.id, hull.id, {
        marques,
        floor: TRAILER_ATM_FLOOR,
      })
      expect(selection).not.toBeNull()
      const expected = new Set(selection!.selected.map((v) => v.rowId))
      const actual = byHull.get(hull.id) ?? new Set<string>()
      expect(
        [...actual].sort(),
        `${selection!.subjectLabel}: the rule and the selector disagree`,
      ).toEqual([...expected].sort())
      pairings += expected.size
    }
    expect(pairings).toBe(80)
    expect(view.rows).toHaveLength(80)
  })

  it('never offers a Highfield hull a trailer built for another brand', () => {
    /* THE DEFECT, NAMED. Before the correction this returned 1,758
       pairs and 53 distinct trailers — the whole NSM Custom table,
       Surtees and Stabicraft and Formosa cradles included. */
    const result = runRule(rule(TRAILER), ctx)
    const view = result.views['Trailers built for Highfield']
    const seriesId = field('trl_nsmcustom', 'Series')
    const trailerById = new Map(rows('trl_nsmcustom').map((r) => [r.id, r]))

    const banners = new Set<string>()
    for (const r of view.rows) {
      const trailer = r.matchRowId ? trailerById.get(r.matchRowId) : undefined
      expect(trailer, 'a matched row is not on NSM Custom Trailers').toBeDefined()
      const banner = readCell(trailer!, seriesId)
      expect(typeof banner).toBe('string')
      banners.add(String(banner))
    }

    /* every banner names Highfield, and no other marque the project
       knows about appears in any of them */
    for (const banner of banners) {
      expect(banner.toLowerCase(), `${banner} does not name Highfield`).toContain('highfield')
      for (const marque of marques) {
        if (marque.name === 'Highfield') continue
        expect(
          banner.toLowerCase(),
          `${banner} names ${marque.name}, a brand this rule is not for`,
        ).not.toContain(marque.name.toLowerCase())
      }
    }
    expect([...banners]).toEqual(['REDCO - Highfield'])
  })

  it('leaves a small enough slice of the catalogue to have chosen something', () => {
    /* F8's tiebreak, quoted: "a gate that leaves 97.7 % of the
       catalogue has not chosen a trailer. A gate that leaves 3 %
       has." F8 leaves 0.92–7.83 % of the 434 live trailers; on this
       seed's 145 it leaves 2, which is 1.38 %. The old ATM gate left
       all 53 rows of the target table. */
    const result = runRule(rule(TRAILER), ctx)
    const view = result.views['Trailers built for Highfield']
    const distinct = new Set(view.rows.map((r) => r.matchRowId))
    const live = rows('trl_nsmcustom').length
    expect(distinct.size).toBe(2)
    expect(distinct.size / live).toBeLessThanOrEqual(0.08)
  })
})

/* ============================================================
   2 · THE FLOOR IS SHOWN AND NEVER GATED ON
   ============================================================ */

describe('no seeded rule gates on a floor or on a refuted column', () => {
  it('does not test ATM, Max Load, or any length column', () => {
    /* FITMENT_RULES.md, three findings in one assertion:
         F9  ATM >= the hull's weight is a FLOOR — 100 % true and
             passed by a mean 97.70 % of the catalogue.
         F10 ATM >= weight + Max Load is REFUTED at 52.5 %; it
             rejects the dealer's own standard cradle for the PA660EW
             across 51 rows.
         F11 there is NO trailer length rule anywhere — the three
             candidates measure 9.4 %, 50.0 % and 0.0 %.
       Read off the rule graph rather than the description, so a
       clause added later fails here and not on a demo screen. */
    const forbidden = new Map<string, string>([
      [field('trl_nsmcustom', 'ATM (KG)'), 'ATM (KG) — F9 makes this a floor, not a selector'],
      [field('boat_highfield', 'Max Load kg'), 'Max Load kg — an afloat payload, refuted by F10'],
      [
        field('trl_nsmcustom', 'Trailer Length (Mtr)'),
        'Trailer Length — F11 finds no length rule (9.4 %)',
      ],
      [
        field('trl_nsmcustom', 'Between Guards (mm)'),
        'Between Guards — F11 finds no width rule (0.0 %)',
      ],
      [field('trl_nsmcustom', 'Boat Size (Mtr)'), 'Boat Size (Mtr) — not a length; F11'],
    ])

    for (const def of seed.rules) {
      for (const clause of gatingClauses(def)) {
        for (const id of clauseFields(clause)) {
          expect(forbidden.has(id), `${def.name} gates on ${forbidden.get(id)}`).toBe(false)
        }
      }
    }
  })

  it('still SHOWS the floor, because relocating is not removing', () => {
    /* The capability the correction moved rather than deleted: ATM
       and the hull's towed weight are on the result so a person can
       see an under-rated trailer. F9 is enforced as a report — which
       is what `trailerFitment.ts` does on the Business rules pane and
       what this rule does in its columns. */
    const def = rule(TRAILER)
    const output = def.nodes.find((n) => n.kind === 'output')
    expect(output).toBeDefined()
    const shown = new Set((output!.config.columns ?? []).map((c) => c.fieldId))
    expect(shown.has(field('trl_nsmcustom', 'ATM (KG)')), 'ATM is not shown').toBe(true)
    expect(
      shown.has(field('boat_highfield', 'Boat Weight kg')),
      'the hull’s towed weight is not shown',
    ).toBe(true)
    expect(shown.has(field('trl_nsmcustom', 'Series')), 'the banner it matched on is not shown').toBe(
      true,
    )
    /* and Max Load, the refuted column, is not on the screen at all */
    expect(shown.has(field('boat_highfield', 'Max Load kg'))).toBe(false)
  })
})

/* ============================================================
   3 · THE AUDIT IS COMPLETE, AND THIS IS WHAT MAKES IT SO
   ============================================================ */

describe('these two rules are the only rules that run', () => {
  it('seeds exactly two flow rules and no third', () => {
    /* The scope of the audit above, asserted rather than assumed. A
       third rule added here without a reading of its own would slip
       onto a demo screen the same way the ATM gate did. */
    expect(seed.rules.map((r) => r.name).sort()).toEqual([MOTOR, TRAILER])
    for (const def of seed.rules) expect(def.enabled).toBe(true)
  })

  it('emits no ConstraintDef, because all sixteen workbook rules are blocked', () => {
    /* The OTHER rule surface. All sixteen seeds in
       features/constraints/workbookRules.ts carry a `blocked` and no
       `build`, so `seedWorkbookConstraints` emits nothing and the
       sentence pane asserts nothing about this business. If one ever
       gains a builder it must arrive with its own measurement — this
       test failing is the reminder to write one. */
    expect(WORKBOOK_RULES).toHaveLength(16)
    for (const rule of WORKBOOK_RULES) {
      expect(rule.blocked?.trim(), `${rule.ref} claims to be expressible`).toBeTruthy()
      expect(rule.build, `${rule.ref} has a builder but is still marked blocked`).toBeUndefined()
      expect(rule.plainly?.trim(), `${rule.ref} has no plain-English reason`).toBeTruthy()
      /* a rule with no number on it is an assertion, not a finding */
      expect(rule.source, `${rule.ref} cites no measurement`).toMatch(/\d/)
    }
    expect(WORKBOOK_RULES_BLOCKED).toHaveLength(16)
  })
})

/* ============================================================
   4 · THE MOTOR CEILING GATES; THE MOTOR FLOOR DOES NOT
   ============================================================ */

describe('the seeded motor rule enforces the ceiling and only warns on the floor', () => {
  it('gates on Max HP and not on Min HP', () => {
    /* A1/F1: 0 of 1,424 live slot-1/slot-2 motors exceed Max HP, so
       the ceiling is enforceable. A2/F2: the floor may never filter,
       and the file says why in its own words — "seeding it as a hard
       constraint would reject 221 of the workbook's own recommended
       motors ... so nobody later 'fixes' it by promoting it". */
    const def = rule(MOTOR)
    const read = new Set(gatingClauses(def).flatMap(clauseFields))
    expect(read.has(field('boat_highfield', 'Max HP')), 'the ceiling is not enforced').toBe(true)
    expect(read.has(field('boat_highfield', 'Min HP')), 'the floor is being filtered on').toBe(false)

    const output = def.nodes.find((n) => n.kind === 'output')
    const shown = new Set((output!.config.columns ?? []).map((c) => c.fieldId))
    expect(shown.has(field('boat_highfield', 'Min HP')), 'the floor is not even shown').toBe(true)
  })

  it('offers every Highfield × Yamaha pairing the workbook itself writes', () => {
    /* A2's admission condition, enforced rather than trusted. The
       join is the workbook's own thirteen motor slots, resolved at
       100 % on the display name. Measured on the seed: 134 pairings,
       0 above Max HP (A1 reproduced) and 16 below Min HP (11.9 %) —
       and those 16 are exactly what the old AND deleted. */
    const result = runRule(rule(MOTOR), ctx)
    expect(result.ok).toBe(true)
    const view = result.views['Motors that fit']
    expect(view).toBeDefined()

    const offered = new Set(view.rows.map((r) => `${r.sourceRowId}|${r.matchRowId ?? ''}`))

    const join = table('join_hf_yam')
    const boatRef = join.fields.find((f) => f.name === 'Boat')!
    const motorRef = join.fields.find((f) => f.name === 'Motor')!
    const minHp = field('boat_highfield', 'Min HP')
    const hpRating = field('mot_yamaha', 'HP Rating')
    const hullById = new Map(rows('boat_highfield').map((r) => [r.id, r]))
    const motorById = new Map(rows('mot_yamaha').map((r) => [r.id, r]))

    let pairs = 0
    let belowFloor = 0
    for (const link of rows('join_hf_yam')) {
      const hullId = String(readCell(link, boatRef.id) ?? '')
      const motorId = String(readCell(link, motorRef.id) ?? '')
      const hull = hullById.get(hullId)
      const motor = motorById.get(motorId)
      if (!hull || !motor) continue
      pairs += 1
      expect(
        offered.has(`${hullId}|${motorId}`),
        'the rule rejects a pairing the workbook makes',
      ).toBe(true)

      const lo = Number(readCell(hull, minHp))
      const hp = Number(String(readCell(motor, hpRating) ?? '').trim())
      if (Number.isFinite(lo) && Number.isFinite(hp) && hp < lo) belowFloor += 1
    }

    expect(pairs).toBe(134)
    /* the number that made the old rule wrong — it must stay > 0, or
       this test has stopped protecting anything */
    expect(belowFloor).toBeGreaterThan(0)
    expect(belowFloor).toBe(16)
  })
})
