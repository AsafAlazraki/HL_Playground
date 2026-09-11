/* CONFIG_FINDINGS adopt 7 — the apply log, driven on the real seed:
 * paste one changed value into Labour Rates, then ask the register
 * what was merged and read the value the cell used to hold. */
const press = (page, src) =>
  page.evaluate((s) => {
    const rx = new RegExp(s)
    const b = [...document.querySelectorAll('button')].find((x) =>
      rx.test((x.innerText || '').trim()),
    )
    b?.click()
    return Boolean(b)
  }, src)

async function openFold(page, k) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.ab button')].find(
      (x) => (x.innerText || '').trim() === 'View',
    )
    b?.click()
  })
  await k.wait(900)
}

export default async function (page, k) {
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)))
  await page.setViewportSize({ width: 1600, height: 1000 })
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) { await load.first().click(); await k.wait(6000) }

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

  await openFold(page, k)
  await press(page, 'Paste rows')
  await k.wait(1500)
  await page.locator('textarea').first().click()
  await page.keyboard.insertText('Rate\tActual\nRetail Labour\t123.45')
  await k.wait(2200)
  await k.snap('preflight')
  console.log('PREFLIGHT ' + JSON.stringify(await page.evaluate(() => {
    const s = [...document.querySelectorAll('[role="dialog"]')].pop()
    const t = s ? (s.innerText || '') : ''
    const i = t.indexOf('WHAT LANDS')
    return t.slice(i, i + 260).replace(/\n/g, ' | ')
  })))
  console.log('PUT ' + (await press(page, 'Put it in')))
  await k.wait(3000)
  await k.snap('after')

  console.log('GRID HOLDS THE MERGED VALUE ' + (await page.evaluate(() =>
    [...document.querySelectorAll('[role="gridcell"], .gr-cell')].map((e) => (e.textContent || '').trim()).includes('123.45'),
  )))
  await openFold(page, k)
  console.log('LOGBTN ' + (await press(page, 'Merge log')))
  await k.wait(1800)
  await k.snap('merge-log')
  console.log('LOG ' + JSON.stringify(await page.evaluate(() => {
    const s = [...document.querySelectorAll('[role="dialog"]')].pop()
    return s ? (s.innerText || '').replace(/\n/g, ' | ').slice(0, 500) : 'NO SHEET'
  })))
  console.log('ERRORS ' + JSON.stringify(errs.slice(0, 2)))
}
