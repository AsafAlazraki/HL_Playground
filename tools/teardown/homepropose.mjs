export default async function (page, k) {
  await k.go('http://localhost:5090/', 5000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  await page.getByRole('button', { name: /Start a table/i }).first().click()
  await k.wait(1000)
  await page.getByRole('button', { name: /^Boats / }).first().click()
  await k.wait(1000)
  await page.locator('input').last().fill('Highfield Inflatables')
  await page.getByRole('button', { name: /^Create table$/ }).first().click()
  await k.wait(2500)
  await k.snap('home-propose')
  await k.text('t-home')
}
