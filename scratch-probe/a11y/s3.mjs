import { open, dump } from './drive.mjs'
import { signInFull, loadData } from './lib.mjs'
import { PROBE } from './probe.mjs'
const { ctx, page, errs } = await open()
await signInFull(page)
await loadData(page)
console.log('=== DASHBOARD ==='); dump(await page.evaluate(PROBE))
await page.screenshot({ path: 'scratch-probe/a11y/shot-dash.png' })
console.log('ERRS', errs.slice(0,6))
await ctx.close()
