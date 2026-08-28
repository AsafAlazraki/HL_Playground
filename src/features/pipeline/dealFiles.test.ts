/* ============================================================
   WHAT IS ATTACHED TO A DEAL — the decision, before a byte is
   read.

   `filePlan` is the whole of what can be tested without a browser,
   and it is also the whole of what can be got wrong in a way
   somebody notices: a ceiling that refuses without saying the
   number, a cap that lets the twenty-first file through, an empty
   file stored as an attachment. The database half is Dexie's and
   is exercised in the browser rather than mocked here — a mocked
   IndexedDB proves the mock works.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import {
  FILE_MAX_BYTES,
  FILE_MAX_PER_DEAL,
  filePlan,
  isPicture,
  keptNote,
} from './dealFiles'

const file = (size: number, name = 'hull.jpg'): { name: string; size: number } => ({
  name,
  size,
})

describe('the plan taken before anything is read', () => {
  it('keeps an ordinary file', () => {
    expect(filePlan(file(2 * 1024 * 1024), 0)).toEqual({ do: 'keep' })
  })

  it('keeps one right on the ceiling', () => {
    expect(filePlan(file(FILE_MAX_BYTES), 0)).toEqual({ do: 'keep' })
  })

  /* THE REFUSAL CARRIES BOTH NUMBERS — the sentence `logo.ts`
     writes. A ceiling with no measured size beside it leaves a
     person guessing how far over they are. */
  it('refuses one byte over, naming the size AND the ceiling', () => {
    const plan = filePlan(file(FILE_MAX_BYTES + 1), 0)
    expect(plan.do).toBe('refuse')
    if (plan.do !== 'refuse') return
    expect(plan.why).toContain('20 MB')
    expect(plan.why).toContain('hull.jpg')
  })

  it('names the file rather than saying "that file"', () => {
    const plan = filePlan(file(30 * 1024 * 1024, 'sign-writer-artwork.png'), 0)
    expect(plan.do).toBe('refuse')
    if (plan.do !== 'refuse') return
    expect(plan.why).toContain('sign-writer-artwork.png')
  })

  /* AN EMPTY FILE IS A REFUSAL AND NOT A ZERO-BYTE ATTACHMENT. A
     row on the pane that opens to nothing is worse than being told
     it was empty. */
  it('refuses an empty file, and says it is empty', () => {
    const plan = filePlan(file(0), 0)
    expect(plan.do).toBe('refuse')
    if (plan.do !== 'refuse') return
    expect(plan.why).toContain('empty')
  })

  /* THE PER-DEAL CAP IS A READING LIMIT, not a storage one, and it
     says the number so a person knows what to do about it. */
  it('refuses once the deal is full, naming the cap', () => {
    const plan = filePlan(file(1024), FILE_MAX_PER_DEAL)
    expect(plan.do).toBe('refuse')
    if (plan.do !== 'refuse') return
    expect(plan.why).toContain(String(FILE_MAX_PER_DEAL))
  })

  it('allows the last one under the cap', () => {
    expect(filePlan(file(1024), FILE_MAX_PER_DEAL - 1)).toEqual({ do: 'keep' })
  })

  /* THE COUNT IS CHECKED BEFORE THE SIZE, deliberately: a person
     whose deal is full does not need to hear about the ceiling
     first, because making the file smaller will not help. */
  it('says the deal is full rather than that the file is large', () => {
    const plan = filePlan(file(FILE_MAX_BYTES * 2), FILE_MAX_PER_DEAL)
    expect(plan.do).toBe('refuse')
    if (plan.do !== 'refuse') return
    expect(plan.why).toContain('already holds')
  })
})

describe('what was done to somebody file, said', () => {
  /* THE BETTER HALF OF `logo.ts`'s RULE. An app that stores a file
     without saying what it did to it has changed their file
     quietly — even when what it did was nothing. */
  it('says the size and that the original is untouched', () => {
    const note = keptNote(file(2 * 1024 * 1024, 'survey.pdf'))
    expect(note).toContain('survey.pdf')
    /* `sizeSay` keeps one decimal under 10 MB — a dealer reading
       "2.0 MB" beside a 2.4 MB file would be reading a rounded
       number as an exact one. */
    expect(note).toContain('2.0 MB')
    expect(note).toContain('untouched')
  })
})

describe('which files can be drawn', () => {
  it('knows a picture from everything else', () => {
    expect(isPicture('image/jpeg')).toBe(true)
    expect(isPicture('IMAGE/PNG')).toBe(true)
    expect(isPicture('application/pdf')).toBe(false)
    expect(isPicture('')).toBe(false)
  })
})
