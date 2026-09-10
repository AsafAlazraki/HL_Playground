/* Hunt the cascade.
 *
 * The playbook records Porsche saying "Your build will be adjusted." with the
 * cheapest fix pre-selected and every alternative priced. Nothing else in the
 * teardown cohort does this, and our own `optionConflict` has no callers, so
 * this is the one screen worth capturing exactly.
 *
 * Method: pick options that are likely to fight each other — an expensive
 * paint, then wheels, then the packages that bundle their own wheels — and
 * look for a dialog after every click rather than hoping to land on one. */
export default async function (page, k) {
  await k.go('https://configurator.porsche.com/en-AU/mode/model/9921B2', 14000)
  await k.consent()
  await k.wait(4000)

  const picks = [
    'Oak Green Metallic Neo, Price: $7,870.00',
    'Carrera S Wheels',
    'Carrera Exclusive Design Wheels',
    'Sport Chrono Package',
    'SportDesign Package',
    'Heritage Design Package Pasha',
    'Lightweight Package',
    'Sports exhaust system',
    'Porsche Ceramic Composite Brake',
    'Rear axle steering',
  ]

  for (const label of picks) {
    const clicked = await page.evaluate((want) => {
      const all = []
      const walk = (root) => {
        for (const el of root.querySelectorAll('*')) {
          all.push(el)
          if (el.shadowRoot) walk(el.shadowRoot)
        }
      }
      walk(document)
      /* Match on the accessible name, which is where Porsche puts both the
       * option and its price ("Guards Red, Price: $0.00"). */
      const hit = all.find((el) => {
        const n = el.getAttribute?.('aria-label') || el.getAttribute?.('title') || ''
        const t = (el.innerText || '').replace(/\s+/g, ' ').trim()
        return (n === want || n.startsWith(want) || t === want) &&
               el.getBoundingClientRect().width > 4
      })
      if (!hit) return false
      hit.scrollIntoView({ block: 'center' })
      const target = hit.tagName === 'INPUT' ? hit : hit
      target.click()
      return true
    }, label)

    if (!clicked) { console.log(`skip  ${label}`); continue }
    console.log(`pick  ${label}`)
    await k.wait(3000)

    const found = await k.dialogs()
    if (found.length) {
      console.log(`\n*** DIALOG after "${label}" ***`)
      for (const d of found) console.log(d)
      console.log('***\n')
      await k.snap(`cascade-after-${label.slice(0, 24).replace(/[^a-z0-9]+/gi, '-')}`)
      await k.text(`cascade-after-${label.slice(0, 24).replace(/[^a-z0-9]+/gi, '-')}-copy`)
    }
  }

  await k.snap('after-all-picks')
  await k.text('after-all-picks-copy')
  await k.probe('after-all-picks-controls', 220)
}
