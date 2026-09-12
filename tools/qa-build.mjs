/* ============================================================
   THE SCOREBOARD FOR THE REBUILT SCREEN.

   `docs/research/visual-qa-2026-09-09.md` is the only honest
   measurement in this repo and it is the number to beat. This runs
   its ruler against the rebuilt quote flow, at every width and in
   both themes, from an empty profile.

       node tools/qa-build.mjs

   IT MEASURES, IT DOES NOT LOOK. Everything here is read off the
   glass: rendered font sizes, composited contrast, line boxes,
   scroll extents, focus rings. This session has introduced three
   mid-word truncations and two invisible React bugs since the rule
   forbidding them was written, every one of them past a careful
   read of the code.

   THE CONTRAST RULER IS THE ONE `check-contrast.mjs` LEARNED THE
   HARD WAY, and the comments there record three sweeps that lied
   before one was right:

     · parse `color(srgb ...)` as well as `rgb()`
     · composite the FULL ancestor chain, not just the parent
     · composite translucent TEXT over that ground before measuring

   Skip any one and the number is wrong in a direction that looks
   alarming. It also skips `aria-hidden` nodes, which is the defect
   `visual-qa` finding 4 records IN THE GUARD rather than in the
   app: nine separators measured 2.58:1 and all nine were correct.
   ============================================================ */

import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ORIGIN = process.env.HL_ORIGIN ?? 'http://localhost:5090'
const OUT = join(process.cwd(), 'out', 'build')
const WIDTHS = [
  [1024, 768],
  [1280, 800],
  [1440, 900],
]
const THEMES = ['light', 'dark']

const wait = (p, ms) => p.waitForTimeout(ms)

/** Runs in the page. Returns everything measurable about one screen. */
const RULER = () => {
  /* ---- colour ---------------------------------------------- */
  const parse = (s) => {
    const t = (s || '').trim()
    if (!t || t === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
    const srgb = t.match(
      /^color\(\s*srgb\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)(?:\s*\/\s*([\d.eE+-]+%?))?\s*\)$/i,
    )
    const alpha = (raw) =>
      raw === undefined ? 1 : raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw)
    const clamp = (n) => Math.max(0, Math.min(255, n))
    if (srgb) {
      return {
        r: clamp(Number(srgb[1]) * 255),
        g: clamp(Number(srgb[2]) * 255),
        b: clamp(Number(srgb[3]) * 255),
        a: alpha(srgb[4]),
      }
    }
    const rgb = t.match(
      /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i,
    )
    if (rgb) {
      return {
        r: clamp(Number(rgb[1])),
        g: clamp(Number(rgb[2])),
        b: clamp(Number(rgb[3])),
        a: alpha(rgb[4]),
      }
    }
    return null
  }
  const over = (top, under) => {
    const a = top.a + under.a * (1 - top.a)
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
    const mix = (t, u) => (t * top.a + u * under.a * (1 - top.a)) / a
    return { r: mix(top.r, under.r), g: mix(top.g, under.g), b: mix(top.b, under.b), a }
  }
  const ground = (el) => {
    const chain = []
    let n = el
    while (n) {
      const bg = parse(getComputedStyle(n).backgroundColor)
      if (bg && bg.a > 0) chain.push(bg)
      if (bg && bg.a >= 1) break
      n = n.parentElement
    }
    chain.push({ r: 255, g: 255, b: 255, a: 1 })
    return chain.reduceRight((u, t) => over(t, u))
  }
  const chan = (c) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const lum = (c) => 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b)
  const ratio = (f, b) => {
    const [hi, lo] = lum(f) > lum(b) ? [lum(f), lum(b)] : [lum(b), lum(f)]
    return (hi + 0.05) / (lo + 0.05)
  }

  /* ---- the leaf set ---------------------------------------- */
  const stage = document.querySelector('.bs') ?? document.body
  const hidden = (el) => el.closest('[aria-hidden="true"]') !== null
  const leaves = [...stage.querySelectorAll('*')].filter((el) => {
    if (el.children.length !== 0) return false
    if ((el.textContent ?? '').trim().length === 0) return false
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false
    const b = el.getBoundingClientRect()
    return b.width >= 2 && b.height >= 2
  })

  /* ---- type ramp ------------------------------------------- */
  const sizes = leaves.map((el) => parseFloat(getComputedStyle(el).fontSize))
  const largest = sizes.length ? Math.max(...sizes) : 0
  const smallest = sizes.length ? Math.min(...sizes) : 0
  const steps = new Set(sizes.map((n) => n.toFixed(1)))

  /* ---- contrast -------------------------------------------- */
  const fails = []
  for (const el of leaves) {
    if (hidden(el)) continue
    const ink = parse(getComputedStyle(el).color)
    if (!ink) continue
    const bg = ground(el)
    const r = ratio(over(ink, bg), bg)
    /* 3:1 is the large-text threshold — 18.66px bold or 24px. */
    const big = parseFloat(getComputedStyle(el).fontSize) >= 24
    if (r < (big ? 3 : 4.5)) {
      fails.push({
        r: Number(r.toFixed(2)),
        px: Math.round(parseFloat(getComputedStyle(el).fontSize)),
        text: (el.textContent ?? '').trim().slice(0, 38),
        where: el.className || el.tagName,
      })
    }
  }

  /* ---- mid-word -------------------------------------------- */
  const midWord = []
  for (const el of leaves) {
    const cs = getComputedStyle(el)
    const node = el.firstChild
    if (!node || node.nodeType !== 3) continue
    const text = node.textContent ?? ''
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) {
      midWord.push({ kind: 'clip', text: text.trim().slice(0, 38), where: el.className })
      continue
    }
    let prev = null
    for (let i = 0; i < text.length; i++) {
      const r = document.createRange()
      r.setStart(node, i)
      r.setEnd(node, i + 1)
      const b = r.getBoundingClientRect()
      if (b.width === 0) continue
      if (prev !== null && b.top > prev + 1) {
        if (/\w/.test(text[i - 1] ?? '') && /\w/.test(text[i] ?? '')) {
          midWord.push({ kind: 'break', at: `${text[i - 1]}|${text[i]}`, text: text.trim().slice(0, 38), where: el.className })
        }
      }
      prev = b.top
    }
  }

  /* ---- overflow -------------------------------------------- */
  const overflow = [...stage.querySelectorAll('*')]
    .filter((el) => {
      const cs = getComputedStyle(el)
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return false
      return el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0
    })
    .map((el) => ({ where: el.className || el.tagName, by: el.scrollWidth - el.clientWidth }))

  /* ---- the keyboard ---------------------------------------- */
  const focusables = [...stage.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )].filter((el) => {
    const cs = getComputedStyle(el)
    return cs.display !== 'none' && cs.visibility !== 'hidden'
  })

  return {
    leaves: leaves.length,
    largest: Number(largest.toFixed(1)),
    smallest: Number(smallest.toFixed(1)),
    ratio: smallest ? Number((largest / smallest).toFixed(2)) : 0,
    steps: steps.size,
    contrastFails: fails,
    midWord,
    overflow,
    focusables: focusables.length,
  }
}

