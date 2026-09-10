/* What colour is a card fact actually painted? The stylesheet says
 * --fg-secondary; the screenshot says blue. Measure, do not guess. */
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
  await k.wait(3500)

  const out = await page.evaluate(() => {
    const rows = []
    for (const sel of ['.qb-card-facts', '.qb-card-fact', '.qb-card-fact-lab', '.qb-card-name', '.qb-card-price']) {
      const el = document.querySelector(sel)
      if (!el) { rows.push(`${sel}: NOT FOUND`); continue }
      const cs = getComputedStyle(el)
      rows.push(`${sel}: color=${cs.color} size=${cs.fontSize} weight=${cs.fontWeight}`)
    }
    const card = document.querySelector('.qb-card')
    if (card) rows.push(`.qb-card: color=${getComputedStyle(card).color} bg=${getComputedStyle(card).backgroundColor}`)
    return rows
  })
  for (const r of out) console.log(r)
}
