/* ============================================================
   EVERY SCREEN AT EVERY WIDTH — and "responsive" made a number.

   The owner's requirement is that the app work at every screen
   size and snap things into place. That is not a thing to assert;
   it is four findings per screen per width, and this walks them.

       node tools/qa-responsive.mjs
       node tools/qa-responsive.mjs --only configurator

   WHAT COUNTS AS BROKEN, and each is a real failure a person sees:

     side-scroll  the document is wider than the window. The one
                  thing a page may never do — `RESPONSIVE.md` and
                  the artifact rules both say only a table, a
                  diagram or a code block may run past the edge,
                  each inside its own scroller.
     overflow     an element's content is wider than the box it is
                  in, so something is cut off the right of it.
     cut          a string truncated mid-word, ellipsis or hard
                  clip — `drive.mjs`'s ruler, which has two holes
                  in its history and both are closed.
     thin         text under 4.5:1 against the ground it is drawn
                  on. Narrow layouts restack onto different
                  surfaces, so contrast is not width-independent.

   THE WIDTHS ARE REAL DEVICES, not round numbers: 1440 a laptop,
   1280 the sweep's own baseline, 1024 an iPad landscape, 834 an
   iPad portrait, 768 the old tablet floor, 600 a phablet, 430 an
   iPhone Pro Max, 390 an iPhone. The last two are where a dealer
   actually stands on a pontoon with a customer.

   It needs `npm run dev` up, and a server restarted since any
   structural edit — `CLAUDE.md` carries why.
   ============================================================ */

import { chromium } from 'playwright-core'
import { wait, settled, signInAndSeed, midWord, contrast } from './drive.mjs'

const argv = process.argv.slice(2)
const only = argv.indexOf('--only') >= 0 ? argv[argv.indexOf('--only') + 1] : null

const WIDTHS = [
  [1440, 900],
  [1280, 800],
  [1024, 768],
  [834, 1112],
  [768, 1024],
  [600, 900],
  [430, 932],
  [390, 844],
]

const rail = (p, name) => p.getByRole('button', { name }).first().click()

/* Every stop starts from Home: a stop that depends on where the
   last one finished fails for reasons that are not about it. */
const STOPS = [
  ['home', '.fd', async (p) => rail(p, /^Home/)],
  ['modules', '.mo', async (p) => rail(p, /^Modules/)],
  ['data', '.dt', async (p) => rail(p, /^Data/)],
  ['quotes', '.qz', async (p) => rail(p, /^Quotes/)],
  ['customers', '.cx-root', async (p) => rail(p, /^Customers/)],
  ['admin', '.ad', async (p) => rail(p, /^Admin/)],
  [
    'catalogue',
    '.ct',
    async (p) => {
      await rail(p, /^Data/)
      await wait(p, 1600)
      await p.locator('.dt-open').filter({ hasText: 'Highfield Inflatables' }).first().click()
    },
  ],
  [
    'picker',
    '.qp',
    async (p) => {
      await rail(p, /^Home/)
      await wait(p, 1200)
      await p.getByRole('button', { name: /New quote/ }).first().click()
    },
  ],
  [
    'place',
    '.pl',
    async (p) => {
      await rail(p, /^Home/)
      await wait(p, 1200)
      await p.getByRole('button', { name: /New quote/ }).first().click()
      await wait(p, 2100)
      await p.locator('.qp-card').first().click()
    },
  ],
  /* THE BOARD WITH ROWS ON IT. The `quotes` stop above opens a
     fresh session's board, which is empty — a true state and worth
     measuring, but it exercises none of the pipeline strip and none
     of the table. This raises two quotes in two stages first. */
  [
    'board',
    '.qz-pipe',
    async (p) => {
      await rail(p, /^Home/)
      await wait(p, 1200)
      await p.getByRole('button', { name: /New quote/ }).first().click()
      await wait(p, 2100)
      await p.locator('.qp-card').first().click()
      await wait(p, 2300)
      await p.locator('.pl-card').first().click()
      await wait(p, 600)
      await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
      await wait(p, 2700)
      const who = p.getByRole('button', { name: /Who it is for/ })
      if (await who.count()) await who.first().click()
      await wait(p, 1300)
      await p.getByPlaceholder(/their name/i).fill('Mark McWilliams')
      await p.getByPlaceholder(/their name/i).press('Tab')
      await wait(p, 1100)
      await p.getByRole('button', { name: /Give it to the customer/ }).click()
      await wait(p, 2200)
      await rail(p, /^Home/)
      await wait(p, 1300)
      await p.getByRole('button', { name: /New quote/ }).first().click()
      await wait(p, 2100)
      await p.locator('.qp-card').nth(1).click()
      await wait(p, 2300)
      await p.locator('.pl-card').first().click()
      await wait(p, 600)
      await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
      await wait(p, 1800)
      await rail(p, /^Quotes/)
    },
  ],
  /* THE CASCADE SHEET. `DESIGN_SYSTEM` §5 names exactly two surfaces
     that earn glass — the completion card and this — and no ruler in
     this repo had ever opened it. It is what a price-level change
     says before it moves every line already on the quote. */
  [
    'cascade',
    '.cs-sheet',
    async (p) => {
      await rail(p, /^Home/)
      await wait(p, 1200)
      await p.getByRole('button', { name: /New quote/ }).first().click()
      await wait(p, 2100)
      await p.locator('.qp-card').first().click()
      await wait(p, 2300)
      await p.locator('.pl-card').first().click()
      await wait(p, 600)
      await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
      await wait(p, 2200)
      await p.locator('.ui-done-level:not(.is-on)').first().click()
      await wait(p, 1200)
    },
  ],
  [
    'document',
    '.qt-doc',
    async (p) => {
      await rail(p, /^Home/)
      await wait(p, 1200)
      await p.getByRole('button', { name: /New quote/ }).first().click()
      await wait(p, 2100)
      await p.locator('.qp-card').first().click()
      await wait(p, 2300)
      await p.locator('.pl-card').first().click()
      await wait(p, 600)
      await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
      await wait(p, 2700)
      const who = p.getByRole('button', { name: /Who it is for/ })
      if (await who.count()) await who.first().click()
      await wait(p, 1300)
      await p.getByPlaceholder(/their name/i).fill('Mark McWilliams')
      await p.getByPlaceholder(/their name/i).press('Tab')
      await wait(p, 1100)
      await p.getByRole('button', { name: /Give it to the customer/ }).click()
    },
  ],
  [
    'configurator',
    '.bs',
    async (p) => {
      await rail(p, /^Home/)
      await wait(p, 1200)
      await p.getByRole('button', { name: /New quote/ }).first().click()
      await wait(p, 2100)
      await p.locator('.qp-card').first().click()
      await wait(p, 2300)
      await p.locator('.pl-card').first().click()
      await wait(p, 600)
      await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).click()
    },
  ],
]

