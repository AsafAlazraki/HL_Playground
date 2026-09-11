/* BACKLOG 44's own target: "dragging a card and panning stay smooth
 * with the demo loaded; no visible lag on selection clicks."
 *
 * Three gestures, one harness — and the FLOOR first, so the numbers
 * are read against what this machine can do at all rather than
 * against 16.7, which is the 60Hz frame period itself and therefore
 * not a bar a requestAnimationFrame loop can clear. */

const FLOOR = `
  (async () => {
    const d = []
    let last = performance.now()
    await new Promise((done) => {
      let n = 0
      const s = () => {
        const t = performance.now(); d.push(t - last); last = t; n += 1
        if (n < 60) requestAnimationFrame(s); else done()
      }
      requestAnimationFrame(s)
    })
    const x = d.slice(3).sort((a, b) => a - b)
    return {
      p50: Number(x[Math.floor(x.length * 0.5)].toFixed(1)),
      p90: Number(x[Math.floor(x.length * 0.9)].toFixed(1)),
      max: Number(x[x.length - 1].toFixed(1)),
      over33: x.filter((v) => v > 33).length,
    }
  })()
`

const DRAG = `
  (async () => {
    const head = document.querySelector('.react-flow__node .tb-node-head')
    if (!head) return { drag: 'NO CARD' }
    const r = head.getBoundingClientRect()
    let x = r.left + r.width / 2
    let y = r.top + r.height / 2
    const o = { bubbles: true, button: 0, pointerId: 1, isPrimary: true, pointerType: 'mouse' }
    head.dispatchEvent(new PointerEvent('pointerdown', Object.assign({}, o, { clientX: x, clientY: y })))
    const d = []
    let last = performance.now()
    await new Promise((done) => {
      let n = 0
      const s = () => {
        const t = performance.now(); d.push(t - last); last = t
        x += (n % 30 < 15) ? 6 : -6
        y += (n % 30 < 15) ? 3 : -3
        window.dispatchEvent(new PointerEvent('pointermove', Object.assign({}, o, { clientX: x, clientY: y })))
        n += 1
        if (n < 60) requestAnimationFrame(s); else done()
      }
      requestAnimationFrame(s)
    })
    window.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, { clientX: x, clientY: y })))
    const q = d.slice(3).sort((a, b) => a - b)
    return {
      p50: Number(q[Math.floor(q.length * 0.5)].toFixed(1)),
      p90: Number(q[Math.floor(q.length * 0.9)].toFixed(1)),
      max: Number(q[q.length - 1].toFixed(1)),
      over33: q.filter((v) => v > 33).length,
      of: q.length,
    }
  })()
`

const PAN = `
  (async () => {
    const pane = document.querySelector('.react-flow__pane')
    if (!pane) return { pan: 'NO PANE' }
    const r = pane.getBoundingClientRect()
    let x = r.left + r.width * 0.5
    const y = r.top + r.height * 0.5
    pane.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true, button: 0 }))
    const d = []
    let last = performance.now()
    await new Promise((done) => {
      let n = 0
      const s = () => {
        const t = performance.now(); d.push(t - last); last = t
        x += (n % 40 < 20) ? 7 : -7
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }))
        n += 1
        if (n < 60) requestAnimationFrame(s); else done()
      }
      requestAnimationFrame(s)
    })
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, bubbles: true }))
    const q = d.slice(3).sort((a, b) => a - b)
    return {
      p50: Number(q[Math.floor(q.length * 0.5)].toFixed(1)),
      p90: Number(q[Math.floor(q.length * 0.9)].toFixed(1)),
      max: Number(q[q.length - 1].toFixed(1)),
      over33: q.filter((v) => v > 33).length,
      of: q.length,
    }
  })()
`

/* "No visible lag on selection clicks" is not a frame rate — it is
   how long the press takes to be on screen. Two rAFs after the click
   is the first frame the browser could have painted it in. */
