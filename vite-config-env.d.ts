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
