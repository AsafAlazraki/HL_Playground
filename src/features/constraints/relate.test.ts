/* ============================================================
   THE THIRD DOOR, CHECKED AGAINST THE PRICE FILE IT IS FOR.

   FOUR THINGS THIS SUITE EXISTS TO PROVE, and each of them is a way
   the door could be quietly wrong while every other guard stayed
   green:

     1 · THE PAIRS ARE THE ENGINE'S OWN. A pair offered here must be
         a pair a measurement can then be run over. They come from
         `relatedPairs`, which is `relationshipsOf` — the walk the
         measurement itself uses — so a pair and its measurement can
         never disagree about what a relationship is.

     2 · BOUNDING THE RUN BOUNDS THE WORK AND NOT THE TRUTH. The door
         measures one relationship and two shapes where the Business
         rules page measures eight and five. If those two runs
         disagreed on the relationship they share, the number a
         person chooses a column on would depend on which screen they
         opened. They are asserted equal candidate for candidate.

     3 · THE LESSON IS IN THE RANKING. A trailer's ATM against a
         boat's weight holds on every pairing the price file writes
         and leaves nearly the whole trailer catalogue standing; the
         series banner holds at the same rate and leaves a twentieth
         of it. Same rate, opposite worth (FITMENT_RULES.md §1.2).
         The banner must be banded as a selector and the ATM bound as
         a FLOOR, and the floor must not be able to outrank it.

     4 · TAKING A COLUMN NEVER WRITES A RULE. The whole door rests on
         this: what a person just read is a MEASUREMENT, and a
         measurement is not a rule this business stated. The draft it
         opens must still be refused by `missingChoice`.

   Every figure asserted below is measured from `src/demos/northside.ts`
   on every run, for the reason `discoverNorthside.test.ts` gives: a
   rule that rots silently is a green build and a wrong answer on
   somebody's quote.
   ============================================================ */
import { describe, expect, it, vi } from 'vitest'

vi.setConfig({ testTimeout: 120_000 })

import { nowIso } from '@/lib/id'
import type { EntityDef, FieldDef, RowData, TableKind } from '@/types/model'
import { buildNorthsideProject } from '@/demos/northside'
import { buildConcepts } from './columns'
import { makeCtx } from './describe'
import { discover, discoverSteps, type DiscoveryProject } from './discover'
import { narrowingOf } from './discoverSay'
import { missingChoice } from './state'
import { setClauseConcept } from './edit'
import {
  BINDING_SHAPES,
  bindingBands,
  bindingOffers,
  draftFromBinding,
  relatablePairs,
  stillFromBinding,
  type BindingOffer,
  type RelatablePair,
} from './relate'

/* ---------------------------------------------------------- */
/* The seed, and the one pair this suite is about              */
/* ---------------------------------------------------------- */

const seed = buildNorthsideProject()
const project: DiscoveryProject = {
  entities: Object.fromEntries(seed.entities.map((e) => [e.id, e])),
  rowsByEntity: seed.rowsByEntity,
}

const REL = 'boat·boat × trailer·trailer'

const pairs = relatablePairs(project)
const boatsToTrailers = pairs.find(
  (p) => p.relationshipKey === REL && p.partner.kind === 'trailer',
) as RelatablePair

const concepts = buildConcepts(project.entities)
const ctx = makeCtx(project.entities, project.rowsByEntity)

/** The door's own run: one relationship, the two shapes that bind a
 *  catalogue. The cap is lifted so the assertions below can reach a
 *  band the default would have trimmed. */
const scoped = discover(project, {
  relationships: [REL],
  shapes: BINDING_SHAPES,
  maxPerShape: 500,
})

const offers = bindingOffers(scoped, boatsToTrailers, concepts)
const named = (part: string): BindingOffer | undefined =>
  offers.find((o) => o.name.toLowerCase().includes(part.toLowerCase()))

/* ---------------------------------------------------------- */
/* 1 · THE PAIRS ARE THE ENGINE'S OWN                          */
/* ---------------------------------------------------------- */

