/* Save the log and read the file back — the finding asks for JSONL. */
import { readFileSync } from 'node:fs'
const press = (page, src) =>
  page.evaluate((s) => {
    const rx = new RegExp(s)
    const b = [...document.querySelectorAll('button')].find((x) => rx.test((x.innerText || '').trim()))
    b?.click()
    return Boolean(b)
  }, src)
async function openFold(page, k) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.ab button')].find((x) => (x.innerText || '').trim() === 'View')
    b?.click()
  })
  await k.wait(900)
}
export default async function (page, k) {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await k.go('http://localhost:5090/', 6000)
  const demo = page.getByRole('button', { name: /demo account/i })
  if (await demo.count()) {
    await demo.first().click()
    await page.getByRole('button', { name: /^Sign in$/ }).first().click()
    await k.wait(1500)
  }
  const load = page.getByRole('button', { name: /Master Price File/i })
  if (await load.count()) { await load.first().click(); await k.wait(6000) }
  await page.keyboard.press('Control+k')
  await k.wait(900)
  await page.keyboard.type('Labour', { delay: 30 })
  await k.wait(1600)
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('.hs-opt')].find((o) => !o.classList.contains('hs-opt--module'))
    t?.click()
  })
  await k.wait(3000)
  await press(page, '^List$')
  await k.wait(2500)
  await openFold(page, k)
  await press(page, 'Paste rows')
  await k.wait(1500)
  await page.locator('textarea').first().click()
  await page.keyboard.insertText('Rate\tActual\tCode\nRetail Labour\t123.45\tGEN2\nDetail Labour\t77\tDET2')
  await k.wait(2200)
  await press(page, 'Put it in')
  await k.wait(3000)
  await openFold(page, k)
  await press(page, 'Merge log')
  await k.wait(1500)
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    press(page, 'Save this log'),
  ])
  const name = dl.suggestedFilename()
  const path = k.outDir + '/' + name
  await dl.saveAs(path)
  const text = readFileSync(path, 'utf8')
  console.log('FILE ' + name)
  console.log(text.trim().split('\n').map((l) => l.slice(0, 200)).join('\n'))
}
