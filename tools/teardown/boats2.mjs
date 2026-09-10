/* Second pass: land on the homepage, find where "build" actually points,
 * follow it. Guessing URLs cost us two 404s. */
const HOMES = [
  ['boston-whaler', 'https://www.bostonwhaler.com/'],
  ['sea-ray', 'https://www.searay.com/'],
  ['malibu', 'https://www.malibuboats.com/'],
  ['grady-white', 'https://www.gradywhite.com/'],
  ['chaparral', 'https://chaparralboats.com/'],
]

export default async function (page, k) {
  for (const [name, home] of HOMES) {
    console.log(`\n──── ${name} ────`)
    try {
      await k.go(home, 6000)
      await k.consent()

      const hrefs = await page.evaluate(() => {
        const all = []
        const walk = (root) => {
          for (const el of root.querySelectorAll('*')) {
            all.push(el)
            if (el.shadowRoot) walk(el.shadowRoot)
          }
        }
        walk(document)
        return [...new Set(all.map((el) => el.getAttribute?.('href')).filter(Boolean))]
      })

      const build = hrefs.find((h) => /build|configur|design-your|byo/i.test(h))
      if (!build) { console.log(`no build link among ${hrefs.length} hrefs`); continue }

      const url = build.startsWith('http') ? build : new URL(build, home).href
      console.log(`build link: ${url}`)
      await k.go(url, 8000)
      await k.consent()
      await k.wait(3000)
      await k.snap(`${name}-build`)
      await k.probe(`${name}-build-controls`, 120)
      await k.text(`${name}-build-copy`)
    } catch (err) {
      console.log(`FAILED ${name}: ${err.message.split('\n')[0]}`)
    }
  }
}
