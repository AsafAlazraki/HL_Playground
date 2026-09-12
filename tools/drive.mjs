/* ============================================================
   THE PARTS EVERY REBUILD HARNESS NEEDS, IN ONE PLACE.

   `shot-build.mjs`, `shot-picker.mjs` and `qa-build.mjs` each open
   a fresh Chrome, sign in, load the real Northside seed and then
   measure one screen. The first two lines of that are identical in
   all three, and so is the mid-word ruler — which is exactly the
   kind of thing that drifts into three slightly different rulers
   reporting three slightly different numbers.

   Nothing here decides anything. It signs in, it loads the seed,
   and it measures. What counts as a failure is the caller's.
   ============================================================ */

export const ORIGIN = process.env.HL_ORIGIN ?? 'http://localhost:5090'

export const wait = (page, ms) => page.waitForTimeout(ms)

/** Sign in with the demo account and load the Master Price File —
 *  53 tables, 15,691 rows, 25 modules. A screen measured against an
 *  empty store is a picture of an empty state. */
export async function signInAndSeed(page) {
  await page.goto(ORIGIN)

  /* The demo button FILLS the form; it does not submit. */
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await wait(page, 900)
  }

  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) {
    await load.first().click()
    await wait(page, 4000)
  }
}

/* ============================================================
   NOTHING TRUNCATES MID-WORD — computed, not eyeballed.

   `DESIGN_SYSTEM.md` §4 allows a clamp to two lines with the whole
   string still in the DOM, and forbids a cut that lands inside a
   word: a proper noun or a part number is the one kind of string a
   truncation cannot be read through. The visual QA of 2026-09-09
   found the app's only one on a name — "Alazr | aki" — and a first
   draft of `stepper.css` put another on "Administration" hours
   after the rule was written.

   A `Range` walks the text character by character and reports the
   first cut where the characters either side are both word
   characters. Same ruler the sweep used.
   ============================================================ */
export async function midWord(page) {
  return await page.evaluate(() => {
    const bad = []

    /* ============================================================
       THE CLIP SWEEP RUNS OVER EVERY ELEMENT THAT HOLDS TEXT, not
       only over childless ones — the second hole this had.

       The rebuilt Data screen's identity cell is a button holding a
       kind dot AND a name, so `children.length === 0` was false and
       the element that actually does the clipping was never looked
       at. It drew "Highfield × Yamaha — Moto" with the rest of the
       name gone and this reported the screen clean.

       An element qualifies when it carries a text node of its own,
       so a card with `overflow: hidden` around a picture is not
       reported as a truncated string.
       ============================================================ */
    const holdsText = (el) =>
      [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 1)

    /* VISUALLY-HIDDEN TEXT IS A DELIBERATE CLIP, NOT A TRUNCATION.
       The sr-only pattern is a 1px box with `clip-path: inset(50%)`
       and `white-space: nowrap` — every one of the conditions this
       sweep looks for, on purpose, because the string is FOR a
       screen reader and is never drawn. Reported as a finding it is
       noise that trains a reader to skip the output. */
    const srOnly = (el, cs) => {
      const box = el.getBoundingClientRect()
      return box.width <= 2 && box.height <= 2 && cs.position === 'absolute'
    }

    for (const el of document.querySelectorAll('*')) {
      if (!holdsText(el)) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      if (srOnly(el, cs)) continue
      const oneLine = cs.whiteSpace === 'nowrap' || cs.whiteSpace === 'pre'
      const shut = cs.overflowX === 'hidden' || cs.overflowX === 'clip'
      if (oneLine && shut && el.scrollWidth > el.clientWidth + 1) {
        bad.push({
          /* A HARD CLIP IS THE WORSE OF THE TWO: an ellipsis at
             least says a string was cut. */
          kind: cs.textOverflow === 'ellipsis' ? 'ellipsis' : 'hard-clip',
          text: (el.textContent ?? '').trim().slice(0, 44),
          where: el.className,
        })
      }
    }

    const leaves = [...document.querySelectorAll('*')].filter(
      (el) => el.children.length === 0 && (el.textContent ?? '').trim().length > 1,
    )
    for (const el of leaves) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const node = el.firstChild
      if (!node || node.nodeType !== 3) continue
      const text = node.textContent ?? ''

      let prevTop = null
      for (let i = 0; i < text.length; i++) {
        const r = document.createRange()
        r.setStart(node, i)
        r.setEnd(node, i + 1)
        const b = r.getBoundingClientRect()
        if (b.width === 0) continue
        if (prevTop !== null && b.top > prevTop + 1) {
          const before = text[i - 1] ?? ''
          const after = text[i] ?? ''
          if (/\w/.test(before) && /\w/.test(after)) {
            bad.push({
              kind: 'break',
              text: text.trim().slice(0, 44),
              at: `${before}|${after}`,
              where: el.className,
            })
          }
        }
        prevTop = b.top
      }
    }
    return { checked: leaves.length, bad }
  })
}

