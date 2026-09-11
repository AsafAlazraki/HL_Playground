/* adopt 10 — type the terms once in Admin, and a new quote starts
 * with them. */
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
    const b = [...document.querySelectorAll('button')].find((x) => (x.innerText||'').trim().startsWith('Admin'))
    b?.click()
  })
  await k.wait(3000)
  await k.snap('admin')
  const field = page.getByLabel('The sentence every new quote starts with')
  console.log('FIELD ' + (await field.count()))
  if (await field.count()) {
    await field.first().click()
    await page.keyboard.type('This quote is valid for 30 days.', { delay: 15 })
    await page.keyboard.press('Tab')
    await k.wait(1200)
    await k.snap('typed')
    console.log('STORED ' + JSON.stringify(await page.evaluate(() => {
      const f = [...document.querySelectorAll('input')].find((i) => (i.value||'').startsWith('This quote'))
      return f ? f.value : null
    })))
  }
  console.log('ERRORS ' + JSON.stringify([...new Set(errs)].slice(0, 2)))
}
