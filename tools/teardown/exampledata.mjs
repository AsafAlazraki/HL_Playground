/* UX_PASS §4.1 and §4.2 — the backlog calls both OPEN. features/io/
 * exampleData.ts says otherwise. Drive it and find out which. */
export default async function (page, k) {
  await k.go('http://localhost:5090/', 5000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1200)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) { await load.first().click(); await k.wait(5000) }

  /* The control lives in the import/export menu's footer. */
  await k.snap('home')
  /* the table gallery is behind a door on Home */
  await page.getByRole('button', { name: /^Data/i }).first().click().catch(() => {})
  await k.wait(2000)
  await page.getByRole('button', { name: /All tables/i }).first().click().catch(() => {})
  await k.wait(2500)
  await k.snap('gallery')
  const chips = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.hm-card-example')]
    const cards = [...document.querySelectorAll('.hm-card-name')].length
    const own = [...document.querySelectorAll('.hm-cell')].filter(
      (el) => !el.querySelector('.hm-card-example'),
    ).length
    const hm = new Set()
    for (const el of document.querySelectorAll('[class*="hm-"]')) {
      for (const cl of el.classList) if (cl.startsWith('hm-')) hm.add(cl)
    }
    return ['table cards on screen: ' + cards, 'provenance chips: ' + c.length,
            'chip text: ' + JSON.stringify(c[0]?.textContent ?? ''),
            'cards WITHOUT a chip: ' + own]
  })
  for (const c of chips) console.log(c)
}
