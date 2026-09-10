/* Straight into the 911 Carrera configurator, then through every stage of it.
 * What we are after: the stage/rail split, the price bar, and above all what
 * happens at the moment one choice invalidates another.
 *
 * Porsche renders through web components, so everything here goes through
 * deepTap, which pierces shadow roots. A plain role query sees nine controls
 * on a page that has hundreds. */
export default async function (page, k) {
  await k.go('https://models.porsche.com/en-AU/model-start/911', 4500)
  await k.consent()
  await k.deepTap('Configure', 0)
  await k.wait(10000)

  await k.snap('configurator')
  await k.probe('configurator-controls', 150)
  await k.text('configurator-copy')

  const stages = ['Exterior', 'Interior', 'Equipment', 'Summary']
  for (const s of stages) {
    if (await k.deepTap(s, 0)) {
      await k.wait(4000)
      await k.snap(`stage-${s.toLowerCase()}`)
      await k.probe(`stage-${s.toLowerCase()}-controls`, 150)
      await k.text(`stage-${s.toLowerCase()}-copy`)
    }
  }
}
