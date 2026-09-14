/* ============================================================
   TWO PIECES OF TEXT IN THE SAME PLACE.

   Every ruler in this repo measures one element against itself or
   against its own box: does it overflow, is it cut mid-word, does
   its ink clear its ground. Not one of them asks the question a
   person asks first — IS SOMETHING SITTING ON TOP OF SOMETHING
   ELSE. The owner read three screenshots and said "so much overlap
   content txt not readable", and every guard had just reported
   clean, because an element painting over its neighbour overflows
   nothing and clears every ratio.

       node tools/check-collide.mjs
       node tools/check-collide.mjs --at 1440x900

   IT ASKS THREE THINGS, of every element that holds text DIRECTLY
   — its own text nodes, never a descendant's:

     SPILLS   the string is wider than the box it is in and nothing
              clips it, so it paints past its own edge onto
              whatever is next. This is what was actually wrong:
              `.sn-find-say` was 79px holding 95px of "Find
              anything". Two boxes need not intersect for two
              strings to.

     COVERED  `elementFromPoint` at five places along the line. If
              what comes back is not this element, not inside it
              and not something it is inside, a person is looking
              at something else there. Five points and not one,
              because a card over the right third of a strip
              leaves the centre clear.

     BOXES    two text-bearing elements whose rectangles intersect
              and which are not one inside the other. 2px of slack,
              because adjacent rows share an edge and rounding
              makes that read as an overlap on every table.

   `aria-hidden` is allowed to sit over anything: it is decoration
   by declaration. Nothing else is.

   AND IT WALKS THE WHOLE DOCUMENT, not a stage root. Every other
   ruler here starts at `.ct` or `.bs` or `.fd` — so the sidebar,
   the top bar and the toasts had never been measured by anything,
   and that is exactly where the first finding was.
   ============================================================ */

import { chromium } from 'playwright-core'
import { wait, settled, signInAndSeed, door } from './drive.mjs'

const argv = process.argv.slice(2)
const at = argv.indexOf('--at') >= 0 ? argv[argv.indexOf('--at') + 1] : '1440x900'
const [W, H] = at.split('x').map(Number)
const only = argv.indexOf('--only') >= 0 ? argv[argv.indexOf('--only') + 1] : null

const rail = (p, name) => door(p, name)

/* THE FRONT DOOR'S OWN BUTTON, AND NOT THE RAIL'S. Both say "New
   quote"; the rail's comes first in the document and `.first()` is
   document order. At 1024 and under the rail is a closed drawer at
   x = -318, `inert` and `visibility: hidden`, so every walk below
   used to time out against `.shell-body` — which is to say this
   ruler measured nothing at either of the two widths it was most
   needed at. `shot-one.mjs` carries the same fix and the
   measurement. */
const newQuote = (p) => p.locator('.fd').getByRole('button', { name: /New quote/ }).first().click()

const STOPS = [
  ['home', async (p) => rail(p, /^Home/)],
  ['modules', async (p) => rail(p, /^Modules/)],
  ['data', async (p) => rail(p, /^Data/)],
  ['quotes', async (p) => rail(p, /^Quotes/)],
  ['customers', async (p) => rail(p, /^Customers/)],
  ['admin', async (p) => rail(p, /^Admin/)],
  [
    'catalogue',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1600)
      await p.locator('.dt-open').filter({ hasText: 'Highfield Inflatables' }).first().click()
    },
  ],
  [
    'picker',
    async (p) => {
      await rail(p, /^Home/)
      await wait(p, 1200)
      await newQuote(p)
    },
  ],
  [
    'place',
    async (p) => {
      await rail(p, /^Home/)
      await wait(p, 1200)
      await newQuote(p)
      await wait(p, 2100)
      await p.locator('.qp-card').first().click()
    },
  ],
  [
    'configurator',
    async (p) => {
      await rail(p, /^Home/)
      await wait(p, 1200)
      await newQuote(p)
      await wait(p, 2100)
      await p.locator('.qp-card').first().click()
      await wait(p, 2300)
      await p.locator('.pl-card').first().click()
      await wait(p, 600)
      await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
    },
  ],
  /* THE ONE ARTEFACT THAT LEAVES THE BUILDING, and no ruler in this
     repo had ever opened it. It is the only light ground in the app
     and the only surface with a real table on it, which makes it
     the likeliest place for two strings to land on each other — and
     it is the surface where that matters most, because a customer
     keeps it. */
  [
    'document',
    async (p) => {
      await rail(p, /^Home/)
      await wait(p, 1200)
      await newQuote(p)
      await wait(p, 2100)
      await p.locator('.qp-card').first().click()
      await wait(p, 2300)
      await p.locator('.pl-card').first().click()
      await wait(p, 600)
      await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
      await wait(p, 2700)
      const who = p.getByRole('button', { name: /Who it is for/ })
      if (await who.count()) await who.first().click()
      await wait(p, 1200)
      const name = p.getByPlaceholder(/their name/i)
      await name.fill('Mark McWilliams')
      await name.press('Tab')
      await wait(p, 1100)
      await p.getByRole('button', { name: /Give it to the customer/ }).click()
    },
  ],
]

