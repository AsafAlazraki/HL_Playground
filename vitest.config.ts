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
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    /* beside their subjects, so a file and its test move together */
    include: ['src/**/*.test.ts'],
    environment: 'node',

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
  },
})
