/* WHAT A LEGIBLE CARD ACTUALLY MOUNTS. Rows 43 and 44 both end at
 * the same next step — "reduce what a card mounts" — and that is only
 * the right step if a card is mounting more than it draws. So: at the
 * band where seven cards are legible, how many rows does each card
 * hold, and how many of them are inside its own scroll box? */
export default async function (page, k) {
  await page.setViewportSize({ width: 1280, height: 800 })
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
    await k.wait(7000)
  }
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      (x.innerText || '').trim().split('\n')[0].startsWith('Data'),
    )
    b?.click()
  })
  await k.wait(2500)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button, a')].find((x) =>
      (x.innerText || '').trim().startsWith('Data model'),
    )
    b?.click()
  })
  await k.wait(5000)
  await page.evaluate(() => {
    const pane = document.querySelector('.react-flow__pane')
    const r = pane.getBoundingClientRect()
    for (let i = 0; i < 9; i += 1) {
      pane.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: -60,
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
          bubbles: true,
        }),
      )
    }
  })
  await k.wait(3500)
  await k.snap('cards')
  const per = await page.evaluate(() =>
    [...document.querySelectorAll('.react-flow__node')]
      .map((n) => {
        const box = n.getBoundingClientRect()
        const rows = [...n.querySelectorAll('[role="row"], .gr-row')]
        const scroller = n.querySelector('.tb-node-body')
        const sb = scroller ? scroller.getBoundingClientRect() : null
        const visible = sb
          ? rows.filter((r) => {
              const rr = r.getBoundingClientRect()
              return rr.bottom > sb.top && rr.top < sb.bottom
            }).length
          : null
        return {
          name: (n.querySelector('.tb-node-name, .tb-node-plate-title')?.textContent || '?').slice(0, 22),
          onScreen: box.right > 220 && box.left < window.innerWidth && box.bottom > 0 && box.top < window.innerHeight,
          els: n.querySelectorAll('*').length,
          rowsMounted: rows.length,
          rowsInBox: visible,
          cells: n.querySelectorAll('[role="gridcell"], .gr-cell').length,
          heads: n.querySelectorAll('[role="columnheader"]').length,
          cellsPerRow: Math.round(n.querySelectorAll('[role="gridcell"], .gr-cell').length / Math.max(1, rows.length)),
        }
      })
      .filter((r) => r.onScreen),
  )
  console.log('PER CARD ' + JSON.stringify(per, null, 1))
  const sum = per.reduce(
    (a, r) => ({
      els: a.els + r.els,
      rowsMounted: a.rowsMounted + r.rowsMounted,
      rowsInBox: a.rowsInBox + (r.rowsInBox ?? 0),
      cells: a.cells + r.cells,
    }),
    { els: 0, rowsMounted: 0, rowsInBox: 0, cells: 0 },
  )
  console.log('TOTAL ' + JSON.stringify(sum))

  /* 460 elements to draw 30 cells — so WHAT are they? One card,
     tallied by the class prefix each element carries. */
  console.log('INSIDE ONE CARD ' + JSON.stringify(await page.evaluate(() => {
    const n = [...document.querySelectorAll('.react-flow__node')].find((x) => {
      const b = x.getBoundingClientRect()
      return b.right > 220 && b.left < window.innerWidth && b.bottom > 0 && b.top < window.innerHeight && !x.querySelector('.tb-node--plate')
    })
    if (!n) return 'NO GRID CARD'
    const tally = {}
    for (const e of n.querySelectorAll('*')) {
      const c = (e.className && e.className.toString ? e.className.toString() : '').split(' ')[0] || e.tagName.toLowerCase()
      const key = c.includes('-') ? c.slice(0, c.indexOf('-', c.indexOf('-') + 1) > 0 ? c.indexOf('-', c.indexOf('-') + 1) : c.length) : c
      tally[key] = (tally[key] ?? 0) + 1
    }
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 14)
    return { total: n.querySelectorAll('*').length, top }
  }), null, 1))
}
