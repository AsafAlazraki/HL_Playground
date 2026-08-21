/* ============================================================
   HOW MUCH THE PREPARED SET PUTS ON THE SHEET — two numbers, and
   the reason they are written here instead of counted.

   THE DOOR HAS TO SAY WHAT ARRIVES. Home's first screen offers a
   button that replaces the whole sheet, and a button like that
   which does not say how much lands is asking a person to accept
   something they cannot see. So the door's foot reads
   "53 tables · 15,691 rows".

   IT USED TO BE COUNTED, and the reasoning for that was right:
   a hand-typed figure goes stale the first time the seed changes
   and nobody remembers, so `DemoSet.holds` BUILT the set and
   counted it. What that cost was invisible and enormous — the one
   screen it runs on is the screen a person with an EMPTY sheet
   sees, so counting the price file downloaded the price file, for
   the exact visitor who never asked for it. It is the same 139 kB
   gzip the whole split exists to stop shipping (see seedChunk.ts).

   SO THE FIGURES ARE PINNED AND THE STALENESS IS GUARDED INSTEAD.
   `northsideHolds.test.ts` builds the set and asserts these two
   numbers are what it counts. The original objection was that a
   hand-typed number goes stale SILENTLY; this one cannot, because
   the next regeneration of `src/demos/northside.ts` turns the
   guard red and prints the figures to replace these with. Nobody
   has to remember anything — which was the whole requirement.

   IF THAT TEST IS FAILING: it is not the test that is wrong. The
   seed changed. Put the counted numbers here, and check that the
   sentence on Home still reads the way it should.
   ============================================================ */

/** What one `loadNorthsideProject()` puts on the sheet. Tables is
 *  every entity the set mints — the joins included, because a join
 *  IS a table on this sheet and lands with the rest. */
export const NORTHSIDE_HOLDS: { tables: number; rows: number } = {
  tables: 53,
  rows: 15691,
}
