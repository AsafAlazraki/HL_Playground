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
/* THE BRIDGE — after the base tokens, so it wins over them. It
   redefines ~50 token names in terms of src/styles/ds.css and
   re-skins every stylesheet in the app without touching a
   selector, a component or a line of TSX.
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
/* THE FLUID LAYER — last, so it wins. It ramps the tuned design
   upward instead of leaving it centred in a void above 1180px.
   Delete this one line to put the fixed-width design back.

   LAST MEANS AFTER THE FEATURE SHEETS ABOVE, not merely after the
   bridge. This file carries no selector but `:root` — it publishes
   `--measure`, `--gutter`, `--section-gap`, the dock and actionbar
   clearances, and every type step as a clamp() — and several of
   those names are also declared on `:root` by tokens.css and
   re-declared by bridge.css. Equal specificity, so source order
   decides: parsed last, the ramp wins; parsed anywhere earlier the
   fixed figure wins and the app is silently back to 1180px with no
   error to show for it. Any stylesheet added later goes ABOVE this
   line. */
import './styles/response.css'
/* ============================================================
   THE REBUILD'S SYSTEM — last, and that is deliberate.

   The note above says any stylesheet added later goes ABOVE the
   response layer. This one is the exception, and the exception is
   the point: `system.css` REPLACES that whole stack, and while the
   rebuild runs alongside the old screens it has to win the names
   the two share.

   WHAT IT ACTUALLY CHANGES FOR AN OLD SCREEN. The palette is
   carried over from `ds.css` verbatim — the same measured ink,
   the same nine kind hues — so colour does not move. What moves is
   the middle of the type ramp: title 20 -> 24, heading 15 -> 16,
   and display becomes a clamp. That is the 56px hole being filled,
   and it lands on every screen at once rather than only on the
   rebuilt ones.

   That is a real change to shipped screens, so it is MEASURED
   rather than assumed: `npm run check:shots` is the guard, its
   baselines are committed, and the diff is looked at before any of
   them are re-banked.

   This line goes when the old stack does, and then `system.css`
   moves to the top where it belongs.
   ============================================================ */
import './styles/system.css'

/* ============================================================
   AND THEN THE WORLD IT LIVES IN.

   `system.css` declares the token NAMES and what each one is for;
   `world.css` decides what they are. It is last on purpose — it
   redefines every visual token above it, so the whole application
   changes at once rather than one stylesheet at a time.
   ============================================================ */
import './styles/world.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
