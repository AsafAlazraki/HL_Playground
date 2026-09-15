/* THE SHEET, PHOTOGRAPHED — the register of rows under a catalogue.
     node tools/shot-sheet.mjs out/sheet 1440,1280   (HL_PLACE picks the brand) */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { signInAndSeed, settled, door } from './drive.mjs'
const out = process.argv[2] ?? 'out/sheet'
const PLACE = process.env.HL_PLACE ?? 'Highfield Inflatables'
const WIDTHS = (process.argv[3] ?? '1440,1280').split(',').map(Number)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w >= 1400 ? 900 : 800 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('pageerror', w, e.message))
  await signInAndSeed(page)
  /* Highfield's catalogue from the brand shelf, then its sheet — the
     588-variant, 56-column case the density complaint was measured on */
  await door(page, /^Data/)
  await page.waitForTimeout(1600)
  await page.locator('.dt-open').filter({ hasText: PLACE }).first().click()
  await page.waitForTimeout(1500)
  await settled(page)
  await page.screenshot({ path: `${out}/catalogue-${w}.png` })
  const open = page.getByRole('button', { name: /^Open the sheet$/ })
  if (await open.count()) await open.first().click()
  else await page.getByRole('button', { name: /^List$/ }).first().click()
  await page.waitForTimeout(1500)
  await settled(page)
  await page.screenshot({ path: `${out}/sheet-${w}.png` })
  /* THE COCKPIT RULER: data rows fully inside the scroller, and what
     sits above the first one */
  const m = await page.evaluate(() => {
    const sc = document.querySelector('.tb-scroll')
    if (!sc) return null
    const box = sc.getBoundingClientRect()
    const rows = [...document.querySelectorAll('.tb-row')].filter((r) => { const b = r.getBoundingClientRect(); return b.top >= box.top && b.bottom <= box.bottom })
    const first = document.querySelector('.tb-row')?.getBoundingClientRect()
    const groups = [...document.querySelectorAll('.tb-grpline')].filter((r) => { const b = r.getBoundingClientRect(); return b.top >= box.top && b.bottom <= box.bottom })
    return { rows: rows.length, groups: groups.length, firstRowTop: first ? Math.round(first.top) : null, scrollerTop: Math.round(box.top), viewport: [innerWidth, innerHeight] }
  })
  console.log('density', w, JSON.stringify(m))
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/sheet-${w}-scrolled.png` })
  await ctx.close()
}
await browser.close()
console.log('sheet photographed')
