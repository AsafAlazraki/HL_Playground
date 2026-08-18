import { describe, expect, it } from 'vitest'
import { diffStore } from './repository'

/* ============================================================
   The write is the difference, not the project.

   `diffStore` is the whole of that claim: given what the last
   successful write left on disk, it answers what this one has to
   touch. The rest of the repository is Dexie plumbing around it.

   The rule under test is IDENTITY, not equality. The store is
   immutable, so a record that changed is a new object and a record
   that did not is the same one; comparing by value instead would
   mean walking every field of eleven thousand rows on every
   keystroke, which is the cost we are removing.
   ============================================================ */

interface Rec {
  id: string
  v: string
}

const rec = (id: string, v = 'a'): Rec => ({ id, v })

const known = (...items: Rec[]): Map<string, Rec> =>
  new Map(items.map((x) => [x.id, x]))

describe('diffStore', () => {
  it('writes everything when nothing is known to be on disk', () => {
    const a = rec('a')
    const b = rec('b')
    const d = diffStore([a, b], new Map())
    expect(d.put).toEqual([a, b])
    expect(d.remove).toEqual([])
    expect(d.quiet).toBe(false)
  })

  it('writes nothing when every record is the object already written', () => {
    const a = rec('a')
    const b = rec('b')
    const d = diffStore([a, b], known(a, b))
    expect(d.put).toEqual([])
    expect(d.remove).toEqual([])
    expect(d.quiet).toBe(true)
  })

  it('writes ONE record when one row was edited', () => {
    const a = rec('a')
    const b = rec('b')
    const edited = { ...b, v: 'b2' }
    const d = diffStore([a, edited], known(a, b))
    expect(d.put).toEqual([edited])
    expect(d.remove).toEqual([])
  })

  /* THE POINT OF THE WHOLE CHANGE, stated as a number: a cell edit in
     a project of eleven thousand rows must write one row. */
  it('writes one of eleven thousand', () => {
    const rows = Array.from({ length: 11_000 }, (_, i) => rec(`r${i}`))
    const disk = known(...rows)
    const next = rows.slice()
    next[7_431] = { ...next[7_431], v: 'typed' }
    const d = diffStore(next, disk)
    expect(d.put).toHaveLength(1)
    expect(d.put[0].id).toBe('r7431')
    expect(d.remove).toHaveLength(0)
  })

  it('deletes what left the snapshot', () => {
    const a = rec('a')
    const b = rec('b')
    const d = diffStore([a], known(a, b))
    expect(d.put).toEqual([])
    expect(d.remove).toEqual(['b'])
    expect(d.quiet).toBe(false)
  })

  it('handles a wholesale replacement — every id new', () => {
    const old = [rec('a'), rec('b')]
    const fresh = [rec('x'), rec('y')]
    const d = diffStore(fresh, known(...old))
    expect(d.put).toEqual(fresh)
    expect(d.remove.sort()).toEqual(['a', 'b'])
  })

  /* A RECORD WITH THE SAME VALUES BUT A NEW OBJECT IS STILL WRITTEN.
     Deliberate: the ledger's job is to be cheap and never wrong, and
     "same values" cannot be established without reading every field.
     Re-writing a record that did not need it costs one put; missing
     one that did costs the edit. */
  it('writes an identical-looking record that is a different object', () => {
    const a = rec('a')
    const twin = rec('a')
    const d = diffStore([twin], known(a))
    expect(d.put).toEqual([twin])
  })

  it('leaves the ledger for the next write', () => {
    const a = rec('a')
    const b = rec('b')
    const d = diffStore([a, b], known(a))
    expect([...d.next.keys()]).toEqual(['a', 'b'])
    /* and feeding that ledger back is quiet */
    expect(diffStore([a, b], d.next).quiet).toBe(true)
  })

  it('is quiet on an empty project that was already empty', () => {
    expect(diffStore([], new Map()).quiet).toBe(true)
  })
})
