/* ============================================================
   Name guard — the draft/commit machinery behind hard
   guardrails 1 (duplicate field name) and 2 (duplicate entity
   name).

   Contract: the user may TYPE anything. Only the commit is
   policed. A rejected commit never disappears silently — the
   caller renders a red-pencil note carrying the WHY, and the
   input reverts to the last name the sheet accepted.
   ============================================================ */

import { useRef, useState } from 'react'

/** trimmed + case-insensitive — the comparison every guardrail uses */
export const normalizeName = (s: string): string => s.trim().toLowerCase()

export interface NameGuardOptions {
  /** the name currently committed on the sheet */
  current: string
  /** names held by the peers this one must not collide with
   *  (the caller excludes the subject itself, so renaming a field to
   *  its own current name never trips the guard) */
  taken: string[]
  /** true when an empty name is a legal committed value (fields may
   *  stay untitled; entities may not) */
  allowEmpty: boolean
  /** the calm one-sentence WHY, built around the offending name */
  message: (name: string) => string
  onCommit: (name: string) => void
}

export interface NameGuard {
  /** the value the input shows while editing; null = not editing */
  draft: string | null
  /** red-pencil note text, or null when there is nothing to say */
  note: string | null
  /** the note describes an edit that was rolled back, not a live warning */
  reverted: boolean
  /** the draft as it stands would be refused */
  invalid: boolean
  /** open an edit seeded with the committed name */
  begin: (seed?: string) => void
  /** every keystroke */
  change: (next: string) => void
  /** Enter — true when the sheet took the name, false when it refused */
  commit: () => boolean
  /** Escape — drop the draft and the note without comment */
  cancel: () => void
  /** blur — commit when clean, otherwise revert and say why */
  settle: () => void
}

export function useNameGuard(opts: NameGuardOptions): NameGuard {
  const [draft, setDraft] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [reverted, setReverted] = useState(false)
  /* Escape must beat the blur that follows it — a state update alone
     races the blur handler and the stale draft would still settle */
  const escaping = useRef(false)

  const clashes = (value: string): boolean => {
    const key = normalizeName(value)
    if (key === '') return false
    return opts.taken.some((t) => normalizeName(t) === key)
  }

  const begin = (seed?: string) => {
    escaping.current = false
    setDraft(seed ?? opts.current)
    setNote(null)
    setReverted(false)
  }

  const change = (next: string) => {
    escaping.current = false
    setDraft(next)
    setReverted(false)
    /* live, so the mark lands as the collision appears — not as a
       surprise at the end */
    setNote(clashes(next) ? opts.message(next.trim()) : null)
  }

  const commit = (): boolean => {
    if (draft === null) return true
    const value = draft.trim()
    if (clashes(value)) {
      setNote(opts.message(value))
      setReverted(false)
      return false
    }
    if (value === '' && !opts.allowEmpty) {
      /* an entity with no name is not a rename, it is a slip — leave
         the committed name standing, nothing was taken away */
      setDraft(null)
      setNote(null)
      setReverted(false)
      return true
    }
    if (value !== opts.current) opts.onCommit(value)
    setDraft(null)
    setNote(null)
    setReverted(false)
    return true
  }

  const cancel = () => {
    escaping.current = true
    setDraft(null)
    setNote(null)
    setReverted(false)
  }

  const settle = () => {
    if (escaping.current) {
      escaping.current = false
      return
    }
    if (draft === null) return
    const value = draft.trim()
    if (clashes(value)) {
      /* revert cleanly — and leave the note standing so the typing was
         never discarded in silence */
      setNote(opts.message(value))
      setReverted(true)
      setDraft(null)
      return
    }
    commit()
  }

  return {
    draft,
    note,
    reverted,
    invalid: draft !== null && clashes(draft),
    begin,
    change,
    commit,
    cancel,
    settle,
  }
}
