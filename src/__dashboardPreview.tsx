/* TEMPORARY — a harness for looking at the Dashboard in a real
   browser, over the real 15,691-row price file. The same
   arrangement `src/__tenancyPreview.tsx` makes, for the same
   reason: this feature is not mounted in the shell yet, and
   "test what you build" is a rule.

   Delete this file and `dashboard-preview.html` once the shell
   draws <Dashboard /> on the home stage. */
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
import { Dashboard } from './features/dashboard'
import { StillnessProvider } from './features/views/stillness'
import { UndoKeys } from './app/UndoKeys'
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

const shout = (what: string) => (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.log('NAVIGATE', what, ...args)
}

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
        <Dashboard
          user={USER}
          onOpenTable={shout('table')}
          onOpenModule={shout('module')}
          onOpenModules={shout('modules')}
          onOpenQuote={shout('quote')}
          onOpenQuotes={shout('quotes')}
          onOpenCustomers={shout('customers')}
          onOpenRules={shout('rules')}
          onOpenDataModel={shout('data-model')}
          onNewQuote={shout('new-quote')}
          onFind={shout('find')}
        />
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
