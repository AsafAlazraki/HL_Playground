/* ============================================================
   THE MARQUE — taking a subject label apart so the product
   name can be one word.

   MOVED OUT OF `QuoteBuild.tsx` BY THE REBUILD. It is pure
   string work with no React in it, it is the answer to a fault
   `CONFIGURATOR.md` names — "a model code drawn as a headline …
   an identifier is not a headline" — and the rebuilt screen
   needs it as much as the old one does. A function two screens
   share should not live inside one of them.
   ============================================================ */

/** What a subject label is actually made of, once it is taken apart. */
export type Lockup = {
  /** the maker, where the label states one — `Highfield` */
  maker: string
  /** the model code: the NAME of the thing, and the only marque — `CL260` */
  model: string
  /** everything the model is qualified by — `(PVC) B-G-DG` */
  trim: string
  /** true when the model cannot be set at the display step, so the
   *  surface takes the whole `--t-hero` step instead */
  long: boolean
}

/** A maker longer than this is not a maker — it is the first half of a
 *  part description that happens to contain a hyphen. Measured against
 *  the seed: `Highfield` 9, `Yamaha` 6, `Yamaha Twin Rig` 15,
 *  `DEC Rigging Kit (Twin Eng)` 26 — which is the one that must fail. */
const MAKER_MAX = 20

/** THE MEASURED CEILING, and the reason it is seven. Archivo at the
 *  marque step is 82.86px at 1280 and the identity column's content box
 *  is 360.3px. Measured in Chrome with the face loaded: `CL290FT` 325.6
 *  and `SP760ST` 330.3 fit; `RU230KAM` 418.8, `XF450USA` 391.2 and
 *  `F9.9SMHB` 381.9 do not. A model code is one unbroken token, so a
 *  code that does not fit has nowhere to wrap — it would overflow into
 *  the pane's `overflow: hidden` and lose letters. Seven characters is
 *  where that boundary sits, so eight steps the whole thing down. */
const MARQUE_TOKEN_MAX = 7

/**
 * TAKE THE LABEL APART SO THE MARQUE CAN BE ONE WORD.
 *
 * `quote.subjectLabel` is four facts welded together —
 * `Highfield - RU230KAM (PVC) WH` is a maker, a model, a hull material
 * and a colourway. PHASE_TWO §2.3 asks for a 72–110px product NAME; the
 * name is the model. Setting the whole string at that step is what put
 * an earlier pass across three lines and 228.5px of a 806px pane.
 *
 * NOTHING IS DROPPED. Every character of the label comes back out of
 * this function in `maker`, `model` and `trim`, and `ProductPane` draws
 * all three inside the one `h1`, in the order they were written.
 *
 * WHERE IT DECLINES TO SPLIT it returns the whole label as the model
 * and marks it long, so the surface steps down rather than guessing.
 */
export function marqueOf(label: string): Lockup {
  const whole = label.trim()

  /* THE MAKER IS WHAT PRECEDES THE FIRST ` - `, and only if it is
     short enough to be a maker. `Fusion Apollo RA670 Stereo w 2 Pairs
     of XS 6.5 Speakers + 1.8mtr Aerial` has no ` - ` at all and falls
     straight through, which is right: it has no marque in it. */
  const cut = whole.indexOf(' - ')
  const hasMaker = cut > 0 && cut <= MAKER_MAX
  const maker = hasMaker ? whole.slice(0, cut) : ''
  const rest = hasMaker ? whole.slice(cut + 3).trim() : whole

  /* THE MODEL RUNS TO THE FIRST QUALIFIER — a bracket or a pipe.
     `CL260 (PVC) B-G-DG` splits at ` (`; `6X9 Binnacle | Built in DES`
     splits at ` |`; `F9.9SMHB` has neither and is the model entire. */
  const marks = [rest.indexOf(' ('), rest.indexOf(' |')].filter((i) => i > 0)
  const at = marks.length > 0 ? Math.min(...marks) : -1
  const model = (at > 0 ? rest.slice(0, at) : rest).trim()
  const trim = at > 0 ? rest.slice(at + 1).trim() : ''

  /* A LABEL THAT SPLIT TO NOTHING KEEPS ITS WHOLE SELF. */
  if (model === '') return { maker: '', model: whole, trim: '', long: true }

  const longest = model.split(/\s+/).reduce((n, word) => Math.max(n, word.length), 0)
  return { maker, model, trim, long: longest > MARQUE_TOKEN_MAX }
}
