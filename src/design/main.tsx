/* The design-system preview is its own Vite entry (`/design.html`).
   It shares no CSS with the running app: `main.tsx` still imports the
   old tokens and base sheet, this one imports neither. Nothing in
   src/app or src/features is touched until the direction is signed
   off. */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* THE opsz CUT, NOT THE DEFAULT ONE. `@fontsource-variable/inter`
   resolves to index.css, which ships the wght-only files — so
   `font-optical-sizing` and any 'opsz' setting against it are
   silently inert. That is precisely the defect APPLE_PASS.md found
   in the outgoing build, where 21 `'wdth' 118` declarations across
   10 files were no-ops because the package's wdth.css was never
   imported. opsz.css carries the same family with the axis in it. */
import '@fontsource-variable/inter/opsz.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '../styles/ds.css'
import './preview.css'
import './modules.css'
import './ux.css'
import { DesignPreview } from './DesignPreview'

createRoot(document.getElementById('design-root')!).render(
  <StrictMode>
    <DesignPreview />
  </StrictMode>,
)
