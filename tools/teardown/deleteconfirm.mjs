/* The delete confirm, which is the largest act in the app and whose
 * copy this change made true. Drive to it and read what it says. */
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

  /* Into Data, then a table, then its designer. */
  await page.getByRole('link', { name: /^Data/ }).first().click().catch(() => {})
  await page.getByRole('button', { name: /^Data/ }).first().click().catch(() => {})
  await k.wait(2500)
  await k.snap('data')

  await page.getByRole('button', { name: /^All tables/ }).first().click().catch(() => {})
  await k.wait(1200)
  await page.getByRole('button', { name: /^Open .+ — / }).first().click().catch(() => {})
  await k.wait(2500)
  await k.snap('table')
  await k.probe('table-controls', 90)

  /* The designer is where the delete lives. */
  for (const name of [/Design|Designer|Edit table|Table setup|Columns/i]) {
    const b = page.getByRole('button', { name }).first()
    if (await b.count()) { await b.click().catch(() => {}); await k.wait(2000); break }
  }
  await k.snap('designer')

  const del = page.getByRole('button', { name: /Delete (this )?table|Delete table/i }).first()
  if (await del.count()) {
    await del.scrollIntoViewIfNeeded().catch(() => {})
    await del.click().catch(() => {})
    await k.wait(1800)
    await k.snap('confirm')
    const said = await page.evaluate(() => {
      const lines = [...document.querySelectorAll('.ds-cs-line')]
      return lines.map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
    })
    console.log('--- the confirm says ---')
    for (const l of said) console.log('  ' + l)
  } else {
    console.log('no delete control found')
    await k.probe('designer-controls', 120)
  }
}
