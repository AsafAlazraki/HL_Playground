/* WHERE THE 220ms GOES — a Chrome performance trace across one
 * selection press on the sheet, with the Northside set loaded.
 *
 * Rows 43 and 44 have spent four hypotheses on this number and killed
 * all four by measurement: it is not our re-renders (the memo bails
 * out every time, RENDERS 2 / CHANGED NONE), it is not the stacking
 * (`elevateNodesOnSelect={false}` gave 209 against 220), it is not a
 * card mounting its register (a legible card holds nine rows) and it
 * is not the column-header chrome (dropping it took 3,297 elements to
 * 3,017 and the press from 220 to 221). The row says the next step is
 * a trace rather than a fifth theory. This is that trace.
 *
 * IT REPORTS THE BREAKDOWN, NOT A SCREENSHOT. Trace events are
 * summed by name over the press window, so the answer comes back as
 * scripting / style recalculation / layout / paint with milliseconds
 * against each, which is the one thing no amount of driving can
 * guess at. */

const press = (page, src) =>
  page.evaluate((s) => {
    const rx = new RegExp(s)
    const b = [...document.querySelectorAll('button')].find((x) => rx.test((x.innerText || '').trim()))
    b?.click()
    return Boolean(b)
  }, src)

/* A REAL PRESS, THROUGH THE BROWSER'S OWN INPUT PIPELINE.
 *
 * The first version of this dispatched `target.click()` and a
 * synthetic `pointerdown` at 0,0, and measured 49.7ms where rows 43
 * and 44 measured 209-220. That gap was the harness, not a fix:
 * React Flow selects on POINTERDOWN through d3-drag, and a
 * synthetic click at the wrong coordinates never enters the drag
 * machinery or the hit test. So the press is driven with the real
 * mouse and timed from inside the page, which is the only
 * arrangement where the two ends agree about what a press is.
 *
 * ARMED FIRST, PRESSED SECOND. The page installs a one-shot
 * pointerdown listener in the CAPTURE phase — ahead of React Flow's
 * own — and stops timing at the second animation frame after the
 * selection lands on the node, which is the first frame a person
 * could see it on. */
const ARM = `
  (() => {
    const heads = [...document.querySelectorAll('.tb-node-head')]
    const vis = heads.filter((h) => {
      const r = h.getBoundingClientRect()
      return r.width > 50 && r.bottom > 60 && r.top < window.innerHeight - 20 && r.right > 240 && r.left < window.innerWidth - 20
    })
    const target = vis.find((h) => !h.closest('.react-flow__node.selected')) ?? vis[0]
    if (!target) return { error: 'no visible card head', heads: heads.length }
    const r = target.getBoundingClientRect()
    /* the LEFT of the head, clear of the name field and the row
       count, so the press lands on the bar itself */
    const x = Math.round(Math.max(r.left, 250) + 30)
    const y = Math.round(Math.max(r.top, 70) + r.height / 2)
    window.__press = null
    const marked = (n) => document.querySelector('.react-flow__node.selected [data-id="' + n + '"]')
    const selectedId = () => {
      const el = document.querySelector('.react-flow__node.selected')
      return el ? el.getAttribute('data-id') : null
    }
    const before = selectedId()
    const onDown = () => {
      performance.mark('hl-press-start')
      const t0 = performance.now()
      /* UNTIL THE SELECTION IS ON THE SCREEN, not until two frames
         have gone by. React may defer the render past a frame, and a
         fixed wait would report whatever had happened by then —
         which is how a 220ms press gets written down as 50. */
      let frames = 0
      const step = () => {
        frames += 1
        if (selectedId() !== before || frames > 120) {
          requestAnimationFrame(() => {
            performance.mark('hl-press-end')
            window.__press = {
              ms: Number((performance.now() - t0).toFixed(1)),
              frames,
              landed: selectedId() !== before,
              selected: document.querySelectorAll('.react-flow__node.selected').length,
              grids: document.querySelectorAll('.tb-sheet').length,
              els: document.querySelectorAll('.react-flow__viewport *').length,
              nodes: document.querySelectorAll('.react-flow__node').length,
            }
          })
          return
        }
        requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }
    window.addEventListener('pointerdown', onDown, { capture: true, once: true })
    return { x, y, heads: heads.length, visible: vis.length }
  })()
`

