/* ============================================================
   WHOSE DEAL IT IS — the arithmetic of a handover.

   Everything that decides anything in `owners.ts` is pure and
   takes its inputs as arguments, so most of this needs no browser,
   no store, no session and no clock. The store's own half gets the
   same fake `localStorage` `dealNotes.test.ts` uses, for the same
   reason: a refused write is reported rather than swallowed, and a
   difference nobody tests is a difference that quietly reverts.

   WHAT IS PINNED HERE IS THE PART A REGRESSION WOULD BE SILENT
   ABOUT:

     · that the CURRENT OWNER is the last entry of the trail, so
       the record and its summary cannot disagree — the whole
       reason there is no second field holding it;

     · that a role id NEVER reaches a screen. `roleWord` turns an
       id into the dealership's word for the job or into a phrase
       about a job that has gone, and it has no third branch that
       prints the id itself;

     · that a deal standing on a DELETED role reads as nobody's
       rather than as a name this app invented — the answer to the
       question the blocker in `stageTrigger.ts` ended on;

     · that UNDO removes the handover it was raised about rather
       than the last one, and that an undone handover leaves no
       line on the trail at all.
   ============================================================ */

import { beforeEach, describe, expect, it } from 'vitest'
import type { RoleDef } from '@/types/model'
import {
  NOBODY,
  composeHandover,
  dropHandover,
  forgetDealOwners,
  handoverSay,
  handoverToast,
  handoversFor,
  mintHandover,
  mintHandoverId,
  ownerInForce,
  ownerOf,
  ownersOf,
  parseOwners,
  roleWord,
  saveHandover,
  whyNotOwner,
  withHandover,
  withoutHandover,
  type Handover,
  type OwnerBag,
} from './owners'

const T = Date.parse('2026-09-01T09:00:00.000Z')

const role = (id: string, name: string, description?: string): RoleDef => ({
  id,
  name,
  ...(description ? { description } : {}),
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
})

const SALES = role('r-sales', 'Salesperson')
const YARD = role('r-yard', 'Yard manager')
const ROLES = [SALES, YARD]

const hand = (
  id: string,
  at: number,
  from: string | null,
  to: string | null,
  who?: string,
): Handover => mintHandover({ id, at, from, to, ...(who ? { who } : {}) })

/* ---------------------------------------------------------- */

describe('reading a trail', () => {
  it('reads oldest first however it was stored', () => {
    const bag: OwnerBag = {
      q1: [
        hand('h3', T + 2000, SALES.id, YARD.id),
        hand('h1', T, null, SALES.id),
      ],
    }
    expect(handoversFor(bag, 'q1').map((h) => h.id)).toEqual(['h1', 'h3'])
  })

  /* A STABLE TIE-BREAK, so two handovers minted inside one
     millisecond do not swap places between two renders — and the
     LAST entry is the current owner, so a swap here would not
     merely read oddly, it would answer the wrong owner. */
  it('breaks a tie on the id rather than leaving it to the sort', () => {
    const bag: OwnerBag = {
      q1: [hand('hb', T, null, YARD.id), hand('ha', T, null, SALES.id)],
    }
    expect(handoversFor(bag, 'q1').map((h) => h.id)).toEqual(['ha', 'hb'])
  })

  it('says nobody owns a deal nobody has handed on', () => {
    expect(ownerOf({}, 'q1')).toBeNull()
    expect(handoversFor({}, 'q1')).toEqual([])
  })

  /* THE CURRENT OWNER IS THE LAST ENTRY'S `to`, AND NOTHING ELSE.
     There is deliberately no second field holding it — see the
     file header — so this is the assertion that keeps the record
     and its summary from disagreeing. */
  it('takes the current owner from the last handover', () => {
    const bag: OwnerBag = {
      q1: [hand('h1', T, null, SALES.id), hand('h2', T + 1000, SALES.id, YARD.id)],
    }
    expect(ownerOf(bag, 'q1')).toBe(YARD.id)
  })

  /* TAKING A DEAL BACK OFF SOMEBODY IS A DECISION, not an absence.
     A trail ending in a null `to` must read as nobody's — if it
     fell back to the entry before it, "unassign" would be a
     control that silently did nothing. */
  it('reads a deal taken back off somebody as nobody’s', () => {
    const bag: OwnerBag = {
      q1: [hand('h1', T, null, YARD.id), hand('h2', T + 1000, YARD.id, null)],
    }
    expect(ownerOf(bag, 'q1')).toBeNull()
  })
})

