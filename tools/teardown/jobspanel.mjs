/* UX_PASS §12 — a table opens on what you can do with it. */
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
  if (await load.count()) { await load.first().click(); await k.wait(8000) }
  await page.keyboard.press('Control+k')
  await k.wait(900)
  await page.keyboard.type('Highfield', { delay: 30 })
  await k.wait(1800)
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.hs-opt')].find(
      (o) => !o.classList.contains('hs-opt--module'))
    t?.click()
  })
  await k.wait(4000)
  await k.snap('jobs')
  console.log('PANEL ' + JSON.stringify(await page.evaluate(() => {
    const jb = document.querySelector('.jb')
    if (!jb) return 'NO PANEL'
    return (jb.innerText || '').replace(/\n/g, ' | ').slice(0, 400)
  })))
  console.log('LENS ' + JSON.stringify(await page.evaluate(() =>
    [...document.querySelectorAll('.cat-lens-btn')].map((b) => ({
      t: (b.innerText || '').trim(), on: b.getAttribute('aria-pressed') }))
  )))
  console.log('ERRORS ' + JSON.stringify([...new Set(errs)].slice(0, 2)))
}
