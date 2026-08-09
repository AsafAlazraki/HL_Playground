/* ============================================================
   The red-pencil inline note a guardrail leaves behind.
   One stamped word, one calm sentence, an optional mono detail
   and an optional way back to what the user typed.
   ============================================================ */

import type { ReactNode } from 'react'

interface GuardNoteProps {
  /** mono stamp — what happened: 'Blocked', 'Reverted', 'Blocker' */
  tag: string
  /** the one-sentence WHY, in the reviewer's voice */
  children: ReactNode
  /** verbatim engine text (a formula error), set in mono */
  detail?: string
  /** 'alert' while the edit is still held open, 'status' after a revert */
  live?: 'alert' | 'status'
  action?: { label: string; onClick: () => void; title?: string }
}

export function GuardNote({ tag, children, detail, live = 'alert', action }: GuardNoteProps) {
  return (
    <div className="ds-note" role={live}>
      <span className="mono-label ds-note-tag">{tag}</span>
      <span className="ds-note-text">{children}</span>
      {detail ? <span className="ds-note-detail">{detail}</span> : null}
      {action ? (
        <button
          type="button"
          className="ds-note-action"
          onClick={action.onClick}
          title={action.title}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  )
}
