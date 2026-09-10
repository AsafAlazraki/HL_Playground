/* Our own configurator, driven the same way the competitors were, so
 * the comparison is like for like: same browser, same viewport, same
 * shutter. The target is the cascade sheet — press a different price
 * rung on a quote with lines on it and it has something to say. */
export default async function (page, k) {
  await k.go('http://localhost:5090/', 5000)

  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1200)
  }

  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) {
    await load.first().click()
    await k.wait(4000)
  }
  await k.snap('01-home')

  /* Into the configurator, by the route `check-shots.mjs` already
     proved reaches it. */
  await page.getByRole('link', { name: /^New quote$/ }).first().click().catch(() => {})
  await page.getByRole('button', { name: /^New quote$/ }).first().click().catch(() => {})
  await k.wait(2500)
  await k.snap('02-new-quote')

  const places = page.getByRole('list', { name: /places you can quote from/i })
  if (await places.count()) {
    await places.getByRole('button').first().click()
    await k.wait(1800)
  }

  /* Highlight a hull, then walk the three tabs at the foot: Choose →
     Configure → Address. */
  await k.deepTap('Highfield - ADV7 (HYP) B-G-B', 0)
  await k.wait(1500)
  await k.snap('03a-chosen')

  await page.getByRole('tab', { name: /Configure/i }).first().click().catch(() => {})
  await k.deepTap('Configure', 0)
  await k.wait(2500)
  await k.snap('03b-configure')

  await page
    .getByRole('button', { name: /Start the quote|Back to the quote|Build it/ })
    .first()
    .click()
    .catch(() => {})
  await k.wait(3500)
  await k.snap('03-configurator')
  await k.probe('03-configurator-controls', 140)

  /* THE CASCADE. The price rung is the choice that touches every line
     already made, so it is the one that opens the sheet. */
  const rungs = await page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('button,[role="radio"],[role="tab"]')) {
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim()
      if (t) out.push(t)
    }
    return out
  })
  console.log(`\ncontrols on the bar: ${rungs.slice(0, 40).join(' | ')}`)

  for (const word of ['Trade', 'Retail', 'Cash', 'Fitted', 'Warranty']) {
    const b = page.getByRole('button', { name: new RegExp(`^${word}$`, 'i') }).first()
    if (await b.count()) {
      await b.click().catch(() => {})
      await k.wait(1400)
      const d = await k.dialogs()
      if (d.length) {
        console.log(`\n*** CASCADE on "${word}" ***\n${d[0].slice(0, 700)}\n***`)
        await k.snap(`04-cascade-${word.toLowerCase()}`)
        return
      }
    }
  }
  await k.snap('04-no-cascade')
}
