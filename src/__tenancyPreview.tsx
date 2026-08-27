/* TEMPORARY — a harness for looking at ConfigurationsPanel in a real
   browser. Deleted after the pass. */
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
import { ConfigurationsPanel } from './features/tenancy'
import { useProjectStore } from './store/useProjectStore'
import { loadNorthsideProject } from './demos/northside'

const USER = {
  id: 'u-asafa1',
  name: 'Asaf Alazraki',
  email: 'asafa1@northsidemarine.com.au',
  title: 'Sales',
  orgSlug: 'northside-marine',
  orgName: 'Northside Marine',
}

function Harness() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void useProjectStore.getState().init().then(() => {
      if (Object.keys(useProjectStore.getState().entities).length === 0) {
        loadNorthsideProject()
        useProjectStore.getState().setOrganisation('Northside Marine', 'marine')
      }
      setReady(true)
    })
  }, [])
  if (!ready) return <p style={{ padding: 24 }}>loading the seed…</p>
  return (
    <div style={{ height: '100dvh' }}>
      <ConfigurationsPanel user={USER} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
)