/** Print a mid-word result and say whether it passed. */
export function sayMidWord(found) {
  if (found.bad.length) {
    console.log(`\nMID-WORD (${found.bad.length} of ${found.checked} leaves):`)
    for (const b of found.bad) console.log(`  ${b.kind} ${b.at ?? ''} "${b.text}" · ${b.where}`)
    return false
  }
  console.log(`nothing truncates mid-word · ${found.checked} text leaves checked`)
  return true
}

/* ============================================================
   THE RAMP, AS THE SCREEN ACTUALLY DRAWS IT.

   `visual-qa-2026-09-09.md` is the scoreboard and this is its
   ruler: every visible text leaf, its computed font size, the
   largest over the smallest, and how many distinct steps are in
   use. Showroom requires >=6x and the middle of the ramp occupied;
   eleven of twelve screens measured 2.36-3.96x with four steps,
   which is the defect the whole rebuild is answering.
   ============================================================ */
export async function ramp(page) {
  return await page.evaluate(() => {
    const sizes = []
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length) continue
      if (!(el.textContent ?? '').trim()) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      if (el.closest('[aria-hidden="true"]')) continue
      const box = el.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) continue
      sizes.push(Math.round(parseFloat(cs.fontSize) * 10) / 10)
    }
    if (!sizes.length) return { leaves: 0, ratio: null, largest: null, smallest: null, steps: 0 }
    const largest = Math.max(...sizes)
    const smallest = Math.min(...sizes)
    return {
      leaves: sizes.length,
      ratio: (largest / smallest).toFixed(2),
      largest: largest.toFixed(1),
      smallest: smallest.toFixed(1),
      steps: new Set(sizes).size,
    }
  })
}

/* ============================================================
   EVERY TEXT LEAF AGAINST THE GROUND IT IS ACTUALLY DRAWN ON.

   `check-contrast.mjs` does this for five shipped screens and is
   the authority on the method; this is the same measurement, aimed
   at a screen being built. It carries the three mistakes that made
   the earlier sweeps lie, and they are not optional:

     1. parse `color(srgb ...)` as well as `rgb()` — a parser that
        guesses returns a number about the wrong colour;
     2. composite the FULL ancestor chain, not the nearest
        background — most surfaces here are translucent;
     3. composite translucent INK over that ground before measuring.

   `aria-hidden` is skipped, which is not a loophole: a plate's
   monogram under a photograph, or a rail, is not text anybody
   reads, and nine correct nodes went red the first time this ran
   without it.

   4.5:1 is the bar, 3:1 where the type is 24px or larger, which is
   WCAG's own large-text line.
   ============================================================ */