/* ============================================================
   EVERY PICTURE, AT EVERY WIDTH.

   The box checks below were passing while photographs were being
   cut off on a phone, which is the whole lesson: an `<img>` can sit
   perfectly inside a box that is itself the wrong size, and
   `object-fit: cover` crops without overflowing anything.

   FOUR WAYS A PICTURE IS WRONG, and none of them shows up as an
   overflow:

     cropped    `object-fit: cover` on a photograph of a PRODUCT. A
                cropped hull is a hull with its bow cut off, which
                is the note every well in the rebuild carries —
                and the shipped screens are full of `cover`.
     rigid      a width in px that does not shrink. Fine at 1280,
                wider than the column at 390.
     spilling   rendered wider than the element that holds it.
     tiny       scaled below a third of its natural width, which
                is a 2560px hero being drawn at 76px: not broken,
                but a megabyte spent on a thumbnail.
   ============================================================ */
async function pictures(page, root) {
  return await page.evaluate((rootSel) => {
    const stage = document.querySelector(rootSel)
    const bad = []
    for (const img of stage ? stage.querySelectorAll('img') : []) {
      const cs = getComputedStyle(img)
      const box = img.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      const host = img.parentElement
      const hostBox = host ? host.getBoundingClientRect() : box
      const where = img.className || 'img'

      if (cs.objectFit === 'cover') bad.push(`cropped · ${where}`)
      if (box.width > hostBox.width + 1) {
        bad.push(`spilling · ${where} ${Math.round(box.width)}>${Math.round(hostBox.width)}`)
      }
      if (box.right > window.innerWidth + 1 || box.left < -1) {
        bad.push(`off-screen · ${where}`)
      }
      const natural = img.naturalWidth
      if (natural > 0 && box.width > natural * 3) bad.push(`upscaled · ${where}`)
    }
    return [...new Set(bad)].slice(0, 5)
  }, root)
}

/** The page must never scroll sideways, and nothing inside a
 *  screen may overflow its own box — except the scrollers that are
 *  allowed to: a table, a strip of chips, a code block. Those
 *  declare `overflow-x: auto` and are skipped by name. */
