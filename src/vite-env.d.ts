/// <reference types="vite/client" />

/* The single ambient-types entry point for the app project.
   `vite/client` already declares `*.css` (and every other asset module),
   which is what lets each feature's plain `import './feature.css'`
   side-effect import type-check under `noUncheckedSideEffectImports`.
   Modules must NOT re-declare it locally — one declaration, here. */
