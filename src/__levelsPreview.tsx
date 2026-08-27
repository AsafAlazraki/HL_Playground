/* TEMPORARY — a harness for looking at the level editor in a real
   browser, over the real 15,691-row price file. The same
   arrangement `src/__dashboardPreview.tsx` and
   `src/__tenancyPreview.tsx` make, for the same reason: this
   feature is not mounted in the shell yet, and "test what you
   build" is a rule.

   Delete this file and `levels-preview.html` once the shell draws
   <LevelEditor /> — see `src/features/levels/index.ts` for where. */
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/bridge.css'
import { LevelEditor } from './features/levels'
import { StillnessProvider } from './features/views/stillness'
import { UndoKeys } from './app/UndoKeys'
import { useProjectStore } from './store/useProjectStore'
import { loadNorthsideProject } from './demos/northside'

function Harness() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void useProjectStore
      .getState()
      .init()
      .then(() => {
        if (Object.keys(useProjectStore.getState().entities).length === 0) {
          loadNorthsideProject()
          useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
        }
        setReady(true)
      })
  }, [])
  if (!ready) return <p style={{ padding: 24 }}>loading the seed…</p>
  return (
    <StillnessProvider>
      <div className="ds-root" style={{ height: '100dvh' }}>
        <LevelEditor />
      </div>
      <UndoKeys />
    </StillnessProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
)
