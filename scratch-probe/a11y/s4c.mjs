import { open } from './drive.mjs'
const { ctx, page, errs } = await open()
for (const t of [1000,3000,6000,10000]) {
  await page.waitForTimeout(t===1000?1000:3000)
  console.log(t, 'btns', await page.evaluate(() => document.querySelectorAll('button').length), 'root', await page.evaluate(()=>document.getElementById('root')?.children.length))
}
console.log('ERRS', errs)
await ctx.close()
