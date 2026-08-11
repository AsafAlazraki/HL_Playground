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
  },
})
