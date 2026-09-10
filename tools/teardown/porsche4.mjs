/* The real thing: configurator.porsche.com, 911 Carrera (992B2).
 *
 * Three questions, in order of what they are worth to us:
 *   1. the stage/rail split, and how the price behaves while you configure
 *   2. what an option row looks like — how a price delta is framed
 *   3. the cascade: what the screen says when one choice invalidates another */
export default async function (page, k) {
  await k.go('https://configurator.porsche.com/en-AU/mode/model/9921B2', 14000)
  await k.consent()
  await k.wait(5000)

  await k.snap('landing')
  await k.snap('landing-full', { full: true })
  await k.probe('landing-controls', 200)
  await k.text('landing-copy')

  /* The stage navigation. Names vary by market, so try a spread and
   * screenshot whatever answers. */
  const stages = [
    'Exterior Colour', 'Exterior', 'Wheels', 'Interior', 'Interior Colour',
    'Packages', 'Equipment', 'Options', 'Summary', 'Overview',
  ]
  for (const s of stages) {
    if (await k.deepTap(s, 0)) {
      await k.wait(4500)
      await k.snap(`stage-${s.replace(/\s+/g, '-').toLowerCase()}`)
      await k.text(`stage-${s.replace(/\s+/g, '-').toLowerCase()}-copy`)
    }
  }
}
