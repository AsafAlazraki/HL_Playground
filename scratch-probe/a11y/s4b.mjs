import { open, dump } from './drive.mjs'
import { signInFull, loadData } from './lib.mjs'
const { ctx, page, errs } = await open()
await signInFull(page); await loadData(page)
console.log('BODY', (await page.locator('body').innerText()).slice(0,400))
console.log('COUNT', await page.evaluate(() => document.querySelectorAll('button').length))
console.log('ERRS', errs.slice(0,8))
await ctx.close()
