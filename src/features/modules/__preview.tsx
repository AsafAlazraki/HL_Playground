/* TEMPORARY — a harness used only to look at this feature with the
   real seeded data while src/app is owned by another agent. Delete
   this file and preview.html; nothing imports it. */
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import { useProjectStore } from '@/store/useProjectStore'
import { DEMOS } from '@/demos'
import { Dashboard, ModuleIndex, NewModuleDialog } from './index'

function Harness() {
  const loaded = useProjectStore((s) => s.loaded)
  const modules = useProjectStore((s) => s.modules)
  const entities = useProjectStore((s) => s.entities)
  const [openId, setOpenId] = useState<string | null>(null)
  const [isNew, setNew] = useState(false)

  useEffect(() => {
    void useProjectStore.getState().init()
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (Object.keys(useProjectStore.getState().entities).length === 0) {
      const real = DEMOS.find((d) => d.id !== 'blank')
      real?.load()
    }
  }, [loaded])

  const open = openId ? modules[openId] : undefined

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, borderBottom: '1px solid #ccc', display: 'flex', gap: 8 }}>
        <button onClick={() => setOpenId(null)}>dashboard</button>
        <span>{Object.keys(entities).length} tables · {Object.keys(modules).length} modules</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {open ? (
          <ModuleIndex module={open} onOpen={(t, r) => console.log('open', t, r)} />
        ) : (
          <Dashboard onOpen={setOpenId} onNew={() => setNew(true)} />
        )}
      </div>
      {isNew ? (
        <NewModuleDialog
          onClose={() => setNew(false)}
          onCreated={(id) => setOpenId(id)}
        />
      ) : null}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
)