describe('which two things this price file relates', () => {
  it('offers every relationship both ways round, and nothing else', () => {
    expect(pairs.length).toBeGreaterThan(0)
    expect(pairs.length % 2).toBe(0)
    /* every pair has a mirror: same relationship, sides swapped */
    for (const p of pairs) {
      const mirror = pairs.find(
        (q) =>
          q.relationshipKey === p.relationshipKey &&
          q.subject.kind === p.partner.kind &&
          q.partner.kind === p.subject.kind,
      )
      expect(mirror).toBeDefined()
    }
  })

  it('finds boats and trailers, with the figures the adjudication measured', () => {
    expect(boatsToTrailers).toBeDefined()
    /* FITMENT_RULES.md §1.2 / discoverNorthside: 636 live pairings
       across the trailer joins, 810 live boats, 434 live trailers */
    expect(boatsToTrailers.pairings).toBe(636)
    expect(boatsToTrailers.subject.catalogue).toBe(810)
    expect(boatsToTrailers.partner.catalogue).toBe(434)
    /* §5.2: the whole retired Surtees × OBSOLETE Trailers join */
    expect(boatsToTrailers.heldBack).toBe(30)
  })

  it('names each side in the price file’s own words, not the app’s', () => {
    expect(boatsToTrailers.subject.column).toBe('Boat')
    expect(boatsToTrailers.partner.column).toBe('Trailer')
    /* and carries the app's plural noun beside it, for the sentence */
    expect(boatsToTrailers.partner.label).toBe('Trailers')
  })

  it('is the same reading the measurement is run over', () => {
    /* if these ever diverged, the door would offer a pair the engine
       could not measure — the definition of a door to nowhere */
    const keys = new Set(scoped.relationships.map((r) => r.key))
    expect(keys.has(boatsToTrailers.relationshipKey)).toBe(true)
    const rel = scoped.relationships.find((r) => r.key === REL)
    expect(rel?.pairings).toBe(boatsToTrailers.pairings)
    expect(rel?.heldBack).toBe(boatsToTrailers.heldBack)
  })

  it('offers nothing, rather than a dead choice, where nothing is related', () => {
    expect(relatablePairs(oneTable())).toEqual([])
    expect(relatablePairs(twoUnrelatedTables())).toEqual([])
  })
})

/* ---------------------------------------------------------- */
/* 2 · BOUNDING THE RUN BOUNDS THE WORK, NOT THE TRUTH         */
/* ---------------------------------------------------------- */

describe('one relationship measured alone', () => {
  it('gives the same answer as the whole-file run, candidate for candidate', () => {
    const full = discover(project, { maxPerShape: 5000 })
    const readOff = (r: typeof full): string[] =>
      [...r.proposals, ...r.notProposed]
        .filter((c) => c.relationshipKey === REL && c.binds !== null)
        .map(
          (c) =>
            `${c.id}|${c.hits}/${c.tested}|${c.discrimination?.meanLeft ?? 'x'}|${c.verdict}`,
        )
        .sort()
    expect(readOff(scoped)).toEqual(readOff(full))
  })

  it('measures only the relationship it was given', () => {
    expect(scoped.relationships.map((r) => r.key)).toEqual([REL])
    for (const c of [...scoped.proposals, ...scoped.notProposed]) {
      expect(c.relationshipKey).toBe(REL)
    }
  })

  it('measures nothing at all for a key that names no relationship', () => {
    const none = discover(project, { relationships: ['no such pair'] })
    expect(none.relationships).toEqual([])
    expect(none.proposals).toEqual([])
    expect(none.notProposed).toEqual([])
    expect(none.scanned.comparisons).toBe(0)
  })

  it('reports no join key, because a join key is not a property of a pair', () => {
    const scopedKeys = discover(project, { relationships: [REL] })
    const all = [...scopedKeys.proposals, ...scopedKeys.notProposed]
    expect(all.some((c) => c.shape === 'join-key')).toBe(false)
    /* and the whole-file run still finds them */
    const full = discover(project, { shapes: ['join-key'] })
    expect(
      [...full.proposals, ...full.notProposed].some((c) => c.shape === 'join-key'),
    ).toBe(true)
  })

  it('runs in a time a person waits through', () => {
    /* about 50 ms on this seed against about 0.9 s for the whole
       file. The ceiling is room, not a target — it is here so a
       ten-fold regression fails loudly rather than turning into a
       spinner somebody learns to live with. */
    expect(scoped.ms).toBeLessThan(2_000)
  })

  it('reports a progress that never overshoots the bar it draws', () => {
    /* the run is stopped at every yield and the caller draws
       `done / total`. A total that counted the three shapes this run
       skips would stop the bar at a third and stay there. */
    const run = discoverSteps(project, {
      relationships: [REL],
      shapes: BINDING_SHAPES,
      maxPerShape: 500,
    })
    let last = 0
    let total = 0
    for (;;) {
      const step = run.next()
      if (step.done) break
      expect(step.value.done).toBeGreaterThanOrEqual(last)
      expect(step.value.done).toBeLessThanOrEqual(step.value.total)
      last = step.value.done
      total = step.value.total
    }
    expect(last).toBe(total)
  })
})

