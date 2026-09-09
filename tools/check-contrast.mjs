/* ============================================================
   check-contrast — the guard CLAUDE.md says does not exist.

   "**contrast** is not automated, there is **no visual regression
   tooling**" — CLAUDE.md, What the guards cannot see. This closes the
   first half of that sentence.

   It drives a real browser against a running dev server, walks the
   screens, and measures every text-bearing leaf against the ground it
   is actually drawn on.

   THE FOUR THINGS THAT MADE THE EARLIER SWEEPS LIE. CLAUDE.md records
   that three contrast sweeps during the redesign "reported false
   catastrophes by skipping one of those":

     1. `color(srgb …)` is not `rgb(…)`. getComputedStyle returns the
        srgb form for tokens declared that way, and a parser that only
        knows rgb() sees null and invents a failure.
     2. The ground is the WHOLE ancestor chain. A tint over a tint over
        the page is three composites, and stopping at the first
        non-transparent parent reads the tint as the ground.
     3. Translucent TEXT must be composited over that ground before it
        is measured. `--ink-faint` at 4.7:1 on white is the floor the
        design contract sets; measured uncomposited it looks worse than
        it is.

   The fourth was found on 2026-09-09, by a sweep that wrote its own
   walker (`docs/research/visual-qa-2026-09-09.md`, findings 3 and 4):

     4. A LEAF IS NOT "an element with no element children". This
        walked `document.querySelectorAll('*')` and skipped anything
        with `childElementCount`, so `<p>Hull only <b>$20,900</b></p>`
        measured the bold and never the sentence in front of it — and
        a run of text wrapped in `<span>`s is how half this app is
        written. The rule is now "an element that holds a text node of
        its own", which is a SUPERSET: measured node for node on the
        ten screens below, not one leaf the old test found is missing
        from the new set, and it finds 124 the old test could not
        reach. At 1280x800 on the real seed, 1,158 -> 1,282:

          home          90 -> 128     catalogue     306 -> 306
          modules      102 -> 110     register      223 -> 224
          module        63 ->  71     quotes         35 ->  39
          data          29 ->  29     customers      23 ->  25
          new quote     64 ->  64     configurator  223 -> 286

        AND THE FIVE SCREENS ARE TEN, which is the larger half of the
        same finding and the reason it was found at all. The guard
        covered home, modules, data, quotes and customers; on the real
        seed two of those are empty states worth 22 leaves between
        them, and BOTH failures the sweep found were on screens this
        file never opened. 279 nodes over five screens is now 1,246
        over ten. Coverage is not a ruler, and a ruler is not coverage.

   AND ONE THING THAT WOULD HAVE MADE THIS SWEEP LIE THE OTHER WAY.
   `aria-hidden="true"` text is set aside, and counted out loud rather
   than swallowed. DESIGN_PRINCIPLES §1 permits `--fg-quaternary` —
   2.6:1 — on "rules, ticks, disabled marks" provided it "may never
   carry meaning", and the nine `·` separators on the configurator are
   exactly that (finding 4). Widening the walk without this condition
   turns nine correct nodes red and, in CLAUDE.md's words, "you will
   spend an hour fixing an app that is fine". 36 nodes over the ten
   screens are set aside this way and 9 of them are under the line;
   every screen prints both figures, so the exemption is legible and
   not a hiding place.

   All of it is handled below, and the parser returns null rather than
   guessing, so an unknown colour format is a crash and not a silent
   pass.

   Uses playwright-core against the system Chrome (channel: 'chrome'),
   so nothing is downloaded and the browser is the one a person uses.

   Run:  npm run check:contrast          (needs `npm run dev` running)
         npm run check:contrast -- --url http://localhost:5090
   ============================================================ */

import { chromium } from 'playwright-core'

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const URL = arg('--url', 'http://localhost:5090')
const WIDTH = Number(arg('--width', '1280'))
const HEIGHT = Number(arg('--height', '800'))

/* The sweep runs INSIDE the page. Kept as one self-contained function
   so it can be pasted into devtools unchanged when chasing one screen. */
