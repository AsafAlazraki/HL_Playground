import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* THE opsz CUT, NOT THE DEFAULT ONE. `@fontsource-variable/inter`
   resolves to index.css, which ships the wght-only files — so
   `font-optical-sizing` and any 'opsz' setting against it are
   silently inert. That is the defect this repo already had once:
   21 `'wdth' 118` declarations across 10 files were no-ops because
   the Archivo package's wdth.css was never imported. */
import '@fontsource-variable/inter/opsz.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@xyflow/react/dist/style.css'
import './styles/tokens.css'
import './styles/base.css'
/* THE BRIDGE — last, so it wins. It redefines ~50 token names in
   terms of src/styles/ds.css and re-skins every stylesheet in the
   app without touching a selector, a component or a line of TSX.
   The app is 97.6% tokenised, which is what makes that possible.
   Delete this one line to put the old design back. */
import './styles/bridge.css'
/* THE FLUID LAYER — last, so it wins. It ramps the tuned design
   upward instead of leaving it centred in a void above 1180px.
   Delete this one line to put the fixed-width design back. */
import './styles/response.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
