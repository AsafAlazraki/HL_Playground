/* ============================================================
   THE SAME FILE MUST GIVE THE SAME ANSWER.

   The proof pass caught this and its advice was a caveat rather than
   a fix: "do not reload the page mid-demo". The engine's walks are
   `Object.values(project.entities)`, and a string-keyed object
   iterates in INSERTION order — seed order on a fresh load, IndexedDB
   primary-key order after a refresh. So the report depended on how the
   project reached memory, and the proposal count moved on identical
   data.

   An engine that measures cannot answer differently when nothing has
   changed. `discoverSteps` now sorts the entities by id once, before
   anything reads them, and this asserts it: the same project, its
   entity keys shuffled, must produce the same report.

   Shuffled deterministically — a seeded permutation rather than
   Math.random — so a failure is reproducible rather than a story about
   a flaky test.
   ============================================================ */
import { describe, expect, it, vi } from 'vitest'
import { buildNorthsideProject } from '@/demos/northside'
import { discover } from './discover'
import type { DiscoveryProject } from './discover'

/* The suite walks the whole seed several times over. */
vi.setConfig({ testTimeout: 120_000 })

/** A fixed shuffle: reverse, then interleave. No RNG, so a failure
 *  reproduces exactly. */
function reorder(project: DiscoveryProject): DiscoveryProject {
  const keys = Object.keys(project.entities)
  const back = [...keys].reverse()
  const woven: string[] = []
  for (let i = 0; i < back.length; i += 1) {
    woven.push(back[i]!)
    const mirror = back[back.length - 1 - i]
    if (mirror && !woven.includes(mirror)) woven.push(mirror)
  }
  return {
    ...project,
    entities: Object.fromEntries(woven.map((id) => [id, project.entities[id]!])),
  }
}

function projectOf(): DiscoveryProject {
  const p = buildNorthsideProject()
  return { entities: Object.fromEntries(p.entities.map((e) => [e.id, e])), rowsByEntity: p.rowsByEntity }
}

describe('discovery does not depend on how the project reached memory', () => {
  it('gives the same report when the entity order is shuffled', () => {
    const seedOrder = projectOf()
    const other = reorder(seedOrder)

    /* the shuffle must actually shuffle, or this test proves nothing */
    expect(Object.keys(other.entities)).not.toEqual(Object.keys(seedOrder.entities))
    expect(Object.keys(other.entities).sort()).toEqual(Object.keys(seedOrder.entities).sort())

    const a = discover(seedOrder)
    const b = discover(other)

    expect(b.proposals.length).toBe(a.proposals.length)
    expect(b.proposals.map((p) => p.id)).toEqual(a.proposals.map((p) => p.id))

    /* and the numbers on them, not just their identity — a stable list
       of proposals carrying different rates would be the same bug
       wearing a better disguise */
    expect(b.proposals.map((p) => `${p.id}:${p.hits}/${p.tested}`)).toEqual(
      a.proposals.map((p) => `${p.id}:${p.hits}/${p.tested}`),
    )
  })
})
