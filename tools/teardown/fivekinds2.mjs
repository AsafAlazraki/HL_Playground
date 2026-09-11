/* The fifth kind in the real app. There is no quote in the seed, so
 * one is put where `quotes.ts` reads them from — localStorage, the
 * store's own file — and the page is reloaded so it comes back
 * through `loadQuotes()` exactly as a dealer's own would. */
const DOC = {
  id: 'q-probe',
  reference: 'PROBE-77',
  state: 'draft',
  viewId: 'v-probe',
  rootTableId: 't-probe',
  rootRowId: 'r-probe',
  subjectLabel: 'Probe Hull 400',
  subjectSpecs: [],
  sections: [],
  lines: [],
  adjustments: [],
  levelKey: 'retail',
  customer: { name: 'Probe Holdings' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

export default async function (page, k) {
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
  await page.evaluate((doc) => {
    localStorage.setItem('helmlogic.quotes.v1', JSON.stringify([doc]))
  }, DOC)
  await k.go('http://localhost:5090/', 7000)
  await page.keyboard.press('Control+k')
  await k.wait(900)
  await page.keyboard.type('PROBE-77', { delay: 35 })
  await k.wait(1800)
  await k.snap('quotekind')
  const seen = await page.evaluate(() =>
    [...document.querySelectorAll('.hs-opt')].slice(0, 4).map((o) => ({
      kinds: [...o.classList].filter((c) => c.startsWith('hs-opt--')),
      text: (o.innerText || '').trim().replace(/\n/g, ' · ').slice(0, 110),
    })),
  )
  console.log('ASKED ' + JSON.stringify(seen, null, 1))
  await page.evaluate(() => document.querySelector('.hs-opt--quote')?.click())
  await k.wait(2500)
  await k.snap('quotekind-landed')
  console.log('LANDED ' + JSON.stringify(await page.evaluate(() => ({
    scrim: document.querySelector('.fx-scrim') !== null,
    url: location.search,
    region: [...document.querySelectorAll('[role="region"]')]
      .map((r) => (r.getAttribute('aria-label') || '').slice(0, 40))
      .filter(Boolean),
  }))))
  await page.evaluate(() => localStorage.removeItem('helmlogic.quotes.v1'))
}
