/* ============================================================
   check-contrast — the guard CLAUDE.md says does not exist.

   "**contrast** is not automated, there is **no visual regression
   tooling**" — CLAUDE.md, What the guards cannot see. This closes the
   first half of that sentence.

   It drives a real browser against a running dev server, walks the
   screens, and measures every text-bearing leaf against the ground it
   is actually drawn on.

   THE THREE THINGS THAT MADE THE EARLIER SWEEPS LIE. CLAUDE.md records
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

   All three are handled below, and the parser returns null rather than
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

  const fails = []
  let measured = 0
  let unparsed = 0

  for (const el of document.querySelectorAll('*')) {
    if (el.childElementCount) continue /* text-bearing leaves only */
    const t = (el.textContent || '').trim()
    if (!t) continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.opacity === '0' || cs.display === 'none') continue

    const fg = parse(cs.color)
    if (!fg) {
      unparsed++
      continue
    }
    const ground = groundOf(el)
    const text = over(fg, ground) /* (3) composite translucent text */
    const cr = ratio(text, ground)
    measured++

    const px = parseFloat(cs.fontSize)
    const weight = +cs.fontWeight || 400
    /* WCAG large text: >=24px, or >=18.66px at >=700 */
    const large = px >= 24 || (px >= 18.66 && weight >= 700)
    const need = large ? 3 : 4.5

    if (cr < need) {
      fails.push({
        text: t.slice(0, 48),
        cls: (el.className || '').toString().slice(0, 40),
        px: +px.toFixed(1),
        weight,
        ratio: +cr.toFixed(2),
        need,
        color: cs.color,
      })
    }
  }
  fails.sort((a, b) => a.ratio - b.ratio)
  return { measured, unparsed, fails }
}

/* The screens worth walking. `open` runs after sign-in and data load. */
const SCREENS = [
  { name: 'home', open: async () => {} },
  { name: 'modules', open: async (p) => p.getByRole('button', { name: /^Modules/ }).first().click() },
  { name: 'data', open: async (p) => p.getByRole('button', { name: /^Data/ }).first().click() },
  { name: 'quotes', open: async (p) => p.getByRole('button', { name: /^Quotes/ }).first().click() },
  { name: 'customers', open: async (p) => p.getByRole('button', { name: /^Customers/ }).first().click() },
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
  for (const s of SCREENS) {
    try {
      await s.open(page)
      await page.waitForTimeout(700)
    } catch {
      console.log(`  ${s.name.padEnd(10)} — could not open, skipped`)
      continue
    }
    /* PROVE WE ARE LOOKING AT THE SCREEN WE CLAIM. A sweep that
       silently measures the previous screen, or an empty one, reports
       clean and means nothing — the same failure check.sh had when a
       pipeline swallowed its own exit status. So each row prints the
       heading it actually found, and a screen that yields almost
       nothing is visible rather than reassuring. */
    const r = await page.evaluate(sweep)
    const head = await page.evaluate(() => {
      const h = document.querySelector('h1, h2, [role="heading"]')
      return (h && h.textContent.trim().slice(0, 34)) || '(no heading)'
    })
    total += r.measured
    failed += r.fails.length
    const note = r.unparsed ? ` (${r.unparsed} unparsed colours)` : ''
    const thin = r.measured < 20 ? '  ← thin, check this screen opened' : ''
    console.log(
      `  ${s.name.padEnd(10)} ${String(r.measured).padStart(4)} measured, ${r.fails.length} below threshold${note}  [${head}]${thin}`,
    )
    for (const f of r.fails.slice(0, 10)) {
      console.log(
        `      ${f.ratio}:1 (needs ${f.need})  ${f.px}px/${f.weight}  ${f.color}  .${f.cls}  "${f.text}"`,
      )
    }
  }

  await browser.close()

  console.log('')
  if (failed === 0) {
    console.log(`  clean — ${total} text nodes across ${SCREENS.length} screens, all clear their threshold`)
    process.exit(0)
  }
  console.log(`  FAILED — ${failed} of ${total} text nodes below their contrast threshold`)
  process.exit(1)
}

run()
