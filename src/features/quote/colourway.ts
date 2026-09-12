/* ============================================================
   READING A COLOURWAY CODE — "B-G-B" is Black / Grey / Black.

   Highfield is the only brand on this sheet that splits to a third
   level, and it splits by MATERIAL x COLOURWAY: 588 variants whose
   names differ only in a trailing token. On the screen a dealer
   picks from, seven rows read

       Highfield - ADV7 (HYP) B-G-B        $105,930
       Highfield - ADV7 (HYP) B-G-LB       $105,930
       Highfield - ADV7 (HYP) B-G-WB       $105,930

   — the same boat, the same price, three times, distinguishable
   only by an undecoded token. That is the 588-variant problem this
   repo has circled for months.

   THE PROJECT PREVIOUSLY DECIDED THIS COULD NOT BE DONE, and was
   wrong on a checkable fact. `godly-and-what-transfers.md:70-84`
   killed colour swatches because "there is no colour column ...
   decoding B-G-B would be the guess §7 forbids". There IS a colour
   column — `variant`, semantic `identity`, described in the seed
   itself as "Material x colourway, read out of Boat Module!C" — and
   the original HelmLogic has shipped the decode map since it was
   seeded. That session searched one JSON, did not find a column
   named "colour", and stopped.

   THE MAP IS NOT INVENTED HERE. It is copied from the production
   repo, where four seeding scripts carry the same fifteen entries:
   `scripts/parse_excel_data.py:21-27`, `scripts/seed-highfield.py:34-40`,
   `scripts/reseed-all-boats.py:207-213`, `scripts/reseed-correct-vendor.py:64-70`.

   ONE ENTRY IS DISPUTED AND IS THEREFORE ABSENT. Two of those four
   read `I` as "Ivory" and two read it as "Inflatable", all four
   committed on the same day, with nothing to break the tie. `I`
   does not occur in this sheet's data — the tokens that do are B,
   DB, DG, G, LB, LG, MB, W, WB and WG — so nothing is lost by
   leaving it out, and choosing between two shipped answers on no
   evidence is exactly the guess rule 11 forbids.

   HOW MUCH OF THE SHEET THIS READS: 483 of the 604 Highfield rows,
   counted over the seed's own names. The 121 it does not read are
   `I` (32 rows), `O` (26), `R` (26) and `WH` (16) — none of which
   appears in ANY of the four production maps or in the legend at
   `HIGHFIELD_DATA_REVIEW.md:3265-3279` — and a tail of rows whose
   last token is a size ("340", "(Dune)") rather than a colourway at
   all, which `isColourway` correctly declines. Four unknown tokens
   is a question for the dealer, not a gap to fill in with a guess.

   AND A CODE IS ALL-OR-NOTHING. If any part of it is not in the
   map the whole code is handed back undecoded, for the screen to
   print verbatim. Half a translation ("Black / Grey / WB") reads
   as a decode that worked, and it did not.
   ============================================================ */

/** The fifteen-entry map, less the disputed `I`. Copied verbatim
 *  from the production seeding scripts named above — including
 *  "Wood Dark" rather than "Wood", which is the value that shipped. */
const PART: Readonly<Record<string, string>> = {
  W: 'White',
  B: 'Black',
  G: 'Grey',
  DG: 'Dark Grey',
  LG: 'Light Grey',
  LB: 'Light Blue',
  WB: 'White/Blue',
  WD: 'Wood Dark',
  MB: 'Military Black',
  C: 'Carbon',
  DB: 'Dark Blue',
  WG: 'White/Grey',
  WDG: 'Wood/Dark Grey',
  BL: 'Blue',
}

export interface Colourway {
  /** the code exactly as the price file carries it — "B-G-B" */
  code: string
  /** one name per part, in the file's own order. EMPTY when any
   *  part is unknown: see the all-or-nothing note above. */
  parts: string[]
  /** what a face prints — "Black / Grey / Black", or the code
   *  itself when it could not be read. Never empty for a non-empty
   *  code, so a caller never has to decide what to draw. */
  say: string
  /** did every part decode? The screen uses this to decide whether
   *  the code is worth printing a second time as provenance. */
  read: boolean
}

/** Split a variant cell into its material and its colourway.
 *
 *  The cell holds both — "HYP B-G-B", "540 open (PVC) LG-W-DG" — and
 *  the colourway is the LAST whitespace-separated token, because the
 *  material half is the part that varies in shape (one word for
 *  Hypalon, four for a PVC length-and-style). Splitting from the
 *  right is the only rule that survives both. */
export function splitVariant(cell: string): { material: string; code: string } {
  const trimmed = cell.trim()
  if (trimmed === '') return { material: '', code: '' }
  const at = trimmed.lastIndexOf(' ')
  if (at < 0) return { material: '', code: trimmed }
  return { material: trimmed.slice(0, at).trim(), code: trimmed.slice(at + 1) }
}

/** Read a colourway code. A code with no hyphen is still a code —
 *  a single part decodes on its own. */
export function colourwayOf(code: string): Colourway {
  const clean = code.trim()
  if (clean === '') return { code: '', parts: [], say: '', read: false }

  const parts: string[] = []
  for (const token of clean.split('-')) {
    const name = PART[token]
    /* ONE UNKNOWN PART AND THE WHOLE CODE IS UNREAD. */
    if (name === undefined) return { code: clean, parts: [], say: clean, read: false }
    parts.push(name)
  }
  return { code: clean, parts, say: parts.join(' / '), read: true }
}

/** Is this cell a colourway at all? A table whose third level is
 *  something else entirely — a trailer's plug type, a motor's shaft
 *  — must not be drawn as a colour. A cell reads as a colourway only
 *  when every part of its last token is in the map. */
export function isColourway(cell: string): boolean {
  return colourwayOf(splitVariant(cell).code).read
}
