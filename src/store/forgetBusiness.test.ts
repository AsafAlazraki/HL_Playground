/* ============================================================
   A WIPED PROJECT COMES BACK EMPTY — and stays that way when the
   seventeenth store is written next month.

   THE DEFECT THIS PINS. `resetProject()` called `repository.wipe()`,
   which empties every DEXIE store, and nothing else. Sixteen stores
   live in localStorage, so pressing "start again" left the previous
   business's quotes, rules, workbook seeds, sales board, merge log,
   column mappings and seed stamp exactly where they were — and the
   seed stamp then told the fresh project that the demo data had
   already been loaded.

   `features/constraints/index.ts:63` predicted two thirds of this in
   a comment, in 2026, and the comment was all there was:
   "`resetProject()` should also call `clearConstraints()` … or a
   wiped project comes back with the old organisation's rules still
   in it".

   ── WHY THE SWEEP IS THE IMPORTANT HALF ──────────────────────

   Asserting that sixteen named keys are cleared would pass forever
   and catch nothing. The failure mode is not "these sixteen
   regress"; it is the SEVENTEENTH, written by somebody who has not
   read this file, and it fails silently — a store nobody clears
   looks exactly like a store that works.

   So the sweep lives in `tools/check-stores.mjs`, beside the other
   three source-scanning guards, and reads THIS file for its two
   lists so they cannot drift apart. It fails on any key literal that
   is neither forgotten nor deliberately kept. Whoever adds one has
   to decide which it is, which takes about ten seconds and is the
   whole point. What is left here is the two lists themselves.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import { BUSINESS_KEYS, KEPT_KEYS, isBusinessKey } from './forgetBusiness'

describe('what a wipe takes', () => {
  it('takes the documents, the rules and the decisions about them', () => {
    for (const key of [
      'helmlogic.quotes.v1',
      'helmlogic.constraints.v1',
      'helmlogic.constraints.seeded.v1',
      'helmlogic.discovered.v1',
    ]) {
      expect(isBusinessKey(key)).toBe(true)
    }
  })

  it('takes them under ANY organisation, not only the one open', () => {
    /* Every one of these is org-scoped with the slug appended
       (TENANCY §4.1). A wipe that only took the current org's rows
       would leave a second business's data in the browser. */
    expect(isBusinessKey('helmlogic.quotes.v1:northside-marine')).toBe(true)
    expect(isBusinessKey('hl.pipeline.notes.v1:some-other-yard')).toBe(true)
  })

  /* THE ONE THAT MAKES A FRESH PROJECT ACTUALLY FRESH. Without it the
     stamp says the demo data has already been offered, so a wiped
     project sits empty and never offers to fill itself. */
  it('takes the seed stamp, or a wiped project will not offer the seed again', () => {
    expect(isBusinessKey('helmlogic.seed.v1')).toBe(true)
  })
})

describe('what a wipe must NOT take', () => {
  /* Emptying the sheet is not signing out. */
  it('leaves the session alone', () => {
    expect(isBusinessKey('hl.session.user')).toBe(false)
  })

  /* The one that would actually break something: a second tab reads
     this to know it must not write, and a wipe that cleared it would
     tell that tab it owns a database being emptied underneath it. */
  it('LEAVES THE WRITER LOCK ALONE', () => {
    expect(isBusinessKey('helmlogic.sheet.writer.v1')).toBe(false)
  })

  it('leaves the settings that are about the person, not the business', () => {
    for (const key of ['hl.theme', 'hl.rail.collapsed', 'hl.quotes.view']) {
      expect(isBusinessKey(key)).toBe(false)
    }
  })
})

describe('the two lists themselves', () => {
  it('do not overlap — a key is forgotten or kept, never both', () => {
    const kept = new Set(KEPT_KEYS)
    expect(BUSINESS_KEYS.filter((k) => kept.has(k))).toEqual([])
  })
})
