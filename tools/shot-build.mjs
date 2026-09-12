/* ============================================================
   DRIVE THE REBUILT QUOTE FLOW, AND PHOTOGRAPH IT.

   `check-shots.mjs` guards the SHIPPED screens against drift. This
   one is for the screen being built: it signs in, loads the real
   Northside seed, mints a quote the way a dealer does, opens it
   with the rebuild's switch on, and writes a picture.

   WHY IT EXISTS RATHER THAN A BROWSER LEFT OPEN. A long-lived dev
   browser accumulates module state across HMR cycles, and a screen
   that fails in it and passes in a fresh profile tells you nothing
   about the code — which is exactly the confusion that produced
   this file. Every run here starts from an empty profile, so what
   it shows is what a person opening the app would see.

       node tools/shot-build.mjs                 one shot, 1440x900
       node tools/shot-build.mjs --at 1280x800   another width
       node tools/shot-build.mjs --cold 10       N cold loads, counted
       node tools/shot-build.mjs --old           the shipped screen

   It needs `npm run dev` up. `HL_ORIGIN` overrides the origin, so
   the same script can be pointed at a preview build — which is the
   only honest place to take a performance number.
   ============================================================ */

import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ORIGIN = process.env.HL_ORIGIN ?? 'http://localhost:5090'
const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
const has = (name) => argv.includes(`--${name}`)

const [w, h] = arg('at', '1440x900').split('x').map(Number)
const COLD = Number(arg('cold', '0'))
const BUILD = has('old') ? 'old' : 'new'
const OUT = join(process.cwd(), 'out', 'build')

const wait = (p, ms) => p.waitForTimeout(ms)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: w, height: h } })
const page = await ctx.newPage()

/* A page error is a finding, not noise — it is the difference
   between "the screen looks wrong" and "the screen threw". */
const thrown = []
page.on('pageerror', (e) => thrown.push(String(e.message)))

