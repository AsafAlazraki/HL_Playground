/* Does the refusal strike actually draw, and does it survive when
 * the animation does not run? The second half is the one that
 * matters: a refusal that needs an animation to be visible is a
 * refusal that disappears under prefers-reduced-motion and on paper. */
export default async function (page, k) {
  await k.go('http://localhost:5090/', 5000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1200)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) { await load.first().click(); await k.wait(4000) }
  await page.getByRole('button', { name: /^New quote$/ }).first().click().catch(() => {})
  await k.wait(2500)
  const places = page.getByRole('list', { name: /places you can quote from/i })
  if (await places.count()) { await places.getByRole('button').first().click(); await k.wait(1500) }
  await k.deepTap('Highfield - ADV7 (HYP) B-G-B', 0)
  await k.wait(1200)
  await k.deepTap('Configure', 0)
  await k.wait(2500)
  await page.getByRole('button', { name: /Start the quote|Back to the quote/ }).first().click().catch(() => {})
  await k.wait(3000)

  /* Open a "not offered" list, which is where refusals live. A
     synthetic el.click() scrolled the page and did not open it, so
     this goes through the real control. */
  const show = page.getByRole('button', { name: /^Show them$/ }).first()
  await show.scrollIntoViewIfNeeded().catch(() => {})
  await show.click({ timeout: 8000 }).catch(() => console.log('click failed'))
  await k.wait(2500)

  const report = await page.evaluate(() => {
    const out = []
    const figs = document.querySelectorAll('.s-refused .s-figure')
    out.push('refused figures on screen: ' + figs.length)
    if (figs.length === 0) return out
    const el = figs[0]
    const a = getComputedStyle(el, '::after')
    out.push('  ::after content   ' + a.content)
    out.push('  ::after border    ' + a.borderTopWidth + ' ' + a.borderTopStyle + ' ' + a.borderTopColor)
    out.push('  ::after transform ' + a.transform)
    out.push('  ::after animation ' + a.animationName + ' ' + a.animationDuration)
    out.push('  figure position   ' + getComputedStyle(el).position)
    out.push('  figure text-dec   ' + getComputedStyle(el).textDecorationLine)
    return out
  })
  for (const r of report) console.log(r)
  await k.snap('refusals')
}