const CLICK = `
  (async () => {
    const heads = [...document.querySelectorAll('.react-flow__node .tb-node-head')].slice(0, 4)
    if (heads.length === 0) return { click: 'NO CARD' }
    const took = []
    for (const h of heads) {
      const r = h.getBoundingClientRect()
      const o = { bubbles: true, button: 0, pointerId: 1, isPrimary: true, pointerType: 'mouse', clientX: r.left + 8, clientY: r.top + r.height / 2 }
      const t0 = performance.now()
      h.dispatchEvent(new PointerEvent('pointerdown', o))
      h.dispatchEvent(new PointerEvent('pointerup', o))
      h.dispatchEvent(new MouseEvent('click', o))
      await new Promise((go) => requestAnimationFrame(() => requestAnimationFrame(go)))
      took.push(Number((performance.now() - t0).toFixed(1)))
    }
    return { paints: took, worst: Math.max.apply(null, took) }
  })()
`

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
  if (await load.count()) {
    await load.first().click()
    await k.wait(7000)
  }
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      /Data/.test((x.innerText || '').trim().split('\n')[0]),
    )
    b?.click()
  })
  await k.wait(2500)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button, a')].find((x) =>
      (x.innerText || '').trim().startsWith('Data model'),
    )
    b?.click()
  })
  await k.wait(5000)

  const shape = () =>
    page.evaluate(() => {
      const v = document.querySelector('.react-flow__viewport')
      const t = v ? getComputedStyle(v).transform : ''
      const z = Number(t.slice(t.indexOf('(') + 1).split(',')[0])
      const nodes = [...document.querySelectorAll('.react-flow__node')]
      const on = nodes.filter((n) => {
        const r = n.getBoundingClientRect()
        return r.right > 220 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight
      })
      return {
        zoom: Number((Number.isFinite(z) ? z : 0).toFixed(3)),
        cards: on.length,
        grids: on.filter((n) => !n.querySelector('.tb-node--plate')).length,
        els: document.querySelectorAll('.react-flow__viewport *').length,
      }
    })

  console.log('FLOOR   ' + JSON.stringify(await page.evaluate(FLOOR)))
  console.log('AT FIT  ' + JSON.stringify(await shape()))
  console.log('  drag  ' + JSON.stringify(await page.evaluate(DRAG)))
  await k.wait(1500)
  console.log('  pan   ' + JSON.stringify(await page.evaluate(PAN)))
  await k.wait(1500)
  console.log('  click ' + JSON.stringify(await page.evaluate(CLICK)))

  /* and again where the cards are legible — the band S-1 measured at
     13 fps, with as many grids in the window as will fit */
  await page.evaluate(() => {
    const pane = document.querySelector('.react-flow__pane')
    const r = pane.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    for (let i = 0; i < 9; i += 1) {
      pane.dispatchEvent(new WheelEvent('wheel', { deltaY: -60, clientX: cx, clientY: cy, bubbles: true }))
    }
  })
  await k.wait(3000)
  await k.snap('legible')
  console.log('AT GRID ' + JSON.stringify(await shape()))
  console.log('  drag  ' + JSON.stringify(await page.evaluate(DRAG)))
  await k.wait(1500)
  console.log('  pan   ' + JSON.stringify(await page.evaluate(PAN)))
  await k.wait(1500)
  console.log('  click ' + JSON.stringify(await page.evaluate(CLICK)))

  /* DOES THE PRESS COST TRACK THE NUMBER OF MOUNTED GRIDS? Three more
     notches puts fewer, larger cards in the window. If the cost falls
     with the count, what a selection is paying for is every grid on
     screen re-rendering, not the press. */
  for (const notches of [4, 4]) {
    await page.evaluate((n) => {
      const pane = document.querySelector('.react-flow__pane')
      const r = pane.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      for (let i = 0; i < n; i += 1) {
        pane.dispatchEvent(new WheelEvent('wheel', { deltaY: -60, clientX: cx, clientY: cy, bubbles: true }))
      }
    }, notches)
    await k.wait(3000)
    console.log('AT GRID ' + JSON.stringify(await shape()))
    console.log('  click ' + JSON.stringify(await page.evaluate(CLICK)))
    await k.wait(1200)
  }
}
