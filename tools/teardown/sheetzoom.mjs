/* PERF_DIAGNOSIS's own definition of done, measured as it is
 * written: rAF deltas during a SYNTHETIC WHEEL-ZOOM with the
 * Northside set loaded, plus the canvas element count at zoom 0.5.
 *
 * THE FLOOR IS MEASURED FIRST. A pass is stated as "p90 under
 * 16.7ms", which is the 60Hz frame period itself — so the same
 * harness is run over an empty part of the sheet to find what this
 * machine's floor actually is, and every reading below is reported
 * against it rather than against a number no rAF loop can beat. */
const ZOOM = `
  (async () => {
    const pane = document.querySelector('.react-flow__pane')
    if (!pane) return { zoom: 'NO PANE' }
    const r = pane.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const deltas = []
    let last = performance.now()
    await new Promise((done) => {
      let n = 0
      const step = () => {
        const now = performance.now()
        deltas.push(now - last)
        last = now
        pane.dispatchEvent(new WheelEvent('wheel', { deltaY: -60, clientX: cx, clientY: cy, bubbles: true }))
        n += 1
        if (n < 22) requestAnimationFrame(step)
        else done()
      }
      requestAnimationFrame(step)
    })
    const d = deltas.slice(3).sort((a, b) => a - b)
    const at = (p) => Number(d[Math.floor(d.length * p)].toFixed(1))
    const zoomNow = () => {
      const v = document.querySelector('.react-flow__viewport')
      const t = v ? getComputedStyle(v).transform : ''
      const n = Number(t.slice(t.indexOf('(') + 1).split(',')[0])
      return Number.isFinite(n) ? n : 0
    }
    return {
      frames: d.length,
      p50: at(0.5),
      p90: at(0.9),
      max: Number(d[d.length - 1].toFixed(1)),
      over33: d.filter((x) => x > 33).length,
      over167: d.filter((x) => x > 16.7).length,
      endZoom: Number(zoomNow().toFixed(3)),
      els: document.querySelectorAll('.react-flow__viewport *').length,
    }
  })()
`
const IDLE = `
  (async () => {
    const deltas = []
    let last = performance.now()
    await new Promise((done) => {
      let n = 0
      const step = () => {
        const now = performance.now()
        deltas.push(now - last)
        last = now
        n += 1
        if (n < 40) requestAnimationFrame(step)
        else done()
      }
      requestAnimationFrame(step)
    })
    const d = deltas.slice(3).sort((a, b) => a - b)
    const at = (p) => Number(d[Math.floor(d.length * p)].toFixed(1))
    return { p50: at(0.5), p90: at(0.9), max: Number(d[d.length - 1].toFixed(1)), over33: d.filter((x) => x > 33).length }
  })()
`

export default async function (page, k) {
  await page.setViewportSize({ width: 1280, height: 800 })
  const ORIGIN = process.env.HL_ORIGIN || 'http://localhost:5090'
  console.log('ORIGIN ' + ORIGIN)
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

  console.log('FLOOR (no gesture at all) ' + JSON.stringify(await page.evaluate(IDLE)))

  for (let pass = 0; pass < 3; pass += 1) {
    const out = await page.evaluate(ZOOM)
    console.log('WHEEL-ZOOM IN  pass ' + pass + ' ' + JSON.stringify(out))
    await k.wait(2500)
    const out2 = await page.evaluate(ZOOM.replace('-60', '60'))
    console.log('WHEEL-ZOOM OUT pass ' + pass + ' ' + JSON.stringify(out2))
    await k.wait(2500)
  }

  /* and the element count at the zoom the spec names */
  const at05 = await page.evaluate(() => {
    const pane = document.querySelector('.react-flow__pane')
    const r = pane.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const read = () => {
      const v = document.querySelector('.react-flow__viewport')
      const m = v && getComputedStyle(v).transform.match(/matrix\(([^,]+)/)
      return m ? Number(m[1]) : 0
    }
    let guard = 0
    while (read() > 0.5 && guard < 200) {
      pane.dispatchEvent(new WheelEvent('wheel', { deltaY: 60, clientX: cx, clientY: cy, bubbles: true }))
      guard += 1
    }
    while (read() < 0.48 && guard < 400) {
      pane.dispatchEvent(new WheelEvent('wheel', { deltaY: -20, clientX: cx, clientY: cy, bubbles: true }))
      guard += 1
    }
    return read()
  })
  await k.wait(2500)
  console.log('AT 0.5 ' + JSON.stringify(await page.evaluate(() => ({
    zoom: Number((() => {
      const v = document.querySelector('.react-flow__viewport')
      const m = v && getComputedStyle(v).transform.match(/matrix\(([^,]+)/)
      return m ? Number(m[1]) : 0
    })().toFixed(3)),
    elements: document.querySelectorAll('.react-flow__viewport *').length,
    nodes: document.querySelectorAll('.react-flow__node').length,
  }))) + ' (settled from ' + at05.toFixed(3) + ')')
  await k.snap('at05')
}
