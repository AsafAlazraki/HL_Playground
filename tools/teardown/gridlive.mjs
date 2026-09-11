/* THE MEMO MUST NOT MAKE THE REGISTER GO DEAF. `memo(Grid)` skips a
 * re-render when every prop is unchanged, so the thing to prove is
 * that the props DO change when the data does. This drives the
 * register itself — the surface where a dealer actually types — and
 * edits a cell, reads it back off the screen, and puts it back. */
const press = (page, src) =>
  page.evaluate((s) => {
    const rx = new RegExp(s)
    const b = [...document.querySelectorAll('button')].find((x) => rx.test((x.innerText || '').trim()))
    b?.click()
    return Boolean(b)
  }, src)

export default async function (page, k) {
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
  await page.setViewportSize({ width: 1440, height: 900 })
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
  await k.wait(3000)
  await press(page, '^List$')
  await k.wait(2500)
  await k.snap('register')

  const cell = await page.evaluate(() => {
    const all = [...document.querySelectorAll('[role="gridcell"], .gr-cell')]
    const c = all.find((e) => {
      const r = e.getBoundingClientRect()
      return (
        r.left > 320 &&
        r.right < window.innerWidth - 60 &&
        r.top > 160 &&
        r.bottom < window.innerHeight - 180 &&
        /^[0-9.,]+$/.test((e.textContent || '').trim()) &&
        (e.textContent || '').trim().length > 1
      )
    })
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { was: (c.textContent || '').trim(), x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  console.log('CELL ' + JSON.stringify(cell))
  if (!cell) {
    console.log('NO CELL FOUND')
    return
  }

  const holds = (what) =>
    page.evaluate(
      (w) =>
        [...document.querySelectorAll('[role="gridcell"], .gr-cell')]
          .map((e) => (e.textContent || '').trim())
          .includes(w),
      what,
    )

  await page.mouse.dblclick(cell.x, cell.y)
  await k.wait(700)
  await page.keyboard.press('Control+a')
  await page.keyboard.type('987654', { delay: 30 })
  await page.keyboard.press('Enter')
  await k.wait(1200)
  await k.snap('edited')
  console.log('GRID REDREW WITH THE EDIT ' + (await holds('987654')))

  await page.mouse.dblclick(cell.x, cell.y)
  await k.wait(700)
  await page.keyboard.press('Control+a')
  await page.keyboard.type(cell.was, { delay: 30 })
  await page.keyboard.press('Enter')
  await k.wait(1200)
  console.log('PUT BACK ' + (await holds(cell.was)) + ' / test value gone ' + !(await holds('987654')))
  console.log('ERRORS ' + JSON.stringify([...new Set(errs)].slice(0, 2)))
}
