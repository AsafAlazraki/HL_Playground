import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { realpathSync } from 'node:fs'

// PROBE BUILD - temporary, reverted before commit.
function pkgOf(id: string): string | null {
  const norm = id.replace(/\/g, '/')
  const i = norm.lastIndexOf('/node_modules/')
  if (i === -1) return null
  const rest = norm.slice(i + '/node_modules/'.length).split('/')
  const name = rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0]
  return 'pkg--' + name.replace(/[@/]/g, '-')
}

export default defineConfig({
  plugins: [react()],
  cacheDir: fileURLToPath(new URL('./.vite-cache', import.meta.url)),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: pkgOf, minSize: 0 }],
        },
      },
    },
  },
  server: {
    port: 5090,
    fs: {
      allow: [
        '..',
        realpathSync(fileURLToPath(new URL('./node_modules', import.meta.url))),
      ],
    },
  },
})
