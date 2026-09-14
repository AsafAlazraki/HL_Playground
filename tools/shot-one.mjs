/* ============================================================
   ONE SCREEN, EVERY WIDTH — the loop between an edit and a look.

   `shot-all.mjs` photographs fourteen screens at one width, which
   is the right tool for the document at the end. It is the wrong
   tool while you are changing ONE screen's layout: it costs a
   minute and gives you thirteen pictures you did not ask for.

       node tools/shot-one.mjs catalogue
       node tools/shot-one.mjs configurator --dark
       node tools/shot-one.mjs catalogue --scroll 700

   Files land in `out/one/<screen>-<width>.png`, and a second frame
   per width if `--scroll` is given — which is how you see a sticky
   heading do its job, since a sticky element looks identical to a
   static one until something has moved under it.

   It prints `pageerror` on its own line. Three wrong readings in
   this project's history were a partially-transformed module and
   not a code defect; `CLAUDE.md` carries the rule and this is the
   line that catches it.
   ============================================================ */

import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { wait, settled, signInAndSeed, door } from './drive.mjs'

const argv = process.argv.slice(2)
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d
}
const screen = argv.find((a) => !a.startsWith('--')) ?? 'home'
const DARK = argv.includes('--dark')
const SCROLL = Number(flag('scroll', 0))
const CLICK = flag('click', '')
const WIDTHS = flag('widths', '1440,1280,1024,834,600,430')
  .split(',')
  .map(Number)

const rail = (p, name) => door(p, name)

/* THE FRONT DOOR'S OWN BUTTON, AND NOT THE RAIL'S.

   Both say "New quote", the rail's comes first in the document,
   and `.first()` is document order — so at 1024 and under, where
   the rail is a closed drawer translated off-screen, `inert`, and
   `visibility: hidden`, every walk in this file was pressing a
   button at x=-318 and timing out against `.shell-body`.

   Measured at 834: the rail's copy sits at x=-318, w=303, with the
   nav reporting `inert=true` and `visibility: hidden`. The drawer
   was right; the driver was reading past it. */
const newQuote = (p) => p.locator('.fd').getByRole('button', { name: /New quote/ }).first().click()

/** [root selector, how to get there]. The root doubles as the proof
 *  the screen arrived — a screenshot of the wrong screen is worse
 *  than no screenshot, because it looks like evidence. */
