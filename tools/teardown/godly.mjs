/* godly.website — a curated gallery of the best-designed sites on the
 * web. The question is not "is it pretty"; it is WHICH of what these
 * do survives contact with a dealer tool over a 15,691-row price file.
 * So: what is featured, what do they have in common, and what are they
 * FOR — because a portfolio site and a configurator answer different
 * questions and most of the craft does not transfer. */
export default async function (page, k) {
  await k.go('https://godly.website/', 8000)
  await k.consent()
  await k.wait(3000)
  await k.snap('godly-top')
  await k.snap('godly-full', { full: true })

  /* INTERFACE is the only one of eleven categories that answers our
     question. Branding, Illustration, 3D, Editorial, Print and
     Packaging are not software at all; Web is marketing sites. */
  await page.getByRole('link', { name: /^Interface$/ }).first().click().catch(() => {})
  await page.getByRole('button', { name: /^Interface$/ }).first().click().catch(() => {})
  await k.wait(4000)
  await k.snap('interface')
  await k.snap('interface-full', { full: true })

  const facts = await page.evaluate(() => {
    const out = []
    /* what the gallery is made of */
    const cards = [...document.querySelectorAll('a[href]')].filter((a) => {
      const r = a.getBoundingClientRect()
      return r.width > 180 && r.height > 140
    })
    out.push('gallery cards: ' + cards.length)

    /* the categories it sorts by — that is the site telling you what
       it thinks the axes of good design are */
    const nav = [...document.querySelectorAll('a,button')]
      .map((el) => (el.innerText || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t.length > 1 && t.length < 26)
    out.push('nav / filters: ' + [...new Set(nav)].slice(0, 40).join(' | '))

    /* the featured names, which is the actual inventory */
    const names = cards
      .map((a) => (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 44))
      .filter(Boolean)
    out.push('featured (first 30):')
    for (const n of [...new Set(names)].slice(0, 30)) out.push('   ' + n)
    return out
  })
  for (const f of facts) console.log(f)
}
