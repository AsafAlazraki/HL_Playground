/* A MODULE'S QUOTES TAB, PHOTOGRAPHED — empty, and then with one quote
   raised THROUGH THE APP (the picker, a place, Start the quote): a
   harness pressing real controls, never a seeded row.
     node tools/shot-mquotes.mjs out/module 1440 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { signInAndSeed, settled, door } from './drive.mjs'
const out = process.argv[2] ?? 'out/module'
const WIDTHS = (process.argv[3] ?? '1440').split(',').map(Number)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w >= 1400 ? 900 : 800 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('pageerror', w, e.message))
  await signInAndSeed(page)
  /* empty: no quote has been raised from Boats */
  await page.locator('.fd-tile', { hasText: 'Boats' }).first().click()
  await page.waitForTimeout(1200)
  await page.getByRole('tab', { name: 'Quotes' }).first().click()
  await page.waitForTimeout(800)
  await settled(page)
  await page.screenshot({ path: `${out}/mquotes-empty-${w}.png` })
  /* raise one, through the app */
  await door(page, /^Home/)
  await page.waitForTimeout(600)
  await page.locator('.fd').getByRole('button', { name: /New quote/ }).first().click()
  await page.waitForTimeout(1500)
  await page.locator('.qp-card').filter({ hasText: 'Stacer' }).first().click()
  await page.waitForTimeout(2300)
  await page.locator('.pl-card').first().click()
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
  await page.waitForTimeout(2000)
  /* back to the module */
  await door(page, /^Home/)
  await page.waitForTimeout(800)
  await page.locator('.fd-tile', { hasText: 'Boats' }).first().click()
  await page.waitForTimeout(1200)
  await page.getByRole('tab', { name: 'Quotes' }).first().click()
  await page.waitForTimeout(800)
  await settled(page)
  await page.screenshot({ path: `${out}/mquotes-one-${w}.png` })
  console.log('quotes tab photographed', w)
  await ctx.close()
}
await browser.close()
