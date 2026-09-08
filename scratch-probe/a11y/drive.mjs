/* playwright-core is a devDependency now (see tools/check-contrast.mjs),
   so this imports normally. It used to reach through createRequire into
   a global npm install on a machine that no longer exists, and pointed
   at port 5411 rather than the 5090 .claude/launch.json commits to —
   two reasons this harness could not run for anybody but its author. */
import { chromium } from 'playwright-core'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const PROFILE = join(tmpdir(), 'helmlogic-a11y-profile')
export const URL = process.env.PROBE_URL || 'http://localhost:5090'

export async function open(opts = {}) {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: opts.headless !== false ? true : false,
    viewport: { width: opts.w || 1440, height: opts.h || 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const page = ctx.pages()[0] || (await ctx.newPage())
  const errs = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) })
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 200)))
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.querySelectorAll('button').length > 0, null, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(600)
  return { ctx, page, errs }
}

/* The demo button FILLS the form; it does not submit. Clicking it alone
   leaves you on the sign-in screen, which is why this used to appear to
   hang. Both presses are the app's actual behaviour. */
export async function signIn(page) {
  await page.waitForTimeout(900)
  const demo = page.locator('button', { hasText: /demo/i }).first()
  if (await demo.count()) {
    try {
      await demo.click({ timeout: 3000 })
      await page.locator('button', { hasText: /^Sign in$/ }).first().click({ timeout: 3000 })
    } catch {}
  }
  await page.waitForTimeout(1600)
}

export const dump = o => console.log(JSON.stringify(o, null, 1))
