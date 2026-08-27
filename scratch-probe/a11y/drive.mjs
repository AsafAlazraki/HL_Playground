import { createRequire } from 'module'
const require = createRequire('C:/Users/AsafA/AppData/Roaming/npm/node_modules/@playwright/test/')
const { chromium } = require('playwright-core')

export const PROFILE = 'C:/Users/AsafA/AppData/Local/Temp/claude/a11y-profile'
export const URL = 'http://localhost:5411'

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
  return { ctx, page, errs }
}

export async function signIn(page) {
  await page.waitForTimeout(900)
  const demo = page.locator('button', { hasText: /demo/i }).first()
  if (await demo.count()) {
    try { await demo.click({ timeout: 3000 }); } catch {}
  }
  await page.waitForTimeout(1600)
}

export const dump = o => console.log(JSON.stringify(o, null, 1))
