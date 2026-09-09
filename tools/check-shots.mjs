/* ============================================================
   check-shots — a picture of every screen, and the guard that
   notices when one changes.

   "there is **no visual regression tooling**" — CLAUDE.md, *What the
   guards cannot see*. `check-contrast.mjs` closed the first half of
   that sentence; this closes the second. 2,490 tests assert
   structure, role and text and not one asserts a pixel, so a card can
   lose its padding and a grid can collapse to one column with every
   suite still green. This run's brief is "break it and rebuild the
   layouts and components at the core level" across 47 stylesheets —
   and without a picture taken beforehand, "nothing stays the same"
   silently includes the things nobody wanted changed.

   THE SIGN-IN, THE SEED AND THE TEN SCREENS ARE COPIED FROM
   `tools/check-contrast.mjs` unchanged, arrival proof included. That
   file runs its sweep at import, so it cannot be imported for its
   parts; the reasoning behind each row lives there.

   DETERMINISM OVER FIDELITY — a guard that flickers gets `--update`d
   until it means nothing. Every line below was found by running this
   file twice against an unchanged tree and diffing, and each one is a
   thing that actually moved:

     · THE CLOCK. `cards.ts:684` renders "Good morning" / "Good
       afternoon" / "Good evening" off `getHours()`, and six modules
       render "… ago", so a baseline taken at 11:59 fails at 12:01.
       `page.clock.setFixedTime` fakes `Date` only — timers and rAF
       still run, so entrances settle instead of freezing half-played.
     · THE SEED'S TOAST. 14,751 pixels of a 409x34 strip, up for five
       seconds and then gone. Waited out rather than tolerated.
     · `decoding="async"` PHOTOGRAPHS. `complete` is true while the
       bitmap is still decoding and the shutter catches a card
       half-painted; `img.decode()` is the promise that means
       "paintable". Worth 1,371 to 4,067 pixels a run.
     · GPU RASTER. 11,182 pixels across the module cards, worst
       channel 85, and the two crops are indistinguishable by eye —
       Chrome hands raster to the GPU when it can and to Skia's CPU
       paths when it cannot, and which one depends on what else the
       machine is doing. Four launch flags take the choice away.

   Plus, uneventfully: 1280x800 at deviceScaleFactor 1, reduced
   motion, forced light, animations and caret off at capture, focus
   blurred, every scroller back to 0,0.

   NO NEW DEPENDENCY. Identical renders give byte-identical PNGs,
   which is the fast path and the usual one. When the bytes differ,
   the two are decoded by the browser already running — `Image` ->
   `<canvas>` -> `getImageData` — and counted pixel by pixel. Both
   sides take the same decode path, so the count is a real difference
   and not a colour-profile artefact.

   THE BASELINES ARE NOT COMMITTED. `.gitignore:29` is a blanket
   `*.png`. Until somebody adds `!tools/shots/*.png` beneath it these
   ten files are local only, and a fresh clone has nothing to compare
   against.

   Run:  npm run check:shots -- --update   writes baselines
         npm run check:shots               compares, exit 1 on drift
         npm run check:shots -- --url http://localhost:5090
   Needs `npm run dev` running, exactly as check:contrast does.
   ============================================================ */

import { chromium } from 'playwright-core'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const SERVER = arg('--url', 'http://localhost:5090')
const WIDTH = Number(arg('--width', '1280'))
const HEIGHT = Number(arg('--height', '800'))
/* percent of pixels allowed to differ before a screen is a failure */
const THRESHOLD = Number(arg('--threshold', '0.1'))
/* per-channel slack, so antialiasing is not a regression */
const TOL = Number(arg('--tolerance', '8'))
const UPDATE = process.argv.includes('--update')
const DIR = join(import.meta.dirname, 'shots')
/* any fixed instant; it only has to be the same one every run */
const FROZEN = new Date('2026-01-05T10:30:00')

/* A door in the rail, and only there — the module workspace has its
   own "Quotes" tab and the picker its own "Close". */
const door = (p, name) => p.locator('nav.sn').getByRole('button', { name }).first().click()

/* `at` is the address `src/app/url.ts` gives the window; `sure`
   separates two screens that share one. */
