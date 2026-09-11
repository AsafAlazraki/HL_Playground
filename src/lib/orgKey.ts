/* ============================================================
   THE KEY EVERYTHING SCOPED TO A BUSINESS IS FILED UNDER.

   It lived in `features/constraints/constraintDefs.ts`, which is
   where the defect that produced it was found and fixed, and which
   re-exports it still so nothing that already imports it had to
   move. It is here because it stopped being one feature's business:
   the merge log (`features/io/evidence.ts`) is the second store
   keyed by an organisation, and a feature reaching into another
   feature for a key would have been a dependency neither file wants
   — with the only alternative being a second copy of the fallback
   below, which is the one part of this that must never be written
   twice.
   ============================================================ */

import type { ProjectMeta } from '@/types/model'
import { useProjectStore } from '@/store/useProjectStore'

const NO_ORG = '__unnamed'

/** The key everything scoped to a business is filed under.
 *
 *  TENANCY §4.1. This was the lowercased NAME, because the name was
 *  the only identity `OrgProfile` carried — so renaming the business
 *  orphaned its business rules. They were never deleted; they sat in
 *  a map under a key nothing asked for again, and the rules pane went
 *  quiet with no way to tell that from having written none.
 *
 *  THE FALLBACK IS THE MIGRATION'S OTHER HALF, not a hedge. A sheet
 *  saved before slugs existed has no slug until `setOrganisation`
 *  runs again, and its rules must keep resolving in the meantime —
 *  so the old key still answers when there is nothing better.
 *  `adoptSlugKey` moves them across the first time it can see both
 *  keys at once. */
export const orgKeyOf = (meta: ProjectMeta): string =>
  meta.org?.slug?.trim() || meta.org?.name?.trim().toLowerCase() || NO_ORG

/** The key this organisation USED to be filed under, or null when it
 *  never had a different one. Only the name-based key is possible —
 *  a slug never changes, which is the whole point of it. */
export const legacyOrgKeyOf = (meta: ProjectMeta): string | null => {
  const slug = meta.org?.slug?.trim()
  if (!slug) return null
  const old = meta.org?.name?.trim().toLowerCase()
  return old && old !== slug ? old : null
}

/**
 * THE KEY FOR THE SHEET THAT IS OPEN, read imperatively.
 *
 * `orgKeyOf(useProjectStore.getState().meta)` was written out in five
 * files by the time this existed — the constraint registry, the merge
 * log, the column-mapping memory, the quote store and the build
 * place — and a line copied five times is five places for it to drift
 * when the key changes again, which it has done once already
 * (TENANCY §4.1, name → slug).
 *
 * IT IS NOT A HOOK AND MUST NOT BECOME ONE. Every caller is a plain
 * localStorage reader outside React; a hook here would drag five
 * stores into the render cycle to answer a question that changes
 * about once a session. Where a COMPONENT needs it to re-render, it
 * subscribes itself — `useProjectStore((s) => orgKeyOf(s.meta))` —
 * which is what `useMerges` and `useMappings` do.
 */
export const currentOrgKey = (): string => orgKeyOf(useProjectStore.getState().meta)
