/* THE SYSTEM GALLERY — every surface of `src/styles/system.css`,
   both registers, both themes.

   It is its own Vite entry (`/system.html`) and it imports
   `system.css` and NOTHING from the old stack — not tokens.css,
   not base.css, not bridge.css, not ds.css. That is deliberate:
   the old `/design.html` imported `ds.css` alone while the running
   app resolved four stylesheets, so the page every new screen was
   supposed to be checked against and the app itself resolved
   different token stacks. A reference that does not resolve what
   the product resolves is not a reference.

   IT MEASURES ITSELF. Every size, ratio and contrast figure on this
   page is read back from the browser with getComputedStyle, never
   typed in. The last redesign shipped a "display tier" whose own
   spec said 7x, and it reached one screen of ten while the home
   screen went backwards to 2.44x — because the number lived in a
   document and nobody read it off the glass. */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* THE opsz CUT, NOT THE DEFAULT ONE. `@fontsource-variable/inter`
   resolves to index.css, which ships the wght-only files, so
   `font-optical-sizing` against it is silently inert. opsz.css
   carries the same family with the axis in it. */
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '../../styles/system.css'
import './gallery.css'
import { SystemGallery } from './SystemGallery'

createRoot(document.getElementById('system-root')!).render(
  <StrictMode>
    <SystemGallery />
  </StrictMode>,
)
