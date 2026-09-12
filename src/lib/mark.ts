/* ============================================================
   THE MARK ON A PLATE — two or three characters of a name.

   Every Showroom grid draws a plate under its photograph, because
   `FrozenPhoto` draws NOTHING rather than a broken image and an
   empty well on a quarter of a grid reads as a screen that failed
   to load. On the plate is the thing's own name, shortened.

   THREE SCREENS WROTE THIS THREE WAYS before it was one function —
   `name.slice(0, 2)`, `name.slice(0, 3)`, and first-letters-of-
   words — and the first of those put "Ac" on the Accessories tile,
   which reads as a word cut in half rather than as a mark.

   THE RULE IS THE SHAPE OF THE NAME, not a preference:

     two or more words   the first letter of each, at most two.
                         "Highfield Inflatables" is HI.
     one word            its first three characters. "Accessories"
                         is Acc, "RU230KAM" is RU2 — and a model
                         code's initials would be one letter, which
                         is why this is not first-letters throughout.

   NEVER `toUpperCase()`. Rule 3 keeps uppercase for labels, and a
   name is not a label; the characters come out of the name exactly
   as the sheet wrote them. A brand's own capitals do the work.
   ============================================================ */

/** Two or three characters standing for a name, for a plate. '' when
 *  the name carries no letter or digit at all. */
export function markOf(name: string): string {
  const words = name.split(/[\s/&·-]+/).filter((w) => /[A-Za-z0-9]/.test(w))
  if (words.length === 0) return ''
  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((w) => w.match(/[A-Za-z0-9]/)?.[0] ?? '')
      .join('')
  }
  return (words[0] ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 3)
}