/* ---------------------------------------------------------- */

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const thrown = []
page.on('pageerror', (e) => thrown.push(String(e.message)))

mkdirSync(OUT, { recursive: true })

await page.goto(ORIGIN)
const demo = page.getByRole('button', { name: /demo account/i })
if (await demo.count()) {
  await demo.first().click()
  await page.getByRole('button', { name: /^Sign in$/ }).first().click()
  await wait(page, 900)
}
const load = page.getByRole('button', { name: /Master Price File/i })
if (await load.count()) {
  await load.first().click()
  await wait(page, 4000)
}
await page.getByRole('button', { name: /New quote/ }).first().click()
await wait(page, 1200)
await page.locator('[aria-label*="places you can quote from" i] button').first().click()
await wait(page, 1400)
await page.getByRole('option').first().click()
await wait(page, 900)
await page.getByRole('button', { name: /Start the quote|Back to the quote/ }).first().click()
await wait(page, 1800)
const id = new globalThis.URL(page.url()).searchParams.get('id')
const at = `${ORIGIN}/?at=quote&id=${id}#build=new`

const rows = []
let bad = 0

for (const theme of THEMES) {
  for (const [w, h] of WIDTHS) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto(at)
    await wait(page, 2400)
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
    await wait(page, 500)

    const m = await page.evaluate(RULER)
    rows.push({ theme, at: `${w}x${h}`, ...m })
    bad += m.contrastFails.length + m.midWord.length + m.overflow.length
    await page.screenshot({ path: join(OUT, `qa-${theme}-${w}x${h}.png`) })
  }
}

/* ---- the keyboard walk, once ------------------------------ */
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto(at)
await wait(page, 2400)

/* EVERY STOP MUST DRAW A RING. `access-and-responsive.md` measured
   29 of 88 tab stops with no focus indicator in the build being
   replaced, and a ring is the whole of how a keyboard tells you
   where it is.

   IT TABS. The first draft called `el.focus()` in the page and
   reported 8 of 13 stops ringless — every one of them a false
   positive, because `:focus-visible` does NOT match a programmatic
   focus and every ring in this system is a `:focus-visible` rule.
   A guard that reports eight correct controls as broken is worse
   than no guard: it teaches you to ignore it, which is the exact
   failure `visual-qa` finding 4 records about `check-contrast`
   flagging nine `aria-hidden` separators.

   So the keyboard drives it, one real Tab at a time, and the ring
   is read off whatever the browser actually focused. */
