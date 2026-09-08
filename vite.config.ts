import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
/* URL IS IMPORTED, NOT TAKEN FROM THE GLOBAL, because `tsc -b` —
   which `npm run build` runs first — failed on all three
   `fileURLToPath(new URL(...))` calls below with TS2769: "Argument of
   type 'URL' is not assignable to parameter of type 'string | URL'".
   tsconfig.node.json declares lib ES2023 with no DOM, so the ambient
   `URL` under typescript 7.0.2 is not the one `node:url` expects.
   Importing the node class makes the three calls agree with the
   signature. Measured 2026-09-08: 3 errors before, 0 after. */
import { URL, fileURLToPath } from 'node:url'
import { realpathSync } from 'node:fs'

export default defineConfig({
  plugins: [react()],
  /* THE CACHE IS PER-CHECKOUT, NOT PER-node_modules.

     This tree is a git worktree whose `node_modules` is a junction
     back to the primary checkout, so Vite's default cacheDir —
     `node_modules/.vite` — is the SAME directory for both dev
     servers. Two servers optimising into one cache produced a
     silent blank page: the root mounted, threw nothing, and
     rendered zero children, because the pre-bundled deps under it
     had been rewritten by the other server mid-flight.

     Keeping the cache beside the checkout makes the two
     independent. Harmless in a normal clone. */
  cacheDir: fileURLToPath(new URL('./.vite-cache', import.meta.url)),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    /* 1280, BECAUSE THE ENTRY CHUNK MEASURED 1,258.97 kB ON 2026-09-08.
       ~21 kB of headroom, so the next person who adds a screen's worth
       of code to the entry chunk is told, instead of the number drifting
       for a year the way it did to reach 2,081.30 kB.

       READ THE TABLE ROW, NOT THE FOOTER. The generated demo seed —
       `northside-*.js`, 3,291.80 kB — is over this limit too and always
       will be, and Vite's reporter prints one generic "Some chunks are
       larger than N kB" line that names no chunk. So the footer is
       always on and means nothing on its own; the signal is the
       `index-*.js` row of the size table going above 1,280. The seed is
       not on the first-load path — `src/demos/seedChunk.ts:50` imports
       it dynamically and it is fetched only when a demo is loaded. */
    chunkSizeWarningLimit: 1280,
    rolldownOptions: {
      output: {
        /* MEASURED 2026-09-08, `vite build`, vite 8.2.0 (rolldown),
           before and after taken on the same tree minutes apart by
           reverting this block. Other work was landing in src at the
           time, so the entry chunk read between 1,258.97 and 1,259.35
           kB across runs — treat every figure here as ±1 kB.

           BEFORE: one entry chunk, `index-*.js` 2,081.30 kB /
           610.02 kB gzip, plus `index-*.css` 786.81 kB.

           AFTER: entry 1,258.97 kB / 367.68 kB gzip, and six sibling
           chunks — icons 232.61, react-vendor 189.57, flow 178.00,
           motion 124.93, vendor 95.97, rolldown-runtime 0.58.

           THE SPLIT IS FREE. 2,080.63 kB / 609.97 kB gzip across all
           seven chunks against 2,081.30 kB / 610.02 kB in the single
           chunk: -0.67 kB raw, -0.05 kB gzip. Cross-chunk boundaries
           cost nothing measurable here, so there was no reason not to.
           It also pulled @xyflow/react's stylesheets out of the one
           big CSS file: 786.81 kB became 762.87 + flow 15.41 +
           vendor 8.52 = 786.80 kB. The price is 0.62 kB of extra
           `index.html` — six more modulepreload tags.

           WHAT THIS DOES NOT DO: it does not shrink the first load.
           Every chunk above is a STATIC import of the entry, so the
           sign-in screen still fetches all 2,080.63 kB. Verified by
           grep on 2026-09-08 — `src/demos/seedChunk.ts:50` is the only
           `import()` in shipped code; the three other hits in src are
           comment prose. What splitting buys is cache separation
           (react, xyflow, motion and the icon set change on an upgrade,
           app code changes daily, and today one byte of app code
           re-downloads 610 kB gzip) and parallel fetch of seven
           requests instead of one.

           THE ACTUAL FIX IS ROUTE-LEVEL LAZY LOADING, and it is left
           for a person because it touches product code. `src/app/
           winKit.tsx:14-33` statically imports every stage and
           `renderStage` at winKit.tsx:299 is the single switch that
           picks one. React.lazy on those imports plus a Suspense
           boundary around the switch is the whole change: FlowStage
           alone would take the 178.00 kB flow chunk and its 15.41 kB
           of CSS off the sign-in path. Grouped here so those chunks
           already exist when that lands.

           GROUP NOTES. react and react-dom are one group on purpose —
           react-dom reaches into react's internals and splitting them
           buys a request without buying a cache boundary, since they
           are upgraded together. `[\\/]` rather than `/` because
           module ids arrive with Windows separators. The @xyflow test
           takes the whole scope, not just react: @xyflow/system and
           the d3-* packages under it are the bulk of that 178.00 kB. */
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'flow',
              test: /node_modules[\\/](@xyflow[\\/][^\\/]+|classcat|d3-[a-z]+)[\\/]/,
              priority: 20,
            },
            {
              name: 'motion',
              test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/,
              priority: 20,
            },
            {
              name: 'icons',
              test: /node_modules[\\/]@phosphor-icons[\\/]react[\\/]/,
              priority: 20,
            },
            /* Catch-all, lowest priority, so it takes what the named
               groups left: dexie 95.16 kB is nearly all of it. Named
               groups win because a higher priority claims a module
               first. */
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  server: {
    port: 5090,
    /* `node_modules` here is a junction back to the primary
       checkout, so @fontsource resolves to a path OUTSIDE this
       root and Vite refuses to serve it — every woff2 404s and
       the app silently falls back to system faces. Allowing the
       real directory fixes the fonts without widening anything
       else. Harmless in a normal clone, where the path is inside
       the root already. */
    /* realpathSync, because Vite resolves the junction to its
       TARGET before checking the allow list — allowing the link
       itself let every @fontsource woff2 404, and the whole app
       silently rendered in Times New Roman. */
    fs: {
      allow: [
        '..',
        realpathSync(fileURLToPath(new URL('./node_modules', import.meta.url))),
      ],
    },
  },
})
