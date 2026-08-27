export async function signInFull(page) {
  await page.waitForTimeout(1200)
  if (await page.locator('button.si-demo').count()) {
    await page.locator('button.si-demo').click()
    await page.waitForTimeout(200)
    await page.locator('button.si-go').click()
    await page.waitForTimeout(3000)
  }
}
export async function loadData(page) {
  const door = page.locator('button.hm-first-door--data')
  if (await door.count()) {
    await door.click()
    await page.waitForTimeout(6000)
  }
}
