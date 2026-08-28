/* ============================================================
   WHAT IS LINKED TO A DEAL — the arithmetic, and the door.

   `tidyUrl` gets the most tests here and it earns them: it is the
   one function in this feature whose output is handed to a
   browser. A scheme check that lets `javascript:` through is not a
   formatting bug, and a check so tight that a pasted
   `northsidemarine.com.au` is refused is a feature nobody uses.

   Everything under test is pure and takes its inputs as arguments,
   so none of it needs a browser, a store or a clock.
   ============================================================ */

import { describe, expect, it } from 'vitest'
import {
  LINK_REFUSAL,
  linksFor,
  mintLink,
  mintLinkId,
  parseLinks,
  tidyUrl,
  whyNotLink,
  withLink,
  withoutLink,
  type DealLink,
  type LinkBag,
} from './dealLinks'

const link = (over: Partial<DealLink> & { id: string }): DealLink => ({
  label: 'A link',
  url: 'https://example.com/',
  at: 1_000,
  ...over,
})

describe('an address, tidied or refused', () => {
  it('keeps the four schemes a dealership actually pastes', () => {
    expect(tidyUrl('https://example.com/x')).toBe('https://example.com/x')
    expect(tidyUrl('http://example.com/x')).toBe('http://example.com/x')
    expect(tidyUrl('mailto:dana@example.com')).toBe('mailto:dana@example.com')
    expect(tidyUrl('tel:+61755551234')).toBe('tel:+61755551234')
  })

  /* A BARE DOMAIN IS COMPLETED, NOT REFUSED. It is what somebody
     pastes out of an email, and `https://` is the only thing it
     could have meant. */
  it('puts https on the front of a bare address', () => {
    expect(tidyUrl('northsidemarine.com.au/finance')).toBe(
      'https://northsidemarine.com.au/finance',
    )
  })

  /* THE ONE THIS FUNCTION EXISTS FOR. */
  it('refuses a scheme that runs something', () => {
    expect(tidyUrl('javascript:alert(1)')).toBeNull()
    expect(tidyUrl('JavaScript:alert(1)')).toBeNull()
    expect(tidyUrl('data:text/html,<script>x</script>')).toBeNull()
    expect(tidyUrl('vbscript:msgbox')).toBeNull()
    expect(tidyUrl('file:///etc/passwd')).toBeNull()
  })

  /* A SCHEME AND NOTHING ELSE parses and points nowhere, which is
     a refusal rather than an address. */
  it('refuses a scheme with no host behind it', () => {
    expect(tidyUrl('https://')).toBeNull()
    expect(tidyUrl('http:// ')).toBeNull()
  })

  it('refuses nothing at all', () => {
    expect(tidyUrl('')).toBeNull()
    expect(tidyUrl('    ')).toBeNull()
  })

  it('trims what was pasted rather than storing the whitespace', () => {
    expect(tidyUrl('  https://example.com/x  ')).toBe('https://example.com/x')
  })
})

describe('why a link cannot be added', () => {
  /* THREE REFUSALS AND THEY ARE THREE DIFFERENT FACTS. An empty
     address and a refused scheme are not one problem. */
  it('says the address is missing before it says anything else', () => {
    expect(whyNotLink('', '')).toBe('A link needs an address.')
  })

  it('names what IS allowed when the scheme is refused', () => {
    expect(whyNotLink('Finance', 'javascript:alert(1)')).toBe(LINK_REFUSAL)
  })

  it('asks for a name once the address is good', () => {
    expect(whyNotLink('  ', 'example.com')).toContain('Give it a name')
  })

  it('allows a good pair', () => {
    expect(whyNotLink('Finance approval', 'example.com/x')).toBeNull()
  })
})

describe('building one', () => {
  it('stores the tidied address, never what was typed', () => {
    const l = mintLink({ id: 'l1', at: 5, label: ' Finance ', url: 'example.com' })
    expect(l?.url).toBe('https://example.com/')
    expect(l?.label).toBe('Finance')
  })

  it('returns null rather than storing an address that is not one', () => {
    expect(mintLink({ id: 'l1', at: 5, label: 'x', url: 'javascript:x' })).toBeNull()
  })

  /* AN UNSIGNED SESSION LEAVES `who` OFF ENTIRELY rather than
     writing a placeholder — an absent key is not a claim about a
     person. */
  it('leaves the author off when there is none', () => {
    const l = mintLink({ id: 'l1', at: 5, label: 'x', url: 'example.com' })
    expect(l && 'who' in l).toBe(false)
  })

  it('mints an id nothing else in the bag holds', () => {
    const bag: LinkBag = { q1: [link({ id: `l${(5).toString(36)}` })] }
    expect(mintLinkId(bag, 5)).toBe('l5-2')
  })
})

describe('a deal and its links', () => {
  it('reads oldest first, however the array is ordered', () => {
    const bag: LinkBag = {
      q1: [link({ id: 'b', at: 20 }), link({ id: 'a', at: 10 })],
    }
    expect(linksFor(bag, 'q1').map((l) => l.id)).toEqual(['a', 'b'])
  })

  it('never mutates the bag it is handed', () => {
    const bag: LinkBag = { q1: [link({ id: 'a' })] }
    const next = withLink(bag, 'q1', link({ id: 'b' }))
    expect(bag['q1']).toHaveLength(1)
    expect(next['q1']).toHaveLength(2)
  })

  /* THE DEAL'S ENTRY GOES WITH ITS LAST LINK, so the size of this
     store is the number of deals something is actually attached
     to. */
  it('drops the deal entirely when its last link goes', () => {
    const bag: LinkBag = { q1: [link({ id: 'a' })] }
    expect(withoutLink(bag, 'q1', 'a')).toEqual({})
  })

  it('returns the same bag when the link was not there', () => {
    const bag: LinkBag = { q1: [link({ id: 'a' })] }
    expect(withoutLink(bag, 'q1', 'zz')).toBe(bag)
  })
})

describe('what a stored bag has to survive', () => {
  /* PER LINK RATHER THAN ALL-OR-NOTHING: nine good links and one
     corrupt one should cost the tenth, not the nine. */
  it('keeps the good ones beside a corrupt one', () => {
    const got = parseLinks({
      q1: [
        { id: 'a', label: 'Good', url: 'https://example.com/', at: 1 },
        { id: '', label: 'No id', url: 'https://example.com/', at: 1 },
        { id: 'c', label: '', url: 'https://example.com/', at: 1 },
        { id: 'd', label: 'No time', url: 'https://example.com/' },
      ],
    })
    expect(got['q1']?.map((l) => l.id)).toEqual(['a'])
  })

  /* A STORED ADDRESS IS RE-CHECKED. The scheme check is what makes
     the string safe to hand a browser, so a bag edited by hand
     cannot smuggle one past it. */
  it('drops a stored address that would not pass tidyUrl today', () => {
    const got = parseLinks({
      q1: [{ id: 'a', label: 'Bad', url: 'javascript:alert(1)', at: 1 }],
    })
    expect(got).toEqual({})
  })

  it('normalises a stored bare address on the way in', () => {
    const got = parseLinks({ q1: [{ id: 'a', label: 'x', url: 'example.com', at: 1 }] })
    expect(got['q1']?.[0]?.url).toBe('https://example.com/')
  })

  it('gives up on anything that is not a bag', () => {
    for (const junk of [null, undefined, 7, 'x', ['a']]) {
      expect(parseLinks(junk)).toEqual({})
    }
  })
})
