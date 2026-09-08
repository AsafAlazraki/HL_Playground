/* ============================================================
   Test runner config — deliberately the smallest thing that works.

   Vitest shares Vite's transform, so the ONLY thing it needs told is
   the '@' alias (vite.config.ts is not loaded when this file exists).
   No React plugin: every test here is pure logic, and nothing under
   test renders. Adding jsx machinery would buy a slower suite and a
   second way for the build to differ from the app's.

   `environment: 'node'` on purpose. src/lib/imageSources.ts reads
   `window.location`, and its test stubs exactly that and nothing
   else — a real DOM would hide which globals the module actually
   depends on, and a browser/e2e runner is a separate decision.
   ============================================================ */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) }

/* TWO PROJECTS, BECAUSE THE NOTE ABOVE IS STILL RIGHT AND WAS ALSO
   THE REASON NOTHING WAS TESTED.

   "No React plugin: every test here is pure logic, and nothing under
   test renders" was a true description of the suite and a correct
   argument for keeping this file small. It was not an argument for
   never rendering anything — and the consequence, measured, was 158
   components, 67,459 lines of TSX and 68,713 lines of CSS with no
   automated guard of any kind. A design system cannot be rebuilt on
   that.

   So the logic project keeps every constraint it had, unchanged and
   for the reasons given below — 'node', no jsx machinery, the same
   ceilings. Components get a SECOND project, and the split is by file
   extension so neither can quietly become the other: `.test.ts` is
   logic and runs in node; `.test.tsx` renders and runs in happy-dom.
   A logic test cannot reach for a DOM by accident, which is what the
   original note was protecting. */

const shared = {
  /* beside their subjects, so a file and its test move together.
     include + environment are set per project below. */

    /* THE SEED IS 23,000 LINES AND EVERY SUITE THAT TOUCHES THE REAL
       DATA PAYS FOR IT AT IMPORT, BEFORE A SINGLE ASSERTION RUNS.
       That cost is the point: these suites measure rules against the
       WHOLE price file rather than a fixture, which is the only way a
       silent rot in a rule gets caught. But it grew with the data —
       the seed went 7,201 lines -> 16,446 -> 23,392 as Northside's
       real catalogue landed — and the default ceilings were written
       when it was the first of those.

       The symptom was the worst kind: three full runs producing three
       DIFFERENT failure sets, all wall-clock, none reproducible in
       isolation. A suite that fails on machine load rather than on
       truth teaches people to re-run until it passes, and then it is
       not a guard at all.

       So the ceilings are set once, here, rather than per file. They
       are headroom, not a mask: the slowest suite imports in about 7s
       and asserts in about 2s. If a test ever approaches these, the
       right answer is to find out why, not to raise them again. */
    testTimeout: 60_000,
    hookTimeout: 60_000,

    /* AND A CEILING ON WORKERS, FOR THE SAME REASON.
       This machine reports 22 logical cores, so vitest spawns about
       twenty workers and EACH ONE IMPORTS THE 3.8 MB SEED for itself.
       Twenty simultaneous parses of the same file is where the
       intermittent failures came from: measured, the suite failed
       twice in seven runs while other work was on the machine, and
       passed five times when it was quiet — and it passed twice out
       of twice with `--no-file-parallelism`, which is the same
       observation from the other end.

       A test that fails on machine load rather than on truth teaches
       people to re-run until it passes, and then it is not a guard.
       Eight workers keeps the suite parallel and keeps peak import
       contention bounded. This is a cap on CONCURRENCY, not on what
       any test measures — nothing is skipped and no ceiling is
       loosened to accommodate it. */
  maxWorkers: 8,
}

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          ...shared,
          name: 'logic',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          ...shared,
          name: 'ui',
          include: ['src/**/*.test.tsx'],
          /* happy-dom rather than jsdom: measurably faster to boot, and
             every assertion here is about structure, role and text —
             not layout. Anything that needs real layout belongs in
             tools/check-contrast.mjs, which drives a real browser. */
          environment: 'happy-dom',
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
})
