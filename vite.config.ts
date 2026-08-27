import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
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
