/* the keyboard half of §3 Screen 5 — the grip's arrow keys */
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
  await page.getByRole('button', { name: /^Reorder$/ }).first().click()
  await k.wait(1000)
  const names = () => page.evaluate(() =>
    [...document.querySelectorAll('.md-grid-slot')].slice(0, 3).map(
      (el) => (el.innerText || '').split(String.fromCharCode(10))[0],
    ),
  )
  console.log('BEFORE ' + JSON.stringify(await names()))
  const grip = page.locator('.md-grip').first()
  console.log('LABEL ' + JSON.stringify(await grip.getAttribute('aria-label')))
  await grip.focus()
  await page.keyboard.press('ArrowRight')
  await k.wait(900)
  console.log('AFTER  ' + JSON.stringify(await names()))
  await k.snap('after-key')
}
