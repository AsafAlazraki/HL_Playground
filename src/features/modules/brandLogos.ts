/* ============================================================
   THE BRANDS NORTHSIDE SELLS, AND THEIR MARKS.

   WHY THIS EXISTS AT ALL. `ModuleDef.logo` has been uploadable for a
   while — `ModuleSettings`' "Its mark" panel, and it works — but it
   hangs on the MODULE, and a card on the dashboard is a PLACE. The
   Northside seed is nine modules and twenty-five places: one "Boats"
   module holds Highfield, Stabicraft, Stacer, Formosa, Jeanneau,
   Surtees and Haines Signature. Measured 2026-09-09 by uploading one
   file in Boats › Settings: all SEVEN boat cards took it. So the
   upload cannot give a brand its own mark, and this table is the only
   thing that can.

   SO THIS IS A DEFAULT, NOT A STORE. It is consulted only when a
   module has no `logo` of its own; the moment somebody uploads one in
   module settings, theirs wins and this is never asked. Nothing here
   writes to the model, so a dealer who deletes a logo gets the
   default back rather than an empty square.

   ---------------------------------------------------------------
   WHY THE FILES ARE GLOBBED RATHER THAN NAMED, which is the whole
   correction in this file.

   Commit 92791d6 wrote this table pointing at `/logos/*.png` under
   `public/`. It shipped eight addresses and ZERO FILES: the root
   `.gitignore:29` ignores `*.png` repo-wide — "agent screenshots" —
   and `git add` dropped all eight without a word. Nothing failed
   loudly. `public/` is copied verbatim, so Vite never checks that a
   path under it resolves, and a dev server answers a missing file
   with the SPA fallback: `index.html`, `200 text/html`. Measured in
   Chrome on 2026-09-09, dashboard mount, Northside loaded:

       8 requests to /logos/*.png · 8 × 200 text/html · 0 pixels
       8 <img> pointed at an HTML document, each one a broken-glyph
       frame until its own onError condemned it

   That is why "the capability exists and nothing shows it" — not
   because the mark was never surfaced, but because its artwork never
   entered the repository.

   THE FIX IS TO MAKE A DANGLING ENTRY IMPOSSIBLE. The files live
   beside this module in `./marks/` and are resolved by
   `import.meta.glob`, so the build itself is the check: an entry
   whose file is absent is DROPPED here rather than emitted as an
   address that fails in somebody's browser. Under `src/` Vite also
   hashes and copies the asset, which `public/` does not.
   `./marks/.gitignore` negates the `*.png` rule for that directory
   alone, so the next mark somebody drops in is committed while the
   screenshot rule stands everywhere else.

   TO GIVE A BRAND ITS MARK: put the file in `src/features/modules/
   marks/` named as `file` below — `highfield.png` — and it appears on
   every surface that draws a place. Nothing else to edit.

   WHAT IS NOT HERE IS NOT INVENTED. The directory ships EMPTY: this
   repository does not contain Highfield's wordmark or anybody else's,
   and drawing a stand-in for a brand would be worse than the brand's
   name set properly. So today every entry below is dropped,
   `brandLogoFor` returns undefined for every name, and each place
   carries its name and its kind's colour — which is exactly what they
   carried before, minus eight requests that could never succeed.

   MATCHED ON THE NAME, AND ONLY ON A WHOLE WORD. "Stacer" must match
   "Stacer" and "Stacer Trailers" — the same brand sells both — while
   "NSM" must not match inside another word. So the key is compared
   against the name's own words rather than with `includes`, which is
   the difference between a rule and a coincidence.

   ORDER MATTERS: the list is walked in order and the FIRST match
   wins, so a more specific brand is written above a less specific
   one. "Haines Signature Factory Packages" reaches Haines before
   anything else can claim it.
   ============================================================ */

import type { ImageRef } from '@/types/model'

interface BrandMark {
  /** the word to look for in the place's name, lower case */
  word: string
  /** the file in `./marks/`. Present = drawn; absent = this entry
   *  does not exist at run time. */
  file: string
  /** what a screen reader says. Never the file name. */
  alt: string
}

/** What a mark WOULD be called if its file were here. Declared rather
 *  than derived from the file names, because `haines-signature.png`
 *  has to know it answers to the word "haines" and reads as "Haines
 *  Signature", and `nsm.png` reads as "Northside Marine" — neither of
 *  which a file name carries. */
const DECLARED: readonly BrandMark[] = [
  { word: 'highfield', file: 'highfield.png', alt: 'Highfield' },
  { word: 'stabicraft', file: 'stabicraft.png', alt: 'Stabicraft' },
  { word: 'stacer', file: 'stacer.png', alt: 'Stacer' },
  { word: 'jeanneau', file: 'jeanneau.png', alt: 'Jeanneau' },
  { word: 'haines', file: 'haines-signature.png', alt: 'Haines Signature' },
  { word: 'surtees', file: 'surtees.png', alt: 'Surtees' },
  { word: 'yamaha', file: 'yamaha.png', alt: 'Yamaha' },
  { word: 'nsm', file: 'nsm.png', alt: 'Northside Marine' },
]

/* WHAT IS ACTUALLY ON DISK, resolved at build time. `eager` so the
   answer is a plain string and no surface has to await a mark; `?url`
   so the asset is copied and hashed rather than inlined — a wordmark
   is shared by every card of its brand and wants one cache entry, not
   a base64 copy in the entry chunk.

   SVG AND WEBP ARE ACCEPTED TOO. `logo.ts` takes any of the four
   picture kinds from an upload and there is no reason a bundled mark
   should be narrower; the extension is part of `file` above. */
const PRESENT = import.meta.glob('./marks/*.{png,svg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** The declared marks whose file is really here. An entry with no
 *  file is not an address that fails later — it is not an entry. */
const MARKS: readonly (BrandMark & { src: string })[] = DECLARED.flatMap((m) => {
  const src = PRESENT[`./marks/${m.file}`]
  return src === undefined ? [] : [{ ...m, src }]
})

/** the name's own words, punctuation dropped — "Dunbier / Haines
 *  BMT Trailers" is four words and one of them is `haines`.
 *
 *  EXPORTED FOR ITS TEST, and the reason is the state of this
 *  feature rather than a preference. The matching rule — whole word,
 *  never `includes` — is the subtle half of this file, and with the
 *  marks directory empty `brandLogoFor` returns undefined for every
 *  input, so no test that goes through the front door can reach the
 *  rule at all. Asserting the splitter directly is the only way to
 *  hold it today; the alternative was shipping the rule untested or
 *  committing a stand-in wordmark to test against, and inventing a
 *  brand's artwork to make a test green is worse than either. */
export const nameWords = (name: string): string[] =>
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
  const words = new Set(nameWords(name))
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

/** WHICH BRANDS COULD BE MARKED, AND WHICH ARE. Exported for the test
 *  that holds this file to its own promise: every declared entry
 *  either has a file here or is absent from the roster — there is no
 *  third state where an address ships without pixels behind it. */
export function brandMarkRoster(): { declared: number; present: readonly string[] } {
  return { declared: DECLARED.length, present: MARKS.map((m) => m.word) }
}
