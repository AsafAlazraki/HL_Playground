import { open } from './drive.mjs'
import { PROBE, RINGS } from './probe.mjs'
const { ctx, page, errs } = await open()
const rail = (t) => page.locator('button.sn-row', { hasText: t }).first()
async function at(label){
  await page.waitForTimeout(1400)
  const p = await page.evaluate(PROBE)
  await page.keyboard.press('Tab'); await page.waitForTimeout(120)
  const r = await page.evaluate(RINGS)
  console.log('## '+label)
  console.log('   main', JSON.stringify(p.landmarks.filter(l=>l.tag==='MAIN'||l.role==='region'||l.tag==='NAV')))
  console.log('   heads', JSON.stringify(p.headings))
  console.log('   tabbable', p.tabbableCount, '| unnamed', p.unnamed.length, JSON.stringify(p.unnamed), '| noRing', r.noRing+'/'+r.total, JSON.stringify(r.bad))
}
await at('DASHBOARD')
await page.locator('button.sn-leaf').first().click(); await at('TABLE STAGE')
await rail('Data model').click(); await at('DATA MODEL')
await rail('Quotes').click(); await at('QUOTES')
await rail('Business rules').click(); await page.waitForTimeout(2200); await at('BUSINESS RULES')
await rail('All tables').click(); await at('ALL TABLES')
await rail('Modules').click(); await at('MODULES')
await rail('Configure').click(); await at('CONFIGURE')
console.log('ERRS', errs.slice(0,8))
await ctx.close()