describe('an owner is a job, and the job has to still exist', () => {
  const bag: OwnerBag = { q1: [hand('h1', T, null, YARD.id)] }

  it('resolves the id against the roles that actually exist', () => {
    expect(ownerInForce(bag, 'q1', ROLES)?.name).toBe('Yard manager')
  })

  /* THE ANSWER TO THE QUESTION THE BLOCKER ENDED ON — "what
     happens to a deal owned by somebody who has left". The role is
     deleted; the deal reads as nobody's rather than as a name this
     app invented. `auth/role.ts`'s rule 2, applied to a deal. */
  it('answers nobody when the role it was given to has been deleted', () => {
    expect(ownerInForce(bag, 'q1', [SALES])).toBeNull()
    expect(ownerInForce(bag, 'q1', [])).toBeNull()
  })

  /* A ROLE ID MUST NEVER REACH A SCREEN. There is no branch of
     `roleWord` that prints the id, so a deleted role degrades into
     a phrase about the deletion and never into `r-yard`. */
  it('never prints a raw id, whatever it is handed', () => {
    expect(roleWord(YARD.id, ROLES)).toBe('Yard manager')
    expect(roleWord(YARD.id, [])).toBe('a job since removed')
    expect(roleWord(YARD.id, [])).not.toContain(YARD.id)
    expect(roleWord(null, ROLES)).toBe('nobody')
    expect(roleWord(NOBODY, ROLES)).toBe('nobody')
  })
})

describe('the refusal, where there is nobody to give it to', () => {
  /* RULE 10: a thing that cannot be done says why, WHERE it is
     refused — and it names the door, because a person told "there
     are no jobs" still has to find out where jobs are written. */
  it('names the door when the business has written down no jobs', () => {
    const why = whyNotOwner([])
    expect(why).toContain('Access & roles')
  })

  it('refuses nothing once one job exists', () => {
    expect(whyNotOwner([SALES])).toBeNull()
  })
})

describe('what a handover says', () => {
  /* THREE ACTS, THREE SENTENCES. "Moved from nobody to Yard
     manager" is what one sentence with two holes in it produces. */
  it('says given, moved and taken off, and not one shape for all three', () => {
    expect(handoverSay(hand('h', T, null, YARD.id), ROLES)).toBe('given to Yard manager')
    expect(handoverSay(hand('h', T, SALES.id, YARD.id), ROLES)).toBe(
      'moved from Salesperson to Yard manager',
    )
    expect(handoverSay(hand('h', T, YARD.id, null), ROLES)).toBe('taken off Yard manager')
  })

  /* THE TOAST NAMES THE DEAL AND THE CUSTOMER, for the reason
     `dealDesk.addNote` does: the activity log listens to this same
     bus, and a reference alone tells a manager nothing they can
     act on. */
  it('names the deal and the customer', () => {
    expect(handoverToast(hand('h', T, null, YARD.id), ROLES, 'Q-1042', 'Marcus Ellis')).toBe(
      'Q-1042 — Marcus Ellis given to Yard manager.',
    )
  })

  it('falls back to the reference alone when there is no customer yet', () => {
    expect(handoverToast(hand('h', T, null, YARD.id), ROLES, 'Q-1042', '   ')).toBe(
      'Q-1042 given to Yard manager.',
    )
  })
})

