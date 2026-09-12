/* READING THE GLASS, not the stylesheet.

   Every figure the gallery prints comes through here. The rule is
   the one `tools/check-contrast.mjs` learned the hard way over
   three sweeps that each reported a false catastrophe:

     1. parse `color(srgb ...)` as well as `rgb()`
     2. composite the FULL ancestor chain, not just the parent
     3. composite translucent TEXT over that ground before measuring

   Skip any one of them and the number is wrong in a direction that
   looks alarming. The parser returns null rather than guessing,
   because a ruler that quietly invents a number is worse than no
   ruler. */

export type Rgb = { r: number; g: number; b: number; a: number }

/** Parses `rgb()`, `rgba()` and `color(srgb ...)`. Returns null
 *  rather than guessing — a guessed colour is a lie with a number
 *  attached. */
export function parseColour(input: string): Rgb | null {
  const s = input.trim()
  if (!s || s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }

  const srgb = s.match(
    /^color\(\s*srgb\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)(?:\s*\/\s*([\d.eE+-]+%?))?\s*\)$/i,
  )
  if (srgb) {
    /* THE 0-1 TRAP. These channels are 0-1, not 0-255. A sweep that
       read them as 0-255 condemned every card title at 1.1:1. */
    return {
      r: clamp255(Number(srgb[1]) * 255),
      g: clamp255(Number(srgb[2]) * 255),
      b: clamp255(Number(srgb[3]) * 255),
      a: srgb[4] === undefined ? 1 : alpha(srgb[4]),
    }
  }

  const rgb = s.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i,
  )
  if (rgb) {
    return {
      r: clamp255(Number(rgb[1])),
      g: clamp255(Number(rgb[2])),
      b: clamp255(Number(rgb[3])),
      a: rgb[4] === undefined ? 1 : alpha(rgb[4]),
    }
  }

  return null
}

function clamp255(n: number) {
  return Math.max(0, Math.min(255, n))
}

function alpha(raw: string) {
  return raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw)
}

/** Paints `top` over `under`. */
export function over(top: Rgb, under: Rgb): Rgb {
  const a = top.a + under.a * (1 - top.a)
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
  const mix = (t: number, u: number) => (t * top.a + u * under.a * (1 - top.a)) / a
  return { r: mix(top.r, under.r), g: mix(top.g, under.g), b: mix(top.b, under.b), a }
}

/** THE FULL ANCESTOR CHAIN. Walking only to the parent is how a
 *  3.5% tint over white gets read as near-black. */
export function groundOf(el: Element): Rgb {
  const chain: Rgb[] = []
  let node: Element | null = el
  while (node) {
    const bg = parseColour(getComputedStyle(node).backgroundColor)
    if (bg && bg.a > 0) chain.push(bg)
    if (bg && bg.a >= 1) break
    node = node.parentElement
  }
  chain.push({ r: 255, g: 255, b: 255, a: 1 })
  return chain.reduceRight((under, top) => over(top, under))
}

function channel(c: number) {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

export function luminance(c: Rgb) {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b)
}

export function ratio(fg: Rgb, bg: Rgb) {
  const a = luminance(fg)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/** The contrast of an element's own text against the ground it is
 *  actually drawn on, with translucent ink composited first. */
export function contrastOf(el: Element): number | null {
  const ink = parseColour(getComputedStyle(el).color)
  if (!ink) return null
  const ground = groundOf(el)
  return ratio(over(ink, ground), ground)
}

/** The rendered font size, in px, as the browser resolved it —
 *  which is the only size that matters. A clamp() in a stylesheet
 *  is a promise; this is what it kept. */
export function renderedPx(el: Element): number {
  return parseFloat(getComputedStyle(el).fontSize)
}

export function fmt(n: number, places = 2) {
  return n.toFixed(places).replace(/\.0+$/, '')
}
