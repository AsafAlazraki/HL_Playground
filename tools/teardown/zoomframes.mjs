/* WHERE IN THE GESTURE THE SLOW FRAMES ARE.
 *
 * Row 43 is down to "6-12 of 19 frames over 33ms" and the question
 * that decides whether there is a third lever is not how many, it is
 * WHERE. The sheet has two thresholds a zoom must cross —
 * `tableLod` swaps a card between its plate and its register at
 * 0.60/0.66, and `sheetZoom` puts the link names on at 0.70 — and
 * work at a crossing is work that has to happen somewhere. Work
 * spread evenly across the gesture is something else, and fixable.
 *
 * So this keeps the frames IN ORDER with the zoom each one ended at,
 * instead of sorting them into percentiles. */
const RUN = `
  (async () => {
    const pane = document.querySelector('.react-flow__pane')
    if (!pane) return { error: 'no pane' }
    const r = pane.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const zoomNow = () => {
      const v = document.querySelector('.react-flow__viewport')
      const m = v && getComputedStyle(v).transform.match(/matrix\\(([^,]+)/)
      return m ? Number(m[1]) : 0
    }
    const frames = []
    let last = performance.now()
    await new Promise((done) => {
      let n = 0
      const step = () => {
        const now = performance.now()
        frames.push({
          ms: Number((now - last).toFixed(1)),
          zoom: Number(zoomNow().toFixed(3)),
          cards: document.querySelectorAll('.tb-node-head').length,
          labels: document.querySelectorAll('.react-flow__edge-text').length,
        })
        last = now
        pane.dispatchEvent(new WheelEvent('wheel', { deltaY: DELTA, clientX: cx, clientY: cy, bubbles: true }))
        n += 1
        if (n < 22) requestAnimationFrame(step)
        else done()
      }
      requestAnimationFrame(step)
    })
    return frames.slice(1)
  })()
`

export default async function (page, k) {
  await page.setViewportSize({ width: 1280, height: 800 })
  const ORIGIN = process.env.HL_ORIGIN || 'http://localhost:5090'
  await k.go(ORIGIN + '/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) { await load.first().click(); await k.wait(7000) }
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /Data/.test((x.innerText||'').trim().split('\n')[0]))
    b?.click()
  })
  await k.wait(2500)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button, a')].find((x) => (x.innerText||'').trim().startsWith('Data model'))
    b?.click()
  })
  await k.wait(5000)

  const show = (label, frames) => {
    console.log(label)
    for (const f of frames) {
      const bar = f.ms > 33 ? ' <<< OVER 33' : ''
      console.log(
        `   zoom ${String(f.zoom).padEnd(6)} ${String(f.ms).padStart(6)}ms  cards ${f.cards}  labels ${f.labels}${bar}`,
      )
    }
    const over = frames.filter((f) => f.ms > 33)
    console.log(`   ${over.length} of ${frames.length} over 33ms\n`)
  }

  for (let pass = 0; pass < 2; pass += 1) {
    show(`ZOOM IN  pass ${pass}`, await page.evaluate(RUN.replace('DELTA', '-60')))
    await k.wait(2500)
    show(`ZOOM OUT pass ${pass}`, await page.evaluate(RUN.replace('DELTA', '60')))
    await k.wait(2500)
  }
}
