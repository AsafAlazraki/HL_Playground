/* UX_PASS §4.3 — "No surface may name a file the user did not
 * import." A BLANK sheet: sign in, make one table of my own, then
 * walk the rules screen and see which workbook names are on it. */
export default async function (page, k) {
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  /* my own table, nothing prepared */
  await page.getByRole('button', { name: /Start a table/i }).first().click()
  await k.wait(1000)
  await page.getByRole('button', { name: /^Boats / }).first().click()
  await k.wait(1000)
  await page.locator('input').last().fill('My Own Boats')
  await page.getByRole('button', { name: /^Create table$/ }).first().click()
  await k.wait(2000)

  await page.getByRole('button', { name: /^Data/ }).first().click()
  await k.wait(1500)
  await page.getByRole('button', { name: /Business rules/i }).first().click()
  await k.wait(2500)

  const claims = async (label) => {
    const found = await page.evaluate(() => {
      const t = document.body.innerText || ''
      const names = t.match(/[A-Za-z][A-Za-z &()0-9-]*\.xlsx/g) || []
      const mpf = (t.match(/Master Price File/g) || []).length
      return { files: [...new Set(names)].slice(0, 8), masterPriceFile: mpf }
    })
    console.log(label + ' ' + JSON.stringify(found))
  }
  await k.snap('rules-blank')
  await claims('FROM-FILE-TAB')
  await k.deepTap('What is checked')
  await k.wait(1500)
  await k.snap('checks-blank')
  await claims('CHECKS-TAB   ')
}
