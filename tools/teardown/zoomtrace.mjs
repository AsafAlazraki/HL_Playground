/* WHERE THE ZOOM GOES — the same trace `selecttrace.mjs` took over a
 * selection press, taken over a sustained wheel gesture instead.
 *
 * WHY A SECOND ONE. The press turned out to be React's DEVELOPMENT
 * JSX runtime — 35-40ms in the built app against 64-100 under `npm
 * run dev`, with `EventDispatch` collapsing 49.3ms to 11.1 while
 * paint, style and layout barely moved. The zoom did NOT: measured
 * against the same production build it is p50 20.7-51.4 and p90
 * 77-123, against dev's p50 24-54 and p90 85-248. So whatever the
 * zoom costs, it is in the product, and row 43 is still open on it.
 *
 * RUN IT AGAINST THE BUILT APP. `HL_ORIGIN=http://localhost:5092`
 * with `npx vite preview` — a dev-server number here would be
 * measuring Vite's instrumentation, which is the mistake this whole
 * exercise just found. */

const press = (page, src) =>
  page.evaluate((s) => {
    const rx = new RegExp(s)
    const b = [...document.querySelectorAll('button')].find((x) => rx.test((x.innerText || '').trim()))
    b?.click()
    return Boolean(b)
  }, src)

/* The gesture, marked at both ends so the trace can be cut to it.
 * Twenty-two wheel steps on consecutive animation frames is the same
 * gesture `sheetzoom.mjs` measures, so the numbers are comparable. */
const ZOOM = `
  (async () => {
    const pane = document.querySelector('.react-flow__pane')
    if (!pane) return { error: 'no pane' }
    const r = pane.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const deltas = []
    let last = performance.now()
    performance.mark('hl-zoom-start')
    await new Promise((done) => {
      let n = 0
      const step = () => {
        const now = performance.now()
        deltas.push(now - last)
        last = now
        pane.dispatchEvent(new WheelEvent('wheel', { deltaY: DELTA, clientX: cx, clientY: cy, bubbles: true }))
        n += 1
        if (n < 22) requestAnimationFrame(step)
        else done()
      }
      requestAnimationFrame(step)
    })
    performance.mark('hl-zoom-end')
    const d = deltas.slice(3).sort((a, b) => a - b)
    const at = (p) => Number(d[Math.floor(d.length * p)].toFixed(1))
    return {
      frames: d.length,
      p50: at(0.5),
      p90: at(0.9),
      max: Number(d[d.length - 1].toFixed(1)),
      over33: d.filter((x) => x > 33).length,
      els: document.querySelectorAll('.react-flow__viewport *').length,
      heads: document.querySelectorAll('.tb-node-head').length,
      plates: document.querySelectorAll('.tb-node-plate').length,
    }
  })()
`

const BUCKET = [
  ['scripting', /^(FunctionCall|EvaluateScript|V8\.|MinorGC|MajorGC|GCEvent|TimerFire|RunMicrotasks|EventDispatch|ProfileChunk)/],
  ['style', /^(UpdateLayoutTree|ScheduleStyleRecalculation|InvalidateLayout|RecalculateStyles)/],
  ['layout', /^(Layout|LayoutShift|PrePaint|UpdateLayerTree)$/],
  ['paint', /^(Paint|PaintImage|Rasterize|RasterTask|DecodeImage|CompositeLayers|Commit|DrawFrame|Layerize)/],
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

  /* warm, so the traced gesture is not the first one */
  console.log('WARM IN  ' + JSON.stringify(await page.evaluate(ZOOM.replace('DELTA', '-60'))))
  await k.wait(2500)
  console.log('WARM OUT ' + JSON.stringify(await page.evaluate(ZOOM.replace('DELTA', '60'))))
  await k.wait(2500)

  const client = await page.context().newCDPSession(page)
  await client.send('Tracing.start', {
    transferMode: 'ReturnAsStream',
    traceConfig: {
      recordMode: 'recordUntilFull',
      includedCategories: [
        'devtools.timeline',
        'disabled-by-default-devtools.timeline',
        'blink.user_timing',
      ],
    },
  })
  const measured = await page.evaluate(ZOOM.replace('DELTA', '-60'))
  await k.wait(400)
  const done = new Promise((resolve) => client.once('Tracing.tracingComplete', resolve))
  await client.send('Tracing.end')
  const ev = await done
  const chunks = []
  if (ev.stream) {
    for (;;) {
      const r = await client.send('IO.read', { handle: ev.stream, size: 1_000_000 })
      chunks.push(r.data)
      if (r.eof) break
    }
    await client.send('IO.close', { handle: ev.stream })
  }
  const parsed = JSON.parse(chunks.join(''))
  const events = Array.isArray(parsed) ? parsed : (parsed.traceEvents ?? [])
  console.log('TRACED ZOOM ' + JSON.stringify(measured))

  const rendererPids = new Set()
  for (const e of events) {
    if (e.cat === '__metadata' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain') {
      rendererPids.add(`${e.pid}:${e.tid}`)
    }
  }
  const markAt = (name) => {
    const m = events.find((e) => e.name === name || e.args?.data?.name === name)
    return m ? m.ts : null
  }
  const from = markAt('hl-zoom-start')
  const to = markAt('hl-zoom-end')
  console.log('ZOOM WINDOW ' + (from !== null && to !== null ? `${((to - from) / 1000).toFixed(1)}ms` : 'MARKS NOT FOUND'))

  const byName = new Map()
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
  console.log('MAIN THREAD TOTAL ms ' + (totalMain / 1000).toFixed(1))
  console.log(
    'TOP EVENTS ' +
      JSON.stringify(
        [...byName.entries()]
          .map(([n, us]) => [n, Number((us / 1000).toFixed(1))])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 16),
      ),
  )
  const buckets = {}
  for (const [name, us] of byName) {
    const hit = BUCKET.find(([, rx]) => rx.test(name))
    const key = hit ? hit[0] : 'other'
    buckets[key] = (buckets[key] ?? 0) + us / 1000
  }
  for (const key of Object.keys(buckets)) buckets[key] = Number(buckets[key].toFixed(1))
  console.log('BUCKETS ms ' + JSON.stringify(buckets))

  /* and which function, by self time */
  await client.send('Profiler.enable')
  await client.send('Profiler.setSamplingInterval', { interval: 100 })
  await client.send('Profiler.start')
  const profiled = await page.evaluate(ZOOM.replace('DELTA', '60'))
  const { profile } = await client.send('Profiler.stop')
  console.log('PROFILED ZOOM ' + JSON.stringify(profiled))
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
          .map(([key, h]) => [key, Number(((h * us) / 1000).toFixed(1))]),
      ),
  )
}
