/* ============================================================
   Where a picture lives, and whether we are allowed to draw it.

   Two things are under test and they have different stakes.

   The SCHEME ALLOW-LIST is a security boundary: `ImageRef.src` goes
   straight into an `<img src>`, which is the one place untrusted
   content enters our DOM. `javascript:`, `data:text/html` and
   `file:` must never come back paintable, and no future kindness to
   `data:` may quietly re-admit them.

   The HOST VERDICT is a cost boundary: it exists to bound the
   uncatchable console lines a dead host can spend. Its state lives in
   module-level maps with no reset hook, so every test below uses its
   own invented hostname (`*.invalid` — the RFC 2606 reserved TLD,
   never resolvable, and unmistakably not a real supplier).
   ============================================================ */
import { describe, expect, it } from 'vitest'

/* The module reads `window.location` when it classifies a source and
   has no other DOM dependency, so this is the whole environment it
   needs. Assigned before the import runs anything, but note the
   module only touches it inside functions. */
;(globalThis as unknown as { window: unknown }).window = {
  location: { href: 'http://localhost:5090/', origin: 'http://localhost:5090' },
}

const {
  sourceKind,
  hostIsClosed,
  noteImageFailed,
  noteImageLoaded,
  imageLabel,
  imageHostOf,
  nameFromUrl,
  heldAsLinkNote,
  measuredClosedHost,
  HELD_AS_LINK,
} = await import('./imageSources')

describe('sourceKind — the scheme allow-list', () => {
  it('never lets a script or a document URL be treated as pixels', () => {
    expect(sourceKind('javascript:alert(1)')).toBe('refused')
    expect(sourceKind('data:text/html,<script>alert(1)</script>')).toBe('refused')
    expect(sourceKind('data:text/html;base64,PHNjcmlwdD4=')).toBe('refused')
    expect(sourceKind('vbscript:msgbox(1)')).toBe('refused')
    expect(sourceKind('file:///C:/Windows/win.ini')).toBe('refused')
  })

  it('refuses an empty source and one that will not parse', () => {
    expect(sourceKind('')).toBe('refused')
    expect(sourceKind('http://')).toBe('refused')
    expect(sourceKind('https://[')).toBe('refused')
  })

  it('accepts only data URLs that are declared images', () => {
    expect(sourceKind('data:image/png;base64,iVBORw0KGgo=')).toBe('own')
    expect(sourceKind('DATA:IMAGE/PNG;base64,iVBORw0KGgo=')).toBe('own')
    expect(sourceKind('blob:http://localhost:5090/00000000-0000-0000-0000-000000000000')).toBe(
      'own',
    )
    expect(sourceKind('data:application/octet-stream;base64,AAAA')).toBe('refused')
  })

  it('separates our own origin from everyone else, so only remotes get a verdict', () => {
    expect(sourceKind('/assets/plate.png')).toBe('same-origin')
    expect(sourceKind('http://localhost:5090/assets/plate.png')).toBe('same-origin')
    expect(sourceKind('https://images.example.invalid/plate.png')).toBe('remote')
    expect(sourceKind('HTTPS://images.example.invalid/plate.png')).toBe('remote')
  })

  it('reports a refused source as unpaintable, whatever the host state says', () => {
    expect(hostIsClosed('javascript:alert(1)')).toBe(true)
    expect(hostIsClosed('data:text/html,x')).toBe(true)
    expect(hostIsClosed('data:image/png;base64,iVBORw0KGgo=')).toBe(false)
    expect(hostIsClosed('/assets/plate.png')).toBe(false)
  })
})

describe('the host verdict', () => {
  it('condemns the host once two distinct addresses on it have failed', () => {
    const one = 'https://two-fail.invalid/1.jpg'
    const two = 'https://two-fail.invalid/2.jpg'
    const three = 'https://two-fail.invalid/3.jpg'

    expect(hostIsClosed(three)).toBe(false) // unknown host is not condemned
    noteImageFailed(one)
    noteImageFailed(two)
    expect(hostIsClosed(three)).toBe(true)
  })

  it('keeps a host that has served open when one of its files dies', () => {
    const good = 'https://serves.invalid/good.jpg'
    const dead = 'https://serves.invalid/dead.jpg'
    const other = 'https://serves.invalid/other.jpg'

    noteImageLoaded(good)
    noteImageFailed(dead)
    expect(hostIsClosed(dead)).toBe(true) // that FILE is gone for the session
    expect(hostIsClosed(good)).toBe(false)
    expect(hostIsClosed(other)).toBe(false) // the HOST is not
  })

  it('files the verdict under host AND port, so a staging port is judged alone', () => {
    noteImageFailed('https://ports.invalid:8443/1.jpg')
    noteImageFailed('https://ports.invalid:8443/2.jpg')
    expect(hostIsClosed('https://ports.invalid:8443/3.jpg')).toBe(true)
    expect(hostIsClosed('https://ports.invalid/3.jpg')).toBe(false)
  })

  it('condemns nothing but the one address when the source needs no verdict', () => {
    const own = 'data:image/png;base64,iVBORw0KGgo='
    noteImageFailed(own)
    expect(hostIsClosed(own)).toBe(true)
    expect(hostIsClosed('data:image/png;base64,AAAAAAAA')).toBe(false)
  })
})

