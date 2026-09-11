/* adopt 11 — paste the same block twice and the second time it
 * arrives mapped, and says so. */
const press = (page, src) =>
  page.evaluate((s) => {
    const rx = new RegExp(s)
    const b = [...document.querySelectorAll('button')].find((x) => rx.test((x.innerText || '').trim()))
    b?.click()
    return Boolean(b)
  }, src)

async function openFold(page, k) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.ab button')].find((x) => (x.innerText || '').trim() === 'View')
    b?.click()
  })
  await k.wait(900)
}

async function paste(page, k, text) {
  await openFold(page, k)
  await press(page, 'Paste rows')
  await k.wait(1500)
  await page.locator('textarea').first().click()
  await page.keyboard.insertText(text)
  await k.wait(2200)
  const said = await page.evaluate(() => {
    const p = document.querySelector('.io-paste-recalled')
    return p ? (p.textContent || '').trim() : null
  })
  return said
}

export default async function (page, k) {
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
  await page.setViewportSize({ width: 1440, height: 900 })
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) { await load.first().click(); await k.wait(8000) }
  await page.keyboard.press('Control+k')
  await k.wait(900)
  await page.keyboard.type('Labour', { delay: 30 })
  await k.wait(1600)
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.hs-opt')].find((o) => !o.classList.contains('hs-opt--module'))
    t?.click()
  })
  await k.wait(3000)
  await press(page, '^List$')
  await k.wait(2500)

  const BLOCK = 'Rate\tActual\nRetail Labour\t222.22'
  console.log('FIRST PASTE recalled=' + JSON.stringify(await paste(page, k, BLOCK)))
  await k.snap('first')
  console.log('PUT ' + (await press(page, 'Put it in')))
  await k.wait(2500)

  console.log('SECOND PASTE recalled=' + JSON.stringify(await paste(page, k, BLOCK)))
  await k.snap('second')
  console.log('ERRORS ' + JSON.stringify([...new Set(errs)].slice(0, 2)))
}
