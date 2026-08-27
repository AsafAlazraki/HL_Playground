/* TEMPORARY — a standalone mount for THE RIG, so it can be looked at
   while the shell's own door to Fitment is mid-rewrite. Delete this
   file and rig-preview.html; neither is imported by the app. */
import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { buildNorthsideProject } from '@/demos/northside'
import { useProjectStore } from '@/store/useProjectStore'
import { StillnessProvider } from '@/features/views/stillness'
import { registerConstraints, buildConcepts, representativeFieldId } from '@/features/constraints'
import { readFanOut, Rig } from '@/features/fitment'
import type { ConstraintDef } from '@/types/model'
import '@fontsource-variable/inter/opsz.css'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/bridge.css'
import '@/features/fitment/fitment.css'
import '@/features/curation/curation.css'

function Preview() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const seed = buildNorthsideProject()
    useProjectStore.getState().replaceProject({
      name: 'Northside Marine',
      entities: seed.entities,
      groups: seed.groups ?? [],
      rules: seed.rules ?? [],
      rowsByEntity: seed.rowsByEntity,
    })
    const entities = Object.fromEntries(seed.entities.map((e) => [e.id, e]))
    const concepts = buildConcepts(entities)
    const series = concepts.find((c) => c.key === 'boat::series')
    const control = concepts.find((c) => c.key === 'motor::control')
    if (series && control) {
      const rule: ConstraintDef = {
        id: 'preview:remote-helm',
        kind: 'implies',
        if: {
          combinator: 'AND',
          clauses: [
            { id: 'a', left: { fieldId: representativeFieldId(series) }, op: 'eq', right: { kind: 'literal', value: 'Sport' } },
          ],
        },
        then: {
          combinator: 'AND',
          clauses: [
            {
              id: 'b',
              left: { fieldId: representativeFieldId(control) },
              op: 'eq',
              right: { kind: 'literal', value: 'Remote mech' },
            },
          ],
        },
        because: 'the hull is set up for a remote helm and a tiller motor is steered from the engine',
        enabled: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }
      registerConstraints([rule], '__unnamed')
    }
    setReady(true)
  }, [])

  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  const reading = useMemo(
    () => readFanOut({ entities, rowsByEntity }),
    [entities, rowsByEntity],
  )
  if (!ready) return <p>loading…</p>
  return (
    <div className="fo-root">
      <div className="fo-page">
        <Rig reading={reading} />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <StillnessProvider>
      <div className="ds-root">
        <Preview />
      </div>
    </StillnessProvider>
  </StrictMode>,
)
