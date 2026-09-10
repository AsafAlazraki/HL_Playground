/* MODULE_SYSTEM §10 Phase 4 — export/import as real module
 * capabilities. Load the real sheet, open a place, turn the switch on
 * in its own settings, and see whether the bar changes. */
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
  await k.snap('places')
  await k.probe('p-places')
  /* open one place, then its own set-up */
  await page.getByRole('button', { name: /Highfield/ }).first().click()
  await k.wait(2500)
  await k.snap('catalog')
  await k.probe('p-catalog')
  /* Settings, and the ten switches */
  await page.getByRole('tab', { name: /^Settings$/ }).first().click()
  await k.wait(1800)
  await k.snap('settings')
  await k.probe('p-settings')
  await k.text('t-settings')
  await page.getByRole('switch', { name: /^Export/ }).first().click()
  await k.wait(900)
  await page.getByRole('switch', { name: /^Import/ }).first().click()
  await k.wait(900)
  await k.probe('p-settings-after')
  await page.getByRole('tab', { name: /^Catalog$/ }).first().click()
  await k.wait(2500)
  await k.snap('catalog-with-travel')
  await k.probe('p-catalog-travel')
  const seen = await page.evaluate(() => ({
    pagebar: document.querySelectorAll('.pagebar').length,
    bartext: [...document.querySelectorAll('.pagebar')].map((e) => e.innerText).join(' | '),
    fileInput: document.querySelectorAll('.io-file').length,
    index: document.querySelectorAll('.md-index').length,
  }))
  console.log('PAGEBAR ' + JSON.stringify(seen))
  await page.getByRole('button', { name: /^View/ }).first().click()
  await k.wait(800)
  await k.snap('fold-open')
  await k.probe('p-fold')
  await page.getByRole('button', { name: /Export/ }).first().click()
  await k.wait(1500)
  await k.snap('exported')
  await k.text('t-exported')
}
