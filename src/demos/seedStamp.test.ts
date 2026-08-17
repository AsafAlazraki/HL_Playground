/* ============================================================
   AN EDIT IS NOT STALENESS.

   THE BUG, MEASURED, AND IT IS THE WORST KIND. The freshness notice
   decided "this browser holds an older copy of the example" by
   comparing ROW COUNTS against the seed's own declarations. Adding
   one row to one table is a row-count difference, so the notice
   fired on the user's own edit — printed "Nothing has been lost" —
   and offered to load the current example, which replaces the sheet
   and would have destroyed the row that had just been typed. A false
   alarm that offers to delete work is worse than no alarm.

   THE VERDICT UNDER TEST is `isStaleSeedCopy`, which is deliberately
   not given row counts at all. It is handed the fingerprint this
   browser recorded WHEN IT WAS SEEDED, the fingerprint of the set in
   this build, and how many whole tables are absent. Row counts stay
   where they belong: in the notice's evidence, never in its verdict.

   WHAT EACH CASE IS FOR:
     1. seeded from this build → never stale, whatever the sheet
        now holds. This is the case the bug lived in.
     2. seeded from an older build → stale, on the stamp alone, with
        no help from the counts.
     3. answered already → silent, so "Keep this one" is not asked
        again on every reload.
     4. unstamped (every browser seeded before the stamp existed,
        including the owner's own 21-table copy) → only a whole
        cohort of absent tables counts, and a handful never does.
   ============================================================ */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  COHORT_MIN,
  forgetSeedStamp,
  isStaleSeedCopy,
  keepSeedVersion,
  readSeedStamp,
  writeSeedStamp,
} from './seedStamp'

/* the shape of the real set, so the thresholds are exercised at the
   scale they were chosen against: 52 tables declared */
const SET_TABLES = 52
const NOW = 'abc123'
const THEN = 'zzz999'

describe('isStaleSeedCopy — the verdict', () => {
  it('never calls a browser seeded from THIS build stale, whatever it now holds', () => {
    /* THE BUG. Every one of these was a "yes" under the old row-count
       test, and each is nothing but somebody working. */
    for (const missing of [0, 1, 3, 12, 40]) {
      expect(
        isStaleSeedCopy({
          stamp: { seed: NOW, at: '' },
          current: NOW,
          missing,
          setTables: SET_TABLES,
        }),
      ).toBe(false)
    }
  })

  it('calls a browser seeded from an OLDER build stale on the stamp alone', () => {
    /* nothing is absent and nothing is resized — the sheet may be a
       perfect copy of the set as it stood in March — and it is still
       an older copy, which is exactly what the notice is for */
    expect(
      isStaleSeedCopy({
        stamp: { seed: THEN, at: '' },
        current: NOW,
        missing: 0,
        setTables: SET_TABLES,
      }),
    ).toBe(true)
  })

  it('stays silent once the person has said they are keeping this one', () => {
    expect(
      isStaleSeedCopy({
        stamp: { seed: THEN, kept: NOW, at: '' },
        current: NOW,
        missing: 31,
        setTables: SET_TABLES,
      }),
    ).toBe(false)
  })

  it('asks again when the set moves on past the version that was kept', () => {
    expect(
      isStaleSeedCopy({
        stamp: { seed: THEN, kept: THEN, at: '' },
        current: NOW,
        missing: 0,
        setTables: SET_TABLES,
      }),
    ).toBe(true)
  })

  describe('an unstamped browser — provenance unknown', () => {
    it('speaks only for a whole cohort of absent tables', () => {
      /* the copy the owner actually met: 21 tables where the set now
         declares 52, so 31 of them are simply not there */
      expect(
        isStaleSeedCopy({ stamp: null, current: NOW, missing: 31, setTables: SET_TABLES }),
      ).toBe(true)
    })

    it('says nothing about somebody who deleted a few tables', () => {
      for (const missing of [0, 1, 2, COHORT_MIN, 12]) {
        expect(
          isStaleSeedCopy({ stamp: null, current: NOW, missing, setTables: SET_TABLES }),
        ).toBe(false)
      }
    })

    it('never speaks for row counts, because it is never given them', () => {
      /* the argument list is the proof: there is nowhere to pass an
         edit in. A sheet with every table present is not stale. */
      expect(
        isStaleSeedCopy({ stamp: null, current: NOW, missing: 0, setTables: SET_TABLES }),
      ).toBe(false)
    })
  })
})

describe('the stamp itself', () => {
  beforeEach(() => {
    forgetSeedStamp()
  })

  it('records the fingerprint it was seeded with, and forgets it on demand', () => {
    expect(readSeedStamp()).toBeNull()
    writeSeedStamp(NOW)
    expect(readSeedStamp()?.seed).toBe(NOW)
    forgetSeedStamp()
    expect(readSeedStamp()).toBeNull()
  })

  it('keeps the seed it was written with when an answer is recorded', () => {
    writeSeedStamp(THEN)
    keepSeedVersion(NOW)
    const stamp = readSeedStamp()
    expect(stamp?.seed).toBe(THEN)
    expect(stamp?.kept).toBe(NOW)
  })

  it('can record an answer on a browser that was never stamped', () => {
    keepSeedVersion(NOW)
    expect(readSeedStamp()?.seed).toBeUndefined()
    expect(readSeedStamp()?.kept).toBe(NOW)
  })
})
