/* ============================================================
   WHAT WAS SAID ABOUT A DEAL — the arithmetic of it.

   Everything that decides anything in `dealNotes.ts` is pure and
   takes its inputs as arguments, so most of this needs no browser,
   no store and no clock. What is checked is the handful of rules a
   thread would be quietly wrong about: that a conversation reads
   oldest first however it was stored, that UNDO removes the note it
   was raised about rather than the last one, that a corrupt row
   costs one note and not nine, and that a browser refusing to store
   somebody's words SAYS SO rather than swallowing it.

   The last of those is the only thing here that touches a fake
   `localStorage`, and it is the one behaviour worth the stub: it is
   where this file deliberately differs from `stages.ts`, and a
   difference nobody tests is a difference that quietly reverts.
   ============================================================ */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  composeNote,
  countOf,
  dropNote,
  forgetDealNotes,
  mintNote,
  mintNoteId,
  notesFor,
  notesOf,
  parseBag,
  saveNote,
  whyNotNote,
  withNote,
  withoutNote,
  type DealNote,
  type NoteBag,
} from './dealNotes'

const T = Date.parse('2026-08-28T09:00:00.000Z')

const note = (id: string, at: number, text = 'said something'): DealNote => ({
  id,
  at,
  text,
})

/* ---------------------------------------------------------- */

describe('what a note has to be', () => {
  it('refuses an empty note, in a sentence rather than a boolean', () => {
    expect(whyNotNote('')).toContain('empty')
    expect(whyNotNote('   \n  ')).toContain('empty')
  })

  it('accepts anything with a word in it', () => {
    expect(whyNotNote('ok')).toBeNull()
    expect(whyNotNote('  rang him Tuesday  ')).toBeNull()
  })

  /* A TEXTAREA HANDS BACK TRAILING NEWLINES, which are typing and
     not content. Nothing else about the words is reshaped — they
     are the person's. */
  it('trims what was typed and leaves the rest exactly as it was', () => {
    const n = mintNote({ id: 'n1', at: T, text: '  two\n\nlines  \n' })
    expect(n.text).toBe('two\n\nlines')
  })

  it('carries an author only when there is one', () => {
    expect(mintNote({ id: 'n1', at: T, text: 'x' })).not.toHaveProperty('who')
    expect(mintNote({ id: 'n1', at: T, text: 'x', who: 'Dana', whoId: 'u1' })).toMatchObject({
      who: 'Dana',
      whoId: 'u1',
    })
  })

  /* TWO NOTES INSIDE ONE MILLISECOND is the only way the id from an
     instant collides, and it is reachable: undo, retype, send. */
  it('mints an id nothing else in the bag holds', () => {
    const first = mintNoteId({}, T)
    const bag: NoteBag = { q1: [note(first, T)] }
    const second = mintNoteId(bag, T)
    expect(second).not.toBe(first)
    expect(mintNoteId({ ...bag, q2: [note(second, T)] }, T)).not.toBe(second)
  })
})

/* ---------------------------------------------------------- */

