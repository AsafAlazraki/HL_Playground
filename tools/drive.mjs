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
    const leaves = [...document.querySelectorAll('*')].filter(
      (el) => el.children.length === 0 && (el.textContent ?? '').trim().length > 1,
    )
    for (const el of leaves) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const node = el.firstChild
      if (!node || node.nodeType !== 3) continue
      const text = node.textContent ?? ''

      /* A clipped single line: does the ellipsis land inside a word? */
      if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) {
        bad.push({ kind: 'clip', text: text.trim().slice(0, 44), where: el.className })
        continue
      }

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
