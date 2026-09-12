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

   The picker has its own: `tools/shot-picker.mjs`.

   It needs `npm run dev` up. `HL_ORIGIN` overrides the origin, so
   the same script can be pointed at a preview build — which is the
   only honest place to take a performance number.
   ============================================================ */

import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ORIGIN, wait, signInAndSeed, midWord, sayMidWord } from './drive.mjs'

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

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: w, height: h } })
const page = await ctx.newPage()

/* A page error is a finding, not noise — it is the difference
   between "the screen looks wrong" and "the screen threw". */
const thrown = []
page.on('pageerror', (e) => thrown.push(String(e.message)))

try {
  await signInAndSeed(page)

  /* ============================================================
     MINT A QUOTE THE WAY A DEALER DOES: New quote -> a place -> a
     model -> Start. Nothing is inserted behind the app's back, so a
     break anywhere in that path is a break this script reports.

     AND IT WALKS WHICHEVER PICKER IS UP. This drove the shipped one
     by its `aria-label` and stopped working the day the rebuilt
     screens became the default — the harness for the configurator
     failed at the FIRST step, thirty seconds of timeout, with
     nothing wrong with the configurator. A driver pinned to one of
     two screens is a driver that reports on the wrong thing.
     ============================================================ */
  await page.getByRole('button', { name: /New quote/ }).first().click()
  await wait(page, 2000)

  const rebuiltPicker = await page.locator('.qp-card').count()
  if (rebuiltPicker > 0) {
    await page.locator('.qp-card').first().click()
    await wait(page, 2300)
    await page.locator('.pl-card').first().click()
    await wait(page, 600)
  } else {
    await page.locator('[aria-label*="places you can quote from" i] button').first().click()
    await wait(page, 1400)
    await page.getByRole('option').first().click()
    await wait(page, 900)
  }
  await page.getByRole('button', { name: /Start the quote|Back to the quote/ }).first().click()
  await wait(page, 2200)

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

  const found = await midWord(page)
  if (!sayMidWord(found)) process.exitCode = 1

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
