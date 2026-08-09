/* ============================================================
   The sentence's view of the project: every column a rule may talk
   about, indexed both ways, plus the rows the live badges are read
   from. Rebuilt only when the tables or the rows actually change.
   ============================================================ */

import { useMemo } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { makeCtx, type SentenceCtx } from './describe'

export function useSentenceCtx(): SentenceCtx {
  const entities = useProjectStore((s) => s.entities)
  const rowsByEntity = useProjectStore((s) => s.rowsByEntity)
  return useMemo(() => makeCtx(entities, rowsByEntity), [entities, rowsByEntity])
}
