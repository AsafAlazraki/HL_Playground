import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* THE opsz CUT, NOT THE DEFAULT ONE. `@fontsource-variable/inter`
   resolves to index.css, which ships the wght-only files — so
   `font-optical-sizing` and any 'opsz' setting against it are
   silently inert. That is the defect this repo already had once:
   21 `'wdth' 118` declarations across 10 files were no-ops because
   the Archivo package's wdth.css was never imported. */
import '@fontsource-variable/inter/opsz.css'
/* THE DISPLAY FACE, AND THE wdth CUT SPECIFICALLY.

   Archivo has been a dependency all along and was imported by
   nothing, which is why the sixteen `font-variation-settings:
   'wdth'` declarations still in the app CSS were dead — they were
   resolving against Inter, which has no width axis.

   It comes back as a DISPLAY face only, at 20px and up. The last
   display face was retired because it was being set at 9px, where
   a serif is blur; that failure cannot recur here because the two
   steps that take Archivo (--t-hero, --t-display-lg) have floors
   of 26px and 34px. Everything a person READS is still Inter and
   every figure is still Plex Mono. See DESIGN_PRINCIPLES.md §2. */
import '@fontsource-variable/archivo/wdth.css'
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
import './features/auth/auth.css'
import './features/tenancy/tenancy.css'
import './features/banner/banner.css'
import './features/page/page.css'
import './features/picker/picker.css'
import './features/activity/activity.css'
import './features/pipeline/pipeline.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
