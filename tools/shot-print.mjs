/* ============================================================
   THE QUOTATION AS PAPER — the one thing this app makes that
   leaves the building on a sheet.

   `quote.css` carries four `@media print` blocks and three `@page`
   rules, several hundred lines of them, and no harness in this
   repo had ever rendered the screen in print media. Every ruler
   here measures the SCREEN: `check-shots` photographs a viewport,
   `qa-responsive` walks widths, `check-contrast` composites
   grounds that only exist on a display. Paper is a different
   medium with a different ink, a different ground and a hard page
   break, and none of that had been looked at once.

       node tools/shot-print.mjs

   Writes `out/print/quote.pdf` at A4, plus a PNG of each page so
   the result can be looked at rather than opened. Backgrounds are
   PRINTED ON, deliberately: a dealer who prints this quote is
   told by their own browser whether to include them, and the
   `printBackground: false` case is the one the CSS already argues
   for elsewhere — this is the other one.
   ============================================================ */

import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { wait, settled, signInAndSeed } from './drive.mjs'

mkdirSync('out/print', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log(`  pageerror: ${String(e.message).slice(0, 90)}`))

await signInAndSeed(page)
await wait(page, 1500)
await page.getByRole('button', { name: /^Home/ }).first().click()
await wait(page, 1300)
await page.getByRole('button', { name: /New quote/ }).first().click()
await wait(page, 2200)
await page.locator('.qp-card').first().click()
await wait(page, 2400)
await page.locator('.pl-card').first().click()
await wait(page, 700)
await page.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
await wait(page, 2700)
const who = page.getByRole('button', { name: /Who it is for/ })
if (await who.count()) await who.first().click()
await wait(page, 1300)
await page.getByPlaceholder(/their name/i).fill('Mark McWilliams')
await page.getByPlaceholder(/their name/i).press('Tab')
await wait(page, 1100)
await page.getByRole('button', { name: /Give it to the customer/ }).click()
await wait(page, 2400)
await settled(page)

/* WHAT PRINT MEDIA ACTUALLY DOES TO THIS PAGE, measured rather
   than read off the stylesheet. `emulateMedia` switches the media
   query without leaving the page, so the same DOM can be asked
   both questions in one run. */
const inMedia = async (media) => {
  await page.emulateMedia({ media })
  await wait(page, 500)
  return page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        w: Math.round(r.width),
        fs: cs.fontSize,
        colour: cs.color,
        ground: cs.backgroundColor,
      }
    }
    return {
      doc: pick('.qt-doc'),
      model: pick('.qt-doc-marque-model'),
      photo: pick('.qt-doc-photo'),
      pic: pick('.qt-doc-pic'),
      rows: document.querySelectorAll('.qt-doc-line').length,
      /* anything the page hides on paper is a deliberate act and
         worth counting: chrome that would print as furniture */
      hidden: [...document.querySelectorAll('body *')].filter(
        (el) => getComputedStyle(el).display === 'none',
      ).length,
    }
  })
}

const screen = await inMedia('screen')
const paper = await inMedia('print')
console.log('\n  SCREEN', JSON.stringify(screen, null, 1))
console.log('\n  PRINT ', JSON.stringify(paper, null, 1))

/* PREFER THE CSS PAGE SIZE. The first draft passed A4 and a zero
   margin, which overrode the A4-portrait-at-14mm this stylesheet
   actually declares — so the PDF it made was not the one a dealer
   gets, and the right edge of the money box sat on the cut. A
   harness that overrides the thing it is measuring is measuring
   itself. */
await page.pdf({
  path: 'out/print/quote.pdf',
  preferCSSPageSize: true,
  printBackground: true,
})
console.log('\n  out/print/quote.pdf')

/* and a PNG of the paper, so it can be LOOKED at. `emulateMedia`
   is still on print, so this screenshot is the print rendering
   rather than the screen one. */
/* AND AT THE SIZE OF THE PAGE, not of a laptop.

   A4 portrait less the 14mm this stylesheet asks for is 182 x 269mm,
   which at 96dpi is 688 x 1017 CSS px — a number this file's own
   notes already carry, from an earlier run that caught a breakpoint
   firing on paper. Screenshotting a 1280 viewport in print media is
   not the page: it is the paper's INK laid out in a laptop's WIDTH,
   which is how the money box came to sit on the right edge in the
   first frame this driver ever took. */
await page.setViewportSize({ width: 688, height: 1017 })
await wait(page, 700)
await page.screenshot({ path: 'out/print/quote-paper.png', fullPage: true })
console.log('  out/print/quote-paper.png')

await browser.close()
