/* UX_PASS §2 — one field over MODULES · ROWS · QUOTES · TABLES ·
 * COLUMNS. Open ⌘K and count what each of three queries can reach.
 * Classes, not headings: the palette draws one list and marks each
 * option with its kind. */
async function ask(page, k, q) {
  await page.keyboard.press('Control+k')
  await k.wait(900)
  await page.keyboard.type(q, { delay: 35 })
  await k.wait(1800)
  const seen = await page.evaluate(() => {
    const opts = [...document.querySelectorAll('.hs-opt')]
    const kind = (el) => {
      const m = [...el.classList].find((c) => c.startsWith('hs-opt--'))
      return m ? m.slice(8) : 'row'
    }
    const tally = {}
    for (const o of opts) tally[kind(o)] = (tally[kind(o)] ?? 0) + 1
    const first = opts[0]
    return { tally, first: first ? (first.innerText || '').trim().slice(0, 90) : null }
  })
  console.log('ASK ' + JSON.stringify(q) + ' ' + JSON.stringify(seen))
  await page.keyboard.press('Escape')
  await k.wait(400)
  await page.keyboard.press('Escape')
  await k.wait(500)
}

export default async function (page, k) {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) { await load.first().click(); await k.wait(6000) }
  await ask(page, k, 'boats')
  await ask(page, k, 'price')
  await ask(page, k, 'highfield')
  /* and the press actually lands somewhere */
  await page.keyboard.press('Control+k')
  await k.wait(900)
  await page.keyboard.type('boats', { delay: 35 })
  await k.wait(1800)
  await k.snap('fivekinds')
  await page.evaluate(() => {
    document.querySelector('.hs-opt--module')?.click()
  })
  await k.wait(2500)
  await k.snap('fivekinds-landed')
  const where = await page.evaluate(() => ({
    scrim: document.querySelector('.fx-scrim') !== null,
    heading: (document.querySelector('h1, h2')?.textContent || '').trim().slice(0, 60),
  }))
  console.log('LANDED ' + JSON.stringify(where))
}