const collisions = (page) =>
  page.evaluate(() => {
    const ownText = (el) => {
      let s = ''
      for (const n of el.childNodes) if (n.nodeType === 3) s += n.data
      return s.trim()
    }

    /* ============================================================
       IS ANYTHING ON TOP OF IT — asked of the renderer, not of the
       stylesheet.

       The first version of this reasoned about CSS: it skipped any
       element with a positioned ancestor, on the grounds that an
       overlay is usually deliberate. That is far too broad. The
       whole sidebar sits under a fixed shell and the whole product
       column under a sticky one, so two thirds of the app was
       exempt and the ruler reported "nothing overlaps" while the
       owner was looking at overlaps.

       `elementFromPoint` asks the only question that matters: at
       this pixel, what would a person's cursor hit? Sample along
       the element's own text, and if what comes back is neither the
       element nor something inside it nor something it is inside,
       then a person is looking at something else there.

       SAMPLED ACROSS THE LINE rather than at its centre, because a
       card covering the right third of a spec strip leaves the
       centre clear. Five points, and one covered point is enough —
       a string with a card over any part of it is a string nobody
       can read.
       ============================================================ */
    /* THE NEAREST BOX THAT CLIPS. An element hanging past the bottom
       of a scrollport is not covered by whatever sits below the
       port — it is SCROLLED, and the last row of every scrolling
       list in the world is half visible. The first run of this
       reported "NSM Custom Trailers covered by ui-done" for exactly
       that reason, and a ruler that calls normal scrolling a defect
       is a ruler nobody will read twice. */
    const CLIPS = ['auto', 'scroll', 'hidden', 'clip']

    /* EVERY BOX THAT CLIPS IT, INTERSECTED — not the nearest one.

       The first version returned the first clipping ancestor and
       stopped, and that is wrong in the commonest arrangement this
       app has: a card with `overflow: hidden` inside a scrollport.
       The card is the nearest clipper and the card's own rect is
       unclipped, so a card scrolled past the bottom of the port
       reported its name as visible and colliding with whatever was
       below the port. Measured: `.pl-name` at y=21579 in an 806px
       port, "covered by Start the quote". */
    const clipRect = (el) => {
      let box = { top: 0, bottom: innerHeight, left: 0, right: innerWidth }
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const cs = getComputedStyle(n)
        if (!CLIPS.includes(cs.overflowY) && !CLIPS.includes(cs.overflowX)) continue
        const r = n.getBoundingClientRect()
        box = {
          top: Math.max(box.top, r.top),
          bottom: Math.min(box.bottom, r.bottom),
          left: Math.max(box.left, r.left),
          right: Math.min(box.right, r.right),
        }
      }
      return box
    }

    const coveredBy = (el, r) => {
      const y = r.top + Math.min(r.height / 2, 10)
      const pr = clipRect(el)
      for (let k = 1; k <= 5; k += 1) {
        const x = r.left + (r.width * k) / 6
        if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) continue
        /* outside the box that clips it: scrolled away, not hidden */
        if (y < pr.top || y > pr.bottom || x < pr.left || x > pr.right) continue
        const hit = document.elementFromPoint(x, y)
        if (!hit) continue
        if (hit === el || el.contains(hit) || hit.contains(el)) continue
        /* a label's own ::before, a rail, a scrim drawn by the same
           card — anything aria-hidden is decoration by declaration
           and is allowed to sit over its own surface */
        if (hit.closest('[aria-hidden="true"]')) continue
        /* AND IT ONLY COUNTS IF IT HIDES SOMETHING. A heading set at
           0.92 leading has a line box taller than its glyphs, so it
           sits over the eyebrow above it in the hit test while
           hiding not one pixel of it — the first run of this reported
           six of those. An element with no ground and no picture
           paints nothing; it is in the way of the CURSOR, which is a
           different complaint from the one being measured here. */
        const hs = getComputedStyle(hit)
        const blank =
          (hs.backgroundColor === 'rgba(0, 0, 0, 0)' || hs.backgroundColor === 'transparent') &&
          hs.backgroundImage === 'none' &&
          hit.tagName !== 'IMG' &&
          hs.backdropFilter === 'none'
        if (blank) continue
        return hit
      }
      return null
    }

    const live = []
    for (const el of document.querySelectorAll('body *')) {
      if (!ownText(el)) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue
      /* AND DECORATION IS NOT A VICTIM EITHER. The first run reported
         "RU2", "HI", "Boa" covered on five screens — every one of
         them a monogram plate under a photograph, which is what a
         plate IS: `.ct-plate` sits at `inset: 0` and the picture
         paints over it when there is a picture. They are all
         `aria-hidden`, and something declared decoration cannot be
         wronged by being covered. The hit side of this test already
         allowed aria-hidden; the covered side had to as well. */
      if (el.closest('[aria-hidden="true"]')) continue
      /* THE RECT THAT IS ACTUALLY ON SCREEN. An element's own
         `getBoundingClientRect` is where it WOULD be; inside a
         scrollport, what a person sees is that intersected with the
         port. Comparing raw rects reported a paragraph scrolled
         half out of a pane as overlapping the card below it and the
         step rail above it — neither of which any eye can see,
         because the pane clips both ends. */
      const v = clipRect(el)
      const vis = {
        top: Math.max(r.top, v.top),
        bottom: Math.min(r.bottom, v.bottom),
        left: Math.max(r.left, v.left),
        right: Math.min(r.right, v.right),
      }
      vis.width = vis.right - vis.left
      vis.height = vis.bottom - vis.top
      if (vis.width < 4 || vis.height < 4) continue
      live.push({ el, r: vis, t: ownText(el) })
    }

    /* AND TEXT THAT RUNS OUT OF ITS OWN BOX, which is the other
       half of the same complaint and the half that was actually
       happening. Two boxes need not intersect for two strings to:
       a label with `min-width: 0` and nothing clipping it simply
       paints past its edge onto its neighbour. The box check below
       cannot see that, and the overflow check in
       `qa-responsive` can — but only inside a stage root, and
       the sidebar, the top bar and the toasts are outside every
       one of them. The app's chrome had never been measured by
       anything. */
    const bad = []
    for (const { el, t } of live) {
      const cs = getComputedStyle(el)
      const shut = ['hidden', 'clip', 'auto', 'scroll'].includes(cs.overflowX)
      if (shut) continue
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
        bad.push(
          `spills ${el.scrollWidth - el.clientWidth}px  "${t.slice(0, 26)}"  ·  ${el.className || el.tagName}`,
        )
      }
    }
    /* AND WHAT IS COVERED — the renderer's own answer, which catches
       the cases the box test cannot: a thing painted over by an
       ancestor's sibling, a z-index that went the wrong way, a
       sheet that did not close.

       EXCEPT WHERE THE ELEMENT HAS OPTED OUT OF THE HIT TEST.
       `elementFromPoint` can never return something with
       `pointer-events: none`, so asking it about one always says
       "covered" — the configurator's marque is laid over the
       photograph with exactly that property, deliberately, so the
       stage's arrows underneath stay pressable. The box test below
       still watches those; this one cannot and should not pretend
       to. */
    const hittable = (el) => {
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        if (getComputedStyle(n).pointerEvents === 'none') return false
      }
      return true
    }

    for (const { el, r, t } of live) {
      if (!hittable(el)) continue
      const over = coveredBy(el, r)
      if (over) {
        bad.push(`covered  "${t.slice(0, 26)}"  by  ${over.className || over.tagName}`)
      }
    }

    for (let i = 0; i < live.length; i += 1) {
      for (let j = i + 1; j < live.length; j += 1) {
        const a = live[i]
        const b = live[j]
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue
        const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
        const oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
        /* 2px of slack: adjacent boxes share an edge and rounding
           makes that read as a one-pixel overlap on every row of
           every table in the app. */
        if (ox <= 2 || oy <= 2) continue
        bad.push(
          `${Math.round(ox)}x${Math.round(oy)}px  "${a.t.slice(0, 26)}" over "${b.t.slice(0, 26)}"` +
            `  ·  ${a.el.className || a.el.tagName} / ${b.el.className || b.el.tagName}`,
        )
      }
    }
    return [...new Set(bad)]
  })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: W, height: H } })
const page = await ctx.newPage()
await signInAndSeed(page)
await wait(page, 1500)

let total = 0
console.log(`\n  ${W}x${H}`)
for (const [name, open] of STOPS) {
  if (only && name !== only) continue
  try {
    await page.keyboard.press('Escape')
    await open(page)
    await wait(page, 2400)
    await settled(page)
    const bad = await collisions(page)
    total += bad.length
    console.log(`    ${name.padEnd(13)} ${bad.length === 0 ? 'clear' : `${bad.length} COLLIDING`}`)
    for (const b of bad.slice(0, 6)) console.log(`                     ${b}`)
  } catch (e) {
    console.log(`    ${name.padEnd(13)} UNREACHED — ${String(e.message).split('\n')[0].slice(0, 46)}`)
  }
}
await browser.close()
console.log(total === 0 ? '\n  nothing overlaps\n' : `\n  ${total} collision(s)\n`)
process.exit(total === 0 ? 0 : 1)
