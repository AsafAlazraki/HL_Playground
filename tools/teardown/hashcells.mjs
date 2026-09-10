/* CONFIG_FINDINGS §4 Adopt 9 — a supplier file with cached #N/A and
 * #VALUE! still in it, through the real CSV door. */
export default async function (page, k) {
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  await page.getByRole('button', { name: /Start a table/i }).first().click()
  await k.wait(1200)
  await page.getByRole('button', { name: /Read a CSV/i }).first().click()
  await k.wait(1000)
  await page.locator('input[type=file]').first().setInputFiles(
    'C:/Users/Asaf/AppData/Local/Temp/claude/hash.csv',
  )
  await k.wait(2500)
  await k.snap('csv-read')
  await k.text('t-csv-read')
}
