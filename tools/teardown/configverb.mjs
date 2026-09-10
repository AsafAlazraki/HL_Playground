/* MODULE_SYSTEM §5's tenth switch, now in the contract. Turn it on
 * and confirm it is a field on the module rather than a browser key. */
export default async function (page, k) {
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
  await page.getByRole('button', { name: /Highfield/ }).first().click()
  await k.wait(2500)
  await page.getByRole('tab', { name: /^Settings$/ }).first().click()
  await k.wait(1800)
  const before = await page.evaluate(() => ({
    oldKey: window.localStorage.getItem('helmlogic.moduleRules.v1'),
  }))
  console.log('BEFORE ' + JSON.stringify(before))
  await page.getByRole('switch', { name: /^Set rules/ }).first().click()
  await k.wait(1500)
  await k.snap('switched')
  const after = await page.evaluate(() => ({
    oldKey: window.localStorage.getItem('helmlogic.moduleRules.v1'),
    switches: [...document.querySelectorAll('[role=switch]')]
      .map((el) => (el.getAttribute('aria-label') || '') + '=' + el.getAttribute('aria-checked'))
      .filter((s) => s.startsWith('Set rules')),
  }))
  console.log('AFTER  ' + JSON.stringify(after))
  await k.text('t-settings')
}
