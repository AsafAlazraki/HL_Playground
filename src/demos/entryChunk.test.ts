/* ============================================================
   THE SPLIT CANNOT BE UNDONE BY ACCIDENT.

   `src/demos/northside.ts` is a megabyte of Northside Marine's real
   price file — 139 kB gzip today, ~246 kB at full scale. It used to
   be imported statically by `src/demos/index.ts`, which put it in
   the entry chunk and charged it to every first-time visitor,
   INCLUDING the one who opens a blank sheet and never looks at it.
   The measurement and the decision are docs/plan/SEED_AT_FULL_SCALE.md
   §4; the boundary is `seedChunk.ts`.

   THE FAILURE THIS PREVENTS IS SILENT AND ONE LINE LONG. Nothing
   about the app breaks if somebody writes

       import { buildNorthsideProject } from './northside'

   in a shipped file. Every test still passes, every screen still
   works, tsc is happy — and the entry chunk quietly grows by a
   quarter again, which nobody notices until the next time somebody
   measures a bundle. A re-export is the same act wearing a hat:
   `export { … } from './northside'` is a static import.

   SO THE GRAPH IS THE THING UNDER TEST. Type-only imports are
   allowed because they are erased; `import()` is allowed in exactly
   one file, because a boundary a reader can check is worth more
   than the bytes two of them would cost (which is nothing — it is
   the same chunk).

   Tests are exempt: they are not shipped, and several of them have
   to build the set to check it.
   ============================================================ */
import { describe, expect, it } from 'vitest'

/** EVERY SOURCE FILE, AS TEXT, THROUGH VITE'S OWN RESOLVER rather
 *  than through `node:fs`. Two reasons and both matter: `@types/node`
 *  is not a dependency of this project, so a walker would not
 *  type-check; and this reads the same graph the bundler reads, which
 *  is the thing the assertion is actually about. */
const SOURCES = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** the one file allowed to name the seed at runtime */
const BOUNDARY = 'demos/seedChunk.ts'

/** '/src/app/Shell.tsx' → 'app/Shell.tsx'. Rooted rather than
 *  relative, because a relative glob normalises the sibling
 *  directory away and 'demos/seedChunk.ts' comes back as
 *  './seedChunk.ts'. */
const rel = (k: string): string => k.replace(/^\/src\//, '')

/** what actually ships. Tests are exempt — they are not in the
 *  bundle, and several of them have to build the set to check it. */
const shipped = (): [string, string][] =>
  Object.entries(SOURCES)
    .filter(([k]) => !/\.test\.tsx?$/.test(k))
    .map(([k, v]) => [rel(k), v])

/** COMMENTS ARE NOT CODE, and every file in this lane has a long
 *  one at the top explaining the very import it must not make. The
 *  prose says `import` and it says `./northside`, and a scanner that
 *  cannot tell an explanation from a statement reports the
 *  explanation. */
const strip = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')

/** `import … from '…northside'` and `export … from '…northside'`,
 *  with whatever stands between the keyword and `from` captured so a
 *  type-only one can be told apart. The clause admits no quote and no
 *  semicolon, so a match cannot run across two statements. Also
 *  catches the side-effect form, which has no `from` at all. */
const STATIC = /(?:^|[\s;])(import|export)\s+([^'";]*?)from\s*['"]([^'"]*northside)['"]/g
const SIDE_EFFECT = /(?:^|[\s;])import\s*['"]([^'"]*northside)['"]/g
const DYNAMIC = /import\s*\(\s*['"]([^'"]*northside)['"]\s*\)/g

describe('the seed is not in the entry chunk', () => {
  const files = shipped()

  it('has files to check at all', () => {
    /* a scan that silently found nothing would pass every assertion
       below and guard nothing */
    expect(files.length).toBeGreaterThan(50)
    expect(files.map(([k]) => k)).toContain(BOUNDARY)
  })

  it('is imported statically by no shipped file, except for its types', () => {
    const offenders: string[] = []
    for (const [name, raw] of files) {
      if (name === 'demos/northside.ts') continue
      const src = strip(raw)
      for (const m of src.matchAll(STATIC)) {
        const clause = m[2]?.trim() ?? ''
        /* `import type { X }` and `export type { X }` are erased by
           the compiler and cost nothing at runtime */
        if (clause.startsWith('type')) continue
        offenders.push(`${name} — ${m[0].trim().slice(0, 72)}`)
      }
      for (const m of src.matchAll(SIDE_EFFECT)) {
        offenders.push(`${name} — ${m[0].trim()}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('is reached through exactly one dynamic import, in seedChunk.ts', () => {
    const naming = files
      .filter(([, raw]) => [...strip(raw).matchAll(DYNAMIC)].length > 0)
      .map(([k]) => k)
    expect(naming).toEqual([BOUNDARY])
  })
})
