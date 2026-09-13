/* ============================================================
   FINISH A QUOTE, AND PHOTOGRAPH THE MOMENT IT LANDS.

   The completion card's whole point is the transition — the ring
   closing, the check drawing, the sweep crossing, the card
   settling — and a screenshot of a finished quote taken from a
   cold start shows NONE of it, by design: the card refuses to
   perform for somebody who did nothing. So this walks the build,
   answers every stop, and then takes frames THROUGH the landing.

       node tools/shot-complete.mjs
       node tools/shot-complete.mjs --at 430x932

   Frames land in `out/done/`. It prints what each stop did, so a
   quote that cannot be finished says which stop refused rather
   than producing a picture of a card at 4/5 labelled "complete".
   ============================================================ */

import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { wait, settled, signInAndSeed } from './drive.mjs'

const argv = process.argv.slice(2)
const at = argv.indexOf('--at') >= 0 ? argv[argv.indexOf('--at') + 1] : '1280x800'
const [W, H] = at.split('x').map(Number)
const PICK = Number(argv.indexOf('--pick') >= 0 ? argv[argv.indexOf('--pick') + 1] : 0)
const CARD = Number(argv.indexOf('--card') >= 0 ? argv[argv.indexOf('--card') + 1] : 0)

mkdirSync('out/done', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: W, height: H } })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log(`  pageerror: ${String(e.message).slice(0, 100)}`))

await signInAndSeed(page)
await wait(page, 1500)
await page.getByRole('button', { name: /^Home/ }).first().click()
await wait(page, 1300)
await page.getByRole('button', { name: /New quote/ }).first().click()
await wait(page, 2200)
await page.locator('.qp-card').nth(CARD).click()
await wait(page, 2400)
await page.locator('.pl-card').nth(PICK).click()
await wait(page, 800)
await page.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
await wait(page, 1800)
await settled(page)

const count = () => page.locator('.ui-done-count b, .ui-done-check').first().textContent().catch(() => '?')
const state = () =>
  page.evaluate(() => {
    const segs = [...document.querySelectorAll('.ui-done-seg')]
    return {
      of: segs.length,
      on: segs.filter((s) => s.classList.contains('is-on')).length,
      complete: document.querySelector('.ui-done')?.hasAttribute('data-complete') ?? false,
    }
  })

/* WALK EVERY STOP AND TAKE WHAT IT OFFERS. The last stop is the
   customer's name, which is a field and not a card — the one
   question no table can carry, which is exactly why it is a step. */
const stops = await page.locator('.ui-stepper-go').count()
for (let i = 0; i < stops; i += 1) {
  await page.locator('.ui-stepper-go').nth(i).click()
  await wait(page, 1200)
  const cand = page.locator('.bs-cand:not([data-on])')
  const field = page.locator('.bs-hand input, .bs-step input[type="text"]').first()
  if (await cand.count()) {
    await cand.first().click()
    await wait(page, 1400)
    console.log(`  stop ${i + 1}: picked  ${JSON.stringify(await state())}`)
  } else if (await field.count()) {
    await field.fill('Marina Bay Charters')
    await field.blur()
    await wait(page, 1400)
    console.log(`  stop ${i + 1}: named   ${JSON.stringify(await state())}`)
  } else {
    console.log(`  stop ${i + 1}: nothing on offer  ${JSON.stringify(await state())}`)
  }
}

const final = await state()
console.log(`\n  final ${JSON.stringify(final)} · count "${await count()}"`)

/* NOW THE LANDING ITSELF. Go back one stop, undo it, and put it
   back — which is a real gesture a dealer makes (change your mind
   about a motor) and the only honest way to see the transition. */
if (final.complete) {
  await page.screenshot({ path: `out/done/complete-${W}.png` })
  /* find a stop that HAS a decision to undo — the last stop is a
     name in a field, and a field is not a line you can take off */
  let off = page.locator('.bs-line-off').first()
  for (let i = stops - 1; i >= 0 && !(await off.count()); i -= 1) {
    await page.locator('.ui-stepper-go').nth(i).click()
    await wait(page, 1100)
    off = page.locator('.bs-line-off').first()
  }
  if (await off.count()) {
    await off.click()
    await wait(page, 1200)
    await page.screenshot({ path: `out/done/open-${W}.png` })
    const cand = page.locator('.bs-cand').first()
    /* frames THROUGH the landing: the press, then 120ms, 300ms,
       520ms and 900ms after it — the sweep, the ring, the check
       and the card at rest */
    await cand.click()
    for (const [ms, name] of [[120, 'a'], [300, 'b'], [520, 'c'], [900, 'd']]) {
      await page.waitForTimeout(ms === 120 ? 120 : 0)
      await page.screenshot({ path: 'out/done/land-' + name + '-' + W + '.png' })
      /* and the card on its own, because the thing being judged is
         56px across and a full screenshot is 1280 */
      await page.locator('.ui-done').screenshot({ path: 'out/done/card-' + name + '-' + W + '.png' }).catch(() => {})
      await page.locator('.ui-done-arc').screenshot({ path: 'out/done/arc-' + name + '-' + W + '.png' }).catch(() => {})
      if (ms !== 900) await page.waitForTimeout(ms === 120 ? 180 : 220)
    }
    console.log('  landing frames written')
  } else {
    console.log('  no line to take off — landing not photographed')
  }
}
await browser.close()
