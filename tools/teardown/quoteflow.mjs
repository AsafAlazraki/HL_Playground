/* The quote flow, end to end, photographed at every step. */
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

  /* 1 · the act */
  await page.getByRole('button', { name: /^New quote$/ }).first().click()
  await k.wait(2500)
  await k.snap('1-picker')

  /* 2 · pick a brand, then a boat */
  const brand = page.getByRole('button', { name: /Highfield/ })
  if (await brand.count()) { await brand.first().click(); await k.wait(2000) }
  await k.snap('2-brand')

  const boat = page.locator('button').filter({ hasText: /\$[0-9]/ })
  console.log('BOATS ' + (await boat.count()))
  if (await boat.count()) { await boat.first().click(); await k.wait(3000) }
  await k.snap('3-build')
  await page.getByRole('button', { name: /Start the quote/ }).first().click()
  await k.wait(3500)
  await k.snap('4-configure')
  await k.text('t-configure')
  /* step through the bands */
  const bands = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .map((b) => (b.innerText || '').replace(/s+/g, ' ').trim())
      .filter((t) => /Configure|Address|Motors|Trailers|Rigging/i.test(t))
      .slice(0, 10),
  )
  console.log('BANDS ' + JSON.stringify(bands))
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      /^Address/.test((x.innerText || '').trim()),
    )
    b?.click()
  })
  await k.wait(2500)
  await k.snap('5-address')
  /* and the document a customer is handed */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      /Give it to the customer|Document|Preview/i.test((x.innerText || '').trim()),
    )
    b?.click()
  })
  await k.wait(2500)
  await k.snap('6-document')
}