const zoomNow = `
  (() => {
    const v = document.querySelector('.react-flow__viewport')
    const m = v && getComputedStyle(v).transform.match(/matrix\\(([^,]+)/)
    return m ? Number(Number(m[1]).toFixed(3)) : 0
  })()
`

/* Trace events grouped the way DevTools groups them, so the answer
 * is in the vocabulary the next reader will use when they open the
 * profile themselves. */
const BUCKET = [
  ['scripting', /^(FunctionCall|EvaluateScript|V8\.|MinorGC|MajorGC|GCEvent|TimerFire|RunMicrotasks|EventDispatch|XHRLoad|ProfileChunk)/],
  ['style', /^(UpdateLayoutTree|ScheduleStyleRecalculation|InvalidateLayout|RecalculateStyles)/],
  ['layout', /^(Layout|LayoutShift|PrePaint|UpdateLayerTree)$/],
  ['paint', /^(Paint|PaintImage|Rasterize|RasterTask|DecodeImage|CompositeLayers|Commit|DrawFrame)/],
]

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
  await press(page, '^Data')
  await k.wait(2500)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button, a')].find((x) =>
      (x.innerText || '').trim().startsWith('Data model'),
    )
    b?.click()
  })
  await k.wait(5000)
  console.log('ZOOM ON ARRIVAL ' + (await page.evaluate(zoomNow)))

  /* SETTLE TO THE BAND THE ROWS MEASURED, which is the only band
     where this question exists. The sheet opens at 0.4, where
     `tableLod.ts` draws a PLATE and there is no card head to press;
     rows 43 and 44 both took their numbers at ~0.846 with seven
     legible grid cards up. Zooming is done in one burst and then
     left alone, because the LOD defers grid BUILDING until the
     camera is still — a trace taken while they are still arriving
     would be measuring the zoom, not the press. */
  await page.evaluate(() => {
    const pane = document.querySelector('.react-flow__pane')
    if (!pane) return
    const r = pane.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const read = () => {
      const v = document.querySelector('.react-flow__viewport')
      const m = v && getComputedStyle(v).transform.match(/matrix\(([^,]+)/)
      return m ? Number(m[1]) : 0
    }
    let guard = 0
    while (read() < 0.84 && guard < 400) {
      pane.dispatchEvent(new WheelEvent('wheel', { deltaY: -20, clientX: cx, clientY: cy, bubbles: true }))
      guard += 1
    }
  })
  await k.wait(6000)
  console.log('ZOOM SETTLED ' + (await page.evaluate(zoomNow)))
  console.log('CARDS ' + JSON.stringify(await page.evaluate(() => ({
    heads: document.querySelectorAll('.tb-node-head').length,
    plates: document.querySelectorAll('.tb-node-plate').length,
    els: document.querySelectorAll('.react-flow__viewport *').length,
  }))))
  await k.snap('sheet')

  /** One real press: arm the page, click with the mouse, read back. */
  const pressOnce = async () => {
    const armed = await page.evaluate(ARM)
    if (armed.error) return armed
    await page.mouse.move(armed.x, armed.y)
    await page.mouse.down()
    await page.mouse.up()
    await k.wait(700)
    const out = await page.evaluate(() => window.__press)
    return { ...(out ?? { error: 'press never settled' }), at: [armed.x, armed.y] }
  }

  /* SEVERAL, BECAUSE ONE IS A NUMBER AND NOT A MEASUREMENT. Rows 43
     and 44 both report a first press unlike the steady state, so the
     warm one is taken and reported separately rather than averaged
     into the rest. */
  console.log('WARM ' + JSON.stringify(await pressOnce()))
  await k.wait(1200)
  for (let i = 0; i < 3; i += 1) {
    console.log('PRESS ' + i + ' ' + JSON.stringify(await pressOnce()))
    await k.wait(1200)
  }

  const client = await page.context().newCDPSession(page)
  const chunks = []
  await client.send('Tracing.start', {
    transferMode: 'ReturnAsStream',
    traceConfig: {
      recordMode: 'recordUntilFull',
      includedCategories: [
        'devtools.timeline',
        'disabled-by-default-devtools.timeline',
        'disabled-by-default-devtools.timeline.frame',
        'blink.user_timing',
      ],
    },
  })

  const measured = await pressOnce()
  await k.wait(400)

  const done = new Promise((resolve) => client.once('Tracing.tracingComplete', resolve))
  await client.send('Tracing.end')
  const ev = await done
  if (ev.stream) {
    for (;;) {
      const r = await client.send('IO.read', { handle: ev.stream, size: 1_000_000 })
      chunks.push(r.data)
      if (r.eof) break
    }
    await client.send('IO.close', { handle: ev.stream })
  }
  const raw = chunks.join('')
  const parsed = JSON.parse(raw)
  const events = Array.isArray(parsed) ? parsed : (parsed.traceEvents ?? [])
  console.log('PRESS ' + JSON.stringify(measured))
  console.log('TRACE EVENTS ' + events.length)

  /* The renderer's main thread only: a compositor or raster thread's
     microseconds are not what the person is waiting on. */
  const byName = new Map()
  const rendererPids = new Set()
  for (const e of events) {
    if (e.cat === '__metadata' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain') {
      rendererPids.add(`${e.pid}:${e.tid}`)
    }
  }
  /* THE WINDOW, from the two marks the press left behind. Without
     this the buckets sum whatever else the page did while the
     recorder was open, which is how a profile ends up blaming
     garbage collection for a click. */
  const markAt = (name) => {
    const m = events.find((e) => e.name === name || e.args?.data?.name === name)
    return m ? m.ts : null
  }
  const from = markAt('hl-press-start')
  const to = markAt('hl-press-end')
  console.log(
    'PRESS WINDOW ' + (from !== null && to !== null ? `${((to - from) / 1000).toFixed(1)}ms` : 'MARKS NOT FOUND — whole trace'),
  )

  let totalMain = 0
  for (const e of events) {
    if (e.ph !== 'X' || typeof e.dur !== 'number') continue
    if (!rendererPids.has(`${e.pid}:${e.tid}`)) continue
    if (from !== null && to !== null && (e.ts + e.dur < from || e.ts > to)) continue
    if (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') {
      totalMain += e.dur
      continue
    }
    byName.set(e.name, (byName.get(e.name) ?? 0) + e.dur)
  }
  const top = [...byName.entries()]
    .map(([name, us]) => [name, Number((us / 1000).toFixed(1))])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 22)
  console.log('MAIN THREAD TOTAL ms ' + (totalMain / 1000).toFixed(1))
  console.log('TOP EVENTS ' + JSON.stringify(top))

  /* ============================================================
     AND WHICH FUNCTION, because "scripting" is not an answer.

     The trace above says the press is 49.3ms of EventDispatch — a
     pointerdown handler running to completion before the browser is
     allowed to draw anything — and that names a phase rather than a
     line of code. The CPU profiler names the line. Self time, not
     total: a frame that merely CONTAINS the cost is the stack, and
     what is wanted is the bottom of it.
     ============================================================ */
  await client.send('Profiler.enable')
  await client.send('Profiler.setSamplingInterval', { interval: 100 })
  await client.send('Profiler.start')
  const profiled = await pressOnce()
  const { profile } = await client.send('Profiler.stop')
  console.log('PROFILED PRESS ' + JSON.stringify(profiled))

  const self = new Map()
  for (const n of profile.nodes) {
    const f = n.callFrame
    const where = f.url ? f.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] : '(native)'
    const key = `${f.functionName || '(anonymous)'}  ${where}:${f.lineNumber + 1}`
    self.set(key, (self.get(key) ?? 0) + (n.hitCount ?? 0))
  }
  const samples = [...self.values()].reduce((a, b) => a + b, 0)
  const us = (profile.endTime - profile.startTime) / Math.max(samples, 1)
  console.log(
    'SELF TIME ' +
      JSON.stringify(
        [...self.entries()]
          .filter(([, h]) => h > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 18)
          .map(([where, h]) => [where, Number(((h * us) / 1000).toFixed(1))]),
      ),
  )

  const buckets = {}
  for (const [name, micros] of byName) {
    const hit = BUCKET.find(([, rx]) => rx.test(name))
    const key = hit ? hit[0] : 'other'
    buckets[key] = (buckets[key] ?? 0) + micros / 1000
  }
  for (const key of Object.keys(buckets)) buckets[key] = Number(buckets[key].toFixed(1))
  console.log('BUCKETS ms ' + JSON.stringify(buckets))
}
