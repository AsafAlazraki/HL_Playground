/* ============================================================
   THE ARRANGEMENT, EXERCISED.

   Every case here is one of the failures the header of
   arrangement.ts claims to have been designed against, so the
   claims and the checks are the same list:

     · the default is what a new person gets, and it is stable
     · two people in one browser do not share a dashboard, and
       neither do two organisations
     · a move, an add, a remove and a rename each do exactly one
       thing and mark the arrangement as touched
     · a move that is out of range does not delete anything
     · a corrupted, truncated, foreign or half-understood record
       ends in the default rather than in a half-drawn page
     · storage that throws on read, on write, or on ACCESS is a
       working dashboard

   `environment: 'node'` (vitest.config.ts), so there is no
   localStorage here until one is installed — which is exactly
   how the "no storage at all" case gets tested for free.
   ============================================================ */

import { afterEach, describe, expect, it } from 'vitest'
import {
  CARD_IDS,
  DEFAULT_CARDS,
  LINK_LIMIT,
  cardsNotPlaced,
  defaultArrangement,
  forgetArrangements,
  hasLinkTo,
  isCardId,
  keyFor,
  moveItem,
  parseArrangement,
  readArrangement,
  sameTarget,
  withCardAdded,
  withCardRemoved,
  withCardsMoved,
  withLinkAdded,
  withLinkRemoved,
  withLinkRenamed,
  withLinksMoved,
  writeArrangement,
  type Arrangement,
} from './arrangement'

/* ---------------------------------------------------------- */
/* A storage that behaves, and three that do not              */
/* ---------------------------------------------------------- */

interface Fake {
  install: () => void
  map: Map<string, string>
}

function goodStorage(): Fake {
  const map = new Map<string, string>()
  const impl = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
  }
  return {
    map,
    install: () => {
      Object.defineProperty(globalThis, 'localStorage', {
        value: impl,
        configurable: true,
        writable: true,
      })
    },
  }
}

function throwingStorage(): void {
  Object.defineProperty(globalThis, 'localStorage', {
    get() {
      throw new Error('this browser blocks site data')
    },
    configurable: true,
  })
}

function fullStorage(): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
    },
    configurable: true,
    writable: true,
  })
}

const clearStorage = (): void => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: undefined,
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  forgetArrangements()
  clearStorage()
})

const ASAF = { userId: 'u-asafa1', orgSlug: 'northside-marine' }
const OTHER = { userId: 'u-someone', orgSlug: 'northside-marine' }
const OTHER_ORG = { userId: 'u-asafa1', orgSlug: 'seaside-boats' }

/* ---------------------------------------------------------- */

describe('the arrangement a new person gets', () => {
  it('is the default, and the default is drawable', () => {
    const a = defaultArrangement()
    expect(a.cards).toEqual([...DEFAULT_CARDS])
    expect(a.touched).toBe(false)
    expect(a.links.length).toBeGreaterThan(0)
    /* every card in the default is a card this build can draw */
    for (const id of a.cards) expect(isCardId(id)).toBe(true)
  })

  it('hands back a fresh copy every time, so one person editing theirs cannot move another', () => {
    const a = defaultArrangement()
    const b = defaultArrangement()
    a.cards.push('data-quality')
    a.links[0].name = 'mine'
    expect(b.cards).toEqual([...DEFAULT_CARDS])
    expect(b.links[0].name).toBeUndefined()
  })

  it('gives the same link the same id every time, so nothing re-keys between paints', () => {
    expect(defaultArrangement().links.map((l) => l.id)).toEqual(
      defaultArrangement().links.map((l) => l.id),
    )
  })
})

describe('whose dashboard this is', () => {
  it('files one key per person and per organisation', () => {
    expect(keyFor(ASAF)).not.toBe(keyFor(OTHER))
    expect(keyFor(ASAF)).not.toBe(keyFor(OTHER_ORG))
    expect(keyFor(ASAF)).toContain('northside-marine')
    expect(keyFor(ASAF)).toContain('u-asafa1')
  })

  it('does not hand one person another person’s dashboard', () => {
    goodStorage().install()
    writeArrangement(ASAF, { cards: ['data-quality'], links: [], touched: true })
    expect(readArrangement(ASAF).cards).toEqual(['data-quality'])
    expect(readArrangement(OTHER).cards).toEqual([...DEFAULT_CARDS])
    expect(readArrangement(OTHER_ORG).cards).toEqual([...DEFAULT_CARDS])
  })

  it('survives a round trip whole', () => {
    goodStorage().install()
    const made: Arrangement = {
      cards: ['rules-warning', 'my-quotes'],
      links: [
        { id: 'a', target: { kind: 'new-quote' } },
        { id: 'b', target: { kind: 'table', entityId: 'e-highfield' }, name: 'Monday' },
      ],
      touched: true,
    }
    writeArrangement(ASAF, made)
    expect(readArrangement(ASAF)).toEqual(made)
  })
})

