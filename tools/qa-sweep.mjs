/* ============================================================
   THE SCOREBOARD, GENERATED.

   `docs/research/visual-qa-2026-09-09.md` measured twelve screens
   by hand and became the document the rebuild is answering. This
   walks every screen the app has, in both themes, and prints the
   same four numbers for each — so the scoreboard is re-run rather
   than re-typed, and a claim in a commit message can be checked.

       node tools/qa-sweep.mjs                  1280x800, both themes
       node tools/qa-sweep.mjs --at 1024x768
       node tools/qa-sweep.mjs --light          skip the dark pass

   WHAT IS MEASURED, and every ruler is `tools/drive.mjs`'s so all
   three harnesses report the same numbers:

     register  what the screen declares. NONE is a finding: a screen
               that does not say which register it is in has not been
               designed for either.
     ratio     largest visible type over smallest. SHOWROOM wants
               >=6x, COCKPIT 2.5-3.2x — and Cockpit going DOWN is the
               screen passing, not failing.
     steps     how many distinct sizes are in use. The 2026-09-09
               sweep found four on eleven of twelve screens.
     thin      text leaves under 4.5:1, composited against the ground
               they are actually drawn on.
     cut       strings truncated mid-word, ellipsis or hard clip.

   It needs `npm run dev` up — and a dev server that has been
   RESTARTED since any structural edit. Vite serves partial
   transforms after one, and this harness has reported three
   screens as broken that were not. CLAUDE.md carries that.
   ============================================================ */

import { chromium } from 'playwright-core'
import { wait, signInAndSeed, midWord, ramp, contrast } from './drive.mjs'

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
const [w, h] = arg('at', '1280x800').split('x').map(Number)
const THEMES = argv.includes('--light') ? ['light'] : ['light', 'dark']

/* Every stop, and how to reach it from wherever the last one left
   off. `home` re-enters through the rail, so the order is the
   order a person could actually walk. */
const rail = (p, name) => p.getByRole('button', { name }).first().click()

/* EVERY STOP STARTS FROM HOME, and that is not tidiness. Walked in
   sequence, the three quote stops each press New quote — and from
   inside the picker that RAISES the window already open rather than
   opening a new one, so the next stop never moved and reported
   UNREACHED. A stop that depends on where the last one finished is
   a stop that fails for a reason that has nothing to do with it. */
const fromHome = async (p, go) => {
  await p.getByRole('button', { name: /^Home/ }).first().click()
  await wait(p, 1400)
  await go(p)
}

const STOPS = [
  ['home', '.fd', async (p) => rail(p, /^Home/)],
  ['modules', '.mo', async (p) => rail(p, /^Modules/)],
  ['data', '.dt', async (p) => rail(p, /^Data/)],
  [
    'catalogue',
    '.ct',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1500)
      await p.locator('.dt-open').filter({ hasText: 'Highfield Inflatables' }).first().click()
    },
  ],
  ['quotes', '.qz', async (p) => rail(p, /^Quotes/)],
  ['customers', '.cx-root', async (p) => rail(p, /^Customers/)],
  ['admin', '.ad', async (p) => rail(p, /^Admin/)],
  [
    'rules',
    '.cn-root',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1500)
      await p.getByRole('button', { name: /Rules/ }).first().click()
    },
  ],
  [
    'fitment',
    '.shell-flowstage',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1500)
      await p.getByRole('button', { name: /What fits what/ }).first().click()
    },
  ],
  [
    'review',
    '.rw',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1500)
      await p.getByRole('button', { name: /Review/ }).first().click()
    },
  ],
  [
    'picker',
    '.qp',
    async (p) => {
      await fromHome(p, async (q) => {
        await q.getByRole('button', { name: /New quote/ }).first().click()
      })
    },
  ],
  [
    'place',
    '.pl',
    async (p) => {
      await fromHome(p, async (q) => {
        await q.getByRole('button', { name: /New quote/ }).first().click()
        await wait(q, 2100)
        await q.locator('.qp-card').first().click()
      })
    },
  ],
  [
    'configurator',
    '.bs',
    async (p) => {
      await fromHome(p, async (q) => {
        await q.getByRole('button', { name: /New quote/ }).first().click()
        await wait(q, 2100)
        await q.locator('.qp-card').first().click()
        await wait(q, 2300)
        await q.locator('.pl-card').first().click()
        await wait(q, 600)
        await q.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
      })
    },
  ],
  [
    'document',
    '.qt-doc',
    async (p) => {
      await fromHome(p, async (q) => {
        await q.getByRole('button', { name: /New quote/ }).first().click()
        await wait(q, 2100)
        await q.locator('.qp-card').first().click()
        await wait(q, 2300)
        await q.locator('.pl-card').first().click()
        await wait(q, 600)
        await q.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
      })
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
]

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let bad = 0

for (const theme of THEMES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  const thrown = []
  page.on('pageerror', (e) => thrown.push(String(e.message)))

  await signInAndSeed(page)
  if (theme === 'dark') {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  }
  await wait(page, 1400)

  console.log(`\n  ${theme.toUpperCase()} · ${w}x${h}`)
  console.log('  screen        register   ratio  steps  thin  cut')

  for (const [name, sure, open] of STOPS) {
    try {
      await open(page)
      await wait(page, 2600)
      if (theme === 'dark') {
        await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
      }
      const there = await page.locator(sure).count()
      if (!there) {
        console.log(`  ${name.padEnd(13)} UNREACHED — no ${sure}`)
        bad += 1
        continue
      }
      const r = await ramp(page)
      const c = await contrast(page, sure)
      const m = await midWord(page)
      const reg = await page.evaluate(
        () => document.querySelector('[data-register]')?.getAttribute('data-register') ?? 'NONE',
      )
      console.log(
        `  ${name.padEnd(13)} ${String(reg).padEnd(10)} ${String(r.ratio).padEnd(6)} ${String(r.steps).padEnd(6)} ${String(c.thin.length).padEnd(5)} ${m.bad.length}`,
      )
      if (reg === 'NONE') bad += 1
      if (c.thin.length || m.bad.length) bad += 1
      for (const t of c.thin.slice(0, 3)) {
        console.log(`                 ${t.r}:1 ${t.px}px "${t.text}" · ${t.where}`)
      }
      for (const t of m.bad.slice(0, 3)) {
        console.log(`                 ${t.kind} "${t.text}" · ${t.where}`)
      }
    } catch (e) {
      console.log(`  ${name.padEnd(13)} UNREACHED — ${String(e.message).split('\n')[0].slice(0, 60)}`)
      bad += 1
    }
  }

  if (thrown.length) {
    console.log(`\n  PAGE ERRORS (${thrown.length}):`)
    for (const t of [...new Set(thrown)].slice(0, 5)) console.log(`    ${t.slice(0, 120)}`)
    bad += 1
  }
  await ctx.close()
}

await browser.close()
console.log(bad === 0 ? '\n  clean — every screen in a register, nothing thin, nothing cut\n' : `\n  ${bad} finding(s)\n`)
process.exit(bad === 0 ? 0 : 1)
