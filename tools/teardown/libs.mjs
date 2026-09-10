/* magicui and reactbits, walked rather than remembered. What we want
 * is the INVENTORY — which components exist and what each actually
 * does — so the port list is chosen from evidence and not from a
 * recollection of a landing page. */
const SITES = [
  ['magicui', 'https://magicui.design/docs/components/marquee'],
  ['reactbits', 'https://www.reactbits.dev/'],
]

export default async function (page, k) {
  for (const [name, url] of SITES) {
    console.log(`\n──── ${name} ────`)
    try {
      await k.go(url, 7000)
      await k.consent()
      await k.wait(2500)
      await k.snap(name)

      /* The component index is a nav of links; take their text and
         their hrefs, which is the inventory. */
      const items = await page.evaluate(() => {
        const all = []
        const walk = (root) => {
          for (const el of root.querySelectorAll('*')) {
            all.push(el)
            if (el.shadowRoot) walk(el.shadowRoot)
          }
        }
        walk(document)
        const out = new Set()
        for (const el of all) {
          const href = el.getAttribute?.('href')
          if (!href) continue
          const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim()
          if (!t || t.length > 44) continue
          if (/component|docs|\/text|\/anim|\/back|\/button|\/card/i.test(href)) out.add(`${t}  ->  ${href}`)
        }
        return [...out]
      })
      console.log(`${items.length} component links`)
      for (const i of items.slice(0, 120)) console.log('  ' + i)
    } catch (err) {
      console.log(`FAILED ${name}: ${err.message.split('\n')[0]}`)
    }
  }
}
