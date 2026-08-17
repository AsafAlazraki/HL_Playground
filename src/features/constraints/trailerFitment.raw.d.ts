/* ============================================================
   ONE module declaration, for ONE specifier, for one guard.

   `trailerFitment.test.ts` reads the selector's own SOURCE TEXT to
   prove it never names `Boat Size`, `Trailer Length` or `Between
   Guards` — FITMENT_RULES.md F10's "THERE IS NO TRAILER LENGTH RULE.
   DO NOT WRITE ONE." A behavioural test can only prove the columns
   currently loaded do not move the answer; reading the source proves
   nobody has written the words at all, which is the thing the
   specification actually forbids.

   Vite serves `?raw`, but this project deliberately has no
   @types/node and does not reference vite/client (see
   vite-config-env.d.ts), so TypeScript needs telling. Declared for
   the ONE specifier rather than as a `*?raw` wildcard, so this cannot
   quietly become a way to import anything as a string.
   ============================================================ */

declare module '@/features/constraints/trailerFitment.ts?raw' {
  const source: string
  export default source
}
