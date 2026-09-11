/* CLUELESS_USER_TESTS O6 — "the last two result columns still need a
 * scroll, and the drawing gets thin while an answer is up. Worth
 * re-checking at 1920, where it should all fit." Measure both. */
async function openCanvas(page, k) {
  /* the door is a page action on the bar */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(
      (x) => (x.innerText || '').trim() === 'Rule builder',
    )
    b?.click()
  })
  await k.wait(3000)
}

async function measure(page, k, w, h, tag) {
  await page.setViewportSize({ width: w, height: h })
  await k.wait(1200)
  await k.snap(tag)
  const m = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel)
      return el ? Math.round(el.getBoundingClientRect().width) : null
    }
    const side = document.querySelector('.shell-flow-side')
    const scroller = document.querySelector('.rl-results') || side
    const table = document.querySelector('.rl-results table, table')
    return {
      window: window.innerWidth,
      drawing: box('.react-flow'),
      side: side ? Math.round(side.getBoundingClientRect().width) : null,
      scrollW: scroller ? scroller.scrollWidth : null,
      clientW: scroller ? scroller.clientWidth : null,
      tableW: table ? Math.round(table.getBoundingClientRect().width) : null,
    }
  })
  console.log(tag + ' ' + JSON.stringify(m))
}

export default async function (page, k) {
  await page.setViewportSize({ width: 1280, height: 800 })
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) { await load.first().click(); await k.wait(6000) }
  await k.go('http://localhost:5090/?at=fitment', 4000)
  await openCanvas(page, k)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      (x.innerText || '').trim().startsWith('Motor fitment'),
    )
    b?.click()
  })
  await k.wait(2500)
  await k.probe('p-rule')
  const classes = await page.evaluate(() =>
    [...new Set([...document.querySelectorAll('[class]')].flatMap((e) =>
      [...e.classList].filter((c) => /^(rl|shell-flow|react-flow)/.test(c)),
    ))].slice(0, 24),
  )
  console.log('CLASSES ' + JSON.stringify(classes).slice(0, 200))
  /* AN ANSWER UP is the state O6 measured — run the rule */
  await page.getByRole('button', { name: /^Run$/ }).first().click()
  await k.wait(4000)
  await measure(page, k, 1280, 800, 'AT-1280')
  await measure(page, k, 1920, 1080, 'AT-1920')
}
