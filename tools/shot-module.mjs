/* A MODULE'S WORKSPACE, PHOTOGRAPHED — every tab, from the kind's door on Home.
     HL_MODULE=Boats node tools/shot-module.mjs out/module 1440,1280 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { signInAndSeed, settled } from './drive.mjs'
const out = process.argv[2] ?? 'out/module'
const WIDTHS = (process.argv[3] ?? '1440,1280').split(',').map(Number)
const MODULE = process.env.HL_MODULE ?? 'Boats'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w >= 1400 ? 900 : 800 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('pageerror', w, e.message))
  await signInAndSeed(page)
  await page.locator('.fd-tile', { hasText: MODULE }).first().click()
  await page.waitForTimeout(1500)
  await settled(page)
  const tabs = await page.getByRole('tab').allTextContents()
  console.log('tabs', w, tabs.join(' | '))
  for (const t of tabs) {
    await page.getByRole('tab', { name: t }).first().click()
    await page.waitForTimeout(900)
    await settled(page)
    await page.screenshot({ path: `${out}/${MODULE.toLowerCase()}-${t.toLowerCase().replace(/\W+/g, '-')}-${w}.png` })
  }
  await ctx.close()
}
await browser.close()
console.log('module photographed')