/* ---------------------------------------------------------- */
/* 3 · THE LESSON IS IN THE RANKING                            */
/* ---------------------------------------------------------- */

describe('which column decides', () => {
  it('offers only columns on the side being narrowed', () => {
    expect(offers.length).toBeGreaterThan(0)
    for (const o of offers) expect(o.kind).toBe('trailer')
  })

  it('invents no column — every one resolves to a column of the sheet', () => {
    const keys = new Set(concepts.map((c) => c.key))
    for (const o of offers) {
      const far = o.candidate.binds?.far
      expect(far).toBeDefined()
      /* either the sentence can name it, or the row refuses and says
         why. There is no third state where a name was made up. */
      if (o.concept === null) expect(o.refusal).not.toBeNull()
      else expect(keys.has(o.concept.key)).toBe(true)
    }
  })

  it('carries the workbook cell a cryptic column was read out of', () => {
    const series = named('Series')
    expect(series?.desc).toBeDefined()
    expect(series?.desc?.length).toBeGreaterThan(0)
  })

  it('bands the series banner as something that narrows the list', () => {
    const series = named('Series')
    expect(series).toBeDefined()
    expect(series?.band).toBe('selects')
    /* 626 of 626 on this seed — every pairing that could be tested */
    expect(series?.candidate.hits).toBe(series?.candidate.tested)
    /* and it leaves a small fraction of the 434 live trailers */
    expect(series?.catalogue).toBe(434)
    expect((series?.kept ?? 434) / 434).toBeLessThan(0.2)
  })

  it('bands the ATM bound as a FLOOR, at the same perfect rate', () => {
    /* FITMENT_RULES.md §1.2, and the single most important thing this
       screen teaches: same rate as the banner, opposite worth. */
    const floors = offers.filter((o) => o.band === 'floor' && o.name.startsWith('ATM'))
    expect(floors.length).toBeGreaterThan(0)
    const atm = floors[0]
    expect(atm.candidate.hits).toBe(atm.candidate.tested)
    expect(atm.candidate.discrimination?.floor).toBe(true)
    /* it keeps nearly the whole catalogue — that is what a floor is.
       The denominator is the column's OWN catalogue: the rows of the
       far side that carry a value it could be measured against, which
       is what `figuresFor` calls "the rows it could offer". */
    expect(atm.catalogue).toBeGreaterThan(0)
    expect((atm.kept ?? 0) / (atm.catalogue ?? 1)).toBeGreaterThan(0.95)
  })

  it('never lets a floor outrank a selector, whatever its rate', () => {
    const first = offers.findIndex((o) => o.band === 'selects')
    const firstFloor = offers.findIndex((o) => o.band === 'floor')
    expect(first).toBeGreaterThanOrEqual(0)
    expect(firstFloor).toBeGreaterThan(first)
  })

  it('ranks what selects most inside a band, not what holds most', () => {
    const selects = offers.filter((o) => o.band === 'selects' && o.catalogue)
    const shares = selects.map((o) => (o.kept ?? 0) / (o.catalogue ?? 1))
    for (let i = 1; i < shares.length; i += 1) {
      expect(shares[i]).toBeGreaterThanOrEqual(shares[i - 1])
    }
  })

  it('drops no offer on the floor of a band it does not have', () => {
    const bands = bindingBands(offers)
    expect(bands.length).toBeGreaterThan(0)
    for (const b of bands) expect(b.offers.length).toBeGreaterThan(0)
    expect(bands.reduce((s, b) => s + b.offers.length, 0)).toBe(offers.length)
    /* selects always reads before floor */
    const order = bands.map((b) => b.band)
    if (order.includes('selects') && order.includes('floor')) {
      expect(order.indexOf('selects')).toBeLessThan(order.indexOf('floor'))
    }
  })

  it('turns the share back into rows without inventing precision', () => {
    for (const o of offers) {
      if (o.kept === null || o.catalogue === null) continue
      expect(o.kept).toBeGreaterThanOrEqual(0)
      expect(o.kept).toBeLessThanOrEqual(o.catalogue)
      expect(o.kept + (o.rejected ?? 0)).toBe(o.catalogue)
      /* and it says how many subjects the mean was taken over */
      expect(o.over).not.toBeNull()
    }
  })

  it('refuses in place, with the figures it earned, when the page may not name the column', () => {
    const series = named('Series')
    expect(series?.refusal).toBeNull()
    const narrowed = bindingOffers(scoped, boatsToTrailers, concepts, new Set<string>())
    expect(narrowed.length).toBe(offers.length)
    for (const o of narrowed) {
      expect(o.concept).toBeNull()
      expect(o.refusal).not.toBeNull()
      /* the row keeps its measurement — a row that vanished would
         read as though the engine had found nothing */
      expect(o.kept).toBe(offers.find((x) => x.id === o.id)?.kept)
    }
  })
})

