import { open, dump } from './drive.mjs'
import { signInFull, loadData } from './lib.mjs'
import { RINGS, SMALL } from './probe.mjs'
const { ctx, page, errs } = await open()
await signInFull(page); await loadData(page)
await page.keyboard.press('Tab')
console.log('=== RINGS dashboard ==='); dump(await page.evaluate(RINGS))
console.log('=== SMALL TARGETS dashboard ==='); dump(await page.evaluate(SMALL))
// landmark check: are header tags banner landmarks?
console.log('=== HEADER PARENTS ===')
dump(await page.evaluate(() => [...document.querySelectorAll('header')].map(h => ({ cls: (h.className||'').toString().slice(0,30), parent: h.parentElement.tagName + '.' + (h.parentElement.className||'').toString().slice(0,24), closestSec: h.closest('section,article,aside,nav,main') ? h.closest('section,article,aside,nav,main').tagName : 'NONE' }))))
await ctx.close()
