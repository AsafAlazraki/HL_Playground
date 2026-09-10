/* DESIGN_PRINCIPLES §5: "One accent for action. It should appear
 * roughly FOUR TIMES PER SCREEN — the primary action, the current nav
 * row, the focused control, the computed column. If a screen has
 * accent everywhere, nothing on it is primary."
 *
 * The inverse is not written down and is what this measures: a screen
 * with the accent NOWHERE never says where you are. */
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
  await page.getByRole('button', { name: /^New quote$/ }).first().click().catch(() => {})
  await k.wait(2500)
  const places = page.getByRole('list', { name: /places you can quote from/i })
  if (await places.count()) { await places.getByRole('button').first().click(); await k.wait(1500) }
  await k.deepTap('Highfield - ADV7 (HYP) B-G-B', 0)
  await k.wait(1200)
  await k.deepTap('Configure', 0)
  await k.wait(2500)
  await page.getByRole('button', { name: /Start the quote|Back to the quote/ }).first().click().catch(() => {})
  await k.wait(3500)

  const out = await page.evaluate(() => {
    const ACCENT = [10, 95, 194]
    const near = (s) => {
      const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s || '')
      if (!m) return false
      return (
        Math.abs(+m[1] - ACCENT[0]) < 26 &&
        Math.abs(+m[2] - ACCENT[1]) < 26 &&
        Math.abs(+m[3] - ACCENT[2]) < 26
      )
    }
    const text = []
    const surface = []
    const border = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      const cs = getComputedStyle(el)
      /* AN ELEMENT AT OPACITY 0 IS NOT ON THE SCREEN, and counting
         its colour is how a probe invents a finding. The card's
         "Put it on" is hidden until hover — eight of those made the
         first run of this report say 26 where the eye sees far
         fewer. Composite the whole ancestor chain, the way
         check-contrast.mjs already does for its grounds. */
      let vis = 1
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const s2 = getComputedStyle(n)
        if (s2.visibility === 'hidden' || s2.display === 'none') { vis = 0; break }
        vis *= parseFloat(s2.opacity || '1')
      }
      if (vis < 0.06) continue
      const name = (el.className?.toString?.() || el.tagName).slice(0, 38)
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28)
      if (near(cs.color) && el.children.length === 0) text.push(name + ' :: ' + txt)
      if (near(cs.backgroundColor)) surface.push(name + ' :: ' + txt)
      for (const side of ['borderLeftColor', 'borderBottomColor']) {
        const w = parseFloat(cs[side.replace('Color', 'Width')])
        if (near(cs[side]) && w > 0) { border.push(name + ' (' + side + ')'); break }
      }
    }
    return [
      'ACCENT AS TEXT     ' + text.length,
      ...text.slice(0, 14).map((s) => '   ' + s),
      'ACCENT AS SURFACE  ' + surface.length,
      ...surface.slice(0, 8).map((s) => '   ' + s),
      'ACCENT AS BORDER   ' + border.length,
      ...border.slice(0, 6).map((s) => '   ' + s),
    ]
  })
  for (const r of out) console.log(r)
}
