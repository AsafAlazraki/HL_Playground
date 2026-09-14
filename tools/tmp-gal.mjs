import { chromium } from 'playwright-core'
import { wait, settled, signInAndSeed, door } from './drive.mjs'
import { mkdirSync } from 'node:fs'
mkdirSync('out/gal2', { recursive: true })
const nq = (p) => p.locator('.fd').getByRole('button', { name: /New quote/ }).first().click()
const toCfg = async (p) => {
  await door(p, /^Home/); await wait(p, 1200); await nq(p); await wait(p, 2100)
  await p.locator('.qp-card').first().click(); await wait(p, 2300)
  await p.locator('.pl-card').first().click(); await wait(p, 700)
  await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
}
const toDoc = async (p) => {
  await toCfg(p); await wait(p, 2700)
  const w = p.getByRole('button', { name: /Who it is for/ })
  if (await w.count()) await w.first().click()
  await wait(p, 1300)
  const n = p.getByPlaceholder(/their name/i)
  await n.fill('Mark McWilliams'); await n.press('Tab'); await wait(p, 1100)
  await p.getByRole('button', { name: /Give it to the customer/ }).click()
}
const STOPS = [
  ['home', async (p) => door(p, /^Home/)],
  ['modules', async (p) => door(p, /^Modules/)],
  ['moduledash', async (p) => { await door(p, /^Modules/); await wait(p, 1600); await p.locator('.mo-face').first().click(); await wait(p, 1400); await p.getByRole('tab', { name: 'Dashboard' }).first().click() }],
  ['catalogue', async (p) => { await door(p, /^Data/); await wait(p, 1600); await p.locator('.dt-open').filter({ hasText: 'Highfield Inflatables' }).first().click() }],
  ['register', async (p) => { await door(p, /^Data/); await wait(p, 1600); await p.locator('.dt-open').filter({ hasText: 'Highfield Inflatables' }).first().click(); await wait(p, 2000); const l = p.getByRole('button', { name: /^List$/ }); if (await l.count()) await l.first().click() }],
  ['picker', async (p) => { await door(p, /^Home/); await wait(p, 1200); await nq(p) }],
  ['place', async (p) => { await door(p, /^Home/); await wait(p, 1200); await nq(p); await wait(p, 2100); await p.locator('.qp-card').first().click() }],
  ['configurator', toCfg],
  ['document', toDoc],
  ['board', async (p) => { await toDoc(p); await wait(p, 2200); await door(p, /^Quotes/) }],
  ['data', async (p) => door(p, /^Data/)],
  ['rules', async (p) => { await door(p, /^Data/); await wait(p, 1500); await p.getByRole('button', { name: /^Rules/ }).first().click() }],
  ['fitment', async (p) => { await door(p, /^Data/); await wait(p, 1500); await p.getByRole('button', { name: /What fits what/ }).first().click() }],
  ['review', async (p) => { await door(p, /^Data/); await wait(p, 1500); await p.getByRole('button', { name: /^Review/ }).first().click() }],
  ['admin', async (p) => door(p, /^Admin/)],
  ['customers', async (p) => door(p, /^Customers/)],
]
const b = await chromium.launch({ channel: 'chrome', headless: true })
for (const [name, open] of STOPS) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  const thrown = []
  p.on('pageerror', (e) => thrown.push(String(e.message)))
  try {
    await signInAndSeed(p); await wait(p, 1500)
    await open(p); await wait(p, 2600); await settled(p)
    await p.screenshot({ path: `out/gal2/${name}.png` })
    console.log(name, 'ok' + (thrown.length ? ' · pageerror ' + thrown[0].slice(0, 60) : ''))
  } catch (e) { console.log(name, 'FAILED ·', String(e.message).slice(0, 70)) }
  await ctx.close()
}
await b.close()