try {
  await page.goto(ORIGIN)

  /* Sign in. The demo button FILLS the form; it does not submit. */
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await wait(page, 900)
  }

  /* The real seed, so this is a picture of the product and not of
     an empty state. */
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) {
    await load.first().click()
    await wait(page, 4000)
  }

  /* Mint a quote the way a dealer does: New quote -> a place -> a
     row -> Start. Nothing is inserted behind the app's back, so a
     break anywhere in that path is a break this script reports. */
  await page.getByRole('button', { name: /New quote/ }).first().click()
  await wait(page, 1200)
  await page.locator('[aria-label*="places you can quote from" i] button').first().click()
  await wait(page, 1400)
  await page.getByRole('option').first().click()
  await wait(page, 900)
  await page.getByRole('button', { name: /Start the quote|Back to the quote/ }).first().click()
  await wait(page, 1800)

  const id = new globalThis.URL(page.url()).searchParams.get('id')
  if (!id) throw new Error('no quote was minted — the path to one is broken')
  const at = `${ORIGIN}/?at=quote&id=${id}#build=${BUILD}`
  console.log(`quote ${id} · ${BUILD} · ${w}x${h}`)

  /* COLD LOADS, COUNTED. A race that resolves once proves nothing,
     and "That quote is no longer here" on a quote's own URL is the
     shape the persistence seam failed in. */
  if (COLD > 0) {
    let found = 0
    let dead = 0
    for (let i = 0; i < COLD; i++) {
      await page.goto('about:blank')
      await page.goto(at)
      await wait(page, 2200)
      const ok = await page.evaluate(() => Boolean(document.querySelector('.bs, .qb-scroll')))
      const gone = await page.evaluate(() => document.body.innerText.includes('no longer here'))
      if (ok) found++
      if (gone) dead++
      process.stdout.write(ok ? '.' : gone ? 'X' : '?')
    }
    console.log(`\n  ${found}/${COLD} found · ${dead} said "no longer here"`)
    if (found < COLD) process.exitCode = 1
  }

  await page.goto(at)
  await wait(page, 2600)

  /* What is actually on the screen, read back rather than assumed. */
  const read = await page.evaluate(() => {
    const txt = (s) => document.querySelector(s)?.textContent?.trim() ?? null
    const cards = [...document.querySelectorAll('.bs-cand')]
    return {
      screen: document.querySelector('.bs') ? 'rebuilt' : 'shipped',
      marque: txt('.bs-marque'),
      trim: txt('.bs-trim'),
      total: txt('.ui-pricebar-now'),
      excl: txt('.ui-pricebar-ex'),
      unpriced: txt('.ui-pricebar-unpriced'),
      stops: [...document.querySelectorAll('.ui-stepper-name')].map((n) => n.textContent),
      open: txt('.bs-pane-num'),
      cards: cards.length,
      withPhoto: cards.filter((c) => c.querySelector('.bs-cand-img')).length,
      facts: cards.reduce((n, c) => n + c.querySelectorAll('.bs-cand-fact').length, 0),
    }
  })
  console.log(JSON.stringify(read, null, 2))

  /* ============================================================
     NOTHING TRUNCATES MID-WORD — computed, not eyeballed.

     `DESIGN_SYSTEM.md` §4 allows a clamp to two lines with the
     whole string still in the DOM, and forbids a cut that lands
     inside a word: a proper noun or a part number is the one kind
     of string a truncation cannot be read through. The visual QA
     of 2026-09-09 found the app's only one on a name — "Alazr |
     aki" — and a first draft of `stepper.css` put another on
     "Administration" hours after the rule was written.

     A `Range` walks the text character by character and reports
     the first cut where the characters either side are both word
     characters. Same ruler the sweep used.
     ============================================================ */
  const midWord = await page.evaluate(() => {
    const bad = []
    const leaves = [...document.querySelectorAll('*')].filter(
      (el) => el.children.length === 0 && (el.textContent ?? '').trim().length > 1,
    )
    for (const el of leaves) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const node = el.firstChild
      if (!node || node.nodeType !== 3) continue
      const text = node.textContent ?? ''

      /* A clipped single line: does the ellipsis land inside a word? */
      if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) {
        bad.push({ kind: 'clip', text: text.trim().slice(0, 44), where: el.className })
        continue
      }

      let prevTop = null
      for (let i = 0; i < text.length; i++) {
        const r = document.createRange()
        r.setStart(node, i)
        r.setEnd(node, i + 1)
        const b = r.getBoundingClientRect()
        if (b.width === 0) continue
        if (prevTop !== null && b.top > prevTop + 1) {
          const before = text[i - 1] ?? ''
          const after = text[i] ?? ''
          if (/\w/.test(before) && /\w/.test(after)) {
            bad.push({
              kind: 'break',
              text: text.trim().slice(0, 44),
              at: `${before}|${after}`,
              where: el.className,
            })
          }
        }
        prevTop = b.top
      }
    }
    return { checked: leaves.length, bad }
  })

  if (midWord.bad.length) {
    console.log(`\nMID-WORD (${midWord.bad.length} of ${midWord.checked} leaves):`)
    for (const b of midWord.bad) {
      console.log(`  ${b.kind} ${b.at ?? ''} "${b.text}" · ${b.where}`)
    }
    process.exitCode = 1
  } else {
    console.log(`nothing truncates mid-word · ${midWord.checked} text leaves checked`)
  }

  mkdirSync(OUT, { recursive: true })
  const file = join(OUT, `build-${BUILD}-${w}x${h}.png`)
  await page.screenshot({ path: file })
  console.log(`wrote ${file}`)

  if (thrown.length) {
    console.log(`\nPAGE ERRORS (${thrown.length}):`)
    for (const t of thrown) console.log(`  ${t}`)
    process.exitCode = 1
  }
} finally {
  await browser.close()
}
