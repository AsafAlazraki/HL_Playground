/* ============================================================
   SIX module declarations, for six specifiers, for one guard.

   `applied.test.ts` reads the SOURCE TEXT of every surface that
   curates, to prove each one goes through this feature rather than
   growing its own count chip and quietly dropping rows. A
   behavioural test cannot see that: a surface with its own local
   narrowing renders perfectly well and is exactly the failure
   `hl-journeys.md` §4 records in the app we are beating.

   Vite serves `?raw`, but this project deliberately has no
   @types/node and does not reference vite/client (see
   vite-config-env.d.ts), so TypeScript needs telling. Declared one
   specifier at a time rather than as a `*?raw` wildcard — the
   precedent `trailerFitment.raw.d.ts` set next door, and for its
   reason: a wildcard is a quiet way to import anything as a string.
   ADDING A SURFACE MEANS ADDING A LINE HERE, which is the friction
   that makes the list honest.
   ============================================================ */

declare module '@/features/curation/curation.ts?raw' {
  const source: string
  export default source
}

declare module '@/features/curation/CurationNote.tsx?raw' {
  const source: string
  export default source
}

declare module '@/features/views/BlockCard.tsx?raw' {
  const source: string
  export default source
}

declare module '@/features/quote/QuoteEditor.tsx?raw' {
  const source: string
  export default source
}

declare module '@/features/quote/QuoteBuild.tsx?raw' {
  const source: string
  export default source
}

declare module '@/features/constraints/TrailerFitmentPanel.tsx?raw' {
  const source: string
  export default source
}
