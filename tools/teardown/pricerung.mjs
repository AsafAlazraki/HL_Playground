/* MODULE_SYSTEM §2 defect 3 — declare a column a price rung. */
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
  await page.keyboard.type('Labour', { delay: 30 })
  await k.wait(1600)
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.hs-opt')].find((o) => !o.classList.contains('hs-opt--module'))
    t?.click()
  })
  await k.wait(3000)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.innerText||'').trim() === 'List')
    b?.click()
  })
  await k.wait(2500)
  /* the menu on a number column */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      (x.getAttribute('aria-label') || '').startsWith('Actual column menu'))
    b?.click()
  })
  await k.wait(1200)
  await k.snap('menu')
  console.log('MENU ' + JSON.stringify(await page.evaluate(() =>
    [...document.querySelectorAll('.tb-acts .ui-row-name, .tb-acts button')].map((e) => (e.textContent||'').trim()).slice(0, 10))))
  await page.evaluate(() => {
    const r = [...document.querySelectorAll('.ui-row')].find((x) => /Price from this column/.test(x.textContent||''))
    r?.click()
  })
  await k.wait(1000)
  await k.snap('ask')
  console.log('ASK ' + JSON.stringify(await page.evaluate(() => {
    const body = document.querySelector('.tb-menu-body')
    return body ? (body.innerText||'').replace(/\n/g, ' | ') : 'NO ASK'
  })))
  await page.evaluate(() => {
    const r = [...document.querySelectorAll('.ui-row')].find((x) => /The whole quote/.test(x.textContent||''))
    r?.click()
  })
  await k.wait(1200)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      (x.getAttribute('aria-label') || '').startsWith('Actual column menu'))
    b?.click()
  })
  await k.wait(1200)
  await k.snap('declared')
  console.log('AFTER ' + JSON.stringify(await page.evaluate(() =>
    [...document.querySelectorAll('.tb-acts .ui-row-name')].map((e) => (e.textContent||'').trim()))))
  console.log('ERRORS ' + JSON.stringify([...new Set(errs)].slice(0, 2)))
}
