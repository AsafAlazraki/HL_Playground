/* the other half of §4.3: with the prepared set loaded, the screens
 * that speak for it must still speak. */
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
  await page.getByRole('button', { name: /^Data/ }).first().click()
  await k.wait(1500)
  await page.getByRole('button', { name: /Business rules/i }).first().click()
  await k.wait(2500)
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll('[role="tab"]')].map((t) => (t.innerText || '').replace(/\s+/g, ' ')),
  )
  console.log('TABS ' + JSON.stringify(tabs))
  const claim = await page.evaluate(() => {
    const t = document.body.innerText || ''
    return [...new Set(t.match(/[A-Za-z][A-Za-z &()0-9-]*\.xlsx/g) || [])].slice(0, 6)
  })
  console.log('FILES ' + JSON.stringify(claim))
  await k.snap('rules-seeded')
}
