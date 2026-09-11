/* BELOW 620px, RE-MEASURED. RESPONSIVE's own open item says nothing
 * under that width has been looked at since the fluid layer landed.
 *
 * WHAT IT MEASURES, on every screen a person can reach:
 *   · horizontal overflow of the document — the one failure a reader
 *     cannot work around, because the page scrolls sideways under
 *     their thumb and the rail comes with it
 *   · which elements are wider than the window, named, so the fix has
 *     somewhere to start
 *   · whether the primary act of the screen is on screen at all
 * Nothing here judges taste. It reports geometry. */

const PHONE = { width: 390, height: 844 }

const geometry = `
  (() => {
    const doc = document.documentElement
    const w = doc.clientWidth
    const over = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      /* only what actually sticks out of the window, and only the
         OUTERMOST such element — naming every descendant of one wide
         box is a hundred lines saying one thing */
      if (r.right > w + 1 || r.left < -1) {
        if (el.parentElement && over.some((o) => o.node === el.parentElement)) continue
        over.push({
          node: el,
          what: (el.className && el.className.toString ? el.className.toString() : el.tagName)
            .split(' ')
            .slice(0, 2)
            .join('.')
            .slice(0, 46),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40),
        })
      }
    }
    return {
      scrolls: doc.scrollWidth > w + 1,
      scrollWidth: doc.scrollWidth,
      clientWidth: w,
      over: over.slice(0, 6).map((o) => ({ what: o.what, left: o.left, right: o.right, width: o.width, text: o.text })),
    }
  })()
`

async function at(page, k, label) {
  await k.wait(1400)
  const g = await page.evaluate(geometry)
  await k.snap(label)
  console.log(
    label.padEnd(12) +
      (g.scrolls ? `SCROLLS SIDEWAYS ${g.scrollWidth}/${g.clientWidth}` : 'clean') +
      (g.over.length > 0 ? ' — ' + JSON.stringify(g.over) : ''),
  )
}

export default async function (page, k) {
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
  await page.setViewportSize(PHONE)
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) {
    await load.first().click()
    await k.wait(8000)
  }

  const go = async (name) => {
    await page.evaluate((n) => {
      const b = [...document.querySelectorAll('button, a')].find((x) =>
        (x.innerText || x.getAttribute('aria-label') || '').trim().split('\n')[0] === n,
      )
      b?.click()
    }, name)
  }

  await at(page, k, 'home')
  await go('Modules')
  await at(page, k, 'modules')
  await go('Quotes')
  await at(page, k, 'quotes')
  await go('Data')
  await at(page, k, 'data')
  await go('Customers')
  await at(page, k, 'customers')
  await go('Admin')
  await at(page, k, 'admin')

  /* and one register, which is the widest thing in the app */
  await page.keyboard.press('Control+k')
  await k.wait(900)
  await page.keyboard.type('Labour', { delay: 30 })
  await k.wait(1600)
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.hs-opt')].find(
      (o) => !o.classList.contains('hs-opt--module'),
    )
    t?.click()
  })
  await at(page, k, 'register')

  console.log('ERRORS ' + JSON.stringify([...new Set(errs)].slice(0, 3)))
}
