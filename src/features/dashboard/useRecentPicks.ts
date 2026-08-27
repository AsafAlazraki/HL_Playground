/* ============================================================
   WHERE I HAVE BEEN, RE-READ WHEN IT COULD HAVE CHANGED.

   `readRecent()` is a synchronous localStorage read and NOT a
   subscription — the finder writes a pick as a side effect of
   opening something, and nothing publishes it. That is right for
   the finder, which reads the list once as it opens.

   A DASHBOARD IS NOT OPENED ONCE. The shell draws stages OVER
   the home surface rather than unmounting it, so a person can
   open a boat from the finder, come back, and be looking at the
   same mounted component. Read only at mount, the card would
   quietly stop telling the truth for the rest of the session —
   the failure mode this app calls out by name: a surface that
   still renders, and is wrong.

   So it is re-read on the three moments it can have changed
   under us and a person is looking again: the tab becoming
   visible, the window taking focus, and the pointer arriving
   over the page. None of them is a poll — there is no timer in
   this file — and each one costs one JSON.parse of at most six
   entries.

   THE LIST IS ONLY REPLACED WHEN IT DIFFERS. A fresh array on
   every focus would re-run `resolveRecent` over the whole
   project for nothing, and would re-key six list rows so they
   flashed. The comparison is on the ids, which is the whole of
   what a pick is.
   ============================================================ */

import { useCallback, useEffect, useState } from 'react'
import { readRecent, type RecentPick } from '@/features/search'

const same = (a: readonly RecentPick[], b: readonly RecentPick[]): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].entityId !== b[i].entityId) return false
    if ((a[i].rowId ?? '') !== (b[i].rowId ?? '')) return false
  }
  return true
}

export function useRecentPicks(): RecentPick[] {
  const [picks, setPicks] = useState<RecentPick[]>(() => readRecent())

  const refresh = useCallback(() => {
    setPicks((held) => {
      const fresh = readRecent()
      return same(held, fresh) ? held : fresh
    })
  }, [])

  useEffect(() => {
    /* the pointer arriving is the earliest of the three and the
       only one that fires when the shell simply drew this
       surface again without the window ever losing focus */
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('pointerdown', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pointerdown', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  return picks
}
