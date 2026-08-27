/* Minimal ambient types so vite.config.ts type-checks without @types/node
   (the project intentionally has no @types/node dependency). */

declare class URL {
  constructor(input: string, base?: string | URL)
  href: string
  pathname: string
  toString(): string
}

interface ImportMeta {
  url: string
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string
}

/* `vite.config.ts` grew a `realpathSync` import when the Vite cache
   was moved out of the junctioned `node_modules` and made
   per-checkout, and this shim was not grown with it — so
   `npm run build` failed at `tsc -b` with

     vite.config.ts(4,30): error TS2591: Cannot find name 'node:fs'.

   before it ever reached `vite build`. One declaration, in the file
   the comment at the top of this one says is the place for it. */
declare module 'node:fs' {
  export function realpathSync(path: string): string
}
