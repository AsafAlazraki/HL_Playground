import { useEffect } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { seedWorkbookConstraints } from '@/features/constraints'
import { StillnessProvider } from '@/features/views/stillness'
import { Shell } from '@/app/Shell'
import { UndoKeys } from '@/app/UndoKeys'

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
  /* THE MOTION POLICY WRAPS THE WHOLE APP, not one feature.
     `StillnessProvider` was mounted at exactly one site — inside
     `ViewPage` — so "nothing moves while the user is working" was
     true of one of the five stages and of nothing else: a camera
     walk on the blueprint, a toast stack reflowing, and a rules list
     re-sorting all moved happily under a caret. Hoisted here it is
     one provider, one boolean, and the policy is true of every
     surface that reads it. `beginTyping` / `endTyping` keep working
     unchanged — the context is simply found further up. */
  return (
    <StillnessProvider>
      <Shell />
      {/* UNDO IS BOUND HERE, NOT IN THE SHELL, for two reasons. It
          belongs to the store rather than to any one screen — the
          onboarding wizard is the only surface with nothing to undo,
          and it has no data to lose either. And `Shell.tsx` states in
          its own header that it binds no window key handler; that
          decision is left standing rather than argued with in the file
          that made it. `UndoKeys.tsx` explains what it does instead,
          and why one chord in the capture phase is safe here. */}
      <UndoKeys />
    </StillnessProvider>
  )
}
