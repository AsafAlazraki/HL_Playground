/* ============================================================
   WHAT ACTUALLY TELLS TWO OPTIONS APART

   ── THE MEASUREMENT THAT PROMPTED THIS ───────────────────────

   An offer card prints three pair facts, taken as `pairFacts
   .slice(0, 3)` — the first three columns of the dealer's join
   table, in whatever order their spreadsheet happens to carry them.
   On the Northside seed, the three motors offered for a Highfield
   ADV7 print:

     Prop Part No.       6CE-45978-20                    ← all three
     Prop Description    PROPELLER - Saltwater T II …    ← all three
     Rigging Kit Option  Helm Master L2 … | Bolt on DES …

   TWO OF THE THREE FACTS ARE THE SAME ON EVERY OPTION. They cannot
   help anyone choose, they are the two longest strings on the card,
   and the one fact that does differ is pushed to the bottom and
   truncated. A card that spends 80% of itself on text identical to
   its neighbours has told the reader nothing.

   Porsche's option rows carry a name and a price. Boston Whaler's
   carry a name and a price. Neither prints a shared part number on
   every tile. Ours had to, because nothing decided WHICH facts were
   worth the space — column order decided, and column order is an
   accident of somebody's workbook.

   ── THE RULE ─────────────────────────────────────────────────

   A fact earns its place on a card by DIFFERING from the other
   cards in the same band. That is the whole rule, and it is
   data-driven rather than a list of blessed column names: it works
   on a boat dealer's rigging kits and on a bike shop's chainsets
   without either being named here.

   Two consequences worth stating because they are deliberate:

   · ORDER IS THE DEALER'S. Among the facts that do differ, the
     original column order is kept. Ranking by "most varied" would
     put a high-cardinality serial number first, and the dealer's
     own arrangement is better information than that heuristic.
   · ONE CANDIDATE MEANS NO DISCRIMINATION IS POSSIBLE, and then
     the facts are describing the thing rather than telling it apart
     from anything — so all of them are kept. A band with one offer
     is not a choice, and the rule that governs choices does not
     apply to it.

   ── AND THE SEGMENT INSIDE THE FACT ──────────────────────────

   `Rigging Kit Option` differs across the three motors, so it stays
   — but 5 of its 6 pipe-separated segments are identical on all
   three too:

     Helm Master L2 - 6X9 Binnacle | Bolt on DES | Straight Helm | …
     Helm Master L2 - 6X9 Binnacle | Built in DES | Straight Helm | …

   The decision is `Bolt on DES` against `Built in DES`, and it is
   four words inside seventy. So the same rule is applied one level
   down: split on the separators the data already uses, drop the
   segments every candidate shares, and show what is left.

   NOTHING IS LOST. `full` carries the whole value for the title
   attribute, and `reduced` says the shortening happened so the
   surface can mark it. DESIGN_PRINCIPLES §3 forbids truncating
   mid-word; this does not truncate at all — it removes whole
   segments that are true of every option on the screen.
   ============================================================ */

/** A fact as `pairFactsOf` froze it onto the line. */
export interface Fact {
  label: string
  value: string
}

/** A fact chosen for a card, and what happened to it. */
export interface ShownFact {
  label: string
  /** what to print: the whole value, or only the differing segments */
  value: string
  /** the whole value, always — for `title`, so nothing is hidden */
  full: string
  /** true when `value` is a reduction of `full` */
  reduced: boolean
}

/* The separators a price file actually uses inside one cell. Kept
   short and literal: guessing at more of them would start splitting
   values that are one fact containing a comma. */
const SEGMENT = /\s*[|·]\s*/

const norm = (s: string): string => s.trim()

/**
 * WHICH FACTS TO PRINT ON EACH CARD IN A BAND.
 *
 * `rows` is one fact list per candidate, in the order the cards are
 * drawn. The return is one list per candidate, aligned by index.
 *
 * It is computed over the WHOLE BAND at once and not per card,
 * because "does this differ" is not a question a single card can
 * answer about itself.
 */
export function distinguishingFacts(
  rows: ReadonlyArray<ReadonlyArray<Fact>>,
  max = 3,
): ShownFact[][] {
  if (rows.length === 0) return []

  /* Every label in the order it is first seen, so the dealer's own
     column order survives. */
  const order: string[] = []
  const byLabel = new Map<string, string[]>()
  for (const facts of rows) {
    for (const f of facts) {
      if (!byLabel.has(f.label)) {
        byLabel.set(f.label, [])
        order.push(f.label)
      }
    }
  }
  /* Fill per candidate, with '' for a fact a candidate does not
     carry — an absence IS a difference and must count as one. */
  for (const label of order) {
    const col = byLabel.get(label)!
    for (const facts of rows) {
      col.push(norm(facts.find((f) => f.label === label)?.value ?? ''))
    }
  }

  const varies = (label: string): boolean => new Set(byLabel.get(label)!).size > 1

  /* ONE CANDIDATE CANNOT BE TOLD APART FROM ANYTHING. Keep the
     dealer's first `max` and print them whole. */
  const informative = rows.length === 1 ? order : order.filter(varies)
  const chosen = (informative.length > 0 ? informative : order).slice(0, max)

  return rows.map((facts, i) =>
    chosen.map((label) => {
      const full = byLabel.get(label)![i]
      const value = rows.length === 1 ? full : reduceToDifference(byLabel.get(label)!, i)
      return { label, value: value === '' ? full : value, full, reduced: value !== '' && value !== full }
    }),
  )
}

/**
 * The segments of `values[i]` that are not shared by every value.
 *
 * Returns `''` when the reduction is not worth making — there is
 * only one segment, or every segment differs anyway, or the
 * reduction would leave nothing. The caller then prints the whole
 * value, which is the honest fallback.
 */
export function reduceToDifference(values: readonly string[], i: number): string {
  const mine = values[i] ?? ''
  const parts = mine.split(SEGMENT).map(norm).filter((p) => p !== '')
  if (parts.length < 2) return ''

  /* A segment is shared when every other candidate's value contains
     it as a segment of its own. Substring matching would call
     `Single` shared with `Single Prop`, which is a different fact. */
  const others = values.filter((_, n) => n !== i).map((v) => new Set(v.split(SEGMENT).map(norm)))
  if (others.length === 0) return ''

  const kept = parts.filter((p) => !others.every((set) => set.has(p)))
  if (kept.length === 0 || kept.length === parts.length) return ''
  return kept.join(' · ')
}
