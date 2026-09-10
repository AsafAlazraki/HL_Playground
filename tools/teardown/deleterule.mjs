/* Row 8, the owner's decision: a business rule can be deleted. Load
 * the real sheet, open a rule, delete it, and read the toast. */
export default async function (page, k) {
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) { await load.first().click(); await k.wait(6000) }
  await page.getByRole('button', { name: /^Data/ }).first().click()
  await k.wait(1500)
  await page.getByRole('button', { name: /Business rules/i }).first().click()
  await k.wait(2500)
  await k.deepTap('Rules you write')
  await k.wait(1500)
  await k.snap('rules')
  const count = () => page.locator('.cn-card').count()
  console.log('CARDS BEFORE ' + (await count()))
  await k.deepTap('Write a rule')
  await k.wait(1500)
  await k.snap('composer')
  await k.probe('p-composer')
  await k.text('t-composer')
  await k.deepTap('Take me to it')
  await k.wait(1200)
  await k.snap('picking')
  await k.probe('p-picking')
  const sels = await page.evaluate(() =>
    [...document.querySelectorAll('.cn-new select, .cn-lede select, select')].map((el, i) => ({
      i,
      label: el.getAttribute('aria-label') || '',
      options: [...el.options].slice(0, 6).map((o) => o.textContent),
    })),
  )
  console.log('SELECTS ' + JSON.stringify(sels).slice(0, 400))
  /* the token's <select> is styled invisible, so Playwright's
     actionability check never settles — set the value and fire the
     event the way the browser would */
  const pick = async (label, want) => {
    await page.evaluate(([l, w]) => {
      const el = [...document.querySelectorAll('select')].find(
        (x) => x.getAttribute('aria-label') === l,
      )
      if (!el) return
      const opt = [...el.options].find((o) => (o.textContent || '').startsWith(w))
      if (!opt) return
      el.value = opt.value
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, [label, want])
    await k.wait(900)
  }
  await pick('The column the rule looks at', 'Hull Length (mtr)')
  await k.snap('picked')
  const after = await page.evaluate(() =>
    [...document.querySelectorAll('select, input')].map((el) => ({
      tag: el.tagName,
      label: el.getAttribute('aria-label') || el.placeholder || '',
    })),
  )
  console.log('FIELDS ' + JSON.stringify(after).slice(0, 700))
  await page.getByLabel('The value').first().fill('4.5', { force: true })
  await k.wait(700)
  await pick('The column the rule sets', 'Beam (mtr)')
  const vals = page.getByLabel('The value')
  if ((await vals.count()) > 1) await vals.nth(1).fill('2.2', { force: true })
  await k.wait(700)
  await page.getByPlaceholder('why this rule exists, in plain words').fill(
    'a hull that long needs the wider beam to sit right on the trailer',
  )
  await k.wait(700)
  await k.snap('composed')
  const more = await page.evaluate(() =>
    [...document.querySelectorAll('select, input')].map((el) => ({
      tag: el.tagName,
      label: el.getAttribute('aria-label') || el.placeholder || '',
      value: el.value,
    })),
  )
  console.log('COMPOSED ' + JSON.stringify(more).slice(0, 900))
  const add = page.getByRole('button', { name: /^Add rule$/ })
  console.log('ADD DISABLED ' + (await add.first().isDisabled()))
  await add.first().click()
  await k.wait(1500)
  await k.snap('added')
  console.log('LIMITS AFTER ADD ' + (await page.locator('.cn-card').count()))
  /* open the limit that was just written */
  const opened = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.cn-card')]
    const limit = cards.find((c) => (c.innerText || '').includes('must be'))
    const open = limit?.querySelector('.cn-card-open')
    if (!open) return 'no open control'
    open.click()
    return 'clicked'
  })
  console.log('OPEN ' + opened)
  await k.wait(900)
  await k.snap('open')
  const seen = await page.evaluate(() => ({
    cards: document.querySelectorAll('.cn-card').length,
    open: document.querySelectorAll('.cn-card.is-open').length,
    drop: document.querySelectorAll('.cn-drop').length,
    done: document.querySelectorAll('.cn-done').length,
    text: [...document.querySelectorAll('.cn-card')].map((el) => (el.innerText || '').slice(0, 60)),
  }))
  console.log('SEEN ' + JSON.stringify(seen))
  const drop = page.locator('.cn-drop')
  console.log('DELETE CONTROLS ' + (await drop.count()))
  if (await drop.count()) await drop.first().click()
  await k.wait(1200)
  console.log('CARDS AFTER  ' + (await count()))
  await k.snap('deleted')
  await k.text('t-deleted')
  await page.getByRole('button', { name: /^Undo$/ }).first().click()
  await k.wait(1200)
  console.log('CARDS AFTER UNDO ' + (await count()))
  const back = await page.evaluate(() =>
    [...document.querySelectorAll('.cn-card')].map((c) => (c.innerText || '').replace(/s+/g, ' ').slice(0, 70)),
  )
  console.log('BACK ' + JSON.stringify(back))
  await k.snap('undone')
}
