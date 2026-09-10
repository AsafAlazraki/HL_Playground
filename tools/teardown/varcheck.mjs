/* Measure whether three var() names that nothing declares are dead in
 * the browser, rather than reasoning about the cascade. */
export default async function (page, k) {
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  const out = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const probe = (cls) => {
      const el = document.createElement('div')
      el.className = cls
      document.body.appendChild(el)
      const cs = getComputedStyle(el)
      const got = {
        animation: cs.animationName + ' / ' + cs.animationTimingFunction,
        transition: cs.transitionProperty + ' / ' + cs.transitionTimingFunction,
        padding: cs.paddingTop,
        color: cs.color,
      }
      el.remove()
      return got
    }
    return {
      easeSettle: JSON.stringify(root.getPropertyValue('--ease-settle')),
      s6: JSON.stringify(root.getPropertyValue('--s-6')),
      s7: JSON.stringify(root.getPropertyValue('--s-7')),
      fg: JSON.stringify(root.getPropertyValue('--fg')),
      fgPrimary: JSON.stringify(root.getPropertyValue('--fg-primary')),
      win: probe('win'),
    }
  })
  console.log('VARS ' + JSON.stringify(out, null, 1))
}