describe('adding and undoing', () => {
  it('never mutates the bag it is handed', () => {
    const bag: OwnerBag = { q1: [hand('h1', T, null, SALES.id)] }
    const before = JSON.stringify(bag)
    withHandover(bag, 'q1', hand('h2', T + 1, SALES.id, YARD.id))
    withoutHandover(bag, 'q1', 'h1')
    expect(JSON.stringify(bag)).toBe(before)
  })

  /* UNDO REMOVES THE HANDOVER IT WAS RAISED ABOUT, by id — never
     "the last one". Two reassignments inside four seconds is a
     normal afternoon and an Undo that popped the wrong one would
     hand the deal to a third job nobody chose. */
  it('undoes by id and not by position', () => {
    let bag: OwnerBag = {}
    bag = withHandover(bag, 'q1', hand('h1', T, null, SALES.id))
    bag = withHandover(bag, 'q1', hand('h2', T + 1000, SALES.id, YARD.id))
    bag = withoutHandover(bag, 'q1', 'h1')
    expect(handoversFor(bag, 'q1').map((h) => h.id)).toEqual(['h2'])
  })

  /* AN UNDONE FIRST HANDOVER LEAVES NO TRAIL AT ALL. The deal's
     entry goes with its last handover, so the store holds deals
     somebody has actually handed on rather than a key per deal. */
  it('drops the deal’s entry with its last handover', () => {
    const bag = withHandover({}, 'q1', hand('h1', T, null, SALES.id))
    expect(withoutHandover(bag, 'q1', 'h1')).toEqual({})
  })

  it('leaves the bag alone when the id is not in it', () => {
    const bag = withHandover({}, 'q1', hand('h1', T, null, SALES.id))
    expect(withoutHandover(bag, 'q1', 'nope')).toBe(bag)
    expect(withoutHandover(bag, 'q9', 'h1')).toBe(bag)
  })

  it('mints an id from the instant, and again when two collide', () => {
    expect(mintHandoverId({}, T)).toBe(`h${T.toString(36)}`)
    const bag = withHandover({}, 'q1', hand(`h${T.toString(36)}`, T, null, SALES.id))
    expect(mintHandoverId(bag, T)).toBe(`h${T.toString(36)}-2`)
  })

  /* THE PICKER'S "NOBODY" ROW IS AN EMPTY STRING and the store's
     is null. They are made one fact at this boundary, once, so no
     reader downstream has to remember two shapes. */
  it('reads the picker’s empty string as nobody', () => {
    expect(mintHandover({ id: 'h', at: T, from: NOBODY, to: NOBODY })).toEqual({
      id: 'h',
      at: T,
      from: null,
      to: null,
    })
  })
})

describe('what a stored bag has to survive', () => {
  it('reads a good bag back whole', () => {
    const bag = withHandover({}, 'q1', hand('h1', T, null, SALES.id, 'Asaf Alazraki'))
    expect(parseOwners(JSON.parse(JSON.stringify(bag)))).toEqual(bag)
  })

  /* PER-TRAIL, NOT ALL-OR-NOTHING — the reading `dealNotes` argues
     for. Nine good handovers and one corrupt row cost the tenth,
     not the nine. */
  it('drops one unreadable row and keeps the rest', () => {
    const got = parseOwners({
      q1: [
        { id: 'h1', at: T, from: null, to: 'r-sales' },
        { id: '', at: T + 1, from: null, to: 'r-yard' },
        { at: T + 2, from: null, to: 'r-yard' },
        { id: 'h4', at: 'yesterday', from: null, to: 'r-yard' },
        { id: 'h5', at: T + 5, from: 'r-sales', to: 'r-yard' },
      ],
    })
    expect(got['q1']?.map((h) => h.id)).toEqual(['h1', 'h5'])
  })

  /* A ROW WITH NEITHER END DID NOTHING. No control here can
     produce one, and keeping it would put a line on a trail
     reporting no event. */
  it('drops a handover with neither end', () => {
    expect(parseOwners({ q1: [{ id: 'h1', at: T, from: null, to: null }] })).toEqual({})
  })

  it('gives up on anything that is not a bag', () => {
    for (const junk of [null, undefined, 42, 'q1', ['q1']]) {
      expect(parseOwners(junk)).toEqual({})
    }
    expect(parseOwners({ q1: 'not a trail' })).toEqual({})
  })
})