const SCREENS = [
  { name: 'home', at: '', open: async (p) => door(p, /^Home/) },
  { name: 'modules', at: 'modules', open: async (p) => door(p, /^Modules/) },
  {
    name: 'module',
    at: 'module',
    open: async (p) => {
      await door(p, /^Modules/)
      await p.getByRole('button', { name: /^Open .+ — / }).first().click()
      await p.getByRole('tab', { name: 'Dashboard' }).first().click()
    },
  },
  { name: 'data', at: 'data', open: async (p) => door(p, /^Data/) },
  {
    name: 'catalogue',
    at: 'table',
    sure: '.cat-gallery',
    open: async (p) => {
      await door(p, /^Data/)
      await p.getByRole('button', { name: /^All tables/ }).first().click()
      await p.getByRole('button', { name: /^Open .+ — / }).first().click()
    },
  },
  {
    name: 'register',
    at: 'table',
    sure: '.tb-scroll',
    open: async (p) => p.getByRole('button', { name: /^List$/ }).first().click(),
  },
  { name: 'quotes', at: 'quotes', open: async (p) => door(p, /^Quotes/) },
  { name: 'customers', at: 'customers', open: async (p) => door(p, /^Customers/) },
  { name: 'new quote', at: 'new-quote', open: async (p) => door(p, /^New quote$/) },
  {
    name: 'configurator',
    at: 'quote',
    open: async (p) => {
      await p
        .getByRole('list', { name: /places you can quote from/i })
        .getByRole('button')
        .first()
        .click()
      await p.getByRole('option').first().click()
      await p.getByRole('button', { name: /Start the quote|Back to the quote/ }).first().click()
      await p.waitForTimeout(1200)
    },
  },
]

const file = (name) => join(DIR, `${name.replace(/\s+/g, '-')}.png`)
/* PNG's IHDR is fixed-width and always first — width and height
   without decoding a byte of image data. */
const dims = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)]

/* Everything that must be true before the shutter opens. The image
   wait is bounded and takes only what is in shot: every catalogue
   photograph and every module card past the first row is
   `loading="lazy"`, so one below the fold never fires anything at all
   and waiting on `document.images` wholesale is a wait that does not
   end. That is how the first run of this file hung. */
const settle = async (p) => {
  await p
    .waitForFunction(() => !document.querySelector('.tb-toasts')?.childElementCount, null, {
      timeout: 8000,
    })
    .catch(() => {})
  await p.evaluate(() => {
    const a = document.activeElement
    if (a instanceof HTMLElement) a.blur()
    /* read every scroller first, then write — writing inside the walk
       forces a layout per element on a 1,000-node screen */
    const moved = [...document.querySelectorAll('*')].filter((e) => e.scrollTop || e.scrollLeft)
    for (const el of moved) {
      el.scrollTop = 0
      el.scrollLeft = 0
    }
    const inShot = [...document.images].filter((i) => {
      const r = i.getBoundingClientRect()
      return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight
    })
    return Promise.race([
      Promise.all([document.fonts.ready, ...inShot.map((i) => i.decode().catch(() => undefined))]),
      new Promise((done) => setTimeout(done, 6000)),
    ]).then(() => undefined)
  })
  await p.waitForTimeout(600)
}

/* Runs on a blank page, after every shot is taken, so that no compare
   can disturb the app while it is being photographed. */
function compare([was, now, tol]) {
  const load = (b64) =>
    new Promise((ok, no) => {
      const im = new Image()
      im.addEventListener('load', () => ok(im))
      im.addEventListener('error', no)
      im.src = `data:image/png;base64,${b64}`
    })
  const pixels = (im) => {
    const c = document.createElement('canvas')
    c.width = im.width
    c.height = im.height
    const x = c.getContext('2d', { willReadFrequently: true })
    x.drawImage(im, 0, 0)
    return x.getImageData(0, 0, im.width, im.height).data
  }
  return Promise.all([load(was), load(now)]).then(([A, B]) => {
    if (A.width !== B.width || A.height !== B.height)
      return { resized: [A.width, A.height, B.width, B.height] }
    const a = pixels(A)
    const b = pixels(B)
    let n = 0
    for (let i = 0; i < a.length; i += 4)
      if (
        Math.abs(a[i] - b[i]) > tol ||
        Math.abs(a[i + 1] - b[i + 1]) > tol ||
        Math.abs(a[i + 2] - b[i + 2]) > tol ||
        Math.abs(a[i + 3] - b[i + 3]) > tol
      )
        n++
    return { differing: n, total: a.length / 4 }
  })
}

