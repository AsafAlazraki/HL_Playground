/* ============================================================
   THE BRANDS NORTHSIDE SELLS, AND THEIR MARKS.

   WHY THIS EXISTS AT ALL. `ModuleDef.logo` has been uploadable for
   a while and every module's logo was empty, so every tile in the
   business fell back to the same eight kind symbols and a dealer
   looked at fourteen boats. The marks were sitting in the dealer's
   own Downloads folder the whole time.

   SO THIS IS A DEFAULT, NOT A STORE. It is consulted only when a
   module has no `logo` of its own; the moment somebody uploads one
   in module settings, theirs wins and this is never asked. Nothing
   here writes to the model, so a dealer who deletes a logo gets
   the default back rather than an empty square, and a dealer who
   has never uploaded anything gets a business that looks like
   itself on first run.

   MATCHED ON THE NAME, AND ONLY ON A WHOLE WORD. "Stacer" must
   match "Stacer" and "Stacer Trailers" — the same brand sells both
   — while "NSM" must not match inside another word. So the key is
   compared against the name's own words rather than with
   `includes`, which is the difference between a rule and a
   coincidence.

   ORDER MATTERS: the list is walked in order and the FIRST match
   wins, so a more specific brand is written above a less specific
   one. "Haines Signature Factory Packages" reaches Haines before
   anything else can claim it.

   WHAT IS NOT HERE IS NOT INVENTED. Formosa, ePropulsion, Dunbier,
   REDCO, Mackay and GFAB have no mark in this list because there
   is no file for them; their tiles carry the name and the kind's
   colour, which is what every tile carried before. A grey
   placeholder standing in for a brand is worse than the brand's
   name set properly.
   ============================================================ */

import type { ImageRef } from '@/types/model'

interface BrandMark {
  /** the word to look for in the place's name, lower case */
  word: string
  /** under public/, so it is same-origin and needs no permission */
  src: string
  /** what a screen reader says. Never the file name. */
  alt: string
}

const MARKS: readonly BrandMark[] = [
  { word: 'highfield', src: '/logos/highfield.png', alt: 'Highfield' },
  { word: 'stabicraft', src: '/logos/stabicraft.png', alt: 'Stabicraft' },
  { word: 'stacer', src: '/logos/stacer.png', alt: 'Stacer' },
  { word: 'jeanneau', src: '/logos/jeanneau.png', alt: 'Jeanneau' },
  { word: 'haines', src: '/logos/haines-signature.png', alt: 'Haines Signature' },
  { word: 'surtees', src: '/logos/surtees.png', alt: 'Surtees' },
  { word: 'yamaha', src: '/logos/yamaha.png', alt: 'Yamaha' },
  { word: 'nsm', src: '/logos/nsm.png', alt: 'Northside Marine' },
]

/** the name's own words, punctuation dropped — "Dunbier / Haines
 *  BMT Trailers" is four words and one of them is `haines` */
const wordsOf = (name: string): string[] =>
  name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

/** The mark for a place that has none of its own, or undefined.
 *
 *  Returns a full `ImageRef` rather than a string so the caller
 *  cannot tell a default from an uploaded one and does not have to
 *  branch — `PlaceMark` draws whichever it is given by exactly the
 *  same path, including the permission check `useImageDisplay`
 *  applies to every address in this application. */
export function brandLogoFor(name: string): ImageRef | undefined {
  const words = new Set(wordsOf(name))
  for (const m of MARKS) {
    if (words.has(m.word)) {
      return { id: `brand-${m.word}`, src: m.src, name: m.alt, alt: m.alt }
    }
  }
  return undefined
}

/** `logo ?? brandLogoFor(name)`, written once so every surface that
 *  draws a place agrees about which mark it gets. */
export function markFor(logo: ImageRef | undefined, name: string): ImageRef | undefined {
  return logo ?? brandLogoFor(name)
}
