/* THE COLLISION AT THE TOP OF A REGISTER, MEASURED. At 390px the
 * Back control and the page title are drawn over each other. Name
 * the two boxes and how far they overlap, so the fix has a number. */
export default async function (page, k) {
  await page.setViewportSize({ width: 390, height: 844 })
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) {
    await load.first().click()
    await k.wait(8000)
  }
  await page.keyboard.press('Control+k')
  await k.wait(900)
  await page.keyboard.type('Labour', { delay: 30 })
  await k.wait(1600)
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.hs-opt')].find(
      (o) => !o.classList.contains('hs-opt--module'),
    )
    t?.click()
  })
  await k.wait(2500)
  await k.snap('head')

  console.log(
    'TOP ' +
      JSON.stringify(
        await page.evaluate(() => {
          const box = (el) => {
            if (!el) return null
            const r = el.getBoundingClientRect()
            return {
              what: (el.className && el.className.toString ? el.className.toString() : el.tagName)
                .split(' ')
                .slice(0, 2)
                .join('.'),
              text: (el.textContent || '').trim().slice(0, 24),
              x: Math.round(r.left),
              right: Math.round(r.right),
              y: Math.round(r.top),
              h: Math.round(r.height),
            }
          }
          /* the leaves painted in the top 60px — a leaf is what a
             reader actually sees collide */
          const near = [...document.querySelectorAll('body *')].filter((el) => {
            const r = el.getBoundingClientRect()
            return (
              r.height > 0 &&
              r.width > 0 &&
              r.top < 52 &&
              r.bottom > 0 &&
              el.children.length === 0 &&
              (el.textContent || '').trim() !== ''
            )
          })
          const back = [...document.querySelectorAll('button, a')].find((b) =>
            (b.innerText || b.getAttribute('aria-label') || '').trim().startsWith('Back'),
          )
          const bar = document.querySelector('.shell-view-bar')
          return {
            leaves: near.slice(0, 8).map(box),
            back: box(back),
            bar: box(bar),
            barStyle: bar
              ? (() => {
                  const c = getComputedStyle(bar)
                  return { display: c.display, flexWrap: c.flexWrap, gap: c.gap, position: c.position, padding: c.padding }
                })()
              : null,
          }
        }),
        null,
        1,
      ),
  )
}