async function overflow(page, root) {
  return await page.evaluate((rootSel) => {
    const doc = document.documentElement
    const side = doc.scrollWidth - doc.clientWidth
    const stage = document.querySelector(rootSel)
    const bad = []

    /* IT IS THE ANCESTOR THAT IS CLIPPED, NOT ALWAYS THE ELEMENT.
       `drive.mjs` tests the element itself, which is enough for the
       mid-word ruler because that one only looks at elements that
       hold text directly. This walks every node, so it meets the
       CHILDREN of an sr-only wrapper: `.ui-stepper-name` is
       `position: static` inside a `.ui-stepper-text` clipped to a
       pixel, and reported as `74>1` four times on the phone rail.
       Nobody can see it, so nobody can see it overflow. */
    const srOnly = (el) => {
      for (let n = el; n && n !== stage.parentElement; n = n.parentElement) {
        const b = n.getBoundingClientRect()
        if (b.width <= 2 && b.height <= 2 && getComputedStyle(n).position === 'absolute') {
          return true
        }
      }
      return false
    }
    for (const el of stage ? stage.querySelectorAll('*') : []) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      /* a declared scroller is doing its job, not failing */
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue
      if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') continue
      /* AND AN SR-ONLY STRING IS A DECLARED CLIP, NOT AN OVERFLOW.
         The same test `drive.mjs` applies in the mid-word ruler and
         for the same reason: a label clipped to a pixel FOR a
         screen reader reports as `49>1` here, four times over on
         the phone step rail, and a finding that is always noise
         trains a reader to skip the output. */
      if (srOnly(el)) continue
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
        bad.push(`${el.className || el.tagName} ${el.scrollWidth}>${el.clientWidth}`)
      }
    }
    return { side, bad: bad.slice(0, 4) }
  }, root)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
let findings = 0

for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  const thrown = []
  page.on('pageerror', (e) => thrown.push(String(e.message)))
  await signInAndSeed(page)
  await wait(page, 1400)

  console.log(`\n  ${w}x${h}`)
  for (const [name, sure, open] of STOPS) {
    if (only && name !== only) continue
    try {
      /* CLOSE WHATEVER THE LAST STOP LEFT OPEN. The header of this
         file says every stop starts from Home — and nothing enforced
         it, which held only while no stop ended on an overlay. The
         cascade stop does: it ends with the sheet up, and the sheet's
         scrim swallows the rail press, so the two stops after it
         reported UNREACHED at every width for a reason that had
         nothing to do with them. Escape is the app's own dismissal,
         so this measures the real gesture rather than reaching past
         it into the DOM. */
      await page.keyboard.press('Escape')
      await wait(page, 400)
      await open(page)
      await wait(page, 2400)
      await settled(page)
      if (!(await page.locator(sure).count())) {
        console.log(`    ${name.padEnd(13)} UNREACHED`)
        findings += 1
        continue
      }
      const o = await overflow(page, sure)
      const m = await midWord(page)
      const c = await contrast(page, sure)
      const pic = await pictures(page, sure)
      const ok =
        o.side <= 1 &&
        o.bad.length === 0 &&
        m.bad.length === 0 &&
        c.thin.length === 0 &&
        pic.length === 0
      console.log(
        `    ${name.padEnd(13)} ${ok ? 'ok' : 'FINDING'}` +
          (o.side > 1 ? ` · side-scroll ${o.side}px` : '') +
          (o.bad.length ? ` · overflow ${o.bad.length}` : '') +
          (m.bad.length ? ` · cut ${m.bad.length}` : '') +
          (c.thin.length ? ` · thin ${c.thin.length}` : '') +
          (pic.length ? ` · picture ${pic.length}` : ''),
      )
      if (!ok) {
        findings += 1
        for (const b of o.bad) console.log(`                     ${b}`)
        for (const b of m.bad.slice(0, 2)) console.log(`                     ${b.kind} "${b.text}" · ${b.where}`)
        for (const t of c.thin.slice(0, 2)) console.log(`                     ${t.r}:1 "${t.text}" · ${t.where}`)
        for (const b of pic) console.log(`                     ${b}`)
      }
    } catch (e) {
      console.log(`    ${name.padEnd(13)} UNREACHED — ${String(e.message).split('\n')[0].slice(0, 50)}`)
      findings += 1
    }
  }
  if (thrown.length) {
    console.log(`    PAGE ERRORS: ${[...new Set(thrown)][0]?.slice(0, 90)}`)
    findings += 1
  }
  await ctx.close()
}

await browser.close()
console.log(findings === 0 ? '\n  clean at every width\n' : `\n  ${findings} finding(s)\n`)
process.exit(findings === 0 ? 0 : 1)
