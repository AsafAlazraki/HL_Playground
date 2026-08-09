import { useEffect } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { seedWorkbookConstraints } from '@/features/constraints'
import { Shell } from '@/app/Shell'

export default function App() {
  const loaded = useProjectStore((s) => s.loaded)
  const init = useProjectStore((s) => s.init)
  const entities = useProjectStore((s) => s.entities)

  useEffect(() => {
    void init()
  }, [init])

  /* The rules the Master Price File itself asserts, offered to this
     organisation ONCE — see `features/constraints/workbookRules.ts`.
     It is keyed by a ledger of seed ids, so calling it again after the
     tables change (loading the Northside set is exactly that) can only
     ever add a rule whose columns have just appeared: it never
     overwrites an edit, re-enables a rule switched off, or duplicates.
     It seeds NOTHING today — all six admitted workbook rules are
     blocked on the constraint contract, each with its reason recorded
     beside it — and this is the seam that makes them appear the moment
     one is unblocked. */
  useEffect(() => {
    if (!loaded) return
    /* a rule is made of columns — with no tables there is nothing for
       one to bind to, and a seed must never be written half-bound */
    if (Object.keys(entities).length === 0) return
    seedWorkbookConstraints()
  }, [loaded, entities])

  if (!loaded) return null
  return <Shell />
}
