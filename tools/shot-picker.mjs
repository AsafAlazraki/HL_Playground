/* ============================================================
   DRIVE THE SHOWROOM ENTRY PATH, AND MEASURE IT.

   Choose a place, choose a model, start a quote — one act in three
   screens, driven in one run because a screen that measures
   perfectly and does not lead to the next one has not been tested.
   What each screen is measured on:

     ratio      >=6x, which is what SHOWROOM requires
     steps      how much of the ten-step ramp is in use
     heights    how many distinct card heights are on the screen
     photos     how many cards carry a picture, and of what kind

   HEIGHTS IS THE ONE THAT KEEPS REGRESSING. The shipped picker
   drew six (72 · 108 · 134 · 144 · 170 · 207); the first rebuilt
   draft drew nine, because `grid-auto-rows: 1fr` equalises within
   ONE grid and every module heading starts another. A number, not
   a look, is the only way that stays fixed.

       node tools/shot-picker.mjs                 1280x800, rebuilt
       node tools/shot-picker.mjs --at 1440x900
       node tools/shot-picker.mjs --old           the shipped picker

   `--old` stops after the picker: the place screen it opens is the
   shipped one, which `check-shots` already photographs.

   It needs `npm run dev` up.
   ============================================================ */

import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ORIGIN, wait, signInAndSeed, midWord, sayMidWord, ramp } from './drive.mjs'

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
const BUILD = argv.includes('--old') ? 'old' : 'new'
const [w, h] = arg('at', '1280x800').split('x').map(Number)
const OUT = join(process.cwd(), 'out', 'build')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: w, height: h } })
const page = await ctx.newPage()

const thrown = []
page.on('pageerror', (e) => thrown.push(String(e.message)))

try {
  await signInAndSeed(page)

  /* The switch is on the hash, because `src/app/url.ts` owns the
     query string and strips anything its address table does not
     know. `rebuilt.ts` carries that measurement. */
  await page.goto(`${ORIGIN}/#build=${BUILD}`)
  await wait(page, 1200)
  await page.getByRole('button', { name: /New quote/ }).first().click()
  await wait(page, 2200)

  const read = await page.evaluate(() => {
    const rebuilt = Boolean(document.querySelector('.qp'))
    const cards = [...document.querySelectorAll(rebuilt ? '.qp-cell' : '.qs-card, .qs-grid > li')]
    const heights = cards.map((c) => Math.round(c.getBoundingClientRect().height))
    return {
      rebuilt,
      cards: cards.length,
      cardHeights: [...new Set(heights)].sort((a, b) => a - b),
      withPhoto: cards.filter((c) => c.querySelector('img')).length,
      withPlate: cards.filter((c) => c.querySelector('.qp-plate')).length,
      groups: document.querySelectorAll(rebuilt ? '.qp-group' : '.qs-group').length,
    }
  })

  console.log(JSON.stringify({ ...read, ...(await ramp(page)) }, null, 2))

  /* EVERY CARD THE SAME HEIGHT is the claim the stylesheet makes in
     a paragraph. This is the number that holds it to it. */
  if (read.rebuilt && read.cardHeights.length !== 1) {
    console.log(`\nRAGGED — ${read.cardHeights.length} card heights: ${read.cardHeights.join(' · ')}`)
    process.exitCode = 1
  }

  if (!sayMidWord(await midWord(page))) process.exitCode = 1

  mkdirSync(OUT, { recursive: true })
  const file = join(OUT, `picker-${BUILD}-${w}x${h}.png`)
  await page.screenshot({ path: file })

  /* AND THE FOOT OF IT. `fullPage` photographs the document, and
     this screen scrolls inside the stage rather than the document —
     so a full-page shot of it is the first viewport with more white
     underneath, and the rows at the bottom (the places that cannot
     start a quote) are never in the picture. */
  await page.evaluate(() => {
    const el = document.querySelector('.qp') ?? document.scrollingElement
    el.scrollTop = el.scrollHeight
  })
  await wait(page, 700)
  const foot = join(OUT, `picker-${BUILD}-${w}x${h}-foot.png`)
  await page.screenshot({ path: foot })
  console.log(`wrote ${file}\nwrote ${foot}`)

  /* AND THE CARD OPENS THE PLACE — driven last, because it navigates
     away. A grid that measures perfectly and goes nowhere is the dead
     control this screen was rebuilt to stop drawing. */
  await page.evaluate(() => {
    const el = document.querySelector('.qp') ?? document.scrollingElement
    el.scrollTop = 0
  })
  await page.locator('.qp-card, .qs-grid button').first().click()
  await wait(page, 1600)
  const opened = await page.evaluate(() => ({
    rows: document.querySelectorAll('[role="option"]').length,
    models: document.querySelectorAll('.pl-cell').length,
    heading: document.querySelector('h1, h2')?.textContent?.trim().slice(0, 40) ?? null,
  }))
  if (opened.rows > 0 || opened.models > 0) {
    console.log(
      `the first card opens its place · ${opened.models || opened.rows} ${opened.models ? 'models' : 'rows'} offered`,
    )
  } else {
    console.log(`DEAD — the first card led nowhere (heading "${opened.heading}")`)
    process.exitCode = 1
  }

  /* ============================================================
     AND THE PLACE SCREEN, ON THE SAME RUN.

     It is the second half of one act — choose a place, choose a
     model — and the screen where the 588-variant problem lives. The
     shipped one opens Highfield onto seven rows of ONE boat at one
     price under "the first 50 are drawn"; the rebuilt one folds
     604 rows into models and puts the finishes in the bar. Same
     three numbers as above: ramp, card heights, photographs.
     ============================================================ */
  if (BUILD === 'new') {
    const place = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.pl-cell')]
      const hs = cells.map((c) => Math.round(c.getBoundingClientRect().height))
      return {
        cards: cells.length,
        cardHeights: [...new Set(hs)].sort((a, b) => a - b),
        withPhoto: cells.filter((c) => c.querySelector('img')).length,
        series: document.querySelectorAll('.pl-series').length,
      }
    })
    console.log('\nplace: ' + JSON.stringify({ ...place, ...(await ramp(page)) }))
    if (place.cardHeights.length !== 1) {
      console.log(`RAGGED — ${place.cardHeights.length} model heights: ${place.cardHeights.join(' · ')}`)
      process.exitCode = 1
    }
    if (!sayMidWord(await midWord(page))) process.exitCode = 1

    const shot = join(OUT, `place-${w}x${h}.png`)
    await page.screenshot({ path: shot })
    console.log(`wrote ${shot}`)

    /* AND IT MINTS. The whole path is only worth measuring if it
       ends in a quote — a screen that chooses beautifully and
       cannot start one is the dead control, one step along. */
    await page.locator('.pl-card').first().click()
    await wait(page, 500)
    await page.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
    await wait(page, 2400)
    const minted = await page.evaluate(() => ({
      id: new URL(window.location.href).searchParams.get('id'),
      screen: document.querySelector('.bs') ? 'rebuilt build' : document.querySelector('.qb-scroll') ? 'shipped build' : null,
    }))
    if (minted.id && minted.screen) {
      console.log(`picking one starts a quote · ${minted.id} · ${minted.screen}`)
    } else {
      console.log('DEAD — "Start the quote" minted nothing')
      process.exitCode = 1
    }
  }

  if (thrown.length) {
    console.log(`\nPAGE ERRORS (${thrown.length}):`)
    for (const t of thrown) console.log(`  ${t}`)
    process.exitCode = 1
  }
} finally {
  await browser.close()
}
