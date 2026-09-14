import { chromium } from 'playwright-core'
import { wait, settled, signInAndSeed } from './drive.mjs'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const p = await (await b.newContext({ viewport: { width: 430, height: 932 } })).newPage()
await signInAndSeed(p); await wait(p, 1500)
await p.getByRole('button', { name: /^Home/ }).first().click(); await wait(p, 1200)
await p.getByRole('button', { name: /New quote/ }).first().click(); await wait(p, 2200)
await p.locator('.qp-card').first().click(); await wait(p, 2600); await settled(p)
console.log(await p.evaluate(() => {
  const g = (s) => { const e = document.querySelector(s); if (!e) return s + ' MISSING'
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e)
    return `${s.padEnd(12)} top=${Math.round(r.top)} bot=${Math.round(r.bottom)} h=${Math.round(r.height)} pos=${cs.position} pb=${cs.paddingBottom} flex=${cs.flex} ovfY=${cs.overflowY}` }
  const names = document.querySelectorAll('.pl-name')
  const last = names[names.length - 1]
  return [g('.pl'), g('.pl-port'), g('.pl-col'), g('.pl-bar'),
    'last .pl-name bottom=' + Math.round(last.getBoundingClientRect().bottom)].join('\n')
}))
await b.close()
