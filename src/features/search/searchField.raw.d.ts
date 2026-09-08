/* ============================================================
   ONE module declaration, for one specifier, for one guard.

   `encoding.test.ts` reads the SOURCE TEXT of `SearchField.tsx` to
   prove it holds no raw U+0000 and no CR. That claim cannot be made
   behaviourally: the file compiled, rendered and passed every test
   in the suite for as long as it carried three raw NUL bytes, because a
   NUL inside a template literal is a perfectly good separator. What
   it broke was everything that reads the file AS TEXT — see the
   comment at the top of the test.

   `?raw`, not `node:fs`: this project deliberately carries no
   @types/node and does not reference vite/client (see
   vite-config-env.d.ts), so TypeScript needs telling. Declared as
   one specifier rather than a `*?raw` wildcard — the precedent
   `curation.raw.d.ts` and `trailerFitment.raw.d.ts` set next door,
   and for their reason: a wildcard is a quiet way to import
   anything as a string.
   ============================================================ */

declare module '@/features/search/SearchField.tsx?raw' {
  const source: string
  export default source
}
