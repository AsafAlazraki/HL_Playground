/* The Configure control did not navigate on a synthetic click, so find where
 * it actually points and go there directly. */
export default async function (page, k) {
  await k.go('https://models.porsche.com/en-AU/model-start/911', 4500)
  await k.consent()

  const links = await page.evaluate(() => {
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
      const href = el.getAttribute?.('href')
      if (!href) continue
      const name = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
      out.push(`${href}   <<${name}>>`)
    }
    return [...new Set(out)]
  })

  const file = `${k.outDir}/hrefs.txt`
  ;(await import('node:fs')).writeFileSync(file, links.join('\n'), 'utf8')
  console.log(`\n${links.length} hrefs written to ${file}`)
  const interesting = links.filter((href) => /configur|build|car-configurator|\/911\//i.test(href))
  for (const href of interesting.slice(0, 25)) console.log(`  ${href}`)
}