function sweep() {
  const parse = (s) => {
    if (!s) return null
    let m = s.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/)
    if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255, m[4] === undefined ? 1 : +m[4]]
    m = s.match(/rgba?\(([^)]+)\)/)
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
      return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]]
    }
    if (s === 'transparent') return [0, 0, 0, 0]
    return null /* unknown format — never guess */
  }

  const over = (fg, bg) => [0, 1, 2].map((i) => fg[3] * fg[i] + (1 - fg[3]) * bg[i])

  /* (2) the WHOLE ancestor chain, composited outermost-first */
  const groundOf = (el) => {
    const stack = []
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor)
      if (c && c[3] > 0) {
        stack.push(c)
        if (c[3] === 1) break
      }
    }
    let base = [255, 255, 255]
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base)
    return base
  }

  const lum = (c) =>
    0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])
  function ch(v) {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const ratio = (a, b) => {
    const l1 = lum(a)
    const l2 = lum(b)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  }

  /* (4) WHAT THIS ELEMENT ITSELF SAYS — its own text nodes, not its
     descendants'. `textContent` on a wrapper returns the whole
     subtree, which would measure a paragraph's string against the
     wrapper's colour and count the same glyphs once per ancestor. The
     colour a text node is painted in is its PARENT's `color`, so the
     element that owns the text node is the thing to measure. */
  const ownText = (el) => {
    let s = ''
    for (const n of el.childNodes) if (n.nodeType === 3) s += n.data
    return s.trim()
  }

  const fails = []
  let measured = 0
  let unparsed = 0
  let decorative = 0
  let decorativeBelow = 0

  for (const el of document.querySelectorAll('*')) {
    const t = ownText(el)
    if (!t) continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.opacity === '0' || cs.display === 'none') continue
    /* DECORATION IS NOT READING TEXT — and the skip is counted twice
       over, once for how much was passed over and once for how much
       of it was under the line, so that a screen quietly hiding real
       text behind `aria-hidden` moves a number somebody can see. A
       guard's exemption is only safe while it is legible. */
    const decoration = !!el.closest('[aria-hidden="true"]')

    const fg = parse(cs.color)
    if (!fg) {
      unparsed++
      continue
    }
    const ground = groundOf(el)
    const text = over(fg, ground) /* (3) composite translucent text */
    const cr = ratio(text, ground)

    const px = parseFloat(cs.fontSize)
    const weight = +cs.fontWeight || 400
    /* WCAG large text: >=24px, or >=18.66px at >=700 */
    const large = px >= 24 || (px >= 18.66 && weight >= 700)
    const need = large ? 3 : 4.5

    if (decoration) {
      decorative++
      if (cr < need) decorativeBelow++
      continue
    }
    measured++

    if (cr < need) {
      fails.push({
        text: t.slice(0, 48),
        /* `className` on an SVG node is an SVGAnimatedString, which
           stringifies to "[object SVGAnimatedString]" and names
           nothing. The attribute is the same string on both. */
        tag: el.tagName.toLowerCase(),
        cls: (el.getAttribute('class') || '').slice(0, 40),
        px: +px.toFixed(1),
        weight,
        ratio: +cr.toFixed(2),
        need,
        color: cs.color,
      })
    }
  }
  fails.sort((a, b) => a.ratio - b.ratio)
  return { measured, unparsed, decorative, decorativeBelow, fails }
}

/* A door in the rail, and only there. The module workspace has its own
   "Quotes" tab and the picker its own "Close" — an unscoped
   `getByRole` would eventually press one of those instead. */
const door = (p, name) => p.locator('nav.sn').getByRole('button', { name }).first().click()

/* The screens worth walking. `open` runs after sign-in and data load,
   and each one continues from where the last finished — the order is
   the route, and `at` is the proof it arrived (`src/app/url.ts`).

   TEN, NOT FIVE. The five were home, modules, data, quotes and
   customers; on the real seed two of those are empty states worth 22
   leaves between them, and the module workspace, the catalogue, the
   register, the picker and the configurator — where the app actually
   spends its day, and where both failures of the 2026-09-09 sweep
   were — were never opened. */
const SCREENS = [
  { name: 'home', at: '', open: async (p) => door(p, /^Home/) },
  { name: 'modules', at: 'modules', open: async (p) => door(p, /^Modules/) },
  {
    /* one module, on its Dashboard tab — named, because the workspace
       remembers the tab you left it on */
    name: 'module',
    at: 'module',
    open: async (p) => {
      await door(p, /^Modules/)
      await p.getByRole('button', { name: /^Open .+ — / }).first().click()
      await p.getByRole('tab', { name: 'Dashboard' }).first().click()
    },
  },
  { name: 'data', at: 'data', open: async (p) => door(p, /^Data/) },
  {
    /* the front door of a table — the gallery, which is what a table
       opens as (`catalogueLens.ts`) */
    name: 'catalogue',
    at: 'table',
    sure: '.cat-gallery',
    open: async (p) => {
      await door(p, /^Data/)
      await p.getByRole('button', { name: /^All tables/ }).first().click()
      await p.getByRole('button', { name: /^Open .+ — / }).first().click()
    },
  },
  {
    /* and the same table at the other density — the register, the
       screen a dealer is in all day, and the surface finding 2's 21
       band names at 4.33:1 were measured on. The lens is session
       state, not a place, so the address cannot tell the two apart
       and `sure` does. */
    name: 'register',
    at: 'table',
    sure: '.tb-scroll',
    open: async (p) => p.getByRole('button', { name: /^List$/ }).first().click(),
  },
  { name: 'quotes', at: 'quotes', open: async (p) => door(p, /^Quotes/) },
  { name: 'customers', at: 'customers', open: async (p) => door(p, /^Customers/) },
  { name: 'new quote', at: 'new-quote', open: async (p) => door(p, /^New quote$/) },
  {
    /* and through the picker into the configurator, the one screen
       wearing the display tier. A place, then a model, then the act —
       the same three presses a dealer makes. */
    name: 'configurator',
    at: 'quote',
    open: async (p) => {
      await p
        .getByRole('list', { name: /places you can quote from/i })
        .getByRole('button')
        .first()
        .click()
      await p.getByRole('option').first().click()
      await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).first().click()
      await p.waitForTimeout(1200)
    },
  },
]

