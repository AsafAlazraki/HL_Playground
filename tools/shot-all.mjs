/* ============================================================
   PHOTOGRAPH EVERY SCREEN, FOR A PERSON RATHER THAN A GUARD.

   `check-shots.mjs` compares eleven screens against baselines and
   `qa-sweep.mjs` measures fourteen; neither leaves behind a set of
   pictures somebody can look through. This does exactly that and
   nothing else — no thresholds, no verdict.

       node tools/shot-all.mjs                 light, 1280x800
       node tools/shot-all.mjs --dark
       node tools/shot-all.mjs --at 1440x900

   Files land in `out/screens/`. It needs `npm run dev` up.
   ============================================================ */

import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { wait, settled, signInAndSeed } from './drive.mjs'

const argv = process.argv.slice(2)
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d
}
const [w, h] = arg('at', '1280x800').split('x').map(Number)
const DARK = argv.includes('--dark')
const OUT = join(process.cwd(), 'out', 'screens')

const rail = (p, name) => p.getByRole('button', { name }).first().click()
const fromHome = async (p, go) => {
  await rail(p, /^Home/)
  await wait(p, 1400)
  await go(p)
}
const quoteWalk = async (p, stopAt) => {
  await fromHome(p, async (q) => {
    await q.getByRole('button', { name: /New quote/ }).first().click()
    if (stopAt === 'picker') return
    await wait(q, 2100)
    await q.locator('.qp-card').first().click()
    if (stopAt === 'place') return
    await wait(q, 2300)
    await q.locator('.pl-card').first().click()
    await wait(q, 600)
    await q.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
  })
}

const STOPS = [
  ['01-home', async (p) => rail(p, /^Home/)],
  ['02-modules', async (p) => rail(p, /^Modules/)],
  ['03-data', async (p) => rail(p, /^Data/)],
  [
    '04-catalogue',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1500)
      await p.locator('.dt-open').filter({ hasText: 'Highfield Inflatables' }).first().click()
    },
  ],
  ['05-picker', async (p) => quoteWalk(p, 'picker')],
  ['06-place', async (p) => quoteWalk(p, 'place')],
  ['07-configurator', async (p) => quoteWalk(p, 'build')],
  [
    '08-document',
    async (p) => {
      await quoteWalk(p, 'build')
      await wait(p, 2700)
      const who = p.getByRole('button', { name: /Who it is for/ })
      if (await who.count()) await who.first().click()
      await wait(p, 1300)
      const name = p.getByPlaceholder(/their name/i)
      await name.fill('Mark McWilliams')
      await name.press('Tab')
      await wait(p, 1100)
      await p.getByRole('button', { name: /Give it to the customer/ }).click()
    },
  ],
  ['09-quotes', async (p) => rail(p, /^Quotes/)],
  ['10-customers', async (p) => rail(p, /^Customers/)],
  ['11-admin', async (p) => rail(p, /^Admin/)],
  [
    '12-rules',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1500)
      await p.getByRole('button', { name: /Rules/ }).first().click()
    },
  ],
  [
    '13-fitment',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1500)
      await p.getByRole('button', { name: /What fits what/ }).first().click()
    },
  ],
  [
    '14-review',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1500)
      await p.getByRole('button', { name: /Review/ }).first().click()
    },
  ],
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage()
page.on('pageerror', (e) => console.log(`  pageerror: ${String(e.message).slice(0, 120)}`))

try {
  await signInAndSeed(page)
  const dark = () =>
    page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  if (DARK) await dark()
  await wait(page, 1400)
  mkdirSync(OUT, { recursive: true })

  for (const [name, open] of STOPS) {
    try {
      await open(page)
      await wait(page, 2600)
      if (DARK) await dark()
      await wait(page, 400)
      await settled(page)
      /* THE WIDTH IS IN THE NAME UNLESS IT IS THE BASELINE, and
         that is not tidiness. Without it a run at 430 wrote over
         the 1280 set file for file — same names, no warning — and
         the "desktop" screenshots in a report were phones. */
      const at = w === 1280 && h === 800 ? '' : `-${w}`
      const file = join(OUT, `${name}${DARK ? '-dark' : ''}${at}.png`)
      await page.screenshot({ path: file })
      console.log(`  ${name}`)
    } catch (e) {
      console.log(`  ${name} — MISSED: ${String(e.message).split('\n')[0].slice(0, 60)}`)
    }
  }
  console.log(`\n  wrote to ${OUT}`)
} finally {
  await browser.close()
}
