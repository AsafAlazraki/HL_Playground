/* THE NAMES ON THE LINES ARE STILL THERE WHEN THEY CAN BE READ.
 *
 * Withholding the label below NEAR is only correct if the label comes
 * BACK above it. A perf change that quietly deleted the column names
 * off the sheet would measure beautifully. */
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

  const zoomTo = async (stopAt, way) => {
    await page.evaluate(({ target, dir }) => {
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
      while (guard < 500 && (dir === 'in' ? read() < target : read() > target)) {
        pane.dispatchEvent(new WheelEvent('wheel', { deltaY: dir === 'in' ? -20 : 20, clientX: cx, clientY: cy, bubbles: true }))
        guard += 1
      }
    }, { target: stopAt, dir: way })
    await k.wait(3500)
  }

  const state = async (what) => {
    const m = await page.evaluate(() => {
      const v = document.querySelector('.react-flow__viewport')
      const mm = v && getComputedStyle(v).transform.match(/matrix\(([^,]+)/)
      const texts = [...document.querySelectorAll('.react-flow__edge-text')]
      const shown = texts.filter((t) => {
        const w = t.closest('.react-flow__edge-textwrapper')
        return w && Number(getComputedStyle(w).opacity) > 0.05
      })
      return {
        zoom: mm ? Number(Number(mm[1]).toFixed(3)) : 0,
        edges: document.querySelectorAll('.react-flow__edge').length,
        labels: texts.length,
        visibleLabels: shown.length,
        sample: shown.slice(0, 3).map((t) => (t.textContent || '').trim()),
      }
    })
    console.log(what + ' ' + JSON.stringify(m))
    return m
  }

  await zoomTo(0.85, 'in')
  const near = await state('NEAR')
  await k.snap('near')

  await zoomTo(0.45, 'out')
  const far = await state('FAR')
  await k.snap('far')

  await zoomTo(0.85, 'in')
  const back = await state('BACK-TO-NEAR')

  const ok =
    near.labels > 0 && near.visibleLabels > 0 && far.labels === 0 && back.labels > 0
  console.log(ok ? 'PASS — names present at NEAR, gone at FAR, back at NEAR' : 'FAIL')
}