const run = async () => {
  let browser
  try {
    /* Nothing here changes what the app draws — only who draws it. */
    browser = await chromium.launch({
      channel: 'chrome',
      args: [
        '--disable-gpu', // software raster, the same every launch
        '--disable-skia-runtime-opts', // no CPU-feature-dependent paths
        '--disable-lcd-text', // grayscale AA, not subpixel
        '--force-color-profile=srgb', // not this monitor's profile
      ],
    })
  } catch (e) {
    console.error(`Could not launch Chrome. Is it installed?\n${e.message}`)
    process.exit(2)
  }
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'light',
  })
  await page.clock.setFixedTime(FROZEN)

  try {
    await page.goto(SERVER, { waitUntil: 'domcontentloaded', timeout: 15000 })
  } catch {
    console.error(`No dev server at ${SERVER}. Start it with \`npm run dev\` first.`)
    await browser.close()
    process.exit(2)
  }

  /* Sign in. The demo button FILLS the form; it does not submit. */
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await page.waitForTimeout(800)
  }
  /* The real seed, so these are pictures of the app and not of an
     empty state. */
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) {
    await load.first().click()
    await page.waitForTimeout(2500)
  }
  /* Belt to the reduced-motion braces: a rule with no reduced-motion
     arm still cannot be mid-flight when the shutter opens. */
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important}',
  })

  const shots = []
  const unreached = []
  if (UPDATE) mkdirSync(DIR, { recursive: true })
  /* One screen's trouble is one screen's row: a throw in here — a
     control that never appeared, a renderer that died — must not take
     the walk down and leave no verdict on the nine that were fine. */
  for (const s of SCREENS) {
    try {
      await s.open(page)
      await page.waitForTimeout(700)
      const at = await page.evaluate(
        () => new URLSearchParams(window.location.search).get('at') ?? '',
      )
      const missing = s.sure ? !(await page.locator(s.sure).count()) : false
      if (at !== s.at || missing) {
        unreached.push(
          `${s.name} — address "${at}", wanted "${s.at}"${missing ? `; no ${s.sure}` : ''}`,
        )
        continue
      }
      await settle(page)
      const png = await page.screenshot({ animations: 'disabled', caret: 'hide' })
      shots.push([s.name, png])
      /* Written and reported AS IT GOES: a ten-screen walk is a
         minute of silence otherwise, and a silent minute cannot be
         told from a hang on the one screen that stuck. */
      if (UPDATE) {
        writeFileSync(file(s.name), png)
        const [w, h] = dims(png)
        console.log(`  wrote  ${s.name.padEnd(13)} ${w}x${h}  ${(png.length / 1024).toFixed(0)} KB`)
      }
    } catch (e) {
      unreached.push(`${s.name} — ${String(e.message).split('\n')[0]}`)
    }
  }

  let failed = 0
  if (!UPDATE) {
    const bench = await browser.newPage()
    for (const [name, png] of shots) {
      const path = file(name)
      if (!existsSync(path)) {
        console.log(`  ${name.padEnd(13)} NO BASELINE — run with --update`)
        failed++
        continue
      }
      const was = readFileSync(path)
      if (was.equals(png)) {
        console.log(`  ${name.padEnd(13)} identical`)
        continue
      }
      const r = await bench.evaluate(compare, [was.toString('base64'), png.toString('base64'), TOL])
      if (r.resized) {
        console.log(
          `  ${name.padEnd(13)} CHANGED — ${r.resized[0]}x${r.resized[1]} became ${r.resized[2]}x${r.resized[3]}`,
        )
        failed++
        continue
      }
      const pct = (r.differing / r.total) * 100
      const over = pct > THRESHOLD
      if (over) failed++
      console.log(
        `  ${name.padEnd(13)} ${over ? 'CHANGED' : 'within'} — ${pct.toFixed(3)}% of pixels (${r.differing.toLocaleString()} of ${r.total.toLocaleString()}), threshold ${THRESHOLD}%`,
      )
    }
  }

  await browser.close()
  console.log('')
  for (const u of unreached) console.log(`  UNREACHED — ${u}`)
  const done = `${shots.length} of ${SCREENS.length} screens`
  if (unreached.length || failed) {
    console.log(`  FAILED — ${done} captured, ${failed} changed, ${unreached.length} unreached`)
    process.exit(1)
  }
  console.log(`  clean — ${done}${UPDATE ? ' written' : ' match their baselines'}`)
  process.exit(0)
}

run()