describe('moving one thing', () => {
  it('moves it and shifts nothing else out of order', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c'])
  })

  it('A DRAG THAT ENDED OUTSIDE THE GRID DELETES NOTHING', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 9)).toEqual(['a', 'b', 'c'])
    expect(moveItem(['a', 'b', 'c'], -1, 1)).toEqual(['a', 'b', 'c'])
    expect(moveItem(['a', 'b', 'c'], 1, -4)).toEqual(['a', 'b', 'c'])
    expect(moveItem([], 0, 0)).toEqual([])
  })

  it('never loses or doubles a member, whichever way it is moved', () => {
    const list = [...CARD_IDS]
    for (let from = 0; from < list.length; from += 1) {
      for (let to = 0; to < list.length; to += 1) {
        const out = moveItem(list, from, to)
        expect(out.length).toBe(list.length)
        expect([...out].sort()).toEqual([...list].sort())
      }
    }
  })

  it('marks the arrangement as touched', () => {
    const a = defaultArrangement()
    const b = withCardsMoved(a, 0, 2)
    expect(b.touched).toBe(true)
    expect(b.cards[2]).toBe(a.cards[0])
    /* and leaves the one it was given alone */
    expect(a.touched).toBe(false)
  })
})

describe('adding and taking off a card', () => {
  it('adds at the end so nothing already arranged moves', () => {
    const a = defaultArrangement()
    const b = withCardAdded(a, 'rules-warning')
    expect(b.cards.slice(0, a.cards.length)).toEqual(a.cards)
    expect(b.cards[b.cards.length - 1]).toBe('rules-warning')
  })

  it('adding one that is already on is a no-op, not a double', () => {
    const a = withCardAdded(defaultArrangement(), 'my-quotes')
    expect(a.cards.filter((c) => c === 'my-quotes')).toHaveLength(1)
  })

  it('removes one and leaves the rest in order', () => {
    const a = defaultArrangement()
    const b = withCardRemoved(a, a.cards[1])
    expect(b.cards).toEqual(a.cards.filter((c) => c !== a.cards[1]))
    expect(b.touched).toBe(true)
  })

  it('an empty dashboard is a legitimate arrangement and is kept', () => {
    let a = defaultArrangement()
    for (const id of [...a.cards]) a = withCardRemoved(a, id)
    expect(a.cards).toEqual([])
    expect(a.touched).toBe(true)
  })

  it('the tray offers exactly what is not on the page, in the catalogue’s order', () => {
    const a = defaultArrangement()
    const spare = cardsNotPlaced(a)
    expect(spare).toEqual(CARD_IDS.filter((c) => !a.cards.includes(c)))
    for (const id of spare) expect(a.cards).not.toContain(id)
    expect([...spare, ...a.cards].sort()).toEqual([...CARD_IDS].sort())
  })
})

describe('the fast actions', () => {
  it('refuses a second button to the same place', () => {
    const a = withLinkAdded(defaultArrangement(), { kind: 'find' })
    expect(a.links.filter((l) => l.target.kind === 'find')).toHaveLength(1)
    expect(hasLinkTo(a, { kind: 'find' })).toBe(true)
  })

  it('tells two tables apart, and two modules apart', () => {
    expect(sameTarget({ kind: 'table', entityId: 'a' }, { kind: 'table', entityId: 'a' })).toBe(true)
    expect(sameTarget({ kind: 'table', entityId: 'a' }, { kind: 'table', entityId: 'b' })).toBe(false)
    expect(sameTarget({ kind: 'module', entityId: 'a' } as never, { kind: 'table', entityId: 'a' })).toBe(false)
    expect(sameTarget({ kind: 'quotes' }, { kind: 'quotes' })).toBe(true)
  })

  it('stops at the cap rather than growing a second row of buttons', () => {
    let a: Arrangement = { cards: [], links: [], touched: true }
    for (let i = 0; i < LINK_LIMIT + 4; i += 1) {
      a = withLinkAdded(a, { kind: 'table', entityId: `e-${i}` })
    }
    expect(a.links).toHaveLength(LINK_LIMIT)
  })

  it('renames, and an empty name gives the subject’s own name back', () => {
    let a = withLinkAdded(defaultArrangement(), { kind: 'table', entityId: 'e-1' })
    const id = a.links[a.links.length - 1].id
    a = withLinkRenamed(a, id, '  Monday’s list  ')
    expect(a.links[a.links.length - 1].name).toBe('Monday’s list')
    a = withLinkRenamed(a, id, '   ')
    expect(a.links[a.links.length - 1].name).toBeUndefined()
  })

  it('A RENAME TO WHAT IT ALREADY SAYS RETURNS THE SAME OBJECT', () => {
    /* the identity is what matters: no new object means no write,
       no toast and no UNDO offered for a field somebody merely
       tabbed through */
    const a = defaultArrangement()
    expect(withLinkRenamed(a, a.links[0].id, '')).toBe(a)

    const named = withLinkRenamed(a, a.links[0].id, 'Sell something')
    expect(withLinkRenamed(named, a.links[0].id, '  Sell something ')).toBe(named)
  })

  it('a rename of a link that is not there changes nothing', () => {
    const a = defaultArrangement()
    expect(withLinkRenamed(a, 'no-such-link', 'x')).toBe(a)
    expect(withLinkRemoved(a, 'no-such-link')).toBe(a)
  })

  it('removes one by id and leaves the others', () => {
    const a = defaultArrangement()
    const b = withLinkRemoved(a, a.links[1].id)
    expect(b.links.map((l) => l.id)).toEqual(
      a.links.filter((_, i) => i !== 1).map((l) => l.id),
    )
  })

  it('moves one without disturbing the rest', () => {
    const a = defaultArrangement()
    const b = withLinksMoved(a, 2, 0)
    expect(b.links[0].id).toBe(a.links[2].id)
    expect(b.links.map((l) => l.id).sort()).toEqual(a.links.map((l) => l.id).sort())
  })
})

