/* HOW MANY QUOTES FIT ON THE DIARY LIST AT ONCE. */
export default async function (page, k) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(2000)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) { await load.first().click(); await k.wait(8000) }

  await page.getByRole('button', { name: /^New quote$/ }).first().click()
  await k.wait(2500)
  const brand = page.getByRole('button', { name: /Highfield/ })
  if (await brand.count()) { await brand.first().click(); await k.wait(2000) }
  const boat = page.locator('button').filter({ hasText: /\$[0-9]/ })
  if (await boat.count()) { await boat.first().click(); await k.wait(3000) }
  const start = page.getByRole('button', { name: /Start the quote/ })
  if (await start.count()) { await start.first().click(); await k.wait(3500) }

  const quotes = page.getByRole('button', { name: /^Quotes( \d+)?$/ })
  if (await quotes.count()) { await quotes.first().click(); await k.wait(2000) }
  const list = page.getByRole('button', { name: /^List$/ })
  if (await list.count()) { await list.first().click(); await k.wait(1800) }
  await k.snap('list')

  const m = await page.evaluate(() => {
    const row = document.querySelector('.qt-list-row')
    const port = document.querySelector('.qt-root--doc')
    const ul = document.querySelector('.qt-list')
    const r = row?.getBoundingClientRect()
    const p = port?.getBoundingClientRect()
    return {
      rows: document.querySelectorAll('.qt-list-row').length,
      rowH: r ? Math.round(r.height) : null,
      rowGap: ul ? getComputedStyle(ul).rowGap : null,
      ulPad: ul ? getComputedStyle(ul).padding : null,
      portH: p ? Math.round(p.height) : null,
      innerH: window.innerHeight,
    }
  })
  console.log('MEASURED ' + JSON.stringify(m))
  const gap = parseFloat(m.rowGap ?? '0') || 0
  const step = (m.rowH ?? 0) + gap
  console.log('FIT ' + (step > 0 ? ((m.portH ?? 0) / step).toFixed(2) : 'n/a') + ' rows at 1440x900')
}
