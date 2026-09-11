/* CLUELESS_USER_TESTS O6 — at 1280 the results column takes 571px and
 * the last two columns still need a scroll. Measure it. */
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
  if (await load.count()) { await load.first().click(); await k.wait(6000) }
  await page.getByRole('button', { name: /^Data/ }).first().click()
  await k.wait(1500)
  await page.getByRole('button', { name: /What fits what/i }).first().click()
  await k.wait(2500)
  await k.snap('fitment')
  /* the rule canvas is one door deeper now */
  const _door = page.getByRole('button', { name: /^Rule builder$/ })
  console.log('DOORS ' + JSON.stringify(
    (await page.evaluate(() => [...document.querySelectorAll('button')]
      .map((b) => (b.innerText || '').replace(/s+/g, ' ').trim())
      .filter((t) => /rule|draw|canvas|flow/i.test(t)).slice(0, 8)))
  ))
  {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(
        (x) => (x.innerText || '').trim() === 'Rule builder',
      )
      b?.click()
    })
    await k.wait(3000)
    await k.probe('p-canvas')
    await k.snap('canvas')
    const m = await page.evaluate(() => {
      const side = document.querySelector('.shell-flow-side')
      const rf = document.querySelector('.react-flow')
      const box = (el) => (el ? Math.round(el.getBoundingClientRect().width) : null)
      const scroller = document.querySelector('.rl-results') || side
      return {
        window: window.innerWidth,
        side: box(side),
        drawing: box(rf),
        resultsScrollW: scroller ? scroller.scrollWidth : null,
        resultsClientW: scroller ? scroller.clientWidth : null,
      }
    })
    console.log('MEASURED ' + JSON.stringify(m))
  }
}
