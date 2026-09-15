/* ============================================================
   THE ENTRY, PHOTOGRAPHED — sign-in, the first run, and the wizard.

   Sign-in is the first thing the driver meets; the first run is what
   the demo account lands on, because that account carries its
   organisation and never meets the wizard. The wizard is drawn only
   when a business has no name — a fresh build, or a sheet cleared on
   purpose — and the shell restores the demo's organisation even then,
   so the driver asks for it by a hash (`#wizard`) the shell does NOT
   honour in the tree: to photograph the wizard, gate it on that hash
   in Shell.tsx for the run and take the line out before committing.
   The frames without it are honest — the driver says "no wizard
   field" and moves on.

     node tools/shot-entry.mjs out/entry 1440,834,430
   ============================================================ */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const ORIGIN = process.env.HL_ORIGIN ?? 'http://localhost:5090'
const out = process.argv[2] ?? 'out/entry'
const WIDTHS = (process.argv[3] ?? '1440,834,430').split(',').map(Number)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('pageerror', w, e.message))
  await page.goto(ORIGIN)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/signin-${w}.png` })
  await page.getByRole('button', { name: /demo account/i }).first().click()
  await page.getByRole('button', { name: /^Sign in$/ }).first().click()
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${out}/first-${w}.png` })
  await page.goto(ORIGIN + '/#wizard')
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${out}/onboarding-name-${w}.png` })
  const field = page.getByPlaceholder('Northside Marine')
  if (!(await field.count())) { console.log('no wizard field at', w, 'url', page.url(), 'h1:', await page.locator('h1').first().textContent().catch(() => '-')); await ctx.close(); continue }
  await field.fill('Northside Marine')
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/onboarding-typed-${w}.png` })
  await page.getByRole('button', { name: /^Continue/ }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/onboarding-kind-${w}.png` })
  await page.getByRole('button', { name: /^Back/ }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /saved copy/i }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/onboarding-file-${w}.png` })
  await ctx.close()
}
await browser.close()
console.log('entry photographed')
