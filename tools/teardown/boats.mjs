/* The boat cohort. Porsche is the ceiling; this is the floor we actually
 * compete against, and two of these brands are rows in our own price file.
 *
 * One pass each: land, consent, screenshot, probe, capture the copy. Where a
 * builder needs a click to open, take it; where a site 404s or walls us, log
 * it and move on rather than pretending we saw it. */
const SITES = [
  ['boston-whaler', 'https://www.bostonwhaler.com/en-us/build-a-boat.html'],
  ['sea-ray', 'https://www.searay.com/build-a-boat'],
  ['malibu', 'https://www.malibuboats.com/build'],
  ['mastercraft', 'https://www.mastercraft.com/build-a-boat/'],
  ['stabicraft', 'https://www.stabicraft.com/boats/'],
  ['axopar', 'https://www.axopar.com/boats'],
  ['highfield', 'https://www.highfieldboats.com/en/ranges/'],
]

export default async function (page, k) {
  for (const [name, url] of SITES) {
    console.log(`\n──── ${name} ────`)
    try {
      await k.go(url, 6000)
      await k.consent()
      await k.wait(2500)
      await k.snap(name)
      await k.probe(`${name}-controls`, 110)
      await k.text(`${name}-copy`)

      /* If there is an obvious way into a builder, take one step in. */
      for (const word of ['Build', 'Configure', 'Build & Price', 'Build Your Boat', 'Customise', 'Customize']) {
        if (await k.deepTap(word, 0)) {
          await k.wait(5000)
          await k.snap(`${name}-builder`)
          await k.text(`${name}-builder-copy`)
          break
        }
      }
    } catch (err) {
      console.log(`FAILED ${name}: ${err.message.split('\n')[0]}`)
    }
  }
}