const keyboard = await (async () => {
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined))
  const seen = []
  const noRing = []
  /* A generous ceiling: the stage has low tens of stops, and this
     stops a focus trap turning the sweep into an infinite loop. */
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab')
    /* A RING IS A CHANGE, not a shadow. The first draft passed any
       control with `box-shadow !== 'none'`, which every raised card
       and button has at rest — so a control with no ring at all
       would pass on the strength of its own elevation. The honest
       test is the difference between focused and not: read the
       focused element's outline and shadow, blur it, read them
       again, and compare. */
    const stop = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body || !(el instanceof HTMLElement)) return null
      const onStage = el.closest('.bs') !== null
      const read = () => {
        const cs = getComputedStyle(el)
        return `${cs.outlineStyle}|${cs.outlineWidth}|${cs.outlineColor}|${cs.boxShadow}`
      }
      const focused = read()
      /* `:focus-visible` only matches a keyboard focus, which is why
         this walk presses Tab rather than calling `.focus()` — and
         why the comparison has to be made while that focus is still
         live. Blur, read, then hand focus back so the walk carries
         on from where it was. */
      el.blur()
      const resting = read()
      el.focus()
      return { onStage, where: el.className || el.tagName, ring: focused !== resting }
    })
    if (!stop) break
    if (!stop.onStage) continue
    const key = `${stop.where}#${seen.length}`
    seen.push(key)
    if (!stop.ring) noRing.push(stop.where)
  }
  return { reached: seen.length, noRing }
})()

/* ---- report ----------------------------------------------- */
const pad = (s, n) => String(s).padEnd(n)
console.log('\nTHE REBUILT QUOTE SCREEN, MEASURED\n')
console.log(
  `  ${pad('theme', 7)}${pad('at', 10)}${pad('leaves', 8)}${pad('ratio', 8)}${pad('steps', 7)}${pad('contrast', 10)}${pad('mid-word', 10)}overflow`,
)
for (const r of rows) {
  console.log(
    `  ${pad(r.theme, 7)}${pad(r.at, 10)}${pad(r.leaves, 8)}${pad(`${r.ratio}x`, 8)}${pad(r.steps, 7)}${pad(r.contrastFails.length, 10)}${pad(r.midWord.length, 10)}${r.overflow.length}`,
  )
}

for (const r of rows) {
  if (r.contrastFails.length) {
    console.log(`\nCONTRAST — ${r.theme} ${r.at}:`)
    for (const f of r.contrastFails) console.log(`  ${pad(`${f.r}:1`, 9)}${pad(`${f.px}px`, 7)}"${f.text}" · ${f.where}`)
  }
  if (r.midWord.length) {
    console.log(`\nMID-WORD — ${r.theme} ${r.at}:`)
    for (const x of r.midWord) console.log(`  ${x.kind} ${x.at ?? ''} "${x.text}" · ${x.where}`)
  }
  if (r.overflow.length) {
    console.log(`\nHORIZONTAL OVERFLOW — ${r.theme} ${r.at}:`)
    for (const o of r.overflow) console.log(`  ${o.where} by ${o.by}px`)
  }
}

console.log(`\nKEYBOARD: ${keyboard.reached} stops on the stage, ${keyboard.noRing.length} with no ring`)
for (const k of keyboard.noRing) console.log(`  no ring: ${k}`)
bad += keyboard.noRing.length

/* SHOWROOM WANTS >= 6x, AND IT WANTS IT AT EVERY WIDTH. The old
   configurator measured 7.53x at 1280 and 3.17x at 1024 — the same
   screen, one width down, failing. */
const thin = rows.filter((r) => r.ratio < 6)
if (thin.length) {
  console.log(`\nSCALE CONTRAST UNDER 6x on ${thin.length} of ${rows.length}:`)
  for (const r of thin) console.log(`  ${r.theme} ${r.at} — ${r.ratio}x (${r.largest}px / ${r.smallest}px)`)
  bad += thin.length
}

if (thrown.length) {
  console.log(`\nPAGE ERRORS (${thrown.length}):`)
  for (const t of thrown) console.log(`  ${t}`)
  bad += thrown.length
}

console.log(bad === 0 ? '\nCLEAN\n' : `\n${bad} finding(s)\n`)
await browser.close()
process.exit(bad === 0 ? 0 : 1)
