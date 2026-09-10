/* @property and mask-composite both fail SILENTLY when unsupported —
 * the beam would simply not paint and nothing would say so. Measure
 * the pseudo-element rather than trust the stylesheet. */
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

  const report = await page.evaluate(() => {
    const out = []
    out.push('@property registered: ' + (CSS.registeredProperty === undefined ? 'no API to ask' : 'API present'))
    out.push('mask-composite supported: ' + CSS.supports('mask-composite', 'exclude'))
    out.push('conic-gradient supported: ' + CSS.supports('background', 'conic-gradient(from 0deg, red, blue)'))
    const heads = [...document.querySelectorAll('.qb-band-head')]
    out.push('band heads: ' + heads.length)
    const open = heads.find((h) => h.getAttribute('aria-expanded') === 'true')
    if (!open) { out.push('no open band'); return out }
    out.push('open head data-hushed: ' + String(open.getAttribute('data-hushed')))
    const b = getComputedStyle(open, '::before')
    out.push('  ::before content   ' + b.content)
    out.push('  ::before animation ' + b.animationName + ' ' + b.animationDuration)
    out.push('  ::before bg        ' + b.backgroundImage.slice(0, 60))
    out.push('  ::before mask-comp ' + (b.maskComposite || b.webkitMaskComposite))
    return out
  })
  for (const r of report) console.log(r)

  /* And press it, so the beam is mid-flight when the shutter opens. */
  const head = page.locator('.qb-band-head[aria-expanded="false"]').first()
  if (await head.count()) {
    await head.scrollIntoViewIfNeeded().catch(() => {})
    await head.click().catch(() => {})
    /* three frames across the pass, so the sweep can be seen to
       move rather than inferred from one still */
    await page.waitForTimeout(90)
    await k.snap('sweep-early')
    await page.waitForTimeout(120)
    await k.snap('sweep-mid')
    await page.waitForTimeout(140)
    await k.snap('sweep-late')
  }
}