/* ---------------------------------------------------------- */

/** The smallest `localStorage` this store actually uses, plus a
 *  switch that makes writing fail the way a full quota does — the
 *  same stub `dealNotes.test.ts` keeps, because a second one for
 *  one job is a second thing to learn. */
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
    forgetDealOwners()
  })

  it('writes a handover and reads it back', () => {
    const h = composeHandover('acme', 'q1', YARD.id, T)
    expect(saveHandover('acme', 'q1', h)).toBe(true)
    forgetDealOwners()
    expect(ownerOf(ownersOf('acme'), 'q1')).toBe(YARD.id)
  })

  /* `from` COMES OFF THE STORE, not off the caller, so two
     surfaces open on one deal cannot disagree about where it was
     standing a moment ago. */
  it('reads where the deal was standing rather than being told', () => {
    saveHandover('acme', 'q1', composeHandover('acme', 'q1', SALES.id, T))
    const next = composeHandover('acme', 'q1', YARD.id, T + 1000)
    expect(next.from).toBe(SALES.id)
    expect(next.to).toBe(YARD.id)
  })

  it('keeps two organisations apart', () => {
    saveHandover('acme', 'q1', composeHandover('acme', 'q1', YARD.id, T))
    expect(ownerOf(ownersOf('other'), 'q1')).toBeNull()
  })

  /* AN UNSIGNED SESSION LEAVES THE ACTOR OFF rather than writing a
     placeholder — "System" is a claim about a person and an absent
     key is not. Same rule `composeNote` keeps. */
  it('records no actor when nobody is signed in', () => {
    const h = composeHandover('acme', 'q1', YARD.id, T)
    expect(h.who).toBeUndefined()
    expect(h.whoId).toBeUndefined()
  })

  it('records the signed-in person as the one who handed it on', () => {
    globalThis.localStorage.setItem(
      'hl.session.user',
      JSON.stringify({ email: 'asafa1@northsidemarine.com.au' }),
    )
    const h = composeHandover('acme', 'q1', YARD.id, T)
    expect(h.who).toBe('Asaf Alazraki')
  })

  /* THE DIFFERENCE FROM `stages.ts`, TESTED. A lost stage override
     is a card back where the document says it goes. A lost
     reassignment is a deal that will be on somebody else's desk
     after a refresh, so this store reports it — and the handover
     still stands for the session. */
  it('says when the browser refused to keep a handover, and keeps it anyway', () => {
    storage.fail = true
    const h = composeHandover('acme', 'q1', YARD.id, T)
    expect(saveHandover('acme', 'q1', h)).toBe(false)
    expect(ownerOf(ownersOf('acme'), 'q1')).toBe(YARD.id)
  })

  it('undoes an assignment by id, through the store', () => {
    const a = composeHandover('acme', 'q1', SALES.id, T)
    saveHandover('acme', 'q1', a)
    const b = composeHandover('acme', 'q1', YARD.id, T + 1000)
    saveHandover('acme', 'q1', b)
    dropHandover('acme', 'q1', b.id)
    expect(ownerOf(ownersOf('acme'), 'q1')).toBe(SALES.id)
  })

  it('reads no owners rather than throwing when there is no storage', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: undefined,
    })
    forgetDealOwners()
    expect(ownersOf('acme')).toEqual({})
  })

  it('reads no owners rather than throwing on a corrupt stored value', () => {
    globalThis.localStorage.setItem('hl.pipeline.owner.v1:acme', '{not json')
    forgetDealOwners()
    expect(ownersOf('acme')).toEqual({})
  })
})