describe('a record that is not what we wrote', () => {
  it('nothing stored is the default', () => {
    expect(parseArrangement(null)).toEqual(defaultArrangement())
    expect(parseArrangement('')).toEqual(defaultArrangement())
  })

  it('truncated JSON is the default, not a crash', () => {
    expect(parseArrangement('{"cards":["my-quo')).toEqual(defaultArrangement())
  })

  it('another script’s shape under a colliding key is the default', () => {
    expect(parseArrangement('[1,2,3]')).toEqual(defaultArrangement())
    expect(parseArrangement('"hello"')).toEqual(defaultArrangement())
    expect(parseArrangement('null')).toEqual(defaultArrangement())
  })

  it('DROPS A CARD IT DOES NOT KNOW AND KEEPS THE ORDER OF THE REST', () => {
    const got = parseArrangement(
      JSON.stringify({
        cards: ['my-quotes', 'from-a-later-build', 'the-price-file'],
        links: [],
        touched: true,
      }),
    )
    expect(got.cards).toEqual(['my-quotes', 'the-price-file'])
  })

  it('drops a card written twice', () => {
    const got = parseArrangement(
      JSON.stringify({ cards: ['my-quotes', 'my-quotes'], links: [], touched: true }),
    )
    expect(got.cards).toEqual(['my-quotes'])
  })

  it('drops a link with no subject, and a link kind it does not know', () => {
    const got = parseArrangement(
      JSON.stringify({
        cards: [],
        touched: true,
        links: [
          { id: '1', target: { kind: 'table' } },
          { id: '2', target: { kind: 'table', entityId: '' } },
          { id: '3', target: { kind: 'teleport' } },
          { id: '4', target: { kind: 'module', moduleId: 'm-1' } },
          { id: '5', target: null },
          { id: '6' },
        ],
      }),
    )
    expect(got.links).toHaveLength(1)
    expect(got.links[0].target).toEqual({ kind: 'module', moduleId: 'm-1' })
  })

  it('mints an id for a link that lost its own rather than dropping the button', () => {
    const got = parseArrangement(
      JSON.stringify({ cards: [], touched: true, links: [{ target: { kind: 'find' } }] }),
    )
    expect(got.links).toHaveLength(1)
    expect(got.links[0].id).not.toBe('')
  })

  it('a record nobody ever touched is a stale default, so the CURRENT default wins', () => {
    const got = parseArrangement(
      JSON.stringify({ cards: ['rules-warning'], links: [], touched: false }),
    )
    expect(got).toEqual(defaultArrangement())
  })

  it('honours the cap even when the stored record exceeds it', () => {
    const links = Array.from({ length: 30 }, (_, i) => ({
      id: `l-${i}`,
      target: { kind: 'table', entityId: `e-${i}` },
    }))
    const got = parseArrangement(JSON.stringify({ cards: [], links, touched: true }))
    expect(got.links).toHaveLength(LINK_LIMIT)
  })
})

describe('storage that does not work', () => {
  it('no storage at all is a working dashboard', () => {
    clearStorage()
    expect(readArrangement(ASAF)).toEqual(defaultArrangement())
    expect(() => writeArrangement(ASAF, defaultArrangement())).not.toThrow()
  })

  it('a browser that throws on ACCESS is a working dashboard', () => {
    throwingStorage()
    expect(readArrangement(ASAF)).toEqual(defaultArrangement())
    expect(() => writeArrangement(ASAF, defaultArrangement())).not.toThrow()
  })

  it('a full quota loses the preference and never the page', () => {
    fullStorage()
    expect(() =>
      writeArrangement(ASAF, { cards: ['my-quotes'], links: [], touched: true }),
    ).not.toThrow()
    expect(readArrangement(ASAF)).toEqual(defaultArrangement())
  })
})
