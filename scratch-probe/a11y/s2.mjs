import { open, dump } from './drive.mjs'
import { PROBE } from './probe.mjs'
const { ctx, page, errs } = await open()
await page.waitForTimeout(1000)
console.log('=== SIGNIN ==='); dump(await page.evaluate(PROBE))
await page.locator('button.si-demo').click()
await page.waitForTimeout(200)
await page.locator('button.si-go').click()
await page.waitForTimeout(3500)
console.log('=== AFTER SIGNIN ==='); dump(await page.evaluate(PROBE))
await page.screenshot({ path: 'scratch-probe/a11y/shot-home.png' })
console.log('ERRS', errs.slice(0,5))
await ctx.close()
