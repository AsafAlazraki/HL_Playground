/* MODULE_SYSTEM §3 Screen 5 — "Cards are dragged into order", on the
 * modules grid. Load the real sheet, turn Reorder on, and drag the
 * third card onto the first. */
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
  await page.getByRole('button', { name: /^Modules/ }).first().click()
  await k.wait(2000)
  await page.getByRole('button', { name: /^Reorder$/ }).first().click()
  await k.wait(1200)
  await k.snap('ordering')

  const names = () => page.evaluate(() =>
    [...document.querySelectorAll('.md-grid-slot')].slice(0, 4).map(
      (el) => (el.innerText || '').split('\n')[0],
    ),
  )
  console.log('BEFORE ' + JSON.stringify(await names()))

  const grips = page.locator('.md-grip')
  console.log('GRIPS ' + (await grips.count()))

  /* drag the third grip onto the first card */
  const third = await grips.nth(2).boundingBox()
  const firstCard = await page.locator('.md-grid-slot').first().boundingBox()
  if (!third || !firstCard) { console.log('NO BOX'); return }
  await page.mouse.move(third.x + third.width / 2, third.y + third.height / 2)
  await page.mouse.down()
  await k.wait(200)
  await page.mouse.move(firstCard.x + firstCard.width / 2, firstCard.y + firstCard.height / 2, { steps: 12 })
  await k.wait(400)
  await k.snap('mid-drag')
  const lift = await page.evaluate(() => {
    const held = document.querySelector('.md-grid-slot[data-held]')
    if (!held) return { held: 0 }
    const card = held.firstElementChild
    const cs = card ? getComputedStyle(card) : null
    return {
      held: 1,
      name: (held.innerText || '').split(String.fromCharCode(10))[0],
      shadow: cs ? cs.boxShadow.slice(0, 60) : '',
      outline: cs ? cs.outlineWidth + ' ' + cs.outlineColor : '',
      z: getComputedStyle(held).zIndex,
    }
  })
  console.log('LIFT ' + JSON.stringify(lift))
  await page.mouse.up()
  await k.wait(1200)
  await k.snap('dropped')
  console.log('AFTER  ' + JSON.stringify(await names()))
}
