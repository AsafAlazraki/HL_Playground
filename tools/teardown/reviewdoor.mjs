/* CLUELESS_USER_TESTS O8 step three, in the running app: can a person
 * get to the reviewer, and does what they arrive at say anything? */
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
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      (x.innerText || '').trim().split('\n')[0].startsWith('Data'))
    b?.click()
  })
  await k.wait(2500)
  await k.snap('data')
  const door = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      (x.innerText || '').trim().startsWith('Review'))
    if (!b) return 'NO REVIEW DOOR'
    const t = (b.innerText || '').replace(/\n/g, ' · ').trim()
    b.click()
    return t
  })
  console.log('DOOR ' + JSON.stringify(door))
  await k.wait(3000)
  await k.snap('review')
  console.log('STAGE ' + JSON.stringify(await page.evaluate(() => {
    const r = [...document.querySelectorAll('[role="region"]')].map((x) => x.getAttribute('aria-label'))
    const rail = document.querySelector('.rv-rail')
    return { regions: r, panel: Boolean(rail), says: rail ? (rail.innerText || '').replace(/\n/g, ' | ').slice(0, 260) : null }
  })))
  console.log('ERRORS ' + JSON.stringify([...new Set(errs)].slice(0, 2)))
}
