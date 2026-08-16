/* The design-system preview is its own Vite entry (`/design.html`).
   It shares no CSS with the running app: `main.tsx` still imports the
   old tokens and base sheet, this one imports neither. Nothing in
   src/app or src/features is touched until the direction is signed
   off. */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '../styles/ds.css'
import './preview.css'
import './modules.css'
import { DesignPreview } from './DesignPreview'

createRoot(document.getElementById('design-root')!).render(
  <StrictMode>
    <DesignPreview />
  </StrictMode>,
)