/* ============================================================
   THE TWO HOSTS WE DO NOT SPEND A REQUEST ON.

   These are the only assertions in this file that name a REAL host,
   and they name them on purpose: the list in `imageSources.ts` is a
   measurement, and a measurement nobody can see go red is a comment.
   If somebody deletes an entry — or adds one without measuring — the
   walk goes back to printing `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`
   at a stakeholder, and this is where that is caught.

   Measured 2026-08-17 (see the block above `MEASURED_CLOSED`):
   northsidemarine.com.au answers 403 behind Cloudflare with
   `Cross-Origin-Resource-Policy: same-origin`; the SharePoint host
   302s to a Microsoft sign-in. The ten hosts that DO serve are
   represented here by highfieldboats.com, which must stay unknown
   until the probe answers for it — the table is not allowed to grow
   into a blanket refusal of cross-origin pictures, which is the rule
   this whole module exists to have replaced.
   ============================================================ */
describe('the hosts a request is never spent on', () => {
  it('refuses the two measured hosts without any address having failed', () => {
    expect(hostIsClosed('https://www.northsidemarine.com.au/x/y.jpg')).toBe(true)
    expect(
      hostIsClosed('https://northsidemarine1.sharepoint.com/sites/x/Shared%20Documents/y.jpg'),
    ).toBe(true)
  })

  it('leaves every host that serves to the probe', () => {
    expect(hostIsClosed('https://www.highfieldboats.com/x/y.jpg')).toBe(false)
    expect(hostIsClosed('https://www.stacer.com.au/x/y.jpg')).toBe(false)
    expect(hostIsClosed('https://www.yamaha-motor.com.au/x/y.ashx')).toBe(false)
    /* a sibling subdomain is a different host and gets its own answer */
    expect(hostIsClosed('https://northsidemarine.com.au/x/y.jpg')).toBe(false)
  })

  it('hands a page the host and the reason, and nothing for anywhere else', () => {
    expect(measuredClosedHost('https://www.northsidemarine.com.au/x/y.jpg')).toEqual({
      host: 'www.northsidemarine.com.au',
      why: 'northsidemarine.com.au serves its pictures to its own site only',
    })
    expect(measuredClosedHost('https://www.highfieldboats.com/x/y.jpg')).toBeNull()
    /* a host condemned by the PROBE is deliberately not in this count —
       see the note on the function: a page-level total must not move
       while somebody is reading it */
    noteImageFailed('https://dies-live.invalid/1.jpg')
    noteImageFailed('https://dies-live.invalid/2.jpg')
    expect(hostIsClosed('https://dies-live.invalid/3.jpg')).toBe(true)
    expect(measuredClosedHost('https://dies-live.invalid/3.jpg')).toBeNull()
  })

  it('reads as a clause as well as a sentence, so a list of them holds together', () => {
    /* the module index joins these with commas and "and" — an entry
       starting "this" or "it" would break the sentence it lands in */
    for (const src of [
      'https://www.northsidemarine.com.au/x/y.jpg',
      'https://northsidemarine1.sharepoint.com/x/y.jpg',
    ]) {
      const why = measuredClosedHost(src)?.why ?? ''
      expect(why).not.toBe('')
      expect(why).not.toMatch(/^(this|it|the picture)\b/i)
      expect(why).not.toMatch(/[.!?]$/)
    }
  })

  it('says WHY for a measured host, and WHERE for any other', () => {
    expect(heldAsLinkNote('https://www.northsidemarine.com.au/x/y.jpg')).toBe(
      `${HELD_AS_LINK} — northsidemarine.com.au serves its pictures to its own site only.`,
    )
    expect(heldAsLinkNote('https://northsidemarine1.sharepoint.com/x/y.jpg')).toBe(
      `${HELD_AS_LINK} — northsidemarine1.sharepoint.com needs a sign-in to read.`,
    )
    expect(heldAsLinkNote('https://plates.invalid/x.jpg')).toBe(
      `${HELD_AS_LINK} — the picture itself lives at plates.invalid.`,
    )
    expect(heldAsLinkNote('')).toBe(`${HELD_AS_LINK} — the picture itself is not here.`)
  })
})

describe('the words on the plate', () => {
  it('reads an escaped filename back as words', () => {
    expect(nameFromUrl('https://plates.invalid/a/b%20c.jpg')).toBe('b c.jpg')
    expect(nameFromUrl('https://plates.invalid/%E0%A4%A.jpg')).toBe('%E0%A4%A.jpg') // undecodable, left alone
    expect(nameFromUrl('https://plates.invalid')).toBe('')
  })

  it('falls back from the given name to the filename to the host', () => {
    expect(imageLabel({ id: 'i1', src: 'https://plates.invalid/x.jpg', name: 'Plate 1' })).toBe(
      'Plate 1',
    )
    expect(imageLabel({ id: 'i2', src: 'https://plates.invalid/x.jpg', name: '  ' })).toBe('x.jpg')
    expect(imageLabel({ id: 'i3', src: 'https://plates.invalid' })).toBe('plates.invalid')
    expect(imageLabel({ id: 'i4', src: '' })).toBe('Picture')
    expect(imageHostOf('https://plates.invalid:8443/x.jpg')).toBe('plates.invalid')
  })
})