describe('reading a thread', () => {
  /* NEWEST LAST, LIKE A CONVERSATION — and sorted rather than
     trusted. Writes append in order, but an undone add and an
     imported bag can both leave an array whose order is not its
     time order, and a thread that jumps is a thread nobody
     believes. */
  it('reads oldest first however the bag stored it', () => {
    const bag: NoteBag = {
      q1: [note('c', T + 2000), note('a', T), note('b', T + 1000)],
    }
    expect(notesFor(bag, 'q1').map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('breaks a tie on the id, so one millisecond never reorders itself', () => {
    const bag: NoteBag = { q1: [note('n2', T), note('n1', T)] }
    expect(notesFor(bag, 'q1').map((n) => n.id)).toEqual(['n1', 'n2'])
  })

  it('gives a deal nobody has talked about an empty thread, not undefined', () => {
    expect(notesFor({}, 'q9')).toEqual([])
    expect(countOf({}, 'q9')).toBe(0)
  })

  it('never sorts the bag’s own array in place', () => {
    const thread = [note('c', T + 2000), note('a', T)]
    const bag: NoteBag = { q1: thread }
    notesFor(bag, 'q1')
    expect(thread.map((n) => n.id)).toEqual(['c', 'a'])
  })
})

/* ---------------------------------------------------------- */

describe('adding and undoing', () => {
  it('appends without touching the bag it was handed', () => {
    const before: NoteBag = { q1: [note('a', T)] }
    const after = withNote(before, 'q1', note('b', T + 1))
    expect(countOf(after, 'q1')).toBe(2)
    expect(countOf(before, 'q1')).toBe(1)
  })

  it('starts a thread on a deal that had none', () => {
    expect(countOf(withNote({}, 'q1', note('a', T)), 'q1')).toBe(1)
  })

  /* UNDO REMOVES THE NOTE IT WAS RAISED ABOUT, BY ID. "Remove the
     last one" is honest for about a second — add a second note, or
     let a colleague add one, and the button takes the wrong words
     away. */
  it('removes exactly the note named, not the last one', () => {
    const bag: NoteBag = { q1: [note('a', T), note('b', T + 1), note('c', T + 2)] }
    expect(notesFor(withoutNote(bag, 'q1', 'b'), 'q1').map((n) => n.id)).toEqual(['a', 'c'])
  })

  /* THE STORE HOLDS CONVERSATIONS, NOT KEYS. A deal talked about
     once and undone once should cost nothing at all. */
  it('drops the deal’s entry with its last note', () => {
    const bag: NoteBag = { q1: [note('a', T)], q2: [note('b', T)] }
    const after = withoutNote(bag, 'q1', 'a')
    expect(Object.keys(after)).toEqual(['q2'])
  })

  it('is a no-op for a note that is not there', () => {
    const bag: NoteBag = { q1: [note('a', T)] }
    expect(withoutNote(bag, 'q1', 'gone')).toBe(bag)
    expect(withoutNote(bag, 'q9', 'a')).toBe(bag)
  })
})

/* ---------------------------------------------------------- */

describe('what a stored bag has to survive', () => {
  /* PER-THREAD, NOT ALL-OR-NOTHING, and that is the opposite of
     what `stageStore.parse` does with a stored stage list. A board
     drawn from three good columns and two dropped ones is worse
     than the default board; nine good notes and one corrupt one
     should cost the tenth note, not the nine. */
  it('keeps the readable notes and skips the rest', () => {
    const bag = parseBag({
      q1: [
        { id: 'a', at: T, text: 'kept' },
        { id: 'b', at: T + 1 },
        { id: '', at: T, text: 'no id' },
        { at: T, text: 'no id at all' },
        { id: 'c', at: 'yesterday', text: 'not a number' },
        { id: 'd', at: T + 2, text: 'kept too', who: 'Dana', whoId: 'u1' },
      ],
    })
    expect(bag['q1'].map((n) => n.id)).toEqual(['a', 'd'])
    expect(bag['q1'][1]).toMatchObject({ who: 'Dana', whoId: 'u1' })
  })

  it('does not leave an empty thread behind when nothing in it was readable', () => {
    expect(parseBag({ q1: [{ id: 'a' }], q2: 'not an array' })).toEqual({})
  })

  it('takes anything that is not a bag as no notes at all', () => {
    expect(parseBag(null)).toEqual({})
    expect(parseBag('[]')).toEqual({})
    expect(parseBag([1, 2, 3])).toEqual({})
  })

  it('drops an author that is not a name rather than storing a number', () => {
    const bag = parseBag({ q1: [{ id: 'a', at: T, text: 'x', who: 7 }] })
    expect(bag['q1'][0]).not.toHaveProperty('who')
  })
})

/* ---------------------------------------------------------- */

/** The smallest `localStorage` this store actually uses, plus a
 *  switch that makes writing fail the way a full quota does. */
function fakeStorage(): { fail: boolean } {
  const map = new Map<string, string>()
  const state = { fail: false }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string): string | null => map.get(k) ?? null,
      setItem: (k: string, v: string): void => {
        if (state.fail) throw new Error('QuotaExceededError')
        map.set(k, v)
      },
      removeItem: (k: string): void => {
        map.delete(k)
      },
    },
  })
  return state
}

describe('the store, and the one failure it may not swallow', () => {
  let storage: { fail: boolean }

  beforeEach(() => {
    storage = fakeStorage()
    forgetDealNotes()
  })

  it('writes a note and reads it back', () => {
    const n = composeNote('acme', 'rang him Tuesday', T)
    expect(saveNote('acme', 'q1', n)).toBe(true)
    forgetDealNotes()
    expect(notesFor(notesOf('acme'), 'q1').map((x) => x.text)).toEqual(['rang him Tuesday'])
  })

  it('keeps two organisations apart', () => {
    saveNote('acme', 'q1', composeNote('acme', 'ours', T))
    expect(countOf(notesOf('other'), 'q1')).toBe(0)
  })

  /* THE DIFFERENCE FROM `stages.ts`, TESTED. A lost stage override
     is a card back where the document says it goes and the board
     still works, so that store catches and carries on. A lost note
     is a person's words gone with no trace, so this one reports it
     — and the note still stands for the session, because dropping
     it on the floor to prove a point would be worse. */
  it('says when the browser refused to keep a note, and keeps it anyway', () => {
    storage.fail = true
    const n = composeNote('acme', 'this will not survive a refresh', T)
    expect(saveNote('acme', 'q1', n)).toBe(false)
    expect(countOf(notesOf('acme'), 'q1')).toBe(1)
  })

  it('undoes an add by id, through the store', () => {
    const a = composeNote('acme', 'first', T)
    saveNote('acme', 'q1', a)
    const b = composeNote('acme', 'second', T + 1000)
    saveNote('acme', 'q1', b)
    dropNote('acme', 'q1', a.id)
    expect(notesFor(notesOf('acme'), 'q1').map((n) => n.text)).toEqual(['second'])
  })

  /* A BROWSER THAT REFUSES STORAGE ENTIRELY still gets a working
     board — with no thread on any card, which is the truth about
     what it can read. */
  it('reads no notes rather than throwing when there is no storage', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: undefined,
    })
    forgetDealNotes()
    expect(notesOf('acme')).toEqual({})
  })

  it('reads no notes rather than throwing on a corrupt stored value', () => {
    globalThis.localStorage.setItem('hl.pipeline.notes.v1:acme', '{not json')
    forgetDealNotes()
    expect(notesOf('acme')).toEqual({})
  })
})