const run = async () => {
  let browser
  try {
    browser = await chromium.launch({ channel: 'chrome' })
  } catch (e) {
    console.error('Could not launch Chrome. Is it installed?\n' + e.message)
    process.exit(2)
  }
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } })

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 })
  } catch {
    console.error(`No dev server at ${URL}. Start it with \`npm run dev\` first.`)
    await browser.close()
    process.exit(2)
  }

  /* Sign in. The demo button FILLS the form; it does not submit — so
     both presses are needed, and that is the app's behaviour, not a
     quirk of this script. */
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await page.waitForTimeout(800)
  }

  /* Load the real seed, so the sweep measures real strings and not an
     empty state. */
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) {
    await load.first().click()
    await page.waitForTimeout(2500)
  }

  let total = 0
  let failed = 0
  let skipped = 0
  let skippedBelow = 0
  let unreached = 0
  for (const s of SCREENS) {
    try {
      await s.open(page)
      await page.waitForTimeout(700)
    } catch {
      console.log(`  ${s.name.padEnd(12)} — COULD NOT OPEN, not measured`)
      unreached++
      continue
    }
    /* PROVE WE ARE LOOKING AT THE SCREEN WE CLAIM. A sweep that
       silently measures the previous screen, or an empty one, reports
       clean and means nothing — the same failure check.sh had when a
       pipeline swallowed its own exit status. So each row prints the
       heading it actually found, a screen that yields almost nothing
       is visible rather than reassuring, AND the address is checked
       against the place this row is for: `src/app/url.ts` gives every
       window a `?at=`, so "did the click land" is now a fact and not
       an inference. A screen that cannot be reached is counted and
       goes red — the guard reporting clean over a screen it never
       opened is the defect this file was widened to close. */
    const where = await page.evaluate(() => ({
      at: new URLSearchParams(window.location.search).get('at') ?? '',
      head:
        (document.querySelector('h1, h2, [role="heading"]')?.textContent ?? '').trim().slice(0, 34) ||
        '(no heading)',
    }))
    const wrongPlace = where.at !== s.at
    const wrongState = s.sure ? !(await page.locator(s.sure).count()) : false
    if (wrongPlace || wrongState) {
      console.log(
        `  ${s.name.padEnd(12)} — DID NOT ARRIVE (address "${where.at}", wanted "${s.at}"${
          wrongState ? `; no ${s.sure}` : ''
        }), not measured`,
      )
      unreached++
      continue
    }

    const r = await page.evaluate(sweep)
    total += r.measured
    failed += r.fails.length
    skipped += r.decorative
    skippedBelow += r.decorativeBelow
    const note = r.unparsed ? ` (${r.unparsed} unparsed colours)` : ''
    /* the second figure only when there is one — nine rows reading
       "(0 under the line)" is how a number stops being read */
    const deco = r.decorative
      ? `, ${r.decorative} aria-hidden set aside${
          r.decorativeBelow ? ` (${r.decorativeBelow} under the line)` : ''
        }`
      : ''
    const thin = r.measured < 20 ? '  ← thin, check this screen opened' : ''
    console.log(
      `  ${s.name.padEnd(12)} ${String(r.measured).padStart(4)} measured, ${r.fails.length} below threshold${deco}${note}  [${where.head}]${thin}`,
    )
    for (const f of r.fails.slice(0, 10)) {
      console.log(
        `      ${f.ratio}:1 (needs ${f.need})  ${f.px}px/${f.weight}  ${f.color}  ${f.tag}.${f.cls}  "${f.text}"`,
      )
    }
  }

  await browser.close()

  console.log('')
  const walked = SCREENS.length - unreached
  const aside = skipped
    ? `, ${skipped} aria-hidden nodes set aside (${skippedBelow} of them under the line)`
    : ''
  if (unreached) {
    console.log(
      `  FAILED — ${unreached} of ${SCREENS.length} screens could not be reached. ${total} text nodes measured on the other ${walked}${aside}; ${failed} below threshold`,
    )
    process.exit(1)
  }
  if (failed === 0) {
    console.log(
      `  clean — ${total} text nodes across ${SCREENS.length} screens, all clear their threshold${aside}`,
    )
    process.exit(0)
  }
  console.log(`  FAILED — ${failed} of ${total} text nodes below their contrast threshold${aside}`)
  process.exit(1)
}

run()