export async function contrast(page, root = 'body') {
  return await page.evaluate((rootSel) => {
    const clamp = (n) => Math.max(0, Math.min(255, n))
    const alpha = (raw) => {
      if (raw === undefined || raw === null || raw === '') return 1
      return String(raw).endsWith('%') ? Number(String(raw).slice(0, -1)) / 100 : Number(raw)
    }
    const parse = (text) => {
      const t = String(text ?? '').trim()
      if (t === '' || t === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
      const srgb = t.match(
        /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i,
      )
      if (srgb) {
        return {
          r: clamp(Number(srgb[1]) * 255),
          g: clamp(Number(srgb[2]) * 255),
          b: clamp(Number(srgb[3]) * 255),
          a: alpha(srgb[4]),
        }
      }
      const rgb = t.match(
        /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i,
      )
      if (rgb) {
        return {
          r: clamp(Number(rgb[1])),
          g: clamp(Number(rgb[2])),
          b: clamp(Number(rgb[3])),
          a: alpha(rgb[4]),
        }
      }
      /* NULL RATHER THAN A GUESS. A leaf whose colour cannot be read
         is reported as unread, never measured against an invented
         value — that is how a sweep reports clean and means nothing. */
      return null
    }
    const over = (top, under) => {
      const a = top.a + under.a * (1 - top.a)
      if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
      const mix = (t, u) => (t * top.a + u * under.a * (1 - top.a)) / a
      return { r: mix(top.r, under.r), g: mix(top.g, under.g), b: mix(top.b, under.b), a }
    }
    const ground = (el) => {
      const chain = []
      let n = el
      while (n) {
        const bg = parse(getComputedStyle(n).backgroundColor)
        if (bg && bg.a > 0) chain.push(bg)
        if (bg && bg.a >= 1) break
        n = n.parentElement
      }
      const paper = parse(getComputedStyle(document.documentElement).backgroundColor)
      chain.push(paper && paper.a >= 1 ? paper : { r: 255, g: 255, b: 255, a: 1 })
      return chain.reduceRight((u, t) => over(t, u))
    }
    const chan = (c) => {
      const v = c / 255
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    }
    const lum = (c) => 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b)
    const ratio = (f, b) => {
      const [hi, lo] = lum(f) > lum(b) ? [lum(f), lum(b)] : [lum(b), lum(f)]
      return (hi + 0.05) / (lo + 0.05)
    }

    const stage = document.querySelector(rootSel) ?? document.body
    const leaves = [...stage.querySelectorAll('*')].filter((el) => {
      if (el.children.length !== 0) return false
      if ((el.textContent ?? '').trim().length === 0) return false
      if (el.closest('[aria-hidden="true"]')) return false
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false
      const b = el.getBoundingClientRect()
      return b.width >= 2 && b.height >= 2
    })

    const thin = []
    let unread = 0
    for (const el of leaves) {
      const cs = getComputedStyle(el)
      const ink = parse(cs.color)
      if (!ink) {
        unread += 1
        continue
      }
      const bg = ground(el)
      const r = ratio(over(ink, bg), bg)
      const px = parseFloat(cs.fontSize)
      const floor = px >= 24 ? 3 : 4.5
      if (r < floor) {
        thin.push({
          r: Number(r.toFixed(2)),
          need: floor,
          px: Math.round(px),
          text: (el.textContent ?? '').trim().slice(0, 38),
          where: el.className || el.tagName,
        })
      }
    }
    return { checked: leaves.length, unread, thin }
  }, root)
}

/** Print a contrast result and say whether it passed. */
export function sayContrast(found, where) {
  if (found.thin.length) {
    console.log(`\nTHIN INK on ${where} (${found.thin.length} of ${found.checked}):`)
    for (const t of found.thin) {
      console.log(`  ${t.r}:1 (needs ${t.need}) ${t.px}px "${t.text}" · ${t.where}`)
    }
    return false
  }
  console.log(`every leaf clears 4.5:1 on ${where} · ${found.checked} checked, ${found.unread} unread`)
  return true
}
