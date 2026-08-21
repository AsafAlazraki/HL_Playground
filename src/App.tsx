import { useEffect } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { adoptKeptPatterns, seedWorkbookConstraints } from '@/features/constraints'
import { StillnessProvider } from '@/features/views/stillness'
import { TabGuard } from '@/features/session'
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
    /* AND THE PATTERNS A PERSON KEPT, on the same seam and for the
       same reason. A kept pattern becomes a rule carrying severity
       'warn' — it flags a pairing that disagrees and removes none —
       and it is offered here rather than only at the moment of
       keeping, so a decision made before this existed, or before the
       table it names was loaded, still comes home. Idempotent: an
       edit survives, a rule switched off stays off. */
    adoptKeptPatterns()
  }, [loaded, entities])

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
      {/* THE TWO-TAB GUARD IS MOUNTED BEFORE THE SHEET IS, and that
          is why `loaded` no longer short-circuits the whole tree.
          Two tabs on one IndexedDB both write it and the last flush
          wins; the tabs settle which of them may write over a
          BroadcastChannel, and the sooner that conversation starts
          the smaller the window in which both of them believe they
          may. It draws nothing at all in the tab that is saving. */}
      <TabGuard />
      {/* EVERYTHING ELSE STILL WAITS FOR THE SHEET, exactly as it did
          when this was a bare `if (!loaded) return null`. */}
      {loaded ? (
        <>
          <Shell />
          {/* UNDO IS BOUND HERE, NOT IN THE SHELL, for two reasons. It
              belongs to the store rather than to any one screen — the
              onboarding wizard is the only surface with nothing to
              undo, and it has no data to lose either. And `Shell.tsx`
              states in its own header that it binds no window key
              handler; that decision is left standing rather than
              argued with in the file that made it. `UndoKeys.tsx`
              explains what it does instead, and why one chord in the
              capture phase is safe here. */}
          <UndoKeys />
        </>
      ) : null}
    </StillnessProvider>
  )
}
