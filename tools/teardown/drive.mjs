/* A small driver for walking a configurator by hand.
 *
 * Usage: node drive.mjs <script.mjs>
 * The script default-exports an async (page, k) => {} where k is the toolkit.
 *
 * Everything it learns goes to <out>/: numbered PNGs plus a probe.txt per step
 * listing what is clickable, so the next step can be chosen from evidence
 * rather than guessed. */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const scriptPath = resolve(process.argv[2])
const outDir = resolve(dirname(scriptPath), 'out', process.argv[3] ?? 'run')
mkdirSync(outDir, { recursive: true })

let n = 0
const pad = () => String(++n).padStart(2, '0')

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
  locale: 'en-AU',
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
})
const page = await ctx.newPage()

const toolkit = {
  outDir,

  /** Screenshot + a note of where we are. */
  async snap(label, opts = {}) {
    const file = `${outDir}/${pad()}-${label}.png`
    await page.screenshot({ path: file, fullPage: opts.full ?? false })
    console.log(`shot  ${file}  ${page.url()}`)
    return file
  },

  /** What can be clicked here, by accessible role and name — the same
   *  information a screen reader would get, which is the honest list. */
  async probe(label = 'probe', limit = 90) {
    const found = await page.evaluate((lim) => {
      const sel = 'button, a[href], [role="button"], [role="radio"], [role="tab"], [role="link"], input, select, summary, [tabindex]:not([tabindex="-1"])'
      const seen = new Set()
      const out = []
      /* Porsche, BMW and most of this cohort render through web components,
       * so a flat querySelectorAll sees a handful of controls and misses the
       * configurator entirely. Walk into every open shadow root. */
      const all = []
      const walk = (root) => {
        for (const el of root.querySelectorAll('*')) {
          if (el.matches(sel)) all.push(el)
          if (el.shadowRoot) walk(el.shadowRoot)
        }
      }
      walk(document)
      for (const el of all) {
        const r = el.getBoundingClientRect()
        if (r.width < 4 || r.height < 4) continue
        const style = getComputedStyle(el)
        if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') continue
        const name = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 90)
        if (!name) continue
        const role = el.getAttribute('role') || el.tagName.toLowerCase()
        const state = [
          el.getAttribute('aria-disabled') === 'true' ? 'aria-disabled' : null,
          el.disabled ? 'disabled' : null,
          el.getAttribute('aria-selected') === 'true' ? 'selected' : null,
          el.getAttribute('aria-checked') === 'true' ? 'checked' : null,
        ].filter(Boolean).join(',')
        const key = `${role}|${name}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(`${role.padEnd(8)} ${state ? `[${state}] ` : ''}${name}`)
        if (out.length >= lim) break
      }
      return out
    }, limit)
    const file = `${outDir}/${String(n).padStart(2, '0')}-${label}.txt`
    writeFileSync(file, `${page.url()}\n\n${found.join('\n')}\n`, 'utf8')
    console.log(`probe ${file}  (${found.length} controls)`)
    return found
  },

  /** Dump visible text, for reading copy verbatim — the refusal sentences
   *  are the whole reason we are here. */
  async text(label = 'text', sel = 'body') {
    const t = await page.evaluate((s) => {
      const el = document.querySelector(s)
      return el ? el.innerText.replace(/\n{3,}/g, '\n\n') : ''
    }, sel)
    const file = `${outDir}/${String(n).padStart(2, '0')}-${label}.txt`
    writeFileSync(file, t, 'utf8')
    console.log(`text  ${file}  (${t.length} chars)`)
    return t
  },

  /** Anything that behaves like a flyout, dialog or sheet — the cascade
   *  announcement is the one thing this whole exercise is for, so look for
   *  it after every single click rather than hoping to catch it. */
  async dialogs() {
    return page.evaluate(() => {
      const all = []
      const walk = (root) => {
        for (const el of root.querySelectorAll('*')) {
          all.push(el)
          if (el.shadowRoot) walk(el.shadowRoot)
        }
      }
      walk(document)
      const out = []
      for (const el of all) {
        const role = el.getAttribute?.('role')
        const modal = el.getAttribute?.('aria-modal')
        const isDialog = role === 'dialog' || role === 'alertdialog' || modal === 'true' || el.tagName === 'DIALOG'
        if (!isDialog) continue
        const r = el.getBoundingClientRect()
        if (r.width < 40 || r.height < 40) continue
        const t = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 900)
        if (t) out.push(t)
      }
      return out
    })
  },

  /** Click by visible text, piercing shadow roots — the only thing that
   *  reaches a control inside a web component whose role never surfaces. */
  async deepTap(text, nth = 0) {
    const hit = await page.evaluate(([t, i]) => {
      const all = []
      const walk = (root) => {
        for (const el of root.querySelectorAll('*')) {
          all.push(el)
          if (el.shadowRoot) walk(el.shadowRoot)
        }
      }
      walk(document)
      const matches = all.filter((el) => {
        const own = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
        if (own !== t) return false
        const r = el.getBoundingClientRect()
        return r.width > 4 && r.height > 4
      })
      const el = matches[i]
      if (!el) return false
      el.scrollIntoView({ block: 'center' })
      el.click()
      return true
    }, [text, nth])
    console.log(`${hit ? 'deep  ' : 'deep  MISSED: '}${text}`)
    if (hit) await page.waitForTimeout(1200)
    return hit
  },

  /** Click the first thing that matches, trying several spellings. */
  async tap(...candidates) {
    for (const c of candidates) {
      try {
        const loc = typeof c === 'string' ? page.getByRole('button', { name: c, exact: false }).first() : c
        if (await loc.isVisible({ timeout: 1500 })) {
          await loc.click({ timeout: 4000 })
          console.log(`tap   ${typeof c === 'string' ? c : 'locator'}`)
          await page.waitForTimeout(900)
          return true
        }
      } catch { /* try the next spelling */ }
    }
    console.log(`tap   MISSED: ${candidates.filter((c) => typeof c === 'string').join(' | ')}`)
    return false
  },

  /** Dismiss the consent wall, whatever it calls itself this week. */
  async consent() {
    const words = ['Accept All', 'Accept all', 'Allow all', 'I Accept', 'Accept Cookies', 'Agree', 'Accept', 'Got it', 'OK']
    for (const w of words) {
      try {
        const b = page.getByRole('button', { name: w, exact: false }).first()
        if (await b.isVisible({ timeout: 1200 })) {
          await b.click({ timeout: 3000 })
          console.log(`consent: "${w}"`)
          await page.waitForTimeout(1200)
          return true
        }
      } catch { /* next */ }
    }
    // Some walls live in an iframe.
    for (const frame of page.frames()) {
      for (const w of words) {
        try {
          const b = frame.getByRole('button', { name: w, exact: false }).first()
          if (await b.isVisible({ timeout: 500 })) {
            await b.click({ timeout: 2000 })
            console.log(`consent (iframe): "${w}"`)
            await page.waitForTimeout(1200)
            return true
          }
        } catch { /* next */ }
      }
    }
    console.log('consent: none found')
    return false
  },

  async go(url, waitMs = 3500) {
    console.log(`go    ${url}`)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(waitMs)
  },

  wait: (ms) => page.waitForTimeout(ms),
}

try {
  const mod = await import(`file:///${scriptPath.replace(/\\/g, '/')}`)
  await mod.default(page, toolkit)
} catch (err) {
  console.error(`FAILED: ${err.message}`)
  try { await toolkit.snap('crash') } catch { /* nothing to save */ }
  process.exitCode = 1
} finally {
  await browser.close()
  console.log(`\ndone — ${outDir}`)
}
