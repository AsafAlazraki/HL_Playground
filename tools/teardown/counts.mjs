/* Backlog row 86: the removal control says 53 example tables, the
 * gallery header says 51 Tables, the nav says Data 53. Which is
 * wrong? Measure the store rather than reason about the source. */
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

  const out = await page.evaluate(() => {
    /* The store is not on window, so read what the screens say. */
    const nav = [...document.querySelectorAll('*')].find(
      (el) => el.children.length === 0 && /^\d+$/.test((el.textContent || '').trim()) &&
        (el.parentElement?.textContent || '').includes('Data'),
    )
    return ['nav Data count: ' + (nav?.textContent?.trim() ?? 'not found')]
  })
  for (const o of out) console.log(o)

  await page.getByRole('button', { name: /^Data/i }).first().click().catch(() => {})
  await k.wait(2000)
  await page.getByRole('button', { name: /All tables/i }).first().click().catch(() => {})
  await k.wait(2500)

  const tally = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.hm-tally-cell')].map((c) => {
      const dt = c.querySelector('dt')?.textContent?.trim() ?? ''
      const dd = c.querySelector('dd')?.textContent?.trim() ?? ''
      return `${dt} = ${dd}`
    })
    const note = document.querySelector('.hm-tally-note')?.textContent?.trim() ?? 'NOT DRAWN'
    cells.push('NOTE = ' + note)
    const cards = document.querySelectorAll('.hm-card-name').length
    const chips = document.querySelectorAll('.hm-card-example').length
    return [...cells, 'cards drawn = ' + cards, 'example chips = ' + chips]
  })
  for (const t of tally) console.log('  ' + t)
}