const SCREENS = {
  home: ['.fd', async (p) => rail(p, /^Home/)],
  modules: ['.mo', async (p) => rail(p, /^Modules/)],
  data: ['.dt', async (p) => rail(p, /^Data/)],
  quotes: ['.qz', async (p) => rail(p, /^Quotes/)],
  customers: ['.cx-root', async (p) => rail(p, /^Customers/)],
  admin: ['.ad', async (p) => rail(p, /^Admin/)],
  catalogue: [
    '.ct',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1600)
      await p.locator('.dt-open').filter({ hasText: 'Highfield Inflatables' }).first().click()
    },
  ],
  /* THE THREE COCKPIT WINDOWS DATA OPENS. No harness had a stop for
     any of them, so the rule editor, the fitment builder and the
     reviewer — between them 5,400 lines of stylesheet — had never
     been photographed or measured by anything. Each is a press on
     the Data screen's own bar. */
  rules: [
    '.cn-root',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1500)
      await p.getByRole('button', { name: /^Rules/ }).first().click()
    },
  ],
  fitment: [
    '.ft',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1500)
      await p.getByRole('button', { name: /What fits what/ }).first().click()
    },
  ],
  review: [
    '.rw',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1500)
      await p.getByRole('button', { name: /^Review/ }).first().click()
    },
  ],
  picker: [
    '.qp',
    async (p) => {
      await rail(p, /^Home/)
      await wait(p, 1200)
      await newQuote(p)
    },
  ],
  place: [
    '.pl',
    async (p) => {
      await SCREENS.picker[1](p)
      await wait(p, 2100)
      await p.locator('.qp-card').first().click()
    },
  ],
  /* THE BOARD WITH SOMETHING ON IT. `quotes` opens a fresh session's
     board, which is empty — a true state, and the one a new dealer
     sees, but it cannot show what the board DOES. This raises two:
     one carried all the way to the customer and one left as a draft,
     so the pipeline strip has two stages to count and the rows have
     something to sort. */
  board: [
    '.qz',
    async (p) => {
      await SCREENS.document[1](p)
      await wait(p, 2200)
      await rail(p, /^Home/)
      await wait(p, 1300)
      await newQuote(p)
      await wait(p, 2100)
      await p.locator('.qp-card').nth(1).click()
      await wait(p, 2300)
      await p.locator('.pl-card').first().click()
      await wait(p, 700)
      await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
      await wait(p, 1800)
      await rail(p, /^Quotes/)
    },
  ],
  /* THE CASCADE SHEET. `DESIGN_SYSTEM` §5 names exactly two surfaces
     that earn glass — the completion card and this — and no harness
     had ever opened it. It is the announcement a price-level change
     makes before it moves every line already on the quote:
     `levelConflict` returns null when nothing actually moves, and
     then the change simply happens, because a sheet that opens to
     report no change is furniture. So this presses the OTHER rung
     and the sheet appears only if there is something to say. */
  cascade: [
    '.cs-sheet',
    async (p) => {
      await SCREENS.configurator[1](p)
      await wait(p, 2200)
      await p.locator('.ui-done-level:not(.is-on)').first().click()
      await wait(p, 1200)
    },
  ],
  /* HOME WITH SOMETHING ON IT. The `home` stop above opens a fresh
     session's front door, which is the true first-run state and
     worth its picture — but both of its bottom sections are empty
     there, so it cannot show what they DO. This raises one quote
     and comes back. */
  desk: [
    '.fd',
    async (p) => {
      await SCREENS.document[1](p)
      await wait(p, 2200)
      await rail(p, /^Home/)
      await wait(p, 1600)
    },
  ],
  /* THE REGISTER WITH SOMEBODY IN IT. `customers` opens a fresh
     session's book, which is empty — a true state and worth its
     picture, but it cannot show what the book DOES. Raising one
     quote files the customer, which is the only way a person gets
     into it. */
  book: [
    '.cx-root',
    async (p) => {
      await SCREENS.document[1](p)
      await wait(p, 2200)
      await rail(p, /^Customers/)
    },
  ],
  document: [
    '.qt-doc',
    async (p) => {
      await SCREENS.configurator[1](p)
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
  configurator: [
    '.bs',
    async (p) => {
      await SCREENS.place[1](p)
      await wait(p, 2300)
      /* WHICH BOAT. `HL_MODEL="SP560"` picks a card by its name;
         the first card on the shelf is an RU230 with nothing paired
         to it, which photographs a configurator with nothing in it. */
      const model = process.env.HL_MODEL
      const card = model ? p.locator('.pl-card').filter({ hasText: model }).first() : p.locator('.pl-card').first()
      await card.click()
      await wait(p, 700)
      await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
    },
  ],
}

const [sure, open] = SCREENS[screen] ?? []
if (!open) {
  console.log(`  no such screen. one of: ${Object.keys(SCREENS).join(', ')}`)
  process.exit(1)
}

mkdirSync('out/one', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const suffix = (DARK ? '-dark' : '') + (flag('tag', '') ? '-' + flag('tag', '') : '')

for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: w < 700 ? 932 : 900 },
    colorScheme: DARK ? 'dark' : 'light',
  })
  const page = await ctx.newPage()
  const thrown = []
  page.on('pageerror', (e) => thrown.push(String(e.message)))
  await signInAndSeed(page)
  await wait(page, 1500)
  await open(page)
  await wait(page, 2600)
  /* one more press once the screen is up, by CSS selector — which
     is how you photograph a step of the configurator other than
     the one the walk happens to end on. The trailer stop has no
     options for this hull, so a driver that always lands there
     photographs the one step that shows nothing. */
  if (CLICK) {
    await page.locator(CLICK).first().click()
    await wait(page, 1400)
  }
  await settled(page)
  const there = await page.locator(sure).count()
  console.log(`  ${String(w).padStart(4)}  ${there ? 'ok' : 'UNREACHED'}`)
  if (thrown.length) console.log(`        pageerror: ${thrown[0].slice(0, 110)}`)
  await page.screenshot({ path: `out/one/${screen}-${w}${suffix}.png` })
  if (SCROLL > 0) {
    /* the scrollport is the screen's own, never the window's —
       `.shell-stage` is `overflow: hidden` and every screen owns
       the box it scrolls in */
    /* FIND THE SCROLLPORT, DO NOT NAME IT. Every screen owns its
       own — `.shell-stage` is `overflow: hidden` — and the first
       version of this guessed at `[class$="-port"]`, which silently
       scrolled nothing on the quote document and produced a
       "scrolled" frame identical to the unscrolled one. A frame
       that looks like evidence and is not is the worst kind. */
    const moved = await page.evaluate((y) => {
      let best = null
      for (const el of document.querySelectorAll('*')) {
        if (el.scrollHeight - el.clientHeight < 40) continue
        const over = getComputedStyle(el).overflowY
        if (over !== 'auto' && over !== 'scroll') continue
        if (!best || el.clientHeight > best.clientHeight) best = el
      }
      const port = best ?? document.scrollingElement
      const was = port.scrollTop
      port.scrollBy(0, y)
      return { where: best ? best.className || best.tagName : 'window', by: port.scrollTop - was }
    }, SCROLL)
    if (moved.by === 0) console.log(`        scroll moved nothing (${moved.where})`)
    await wait(page, 800)
    await page.screenshot({ path: `out/one/${screen}-${w}${suffix}-scrolled.png` })
  }
  await ctx.close()
}
await browser.close()
console.log(`\n  out/one/${screen}-*${suffix}.png\n`)