describe('narrowingOf', () => {
  it('says nothing where the shape narrows nothing', () => {
    const c = offers[0].candidate
    expect(narrowingOf({ ...c, discrimination: null })).toBeNull()
  })

  it('counts the same rows the share describes', () => {
    for (const o of offers.slice(0, 12)) {
      const d = o.candidate.discrimination
      if (!d) continue
      const r = narrowingOf(o.candidate)
      expect(r?.catalogue).toBe(d.catalogue)
      expect(r?.kept).toBe(Math.round(d.meanLeft * d.catalogue))
      expect(r?.over).toBe(d.over)
    }
  })
})

/* ---------------------------------------------------------- */
/* 4 · TAKING A COLUMN NEVER WRITES A RULE                     */
/* ---------------------------------------------------------- */

describe('taking a column composes the sentence and commits nothing', () => {
  const series = named('Series') as BindingOffer

  it('points the sentence at the column that was chosen', () => {
    const draft = draftFromBinding(series, ctx)
    expect(draft).not.toBeNull()
    const clause = draft?.if.clauses[0]
    expect(clause).toBeDefined()
    expect(ctx.index.get(clause?.left.fieldId ?? '')?.key).toBe(series.concept?.key)
  })

  it('answers no verb, no value and no reason', () => {
    const draft = draftFromBinding(series, ctx)
    expect(draft?.because).toBe('')
    expect(draft?.if.clauses[0].right).toEqual({ kind: 'literal', value: null })
    expect(draft?.then?.clauses[0].left.fieldId).toBe('')
  })

  it('is still refused by the button, with a reason', () => {
    const draft = draftFromBinding(series, ctx)
    const missing = missingChoice(draft!, ctx)
    expect(missing).not.toBeNull()
    expect(missing?.endsWith('.')).toBe(true)
  })

  it('cannot be taken at all where the sentence may not name the column', () => {
    const refused: BindingOffer = { ...series, concept: null, refusal: 'because' }
    expect(draftFromBinding(refused, ctx)).toBeNull()
  })

  it('stops claiming the sentence the moment the column is re-pointed', () => {
    const draft = draftFromBinding(series, ctx)!
    expect(stillFromBinding(series, draft, ctx)).toBe(true)
    const other = concepts.find((c) => c.kind === 'trailer' && c.key !== series.concept?.key)!
    const moved = setClauseConcept(draft, 'if', draft.if.clauses[0].id, other, ctx)
    expect(stillFromBinding(series, moved, ctx)).toBe(false)
  })
})

/* ---------------------------------------------------------- */
/* Fixtures for the honest-refusal cases                       */
/* ---------------------------------------------------------- */

const stamp = nowIso()

function table(
  id: string,
  name: string,
  kind: TableKind | undefined,
  role: 'base' | 'join',
  cols: Array<{ id: string; name: string; type: FieldDef['type']; ref?: string }>,
): EntityDef {
  return {
    id,
    name,
    ...(kind ? { kind } : {}),
    role,
    accent: 'violet',
    hierarchy: [],
    fields: cols.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      ...(c.ref ? { refEntityId: c.ref } : {}),
    })),
    displayFieldId: cols[0].id,
    position: { x: 0, y: 0 },
    createdAt: stamp,
    updatedAt: stamp,
  }
}

const rowOf = (id: string, entityId: string, values: RowData['values']): RowData => ({
  id,
  entityId,
  values,
  createdAt: stamp,
  updatedAt: stamp,
})

function oneTable(): DiscoveryProject {
  const only = table('t1', 'Boats', 'boat', 'base', [{ id: 'f1', name: 'Hull', type: 'text' }])
  return { entities: { t1: only }, rowsByEntity: { t1: [rowOf('r1', 't1', { f1: 'A' })] } }
}

/** Two tables and no relationship table between them: real data, and
 *  nothing to relate. The door must say so rather than draw a list. */
function twoUnrelatedTables(): DiscoveryProject {
  const boats = table('t1', 'Boats', 'boat', 'base', [{ id: 'f1', name: 'Hull', type: 'text' }])
  const trailers = table('t2', 'Trailers', 'trailer', 'base', [
    { id: 'g1', name: 'Trailer', type: 'text' },
  ])
  return {
    entities: { t1: boats, t2: trailers },
    rowsByEntity: {
      t1: [rowOf('r1', 't1', { f1: 'A' })],
      t2: [rowOf('r2', 't2', { g1: 'B' })],
    },
  }
}
