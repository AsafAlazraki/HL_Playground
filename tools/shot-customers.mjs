/* ============================================================
   THE CUSTOMERS REGISTER WITH PEOPLE ON IT.

   The seed carries no customer register, so every photograph of
   the Customers screen was of its empty state. This creates the
   register, issues one quote to a named person, types two more
   people in through the screen's own form, and photographs the
   list at 1440 and 834 into out/one/customers-*.png.

       HL_ORIGIN=http://localhost:5093 node tools/shot-customers.mjs
   ============================================================ */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { wait, signInAndSeed, door } from './drive.mjs'
mkdirSync('out/one', { recursive: true })
const b = await chromium.launch({ channel: 'chrome' })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
p.on('pageerror', (e) => console.log('pageerror', e.message))
await signInAndSeed(p)
await door(p, /^Customers/); await wait(p, 1200)
const create = p.getByRole('button', { name: /Create the Customers table/ })
if (await create.count()) { await create.click(); await wait(p, 1500) }
/* a quote to a named person, so somebody on the register is quoted */
await door(p, /^Home/); await wait(p, 1200)
await p.locator('.fd').getByRole('button', { name: /New quote/ }).first().click(); await wait(p, 2100)
await p.locator('.qp-card').first().click(); await wait(p, 2300)
await p.locator('.pl-card').filter({ hasText: 'SP560' }).first().click(); await wait(p, 900)
await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).click(); await wait(p, 2700)
const name = p.getByPlaceholder(/their name/i); await name.fill('Mark McWilliams'); await name.press('Tab'); await wait(p, 1100)
await p.getByRole('button', { name: /Give it to the customer/ }).click(); await wait(p, 2200)
/* two more, typed */
const people = [['Jenna Okafor', '0412 338 902', 'jenna.okafor@example.com'], ['Tom Reilly', '0400 117 654', 'tom@reillymarine.com.au']]
for (const [who, phone, mail] of people) {
  await door(p, /^Customers/); await wait(p, 1200)
  const add = p.getByRole('button', { name: /New customer|Add somebody|Add a customer|Add the first/ }).first(); console.log('add button:', await add.textContent().catch(() => 'none')); await add.click(); await wait(p, 1200)
  const fill = async (label, value) => { const f = p.getByLabel(label, { exact: false }).first(); if (await f.count()) { await f.fill(value); await f.press('Tab'); await wait(p, 300) } else console.log('no field', label) }
  await fill('Name', who); await fill('Phone', phone); await fill('Email', mail)
  await wait(p, 600)
}
await door(p, /^Customers/); await wait(p, 1500)
console.log('rows:', await p.locator('.cx-row').count(), 'marks:', await p.locator('.cx-row-mark').evaluateAll((es) => es.map((e) => e.textContent.trim())))
await p.screenshot({ path: 'out/one/customers-1440.png' })
await p.setViewportSize({ width: 834, height: 900 }); await wait(p, 900)
await p.screenshot({ path: 'out/one/customers-834.png' })
await b.close()
