/* Porsche model-start → into a real configurator, screenshotting the flow.
 * The question: what makes it feel expensive, and what does it do at the
 * moment a choice conflicts with another. */
export default async function (page, k) {
  await k.go('https://models.porsche.com/en-AU/model-start', 5000)
  await k.consent()
  await k.snap('model-start')
  await k.probe('model-start-controls')
  await k.text('model-start-copy')

  // Into a model. 911 is the deepest option tree they ship.
  const picked =
    (await k.tap('911')) ||
    (await k.tap(page.getByRole('link', { name: /911/i }).first())) ||
    (await k.tap(page.locator('a,button').filter({ hasText: /^911/ }).first()))

  await k.wait(4000)
  await k.snap('after-model-pick')
  await k.probe('after-model-pick-controls')

  console.log(`\npicked a model: ${picked}`)
  console.log(`landed on: ${page.url()}`)
}
