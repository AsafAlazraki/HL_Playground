/* MODULE_SYSTEM §5 — a capability that cannot be turned on says what
 * is missing. Open a module whose tables relate to nothing. */
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
  await page.getByRole('button', { name: /^Modules/ }).first().click()
  await k.wait(2000)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      /Labour Rates/.test((x.innerText || '').trim()),
    )
    b?.click()
  })
  await k.wait(2500)
  await page.getByRole('tab', { name: /^Settings$/ }).first().click()
  await k.wait(2000)
  await k.snap('refusals')
  const said = await page.evaluate(() =>
    [...document.querySelectorAll('.md-cap-why')].map((e) => (e.textContent || '').trim().slice(0, 140)),
  )
  console.log('REFUSALS ' + JSON.stringify(said, null, 1))
}
